/**
 * Property-based test for command validation
 * **Feature: event-sourced-server-refactor, Property 5: Command validation**
 * **Validates: Requirements 1.4, 9.1, 9.4**
 */

import { assertEquals, assert } from "$std/assert/mod.ts";
import * as fc from "fast-check";
import { InMemoryCommandBus } from "../../server/aggregates/command-bus.ts";
import { InMemoryAggregateRepository } from "../../server/aggregates/aggregate-repository.ts";
import { InMemoryEventCache } from "../../server/cache/event-cache.ts";
import { CommandHandlerFactory } from "../../server/aggregates/command-handlers.ts";
import type { RunSimulationCommand, UpdateParametersCommand } from "../../server/interfaces/commands.ts";
import type { UserParameters } from "../../types/financial.ts";

// Test generators for valid commands
const validUserParametersArb = fc.integer({ min: 20, max: 60 }).chain(currentAge => 
  fc.record({
    annualSalary: fc.integer({ min: 30000, max: 200000 }),
    salaryFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly'),
    incomeTaxRate: fc.integer({ min: 0, max: 50 }),
    monthlyLivingExpenses: fc.integer({ min: 1000, max: 8000 }),
    monthlyRentOrMortgage: fc.integer({ min: 500, max: 5000 }),
    loanPrincipal: fc.integer({ min: 0, max: 1000000 }),
    loanInterestRate: fc.float({ min: 0, max: 15, noNaN: true }),
    loanPaymentAmount: fc.integer({ min: 0, max: 10000 }),
    loanPaymentFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly'),
    useOffsetAccount: fc.boolean(),
    currentOffsetBalance: fc.integer({ min: 0, max: 100000 }),
    monthlyInvestmentContribution: fc.integer({ min: 0, max: 5000 }),
    investmentReturnRate: fc.float({ min: 0, max: 20, noNaN: true }),
    currentInvestmentBalance: fc.integer({ min: 0, max: 500000 }),
    superContributionRate: fc.float({ min: 0, max: 25, noNaN: true }),
    superReturnRate: fc.float({ min: 0, max: 15, noNaN: true }),
    currentSuperBalance: fc.integer({ min: 0, max: 1000000 }),
    desiredAnnualRetirementIncome: fc.integer({ min: 30000, max: 150000 }),
    currentAge: fc.constant(currentAge),
    retirementAge: fc.integer({ min: currentAge + 1, max: 75 }),
    simulationYears: fc.integer({ min: 5, max: 50 }),
    startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
  })
) as fc.Arbitrary<UserParameters>;

const validRunSimulationCommandArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }).chain(startDate => 
  fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    type: fc.constant('RunSimulation'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
    data: fc.record({
      parameters: validUserParametersArb,
      startDate: fc.constant(startDate),
      endDate: fc.date({ 
        min: new Date(startDate.getTime() + 40 * 24 * 60 * 60 * 1000), // At least 40 days after start (> 0.1 years)
        max: new Date('2080-12-31') 
      }),
      transitions: fc.option(fc.array(fc.record({
        id: fc.string({ minLength: 5, maxLength: 20 }),
        transitionDate: fc.date({ 
          min: new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000), // At least 1 year after start
          max: new Date('2070-12-31') 
        }),
        label: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
        parameterChanges: fc.record({
          annualSalary: fc.option(fc.integer({ min: 0, max: 300000 })),
          monthlyLivingExpenses: fc.option(fc.integer({ min: 500, max: 10000 })),
        }),
      }), { minLength: 0, maxLength: 3 })),
    }),
  })
) as fc.Arbitrary<RunSimulationCommand>;

const validUpdateParametersCommandArb = fc.record({
  id: fc.string({ minLength: 10, maxLength: 50 }),
  type: fc.constant('UpdateParameters'),
  sessionId: fc.string({ minLength: 10, maxLength: 50 }),
  timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date() }),
  data: fc.record({
    parameterChanges: fc.record({
      annualSalary: fc.integer({ min: 0, max: 300000 }),
      monthlyLivingExpenses: fc.integer({ min: 0, max: 10000 }),
      loanInterestRate: fc.float({ min: 0, max: 20, noNaN: true }),
      currentAge: fc.integer({ min: 18, max: 100 }),
    }),
    effectiveDate: fc.option(fc.date({ min: new Date('2020-01-01'), max: new Date() })),
  }),
}) as fc.Arbitrary<UpdateParametersCommand>;

// Test generators for invalid commands
const invalidCommandArb = fc.oneof(
  // Missing required fields
  fc.record({
    type: fc.constant('RunSimulation'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date(),
    // Missing id
  }),
  fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date(),
    // Missing type
  }),
  // Invalid field types
  fc.record({
    id: fc.integer(), // Should be string
    type: fc.constant('RunSimulation'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date(),
  }),
  // Future timestamp
  fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    type: fc.constant('RunSimulation'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date({ min: new Date(Date.now() + 86400000) }), // Tomorrow
  }),
  // Invalid command type
  fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    type: fc.constant('InvalidCommandType'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date({ max: new Date() }),
  })
) as fc.Arbitrary<any>;

