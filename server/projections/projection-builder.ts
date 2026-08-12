/**
 * Projection builders - reshape a cached SimulationResult into the
 * financial/timeline/milestone views the client asks for.
 *
 * These are pure functions rather than event-replay builders: the server
 * runs SimulationEngine once per RunSimulation command and caches the
 * result on the session, so a "projection" here is just a different view
 * of that same result, not a reconstruction from a stored event log.
 */

import type {
  FinancialProjection,
  MilestoneProjection,
  TimelineProjection,
} from "../interfaces/projections.ts";
import type { FinancialState, SimulationResult } from "../../types/financial.ts";
import type { Milestone } from "../../types/milestones.ts";

export function buildFinancialProjection(
  sessionId: string,
  version: number,
  result: SimulationResult,
): FinancialProjection {
  const lastState = result.states[result.states.length - 1];

  return {
    sessionId,
    version,
    lastUpdated: new Date(),
    currentState: lastState ?? {
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
      loanBalances: lastState?.loanBalances ?? {},
      superBalances: lastState?.superBalances ?? {},
      offsetBalances: lastState?.offsetBalances ?? {},
      investmentBalances: lastState?.investmentBalances ?? {},
    },
  };
}

export function buildTimelineProjection(
  sessionId: string,
  version: number,
  result: SimulationResult,
  milestones: Milestone[],
): TimelineProjection {
  return {
    sessionId,
    version,
    lastUpdated: new Date(),
    states: result.states,
    milestones,
    retirementAnalysis: {
      retirementDate: result.retirementDate,
      retirementAge: result.retirementAge,
      isSustainable: assessSustainability(result.states, result.retirementDate),
    },
  };
}

export function buildMilestoneProjection(
  sessionId: string,
  version: number,
  milestones: Milestone[],
): MilestoneProjection {
  const milestonesByType: Record<string, Milestone[]> = {};
  for (const milestone of milestones) {
    if (!milestonesByType[milestone.type]) {
      milestonesByType[milestone.type] = [];
    }
    milestonesByType[milestone.type].push(milestone);
  }

  return {
    sessionId,
    version,
    lastUpdated: new Date(),
    milestones,
    milestonesByType,
    keyMilestones: extractKeyMilestones(milestones),
  };
}

function extractKeyMilestones(
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

/**
 * Determines whether the projected trajectory is financially sustainable.
 *
 * SimulationEngine.checkSustainability (used for result.isSustainable) flags
 * any 3+ consecutive periods of negative cash flow, which is the right
 * signal while still working (income not covering expenses) but fires on
 * every retiree, since cashFlow only tracks income minus expenses and
 * retirement income is drawn from investments/super rather than "income".
 * So cash-flow checks apply only to the pre-retirement window, and the
 * post-retirement window is judged by whether the portfolio actually
 * depletes.
 */
function assessSustainability(
  states: FinancialState[],
  retirementDate: Date | null,
): boolean {
  if (states.length === 0) {
    return false;
  }

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
