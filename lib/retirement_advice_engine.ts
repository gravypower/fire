/**
 * Retirement Advice Engine
 * Analyzes simulation results and generates personalized retirement recommendations
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type {
  FinancialState,
  UserParameters,
  SimulationResult,
} from "../types/financial.ts";
import type {
  RetirementAdvice,
  AdviceItem,
  RankedAdvice,
  RetirementAssessment,
  RetirementFeasibility,
  AdvicePriority,
  AdviceGenerationResult,
  AdviceGenerationError,
  AdviceGenerationConfig,
  Milestone,
} from "../types/milestones.ts";
import { formatCurrency } from "./result_utils.ts";
import { 
  globalPerformanceMonitor, 
  MemoizationCache 
} from "./performance_utils.ts";
import {
  createPersonSpecificAdvice,
  createSuperContributionAdvice,
  createRetirementAgeAdvice,
  createIncomeSourceAdvice,
  validatePersonSpecificAdvice,
  getAdviceTargetName,
} from "./person_specific_advice_utils.ts";

/**
 * Default configuration for advice generation
 */
const DEFAULT_CONFIG: AdviceGenerationConfig = {
  includeDebtAdvice: true,
  includeInvestmentAdvice: true,
  includeExpenseAdvice: true,
  includeIncomeAdvice: true,
  maxRecommendations: 10,
  minEffectivenessThreshold: 20, // Minimum 20% effectiveness score
};

/**
 * Retirement Advice Engine
 * Core class responsible for analyzing simulation results and generating personalized recommendations
 */
export class RetirementAdviceEngine {
  private config: AdviceGenerationConfig;
  private debtAdviceCache: MemoizationCache<string, AdviceItem[]>;
  private investmentAdviceCache: MemoizationCache<string, AdviceItem[]>;
  private expenseAdviceCache: MemoizationCache<string, AdviceItem[]>;
  private incomeAdviceCache: MemoizationCache<string, AdviceItem[]>;

  constructor(config: Partial<AdviceGenerationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize caches with different sizes based on expected usage
    this.debtAdviceCache = new MemoizationCache<string, AdviceItem[]>(30, 10 * 60 * 1000); // 10 min
    this.investmentAdviceCache = new MemoizationCache<string, AdviceItem[]>(30, 10 * 60 * 1000);
    this.expenseAdviceCache = new MemoizationCache<string, AdviceItem[]>(20, 15 * 60 * 1000); // 15 min (more stable)
    this.incomeAdviceCache = new MemoizationCache<string, AdviceItem[]>(20, 15 * 60 * 1000);
  }

