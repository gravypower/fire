/**
 * Projection service - coordinates projection building and storage
 */

import type { 
  FinancialProjection,
  TimelineProjection,
  MilestoneProjection,
  ProjectionStore
} from "../interfaces/projections.ts";
import type { FinancialEvent } from "../interfaces/events.ts";
import type { EventCache } from "../interfaces/cache.ts";
import type { UserParameters } from "../../types/financial.ts";

import { 
  ProjectionBuilderFactory
} from "./projection-builder.ts";
import { InMemoryProjectionStore } from "./projection-store.ts";

/**
 * Session manager interface for projection service
 */
interface SessionManager {
  getSession(sessionId: string): Promise<{ parameters?: UserParameters } | null>;
}

/**
 * Projection service configuration
 */
export interface ProjectionServiceConfig {
  autoRebuild?: boolean;
  cacheProjections?: boolean;
  maxProjectionAge?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ProjectionServiceConfig = {
  autoRebuild: true,
  cacheProjections: true,
  maxProjectionAge: 5 * 60 * 1000, // 5 minutes
};

/**
 * Main projection service
 */
export class ProjectionService {
  private builderFactory: ProjectionBuilderFactory;
  private config: ProjectionServiceConfig;

  constructor(
    private eventCache: EventCache,
    private projectionStore: ProjectionStore,
    sessionManager?: SessionManager,
    config: Partial<ProjectionServiceConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.builderFactory = new ProjectionBuilderFactory(eventCache, sessionManager);
  }

  /**
   * Get or build financial projection
   */
  async getFinancialProjection(sessionId: string, forceRebuild = false): Promise<FinancialProjection> {
    const type = 'financial';
    
    // Try to get cached projection first
    if (!forceRebuild && this.config.cacheProjections) {
      const cached = await this.projectionStore.get<FinancialProjection>(sessionId, type);
      if (cached && this.isProjectionFresh(cached)) {
        return cached;
      }
    }

    // Build new projection
    const builder = this.builderFactory.createFinancialBuilder();
    const projection = await builder.build(sessionId);

    // Cache the projection
    if (this.config.cacheProjections) {
      await this.projectionStore.save(projection, type);
    }

    return projection;
  }

  /**
   * Get or build timeline projection
   */
  async getTimelineProjection(sessionId: string, forceRebuild = false): Promise<TimelineProjection> {
    const type = 'timeline';
    
    // Try to get cached projection first
    if (!forceRebuild && this.config.cacheProjections) {
      const cached = await this.projectionStore.get<TimelineProjection>(sessionId, type);
      if (cached && this.isProjectionFresh(cached)) {
        return cached;
      }
    }

    // Build new projection
    const builder = this.builderFactory.createTimelineBuilder();
    const projection = await builder.build(sessionId);

    // Cache the projection
    if (this.config.cacheProjections) {
      await this.projectionStore.save(projection, type);
    }

    return projection;
  }

  /**
   * Get or build milestone projection
   */
  async getMilestoneProjection(sessionId: string, forceRebuild = false): Promise<MilestoneProjection> {
    const type = 'milestone';
    
    // Try to get cached projection first
    if (!forceRebuild && this.config.cacheProjections) {
      const cached = await this.projectionStore.get<MilestoneProjection>(sessionId, type);
      if (cached && this.isProjectionFresh(cached)) {
        return cached;
      }
    }

    // Build new projection
    const builder = this.builderFactory.createMilestoneBuilder();
    const projection = await builder.build(sessionId);

    // Cache the projection
    if (this.config.cacheProjections) {
      await this.projectionStore.save(projection, type);
    }

    return projection;
  }

  /**
   * Update projections with new events
   */
  async updateProjections(sessionId: string, events: FinancialEvent[]): Promise<void> {
    if (events.length === 0) {
      return;
    }

    // Update financial projection
    const financialProjection = await this.projectionStore.get<FinancialProjection>(sessionId, 'financial');
    if (financialProjection) {
      const builder = this.builderFactory.createFinancialBuilder();
      const updated = await builder.update(financialProjection, events);
      await this.projectionStore.save(updated, 'financial');
    }

    // For timeline and milestone projections, it's more efficient to rebuild
    // since they depend on the complete event sequence
    if (this.config.autoRebuild) {
      await this.rebuildDependentProjections(sessionId);
    }
  }

  /**
   * Rebuild all projections for a session
   */
  async rebuildAllProjections(sessionId: string): Promise<{
    financial: FinancialProjection;
    timeline: TimelineProjection;
    milestone: MilestoneProjection;
  }> {
    const [financial, timeline, milestone] = await Promise.all([
      this.getFinancialProjection(sessionId, true),
      this.getTimelineProjection(sessionId, true),
      this.getMilestoneProjection(sessionId, true),
    ]);

    return { financial, timeline, milestone };
  }

  /**
   * Clear all projections for a session
   */
  async clearSessionProjections(sessionId: string): Promise<void> {
    await this.projectionStore.clearSession(sessionId);
  }

  /**
   * Get projection statistics
   */
  async getProjectionStats(): Promise<{
    store: Awaited<ReturnType<InMemoryProjectionStore['getStats']>>;
    cache: Awaited<ReturnType<EventCache['getStats']>>;
  }> {
    const [storeStats, cacheStats] = await Promise.all([
      this.projectionStore.getStats?.() || Promise.resolve({
        totalProjections: 0,
        projectionsByType: {},
        sessionCount: 0,
        memoryUsageMB: 0,
      }),
      this.eventCache.getStats(),
    ]);

    return { store: storeStats, cache: cacheStats };
  }

  /**
   * Cleanup old projections
   */
  async cleanup(): Promise<{ projectionsRemoved: number; sessionsRemoved: number }> {
    const maxAge = this.config.maxProjectionAge || 24 * 60 * 60 * 1000;
    
    let projectionsRemoved = 0;
    if (this.projectionStore.cleanup) {
      projectionsRemoved = await this.projectionStore.cleanup(maxAge);
    }

    let sessionsRemoved = 0;
    if (this.eventCache.cleanupExpiredSessions) {
      sessionsRemoved = await this.eventCache.cleanupExpiredSessions();
    }

    return { projectionsRemoved, sessionsRemoved };
  }

  private async rebuildDependentProjections(sessionId: string): Promise<void> {
    // Timeline and milestone projections need to be rebuilt when events change
    await Promise.all([
      this.getTimelineProjection(sessionId, true),
      this.getMilestoneProjection(sessionId, true),
    ]);
  }

  private isProjectionFresh(projection: { lastUpdated: Date }): boolean {
    if (!this.config.maxProjectionAge) {
      return true;
    }

    const age = Date.now() - projection.lastUpdated.getTime();
    return age < this.config.maxProjectionAge;
  }
}

/**
 * Factory function to create a projection service with default dependencies
 */
export function createProjectionService(
  eventCache: EventCache,
  sessionManager?: SessionManager,
  config?: Partial<ProjectionServiceConfig>
): ProjectionService {
  const projectionStore = new InMemoryProjectionStore();
  return new ProjectionService(eventCache, projectionStore, sessionManager, config);
}