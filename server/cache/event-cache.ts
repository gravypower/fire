/**
 * In-memory event cache implementation
 */

import type { 
  EventCache, 
  EventCacheEntry, 
  CacheConfig, 
  CacheStats 
} from "../interfaces/cache.ts";
import type { FinancialEvent } from "../interfaces/events.ts";

/**
 * Default cache configuration
 */
const DEFAULT_CONFIG: CacheConfig = {
  maxSessions: 1000,
  maxEventsPerSession: 10000,
  sessionTimeoutMs: 30 * 60 * 1000, // 30 minutes
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
  enableStats: true,
};

/**
 * In-memory event cache implementation
 */
export class InMemoryEventCache implements EventCache {
  private cache = new Map<string, EventCacheEntry>();
  private config: CacheConfig;
  private stats = {
    hits: 0,
    misses: 0,
  };
  private cleanupTimer?: number;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  async appendEvents(sessionId: string, events: FinancialEvent[]): Promise<void> {
    let entry = this.cache.get(sessionId);
    
    if (!entry) {
      await this.createSession(sessionId);
      entry = this.cache.get(sessionId)!;
    }

    // Check event limit
    if (entry.events.length + events.length > this.config.maxEventsPerSession) {
      throw new Error(`Session ${sessionId} would exceed maximum events limit`);
    }

    // Append events in chronological order
    entry.events.push(...events);
    entry.events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // Update access time
    entry.lastAccessedAt = new Date();
    entry.expiresAt = new Date(Date.now() + this.config.sessionTimeoutMs);
  }

  async getEvents(sessionId: string, fromVersion?: number): Promise<FinancialEvent[]> {
    const entry = this.cache.get(sessionId);
    
    if (!entry) {
      this.updateStats('miss');
      return [];
    }

    // Check if session has expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(sessionId);
      this.updateStats('miss');
      return [];
    }

    this.updateStats('hit');
    entry.lastAccessedAt = new Date();

    if (fromVersion !== undefined) {
      return entry.events.filter(event => event.version >= fromVersion);
    }

    return [...entry.events];
  }

  async getEventsByType(sessionId: string, eventType: string): Promise<FinancialEvent[]> {
    const events = await this.getEvents(sessionId);
    return events.filter(event => event.type === eventType);
  }

  async getEventsByDateRange(sessionId: string, from: Date, to: Date): Promise<FinancialEvent[]> {
    const events = await this.getEvents(sessionId);
    return events.filter(event => 
      event.timestamp >= from && event.timestamp <= to
    );
  }

  async clearSession(sessionId: string): Promise<void> {
    this.cache.delete(sessionId);
  }

  async createSession(sessionId: string): Promise<void> {
    // Check session limit
    if (this.cache.size >= this.config.maxSessions) {
      await this.cleanupExpiredSessions();
      if (this.cache.size >= this.config.maxSessions) {
        throw new Error('Maximum number of sessions reached in cache');
      }
    }

    const now = new Date();
    const entry: EventCacheEntry = {
      sessionId,
      events: [],
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + this.config.sessionTimeoutMs),
    };

    this.cache.set(sessionId, entry);
  }

  async sessionExists(sessionId: string): Promise<boolean> {
    const entry = this.cache.get(sessionId);
    if (!entry) {
      return false;
    }

    // Check if expired
    if (new Date() > entry.expiresAt) {
      this.cache.delete(sessionId);
      return false;
    }

    return true;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  async getStats(): Promise<CacheStats> {
    await this.cleanupExpiredSessions();
    
    const entries = Array.from(this.cache.values());
    const totalEvents = entries.reduce((sum, entry) => sum + entry.events.length, 0);
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      totalSessions: entries.length,
      totalEvents,
      memoryUsageMB: this.estimateMemoryUsage(),
      hitRate,
      averageEventsPerSession: entries.length > 0 ? totalEvents / entries.length : 0,
    };
  }

  private updateStats(type: 'hit' | 'miss'): void {
    if (this.config.enableStats) {
      this.stats[type === 'hit' ? 'hits' : 'misses']++;
    }
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const entry of this.cache.values()) {
      // Rough estimate: each event is about 500 bytes
      totalSize += entry.events.length * 500;
      // Plus entry overhead
      totalSize += 1024;
    }

    return totalSize / (1024 * 1024);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, this.config.cleanupIntervalMs);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cache.clear();
  }
}