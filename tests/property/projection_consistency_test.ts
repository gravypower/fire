/**
 * Property-based test for projection consistency
 * **Feature: event-sourced-server-refactor, Property 6: Projection consistency**
 * **Validates: Requirements 3.1, 3.2, 9.2**
 */

import { assertEquals, assert } from "$std/assert/mod.ts";
import * as fc from "fast-check";
import { InMemoryEventCache } from "../../server/cache/event-cache.ts";
import { InMemorySessionManager } from "../../server/cache/session-manager.ts";
import { FinancialEventFactory } from "../../server/events/event-factory.ts";
import { FinancialEventProcessorCoordinator } from "../../server/events/financial-event-processors.ts";
import { 
  FinancialProjectionBuilder,
  TimelineProjectionBuilder,
  createProjectionService
} from "../../server/projections/index.ts";
import type { FinancialEvent } from "../../server/interfaces/events.ts";
import type { UserParameters } from "../../types/financial.ts";

// Test generators
const positiveAmountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(100000), noNaN: true });
const rateArb = fc.float({ min: Math.fround(0), max: Math.fround(20), noNaN: true });
const dateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') });
const sessionIdArb = fc.string({ minLength: 10, maxLength: 50 });
const aggregateIdArb = fc.string({ minLength: 10, maxLength: 50 });
const loanIdArb = fc.string({ minLength: 5, maxLength: 20 });
const personIdArb = fc.string({ minLength: 5, maxLength: 20 });
const categoryArb = fc.constantFrom('living', 'housing', 'transport', 'entertainment');
const descriptionArb = fc.string({ minLength: 5, maxLength: 50 });

// Generator for user parameters
const userParametersArb = fc.record({
  annualSalary: fc.integer({ min: 30000, max: 150000 }),
  salaryFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly'),
  incomeTaxRate: fc.integer({ min: 0, max: 45 }),
  monthlyLivingExpenses: fc.integer({ min: 1000, max: 5000 }),
  monthlyRentOrMortgage: fc.integer({ min: 500, max: 3000 }),
  loanPrincipal: fc.integer({ min: 0, max: 500000 }),
  loanInterestRate: fc.float({ min: 0, max: 10 }),
  loanPaymentAmount: fc.integer({ min: 0, max: 5000 }),
  loanPaymentFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly'),
  useOffsetAccount: fc.boolean(),
  currentOffsetBalance: fc.integer({ min: 0, max: 50000 }),
  monthlyInvestmentContribution: fc.integer({ min: 0, max: 2000 }),
  investmentReturnRate: fc.float({ min: 0, max: 15 }),
  currentInvestmentBalance: fc.integer({ min: 0, max: 200000 }),
  superContributionRate: fc.float({ min: 0, max: 15 }),
  superReturnRate: fc.float({ min: 0, max: 12 }),
  currentSuperBalance: fc.integer({ min: 0, max: 300000 }),
  desiredAnnualRetirementIncome: fc.integer({ min: 30000, max: 100000 }),
  retirementAge: fc.integer({ min: 60, max: 70 }),
  currentAge: fc.integer({ min: 25, max: 55 }),
  simulationYears: fc.integer({ min: 10, max: 40 }),
  startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }),
}) as fc.Arbitrary<UserParameters>;

// Generator for financial event sequences
const financialEventSequenceArb = fc.record({
  sessionId: sessionIdArb,
  aggregateId: aggregateIdArb,
  baseDate: dateArb,
  
  // Income events
  salaryEvents: fc.array(fc.record({
    grossAmount: positiveAmountArb,
    taxRate: rateArb,
    personId: personIdArb,
    dayOffset: fc.integer({ min: 0, max: 365 }),
  }), { minLength: 1, maxLength: 12 }),
  
  // Expense events
  expenseEvents: fc.array(fc.record({
    category: categoryArb,
    amount: positiveAmountArb,
    description: descriptionArb,
    dayOffset: fc.integer({ min: 0, max: 365 }),
  }), { minLength: 0, maxLength: 10 }),
  
  // Loan events
  loanEvents: fc.array(fc.record({
    loanId: loanIdArb,
    balance: positiveAmountArb,
    interestRate: rateArb,
    paymentAmount: positiveAmountArb,
    offsetBalance: positiveAmountArb,
    dayOffset: fc.integer({ min: 0, max: 365 }),
  }), { minLength: 0, maxLength: 5 }),
  
  // Investment events
  investmentEvents: fc.array(fc.record({
    balance: positiveAmountArb,
    contributionAmount: positiveAmountArb,
    growthRate: rateArb,
    holdingId: fc.option(fc.string({ minLength: 5, maxLength: 20 })),
    personId: personIdArb,
    dayOffset: fc.integer({ min: 0, max: 365 }),
  }), { minLength: 0, maxLength: 5 }),
  
  // State events
  stateEvents: fc.array(fc.record({
    cash: positiveAmountArb,
    investments: positiveAmountArb,
    superannuation: positiveAmountArb,
    loanBalance: positiveAmountArb,
    offsetBalance: positiveAmountArb,
    dayOffset: fc.integer({ min: 0, max: 365 }),
  }), { minLength: 1, maxLength: 12 }),
});

