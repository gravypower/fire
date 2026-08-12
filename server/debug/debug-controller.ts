/**
 * Debug controller for event inspection and replay endpoints
 */

import type { EventCache } from "../interfaces/cache.ts";
import { EventReplayService, type EventFilter, type ReplayResult, type EventSearchResult } from "../events/event-replay-service.ts";
import type { FinancialEvent } from "../interfaces/events.ts";

/**
 * Debug endpoint request/response types
 */
export interface ReplayRequest {
  sessionId: string;
  timeRange?: {
    from: string; // ISO date string
    to: string;   // ISO date string
  };
  versionRange?: {
    from: number;
    to: number;
  };
  includeSteps?: boolean;
  filter?: Omit<EventFilter, 'dateRange'> & {
    dateRange?: {
      from: string; // ISO date string
      to: string;   // ISO date string
    };
  };
}

export interface EventSearchRequest {
  sessionId: string;
  filter: Omit<EventFilter, 'dateRange'> & {
    dateRange?: {
      from: string; // ISO date string
      to: string;   // ISO date string
    };
  };
}

export interface EventDetailsRequest {
  sessionId: string;
  eventId: string;
  contextSize?: number;
}

export interface StateComparisonRequest {
  sessionId: string;
  fromVersion: number;
  toVersion: number;
}

export interface SessionEventsRequest {
  sessionId: string;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'version' | 'type';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Debug response wrapper
 */
export interface DebugResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  executionTimeMs: number;
}

/**
 * Debug controller for event inspection and replay
 */
export class DebugController {
  private replayService: EventReplayService;

  constructor(private eventCache: EventCache) {
    this.replayService = new EventReplayService(eventCache);
  }

