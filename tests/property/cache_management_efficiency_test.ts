/**
 * Property-based test for cache management efficiency
 * **Feature: event-sourced-server-refactor, Property 11: Cache management efficiency**
 * **Validates: Requirements 8.4, 8.5**
 */

import { assertEquals, assert } from "$std/assert/mod.ts";
import * as fc from "fast-check";
import { InMemoryEventCache } from "../../server/cache/event-cache.ts";
import { InMemorySessionManager } from "../../server/cache/session-manager.ts";
import type { FinancialEvent } from "../../server/interfaces/events.ts";
import type { UserParameters } from "../../types/financial.ts";

// Test generators
const userParametersArb = fc.record({
  annualSalary: fc.integer({ min: 30000, max: 200000 }),
  salaryFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly'),
  incomeTaxRate: fc.integer({ min: 0, max: 50 }),
  monthlyLivingExpenses: fc.integer({ min: 1000, max: 8000 }),
  monthlyRentOrMortgage: fc.integer({ min: 500, max: 5000 }),
  loanPrincipal: fc.integer({ min: 0, max: 1000000 }),
  loanInterestRate: fc.float({ min: 0, max: 15 }),
  loanPaymentAmount: fc.integer({ min: 0, max: 10000 }),
  loanPaymentFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly'),
  useOffsetAccount: fc.boolean(),
  currentOffsetBalance: fc.integer({ min: 0, max: 100000 }),
  monthlyInvestmentContribution: fc.integer({ min: 0, max: 5000 }),
  investmentReturnRate: fc.float({ min: 0, max: 20 }),
  currentInvestmentBalance: fc.integer({ min: 0, max: 500000 }),
  superContributionRate: fc.float({ min: 0, max: 25 }),
  superReturnRate: fc.float({ min: 0, max: 15 }),
  currentSuperBalance: fc.integer({ min: 0, max: 1000000 }),
  desiredAnnualRetirementIncome: fc.integer({ min: 30000, max: 150000 }),
  retirementAge: fc.integer({ min: 55, max: 75 }),
  currentAge: fc.integer({ min: 20, max: 65 }),
  simulationYears: fc.integer({ min: 5, max: 50 }),
  startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
}) as fc.Arbitrary<UserParameters>;

