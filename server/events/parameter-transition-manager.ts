/**
 * Parameter transition manager for handling time-based parameter changes
 */

import type { UserParameters, ParameterTransition, ParameterPeriod } from "../../types/financial.ts";
import type { FinancialEvent, ParameterTransitionScheduledEvent, ParameterTransitionAppliedEvent, ParameterTransitionRemovedEvent } from "../interfaces/events.ts";
import { EVENT_TYPES } from "../interfaces/events.ts";

/**
 * Manages parameter transitions and applies them based on event timeline
 */
export class ParameterTransitionManager {
  private scheduledTransitions: Map<string, ParameterTransition> = new Map();
  private appliedTransitions: Map<string, Date> = new Map();

  /**
   * Processes events to build the current state of parameter transitions
   */
  processEvents(events: FinancialEvent[]): void {
    // Clear current state
    this.scheduledTransitions.clear();
    this.appliedTransitions.clear();

    // Process events in chronological order
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    for (const event of sortedEvents) {
      switch (event.type) {
        case EVENT_TYPES.PARAMETER_TRANSITION_SCHEDULED:
          this.handleTransitionScheduled(event as ParameterTransitionScheduledEvent);
          break;
        case EVENT_TYPES.PARAMETER_TRANSITION_APPLIED:
          this.handleTransitionApplied(event as ParameterTransitionAppliedEvent);
          break;
        case EVENT_TYPES.PARAMETER_TRANSITION_REMOVED:
          this.handleTransitionRemoved(event as ParameterTransitionRemovedEvent);
          break;
      }
    }
  }

  /**
   * Gets the active parameters for a specific date
   */
  getParametersForDate(baseParameters: UserParameters, targetDate: Date): UserParameters {
    // Get all transitions that should be applied by the target date
    const applicableTransitions = Array.from(this.scheduledTransitions.values())
      .filter(transition => transition.transitionDate <= targetDate)
      .sort((a, b) => a.transitionDate.getTime() - b.transitionDate.getTime());

    // Apply transitions in chronological order
    let currentParameters = { ...baseParameters };
    
    for (const transition of applicableTransitions) {
      currentParameters = this.applyParameterChanges(currentParameters, transition.parameterChanges);
    }

    return currentParameters;
  }

  /**
   * Gets parameter periods for the entire simulation timeline
   */
  getParameterPeriods(baseParameters: UserParameters, startDate: Date, endDate: Date): ParameterPeriod[] {
    const periods: ParameterPeriod[] = [];
    
    // Get all transitions within the simulation period
    const relevantTransitions = Array.from(this.scheduledTransitions.values())
      .filter(transition => 
        transition.transitionDate >= startDate && 
        transition.transitionDate <= endDate
      )
      .sort((a, b) => a.transitionDate.getTime() - b.transitionDate.getTime());

    let currentDate = startDate;
    let currentParameters = { ...baseParameters };

    // Create base period (from start to first transition or end)
    const firstTransitionDate = relevantTransitions.length > 0 
      ? relevantTransitions[0].transitionDate 
      : endDate;

    periods.push({
      startDate: currentDate,
      endDate: relevantTransitions.length > 0 ? firstTransitionDate : null,
      parameters: { ...currentParameters },
      transitionId: null
    });

    // Create periods for each transition
    for (let i = 0; i < relevantTransitions.length; i++) {
      const transition = relevantTransitions[i];
      const nextTransitionDate = i < relevantTransitions.length - 1 
        ? relevantTransitions[i + 1].transitionDate 
        : endDate;

      // Apply the transition
      currentParameters = this.applyParameterChanges(currentParameters, transition.parameterChanges);
      currentDate = transition.transitionDate;

      periods.push({
        startDate: currentDate,
        endDate: i < relevantTransitions.length - 1 ? nextTransitionDate : null,
        parameters: { ...currentParameters },
        transitionId: transition.id
      });
    }

    return periods;
  }

