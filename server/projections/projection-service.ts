/**
 * Projection service - reshapes a session's cached simulation result into
 * the financial/timeline/milestone views the client requests.
 */

import type {
  FinancialProjection,
  MilestoneProjection,
  TimelineProjection,
} from "../interfaces/projections.ts";
import type { SessionContext } from "../interfaces/session.ts";
import {
  buildFinancialProjection,
  buildMilestoneProjection,
  buildTimelineProjection,
} from "./projection-builder.ts";

/**
 * Session manager interface for projection service
 */
interface SessionManager {
  getSession(sessionId: string): Promise<SessionContext | null>;
}

/**
 * Main projection service
 */
export class ProjectionService {
  constructor(private sessionManager: SessionManager) {}

  private async requireSession(sessionId: string): Promise<SessionContext> {
    const session = await this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return session;
  }

  async getFinancialProjection(sessionId: string): Promise<FinancialProjection> {
    const session = await this.requireSession(sessionId);
    return buildFinancialProjection(
      sessionId,
      session.resultVersion,
      session.result ?? { states: [], retirementDate: null, retirementAge: null, isSustainable: false, warnings: [] },
    );
  }

  async getTimelineProjection(sessionId: string): Promise<TimelineProjection> {
    const session = await this.requireSession(sessionId);
    return buildTimelineProjection(
      sessionId,
      session.resultVersion,
      session.result ?? { states: [], retirementDate: null, retirementAge: null, isSustainable: false, warnings: [] },
      session.milestones ?? [],
    );
  }

  async getMilestoneProjection(sessionId: string): Promise<MilestoneProjection> {
    const session = await this.requireSession(sessionId);
    return buildMilestoneProjection(sessionId, session.resultVersion, session.milestones ?? []);
  }

  async getAllProjections(sessionId: string): Promise<{
    financial: FinancialProjection;
    timeline: TimelineProjection;
    milestone: MilestoneProjection;
  }> {
    const [financial, timeline, milestone] = await Promise.all([
      this.getFinancialProjection(sessionId),
      this.getTimelineProjection(sessionId),
      this.getMilestoneProjection(sessionId),
    ]);

    return { financial, timeline, milestone };
  }
}

/**
 * Factory function to create a projection service with default dependencies
 */
export function createProjectionService(sessionManager: SessionManager): ProjectionService {
  return new ProjectionService(sessionManager);
}