  /**
   * Replay events with step-by-step reconstruction
   */
  async replayEvents(request: ReplayRequest): Promise<DebugResponse<ReplayResult>> {
    const startTime = Date.now();
    
    try {
      // Convert string dates to Date objects
      const options: Parameters<typeof this.replayService.replayEvents>[1] = {
        includeSteps: request.includeSteps,
        versionRange: request.versionRange,
      };

      if (request.timeRange) {
        options.timeRange = {
          from: new Date(request.timeRange.from),
          to: new Date(request.timeRange.to),
        };
      }

      if (request.filter) {
        const { dateRange, ...restFilter } = request.filter;
        const filter: EventFilter = { ...restFilter };
        if (dateRange) {
          filter.dateRange = {
            from: new Date(dateRange.from),
            to: new Date(dateRange.to),
          };
        }
        options.filter = filter;
      }

      const result = await this.replayService.replayEvents(request.sessionId, options);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Search and filter events
   */
  async searchEvents(request: EventSearchRequest): Promise<DebugResponse<EventSearchResult>> {
    const startTime = Date.now();
    
    try {
      const { dateRange, ...restFilter } = request.filter;
      const filter: EventFilter = { ...restFilter };
      if (dateRange) {
        filter.dateRange = {
          from: new Date(dateRange.from),
          to: new Date(dateRange.to),
        };
      }

      const result = await this.replayService.searchEvents(request.sessionId, filter);

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get detailed event information with context
   */
  async getEventDetails(request: EventDetailsRequest): Promise<DebugResponse<Awaited<ReturnType<EventReplayService['getEventDetails']>>>> {
    const startTime = Date.now();
    
    try {
      const result = await this.replayService.getEventDetails(
        request.sessionId,
        request.eventId,
        request.contextSize
      );

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Compare states between two versions
   */
  async compareStates(request: StateComparisonRequest): Promise<DebugResponse<Awaited<ReturnType<EventReplayService['compareStates']>>>> {
    const startTime = Date.now();
    
    try {
      const result = await this.replayService.compareStates(
        request.sessionId,
        request.fromVersion,
        request.toVersion
      );

      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get all events for a session with pagination and sorting
   */
  async getSessionEvents(request: SessionEventsRequest): Promise<DebugResponse<{
    events: FinancialEvent[];
    totalCount: number;
    hasMore: boolean;
    pagination: {
      limit: number;
      offset: number;
      totalPages: number;
      currentPage: number;
    };
  }>> {
    const startTime = Date.now();
    
    try {
      const limit = request.limit || 50;
      const offset = request.offset || 0;
      const sortBy = request.sortBy || 'timestamp';
      const sortOrder = request.sortOrder || 'asc';

      let events = await this.eventCache.getEvents(request.sessionId);

      // Sort events
      events.sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'timestamp':
            comparison = a.timestamp.getTime() - b.timestamp.getTime();
            break;
          case 'version':
            comparison = a.version - b.version;
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
        }

        return sortOrder === 'desc' ? -comparison : comparison;
      });

      const totalCount = events.length;
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = Math.floor(offset / limit) + 1;

      // Apply pagination
      const paginatedEvents = events.slice(offset, offset + limit);
      const hasMore = offset + limit < totalCount;

      return {
        success: true,
        data: {
          events: paginatedEvents,
          totalCount,
          hasMore,
          pagination: {
            limit,
            offset,
            totalPages,
            currentPage,
          },
        },
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Get session statistics and health information
   */
  async getSessionStats(sessionId: string): Promise<DebugResponse<{
    sessionId: string;
    eventCount: number;
    eventTypes: Record<string, number>;
    timeRange: {
      firstEvent: Date | null;
      lastEvent: Date | null;
      spanDays: number;
    };
    versionRange: {
      min: number;
      max: number;
    };
    cacheStats: Awaited<ReturnType<EventCache['getStats']>>;
  }>> {
    const startTime = Date.now();
    
    try {
      const events = await this.eventCache.getEvents(sessionId);
      const cacheStats = await this.eventCache.getStats();

      // Count event types
      const eventTypes: Record<string, number> = {};
      for (const event of events) {
        eventTypes[event.type] = (eventTypes[event.type] || 0) + 1;
      }

      // Calculate time range
      const firstEvent = events.length > 0 ? events[0].timestamp : null;
      const lastEvent = events.length > 0 ? events[events.length - 1].timestamp : null;
      const spanDays = firstEvent && lastEvent 
        ? Math.ceil((lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      // Calculate version range
      const versions = events.map(e => e.version);
      const versionRange = {
        min: versions.length > 0 ? Math.min(...versions) : 0,
        max: versions.length > 0 ? Math.max(...versions) : 0,
      };

      return {
        success: true,
        data: {
          sessionId,
          eventCount: events.length,
          eventTypes,
          timeRange: {
            firstEvent,
            lastEvent,
            spanDays,
          },
          versionRange,
          cacheStats,
        },
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Validate event integrity for a session
   */
  async validateEventIntegrity(sessionId: string): Promise<DebugResponse<{
    isValid: boolean;
    issues: Array<{
      type: 'missing_version' | 'duplicate_version' | 'invalid_timestamp' | 'missing_metadata' | 'invalid_data';
      eventId: string;
      description: string;
      severity: 'error' | 'warning';
    }>;
    summary: {
      totalEvents: number;
      validEvents: number;
      errorCount: number;
      warningCount: number;
    };
  }>> {
    const startTime = Date.now();
    
    try {
      const events = await this.eventCache.getEvents(sessionId);
      const issues: Array<{
        type: 'missing_version' | 'duplicate_version' | 'invalid_timestamp' | 'missing_metadata' | 'invalid_data';
        eventId: string;
        description: string;
        severity: 'error' | 'warning';
      }> = [];

      // Check for version gaps and duplicates
      const versions = events.map(e => e.version).sort((a, b) => a - b);
      const versionSet = new Set(versions);
      
      if (versions.length !== versionSet.size) {
        // Find duplicates
        const seen = new Set<number>();
        for (const version of versions) {
          if (seen.has(version)) {
            const duplicateEvents = events.filter(e => e.version === version);
            for (const event of duplicateEvents) {
              issues.push({
                type: 'duplicate_version',
                eventId: event.id,
                description: `Duplicate version ${version} found`,
                severity: 'error',
              });
            }
          }
          seen.add(version);
        }
      }

      // Check each event
      for (const event of events) {
        // Check required fields
        if (!event.id || !event.sessionId || !event.type || !event.aggregateId) {
          issues.push({
            type: 'missing_metadata',
            eventId: event.id || 'unknown',
            description: 'Missing required event fields',
            severity: 'error',
          });
        }

        // Check timestamp validity
        if (!event.timestamp || isNaN(event.timestamp.getTime())) {
          issues.push({
            type: 'invalid_timestamp',
            eventId: event.id,
            description: 'Invalid or missing timestamp',
            severity: 'error',
          });
        }

        // Check data validity
        if (!event.data || typeof event.data !== 'object') {
          issues.push({
            type: 'invalid_data',
            eventId: event.id,
            description: 'Missing or invalid event data',
            severity: 'error',
          });
        }

        // Check metadata
        if (!event.metadata) {
          issues.push({
            type: 'missing_metadata',
            eventId: event.id,
            description: 'Missing event metadata',
            severity: 'warning',
          });
        }
      }

      const errorCount = issues.filter(i => i.severity === 'error').length;
      const warningCount = issues.filter(i => i.severity === 'warning').length;
      const validEvents = events.length - errorCount;
      const isValid = errorCount === 0;

      return {
        success: true,
        data: {
          isValid,
          issues,
          summary: {
            totalEvents: events.length,
            validEvents,
            errorCount,
            warningCount,
          },
        },
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
        executionTimeMs: Date.now() - startTime,
      };
    }
  }
}