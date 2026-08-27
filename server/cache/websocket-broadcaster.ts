/**
 * Tracks active WebSocket connections per session and broadcasts messages
 * to them.
 *
 * This lives outside routes/ deliberately: routes/api/simulation/websocket.ts
 * is both a route entry point and (via broadcastProjectionUpdate) a module
 * other routes import from. Vite/Rollup code-splits each route into its own
 * chunk, and a module that's simultaneously an entry point and a shared
 * dependency gets its top-level state (the `activeConnections` Map) built
 * twice - once inlined into the route's own chunk, once in a separately
 * extracted shared chunk - so the route handler and its importers silently
 * end up with two different, disconnected Maps in production builds
 * (`deno task preview`), even though `deno task dev` never shows the split.
 * Keeping the state in a plain, non-route module gives it exactly one
 * instantiation regardless of how many chunks end up importing it.
 */

const activeConnections = new Map<string, Set<WebSocket>>();

export interface WebSocketMessage {
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
 * Register a newly-opened socket as connected to a session.
 */
export function registerConnection(sessionId: string, socket: WebSocket): void {
  if (!activeConnections.has(sessionId)) {
    activeConnections.set(sessionId, new Set());
  }
  activeConnections.get(sessionId)!.add(socket);
}

/**
 * Remove a socket (on close) from a session's connection set.
 */
export function unregisterConnection(sessionId: string, socket: WebSocket): void {
  const connections = activeConnections.get(sessionId);
  if (connections) {
    connections.delete(socket);
    if (connections.size === 0) {
      activeConnections.delete(sessionId);
    }
  }
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
