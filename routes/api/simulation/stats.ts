/**
 * System statistics API endpoint
 */

import { Handlers } from "$fresh/server.ts";
import { sessionManager } from "./session.ts";
import { getWebSocketStats } from "./websocket.ts";

export const handler: Handlers = {
  // GET /api/simulation/stats - Get system statistics
  async GET(_req) {
    try {
      const [sessionStats, wsStats] = await Promise.all([
        sessionManager.getStats(),
        Promise.resolve(getWebSocketStats()),
      ]);

      const combinedStats = {
        sessions: {
          active: sessionStats.activeSessions,
          oldestAgeMinutes: sessionStats.oldestSessionAgeMinutes,
        },
        websockets: {
          activeSessions: wsStats.activeSessions,
          totalConnections: wsStats.totalConnections,
          connectionsBySession: wsStats.connectionsBySession,
        },
        system: {
          totalMemoryUsageMB: sessionStats.memoryUsageMB,
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
