/**
 * Event factory for creating specific financial events
 */

import type {
  FinancialEvent,
  EventMetadata,
  SalaryReceivedEvent,
  TaxCalculatedEvent,
  ExpensePaidEvent,
  LoanInterestCalculatedEvent,
  LoanPrincipalPaidEvent,
  OffsetBalanceUpdatedEvent,
  InvestmentContributionMadeEvent,
  InvestmentGrowthAppliedEvent,
  SuperContributionMadeEvent,
  SuperGrowthAppliedEvent,
  ParameterChangedEvent,
  ParameterTransitionScheduledEvent,
  ParameterTransitionAppliedEvent,
  ParameterTransitionRemovedEvent,
  FinancialStateCalculatedEvent,
} from "../interfaces/events.ts";
import { EVENT_TYPES } from "../interfaces/events.ts";

/**
 * Factory class for creating financial events with proper typing and validation
 */
export class FinancialEventFactory {
  private eventCounter = 0;

  constructor(
    private readonly sessionId: string,
    private readonly aggregateId: string
  ) {}

  /**
   * Creates a SalaryReceived event
   */
  createSalaryReceivedEvent(
    grossAmount: number,
    netAmount: number,
    taxAmount: number,
    date: Date,
    personId?: string,
    incomeSourceId?: string,
    metadata?: Partial<EventMetadata>
  ): SalaryReceivedEvent {
    return this.createEvent(EVENT_TYPES.SALARY_RECEIVED, {
      grossAmount,
      netAmount,
      taxAmount,
      date,
      personId,
      incomeSourceId,
    }, metadata) as SalaryReceivedEvent;
  }

  /**
   * Creates a TaxCalculated event
   */
  createTaxCalculatedEvent(
    grossIncome: number,
    taxableIncome: number,
    taxAmount: number,
    deductibleInterest: number,
    date: Date,
    personId?: string,
    metadata?: Partial<EventMetadata>
  ): TaxCalculatedEvent {
    return this.createEvent(EVENT_TYPES.TAX_CALCULATED, {
      grossIncome,
      taxableIncome,
      taxAmount,
      deductibleInterest,
      date,
      personId,
    }, metadata) as TaxCalculatedEvent;
  }

  /**
   * Creates an ExpensePaid event
   */
  createExpensePaidEvent(
    category: string,
    amount: number,
    description: string,
    date: Date,
    expenseItemId?: string,
    metadata?: Partial<EventMetadata>
  ): ExpensePaidEvent {
    return this.createEvent(EVENT_TYPES.EXPENSE_PAID, {
      category,
      amount,
      description,
      date,
      expenseItemId,
    }, metadata) as ExpensePaidEvent;
  }

  /**
   * Creates a LoanInterestCalculated event
   */
  createLoanInterestCalculatedEvent(
    loanId: string,
    balance: number,
    interestRate: number,
    interestAmount: number,
    effectiveBalance: number,
    date: Date,
    metadata?: Partial<EventMetadata>
  ): LoanInterestCalculatedEvent {
    return this.createEvent(EVENT_TYPES.LOAN_INTEREST_CALCULATED, {
      loanId,
      balance,
      interestRate,
      interestAmount,
      effectiveBalance,
      date,
    }, metadata) as LoanInterestCalculatedEvent;
  }

  /**
   * Creates a LoanPrincipalPaid event
   */
  createLoanPrincipalPaidEvent(
    loanId: string,
    paymentAmount: number,
    principalAmount: number,
    newBalance: number,
    date: Date,
    metadata?: Partial<EventMetadata>
  ): LoanPrincipalPaidEvent {
    return this.createEvent(EVENT_TYPES.LOAN_PRINCIPAL_PAID, {
      loanId,
      paymentAmount,
      principalAmount,
      newBalance,
      date,
    }, metadata) as LoanPrincipalPaidEvent;
  }

  /**
   * Creates an OffsetBalanceUpdated event
   */
  createOffsetBalanceUpdatedEvent(
    loanId: string,
    previousBalance: number,
    newBalance: number,
    cashTransferred: number,
    date: Date,
    metadata?: Partial<EventMetadata>
  ): OffsetBalanceUpdatedEvent {
    return this.createEvent(EVENT_TYPES.OFFSET_BALANCE_UPDATED, {
      loanId,
      previousBalance,
      newBalance,
      cashTransferred,
      date,
    }, metadata) as OffsetBalanceUpdatedEvent;
  }