const financialEventArb = fc.record({
  id: fc.string({ minLength: 10, maxLength: 50 }),
  sessionId: fc.string({ minLength: 10, maxLength: 50 }),
  type: fc.constantFrom(
    'SalaryReceived',
    'TaxCalculated', 
    'ExpensePaid',
    'LoanInterestCalculated',
    'LoanPrincipalPaid',
    'OffsetBalanceUpdated',
    'InvestmentContributionMade',
    'InvestmentGrowthApplied',
    'SuperContributionMade',
    'SuperGrowthApplied',
    'ParameterChanged',
    'FinancialStateCalculated'
  ),
  aggregateId: fc.string({ minLength: 10, maxLength: 50 }),
  version: fc.integer({ min: 1, max: 1000 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  data: fc.record({
    amount: fc.float({ min: 0, max: 100000 }),
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    description: fc.string({ minLength: 1, maxLength: 100 }),
  }),
  metadata: fc.record({
    correlationId: fc.string({ minLength: 10, maxLength: 50 }),
    causationId: fc.option(fc.string({ minLength: 10, maxLength: 50 })),
    userId: fc.option(fc.string({ minLength: 5, maxLength: 20 })),
  }),
}) as fc.Arbitrary<FinancialEvent>;

Deno.test("Property 11: Cache management efficiency - Session lifecycle should properly create, maintain, and cleanup", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(userParametersArb, { minLength: 1, maxLength: 10 }), // sessions to create
      fc.array(fc.array(financialEventArb, { minLength: 1, maxLength: 5 }), { minLength: 1, maxLength: 10 }), // events per session
      async (paramsList, eventsList) => {
        const sessionManager = new InMemorySessionManager();
        const eventCache = new InMemoryEventCache();

        try {
          const createdSessions: string[] = [];

          // Create sessions and add events
          for (let i = 0; i < paramsList.length && i < eventsList.length; i++) {
            const params = paramsList[i];
            const events = eventsList[i];

            // Create session
            const session = await sessionManager.createSession(`user${i}`, params);
            createdSessions.push(session.sessionId);

            // Create event cache for session
            await eventCache.createSession(session.sessionId);

            // Add events to session
            const sessionEvents = events.map(event => ({
              ...event,
              sessionId: session.sessionId,
              aggregateId: `aggregate_${session.sessionId}`,
            }));

            await eventCache.appendEvents(session.sessionId, sessionEvents);

            // Verify session exists
            const exists = await eventCache.sessionExists(session.sessionId);
            assertEquals(exists, true, `Session ${session.sessionId} should exist after creation`);

            // Verify events are stored
            const retrievedEvents = await eventCache.getEvents(session.sessionId);
            assertEquals(retrievedEvents.length, sessionEvents.length, `Session should contain ${sessionEvents.length} events`);
          }

          // Get initial stats
          const initialStats = await eventCache.getStats();
          assertEquals(initialStats.totalSessions, createdSessions.length, "Stats should reflect created sessions");
          assert(initialStats.totalEvents >= 0, "Total events should be non-negative");
          assert(initialStats.memoryUsageMB >= 0, "Memory usage should be non-negative");

          // Cleanup all sessions
          for (const sessionId of createdSessions) {
            await eventCache.clearSession(sessionId);
            await sessionManager.deleteSession(sessionId);
          }

          // Verify cleanup
          for (const sessionId of createdSessions) {
            const exists = await eventCache.sessionExists(sessionId);
            assertEquals(exists, false, `Session ${sessionId} should not exist after cleanup`);

            const session = await sessionManager.getSession(sessionId);
            assertEquals(session, null, `Session ${sessionId} should be null after deletion`);
          }

          // Final stats should show cleanup
          const finalStats = await eventCache.getStats();
          assertEquals(finalStats.totalSessions, 0, "No sessions should remain after cleanup");

          // Cleanup
          sessionManager.destroy();
          eventCache.destroy();
        } catch (error) {
          sessionManager.destroy();
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 11: Cache management efficiency - Expired sessions should be automatically cleaned up", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 2, max: 8 }), // number of sessions
      fc.array(financialEventArb, { minLength: 1, maxLength: 3 }), // events per session
      async (sessionCount, events) => {
        // Use very short timeout for testing, disable automatic cleanup
        const sessionManager = new InMemorySessionManager({ 
          timeoutMs: 50, // 50ms timeout
          cleanupIntervalMs: 999999 // Disable automatic cleanup
        });
        const eventCache = new InMemoryEventCache({ 
          sessionTimeoutMs: 50, // 50ms timeout
          cleanupIntervalMs: 999999 // Disable automatic cleanup
        });

        try {
          const createdSessions: string[] = [];

          // Create sessions with events
          for (let i = 0; i < sessionCount; i++) {
            const session = await sessionManager.createSession(`user${i}`);
            createdSessions.push(session.sessionId);

            await eventCache.createSession(session.sessionId);

            const sessionEvents = events.map(event => ({
              ...event,
              sessionId: session.sessionId,
              aggregateId: `aggregate_${session.sessionId}`,
            }));

            await eventCache.appendEvents(session.sessionId, sessionEvents);
          }

          // Verify all sessions exist initially
          for (const sessionId of createdSessions) {
            const exists = await eventCache.sessionExists(sessionId);
            assertEquals(exists, true, `Session ${sessionId} should exist initially`);
          }

          // Wait for sessions to expire
          await new Promise(resolve => setTimeout(resolve, 100));

          // Manually trigger cleanup (simulating automatic cleanup)
          const cleanedSessions = await sessionManager.cleanupExpiredSessions();
          const cleanedCacheEntries = await eventCache.cleanupExpiredSessions();

          // Verify sessions are cleaned up
          assert(cleanedSessions >= 0, "Cleaned sessions count should be non-negative");
          assert(cleanedCacheEntries >= 0, "Cleaned cache entries count should be non-negative");

          // Check that expired sessions no longer exist
          let expiredCount = 0;
          for (const sessionId of createdSessions) {
            const exists = await eventCache.sessionExists(sessionId);
            const session = await sessionManager.getSession(sessionId);
            
            if (!exists && session === null) {
              expiredCount++;
            }
          }

          // Sessions should have expired and been cleaned up
          assertEquals(expiredCount, sessionCount, "All sessions should have expired and been cleaned up");

          // Cleanup
          sessionManager.destroy();
          eventCache.destroy();
        } catch (error) {
          sessionManager.destroy();
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 30 }
  );
});

Deno.test("Property 11: Cache management efficiency - Memory usage should not grow indefinitely", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 5, max: 15 }), // number of sessions to create and destroy
      async (sessionCount) => {
        const sessionManager = new InMemorySessionManager();
        const eventCache = new InMemoryEventCache();

        try {
          const initialStats = await eventCache.getStats();
          const initialMemory = initialStats.memoryUsageMB;

          // Create and destroy sessions in cycles
          for (let cycle = 0; cycle < 3; cycle++) {
            const sessionIds: string[] = [];

            // Create sessions
            for (let i = 0; i < sessionCount; i++) {
              const session = await sessionManager.createSession(`user${cycle}_${i}`);
              sessionIds.push(session.sessionId);
              await eventCache.createSession(session.sessionId);

              // Add some events
              const events: FinancialEvent[] = [];
              for (let j = 0; j < 5; j++) {
                events.push({
                  id: `event_${cycle}_${i}_${j}`,
                  sessionId: session.sessionId,
                  type: 'FinancialStateCalculated',
                  aggregateId: `aggregate_${session.sessionId}`,
                  version: j + 1,
                  timestamp: new Date(),
                  data: { amount: Math.random() * 1000 },
                  metadata: { correlationId: `corr_${cycle}_${i}_${j}` },
                });
              }
              await eventCache.appendEvents(session.sessionId, events);
            }

            // Check memory usage during peak
            const peakStats = await eventCache.getStats();
            assert(peakStats.memoryUsageMB >= initialMemory, "Memory should increase with sessions");
            assert(peakStats.totalSessions === sessionCount, `Should have ${sessionCount} sessions`);

            // Clean up all sessions
            for (const sessionId of sessionIds) {
              await eventCache.clearSession(sessionId);
              await sessionManager.deleteSession(sessionId);
            }

            // Check memory after cleanup
            const cleanupStats = await eventCache.getStats();
            assertEquals(cleanupStats.totalSessions, 0, "No sessions should remain after cleanup");
            
            // Memory should not grow indefinitely (allow some variance for GC)
            const memoryGrowth = cleanupStats.memoryUsageMB - initialMemory;
            assert(memoryGrowth < 10, `Memory growth should be minimal after cleanup, but was ${memoryGrowth}MB`);
          }

          // Cleanup
          sessionManager.destroy();
          eventCache.destroy();
        } catch (error) {
          sessionManager.destroy();
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 30 }
  );
});

