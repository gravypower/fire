/**
 * Event replay service for debugging and state reconstruction
 */

import type { FinancialEvent } from "../interfaces/events.ts";
import type { EventCache } from "../interfaces/cache.ts";
import { FinancialProjectionBuilder } from "../projections/projection-builder.ts";
import type { FinancialProjection } from "../interfaces/projections.ts";

/**
 * Event filter criteria for searching and filtering events
 */
export interface EventFilter {
  /** Filter by event types */
  eventTypes?: string[];
  /** Filter by date range */
  dateRange?: {
    from: Date;
    to: Date;
  };
  /** Filter by version range */
  versionRange?: {
    from: number;
    to: number;
  };
  /** Filter by aggregate ID */
  aggregateId?: string;
  /** Filter by correlation ID */
  correlationId?: string;
  /** Filter by causation ID */
  causationId?: string;
  /** Filter by user ID */
  userId?: string;
  /** Text search in event data */
  textSearch?: string;
  /** Filter by minimum amount (for financial events) */
  minAmount?: number;
  /** Filter by maximum amount (for financial events) */
  maxAmount?: number;
}

/**
 * Replay step containing event and resulting state
 */
export interface ReplayStep {
  /** The event being applied */
  event: FinancialEvent;
  /** State before applying this event */
  stateBefore: FinancialProjection['currentState'];
  /** State after applying this event */
  stateAfter: FinancialProjection['currentState'];
  /** Balance breakdown after applying this event */
  balanceBreakdown: FinancialProjection['balanceBreakdown'];
  /** Step number in the replay sequence */
  stepNumber: number;
  /** Timestamp when this step was processed */
  processedAt: Date;
}

/**
 * Replay result containing all steps and final state
 */
export interface ReplayResult {
  /** Session ID this replay belongs to */
  sessionId: string;
  /** All replay steps in chronological order */
  steps: ReplayStep[];
  /** Final state after all events */
  finalState: FinancialProjection['currentState'];
  /** Final balance breakdown */
  finalBalanceBreakdown: FinancialProjection['balanceBreakdown'];
  /** Total number of events replayed */
  totalEvents: number;
  /** Time range of replayed events */
  timeRange: {
    from: Date;
    to: Date;
  };
  /** Replay execution metadata */
  metadata: {
    startedAt: Date;
    completedAt: Date;
    durationMs: number;
  };
}

/**
 * Event search result
 */
export interface EventSearchResult {
  /** Matching events */
  events: FinancialEvent[];
  /** Total count of matching events */
  totalCount: number;
  /** Search criteria used */
  filter: EventFilter;
  /** Search execution time */
  executionTimeMs: number;
}

/**
 * Event replay service for debugging and analysis
 */
export class EventReplayService {
  private projectionBuilder: FinancialProjectionBuilder;

  constructor(private eventCache: EventCache) {
    this.projectionBuilder = new FinancialProjectionBuilder(eventCache);
  }

  /**
   * Replay events for a session within a time range with step-by-step reconstruction
   */
  async replayEvents(
    sessionId: string,
    options: {
      timeRange?: { from: Date; to: Date };
      versionRange?: { from: number; to: number };
      includeSteps?: boolean;
      filter?: EventFilter;
    } = {}
  ): Promise<ReplayResult> {
    const startTime = Date.now();
    const startedAt = new Date();

    // Get events based on criteria
    let events = await this.getFilteredEvents(sessionId, options.filter);

    // Apply time range filter if specified
    if (options.timeRange) {
      events = events.filter(event => 
        event.timestamp >= options.timeRange!.from && 
        event.timestamp <= options.timeRange!.to
      );
    }

    // Apply version range filter if specified
    if (options.versionRange) {
      events = events.filter(event => 
        event.version >= options.versionRange!.from && 
        event.version <= options.versionRange!.to
      );
    }

    // Sort events chronologically
    events.sort((a, b) => {
      const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
      if (timeDiff !== 0) return timeDiff;
      // If timestamps are equal, sort by version
      return a.version - b.version;
    });

    const steps: ReplayStep[] = [];
    let currentState: FinancialProjection['currentState'] = {
      cash: 0,
      investments: 0,
      superannuation: 0,
      loanBalance: 0,
      offsetBalance: 0,
      netWorth: 0,
      cashFlow: 0,
      date: new Date(),
    };

    let currentBreakdown: FinancialProjection['balanceBreakdown'] = {
      loanBalances: {},
      superBalances: {},
      offsetBalances: {},
      investmentBalances: {},
    };

    // Replay events step by step if requested
    if (options.includeSteps !== false) {
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const stateBefore = { ...currentState };

        // Apply event to get new state
        const tempProjection: FinancialProjection = {
          sessionId,
          version: event.version,
          lastUpdated: new Date(),
          currentState: currentState,
          balanceBreakdown: currentBreakdown,
        };

        const updatedProjection = await this.projectionBuilder.update(tempProjection, [event]);
        currentState = updatedProjection.currentState;
        currentBreakdown = updatedProjection.balanceBreakdown;

        steps.push({
          event,
          stateBefore,
          stateAfter: { ...currentState },
          balanceBreakdown: {
            loanBalances: { ...currentBreakdown.loanBalances },
            superBalances: { ...currentBreakdown.superBalances },
            offsetBalances: { ...currentBreakdown.offsetBalances },
            investmentBalances: { ...currentBreakdown.investmentBalances },
          },
          stepNumber: i + 1,
          processedAt: new Date(),
        });
      }
    } else {
      // Just calculate final state without steps
      if (events.length > 0) {
        // Build state from filtered events, not all events in session
        for (const event of events) {
          const tempProjection: FinancialProjection = {
            sessionId,
            version: event.version,
            lastUpdated: new Date(),
            currentState: currentState,
            balanceBreakdown: currentBreakdown,
          };

          const updatedProjection = await this.projectionBuilder.update(tempProjection, [event]);
          currentState = updatedProjection.currentState;
          currentBreakdown = updatedProjection.balanceBreakdown;
        }
      }
    }

