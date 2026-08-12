/**
 * Property-based test for event immutability and ordering
 * **Feature: event-sourced-server-refactor, Property 2: Event immutability and ordering**
 * **Validates: Requirements 1.2, 1.3**
 */

import { assertEquals } from "$std/assert/mod.ts";
import * as fc from "fast-check";
import { InMemoryEventCache } from "../../server/cache/event-cache.ts";
import type { FinancialEvent } from "../../server/interfaces/events.ts";

// Test generators
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

Deno.test("Property 2: Event immutability and ordering - Events should be stored in chronological order", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 10, maxLength: 50 }), // sessionId
      fc.array(financialEventArb, { minLength: 2, maxLength: 20 }), // events
      async (sessionId, events) => {
        const eventCache = new InMemoryEventCache();

        try {
          // Update events to belong to the same session
          const sessionEvents = events.map(event => ({
            ...event,
            sessionId,
            aggregateId: `aggregate_${sessionId}`,
          }));

          // Create session and append events
          await eventCache.createSession(sessionId);
          await eventCache.appendEvents(sessionId, sessionEvents);

          // Retrieve events
          const retrievedEvents = await eventCache.getEvents(sessionId);

          // Events should be in chronological order by timestamp
          for (let i = 1; i < retrievedEvents.length; i++) {
            const prevTimestamp = retrievedEvents[i - 1].timestamp.getTime();
            const currTimestamp = retrievedEvents[i].timestamp.getTime();
            
            assertEquals(
              prevTimestamp <= currTimestamp,
              true,
              `Events should be in chronological order: ${prevTimestamp} <= ${currTimestamp}`
            );
          }

          // All original events should be present
          assertEquals(retrievedEvents.length, sessionEvents.length);

          // Events should maintain their original data
          const originalEventIds = new Set(sessionEvents.map(e => e.id));
          const retrievedEventIds = new Set(retrievedEvents.map(e => e.id));
          
          for (const originalId of originalEventIds) {
            assertEquals(
              retrievedEventIds.has(originalId),
              true,
              `Original event ${originalId} should be present in retrieved events`
            );
          }

          // Cleanup
          eventCache.destroy();
        } catch (error) {
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 2: Event immutability and ordering - Events should remain immutable once stored", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 10, maxLength: 50 }), // sessionId
      fc.array(financialEventArb, { minLength: 1, maxLength: 10 }), // events
      async (sessionId, events) => {
        const eventCache = new InMemoryEventCache();

        try {
          // Update events to belong to the same session
          const sessionEvents = events.map(event => ({
            ...event,
            sessionId,
            aggregateId: `aggregate_${sessionId}`,
          }));

          // Create deep copies of original events for comparison
          const originalEvents = sessionEvents.map(event => ({
            ...event,
            data: { ...event.data },
            metadata: { ...event.metadata },
            timestamp: new Date(event.timestamp.getTime()),
          }));

          // Create session and append events
          await eventCache.createSession(sessionId);
          await eventCache.appendEvents(sessionId, sessionEvents);

          // Retrieve events
          const retrievedEvents = await eventCache.getEvents(sessionId);

          // Attempt to modify the retrieved events (this should not affect stored events)
          for (const event of retrievedEvents) {
            // Try to modify various properties
            if (event.data.amount !== undefined) {
              event.data.amount = 999999;
            }
            if (event.data.description !== undefined) {
              event.data.description = "MODIFIED";
            }
            event.type = "MODIFIED_TYPE";
            event.version = 999999;
          }

          // Retrieve events again
          const retrievedEventsAgain = await eventCache.getEvents(sessionId);

          // Events should be unchanged (immutable)
          assertEquals(retrievedEventsAgain.length, originalEvents.length);

          for (let i = 0; i < originalEvents.length; i++) {
            const original = originalEvents[i];
            const retrieved = retrievedEventsAgain[i];

            assertEquals(retrieved.id, original.id, "Event ID should be unchanged");
            assertEquals(retrieved.sessionId, original.sessionId, "Session ID should be unchanged");
            assertEquals(retrieved.type, original.type, "Event type should be unchanged");
            assertEquals(retrieved.aggregateId, original.aggregateId, "Aggregate ID should be unchanged");
            assertEquals(retrieved.version, original.version, "Version should be unchanged");
            assertEquals(retrieved.timestamp.getTime(), original.timestamp.getTime(), "Timestamp should be unchanged");
            
            // Check data immutability
            if (original.data.amount !== undefined) {
              assertEquals(retrieved.data.amount, original.data.amount, "Data amount should be unchanged");
            }
            if (original.data.description !== undefined) {
              assertEquals(retrieved.data.description, original.data.description, "Data description should be unchanged");
            }
          }

          // Cleanup
          eventCache.destroy();
        } catch (error) {
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 2: Event immutability and ordering - Multiple append operations should maintain order", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 10, maxLength: 50 }), // sessionId
      fc.array(fc.array(financialEventArb, { minLength: 1, maxLength: 5 }), { minLength: 2, maxLength: 5 }), // batches of events
      async (sessionId, eventBatches) => {
        const eventCache = new InMemoryEventCache();

        try {
          await eventCache.createSession(sessionId);

          const allEvents: FinancialEvent[] = [];

          // Append events in batches
          for (const batch of eventBatches) {
            const sessionEvents = batch.map(event => ({
              ...event,
              sessionId,
              aggregateId: `aggregate_${sessionId}`,
            }));

            await eventCache.appendEvents(sessionId, sessionEvents);
            allEvents.push(...sessionEvents);
          }

          // Retrieve all events
          const retrievedEvents = await eventCache.getEvents(sessionId);

          // Should have all events
          assertEquals(retrievedEvents.length, allEvents.length);

          // Events should be in chronological order across all batches
          for (let i = 1; i < retrievedEvents.length; i++) {
            const prevTimestamp = retrievedEvents[i - 1].timestamp.getTime();
            const currTimestamp = retrievedEvents[i].timestamp.getTime();
            
            assertEquals(
              prevTimestamp <= currTimestamp,
              true,
              `Events should be in chronological order across batches: ${prevTimestamp} <= ${currTimestamp}`
            );
          }

          // All events should be present
          const allEventIds = new Set(allEvents.map(e => e.id));
          const retrievedEventIds = new Set(retrievedEvents.map(e => e.id));
          
          for (const eventId of allEventIds) {
            assertEquals(
              retrievedEventIds.has(eventId),
              true,
              `Event ${eventId} should be present after multiple append operations`
            );
          }

          // Cleanup
          eventCache.destroy();
        } catch (error) {
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 2: Event immutability and ordering - Events with timestamps should maintain chronological integrity", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.string({ minLength: 10, maxLength: 50 }), // sessionId
      fc.integer({ min: 5, max: 20 }), // number of events
      async (sessionId, eventCount) => {
        const eventCache = new InMemoryEventCache();

        try {
          await eventCache.createSession(sessionId);

          // Generate events with deliberately mixed timestamps
          const baseTime = new Date('2023-01-01').getTime();
          const events: FinancialEvent[] = [];

          for (let i = 0; i < eventCount; i++) {
            // Create timestamps that are not in order
            const randomOffset = Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000); // Random day in year
            const timestamp = new Date(baseTime + randomOffset);

            events.push({
              id: `event_${i}_${Math.random().toString(36).substr(2, 9)}`,
              sessionId,
              type: 'FinancialStateCalculated',
              aggregateId: `aggregate_${sessionId}`,
              version: i + 1,
              timestamp,
              data: {
                amount: Math.random() * 10000,
                date: timestamp,
              },
              metadata: {
                correlationId: `corr_${i}`,
              },
            });
          }

          // Append all events at once
          await eventCache.appendEvents(sessionId, events);

          // Retrieve events
          const retrievedEvents = await eventCache.getEvents(sessionId);

          // Events should be sorted by timestamp regardless of input order
          for (let i = 1; i < retrievedEvents.length; i++) {
            const prevTimestamp = retrievedEvents[i - 1].timestamp.getTime();
            const currTimestamp = retrievedEvents[i].timestamp.getTime();
            
            assertEquals(
              prevTimestamp <= currTimestamp,
              true,
              `Events should be chronologically ordered: event at index ${i-1} (${prevTimestamp}) should be <= event at index ${i} (${currTimestamp})`
            );
          }

          // All events should be present
          assertEquals(retrievedEvents.length, events.length);

          // Cleanup
          eventCache.destroy();
        } catch (error) {
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 100 }
  );
});