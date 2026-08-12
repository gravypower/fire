/**
 * Property-based test for session isolation
 * **Feature: event-sourced-server-refactor, Property 4: Session isolation**
 * **Validates: Requirements 3.4, 8.1, 8.2**
 */

import { assertEquals, assertNotEquals } from "$std/assert/mod.ts";
import * as fc from "fast-check";
import { InMemorySessionManager } from "../../server/cache/session-manager.ts";
import { InMemoryEventCache } from "../../server/cache/event-cache.ts";
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
    'FinancialStateCalculated'
  ),
  aggregateId: fc.string({ minLength: 10, maxLength: 50 }),
  version: fc.integer({ min: 1, max: 1000 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  data: fc.record({
    amount: fc.float({ min: 0, max: 100000 }),
    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  }),
  metadata: fc.record({
    correlationId: fc.string({ minLength: 10, maxLength: 50 }),
  }),
}) as fc.Arbitrary<FinancialEvent>;

Deno.test("Property 4: Session isolation - Sessions should not interfere with each other", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.tuple(userParametersArb, userParametersArb),
      fc.array(financialEventArb, { minLength: 1, maxLength: 10 }),
      fc.array(financialEventArb, { minLength: 1, maxLength: 10 }),
      async ([params1, params2], events1, events2) => {
        const sessionManager = new InMemorySessionManager();
        const eventCache = new InMemoryEventCache();

        try {
          // Create two separate sessions
          const session1 = await sessionManager.createSession("user1", params1);
          const session2 = await sessionManager.createSession("user2", params2);

          // Sessions should have different IDs
          assertNotEquals(session1.sessionId, session2.sessionId);

          // Update events to belong to their respective sessions
          const session1Events = events1.map(event => ({
            ...event,
            sessionId: session1.sessionId,
            aggregateId: `aggregate_${session1.sessionId}`,
          }));

          const session2Events = events2.map(event => ({
            ...event,
            sessionId: session2.sessionId,
            aggregateId: `aggregate_${session2.sessionId}`,
          }));

          // Add events to each session
          await eventCache.createSession(session1.sessionId);
          await eventCache.createSession(session2.sessionId);
          await eventCache.appendEvents(session1.sessionId, session1Events);
          await eventCache.appendEvents(session2.sessionId, session2Events);

          // Retrieve events for each session
          const retrievedEvents1 = await eventCache.getEvents(session1.sessionId);
          const retrievedEvents2 = await eventCache.getEvents(session2.sessionId);

          // Session 1 should only see its own events
          assertEquals(retrievedEvents1.length, session1Events.length);
          for (const event of retrievedEvents1) {
            assertEquals(event.sessionId, session1.sessionId);
          }

          // Session 2 should only see its own events
          assertEquals(retrievedEvents2.length, session2Events.length);
          for (const event of retrievedEvents2) {
            assertEquals(event.sessionId, session2.sessionId);
          }

          // Events from session 1 should not appear in session 2
          const session1EventIds = new Set(session1Events.map(e => e.id));
          const session2EventIds = new Set(session2Events.map(e => e.id));
          
          for (const event of retrievedEvents1) {
            assertEquals(session1EventIds.has(event.id), true, "Session 1 should only contain its own events");
            assertEquals(session2EventIds.has(event.id), false, "Session 1 should not contain session 2 events");
          }

          for (const event of retrievedEvents2) {
            assertEquals(session2EventIds.has(event.id), true, "Session 2 should only contain its own events");
            assertEquals(session1EventIds.has(event.id), false, "Session 2 should not contain session 1 events");
          }

          // Session parameters should be isolated
          const retrievedSession1 = await sessionManager.getSession(session1.sessionId);
          const retrievedSession2 = await sessionManager.getSession(session2.sessionId);

          assertEquals(retrievedSession1?.parameters.annualSalary, params1.annualSalary);
          assertEquals(retrievedSession2?.parameters.annualSalary, params2.annualSalary);

          // Updating one session's parameters should not affect the other
          await sessionManager.updateSessionParameters(session1.sessionId, {
            annualSalary: params1.annualSalary + 10000,
          });

          const updatedSession1 = await sessionManager.getSession(session1.sessionId);
          const unchangedSession2 = await sessionManager.getSession(session2.sessionId);

          assertEquals(updatedSession1?.parameters.annualSalary, params1.annualSalary + 10000);
          assertEquals(unchangedSession2?.parameters.annualSalary, params2.annualSalary);

          // Cleanup
          sessionManager.destroy();
          eventCache.destroy();
        } catch (error) {
          // Cleanup on error
          sessionManager.destroy();
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 4: Session isolation - Concurrent session operations should not interfere", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.array(userParametersArb, { minLength: 2, maxLength: 5 }),
      async (paramsList) => {
        const sessionManager = new InMemorySessionManager();
        const eventCache = new InMemoryEventCache();

        try {
          // Create multiple sessions concurrently
          const sessionPromises = paramsList.map((params, index) => 
            sessionManager.createSession(`user${index}`, params)
          );
          
          const sessions = await Promise.all(sessionPromises);

          // All sessions should have unique IDs
          const sessionIds = sessions.map(s => s.sessionId);
          const uniqueIds = new Set(sessionIds);
          assertEquals(uniqueIds.size, sessions.length, "All sessions should have unique IDs");

          // Create event caches concurrently
          const cachePromises = sessions.map(session => 
            eventCache.createSession(session.sessionId)
          );
          await Promise.all(cachePromises);

          // Verify each session exists independently
          for (const session of sessions) {
            const exists = await eventCache.sessionExists(session.sessionId);
            assertEquals(exists, true, `Session ${session.sessionId} should exist`);
            
            const retrievedSession = await sessionManager.getSession(session.sessionId);
            assertEquals(retrievedSession?.sessionId, session.sessionId);
          }

          // Cleanup
          sessionManager.destroy();
          eventCache.destroy();
        } catch (error) {
          // Cleanup on error
          sessionManager.destroy();
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 50 }
  );
});