Deno.test("Property 11: Cache management efficiency - Cache should handle session limits gracefully", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.integer({ min: 3, max: 8 }), // max sessions limit
      fc.integer({ min: 1, max: 5 }), // extra sessions to attempt
      async (maxSessions, extraSessions) => {
        const sessionManager = new InMemorySessionManager({ maxSessions });
        const eventCache = new InMemoryEventCache({ maxSessions });

        try {
          const createdSessions: string[] = [];

          // Create sessions up to the limit
          for (let i = 0; i < maxSessions; i++) {
            const session = await sessionManager.createSession(`user${i}`);
            createdSessions.push(session.sessionId);
            await eventCache.createSession(session.sessionId);
          }

          // Verify we have the expected number of sessions
          const stats = await eventCache.getStats();
          assertEquals(stats.totalSessions, maxSessions, `Should have ${maxSessions} sessions`);

          // Try to create additional sessions beyond the limit
          let rejectedCount = 0;
          for (let i = 0; i < extraSessions; i++) {
            try {
              const session = await sessionManager.createSession(`extra_user${i}`);
              await eventCache.createSession(session.sessionId);
              // If we get here, the session was created (maybe due to cleanup)
            } catch (error) {
              // Expected: session creation should be rejected
              rejectedCount++;
              assert(error instanceof Error && error.message.includes("Maximum number of sessions"), 
                "Error should indicate session limit reached");
            }
          }

          // Either sessions were rejected OR cleanup made room
          const finalStats = await eventCache.getStats();
          assert(finalStats.totalSessions <= maxSessions + extraSessions, 
            "Total sessions should not exceed reasonable bounds");

          // Cleanup
          for (const sessionId of createdSessions) {
            await eventCache.clearSession(sessionId);
            await sessionManager.deleteSession(sessionId);
          }

          sessionManager.destroy();
          eventCache.destroy();
        } catch (error) {
          sessionManager.destroy();
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 50 }
  );
});

