/**
 * Property-based test for event metadata completeness
 * **Feature: event-sourced-server-refactor, Property 10: Event metadata completeness**
 * **Validates: Requirements 4.1**
 */

import { assertEquals, assert } from "$std/assert/mod.ts";
import * as fc from "fast-check";
import { FinancialEventFactory } from "../../server/events/event-factory.ts";
import { FinancialEventProcessorCoordinator } from "../../server/events/financial-event-processors.ts";
import { EVENT_TYPES } from "../../server/interfaces/events.ts";
import type { FinancialEvent } from "../../server/interfaces/events.ts";

// Test generators for event data
const sessionIdArb = fc.string({ minLength: 10, maxLength: 50 });
const aggregateIdArb = fc.string({ minLength: 10, maxLength: 50 });
const userIdArb = fc.string({ minLength: 5, maxLength: 30 });
const correlationIdArb = fc.string({ minLength: 10, maxLength: 50 });
const causationIdArb = fc.string({ minLength: 10, maxLength: 50 });
const contextArb = fc.record({
  source: fc.constantFrom('user_action', 'system_process', 'scheduled_task'),
  requestId: fc.string({ minLength: 10, maxLength: 30 }),
  ipAddress: fc.option(fc.string({ minLength: 7, maxLength: 15 })),
});

const positiveAmountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true });
const rateArb = fc.float({ min: Math.fround(0), max: Math.fround(50), noNaN: true });
const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
const categoryArb = fc.constantFrom('living', 'housing', 'transport', 'entertainment');
const descriptionArb = fc.string({ minLength: 5, maxLength: 100 });
const loanIdArb = fc.string({ minLength: 5, maxLength: 20 });
const personIdArb = fc.string({ minLength: 5, maxLength: 20 });


// Generator for optional metadata
const optionalMetadataArb = fc.record({
  userId: fc.option(userIdArb),
  correlationId: fc.option(correlationIdArb),
  causationId: fc.option(causationIdArb),
  context: fc.option(contextArb),
});