Deno.test("Property 6: Projection consistency - Financial projections should accurately reflect all events", async () => {
  await fc.assert(
    fc.asyncProperty(
      financialEventSequenceArb,
      async (eventSequence) => {
        const eventCache = new InMemoryEventCache();
        const sessionManager = new InMemorySessionManager();
        
        try {
          // Create session and event cache
          await eventCache.createSession(eventSequence.sessionId);
          
          // Generate events using the event processors
          const eventFactory = new FinancialEventFactory(eventSequence.sessionId, eventSequence.aggregateId);
          const processors = new FinancialEventProcessorCoordinator(eventFactory);
          const allEvents: FinancialEvent[] = [];

          // Generate salary events
          for (const salaryData of eventSequence.salaryEvents) {
            const eventDate = new Date(eventSequence.baseDate);
            eventDate.setDate(eventDate.getDate() + salaryData.dayOffset);
            
            const events = processors.income.processSalaryPayment(
              salaryData.grossAmount,
              salaryData.taxRate,
              eventDate,
              salaryData.personId
            );
            allEvents.push(...events);
          }

          // Generate expense events
          for (const expenseData of eventSequence.expenseEvents) {
            const eventDate = new Date(eventSequence.baseDate);
            eventDate.setDate(eventDate.getDate() + expenseData.dayOffset);
            
            const event = processors.expense.processExpensePayment(
              expenseData.category,
              expenseData.amount,
              expenseData.description,
              eventDate
            );
            allEvents.push(event);
          }

          // Generate loan events
          for (const loanData of eventSequence.loanEvents) {
            const eventDate = new Date(eventSequence.baseDate);
            eventDate.setDate(eventDate.getDate() + loanData.dayOffset);
            
            const events = processors.loan.processLoanPayment(
              loanData.loanId,
              loanData.balance,
              loanData.interestRate,
              loanData.paymentAmount,
              loanData.offsetBalance,
              eventDate
            );
            allEvents.push(...events);
          }

          // Generate investment events
          for (const investmentData of eventSequence.investmentEvents) {
            const eventDate = new Date(eventSequence.baseDate);
            eventDate.setDate(eventDate.getDate() + investmentData.dayOffset);
            
            const events = processors.investment.processInvestmentUpdate(
              investmentData.balance,
              investmentData.contributionAmount,
              'cash',
              investmentData.growthRate,
              eventDate,
              'month',
              investmentData.holdingId ?? undefined,
              investmentData.personId
            );
            allEvents.push(...events);
          }

          // Generate state events
          for (const stateData of eventSequence.stateEvents) {
            const eventDate = new Date(eventSequence.baseDate);
            eventDate.setDate(eventDate.getDate() + stateData.dayOffset);
            
            const event = processors.state.processFinancialStateCalculation(
              stateData.cash,
              stateData.investments,
              stateData.superannuation,
              stateData.loanBalance,
              stateData.offsetBalance,
              eventDate
            );
            allEvents.push(event);
          }

          // Sort events chronologically
          allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

          // Store events in cache
          await eventCache.appendEvents(eventSequence.sessionId, allEvents);

          // Build financial projection
          const financialBuilder = new FinancialProjectionBuilder(eventCache);
          const projection = await financialBuilder.build(eventSequence.sessionId);

          // Verify projection consistency
          assertEquals(projection.sessionId, eventSequence.sessionId, "Projection should belong to correct session");
          assertEquals(projection.version, allEvents.length > 0 ? Math.max(...allEvents.map(e => e.version)) : 0, "Projection version should match latest event version");
          assert(projection.lastUpdated instanceof Date, "Projection should have valid last updated timestamp");

          // Verify current state reflects all events
          assert(typeof projection.currentState.cash === 'number', "Current state should have valid cash amount");
          assert(typeof projection.currentState.investments === 'number', "Current state should have valid investment amount");
          assert(typeof projection.currentState.superannuation === 'number', "Current state should have valid super amount");
          assert(typeof projection.currentState.loanBalance === 'number', "Current state should have valid loan balance");
          assert(typeof projection.currentState.offsetBalance === 'number', "Current state should have valid offset balance");
          assert(typeof projection.currentState.netWorth === 'number', "Current state should have valid net worth");
          assert(projection.currentState.date instanceof Date, "Current state should have valid date");

          // Verify balance breakdown is consistent with aggregate balances
          const totalLoanBalance = Object.values(projection.balanceBreakdown.loanBalances).reduce((sum, balance) => sum + balance, 0);
          const totalSuperBalance = Object.values(projection.balanceBreakdown.superBalances).reduce((sum, balance) => sum + balance, 0);
          const totalOffsetBalance = Object.values(projection.balanceBreakdown.offsetBalances).reduce((sum, balance) => sum + balance, 0);
          const totalInvestmentBalance = Object.values(projection.balanceBreakdown.investmentBalances).reduce((sum, balance) => sum + balance, 0);

          // Allow for small floating point differences
          const tolerance = 0.01;
          assert(Math.abs(projection.currentState.loanBalance - totalLoanBalance) < tolerance, "Aggregate loan balance should match breakdown sum");
          assert(Math.abs(projection.currentState.superannuation - totalSuperBalance) < tolerance, "Aggregate super balance should match breakdown sum");
          assert(Math.abs(projection.currentState.offsetBalance - totalOffsetBalance) < tolerance, "Aggregate offset balance should match breakdown sum");
          assert(Math.abs(projection.currentState.investments - totalInvestmentBalance) < tolerance, "Aggregate investment balance should match breakdown sum");

          // Verify net worth calculation
          const expectedNetWorth = projection.currentState.cash + 
                                 projection.currentState.investments + 
                                 projection.currentState.superannuation - 
                                 projection.currentState.loanBalance + 
                                 projection.currentState.offsetBalance;
          assert(Math.abs(projection.currentState.netWorth - expectedNetWorth) < tolerance, "Net worth should be calculated correctly");

          // Cleanup
          eventCache.destroy();
          sessionManager.destroy();
        } catch (error) {
          // Cleanup on error
          eventCache.destroy();
          sessionManager.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 6: Projection consistency - Timeline projections should maintain chronological order", async () => {
  await fc.assert(
    fc.asyncProperty(
      financialEventSequenceArb,
      userParametersArb,
      async (eventSequence, userParams) => {
        const eventCache = new InMemoryEventCache();
        const sessionManager = new InMemorySessionManager();
        
        try {
          // Create session with parameters
          const session = await sessionManager.createSession("user1", userParams);
          await eventCache.createSession(session.sessionId);
          
          // Generate events (simplified for timeline testing)
          const eventFactory = new FinancialEventFactory(session.sessionId, eventSequence.aggregateId);
          const processors = new FinancialEventProcessorCoordinator(eventFactory);
          const allEvents: FinancialEvent[] = [];

          // Generate a few state events at different times
          for (const stateData of eventSequence.stateEvents.slice(0, 5)) {
            const eventDate = new Date(eventSequence.baseDate);
            eventDate.setDate(eventDate.getDate() + stateData.dayOffset);
            
            const event = processors.state.processFinancialStateCalculation(
              stateData.cash,
              stateData.investments,
              stateData.superannuation,
              stateData.loanBalance,
              stateData.offsetBalance,
              eventDate
            );
            allEvents.push(event);
          }

          // Sort events chronologically
          allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          await eventCache.appendEvents(session.sessionId, allEvents);

          // Build timeline projection
          const timelineBuilder = new TimelineProjectionBuilder(eventCache, sessionManager);
          const timeline = await timelineBuilder.build(session.sessionId);

          // Verify timeline consistency
          assertEquals(timeline.sessionId, session.sessionId, "Timeline should belong to correct session");
          assert(timeline.states.length >= 0, "Timeline should have states array");
          assert(Array.isArray(timeline.milestones), "Timeline should have milestones array");
          assert(typeof timeline.retirementAnalysis === 'object', "Timeline should have retirement analysis");

          // Verify chronological order of states
          for (let i = 1; i < timeline.states.length; i++) {
            assert(timeline.states[i].date >= timeline.states[i-1].date, 
              `Timeline states should be in chronological order: ${timeline.states[i-1].date} <= ${timeline.states[i].date}`);
          }

          // Verify each state has required properties
          for (const state of timeline.states) {
            assert(state.date instanceof Date, "Each state should have valid date");
            assert(typeof state.cash === 'number', "Each state should have cash amount");
            assert(typeof state.investments === 'number', "Each state should have investment amount");
            assert(typeof state.superannuation === 'number', "Each state should have super amount");
            assert(typeof state.loanBalance === 'number', "Each state should have loan balance");
            assert(typeof state.offsetBalance === 'number', "Each state should have offset balance");
            assert(typeof state.netWorth === 'number', "Each state should have net worth");
            assert(typeof state.cashFlow === 'number', "Each state should have cash flow");
          }

          // Cleanup
          eventCache.destroy();
          sessionManager.destroy();
        } catch (error) {
          // Cleanup on error
          eventCache.destroy();
          sessionManager.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 50 }
  );
});

Deno.test("Property 6: Projection consistency - Rebuilding projections should produce identical results", async () => {
  await fc.assert(
    fc.asyncProperty(
      financialEventSequenceArb,
      async (eventSequence) => {
        const eventCache = new InMemoryEventCache();
        
        try {
          // Create session and events
          await eventCache.createSession(eventSequence.sessionId);
          
          const eventFactory = new FinancialEventFactory(eventSequence.sessionId, eventSequence.aggregateId);
          const processors = new FinancialEventProcessorCoordinator(eventFactory);
          const allEvents: FinancialEvent[] = [];

          // Generate some events
          for (const stateData of eventSequence.stateEvents.slice(0, 3)) {
            const eventDate = new Date(eventSequence.baseDate);
            eventDate.setDate(eventDate.getDate() + stateData.dayOffset);
            
            const event = processors.state.processFinancialStateCalculation(
              stateData.cash,
              stateData.investments,
              stateData.superannuation,
              stateData.loanBalance,
              stateData.offsetBalance,
              eventDate
            );
            allEvents.push(event);
          }

          allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          await eventCache.appendEvents(eventSequence.sessionId, allEvents);

          // Build projection twice
          const financialBuilder = new FinancialProjectionBuilder(eventCache);
          const projection1 = await financialBuilder.build(eventSequence.sessionId);
          const projection2 = await financialBuilder.rebuild(eventSequence.sessionId);

          // Projections should be identical (except for lastUpdated timestamp)
          assertEquals(projection1.sessionId, projection2.sessionId, "Session IDs should match");
          assertEquals(projection1.version, projection2.version, "Versions should match");
          
          // Current state should be identical
          assertEquals(projection1.currentState.cash, projection2.currentState.cash, "Cash amounts should match");
          assertEquals(projection1.currentState.investments, projection2.currentState.investments, "Investment amounts should match");
          assertEquals(projection1.currentState.superannuation, projection2.currentState.superannuation, "Super amounts should match");
          assertEquals(projection1.currentState.loanBalance, projection2.currentState.loanBalance, "Loan balances should match");
          assertEquals(projection1.currentState.offsetBalance, projection2.currentState.offsetBalance, "Offset balances should match");
          assertEquals(projection1.currentState.netWorth, projection2.currentState.netWorth, "Net worth should match");
          assertEquals(projection1.currentState.cashFlow, projection2.currentState.cashFlow, "Cash flow should match");
          assertEquals(projection1.currentState.date.getTime(), projection2.currentState.date.getTime(), "Dates should match");

          // Balance breakdowns should be identical
          assertEquals(
            JSON.stringify(projection1.balanceBreakdown.loanBalances), 
            JSON.stringify(projection2.balanceBreakdown.loanBalances), 
            "Loan balance breakdowns should match"
          );
          assertEquals(
            JSON.stringify(projection1.balanceBreakdown.superBalances), 
            JSON.stringify(projection2.balanceBreakdown.superBalances), 
            "Super balance breakdowns should match"
          );
          assertEquals(
            JSON.stringify(projection1.balanceBreakdown.offsetBalances), 
            JSON.stringify(projection2.balanceBreakdown.offsetBalances), 
            "Offset balance breakdowns should match"
          );
          assertEquals(
            JSON.stringify(projection1.balanceBreakdown.investmentBalances), 
            JSON.stringify(projection2.balanceBreakdown.investmentBalances), 
            "Investment balance breakdowns should match"
          );

          // Cleanup
          eventCache.destroy();
        } catch (error) {
          // Cleanup on error
          eventCache.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 50 }
  );
});

Deno.test("Property 6: Projection consistency - Projection service should maintain consistency across all projection types", async () => {
  await fc.assert(
    fc.asyncProperty(
      financialEventSequenceArb,
      userParametersArb,
      async (eventSequence, userParams) => {
        const eventCache = new InMemoryEventCache();
        const sessionManager = new InMemorySessionManager();
        
        try {
          // Create session with parameters
          const session = await sessionManager.createSession("user1", userParams);
          await eventCache.createSession(session.sessionId);
          
          // Create projection service
          const projectionService = createProjectionService(eventCache, sessionManager);

          // Generate some events
          const eventFactory = new FinancialEventFactory(session.sessionId, eventSequence.aggregateId);
          const processors = new FinancialEventProcessorCoordinator(eventFactory);
          const allEvents: FinancialEvent[] = [];

          // Generate a few different types of events
          if (eventSequence.salaryEvents.length > 0) {
            const salaryData = eventSequence.salaryEvents[0];
            const eventDate = new Date(eventSequence.baseDate);
            const events = processors.income.processSalaryPayment(
              salaryData.grossAmount,
              salaryData.taxRate,
              eventDate,
              salaryData.personId
            );
            allEvents.push(...events);
          }

          if (eventSequence.stateEvents.length > 0) {
            const stateData = eventSequence.stateEvents[0];
            const eventDate = new Date(eventSequence.baseDate);
            eventDate.setDate(eventDate.getDate() + 1);
            
            const event = processors.state.processFinancialStateCalculation(
              stateData.cash,
              stateData.investments,
              stateData.superannuation,
              stateData.loanBalance,
              stateData.offsetBalance,
              eventDate
            );
            allEvents.push(event);
          }

          allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          await eventCache.appendEvents(session.sessionId, allEvents);

          // Get all projection types
          const [financial, timeline, milestone] = await Promise.all([
            projectionService.getFinancialProjection(session.sessionId),
            projectionService.getTimelineProjection(session.sessionId),
            projectionService.getMilestoneProjection(session.sessionId),
          ]);

          // All projections should belong to the same session
          assertEquals(financial.sessionId, session.sessionId, "Financial projection should belong to correct session");
          assertEquals(timeline.sessionId, session.sessionId, "Timeline projection should belong to correct session");
          assertEquals(milestone.sessionId, session.sessionId, "Milestone projection should belong to correct session");

          // All projections should have consistent versions
          const expectedVersion = allEvents.length > 0 ? Math.max(...allEvents.map(e => e.version)) : 0;
          assertEquals(financial.version, expectedVersion, "Financial projection should have correct version");
          assertEquals(timeline.version, expectedVersion, "Timeline projection should have correct version");
          assertEquals(milestone.version, expectedVersion, "Milestone projection should have correct version");

          // Timeline states should be consistent with financial projection current state
          if (timeline.states.length > 0) {
            const lastState = timeline.states[timeline.states.length - 1];
            
            // Allow for small floating point differences
            const tolerance = 0.01;
            assert(Math.abs(lastState.cash - financial.currentState.cash) < tolerance, "Timeline last state cash should match financial projection");
            assert(Math.abs(lastState.investments - financial.currentState.investments) < tolerance, "Timeline last state investments should match financial projection");
            assert(Math.abs(lastState.superannuation - financial.currentState.superannuation) < tolerance, "Timeline last state super should match financial projection");
            assert(Math.abs(lastState.loanBalance - financial.currentState.loanBalance) < tolerance, "Timeline last state loan balance should match financial projection");
            assert(Math.abs(lastState.offsetBalance - financial.currentState.offsetBalance) < tolerance, "Timeline last state offset balance should match financial projection");
            assert(Math.abs(lastState.netWorth - financial.currentState.netWorth) < tolerance, "Timeline last state net worth should match financial projection");
          }

          // Milestone projection should have valid structure
          assert(Array.isArray(milestone.milestones), "Milestone projection should have milestones array");
          assert(typeof milestone.milestonesByType === 'object', "Milestone projection should have milestones by type");
          assert(typeof milestone.keyMilestones === 'object', "Milestone projection should have key milestones");

          // Cleanup
          eventCache.destroy();
          sessionManager.destroy();
        } catch (error) {
          // Cleanup on error
          eventCache.destroy();
          sessionManager.destroy();
          throw error;
        }
      }
    ),
    { numRuns: 30 }
  );
});