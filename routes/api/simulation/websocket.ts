import { sessionManager } from "../../../server/cache/session-manager.ts";
import {
  broadcastToSession,
  registerConnection,
  unregisterConnection,
  WebSocketMessage,
} from "../../../server/cache/websocket-broadcaster.ts";
import { Handlers } from "fresh/compat";

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

        registerConnection(sessionId, socket);

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
        unregisterConnection(sessionId, socket);
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
