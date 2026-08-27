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
import type {
  EnhancedSimulationResult,
  FinancialState,
  SimulationResult,
} from "../../types/financial.ts";
import type { Milestone } from "../../types/milestones.ts";
import { isFinanciallySustainable } from "../../lib/result_utils.ts";

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
  result: SimulationResult | EnhancedSimulationResult,
  milestones: Milestone[],
): TimelineProjection {
  return {
    sessionId,
    version,
    lastUpdated: new Date(),
    states: result.states,
    milestones,
    // Carried through so clients don't have to re-derive them (and so
    // safety-relevant warnings like "retirement not achievable" actually
    // reach the UI) - transitionPoints/periods only exist when the run
    // used transitions (EnhancedSimulationResult).
    warnings: result.warnings,
    transitionPoints: "transitionPoints" in result
      ? result.transitionPoints
      : undefined,
    periods: "periods" in result ? result.periods : undefined,
    events: result.events,
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
 * Thin wrapper around result_utils.isFinanciallySustainable - the single
 * source of truth also used by SimulationEngine.checkSustainability (which
 * backs result.isSustainable), so every API surface agrees on the same
 * verdict for the same simulation rather than this projection layer
 * silently disagreeing with the cached session result.
 */
export function assessSustainability(
  states: FinancialState[],
  _retirementDate: Date | null,
): boolean {
  return isFinanciallySustainable(states);
}
