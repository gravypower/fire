/**
 * Event management API endpoints
 */

import { Handlers } from "$fresh/server.ts";
import { InMemoryEventCache } from "../../../server/cache/event-cache.ts";
import { sessionManager } from "./session.ts";

// Global event cache instance
const eventCache = new InMemoryEventCache();

export const handler: Handlers = {
  // GET /api/simulation/events?sessionId=xxx - Get events for session
  async GET(req) {
    try {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("sessionId");
      const eventType = url.searchParams.get("type");
      const fromVersion = url.searchParams.get("fromVersion");
      const fromDate = url.searchParams.get("fromDate");
      const toDate = url.searchParams.get("toDate");

      if (!sessionId) {
        return new Response(JSON.stringify({
          success: false,
          error: "sessionId parameter is required",
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validate session exists
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

      let events;

      if (eventType) {
        events = await eventCache.getEventsByType(sessionId, eventType);
      } else if (fromDate && toDate) {
        events = await eventCache.getEventsByDateRange(
          sessionId,
          new Date(fromDate),
          new Date(toDate)
        );
      } else {
        const version = fromVersion ? parseInt(fromVersion) : undefined;
        events = await eventCache.getEvents(sessionId, version);
      }

      return new Response(JSON.stringify({
        success: true,
        data: {
          events,
          count: events.length,
        },
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

  // DELETE /api/simulation/events?sessionId=xxx - Clear events for session
  async DELETE(req) {
    try {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("sessionId");

      if (!sessionId) {
        return new Response(JSON.stringify({
          success: false,
          error: "sessionId parameter is required",
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Validate session exists
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

      await eventCache.clearSession(sessionId);

      return new Response(JSON.stringify({
        success: true,
        data: { message: "Events cleared successfully" },
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

// Export event cache for use by other modules
export { eventCache };