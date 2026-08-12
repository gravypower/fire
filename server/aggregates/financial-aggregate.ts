/**
 * Financial aggregate root implementation
 */

import type { FinancialAggregate } from "../interfaces/aggregate.ts";
import type {
  AddParameterTransitionCommand,
  ClearCacheCommand,
  Command,
  CommandResult,
  ProcessTimeStepCommand,
  RemoveParameterTransitionCommand,
  RunSimulationCommand,
  UpdateParametersCommand,
} from "../interfaces/commands.ts";
import type { FinancialEvent } from "../interfaces/events.ts";
import { EVENT_TYPES } from "../interfaces/events.ts";
import {
  getErrorMessages,
  isValid,
  validateUserParameters,
} from "../../lib/validation.ts";
import { FinancialEventFactory } from "../events/event-factory.ts";
import { FinancialEventProcessorCoordinator } from "../events/financial-event-processors.ts";
import { ParameterTransitionManager } from "../events/parameter-transition-manager.ts";
import { SimulationEngine } from "../../lib/simulation_engine.ts";

/**
 * Financial aggregate root implementation
 */
export class FinancialAggregateRoot implements FinancialAggregate {
  public readonly id: string;
  public readonly sessionId: string;
  public version: number = 0;
  public uncommittedEvents: FinancialEvent[] = [];

  private readonly eventFactory: FinancialEventFactory;
  private readonly eventProcessors: FinancialEventProcessorCoordinator;
  private readonly transitionManager: ParameterTransitionManager;

  constructor(id: string, sessionId: string) {
    this.id = id;
    this.sessionId = sessionId;
    this.eventFactory = new FinancialEventFactory(sessionId, id);
    this.eventProcessors = new FinancialEventProcessorCoordinator(
      this.eventFactory,
    );
    this.transitionManager = new ParameterTransitionManager();
  }

