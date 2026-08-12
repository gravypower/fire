/**
 * Property-based tests for event replay determinism
 * **Feature: event-sourced-server-refactor, Property 3: Event replay determinism**
 * **Validates: Requirements 1.5, 3.3, 4.3, 6.4, 9.3**
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import * as fc from "fast-check";
import { InMemoryEventCache } from "../../server/cache/event-cache.ts";
import { EventReplayService } from "../../server/events/event-replay-service.ts";
import type { FinancialEvent } from "../../server/interfaces/events.ts";

/**
 * Generate random financial events for testing
 */
function generateFinancialEvent(sessionId: string, version: number) {
  return fc.record({
    id: fc.uuid(),
    sessionId: fc.constant(sessionId),
    type: fc.oneof(
      fc.constant('SalaryReceived'),
      fc.constant('TaxCalculated'),
      fc.constant('ExpensePaid'),
      fc.constant('LoanInterestCalculated'),
      fc.constant('LoanPrincipalPaid'),
      fc.constant('OffsetBalanceUpdated'),
      fc.constant('InvestmentContributionMade'),
      fc.constant('InvestmentGrowthApplied'),
      fc.constant('SuperContributionMade'),
      fc.constant('SuperGrowthApplied'),
      fc.constant('ParameterChanged'),
      fc.constant('FinancialStateCalculated')
    ),
    aggregateId: fc.uuid(),
    version: fc.constant(version),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    data: fc.record({
      amount: fc.integer({ min: 0, max: 100000 }),
      netAmount: fc.integer({ min: 0, max: 100000 }),
      grossAmount: fc.integer({ min: 0, max: 100000 }),
      paymentAmount: fc.integer({ min: 0, max: 100000 }),
      principalAmount: fc.integer({ min: 0, max: 100000 }),
      interestAmount: fc.integer({ min: 0, max: 100000 }),
      growthAmount: fc.integer({ min: 0, max: 100000 }),
      newBalance: fc.integer({ min: 0, max: 100000 }),
      previousBalance: fc.integer({ min: 0, max: 100000 }),
      cashTransferred: fc.integer({ min: 0, max: 100000 }),
      date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      // Add other common fields
      loanId: fc.option(fc.uuid(), { nil: fc.constant('default') }),
      holdingId: fc.option(fc.uuid(), { nil: fc.constant('default') }),
      superAccountId: fc.option(fc.uuid(), { nil: fc.constant('default') }),
      category: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
      description: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
      // Financial state fields
      cash: fc.integer({ min: 0, max: 100000 }),
      investments: fc.integer({ min: 0, max: 100000 }),
      superannuation: fc.integer({ min: 0, max: 100000 }),
      loanBalance: fc.integer({ min: 0, max: 100000 }),
      offsetBalance: fc.integer({ min: 0, max: 100000 }),
      netWorth: fc.integer({ min: -100000, max: 100000 }),
      cashFlow: fc.integer({ min: -100000, max: 100000 }),
    }),
    metadata: fc.record({
      userId: fc.option(fc.uuid(), { nil: undefined }),
      correlationId: fc.option(fc.uuid(), { nil: undefined }),
      causationId: fc.option(fc.uuid(), { nil: undefined }),
      context: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
    }),
  });
}

/**
 * Generate a sequence of financial events
 */
function generateEventSequence(sessionId: string, minEvents = 1, maxEvents = 50) {
  return fc.integer({ min: minEvents, max: maxEvents }).chain((count: number) => {
    return fc.array(
      fc.integer({ min: 1, max: count }).chain((version: number) => 
        generateFinancialEvent(sessionId, version)
      ),
      { minLength: count, maxLength: count }
    ).map((events: FinancialEvent[]) => {
      // Ensure unique versions and sort by version
      return events.map((event: FinancialEvent, index: number) => ({
        ...event,
        version: index + 1,
      })).sort((a: FinancialEvent, b: FinancialEvent) => a.version - b.version);
    });
  });
}

