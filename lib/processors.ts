/**
 * Financial processor modules for the Finance Simulation Tool
 * Each processor handles a specific aspect of financial calculations
 */

import type {
  FinancialState,
  TimeInterval,
  UserParameters,
  TaxBracket,
} from "../types/financial.ts";

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
function convertAnnualRateToInterval(
  annualRate: number,
  interval: TimeInterval,
): number {
  const periodsPerYear = intervalToPeriodsPerYear(interval);
  return Math.pow(1 + annualRate, 1 / periodsPerYear) - 1;
}

/**
 * Calculates tax using progressive tax brackets
 * @param income Annual income amount
 * @param brackets Tax brackets to apply
 * @returns Total tax amount
 */
export function calculateTaxWithBrackets(income: number, brackets: TaxBracket[]): number {
  let totalTax = 0;
  
  for (const bracket of brackets) {
    const bracketMin = bracket.min;
    const bracketMax = bracket.max ?? Infinity;
    
    if (income <= bracketMin) {
      // Income doesn't reach this bracket
      break;
    }
    
    // Calculate taxable amount in this bracket
    const taxableInBracket = Math.min(income, bracketMax) - bracketMin;
    
    if (taxableInBracket > 0) {
      totalTax += taxableInBracket * (bracket.rate / 100);
    }
  }
  
  return totalTax;
}

/**
 * Default Australian tax brackets for 2024-25
 */
export const DEFAULT_AU_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 18200, rate: 0 },
  { min: 18200, max: 45000, rate: 19 },
  { min: 45000, max: 120000, rate: 32.5 },
  { min: 120000, max: 180000, rate: 37 },
  { min: 180000, max: null, rate: 45 },
];

/**
 * Income Processor
 * Calculates income for a given time interval
 */
export const IncomeProcessor = {
  /**
   * Calculates income for the specified time interval
   * @param params User financial parameters
   * @param interval Time interval for calculation
   * @returns Income amount for the interval
   */
  calculateIncome(params: UserParameters, interval: TimeInterval): number {
    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);

    // Calculate how much salary is received per interval
    const salaryPerInterval = params.annualSalary / intervalPeriodsPerYear;

    return salaryPerInterval;
  },

  /**
   * Calculates tax on income for the specified time interval
   * @param params User financial parameters
   * @param annualIncome Annual gross income amount
   * @returns Tax amount for the year
   */
  calculateAnnualTax(params: UserParameters, annualIncome: number): number {
    // Use tax brackets if provided, otherwise fall back to flat rate
    if (params.taxBrackets && params.taxBrackets.length > 0) {
      return calculateTaxWithBrackets(annualIncome, params.taxBrackets);
    } else {
      // Fallback to simple percentage
      return annualIncome * (params.incomeTaxRate / 100);
    }
  },

  /**
   * Calculates tax for a specific interval
   * @param params User financial parameters
   * @param interval Time interval for calculation
   * @returns Tax amount for the interval
   */
  calculateTax(params: UserParameters, interval: TimeInterval): number {
    const annualTax = this.calculateAnnualTax(params, params.annualSalary);
    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    return annualTax / intervalPeriodsPerYear;
  },
};

/**
 * Expense Processor
 * Calculates total expenses for a given time interval
 */
export const ExpenseProcessor = {
  /**
   * Calculates total expenses for the specified time interval
   * @param params User financial parameters
   * @param interval Time interval for calculation
   * @returns Total expense amount for the interval
   */
  calculateExpenses(params: UserParameters, interval: TimeInterval): number {
    // Use individual expense items if provided, otherwise fall back to legacy fields
    if (params.expenseItems && params.expenseItems.length > 0) {
      return this.calculateExpensesFromItems(params.expenseItems, interval);
    }
    
    // Legacy calculation
    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    const monthlyExpenses = params.monthlyLivingExpenses +
      params.monthlyRentOrMortgage;
    const expensesPerInterval = (monthlyExpenses * 12) / intervalPeriodsPerYear;

    return expensesPerInterval;
  },

  /**
   * Calculates expenses from individual expense items
   * @param items Array of expense items
   * @param interval Target time interval
   * @returns Total expense amount for the interval
   */
  calculateExpensesFromItems(
    items: import("../types/expenses.ts").ExpenseItem[],
    interval: TimeInterval
  ): number {
    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    let totalExpenses = 0;

    for (const item of items) {
      if (!item.enabled) continue;

      // Convert item frequency to annual amount
      let annualAmount: number;
      switch (item.frequency) {
        case "weekly":
          annualAmount = item.amount * 52;
          break;
        case "fortnightly":
          annualAmount = item.amount * 26;
          break;
        case "monthly":
          annualAmount = item.amount * 12;
          break;
      }

      // Convert annual to target interval
      const intervalAmount = annualAmount / intervalPeriodsPerYear;
      totalExpenses += intervalAmount;
    }

    return totalExpenses;
  },

  /**
   * Calculates monthly total from expense items
   * @param items Array of expense items
   * @returns Monthly total
   */
  calculateMonthlyTotal(items: import("../types/expenses.ts").ExpenseItem[]): number {
    return this.calculateExpensesFromItems(items, "month");
  },
};

/**
 * Loan Processor
 * Handles loan payment calculations including interest and principal
 */
