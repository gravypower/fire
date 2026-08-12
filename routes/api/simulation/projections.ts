/**
 * Projection retrieval API endpoints
 */

import { Handlers } from "$fresh/server.ts";
import { createProjectionService } from "../../../server/projections/projection-service.ts";
import { sessionManager } from "./session.ts";

// Global projection service instance
const projectionService = createProjectionService(sessionManager);

export const handler: Handlers = {
  // GET /api/simulation/projections?sessionId=xxx&type=financial|timeline|milestone|all
  async GET(req) {
    try {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("sessionId");
      const type = url.searchParams.get("type");

      if (!sessionId) {
        return new Response(JSON.stringify({
          success: false,
          error: "sessionId parameter is required",
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const isValid = await sessionManager.isValidSession(sessionId);
      if (!isValid) {
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid or expired session",
        }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      let data;

      if (!type || type === "all") {
        data = await projectionService.getAllProjections(sessionId);
      } else if (type === "financial") {
        data = await projectionService.getFinancialProjection(sessionId);
      } else if (type === "timeline") {
        data = await projectionService.getTimelineProjection(sessionId);
      } else if (type === "milestone") {
        data = await projectionService.getMilestoneProjection(sessionId);
      } else {
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid projection type. Must be 'financial', 'timeline', 'milestone', or 'all'",
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        data,
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};

// Export projection service for use by other modules
export { projectionService };
