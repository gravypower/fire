/**
 * Financial event processors for generating domain-specific events
 */

import type { FinancialEvent } from "../interfaces/events.ts";
import { FinancialEventFactory, EventValidation } from "./event-factory.ts";

/**
 * Processor for income-related events
 */
export class IncomeEventProcessor {
  constructor(private eventFactory: FinancialEventFactory) {}

  /**
   * Processes salary payment and generates related events
   */
  processSalaryPayment(
    grossAmount: number,
    taxRate: number,
    date: Date,
    personId?: string,
    incomeSourceId?: string
  ): FinancialEvent[] {
    EventValidation.validatePositiveAmount(grossAmount, 'grossAmount');
    EventValidation.validateRate(taxRate, 'taxRate');
    EventValidation.validateDate(date, 'date');

    const events: FinancialEvent[] = [];
    
    // Calculate tax and net amounts
    const taxAmount = grossAmount * (taxRate / 100);
    const netAmount = grossAmount - taxAmount;

    // Generate tax calculation event first
    events.push(this.eventFactory.createTaxCalculatedEvent(
      grossAmount,
      grossAmount, // taxable income equals gross for simple case
      taxAmount,
      0, // deductible interest - would be calculated separately
      date,
      personId
    ));

    // Generate salary received event
    events.push(this.eventFactory.createSalaryReceivedEvent(
      grossAmount,
      netAmount,
      taxAmount,
      date,
      personId,
      incomeSourceId
    ));

    return events;
  }

  /**
   * Processes tax calculation with deductible interest
   */
  processTaxCalculation(
    grossIncome: number,
    deductibleInterest: number,
    taxRate: number,
    date: Date,
    personId?: string
  ): FinancialEvent {
    EventValidation.validatePositiveAmount(grossIncome, 'grossIncome');
    EventValidation.validatePositiveAmount(deductibleInterest, 'deductibleInterest');
    EventValidation.validateRate(taxRate, 'taxRate');
    EventValidation.validateDate(date, 'date');

    const taxableIncome = Math.max(0, grossIncome - deductibleInterest);
    const taxAmount = taxableIncome * (taxRate / 100);

    return this.eventFactory.createTaxCalculatedEvent(
      grossIncome,
      taxableIncome,
      taxAmount,
      deductibleInterest,
      date,
      personId
    );
  }

  /**
   * Processes tax calculation using progressive tax brackets
   */
  processTaxCalculationWithBrackets(
    grossIncome: number,
    deductibleInterest: number,
    taxBrackets: Array<{ min: number; max: number | null; rate: number }>,
    date: Date,
    personId?: string
  ): FinancialEvent {
    EventValidation.validatePositiveAmount(grossIncome, 'grossIncome');
    EventValidation.validatePositiveAmount(deductibleInterest, 'deductibleInterest');
    EventValidation.validateDate(date, 'date');

    const taxableIncome = Math.max(0, grossIncome - deductibleInterest);
    let totalTax = 0;

    // Calculate tax using progressive brackets
    for (const bracket of taxBrackets) {
      const bracketMin = bracket.min;
      const bracketMax = bracket.max ?? Infinity;
      
      if (taxableIncome <= bracketMin) {
        break; // Income doesn't reach this bracket
      }
      
      // Calculate taxable amount in this bracket
      const taxableInBracket = Math.min(taxableIncome, bracketMax) - bracketMin;
      
      if (taxableInBracket > 0) {
        totalTax += taxableInBracket * (bracket.rate / 100);
      }
    }

    return this.eventFactory.createTaxCalculatedEvent(
      grossIncome,
      taxableIncome,
      totalTax,
      deductibleInterest,
      date,
      personId
    );
  }

  /**
   * Processes multiple income sources and generates discrete events for each
   */
  processMultipleIncomeSources(
    incomeSources: Array<{
      amount: number;
      frequency: 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
      isBeforeTax: boolean;
      sourceId?: string;
      personId?: string;
      startDate?: Date;
      endDate?: Date;
      isOneOff?: boolean;
      oneOffDate?: Date;
    }>,
    currentDate: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight'
  ): FinancialEvent[] {
    EventValidation.validateDate(currentDate, 'currentDate');

    const events: FinancialEvent[] = [];
    const intervalPeriodsPerYear = this.getPeriodsPerYear(interval);

    for (const source of incomeSources) {
      // Check if income source is active at current date
      if (!this.isIncomeSourceActive(source, currentDate)) {
        continue;
      }

      // Convert to interval amount
      const annualAmount = this.convertToAnnual(source.amount, source.frequency);
      const intervalAmount = annualAmount / intervalPeriodsPerYear;

      if (source.isBeforeTax && intervalAmount > 0) {
        // Generate salary received event (will need tax calculation separately)
        events.push(this.eventFactory.createSalaryReceivedEvent(
          intervalAmount,
          intervalAmount, // Net amount will be calculated after tax
          0, // Tax amount will be calculated separately
          currentDate,
          source.personId,
          source.sourceId
        ));
      }
    }

    return events;
  }