Deno.test("Property 10: Event metadata completeness - All generated events should have complete metadata structure", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      optionalMetadataArb,
      (sessionId, aggregateId, _metadata) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);
        const processors = new FinancialEventProcessorCoordinator(eventFactory);

        // Generate various types of events to test metadata completeness
        const events: FinancialEvent[] = [];

        // Income events
        events.push(...processors.income.processSalaryPayment(
          5000,
          30,
          new Date(),
          'person1'
        ));

        // Expense event
        events.push(processors.expense.processExpensePayment(
          'living',
          2000,
          'Monthly expenses',
          new Date()
        ));

        // Loan events
        events.push(...processors.loan.processLoanPayment(
          'loan1',
          300000,
          5.5,
          2500,
          50000,
          new Date()
        ));

        // Investment events
        events.push(...processors.investment.processInvestmentUpdate(
          100000,
          1000,
          'salary',
          7,
          new Date(),
          'month', // interval parameter
          'holding1',
          'person1'
        ));

        // Super events
        events.push(...processors.super.processSuperUpdate(
          'super1',
          150000,
          500,
          'employer',
          6,
          new Date(),
          'month', // interval parameter
          'person1'
        ));

        // State event
        events.push(processors.state.processFinancialStateCalculation(
          10000,
          100000,
          150000,
          300000,
          50000,
          new Date()
        ));

        // Parameter change event
        events.push(processors.state.processParameterChange(
          'annualSalary',
          60000,
          65000,
          new Date(),
          'Annual salary increase'
        ));

        // Verify all events have complete metadata structure
        for (const event of events) {
          // Basic event structure
          assert(typeof event.id === 'string' && event.id.length > 0, "Event should have valid ID");
          assertEquals(event.sessionId, sessionId, "Event should have correct session ID");
          assertEquals(event.aggregateId, aggregateId, "Event should have correct aggregate ID");
          assert(typeof event.type === 'string' && event.type.length > 0, "Event should have valid type");
          assert(event.timestamp instanceof Date, "Event should have valid timestamp");
          assert(typeof event.version === 'number' && event.version > 0, "Event should have valid version");

          // Data structure
          assert(typeof event.data === 'object' && event.data !== null, "Event should have data object");
          assert(Object.keys(event.data).length > 0, "Event data should not be empty");

          // Metadata structure - this is the core requirement
          assert(typeof event.metadata === 'object' && event.metadata !== null, "Event should have metadata object");
          
          // Correlation ID should always be present (generated by factory)
          assert(
            typeof event.metadata.correlationId === 'string' && event.metadata.correlationId.length > 0,
            "Event metadata should have correlation ID"
          );

          // Optional metadata fields should be properly typed when present
          if (event.metadata.userId !== undefined) {
            assert(typeof event.metadata.userId === 'string', "User ID should be string when present");
          }

          if (event.metadata.causationId !== undefined) {
            assert(typeof event.metadata.causationId === 'string', "Causation ID should be string when present");
          }

          if (event.metadata.context !== undefined) {
            assert(typeof event.metadata.context === 'object', "Context should be object when present");
          }
        }

        // Verify event type-specific data completeness
        const eventsByType = events.reduce((acc, event) => {
          if (!acc[event.type]) acc[event.type] = [];
          acc[event.type].push(event);
          return acc;
        }, {} as Record<string, FinancialEvent[]>);

        // Salary events should have complete income data
        if (eventsByType[EVENT_TYPES.SALARY_RECEIVED]) {
          for (const event of eventsByType[EVENT_TYPES.SALARY_RECEIVED]) {
            assert(typeof event.data.grossAmount === 'number', "Salary event should have gross amount");
            assert(typeof event.data.netAmount === 'number', "Salary event should have net amount");
            assert(typeof event.data.taxAmount === 'number', "Salary event should have tax amount");
            assert(event.data.date instanceof Date, "Salary event should have date");
          }
        }

        // Tax events should have complete tax calculation data
        if (eventsByType[EVENT_TYPES.TAX_CALCULATED]) {
          for (const event of eventsByType[EVENT_TYPES.TAX_CALCULATED]) {
            assert(typeof event.data.grossIncome === 'number', "Tax event should have gross income");
            assert(typeof event.data.taxableIncome === 'number', "Tax event should have taxable income");
            assert(typeof event.data.taxAmount === 'number', "Tax event should have tax amount");
            assert(typeof event.data.deductibleInterest === 'number', "Tax event should have deductible interest");
            assert(event.data.date instanceof Date, "Tax event should have date");
          }
        }

        // Expense events should have complete expense data
        if (eventsByType[EVENT_TYPES.EXPENSE_PAID]) {
          for (const event of eventsByType[EVENT_TYPES.EXPENSE_PAID]) {
            assert(typeof event.data.category === 'string', "Expense event should have category");
            assert(typeof event.data.amount === 'number', "Expense event should have amount");
            assert(typeof event.data.description === 'string', "Expense event should have description");
            assert(event.data.date instanceof Date, "Expense event should have date");
          }
        }

        // Loan interest events should have complete loan data
        if (eventsByType[EVENT_TYPES.LOAN_INTEREST_CALCULATED]) {
          for (const event of eventsByType[EVENT_TYPES.LOAN_INTEREST_CALCULATED]) {
            assert(typeof event.data.loanId === 'string', "Loan interest event should have loan ID");
            assert(typeof event.data.balance === 'number', "Loan interest event should have balance");
            assert(typeof event.data.interestRate === 'number', "Loan interest event should have interest rate");
            assert(typeof event.data.interestAmount === 'number', "Loan interest event should have interest amount");
            assert(typeof event.data.effectiveBalance === 'number', "Loan interest event should have effective balance");
            assert(event.data.date instanceof Date, "Loan interest event should have date");
          }
        }

        // Loan principal events should have complete payment data
        if (eventsByType[EVENT_TYPES.LOAN_PRINCIPAL_PAID]) {
          for (const event of eventsByType[EVENT_TYPES.LOAN_PRINCIPAL_PAID]) {
            assert(typeof event.data.loanId === 'string', "Loan principal event should have loan ID");
            assert(typeof event.data.paymentAmount === 'number', "Loan principal event should have payment amount");
            assert(typeof event.data.principalAmount === 'number', "Loan principal event should have principal amount");
            assert(typeof event.data.newBalance === 'number', "Loan principal event should have new balance");
            assert(event.data.date instanceof Date, "Loan principal event should have date");
          }
        }

        // Investment contribution events should have complete contribution data
        if (eventsByType[EVENT_TYPES.INVESTMENT_CONTRIBUTION_MADE]) {
          for (const event of eventsByType[EVENT_TYPES.INVESTMENT_CONTRIBUTION_MADE]) {
            assert(typeof event.data.amount === 'number', "Investment contribution event should have amount");
            assert(['salary', 'cash'].includes(event.data.source), "Investment contribution event should have valid source");
            assert(event.data.date instanceof Date, "Investment contribution event should have date");
          }
        }

        // Investment growth events should have complete growth data
        if (eventsByType[EVENT_TYPES.INVESTMENT_GROWTH_APPLIED]) {
          for (const event of eventsByType[EVENT_TYPES.INVESTMENT_GROWTH_APPLIED]) {
            assert(typeof event.data.previousBalance === 'number', "Investment growth event should have previous balance");
            assert(typeof event.data.growthRate === 'number', "Investment growth event should have growth rate");
            assert(typeof event.data.growthAmount === 'number', "Investment growth event should have growth amount");
            assert(typeof event.data.newBalance === 'number', "Investment growth event should have new balance");
            assert(event.data.date instanceof Date, "Investment growth event should have date");
          }
        }

        // Super contribution events should have complete contribution data
        if (eventsByType[EVENT_TYPES.SUPER_CONTRIBUTION_MADE]) {
          for (const event of eventsByType[EVENT_TYPES.SUPER_CONTRIBUTION_MADE]) {
            assert(typeof event.data.superAccountId === 'string', "Super contribution event should have super account ID");
            assert(typeof event.data.amount === 'number', "Super contribution event should have amount");
            assert(['employer', 'salary_sacrifice', 'personal'].includes(event.data.contributionType), "Super contribution event should have valid contribution type");
            assert(event.data.date instanceof Date, "Super contribution event should have date");
          }
        }

        // Super growth events should have complete growth data
        if (eventsByType[EVENT_TYPES.SUPER_GROWTH_APPLIED]) {
          for (const event of eventsByType[EVENT_TYPES.SUPER_GROWTH_APPLIED]) {
            assert(typeof event.data.superAccountId === 'string', "Super growth event should have super account ID");
            assert(typeof event.data.previousBalance === 'number', "Super growth event should have previous balance");
            assert(typeof event.data.growthRate === 'number', "Super growth event should have growth rate");
            assert(typeof event.data.growthAmount === 'number', "Super growth event should have growth amount");
            assert(typeof event.data.newBalance === 'number', "Super growth event should have new balance");
            assert(event.data.date instanceof Date, "Super growth event should have date");
          }
        }

        // Parameter change events should have complete parameter data
        if (eventsByType[EVENT_TYPES.PARAMETER_CHANGED]) {
          for (const event of eventsByType[EVENT_TYPES.PARAMETER_CHANGED]) {
            assert(typeof event.data.parameterName === 'string', "Parameter change event should have parameter name");
            assert(event.data.previousValue !== undefined, "Parameter change event should have previous value");
            assert(event.data.newValue !== undefined, "Parameter change event should have new value");
            assert(event.data.effectiveDate instanceof Date, "Parameter change event should have effective date");
            assert(typeof event.data.reason === 'string', "Parameter change event should have reason");
          }
        }

        // Financial state events should have complete state data
        if (eventsByType[EVENT_TYPES.FINANCIAL_STATE_CALCULATED]) {
          for (const event of eventsByType[EVENT_TYPES.FINANCIAL_STATE_CALCULATED]) {
            assert(typeof event.data.cash === 'number', "Financial state event should have cash");
            assert(typeof event.data.investments === 'number', "Financial state event should have investments");
            assert(typeof event.data.superannuation === 'number', "Financial state event should have superannuation");
            assert(typeof event.data.loanBalance === 'number', "Financial state event should have loan balance");
            assert(typeof event.data.offsetBalance === 'number', "Financial state event should have offset balance");
            assert(typeof event.data.netWorth === 'number', "Financial state event should have net worth");
            assert(typeof event.data.cashFlow === 'number', "Financial state event should have cash flow");
            assert(event.data.date instanceof Date, "Financial state event should have date");
          }
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 10: Event metadata completeness - Events created with custom metadata should preserve it", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      userIdArb,
      correlationIdArb,
      causationIdArb,
      contextArb,
      positiveAmountArb,
      categoryArb,
      descriptionArb,
      dateArb,
      (sessionId, aggregateId, userId, correlationId, causationId, context, amount, category, description, date) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);

        // Create event with custom metadata
        const customMetadata = {
          userId,
          correlationId,
          causationId,
          context,
        };

        const event = eventFactory.createExpensePaidEvent(
          category,
          amount,
          description,
          date,
          undefined,
          customMetadata
        );

        // Verify custom metadata is preserved
        assertEquals(event.metadata.userId, userId, "Custom user ID should be preserved");
        assertEquals(event.metadata.correlationId, correlationId, "Custom correlation ID should be preserved");
        assertEquals(event.metadata.causationId, causationId, "Custom causation ID should be preserved");
        assertEquals(event.metadata.context, context, "Custom context should be preserved");

        // Verify event structure is still complete
        assert(typeof event.id === 'string' && event.id.length > 0, "Event should have valid ID");
        assertEquals(event.sessionId, sessionId, "Event should have correct session ID");
        assertEquals(event.aggregateId, aggregateId, "Event should have correct aggregate ID");
        assertEquals(event.type, EVENT_TYPES.EXPENSE_PAID, "Event should have correct type");
        assert(event.timestamp instanceof Date, "Event should have valid timestamp");
        assert(typeof event.version === 'number' && event.version > 0, "Event should have valid version");
        assert(typeof event.data === 'object' && event.data !== null, "Event should have data object");
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 10: Event metadata completeness - Event factory should generate unique IDs and correlation IDs", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      fc.integer({ min: 5, max: 50 }),
      (sessionId, aggregateId, eventCount) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);
        const events: FinancialEvent[] = [];

        // Generate multiple events
        for (let i = 0; i < eventCount; i++) {
          events.push(eventFactory.createExpensePaidEvent(
            'living',
            1000 + i,
            `Expense ${i}`,
            new Date()
          ));
        }

        // Verify all event IDs are unique
        const eventIds = events.map(e => e.id);
        const uniqueEventIds = new Set(eventIds);
        assertEquals(uniqueEventIds.size, eventIds.length, "All event IDs should be unique");

        // Verify all correlation IDs are unique (since they're generated per event)
        const correlationIds = events.map(e => e.metadata.correlationId).filter(id => id !== undefined);
        const uniqueCorrelationIds = new Set(correlationIds);
        assertEquals(uniqueCorrelationIds.size, correlationIds.length, "All correlation IDs should be unique");

        // Verify version numbers are sequential
        for (let i = 0; i < events.length; i++) {
          assertEquals(events[i].version, i + 1, `Event ${i} should have version ${i + 1}`);
        }

        // Verify all events belong to the same session and aggregate
        for (const event of events) {
          assertEquals(event.sessionId, sessionId, "All events should belong to the same session");
          assertEquals(event.aggregateId, aggregateId, "All events should belong to the same aggregate");
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 10: Event metadata completeness - Event timestamps should be reasonable and ordered", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      fc.integer({ min: 2, max: 10 }),
      (sessionId, aggregateId, eventCount) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);
        const events: FinancialEvent[] = [];
        const startTime = Date.now();

        // Generate events in sequence
        for (let i = 0; i < eventCount; i++) {
          events.push(eventFactory.createExpensePaidEvent(
            'living',
            1000,
            `Expense ${i}`,
            new Date()
          ));
        }

        const endTime = Date.now();

        // Verify all timestamps are within reasonable bounds
        for (const event of events) {
          assert(event.timestamp.getTime() >= startTime, "Event timestamp should not be before test start");
          assert(event.timestamp.getTime() <= endTime, "Event timestamp should not be after test end");
        }

        // Verify timestamps are in non-decreasing order (events created in sequence)
        for (let i = 1; i < events.length; i++) {
          assert(
            events[i].timestamp.getTime() >= events[i-1].timestamp.getTime(),
            "Event timestamps should be in non-decreasing order"
          );
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 10: Event metadata completeness - Event data should match input parameters exactly", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      positiveAmountArb,
      rateArb,
      dateArb,
      loanIdArb,
      personIdArb,
      (sessionId, aggregateId, grossAmount, taxRate, date, loanId, personId) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);

        // Test salary event data preservation
        const salaryEvent = eventFactory.createSalaryReceivedEvent(
          grossAmount,
          grossAmount * 0.7, // net amount
          grossAmount * 0.3, // tax amount
          date,
          personId,
          'income_source_1'
        );

        assertEquals(salaryEvent.data.grossAmount, grossAmount, "Salary event should preserve gross amount");
        assertEquals(salaryEvent.data.netAmount, grossAmount * 0.7, "Salary event should preserve net amount");
        assertEquals(salaryEvent.data.taxAmount, grossAmount * 0.3, "Salary event should preserve tax amount");
        assertEquals(salaryEvent.data.date, date, "Salary event should preserve date");
        assertEquals(salaryEvent.data.personId, personId, "Salary event should preserve person ID");
        assertEquals(salaryEvent.data.incomeSourceId, 'income_source_1', "Salary event should preserve income source ID");

        // Test loan interest event data preservation
        const loanInterestEvent = eventFactory.createLoanInterestCalculatedEvent(
          loanId,
          300000, // balance
          taxRate, // using taxRate as interest rate
          1250, // interest amount
          250000, // effective balance
          date
        );

        assertEquals(loanInterestEvent.data.loanId, loanId, "Loan interest event should preserve loan ID");
        assertEquals(loanInterestEvent.data.balance, 300000, "Loan interest event should preserve balance");
        assertEquals(loanInterestEvent.data.interestRate, taxRate, "Loan interest event should preserve interest rate");
        assertEquals(loanInterestEvent.data.interestAmount, 1250, "Loan interest event should preserve interest amount");
        assertEquals(loanInterestEvent.data.effectiveBalance, 250000, "Loan interest event should preserve effective balance");
        assertEquals(loanInterestEvent.data.date, date, "Loan interest event should preserve date");

        // Test parameter change event data preservation
        const parameterEvent = eventFactory.createParameterChangedEvent(
          'annualSalary',
          60000,
          grossAmount,
          date,
          'Annual review increase'
        );

        assertEquals(parameterEvent.data.parameterName, 'annualSalary', "Parameter event should preserve parameter name");
        assertEquals(parameterEvent.data.previousValue, 60000, "Parameter event should preserve previous value");
        assertEquals(parameterEvent.data.newValue, grossAmount, "Parameter event should preserve new value");
        assertEquals(parameterEvent.data.effectiveDate, date, "Parameter event should preserve effective date");
        assertEquals(parameterEvent.data.reason, 'Annual review increase', "Parameter event should preserve reason");
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 10: Event metadata completeness - Event factory should handle edge cases gracefully", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      (sessionId, aggregateId) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);

        // Test with minimal required data
        const minimalEvent = eventFactory.createExpensePaidEvent(
          'living',
          0.01, // minimum amount
          'a', // minimum description length would be validated by EventValidation
          new Date()
        );

        // Should still have complete metadata structure
        assert(typeof minimalEvent.id === 'string' && minimalEvent.id.length > 0, "Minimal event should have valid ID");
        assertEquals(minimalEvent.sessionId, sessionId, "Minimal event should have correct session ID");
        assertEquals(minimalEvent.aggregateId, aggregateId, "Minimal event should have correct aggregate ID");
        assert(typeof minimalEvent.metadata === 'object' && minimalEvent.metadata !== null, "Minimal event should have metadata");
        assert(typeof minimalEvent.metadata.correlationId === 'string', "Minimal event should have correlation ID");

        // Test with optional fields as undefined
        const investmentEvent = eventFactory.createInvestmentContributionMadeEvent(
          1000,
          'salary',
          new Date(),
          undefined, // no holding ID
          undefined  // no person ID
        );

        // Should still have complete structure
        assert(typeof investmentEvent.id === 'string' && investmentEvent.id.length > 0, "Investment event should have valid ID");
        assertEquals(investmentEvent.data.holdingId, undefined, "Investment event should handle undefined holding ID");
        assertEquals(investmentEvent.data.personId, undefined, "Investment event should handle undefined person ID");
        assert(typeof investmentEvent.metadata === 'object' && investmentEvent.metadata !== null, "Investment event should have metadata");

        // Test counter reset functionality
        eventFactory.resetCounter();
        assertEquals(eventFactory.getEventCounter(), 0, "Counter should reset to 0");

        const newEvent = eventFactory.createExpensePaidEvent(
          'transport',
          500,
          'Bus fare',
          new Date()
        );

        assertEquals(newEvent.version, 1, "First event after reset should have version 1");
        assertEquals(eventFactory.getEventCounter(), 1, "Counter should be 1 after creating one event");
      }
    ),
    { numRuns: 100 }
  );
});