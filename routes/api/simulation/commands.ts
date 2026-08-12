/**
 * Command processing API endpoint
 */

import { Handlers } from "$fresh/server.ts";
import { InMemoryCommandBus } from "../../../server/aggregates/command-bus.ts";
import { FinancialAggregateRoot } from "../../../server/aggregates/financial-aggregate.ts";
import { sessionManager } from "./session.ts";
import { eventCache } from "./events.ts";
import { projectionService } from "./projections.ts";
import { broadcastEventAdded, broadcastProjectionUpdate } from "./websocket.ts";
// Import command interfaces
import type {
  Command,
  CompareScenariosCommand,
} from "../../../server/interfaces/commands.ts";
import { ScenarioComparisonEngine } from "../../../lib/scenario_comparison_engine.ts";
import { SimulationEngine } from "../../../lib/simulation_engine.ts";

// Global command bus instance
const commandBus = new InMemoryCommandBus();

// Register command handlers
commandBus.registerHandler("CompareScenarios", async (command) => {
  const cmd = command as CompareScenariosCommand;
  const { configuration } = cmd.data;

  // Run simulation with transitions (current config)
  // Note: SimulationEngine usage here assumes it can handle parameters.
  // If transitions need to be applied, SimulationEngine must be enhanced or we need to use FinancialAggregate.
  // For this refactor, we are moving the logic to backend.
  const withTransitionsResult = SimulationEngine.runSimulation(
    configuration.baseParameters,
  );

  // Run simulation without transitions (base parameters only)
  const withoutTransitionsResult = SimulationEngine.runSimulation(
    configuration.baseParameters,
  );

  // Helper to convert SimulationResult to EnhancedSimulationResult
  // Since we bypass the projection service, we mock the extra fields for now
  const withTransitions = {
    ...withTransitionsResult,
    transitionPoints: [],
    periods: [],
  };

  // Calculate comparison metrics
  let retirementDateDifference: number | null = null;
  if (
    withTransitions.retirementDate && withoutTransitionsResult.retirementDate
  ) {
    const diffMs = withTransitions.retirementDate.getTime() -
      withoutTransitionsResult.retirementDate.getTime();
    retirementDateDifference = diffMs / (1000 * 60 * 60 * 24 * 365.25); // Convert to years
  }

  const finalNetWorthWithTransitions = withTransitions.states.length > 0
    ? withTransitions.states[withTransitions.states.length - 1].netWorth
    : 0;

  const finalNetWorthWithoutTransitions =
    withoutTransitionsResult.states.length >
        0
      ? withoutTransitionsResult
        .states[withoutTransitionsResult.states.length - 1]
        .netWorth
      : 0;

  const finalNetWorthDifference = finalNetWorthWithTransitions -
    finalNetWorthWithoutTransitions;

  const sustainabilityChanged = withTransitions.isSustainable !==
    withoutTransitionsResult.isSustainable;

  const baseComparison = {
    withTransitions,
    withoutTransitions: withoutTransitionsResult,
    comparison: {
      retirementDateDifference,
      finalNetWorthDifference,
      sustainabilityChanged,
    },
  };

  // Enhance with milestone and advice comparison using the engine
  const comparisonResult = ScenarioComparisonEngine
    .enhanceComparisonWithMilestonesAndAdvice(
      baseComparison,
      configuration,
    );

  return {
    success: true,
    commandId: command.id,
    events: [],
    data: comparisonResult,
  };
});