  /**
   * Checks if an income source is active at the given date
   */
  private isIncomeSourceActive(
    source: {
      startDate?: Date;
      endDate?: Date;
      isOneOff?: boolean;
      oneOffDate?: Date;
    },
    currentDate: Date
  ): boolean {
    // Handle one-off income
    if (source.isOneOff && source.oneOffDate) {
      const oneOffYear = source.oneOffDate.getFullYear();
      const currentYear = currentDate.getFullYear();
      return oneOffYear === currentYear;
    }

    // Check date range for recurring income
    if (source.startDate && currentDate < source.startDate) {
      return false; // Income hasn't started yet
    }
    
    if (source.endDate && currentDate >= source.endDate) {
      return false; // Income has ended
    }

    return true;
  }

  /**
   * Converts payment frequency to annual amount
   */
  private convertToAnnual(amount: number, frequency: string): number {
    switch (frequency) {
      case 'weekly':
        return amount * 52;
      case 'fortnightly':
        return amount * 26;
      case 'monthly':
        return amount * 12;
      case 'yearly':
        return amount;
      default:
        return amount * 12; // Default to monthly
    }
  }

  /**
   * Gets periods per year for interval
   */
  private getPeriodsPerYear(interval: string): number {
    switch (interval) {
      case 'week':
        return 52;
      case 'month':
        return 12;
      case 'year':
        return 1;
      case 'fortnight':
        return 26;
      default:
        return 12; // Default to monthly
    }
  }
}

/**
 * Processor for expense-related events
 */
export class ExpenseEventProcessor {
  constructor(private eventFactory: FinancialEventFactory) {}

  /**
   * Processes expense payment
   */
  processExpensePayment(
    category: string,
    amount: number,
    description: string,
    date: Date,
    expenseItemId?: string
  ): FinancialEvent {
    EventValidation.validateNonEmptyString(category, 'category');
    EventValidation.validatePositiveAmount(amount, 'amount');
    EventValidation.validateNonEmptyString(description, 'description');
    EventValidation.validateDate(date, 'date');

    return this.eventFactory.createExpensePaidEvent(
      category,
      amount,
      description,
      date,
      expenseItemId
    );
  }

  /**
   * Processes multiple expense payments
   */
  processMultipleExpenses(
    expenses: Array<{
      category: string;
      amount: number;
      description: string;
      expenseItemId?: string;
    }>,
    date: Date
  ): FinancialEvent[] {
    EventValidation.validateDate(date, 'date');

    return expenses.map(expense => 
      this.processExpensePayment(
        expense.category,
        expense.amount,
        expense.description,
        date,
        expense.expenseItemId
      )
    );
  }

  /**
   * Processes expense items from user parameters and generates individual events
   */
  processExpenseItems(
    expenseItems: Array<{
      id: string;
      category: string;
      description: string;
      amount: number;
      frequency: 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
      enabled: boolean;
      isOneOff?: boolean;
      oneOffDate?: Date;
      startDate?: Date;
      endDate?: Date;
    }>,
    currentDate: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight'
  ): FinancialEvent[] {
    EventValidation.validateDate(currentDate, 'currentDate');

    const events: FinancialEvent[] = [];
    const intervalPeriodsPerYear = this.getPeriodsPerYear(interval);

    for (const item of expenseItems) {
      if (!item.enabled) continue;

      // Check if expense is active at current date
      if (!this.isExpenseItemActive(item, currentDate, interval)) {
        continue;
      }

      // Convert to interval amount
      let intervalAmount: number;
      if (item.isOneOff) {
        // One-off expenses apply their full amount in the interval they occur
        intervalAmount = item.amount;
      } else {
        // Convert recurring expenses to interval amount
        const annualAmount = this.convertToAnnual(item.amount, item.frequency);
        intervalAmount = annualAmount / intervalPeriodsPerYear;
      }

      if (intervalAmount > 0) {
        events.push(this.processExpensePayment(
          item.category,
          intervalAmount,
          item.description,
          currentDate,
          item.id
        ));
      }
    }

    return events;
  }