  /**
   * Creates an InvestmentContributionMade event
   */
  createInvestmentContributionMadeEvent(
    amount: number,
    source: 'salary' | 'cash',
    date: Date,
    holdingId?: string,
    personId?: string,
    metadata?: Partial<EventMetadata>
  ): InvestmentContributionMadeEvent {
    return this.createEvent(EVENT_TYPES.INVESTMENT_CONTRIBUTION_MADE, {
      holdingId,
      amount,
      source,
      date,
      personId,
    }, metadata) as InvestmentContributionMadeEvent;
  }

  /**
   * Creates an InvestmentGrowthApplied event
   */
  createInvestmentGrowthAppliedEvent(
    previousBalance: number,
    growthRate: number,
    growthAmount: number,
    newBalance: number,
    date: Date,
    holdingId?: string,
    metadata?: Partial<EventMetadata>
  ): InvestmentGrowthAppliedEvent {
    return this.createEvent(EVENT_TYPES.INVESTMENT_GROWTH_APPLIED, {
      holdingId,
      previousBalance,
      growthRate,
      growthAmount,
      newBalance,
      date,
    }, metadata) as InvestmentGrowthAppliedEvent;
  }

  /**
   * Creates a SuperContributionMade event
   */
  createSuperContributionMadeEvent(
    superAccountId: string,
    amount: number,
    contributionType: 'employer' | 'salary_sacrifice' | 'personal',
    date: Date,
    personId?: string,
    metadata?: Partial<EventMetadata>
  ): SuperContributionMadeEvent {
    return this.createEvent(EVENT_TYPES.SUPER_CONTRIBUTION_MADE, {
      superAccountId,
      amount,
      contributionType,
      date,
      personId,
    }, metadata) as SuperContributionMadeEvent;
  }

  /**
   * Creates a SuperGrowthApplied event
   */
  createSuperGrowthAppliedEvent(
    superAccountId: string,
    previousBalance: number,
    growthRate: number,
    growthAmount: number,
    newBalance: number,
    date: Date,
    metadata?: Partial<EventMetadata>
  ): SuperGrowthAppliedEvent {
    return this.createEvent(EVENT_TYPES.SUPER_GROWTH_APPLIED, {
      superAccountId,
      previousBalance,
      growthRate,
      growthAmount,
      newBalance,
      date,
    }, metadata) as SuperGrowthAppliedEvent;
  }

  /**
   * Creates a ParameterChanged event
   */
  createParameterChangedEvent(
    parameterName: string,
    previousValue: any,
    newValue: any,
    effectiveDate: Date,
    reason: string,
    metadata?: Partial<EventMetadata>
  ): ParameterChangedEvent {
    return this.createEvent(EVENT_TYPES.PARAMETER_CHANGED, {
      parameterName,
      previousValue,
      newValue,
      effectiveDate,
      reason,
    }, metadata) as ParameterChangedEvent;
  }

  /**
   * Creates a ParameterTransitionScheduled event
   */
  createParameterTransitionScheduledEvent(
    transitionId: string,
    transitionDate: Date,
    parameterChanges: Record<string, any>,
    scheduledAt: Date,
    label?: string,
    metadata?: Partial<EventMetadata>
  ): ParameterTransitionScheduledEvent {
    return this.createEvent(EVENT_TYPES.PARAMETER_TRANSITION_SCHEDULED, {
      transitionId,
      transitionDate,
      label,
      parameterChanges,
      scheduledAt,
    }, metadata) as ParameterTransitionScheduledEvent;
  }

  /**
   * Creates a ParameterTransitionApplied event
   */
  createParameterTransitionAppliedEvent(
    transitionId: string,
    transitionDate: Date,
    appliedAt: Date,
    parameterChanges: Record<string, any>,
    previousParameters: Record<string, any>,
    newParameters: Record<string, any>,
    metadata?: Partial<EventMetadata>
  ): ParameterTransitionAppliedEvent {
    return this.createEvent(EVENT_TYPES.PARAMETER_TRANSITION_APPLIED, {
      transitionId,
      transitionDate,
      appliedAt,
      parameterChanges,
      previousParameters,
      newParameters,
    }, metadata) as ParameterTransitionAppliedEvent;
  }

