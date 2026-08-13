/**
 * Simulation Event System
 * Provides comprehensive event tracking for debugging and analysis
 */

/**
 * Simulation phases - matches the 7-phase calculation in simulation_engine.ts
 */
export enum SimulationPhase {
  INCOME = "income",
  EXPENSES = "expenses",
  RETIREMENT_INCOME = "retirement_income",
  LOAN_PAYMENT = "loan_payment",
  INVESTMENT = "investment",
  SUPERANNUATION = "superannuation",
  OFFSET = "offset",
  DEFICIT = "deficit",
  STATE_UPDATE = "state_update",
}

/**
 * Event types for all simulation operations
 */
export enum SimulationEventType {
  // Phase transitions
  PHASE_START = "phase_start",
  PHASE_END = "phase_end",

  // Income phase
  INCOME_RECEIVED = "income_received",
  TAX_CALCULATED = "tax_calculated",

  // Expense phase
  EXPENSE_PAID = "expense_paid",

  // Retirement phase
  RETIREMENT_WITHDRAWAL = "retirement_withdrawal",
  WITHDRAWAL_STRATEGY_SELECTED = "withdrawal_strategy_selected",

  // Loan phase
  LOAN_PAYMENT = "loan_payment",
  LOAN_INTEREST_CALCULATED = "loan_interest_calculated",

  // Investment phase
  INVESTMENT_CONTRIBUTION = "investment_contribution",
  INVESTMENT_GROWTH = "investment_growth",
  PLANNED_SALE_EXECUTED = "planned_sale_executed",

  // Super phase
  SUPER_CONTRIBUTION = "super_contribution",
  SUPER_GROWTH = "super_growth",

  // Offset phase
  OFFSET_TRANSFER = "offset_transfer",
  LOAN_AUTO_PAYOUT = "loan_auto_payout",

  // State tracking
  STATE_SNAPSHOT = "state_snapshot",

  // Warnings and alerts
  WARNING = "warning",
  DECISION = "decision",
}

/**
 * Base event interface - all events extend this
 */
export interface SimulationEvent {
  /** Event type */
  type: SimulationEventType;
  /** When this event occurred */
  timestamp: Date;
  /** Which phase this event belongs to */
  phase: SimulationPhase;
  /** Human-readable description */
  description: string;
  /** Event-specific data */
  data: Record<string, unknown>;
}

/**
 * Phase transition events
 */
export interface PhaseEvent extends SimulationEvent {
  type: SimulationEventType.PHASE_START | SimulationEventType.PHASE_END;
  data: {
    phase: SimulationPhase;
  };
}

/**
 * Income received event
 */
export interface IncomeReceivedEvent extends SimulationEvent {
  type: SimulationEventType.INCOME_RECEIVED;
  phase: SimulationPhase.INCOME;
  data: {
    sourceId?: string;
    sourceLabel?: string;
    grossAmount: number;
    personId?: string;
    isRetired: boolean;
  };
}

/**
 * Tax calculated event
 */
export interface TaxCalculatedEvent extends SimulationEvent {
  type: SimulationEventType.TAX_CALCULATED;
  phase: SimulationPhase.INCOME;
  data: {
    grossIncome: number;
    deductibleInterest: number;
    taxableIncome: number;
    taxPaid: number;
    netIncome: number;
  };
}

/**
 * Expense paid event
 */
export interface ExpensePaidEvent extends SimulationEvent {
  type: SimulationEventType.EXPENSE_PAID;
  phase: SimulationPhase.EXPENSES;
  data: {
    expenseId?: string;
    expenseLabel?: string;
    amount: number;
    category?: string;
  };
}

/**
 * Retirement withdrawal event
 */
export interface RetirementWithdrawalEvent extends SimulationEvent {
  type: SimulationEventType.RETIREMENT_WITHDRAWAL;
  phase: SimulationPhase.RETIREMENT_INCOME | SimulationPhase.DEFICIT;
  data: {
    shortfall: number;
    fromInvestments: number;
    fromSuper: number;
    totalWithdrawn: number;
    remainingShortfall: number;
    reason: string;
  };
}

/**
 * Withdrawal strategy selection event
 */
export interface WithdrawalStrategyEvent extends SimulationEvent {
  type: SimulationEventType.WITHDRAWAL_STRATEGY_SELECTED;
  phase: SimulationPhase.RETIREMENT_INCOME | SimulationPhase.DEFICIT;
  data: {
    strategy: "investments_first" | "super_first" | "proportional";
    eligibleForSuper: boolean;
    ages: number[];
    preservationAge: number;
  };
}