Deno.test("Property: Event replay determinism - replaying same events produces identical results", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // sessionId
      generateEventSequence("test-session", 5, 20), // events
      async (sessionId: string, events: FinancialEvent[]) => {
        // Create fresh cache and replay service for each test
        const cache = new InMemoryEventCache();
        const replayService = new EventReplayService(cache);

        // Create session and add events
        await cache.createSession(sessionId);
        
        // Update events to use the correct sessionId
        const sessionEvents = events.map((event: FinancialEvent) => ({
          ...event,
          sessionId,
        }));
        
        await cache.appendEvents(sessionId, sessionEvents);

        // Perform first replay
        const firstReplay = await replayService.replayEvents(sessionId, {
          includeSteps: true,
        });

        // Perform second replay
        const secondReplay = await replayService.replayEvents(sessionId, {
          includeSteps: true,
        });

        // Verify that both replays produce identical results
        assertEquals(firstReplay.totalEvents, secondReplay.totalEvents, "Total events should match");
        assertEquals(firstReplay.steps.length, secondReplay.steps.length, "Number of steps should match");
        
        // Compare final states
        assertEquals(
          firstReplay.finalState.cash,
          secondReplay.finalState.cash,
          "Final cash should be identical"
        );
        assertEquals(
          firstReplay.finalState.investments,
          secondReplay.finalState.investments,
          "Final investments should be identical"
        );
        assertEquals(
          firstReplay.finalState.superannuation,
          secondReplay.finalState.superannuation,
          "Final superannuation should be identical"
        );
        assertEquals(
          firstReplay.finalState.loanBalance,
          secondReplay.finalState.loanBalance,
          "Final loan balance should be identical"
        );
        assertEquals(
          firstReplay.finalState.offsetBalance,
          secondReplay.finalState.offsetBalance,
          "Final offset balance should be identical"
        );
        assertEquals(
          firstReplay.finalState.netWorth,
          secondReplay.finalState.netWorth,
          "Final net worth should be identical"
        );

        // Compare each step
        for (let i = 0; i < firstReplay.steps.length; i++) {
          const firstStep = firstReplay.steps[i];
          const secondStep = secondReplay.steps[i];

          assertEquals(firstStep.event.id, secondStep.event.id, `Step ${i}: Event ID should match`);
          assertEquals(firstStep.event.version, secondStep.event.version, `Step ${i}: Event version should match`);
          assertEquals(firstStep.stepNumber, secondStep.stepNumber, `Step ${i}: Step number should match`);
          
          // Compare states after each step
          assertEquals(
            firstStep.stateAfter.cash,
            secondStep.stateAfter.cash,
            `Step ${i}: Cash after should be identical`
          );
          assertEquals(
            firstStep.stateAfter.netWorth,
            secondStep.stateAfter.netWorth,
            `Step ${i}: Net worth after should be identical`
          );
        }

        // Clean up
        cache.destroy();
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property: Event replay determinism - version range filtering is consistent", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // sessionId
      generateEventSequence("test-session", 5, 15), // events
      async (sessionId: string, events: FinancialEvent[]) => {
        if (events.length < 3) return; // Need at least 3 events

        const cache = new InMemoryEventCache();
        const replayService = new EventReplayService(cache);

        await cache.createSession(sessionId);
        
        const sessionEvents = events.map((event: FinancialEvent) => ({
          ...event,
          sessionId,
        }));
        
        await cache.appendEvents(sessionId, sessionEvents);

        const midPoint = Math.floor(events.length / 2);

        // Replay first half
        const firstHalfReplay = await replayService.replayEvents(sessionId, {
          versionRange: { from: 1, to: midPoint },
          includeSteps: false,
        });

        // Replay second half
        const secondHalfReplay = await replayService.replayEvents(sessionId, {
          versionRange: { from: midPoint + 1, to: events.length },
          includeSteps: false,
        });

        // Replay full sequence
        const fullReplay = await replayService.replayEvents(sessionId, {
          includeSteps: false,
        });

        // Total events should add up
        assertEquals(
          firstHalfReplay.totalEvents + secondHalfReplay.totalEvents,
          fullReplay.totalEvents,
          "Split replay total events should equal full replay total events"
        );

        cache.destroy();
      }
    ),
    { numRuns: 30 }
  );
});