    const completedAt = new Date();
    const durationMs = Date.now() - startTime;

    // Determine time range
    const timeRange = events.length > 0 ? {
      from: events[0].timestamp,
      to: events[events.length - 1].timestamp,
    } : {
      from: new Date(),
      to: new Date(),
    };

    return {
      sessionId,
      steps,
      finalState: currentState,
      finalBalanceBreakdown: currentBreakdown,
      totalEvents: events.length,
      timeRange,
      metadata: {
        startedAt,
        completedAt,
        durationMs,
      },
    };
  }

  /**
   * Search and filter events based on criteria
   */
  async searchEvents(sessionId: string, filter: EventFilter): Promise<EventSearchResult> {
    const startTime = Date.now();

    const events = await this.getFilteredEvents(sessionId, filter);

    const executionTimeMs = Date.now() - startTime;

    return {
      events,
      totalCount: events.length,
      filter,
      executionTimeMs,
    };
  }

  /**
   * Get event details with context (previous and next events)
   */
  async getEventDetails(
    sessionId: string, 
    eventId: string, 
    contextSize: number = 2
  ): Promise<{
    event: FinancialEvent | null;
    previousEvents: FinancialEvent[];
    nextEvents: FinancialEvent[];
    stateBeforeEvent?: FinancialProjection['currentState'];
    stateAfterEvent?: FinancialProjection['currentState'];
  }> {
    const allEvents = await this.eventCache.getEvents(sessionId);
    const eventIndex = allEvents.findIndex(e => e.id === eventId);

    if (eventIndex === -1) {
      return {
        event: null,
        previousEvents: [],
        nextEvents: [],
      };
    }

    const event = allEvents[eventIndex];
    const previousEvents = allEvents.slice(
      Math.max(0, eventIndex - contextSize), 
      eventIndex
    );
    const nextEvents = allEvents.slice(
      eventIndex + 1, 
      Math.min(allEvents.length, eventIndex + 1 + contextSize)
    );

    // Calculate state before and after this event
    let stateBeforeEvent: FinancialProjection['currentState'] | undefined;
    let stateAfterEvent: FinancialProjection['currentState'] | undefined;

    if (eventIndex > 0) {
      const eventsBeforeThis = allEvents.slice(0, eventIndex);
      const replayResult = await this.replayEvents(sessionId, {
        versionRange: { from: 0, to: eventsBeforeThis[eventsBeforeThis.length - 1].version },
        includeSteps: false,
      });
      stateBeforeEvent = replayResult.finalState;
    }

    const replayResultAfter = await this.replayEvents(sessionId, {
      versionRange: { from: 0, to: event.version },
      includeSteps: false,
    });
    stateAfterEvent = replayResultAfter.finalState;

    return {
      event,
      previousEvents,
      nextEvents,
      stateBeforeEvent,
      stateAfterEvent,
    };
  }

  /**
   * Compare states between two points in time
   */
  async compareStates(
    sessionId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<{
    fromState: FinancialProjection['currentState'];
    toState: FinancialProjection['currentState'];
    differences: Array<{
      field: string;
      fromValue: number;
      toValue: number;
      change: number;
      percentChange: number;
    }>;
    eventsBetween: FinancialEvent[];
  }> {
    // Get states at both versions
    const fromReplay = await this.replayEvents(sessionId, {
      versionRange: { from: 0, to: fromVersion },
      includeSteps: false,
    });

    const toReplay = await this.replayEvents(sessionId, {
      versionRange: { from: 0, to: toVersion },
      includeSteps: false,
    });

    // Get events between versions
    const allEvents = await this.eventCache.getEvents(sessionId);
    const eventsBetween = allEvents.filter(e => 
      e.version > fromVersion && e.version <= toVersion
    );

    // Calculate differences
    const differences: Array<{
      field: string;
      fromValue: number;
      toValue: number;
      change: number;
      percentChange: number;
    }> = [];

    const fields = ['cash', 'investments', 'superannuation', 'loanBalance', 'offsetBalance', 'netWorth', 'cashFlow'];
    
    for (const field of fields) {
      const fromValue = fromReplay.finalState[field as keyof typeof fromReplay.finalState] as number;
      const toValue = toReplay.finalState[field as keyof typeof toReplay.finalState] as number;
      const change = toValue - fromValue;
      const percentChange = fromValue !== 0 ? (change / Math.abs(fromValue)) * 100 : 0;

      if (change !== 0) {
        differences.push({
          field,
          fromValue,
          toValue,
          change,
          percentChange,
        });
      }
    }

    return {
      fromState: fromReplay.finalState,
      toState: toReplay.finalState,
      differences,
      eventsBetween,
    };
  }

  /**
   * Get filtered events based on criteria
   */
  private async getFilteredEvents(sessionId: string, filter?: EventFilter): Promise<FinancialEvent[]> {
    let events = await this.eventCache.getEvents(sessionId);

    if (!filter) {
      return events;
    }

    // Apply event type filter
    if (filter.eventTypes && filter.eventTypes.length > 0) {
      events = events.filter(event => filter.eventTypes!.includes(event.type));
    }

    // Apply date range filter
    if (filter.dateRange) {
      events = events.filter(event => 
        event.timestamp >= filter.dateRange!.from && 
        event.timestamp <= filter.dateRange!.to
      );
    }

    // Apply version range filter
    if (filter.versionRange) {
      events = events.filter(event => 
        event.version >= filter.versionRange!.from && 
        event.version <= filter.versionRange!.to
      );
    }

    // Apply aggregate ID filter
    if (filter.aggregateId) {
      events = events.filter(event => event.aggregateId === filter.aggregateId);
    }

    // Apply correlation ID filter
    if (filter.correlationId) {
      events = events.filter(event => event.metadata.correlationId === filter.correlationId);
    }

    // Apply causation ID filter
    if (filter.causationId) {
      events = events.filter(event => event.metadata.causationId === filter.causationId);
    }

    // Apply user ID filter
    if (filter.userId) {
      events = events.filter(event => event.metadata.userId === filter.userId);
    }

    // Apply text search filter
    if (filter.textSearch) {
      const searchTerm = filter.textSearch.toLowerCase();
      events = events.filter(event => {
        const eventJson = JSON.stringify(event).toLowerCase();
        return eventJson.includes(searchTerm);
      });
    }

    // Apply amount filters for financial events
    if (filter.minAmount !== undefined || filter.maxAmount !== undefined) {
      events = events.filter(event => {
        const amount = this.extractAmountFromEvent(event);
        if (amount === null) return false;
        
        if (filter.minAmount !== undefined && amount < filter.minAmount) return false;
        if (filter.maxAmount !== undefined && amount > filter.maxAmount) return false;
        
        return true;
      });
    }

    return events;
  }

  /**
   * Extract amount from event data for filtering
   */
  private extractAmountFromEvent(event: FinancialEvent): number | null {
    const data = event.data;
    
    // Try common amount fields
    if (typeof data.amount === 'number') return Math.abs(data.amount);
    if (typeof data.grossAmount === 'number') return Math.abs(data.grossAmount);
    if (typeof data.netAmount === 'number') return Math.abs(data.netAmount);
    if (typeof data.paymentAmount === 'number') return Math.abs(data.paymentAmount);
    if (typeof data.principalAmount === 'number') return Math.abs(data.principalAmount);
    if (typeof data.interestAmount === 'number') return Math.abs(data.interestAmount);
    if (typeof data.growthAmount === 'number') return Math.abs(data.growthAmount);
    if (typeof data.taxAmount === 'number') return Math.abs(data.taxAmount);
    
    return null;
  }
}