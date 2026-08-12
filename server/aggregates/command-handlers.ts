/**
 * Command handlers for the financial aggregate
 */

import type { Command, CommandResult, CommandHandler } from "../interfaces/commands.ts";
import type { FinancialAggregate, AggregateRepository } from "../interfaces/aggregate.ts";

/**
 * Base command handler implementation
 */
export abstract class BaseCommandHandler<T extends Command> implements CommandHandler<T> {
  constructor(
    protected aggregateRepository: AggregateRepository<FinancialAggregate>
  ) {}

  abstract handle(command: T): Promise<CommandResult>;

  async validate(command: T): Promise<boolean> {
    // Basic validation - subclasses can override for specific validation
    return !!(command.id && command.type && command.sessionId && command.timestamp);
  }

  /**
   * Gets or creates the financial aggregate for the command's session
   */
  protected async getOrCreateAggregate(sessionId: string): Promise<FinancialAggregate> {
    try {
      // Try to get existing aggregate
      return await this.aggregateRepository.getById('financial', sessionId);
    } catch (error) {
      // If not found, create new aggregate
      return await this.aggregateRepository.create(sessionId);
    }
  }

  /**
   * Saves the aggregate after command processing
   */
  protected async saveAggregate(aggregate: FinancialAggregate): Promise<void> {
    await this.aggregateRepository.save(aggregate);
  }
}

/**
 * Handler for RunSimulation commands
 */
export class RunSimulationCommandHandler extends BaseCommandHandler<any> {
  async handle(command: any): Promise<CommandResult> {
    const aggregate = await this.getOrCreateAggregate(command.sessionId);
    const result = await aggregate.processCommand(command);
    
    if (result.success) {
      await this.saveAggregate(aggregate);
    }
    
    return result;
  }
}

/**
 * Handler for UpdateParameters commands
 */
export class UpdateParametersCommandHandler extends BaseCommandHandler<any> {
  async handle(command: any): Promise<CommandResult> {
    const aggregate = await this.getOrCreateAggregate(command.sessionId);
    const result = await aggregate.processCommand(command);
    
    if (result.success) {
      await this.saveAggregate(aggregate);
    }
    
    return result;
  }
}

/**
 * Handler for ProcessTimeStep commands
 */
export class ProcessTimeStepCommandHandler extends BaseCommandHandler<any> {
  async handle(command: any): Promise<CommandResult> {
    const aggregate = await this.getOrCreateAggregate(command.sessionId);
    const result = await aggregate.processCommand(command);
    
    if (result.success) {
      await this.saveAggregate(aggregate);
    }
    
    return result;
  }
}

/**
 * Handler for AddParameterTransition commands
 */
export class AddParameterTransitionCommandHandler extends BaseCommandHandler<any> {
  async handle(command: any): Promise<CommandResult> {
    const aggregate = await this.getOrCreateAggregate(command.sessionId);
    const result = await aggregate.processCommand(command);
    
    if (result.success) {
      await this.saveAggregate(aggregate);
    }
    
    return result;
  }
}

/**
 * Handler for RemoveParameterTransition commands
 */
export class RemoveParameterTransitionCommandHandler extends BaseCommandHandler<any> {
  async handle(command: any): Promise<CommandResult> {
    const aggregate = await this.getOrCreateAggregate(command.sessionId);
    const result = await aggregate.processCommand(command);
    
    if (result.success) {
      await this.saveAggregate(aggregate);
    }
    
    return result;
  }
}

/**
 * Handler for ClearCache commands
 */
export class ClearCacheCommandHandler extends BaseCommandHandler<any> {
  async handle(command: any): Promise<CommandResult> {
    const aggregate = await this.getOrCreateAggregate(command.sessionId);
    const result = await aggregate.processCommand(command);
    
    if (result.success) {
      await this.saveAggregate(aggregate);
    }
    
    return result;
  }
}

/**
 * Factory for creating and registering command handlers
 */
export class CommandHandlerFactory {
  static createHandlers(
    aggregateRepository: AggregateRepository<FinancialAggregate>
  ): Map<string, CommandHandler<any>> {
    const handlers = new Map<string, CommandHandler<any>>();

    handlers.set('RunSimulation', new RunSimulationCommandHandler(aggregateRepository));
    handlers.set('UpdateParameters', new UpdateParametersCommandHandler(aggregateRepository));
    handlers.set('ProcessTimeStep', new ProcessTimeStepCommandHandler(aggregateRepository));
    handlers.set('AddParameterTransition', new AddParameterTransitionCommandHandler(aggregateRepository));
    handlers.set('RemoveParameterTransition', new RemoveParameterTransitionCommandHandler(aggregateRepository));
    handlers.set('ClearCache', new ClearCacheCommandHandler(aggregateRepository));

    return handlers;
  }

  static registerHandlers(
    commandBus: any,
    aggregateRepository: AggregateRepository<FinancialAggregate>
  ): void {
    const handlers = this.createHandlers(aggregateRepository);

    for (const [commandType, handler] of handlers) {
      commandBus.registerHandler(commandType, (command: Command) => handler.handle(command));
    }
  }
}