Deno.test("Property: Event replay determinism - time range filtering produces consistent results", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // sessionId
      generateEventSequence("test-session", 5, 25), // events
      async (sessionId: string, events: FinancialEvent[]) => {
        const cache = new InMemoryEventCache();
        const replayService = new EventReplayService(cache);

        await cache.createSession(sessionId);
        
        // Sort events by timestamp to ensure proper ordering
        const sortedEvents = events.map((event: FinancialEvent) => ({
          ...event,
          sessionId,
        })).sort((a: FinancialEvent, b: FinancialEvent) => a.timestamp.getTime() - b.timestamp.getTime());
        
        await cache.appendEvents(sessionId, sortedEvents);

        if (sortedEvents.length < 3) return; // Need at least 3 events

        // Define time range that includes middle events
        const firstEventTime = sortedEvents[0].timestamp;
        const lastEventTime = sortedEvents[sortedEvents.length - 1].timestamp;
        const midTime = new Date((firstEventTime.getTime() + lastEventTime.getTime()) / 2);

        // Replay with time range filter
        const timeRangeReplay = await replayService.replayEvents(sessionId, {
          timeRange: { from: firstEventTime, to: midTime },
          includeSteps: true,
        });

        // Replay without filter and manually filter results
        const fullReplay = await replayService.replayEvents(sessionId, {
          includeSteps: true,
        });

        const manuallyFilteredSteps = fullReplay.steps.filter(step => 
          step.event.timestamp >= firstEventTime && step.event.timestamp <= midTime
        );

        // Results should be consistent
        assertEquals(
          timeRangeReplay.steps.length,
          manuallyFilteredSteps.length,
          "Time range filtered replay should match manually filtered results"
        );

        // Compare each step
        for (let i = 0; i < timeRangeReplay.steps.length; i++) {
          assertEquals(
            timeRangeReplay.steps[i].event.id,
            manuallyFilteredSteps[i].event.id,
            `Step ${i}: Event IDs should match in time range filtering`
          );
        }

        cache.destroy();
      }
    ),
    { numRuns: 50 }
  );
});

Deno.test("Property: Event replay determinism - replay with different step inclusion produces same final state", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // sessionId
      generateEventSequence("test-session", 3, 15), // events
      async (sessionId: string, events: FinancialEvent[]) => {
        const cache = new InMemoryEventCache();
        const replayService = new EventReplayService(cache);

        await cache.createSession(sessionId);
        
        const sessionEvents = events.map((event: FinancialEvent) => ({
          ...event,
          sessionId,
        }));
        
        await cache.appendEvents(sessionId, sessionEvents);

        // Replay with steps included
        const replayWithSteps = await replayService.replayEvents(sessionId, {
          includeSteps: true,
        });

        // Replay without steps
        const replayWithoutSteps = await replayService.replayEvents(sessionId, {
          includeSteps: false,
        });

        // Final states should be identical regardless of step inclusion
        assertEquals(
          replayWithSteps.finalState.cash,
          replayWithoutSteps.finalState.cash,
          "Final cash should be identical regardless of step inclusion"
        );
        assertEquals(
          replayWithSteps.finalState.investments,
          replayWithoutSteps.finalState.investments,
          "Final investments should be identical regardless of step inclusion"
        );
        assertEquals(
          replayWithSteps.finalState.superannuation,
          replayWithoutSteps.finalState.superannuation,
          "Final superannuation should be identical regardless of step inclusion"
        );
        assertEquals(
          replayWithSteps.finalState.netWorth,
          replayWithoutSteps.finalState.netWorth,
          "Final net worth should be identical regardless of step inclusion"
        );

        // Total events should match
        assertEquals(
          replayWithSteps.totalEvents,
          replayWithoutSteps.totalEvents,
          "Total events should match regardless of step inclusion"
        );

        // Steps should only be present when requested
        assertEquals(
          replayWithSteps.steps.length > 0,
          true,
          "Replay with steps should have steps"
        );
        assertEquals(
          replayWithoutSteps.steps.length,
          0,
          "Replay without steps should have no steps"
        );

        cache.destroy();
      }
    ),
    { numRuns: 75 }
  );
});

Deno.test("Property: Event replay determinism - empty event sequence produces zero state", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.uuid(), // sessionId
      async (sessionId: string) => {
        const cache = new InMemoryEventCache();
        const replayService = new EventReplayService(cache);

        await cache.createSession(sessionId);
        // Don't add any events

        const replay = await replayService.replayEvents(sessionId, {
          includeSteps: true,
        });

        // Should produce zero state
        assertEquals(replay.finalState.cash, 0, "Empty replay should have zero cash");
        assertEquals(replay.finalState.investments, 0, "Empty replay should have zero investments");
        assertEquals(replay.finalState.superannuation, 0, "Empty replay should have zero superannuation");
        assertEquals(replay.finalState.loanBalance, 0, "Empty replay should have zero loan balance");
        assertEquals(replay.finalState.offsetBalance, 0, "Empty replay should have zero offset balance");
        assertEquals(replay.finalState.netWorth, 0, "Empty replay should have zero net worth");
        assertEquals(replay.totalEvents, 0, "Empty replay should have zero events");
        assertEquals(replay.steps.length, 0, "Empty replay should have no steps");

        cache.destroy();
      }
    ),
    { numRuns: 25 }
  );
});