  /**
   * Checks if a transition should be applied at a specific date
   */
  shouldApplyTransition(transitionId: string, currentDate: Date): boolean {
    const transition = this.scheduledTransitions.get(transitionId);
    if (!transition) return false;

    // Check if transition date has been reached
    if (transition.transitionDate > currentDate) return false;

    // Check if transition has already been applied
    return !this.appliedTransitions.has(transitionId);
  }

  /**
   * Gets all scheduled transitions
   */
  getScheduledTransitions(): ParameterTransition[] {
    return Array.from(this.scheduledTransitions.values());
  }

  /**
   * Gets transitions that should be applied at a specific date
   */
  getTransitionsForDate(targetDate: Date): ParameterTransition[] {
    return Array.from(this.scheduledTransitions.values())
      .filter(transition => {
        const transitionTime = transition.transitionDate.getTime();
        const targetTime = targetDate.getTime();
        
        // Check if transition occurs on this exact date (within same day)
        const sameDay = Math.abs(transitionTime - targetTime) < 24 * 60 * 60 * 1000;
        return sameDay && transitionTime <= targetTime;
      });
  }

  /**
   * Invalidates cache when parameter transitions change
   */
  invalidateCache(): void {
    // This would trigger cache invalidation in the event cache
    // For now, we just clear our internal state
    this.scheduledTransitions.clear();
    this.appliedTransitions.clear();
  }

  private handleTransitionScheduled(event: ParameterTransitionScheduledEvent): void {
    const transition: ParameterTransition = {
      id: event.data.transitionId,
      transitionDate: event.data.transitionDate,
      label: event.data.label,
      parameterChanges: event.data.parameterChanges
    };

    this.scheduledTransitions.set(transition.id, transition);
  }

  private handleTransitionApplied(event: ParameterTransitionAppliedEvent): void {
    this.appliedTransitions.set(event.data.transitionId, event.data.appliedAt);
  }

  private handleTransitionRemoved(event: ParameterTransitionRemovedEvent): void {
    this.scheduledTransitions.delete(event.data.transitionId);
    this.appliedTransitions.delete(event.data.transitionId);
  }

  /**
   * Applies parameter changes to existing parameters
   */
  private applyParameterChanges(
    baseParameters: UserParameters, 
    changes: Partial<UserParameters>
  ): UserParameters {
    const result = { ...baseParameters };

    // Apply each parameter change
    for (const [key, value] of Object.entries(changes)) {
      if (value !== undefined && value !== null) {
        // Handle nested objects like arrays of loans, investments, etc.
        if (key === 'loans' && Array.isArray(value)) {
          // Validate that all items are loans
          const isValidLoans = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'principal' in item && 'interestRate' in item
          );
          if (isValidLoans) {
            result.loans = value as any;
          }
        } else if (key === 'investmentHoldings' && Array.isArray(value)) {
          // Validate that all items are investment holdings
          const isValidHoldings = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'currentValue' in item
          );
          if (isValidHoldings) {
            result.investmentHoldings = value as any;
          }
        } else if (key === 'superAccounts' && Array.isArray(value)) {
          // Validate that all items are super accounts
          const isValidSuper = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'balance' in item
          );
          if (isValidSuper) {
            result.superAccounts = value as any;
          }
        } else if (key === 'expenseItems' && Array.isArray(value)) {
          // Validate that all items are expense items
          const isValidExpenses = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'amount' in item
          );
          if (isValidExpenses) {
            result.expenseItems = value as any;
          }
        } else if (key === 'incomeSources' && Array.isArray(value)) {
          // Validate that all items are income sources
          const isValidIncome = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'amount' in item
          );
          if (isValidIncome) {
            result.incomeSources = value as any;
          }
        } else if (key === 'people' && Array.isArray(value)) {
          // Validate that all items are people
          const isValidPeople = value.every(item => 
            item && typeof item === 'object' && 'id' in item && 'name' in item
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
            result.taxBrackets = value as any;
          }
        } else {
          // Simple parameter assignment
          (result as any)[key] = value;
        }
      }
    }

    return result;
  }
}

/**
 * Utility functions for parameter transition validation
 */
