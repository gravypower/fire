import { InMemorySessionManager } from "../../../server/cache/session-manager.ts";
import type { UserParameters } from "../../../types/financial.ts";
import { Handlers } from "fresh/compat";

// Global session manager instance
const sessionManager = new InMemorySessionManager();

export const handler: Handlers = {
  // POST /api/simulation/session - Create new session
  async POST(ctx) {
    const req = ctx.req;

    try {
      const body = await req.json();
      const { userId, parameters } = body as {
        userId?: string;
        parameters?: UserParameters;
      };

      const session = await sessionManager.createSession(userId, parameters);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: session.sessionId,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  // GET /api/simulation/session?sessionId=xxx - Get session info
  async GET(ctx) {
    const req = ctx.req;

    try {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("sessionId");

      if (!sessionId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "sessionId parameter is required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      const session = await sessionManager.getSession(sessionId);

      if (!session) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Session not found or expired",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Touch session to extend expiry
      await sessionManager.touchSession(sessionId);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: session.sessionId,
            userId: session.userId,
            createdAt: session.createdAt,
            lastAccessedAt: session.lastAccessedAt,
            expiresAt: session.expiresAt,
            parameters: session.parameters,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },

  // DELETE /api/simulation/session?sessionId=xxx - Delete session
  async DELETE(ctx) {
    const req = ctx.req;

    try {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("sessionId");

      if (!sessionId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "sessionId parameter is required",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      await sessionManager.deleteSession(sessionId);

      return new Response(
        JSON.stringify({
          success: true,
          data: { message: "Session deleted successfully" },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  },
};

// Export session manager for use by other modules
export { sessionManager };
