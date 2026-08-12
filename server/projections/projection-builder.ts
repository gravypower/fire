/**
 * Projection builders for reconstructing state from events
 */

import type {
  FinancialProjection,
  MilestoneProjection,
  ProjectionBuilder,
  TimelineProjection,
} from "../interfaces/projections.ts";
import type { FinancialEvent } from "../interfaces/events.ts";
import { EVENT_TYPES } from "../interfaces/events.ts";
import type { EventCache } from "../interfaces/cache.ts";
import type { FinancialState, UserParameters } from "../../types/financial.ts";
import type { Milestone } from "../../types/milestones.ts";
import { detectMilestonesFromSimulation } from "../../lib/milestone_detector.ts";
import { RetirementCalculator } from "../../lib/processors.ts";

/**
 * Base projection builder with common functionality
 */
abstract class BaseProjectionBuilder<
  T extends { sessionId: string; version: number; lastUpdated: Date },
> implements ProjectionBuilder<T> {
  constructor(protected eventCache: EventCache) {}

  abstract build(sessionId: string): Promise<T>;
  abstract update(projection: T, events: FinancialEvent[]): Promise<T>;

  async rebuild(sessionId: string): Promise<T> {
    return this.build(sessionId);
  }

  protected async getEvents(sessionId: string): Promise<FinancialEvent[]> {
    return await this.eventCache.getEvents(sessionId);
  }

  protected getLatestVersion(events: FinancialEvent[]): number {
    return events.length > 0 ? Math.max(...events.map((e) => e.version)) : 0;
  }
}

/**
 * Financial projection builder - builds current financial state
 */