/**
 * Loan payment event
 */
export interface LoanPaymentEvent extends SimulationEvent {
  type: SimulationEventType.LOAN_PAYMENT;
  phase: SimulationPhase.LOAN_PAYMENT;
  data: {
    loanId: string;
    loanLabel?: string;
    principalBefore: number;
    principalAfter: number;
    interestPaid: number;
    principalPaid: number;
    paymentAmount: number;
    offsetBalance: number;
    interestSaved: number;
    deductibleInterest: number;
    isPartialPayment: boolean;
  };
}

/**
 * Investment transaction event
 */
export interface InvestmentTransactionEvent extends SimulationEvent {
  type:
    | SimulationEventType.INVESTMENT_CONTRIBUTION
    | SimulationEventType.INVESTMENT_GROWTH
    | SimulationEventType.PLANNED_SALE_EXECUTED;
  phase: SimulationPhase.INVESTMENT;
  data: {
    holdingId?: string;
    holdingLabel?: string;
    balanceBefore: number;
    balanceAfter: number;
    contribution?: number;
    growth?: number;
    returnRate?: number;
    amountSold?: number;
  };
}

/**
 * Super transaction event
 */
export interface SuperTransactionEvent extends SimulationEvent {
  type:
    | SimulationEventType.SUPER_CONTRIBUTION
    | SimulationEventType.SUPER_GROWTH;
  phase: SimulationPhase.SUPERANNUATION;
  data: {
    accountId: string;
    accountLabel?: string;
    personId?: string;
    balanceBefore: number;
    balanceAfter: number;
    contribution?: number;
    growth?: number;
    returnRate?: number;
  };
}

/**
 * Offset transfer event
 */
export interface OffsetTransferEvent extends SimulationEvent {
  type: SimulationEventType.OFFSET_TRANSFER;
  phase: SimulationPhase.OFFSET;
  data: {
    loanId: string;
    loanLabel?: string;
    cashBefore: number;
    cashAfter: number;
    offsetBefore: number;
    offsetAfter: number;
    transferAmount: number;
  };
}

/**
 * Loan auto-payout event
 */
export interface LoanAutoPayoutEvent extends SimulationEvent {
  type: SimulationEventType.LOAN_AUTO_PAYOUT;
  phase: SimulationPhase.OFFSET;
  data: {
    loanId: string;
    loanLabel?: string;
    loanBalance: number;
    offsetBalance: number;
    cashReleased: number;
  };
}

/**
 * State snapshot event
 */
export interface StateSnapshotEvent extends SimulationEvent {
  type: SimulationEventType.STATE_SNAPSHOT;
  data: {
    cash: number;
    investments: number;
    superannuation: number;
    loanBalance: number;
    offsetBalance: number;
    netWorth: number;
    cashFlow: number;
  };
}

/**
 * Warning event
 */
export interface WarningEvent extends SimulationEvent {
  type: SimulationEventType.WARNING;
  data: {
    severity: "info" | "warning" | "error";
    message: string;
    context?: Record<string, unknown>;
  };
}

/**
 * Decision event - tracks important decisions made during simulation
 */
export interface DecisionEvent extends SimulationEvent {
  type: SimulationEventType.DECISION;
  data: {
    decision: string;
    reason: string;
    alternatives?: string[];
    context?: Record<string, unknown>;
  };
}

/**
 * Union type of all possible events
 */
export type AnySimulationEvent =
  | PhaseEvent
  | IncomeReceivedEvent
  | TaxCalculatedEvent
  | ExpensePaidEvent
  | RetirementWithdrawalEvent
  | WithdrawalStrategyEvent
  | LoanPaymentEvent
  | InvestmentTransactionEvent
  | SuperTransactionEvent
  | OffsetTransferEvent
  | LoanAutoPayoutEvent
  | StateSnapshotEvent
  | WarningEvent
  | DecisionEvent;

/**
 * Event collector - gathers events during simulation
 */
export class EventCollector {
  private events: AnySimulationEvent[] = [];

  /**
   * Add an event to the collection
   */
  emit(event: AnySimulationEvent): void {
    this.events.push(event);
  }

  /**
   * Get all collected events
   */
  getAll(): AnySimulationEvent[] {
    return [...this.events];
  }

