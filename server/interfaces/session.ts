/**
 * Session management interfaces for the event-sourced financial simulation system
 */

import type {
  EnhancedSimulationResult,
  ParameterTransition,
  SimulationResult,
  UserParameters,
} from "../../types/financial.ts";
import type { Milestone } from "../../types/milestones.ts";

/**
 * Session context information
 */
export interface SessionContext {
  /** Unique session identifier */
  sessionId: string;
  /** Optional user identifier */
  userId?: string;
  /** When the session was created */
  createdAt: Date;
  /** When the session was last accessed */
  lastAccessedAt: Date;
  /** When the session expires */
  expiresAt: Date;
  /** Current user parameters */
  parameters: UserParameters;
  /** Current parameter transitions (life-stage changes over time) */
  transitions: ParameterTransition[];
  /** Session metadata */
  metadata: Record<string, any>;
  /** Most recent simulation result, cached so projections can be reshaped
   *  without re-simulating. EnhancedSimulationResult when the run used
   *  transitions (carries transitionPoints/periods too). */
  result?: SimulationResult | EnhancedSimulationResult;
  /** Milestones detected from the most recent result */
  milestones?: Milestone[];
  /** Incremented each time a new result is cached; used as the projection version */
  resultVersion: number;
}

/**
 * Session configuration
 */
export interface SessionConfig {
  /** Session timeout in milliseconds */
  timeoutMs: number;
  /** Maximum number of concurrent sessions */
  maxSessions: number;
  /** Cleanup interval in milliseconds */
  cleanupIntervalMs: number;
}

/**
 * Session manager interface
 */
export interface SessionManager {
  /** Create a new session */
  createSession(
    userId?: string,
    parameters?: UserParameters,
    transitions?: ParameterTransition[],
  ): Promise<SessionContext>;

  /** Get session by ID */
  getSession(sessionId: string): Promise<SessionContext | null>;

  /** Update session last accessed time */
  touchSession(sessionId: string): Promise<void>;

  /** Update session parameters */
  updateSessionParameters(
    sessionId: string,
    parameters: Partial<UserParameters>,
  ): Promise<void>;

  /** Wholesale-replace session parameters and transitions (last-write-wins) */
  updateSessionConfiguration(
    sessionId: string,
    parameters: UserParameters,
    transitions: ParameterTransition[],
  ): Promise<void>;

  /** Cache the latest simulation result and detected milestones for a session */
  updateSessionResult(
    sessionId: string,
    result: SimulationResult,
    milestones: Milestone[],
  ): Promise<void>;

  /** Delete a session */
  deleteSession(sessionId: string): Promise<void>;

  /** Clean up expired sessions */
  cleanupExpiredSessions(): Promise<number>;

  /** Get all active sessions */
  getActiveSessions(): Promise<SessionContext[]>;

  /** Check if session exists and is valid */
  isValidSession(sessionId: string): Promise<boolean>;
}

/**
 * Session statistics
 */
export interface SessionStats {
  /** Total active sessions */
  activeSessions: number;
  /** Memory usage in MB */
  memoryUsageMB: number;
  /** Oldest session age in minutes */
  oldestSessionAgeMinutes: number;
}
