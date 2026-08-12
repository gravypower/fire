/**
 * System statistics API endpoint
 */

import { Handlers } from "$fresh/server.ts";
import { sessionManager } from "./session.ts";
import { eventCache } from "./events.ts";
import { projectionService } from "./projections.ts";
import { getWebSocketStats } from "./websocket.ts";

export const handler: Handlers = {
  // GET /api/simulation/stats - Get system statistics
  async GET(_req) {
    try {
      const [sessionStats, cacheStats, projectionStats, wsStats] = await Promise.all([
        sessionManager.getStats(),
        eventCache.getStats(),
        projectionService.getProjectionStats(),
        Promise.resolve(getWebSocketStats()),
      ]);

      // Combine stats
      const combinedStats = {
        sessions: {
          active: sessionStats.activeSessions,
          oldestAgeMinutes: sessionStats.oldestSessionAgeMinutes,
        },
        events: {
          total: cacheStats.totalEvents,
          averagePerSession: cacheStats.averageEventsPerSession,
        },
        projections: {
          total: projectionStats.store.totalProjections,
          byType: projectionStats.store.projectionsByType,
          sessionCount: projectionStats.store.sessionCount,
        },
        websockets: {
          activeSessions: wsStats.activeSessions,
          totalConnections: wsStats.totalConnections,
          connectionsBySession: wsStats.connectionsBySession,
        },
        cache: {
          hitRate: cacheStats.hitRate,
          memoryUsageMB: cacheStats.memoryUsageMB + projectionStats.store.memoryUsageMB,
        },
        system: {
          totalMemoryUsageMB: sessionStats.memoryUsageMB + cacheStats.memoryUsageMB + projectionStats.store.memoryUsageMB,
          uptime: performance.now() / 1000,
        },
      };

      return new Response(JSON.stringify({
        success: true,
        data: combinedStats,
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