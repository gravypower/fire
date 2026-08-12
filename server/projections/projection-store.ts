/**
 * In-memory projection store implementation
 */

import type { 
  ProjectionStore,
  Projection
} from "../interfaces/projections.ts";

/**
 * Projection store entry for internal storage
 */
interface ProjectionStoreEntry {
  sessionId: string;
  type: string;
  projection: Projection;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * In-memory projection store implementation
 */
export class InMemoryProjectionStore implements ProjectionStore {
  private store = new Map<string, ProjectionStoreEntry>();

  async get<T extends Projection>(sessionId: string, type: string): Promise<T | null> {
    const key = this.getKey(sessionId, type);
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    return entry.projection as T;
  }

  async save<T extends Projection>(projection: T, type: string): Promise<void> {
    const key = this.getKey(projection.sessionId, type);
    const now = new Date();
    
    const existingEntry = this.store.get(key);
    const entry: ProjectionStoreEntry = {
      sessionId: projection.sessionId,
      type,
      projection,
      createdAt: existingEntry?.createdAt || now,
      updatedAt: now,
    };

    this.store.set(key, entry);
  }

  async delete(sessionId: string, type: string): Promise<void> {
    const key = this.getKey(sessionId, type);
    this.store.delete(key);
  }

  async clearSession(sessionId: string): Promise<void> {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.store.entries()) {
      if (entry.sessionId === sessionId) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
    }
  }

  /**
   * Get all projections for a session
   */
  async getSessionProjections(sessionId: string): Promise<{ type: string; projection: Projection }[]> {
    const projections: { type: string; projection: Projection }[] = [];
    
    for (const entry of this.store.values()) {
      if (entry.sessionId === sessionId) {
        projections.push({
          type: entry.type,
          projection: entry.projection,
        });
      }
    }

    return projections;
  }

  /**
   * Get store statistics
   */
  async getStats(): Promise<{
    totalProjections: number;
    projectionsByType: Record<string, number>;
    sessionCount: number;
    memoryUsageMB: number;
  }> {
    const projectionsByType: Record<string, number> = {};
    const sessions = new Set<string>();

    for (const entry of this.store.values()) {
      projectionsByType[entry.type] = (projectionsByType[entry.type] || 0) + 1;
      sessions.add(entry.sessionId);
    }

    return {
      totalProjections: this.store.size,
      projectionsByType,
      sessionCount: sessions.size,
      memoryUsageMB: this.estimateMemoryUsage(),
    };
  }

  /**
   * Clean up old projections (if needed for memory management)
   */
  async cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoffTime = new Date(Date.now() - maxAgeMs);
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (entry.updatedAt < cutoffTime) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
    }

    return keysToDelete.length;
  }

  private getKey(sessionId: string, type: string): string {
    return `${sessionId}:${type}`;
  }

  private estimateMemoryUsage(): number {
    // Rough estimate: each projection is about 2KB on average
    return (this.store.size * 2048) / (1024 * 1024);
  }

  /**
   * Destroy the store and clean up resources
   */
  destroy(): void {
    this.store.clear();
  }
}