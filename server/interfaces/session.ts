/**
 * Session management interfaces for the event-sourced financial simulation system
 */

import type { UserParameters } from "../../types/financial.ts";

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
  /** Session metadata */
  metadata: Record<string, any>;
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
  /** Maximum events per session */
  maxEventsPerSession: number;
}

/**
 * Session manager interface
 */
export interface SessionManager {
  /** Create a new session */
  createSession(userId?: string, parameters?: UserParameters): Promise<SessionContext>;
  
  /** Get session by ID */
  getSession(sessionId: string): Promise<SessionContext | null>;
  
  /** Update session last accessed time */
  touchSession(sessionId: string): Promise<void>;
  
  /** Update session parameters */
  updateSessionParameters(sessionId: string, parameters: Partial<UserParameters>): Promise<void>;
  
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
  /** Total events across all sessions */
  totalEvents: number;
  /** Memory usage in MB */
  memoryUsageMB: number;
  /** Oldest session age in minutes */
  oldestSessionAgeMinutes: number;
  /** Average events per session */
  averageEventsPerSession: number;
}