  /**
   * Processes legacy expense parameters and generates events
   */
  processLegacyExpenses(
    monthlyLivingExpenses: number,
    monthlyRentOrMortgage: number,
    currentDate: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight'
  ): FinancialEvent[] {
    EventValidation.validatePositiveAmount(monthlyLivingExpenses, 'monthlyLivingExpenses');
    EventValidation.validatePositiveAmount(monthlyRentOrMortgage, 'monthlyRentOrMortgage');
    EventValidation.validateDate(currentDate, 'currentDate');

    const events: FinancialEvent[] = [];
    const intervalPeriodsPerYear = this.getPeriodsPerYear(interval);
    
    // Convert monthly amounts to interval amounts
    const annualLiving = monthlyLivingExpenses * 12;
    const annualRent = monthlyRentOrMortgage * 12;
    
    const intervalLiving = annualLiving / intervalPeriodsPerYear;
    const intervalRent = annualRent / intervalPeriodsPerYear;

    // Generate separate events for each expense category
    if (intervalLiving > 0) {
      events.push(this.processExpensePayment(
        'Living Expenses',
        intervalLiving,
        'Monthly living expenses',
        currentDate
      ));
    }

    if (intervalRent > 0) {
      events.push(this.processExpensePayment(
        'Housing',
        intervalRent,
        'Monthly rent or mortgage payment',
        currentDate
      ));
    }

    return events;
  }

  /**
   * Checks if an expense item is active at the given date
   */
  private isExpenseItemActive(
    item: {
      isOneOff?: boolean;
      oneOffDate?: Date;
      startDate?: Date;
      endDate?: Date;
    },
    currentDate: Date,
    interval: string
  ): boolean {
    // Handle one-off expenses
    if (item.isOneOff && item.oneOffDate) {
      // Check if one-off date falls within this interval
      const oneOffTime = item.oneOffDate.getTime();
      const currentTime = currentDate.getTime();
      
      // Calculate interval duration in milliseconds
      let intervalMs = 0;
      switch (interval) {
        case 'week':
          intervalMs = 7 * 24 * 60 * 60 * 1000;
          break;
        case 'fortnight':
          intervalMs = 14 * 24 * 60 * 60 * 1000;
          break;
        case 'month':
          intervalMs = 30 * 24 * 60 * 60 * 1000; // Approximate
          break;
        case 'year':
          intervalMs = 365 * 24 * 60 * 60 * 1000;
          break;
      }
      
      return oneOffTime >= currentTime && oneOffTime < currentTime + intervalMs;
    }

    // Check date range for recurring expenses
    if (item.startDate && currentDate < item.startDate) {
      return false; // Expense hasn't started yet
    }
    
    if (item.endDate && currentDate >= item.endDate) {
      return false; // Expense has ended
    }

    return true;
  }

  /**
   * Converts payment frequency to annual amount
   */
  private convertToAnnual(amount: number, frequency: string): number {
    switch (frequency) {
      case 'weekly':
        return amount * 52;
      case 'fortnightly':
        return amount * 26;
      case 'monthly':
        return amount * 12;
      case 'yearly':
        return amount;
      default:
        return amount * 12; // Default to monthly
    }
  }

  /**
   * Gets periods per year for interval
   */
  private getPeriodsPerYear(interval: string): number {
    switch (interval) {
      case 'week':
        return 52;
      case 'month':
        return 12;
      case 'year':
        return 1;
      case 'fortnight':
        return 26;
      default:
        return 12; // Default to monthly
    }
  }
}

/**
 * Processor for loan-related events
 */
export class LoanEventProcessor {
  constructor(private eventFactory: FinancialEventFactory) {}

