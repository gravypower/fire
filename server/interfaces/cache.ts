/**
 * Event cache interfaces for the event-sourced financial simulation system
 */

import type { FinancialEvent } from "./events.ts";

/**
 * Event cache entry
 */
export interface EventCacheEntry {
  /** Session this entry belongs to */
  sessionId: string;
  /** Events in chronological order */
  events: FinancialEvent[];
  /** When this entry was created */
  createdAt: Date;
  /** When this entry was last accessed */
  lastAccessedAt: Date;
  /** When this entry expires */
  expiresAt: Date;
}

/**
 * Event cache interface
 */
export interface EventCache {
  /** Append events to a session's cache */
  appendEvents(sessionId: string, events: FinancialEvent[]): Promise<void>;
  
  /** Get all events for a session */
  getEvents(sessionId: string, fromVersion?: number): Promise<FinancialEvent[]>;
  
  /** Get events by type for a session */
  getEventsByType(sessionId: string, eventType: string): Promise<FinancialEvent[]>;
  
  /** Get events within a date range for a session */
  getEventsByDateRange(sessionId: string, from: Date, to: Date): Promise<FinancialEvent[]>;
  
  /** Clear all events for a session */
  clearSession(sessionId: string): Promise<void>;
  
  /** Create a new session cache */
  createSession(sessionId: string): Promise<void>;
  
  /** Check if session exists in cache */
  sessionExists(sessionId: string): Promise<boolean>;
  
  /** Clean up expired sessions */
  cleanupExpiredSessions(): Promise<number>;
  
  /** Get cache statistics */
  getStats(): Promise<CacheStats>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total number of sessions */
  totalSessions: number;
  /** Total number of events across all sessions */
  totalEvents: number;
  /** Memory usage in MB */
  memoryUsageMB: number;
  /** Cache hit rate percentage */
  hitRate: number;
  /** Average events per session */
  averageEventsPerSession: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Maximum number of sessions to keep in memory */
  maxSessions: number;
  /** Maximum events per session */
  maxEventsPerSession: number;
  /** Session timeout in milliseconds */
  sessionTimeoutMs: number;
  /** Cleanup interval in milliseconds */
  cleanupIntervalMs: number;
  /** Enable cache statistics tracking */
  enableStats: boolean;
}