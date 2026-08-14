/**
 * API Client for Server-Side Financial Simulation
 * Replaces direct SimulationEngine calls with server API requests
 * Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type {
  ComparisonSimulationResult,
  EnhancedSimulationResult,
  ScenarioComparisonResult,
  SimulationConfiguration,
  UserParameters,
} from "../types/financial.ts";

// API response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface SessionInfo {
  sessionId: string;
  userId?: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  parameters?: UserParameters;
}

interface CommandResult {
  success: boolean;
  commandId: string;
  events: any[];
  data: any;
}

interface ProjectionData {
  financial?: any;
  timeline?: any;
  milestone?: any;
}

/**
 * Helper to deserializes ISO date strings to Date objects recursively
 */
function deserializeDatesRecursively(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Check if string is an ISO date
    // Simplified regex for ISO 8601 date format
    if (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(obj) ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)
    ) {
      const date = new Date(obj);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item: any) => deserializeDatesRecursively(item));
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = deserializeDatesRecursively(obj[key]);
      }
    }
    return result;
  }

  return obj;
}

/**
 * WebSocket connection manager for real-time updates
 */
class WebSocketManager {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Connect to WebSocket for real-time updates
   */
  connect(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Check if we're in a browser environment
        if (typeof window === "undefined") {
          reject(new Error("WebSocket not available in server environment"));
          return;
        }

        this.sessionId = sessionId;
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl =
          `${protocol}//${window.location.host}/api/simulation/websocket?sessionId=${sessionId}`;

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.reconnectAttempts = 0;

          // Subscribe to updates
          this.send({
            type: "subscribe",
            sessionId,
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = deserializeDatesRecursively(JSON.parse(event.data));
            this.handleMessage(message);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onclose = () => {
          console.log("WebSocket disconnected");
          this.ws = null;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          reject(error);
        };

        // Timeout for connection
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error("WebSocket connection timeout"));
          }
        }, 5000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.sessionId = null;
    this.reconnectAttempts = 0;
  }

  /**
   * Send message to server
   */
  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: any): void {
    const { type, data } = message;

    // Notify listeners
    const typeListeners = this.listeners.get(type);
    if (typeListeners) {
      typeListeners.forEach((listener) => listener(data));
    }

    // Notify all listeners
    const allListeners = this.listeners.get("*");
    if (allListeners) {
      allListeners.forEach((listener) => listener(message));
    }
  }

  /**
   * Add event listener
   */
  on(eventType: string, listener: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);
  }

  /**
   * Remove event listener
   */
  off(eventType: string, listener: (data: any) => void): void {
    const typeListeners = this.listeners.get(eventType);
    if (typeListeners) {
      typeListeners.delete(listener);
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(): void {
    if (
      this.reconnectAttempts >= this.maxReconnectAttempts || !this.sessionId
    ) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(() => {
      if (this.sessionId) {
        console.log(
          `Attempting WebSocket reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
        );
        this.connect(this.sessionId).catch((error) => {
          console.error("WebSocket reconnect failed:", error);
        });
      }
    }, delay);
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * API Client for server-side financial simulation
 */
export class ApiClient {
  private baseUrl: string;
  private currentSessionId: string | null = null;
  private wsManager = new WebSocketManager();

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || "/api/simulation";
  }

  /**
   * Create a new simulation session
   */
  async createSession(
    userId?: string,
    parameters?: UserParameters,
  ): Promise<SessionInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          parameters,
        }),
      });

      const json = await response.json();
      const result: ApiResponse<SessionInfo> = deserializeDatesRecursively(
        json,
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to create session");
      }

      this.currentSessionId = result.data.sessionId;

      // Connect WebSocket for real-time updates
      try {
        await this.wsManager.connect(this.currentSessionId);
      } catch (error) {
        console.warn(
          "WebSocket connection failed, continuing without real-time updates:",
          error,
        );
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get current session information
   */
  async getSession(sessionId?: string): Promise<SessionInfo> {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      throw new Error("No active session");
    }

    try {
      const response = await fetch(`${this.baseUrl}/session?sessionId=${id}`);
      const json = await response.json();
      const result: ApiResponse<SessionInfo> = deserializeDatesRecursively(
        json,
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to get session");
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Run simulation with current parameters
   */
  async runSimulation(
    config: SimulationConfiguration,
    sessionId?: string,
  ): Promise<EnhancedSimulationResult> {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      throw new Error("No active session");
    }

    try {
      // Calculate end date for the simulation
      const startDate = new Date(config.baseParameters.startDate);
      const endDate = new Date(startDate);
      endDate.setFullYear(
        endDate.getFullYear() + config.baseParameters.simulationYears,
      );

      // Send RunSimulation command
      const commandResponse = await fetch(`${this.baseUrl}/commands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: `run-simulation-${Date.now()}`,
          type: "RunSimulation",
          sessionId: id,
          data: {
            parameters: config.baseParameters,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            configuration: config,
          },
        }),
      });

      const commandResult: ApiResponse<CommandResult> =
        deserializeDatesRecursively(
          await commandResponse
            .json(),
        );

      if (!commandResult.success || !commandResult.data) {
        throw new Error(commandResult.error || "Failed to run simulation");
      }

      // Get updated projections
      const projections = await this.getProjections(id, "all");

      // Convert server projections to client format
      return this.convertProjectionsToSimulationResult(projections);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Run comparison simulation
   */
  async runComparison(
    config: SimulationConfiguration,
    sessionId?: string,
  ): Promise<ComparisonSimulationResult> {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      throw new Error("No active session");
    }

    try {
      const response = await fetch(`${this.baseUrl}/commands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: `compare-simulation-${Date.now()}`,
          type: "CompareScenarios",
          sessionId: id,
          data: {
            configuration: config,
          },
        }),
      });

      const commandResult: ApiResponse<CommandResult> =
        deserializeDatesRecursively(
          await response.json(),
        );

      if (!commandResult.success || !commandResult.data) {
        throw new Error(commandResult.error || "Failed to run comparison");
      }

      return commandResult.data.data as ComparisonSimulationResult;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Run a side-by-side comparison of 2-4 independently configured scenarios
   */
  async runNamedScenarioComparison(
    scenarios: Array<{ id: string; name: string; configuration: SimulationConfiguration }>,
    sessionId?: string,
  ): Promise<ScenarioComparisonResult> {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      throw new Error("No active session");
    }

    try {
      const response = await fetch(`${this.baseUrl}/commands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: `compare-named-scenarios-${Date.now()}`,
          type: "CompareNamedScenarios",
          sessionId: id,
          data: { scenarios },
        }),
      });

      const commandResult: ApiResponse<CommandResult> =
        deserializeDatesRecursively(
          await response.json(),
        );

      if (!commandResult.success || !commandResult.data) {
        throw new Error(commandResult.error || "Failed to run scenario comparison");
      }

      return commandResult.data.data as ScenarioComparisonResult;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update simulation parameters
   */
  async updateParameters(
    parameters: Partial<UserParameters>,
    sessionId?: string,
  ): Promise<void> {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      throw new Error("No active session");
    }

    try {
      const response = await fetch(`${this.baseUrl}/commands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: `update-params-${Date.now()}`,
          type: "UpdateParameters",
          sessionId: id,
          data: {
            parameterChanges: parameters,
          },
        }),
      });

      const result: ApiResponse<CommandResult> = deserializeDatesRecursively(
        await response.json(),
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to update parameters");
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get projections from server
   */
  async getProjections(
    sessionId?: string,
    type: "financial" | "timeline" | "milestone" | "all" = "all",
  ): Promise<ProjectionData> {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      throw new Error("No active session");
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/projections?sessionId=${id}&type=${type}`,
      );
      const result: ApiResponse<ProjectionData> = deserializeDatesRecursively(
        await response.json(),
      );

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to get projections");
      }

      return result.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Clear session cache
   */
  async clearCache(sessionId?: string): Promise<void> {
    const id = sessionId || this.currentSessionId;
    if (!id) {
      throw new Error("No active session");
    }

    try {
      const response = await fetch(`${this.baseUrl}/commands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: `clear-cache-${Date.now()}`,
          type: "ClearCache",
          sessionId: id,
          data: {},
        }),
      });

      const result: ApiResponse<CommandResult> = deserializeDatesRecursively(
        await response.json(),
      );

      if (!result.success) {
        throw new Error(result.error || "Failed to clear cache");
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Subscribe to real-time updates
   */
  onProjectionUpdate(
    callback: (projectionType: string, projection: any) => void,
  ): void {
    this.wsManager.on("projection_update", (data) => {
      callback(data.projectionType, data.projection);
    });
  }

  /**
   * Subscribe to new events
   */
  onEventAdded(callback: (events: any[]) => void): void {
    this.wsManager.on("event_added", (data) => {
      callback(data.events);
    });
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.wsManager.disconnect();
    this.currentSessionId = null;
  }

  /**
   * Get tax configuration from server
   */
  async getTaxConfig(country?: string, year?: string): Promise<any> {
    try {
      const params = new URLSearchParams();
      if (country) params.set("country", country);
      if (year) params.set("year", year);
      const query = params.toString();
      const url = query ? `/api/tax-config?${query}` : "/api/tax-config";
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch tax config: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching tax config:", error);
      throw error;
    }
  }

  /**
   * Convert server projections to client simulation result format
   */
  private convertProjectionsToSimulationResult(
    projections: ProjectionData,
  ): EnhancedSimulationResult {
    // This is a simplified conversion - in a real implementation,
    // you would properly map the server projection format to the client format
    const timeline = projections.timeline || {};
    const milestone = projections.milestone || {};

    return {
      states: timeline.states || [],
      retirementDate: timeline.retirementAnalysis?.retirementDate || null,
      retirementAge: timeline.retirementAnalysis?.retirementAge || null,
      isSustainable: timeline.retirementAnalysis?.isSustainable || false,
      warnings: timeline.warnings || [],
      milestones: milestone.milestones || [],
      transitionPoints: timeline.transitionPoints || [],
      periods: timeline.periods || [],
      events: timeline.events || [],
    };
  }
}

// Global API client instance
export const apiClient = new ApiClient();
