/**
 * Aggregate repository implementation for financial aggregates
 */

import type { FinancialAggregate, AggregateRepository } from "../interfaces/aggregate.ts";
import type { EventCache } from "../interfaces/cache.ts";
import { FinancialAggregateRoot } from "./financial-aggregate.ts";

/**
 * In-memory aggregate repository implementation
 */
export class InMemoryAggregateRepository implements AggregateRepository<FinancialAggregate> {
  private aggregates = new Map<string, FinancialAggregate>();

  constructor(private eventCache: EventCache) {}

  async getById(aggregateId: string, sessionId: string): Promise<FinancialAggregate> {
    const key = this.getAggregateKey(aggregateId, sessionId);
    
    let aggregate = this.aggregates.get(key);
    
    if (!aggregate) {
      // Create new aggregate and replay events if they exist
      aggregate = new FinancialAggregateRoot(aggregateId, sessionId);
      
      // Check if there are existing events for this aggregate
      if (await this.eventCache.sessionExists(sessionId)) {
        const events = await this.eventCache.getEvents(sessionId);
        const aggregateEvents = events.filter(e => e.aggregateId === aggregateId);
        
        if (aggregateEvents.length > 0) {
          aggregate.replayEvents(aggregateEvents);
        }
      }
      
      this.aggregates.set(key, aggregate);
    }
    
    return aggregate;
  }

  async save(aggregate: FinancialAggregate): Promise<void> {
    const key = this.getAggregateKey(aggregate.id, aggregate.sessionId);
    
    // Get uncommitted events and save them to the event cache
    const uncommittedEvents = aggregate.getUncommittedEvents();
    
    if (uncommittedEvents.length > 0) {
      // Ensure session exists in cache
      if (!(await this.eventCache.sessionExists(aggregate.sessionId))) {
        await this.eventCache.createSession(aggregate.sessionId);
      }
      
      // Append events to cache
      await this.eventCache.appendEvents(aggregate.sessionId, uncommittedEvents);
      
      // Mark events as committed
      aggregate.markEventsAsCommitted();
    }
    
    // Update aggregate in memory
    this.aggregates.set(key, aggregate);
  }

  async create(sessionId: string): Promise<FinancialAggregate> {
    const aggregateId = 'financial'; // Single financial aggregate per session
    const key = this.getAggregateKey(aggregateId, sessionId);
    
    // Check if aggregate already exists
    if (this.aggregates.has(key)) {
      throw new Error(`Aggregate already exists for session ${sessionId}`);
    }
    
    // Create new aggregate
    const aggregate = new FinancialAggregateRoot(aggregateId, sessionId);
    
    // Ensure session exists in event cache
    if (!(await this.eventCache.sessionExists(sessionId))) {
      await this.eventCache.createSession(sessionId);
    }
    
    this.aggregates.set(key, aggregate);
    
    return aggregate;
  }

  async delete(aggregateId: string, sessionId: string): Promise<void> {
    const key = this.getAggregateKey(aggregateId, sessionId);
    
    // Remove aggregate from memory
    this.aggregates.delete(key);
    
    // Clear session from event cache
    await this.eventCache.clearSession(sessionId);
  }

  /**
   * Gets all aggregates for a session (mainly for testing/debugging)
   */
  async getBySession(sessionId: string): Promise<FinancialAggregate[]> {
    const aggregates: FinancialAggregate[] = [];
    
    for (const [, aggregate] of this.aggregates) {
      if (aggregate.sessionId === sessionId) {
        aggregates.push(aggregate);
      }
    }
    
    return aggregates;
  }

  /**
   * Cleans up expired aggregates (should be called periodically)
   */
  async cleanup(): Promise<void> {
    // For now, just clean up expired sessions from event cache
    await this.eventCache.cleanupExpiredSessions();
    
    // Remove aggregates for sessions that no longer exist
    const expiredKeys: string[] = [];
    
    for (const [, aggregate] of this.aggregates) {
      if (!(await this.eventCache.sessionExists(aggregate.sessionId))) {
        expiredKeys.push(this.getAggregateKey(aggregate.id, aggregate.sessionId));
      }
    }
    
    for (const key of expiredKeys) {
      this.aggregates.delete(key);
    }
  }

  private getAggregateKey(aggregateId: string, sessionId: string): string {
    return `${sessionId}:${aggregateId}`;
  }
}