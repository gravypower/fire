/**
 * Property-based test for event generation completeness
 * **Feature: event-sourced-server-refactor, Property 1: Event generation completeness**
 * **Validates: Requirements 1.1, 2.1, 2.2, 2.3, 2.4, 2.5**
 */

import { assertEquals, assert } from "$std/assert/mod.ts";
import * as fc from "fast-check";
import { FinancialEventFactory } from "../../server/events/event-factory.ts";
import { FinancialEventProcessorCoordinator } from "../../server/events/financial-event-processors.ts";
import { EVENT_TYPES } from "../../server/interfaces/events.ts";
import type { FinancialEvent } from "../../server/interfaces/events.ts";

// Test generators for financial data
const positiveAmountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(1000000), noNaN: true });
const rateArb = fc.float({ min: Math.fround(0), max: Math.fround(100), noNaN: true });
const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });
const sessionIdArb = fc.string({ minLength: 10, maxLength: 50 });
const aggregateIdArb = fc.string({ minLength: 10, maxLength: 50 });
const loanIdArb = fc.string({ minLength: 5, maxLength: 20 });
const personIdArb = fc.string({ minLength: 5, maxLength: 20 });
const categoryArb = fc.constantFrom('living', 'housing', 'transport', 'entertainment', 'healthcare', 'education');
const descriptionArb = fc.string({ minLength: 5, maxLength: 100 });
const contributionTypeArb = fc.constantFrom('employer', 'salary_sacrifice', 'personal') as fc.Arbitrary<'employer' | 'salary_sacrifice' | 'personal'>;
const investmentSourceArb = fc.constantFrom('salary', 'cash') as fc.Arbitrary<'salary' | 'cash'>;

// Generator for complete financial simulation parameters
const financialSimulationArb = fc.record({
  sessionId: sessionIdArb,
  aggregateId: aggregateIdArb,
  date: dateArb,
  
  // Income parameters
  grossSalary: positiveAmountArb,
  taxRate: rateArb,
  
  // Expense parameters
  expenses: fc.array(fc.record({
    category: categoryArb,
    amount: positiveAmountArb,
    description: descriptionArb,
  }), { minLength: 1, maxLength: 5 }),
  
  // Loan parameters
  loans: fc.array(fc.record({
    loanId: loanIdArb,
    balance: positiveAmountArb,
    interestRate: rateArb,
    paymentAmount: positiveAmountArb,
    offsetBalance: positiveAmountArb,
  }), { minLength: 0, maxLength: 3 }),
  
  // Investment parameters
  investments: fc.array(fc.record({
    holdingId: fc.option(fc.string({ minLength: 5, maxLength: 20 })),
    balance: positiveAmountArb,
    contributionAmount: positiveAmountArb,
    growthRate: rateArb,
    source: investmentSourceArb,
  }), { minLength: 0, maxLength: 3 }),
  
  // Super parameters
  superAccounts: fc.array(fc.record({
    superAccountId: fc.string({ minLength: 5, maxLength: 20 }),
    balance: positiveAmountArb,
    contributionAmount: positiveAmountArb,
    contributionType: contributionTypeArb,
    growthRate: rateArb,
  }), { minLength: 0, maxLength: 2 }),
  
  // State parameters
  currentState: fc.record({
    cash: positiveAmountArb,
    investments: positiveAmountArb,
    superannuation: positiveAmountArb,
    loanBalance: positiveAmountArb,
    offsetBalance: positiveAmountArb,
  }),
});