  /**
   * Processes loan payment with interest calculation
   */
  processLoanPayment(
    loanId: string,
    currentBalance: number,
    interestRate: number,
    paymentAmount: number,
    offsetBalance: number,
    date: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight' = 'month'
  ): FinancialEvent[] {
    EventValidation.validateNonEmptyString(loanId, 'loanId');
    EventValidation.validatePositiveAmount(currentBalance, 'currentBalance');
    EventValidation.validateRate(interestRate, 'interestRate');
    EventValidation.validatePositiveAmount(paymentAmount, 'paymentAmount');
    EventValidation.validatePositiveAmount(offsetBalance, 'offsetBalance');
    EventValidation.validateDate(date, 'date');

    const events: FinancialEvent[] = [];

    // If no balance, no payment needed
    if (currentBalance <= 0) {
      return events;
    }

    // Calculate effective balance (loan balance minus offset)
    const effectiveBalance = Math.max(0, currentBalance - offsetBalance);
    
    // Convert annual interest rate to interval rate
    const intervalRate = this.convertAnnualRateToInterval(interestRate / 100, interval);
    const interestAmount = effectiveBalance * intervalRate;

    // Generate interest calculation event
    events.push(this.eventFactory.createLoanInterestCalculatedEvent(
      loanId,
      currentBalance,
      interestRate,
      interestAmount,
      effectiveBalance,
      date
    ));

    // Calculate principal payment (payment minus interest)
    const principalAmount = Math.max(0, Math.min(paymentAmount - interestAmount, currentBalance));
    const newBalance = Math.max(0, currentBalance - principalAmount);

    // Generate principal payment event
    events.push(this.eventFactory.createLoanPrincipalPaidEvent(
      loanId,
      paymentAmount,
      principalAmount,
      newBalance,
      date
    ));

    return events;
  }

  /**
   * Processes multiple loans and generates events for each
   */
  processMultipleLoans(
    loans: Array<{
      id: string;
      balance: number;
      interestRate: number;
      paymentAmount: number;
      paymentFrequency: 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
      offsetBalance?: number;
      useOffset?: boolean;
      isDebtRecycling?: boolean;
    }>,
    currentDate: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight'
  ): FinancialEvent[] {
    EventValidation.validateDate(currentDate, 'currentDate');

    const events: FinancialEvent[] = [];
    const intervalPeriodsPerYear = this.getPeriodsPerYear(interval);

    for (const loan of loans) {
      if (loan.balance <= 0) continue;

      // Convert payment to interval amount
      const annualPayment = this.convertToAnnual(loan.paymentAmount, loan.paymentFrequency);
      const intervalPayment = annualPayment / intervalPeriodsPerYear;

      const offsetBalance = loan.useOffset ? (loan.offsetBalance || 0) : 0;

      // Process loan payment
      const loanEvents = this.processLoanPayment(
        loan.id,
        loan.balance,
        loan.interestRate,
        intervalPayment,
        offsetBalance,
        currentDate,
        interval
      );

      events.push(...loanEvents);
    }

    return events;
  }

  /**
   * Processes legacy loan parameters and generates events
   */
  processLegacyLoan(
    loanBalance: number,
    loanInterestRate: number,
    loanPaymentAmount: number,
    loanPaymentFrequency: 'weekly' | 'fortnightly' | 'monthly' | 'yearly',
    offsetBalance: number,
    useOffset: boolean,
    currentDate: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight'
  ): FinancialEvent[] {
    if (loanBalance <= 0) return [];

    EventValidation.validatePositiveAmount(loanBalance, 'loanBalance');
    EventValidation.validateRate(loanInterestRate, 'loanInterestRate');
    EventValidation.validatePositiveAmount(loanPaymentAmount, 'loanPaymentAmount');
    EventValidation.validateDate(currentDate, 'currentDate');

    // Convert payment to interval amount
    const intervalPeriodsPerYear = this.getPeriodsPerYear(interval);
    const annualPayment = this.convertToAnnual(loanPaymentAmount, loanPaymentFrequency);
    const intervalPayment = annualPayment / intervalPeriodsPerYear;

    const effectiveOffsetBalance = useOffset ? offsetBalance : 0;

    return this.processLoanPayment(
      'primary-loan', // Default ID for legacy loan
      loanBalance,
      loanInterestRate,
      intervalPayment,
      effectiveOffsetBalance,
      currentDate,
      interval
    );
  }

  /**
   * Processes offset account balance update
   */
  processOffsetBalanceUpdate(
    loanId: string,
    previousBalance: number,
    cashTransferred: number,
    date: Date
  ): FinancialEvent {
    EventValidation.validateNonEmptyString(loanId, 'loanId');
    EventValidation.validatePositiveAmount(previousBalance, 'previousBalance');
    EventValidation.validateDate(date, 'date');

    const newBalance = previousBalance + cashTransferred;

    return this.eventFactory.createOffsetBalanceUpdatedEvent(
      loanId,
      previousBalance,
      newBalance,
      cashTransferred,
      date
    );
  }

