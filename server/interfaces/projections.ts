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
 * Performance metrics projection
 */
export interface PerformanceProjection extends Projection {
  /** Calculation performance metrics */
  metrics: {
    totalEvents: number;
    processingTimeMs: number;
    eventsPerSecond: number;
    memoryUsageMB: number;
  };
  /** Event type distribution */
  eventDistribution: Record<string, number>;
  /** Processing bottlenecks */
  bottlenecks: string[];
}

/**
 * Projection builder interface
 */
export interface ProjectionBuilder<T extends Projection> {
  /** Build projection from events */
  build(sessionId: string): Promise<T>;
  /** Update projection with new events */
  update(projection: T, events: any[]): Promise<T>;
  /** Rebuild projection from scratch */
  rebuild(sessionId: string): Promise<T>;
}

/**
 * Projection store interface
 */
export interface ProjectionStore {
  /** Get projection by session and type */
  get<T extends Projection>(sessionId: string, type: string): Promise<T | null>;
  /** Save projection */
  save<T extends Projection>(projection: T, type: string): Promise<void>;
  /** Delete projection */
  delete(sessionId: string, type: string): Promise<void>;
  /** Clear all projections for session */
  clearSession(sessionId: string): Promise<void>;
  /** Get store statistics (optional) */
  getStats?(): Promise<{
    totalProjections: number;
    projectionsByType: Record<string, number>;
    sessionCount: number;
    memoryUsageMB: number;
  }>;
  /** Cleanup old projections (optional) */
  cleanup?(maxAgeMs: number): Promise<number>;
}

/**
 * Projection type registry
 */
export const PROJECTION_TYPES = {
  FINANCIAL: 'financial',
  TIMELINE: 'timeline',
  MILESTONE: 'milestone',
  PERFORMANCE: 'performance',
} as const;