  /**
   * Generates comprehensive retirement advice based on simulation results
   * Validates: Requirements 2.1, 4.5
   */
  generateAdvice(
    result: SimulationResult,
    params: UserParameters,
    _milestones?: Milestone[]
  ): AdviceGenerationResult {
    globalPerformanceMonitor.startOperation('advice_generation_full');
    const errors: AdviceGenerationError[] = [];
    const warnings: string[] = [];

    try {
      globalPerformanceMonitor.startOperation('advice_generation_batch', {
        statesCount: result.states.length,
        includeDebt: this.config.includeDebtAdvice,
        includeInvestment: this.config.includeInvestmentAdvice,
        includeExpense: this.config.includeExpenseAdvice,
        includeIncome: this.config.includeIncomeAdvice
      });

      // Assess overall retirement readiness
      globalPerformanceMonitor.startOperation('retirement_assessment');
      const overallAssessment = this.assessRetirementReadiness(result, params);
      const retirementFeasibility = this.analyzeRetirementFeasibility(result, params);
      globalPerformanceMonitor.endOperation('retirement_assessment');

      // Generate all advice categories with caching
      const allAdvice: AdviceItem[] = [];

      if (this.config.includeDebtAdvice) {
        globalPerformanceMonitor.startOperation('debt_advice_generation');
        const debtAdvice = this.analyzeDebtStrategyCached(result.states, params);
        globalPerformanceMonitor.endOperation('debt_advice_generation', debtAdvice.length);
        allAdvice.push(...debtAdvice);
      }

      if (this.config.includeInvestmentAdvice) {
        globalPerformanceMonitor.startOperation('investment_advice_generation');
        const investmentAdvice = this.analyzeInvestmentStrategyCached(result.states, params);
        globalPerformanceMonitor.endOperation('investment_advice_generation', investmentAdvice.length);
        allAdvice.push(...investmentAdvice);
      }

      if (this.config.includeExpenseAdvice) {
        globalPerformanceMonitor.startOperation('expense_advice_generation');
        const expenseAdvice = this.analyzeExpenseOptimizationCached(result.states, params);
        globalPerformanceMonitor.endOperation('expense_advice_generation', expenseAdvice.length);
        allAdvice.push(...expenseAdvice);
      }

      if (this.config.includeIncomeAdvice) {
        globalPerformanceMonitor.startOperation('income_advice_generation');
        const incomeAdvice = this.analyzeIncomeStrategyCached(result.states, params);
        globalPerformanceMonitor.endOperation('income_advice_generation', incomeAdvice.length);
        allAdvice.push(...incomeAdvice);
      }

      // Validate person-specific advice
      globalPerformanceMonitor.startOperation('advice_validation');
      const validatedAdvice: AdviceItem[] = [];
      const validationErrors: AdviceGenerationError[] = [];
      
      for (const adviceItem of allAdvice) {
        if (adviceItem.personId || adviceItem.personSpecificChanges) {
          const validation = validatePersonSpecificAdvice(adviceItem, params);
          if (validation.isValid) {
            validatedAdvice.push(adviceItem);
          } else {
            validationErrors.push({
              code: 'PERSON_SPECIFIC_VALIDATION_FAILED',
              message: `Person-specific advice validation failed: ${validation.errors.join(', ')}`,
              context: { adviceId: adviceItem.id, personId: adviceItem.personId },
              severity: 'warning',
            });
            // Still include the advice but log the validation issues
            validatedAdvice.push(adviceItem);
          }
        } else {
          validatedAdvice.push(adviceItem);
        }
      }
      
      errors.push(...validationErrors);
      globalPerformanceMonitor.endOperation('advice_validation', validatedAdvice.length);

      // Filter by effectiveness threshold
      const filteredAdvice = this.config.minEffectivenessThreshold
        ? validatedAdvice.filter(advice => advice.effectivenessScore >= this.config.minEffectivenessThreshold!)
        : validatedAdvice;

      // Rank recommendations
      const rankedRecommendations = this.rankRecommendations(filteredAdvice);

      // Limit to max recommendations
      const limitedRecommendations = this.config.maxRecommendations
        ? rankedRecommendations.slice(0, this.config.maxRecommendations)
        : rankedRecommendations;

      // Categorize into quick wins and long-term strategies
      const quickWins = limitedRecommendations.filter(advice => 
        advice.feasibilityScore >= 80 && advice.priority === 'high'
      );

      const longTermStrategies = limitedRecommendations.filter(advice => 
        advice.feasibilityScore < 80 || advice.effectivenessScore >= 70
      );

      const advice: RetirementAdvice = {
        overallAssessment,
        retirementFeasibility,
        recommendations: limitedRecommendations,
        quickWins,
        longTermStrategies,
      };

      globalPerformanceMonitor.endOperation('advice_generation_batch', limitedRecommendations.length);
      globalPerformanceMonitor.endOperation('advice_generation_full', limitedRecommendations.length);

      return {
        advice,
        errors,
        warnings,
      };
    } catch (error) {
      globalPerformanceMonitor.endOperation('advice_generation_full');
      errors.push({
        code: 'ADVICE_GENERATION_FAILED',
        message: `Advice generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
        context: { error: String(error) },
      });

      // Return minimal advice structure on error
      return {
        advice: {
          overallAssessment: 'critical',
          retirementFeasibility: {
            canRetireAtTarget: false,
          },
          recommendations: [],
          quickWins: [],
          longTermStrategies: [],
        },
        errors,
        warnings,
      };
    }
  }

  /**
   * Assesses overall retirement readiness
   */
  private assessRetirementReadiness(result: SimulationResult, params: UserParameters): RetirementAssessment {
    // Check if retirement is achievable at target age
    if (result.retirementDate && result.retirementAge) {
      if (result.retirementAge <= params.retirementAge + 2) {
        return 'on_track';
      } else if (result.retirementAge <= params.retirementAge + 10) {
        return 'needs_improvement';
      }
    }

    // Check sustainability
    if (!result.isSustainable) {
      return 'critical';
    }

    // Check final net worth trajectory
    if (result.states.length >= 2) {
      const finalState = result.states[result.states.length - 1];
      const midState = result.states[Math.floor(result.states.length / 2)];
      
      // If net worth is declining in the second half
      if (finalState.netWorth < midState.netWorth * 0.9) {
        return 'critical';
      }
    }

    return 'needs_improvement';
  }

  /**
   * Analyzes retirement feasibility
   */
  private analyzeRetirementFeasibility(result: SimulationResult, params: UserParameters): RetirementFeasibility {
    const canRetireAtTarget = result.retirementDate !== null && 
      result.retirementAge !== null && 
      result.retirementAge <= params.retirementAge + 1;

    const feasibility: RetirementFeasibility = {
      canRetireAtTarget,
    };

    if (result.retirementAge) {
      feasibility.actualRetirementAge = result.retirementAge;
    }

    // Calculate shortfall or surplus
    if (result.states.length > 0) {
      const finalState = result.states[result.states.length - 1];
      const requiredAssets = params.desiredAnnualRetirementIncome / 0.04; // 4% rule
      const actualAssets = finalState.investments + finalState.superannuation;

      if (actualAssets < requiredAssets) {
        feasibility.shortfallAmount = requiredAssets - actualAssets;
      } else {
        feasibility.surplusAmount = actualAssets - requiredAssets;
      }
    }

    return feasibility;
  }

  /**
   * Generate cache key for advice generation
   */
  private generateAdviceCacheKey(states: FinancialState[], params: UserParameters, category: string): string {
    // Use key financial metrics to generate cache key
    const firstState = states[0];
    const lastState = states[states.length - 1];
    const midState = states[Math.floor(states.length / 2)];
    
    const keyData = {
      category,
      statesLength: states.length,
      firstNetWorth: Math.round(firstState.netWorth / 1000), // Round to nearest $1k for cache efficiency
      lastNetWorth: Math.round(lastState.netWorth / 1000),
      midNetWorth: Math.round(midState.netWorth / 1000),
      salary: params.annualSalary,
      loanBalance: Math.round((firstState.loanBalance || 0) / 1000),
      investments: Math.round(firstState.investments / 1000),
      age: params.currentAge,
      retirementAge: params.retirementAge,
    };
    
    return JSON.stringify(keyData);
  }

  /**
   * Cached version of debt strategy analysis
   */
  private analyzeDebtStrategyCached(states: FinancialState[], params: UserParameters): AdviceItem[] {
    const cacheKey = this.generateAdviceCacheKey(states, params, 'debt');
    const cachedResult = this.debtAdviceCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = this.analyzeDebtStrategy(states, params);
    this.debtAdviceCache.set(cacheKey, result);
    return result;
  }

  /**
   * Cached version of investment strategy analysis
   */
  private analyzeInvestmentStrategyCached(states: FinancialState[], params: UserParameters): AdviceItem[] {
    const cacheKey = this.generateAdviceCacheKey(states, params, 'investment');
    const cachedResult = this.investmentAdviceCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = this.analyzeInvestmentStrategy(states, params);
    this.investmentAdviceCache.set(cacheKey, result);
    return result;
  }

  /**
   * Cached version of expense optimization analysis
   */
  private analyzeExpenseOptimizationCached(states: FinancialState[], params: UserParameters): AdviceItem[] {
    const cacheKey = this.generateAdviceCacheKey(states, params, 'expense');
    const cachedResult = this.expenseAdviceCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = this.analyzeExpenseOptimization(states, params);
    this.expenseAdviceCache.set(cacheKey, result);
    return result;
  }

  /**
   * Cached version of income strategy analysis
   */
  private analyzeIncomeStrategyCached(states: FinancialState[], params: UserParameters): AdviceItem[] {
    const cacheKey = this.generateAdviceCacheKey(states, params, 'income');
    const cachedResult = this.incomeAdviceCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = this.analyzeIncomeStrategy(states, params);
    this.incomeAdviceCache.set(cacheKey, result);
    return result;
  }

  /**
   * Analyzes debt acceleration strategies and generates recommendations
   * Validates: Requirements 2.2, 4.1
   */
  analyzeDebtStrategy(states: FinancialState[], params: UserParameters): AdviceItem[] {
    const advice: AdviceItem[] = [];

    if (states.length === 0) {
      return advice;
    }

    // Check if there are active loans at the beginning of the simulation
    // (Don't use final state as loans might be paid off by then)
    const initialState = states[0];
    const hasActiveLoans = initialState.loanBalance > 0 || 
      (initialState.loanBalances && Object.values(initialState.loanBalances).some(balance => balance > 0));

    if (!hasActiveLoans) {
      return advice;
    }

    const finalState = states[states.length - 1];

    // Analyze loan payoff acceleration
    if (params.loans && params.loans.length > 0) {
      for (const loan of params.loans) {
        const currentBalance = finalState.loanBalances?.[loan.id] ?? 0;
        if (currentBalance > 0) {
          advice.push(...this.generateLoanAccelerationAdvice(loan, currentBalance, states));
        }
      }
    } else if (finalState.loanBalance > 0) {
      // Legacy single loan
      advice.push(...this.generateLegacyLoanAccelerationAdvice(params, finalState.loanBalance, states));
    }

    // Analyze offset account optimization
    const offsetAdvice = this.generateOffsetOptimizationAdvice(params, states);
    advice.push(...offsetAdvice);

    return advice;
  }

  /**
   * Generates loan acceleration advice for individual loans
   */
  private generateLoanAccelerationAdvice(loan: any, currentBalance: number, states: FinancialState[]): AdviceItem[] {
    const advice: AdviceItem[] = [];

    // Calculate potential extra payment amounts
    const extraPaymentOptions = [100, 250, 500, 1000];
    
    for (const extraPayment of extraPaymentOptions) {
      // Estimate time savings (simplified calculation)
      const monthlyRate = loan.interestRate / 100 / 12;
      const currentPayment = loan.paymentAmount;
      
      // Calculate months to pay off with current payment
      const currentMonths = this.calculateLoanPayoffTime(currentBalance, currentPayment, monthlyRate);
      
      // Calculate months to pay off with extra payment
      const acceleratedMonths = this.calculateLoanPayoffTime(currentBalance, currentPayment + extraPayment, monthlyRate);
      
      const timeSavings = (currentMonths - acceleratedMonths) / 12; // Convert to years
      const interestSavings = (currentMonths - acceleratedMonths) * currentPayment * monthlyRate;

      if (timeSavings > 0.5) { // Only suggest if saves at least 6 months
        advice.push({
          id: `debt-acceleration-${loan.id}-${extraPayment}`,
          category: 'debt',
          priority: extraPayment <= 250 ? 'high' : 'medium',
          title: `Accelerate ${loan.label} Payments (+${formatCurrency(extraPayment)}/month)`,
          description: `Add ${formatCurrency(extraPayment)} to your monthly ${loan.label} payment to save ${timeSavings.toFixed(1)} years and ${formatCurrency(interestSavings)} in interest.`,
          specificActions: [
            `Increase monthly payment from ${formatCurrency(currentPayment)} to ${formatCurrency(currentPayment + extraPayment)}`,
            `Set up automatic extra payment to ensure consistency`,
            `Review budget to identify where extra ${formatCurrency(extraPayment)} can come from`,
          ],
          projectedImpact: {
            timelineSavings: timeSavings,
            costSavings: interestSavings,
          },
          feasibilityScore: this.calculateFeasibilityScore(extraPayment, states),
          effectivenessScore: Math.min(95, (timeSavings / 5) * 100), // Scale based on years saved
        });
      }
    }

    return advice;
  }

  /**
   * Generates legacy loan acceleration advice
   */
  private generateLegacyLoanAccelerationAdvice(params: UserParameters, currentBalance: number, states: FinancialState[]): AdviceItem[] {
    const advice: AdviceItem[] = [];

    const extraPaymentOptions = [100, 250, 500, 1000];
    const monthlyRate = params.loanInterestRate / 100 / 12;
    const currentPayment = params.loanPaymentAmount;

    for (const extraPayment of extraPaymentOptions) {
      const currentMonths = this.calculateLoanPayoffTime(currentBalance, currentPayment, monthlyRate);
      const acceleratedMonths = this.calculateLoanPayoffTime(currentBalance, currentPayment + extraPayment, monthlyRate);
      
      const timeSavings = (currentMonths - acceleratedMonths) / 12;
      const interestSavings = (currentMonths - acceleratedMonths) * currentPayment * monthlyRate;

      if (timeSavings > 0.5) {
        advice.push({
          id: `debt-acceleration-legacy-${extraPayment}`,
          category: 'debt',
          priority: extraPayment <= 250 ? 'high' : 'medium',
          title: `Accelerate Loan Payments (+${formatCurrency(extraPayment)}/month)`,
          description: `Add ${formatCurrency(extraPayment)} to your monthly loan payment to save ${timeSavings.toFixed(1)} years and ${formatCurrency(interestSavings)} in interest.`,
          specificActions: [
            `Increase monthly payment from ${formatCurrency(currentPayment)} to ${formatCurrency(currentPayment + extraPayment)}`,
            `Set up automatic extra payment`,
            `Review budget for extra ${formatCurrency(extraPayment)}`,
          ],
          projectedImpact: {
            timelineSavings: timeSavings,
            costSavings: interestSavings,
          },
          feasibilityScore: this.calculateFeasibilityScore(extraPayment, states),
          effectivenessScore: Math.min(95, (timeSavings / 5) * 100),
        });
      }
    }

    return advice;
  }

  /**
   * Generates offset account optimization advice
   */
  private generateOffsetOptimizationAdvice(params: UserParameters, states: FinancialState[]): AdviceItem[] {
    const advice: AdviceItem[] = [];

    // Check if offset accounts are available but not being used optimally
    const hasOffsetCapability = params.useOffsetAccount || 
      (params.loans && params.loans.some(loan => loan.hasOffset));

    if (!hasOffsetCapability || states.length === 0) {
      return advice;
    }

    // Check if there are any active loans throughout the simulation timeline
    // Look at a representative early state where cash has had time to accumulate
    const currentStateIndex = Math.min(12, states.length - 1); // Look at ~1 year in
    const currentState = states[currentStateIndex];
    
    // Check if there are active loans at the current time
    const hasActiveLoans = this.hasActiveLoansAtState(currentState, params);
    
    if (!hasActiveLoans) {
      return advice; // No active loans to benefit from offset
    }

    // Find when loans will be paid off to calculate realistic savings period
    const loanPayoffTimeframe = this.estimateLoanPayoffTimeframe(states, params, currentStateIndex);
    
    // If there's cash sitting around that could be in offset
    if (currentState.cash > 1000) {
      const interestRate = params.loans && params.loans.length > 0 
        ? Math.max(...params.loans.map(loan => loan.interestRate))
        : params.loanInterestRate;

      // Calculate savings only for the period when loans are active
      const yearsOfSavings = Math.min(loanPayoffTimeframe, 10); // Cap at 10 years for calculation
      const annualSavings = currentState.cash * (interestRate / 100);
      const totalSavings = annualSavings * yearsOfSavings;

      // Only suggest if there's meaningful time left on the loans
      if (yearsOfSavings > 0.5) {
        const timeframeText = yearsOfSavings < 10 
          ? ` over the next ${yearsOfSavings.toFixed(1)} years until loan payoff`
          : ` annually`;

        advice.push({
          id: 'offset-optimization-cash',
          category: 'debt',
          priority: 'high',
          title: 'Optimize Offset Account Usage',
          description: `Move ${formatCurrency(currentState.cash)} from cash to offset account to save ${formatCurrency(annualSavings)} annually in interest${timeframeText}.`,
          specificActions: [
            'Transfer excess cash to offset account',
            'Set up automatic sweep from transaction account to offset',
            'Review cash flow needs to maintain appropriate buffer',
            yearsOfSavings < 10 ? `Note: Loan will be paid off in approximately ${yearsOfSavings.toFixed(1)} years` : '',
          ].filter(action => action !== ''), // Remove empty strings
          projectedImpact: {
            costSavings: totalSavings,
          },
          feasibilityScore: 95, // Very easy to implement
          effectivenessScore: Math.min(90, (totalSavings / 1000) * 15), // Scale based on total savings
        });
      }
    }

    return advice;
  }

  /**
   * Helper method to check if there are active loans at a given state
   */
  private hasActiveLoansAtState(state: FinancialState, params: UserParameters): boolean {
    // Check legacy single loan
    if (state.loanBalance > 0) {
      return true;
    }

    // Check multiple loans
    if (params.loans && params.loans.length > 0 && state.loanBalances) {
      return Object.values(state.loanBalances).some(balance => balance > 0);
    }

    return false;
  }

  /**
   * Helper method to estimate when loans will be paid off from current evaluation point
   */
  private estimateLoanPayoffTimeframe(states: FinancialState[], params: UserParameters, currentStateIndex: number = 0): number {
    // Look for the point where all loans are paid off, starting from current evaluation point
    for (let i = currentStateIndex; i < states.length; i++) {
      const state = states[i];
      const hasActiveLoans = this.hasActiveLoansAtState(state, params);
      
      if (!hasActiveLoans) {
        // Found payoff point, calculate years from current evaluation point
        const currentDate = states[currentStateIndex].date;
        const payoffDate = state.date;
        const yearsToPayoff = (payoffDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        return Math.max(0, yearsToPayoff);
      }
    }

    // If loans are never paid off in simulation, return a large number
    return 20; // Assume 20 years if not paid off in simulation
  }

  /**
   * Analyzes investment optimization strategies
   * Validates: Requirements 2.3, 4.2
   */
  analyzeInvestmentStrategy(states: FinancialState[], params: UserParameters): AdviceItem[] {
    const advice: AdviceItem[] = [];

    if (states.length === 0) {
      return advice;
    }

    // Analyze contribution increases
    const contributionAdvice = this.generateInvestmentContributionAdvice(params, states);
    advice.push(...contributionAdvice);

    // Analyze person-specific super contribution increases
    const personSpecificSuperAdvice = this.generatePersonSpecificSuperAdvice(params, states);
    advice.push(...personSpecificSuperAdvice);

    // Analyze allocation optimization
    const allocationAdvice = this.generateAllocationOptimizationAdvice(params, states);
    advice.push(...allocationAdvice);

    return advice;
  }

  /**
   * Generates person-specific superannuation contribution advice
   * Ensures changes are applied to the correct person
   */
  private generatePersonSpecificSuperAdvice(params: UserParameters, states: FinancialState[]): AdviceItem[] {
    const advice: AdviceItem[] = [];

    // Only generate person-specific advice for household mode
    if (params.householdMode !== 'couple' || !params.people || params.people.length === 0) {
      return advice;
    }

    for (const person of params.people) {
      // Check each person's super accounts
      for (const superAccount of person.superAccounts) {
        const currentRate = superAccount.contributionRate;
        
        // Suggest increases in 1% increments up to 15%
        const suggestedRates = [currentRate + 1, currentRate + 2, Math.min(15, currentRate + 3)];
        
        for (const suggestedRate of suggestedRates) {
          if (suggestedRate <= currentRate || suggestedRate > 15) continue;
          
          // Calculate projected benefit over 10 years
          const rateIncrease = suggestedRate - currentRate;
          
          // Find person's income to calculate contribution increase
          const totalIncome = person.incomeSources.reduce((sum, income) => {
            if (income.isBeforeTax) {
              // Convert to annual amount
              const multiplier = income.frequency === 'weekly' ? 52 :
                               income.frequency === 'fortnightly' ? 26 :
                               income.frequency === 'monthly' ? 12 : 1;
              return sum + (income.amount * multiplier);
            }
            return sum;
          }, 0);
          
          if (totalIncome === 0) continue;
          
          const additionalAnnualContribution = (totalIncome * rateIncrease) / 100;
          const projectedBenefit = this.calculateFutureValue(
            additionalAnnualContribution, 
            superAccount.returnRate / 100, 
            10
          );
          
          // Only suggest if benefit is meaningful and feasible
          if (projectedBenefit > 5000 && additionalAnnualContribution < totalIncome * 0.05) {
            const personSpecificAdvice = createSuperContributionAdvice(
              person,
              currentRate,
              suggestedRate,
              projectedBenefit,
              superAccount.id
            );
            
            // Validate the advice before adding
            const validation = validatePersonSpecificAdvice(personSpecificAdvice, params);
            if (validation.isValid) {
              advice.push(personSpecificAdvice);
            }
          }
        }
      }
      
      // Suggest retirement age adjustments if beneficial
      const retirementAgeAdvice = this.generateRetirementAgeAdvice(person, params, states);
      advice.push(...retirementAgeAdvice);
    }

    return advice;
  }

  /**
   * Generates retirement age adjustment advice for a specific person
   */
  private generateRetirementAgeAdvice(person: Person, params: UserParameters, states: FinancialState[]): AdviceItem[] {
    const advice: AdviceItem[] = [];
    const currentRetirementAge = person.retirementAge;
    
    // Consider delaying retirement by 1-3 years
    for (let delay = 1; delay <= 3; delay++) {
      const suggestedAge = currentRetirementAge + delay;
      
      if (suggestedAge > 70) continue; // Don't suggest retiring after 70
      
      // Calculate benefit of working additional years
      const additionalWorkingYears = delay;
      const personIncome = person.incomeSources.reduce((sum, income) => {
        if (income.isBeforeTax) {
          const multiplier = income.frequency === 'weekly' ? 52 :
                           income.frequency === 'fortnightly' ? 26 :
                           income.frequency === 'monthly' ? 12 : 1;
          return sum + (income.amount * multiplier);
        }
        return sum;
      }, 0);
      
      // Rough calculation: additional income + super growth + delayed withdrawal
      const additionalEarnings = personIncome * additionalWorkingYears;
      const superGrowth = person.superAccounts.reduce((sum, acc) => {
        return sum + (acc.balance * Math.pow(1 + acc.returnRate / 100, additionalWorkingYears) - acc.balance);
      }, 0);
      
      const totalBenefit = additionalEarnings + superGrowth;
      
      if (totalBenefit > 50000) { // Only suggest if significant benefit
        const reason = `Working ${delay} additional year${delay > 1 ? 's' : ''} could provide ${formatCurrency(totalBenefit)} in additional retirement security.`;
        
        const retirementAdvice = createRetirementAgeAdvice(
          person,
          suggestedAge,
          currentRetirementAge,
          totalBenefit,
          reason
        );
        
        const validation = validatePersonSpecificAdvice(retirementAdvice, params);
        if (validation.isValid) {
          advice.push(retirementAdvice);
        }
      }
    }
    
    return advice;
  }

  /**
   * Generates investment contribution increase advice
   */
  private generateInvestmentContributionAdvice(params: UserParameters, states: FinancialState[]): AdviceItem[] {
    const advice: AdviceItem[] = [];

    const currentContribution = params.monthlyInvestmentContribution;
    const increaseOptions = [50, 100, 200, 500];

    for (const increase of increaseOptions) {
      const newContribution = currentContribution + increase;
      const annualIncrease = increase * 12;

      // Estimate impact over 10 years with compound growth
      const returnRate = params.investmentReturnRate / 100;
      const years = Math.min(10, params.retirementAge - params.currentAge);
      const futureValue = this.calculateFutureValue(annualIncrease, returnRate, years);

      advice.push({
        id: `investment-increase-${increase}`,
        category: 'investment',
        priority: increase <= 100 ? 'high' : 'medium',
        title: `Increase Investment Contributions (+${formatCurrency(increase)}/month)`,
        description: `Boost monthly investments from ${formatCurrency(currentContribution)} to ${formatCurrency(newContribution)}. This could generate an additional ${formatCurrency(futureValue)} over ${years} years.`,
        specificActions: [
          `Increase automatic investment contribution by ${formatCurrency(increase)} per month`,
          `Review budget to accommodate additional ${formatCurrency(annualIncrease)} annually`,
          `Consider dollar-cost averaging to reduce market timing risk`,
        ],
        projectedImpact: {
          additionalAssets: futureValue,
          timelineSavings: this.estimateRetirementAcceleration(futureValue, params),
        },
        feasibilityScore: this.calculateFeasibilityScore(increase, states),
        effectivenessScore: Math.min(95, (futureValue / 10000) * 10), // Scale based on future value
      });
    }

    return advice;
  }

  /**
   * Generates allocation optimization advice
   */
  private generateAllocationOptimizationAdvice(params: UserParameters, _states: FinancialState[]): AdviceItem[] {
    const advice: AdviceItem[] = [];

    // Suggest more aggressive allocation if young and conservative
    const yearsToRetirement = params.retirementAge - params.currentAge;
    const currentReturnRate = params.investmentReturnRate;

    if (yearsToRetirement > 10 && currentReturnRate < 7) {
      const suggestedRate = Math.min(8, currentReturnRate + 1.5);
      const additionalReturn = suggestedRate - currentReturnRate;
      
      // Calculate impact on final portfolio value
      const currentBalance = params.currentInvestmentBalance;
      const monthlyContribution = params.monthlyInvestmentContribution;
      
      const currentFutureValue = this.calculateFutureValue(monthlyContribution * 12, currentReturnRate / 100, yearsToRetirement) + 
        currentBalance * Math.pow(1 + currentReturnRate / 100, yearsToRetirement);
      
      const improvedFutureValue = this.calculateFutureValue(monthlyContribution * 12, suggestedRate / 100, yearsToRetirement) + 
        currentBalance * Math.pow(1 + suggestedRate / 100, yearsToRetirement);
      
      const additionalValue = improvedFutureValue - currentFutureValue;

      advice.push({
        id: 'allocation-optimization-aggressive',
        category: 'investment',
        priority: 'medium',
        title: `Optimize Investment Allocation for Growth`,
        description: `Consider a more growth-oriented portfolio targeting ${suggestedRate}% returns instead of ${currentReturnRate}%. This could add ${formatCurrency(additionalValue)} to your retirement savings.`,
        specificActions: [
          `Review current investment allocation with a financial advisor`,
          `Consider increasing equity allocation given your ${yearsToRetirement}-year time horizon`,
          `Rebalance portfolio to target higher growth potential`,
          `Ensure you're comfortable with increased volatility`,
        ],
        projectedImpact: {
          additionalAssets: additionalValue,
          timelineSavings: this.estimateRetirementAcceleration(additionalValue, params),
        },
        feasibilityScore: 70, // Requires some knowledge and risk tolerance
        effectivenessScore: Math.min(90, (additionalReturn / 2) * 100), // Scale based on additional return
      });
    }