export class FinancialProjectionBuilder
  extends BaseProjectionBuilder<FinancialProjection> {
  async build(sessionId: string): Promise<FinancialProjection> {
    const events = await this.getEvents(sessionId);

    // Initialize with zero state
    let currentState = {
      cash: 0,
      investments: 0,
      superannuation: 0,
      loanBalance: 0,
      offsetBalance: 0,
      netWorth: 0,
      cashFlow: 0,
      date: new Date(),
    };

    let balanceBreakdown = {
      loanBalances: {} as Record<string, number>,
      superBalances: {} as Record<string, number>,
      offsetBalances: {} as Record<string, number>,
      investmentBalances: {} as Record<string, number>,
    };

    // Apply events in chronological order
    for (const event of events) {
      const result = this.applyEventToState(
        currentState,
        balanceBreakdown,
        event,
      );
      currentState = result.state;
      balanceBreakdown = result.breakdown;
    }

    return {
      sessionId,
      version: this.getLatestVersion(events),
      lastUpdated: new Date(),
      currentState,
      balanceBreakdown,
    };
  }

  async update(
    projection: FinancialProjection,
    events: FinancialEvent[],
  ): Promise<FinancialProjection> {
    let currentState = { ...projection.currentState };
    let balanceBreakdown = {
      loanBalances: { ...projection.balanceBreakdown.loanBalances },
      superBalances: { ...projection.balanceBreakdown.superBalances },
      offsetBalances: { ...projection.balanceBreakdown.offsetBalances },
      investmentBalances: { ...projection.balanceBreakdown.investmentBalances },
    };

    // Apply new events
    for (const event of events) {
      const result = this.applyEventToState(
        currentState,
        balanceBreakdown,
        event,
      );
      currentState = result.state;
      balanceBreakdown = result.breakdown;
    }

    return {
      ...projection,
      version: Math.max(projection.version, this.getLatestVersion(events)),
      lastUpdated: new Date(),
      currentState,
      balanceBreakdown,
    };
  }

  private applyEventToState(
    state: FinancialProjection["currentState"],
    breakdown: FinancialProjection["balanceBreakdown"],
    event: FinancialEvent,
  ): {
    state: FinancialProjection["currentState"];
    breakdown: FinancialProjection["balanceBreakdown"];
  } {
    const newState = { ...state };
    const newBreakdown = {
      loanBalances: { ...breakdown.loanBalances },
      superBalances: { ...breakdown.superBalances },
      offsetBalances: { ...breakdown.offsetBalances },
      investmentBalances: { ...breakdown.investmentBalances },
    };

    // Update date to latest event
    // Use the event's simulation date if available, otherwise fall back to timestamp
    // This allows the projection to reflect the simulation time rather than real-time
    const eventDate = event.data?.date
      ? new Date(event.data.date)
      : new Date(event.timestamp);
    if (!isNaN(eventDate.getTime())) {
      newState.date = eventDate;
    } else {
      newState.date = new Date(event.timestamp);
    }

    switch (event.type) {
      case EVENT_TYPES.SALARY_RECEIVED:
        const netAmount =
          typeof event.data.netAmount === "number" &&
            !isNaN(event.data.netAmount)
            ? event.data.netAmount
            : 0;
        newState.cash += netAmount;
        newState.cashFlow += netAmount;
        break;

      case EVENT_TYPES.TAX_CALCULATED:
        // Tax is already deducted from salary, this is just for tracking
        break;

      case EVENT_TYPES.EXPENSE_PAID:
        const expenseAmount =
          typeof event.data.amount === "number" && !isNaN(event.data.amount)
            ? event.data.amount
            : 0;
        newState.cash -= expenseAmount;
        newState.cashFlow -= expenseAmount;
        break;

      case EVENT_TYPES.LOAN_INTEREST_CALCULATED:
        // Interest calculation doesn't change balances, just tracks cost
        break;

      case EVENT_TYPES.LOAN_PRINCIPAL_PAID:
        const paymentAmount =
          typeof event.data.paymentAmount === "number" &&
            !isNaN(event.data.paymentAmount)
            ? event.data.paymentAmount
            : 0;
        newState.cash -= paymentAmount;
        newState.cashFlow -= paymentAmount;

        // Update loan balance
        const loanId = event.data.loanId || "default";
        const newLoanBalance =
          typeof event.data.newBalance === "number" &&
            !isNaN(event.data.newBalance)
            ? event.data.newBalance
            : 0;
        newBreakdown.loanBalances[loanId] = newLoanBalance;

        // Update aggregate loan balance
        newState.loanBalance = Object.values(newBreakdown.loanBalances).reduce(
          (sum, balance) => sum + balance,
          0,
        );
        break;

      case EVENT_TYPES.OFFSET_BALANCE_UPDATED:
        const cashTransferred =
          typeof event.data.cashTransferred === "number" &&
            !isNaN(event.data.cashTransferred)
            ? event.data.cashTransferred
            : 0;
        newState.cash -= cashTransferred;

        // Update offset balance
        const offsetLoanId = event.data.loanId || "default";
        const newOffsetBalance =
          typeof event.data.newBalance === "number" &&
            !isNaN(event.data.newBalance)
            ? event.data.newBalance
            : 0;
        newBreakdown.offsetBalances[offsetLoanId] = newOffsetBalance;

        // Update aggregate offset balance
        newState.offsetBalance = Object.values(newBreakdown.offsetBalances)
          .reduce((sum, balance) => sum + balance, 0);
        break;

      case EVENT_TYPES.INVESTMENT_CONTRIBUTION_MADE:
        const investmentAmount =
          typeof event.data.amount === "number" && !isNaN(event.data.amount)
            ? event.data.amount
            : 0;
        if (event.data.source === "cash") {
          newState.cash -= investmentAmount;
        }

        // Update investment balance
        const holdingId = event.data.holdingId || "default";
        newBreakdown.investmentBalances[holdingId] =
          (newBreakdown.investmentBalances[holdingId] || 0) + investmentAmount;

        // Update aggregate investment balance
        newState.investments = Object.values(newBreakdown.investmentBalances)
          .reduce((sum, balance) => sum + balance, 0);
        newState.cashFlow -= investmentAmount;
        break;

      case EVENT_TYPES.INVESTMENT_GROWTH_APPLIED:
        const investmentHoldingId = event.data.holdingId || "default";
        const newInvestmentBalance =
          typeof event.data.newBalance === "number" &&
            !isNaN(event.data.newBalance)
            ? event.data.newBalance
            : 0;
        newBreakdown.investmentBalances[investmentHoldingId] =
          newInvestmentBalance;

        // Update aggregate investment balance
        newState.investments = Object.values(newBreakdown.investmentBalances)
          .reduce((sum, balance) => sum + balance, 0);
        break;

      case EVENT_TYPES.SUPER_CONTRIBUTION_MADE:
        const superAccountId = event.data.superAccountId || "default";
        const contributionAmount =
          typeof event.data.amount === "number" && !isNaN(event.data.amount)
            ? event.data.amount
            : 0;
        newBreakdown.superBalances[superAccountId] =
          (newBreakdown.superBalances[superAccountId] || 0) +
          contributionAmount;

        // Update aggregate super balance
        newState.superannuation = Object.values(newBreakdown.superBalances)
          .reduce((sum, balance) => sum + balance, 0);

        if (event.data.contributionType !== "employer") {
          newState.cash -= contributionAmount;
          newState.cashFlow -= contributionAmount;
        }
        break;

      case EVENT_TYPES.SUPER_GROWTH_APPLIED:
        const superAccId = event.data.superAccountId || "default";
        if (
          typeof event.data.newBalance === "number" &&
          !isNaN(event.data.newBalance)
        ) {
          newBreakdown.superBalances[superAccId] = event.data.newBalance;
        }

        // Update aggregate super balance
        newState.superannuation = Object.values(newBreakdown.superBalances)
          .reduce((sum, balance) => sum + balance, 0);
        break;

      case EVENT_TYPES.FINANCIAL_STATE_CALCULATED:
        // This event contains the complete calculated state
        newState.cash =
          typeof event.data.cash === "number" && !isNaN(event.data.cash)
            ? event.data.cash
            : 0;
        newState.investments =
          typeof event.data.investments === "number" &&
            !isNaN(event.data.investments)
            ? event.data.investments
            : 0;
        newState.superannuation =
          typeof event.data.superannuation === "number" &&
            !isNaN(event.data.superannuation)
            ? event.data.superannuation
            : 0;
        newState.loanBalance =
          typeof event.data.loanBalance === "number" &&
            !isNaN(event.data.loanBalance)
            ? event.data.loanBalance
            : 0;
        newState.offsetBalance =
          typeof event.data.offsetBalance === "number" &&
            !isNaN(event.data.offsetBalance)
            ? event.data.offsetBalance
            : 0;
        newState.netWorth =
          typeof event.data.netWorth === "number" && !isNaN(event.data.netWorth)
            ? event.data.netWorth
            : 0;
        newState.cashFlow =
          typeof event.data.cashFlow === "number" && !isNaN(event.data.cashFlow)
            ? event.data.cashFlow
            : 0;

        // Update detailed balances if provided, otherwise use aggregate values
        if (event.data.loanBalances) {
          newBreakdown.loanBalances = { ...event.data.loanBalances };
        } else if (event.data.loanBalance > 0) {
          // If no breakdown provided but aggregate exists, create default entry
          newBreakdown.loanBalances = { "default": event.data.loanBalance };
        }

        if (event.data.superBalances) {
          newBreakdown.superBalances = { ...event.data.superBalances };
        } else if (event.data.superannuation > 0) {
          newBreakdown.superBalances = { "default": event.data.superannuation };
        }

        if (event.data.offsetBalances) {
          newBreakdown.offsetBalances = { ...event.data.offsetBalances };
        } else if (event.data.offsetBalance > 0) {
          newBreakdown.offsetBalances = { "default": event.data.offsetBalance };
        }

        if (event.data.investmentBalances) {
          newBreakdown.investmentBalances = {
            ...event.data.investmentBalances,
          };
        } else if (event.data.investments > 0) {
          newBreakdown.investmentBalances = {
            "default": event.data.investments,
          };
        }
        break;

      case EVENT_TYPES.PARAMETER_CHANGED:
        // Parameter changes don't directly affect financial state
        // They affect future calculations
        break;
    }

    // Recalculate net worth
    newState.netWorth = newState.cash + newState.investments +
      newState.superannuation - newState.loanBalance + newState.offsetBalance;

    return { state: newState, breakdown: newBreakdown };
  }
}

