/**
 * Debug API routes for event inspection and replay
 */

import { DebugController } from "./debug-controller.ts";
import type { EventCache } from "../interfaces/cache.ts";

/**
 * Debug routes handler
 */
export class DebugRoutes {
  private controller: DebugController;

  constructor(eventCache: EventCache) {
    this.controller = new DebugController(eventCache);
  }

  /**
   * Handle debug API requests
   */
  async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;
    const pathname = url.pathname;

    // CORS headers for debug endpoints
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
      // Route debug requests
      if (pathname.startsWith('/debug/')) {
        const debugPath = pathname.replace('/debug/', '');
        
        switch (debugPath) {
          case 'replay':
            if (method === 'POST') {
              const body = await request.json();
              const result = await this.controller.replayEvents(body);
              return new Response(JSON.stringify(result), { 
                status: result.success ? 200 : 400, 
                headers: corsHeaders 
              });
            }
            break;

          case 'search':
            if (method === 'POST') {
              const body = await request.json();
              const result = await this.controller.searchEvents(body);
              return new Response(JSON.stringify(result), { 
                status: result.success ? 200 : 400, 
                headers: corsHeaders 
              });
            }
            break;

          case 'event-details':
            if (method === 'POST') {
              const body = await request.json();
              const result = await this.controller.getEventDetails(body);
              return new Response(JSON.stringify(result), { 
                status: result.success ? 200 : 400, 
                headers: corsHeaders 
              });
            }
            break;

          case 'compare-states':
            if (method === 'POST') {
              const body = await request.json();
              const result = await this.controller.compareStates(body);
              return new Response(JSON.stringify(result), { 
                status: result.success ? 200 : 400, 
                headers: corsHeaders 
              });
            }
            break;

          case 'session-events':
            if (method === 'POST') {
              const body = await request.json();
              const result = await this.controller.getSessionEvents(body);
              return new Response(JSON.stringify(result), { 
                status: result.success ? 200 : 400, 
                headers: corsHeaders 
              });
            }
            break;

          case 'session-stats':
            if (method === 'GET') {
              const sessionId = url.searchParams.get('sessionId');
              if (!sessionId) {
                return new Response(JSON.stringify({
                  success: false,
                  error: 'sessionId parameter is required',
                  timestamp: new Date().toISOString(),
                  executionTimeMs: 0,
                }), { status: 400, headers: corsHeaders });
              }
              
              const result = await this.controller.getSessionStats(sessionId);
              return new Response(JSON.stringify(result), { 
                status: result.success ? 200 : 400, 
                headers: corsHeaders 
              });
            }
            break;

          case 'validate-integrity':
            if (method === 'GET') {
              const sessionId = url.searchParams.get('sessionId');
              if (!sessionId) {
                return new Response(JSON.stringify({
                  success: false,
                  error: 'sessionId parameter is required',
                  timestamp: new Date().toISOString(),
                  executionTimeMs: 0,
                }), { status: 400, headers: corsHeaders });
              }
              
              const result = await this.controller.validateEventIntegrity(sessionId);
              return new Response(JSON.stringify(result), { 
                status: result.success ? 200 : 400, 
                headers: corsHeaders 
              });
            }
            break;

          case 'help':
            if (method === 'GET') {
              const helpResponse = this.getApiDocumentation();
              return new Response(JSON.stringify(helpResponse), { 
                status: 200, 
                headers: corsHeaders 
              });
            }
            break;

          default:
            return new Response(JSON.stringify({
              success: false,
              error: `Unknown debug endpoint: ${debugPath}`,
              timestamp: new Date().toISOString(),
              executionTimeMs: 0,
            }), { status: 404, headers: corsHeaders });
        }
      }

