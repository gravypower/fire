/**
 * API documentation and health check endpoint
 */

import { Handlers } from "$fresh/server.ts";

export const handler: Handlers = {
  // GET /api/simulation - API documentation and health check
  async GET(_req) {
    try {
      const apiDocumentation = {
        name: "Event-Sourced Financial Simulation API",
        version: "1.0.0",
        description: "Server-side API for financial simulation using event sourcing architecture",
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
                description: "Process a command (RunSimulation, UpdateParameters, ClearCache)",
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
                  events: "FinancialEvent[]",
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
          events: {
            path: "/api/simulation/events",
            methods: {
              GET: {
                description: "Get events for a session",
                query: {
                  sessionId: "string (required)",
                  type: "string (optional) - filter by event type",
                  fromVersion: "number (optional) - get events from version",
                  fromDate: "string (optional) - get events from date",
                  toDate: "string (optional) - get events to date",
                },
                response: {
                  events: "FinancialEvent[]",
                  count: "number",
                },
              },
              DELETE: {
                description: "Clear events for a session",
                query: { sessionId: "string (required)" },
                response: { message: "string" },
              },
            },
          },
          projections: {
            path: "/api/simulation/projections",
            methods: {
              GET: {
                description: "Get projections for a session",
                query: {
                  sessionId: "string (required)",
                  type: "string (optional) - financial|timeline|milestone|all",
                  rebuild: "boolean (optional) - force rebuild",
                },
                response: "FinancialProjection | TimelineProjection | MilestoneProjection | AllProjections",
              },
              DELETE: {
                description: "Clear projections for a session",
                query: { sessionId: "string (required)" },
                response: { message: "string" },
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
                    event_added: "New events added",
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
                  events: "EventStats",
                  projections: "ProjectionStats",
                  websockets: "WebSocketStats",
                  cache: "CacheStats",
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
        eventSourcing: {
          description: "The API uses event sourcing architecture where all state changes are stored as immutable events",
          eventTypes: [
            "SalaryReceived",
            "TaxCalculated", 
            "ExpensePaid",
            "LoanInterestCalculated",
            "LoanPrincipalPaid",
            "OffsetBalanceUpdated",
            "InvestmentContributionMade",
            "InvestmentGrowthApplied",
            "SuperContributionMade",
            "SuperGrowthApplied",
            "ParameterChanged",
            "FinancialStateCalculated",
          ],
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