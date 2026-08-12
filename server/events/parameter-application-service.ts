/**
 * Service for applying parameter transitions during simulation
 */

import type { UserParameters, ParameterTransition } from "../../types/financial.ts";
import type { FinancialEvent } from "../interfaces/events.ts";
import { ParameterTransitionManager } from "./parameter-transition-manager.ts";
import { FinancialEventFactory } from "./event-factory.ts";

/**
 * Service that handles parameter application logic during simulation
 */
export class ParameterApplicationService {
  constructor(
    private transitionManager: ParameterTransitionManager,
    private eventFactory: FinancialEventFactory
  ) {}

  /**
   * Applies scheduled parameter transitions for a specific date
   */
  applyTransitionsForDate(
    currentDate: Date,
    currentParameters: UserParameters
  ): { events: FinancialEvent[]; updatedParameters: UserParameters } {
    const events: FinancialEvent[] = [];
    let updatedParameters = { ...currentParameters };

    // Get transitions that should be applied on this date
    const transitionsToApply = this.transitionManager.getTransitionsForDate(currentDate);

    for (const transition of transitionsToApply) {
      // Check if transition should be applied
      if (this.transitionManager.shouldApplyTransition(transition.id, currentDate)) {
        // Apply the transition
        const previousParameters = { ...updatedParameters };
        updatedParameters = this.applyParameterChanges(updatedParameters, transition.parameterChanges);

        // Generate transition applied event
        const appliedEvent = this.eventFactory.createParameterTransitionAppliedEvent(
          transition.id,
          transition.transitionDate,
          currentDate,
          transition.parameterChanges,
          this.extractRelevantParameters(previousParameters, transition.parameterChanges),
          this.extractRelevantParameters(updatedParameters, transition.parameterChanges)
        );

        events.push(appliedEvent);

        // Generate individual parameter change events for each changed parameter
        for (const [paramName, newValue] of Object.entries(transition.parameterChanges)) {
          const previousValue = (previousParameters as any)[paramName];
          
          // Only generate event if value actually changed
          if (previousValue !== newValue && newValue !== undefined && newValue !== null) {
            const paramChangeEvent = this.eventFactory.createParameterChangedEvent(
              paramName,
              previousValue,
              newValue,
              currentDate,
              `Applied from transition: ${transition.label || transition.id}`
            );
            events.push(paramChangeEvent);
          }
        }
      }
    }

    return { events, updatedParameters };
  }

  /**
   * Checks if any parameter transitions are scheduled for a date range
   */
  hasTransitionsInRange(startDate: Date, endDate: Date): boolean {
    const transitions = this.transitionManager.getScheduledTransitions();
    
    return transitions.some(transition => 
      transition.transitionDate >= startDate && 
      transition.transitionDate <= endDate
    );
  }

  /**
   * Gets the next transition date after a given date
   */
  getNextTransitionDate(afterDate: Date): Date | null {
    const transitions = this.transitionManager.getScheduledTransitions();
    
    const futureTransitions = transitions
      .filter(t => t.transitionDate > afterDate)
      .sort((a, b) => a.transitionDate.getTime() - b.transitionDate.getTime());

    return futureTransitions.length > 0 ? futureTransitions[0].transitionDate : null;
  }

