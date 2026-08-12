/**
 * Core event interfaces for the event-sourced financial simulation system
 */

/**
 * Base interface for all events in the system
 */
export interface FinancialEvent {
  /** Unique identifier for this event */
  id: string;
  /** Session this event belongs to */
  sessionId: string;
  /** Type of event (discriminator) */
  type: string;
  /** Aggregate that generated this event */
  aggregateId: string;
  /** Version number for ordering within aggregate */
  version: number;
  /** When this event occurred */
  timestamp: Date;
  /** Event-specific data */
  data: Record<string, any>;
  /** Additional metadata */
  metadata: EventMetadata;
}

/**
 * Event metadata for traceability and debugging
 */
export interface EventMetadata {
  /** User who triggered this event (optional) */
  userId?: string;
  /** Correlation ID for tracking related events */
  correlationId?: string;
  /** ID of the event that caused this event */
  causationId?: string;
  /** Additional context information */
  context?: Record<string, any>;
}

// Income Events
export interface SalaryReceivedEvent extends FinancialEvent {
  type: 'SalaryReceived';
  data: {
    grossAmount: number;
    netAmount: number;
    taxAmount: number;
    date: Date;
    personId?: string;
    incomeSourceId?: string;
  };
}

export interface TaxCalculatedEvent extends FinancialEvent {
  type: 'TaxCalculated';
  data: {
    grossIncome: number;
    taxableIncome: number;
    taxAmount: number;
    deductibleInterest: number;
    date: Date;
    personId?: string;
  };
}

// Expense Events
export interface ExpensePaidEvent extends FinancialEvent {
  type: 'ExpensePaid';
  data: {
    category: string;
    amount: number;
    description: string;
    date: Date;
    expenseItemId?: string;
  };
}

// Loan Events
export interface LoanInterestCalculatedEvent extends FinancialEvent {
  type: 'LoanInterestCalculated';
  data: {
    loanId: string;
    balance: number;
    interestRate: number;
    interestAmount: number;
    effectiveBalance: number;
    date: Date;
  };
}

export interface LoanPrincipalPaidEvent extends FinancialEvent {
  type: 'LoanPrincipalPaid';
  data: {
    loanId: string;
    paymentAmount: number;
    principalAmount: number;
    newBalance: number;
    date: Date;
  };
}

export interface OffsetBalanceUpdatedEvent extends FinancialEvent {
  type: 'OffsetBalanceUpdated';
  data: {
    loanId: string;
    previousBalance: number;
    newBalance: number;
    cashTransferred: number;
    date: Date;
  };
}

// Investment Events
export interface InvestmentContributionMadeEvent extends FinancialEvent {
  type: 'InvestmentContributionMade';
  data: {
    holdingId?: string;
    amount: number;
    source: 'salary' | 'cash';
    date: Date;
    personId?: string;
  };
}

export interface InvestmentGrowthAppliedEvent extends FinancialEvent {
  type: 'InvestmentGrowthApplied';
  data: {
    holdingId?: string;
    previousBalance: number;
    growthRate: number;
    growthAmount: number;
    newBalance: number;
    date: Date;
  };
}

// Super Events
export interface SuperContributionMadeEvent extends FinancialEvent {
  type: 'SuperContributionMade';
  data: {
    superAccountId: string;
    amount: number;
    contributionType: 'employer' | 'salary_sacrifice' | 'personal';
    date: Date;
    personId?: string;
  };
}

export interface SuperGrowthAppliedEvent extends FinancialEvent {
  type: 'SuperGrowthApplied';
  data: {
    superAccountId: string;
    previousBalance: number;
    growthRate: number;
    growthAmount: number;
    newBalance: number;
    date: Date;
  };
}

// Parameter Events
export interface ParameterChangedEvent extends FinancialEvent {
  type: 'ParameterChanged';
  data: {
    parameterName: string;
    previousValue: any;
    newValue: any;
    effectiveDate: Date;
    reason: string;
  };
}

export interface ParameterTransitionScheduledEvent extends FinancialEvent {
  type: 'ParameterTransitionScheduled';
  data: {
    transitionId: string;
    transitionDate: Date;
    label?: string;
    parameterChanges: Record<string, any>;
    scheduledAt: Date;
  };
}

export interface ParameterTransitionAppliedEvent extends FinancialEvent {
  type: 'ParameterTransitionApplied';
  data: {
    transitionId: string;
    transitionDate: Date;
    appliedAt: Date;
    parameterChanges: Record<string, any>;
    previousParameters: Record<string, any>;
    newParameters: Record<string, any>;
  };
}

export interface ParameterTransitionRemovedEvent extends FinancialEvent {
  type: 'ParameterTransitionRemoved';
  data: {
    transitionId: string;
    removedAt: Date;
    reason: string;
  };
}

// State Events
export interface FinancialStateCalculatedEvent extends FinancialEvent {
  type: 'FinancialStateCalculated';
  data: {
    cash: number;
    investments: number;
    superannuation: number;
    loanBalance: number;
    offsetBalance: number;
    netWorth: number;
    cashFlow: number;
    date: Date;
    loanBalances?: { [loanId: string]: number };
    superBalances?: { [superId: string]: number };
    offsetBalances?: { [loanId: string]: number };
    investmentBalances?: { [holdingId: string]: number };
  };
}

/**
 * Union type of all possible financial events
 */
export type AnyFinancialEvent = 
  | SalaryReceivedEvent
  | TaxCalculatedEvent
  | ExpensePaidEvent
  | LoanInterestCalculatedEvent
  | LoanPrincipalPaidEvent
  | OffsetBalanceUpdatedEvent
  | InvestmentContributionMadeEvent
  | InvestmentGrowthAppliedEvent
  | SuperContributionMadeEvent
  | SuperGrowthAppliedEvent
  | ParameterChangedEvent
  | ParameterTransitionScheduledEvent
  | ParameterTransitionAppliedEvent
  | ParameterTransitionRemovedEvent
  | FinancialStateCalculatedEvent;

/**
 * Event type registry for type checking and validation
 */
export const EVENT_TYPES = {
  SALARY_RECEIVED: 'SalaryReceived',
  TAX_CALCULATED: 'TaxCalculated',
  EXPENSE_PAID: 'ExpensePaid',
  LOAN_INTEREST_CALCULATED: 'LoanInterestCalculated',
  LOAN_PRINCIPAL_PAID: 'LoanPrincipalPaid',
  OFFSET_BALANCE_UPDATED: 'OffsetBalanceUpdated',
  INVESTMENT_CONTRIBUTION_MADE: 'InvestmentContributionMade',
  INVESTMENT_GROWTH_APPLIED: 'InvestmentGrowthApplied',
  SUPER_CONTRIBUTION_MADE: 'SuperContributionMade',
  SUPER_GROWTH_APPLIED: 'SuperGrowthApplied',
  PARAMETER_CHANGED: 'ParameterChanged',
  PARAMETER_TRANSITION_SCHEDULED: 'ParameterTransitionScheduled',
  PARAMETER_TRANSITION_APPLIED: 'ParameterTransitionApplied',
  PARAMETER_TRANSITION_REMOVED: 'ParameterTransitionRemoved',
  FINANCIAL_STATE_CALCULATED: 'FinancialStateCalculated',
} as const;