  /**
   * Converts annual rate to interval rate using compound interest formula
   */
  private convertAnnualRateToInterval(annualRate: number, interval: string): number {
    const periodsPerYear = this.getPeriodsPerYear(interval);
    return Math.pow(1 + annualRate, 1 / periodsPerYear) - 1;
  }

  /**
   * Converts payment frequency to annual amount
   */
  private convertToAnnual(amount: number, frequency: string): number {
    switch (frequency) {
      case 'weekly':
        return amount * 52;
      case 'fortnightly':
        return amount * 26;
      case 'monthly':
        return amount * 12;
      case 'yearly':
        return amount;
      default:
        return amount * 12; // Default to monthly
    }
  }

  /**
   * Gets periods per year for interval
   */
  private getPeriodsPerYear(interval: string): number {
    switch (interval) {
      case 'week':
        return 52;
      case 'month':
        return 12;
      case 'year':
        return 1;
      case 'fortnight':
        return 26;
      default:
        return 12; // Default to monthly
    }
  }
}

/**
 * Processor for investment-related events
 */
export class InvestmentEventProcessor {
  constructor(private eventFactory: FinancialEventFactory) {}

  /**
   * Processes investment contribution
   */
  processInvestmentContribution(
    amount: number,
    source: 'salary' | 'cash',
    date: Date,
    holdingId?: string,
    personId?: string
  ): FinancialEvent {
    EventValidation.validatePositiveAmount(amount, 'amount');
    EventValidation.validateInvestmentSource(source);
    EventValidation.validateDate(date, 'date');

    return this.eventFactory.createInvestmentContributionMadeEvent(
      amount,
      source,
      date,
      holdingId,
      personId
    );
  }

  /**
   * Processes investment growth calculation
   */
  processInvestmentGrowth(
    previousBalance: number,
    growthRate: number,
    date: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight' = 'month',
    holdingId?: string
  ): FinancialEvent {
    EventValidation.validatePositiveAmount(previousBalance, 'previousBalance');
    EventValidation.validateRate(growthRate, 'growthRate');
    EventValidation.validateDate(date, 'date');

    // Convert annual growth rate to interval rate
    const intervalRate = this.convertAnnualRateToInterval(growthRate / 100, interval);
    const growthAmount = previousBalance * intervalRate;
    const newBalance = previousBalance + growthAmount;

    return this.eventFactory.createInvestmentGrowthAppliedEvent(
      previousBalance,
      growthRate,
      growthAmount,
      newBalance,
      date,
      holdingId
    );
  }

  /**
   * Processes investment contribution and growth together
   */
  processInvestmentUpdate(
    previousBalance: number,
    contributionAmount: number,
    contributionSource: 'salary' | 'cash',
    growthRate: number,
    date: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight' = 'month',
    holdingId?: string,
    personId?: string
  ): FinancialEvent[] {
    const events: FinancialEvent[] = [];

    // Add contribution event if there's a contribution
    if (contributionAmount > 0) {
      events.push(this.processInvestmentContribution(
        contributionAmount,
        contributionSource,
        date,
        holdingId,
        personId
      ));
    }

    // Calculate growth on balance after contribution
    const balanceAfterContribution = previousBalance + contributionAmount;
    if (balanceAfterContribution > 0) {
      events.push(this.processInvestmentGrowth(
        balanceAfterContribution,
        growthRate,
        date,
        interval,
        holdingId
      ));
    }

    return events;
  }

