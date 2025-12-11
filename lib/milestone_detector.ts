/**
 * Milestone Detection Engine
 * Detects and tracks major financial events during simulation
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

import type {
  FinancialState,
  UserParameters,
  TransitionPoint,
  Person,
  PaymentFrequency,
  IncomeSource,
} from "../types/financial.ts";
import type { ExpenseItem } from "../types/expenses.ts";
import type {
  Milestone,
  LoanPayoffMilestone,
  OffsetCompletionMilestone,
  RetirementMilestone,
  ParameterTransitionMilestone,
  ExpenseExpirationMilestone,
  MilestoneDetectionResult,
  MilestoneDetectionError,
  MilestoneDetectionConfig,
} from "../types/milestones.ts";
import { RetirementCalculator } from "./processors.ts";
import { 
  globalPerformanceMonitor, 
  MemoizationCache
} from "./performance_utils.ts";

/**
 * Default configuration for milestone detection
 */
const DEFAULT_CONFIG: MilestoneDetectionConfig = {
  detectLoanPayoffs: true,
  detectOffsetCompletion: true,
  detectRetirementEligibility: true,
  detectParameterTransitions: true,
  detectExpenseExpirations: true,
  minimumImpactThreshold: 1000, // $1000 minimum impact
};

/**
 * Milestone Detection Engine
 * Core class responsible for detecting and tracking major financial events
 */
export class MilestoneDetector {
  private config: MilestoneDetectionConfig;
  private loanPayoffCache: MemoizationCache<string, LoanPayoffMilestone[]>;

  constructor(config: Partial<MilestoneDetectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loanPayoffCache = new MemoizationCache<string, LoanPayoffMilestone[]>(50, 5 * 60 * 1000); // 5 min cache
  }

