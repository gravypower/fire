/**
 * Financial processor modules for the Finance Simulation Tool
 * Each processor handles a specific aspect of financial calculations
 */

import type {
  FinancialState,
  TimeInterval,
  UserParameters,
  TaxBracket,
  PaymentFrequency,
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
   * Calculates total annual income from all sources (before tax)
   * @param params User financial parameters
   * @param currentDate Current simulation date (optional, for date-based filtering)
   * @returns Total annual income before tax
   */
  calculateTotalAnnualIncome(params: UserParameters, currentDate?: Date): number {
    // If household mode, sum income from all people
    if (params.householdMode === "couple" && params.people && params.people.length > 0) {
      let totalAnnual = 0;
      for (const person of params.people) {
        if (person.incomeSources && person.incomeSources.length > 0) {
          for (const source of person.incomeSources) {
            if (source.isBeforeTax) {
              const income = this.calculateIncomeFromSource(source, currentDate);
              totalAnnual += income;
            }
          }
        }
      }
      return totalAnnual;
    }

    // Use income sources if provided, otherwise fall back to annualSalary
    if (params.incomeSources && params.incomeSources.length > 0) {
      let totalAnnual = 0;
      for (const source of params.incomeSources) {
        // Only count before-tax income for tax calculation
        if (!source.isBeforeTax) continue;
        
        const income = this.calculateIncomeFromSource(source, currentDate);
        totalAnnual += income;
      }
      return totalAnnual;
    }
    
    // Legacy: use annualSalary
    return params.annualSalary;
  },

  /**
   * Calculates income from a single source, handling date ranges and one-off income
   * @param source Income source
   * @param currentDate Current simulation date (optional)
   * @returns Annual income amount from this source
   */
  calculateIncomeFromSource(
    source: import("../types/financial.ts").IncomeSource,
    currentDate?: Date
  ): number {
    // Check if this is a one-off income
    if (source.isOneOff && source.oneOffDate && currentDate) {
      // One-off income only applies on its specific date
      // For simplicity, we'll apply it in the year it occurs
      const oneOffYear = source.oneOffDate.getFullYear();
      const currentYear = currentDate.getFullYear();
      
      if (oneOffYear === currentYear) {
        return source.amount; // One-off amount is already the total
      } else {
        return 0; // Not in the year of the one-off
      }
    }

    // Check date range for recurring income
    if (currentDate) {
      // Check if income has started
      if (source.startDate && currentDate < source.startDate) {
        return 0; // Income hasn't started yet
      }
      
      // Check if income has ended
      if (source.endDate && currentDate >= source.endDate) {
        return 0; // Income has ended
      }
    }

    // Convert to annual for recurring income
    return this.convertToAnnual(source.amount, source.frequency);
  },

  /**
   * Calculates total annual after-tax income
   * @param params User financial parameters
   * @param currentDate Current simulation date (optional, for date-based filtering)
   * @returns Total annual after-tax income
   */
  calculateTotalAnnualAfterTaxIncome(params: UserParameters, currentDate?: Date): number {
    // If household mode, sum after-tax income from all people
    if (params.householdMode === "couple" && params.people && params.people.length > 0) {
      let totalAnnual = 0;
      for (const person of params.people) {
        if (person.incomeSources && person.incomeSources.length > 0) {
          for (const source of person.incomeSources) {
            if (!source.isBeforeTax) {
              const income = this.calculateIncomeFromSource(source, currentDate);
              totalAnnual += income;
            }
          }
        }
      }
      return totalAnnual;
    }

    if (params.incomeSources && params.incomeSources.length > 0) {
      let totalAnnual = 0;
      for (const source of params.incomeSources) {
        // Only count after-tax income
        if (source.isBeforeTax) continue;
        
        const income = this.calculateIncomeFromSource(source, currentDate);
        totalAnnual += income;
      }
      return totalAnnual;
    }
    
    return 0;
  },

  /**
   * Calculates income for the specified time interval (gross before-tax income)
   * @param params User financial parameters
   * @param interval Time interval for calculation
   * @param currentDate Current simulation date (optional, for date-based filtering)
   * @returns Gross income amount for the interval
   */
  calculateIncome(params: UserParameters, interval: TimeInterval, currentDate?: Date): number {
    const beforeTaxAnnual = this.calculateTotalAnnualIncome(params, currentDate);
    const afterTaxAnnual = this.calculateTotalAnnualAfterTaxIncome(params, currentDate);
    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    
    // Return before-tax income (for tax calculation) + after-tax income
    return (beforeTaxAnnual + afterTaxAnnual) / intervalPeriodsPerYear;
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
   * @param currentDate Current simulation date (optional, for date-based filtering)
   * @returns Tax amount for the interval
   */
  calculateTax(params: UserParameters, interval: TimeInterval, currentDate?: Date): number {
    // If household mode is couple, calculate tax per person
    if (params.householdMode === "couple" && params.people && params.people.length > 0) {
      return this.calculateHouseholdTax(params, interval, currentDate);
    }

    // Legacy single-person calculation
    const totalAnnual = this.calculateTotalAnnualIncome(params, currentDate);
    const annualTax = this.calculateAnnualTax(params, totalAnnual);
    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    return annualTax / intervalPeriodsPerYear;
  },

  /**
   * Calculates tax for a household (couple mode)
   * Each person's income is taxed separately using their own tax brackets
   * @param params User financial parameters
   * @param interval Time interval for calculation
   * @param currentDate Current simulation date (optional, for date-based filtering)
   * @returns Total household tax amount for the interval
   */
  calculateHouseholdTax(params: UserParameters, interval: TimeInterval, currentDate?: Date): number {
    if (!params.people || params.people.length === 0) {
      return 0;
    }

    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    let totalTax = 0;

    // Calculate tax for each person separately
    for (const person of params.people) {
      // Calculate this person's annual income
      let personAnnualIncome = 0;

      // Sum up all before-tax income sources for this person
      if (person.incomeSources && person.incomeSources.length > 0) {
        for (const source of person.incomeSources) {
          if (source.isBeforeTax) {
            const annualAmount = this.calculateIncomeFromSource(source, currentDate);
            personAnnualIncome += annualAmount;
          }
        }
      }

      // Calculate tax for this person using household tax brackets
      let personAnnualTax = 0;
      if (params.taxBrackets && params.taxBrackets.length > 0) {
        // Use household tax brackets
        personAnnualTax = calculateTaxWithBrackets(personAnnualIncome, params.taxBrackets);
      } else {
        // Fall back to flat rate
        personAnnualTax = personAnnualIncome * (params.incomeTaxRate / 100);
      }

      totalTax += personAnnualTax;
    }

    // Convert annual tax to interval tax
    return totalTax / intervalPeriodsPerYear;
  },

  /**
   * Converts an amount from a specific frequency to annual
   * @param amount Amount per frequency period
   * @param frequency Payment frequency
   * @returns Annual amount
   */
  convertToAnnual(amount: number, frequency: PaymentFrequency): number {
    switch (frequency) {
      case "weekly":
        return amount * 52;
      case "fortnightly":
        return amount * 26;
      case "monthly":
        return amount * 12;
      case "yearly":
        return amount;
      default:
        return amount * 12; // Default to monthly
    }
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
   * @param currentDate Current simulation date (optional, for date-based filtering)
   * @returns Total expense amount for the interval
   */
  calculateExpenses(params: UserParameters, interval: TimeInterval, currentDate?: Date): number {
    // Use individual expense items if provided, otherwise fall back to legacy fields
    if (params.expenseItems && params.expenseItems.length > 0) {
      return this.calculateExpensesFromItems(params.expenseItems, interval, currentDate);
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
   * @param currentDate Current simulation date (optional, for date-based filtering)
   * @returns Total expense amount for the interval
   */
  calculateExpensesFromItems(
    items: import("../types/expenses.ts").ExpenseItem[],
    interval: TimeInterval,
    currentDate?: Date
  ): number {
    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    let totalExpenses = 0;

    for (const item of items) {
      if (!item.enabled) continue;

      // Check if this is a one-off expense
      if (item.isOneOff && item.oneOffDate && currentDate) {
        // One-off expenses only apply on their specific date
        // Check if current date matches the one-off date (within the interval)
        const oneOffTime = item.oneOffDate.getTime();
        const currentTime = currentDate.getTime();
        
        // Calculate interval duration in milliseconds
        let intervalMs = 0;
        switch (interval) {
          case "week":
            intervalMs = 7 * 24 * 60 * 60 * 1000;
            break;
          case "fortnight":
            intervalMs = 14 * 24 * 60 * 60 * 1000;
            break;
          case "month":
            intervalMs = 30 * 24 * 60 * 60 * 1000; // Approximate
            break;
          case "year":
            intervalMs = 365 * 24 * 60 * 60 * 1000;
            break;
        }
        
        // Check if one-off date falls within this interval
        if (oneOffTime >= currentTime && oneOffTime < currentTime + intervalMs) {
          totalExpenses += item.amount;
        }
        continue;
      }

      // Check date range for recurring expenses
      if (currentDate) {
        // Check if expense has started
        if (item.startDate && currentDate < item.startDate) {
          continue; // Expense hasn't started yet
        }
        
        // Check if expense has ended
        if (item.endDate && currentDate >= item.endDate) {
          continue; // Expense has ended
        }
      }

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
        case "yearly":
          annualAmount = item.amount;
          break;
        default:
          annualAmount = item.amount * 12; // Default to monthly
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
   * @param isDebtRecycling Whether this loan is used for debt recycling (interest is tax deductible)
   * @returns Object with new balance, interest paid, principal paid, interest saved, and deductible interest
   */
  calculateLoanPayment(
    balance: number,
    offsetBalance: number,
    interestRate: number,
    payment: number,
    interval: TimeInterval,
    useOffset: boolean = false,
    isDebtRecycling: boolean = false,
  ): { 
    newBalance: number; 
    interestPaid: number; 
    principalPaid: number;
    interestSaved: number;
    deductibleInterest: number;
  } {
    // If no balance, no payment needed
    if (balance <= 0) {
      return { newBalance: 0, interestPaid: 0, principalPaid: 0, interestSaved: 0, deductibleInterest: 0 };
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

    // Calculate deductible interest for debt recycling loans
    // Only the interest actually paid (not saved by offset) is deductible
    const deductibleInterest = isDebtRecycling ? interestPaid : 0;

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
      deductibleInterest,
    };
  },

  /**
   * Calculates total payment amount for all loans in an interval
   * @param params User financial parameters
   * @param interval Time interval for calculation
   * @returns Total payment amount for the interval
   */
  calculateTotalLoanPayment(params: UserParameters, interval: TimeInterval): number {
    // Use loans array if provided, otherwise fall back to legacy fields
    if (params.loans && params.loans.length > 0) {
      const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
      let totalPayment = 0;
      
      for (const loan of params.loans) {
        // Convert loan payment to annual
        let annualPayment: number;
        switch (loan.paymentFrequency) {
          case "weekly":
            annualPayment = loan.paymentAmount * 52;
            break;
          case "fortnightly":
            annualPayment = loan.paymentAmount * 26;
            break;
          case "monthly":
            annualPayment = loan.paymentAmount * 12;
            break;
          case "yearly":
            annualPayment = loan.paymentAmount;
            break;
          default:
            annualPayment = loan.paymentAmount * 12; // Default to monthly
        }
        
        // Convert to target interval
        totalPayment += annualPayment / intervalPeriodsPerYear;
      }
      
      return totalPayment;
    }
    
    // Legacy: use single loan fields
    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    let annualPayment: number;
    switch (params.loanPaymentFrequency) {
      case "weekly":
        annualPayment = params.loanPaymentAmount * 52;
        break;
      case "fortnightly":
        annualPayment = params.loanPaymentAmount * 26;
        break;
      case "monthly":
        annualPayment = params.loanPaymentAmount * 12;
        break;
      case "yearly":
        annualPayment = params.loanPaymentAmount;
        break;
      default:
        annualPayment = params.loanPaymentAmount * 12; // Default to monthly
    }
    return annualPayment / intervalPeriodsPerYear;
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

    // First, check if retirement is feasible at the desired retirement age
    // Find the state closest to the desired retirement age
    let stateAtDesiredAge: FinancialState | null = null;
    let closestAgeDiff = Infinity;

    for (let i = 0; i < states.length; i++) {
      const state = states[i];
      const yearsElapsed = (state.date.getTime() - startDate.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      const ageAtState = currentAge + yearsElapsed;

      // Find state closest to desired retirement age
      const ageDiff = Math.abs(ageAtState - retirementAge);
      if (ageDiff < closestAgeDiff && ageAtState >= retirementAge) {
        closestAgeDiff = ageDiff;
        stateAtDesiredAge = state;
      }
    }

    // Check if we can retire at the desired age
    if (stateAtDesiredAge) {
      const yearsElapsed = (stateAtDesiredAge.date.getTime() - startDate.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      const ageAtDesiredRetirement = currentAge + yearsElapsed;

      const safeWithdrawal = this.calculateSafeWithdrawal(
        stateAtDesiredAge.investments,
        stateAtDesiredAge.superannuation,
        ageAtDesiredRetirement,
      );

      // If we can afford it at desired age, return that
      if (safeWithdrawal >= desiredIncome) {
        return {
          date: stateAtDesiredAge.date,
          age: ageAtDesiredRetirement,
        };
      }
    }

    // If not feasible at desired age, find the earliest age where it becomes feasible
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