  /**
   * Processes multiple investment holdings and generates events for each
   */
  processInvestmentHoldings(
    holdings: Array<{
      id: string;
      currentValue: number;
      contributionAmount?: number;
      contributionFrequency?: 'weekly' | 'fortnightly' | 'monthly' | 'yearly';
      returnRate: number;
      enabled: boolean;
      startDate?: Date;
      endDate?: Date;
    }>,
    currentDate: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight',
    availableCash: number,
    currentBalances?: { [holdingId: string]: number }
  ): { events: FinancialEvent[]; cashUsed: number } {
    EventValidation.validateDate(currentDate, 'currentDate');

    const events: FinancialEvent[] = [];
    let totalCashUsed = 0;
    const intervalPeriodsPerYear = this.getPeriodsPerYear(interval);

    for (const holding of holdings) {
      // Skip disabled holdings
      if (!holding.enabled) continue;

      // Check date range
      if (holding.startDate && currentDate < holding.startDate) continue;
      if (holding.endDate && currentDate > holding.endDate) continue;

      // Get current balance for this holding
      const currentBalance = currentBalances?.[holding.id] || holding.currentValue;

      // Calculate contribution for this interval
      let contribution = 0;
      if (holding.contributionAmount && holding.contributionFrequency) {
        const annualContribution = this.convertToAnnual(
          holding.contributionAmount,
          holding.contributionFrequency
        );
        contribution = annualContribution / intervalPeriodsPerYear;

        // Check if we have enough cash
        if (availableCash - totalCashUsed >= contribution) {
          totalCashUsed += contribution;
        } else {
          // Not enough cash for this contribution
          contribution = Math.max(0, availableCash - totalCashUsed);
          totalCashUsed = availableCash;
        }
      }

      // Generate events for this holding
      const holdingEvents = this.processInvestmentUpdate(
        currentBalance,
        contribution,
        'cash', // Assume cash source for now
        holding.returnRate,
        currentDate,
        interval,
        holding.id
      );

      events.push(...holdingEvents);
    }

    return { events, cashUsed: totalCashUsed };
  }

  /**
   * Processes legacy investment parameters and generates events
   */
  processLegacyInvestment(
    currentBalance: number,
    monthlyContribution: number,
    returnRate: number,
    currentDate: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight',
    availableCash: number
  ): { events: FinancialEvent[]; cashUsed: number } {
    EventValidation.validatePositiveAmount(currentBalance, 'currentBalance');
    EventValidation.validatePositiveAmount(monthlyContribution, 'monthlyContribution');
    EventValidation.validateRate(returnRate, 'returnRate');
    EventValidation.validateDate(currentDate, 'currentDate');

    // Convert monthly contribution to interval amount
    const intervalPeriodsPerYear = this.getPeriodsPerYear(interval);
    const annualContribution = monthlyContribution * 12;
    const intervalContribution = annualContribution / intervalPeriodsPerYear;

    // Check available cash
    const actualContribution = Math.min(availableCash, intervalContribution);

    // Generate events
    const events = this.processInvestmentUpdate(
      currentBalance,
      actualContribution,
      'cash',
      returnRate,
      currentDate,
      interval,
      'legacy-investment' // Default ID for legacy investment
    );

    return { events, cashUsed: actualContribution };
  }

  /**
   * Converts annual rate to interval rate using compound interest formula
   */
  private convertAnnualRateToInterval(annualRate: number, interval: string): number {
    const periodsPerYear = this.getPeriodsPerYear(interval);
    return Math.pow(1 + annualRate, 1 / periodsPerYear) - 1;
  }

  /**
   * Converts payment frequency to annual amount
   */
  private convertToAnnual(amount: number, frequency: string): number {
    switch (frequency) {
      case 'weekly':
        return amount * 52;
      case 'fortnightly':
        return amount * 26;
      case 'monthly':
        return amount * 12;
      case 'yearly':
        return amount;
      default:
        return amount * 12; // Default to monthly
    }
  }

  /**
   * Gets periods per year for interval
   */
  private getPeriodsPerYear(interval: string): number {
    switch (interval) {
      case 'week':
        return 52;
      case 'month':
        return 12;
      case 'year':
        return 1;
      case 'fortnight':
        return 26;
      default:
        return 12; // Default to monthly
    }
  }
}

/**
 * Processor for superannuation-related events
 */
export class SuperEventProcessor {
  constructor(private eventFactory: FinancialEventFactory) {}

  /**
   * Processes superannuation contribution
   */
  processSuperContribution(
    superAccountId: string,
    amount: number,
    contributionType: 'employer' | 'salary_sacrifice' | 'personal',
    date: Date,
    personId?: string
  ): FinancialEvent {
    EventValidation.validateNonEmptyString(superAccountId, 'superAccountId');
    EventValidation.validatePositiveAmount(amount, 'amount');
    EventValidation.validateContributionType(contributionType);
    EventValidation.validateDate(date, 'date');

    return this.eventFactory.createSuperContributionMadeEvent(
      superAccountId,
      amount,
      contributionType,
      date,
      personId
    );
  }

