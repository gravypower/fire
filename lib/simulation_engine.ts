/**
 * Simulation Engine Core
 * Orchestrates financial calculations over time
 * Validates: Requirements 2.1, 2.2, 7.1, 7.2
 */

import type {
  FinancialState,
  SimulationResult,
  TimeInterval,
  UserParameters,
  SimulationConfiguration,
  EnhancedSimulationResult,
  ComparisonSimulationResult,
  TransitionPoint,
} from "../types/financial.ts";
import {
  ExpenseProcessor,
  IncomeProcessor,
  InvestmentProcessor,
  LoanProcessor,
  RetirementCalculator,
} from "./processors.ts";
import { generateWarnings } from "./result_utils.ts";
import {
  resolveParametersForDate,
  buildParameterPeriods,
} from "./transition_manager.ts";

/**
 * Converts a time interval to number of periods per year
 */
function intervalToPeriodsPerYear(interval: TimeInterval): number {
  switch (interval) {
    case "week":
      return 52;
    case "month":
      return 12;
    case "year":
      return 1;
  }
}

/**
 * Converts an annual rate to an interval-specific rate
 * Uses the formula: intervalRate = (1 + annualRate) ^ (interval / year) - 1
 */
export function convertAnnualRateToInterval(
  annualRate: number,
  interval: TimeInterval,
): number {
  const periodsPerYear = intervalToPeriodsPerYear(interval);
  return Math.pow(1 + annualRate, 1 / periodsPerYear) - 1;
}

/**
 * Converts a payment frequency to an interval-specific payment amount
 */
function convertPaymentToInterval(
  paymentAmount: number,
  paymentFrequency: "weekly" | "fortnightly" | "monthly",
  targetInterval: TimeInterval,
): number {
  // First convert payment to annual
  let annualPayment: number;
  switch (paymentFrequency) {
    case "weekly":
      annualPayment = paymentAmount * 52;
      break;
    case "fortnightly":
      annualPayment = paymentAmount * 26;
      break;
    case "monthly":
      annualPayment = paymentAmount * 12;
      break;
  }

  // Then convert annual to target interval
  const periodsPerYear = intervalToPeriodsPerYear(targetInterval);
  return annualPayment / periodsPerYear;
}

/**
 * Advances a date by one interval
 */
function advanceDate(date: Date, interval: TimeInterval): Date {
  const newDate = new Date(date);
  switch (interval) {
    case "week":
      newDate.setDate(newDate.getDate() + 7);
      break;
    case "month":
      newDate.setMonth(newDate.getMonth() + 1);
      break;
    case "year":
      newDate.setFullYear(newDate.getFullYear() + 1);
      break;
  }
  return newDate;
}

/**
 * Simulation Engine
 * Core engine that runs financial simulations over time
 */