/**
 * Timeline projection builder - builds historical timeline data
 */
export class TimelineProjectionBuilder
  extends BaseProjectionBuilder<TimelineProjection> {
  constructor(
    eventCache: EventCache,
    private sessionManager?: {
      getSession(
        sessionId: string,
      ): Promise<{ parameters?: UserParameters } | null>;
    },
  ) {
    super(eventCache);
  }

  async build(sessionId: string): Promise<TimelineProjection> {
    const events = await this.getEvents(sessionId);

    // Group events by date to build timeline states
    const statesByDate = new Map<string, FinancialState>();
    const financialBuilder = new FinancialProjectionBuilder(this.eventCache);

    // Build states incrementally
    let currentEvents: FinancialEvent[] = [];

    for (const event of events) {
      currentEvents.push(event);

      // Build state up to this event
      const projection = await financialBuilder.update({
        sessionId,
        version: 0,
        lastUpdated: new Date(),
        currentState: {
          cash: 0,
          investments: 0,
          superannuation: 0,
          loanBalance: 0,
          offsetBalance: 0,
          netWorth: 0,
          cashFlow: 0,
          date: new Date(),
        },
        balanceBreakdown: {
          loanBalances: {},
          superBalances: {},
          offsetBalances: {},
          investmentBalances: {},
        },
      }, currentEvents);

      // Convert to FinancialState format
      const state: FinancialState = {
        date: projection.currentState.date,
        cash: projection.currentState.cash,
        investments: projection.currentState.investments,
        superannuation: projection.currentState.superannuation,
        loanBalance: projection.currentState.loanBalance,
        offsetBalance: projection.currentState.offsetBalance,
        netWorth: projection.currentState.netWorth,
        cashFlow: projection.currentState.cashFlow,
        taxPaid: 0, // Will be calculated from tax events
        expenses: 0, // Will be calculated from expense events
        interestSaved: 0, // Will be calculated from loan events
        loanBalances: projection.balanceBreakdown.loanBalances,
        superBalances: projection.balanceBreakdown.superBalances,
        offsetBalances: projection.balanceBreakdown.offsetBalances,
        investmentBalances: projection.balanceBreakdown.investmentBalances,
      };

      const dateKey = state.date.toISOString().split("T")[0];
      statesByDate.set(dateKey, state);
    }

    const states = Array.from(statesByDate.values()).sort((a, b) =>
      a.date.getTime() - b.date.getTime()
    );

    // Detect milestones if we have parameters
    let milestones: Milestone[] = [];
    let parameters: UserParameters | undefined;
    if (this.sessionManager) {
      const session = await this.sessionManager.getSession(sessionId);
      if (session?.parameters) {
        parameters = session.parameters;
        const milestoneResult = detectMilestonesFromSimulation(
          states,
          session.parameters,
        );
        milestones = milestoneResult.milestones;
      }
    }

    // Basic retirement analysis
    const retirementAnalysis = this.analyzeRetirement(states, parameters);

    return {
      sessionId,
      version: this.getLatestVersion(events),
      lastUpdated: new Date(),
      states,
      milestones,
      retirementAnalysis,
    };
  }

  async update(
    projection: TimelineProjection,
    _events: FinancialEvent[],
  ): Promise<TimelineProjection> {
    // For timeline projections, it's more efficient to rebuild from scratch
    // since we need to maintain chronological order
    return this.rebuild(projection.sessionId);
  }

  private analyzeRetirement(
    states: FinancialState[],
    parameters?: UserParameters,
  ): TimelineProjection["retirementAnalysis"] {
    if (states.length === 0) {
      return {
        retirementDate: null,
        retirementAge: null,
        isSustainable: false,
      };
    }

    const { date, age } = parameters
      ? RetirementCalculator.findRetirementDate(
        states,
        parameters.desiredAnnualRetirementIncome,
        parameters.currentAge,
        parameters.retirementAge,
      )
      : { date: null, age: null };

    return {
      retirementDate: date,
      retirementAge: age,
      isSustainable: this.assessSustainability(states, date),
    };
  }

  /**
   * Determines whether the projected trajectory is financially sustainable.
   *
   * SimulationEngine.checkSustainability flags any 3+ consecutive periods of
   * negative cash flow, which is the right signal while still working (income
   * not covering expenses) but fires on every retiree, since cashFlow only
   * tracks income minus expenses and retirement income is drawn from
   * investments/super rather than "income". So cash-flow checks apply only
   * to the pre-retirement window, and the post-retirement window is judged
   * by whether the portfolio actually depletes.
   */
  private assessSustainability(
    states: FinancialState[],
    retirementDate: Date | null,
  ): boolean {
    const firstState = states[0];
    const lastState = states[states.length - 1];

    // Debt should not be growing over the course of the simulation
    if (lastState.loanBalance > firstState.loanBalance) {
      return false;
    }

    // Net worth should never go negative
    if (states.some((state) => state.netWorth < 0)) {
      return false;
    }

    // Sustained negative cash flow only signals trouble while still earning;
    // post-retirement income is expected to come from portfolio drawdown.
    const preRetirementStates = retirementDate
      ? states.filter((state) => state.date < retirementDate)
      : states;

    let consecutiveNegative = 0;
    for (const state of preRetirementStates) {
      if (state.cashFlow < 0) {
        consecutiveNegative++;
        if (consecutiveNegative >= 3) {
          return false;
        }
      } else {
        consecutiveNegative = 0;
      }
    }

    // After retirement, the portfolio itself must not be depleted
    if (retirementDate) {
      const postRetirementStates = states.filter((state) =>
        state.date >= retirementDate
      );
      const depleted = postRetirementStates.some((state) =>
        state.investments + state.superannuation <= 0
      );
      if (depleted) {
        return false;
      }
    }

    return true;
  }
}

