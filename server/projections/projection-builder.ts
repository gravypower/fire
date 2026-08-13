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
 * any 3+ consecutive periods of negative cash flow, which fires on every
 * retiree since cashFlow only tracks income minus expenses and retirement
 * income is drawn from investments/super rather than "income". A boundary
 * of "before the achieved retirement date" doesn't fix this either: when a
 * target retirement age isn't affordable, the engine keeps searching for
 * the earliest affordable age, so there can be a real gap where income has
 * already stopped (age hits the configured retirement age) before the
 * model confirms retirement is "safely achieved" - cashFlow is negative
 * throughout that gap even though assets are growing fine.
 *
 * So instead of counting negative-cashFlow streaks, judge sustainability
 * by whether the portfolio (investments + super) actually runs out: it's
 * fine to start the simulation at zero (someone just beginning to save),
 * but once it's built up, hitting zero again means the plan ran out of
 * money.
 */
export function assessSustainability(
  states: FinancialState[],
  _retirementDate: Date | null,
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

  // Once the portfolio has built up meaningfully, it shouldn't hit zero -
  // that's the plan running out of money, as opposed to just starting from
  // zero savings.
  let everHadMeaningfulPortfolio = false;
  for (const state of states) {
    const portfolio = state.investments + state.superannuation;
    if (portfolio > 1000) {
      everHadMeaningfulPortfolio = true;
    } else if (everHadMeaningfulPortfolio && portfolio <= 0) {
      return false;
    }
  }

  return true;
}
