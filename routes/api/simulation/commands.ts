/**
 * Command processing API endpoint
 */

import { Handlers } from "$fresh/server.ts";
import { sessionManager } from "./session.ts";
import { projectionService } from "./projections.ts";
import { broadcastProjectionUpdate } from "./websocket.ts";
import type {
  ClearCacheCommand,
  Command,
  CompareNamedScenariosCommand,
  CompareScenariosCommand,
  RunSimulationCommand,
  UpdateParametersCommand,
} from "../../../server/interfaces/commands.ts";
import { detectMilestonesFromSimulation } from "../../../lib/milestone_detector.ts";
import { ScenarioComparisonEngine } from "../../../lib/scenario_comparison_engine.ts";
import { SimulationEngine } from "../../../lib/simulation_engine.ts";
import { assessSustainability } from "../../../server/projections/projection-builder.ts";
import type { SimulationConfiguration } from "../../../types/financial.ts";

interface CommandResponse {
  success: boolean;
  commandId: string;
  error?: string;
  data?: any;
}

async function runAndCacheSimulation(
  sessionId: string,
  configuration: SimulationConfiguration,
): Promise<void> {
  const hasTransitions = configuration.transitions &&
    configuration.transitions.length > 0;

  const result = hasTransitions
    ? SimulationEngine.runSimulationWithTransitions(configuration)
    : SimulationEngine.runSimulation(configuration.baseParameters);

  const milestoneResult = detectMilestonesFromSimulation(
    result.states,
    configuration.baseParameters,
  );

  await sessionManager.updateSessionParameters(
    sessionId,
    configuration.baseParameters,
  );
  await sessionManager.updateSessionResult(
    sessionId,
    result,
    milestoneResult.milestones,
  );

  const [financial, timeline] = await Promise.all([
    projectionService.getFinancialProjection(sessionId),
    projectionService.getTimelineProjection(sessionId),
  ]);

  broadcastProjectionUpdate(sessionId, "financial", financial);
  broadcastProjectionUpdate(sessionId, "timeline", timeline);
}

async function handleRunSimulation(
  command: RunSimulationCommand,
): Promise<CommandResponse> {
  const { parameters, configuration } = command.data;

  await runAndCacheSimulation(
    command.sessionId,
    configuration ?? { baseParameters: parameters, transitions: [] },
  );

  return { success: true, commandId: command.id };
}

async function handleUpdateParameters(
  command: UpdateParametersCommand,
): Promise<CommandResponse> {
  // Only updates the session's stored parameters; the client always follows
  // this with a RunSimulation command to actually re-simulate.
  await sessionManager.updateSessionParameters(
    command.sessionId,
    command.data.parameterChanges,
  );

  return { success: true, commandId: command.id };
}

async function handleClearCache(
  command: ClearCacheCommand,
): Promise<CommandResponse> {
  await sessionManager.updateSessionResult(command.sessionId, {
    states: [],
    retirementDate: null,
    retirementAge: null,
    isSustainable: false,
    warnings: [],
  }, []);

  return {
    success: true,
    commandId: command.id,
    data: { message: "Cache cleared successfully" },
  };
}