  /**
   * Validates that parameter transitions are compatible with simulation
   */
  validateTransitionsForSimulation(
    transitions: ParameterTransition[],
    simulationStart: Date,
    simulationEnd: Date
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const transition of transitions) {
      // Check if transition is within simulation period
      if (transition.transitionDate < simulationStart) {
        errors.push(`Transition ${transition.id} occurs before simulation start`);
      }

      if (transition.transitionDate > simulationEnd) {
        errors.push(`Transition ${transition.id} occurs after simulation end`);
      }

      // Validate parameter changes are reasonable
      const validation = this.validateParameterChanges(transition.parameterChanges);
      if (!validation.isValid) {
        errors.push(`Transition ${transition.id}: ${validation.errors.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generates cache invalidation events when transitions change
   */
  generateCacheInvalidationEvents(reason: string): FinancialEvent[] {
    const events: FinancialEvent[] = [];

    // Generate a parameter change event to signal cache invalidation
    events.push(this.eventFactory.createParameterChangedEvent(
      'cache_invalidation',
      null,
      true,
      new Date(),
      reason
    ));

    return events;
  }

  private applyParameterChanges(
    baseParameters: UserParameters,
    changes: Partial<UserParameters>
  ): UserParameters {
    const result = { ...baseParameters };

    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined && value !== null) {
        // Handle complex parameter types with proper type checking
        if (key === 'loans' && Array.isArray(value)) {
          // Validate that all items are loans
          const isValidLoans = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'principal' in item && 'interestRate' in item
          );
          if (isValidLoans) {
            result.loans = [...value];
          }
        } else if (key === 'investmentHoldings' && Array.isArray(value)) {
          // Validate that all items are investment holdings
          const isValidHoldings = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'currentValue' in item
          );
          if (isValidHoldings) {
            result.investmentHoldings = [...value];
          }
        } else if (key === 'superAccounts' && Array.isArray(value)) {
          // Validate that all items are super accounts
          const isValidSuper = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'balance' in item
          );
          if (isValidSuper) {
            result.superAccounts = [...value];
          }
        } else if (key === 'expenseItems' && Array.isArray(value)) {
          // Validate that all items are expense items
          const isValidExpenses = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'amount' in item && 'category' in item
          );
          if (isValidExpenses) {
            result.expenseItems = value as any;
          }
        } else if (key === 'incomeSources' && Array.isArray(value)) {
          // Validate that all items are income sources
          const isValidIncome = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'amount' in item && 'label' in item
          );
          if (isValidIncome) {
            result.incomeSources = value as any;
          }
        } else if (key === 'people' && Array.isArray(value)) {
          // Validate that all items are people
          const isValidPeople = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'name' in item && 'currentAge' in item
          );
          if (isValidPeople) {
            result.people = value as any;
          }
        } else if (key === 'taxBrackets' && Array.isArray(value)) {
          // Validate that all items are tax brackets
          const isValidBrackets = value.every(item => 
            item && typeof item === 'object' && 'min' in item && 'rate' in item
          );
          if (isValidBrackets) {
            result.taxBrackets = [...value];
          }
        } else {
          // Simple parameter assignment
          (result as any)[key] = value;
        }
      }
    }

    return result;
  }

  private extractRelevantParameters(
    parameters: UserParameters,
    changes: Partial<UserParameters>
  ): Record<string, any> {
    const relevant: Record<string, any> = {};

    for (const key of Object.keys(changes)) {
      relevant[key] = (parameters as any)[key];
    }

    return relevant;
  }

  private validateParameterChanges(changes: Partial<UserParameters>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(changes)) {
      // Validate numeric parameters
      if (typeof value === 'number') {
        if (key.includes('salary') || key.includes('expense') || key.includes('contribution') || key.includes('balance')) {
          if (value < 0) {
            errors.push(`Parameter ${key} must be non-negative`);
          }
        }

        if (key.includes('rate') || key.includes('Rate')) {
          if (value < 0 || value > 100) {
            errors.push(`Rate parameter ${key} must be between 0 and 100`);
          }
        }

        if (key.includes('age') || key.includes('Age')) {
          if (value < 0 || value > 120) {
            errors.push(`Age parameter ${key} must be between 0 and 120`);
          }
        }
      }

      // Validate dates
      if (value instanceof Date && isNaN(value.getTime())) {
        errors.push(`Parameter ${key} must be a valid date`);
      }

      // Validate arrays have proper structure
      if (Array.isArray(value)) {
        if (key === 'loans') {
          for (const loan of value) {
            if (!loan || typeof loan !== 'object' || 
                !('id' in loan) || !('principal' in loan) || !('interestRate' in loan) ||
                typeof (loan as any).principal !== 'number' || typeof (loan as any).interestRate !== 'number') {
              errors.push(`Invalid loan structure in ${key}`);
            }
          }
        }
        // Add more array validations as needed
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

/**
 * Factory for creating parameter application service
 */
export class ParameterApplicationServiceFactory {
  static create(
    transitionManager: ParameterTransitionManager,
    sessionId: string,
    aggregateId: string
  ): ParameterApplicationService {
    const eventFactory = new FinancialEventFactory(sessionId, aggregateId);
    return new ParameterApplicationService(transitionManager, eventFactory);
  }
}