  /**
   * Find events matching criteria
   */
  find(criteria: {
    type?: SimulationEventType;
    phase?: SimulationPhase;
    afterDate?: Date;
    beforeDate?: Date;
    filter?: (event: AnySimulationEvent) => boolean;
  }): AnySimulationEvent[] {
    let results = this.events;

    if (criteria.type) {
      results = results.filter((e) => e.type === criteria.type);
    }

    if (criteria.phase) {
      results = results.filter((e) => e.phase === criteria.phase);
    }

    if (criteria.afterDate) {
      results = results.filter((e) => e.timestamp >= criteria.afterDate!);
    }

    if (criteria.beforeDate) {
      results = results.filter((e) => e.timestamp <= criteria.beforeDate!);
    }

    if (criteria.filter) {
      results = results.filter(criteria.filter);
    }

    return results;
  }

  /**
   * Get events for a specific date
   */
  getEventsForDate(date: Date): AnySimulationEvent[] {
    return this.events.filter((e) => e.timestamp.getTime() === date.getTime());
  }

  /**
   * Format events as a readable timeline
   */
  formatTimeline(): string {
    const lines: string[] = [];
    let currentDate: Date | null = null;
    let currentPhase: SimulationPhase | null = null;

    for (const event of this.events) {
      // Date header
      if (!currentDate || event.timestamp.getTime() !== currentDate.getTime()) {
        currentDate = event.timestamp;
        lines.push("");
        lines.push(
          `═══ ${currentDate.toISOString().split("T")[0]} ═══`,
        );
      }

      // Phase header
      if (event.type === SimulationEventType.PHASE_START) {
        currentPhase = event.phase;
        lines.push(`\n┌─ Phase: ${event.phase.toUpperCase()}`);
      } else if (event.type === SimulationEventType.PHASE_END) {
        lines.push(`└─ End Phase: ${event.phase.toUpperCase()}`);
        currentPhase = null;
      } else {
        // Regular event
        const indent = currentPhase ? "│  " : "";
        const icon = this.getEventIcon(event);
        lines.push(`${indent}${icon} ${event.description}`);

        // Add important data
        const details = this.formatEventDetails(event);
        if (details) {
          lines.push(`${indent}   ${details}`);
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Get an icon for the event type
   */
  private getEventIcon(event: AnySimulationEvent): string {
    switch (event.type) {
      case SimulationEventType.INCOME_RECEIVED:
        return "💰";
      case SimulationEventType.TAX_CALCULATED:
        return "🧾";
      case SimulationEventType.EXPENSE_PAID:
        return "💸";
      case SimulationEventType.RETIREMENT_WITHDRAWAL:
        return "🏦";
      case SimulationEventType.LOAN_PAYMENT:
        return "🏠";
      case SimulationEventType.INVESTMENT_CONTRIBUTION:
      case SimulationEventType.INVESTMENT_GROWTH:
        return "📈";
      case SimulationEventType.SUPER_CONTRIBUTION:
      case SimulationEventType.SUPER_GROWTH:
        return "🎯";
      case SimulationEventType.OFFSET_TRANSFER:
        return "💳";
      case SimulationEventType.WARNING:
        return "⚠️";
      case SimulationEventType.DECISION:
        return "🤔";
      case SimulationEventType.STATE_SNAPSHOT:
        return "📊";
      default:
        return "•";
    }
  }

  /**
   * Format event-specific details
   */
  private formatEventDetails(event: AnySimulationEvent): string | null {
    switch (event.type) {
      case SimulationEventType.INCOME_RECEIVED:
        return `Amount: $${event.data.grossAmount.toFixed(2)}`;

      case SimulationEventType.TAX_CALCULATED:
        return `Taxable: $${event.data.taxableIncome.toFixed(2)} → Tax: $${
          event.data.taxPaid.toFixed(2)
        }`;

      case SimulationEventType.RETIREMENT_WITHDRAWAL:
        return `Investments: $${
          event.data.fromInvestments.toFixed(2)
        }, Super: $${event.data.fromSuper.toFixed(2)}`;

      case SimulationEventType.LOAN_PAYMENT:
        return `Principal: $${event.data.principalBefore.toFixed(2)} → $${
          event.data.principalAfter.toFixed(2)
        }`;

      case SimulationEventType.STATE_SNAPSHOT:
        return `Net Worth: $${event.data.netWorth.toFixed(2)}, Cash Flow: $${
          event.data.cashFlow.toFixed(2)
        }`;

      default:
        return null;
    }
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get event count
   */
  count(): number {
    return this.events.length;
  }
}
