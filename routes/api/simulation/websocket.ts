import { sessionManager } from "./session.ts";
import { Handlers } from "fresh/compat";

// Store active WebSocket connections by session
const activeConnections = new Map<string, Set<WebSocket>>();

// Message types for WebSocket communication
interface WebSocketMessage {
  type:
    | "subscribe"
    | "unsubscribe"
    | "ping"
    | "projection_update"
    | "config_update"
    | "error";
  sessionId?: string;
  data?: any;
  timestamp?: Date;
}

/**
 * Broadcast a message to all connections for a session
 */
export function broadcastToSession(
  sessionId: string,
  message: Omit<WebSocketMessage, "sessionId">,
  excludeSocket?: WebSocket,
): void {
  const connections = activeConnections.get(sessionId);
  if (!connections) {
    return;
  }

  const fullMessage: WebSocketMessage = {
    ...message,
    sessionId,
    timestamp: new Date(),
  };

  const messageStr = JSON.stringify(fullMessage);
  const deadConnections: WebSocket[] = [];

  for (const ws of connections) {
    if (ws === excludeSocket) {
      continue;
    }
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      } else {
        deadConnections.push(ws);
      }
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
      deadConnections.push(ws);
    }
  }

  // Clean up dead connections
  for (const deadWs of deadConnections) {
    connections.delete(deadWs);
  }

  // Remove empty session sets
  if (connections.size === 0) {
    activeConnections.delete(sessionId);
  }
}

/**
 * Broadcast projection updates to session
 */
export function broadcastProjectionUpdate(
  sessionId: string,
  projectionType: string,
  projection: any,
): void {
  broadcastToSession(sessionId, {
    type: "projection_update",
    data: {
      projectionType,
      projection,
    },
  });
}

export const handler: Handlers = {
  // GET /api/simulation/websocket - Upgrade to WebSocket connection
  async GET(ctx) {
    const req = ctx.req;

    try {
      const url = new URL(req.url);
      const sessionId = url.searchParams.get("sessionId");

      if (!sessionId) {
        return new Response("sessionId parameter is required", { status: 400 });
      }

      // Validate session exists
      const isValid = await sessionManager.isValidSession(sessionId);
      if (!isValid) {
        return new Response("Invalid or expired session", { status: 401 });
      }

      // Upgrade to WebSocket
      const { socket, response } = Deno.upgradeWebSocket(req);

      // Handle WebSocket events
      socket.onopen = () => {
        console.log(`WebSocket connected for session: ${sessionId}`);

        // Add to active connections
        if (!activeConnections.has(sessionId)) {
          activeConnections.set(sessionId, new Set());
        }
        activeConnections.get(sessionId)!.add(socket);

        // Send welcome message
        socket.send(JSON.stringify({
          type: "connected",
          sessionId,
          timestamp: new Date(),
          data: { message: "WebSocket connection established" },
        }));
      };

      socket.onmessage = async (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          switch (message.type) {
            case "ping":
              socket.send(JSON.stringify({
                type: "pong",
                sessionId,
                timestamp: new Date(),
              }));
              break;

            case "subscribe":
              // Client is subscribing to updates (already handled by connection)
              socket.send(JSON.stringify({
                type: "subscribed",
                sessionId,
                timestamp: new Date(),
                data: { message: "Subscribed to session updates" },
              }));
              break;

            case "config_update": {
              const configuration = message.data?.configuration;
              if (configuration) {
                await sessionManager.updateSessionConfiguration(
                  sessionId,
                  configuration.baseParameters,
                  configuration.transitions ?? [],
                );
                broadcastToSession(sessionId, {
                  type: "config_update",
                  data: { configuration },
                }, socket);
              }
              break;
            }

            default:
              socket.send(JSON.stringify({
                type: "error",
                sessionId,
                timestamp: new Date(),
                data: { error: `Unknown message type: ${message.type}` },
              }));
          }
        } catch (error) {
          socket.send(JSON.stringify({
            type: "error",
            sessionId,
            timestamp: new Date(),
            data: { error: "Invalid message format" },
          }));
        }
      };

      socket.onclose = () => {
        console.log(`WebSocket disconnected for session: ${sessionId}`);

        // Remove from active connections
        const connections = activeConnections.get(sessionId);
        if (connections) {
          connections.delete(socket);
          if (connections.size === 0) {
            activeConnections.delete(sessionId);
          }
        }
      };

      socket.onerror = (error) => {
        console.error(`WebSocket error for session ${sessionId}:`, error);
      };

      return response;
    } catch (error) {
      return new Response(
        `WebSocket upgrade failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { status: 500 },
      );
    }
  },
};

/**
 * Get WebSocket statistics
 */
export function getWebSocketStats(): {
  activeSessions: number;
  totalConnections: number;
  connectionsBySession: Record<string, number>;
} {
  const connectionsBySession: Record<string, number> = {};
  let totalConnections = 0;

  for (const [sessionId, connections] of activeConnections.entries()) {
    connectionsBySession[sessionId] = connections.size;
    totalConnections += connections.size;
  }

  return {
    activeSessions: activeConnections.size,
    totalConnections,
    connectionsBySession,
  };
}

/**
 * Cleanup inactive connections
 */
export function cleanupWebSocketConnections(): number {
  let cleaned = 0;

  for (const [sessionId, connections] of activeConnections.entries()) {
    const deadConnections: WebSocket[] = [];

    for (const ws of connections) {
      if (ws.readyState !== WebSocket.OPEN) {
        deadConnections.push(ws);
      }
    }

    for (const deadWs of deadConnections) {
      connections.delete(deadWs);
      cleaned++;
    }

    if (connections.size === 0) {
      activeConnections.delete(sessionId);
    }
  }

  return cleaned;
}
