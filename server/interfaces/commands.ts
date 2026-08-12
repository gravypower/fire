/**
 * Command interfaces for the simulation API
 */

import type {
  SimulationConfiguration,
  UserParameters,
} from "../../types/financial.ts";

/**
 * Base interface for all commands
 */
export interface Command {
  /** Unique identifier for this command */
  id: string;
  /** Type of command (discriminator) */
  type: string;
  /** Session this command belongs to */
  sessionId: string;
  /** When this command was issued */
  timestamp: Date;
}

/**
 * Command to run a complete financial simulation
 */
export interface RunSimulationCommand extends Command {
  type: "RunSimulation";
  data: {
    parameters: UserParameters;
    configuration?: SimulationConfiguration;
  };
}

/**
 * Command to update financial parameters on the session (does not re-run the simulation)
 */
export interface UpdateParametersCommand extends Command {
  type: "UpdateParameters";
  data: {
    parameterChanges: Partial<UserParameters>;
  };
}

/**
 * Command to clear a session's cached simulation result
 */
export interface ClearCacheCommand extends Command {
  type: "ClearCache";
  data: Record<string, never>;
}

/**
 * Command to run a comparison simulation (with vs without transitions)
 */
export interface CompareScenariosCommand extends Command {
  type: "CompareScenarios";
  data: {
    configuration: SimulationConfiguration;
  };
}

/**
 * Union type of all possible commands
 */
export type AnyCommand =
  | RunSimulationCommand
  | UpdateParametersCommand
  | ClearCacheCommand
  | CompareScenariosCommand;

/**
 * Command result interface
 */
export interface CommandResult {
  /** Whether the command was successful */
  success: boolean;
  /** Command that was processed */
  commandId: string;
  /** Error message if command failed */
  error?: string;
  /** Additional result data */
  data?: Record<string, any>;
}

/**
 * Command type registry
 */
export const COMMAND_TYPES = {
  RUN_SIMULATION: "RunSimulation",
  UPDATE_PARAMETERS: "UpdateParameters",
  CLEAR_CACHE: "ClearCache",
  COMPARE_SCENARIOS: "CompareScenarios",
} as const;
