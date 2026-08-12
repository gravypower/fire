/**
 * Command bus implementation for routing commands to handlers
 */

import type { Command, CommandResult } from "../interfaces/commands.ts";
import type { CommandBus } from "../interfaces/aggregate.ts";

/**
 * In-memory command bus implementation
 */
export class InMemoryCommandBus implements CommandBus {
  private handlers = new Map<string, (command: Command) => Promise<CommandResult>>();
  private validationEnabled = true;

  async dispatch<T extends Command>(command: T): Promise<CommandResult> {
    // Pre-dispatch validation
    const preValidationResult = this.validateCommandStructure(command);
    if (!preValidationResult.success) {
      return {
        success: false,
        commandId: (command && command.id) || 'unknown',
        events: [],
        error: preValidationResult.error,
      };
    }

    const handler = this.handlers.get(command.type);
    
    if (!handler) {
      return {
        success: false,
        commandId: command.id,
        events: [],
        error: `No handler registered for command type: ${command.type}`,
      };
    }

    try {
      const result = await handler(command);
      
      // Post-dispatch validation
      if (this.validationEnabled && result.success) {
        const postValidationResult = this.validateCommandResult(result);
        if (!postValidationResult.success) {
          return {
            success: false,
            commandId: command.id,
            events: [],
            error: `Command result validation failed: ${postValidationResult.error}`,
          };
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        commandId: command.id,
        events: [],
        error: `Command processing failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  registerHandler<T extends Command>(
    commandType: string, 
    handler: (command: T) => Promise<CommandResult>
  ): void {
    this.handlers.set(commandType, handler as (command: Command) => Promise<CommandResult>);
  }

  unregisterHandler(commandType: string): void {
    this.handlers.delete(commandType);
  }

  getRegisteredHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Enable or disable command result validation
   */
  setValidationEnabled(enabled: boolean): void {
    this.validationEnabled = enabled;
  }

  /**
   * Validates basic command structure before dispatch
   */
  private validateCommandStructure(command: Command): { success: boolean; error?: string } {
    if (!command) {
      return { success: false, error: "Command is null or undefined" };
    }

    if (!command.id || typeof command.id !== 'string') {
      return { success: false, error: "Command missing or invalid id" };
    }

    if (!command.type || typeof command.type !== 'string') {
      return { success: false, error: "Command missing or invalid type" };
    }

    if (!command.sessionId || typeof command.sessionId !== 'string') {
      return { success: false, error: "Command missing or invalid sessionId" };
    }

    if (!command.timestamp || !(command.timestamp instanceof Date)) {
      return { success: false, error: "Command missing or invalid timestamp" };
    }

    return { success: true };
  }

  /**
   * Validates command result structure after processing
   */
  private validateCommandResult(result: CommandResult): { success: boolean; error?: string } {
    if (!result) {
      return { success: false, error: "Command result is null or undefined" };
    }

    if (typeof result.success !== 'boolean') {
      return { success: false, error: "Command result missing or invalid success field" };
    }

    if (!result.commandId || typeof result.commandId !== 'string') {
      return { success: false, error: "Command result missing or invalid commandId" };
    }

    if (!Array.isArray(result.events)) {
      return { success: false, error: "Command result missing or invalid events array" };
    }

    if (!result.success && (!result.error || typeof result.error !== 'string')) {
      return { success: false, error: "Failed command result must include error message" };
    }

    return { success: true };
  }
}