/**
 * Milestone projection builder - builds milestone-focused projections
 */
export class MilestoneProjectionBuilder
  extends BaseProjectionBuilder<MilestoneProjection> {
  constructor(
    eventCache: EventCache,
    private sessionManager?: {
      getSession(
        sessionId: string,
      ): Promise<{ parameters?: UserParameters } | null>;
    },
  ) {
    super(eventCache);
  }

  async build(sessionId: string): Promise<MilestoneProjection> {
    const events = await this.getEvents(sessionId);

    // Build timeline first to get states for milestone detection
    const timelineBuilder = new TimelineProjectionBuilder(
      this.eventCache,
      this.sessionManager,
    );
    const timeline = await timelineBuilder.build(sessionId);

    let milestones: Milestone[] = [];

    // Detect milestones if we have parameters
    if (this.sessionManager) {
      const session = await this.sessionManager.getSession(sessionId);
      if (session?.parameters) {
        const milestoneResult = detectMilestonesFromSimulation(
          timeline.states,
          session.parameters,
        );
        milestones = milestoneResult.milestones;
      }
    }

    // Group milestones by type
    const milestonesByType: Record<string, Milestone[]> = {};
    for (const milestone of milestones) {
      if (!milestonesByType[milestone.type]) {
        milestonesByType[milestone.type] = [];
      }
      milestonesByType[milestone.type].push(milestone);
    }

    // Extract key milestones
    const keyMilestones = this.extractKeyMilestones(milestones);

    return {
      sessionId,
      version: this.getLatestVersion(events),
      lastUpdated: new Date(),
      milestones,
      milestonesByType,
      keyMilestones,
    };
  }

  async update(
    projection: MilestoneProjection,
    _events: FinancialEvent[],
  ): Promise<MilestoneProjection> {
    // Milestone projections depend on the complete timeline, so rebuild
    return this.rebuild(projection.sessionId);
  }

  private extractKeyMilestones(
    milestones: Milestone[],
  ): MilestoneProjection["keyMilestones"] {
    const keyMilestones: MilestoneProjection["keyMilestones"] = {};

    for (const milestone of milestones) {
      switch (milestone.type) {
        case "loan_payoff":
          if (
            !keyMilestones.debtFreeDate ||
            milestone.date < keyMilestones.debtFreeDate
          ) {
            keyMilestones.debtFreeDate = milestone.date;
          }
          break;

        case "retirement_eligibility":
          if (
            !keyMilestones.retirementDate ||
            milestone.date < keyMilestones.retirementDate
          ) {
            keyMilestones.retirementDate = milestone.date;
          }
          break;
      }

      // Check for net worth milestones based on financial impact
      if (milestone.financialImpact && milestone.financialImpact >= 1000000) {
        if (
          !keyMilestones.firstMillionDate ||
          milestone.date < keyMilestones.firstMillionDate
        ) {
          keyMilestones.firstMillionDate = milestone.date;
        }
      }
    }

    return keyMilestones;
  }
}

/**
 * Projection builder factory
 */
export class ProjectionBuilderFactory {
  constructor(
    private eventCache: EventCache,
    private sessionManager?: {
      getSession(
        sessionId: string,
      ): Promise<{ parameters?: UserParameters } | null>;
    },
  ) {}

  createFinancialBuilder(): FinancialProjectionBuilder {
    return new FinancialProjectionBuilder(this.eventCache);
  }

  createTimelineBuilder(): TimelineProjectionBuilder {
    return new TimelineProjectionBuilder(this.eventCache, this.sessionManager);
  }

  createMilestoneBuilder(): MilestoneProjectionBuilder {
    return new MilestoneProjectionBuilder(this.eventCache, this.sessionManager);
  }
}
