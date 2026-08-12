/**
 * API documentation and health check endpoint
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  // GET /api/simulation - API documentation and health check
  async GET(_req) {
    try {
      const apiDocumentation = {
        name: "Financial Simulation API",
        version: "2.0.0",
        description:
          "Server-side API for running financial simulations. Each session caches its most recent simulation result; projections are views over that cached result.",
        endpoints: {
          session: {
            path: "/api/simulation/session",
            methods: {
              POST: {
                description: "Create a new simulation session",
                body: {
                  userId: "string (optional)",
                  parameters: "UserParameters (optional)",
                },
                response: {
                  sessionId: "string",
                  createdAt: "Date",
                  expiresAt: "Date",
                },
              },
              GET: {
                description: "Get session information",
                query: { sessionId: "string (required)" },
                response: {
                  sessionId: "string",
                  userId: "string",
                  createdAt: "Date",
                  lastAccessedAt: "Date",
                  expiresAt: "Date",
                  parameters: "UserParameters",
                },
              },
              DELETE: {
                description: "Delete a session",
                query: { sessionId: "string (required)" },
                response: { message: "string" },
              },
            },
          },
          commands: {
            path: "/api/simulation/commands",
            methods: {
              POST: {
                description:
                  "Process a command (RunSimulation, UpdateParameters, ClearCache, CompareScenarios)",
                body: {
                  id: "string (required)",
                  type: "string (required)",
                  sessionId: "string (required)",
                  timestamp: "Date (optional)",
                  data: "object (command-specific)",
                },
                response: {
                  success: "boolean",
                  commandId: "string",
                  data: "object",
                },
              },
              GET: {
                description: "Get available command types",
                response: {
                  availableCommands: "string[]",
                  description: "string",
                },
              },
            },
          },
          projections: {
            path: "/api/simulation/projections",
            methods: {
              GET: {
                description:
                  "Get a view of the session's cached simulation result",
                query: {
                  sessionId: "string (required)",
                  type: "string (optional) - financial|timeline|milestone|all",
                },
                response:
                  "FinancialProjection | TimelineProjection | MilestoneProjection | AllProjections",
              },
            },
          },
          websocket: {
            path: "/api/simulation/websocket",
            methods: {
              GET: {
                description: "Upgrade to WebSocket for real-time updates",
                query: { sessionId: "string (required)" },
                response: "WebSocket connection",
                messages: {
                  incoming: {
                    ping: "Heartbeat message",
                    subscribe: "Subscribe to session updates",
                  },
                  outgoing: {
                    connected: "Connection established",
                    pong: "Heartbeat response",
                    subscribed: "Subscription confirmed",
                    projection_update: "Projection data updated",
                    error: "Error message",
                  },
                },
              },
            },
          },
          stats: {
            path: "/api/simulation/stats",
            methods: {
              GET: {
                description: "Get system statistics",
                response: {
                  sessions: "SessionStats",
                  websockets: "WebSocketStats",
                  system: "SystemStats",
                },
              },
            },
          },
        },
        errorHandling: {
          400: "Bad Request - Invalid parameters or malformed request",
          401: "Unauthorized - Invalid or expired session",
          404: "Not Found - Session or resource not found",
          500: "Internal Server Error - Server-side error occurred",
        },
        authentication: {
          type: "Session-based",
          description: "All requests (except session creation) require a valid sessionId",
        },
      };

      return new Response(JSON.stringify({
        success: true,
        data: apiDocumentation,
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