    return advice;
  }

  /**
   * Analyzes expense reduction opportunities
   * Validates: Requirements 4.3
   */
  analyzeExpenseOptimization(states: FinancialState[], params: UserParameters): AdviceItem[] {
    const advice: AdviceItem[] = [];

    if (states.length === 0) {
      return advice;
    }

    // Suggest expense reductions in high-impact categories
    const expenseCategories = [
      { name: 'Living Expenses', amount: params.monthlyLivingExpenses, reductionPotential: 0.15 },
      { name: 'Housing Costs', amount: params.monthlyRentOrMortgage, reductionPotential: 0.10 },
    ];

    for (const category of expenseCategories) {
      if (category.amount > 0) {
        const reductionAmounts = [
          category.amount * 0.05, // 5% reduction
          category.amount * 0.10, // 10% reduction
          category.amount * category.reductionPotential, // Maximum realistic reduction
        ];

        for (let i = 0; i < reductionAmounts.length; i++) {
          const reduction = reductionAmounts[i];
          const annualSavings = reduction * 12;
          
          // Calculate impact if invested
          const yearsToRetirement = params.retirementAge - params.currentAge;
          const investedValue = this.calculateFutureValue(annualSavings, params.investmentReturnRate / 100, yearsToRetirement);

          const priority: AdvicePriority = i === 0 ? 'high' : i === 1 ? 'medium' : 'low';
          const percentage = ((i + 1) * 5).toString();

          advice.push({
            id: `expense-reduction-${category.name.toLowerCase().replace(' ', '-')}-${percentage}`,
            category: 'expense',
            priority,
            title: `Reduce ${category.name} by ${percentage}%`,
            description: `Cut ${category.name} by ${formatCurrency(reduction)}/month (${percentage}% reduction). Invest the savings to potentially gain ${formatCurrency(investedValue)} by retirement.`,
            specificActions: [
              `Review ${category.name.toLowerCase()} for optimization opportunities`,
              `Set a target to reduce by ${formatCurrency(reduction)} monthly`,
              `Automatically invest the savings to maximize compound growth`,
              `Track progress monthly to ensure targets are met`,
            ],
            projectedImpact: {
              costSavings: annualSavings,
              additionalAssets: investedValue,
              timelineSavings: this.estimateRetirementAcceleration(investedValue, params),
            },
            feasibilityScore: 90 - (i * 20), // Easier reductions have higher feasibility
            effectivenessScore: Math.min(85, (investedValue / 10000) * 10),
          });
        }
      }
    }

    return advice;
  }

  /**
   * Analyzes income enhancement strategies
   * Validates: Requirements 4.4
   */
  analyzeIncomeStrategy(states: FinancialState[], params: UserParameters): AdviceItem[] {
    const advice: AdviceItem[] = [];

    if (states.length === 0) {
      return advice;
    }

    // Analyze income increase opportunities
    const currentAnnualSalary = params.annualSalary;
    const increaseOptions = [
      { amount: currentAnnualSalary * 0.05, label: '5% raise' },
      { amount: currentAnnualSalary * 0.10, label: '10% raise' },
      { amount: currentAnnualSalary * 0.20, label: '20% raise (promotion)' },
    ];

    for (let i = 0; i < increaseOptions.length; i++) {
      const option = increaseOptions[i];
      const netIncrease = option.amount * (1 - params.incomeTaxRate / 100); // After tax
      
      // Calculate impact if additional income is invested
      const yearsToRetirement = params.retirementAge - params.currentAge;
      const investedValue = this.calculateFutureValue(netIncrease, params.investmentReturnRate / 100, yearsToRetirement);

      const priority: AdvicePriority = i === 0 ? 'high' : i === 1 ? 'medium' : 'low';

      advice.push({
        id: `income-increase-${i}`,
        category: 'income',
        priority,
        title: `Pursue ${option.label}`,
        description: `Increase annual income by ${formatCurrency(option.amount)} (${option.label}). After tax, this provides ${formatCurrency(netIncrease)} extra annually. If invested, could grow to ${formatCurrency(investedValue)} by retirement.`,
        specificActions: [
          `Discuss career advancement opportunities with manager`,
          `Update skills and qualifications to justify increase`,
          `Research market rates for your role and experience`,
          `Automatically invest the additional income to maximize growth`,
        ],
        projectedImpact: {
          additionalAssets: investedValue,
          timelineSavings: this.estimateRetirementAcceleration(investedValue, params),
        },
        feasibilityScore: 80 - (i * 15), // Smaller increases more feasible
        effectivenessScore: Math.min(95, (option.amount / currentAnnualSalary) * 200), // Scale based on percentage increase
      });
    }

    return advice;
  }

  /**
   * Ranks recommendations by effectiveness and feasibility
   * Validates: Requirements 4.5
   */
  rankRecommendations(advice: AdviceItem[]): RankedAdvice[] {
    // Calculate overall score for each advice item
    const scoredAdvice = advice.map(item => {
      // Weight effectiveness more heavily than feasibility
      const overallScore = (item.effectivenessScore * 0.7) + (item.feasibilityScore * 0.3);
      
      return {
        ...item,
        overallScore,
        rank: 0, // Will be set after sorting
      };
    });

    // Sort by overall score (descending)
    scoredAdvice.sort((a, b) => b.overallScore - a.overallScore);

    // Assign ranks
    return scoredAdvice.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }

  /**
   * Helper method to calculate loan payoff time in months
   */
  private calculateLoanPayoffTime(balance: number, monthlyPayment: number, monthlyRate: number): number {
    if (monthlyRate === 0) {
      return balance / monthlyPayment;
    }
    
    return Math.log(1 + (balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
  }

  /**
   * Helper method to calculate feasibility score based on required cash flow
   */
  private calculateFeasibilityScore(monthlyCost: number, states: FinancialState[]): number {
    if (states.length === 0) {
      return 50; // Default moderate feasibility
    }

    // Look at average cash flow in recent states
    const recentStates = states.slice(-12); // Last 12 months
    const avgCashFlow = recentStates.reduce((sum, state) => sum + state.cashFlow, 0) / recentStates.length;

    // Calculate feasibility based on available cash flow
    if (avgCashFlow <= 0) {
      return 20; // Very difficult if no positive cash flow
    }

    const feasibilityRatio = monthlyCost / avgCashFlow;
    
    if (feasibilityRatio <= 0.1) return 95; // Very feasible
    if (feasibilityRatio <= 0.2) return 85; // Highly feasible
    if (feasibilityRatio <= 0.3) return 70; // Moderately feasible
    if (feasibilityRatio <= 0.5) return 50; // Somewhat feasible
    return 25; // Difficult
  }

  /**
   * Helper method to calculate future value of annuity
   */
  private calculateFutureValue(annualPayment: number, rate: number, years: number): number {
    if (rate === 0) {
      return annualPayment * years;
    }
    
    return annualPayment * ((Math.pow(1 + rate, years) - 1) / rate);
  }

  /**
   * Helper method to estimate retirement timeline acceleration
   */
  private estimateRetirementAcceleration(additionalAssets: number, _params: UserParameters): number {
    // Rough estimate: each $25,000 in additional assets = 1 year earlier retirement
    // This is based on the 4% rule: $25,000 * 0.04 = $1,000 annual income
    return additionalAssets / 25000;
  }

  /**
   * Updates the advice generation configuration
   */
  updateConfig(newConfig: Partial<AdviceGenerationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets the current advice generation configuration
   */
  getConfig(): AdviceGenerationConfig {
    return { ...this.config };
  }
}

/**
 * Convenience function to create a retirement advice engine with default configuration
 */
export function createRetirementAdviceEngine(config?: Partial<AdviceGenerationConfig>): RetirementAdviceEngine {
  return new RetirementAdviceEngine(config);
}

/**
 * Convenience function to generate advice from simulation results
 */
export function generateRetirementAdvice(
  result: SimulationResult,
  params: UserParameters,
  milestones?: Milestone[],
  config?: Partial<AdviceGenerationConfig>
): AdviceGenerationResult {
  const engine = createRetirementAdviceEngine(config);
  return engine.generateAdvice(result, params, milestones);
}