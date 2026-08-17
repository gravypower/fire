/**
 * Financial processor modules for the Finance Simulation Tool
 * Each processor handles a specific aspect of financial calculations
 */

import type {
  FinancialState,
  IncomeSource,
  PaymentFrequency,
  TimeInterval,
  UserParameters,
} from "../types/financial.ts";
import { ExpenseItem } from "../types/expenses.ts";
import type { InvestmentHolding, PlannedSale } from "../types/investments.ts";

/**
 * Whether any person in the household has explicit income sources configured.
 * The UI always stores income sources under params.people (even in "single"
 * mode, where people[0] is the one person), so this - not householdMode - is
 * the correct signal for whether per-person income data should be used
 * instead of the legacy annualSalary/incomeTaxRate fields.
 */
export function peopleHaveIncomeSources(params: UserParameters): boolean {
  return !!params.people?.some((p) =>
    p.incomeSources && p.incomeSources.length > 0
  );
}

/**
 * Whether any person in the household has explicit super accounts configured.
 * Same rationale as peopleHaveIncomeSources: the UI stores super accounts
 * under params.people regardless of householdMode.
 */
export function peopleHaveSuperAccounts(params: UserParameters): boolean {
  return !!params.people?.some((p) =>
    p.superAccounts && p.superAccounts.length > 0
  );
}

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