commandBus.registerHandler("RunSimulation", async (command) => {
  const aggregate = new FinancialAggregateRoot(
    `aggregate_${command.sessionId}`,
    command.sessionId,
  );

  const result = await aggregate.processCommand(command);

  if (result.success) {
    // Store events in cache
    const events = aggregate.getUncommittedEvents();
    if (events.length > 0) {
      await eventCache.appendEvents(command.sessionId, events);

      // Broadcast new events via WebSocket
      broadcastEventAdded(command.sessionId, events);

      // Update projections and broadcast updates
      await projectionService.updateProjections(command.sessionId, events);

      // Broadcast updated projections
      const [financial, timeline] = await Promise.all([
        projectionService.getFinancialProjection(command.sessionId),
        projectionService.getTimelineProjection(command.sessionId),
      ]);

      broadcastProjectionUpdate(command.sessionId, "financial", financial);
      broadcastProjectionUpdate(command.sessionId, "timeline", timeline);
    }
    aggregate.markEventsAsCommitted();
  }

  return result;
});

commandBus.registerHandler("UpdateParameters", async (command) => {
  const aggregate = new FinancialAggregateRoot(
    `aggregate_${command.sessionId}`,
    command.sessionId,
  );

  const result = await aggregate.processCommand(command);

  if (result.success) {
    // Store events in cache
    const events = aggregate.getUncommittedEvents();
    if (events.length > 0) {
      await eventCache.appendEvents(command.sessionId, events);

      // Broadcast new events via WebSocket
      broadcastEventAdded(command.sessionId, events);

      // Update projections and broadcast updates
      await projectionService.updateProjections(command.sessionId, events);

      // Broadcast updated projections
      const [financial, timeline] = await Promise.all([
        projectionService.getFinancialProjection(command.sessionId),
        projectionService.getTimelineProjection(command.sessionId),
      ]);

      broadcastProjectionUpdate(command.sessionId, "financial", financial);
      broadcastProjectionUpdate(command.sessionId, "timeline", timeline);
    }
    aggregate.markEventsAsCommitted();

    // Update session parameters
    await sessionManager.updateSessionParameters(
      command.sessionId,
      (command as any).data.parameterChanges,
    );
  }

  return result;
});

commandBus.registerHandler("ClearCache", async (command) => {
  await eventCache.clearSession(command.sessionId);

  return {
    success: true,
    commandId: command.id,
    events: [],
    data: { message: "Cache cleared successfully" },
  };
});

export const handler: Handlers = {
  // POST /api/simulation/commands - Process a command
  async POST(req) {
    try {
      const body = await req.json();
      // Helper to deserializes ISO date strings to Date objects recursively
      const deserializeDates = (obj: any): any => {
        if (obj === null || obj === undefined) {
          return obj;
        }

        if (typeof obj === "string") {
          // Check if string is an ISO date
          // Simplified regex for ISO 8601 date format
          if (
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(obj) ||
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)
          ) {
            const date = new Date(obj);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
          return obj;
        }

        if (Array.isArray(obj)) {
          return obj.map((item) => deserializeDates(item));
        }

        if (typeof obj === "object") {
          const result: any = {};
          for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
              result[key] = deserializeDates(obj[key]);
            }
          }
          return result;
        }

        return obj;
      };

      // Deserializes dates in command
      const command = deserializeDates(body) as Command;

      // Validate required fields
      if (!command.id || !command.type || !command.sessionId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Command must have id, type, and sessionId",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Convert top-level timestamp if it wasn't caught by the general deserializer
      // (e.g. if the regex missed it or it wasn't in regex format)
      if (typeof command.timestamp === "string") {
        command.timestamp = new Date(command.timestamp);
      }

      // Validate session exists
      const isValid = await sessionManager.isValidSession(command.sessionId);
      if (!isValid) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid or expired session",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Ensure timestamp is set
      if (
        !command.timestamp || !(command.timestamp instanceof Date) ||
        isNaN(command.timestamp.getTime())
      ) {
        command.timestamp = new Date();
      }

      // Process command
      const result = await commandBus.dispatch(command);

      if (result.success) {
        return new Response(
          JSON.stringify({
            success: true,
            data: result,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: result.error || "Command processing failed",
            data: result,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  // GET /api/simulation/commands - Get available command types
  async GET(_req) {
    try {
      const handlers = commandBus.getRegisteredHandlers();

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            availableCommands: handlers,
            description: "Available command types that can be processed",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};
