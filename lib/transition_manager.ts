/**
 * Parameter Transition Manager
 * Manages parameter transitions and resolves active parameters for specific dates
 */

import type {
  ParameterTransition,
  ParameterPeriod,
  SimulationConfiguration,
  UserParameters,
  ValidationResult,
} from "../types/financial.ts";

/**
 * Adds a new parameter transition to the configuration
 * Validates the transition and maintains chronological order
 */
export function addTransition(
  config: SimulationConfiguration,
  transition: ParameterTransition,
): ValidationResult {
  // Validate the transition
  const validationResult = validateTransition(transition, config);
  if (!validationResult.isValid) {
    return validationResult;
  }

  // Add the transition and sort chronologically
  config.transitions.push(transition);
  config.transitions.sort(
    (a, b) => a.transitionDate.getTime() - b.transitionDate.getTime(),
  );

  return { isValid: true };
}

/**
 * Updates an existing transition
 * Re-validates and maintains chronological order
 */
export function updateTransition(
  config: SimulationConfiguration,
  id: string,
  updates: Partial<ParameterTransition>,
): ValidationResult {
  // Find the transition
  const index = config.transitions.findIndex((t) => t.id === id);
  if (index === -1) {
    return {
      isValid: false,
      error: `Transition with id "${id}" not found`,
    };
  }

  // Create updated transition
  const updatedTransition = {
    ...config.transitions[index],
    ...updates,
  };

  // Validate the updated transition
  // Create a temporary config without the old transition for validation
  const tempConfig = {
    ...config,
    transitions: config.transitions.filter((t) => t.id !== id),
  };
  const validationResult = validateTransition(updatedTransition, tempConfig);
  if (!validationResult.isValid) {
    return validationResult;
  }

  // Update the transition
  config.transitions[index] = updatedTransition;

  // Re-sort to maintain chronological order
  config.transitions.sort(
    (a, b) => a.transitionDate.getTime() - b.transitionDate.getTime(),
  );

  return { isValid: true };
}

/**
 * Removes a transition by ID
 */
export function removeTransition(
  config: SimulationConfiguration,
  id: string,
): void {
  config.transitions = config.transitions.filter((t) => t.id !== id);
}

/**
 * Gets all transitions in chronological order
 */
export function getTransitions(
  config: SimulationConfiguration,
): ParameterTransition[] {
  // Return a copy to prevent external modification
  return [...config.transitions];
}

/**
 * Resolves the active parameters for a specific date
 * Applies all transitions up to and including that date
 */
export function resolveParametersForDate(
  date: Date,
  config: SimulationConfiguration,
): UserParameters {
  // Start with base parameters
  let activeParams: UserParameters = { ...config.baseParameters };

  // Apply all transitions up to this date
  const applicableTransitions = config.transitions
    .filter((t) => t.transitionDate <= date)
    .sort((a, b) => a.transitionDate.getTime() - b.transitionDate.getTime());

  for (const transition of applicableTransitions) {
    // Merge parameter changes
    activeParams = {
      ...activeParams,
      ...transition.parameterChanges,
    };
  }

  return activeParams;
}

/**
 * Builds parameter periods from the configuration
 * Converts transitions into continuous time spans with constant parameters
 */
export function buildParameterPeriods(
  config: SimulationConfiguration,
): ParameterPeriod[] {
  const periods: ParameterPeriod[] = [];

  // Sort transitions chronologically
  const sortedTransitions = [...config.transitions].sort(
    (a, b) => a.transitionDate.getTime() - b.transitionDate.getTime(),
  );

  // Handle case with no transitions
  if (sortedTransitions.length === 0) {
    const endDate = new Date(config.baseParameters.startDate);
    endDate.setFullYear(
      endDate.getFullYear() + config.baseParameters.simulationYears,
    );

    periods.push({
      startDate: config.baseParameters.startDate,
      endDate: null,
      parameters: config.baseParameters,
      transitionId: null,
    });
    return periods;
  }

  // Create base period (from start to first transition)
  periods.push({
    startDate: config.baseParameters.startDate,
    endDate: sortedTransitions[0].transitionDate,
    parameters: config.baseParameters,
    transitionId: null,
  });

  // Create periods for each transition
  for (let i = 0; i < sortedTransitions.length; i++) {
    const transition = sortedTransitions[i];
    const nextTransition = sortedTransitions[i + 1];

    // Resolve parameters for this period
    const periodParams = resolveParametersForDate(
      transition.transitionDate,
      config,
    );

    periods.push({
      startDate: transition.transitionDate,
      endDate: nextTransition ? nextTransition.transitionDate : null,
      parameters: periodParams,
      transitionId: transition.id,
    });
  }

  return periods;
}

/**
 * Validates a parameter transition
 * Checks date validity, duplicate dates, and parameter values
 */
export function validateTransition(
  transition: ParameterTransition,
  config: SimulationConfiguration,
): ValidationResult {
  // Validate at least one parameter is specified
  if (
    !transition.parameterChanges ||
    Object.keys(transition.parameterChanges).length === 0
  ) {
    return {
      isValid: false,
      error: "At least one parameter must be specified in the transition",
    };
  }

  // Calculate simulation end date
  const startDate = config.baseParameters.startDate;
  const endDate = new Date(startDate);
  endDate.setFullYear(
    endDate.getFullYear() + config.baseParameters.simulationYears,
  );

  // Validate transition date is within simulation timeframe
  if (transition.transitionDate <= startDate) {
    return {
      isValid: false,
      error:
        "Transition date must be after the simulation start date",
    };
  }

  if (transition.transitionDate >= endDate) {
    return {
      isValid: false,
      error:
        "Transition date must be before the simulation end date",
    };
  }

  // Validate no duplicate transition dates
  const duplicateExists = config.transitions.some(
    (t) =>
      t.id !== transition.id &&
      t.transitionDate.getTime() === transition.transitionDate.getTime(),
  );

  if (duplicateExists) {
    return {
      isValid: false,
      error: "A transition already exists at this date",
    };
  }

  // Validate parameter values are positive and numeric where applicable
  const changes = transition.parameterChanges;

  // List of numeric parameters that must be positive
  const positiveNumericParams: (keyof UserParameters)[] = [
    "annualSalary",
    "incomeTaxRate",
    "monthlyLivingExpenses",
    "monthlyRentOrMortgage",
    "loanPrincipal",
    "loanInterestRate",
    "loanPaymentAmount",
    "currentOffsetBalance",
    "monthlyInvestmentContribution",
    "investmentReturnRate",
    "currentInvestmentBalance",
    "superContributionRate",
    "superReturnRate",
    "currentSuperBalance",
    "desiredAnnualRetirementIncome",
    "retirementAge",
    "currentAge",
    "simulationYears",
  ];

  for (const param of positiveNumericParams) {
    if (param in changes) {
      const value = changes[param];
      if (typeof value === "number") {
        if (value < 0) {
          return {
            isValid: false,
            error: `Parameter "${param}" must be a positive value`,
          };
        }
        if (isNaN(value) || !isFinite(value)) {
          return {
            isValid: false,
            error: `Parameter "${param}" must be a valid number`,
          };
        }
      }
    }
  }

  return { isValid: true };
}