  /**
   * Creates a ParameterTransitionRemoved event
   */
  createParameterTransitionRemovedEvent(
    transitionId: string,
    removedAt: Date,
    reason: string,
    metadata?: Partial<EventMetadata>
  ): ParameterTransitionRemovedEvent {
    return this.createEvent(EVENT_TYPES.PARAMETER_TRANSITION_REMOVED, {
      transitionId,
      removedAt,
      reason,
    }, metadata) as ParameterTransitionRemovedEvent;
  }

  /**
   * Creates a FinancialStateCalculated event
   */
  createFinancialStateCalculatedEvent(
    cash: number,
    investments: number,
    superannuation: number,
    loanBalance: number,
    offsetBalance: number,
    netWorth: number,
    cashFlow: number,
    date: Date,
    loanBalances?: { [loanId: string]: number },
    superBalances?: { [superId: string]: number },
    offsetBalances?: { [loanId: string]: number },
    investmentBalances?: { [holdingId: string]: number },
    metadata?: Partial<EventMetadata>
  ): FinancialStateCalculatedEvent {
    return this.createEvent(EVENT_TYPES.FINANCIAL_STATE_CALCULATED, {
      cash,
      investments,
      superannuation,
      loanBalance,
      offsetBalance,
      netWorth,
      cashFlow,
      date,
      loanBalances,
      superBalances,
      offsetBalances,
      investmentBalances,
    }, metadata) as FinancialStateCalculatedEvent;
  }

  /**
   * Generic event creation method
   */
  private createEvent(
    type: string,
    data: Record<string, any>,
    metadata?: Partial<EventMetadata>
  ): FinancialEvent {
    this.eventCounter++;
    
    return {
      id: this.generateEventId(),
      sessionId: this.sessionId,
      type,
      aggregateId: this.aggregateId,
      version: this.eventCounter,
      timestamp: new Date(),
      data,
      metadata: {
        correlationId: this.generateCorrelationId(),
        ...metadata,
      },
    };
  }

  /**
   * Generates a unique event ID
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generates a correlation ID for event tracing
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Resets the event counter (useful for testing)
   */
  resetCounter(): void {
    this.eventCounter = 0;
  }

  /**
   * Gets the current event counter value
   */
  getEventCounter(): number {
    return this.eventCounter;
  }
}

/**
 * Validation utilities for event data
 */
export class EventValidation {
  /**
   * Validates that required numeric fields are positive
   */
  static validatePositiveAmount(amount: number, fieldName: string): void {
    if (typeof amount !== 'number' || amount < 0) {
      throw new Error(`${fieldName} must be a positive number, got: ${amount}`);
    }
  }

  /**
   * Validates that a rate is between 0 and 100
   */
  static validateRate(rate: number, fieldName: string): void {
    if (typeof rate !== 'number' || rate < 0 || rate > 100) {
      throw new Error(`${fieldName} must be between 0 and 100, got: ${rate}`);
    }
  }

  /**
   * Validates that a date is valid
   */
  static validateDate(date: Date, fieldName: string): void {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error(`${fieldName} must be a valid Date, got: ${date}`);
    }
  }

  /**
   * Validates that a string is not empty
   */
  static validateNonEmptyString(value: string, fieldName: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${fieldName} must be a non-empty string, got: ${value}`);
    }
  }

  /**
   * Validates contribution type for super events
   */
  static validateContributionType(type: string): void {
    const validTypes = ['employer', 'salary_sacrifice', 'personal'];
    if (!validTypes.includes(type)) {
      throw new Error(`Contribution type must be one of: ${validTypes.join(', ')}, got: ${type}`);
    }
  }

  /**
   * Validates investment source
   */
  static validateInvestmentSource(source: string): void {
    const validSources = ['salary', 'cash'];
    if (!validSources.includes(source)) {
      throw new Error(`Investment source must be one of: ${validSources.join(', ')}, got: ${source}`);
    }
  }
}