const invalidRunSimulationCommandArb = fc.oneof(
  // Missing data
  fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    type: fc.constant('RunSimulation'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date({ max: new Date() }),
    // Missing data
  }),
  // Invalid parameters
  fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    type: fc.constant('RunSimulation'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date({ max: new Date() }),
    data: fc.record({
      parameters: fc.record({
        annualSalary: fc.integer({ min: -100000, max: -1 }), // Negative salary
        currentAge: fc.integer({ min: 150, max: 200 }), // Invalid age
        retirementAge: fc.integer({ min: 10, max: 30 }), // Retirement before current age
        monthlyLivingExpenses: fc.integer({ min: 30000, max: 200000 }),
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
        simulationYears: fc.integer({ min: 5, max: 50 }),
        salaryFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly'),
        incomeTaxRate: fc.integer({ min: 0, max: 50 }),
        startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
      }),
      startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
      endDate: fc.date({ min: new Date('2025-01-02'), max: new Date('2080-12-31') }),
    }),
  }),
  // Invalid date range
  fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    type: fc.constant('RunSimulation'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date({ max: new Date() }),
    data: fc.record({
      parameters: validUserParametersArb,
      startDate: fc.date({ min: new Date('2025-01-01'), max: new Date('2030-01-01') }),
      endDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-12-31') }), // End before start
    }),
  })
) as fc.Arbitrary<any>;

