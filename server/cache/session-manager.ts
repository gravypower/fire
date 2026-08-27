/**
 * In-memory session manager implementation
 */

import type {
  SessionConfig,
  SessionContext,
  SessionManager,
  SessionStats,
} from "../interfaces/session.ts";
import type {
  ParameterTransition,
  SimulationResult,
  UserParameters,
} from "../../types/financial.ts";
import type { Milestone } from "../../types/milestones.ts";

/**
 * Default session configuration
 */
const DEFAULT_CONFIG: SessionConfig = {
  timeoutMs: 2 * 60 * 60 * 1000, // 2 hours - gives a shared link time to be opened
  maxSessions: 1000,
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * In-memory session manager implementation
 */
export class InMemorySessionManager implements SessionManager {
  private sessions = new Map<string, SessionContext>();
  private config: SessionConfig;
  private cleanupTimer?: ReturnType<typeof setInterval>;

  constructor(config: Partial<SessionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startCleanupTimer();
  }

  async createSession(
    userId?: string,
    parameters?: UserParameters,
    transitions?: ParameterTransition[],
  ): Promise<SessionContext> {
    // Check session limit
    if (this.sessions.size >= this.config.maxSessions) {
      await this.cleanupExpiredSessions();
      if (this.sessions.size >= this.config.maxSessions) {
        throw new Error("Maximum number of sessions reached");
      }
    }

    const sessionId = this.generateSessionId();
    const now = new Date();

    const session: SessionContext = {
      sessionId,
      userId,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: new Date(now.getTime() + this.config.timeoutMs),
      parameters: parameters || this.getDefaultParameters(),
      transitions: transitions ?? [],
      metadata: {},
      resultVersion: 0,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<SessionContext | null> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return null;
    }

    return session;
  }

  async touchSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      const now = new Date();
      session.lastAccessedAt = now;
      session.expiresAt = new Date(now.getTime() + this.config.timeoutMs);
    }
  }

  async updateSessionParameters(
    sessionId: string,
    parameters: Partial<UserParameters>,
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.parameters = { ...session.parameters, ...parameters };
      await this.touchSession(sessionId);
    }
  }

  async updateSessionResult(
    sessionId: string,
    result: SimulationResult,
    milestones: Milestone[],
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.result = result;
      session.milestones = milestones;
      session.resultVersion++;
      await this.touchSession(sessionId);
    }
  }

  async updateSessionConfiguration(
    sessionId: string,
    parameters: UserParameters,
    transitions: ParameterTransition[],
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.parameters = parameters;
      session.transitions = transitions;
      await this.touchSession(sessionId);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  async getActiveSessions(): Promise<SessionContext[]> {
    await this.cleanupExpiredSessions();
    return Array.from(this.sessions.values());
  }

  async isValidSession(sessionId: string): Promise<boolean> {
    const session = await this.getSession(sessionId);
    return session !== null;
  }

  async getStats(): Promise<SessionStats> {
    await this.cleanupExpiredSessions();

    const sessions = Array.from(this.sessions.values());
    const now = new Date();

    let oldestAge = 0;
    if (sessions.length > 0) {
      const oldestSession = sessions.reduce((oldest, session) =>
        session.createdAt < oldest.createdAt ? session : oldest
      );
      oldestAge = (now.getTime() - oldestSession.createdAt.getTime()) /
        (1000 * 60);
    }

    return {
      activeSessions: sessions.length,
      memoryUsageMB: this.estimateMemoryUsage(),
      oldestSessionAgeMinutes: oldestAge,
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultParameters(): UserParameters {
    return {
      annualSalary: 80000,
      salaryFrequency: "fortnightly",
      incomeTaxRate: 30,
      monthlyLivingExpenses: 3000,
      monthlyRentOrMortgage: 2000,
      loanPrincipal: 400000,
      loanInterestRate: 6.5,
      loanPaymentAmount: 2500,
      loanPaymentFrequency: "monthly",
      useOffsetAccount: true,
      currentOffsetBalance: 50000,
      monthlyInvestmentContribution: 1000,
      investmentReturnRate: 7,
      currentInvestmentBalance: 100000,
      superContributionRate: 11,
      superReturnRate: 7,
      currentSuperBalance: 150000,
      desiredAnnualRetirementIncome: 60000,
      retirementAge: 65,
      currentAge: 35,
      simulationYears: 30,
      startDate: new Date(),
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimate: each session context is about 1KB
    return (this.sessions.size * 1024) / (1024 * 1024);
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions().catch(console.error);
    }, this.config.cleanupIntervalMs);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.sessions.clear();
  }
}

/**
 * Shared session manager instance used across all API routes.
 *
 * Deliberately instantiated here rather than in a route file: a module
 * that's both a route entry point and a shared import (as
 * routes/api/simulation/session.ts used to be) gets code-split into two
 * separate chunks in production builds, each running this line
 * independently - giving the route handler and its importers two different
 * session stores. See server/cache/websocket-broadcaster.ts for the same
 * issue on the WebSocket connection registry.
 */
export const sessionManager = new InMemorySessionManager();
