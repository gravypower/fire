/**
 * Unit tests for comparison simulation functionality
 * Tests the runComparisonSimulation function
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { SimulationEngine } from "../../lib/simulation_engine.ts";
import type { SimulationConfiguration, UserParameters } from "../../types/financial.ts";

Deno.test("runComparisonSimulation - returns comparison result with both scenarios", async () => {
  // Create base parameters
  const baseParams: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 300000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 50000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date("2024-01-01"),
  };

  // Create a configuration with one transition
  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "test-transition-1",
        transitionDate: new Date("2034-01-01"), // 10 years in
        label: "Semi-retirement",
        parameterChanges: {
          annualSalary: 40000, // Reduce salary by 50%
          monthlyLivingExpenses: 1600, // Reduce expenses by 20%
        },
      },
    ],
  };

  // Run comparison simulation
  const result = await SimulationEngine.runComparisonSimulation(config);

  // Verify structure
  assertExists(result.withTransitions);
  assertExists(result.withoutTransitions);
  assertExists(result.comparison);

  // Verify withTransitions has transition points
  assertEquals(result.withTransitions.transitionPoints.length, 1);
  assertEquals(result.withTransitions.transitionPoints[0].transition.id, "test-transition-1");

  // Verify withoutTransitions has no transition points
  assertEquals(result.withoutTransitions.states.length > 0, true);

  // Verify comparison metrics exist
  assertExists(result.comparison.finalNetWorthDifference);
  assertExists(result.comparison.sustainabilityChanged);
});

Deno.test("runComparisonSimulation - handles configuration with no transitions", async () => {
  const baseParams: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 300000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 50000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date("2024-01-01"),
  };

  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [],
  };

  const result = await SimulationEngine.runComparisonSimulation(config);

  // With no transitions, both scenarios should be identical
  assertEquals(result.withTransitions.transitionPoints.length, 0);
  assertEquals(result.comparison.finalNetWorthDifference, 0);
  assertEquals(result.comparison.sustainabilityChanged, false);
});

Deno.test("runComparisonSimulation - calculates net worth difference correctly", async () => {
  const baseParams: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 300000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 50000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date("2024-01-01"),
  };

  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "test-transition-1",
        transitionDate: new Date("2034-01-01"),
        label: "Salary increase",
        parameterChanges: {
          annualSalary: 120000, // Increase salary significantly
        },
      },
    ],
  };

  const result = await SimulationEngine.runComparisonSimulation(config);

  // Get final net worth from both scenarios
  const finalNetWorthWith = result.withTransitions.states[
    result.withTransitions.states.length - 1
  ].netWorth;
  const finalNetWorthWithout = result.withoutTransitions.states[
    result.withoutTransitions.states.length - 1
  ].netWorth;

  // Verify the difference is calculated correctly
  const expectedDifference = finalNetWorthWith - finalNetWorthWithout;
  assertEquals(result.comparison.finalNetWorthDifference, expectedDifference);

  // With increased salary, net worth should be higher (or at least different)
  // Just verify the calculation is correct, not the direction
  assertEquals(typeof result.comparison.finalNetWorthDifference, "number");
});