  async processCommand(command: Command): Promise<CommandResult> {
    try {
      // Validate command belongs to this session
      if (command.sessionId !== this.sessionId) {
        return {
          success: false,
          commandId: command.id,
          events: [],
          error: "Command session mismatch",
        };
      }

      // Validate command structure and business rules
      const validationResult = await this.validateCommand(command);
      if (!validationResult.success) {
        return {
          success: false,
          commandId: command.id,
          events: [],
          error: validationResult.error,
        };
      }

      // Process command based on type
      const events = await this.handleCommand(command);

      // Apply events to update internal state
      for (const event of events) {
        this.applyEvent(event);
      }

      return {
        success: true,
        commandId: command.id,
        events: events.map((e) => e.id),
        data: {
          eventsGenerated: events.length,
          newVersion: this.version,
        },
      };
    } catch (error) {
      return {
        success: false,
        commandId: command.id,
        events: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  applyEvent(event: FinancialEvent): void {
    // Validate event belongs to this aggregate
    if (event.aggregateId !== this.id || event.sessionId !== this.sessionId) {
      throw new Error("Event does not belong to this aggregate");
    }

    // Add to uncommitted events if not already applied
    if (event.version > this.version) {
      this.uncommittedEvents.push(event);
      this.version = event.version;
    }

    // Apply event-specific logic (state changes would go here)
    this.applyEventToState(event);
  }

  getUncommittedEvents(): FinancialEvent[] {
    return [...this.uncommittedEvents];
  }

  markEventsAsCommitted(): void {
    this.uncommittedEvents = [];
  }

  /**
   * Gets the parameter transition manager
   */
  getTransitionManager(): ParameterTransitionManager {
    return this.transitionManager;
  }

  /**
   * Gets active parameters for a specific date
   */
  getParametersForDate(baseParameters: any, targetDate: Date): any {
    return this.transitionManager.getParametersForDate(
      baseParameters,
      targetDate,
    );
  }

  /**
   * Gets parameter periods for simulation
   */
  getParameterPeriods(
    baseParameters: any,
    startDate: Date,
    endDate: Date,
  ): any[] {
    return this.transitionManager.getParameterPeriods(
      baseParameters,
      startDate,
      endDate,
    );
  }

  /**
   * Checks if cache should be invalidated due to parameter changes
   */
  shouldInvalidateCache(): boolean {
    // Check if any parameter transition events were generated
    return this.uncommittedEvents.some((event) =>
      event.type === EVENT_TYPES.PARAMETER_TRANSITION_SCHEDULED ||
      event.type === EVENT_TYPES.PARAMETER_TRANSITION_REMOVED ||
      event.type === EVENT_TYPES.PARAMETER_CHANGED
    );
  }

  replayEvents(events: FinancialEvent[]): void {
    // Sort events by version to ensure correct order
    const sortedEvents = events.sort((a, b) => a.version - b.version);

    // Reset state
    this.version = 0;
    this.uncommittedEvents = [];

    // Process events in transition manager
    this.transitionManager.processEvents(sortedEvents);

    // Apply each event
    for (const event of sortedEvents) {
      this.applyEventToState(event);
      this.version = Math.max(this.version, event.version);
    }
  }

  private async handleCommand(command: Command): Promise<FinancialEvent[]> {
    const events: FinancialEvent[] = [];

    switch (command.type) {
      case "RunSimulation": {
        const runCmd = command as RunSimulationCommand;
        const { parameters } = runCmd.data;

        // Run simulation using the engine
        // Note: If using transitions, we should check if transitions exist and use runSimulationWithTransitions
        // But for now, we'll stick to basic runSimulation or let the engine handle it if we passed a config
        // Based on command structure, we pass UserParameters directly.

        const result = SimulationEngine.runSimulation(parameters);

        // Generate events for each state in the simulation result
        for (const state of result.states) {
          events.push(
            this.eventProcessors.state.processFinancialStateCalculation(
              state.cash,
              state.investments,
              state.superannuation,
              state.loanBalance,
              state.offsetBalance,
              state.date,
              state.loanBalances,
              state.superBalances,
              state.offsetBalances,
              state.investmentBalances,
              state.netWorth,
              state.cashFlow,
              state.taxPaid,
              state.expenses,
              state.interestSaved,
              state.deductibleInterest,
            ),
          );
        }
        break;
      }

      case "UpdateParameters":
        // Generate parameter change event using the event processor
        const updateCmd = command as UpdateParametersCommand;
        events.push(this.eventProcessors.state.processParameterChange(
          "bulk_update",
          null,
          updateCmd.data.parameterChanges,
          updateCmd.data.effectiveDate || new Date(),
          "User parameter update",
        ));
        break;

      case "ProcessTimeStep":
        // Process a single time step - this would generate multiple events
        // based on the current state and parameters
        const timeStepCmd = command as ProcessTimeStepCommand;
        events.push(...this.processTimeStepEvents(timeStepCmd));
        break;

      case "AddParameterTransition":
        // Generate parameter transition scheduled event
        const addTransitionCmd = command as AddParameterTransitionCommand;
        events.push(
          this.eventProcessors.state.processParameterTransitionScheduling(
            addTransitionCmd.data.transition.id,
            addTransitionCmd.data.transition.transitionDate,
            addTransitionCmd.data.transition.parameterChanges,
            addTransitionCmd.data.transition.label,
          ),
        );
        break;

      case "RemoveParameterTransition":
        // Generate parameter transition removal event
        const removeTransitionCmd = command as RemoveParameterTransitionCommand;
        events.push(
          this.eventProcessors.state.processParameterTransitionRemoval(
            removeTransitionCmd.data.transitionId,
            "User requested removal",
          ),
        );
        break;

      case "ClearCache":
        // No events generated for cache clear
        break;

      default:
        throw new Error(`Unsupported command type: ${command.type}`);
    }

    return events;
  }

  /**
   * Processes a time step and generates appropriate financial events
   */
  private processTimeStepEvents(
    command: ProcessTimeStepCommand,
  ): FinancialEvent[] {
    const events: FinancialEvent[] = [];
    const { currentDate, currentState } = command.data;

    // This is a simplified example - in a real implementation, this would
    // process the current parameters and generate events based on the financial rules

    // Example: Generate a salary event (would be based on actual parameters)
    events.push(...this.eventProcessors.income.processSalaryPayment(
      5000, // gross amount - would come from parameters
      30, // tax rate - would come from parameters
      currentDate,
      "person1", // would come from parameters
    ));

    // Example: Generate an expense event
    events.push(this.eventProcessors.expense.processExpensePayment(
      "living",
      2000, // would come from parameters
      "Monthly living expenses",
      currentDate,
    ));

    // Example: Generate investment growth event
    events.push(this.eventProcessors.investment.processInvestmentGrowth(
      currentState.investments,
      7, // growth rate - would come from parameters
      currentDate,
    ));

    // Generate updated financial state
    events.push(this.eventProcessors.state.processFinancialStateCalculation(
      currentState.cash + 3000 - 2000, // simplified calculation
      currentState.investments * 1.0058, // simplified growth
      currentState.superannuation,
      currentState.loanBalance,
      currentState.offsetBalance,
      currentDate,
    ));

    return events;
  }

  private applyEventToState(event: FinancialEvent): void {
    // This is where we would update the aggregate's internal state
    // based on the event type and data
    // For now, we'll just track that the event was applied

    switch (event.type) {
      case EVENT_TYPES.FINANCIAL_STATE_CALCULATED:
        // Update financial state
        break;
      case EVENT_TYPES.PARAMETER_CHANGED:
        // Update parameters
        break;
      case EVENT_TYPES.PARAMETER_TRANSITION_SCHEDULED:
        // Parameter transition scheduled - handled by transition manager
        break;
      case EVENT_TYPES.PARAMETER_TRANSITION_APPLIED:
        // Parameter transition applied - handled by transition manager
        break;
      case EVENT_TYPES.PARAMETER_TRANSITION_REMOVED:
        // Parameter transition removed - handled by transition manager
        break;
        // Add other event types as needed
    }
  }

  /**
   * Validates command structure and business rules before processing
   */
  private async validateCommand(
    command: Command,
  ): Promise<{ success: boolean; error?: string }> {
    // Basic command structure validation
    if (
      !command.id || !command.type || !command.sessionId || !command.timestamp
    ) {
      return {
        success: false,
        error:
          "Command missing required fields (id, type, sessionId, timestamp)",
      };
    }

    // Validate timestamp is not in the future
    if (command.timestamp > new Date()) {
      return {
        success: false,
        error: "Command timestamp cannot be in the future",
      };
    }

    // Command-specific validation
    switch (command.type) {
      case "RunSimulation":
        return this.validateRunSimulationCommand(
          command as RunSimulationCommand,
        );

      case "UpdateParameters":
        return this.validateUpdateParametersCommand(
          command as UpdateParametersCommand,
        );

      case "ProcessTimeStep":
        return this.validateProcessTimeStepCommand(
          command as ProcessTimeStepCommand,
        );

      case "AddParameterTransition":
        return this.validateAddParameterTransitionCommand(
          command as AddParameterTransitionCommand,
        );

      case "RemoveParameterTransition":
        return this.validateRemoveParameterTransitionCommand(
          command as RemoveParameterTransitionCommand,
        );

      case "ClearCache":
        return this.validateClearCacheCommand(command as ClearCacheCommand);

      default:
        return {
          success: false,
          error: `Unsupported command type: ${command.type}`,
        };
    }
  }

  /**
   * Validates RunSimulation command
   */
  private validateRunSimulationCommand(
    command: RunSimulationCommand,
  ): { success: boolean; error?: string } {
    if (!command.data) {
      return { success: false, error: "RunSimulation command missing data" };
    }

    const { parameters, startDate: startDateRaw, endDate: endDateRaw } =
      command.data;

    // Validate parameters exist
    if (!parameters) {
      return {
        success: false,
        error: "RunSimulation command missing parameters",
      };
    }

    // Validate dates
    if (!startDateRaw || !endDateRaw) {
      return {
        success: false,
        error: "RunSimulation command missing start or end date",
      };
    }

    // Convert string dates to Date objects if needed
    let startDate: Date;
    let endDate: Date;

    try {
      startDate = typeof startDateRaw === "string"
        ? new Date(startDateRaw)
        : startDateRaw;
      endDate = typeof endDateRaw === "string"
        ? new Date(endDateRaw)
        : endDateRaw;

      // Validate dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return {
          success: false,
          error: "Invalid date format in start or end date",
        };
      }
    } catch (error) {
      return { success: false, error: "Failed to parse start or end date" };
    }

    if (startDate >= endDate) {
      return { success: false, error: "Start date must be before end date" };
    }

    // Validate user parameters using existing validation
    const validationResults = validateUserParameters(parameters);
    if (!isValid(validationResults)) {
      const errors = getErrorMessages(validationResults);
      return {
        success: false,
        error: `Invalid parameters: ${errors.join(", ")}`,
      };
    }

    // Business rule: simulation period should be reasonable
    const yearsDifference = (endDate.getTime() - startDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25);
    if (yearsDifference > 100) {
      return {
        success: false,
        error: "Simulation period cannot exceed 100 years",
      };
    }

    if (yearsDifference < 0.1) {
      return {
        success: false,
        error: "Simulation period must be at least 1 month",
      };
    }

    return { success: true };
  }

  /**
   * Validates UpdateParameters command
   */
  private validateUpdateParametersCommand(
    command: UpdateParametersCommand,
  ): { success: boolean; error?: string } {
    if (!command.data) {
      return { success: false, error: "UpdateParameters command missing data" };
    }

    const { parameterChanges, effectiveDate } = command.data;

    // Validate parameter changes exist
    if (!parameterChanges || Object.keys(parameterChanges).length === 0) {
      return {
        success: false,
        error: "UpdateParameters command missing parameter changes",
      };
    }

    // Validate effective date if provided
    if (effectiveDate && effectiveDate > new Date()) {
      return {
        success: false,
        error: "Effective date cannot be in the future",
      };
    }

    // Validate individual parameter changes
    for (const [key, value] of Object.entries(parameterChanges)) {
      if (value === undefined || value === null) {
        return {
          success: false,
          error: `Parameter change for ${key} cannot be null or undefined`,
        };
      }

      // Validate numeric parameters are positive where appropriate
      if (typeof value === "number") {
        if (
          key.includes("salary") || key.includes("expense") ||
          key.includes("contribution") || key.includes("balance")
        ) {
          if (value < 0) {
            return {
              success: false,
              error: `Parameter ${key} must be non-negative`,
            };
          }
        }

        if (key.includes("rate") || key.includes("Rate")) {
          if (value < 0 || value > 100) {
            return {
              success: false,
              error: `Rate parameter ${key} must be between 0 and 100`,
            };
          }
        }

        if (key.includes("age") || key.includes("Age")) {
          if (value < 0 || value > 120) {
            return {
              success: false,
              error: `Age parameter ${key} must be between 0 and 120`,
            };
          }
        }
      }
    }

    return { success: true };
  }

  /**
   * Validates ProcessTimeStep command
   */
  private validateProcessTimeStepCommand(
    command: ProcessTimeStepCommand,
  ): { success: boolean; error?: string } {
    if (!command.data) {
      return { success: false, error: "ProcessTimeStep command missing data" };
    }

    const { currentDate, interval, currentState } = command.data;

    // Validate required fields
    if (!currentDate || !interval || !currentState) {
      return {
        success: false,
        error: "ProcessTimeStep command missing required fields",
      };
    }

    // Validate interval
    const validIntervals = ["week", "fortnight", "month", "year"];
    if (!validIntervals.includes(interval)) {
      return {
        success: false,
        error: `Invalid interval: ${interval}. Must be one of: ${
          validIntervals.join(", ")
        }`,
      };
    }

    // Validate current state has required numeric fields
    const requiredStateFields = [
      "cash",
      "investments",
      "superannuation",
      "loanBalance",
      "offsetBalance",
      "netWorth",
      "cashFlow",
    ];
    for (const field of requiredStateFields) {
      if (
        typeof currentState[field as keyof typeof currentState] !== "number"
      ) {
        return {
          success: false,
          error: `Current state missing or invalid field: ${field}`,
        };
      }
    }

    return { success: true };
  }

  /**
   * Validates AddParameterTransition command
   */
  private validateAddParameterTransitionCommand(
    command: AddParameterTransitionCommand,
  ): { success: boolean; error?: string } {
    if (!command.data) {
      return {
        success: false,
        error: "AddParameterTransition command missing data",
      };
    }

    const { transition } = command.data;

    // Validate transition exists
    if (!transition) {
      return {
        success: false,
        error: "AddParameterTransition command missing transition",
      };
    }

    // Validate transition structure
    if (
      !transition.id || !transition.transitionDate ||
      !transition.parameterChanges
    ) {
      return {
        success: false,
        error:
          "Transition missing required fields (id, transitionDate, parameterChanges)",
      };
    }

    // Convert string date to Date object if needed
    let transitionDate: Date;
    try {
      transitionDate = typeof transition.transitionDate === "string"
        ? new Date(transition.transitionDate)
        : transition.transitionDate;

      // Validate date is valid
      if (isNaN(transitionDate.getTime())) {
        return { success: false, error: "Invalid transition date format" };
      }
    } catch (error) {
      return { success: false, error: "Failed to parse transition date" };
    }

    // Validate transition date is not in the past
    if (transitionDate < new Date()) {
      return {
        success: false,
        error: "Transition date cannot be in the past",
      };
    }

    // Validate parameter changes
    if (Object.keys(transition.parameterChanges).length === 0) {
      return {
        success: false,
        error: "Transition must include at least one parameter change",
      };
    }

    return { success: true };
  }

  /**
   * Validates RemoveParameterTransition command
   */
  private validateRemoveParameterTransitionCommand(
    command: RemoveParameterTransitionCommand,
  ): { success: boolean; error?: string } {
    if (!command.data) {
      return {
        success: false,
        error: "RemoveParameterTransition command missing data",
      };
    }

    const { transitionId } = command.data;

    // Validate transition ID exists
    if (!transitionId || typeof transitionId !== "string") {
      return {
        success: false,
        error:
          "RemoveParameterTransition command missing or invalid transitionId",
      };
    }

    return { success: true };
  }

  /**
   * Validates ClearCache command
   */
  private validateClearCacheCommand(
    command: ClearCacheCommand,
  ): { success: boolean; error?: string } {
    // ClearCache command has minimal validation requirements
    // Just ensure data exists (even if empty)
    if (!command.data) {
      return { success: false, error: "ClearCache command missing data" };
    }

    return { success: true };
  }
}