export const SimulationEngine = {
  /**
   * Runs a complete simulation from start date to end date
   * Validates: Requirements 2.1, 2.2
   */
  runSimulation(params: UserParameters): SimulationResult {
    const interval: TimeInterval = "month"; // Default to monthly intervals
    const states: FinancialState[] = [];
    const warnings: string[] = [];

    // Initialize starting state
    let currentState: FinancialState = {
      date: new Date(params.startDate),
      cash: 0, // Starting with zero cash
      investments: params.currentInvestmentBalance,
      superannuation: params.currentSuperBalance,
      loanBalance: params.loanPrincipal,
      offsetBalance: params.currentOffsetBalance || 0,
      netWorth: 0,
      cashFlow: 0,
      taxPaid: 0,
      interestSaved: 0,
    };

    // Calculate initial net worth
    currentState.netWorth = currentState.cash + currentState.investments +
      currentState.superannuation + currentState.offsetBalance - currentState.loanBalance;

    states.push(currentState);

    // Calculate end date
    const endDate = new Date(params.startDate);
    endDate.setFullYear(endDate.getFullYear() + params.simulationYears);

    // Run simulation for each time interval
    let currentDate = new Date(params.startDate);
    while (currentDate < endDate) {
      currentDate = advanceDate(currentDate, interval);
      currentState = this.calculateTimeStep(currentState, params, interval);
      currentState.date = new Date(currentDate);
      states.push(currentState);
    }

    // Find retirement date
    const retirement = RetirementCalculator.findRetirementDate(
      states,
      params.desiredAnnualRetirementIncome,
      params.currentAge,
      params.retirementAge,
    );

    // Generate warnings and alerts for unsustainable scenarios
    const financialWarnings = generateWarnings(states);
    const warningMessages = financialWarnings.map(w => w.message);

    // Check sustainability (basic check)
    const isSustainable = this.checkSustainability(states, warnings);

    return {
      states,
      retirementDate: retirement.date,
      retirementAge: retirement.age,
      isSustainable,
      warnings: [...warnings, ...warningMessages],
    };
  },

  /**
   * Calculates financial state for a single time step
   * Orchestrates all processors in the correct sequence
   * Validates: Requirements 2.2, 7.1, 7.2
   *
   * Sequence:
   * 1. Income Phase: Add salary income and deduct tax
   * 2. Expense Phase: Deduct living expenses and rent/mortgage
   * 3. Loan Phase: Process loan payment (interest + principal) with offset account
   * 4. Investment Phase: Add contributions and apply growth
   * 5. Super Phase: Add contributions and apply growth
   * 6. Offset Phase: Move leftover cash to offset account
   * 7. State Update: Calculate net worth and cash flow
   */
  calculateTimeStep(
    currentState: FinancialState,
    params: UserParameters,
    interval: TimeInterval,
  ): FinancialState {
    // Start with current state values
    let cash = currentState.cash;
    let investments = currentState.investments;
    let superannuation = currentState.superannuation;
    let loanBalance = currentState.loanBalance;
    let offsetBalance = currentState.offsetBalance;
    let taxPaid = 0;
    let interestSaved = 0;

    // Phase 1: Income - Add salary income and deduct tax
    const grossIncome = IncomeProcessor.calculateIncome(params, interval);
    taxPaid = IncomeProcessor.calculateTax(params, interval);
    const netIncome = grossIncome - taxPaid;
    cash += netIncome;

    // Phase 2: Expenses - Deduct living expenses only
    // Note: Mortgage payments are handled in the loan phase
    const expenses = ExpenseProcessor.calculateExpenses(params, interval);
    cash -= expenses;
    
    // Requirements 7.1: Handle negative cash flow by reducing available cash
    // Cash can go negative, representing debt or overdraft

    // Phase 3: Loan - Process loan payment with offset account
    const loanPayment = convertPaymentToInterval(
      params.loanPaymentAmount,
      params.loanPaymentFrequency,
      interval,
    );

    if (loanBalance > 0) {
      // Check if we have enough cash for loan payment
      if (cash >= loanPayment) {
        const loanResult = LoanProcessor.calculateLoanPayment(
          loanBalance,
          offsetBalance,
          params.loanInterestRate / 100, // Convert percentage to decimal
          loanPayment,
          interval,
          params.useOffsetAccount || false,
        );
        loanBalance = loanResult.newBalance;
        interestSaved = loanResult.interestSaved;
        cash -= loanPayment;
      } else {
        // Negative cash flow scenario - can't make full loan payment
        // Requirements 7.1, 7.2: Handle negative cash flow
        // Pay what we can, but this creates an unsustainable situation
        const partialPayment = Math.max(0, cash);
        const loanResult = LoanProcessor.calculateLoanPayment(
          loanBalance,
          offsetBalance,
          params.loanInterestRate / 100,
          partialPayment,
          interval,
          params.useOffsetAccount || false,
        );
        loanBalance = loanResult.newBalance;
        interestSaved = loanResult.interestSaved;
        cash = 0; // All cash used for partial loan payment
      }
    }

    // Phase 4: Investment - Add contributions and apply growth
    // Convert monthly contribution to interval
    const investmentContribution = (params.monthlyInvestmentContribution * 12) /
      intervalToPeriodsPerYear(interval);

    // Requirements 7.2: Prevent investment contributions if cash is negative or insufficient
    let actualInvestmentContribution = 0;
    if (cash > 0 && cash >= investmentContribution) {
      actualInvestmentContribution = investmentContribution;
      cash -= investmentContribution;
    } else {
      // Can't afford investment contribution - skip it
      actualInvestmentContribution = 0;
    }

    investments = InvestmentProcessor.calculateInvestmentGrowth(
      investments,
      actualInvestmentContribution,
      params.investmentReturnRate / 100, // Convert percentage to decimal
      interval,
    );

    // Phase 5: Superannuation - Add contributions and apply growth
    const superContribution = (grossIncome * params.superContributionRate) / 100;
    const superGrowthRate = params.superReturnRate / 100; // Convert percentage to decimal
    const intervalSuperRate = convertAnnualRateToInterval(
      superGrowthRate,
      interval,
    );

    // Apply growth to existing balance
    const superAfterGrowth = superannuation * (1 + intervalSuperRate);
    // Add contribution (which also grows for this period)
    const contributionAfterGrowth = superContribution * (1 + intervalSuperRate);
    superannuation = superAfterGrowth + contributionAfterGrowth;

    // Phase 6: Offset Account - Move leftover cash to offset account
    if (params.useOffsetAccount && cash > 0 && loanBalance > 0) {
      // Transfer all positive cash to offset account
      offsetBalance += cash;
      cash = 0;
    }

    // Phase 7: Calculate net worth and cash flow
    const netWorth = cash + investments + superannuation + offsetBalance - loanBalance;
    const cashFlow = netIncome - expenses - loanPayment -
      actualInvestmentContribution;

    return {
      date: currentState.date, // Will be updated by caller
      cash,
      investments,
      superannuation,
      loanBalance,
      offsetBalance,
      netWorth,
      cashFlow,
      taxPaid,
      interestSaved,
    };
  },

  /**
   * Checks if the financial trajectory is sustainable
   * Adds warnings for concerning patterns
   */
  checkSustainability(
    states: FinancialState[],
    warnings: string[],
  ): boolean {
    if (states.length < 2) {
      return true;
    }

    let isSustainable = true;

    // Check for increasing debt
    const firstLoanBalance = states[0].loanBalance;
    const lastLoanBalance = states[states.length - 1].loanBalance;
    if (lastLoanBalance > firstLoanBalance) {
      warnings.push("Loan balance is increasing over time");
      isSustainable = false;
    }

    // Check for consecutive negative cash flow
    let consecutiveNegative = 0;
    for (const state of states) {
      if (state.cashFlow < 0) {
        consecutiveNegative++;
        if (consecutiveNegative >= 3) {
          warnings.push("Sustained negative cash flow detected");
          isSustainable = false;
          break;
        }
      } else {
        consecutiveNegative = 0;
      }
    }

    // Check for negative net worth
    if (states[states.length - 1].netWorth < 0) {
      warnings.push("Net worth is negative");
      isSustainable = false;
    }

    return isSustainable;
  },

  /**
   * Runs simulation with parameter transitions
   * Resolves parameters for each time step based on active transitions
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4
   */
  runSimulationWithTransitions(
    config: SimulationConfiguration,
  ): EnhancedSimulationResult {
    const interval: TimeInterval = "month"; // Default to monthly intervals
    const states: FinancialState[] = [];
    const warnings: string[] = [];
    const transitionPoints: TransitionPoint[] = [];

    // Build parameter periods for the result
    const periods = buildParameterPeriods(config);

    // Get initial parameters (base parameters)
    let currentParams = resolveParametersForDate(
      config.baseParameters.startDate,
      config,
    );

    // Initialize starting state
    let currentState: FinancialState = {
      date: new Date(config.baseParameters.startDate),
      cash: 0,
      investments: currentParams.currentInvestmentBalance,
      superannuation: currentParams.currentSuperBalance,
      loanBalance: currentParams.loanPrincipal,
      offsetBalance: currentParams.currentOffsetBalance || 0,
      netWorth: 0,
      cashFlow: 0,
      taxPaid: 0,
      interestSaved: 0,
    };

    // Calculate initial net worth
    currentState.netWorth = currentState.cash + currentState.investments +
      currentState.superannuation + currentState.offsetBalance -
      currentState.loanBalance;

    states.push(currentState);

    // Calculate end date
    const endDate = new Date(config.baseParameters.startDate);
    endDate.setFullYear(
      endDate.getFullYear() + config.baseParameters.simulationYears,
    );

    // Sort transitions chronologically
    const sortedTransitions = [...config.transitions].sort(
      (a, b) => a.transitionDate.getTime() - b.transitionDate.getTime(),
    );

    // Track which transitions we've passed
    let nextTransitionIndex = 0;

    // Run simulation for each time interval
    let currentDate = new Date(config.baseParameters.startDate);
    while (currentDate < endDate) {
      currentDate = advanceDate(currentDate, interval);

      // Check if we've crossed a transition point
      while (
        nextTransitionIndex < sortedTransitions.length &&
        sortedTransitions[nextTransitionIndex].transitionDate <= currentDate
      ) {
        const transition = sortedTransitions[nextTransitionIndex];

        // Resolve new parameters
        currentParams = resolveParametersForDate(currentDate, config);

        // Create a summary of what changed
        const changedParams = Object.keys(transition.parameterChanges);
        const changesSummary = transition.label ||
          `Changed: ${changedParams.join(", ")}`;

        // Record the transition point
        transitionPoints.push({
          date: new Date(transition.transitionDate),
          stateIndex: states.length,
          transition: transition,
          changesSummary: changesSummary,
        });

        nextTransitionIndex++;
      }

      // Calculate next state using current parameters
      currentState = this.calculateTimeStep(
        currentState,
        currentParams,
        interval,
      );
      currentState.date = new Date(currentDate);
      states.push(currentState);
    }

    // Find retirement date
    const retirement = RetirementCalculator.findRetirementDate(
      states,
      currentParams.desiredAnnualRetirementIncome,
      currentParams.currentAge,
      currentParams.retirementAge,
    );

    // Generate warnings
    const financialWarnings = generateWarnings(states);
    const warningMessages = financialWarnings.map((w) => w.message);

    // Check sustainability
    const isSustainable = this.checkSustainability(states, warnings);

    return {
      states,
      retirementDate: retirement.date,
      retirementAge: retirement.age,
      isSustainable,
      warnings: [...warnings, ...warningMessages],
      transitionPoints,
      periods,
    };
  },

  /**
   * Runs comparison simulation (with vs without transitions)
   * Validates: Requirements 10.1, 10.2, 10.3
   */
  runComparisonSimulation(
    config: SimulationConfiguration,
  ): ComparisonSimulationResult {
    // Run simulation with transitions
    const withTransitions = this.runSimulationWithTransitions(config);

    // Run simulation without transitions (base parameters only)
    const withoutTransitions = this.runSimulation(config.baseParameters);

    // Calculate comparison metrics
    let retirementDateDifference: number | null = null;
    if (
      withTransitions.retirementDate && withoutTransitions.retirementDate
    ) {
      const diffMs = withTransitions.retirementDate.getTime() -
        withoutTransitions.retirementDate.getTime();
      retirementDateDifference = diffMs / (1000 * 60 * 60 * 24 * 365.25); // Convert to years
    }

    const finalNetWorthWithTransitions = withTransitions.states.length > 0
      ? withTransitions.states[withTransitions.states.length - 1].netWorth
      : 0;

    const finalNetWorthWithoutTransitions = withoutTransitions.states.length >
        0
      ? withoutTransitions.states[withoutTransitions.states.length - 1]
        .netWorth
      : 0;

    const finalNetWorthDifference = finalNetWorthWithTransitions -
      finalNetWorthWithoutTransitions;

    const sustainabilityChanged = withTransitions.isSustainable !==
      withoutTransitions.isSustainable;

    return {
      withTransitions,
      withoutTransitions,
      comparison: {
        retirementDateDifference,
        finalNetWorthDifference,
        sustainabilityChanged,
      },
    };
  },
};