Deno.test("Property 5: Command validation - Valid commands should be accepted and processed", async () => {
  await fc.assert(
    fc.asyncProperty(
      validRunSimulationCommandArb,
      async (command) => {
        const eventCache = new InMemoryEventCache();
        const repository = new InMemoryAggregateRepository(eventCache);
        const commandBus = new InMemoryCommandBus();

        try {
          // Register command handlers
          CommandHandlerFactory.registerHandlers(commandBus, repository);

          // Process valid command
          const result = await commandBus.dispatch(command);

          // Valid commands should succeed
          assertEquals(result.success, true, `Valid command should succeed: ${result.error || 'no error'}`);
          assertEquals(result.commandId, command.id, "Result should reference the correct command ID");
          assert(Array.isArray(result.events), "Result should include events array");
          assert(result.events.length >= 0, "Events array should be non-negative length");

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

Deno.test("Property 5: Command validation - Invalid commands should be rejected with appropriate errors", async () => {
  await fc.assert(
    fc.asyncProperty(
      invalidCommandArb,
      async (command) => {
        const eventCache = new InMemoryEventCache();
        const repository = new InMemoryAggregateRepository(eventCache);
        const commandBus = new InMemoryCommandBus();

        try {
          // Register command handlers
          CommandHandlerFactory.registerHandlers(commandBus, repository);

          // Process invalid command
          const result = await commandBus.dispatch(command);

          // Invalid commands should fail
          assertEquals(result.success, false, "Invalid command should be rejected");
          assert(typeof result.error === 'string' && result.error.length > 0, "Error message should be provided");
          assertEquals(result.events.length, 0, "Failed commands should not generate events");

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

Deno.test("Property 5: Command validation - RunSimulation commands with invalid business rules should be rejected", async () => {
  await fc.assert(
    fc.asyncProperty(
      invalidRunSimulationCommandArb,
      async (command) => {
        const eventCache = new InMemoryEventCache();
        const repository = new InMemoryAggregateRepository(eventCache);
        const commandBus = new InMemoryCommandBus();

        try {
          // Register command handlers
          CommandHandlerFactory.registerHandlers(commandBus, repository);

          // Process command with invalid business rules
          const result = await commandBus.dispatch(command);

          // Commands violating business rules should fail
          assertEquals(result.success, false, "Commands with invalid business rules should be rejected");
          assert(typeof result.error === 'string' && result.error.length > 0, "Error message should be provided");
          assertEquals(result.events.length, 0, "Failed commands should not generate events");

          // Error should be descriptive
          assert(
            result.error.includes("Invalid parameters") || 
            result.error.includes("missing") || 
            result.error.includes("Start date") ||
            result.error.includes("End date") ||
            result.error.includes("must be"),
            `Error message should be descriptive: ${result.error}`
          );

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

Deno.test("Property 5: Command validation - UpdateParameters commands with invalid values should be rejected", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.record({
        id: fc.string({ minLength: 10, maxLength: 50 }),
        type: fc.constant('UpdateParameters'),
        sessionId: fc.string({ minLength: 10, maxLength: 50 }),
        timestamp: fc.date({ max: new Date() }),
        data: fc.oneof(
          // Missing data
          fc.constant(undefined),
          // Empty parameter changes
          fc.record({
            parameterChanges: fc.record({}),
          }),
          // Invalid parameter values
          fc.record({
            parameterChanges: fc.record({
              annualSalary: fc.integer({ min: -100000, max: -1 }), // Negative
              loanInterestRate: fc.float({ min: 150, max: 200 }), // > 100%
              currentAge: fc.integer({ min: 150, max: 200 }), // Invalid age
            }),
          }),
          // Future effective date
          fc.record({
            parameterChanges: fc.record({
              annualSalary: fc.integer({ min: 50000, max: 100000 }),
            }),
            effectiveDate: fc.date({ min: new Date(Date.now() + 86400000) }), // Tomorrow
          })
        ),
      }),
      async (command) => {
        const eventCache = new InMemoryEventCache();
        const repository = new InMemoryAggregateRepository(eventCache);
        const commandBus = new InMemoryCommandBus();

        try {
          // Register command handlers
          CommandHandlerFactory.registerHandlers(commandBus, repository);

          // Process invalid UpdateParameters command
          const result = await commandBus.dispatch(command);

          // Invalid UpdateParameters commands should fail
          assertEquals(result.success, false, "Invalid UpdateParameters command should be rejected");
          assert(typeof result.error === 'string' && result.error.length > 0, "Error message should be provided");
          assertEquals(result.events.length, 0, "Failed commands should not generate events");

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

Deno.test("Property 5: Command validation - Session mismatch should be detected and rejected", async () => {
  await fc.assert(
    fc.asyncProperty(
      validRunSimulationCommandArb,
      fc.string({ minLength: 10, maxLength: 50 }), // Different session ID
      async (command, differentSessionId) => {
        // Ensure session IDs are different
        fc.pre(command.sessionId !== differentSessionId);

        const eventCache = new InMemoryEventCache();
        const repository = new InMemoryAggregateRepository(eventCache);

        try {
          // Create aggregate for original session
          const aggregate = await repository.create(command.sessionId);

          // Try to process command with different session ID
          const modifiedCommand = { ...command, sessionId: differentSessionId };
          const result = await aggregate.processCommand(modifiedCommand);

          // Session mismatch should be rejected
          assertEquals(result.success, false, "Command with session mismatch should be rejected");
          assert(result.error?.includes("session mismatch"), `Error should mention session mismatch: ${result.error}`);
          assertEquals(result.events.length, 0, "Failed commands should not generate events");

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

Deno.test("Property 5: Command validation - Command bus should validate command structure before dispatch", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.record({}), // Empty object
        fc.record({ id: fc.constant(null) }), // Null id
        fc.record({ type: fc.constant("") }), // Empty type
        fc.record({ sessionId: fc.integer() }), // Wrong type for sessionId
        fc.record({ timestamp: fc.string() }), // Wrong type for timestamp
      ),
      async (invalidCommand) => {
        const eventCache = new InMemoryEventCache();
        const repository = new InMemoryAggregateRepository(eventCache);
        const commandBus = new InMemoryCommandBus();

        try {
          // Register command handlers
          CommandHandlerFactory.registerHandlers(commandBus, repository);

          // Try to dispatch structurally invalid command
          const result = await commandBus.dispatch(invalidCommand as any);

          // Structurally invalid commands should be rejected
          assertEquals(result.success, false, "Structurally invalid command should be rejected");
          assert(typeof result.error === 'string' && result.error.length > 0, "Error message should be provided");
          assertEquals(result.events.length, 0, "Failed commands should not generate events");

          // Error should mention structural issues
          assert(
            result.error.includes("missing") || 
            result.error.includes("invalid") ||
            result.error.includes("null") ||
            result.error.includes("undefined"),
            `Error should mention structural issues: ${result.error}`
          );

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

Deno.test("Property 5: Command validation - Valid commands should generate appropriate events", async () => {
  await fc.assert(
    fc.asyncProperty(
      validRunSimulationCommandArb,
      validUpdateParametersCommandArb,
      async (runCommand, updateCommand) => {
        const eventCache = new InMemoryEventCache();
        const repository = new InMemoryAggregateRepository(eventCache);
        const commandBus = new InMemoryCommandBus();

        try {
          // Register command handlers
          CommandHandlerFactory.registerHandlers(commandBus, repository);

          // Process RunSimulation command
          const runResult = await commandBus.dispatch(runCommand);
          assertEquals(runResult.success, true, "Valid RunSimulation command should succeed");
          assert(runResult.events.length >= 0, "RunSimulation should generate events");

          // Process UpdateParameters command for same session
          const updateCommandSameSession = { ...updateCommand, sessionId: runCommand.sessionId };
          const updateResult = await commandBus.dispatch(updateCommandSameSession);
          assertEquals(updateResult.success, true, "Valid UpdateParameters command should succeed");
          assert(updateResult.events.length >= 0, "UpdateParameters should generate events");

          // Verify events are stored in cache
          const storedEvents = await eventCache.getEvents(runCommand.sessionId);
          const totalExpectedEvents = runResult.events.length + updateResult.events.length;
          assertEquals(storedEvents.length, totalExpectedEvents, "All generated events should be stored");

          // Events should have proper structure
          for (const event of storedEvents) {
            assert(typeof event.id === 'string' && event.id.length > 0, "Event should have valid ID");
            assertEquals(event.sessionId, runCommand.sessionId, "Event should belong to correct session");
            assert(typeof event.type === 'string' && event.type.length > 0, "Event should have valid type");
            assert(event.timestamp instanceof Date, "Event should have valid timestamp");
            assert(typeof event.data === 'object', "Event should have data object");
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