Deno.test("Property 1: Event generation completeness - All required event types should be generated for complete simulation", async () => {
  await fc.assert(
    fc.property(
      financialSimulationArb,
      (simulation) => {
        const eventFactory = new FinancialEventFactory(simulation.sessionId, simulation.aggregateId);
        const processors = new FinancialEventProcessorCoordinator(eventFactory);
        const allEvents: FinancialEvent[] = [];

        // Generate income events
        const incomeEvents = processors.income.processSalaryPayment(
          simulation.grossSalary,
          simulation.taxRate,
          simulation.date,
          'person1'
        );
        allEvents.push(...incomeEvents);

        // Generate expense events
        for (const expense of simulation.expenses) {
          const expenseEvent = processors.expense.processExpensePayment(
            expense.category,
            expense.amount,
            expense.description,
            simulation.date
          );
          allEvents.push(expenseEvent);
        }

        // Generate loan events
        for (const loan of simulation.loans) {
          const loanEvents = processors.loan.processLoanPayment(
            loan.loanId,
            loan.balance,
            loan.interestRate,
            loan.paymentAmount,
            loan.offsetBalance,
            simulation.date
          );
          allEvents.push(...loanEvents);
        }

        // Generate investment events
        for (const investment of simulation.investments) {
          const investmentEvents = processors.investment.processInvestmentUpdate(
            investment.balance,
            investment.contributionAmount,
            investment.source,
            investment.growthRate,
            simulation.date,
            'month', // interval parameter
            investment.holdingId ?? undefined,
            'person1'
          );
          allEvents.push(...investmentEvents);
        }

        // Generate super events
        for (const superAccount of simulation.superAccounts) {
          const superEvents = processors.super.processSuperUpdate(
            superAccount.superAccountId,
            superAccount.balance,
            superAccount.contributionAmount,
            superAccount.contributionType,
            superAccount.growthRate,
            simulation.date,
            'month', // interval parameter
            'person1'
          );
          allEvents.push(...superEvents);
        }

        // Generate state event
        const stateEvent = processors.state.processFinancialStateCalculation(
          simulation.currentState.cash,
          simulation.currentState.investments,
          simulation.currentState.superannuation,
          simulation.currentState.loanBalance,
          simulation.currentState.offsetBalance,
          simulation.date
        );
        allEvents.push(stateEvent);

        // Verify all required event types are present
        const eventTypes = new Set(allEvents.map(event => event.type));

        // Income events should always be present
        assert(eventTypes.has(EVENT_TYPES.SALARY_RECEIVED), "SalaryReceived event should be generated");
        assert(eventTypes.has(EVENT_TYPES.TAX_CALCULATED), "TaxCalculated event should be generated");

        // Expense events should be present (we always have at least one expense)
        assert(eventTypes.has(EVENT_TYPES.EXPENSE_PAID), "ExpensePaid event should be generated");

        // Loan events should be present if loans exist
        if (simulation.loans.length > 0) {
          assert(eventTypes.has(EVENT_TYPES.LOAN_INTEREST_CALCULATED), "LoanInterestCalculated event should be generated when loans exist");
          assert(eventTypes.has(EVENT_TYPES.LOAN_PRINCIPAL_PAID), "LoanPrincipalPaid event should be generated when loans exist");
        }

        // Investment events should be present if investments exist
        if (simulation.investments.length > 0) {
          // At least one investment event type should be present
          const hasInvestmentEvents = eventTypes.has(EVENT_TYPES.INVESTMENT_CONTRIBUTION_MADE) || 
                                    eventTypes.has(EVENT_TYPES.INVESTMENT_GROWTH_APPLIED);
          assert(hasInvestmentEvents, "Investment events should be generated when investments exist");
        }

        // Super events should be present if super accounts exist
        if (simulation.superAccounts.length > 0) {
          // At least one super event type should be present
          const hasSuperEvents = eventTypes.has(EVENT_TYPES.SUPER_CONTRIBUTION_MADE) || 
                               eventTypes.has(EVENT_TYPES.SUPER_GROWTH_APPLIED);
          assert(hasSuperEvents, "Super events should be generated when super accounts exist");
        }

        // State event should always be present
        assert(eventTypes.has(EVENT_TYPES.FINANCIAL_STATE_CALCULATED), "FinancialStateCalculated event should be generated");

        // Verify event sequence and structure
        assert(allEvents.length > 0, "At least one event should be generated");
        
        // All events should have proper structure
        for (const event of allEvents) {
          assert(typeof event.id === 'string' && event.id.length > 0, "Event should have valid ID");
          assertEquals(event.sessionId, simulation.sessionId, "Event should belong to correct session");
          assertEquals(event.aggregateId, simulation.aggregateId, "Event should belong to correct aggregate");
          assert(typeof event.type === 'string' && event.type.length > 0, "Event should have valid type");
          assert(event.timestamp instanceof Date, "Event should have valid timestamp");
          assert(typeof event.data === 'object', "Event should have data object");
          assert(typeof event.metadata === 'object', "Event should have metadata object");
          assert(typeof event.version === 'number' && event.version > 0, "Event should have valid version");
        }

        // Events should be in chronological order (same timestamp in this case)
        for (let i = 1; i < allEvents.length; i++) {
          assert(allEvents[i].timestamp >= allEvents[i-1].timestamp, "Events should be in chronological order");
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 1: Event generation completeness - Income processing should generate both tax and salary events", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      positiveAmountArb,
      rateArb,
      dateArb,
      personIdArb,
      (sessionId, aggregateId, grossAmount, taxRate, date, personId) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);
        const processors = new FinancialEventProcessorCoordinator(eventFactory);

        const events = processors.income.processSalaryPayment(
          grossAmount,
          taxRate,
          date,
          personId
        );

        // Should generate exactly 2 events: tax calculation and salary received
        assertEquals(events.length, 2, "Income processing should generate exactly 2 events");

        const eventTypes = events.map(e => e.type);
        assert(eventTypes.includes(EVENT_TYPES.TAX_CALCULATED), "Should include TaxCalculated event");
        assert(eventTypes.includes(EVENT_TYPES.SALARY_RECEIVED), "Should include SalaryReceived event");

        // Tax event should come first (logical order)
        assertEquals(events[0].type, EVENT_TYPES.TAX_CALCULATED, "TaxCalculated event should come first");
        assertEquals(events[1].type, EVENT_TYPES.SALARY_RECEIVED, "SalaryReceived event should come second");

        // Verify data consistency between events
        const taxEvent = events[0];
        const salaryEvent = events[1];
        
        assertEquals(taxEvent.data.grossIncome, grossAmount, "Tax event should have correct gross income");
        assertEquals(salaryEvent.data.grossAmount, grossAmount, "Salary event should have correct gross amount");
        assertEquals(salaryEvent.data.taxAmount, taxEvent.data.taxAmount, "Tax amounts should match between events");
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 1: Event generation completeness - Loan processing should generate interest and principal events", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      loanIdArb,
      positiveAmountArb,
      rateArb,
      positiveAmountArb,
      positiveAmountArb,
      dateArb,
      (sessionId, aggregateId, loanId, balance, interestRate, paymentAmount, offsetBalance, date) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);
        const processors = new FinancialEventProcessorCoordinator(eventFactory);

        const events = processors.loan.processLoanPayment(
          loanId,
          balance,
          interestRate,
          paymentAmount,
          offsetBalance,
          date
        );

        // Should generate exactly 2 events: interest calculation and principal payment
        assertEquals(events.length, 2, "Loan processing should generate exactly 2 events");

        const eventTypes = events.map(e => e.type);
        assert(eventTypes.includes(EVENT_TYPES.LOAN_INTEREST_CALCULATED), "Should include LoanInterestCalculated event");
        assert(eventTypes.includes(EVENT_TYPES.LOAN_PRINCIPAL_PAID), "Should include LoanPrincipalPaid event");

        // Interest event should come first (logical order)
        assertEquals(events[0].type, EVENT_TYPES.LOAN_INTEREST_CALCULATED, "LoanInterestCalculated event should come first");
        assertEquals(events[1].type, EVENT_TYPES.LOAN_PRINCIPAL_PAID, "LoanPrincipalPaid event should come second");

        // Verify data consistency
        const interestEvent = events[0];
        const principalEvent = events[1];
        
        assertEquals(interestEvent.data.loanId, loanId, "Interest event should have correct loan ID");
        assertEquals(principalEvent.data.loanId, loanId, "Principal event should have correct loan ID");
        assertEquals(interestEvent.data.balance, balance, "Interest event should have correct balance");
        assertEquals(principalEvent.data.paymentAmount, paymentAmount, "Principal event should have correct payment amount");
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 1: Event generation completeness - Investment processing should generate contribution and growth events when applicable", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      positiveAmountArb,
      positiveAmountArb,
      investmentSourceArb,
      rateArb,
      dateArb,
      fc.option(fc.string({ minLength: 5, maxLength: 20 })),
      personIdArb,
      (sessionId, aggregateId, balance, contributionAmount, source, growthRate, date, holdingId, personId) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);
        const processors = new FinancialEventProcessorCoordinator(eventFactory);

        const events = processors.investment.processInvestmentUpdate(
          balance,
          contributionAmount,
          source,
          growthRate,
          date,
          'month', // interval parameter
          holdingId ?? undefined,
          personId
        );

        // Should generate 1-2 events depending on contribution amount
        assert(events.length >= 1 && events.length <= 2, "Investment processing should generate 1-2 events");

        const eventTypes = events.map(e => e.type);

        if (contributionAmount > 0) {
          assert(eventTypes.includes(EVENT_TYPES.INVESTMENT_CONTRIBUTION_MADE), "Should include InvestmentContributionMade event when contribution > 0");
        }

        // Should always include growth event if balance + contribution > 0
        if (balance + contributionAmount > 0) {
          assert(eventTypes.includes(EVENT_TYPES.INVESTMENT_GROWTH_APPLIED), "Should include InvestmentGrowthApplied event when balance > 0");
        }

        // If both events are present, contribution should come first
        if (events.length === 2) {
          assertEquals(events[0].type, EVENT_TYPES.INVESTMENT_CONTRIBUTION_MADE, "Contribution event should come first");
          assertEquals(events[1].type, EVENT_TYPES.INVESTMENT_GROWTH_APPLIED, "Growth event should come second");
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 1: Event generation completeness - Super processing should generate contribution and growth events when applicable", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      fc.string({ minLength: 5, maxLength: 20 }),
      positiveAmountArb,
      positiveAmountArb,
      contributionTypeArb,
      rateArb,
      dateArb,
      personIdArb,
      (sessionId, aggregateId, superAccountId, balance, contributionAmount, contributionType, growthRate, date, personId) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);
        const processors = new FinancialEventProcessorCoordinator(eventFactory);

        const events = processors.super.processSuperUpdate(
          superAccountId,
          balance,
          contributionAmount,
          contributionType,
          growthRate,
          date,
          'month', // interval parameter
          personId
        );

        // Should generate 1-2 events depending on contribution amount
        assert(events.length >= 1 && events.length <= 2, "Super processing should generate 1-2 events");

        const eventTypes = events.map(e => e.type);

        if (contributionAmount > 0) {
          assert(eventTypes.includes(EVENT_TYPES.SUPER_CONTRIBUTION_MADE), "Should include SuperContributionMade event when contribution > 0");
        }

        // Should always include growth event if balance + contribution > 0
        if (balance + contributionAmount > 0) {
          assert(eventTypes.includes(EVENT_TYPES.SUPER_GROWTH_APPLIED), "Should include SuperGrowthApplied event when balance > 0");
        }

        // If both events are present, contribution should come first
        if (events.length === 2) {
          assertEquals(events[0].type, EVENT_TYPES.SUPER_CONTRIBUTION_MADE, "Contribution event should come first");
          assertEquals(events[1].type, EVENT_TYPES.SUPER_GROWTH_APPLIED, "Growth event should come second");
        }

        // Verify super account ID consistency
        for (const event of events) {
          assertEquals(event.data.superAccountId, superAccountId, "All events should have correct super account ID");
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 1: Event generation completeness - All events should have complete and valid metadata", async () => {
  await fc.assert(
    fc.property(
      sessionIdArb,
      aggregateIdArb,
      positiveAmountArb,
      categoryArb,
      descriptionArb,
      dateArb,
      (sessionId, aggregateId, amount, category, description, date) => {
        const eventFactory = new FinancialEventFactory(sessionId, aggregateId);
        const processors = new FinancialEventProcessorCoordinator(eventFactory);

        // Generate a simple expense event
        const event = processors.expense.processExpensePayment(
          category,
          amount,
          description,
          date
        );

        // Verify complete event structure
        assert(typeof event.id === 'string' && event.id.length > 0, "Event should have valid ID");
        assertEquals(event.sessionId, sessionId, "Event should have correct session ID");
        assertEquals(event.aggregateId, aggregateId, "Event should have correct aggregate ID");
        assertEquals(event.type, EVENT_TYPES.EXPENSE_PAID, "Event should have correct type");
        assert(event.timestamp instanceof Date, "Event should have valid timestamp");
        assert(typeof event.version === 'number' && event.version > 0, "Event should have valid version");

        // Verify data completeness
        assert(typeof event.data === 'object' && event.data !== null, "Event should have data object");
        assertEquals(event.data.category, category, "Event data should have correct category");
        assertEquals(event.data.amount, amount, "Event data should have correct amount");
        assertEquals(event.data.description, description, "Event data should have correct description");
        assertEquals(event.data.date, date, "Event data should have correct date");

        // Verify metadata completeness
        assert(typeof event.metadata === 'object' && event.metadata !== null, "Event should have metadata object");
        assert(typeof event.metadata.correlationId === 'string' && event.metadata.correlationId.length > 0, "Event should have correlation ID");
      }
    ),
    { numRuns: 100 }
  );
});