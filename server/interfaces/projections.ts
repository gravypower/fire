/**
 * Projection interfaces for the event-sourced financial simulation system
 */

import type { FinancialState } from "../../types/financial.ts";
import type { Milestone } from "../../types/milestones.ts";

/**
 * Base projection interface
 */
export interface Projection {
  /** Session this projection belongs to */
  sessionId: string;
  /** Version number (matches latest event version) */
  version: number;
  /** When this projection was last updated */
  lastUpdated: Date;
}

/**
 * Current financial state projection
 */
export interface FinancialProjection extends Projection {
  /** Current financial state */
  currentState: {
    cash: number;
    investments: number;
    superannuation: number;
    loanBalance: number;
    offsetBalance: number;
    netWorth: number;
    cashFlow: number;
    date: Date;
  };
  /** Detailed balance breakdown */
  balanceBreakdown: {
    loanBalances: Record<string, number>;
    superBalances: Record<string, number>;
    offsetBalances: Record<string, number>;
    investmentBalances: Record<string, number>;
  };
}

/**
 * Timeline projection for charts and analysis
 */
export interface TimelineProjection extends Projection {
  /** Array of financial states over time */
  states: FinancialState[];
  /** Detected milestones */
  milestones: Milestone[];
  /** Retirement analysis */
  retirementAnalysis: {
    retirementDate: Date | null;
    retirementAge: number | null;
    isSustainable: boolean;
  };
}

/**
 * Milestone-focused projection
 */
export interface MilestoneProjection extends Projection {
  /** All detected milestones */
  milestones: Milestone[];
  /** Milestone summary by type */
  milestonesByType: Record<string, Milestone[]>;
  /** Key financial milestones */
  keyMilestones: {
    debtFreeDate?: Date;
    retirementDate?: Date;
    firstMillionDate?: Date;
    cashFlowPositiveDate?: Date;
  };
}

/**
 * Projection type registry
 */
export const PROJECTION_TYPES = {
  FINANCIAL: 'financial',
  TIMELINE: 'timeline',
  MILESTONE: 'milestone',
} as const;