export const LoanProcessor = {
  /**
   * Calculates loan payment and updates balance with offset account support
   * @param balance Current loan balance
   * @param offsetBalance Current offset account balance
   * @param interestRate Annual interest rate (as decimal, e.g., 0.055 for 5.5%)
   * @param payment Payment amount
   * @param interval Time interval for calculation
   * @param useOffset Whether to use offset account
   * @returns Object with new balance, interest paid, principal paid, and interest saved
   */
  calculateLoanPayment(
    balance: number,
    offsetBalance: number,
    interestRate: number,
    payment: number,
    interval: TimeInterval,
    useOffset: boolean = false,
  ): { 
    newBalance: number; 
    interestPaid: number; 
    principalPaid: number;
    interestSaved: number;
  } {
    // If no balance, no payment needed
    if (balance <= 0) {
      return { newBalance: 0, interestPaid: 0, principalPaid: 0, interestSaved: 0 };
    }

    // Convert annual interest rate to interval rate
    const intervalRate = convertAnnualRateToInterval(interestRate, interval);

    // Calculate effective balance for interest calculation
    // Offset account reduces the balance on which interest is charged
    const effectiveBalance = useOffset 
      ? Math.max(0, balance - offsetBalance)
      : balance;

    // Calculate interest for this period on the effective balance
    const interestPaid = effectiveBalance * intervalRate;

    // Calculate interest saved due to offset account
    const interestWithoutOffset = balance * intervalRate;
    const interestSaved = useOffset ? (interestWithoutOffset - interestPaid) : 0;

    // Principal paid is the payment minus interest (but can't exceed remaining balance)
    const principalPaid = Math.max(0, Math.min(payment - interestPaid, balance));

    // New balance is current balance minus principal paid
    // (Interest is paid but doesn't reduce the balance, only principal does)
    const newBalance = Math.max(0, balance - principalPaid);

    return {
      newBalance,
      interestPaid,
      principalPaid,
      interestSaved,
    };
  },
};

/**
 * Investment Processor
 * Calculates investment growth with contributions and returns
 */
export const InvestmentProcessor = {
  /**
   * Calculates investment growth for the specified time interval
   * Applies compound growth and adds contributions
   * @param balance Current investment balance
   * @param contribution Contribution amount for this interval
   * @param returnRate Annual return rate (as decimal, e.g., 0.07 for 7%)
   * @param interval Time interval for calculation
   * @returns New investment balance after growth and contribution
   */
  calculateInvestmentGrowth(
    balance: number,
    contribution: number,
    returnRate: number,
    interval: TimeInterval,
  ): number {
    // Convert annual return rate to interval rate
    const intervalRate = convertAnnualRateToInterval(returnRate, interval);

    // Apply growth to existing balance
    const balanceAfterGrowth = balance * (1 + intervalRate);

    // Add contribution (which also grows for this period)
    const contributionAfterGrowth = contribution * (1 + intervalRate);

    return balanceAfterGrowth + contributionAfterGrowth;
  },
};

/**
 * Retirement Calculator
 * Determines retirement feasibility and calculates safe withdrawal rates
 */
export const RetirementCalculator = {
  /**
   * Finds the earliest retirement date in the simulation
   * @param states Array of financial states from simulation
   * @param desiredIncome Desired annual retirement income
   * @param currentAge User's current age
   * @param retirementAge Target retirement age
   * @returns Object with retirement date and age, or null values if not achievable
   */
  findRetirementDate(
    states: FinancialState[],
    desiredIncome: number,
    currentAge: number,
    retirementAge: number,
  ): { date: Date | null; age: number | null } {
    if (states.length === 0) {
      return { date: null, age: null };
    }

    const startDate = states[0].date;

    // Iterate through states to find first point where retirement is feasible
    for (let i = 0; i < states.length; i++) {
      const state = states[i];

      // Calculate age at this state
      const yearsElapsed = (state.date.getTime() - startDate.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      const ageAtState = currentAge + yearsElapsed;

      // Must be at least retirement age
      if (ageAtState < retirementAge) {
        continue;
      }

      // Calculate safe withdrawal amount
      const safeWithdrawal = this.calculateSafeWithdrawal(
        state.investments,
        state.superannuation,
        ageAtState,
      );

      // Check if safe withdrawal meets desired income
      if (safeWithdrawal >= desiredIncome) {
        return {
          date: state.date,
          age: ageAtState,
        };
      }
    }

    // Retirement not achievable in simulation timeframe
    return { date: null, age: null };
  },

  /**
   * Calculates safe withdrawal amount using the 4% rule
   * @param investments Investment balance
   * @param superannuation Superannuation balance
   * @param age Current age
   * @returns Annual safe withdrawal amount
   */
  calculateSafeWithdrawal(
    investments: number,
    superannuation: number,
    age: number,
  ): number {
    const SAFE_WITHDRAWAL_RATE = 0.04; // 4% rule
    const PRESERVATION_AGE = 60; // Australian superannuation preservation age

    // Total accessible assets
    let accessibleAssets = investments;

    // Add superannuation if at preservation age
    if (age >= PRESERVATION_AGE) {
      accessibleAssets += superannuation;
    }

    // Calculate safe withdrawal
    return accessibleAssets * SAFE_WITHDRAWAL_RATE;
  },
};