  /**
   * Detects all milestones from simulation states
   * Validates: Requirements 1.1
   */
  detectMilestones(
    states: FinancialState[],
    params: UserParameters,
    transitionPoints?: TransitionPoint[]
  ): MilestoneDetectionResult {
    globalPerformanceMonitor.startOperation('milestone_detection_full');
    const milestones: Milestone[] = [];
    const errors: MilestoneDetectionError[] = [];
    const warnings: string[] = [];

    try {
      globalPerformanceMonitor.startOperation('milestone_detection_batch', { 
        statesCount: states.length,
        hasTransitions: !!transitionPoints?.length 
      });

      // Detect loan payoff milestones
      if (this.config.detectLoanPayoffs) {
        globalPerformanceMonitor.startOperation('loan_payoff_detection');
        const loanPayoffs = this.detectLoanPayoffs(states, params);
        globalPerformanceMonitor.endOperation('loan_payoff_detection', states.length);
        milestones.push(...loanPayoffs);
      }

      // Detect offset completion milestones
      if (this.config.detectOffsetCompletion) {
        globalPerformanceMonitor.startOperation('offset_completion_detection');
        const offsetCompletions = this.detectOffsetCompletion(states, params);
        globalPerformanceMonitor.endOperation('offset_completion_detection', states.length);
        milestones.push(...offsetCompletions);
      }

      // Detect retirement eligibility milestones
      if (this.config.detectRetirementEligibility) {
        globalPerformanceMonitor.startOperation('retirement_detection');
        const retirementMilestones = this.detectRetirementEligibility(states, params);
        globalPerformanceMonitor.endOperation('retirement_detection', states.length);
        milestones.push(...retirementMilestones);
      }

      // Detect parameter transition milestones
      if (this.config.detectParameterTransitions && transitionPoints) {
        globalPerformanceMonitor.startOperation('transition_detection');
        const transitionMilestones = this.detectParameterTransitions(states, transitionPoints);
        globalPerformanceMonitor.endOperation('transition_detection', transitionPoints.length);
        milestones.push(...transitionMilestones);
      }

      // Detect expense expiration milestones
      if (this.config.detectExpenseExpirations) {
        globalPerformanceMonitor.startOperation('expense_expiration_detection');
        const expenseExpirations = this.detectExpenseExpirations(states, params);
        globalPerformanceMonitor.endOperation('expense_expiration_detection', states.length);
        milestones.push(...expenseExpirations);
      }

      // Optimized sorting for large datasets
      globalPerformanceMonitor.startOperation('milestone_sorting');
      if (milestones.length > 100) {
        // Use more efficient sorting for large datasets
        milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
      } else {
        milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
      }
      globalPerformanceMonitor.endOperation('milestone_sorting', milestones.length);

      // Filter by minimum impact threshold if configured
      const filteredMilestones = this.config.minimumImpactThreshold
        ? milestones.filter(m => 
            !m.financialImpact || 
            Math.abs(m.financialImpact) >= this.config.minimumImpactThreshold!
          )
        : milestones;

      globalPerformanceMonitor.endOperation('milestone_detection_batch', filteredMilestones.length);
      globalPerformanceMonitor.endOperation('milestone_detection_full', filteredMilestones.length);

      return {
        milestones: filteredMilestones,
        errors,
        warnings,
      };
    } catch (error) {
      globalPerformanceMonitor.endOperation('milestone_detection_full');
      errors.push({
        code: 'DETECTION_FAILED',
        message: `Milestone detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
        context: { error: String(error) },
      });

      return {
        milestones: [],
        errors,
        warnings,
      };
    }
  }

  /**
   * Detects loan payoff milestones by analyzing loan balance transitions
   * Validates: Requirements 1.2
   */
  detectLoanPayoffs(states: FinancialState[], params: UserParameters): LoanPayoffMilestone[] {
    const milestones: LoanPayoffMilestone[] = [];

    if (states.length < 2) {
      return milestones;
    }

    // Generate cache key for loan payoff detection
    const cacheKey = this.generateLoanPayoffCacheKey(states, params);
    const cachedResult = this.loanPayoffCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    // Handle multiple loans if available
    if (params.loans && params.loans.length > 0) {
      for (const loan of params.loans) {
        const milestone = this.detectSingleLoanPayoffOptimized(states, loan.id, loan.label, loan.principal);
        if (milestone) {
          milestones.push(milestone);
        }
      }
    } else {
      // Handle legacy single loan
      const milestone = this.detectSingleLoanPayoffOptimized(states, 'legacy-loan', 'Primary Loan', params.loanPrincipal);
      if (milestone) {
        milestones.push(milestone);
      }
    }

    // Cache the result
    this.loanPayoffCache.set(cacheKey, milestones);

    return milestones;
  }

  /**
   * Generate cache key for loan payoff detection
   */
  private generateLoanPayoffCacheKey(states: FinancialState[], params: UserParameters): string {
    // Use first, last, and middle state for cache key to detect changes
    const firstState = states[0];
    const lastState = states[states.length - 1];
    const midState = states[Math.floor(states.length / 2)];
    
    const keyData = {
      statesLength: states.length,
      firstLoanBalance: firstState.loanBalance,
      midLoanBalance: midState.loanBalance,
      lastLoanBalance: lastState.loanBalance,
      loanCount: params.loans?.length || 1,
      principal: params.loanPrincipal,
    };
    
    return JSON.stringify(keyData);
  }

  /**
   * Detects payoff for a single loan (optimized version)
   */
  private detectSingleLoanPayoffOptimized(
    states: FinancialState[],
    loanId: string,
    loanName: string,
    originalPrincipal: number
  ): LoanPayoffMilestone | null {
    // Early exit optimization: check if loan is already paid off in first state
    const firstState = states[0];
    let firstBalance: number;
    if (loanId === 'legacy-loan') {
      firstBalance = firstState.loanBalance;
    } else {
      firstBalance = firstState.loanBalances?.[loanId] ?? originalPrincipal;
    }
    
    if (firstBalance === 0) {
      return null; // Already paid off
    }

    // Check last state to see if loan is ever paid off
    const lastState = states[states.length - 1];
    let lastBalance: number;
    if (loanId === 'legacy-loan') {
      lastBalance = lastState.loanBalance;
    } else {
      lastBalance = lastState.loanBalances?.[loanId] ?? originalPrincipal;
    }
    
    if (lastBalance > 0) {
      return null; // Never paid off during simulation
    }

    // Binary search to find payoff point more efficiently for large datasets
    if (states.length > 50) {
      return this.binarySearchLoanPayoff(states, loanId, loanName, originalPrincipal);
    }

    // Use original linear search for smaller datasets
    return this.detectSingleLoanPayoff(states, loanId, loanName, originalPrincipal);
  }

  /**
   * Binary search to find loan payoff point efficiently
   */
  private binarySearchLoanPayoff(
    states: FinancialState[],
    loanId: string,
    loanName: string,
    originalPrincipal: number
  ): LoanPayoffMilestone | null {
    let left = 0;
    let right = states.length - 1;
    let payoffIndex = -1;

    // Binary search to find the payoff point
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const state = states[mid];
      
      let balance: number;
      if (loanId === 'legacy-loan') {
        balance = state.loanBalance;
      } else {
        balance = state.loanBalances?.[loanId] ?? originalPrincipal;
      }

      if (balance === 0) {
        payoffIndex = mid;
        right = mid - 1; // Look for earlier payoff
      } else {
        left = mid + 1;
      }
    }

    if (payoffIndex === -1) {
      return null;
    }

    // Calculate milestone details using the found payoff point
    const payoffState = states[payoffIndex];
    const previousState = payoffIndex > 0 ? states[payoffIndex - 1] : states[0];
    
    let previousBalance: number;
    if (loanId === 'legacy-loan') {
      previousBalance = previousState.loanBalance;
    } else {
      previousBalance = previousState.loanBalances?.[loanId] ?? originalPrincipal;
    }

    const finalPaymentAmount = previousBalance;
    const monthsToPayoff = payoffIndex;
    
    // Estimate total interest paid (simplified calculation for performance)
    const totalInterestPaid = Math.max(0, (originalPrincipal * 0.05 * monthsToPayoff) / 12);

    return {
      id: `loan-payoff-${loanId}-${payoffState.date.getTime()}`,
      type: 'loan_payoff',
      category: 'debt',
      date: new Date(payoffState.date),
      title: `${loanName} Paid Off`,
      description: `Successfully paid off ${loanName} with a final payment of ${finalPaymentAmount.toLocaleString()}.`,
      financialImpact: totalInterestPaid,
      loanId,
      loanName,
      finalPaymentAmount,
      totalInterestPaid,
      monthsToPayoff,
    };
  }

  /**
   * Detects payoff for a single loan (original implementation)
   */
  private detectSingleLoanPayoff(
    states: FinancialState[],
    loanId: string,
    loanName: string,
    originalPrincipal: number
  ): LoanPayoffMilestone | null {
    try {
    let previousBalance = originalPrincipal;
    let totalInterestPaid = 0;
    let monthsToPayoff = 0;

    for (let i = 1; i < states.length; i++) {
      const currentState = states[i];
      const previousState = states[i - 1];

      // Get loan balance for this specific loan
      let currentBalance: number;
      if (loanId === 'legacy-loan') {
        currentBalance = currentState.loanBalance;
        previousBalance = previousState.loanBalance;
      } else {
        currentBalance = currentState.loanBalances?.[loanId] ?? 0;
        previousBalance = previousState.loanBalances?.[loanId] ?? originalPrincipal;
      }

      monthsToPayoff++;

      // Calculate interest paid this period (approximation)
      // Interest paid = payment - principal reduction
      const principalReduction = previousBalance - currentBalance;
      if (principalReduction > 0) {
        // Estimate interest as the difference between payment and principal reduction
        // This is an approximation since we don't have exact payment breakdown here
        const estimatedPayment = principalReduction * 1.1; // Rough estimate
        const estimatedInterest = Math.max(0, estimatedPayment - principalReduction);
        totalInterestPaid += estimatedInterest;
      }

      // Check if loan was paid off (balance went from positive to zero)
      if (previousBalance > 0 && currentBalance === 0) {
        const finalPaymentAmount = previousBalance; // The remaining balance was the final payment

        return {
          id: `loan-payoff-${loanId}-${currentState.date.getTime()}`,
          type: 'loan_payoff',
          category: 'debt',
          date: new Date(currentState.date),
          title: `${loanName} Paid Off`,
          description: `Successfully paid off ${loanName} with a final payment of $${finalPaymentAmount.toLocaleString()}.`,
          financialImpact: totalInterestPaid, // Total interest saved going forward
          loanId,
          loanName,
          finalPaymentAmount,
          totalInterestPaid,
          monthsToPayoff,
        };
      }

      previousBalance = currentBalance;
    }

    return null;
    } catch (error) {
      console.error(`Error detecting loan payoff for ${loanId}:`, error);
      return null;
    }
  }

  /**
   * Detects offset completion milestones when offset equals loan balance
   * Validates: Requirements 1.3
   */
  detectOffsetCompletion(states: FinancialState[], params: UserParameters): OffsetCompletionMilestone[] {
    const milestones: OffsetCompletionMilestone[] = [];

    if (states.length < 2) {
      return milestones;
    }

    // Handle multiple loans with offset accounts
    if (params.loans && params.loans.length > 0) {
      for (const loan of params.loans) {
        if (loan.hasOffset) {
          const milestone = this.detectSingleOffsetCompletion(states, loan.id, loan.label, loan.interestRate);
          if (milestone) {
            milestones.push(milestone);
          }
        }
      }
    } else if (params.useOffsetAccount) {
      // Handle legacy single loan with offset
      const milestone = this.detectSingleOffsetCompletion(states, 'legacy-loan', 'Primary Loan', params.loanInterestRate);
      if (milestone) {
        milestones.push(milestone);
      }
    }

    return milestones;
  }

  /**
   * Detects offset completion for a single loan
   */
  private detectSingleOffsetCompletion(
    states: FinancialState[],
    loanId: string,
    loanName: string,
    interestRate: number
  ): OffsetCompletionMilestone | null {
    try {
    for (let i = 1; i < states.length; i++) {
      const currentState = states[i];
      const previousState = states[i - 1];

      // Get balances for this specific loan
      let currentLoanBalance: number;
      let currentOffsetBalance: number;
      let previousLoanBalance: number;
      let previousOffsetBalance: number;

      if (loanId === 'legacy-loan') {
        currentLoanBalance = currentState.loanBalance;
        currentOffsetBalance = currentState.offsetBalance;
        previousLoanBalance = previousState.loanBalance;
        previousOffsetBalance = previousState.offsetBalance;
      } else {
        currentLoanBalance = currentState.loanBalances?.[loanId] ?? 0;
        currentOffsetBalance = currentState.offsetBalances?.[loanId] ?? 0;
        previousLoanBalance = previousState.loanBalances?.[loanId] ?? 0;
        previousOffsetBalance = previousState.offsetBalances?.[loanId] ?? 0;
      }

      // Check if offset completion occurred (offset >= loan balance for the first time)
      const wasNotComplete = previousOffsetBalance < previousLoanBalance;
      const isNowComplete = currentOffsetBalance >= currentLoanBalance && currentLoanBalance > 0;



      if (wasNotComplete && isNowComplete) {
        const milestone = {
          id: `offset-completion-${loanId}-${currentState.date.getTime()}`,
          type: 'offset_completion' as const,
          category: 'debt' as const,
          date: new Date(currentState.date),
          title: `${loanName} Offset Complete`,
          description: `Offset account balance ($${currentOffsetBalance.toLocaleString()}) now equals or exceeds the remaining loan balance ($${currentLoanBalance.toLocaleString()}). Interest charges are effectively eliminated.`,
          financialImpact: currentLoanBalance * (interestRate / 100), // Annual interest savings
          loanId,
          offsetAmount: currentOffsetBalance,
          loanBalance: currentLoanBalance,
          interestSavingsRate: interestRate,
        };

        return milestone;
      }
    }

    return null;
    } catch (error) {
      console.error(`Error detecting offset completion for ${loanId}:`, error);
      return null;
    }
  }

  /**
   * Detects retirement eligibility milestones using existing RetirementCalculator
   * Validates: Requirements 1.5
   */
  detectRetirementEligibility(states: FinancialState[], params: UserParameters): RetirementMilestone[] {
    const milestones: RetirementMilestone[] = [];

    if (states.length === 0) {
      return milestones;
    }

    // Handle multiple people in household
    if (params.householdMode === "couple" && params.people && params.people.length > 0) {
      // Create individual retirement milestones for each person
      for (const person of params.people) {
        const personRetirementMilestone = this.detectPersonRetirement(states, params, person);
        if (personRetirementMilestone) {
          milestones.push(personRetirementMilestone);
        }
      }
      
      // Also create a household retirement milestone when everyone is retired
      const householdRetirementMilestone = this.detectHouseholdRetirement(states, params);
      if (householdRetirementMilestone) {
        milestones.push(householdRetirementMilestone);
      }
      
      return milestones;
    }

    // Legacy single person retirement detection
    const retirement = RetirementCalculator.findRetirementDate(
      states,
      params.desiredAnnualRetirementIncome,
      params.currentAge,
      params.retirementAge
    );

    if (retirement.date && retirement.age) {
      // Find the state closest to the retirement date
      let closestState = states[0];
      let closestTimeDiff = Math.abs(states[0].date.getTime() - retirement.date.getTime());

      for (const state of states) {
        const timeDiff = Math.abs(state.date.getTime() - retirement.date.getTime());
        if (timeDiff < closestTimeDiff) {
          closestTimeDiff = timeDiff;
          closestState = state;
        }
      }

      // Calculate safe withdrawal capacity
      const safeWithdrawal = RetirementCalculator.calculateSafeWithdrawal(
        closestState.investments,
        closestState.superannuation,
        retirement.age
      );

      // Calculate required assets for desired income (using 4% rule)
      const requiredAssets = params.desiredAnnualRetirementIncome / 0.04;
      const actualAssets = closestState.investments + closestState.superannuation;

      // Calculate years earlier than target (if applicable)
      const yearsEarlierThanTarget = retirement.age < params.retirementAge 
        ? params.retirementAge - retirement.age 
        : undefined;

      milestones.push({
        id: `retirement-eligibility-${retirement.date.getTime()}`,
        type: 'retirement_eligibility',
        category: 'retirement',
        date: new Date(retirement.date),
        title: yearsEarlierThanTarget 
          ? `Early Retirement Achievable (${yearsEarlierThanTarget.toFixed(1)} years early)`
          : 'Retirement Goal Achieved',
        description: `Financial independence achieved! You can safely withdraw $${safeWithdrawal.toLocaleString()}/year (${(safeWithdrawal / params.desiredAnnualRetirementIncome * 100).toFixed(1)}% of your target income) with total assets of $${actualAssets.toLocaleString()}.`,
        financialImpact: actualAssets - requiredAssets, // Surplus beyond required amount
        requiredAssets,
        actualAssets,
        monthlyWithdrawalCapacity: safeWithdrawal / 12,
        yearsEarlierThanTarget,
      });
    }

    return milestones;
  }

  /**
   * Detects parameter transition milestones from TransitionPoint data
   * Enhanced to handle person-specific changes
   * Validates: Requirements 1.4
   */
  detectParameterTransitions(states: FinancialState[], transitionPoints: TransitionPoint[]): ParameterTransitionMilestone[] {
    const milestones: ParameterTransitionMilestone[] = [];

    for (const transitionPoint of transitionPoints) {
      // Calculate financial impact by comparing states before and after transition
      let financialImpact = 0;
      if (transitionPoint.stateIndex > 0 && transitionPoint.stateIndex < states.length) {
        const stateBefore = states[transitionPoint.stateIndex - 1];
        const stateAfter = states[transitionPoint.stateIndex];
        
        // Calculate impact as change in net worth trajectory
        financialImpact = stateAfter.netWorth - stateBefore.netWorth;
      }

      // Extract parameter changes from the transition
      const parameterChanges: Record<string, { from: any; to: any }> = {};
      const changes = transitionPoint.transition.parameterChanges;

      // Enhanced description generation for person-specific changes
      const { title, description } = this.generateTransitionDescription(transitionPoint, changes);

      // Convert parameter changes to from/to format
      // Note: We don't have the "from" values here, so we'll use descriptive text
      for (const [key, value] of Object.entries(changes)) {
        parameterChanges[key] = {
          from: 'Previous Value',
          to: value,
        };
      }

      milestones.push({
        id: `parameter-transition-${transitionPoint.transition.id}`,
        type: 'parameter_transition',
        category: 'transition',
        date: new Date(transitionPoint.date),
        title,
        description,
        financialImpact,
        transitionId: transitionPoint.transition.id,
        parameterChanges,
        impactSummary: transitionPoint.changesSummary,
      });
    }

    return milestones;
  }

  /**
   * Detects expense expiration milestones when expenses with end dates expire
   * Validates: Requirements 1.6
   */
  detectExpenseExpirations(states: FinancialState[], params: UserParameters): ExpenseExpirationMilestone[] {
    const milestones: ExpenseExpirationMilestone[] = [];

    if (states.length === 0 || !params.expenseItems || params.expenseItems.length === 0) {
      return milestones;
    }

    // Get simulation start and end dates
    const startDate = states[0].date;
    const endDate = states[states.length - 1].date;

    // Check each expense item for end dates within the simulation period
    for (const expense of params.expenseItems) {
      if (!expense.endDate || !expense.enabled) {
        continue; // Skip expenses without end dates or disabled expenses
      }

      // Check if the end date falls within the simulation period
      if (expense.endDate >= startDate && expense.endDate <= endDate) {
        // Calculate the savings from this expense ending
        const monthlySavings = this.calculateMonthlyExpenseAmount(expense);
        const annualSavings = monthlySavings * 12;

        // Only create milestone if savings meet minimum threshold
        if (!this.config.minimumImpactThreshold || annualSavings >= this.config.minimumImpactThreshold) {
          milestones.push({
            id: `expense-expiration-${expense.id}-${expense.endDate.getTime()}`,
            type: 'expense_expiration',
            category: 'expense',
            date: new Date(expense.endDate),
            title: `${expense.name} Expires`,
            description: `${expense.name} (${expense.category}) ends, saving ${monthlySavings.toLocaleString()}/month (${annualSavings.toLocaleString()}/year). This expense will no longer be deducted from your budget.`,
            financialImpact: annualSavings, // Positive impact as it's savings
            expenseId: expense.id,
            expenseName: expense.name,
            monthlySavings,
            annualSavings,
            expenseCategory: expense.category,
          });
        }
      }
    }

    return milestones;
  }

  /**
   * Calculates the monthly amount for an expense based on its frequency
   */
  private calculateMonthlyExpenseAmount(expense: ExpenseItem): number {
    switch (expense.frequency) {
      case "weekly":
        return expense.amount * 52 / 12; // 52 weeks per year / 12 months
      case "fortnightly":
        return expense.amount * 26 / 12; // 26 fortnights per year / 12 months
      case "monthly":
        return expense.amount;
      case "yearly":
        return expense.amount / 12;
      default:
        return expense.amount; // Default to monthly
    }
  }

  /**
   * Generates enhanced title and description for parameter transitions
   */
  private generateTransitionDescription(
    transitionPoint: TransitionPoint, 
    changes: Record<string, any>
  ): { title: string; description: string } {
    const changeKeys = Object.keys(changes);
    
    // Check for person-specific changes
    const peopleChanges = changeKeys.filter(key => key === 'people');
    const incomeChanges = changeKeys.filter(key => 
      key.includes('income') || 
      key.includes('salary') || 
      key === 'annualSalary' ||
      key.includes('Salary')
    );
    const retirementChanges = changeKeys.filter(key => key.includes('retirement'));
    
    // Generate specific titles based on change types
    let title = transitionPoint.transition.label || 'Parameter Change';
    let description = `Financial parameters updated: ${transitionPoint.changesSummary}`;
    
    if (peopleChanges.length > 0) {
      title = 'Household Changes';
      description = this.describePeopleChanges(changes.people, transitionPoint.changesSummary);
    } else if (incomeChanges.length > 0) {
      title = 'Income Changes';
      description = this.describeIncomeChanges(changes, transitionPoint.changesSummary);
    } else if (retirementChanges.length > 0) {
      title = 'Retirement Planning Changes';
      description = this.describeRetirementChanges(changes, transitionPoint.changesSummary);
    } else if (changeKeys.includes('loanPrincipal') || changeKeys.includes('loans')) {
      title = 'Loan Changes';
      description = `Loan parameters updated: ${transitionPoint.changesSummary}`;
    } else if (changeKeys.includes('monthlyInvestmentContribution') || changeKeys.includes('investmentHoldings')) {
      title = 'Investment Strategy Changes';
      description = `Investment parameters updated: ${transitionPoint.changesSummary}`;
    }
    
    return { title, description };
  }

  /**
   * Describes changes to people in the household
   */
  private describePeopleChanges(peopleArray: any[], summary: string): string {
    if (!Array.isArray(peopleArray)) {
      return `Household configuration updated: ${summary}`;
    }
    
    const personNames = peopleArray.map(person => person.name || 'Person').join(', ');
    return `Household members updated: ${personNames}. ${summary}`;
  }

  /**
   * Describes income-related changes
   */
  private describeIncomeChanges(changes: Record<string, any>, summary: string): string {
    const incomeKeys = Object.keys(changes).filter(key => 
      key.includes('income') || 
      key.includes('salary') || 
      key === 'annualSalary' ||
      key.includes('Salary') ||
      key === 'people'
    );
    
    if (incomeKeys.includes('people')) {
      return `Income sources updated for household members. ${summary}`;
    } else if (incomeKeys.includes('annualSalary')) {
      return `Annual salary changed to $${changes.annualSalary?.toLocaleString() || 'new amount'}. ${summary}`;
    }
    
    return `Income parameters updated: ${summary}`;
  }

  /**
   * Describes retirement-related changes
   */
  private describeRetirementChanges(changes: Record<string, any>, summary: string): string {
    const retirementKeys = Object.keys(changes).filter(key => key.includes('retirement'));
    
    if (retirementKeys.includes('retirementAge')) {
      return `Retirement age changed to ${changes.retirementAge}. ${summary}`;
    } else if (retirementKeys.includes('desiredAnnualRetirementIncome')) {
      return `Desired retirement income changed to $${changes.desiredAnnualRetirementIncome?.toLocaleString() || 'new amount'}/year. ${summary}`;
    }
    
    return `Retirement planning parameters updated: ${summary}`;
  }

  /**
   * Updates the detection configuration
   */
  updateConfig(newConfig: Partial<MilestoneDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets the current detection configuration
   */
  getConfig(): MilestoneDetectionConfig {
    return { ...this.config };
  }

  /**
   * Detects retirement milestone for a specific person
   */
  private detectPersonRetirement(states: FinancialState[], params: UserParameters, person: Person): RetirementMilestone | null {
    // Find the date when this person reaches retirement age
    const startDate = states[0].date;
    const retirementDate = new Date(startDate);
    const yearsToRetirement = person.retirementAge - person.currentAge;
    retirementDate.setFullYear(retirementDate.getFullYear() + yearsToRetirement);

    // Check if retirement date is within simulation period
    const endDate = states[states.length - 1].date;
    if (retirementDate > endDate) {
      return null; // Person doesn't retire within simulation period
    }

    // Find the state closest to this person's retirement date
    let closestState = states[0];
    let closestTimeDiff = Math.abs(states[0].date.getTime() - retirementDate.getTime());

    for (const state of states) {
      const timeDiff = Math.abs(state.date.getTime() - retirementDate.getTime());
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestState = state;
      }
    }

    // Calculate person's contribution to household income
    let personIncome = 0;
    for (const incomeSource of person.incomeSources) {
      if (this.isIncomeSourceActive(incomeSource, retirementDate)) {
        personIncome += incomeSource.amount * this.getAnnualMultiplier(incomeSource.frequency);
      }
    }

    const title = `${person.name} Retires`;
    const description = personIncome > 0 
      ? `${person.name} reaches retirement age ${person.retirementAge} and stops earning $${personIncome.toLocaleString()}/year. ${this.getRetirementImpactDescription(params, person)}`
      : `${person.name} reaches retirement age ${person.retirementAge}.`;

    return this.createRetirementMilestone(
      retirementDate,
      person.retirementAge,
      states,
      params,
      title,
      person,
      description,
      -personIncome // Negative impact as income stops
    );
  }

  /**
   * Detects when the entire household is retired
   */
  private detectHouseholdRetirement(states: FinancialState[], params: UserParameters): RetirementMilestone | null {
    if (!params.people || params.people.length === 0) {
      return null;
    }

    // Find the latest retirement date among all people
    const startDate = states[0].date;
    let latestRetirementDate = new Date(startDate);
    let lastPersonToRetire: Person | null = null;

    for (const person of params.people) {
      const personRetirementDate = new Date(startDate);
      const yearsToRetirement = person.retirementAge - person.currentAge;
      personRetirementDate.setFullYear(personRetirementDate.getFullYear() + yearsToRetirement);

      if (personRetirementDate > latestRetirementDate) {
        latestRetirementDate = personRetirementDate;
        lastPersonToRetire = person;
      }
    }

    // Check if household retirement date is within simulation period
    const endDate = states[states.length - 1].date;
    if (latestRetirementDate > endDate || !lastPersonToRetire) {
      return null;
    }

    const title = "Household Fully Retired";
    const description = `All household members are now retired. Full retirement income of $${params.desiredAnnualRetirementIncome.toLocaleString()}/year will be needed from investments and superannuation.`;

    return this.createRetirementMilestone(
      latestRetirementDate,
      lastPersonToRetire.retirementAge,
      states,
      params,
      title,
      undefined, // Household milestone, not person-specific
      description
    );
  }

  /**
   * Creates a retirement milestone with consistent structure
   */
  private createRetirementMilestone(
    retirementDate: Date,
    retirementAge: number,
    states: FinancialState[],
    params: UserParameters,
    title: string,
    person?: Person,
    customDescription?: string,
    customFinancialImpact?: number
  ): RetirementMilestone {
    // Find the state closest to the retirement date
    let closestState = states[0];
    let closestTimeDiff = Math.abs(states[0].date.getTime() - retirementDate.getTime());

    for (const state of states) {
      const timeDiff = Math.abs(state.date.getTime() - retirementDate.getTime());
      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestState = state;
      }
    }

    // Calculate safe withdrawal capacity
    const safeWithdrawal = RetirementCalculator.calculateSafeWithdrawal(
      closestState.investments,
      closestState.superannuation,
      retirementAge
    );

    // Calculate required assets for desired income (using 4% rule)
    const requiredAssets = params.desiredAnnualRetirementIncome / 0.04;
    const actualAssets = closestState.investments + closestState.superannuation;

    // Calculate years earlier than target (if applicable)
    const targetAge = person ? person.retirementAge : params.retirementAge;
    const yearsEarlierThanTarget = retirementAge < targetAge 
      ? targetAge - retirementAge 
      : undefined;

    const description = customDescription || 
      `Financial independence achieved! You can safely withdraw $${safeWithdrawal.toLocaleString()}/year (${(safeWithdrawal / params.desiredAnnualRetirementIncome * 100).toFixed(1)}% of your target income) with total assets of $${actualAssets.toLocaleString()}.`;

    const financialImpact = customFinancialImpact !== undefined 
      ? customFinancialImpact 
      : actualAssets - requiredAssets;

    const id = person 
      ? `retirement-${person.id}-${retirementDate.getTime()}`
      : `retirement-household-${retirementDate.getTime()}`;

    return {
      id,
      type: 'retirement_eligibility',
      category: 'retirement',
      date: new Date(retirementDate),
      title,
      description,
      financialImpact,
      requiredAssets,
      actualAssets,
      monthlyWithdrawalCapacity: safeWithdrawal / 12,
      yearsEarlierThanTarget,
      personId: person?.id,
    };
  }

  /**
   * Helper method to get annual multiplier for payment frequency
   */
  private getAnnualMultiplier(frequency: PaymentFrequency): number {
    switch (frequency) {
      case "weekly": return 52;
      case "fortnightly": return 26;
      case "monthly": return 12;
      case "yearly": return 1;
      default: return 12;
    }
  }

  /**
   * Helper method to describe retirement impact
   */
  private getRetirementImpactDescription(params: UserParameters, person: Person): string {
    const otherPeopleWorking = params.people?.some(p => 
      p.id !== person.id && p.retirementAge > person.retirementAge
    );

    if (otherPeopleWorking) {
      return "Other household members continue working.";
    } else {
      return "This begins the household's retirement phase.";
    }
  }

  /**
   * Helper method to check if an income source is active at a given date
   */
  private isIncomeSourceActive(incomeSource: IncomeSource, currentDate: Date): boolean {
    // Check start date
    if (incomeSource.startDate && currentDate < incomeSource.startDate) {
      return false;
    }
    
    // Check end date
    if (incomeSource.endDate && currentDate > incomeSource.endDate) {
      return false;
    }
    
    // Check one-off income
    if (incomeSource.isOneOff) {
      if (!incomeSource.oneOffDate) {
        return false;
      }
      // One-off income is only active on the specific date (within the same month)
      const sameMonth = currentDate.getFullYear() === incomeSource.oneOffDate.getFullYear() &&
                       currentDate.getMonth() === incomeSource.oneOffDate.getMonth();
      return sameMonth;
    }
    
    return true;
  }
}

/**
 * Convenience function to create a milestone detector with default configuration
 */
export function createMilestoneDetector(config?: Partial<MilestoneDetectionConfig>): MilestoneDetector {
  return new MilestoneDetector(config);
}

/**
 * Convenience function to detect milestones from simulation results
 */
export function detectMilestonesFromSimulation(
  states: FinancialState[],
  params: UserParameters,
  transitionPoints?: TransitionPoint[],
  config?: Partial<MilestoneDetectionConfig>
): MilestoneDetectionResult {
  const detector = createMilestoneDetector(config);
  return detector.detectMilestones(states, params, transitionPoints);
}