// calculateTaxWithBrackets/DEFAULT_AU_TAX_BRACKETS live in tax_bracket_utils.ts
// (not here) so lib/tax_modules/*.ts can use them without an import cycle
// back through this file. Re-exported for existing callers.
export {
  calculateTaxWithBrackets,
  DEFAULT_AU_TAX_BRACKETS,
} from "./tax_bracket_utils.ts";
import { getCountryModule } from "./tax_modules/index.ts";

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
  calculateTotalAnnualIncome(
    params: UserParameters,
    currentDate?: Date,
  ): number {
    // If any person has explicit income sources, sum income from all people
    if (peopleHaveIncomeSources(params)) {
      const yearsElapsed = currentDate
        ? (currentDate.getTime() - params.startDate.getTime()) /
          (1000 * 60 * 60 * 24 * 365.25)
        : 0;

      let totalAnnual = 0;
      for (const person of params.people!) {
        // A retired person earns no income - matching the same
        // currentAge < retirementAge check the simulation's income phase
        // applies when actually crediting cash. Without this, a retired
        // person's stopped salary was still counted as taxable household
        // income, so tax was computed on money nobody was receiving.
        const personCurrentAge = person.currentAge + yearsElapsed;
        if (personCurrentAge >= person.retirementAge) {
          continue;
        }

        if (person.incomeSources && person.incomeSources.length > 0) {
          for (const source of person.incomeSources) {
            if (source.isBeforeTax) {
              const income = this.calculateIncomeFromSource(
                source,
                currentDate,
              );
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
    source: IncomeSource,
    currentDate?: Date,
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
  calculateTotalAnnualAfterTaxIncome(
    params: UserParameters,
    currentDate?: Date,
  ): number {
    // If any person has explicit income sources, sum after-tax income from all people
    if (peopleHaveIncomeSources(params)) {
      let totalAnnual = 0;
      for (const person of params.people!) {
        if (person.incomeSources && person.incomeSources.length > 0) {
          for (const source of person.incomeSources) {
            if (!source.isBeforeTax) {
              const income = this.calculateIncomeFromSource(
                source,
                currentDate,
              );
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
  calculateIncome(
    params: UserParameters,
    interval: TimeInterval,
    currentDate?: Date,
  ): number {
    const beforeTaxAnnual = this.calculateTotalAnnualIncome(
      params,
      currentDate,
    );
    const afterTaxAnnual = this.calculateTotalAnnualAfterTaxIncome(
      params,
      currentDate,
    );
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
      return getCountryModule(params.country).calculateTax(
        annualIncome,
        params.taxBrackets,
        {
          medicareLevyRatePercent: params.medicareLevyRate,
          standardDeduction: params.standardDeduction,
        },
      );
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
  calculateTax(
    params: UserParameters,
    interval: TimeInterval,
    currentDate?: Date,
  ): number {
    // If any person has explicit income sources, calculate tax per person
    if (peopleHaveIncomeSources(params)) {
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
  calculateHouseholdTax(
    params: UserParameters,
    interval: TimeInterval,
    currentDate?: Date,
  ): number {
    if (!params.people || params.people.length === 0) {
      return 0;
    }

    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    let totalTax = 0;

    const yearsElapsed = currentDate
      ? (currentDate.getTime() - params.startDate.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
      : 0;

    // Calculate tax for each person separately
    for (const person of params.people) {
      // A retired person earns no income, so nothing to tax - matching the
      // same currentAge < retirementAge check the income phase already
      // applies. Without this, a retired person's stopped salary was still
      // being taxed as household income, so their still-working partner
      // ended up absorbing tax on money nobody was actually receiving.
      const personCurrentAge = person.currentAge + yearsElapsed;
      if (personCurrentAge >= person.retirementAge) {
        continue;
      }

      // Calculate this person's annual income
      let personAnnualIncome = 0;

      // Sum up all before-tax income sources for this person
      if (person.incomeSources && person.incomeSources.length > 0) {
        for (const source of person.incomeSources) {
          if (source.isBeforeTax) {
            const annualAmount = this.calculateIncomeFromSource(
              source,
              currentDate,
            );
            personAnnualIncome += annualAmount;
          }
        }
      }

      // Calculate tax for this person using household tax brackets
      let personAnnualTax = 0;
      if (params.taxBrackets && params.taxBrackets.length > 0) {
        // Use household tax brackets
        personAnnualTax = getCountryModule(params.country).calculateTax(
          personAnnualIncome,
          params.taxBrackets,
          {
            medicareLevyRatePercent: params.medicareLevyRate,
            standardDeduction: params.standardDeduction,
          },
        );
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
  calculateExpenses(
    params: UserParameters,
    interval: TimeInterval,
    currentDate?: Date,
  ): number {
    // Determine which calculation method to use
    // We only use individual items if they are provided AND contain valid data
    const hasValidItems = params.expenseItems &&
      params.expenseItems.length > 0 &&
      params.expenseItems.some((item) =>
        item && (item.amount > 0 || (item.name && item.name.length > 0))
      );

    if (hasValidItems) {
      const itemTotal = this.calculateExpensesFromItems(
        params.expenseItems!,
        interval,
        currentDate,
      );

      // If we have items but the result is 0 (e.g. all disabled or out of date),
      // we only fallback to legacy if legacy is non-zero and user hasn't explicitly
      // migrated to the item system (checked by presence of items).
      // However, if the items result in 0, and legacy is also 0, we're consistent.
      return itemTotal;
    }

    // Legacy calculation
    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    const monthlyExpenses = (params.monthlyLivingExpenses || 0) +
      (params.monthlyRentOrMortgage || 0);
    const expensesPerInterval = (monthlyExpenses * 12) / intervalPeriodsPerYear;

    return expensesPerInterval;
  },

  /**
   * Amount a single expense item contributes for the target interval, given
   * the current simulation date - or null if the item is disabled, hasn't
   * started, has already ended, or (for one-off items) isn't due this
   * period. Shared by calculateExpensesFromItems (sums these) and
   * getActiveExpenseBreakdown (lists them), so the two stay consistent.
   */
  getActiveExpenseAmount(
    item: ExpenseItem,
    interval: TimeInterval,
    currentDate?: Date,
  ): number | null {
    // Explicitly skip only if enabled is false (treat undefined/missing as true for better UX)
    if (item.enabled === false) return null;

    const current = currentDate ? new Date(currentDate) : null;

    // Check if this is a one-off expense
    if (item.isOneOff && item.oneOffDate && current) {
      const itemDate = new Date(item.oneOffDate);
      // One-off expenses only apply on their specific date (within the same month)
      // This matches the income source logic for consistency
      const sameMonth = current.getFullYear() === itemDate.getFullYear() &&
        current.getMonth() === itemDate.getMonth();

      return sameMonth ? (item.amount || 0) : null;
    }

    // Check date range for recurring expenses
    if (current) {
      // Check if expense has started
      if (item.startDate) {
        const startDate = new Date(item.startDate);
        if (current < startDate) {
          return null; // Expense hasn't started yet
        }
      }

      // Check if expense has ended (inclusive of end date, matching income logic)
      if (item.endDate) {
        const endDate = new Date(item.endDate);
        if (current > endDate) {
          return null; // Expense has ended
        }
      }
    }

    // Convert item frequency to annual amount
    let annualAmount: number;
    const amount = item.amount || 0;

    switch (item.frequency) {
      case "weekly":
        annualAmount = amount * 52;
        break;
      case "fortnightly":
        annualAmount = amount * 26;
        break;
      case "monthly":
        annualAmount = amount * 12;
        break;
      case "yearly":
        annualAmount = amount;
        break;
      default:
        annualAmount = amount * 12; // Default to monthly
    }

    // Convert annual to target interval
    const intervalPeriodsPerYear = intervalToPeriodsPerYear(interval);
    return annualAmount / intervalPeriodsPerYear;
  },

  /**
   * Calculates expenses from individual expense items
   * @param items Array of expense items
   * @param interval Target time interval
   * @param currentDate Current simulation date (optional, for date-based filtering)
   * @returns Total expense amount for the interval
   */
  calculateExpensesFromItems(
    items: ExpenseItem[],
    interval: TimeInterval,
    currentDate?: Date,
  ): number {
    let totalExpenses = 0;

    for (const item of items) {
      const amount = this.getActiveExpenseAmount(item, interval, currentDate);
      if (amount !== null) {
        totalExpenses += amount;
      }
    }

    return totalExpenses;
  },

  /**
   * Lists which expense items are active for the given date/interval and
   * how much each contributes - the per-item breakdown behind
   * calculateExpensesFromItems' total, for display (e.g. a chart tooltip).
   */
  getActiveExpenseBreakdown(
    items: ExpenseItem[],
    interval: TimeInterval,
    currentDate?: Date,
  ): { id: string; name: string; category: ExpenseItem["category"]; amount: number }[] {
    const breakdown: {
      id: string;
      name: string;
      category: ExpenseItem["category"];
      amount: number;
    }[] = [];

    for (const item of items) {
      const amount = this.getActiveExpenseAmount(item, interval, currentDate);
      if (amount !== null && amount > 0) {
        breakdown.push({
          id: item.id,
          name: item.name,
          category: item.category,
          amount,
        });
      }
    }

    return breakdown.sort((a, b) => b.amount - a.amount);
  },

  /**
   * Calculates monthly total from expense items
   * @param items Array of expense items
   * @returns Monthly total
   */
  calculateMonthlyTotal(items: ExpenseItem[]): number {
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
      return {
        newBalance: 0,
        interestPaid: 0,
        principalPaid: 0,
        interestSaved: 0,
        deductibleInterest: 0,
      };
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
    const interestSaved = useOffset
      ? (interestWithoutOffset - interestPaid)
      : 0;

    // Calculate deductible interest for debt recycling loans
    // Only the interest actually paid (not saved by offset) is deductible
    const deductibleInterest = isDebtRecycling ? interestPaid : 0;

    // Principal paid is the payment minus interest (but can't exceed remaining balance)
    const principalPaid = Math.max(
      0,
      Math.min(payment - interestPaid, balance),
    );

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
  calculateTotalLoanPayment(
    params: UserParameters,
    interval: TimeInterval,
  ): number {
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

    // Add contribution without growth (contributions arrive throughout the period)
    // so they should not receive full period growth
    return balanceAfterGrowth + contribution;
  },

  /**
   * Calculates total investment value from individual holdings
   * @param params User financial parameters
   * @param currentDate Current simulation date (optional, for date-based filtering)
   * @param currentBalances Current balances for each holding (optional)
   * @param interval Time interval for calculation
   * @param availableCash Available cash for contributions
   * @returns Object with new total balance, individual balances, and cash used for contributions
   */
  calculateInvestmentHoldings(
    params: UserParameters,
    currentDate: Date,
    currentBalances: { [holdingId: string]: number } | undefined,
    interval: TimeInterval,
    availableCash: number,
    currentCostBases?: { [holdingId: string]: number },
  ): {
    totalBalance: number;
    holdingBalances: { [holdingId: string]: number };
    holdingCostBases: { [holdingId: string]: number };
    cashUsed: number;
  } {
    // If no individual holdings, fall back to legacy calculation
    if (!params.investmentHoldings || params.investmentHoldings.length === 0) {
      const contribution = (params.monthlyInvestmentContribution * 12) /
        intervalToPeriodsPerYear(interval);
      const actualContribution = Math.max(
        0,
        Math.min(availableCash, contribution),
      );
      const netGrowthRate = (params.investmentReturnRate -
        (params.investmentDividendYieldRate ?? 0)) /
        100;
      const newBalance = this.calculateInvestmentGrowth(
        params.currentInvestmentBalance,
        actualContribution,
        netGrowthRate,
        interval,
      );
      return {
        totalBalance: newBalance,
        holdingBalances: {},
        holdingCostBases: {},
        cashUsed: actualContribution,
      };
    }

    // Process individual holdings
    let totalBalance = 0;
    let totalCashUsed = 0;
    const holdingBalances: { [holdingId: string]: number } = {};
    const holdingCostBases: { [holdingId: string]: number } = {};

    for (const holding of params.investmentHoldings) {
      // Skip disabled holdings
      if (!holding.enabled) {
        holdingBalances[holding.id] = currentBalances?.[holding.id] ||
          holding.currentValue;
        holdingCostBases[holding.id] = currentCostBases?.[holding.id] ??
          holdingBalances[holding.id];
        continue;
      }

      // Check date range
      if (holding.startDate && currentDate < holding.startDate) {
        holdingBalances[holding.id] = currentBalances?.[holding.id] ||
          holding.currentValue;
        holdingCostBases[holding.id] = currentCostBases?.[holding.id] ??
          holdingBalances[holding.id];
        continue;
      }
      if (holding.endDate && currentDate > holding.endDate) {
        holdingBalances[holding.id] = currentBalances?.[holding.id] ||
          holding.currentValue;
        holdingCostBases[holding.id] = currentCostBases?.[holding.id] ??
          holdingBalances[holding.id];
        continue;
      }

      // Get current balance for this holding
      const currentBalance = currentBalances?.[holding.id] ||
        holding.currentValue;
      const currentCostBasis = currentCostBases?.[holding.id] ?? currentBalance;

      // Calculate contribution for this interval
      let contribution = 0;
      if (holding.contributionAmount && holding.contributionFrequency) {
        // Convert contribution to interval amount
        const annualContribution = this.convertPaymentToAnnual(
          holding.contributionAmount,
          holding.contributionFrequency,
        );
        contribution = annualContribution / intervalToPeriodsPerYear(interval);

        // Check if we have enough cash
        if (availableCash - totalCashUsed >= contribution) {
          totalCashUsed += contribution;
        } else {
          // Not enough cash for this contribution - contribute whatever's
          // left (clamped to zero, since availableCash can be negative when
          // a one-off expense like a house deposit has already put this
          // period's cash in the red)
          contribution = Math.max(0, availableCash - totalCashUsed);
          totalCashUsed += contribution;
        }
      }

      // Calculate growth - only the portion of returnRate not already paid
      // out as a dividend (handled separately, as a cash distribution
      // computed on the opening balance earlier in the same period)
      // compounds into the balance.
      const netGrowthRate =
        (holding.returnRate - (holding.dividendYieldRate ?? 0)) / 100;
      const newBalance = this.calculateInvestmentGrowth(
        currentBalance,
        contribution,
        netGrowthRate,
        interval,
      );

      holdingBalances[holding.id] = newBalance;
      // Cost basis grows with new contributions (new money in), not with
      // growth or dividends (neither is "new money" for CGT purposes).
      holdingCostBases[holding.id] = currentCostBasis + contribution;
      totalBalance += newBalance;
    }

    return {
      totalBalance,
      holdingBalances,
      holdingCostBases,
      cashUsed: totalCashUsed,
    };
  },

  /**
   * Converts a payment amount to annual
   */
  convertPaymentToAnnual(
    amount: number,
    frequency: PaymentFrequency,
  ): number {
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
        return amount * 12;
    }
  },

  /**
   * Calculates the dollar amount a planned sale rule withdraws from a holding
   * during the period (periodStart, periodEnd].
   *
   * "once" rules fire a single time on startDate. Recurring rules fire on a
   * fixed cadence from startDate - firing is detected by converting elapsed
   * time since startDate into "occurrences" (using the same day-count
   * convention as the rest of the engine: 30.4375 days/month, 365.25
   * days/year) and checking whether an integer occurrence boundary falls
   * within this period. This is independent of the simulation's own step
   * size, so it's correct whether the engine advances weekly, monthly, etc.
   *
   * percent-of-balance is evaluated against currentBalance (the balance at
   * the moment this occurrence fires), so a recurring "20%/year" rule
   * naturally tapers rather than driving the balance negative.
   */
  calculatePlannedSaleAmount(
    sale: PlannedSale,
    currentBalance: number,
    periodStart: Date,
    periodEnd: Date,
  ): number {
    if (currentBalance <= 0) {
      return 0;
    }

    const start = new Date(sale.startDate);
    const end = sale.endDate ? new Date(sale.endDate) : null;

    if (periodEnd <= start) {
      return 0;
    }
    if (end && periodStart >= end) {
      return 0;
    }

    let fires: boolean;

    if (sale.frequency === "once") {
      fires = start > periodStart && start <= periodEnd;
    } else {
      const daysPerOccurrence: Record<
        Exclude<PlannedSale["frequency"], "once">,
        number
      > = {
        monthly: 30.4375,
        quarterly: 91.3125,
        "half-yearly": 182.625,
        yearly: 365.25,
      };
      const msPerOccurrence = daysPerOccurrence[sale.frequency] * 24 * 60 * 60 *
        1000;

      const elapsedAtStart = (periodStart.getTime() - start.getTime()) /
        msPerOccurrence;
      const elapsedAtEnd = (periodEnd.getTime() - start.getTime()) /
        msPerOccurrence;

      fires = elapsedAtEnd >= 0 &&
        Math.floor(elapsedAtEnd) > Math.floor(elapsedAtStart);
    }

    if (!fires) {
      return 0;
    }

    const rawAmount = sale.mode === "fixed-amount"
      ? sale.amount
      : currentBalance * (sale.amount / 100);

    return Math.max(0, Math.min(rawAmount, currentBalance));
  },

  /**
   * Cash distribution paid out this period on a holding's opening balance,
   * per its dividendYieldRate (0 if unset - no distribution, matching prior
   * behavior). Does not reduce the balance itself; the growth phase already
   * excludes this portion from what compounds (see calculateInvestmentHoldings).
   */
  calculateDividendIncome(
    balance: number,
    dividendYieldRatePercent: number | undefined,
    interval: TimeInterval,
  ): number {
    if (
      balance <= 0 || !dividendYieldRatePercent || dividendYieldRatePercent <= 0
    ) {
      return 0;
    }
    const intervalRate = convertAnnualRateToInterval(
      dividendYieldRatePercent / 100,
      interval,
    );
    return balance * intervalRate;
  },

  /**
   * Sells a target dollar amount pro-rata across a set of investment
   * holdings (weighted by current balance), reducing each holding's balance
   * and cost basis via the average-cost method, and returns the realized
   * gain split into short-term/long-term.
   *
   * The engine doesn't track individual purchase lots for holdings once the
   * simulation is running (balances are aggregate figures that grow and
   * receive contributions as a pool) - so each holding is treated as a
   * single parcel acquired on its startDate (or the simulation start date,
   * if unset), and gain is realized proportionally against its running
   * cost basis rather than true FIFO lot matching.
   */
  sellFromHoldings(
    holdings: InvestmentHolding[],
    holdingBalances: { [holdingId: string]: number },
    holdingCostBases: { [holdingId: string]: number },
    amountToSell: number,
    currentDate: Date,
    simulationStartDate: Date,
    longTermThresholdDays: number,
  ): {
    newHoldingBalances: { [holdingId: string]: number };
    newHoldingCostBases: { [holdingId: string]: number };
    amountSold: number;
    shortTermGain: number;
    longTermGain: number;
  } {
    const newHoldingBalances = { ...holdingBalances };
    const newHoldingCostBases = { ...holdingCostBases };

    const totalAvailable = holdings.reduce(
      (sum, h) => sum + Math.max(0, holdingBalances[h.id] ?? h.currentValue),
      0,
    );

    if (totalAvailable <= 0 || amountToSell <= 0) {
      return {
        newHoldingBalances,
        newHoldingCostBases,
        amountSold: 0,
        shortTermGain: 0,
        longTermGain: 0,
      };
    }

    const targetSale = Math.min(amountToSell, totalAvailable);
    let amountSold = 0;
    let shortTermGain = 0;
    let longTermGain = 0;

    for (const holding of holdings) {
      const balance = Math.max(
        0,
        holdingBalances[holding.id] ?? holding.currentValue,
      );
      if (balance <= 0) continue;

      const share = balance / totalAvailable;
      const saleAmount = Math.min(balance, targetSale * share);
      if (saleAmount <= 0) continue;

      const costBasis = holdingCostBases[holding.id] ?? balance;
      const costBasisFraction = balance > 0
        ? Math.min(1, costBasis / balance)
        : 1;
      const costBasisOfSale = saleAmount * costBasisFraction;
      const gain = saleAmount - costBasisOfSale;

      const acquisitionDate = holding.startDate ?? simulationStartDate;
      const daysHeld = (currentDate.getTime() - acquisitionDate.getTime()) /
        (1000 * 60 * 60 * 24);

      if (daysHeld >= longTermThresholdDays) {
        longTermGain += gain;
      } else {
        shortTermGain += gain;
      }

      newHoldingBalances[holding.id] = balance - saleAmount;
      newHoldingCostBases[holding.id] = Math.max(
        0,
        costBasis - costBasisOfSale,
      );
      amountSold += saleAmount;
    }

    return {
      newHoldingBalances,
      newHoldingCostBases,
      amountSold,
      shortTermGain,
      longTermGain,
    };
  },

  /**
   * Legacy-model equivalent of sellFromHoldings, for a single aggregate
   * investment balance/cost basis rather than per-holding tracking.
   */
  sellFromAggregate(
    balance: number,
    costBasis: number,
    amountToSell: number,
    currentDate: Date,
    acquisitionDate: Date,
    longTermThresholdDays: number,
  ): {
    newBalance: number;
    newCostBasis: number;
    amountSold: number;
    shortTermGain: number;
    longTermGain: number;
  } {
    const targetSale = Math.max(0, Math.min(amountToSell, balance));
    if (targetSale <= 0) {
      return {
        newBalance: balance,
        newCostBasis: costBasis,
        amountSold: 0,
        shortTermGain: 0,
        longTermGain: 0,
      };
    }

    const costBasisFraction = balance > 0
      ? Math.min(1, costBasis / balance)
      : 1;
    const costBasisOfSale = targetSale * costBasisFraction;
    const gain = targetSale - costBasisOfSale;

    const daysHeld = (currentDate.getTime() - acquisitionDate.getTime()) /
      (1000 * 60 * 60 * 24);
    const isLongTerm = daysHeld >= longTermThresholdDays;

    return {
      newBalance: balance - targetSale,
      newCostBasis: Math.max(0, costBasis - costBasisOfSale),
      amountSold: targetSale,
      shortTermGain: isLongTerm ? 0 : gain,
      longTermGain: isLongTerm ? gain : 0,
    };
  },
};

/**
 * Investment Tax Processor
 * Computes tax owed on dividend income, realized capital gains, and taxable
 * retirement-account withdrawals - stacked on top of the household's
 * ordinary taxable income so it's taxed at the marginal rate, using the
 * active country module's rules.
 */
export const InvestmentTaxProcessor = {
  /**
   * Incremental tax due to investment/withdrawal income on top of
   * ordinaryTaxableIncome (the salary-based taxable income already computed
   * elsewhere for the period). additionalOrdinaryIncome should already
   * include any long-term discount (e.g. AU's 50% CGT discount); it stacks
   * on ordinary brackets. flatRateGains (e.g. US long-term capital gains)
   * is taxed separately at the module's flat rate instead of stacking.
   */
  calculateInvestmentTax(
    params: UserParameters,
    ordinaryTaxableIncome: number,
    additionalOrdinaryIncome: number,
    flatRateGains: number,
  ): number {
    if (additionalOrdinaryIncome <= 0 && flatRateGains <= 0) {
      return 0;
    }

    const module = getCountryModule(params.country);
    const flatTax = flatRateGains > 0
      ? flatRateGains * module.capitalGainsRule.longTermFlatRate
      : 0;

    let ordinaryTax = 0;
    if (additionalOrdinaryIncome > 0) {
      if (params.taxBrackets && params.taxBrackets.length > 0) {
        const extras = {
          medicareLevyRatePercent: params.medicareLevyRate,
          standardDeduction: params.standardDeduction,
        };
        const taxWith = module.calculateTax(
          ordinaryTaxableIncome + additionalOrdinaryIncome,
          params.taxBrackets,
          extras,
        );
        const taxWithout = module.calculateTax(
          ordinaryTaxableIncome,
          params.taxBrackets,
          extras,
        );
        ordinaryTax = Math.max(0, taxWith - taxWithout);
      } else {
        // Fallback to simple percentage, matching IncomeProcessor.calculateAnnualTax
        ordinaryTax = additionalOrdinaryIncome * (params.incomeTaxRate / 100);
      }
    }

    return ordinaryTax + flatTax;
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
    retirementAccountAccessAge = 60,
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
      const yearsElapsed =
        (stateAtDesiredAge.date.getTime() - startDate.getTime()) /
        (1000 * 60 * 60 * 24 * 365.25);
      const ageAtDesiredRetirement = currentAge + yearsElapsed;

      const safeWithdrawal = this.calculateSafeWithdrawal(
        stateAtDesiredAge.investments,
        stateAtDesiredAge.superannuation,
        ageAtDesiredRetirement,
        retirementAccountAccessAge,
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
        retirementAccountAccessAge,
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
    retirementAccountAccessAge = 60,
  ): number {
    const SAFE_WITHDRAWAL_RATE = 0.04; // 4% rule

    // Total accessible assets
    let accessibleAssets = investments;

    // Add the retirement account (superannuation/401k/etc.) once it's
    // accessible - defaults to the AU preservation age (60) for callers that
    // don't know the active country module, but callers with access to
    // UserParameters should pass getCountryModule(params.country)
    // .retirementAccessRule.accessAge (or params.preservationAge override).
    if (age >= retirementAccountAccessAge) {
      accessibleAssets += superannuation;
    }

    // Calculate safe withdrawal
    return accessibleAssets * SAFE_WITHDRAWAL_RATE;
  },
};