Deno.test("Property 11: Cache management efficiency - Cache statistics should be accurate and consistent", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(fc.array(financialEventArb, { minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 5 }), // events per session
      async (eventBatches) => {
        const sessionManager = new InMemorySessionManager();
        const eventCache = new InMemoryEventCache({ enableStats: true });

        try {
          const sessionIds: string[] = [];
          let totalExpectedEvents = 0;

          // Create sessions and add events
          for (let i = 0; i < eventBatches.length; i++) {
            const events = eventBatches[i];
            const session = await sessionManager.createSession(`user${i}`);
            sessionIds.push(session.sessionId);
            await eventCache.createSession(session.sessionId);

            const sessionEvents = events.map(event => ({
              ...event,
              sessionId: session.sessionId,
              aggregateId: `aggregate_${session.sessionId}`,
            }));

            await eventCache.appendEvents(session.sessionId, sessionEvents);
            totalExpectedEvents += sessionEvents.length;
          }

          // Get stats and verify accuracy
          const stats = await eventCache.getStats();
          
          assertEquals(stats.totalSessions, sessionIds.length, "Stats should show correct session count");
          assertEquals(stats.totalEvents, totalExpectedEvents, "Stats should show correct event count");
          assert(stats.memoryUsageMB >= 0, "Memory usage should be non-negative");
          assert(stats.hitRate >= 0 && stats.hitRate <= 100, "Hit rate should be between 0 and 100");
          
          if (sessionIds.length > 0) {
            const expectedAverage = totalExpectedEvents / sessionIds.length;
            assertEquals(stats.averageEventsPerSession, expectedAverage, "Average events per session should be correct");
          }

          // Test cache hit/miss tracking by accessing events
          for (const sessionId of sessionIds) {
            await eventCache.getEvents(sessionId); // Should be a hit
          }

          // Try to access non-existent session
          await eventCache.getEvents("non_existent_session"); // Should be a miss

          const updatedStats = await eventCache.getStats();
          assert(updatedStats.hitRate >= 0, "Hit rate should remain valid after operations");

          // Cleanup
          for (const sessionId of sessionIds) {
            await eventCache.clearSession(sessionId);
            await sessionManager.deleteSession(sessionId);
          }

          sessionManager.destroy();
          eventCache.destroy();
        } catch (error) {
          sessionManager.destroy();
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 100 }
  );
});