export class ParameterTransitionValidation {
  /**
   * Validates that a parameter transition is well-formed
   */
  static validateTransition(transition: ParameterTransition): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!transition.id || typeof transition.id !== 'string') {
      errors.push('Transition ID is required and must be a string');
    }

    if (!transition.transitionDate || !(transition.transitionDate instanceof Date)) {
      errors.push('Transition date is required and must be a valid Date');
    }

    if (!transition.parameterChanges || typeof transition.parameterChanges !== 'object') {
      errors.push('Parameter changes are required and must be an object');
    }

    // Validate parameter changes are not empty
    if (transition.parameterChanges && Object.keys(transition.parameterChanges).length === 0) {
      errors.push('Parameter changes cannot be empty');
    }

    // Validate transition date is not in the past (with some tolerance)
    if (transition.transitionDate) {
      const now = new Date();
      const dayInMs = 24 * 60 * 60 * 1000;
      if (transition.transitionDate.getTime() < now.getTime() - dayInMs) {
        errors.push('Transition date cannot be more than 1 day in the past');
      }
    }

    // Validate parameter changes
    if (transition.parameterChanges) {
      const paramValidation = ParameterTransitionValidation.validateParameterChanges(transition.parameterChanges);
      if (!paramValidation.isValid) {
        errors.push(...paramValidation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validates that parameter changes are valid
   */
  static validateParameterChanges(changes: Partial<UserParameters>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(changes)) {
      // Validate numeric parameters are non-negative where appropriate
      if (typeof value === 'number') {
        if (key.toLowerCase().includes('salary') || key.toLowerCase().includes('expense') || key.toLowerCase().includes('contribution') || key.toLowerCase().includes('balance')) {
          if (value < 0) {
            errors.push(`Parameter ${key} must be non-negative, got: ${value}`);
          }
        }

        if (key.includes('rate') || key.includes('Rate')) {
          if (value < 0 || value > 100) {
            errors.push(`Rate parameter ${key} must be between 0 and 100, got: ${value}`);
          }
        }

        if (key.includes('age') || key.includes('Age')) {
          if (value < 0 || value > 120) {
            errors.push(`Age parameter ${key} must be between 0 and 120, got: ${value}`);
          }
        }
      }

      // Validate arrays are properly structured
      if (Array.isArray(value)) {
        if (key === 'loans') {
          for (const loan of value) {
            if (!loan || typeof loan !== 'object' || 
                !('id' in loan) || !('principal' in loan) || !('interestRate' in loan)) {
              errors.push(`Invalid loan structure in ${key}`);
            }
          }
        } else if (key === 'investmentHoldings') {
          for (const holding of value) {
            if (!holding || typeof holding !== 'object' || 
                !('id' in holding) || !('currentValue' in holding) ||
                typeof (holding as any).currentValue !== 'number') {
              errors.push(`Invalid investment holding structure in ${key}`);
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

  /**
   * Validates that transitions don't conflict with each other
   */
  static validateTransitionConflicts(transitions: ParameterTransition[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for duplicate IDs
    const ids = transitions.map(t => t.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate transition IDs found: ${duplicateIds.join(', ')}`);
    }

    // Check for transitions on the same date that modify the same parameters
    const transitionsByDate = new Map<string, ParameterTransition[]>();
    
    for (const transition of transitions) {
      const dateKey = transition.transitionDate.toISOString().split('T')[0]; // YYYY-MM-DD
      if (!transitionsByDate.has(dateKey)) {
        transitionsByDate.set(dateKey, []);
      }
      transitionsByDate.get(dateKey)!.push(transition);
    }

    for (const [date, dateTransitions] of transitionsByDate) {
      if (dateTransitions.length > 1) {
        // Check for parameter conflicts
        const allChangedParams = new Set<string>();
        const conflictingParams = new Set<string>();

        for (const transition of dateTransitions) {
          for (const param of Object.keys(transition.parameterChanges)) {
            if (allChangedParams.has(param)) {
              conflictingParams.add(param);
            }
            allChangedParams.add(param);
          }
        }

        if (conflictingParams.size > 0) {
          errors.push(`Parameter conflicts on ${date}: ${Array.from(conflictingParams).join(', ')}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}