async function handleCompareScenarios(
  command: CompareScenariosCommand,
): Promise<CommandResponse> {
  const { configuration } = command.data;

  const withTransitionsResult = SimulationEngine.runSimulationWithTransitions(
    configuration,
  );
  const withoutTransitionsResult = SimulationEngine.runSimulation(
    configuration.baseParameters,
  );

  // SimulationEngine's own isSustainable flags any 3+ consecutive periods of
  // negative cash flow, which fires on every retiree since retirement income
  // is drawn from investments/super rather than tracked as "cashFlow" -
  // recompute with retirement-aware logic instead.
  const withTransitions = {
    ...withTransitionsResult,
    isSustainable: assessSustainability(
      withTransitionsResult.states,
      withTransitionsResult.retirementDate,
    ),
    transitionPoints: withTransitionsResult.transitionPoints ?? [],
    periods: withTransitionsResult.periods ?? [],
  };
  const withoutTransitionsIsSustainable = assessSustainability(
    withoutTransitionsResult.states,
    withoutTransitionsResult.retirementDate,
  );
  withoutTransitionsResult.isSustainable = withoutTransitionsIsSustainable;

  let retirementDateDifference: number | null = null;
  if (withTransitions.retirementDate && withoutTransitionsResult.retirementDate) {
    const diffMs = withTransitions.retirementDate.getTime() -
      withoutTransitionsResult.retirementDate.getTime();
    retirementDateDifference = diffMs / (1000 * 60 * 60 * 24 * 365.25);
  }

  const finalNetWorthWithTransitions = withTransitions.states.length > 0
    ? withTransitions.states[withTransitions.states.length - 1].netWorth
    : 0;

  const finalNetWorthWithoutTransitions =
    withoutTransitionsResult.states.length > 0
      ? withoutTransitionsResult.states[withoutTransitionsResult.states.length - 1].netWorth
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

  const comparisonResult = ScenarioComparisonEngine
    .enhanceComparisonWithMilestonesAndAdvice(baseComparison, configuration);

  return {
    success: true,
    commandId: command.id,
    data: comparisonResult,
  };
}

async function handleCompareNamedScenarios(
  command: CompareNamedScenariosCommand,
): Promise<CommandResponse> {
  const { scenarios } = command.data;

  const results = scenarios.map(({ id, name, configuration }) => {
    const hasTransitions = configuration.transitions &&
      configuration.transitions.length > 0;

    const result = hasTransitions
      ? SimulationEngine.runSimulationWithTransitions(configuration)
      : SimulationEngine.runSimulation(configuration.baseParameters);

    // See note in handleCompareScenarios: recompute with retirement-aware logic
    result.isSustainable = assessSustainability(result.states, result.retirementDate);

    const milestoneResult = detectMilestonesFromSimulation(
      result.states,
      configuration.baseParameters,
    );

    return { id, name, result, milestones: milestoneResult.milestones };
  });

  return {
    success: true,
    commandId: command.id,
    data: { scenarios: results },
  };
}

async function dispatch(command: Command): Promise<CommandResponse> {
  switch (command.type) {
    case "RunSimulation":
      return handleRunSimulation(command as RunSimulationCommand);
    case "UpdateParameters":
      return handleUpdateParameters(command as UpdateParametersCommand);
    case "ClearCache":
      return handleClearCache(command as ClearCacheCommand);
    case "CompareScenarios":
      return handleCompareScenarios(command as CompareScenariosCommand);
    case "CompareNamedScenarios":
      return handleCompareNamedScenarios(command as CompareNamedScenariosCommand);
    default:
      return {
        success: false,
        commandId: command.id,
        error: `Unsupported command type: ${command.type}`,
      };
  }
}

/**
 * Recursively deserializes ISO date strings to Date objects
 */
function deserializeDates(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
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
}

export const handler: Handlers = {
  // POST /api/simulation/commands - Process a command
  async POST(req) {
    try {
      const body = await req.json();
      const command = deserializeDates(body) as Command;

      if (!command.id || !command.type || !command.sessionId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Command must have id, type, and sessionId",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const isValid = await sessionManager.isValidSession(command.sessionId);
      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid or expired session" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }

      const result = await dispatch(command);

      return new Response(
        JSON.stringify({
          success: result.success,
          error: result.error,
          data: result,
        }),
        {
          status: result.success ? 200 : 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },

  // GET /api/simulation/commands - Get available command types
  GET(_req) {
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          availableCommands: [
            "RunSimulation",
            "UpdateParameters",
            "ClearCache",
            "CompareScenarios",
            "CompareNamedScenarios",
          ],
          description: "Available command types that can be processed",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  },
};
