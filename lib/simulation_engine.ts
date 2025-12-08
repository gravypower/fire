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
import { generateWarnings, formatCurrency } from "./result_utils.ts";
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
    case "fortnight":
      return 26;
    default:
      return 12; // Default to monthly
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
  paymentFrequency: "weekly" | "fortnightly" | "monthly" | "yearly",
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
    case "yearly":
      annualPayment = paymentAmount;
      break;
    default:
      annualPayment = paymentAmount * 12; // Default to monthly
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
    // If loans array exists (even if empty), use it; otherwise fall back to legacy
    const initialLoanBalance = params.loans !== undefined
      ? (params.loans.length > 0 ? params.loans.reduce((sum, loan) => sum + loan.principal, 0) : 0)
      : params.loanPrincipal;
    
    const initialLoanBalances = params.loans !== undefined && params.loans.length > 0
      ? params.loans.reduce((acc, loan) => ({ ...acc, [loan.id]: loan.principal }), {} as { [loanId: string]: number })
      : undefined;

    const initialSuperBalance = params.superAccounts && params.superAccounts.length > 0
      ? params.superAccounts.reduce((sum, superAcc) => sum + superAcc.balance, 0)
      : params.currentSuperBalance;
    
    const initialSuperBalances = params.superAccounts && params.superAccounts.length > 0
      ? params.superAccounts.reduce((acc, superAcc) => ({ ...acc, [superAcc.id]: superAcc.balance }), {} as { [superId: string]: number })
      : undefined;

    const initialOffsetBalance = params.loans !== undefined
      ? (params.loans.length > 0 ? params.loans.reduce((sum, loan) => sum + (loan.offsetBalance || 0), 0) : 0)
      : (params.currentOffsetBalance || 0);
    
    const initialOffsetBalances = params.loans && params.loans.length > 0
      ? params.loans.reduce((acc, loan) => ({ ...acc, [loan.id]: loan.offsetBalance || 0 }), {} as { [loanId: string]: number })
      : undefined;

    let currentState: FinancialState = {
      date: new Date(params.startDate),
      cash: 0, // Starting with zero cash
      investments: params.currentInvestmentBalance,
      superannuation: initialSuperBalance,
      loanBalance: initialLoanBalance,
      offsetBalance: initialOffsetBalance,
      netWorth: 0,
      cashFlow: 0,
      taxPaid: 0,
      expenses: 0,
      interestSaved: 0,
      deductibleInterest: 0,
      loanBalances: initialLoanBalances,
      superBalances: initialSuperBalances,
      offsetBalances: initialOffsetBalances,
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

    // Add warning if retirement is not achievable at desired age
    if (retirement.date === null) {
      const yearsSimulated = params.simulationYears;
      const finalAge = params.currentAge + yearsSimulated;
      warningMessages.push(
        `⚠️ RETIREMENT NOT ACHIEVABLE: You want to retire at age ${params.retirementAge}, but your assets will not support ${formatCurrency(params.desiredAnnualRetirementIncome)}/year income at that age. ` +
        `Even by age ${Math.floor(finalAge)}, you won't have enough saved. ` +
        `To retire at ${params.retirementAge}, you need to: save more aggressively, reduce expenses, lower your retirement income target, or work longer.`
      );
    } else if (retirement.age && retirement.age > params.retirementAge + 1) {
      // Retirement is achievable but much later than desired
      warningMessages.push(
        `⚠️ DELAYED RETIREMENT: You want to retire at age ${params.retirementAge}, but you won't have enough assets until age ${Math.floor(retirement.age)}. ` +
        `That's ${Math.floor(retirement.age - params.retirementAge)} years later than planned. ` +
        `To retire earlier, consider: increasing savings, reducing expenses, or lowering your retirement income target from ${formatCurrency(params.desiredAnnualRetirementIncome)}/year.`
      );
    }

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
    let deductibleInterest = 0;

    // Phase 1: Income - Add salary income and calculate initial tax (will be adjusted for deductions later)
    const grossIncome = IncomeProcessor.calculateIncome(params, interval, currentState.date);
    // Tax will be recalculated after we know deductible interest
    let netIncome = 0;
    cash += netIncome; // Will add after tax calculation

    // Phase 2: Expenses - Deduct living expenses only
    // Note: Mortgage payments are handled in the loan phase
    const expenses = ExpenseProcessor.calculateExpenses(params, interval, currentState.date);
    cash -= expenses;
    
    // Requirements 7.1: Handle negative cash flow by reducing available cash
    // Cash can go negative, representing debt or overdraft

    // Phase 3: Loan - Process loan payments with offset account
    // Track deductible interest for debt recycling loans
    // If loans array exists (even if empty), use it; otherwise use legacy single loan
    let loanBalances: { [loanId: string]: number } = {};
    let offsetBalances: { [loanId: string]: number } = {};
    let totalLoanPayment = 0;
    
    if (params.loans !== undefined && params.loans.length > 0) {
      // Multiple loans - process each loan with its own offset
      for (const loan of params.loans) {
        const loanPayment = convertPaymentToInterval(
          loan.paymentAmount,
          loan.paymentFrequency,
          interval,
        );
        totalLoanPayment += loanPayment;
        
        // Get current balance for this loan
        const currentLoanBalance = currentState.loanBalances?.[loan.id] ?? loan.principal;
        
        // Get current offset balance for this loan
        const currentOffsetBalance = currentState.offsetBalances?.[loan.id] ?? (loan.offsetBalance || 0);
        offsetBalances[loan.id] = currentOffsetBalance;
        
        if (currentLoanBalance > 0 && cash >= loanPayment) {
          const loanResult = LoanProcessor.calculateLoanPayment(
            currentLoanBalance,
            currentOffsetBalance,
            loan.interestRate / 100,
            loanPayment,
            interval,
            loan.hasOffset || false,
            loan.isDebtRecycling || false,
          );
          loanBalances[loan.id] = loanResult.newBalance;
          interestSaved += loanResult.interestSaved;
          deductibleInterest += loanResult.deductibleInterest;
          cash -= loanPayment;
        } else if (currentLoanBalance > 0) {
          // Partial payment scenario
          const partialPayment = Math.max(0, Math.min(cash, loanPayment));
          const loanResult = LoanProcessor.calculateLoanPayment(
            currentLoanBalance,
            currentOffsetBalance,
            loan.interestRate / 100,
            partialPayment,
            interval,
            loan.hasOffset || false,
            loan.isDebtRecycling || false,
          );
          loanBalances[loan.id] = loanResult.newBalance;
          interestSaved += loanResult.interestSaved;
          deductibleInterest += loanResult.deductibleInterest;
          cash -= partialPayment;
        } else {
          loanBalances[loan.id] = 0;
        }
      }
      
      // Calculate total loan balance for legacy field
      loanBalance = Object.values(loanBalances).reduce((sum, bal) => sum + bal, 0);
      // Calculate total offset balance for legacy field
      offsetBalance = Object.values(offsetBalances).reduce((sum, bal) => sum + bal, 0);
    } else if (params.loans === undefined) {
      // Legacy single loan (only if loans array doesn't exist)
      const loanPayment = convertPaymentToInterval(
        params.loanPaymentAmount,
        params.loanPaymentFrequency,
        interval,
      );
      totalLoanPayment = loanPayment;

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
            false, // Legacy loans don't support debt recycling
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
            false, // Legacy loans don't support debt recycling
          );
          loanBalance = loanResult.newBalance;
          interestSaved = loanResult.interestSaved;
          cash = 0; // All cash used for partial loan payment
        }
      }
    } else {
      // loans array exists but is empty - no loans to process
      loanBalance = 0;
      offsetBalance = 0;
      totalLoanPayment = 0;
    }

    // Now calculate tax with deductible interest deduction
    // Convert deductible interest to annual amount for tax calculation
    const periodsPerYear = intervalToPeriodsPerYear(interval);
    const annualDeductibleInterest = deductibleInterest * periodsPerYear;
    
    // Calculate taxable income (gross income minus deductible interest)
    const annualGrossIncome = IncomeProcessor.calculateTotalAnnualIncome(params, currentState.date);
    const taxableIncome = Math.max(0, annualGrossIncome - annualDeductibleInterest);
    
    // Calculate tax on taxable income
    const annualTax = IncomeProcessor.calculateAnnualTax(params, taxableIncome);
    taxPaid = annualTax / periodsPerYear;
    
    // Calculate net income and add to cash
    netIncome = grossIncome - taxPaid;
    cash += netIncome;

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
    // Handle multiple super accounts if provided, otherwise use legacy single super
    let superBalances: { [superId: string]: number } = {};
    
    if (params.superAccounts && params.superAccounts.length > 0) {
      // Multiple super accounts
      superannuation = 0;
      for (const superAcc of params.superAccounts) {
        const currentBalance = currentState.superBalances?.[superAcc.id] ?? superAcc.balance;
        const superContribution = (grossIncome * superAcc.contributionRate) / 100;
        const superGrowthRate = superAcc.returnRate / 100;
        const intervalSuperRate = convertAnnualRateToInterval(superGrowthRate, interval);
        
        // Apply growth to existing balance
        const superAfterGrowth = currentBalance * (1 + intervalSuperRate);
        // Add contribution (which also grows for this period)
        const contributionAfterGrowth = superContribution * (1 + intervalSuperRate);
        const newBalance = superAfterGrowth + contributionAfterGrowth;
        
        superBalances[superAcc.id] = newBalance;
        superannuation += newBalance;
      }
    } else {
      // Legacy single super account
      const superContribution = (grossIncome * params.superContributionRate) / 100;
      const superGrowthRate = params.superReturnRate / 100;
      const intervalSuperRate = convertAnnualRateToInterval(superGrowthRate, interval);

      // Apply growth to existing balance
      const superAfterGrowth = superannuation * (1 + intervalSuperRate);
      // Add contribution (which also grows for this period)
      const contributionAfterGrowth = superContribution * (1 + intervalSuperRate);
      superannuation = superAfterGrowth + contributionAfterGrowth;
    }

    // Phase 6: Offset Account - Move leftover cash to offset account
    // For multiple loans, add to the biggest loan with offset enabled
    // Handle excess offset (when offset > loan balance) as cash
    if (cash > 0 && loanBalance > 0) {
      if (params.loans !== undefined && params.loans.length > 0) {
        // Find the biggest loan with offset enabled
        let biggestLoanWithOffset: { id: string; balance: number; loan: typeof params.loans[0] } | null = null;
        
        for (const loan of params.loans) {
          if (loan.hasOffset) {
            const currentBalance = loanBalances[loan.id] || 0;
            if (currentBalance > 0 && (!biggestLoanWithOffset || currentBalance > biggestLoanWithOffset.balance)) {
              biggestLoanWithOffset = { id: loan.id, balance: currentBalance, loan };
            }
          }
        }
        
        // Add leftover cash to the biggest loan's offset
        if (biggestLoanWithOffset) {
          const currentOffsetBalance = offsetBalances[biggestLoanWithOffset.id] || 0;
          const loanBalance = biggestLoanWithOffset.balance;
          
          // Calculate how much we can add to offset (capped at loan balance)
          const maxOffsetIncrease = Math.max(0, loanBalance - currentOffsetBalance);
          const offsetIncrease = Math.min(cash, maxOffsetIncrease);
          
          // Add to offset
          offsetBalances[biggestLoanWithOffset.id] = currentOffsetBalance + offsetIncrease;
          offsetBalance += offsetIncrease;
          cash -= offsetIncrease;
          
          // Any remaining cash stays as cash (excess offset scenario)
          // This cash is now held as savings and will show on the timeline
        }
      } else if (params.loans === undefined && params.useOffsetAccount) {
        // Legacy single loan offset (only if loans array doesn't exist)
        const maxOffsetIncrease = Math.max(0, loanBalance - offsetBalance);
        const offsetIncrease = Math.min(cash, maxOffsetIncrease);
        
        offsetBalance += offsetIncrease;
        cash -= offsetIncrease;
        // Excess cash stays as cash
      }
    }
    
    // Phase 6b: Auto-payout loans when offset equals outstanding principal
    if (params.loans !== undefined && params.loans.length > 0) {
      for (const loan of params.loans) {
        if (loan.hasOffset && loan.autoPayoutWhenOffsetFull) {
          const currentLoanBalance = loanBalances[loan.id] || 0;
          const currentOffsetBalance = offsetBalances[loan.id] || 0;
          
          // If offset equals or exceeds loan balance, pay out the loan
          if (currentLoanBalance > 0 && currentOffsetBalance >= currentLoanBalance) {
            // Pay out the loan (set balance to 0)
            loanBalances[loan.id] = 0;
            
            // Clear the offset for this loan and convert to cash
            offsetBalances[loan.id] = 0;
            
            // Add the offset amount to cash (it was already saved, now it's liquid)
            cash += currentOffsetBalance;
            
            // Update totals
            loanBalance = Object.values(loanBalances).reduce((sum, bal) => sum + bal, 0);
            offsetBalance = Object.values(offsetBalances).reduce((sum, bal) => sum + bal, 0);
          }
        }
      }
    }

    // Phase 7: Calculate net worth and cash flow
    const netWorth = cash + investments + superannuation + offsetBalance - loanBalance;
    const cashFlow = netIncome - expenses - totalLoanPayment -
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
      expenses,
      interestSaved,
      deductibleInterest,
      loanBalances: params.loans && params.loans.length > 0 ? loanBalances : undefined,
      superBalances: params.superAccounts && params.superAccounts.length > 0 ? superBalances : undefined,
      offsetBalances: params.loans && params.loans.length > 0 ? offsetBalances : undefined,
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
    // If loans array exists (even if empty), use it; otherwise fall back to legacy
    const initialLoanBalance = currentParams.loans !== undefined
      ? (currentParams.loans.length > 0 ? currentParams.loans.reduce((sum, loan) => sum + loan.principal, 0) : 0)
      : currentParams.loanPrincipal;
    
    const initialLoanBalances = currentParams.loans !== undefined && currentParams.loans.length > 0
      ? currentParams.loans.reduce((acc, loan) => ({ ...acc, [loan.id]: loan.principal }), {} as { [loanId: string]: number })
      : undefined;

    const initialSuperBalance = currentParams.superAccounts && currentParams.superAccounts.length > 0
      ? currentParams.superAccounts.reduce((sum, superAcc) => sum + superAcc.balance, 0)
      : currentParams.currentSuperBalance;
    
    const initialSuperBalances = currentParams.superAccounts && currentParams.superAccounts.length > 0
      ? currentParams.superAccounts.reduce((acc, superAcc) => ({ ...acc, [superAcc.id]: superAcc.balance }), {} as { [superId: string]: number })
      : undefined;

    const initialOffsetBalance = currentParams.loans !== undefined
      ? (currentParams.loans.length > 0 ? currentParams.loans.reduce((sum, loan) => sum + (loan.offsetBalance || 0), 0) : 0)
      : (currentParams.currentOffsetBalance || 0);
    
    const initialOffsetBalances = currentParams.loans !== undefined && currentParams.loans.length > 0
      ? currentParams.loans.reduce((acc, loan) => ({ ...acc, [loan.id]: loan.offsetBalance || 0 }), {} as { [loanId: string]: number })
      : undefined;

    let currentState: FinancialState = {
      date: new Date(config.baseParameters.startDate),
      cash: 0,
      investments: currentParams.currentInvestmentBalance,
      superannuation: initialSuperBalance,
      loanBalance: initialLoanBalance,
      offsetBalance: initialOffsetBalance,
      netWorth: 0,
      cashFlow: 0,
      taxPaid: 0,
      expenses: 0,
      interestSaved: 0,
      deductibleInterest: 0,
      loanBalances: initialLoanBalances,
      superBalances: initialSuperBalances,
      offsetBalances: initialOffsetBalances,
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

    // Add warning if retirement is not achievable at desired age
    if (retirement.date === null) {
      const yearsSimulated = config.baseParameters.simulationYears;
      const finalAge = config.baseParameters.currentAge + yearsSimulated;
      warningMessages.push(
        `⚠️ RETIREMENT NOT ACHIEVABLE: You want to retire at age ${config.baseParameters.retirementAge}, but your assets will not support ${formatCurrency(config.baseParameters.desiredAnnualRetirementIncome)}/year income at that age. ` +
        `Even by age ${Math.floor(finalAge)}, you won't have enough saved. ` +
        `To retire at ${config.baseParameters.retirementAge}, you need to: save more aggressively, reduce expenses, lower your retirement income target, or work longer.`
      );
    } else if (retirement.age && retirement.age > config.baseParameters.retirementAge + 1) {
      // Retirement is achievable but much later than desired
      warningMessages.push(
        `⚠️ DELAYED RETIREMENT: You want to retire at age ${config.baseParameters.retirementAge}, but you won't have enough assets until age ${Math.floor(retirement.age)}. ` +
        `That's ${Math.floor(retirement.age - config.baseParameters.retirementAge)} years later than planned. ` +
        `To retire earlier, consider: increasing savings, reducing expenses, or lowering your retirement income target from ${formatCurrency(config.baseParameters.desiredAnnualRetirementIncome)}/year.`
      );
    }

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