      return new Response(JSON.stringify({
        success: false,
        error: 'Method not allowed',
        timestamp: new Date().toISOString(),
        executionTimeMs: 0,
      }), { status: 405, headers: corsHeaders });

    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString(),
        executionTimeMs: 0,
      }), { status: 500, headers: corsHeaders });
    }
  }

  /**
   * Get API documentation for debug endpoints
   */
  private getApiDocumentation() {
    return {
      success: true,
      data: {
        title: 'Event Sourcing Debug API',
        version: '1.0.0',
        description: 'Debug endpoints for event inspection, replay, and analysis',
        endpoints: {
          'POST /debug/replay': {
            description: 'Replay events with step-by-step state reconstruction',
            parameters: {
              sessionId: 'string (required)',
              timeRange: 'object (optional) - { from: ISO date, to: ISO date }',
              versionRange: 'object (optional) - { from: number, to: number }',
              includeSteps: 'boolean (optional, default: true)',
              filter: 'object (optional) - EventFilter object',
            },
            example: {
              sessionId: 'session-123',
              timeRange: {
                from: '2024-01-01T00:00:00Z',
                to: '2024-12-31T23:59:59Z',
              },
              includeSteps: true,
            },
          },
          'POST /debug/search': {
            description: 'Search and filter events based on criteria',
            parameters: {
              sessionId: 'string (required)',
              filter: 'object (required) - EventFilter object',
            },
            example: {
              sessionId: 'session-123',
              filter: {
                eventTypes: ['SalaryReceived', 'ExpensePaid'],
                minAmount: 1000,
              },
            },
          },
          'POST /debug/event-details': {
            description: 'Get detailed event information with context',
            parameters: {
              sessionId: 'string (required)',
              eventId: 'string (required)',
              contextSize: 'number (optional, default: 2)',
            },
            example: {
              sessionId: 'session-123',
              eventId: 'event-456',
              contextSize: 3,
            },
          },
          'POST /debug/compare-states': {
            description: 'Compare financial states between two versions',
            parameters: {
              sessionId: 'string (required)',
              fromVersion: 'number (required)',
              toVersion: 'number (required)',
            },
            example: {
              sessionId: 'session-123',
              fromVersion: 10,
              toVersion: 20,
            },
          },
          'POST /debug/session-events': {
            description: 'Get all events for a session with pagination',
            parameters: {
              sessionId: 'string (required)',
              limit: 'number (optional, default: 50)',
              offset: 'number (optional, default: 0)',
              sortBy: 'string (optional) - timestamp|version|type',
              sortOrder: 'string (optional) - asc|desc',
            },
            example: {
              sessionId: 'session-123',
              limit: 25,
              offset: 0,
              sortBy: 'timestamp',
              sortOrder: 'desc',
            },
          },
          'GET /debug/session-stats?sessionId=<id>': {
            description: 'Get session statistics and health information',
            parameters: {
              sessionId: 'string (query parameter, required)',
            },
            example: '/debug/session-stats?sessionId=session-123',
          },
          'GET /debug/validate-integrity?sessionId=<id>': {
            description: 'Validate event integrity for a session',
            parameters: {
              sessionId: 'string (query parameter, required)',
            },
            example: '/debug/validate-integrity?sessionId=session-123',
          },
          'GET /debug/help': {
            description: 'Get this API documentation',
            parameters: {},
            example: '/debug/help',
          },
        },
        eventFilterOptions: {
          eventTypes: 'array of strings - filter by event types',
          dateRange: 'object - { from: ISO date, to: ISO date }',
          versionRange: 'object - { from: number, to: number }',
          aggregateId: 'string - filter by aggregate ID',
          correlationId: 'string - filter by correlation ID',
          causationId: 'string - filter by causation ID',
          userId: 'string - filter by user ID',
          textSearch: 'string - text search in event data',
          minAmount: 'number - minimum amount for financial events',
          maxAmount: 'number - maximum amount for financial events',
        },
      },
      timestamp: new Date().toISOString(),
      executionTimeMs: 0,
    };
  }
}

/**
 * Create debug routes handler
 */
export function createDebugRoutes(eventCache: EventCache): DebugRoutes {
  return new DebugRoutes(eventCache);
}