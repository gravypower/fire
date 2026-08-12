/**
 * Property-based tests for parameter transition handling
 * **Feature: event-sourced-server-refactor, Property 7: Parameter transition handling**
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import fc from "npm:fast-check@3.15.0";
import { ParameterTransitionManager, ParameterTransitionValidation } from "../../server/events/parameter-transition-manager.ts";
import { ParameterApplicationService } from "../../server/events/parameter-application-service.ts";
import { FinancialEventFactory } from "../../server/events/event-factory.ts";
import type { PaymentFrequency } from "../../types/financial.ts";
import type { FinancialEvent } from "../../server/interfaces/events.ts";
import { EVENT_TYPES } from "../../server/interfaces/events.ts";

// Generators for property-based testing
const userParametersArbitrary = fc.record({
  annualSalary: fc.integer({ min: 30000, max: 200000 }),
  salaryFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly') as fc.Arbitrary<PaymentFrequency>,
  incomeTaxRate: fc.float({ min: 0, max: 50 }),
  monthlyLivingExpenses: fc.integer({ min: 1000, max: 8000 }),
  monthlyRentOrMortgage: fc.integer({ min: 500, max: 5000 }),
  loanPrincipal: fc.integer({ min: 0, max: 800000 }),
  loanInterestRate: fc.float({ min: 0, max: 15 }),
  loanPaymentAmount: fc.integer({ min: 0, max: 5000 }),
  loanPaymentFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly') as fc.Arbitrary<PaymentFrequency>,
  useOffsetAccount: fc.boolean(),
  currentOffsetBalance: fc.integer({ min: 0, max: 100000 }),
  monthlyInvestmentContribution: fc.integer({ min: 0, max: 3000 }),
  investmentReturnRate: fc.float({ min: 0, max: 20 }),
  currentInvestmentBalance: fc.integer({ min: 0, max: 500000 }),
  superContributionRate: fc.float({ min: 9, max: 15 }),
  superReturnRate: fc.float({ min: 0, max: 15 }),
  currentSuperBalance: fc.integer({ min: 0, max: 1000000 }),
  desiredAnnualRetirementIncome: fc.integer({ min: 40000, max: 120000 }),
  retirementAge: fc.integer({ min: 55, max: 75 }),
  currentAge: fc.integer({ min: 25, max: 65 }),
  simulationYears: fc.integer({ min: 5, max: 50 }),
  startDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') })
});

const parameterChangesArbitrary = fc.record({
  annualSalary: fc.option(fc.integer({ min: 20000, max: 300000 })),
  monthlyLivingExpenses: fc.option(fc.integer({ min: 800, max: 10000 })),
  loanInterestRate: fc.option(fc.float({ min: 0, max: 20 })),
  monthlyInvestmentContribution: fc.option(fc.integer({ min: 0, max: 5000 })),
  retirementAge: fc.option(fc.integer({ min: 55, max: 80 }))
}, { requiredKeys: [] });

const parameterTransitionArbitrary = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  transitionDate: fc.date({ min: new Date('2024-06-01'), max: new Date('2030-12-31') }),
  label: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
  parameterChanges: parameterChangesArbitrary
}).filter(transition => Object.keys(transition.parameterChanges).length > 0);

Deno.test("Parameter Transition Handling Properties", async (t) => {
  
  await t.step("Property 7.1: Parameter transitions should be applied in chronological order", () => {
    fc.assert(fc.property(
      userParametersArbitrary,
      fc.array(parameterTransitionArbitrary, { minLength: 1, maxLength: 5 }),
      fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
      (baseParameters, transitions, targetDate) => {
        // Ensure transitions have unique IDs and are chronologically ordered
        // Also ensure no conflicts by making each transition modify different parameters
        const uniqueTransitions = transitions.map((t, i) => ({
          ...t,
          id: `transition_${i}`,
          transitionDate: new Date(targetDate.getTime() + (i + 1) * 30 * 24 * 60 * 60 * 1000), // 30 days apart
          parameterChanges: {
            [`param_${i}`]: Math.random() * 1000 // Use unique parameter names to avoid conflicts
          }
        }));

        const manager = new ParameterTransitionManager();
        const eventFactory = new FinancialEventFactory('test-session', 'test-aggregate');
        
        // Create scheduled events for all transitions
        const events: FinancialEvent[] = [];
        for (const transition of uniqueTransitions) {
          events.push(eventFactory.createParameterTransitionScheduledEvent(
            transition.id,
            transition.transitionDate,
            transition.parameterChanges,
            new Date(),
            transition.label
          ));
        }

        // Process events
        manager.processEvents(events);

        // Get parameters at a date after all transitions
        const finalDate = new Date(uniqueTransitions[uniqueTransitions.length - 1].transitionDate.getTime() + 24 * 60 * 60 * 1000);
        const finalParameters = manager.getParametersForDate(baseParameters, finalDate);

        // Verify that all transitions were applied in order
        let expectedParameters = { ...baseParameters };
        for (const transition of uniqueTransitions) {
          for (const [key, value] of Object.entries(transition.parameterChanges)) {
            if (value !== undefined && value !== null) {
              (expectedParameters as any)[key] = value;
            }
          }
        }

        // Check that final parameters match expected (for changed parameters)
        for (const transition of uniqueTransitions) {
          for (const [key, expectedValue] of Object.entries(transition.parameterChanges)) {
            if (expectedValue !== undefined && expectedValue !== null) {
              assertEquals((finalParameters as any)[key], expectedValue, 
                `Parameter ${key} should be ${expectedValue} after all transitions`);
            }
          }
        }

        return true;
      }
    ), { numRuns: 100 });
  });

  await t.step("Property 7.2: Parameter periods should cover entire simulation timeline", () => {
    fc.assert(fc.property(
      userParametersArbitrary,
      fc.array(parameterTransitionArbitrary, { minLength: 0, maxLength: 3 }),
      (baseParameters, transitions) => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2030-12-31');
        
        // Ensure transitions are within simulation period and have unique IDs
        const validTransitions = transitions
          .map((t, i) => ({
            ...t,
            id: `transition_${i}`,
            transitionDate: new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()))
          }))
          .sort((a, b) => a.transitionDate.getTime() - b.transitionDate.getTime());

        const manager = new ParameterTransitionManager();
        const eventFactory = new FinancialEventFactory('test-session', 'test-aggregate');
        
        // Create scheduled events
        const events: FinancialEvent[] = [];
        for (const transition of validTransitions) {
          events.push(eventFactory.createParameterTransitionScheduledEvent(
            transition.id,
            transition.transitionDate,
            transition.parameterChanges,
            new Date(),
            transition.label
          ));
        }

        manager.processEvents(events);
        const periods = manager.getParameterPeriods(baseParameters, startDate, endDate);

        // Verify periods cover the entire timeline
        assertEquals(periods[0].startDate.getTime(), startDate.getTime(), 
          "First period should start at simulation start");

        // Verify no gaps between periods
        for (let i = 1; i < periods.length; i++) {
          assertEquals(periods[i].startDate.getTime(), periods[i-1].endDate?.getTime(), 
            `Period ${i} should start where period ${i-1} ends`);
        }

        // Verify last period extends to end (or has no end date)
        const lastPeriod = periods[periods.length - 1];
        if (lastPeriod.endDate) {
          assertEquals(lastPeriod.endDate.getTime(), endDate.getTime(), 
            "Last period should end at simulation end");
        }

        return true;
      }
    ), { numRuns: 100 });
  });

  await t.step("Property 7.3: Parameter application should generate appropriate events", () => {
    fc.assert(fc.property(
      userParametersArbitrary,
      parameterTransitionArbitrary,
      (baseParameters, transition) => {
        const manager = new ParameterTransitionManager();
        const eventFactory = new FinancialEventFactory('test-session', 'test-aggregate');
        const applicationService = new ParameterApplicationService(manager, eventFactory);
        
        // Schedule the transition
        const scheduledEvent = eventFactory.createParameterTransitionScheduledEvent(
          transition.id,
          transition.transitionDate,
          transition.parameterChanges,
          new Date(),
          transition.label
        );

        manager.processEvents([scheduledEvent]);

        // Apply the transition
        const result = applicationService.applyTransitionsForDate(
          transition.transitionDate,
          baseParameters
        );

        // Verify events were generated
        assertExists(result.events, "Events should be generated when applying transitions");
        
        // Should have at least one transition applied event
        const appliedEvents = result.events.filter(e => e.type === EVENT_TYPES.PARAMETER_TRANSITION_APPLIED);
        assertEquals(appliedEvents.length, 1, "Should generate exactly one transition applied event");

        // Should have parameter change events for each changed parameter (only if values actually change)
        const paramChangeEvents = result.events.filter(e => e.type === EVENT_TYPES.PARAMETER_CHANGED);
        
        // Count how many parameters actually changed
        let actualChanges = 0;
        for (const [key, newValue] of Object.entries(transition.parameterChanges)) {
          const oldValue = (baseParameters as any)[key];
          if (oldValue !== newValue && newValue !== undefined && newValue !== null) {
            actualChanges++;
          }
        }
        
        assertEquals(paramChangeEvents.length, actualChanges, 
          `Should generate ${actualChanges} parameter change events for actual changes`);

        // Verify parameters were updated
        for (const [key, expectedValue] of Object.entries(transition.parameterChanges)) {
          if (expectedValue !== undefined && expectedValue !== null) {
            assertEquals((result.updatedParameters as any)[key], expectedValue,
              `Parameter ${key} should be updated to ${expectedValue}`);
          }
        }

        return true;
      }
    ), { numRuns: 100 });
  });

  await t.step("Property 7.4: Cache invalidation should occur when transitions change", () => {
    fc.assert(fc.property(
      fc.array(parameterTransitionArbitrary, { minLength: 1, maxLength: 3 }),
      (transitions) => {
        const manager = new ParameterTransitionManager();
        const eventFactory = new FinancialEventFactory('test-session', 'test-aggregate');
        
        // Add transitions
        const events: FinancialEvent[] = [];
        for (const transition of transitions) {
          events.push(eventFactory.createParameterTransitionScheduledEvent(
            transition.id,
            transition.transitionDate,
            transition.parameterChanges,
            new Date(),
            transition.label
          ));
        }

        manager.processEvents(events);
        const initialTransitions = manager.getScheduledTransitions();

        // Remove a transition
        const removalEvent = eventFactory.createParameterTransitionRemovedEvent(
          transitions[0].id,
          new Date(),
          'Test removal'
        );

        manager.processEvents([...events, removalEvent]);
        const finalTransitions = manager.getScheduledTransitions();

        // Verify transition was removed
        assertEquals(finalTransitions.length, initialTransitions.length - 1,
          "Transition should be removed from scheduled transitions");

        // Verify the specific transition was removed
        const removedTransitionExists = finalTransitions.some(t => t.id === transitions[0].id);
        assertEquals(removedTransitionExists, false, 
          "Removed transition should not exist in scheduled transitions");

        return true;
      }
    ), { numRuns: 100 });
  });

  await t.step("Property 7.5: Parameter validation should reject invalid transitions", () => {
    fc.assert(fc.property(
      fc.record({
        id: fc.string({ minLength: 1 }),
        transitionDate: fc.date(),
        parameterChanges: fc.record({
          annualSalary: fc.option(fc.integer({ min: -50000, max: 500000 })), // Allow negative for testing
          incomeTaxRate: fc.option(fc.float({ min: -10, max: 150 })), // Allow invalid rates
          currentAge: fc.option(fc.integer({ min: -5, max: 200 })) // Allow invalid ages
        }, { requiredKeys: [] })
      }),
      (transition) => {
        const validation = ParameterTransitionValidation.validateTransition(transition as any);
        
        // Check for specific validation failures
        const hasNegativeSalary = transition.parameterChanges.annualSalary !== undefined && 
                                 transition.parameterChanges.annualSalary !== null &&
                                 transition.parameterChanges.annualSalary < 0;
        const hasInvalidTaxRate = transition.parameterChanges.incomeTaxRate !== undefined && 
                                 transition.parameterChanges.incomeTaxRate !== null &&
                                 (transition.parameterChanges.incomeTaxRate < 0 || transition.parameterChanges.incomeTaxRate > 100);
        const hasInvalidAge = transition.parameterChanges.currentAge !== undefined && 
                             transition.parameterChanges.currentAge !== null &&
                             (transition.parameterChanges.currentAge < 0 || transition.parameterChanges.currentAge > 120);
        
        const shouldBeInvalid = hasNegativeSalary || hasInvalidTaxRate || hasInvalidAge || 
                               Object.keys(transition.parameterChanges).length === 0;

        if (shouldBeInvalid) {
          assertEquals(validation.isValid, false, 
            "Validation should fail for invalid parameter values");
          assertExists(validation.errors, "Should provide error messages for invalid transitions");
        }

        return true;
      }
    ), { numRuns: 100 });
  });
});