  /**
   * Processes superannuation growth calculation
   */
  processSuperGrowth(
    superAccountId: string,
    previousBalance: number,
    growthRate: number,
    date: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight' = 'month'
  ): FinancialEvent {
    EventValidation.validateNonEmptyString(superAccountId, 'superAccountId');
    EventValidation.validatePositiveAmount(previousBalance, 'previousBalance');
    EventValidation.validateRate(growthRate, 'growthRate');
    EventValidation.validateDate(date, 'date');

    // Convert annual growth rate to interval rate
    const intervalRate = this.convertAnnualRateToInterval(growthRate / 100, interval);
    const growthAmount = previousBalance * intervalRate;
    const newBalance = previousBalance + growthAmount;

    return this.eventFactory.createSuperGrowthAppliedEvent(
      superAccountId,
      previousBalance,
      growthRate,
      growthAmount,
      newBalance,
      date
    );
  }

  /**
   * Processes superannuation contribution and growth together
   */
  processSuperUpdate(
    superAccountId: string,
    previousBalance: number,
    contributionAmount: number,
    contributionType: 'employer' | 'salary_sacrifice' | 'personal',
    growthRate: number,
    date: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight' = 'month',
    personId?: string
  ): FinancialEvent[] {
    const events: FinancialEvent[] = [];

    // Add contribution event if there's a contribution
    if (contributionAmount > 0) {
      events.push(this.processSuperContribution(
        superAccountId,
        contributionAmount,
        contributionType,
        date,
        personId
      ));
    }

    // Calculate growth on balance after contribution
    const balanceAfterContribution = previousBalance + contributionAmount;
    if (balanceAfterContribution > 0) {
      events.push(this.processSuperGrowth(
        superAccountId,
        balanceAfterContribution,
        growthRate,
        date,
        interval
      ));
    }

    return events;
  }

  /**
   * Processes multiple superannuation accounts and generates events for each
   */
  processMultipleSuperAccounts(
    superAccounts: Array<{
      id: string;
      balance: number;
      contributionAmount?: number;
      contributionType?: 'employer' | 'salary_sacrifice' | 'personal';
      growthRate: number;
      personId?: string;
    }>,
    currentDate: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight'
  ): FinancialEvent[] {
    EventValidation.validateDate(currentDate, 'currentDate');

    const events: FinancialEvent[] = [];
    const intervalPeriodsPerYear = this.getPeriodsPerYear(interval);

    for (const account of superAccounts) {
      if (account.balance <= 0 && (!account.contributionAmount || account.contributionAmount <= 0)) {
        continue;
      }

      // Calculate contribution for this interval
      let intervalContribution = 0;
      if (account.contributionAmount && account.contributionAmount > 0) {
        // Assume annual contribution amount, convert to interval
        intervalContribution = account.contributionAmount / intervalPeriodsPerYear;
      }

      // Generate events for this super account
      const accountEvents = this.processSuperUpdate(
        account.id,
        account.balance,
        intervalContribution,
        account.contributionType || 'employer',
        account.growthRate,
        currentDate,
        interval,
        account.personId
      );

      events.push(...accountEvents);
    }

    return events;
  }

  /**
   * Processes legacy superannuation parameters and generates events
   */
  processLegacySuper(
    currentBalance: number,
    contributionRate: number,
    grossSalary: number,
    growthRate: number,
    currentDate: Date,
    interval: 'week' | 'month' | 'year' | 'fortnight'
  ): FinancialEvent[] {
    EventValidation.validatePositiveAmount(currentBalance, 'currentBalance');
    EventValidation.validateRate(contributionRate, 'contributionRate');
    EventValidation.validatePositiveAmount(grossSalary, 'grossSalary');
    EventValidation.validateRate(growthRate, 'growthRate');
    EventValidation.validateDate(currentDate, 'currentDate');

    // Calculate employer contribution based on salary
    const intervalPeriodsPerYear = this.getPeriodsPerYear(interval);
    const intervalSalary = grossSalary / intervalPeriodsPerYear;
    const intervalContribution = intervalSalary * (contributionRate / 100);

    return this.processSuperUpdate(
      'legacy-super', // Default ID for legacy super
      currentBalance,
      intervalContribution,
      'employer',
      growthRate,
      currentDate,
      interval
    );
  }

  /**
   * Converts annual rate to interval rate using compound interest formula
   */
  private convertAnnualRateToInterval(annualRate: number, interval: string): number {
    const periodsPerYear = this.getPeriodsPerYear(interval);
    return Math.pow(1 + annualRate, 1 / periodsPerYear) - 1;
  }

  /**
   * Gets periods per year for interval
   */
  private getPeriodsPerYear(interval: string): number {
    switch (interval) {
      case 'week':
        return 52;
      case 'month':
        return 12;
      case 'year':
        return 1;
      case 'fortnight':
        return 26;
      default:
        return 12; // Default to monthly
    }
  }
}

/**
 * Processor for parameter and state events
 */
export class StateEventProcessor {
  constructor(private eventFactory: FinancialEventFactory) {}

  /**
   * Processes parameter change
   */
  processParameterChange(
    parameterName: string,
    previousValue: any,
    newValue: any,
    effectiveDate: Date,
    reason: string
  ): FinancialEvent {
    EventValidation.validateNonEmptyString(parameterName, 'parameterName');
    EventValidation.validateDate(effectiveDate, 'effectiveDate');
    EventValidation.validateNonEmptyString(reason, 'reason');

    return this.eventFactory.createParameterChangedEvent(
      parameterName,
      previousValue,
      newValue,
      effectiveDate,
      reason
    );
  }

  /**
   * Processes parameter transition scheduling
   */
  processParameterTransitionScheduling(
    transitionId: string,
    transitionDate: Date,
    parameterChanges: Record<string, any>,
    label?: string
  ): FinancialEvent {
    EventValidation.validateNonEmptyString(transitionId, 'transitionId');
    EventValidation.validateDate(transitionDate, 'transitionDate');

    if (!parameterChanges || Object.keys(parameterChanges).length === 0) {
      throw new Error('Parameter changes cannot be empty');
    }

    return this.eventFactory.createParameterTransitionScheduledEvent(
      transitionId,
      transitionDate,
      parameterChanges,
      new Date(),
      label
    );
  }

  /**
   * Processes parameter transition application
   */
  processParameterTransitionApplication(
    transitionId: string,
    transitionDate: Date,
    parameterChanges: Record<string, any>,
    previousParameters: Record<string, any>,
    newParameters: Record<string, any>
  ): FinancialEvent {
    EventValidation.validateNonEmptyString(transitionId, 'transitionId');
    EventValidation.validateDate(transitionDate, 'transitionDate');

    return this.eventFactory.createParameterTransitionAppliedEvent(
      transitionId,
      transitionDate,
      new Date(),
      parameterChanges,
      previousParameters,
      newParameters
    );
  }

  /**
   * Processes parameter transition removal
   */
  processParameterTransitionRemoval(
    transitionId: string,
    reason: string
  ): FinancialEvent {
    EventValidation.validateNonEmptyString(transitionId, 'transitionId');
    EventValidation.validateNonEmptyString(reason, 'reason');

    return this.eventFactory.createParameterTransitionRemovedEvent(
      transitionId,
      new Date(),
      reason
    );
  }

  /**
   * Processes financial state calculation
   */
  processFinancialStateCalculation(
    cash: number,
    investments: number,
    superannuation: number,
    loanBalance: number,
    offsetBalance: number,
    date: Date,
    loanBalances?: { [loanId: string]: number },
    superBalances?: { [superId: string]: number },
    offsetBalances?: { [loanId: string]: number },
    investmentBalances?: { [holdingId: string]: number },
    netWorth?: number,
    cashFlow?: number
  ): FinancialEvent {
    EventValidation.validateDate(date, 'date');

    // Calculate net worth and cash flow if not provided
    const calculatedNetWorth = netWorth ?? (cash + investments + superannuation - loanBalance + offsetBalance);
    const calculatedCashFlow = cashFlow ?? 0;

    return this.eventFactory.createFinancialStateCalculatedEvent(
      cash,
      investments,
      superannuation,
      loanBalance,
      offsetBalance,
      calculatedNetWorth,
      calculatedCashFlow,
      date,
      loanBalances,
      superBalances,
      offsetBalances,
      investmentBalances
    );
  }
}

/**
 * Composite processor that coordinates all financial event processors
 */
export class FinancialEventProcessorCoordinator {
  public readonly income: IncomeEventProcessor;
  public readonly expense: ExpenseEventProcessor;
  public readonly loan: LoanEventProcessor;
  public readonly investment: InvestmentEventProcessor;
  public readonly super: SuperEventProcessor;
  public readonly state: StateEventProcessor;

  constructor(eventFactory: FinancialEventFactory) {
    this.income = new IncomeEventProcessor(eventFactory);
    this.expense = new ExpenseEventProcessor(eventFactory);
    this.loan = new LoanEventProcessor(eventFactory);
    this.investment = new InvestmentEventProcessor(eventFactory);
    this.super = new SuperEventProcessor(eventFactory);
    this.state = new StateEventProcessor(eventFactory);
  }
}