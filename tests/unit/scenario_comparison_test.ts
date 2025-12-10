/**
 * Unit tests for scenario comparison functionality
 * Tests milestone and advice comparison between scenarios
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { SimulationEngine } from "../../lib/simulation_engine.ts";
import type { SimulationConfiguration, UserParameters } from "../../types/financial.ts";

function getTestParameters(): UserParameters {
  return {
    annualSalary: 100000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 4000,
    monthlyRentOrMortgage: 2000,
    loanPrincipal: 400000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2500,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: true,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 1000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 10,
    superReturnRate: 6,
    currentSuperBalance: 80000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 10,
    startDate: new Date("2024-01-01"),
  };
}

Deno.test("ScenarioComparison - includes milestone and advice comparison", async () => {
  const baseParams = getTestParameters();
  baseParams.simulationYears = 5;

  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "salary-increase",
        transitionDate: new Date("2025-06-01"),
        label: "Salary increase to $120k",
        parameterChanges: {
          annualSalary: 120000,
        },
      },
    ],
  };

  const result = await SimulationEngine.runComparisonSimulation(config);

  // Verify basic comparison structure
  assertExists(result.withTransitions);
  assertExists(result.withoutTransitions);
  assertExists(result.comparison);

  // Verify milestone comparison is included
  assertExists(result.milestoneComparison);
  assertExists(result.milestoneComparison.commonMilestones);
  assertExists(result.milestoneComparison.uniqueToWithTransitions);
  assertExists(result.milestoneComparison.uniqueToWithoutTransitions);
  assertExists(result.milestoneComparison.timingDifferences);

  // Verify advice comparison is included
  assertExists(result.adviceComparison);
  assertExists(result.adviceComparison.withTransitionsAdvice);
  assertExists(result.adviceComparison.withoutTransitionsAdvice);
  assertExists(result.adviceComparison.adviceDifferences);
  assertExists(result.adviceComparison.variationExplanation);

  // Verify advice has been generated for both scenarios
  assertExists(result.adviceComparison.withTransitionsAdvice.recommendations);
  assertExists(result.adviceComparison.withoutTransitionsAdvice.recommendations);

  console.log("Milestone comparison:", {
    commonMilestones: result.milestoneComparison.commonMilestones.length,
    uniqueToWith: result.milestoneComparison.uniqueToWithTransitions.length,
    uniqueToWithout: result.milestoneComparison.uniqueToWithoutTransitions.length,
    timingDifferences: result.milestoneComparison.timingDifferences.length,
  });

  console.log("Advice comparison:", {
    withTransitionsRecommendations: result.adviceComparison.withTransitionsAdvice.recommendations.length,
    withoutTransitionsRecommendations: result.adviceComparison.withoutTransitionsAdvice.recommendations.length,
    adviceDifferences: result.adviceComparison.adviceDifferences.length,
    variationExplanations: result.adviceComparison.variationExplanation.length,
  });
});

Deno.test("ScenarioComparison - handles scenarios with no transitions", async () => {
  const baseParams = getTestParameters();
  baseParams.simulationYears = 3;

  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [], // No transitions
  };

  const result = await SimulationEngine.runComparisonSimulation(config);

  // Should still include comparison structures even with no transitions
  assertExists(result.milestoneComparison);
  assertExists(result.adviceComparison);

  // With no transitions, scenarios should be identical
  assertEquals(result.comparison.finalNetWorthDifference, 0);
  assertEquals(result.comparison.sustainabilityChanged, false);

  // Advice should be very similar between scenarios
  assertEquals(
    result.adviceComparison.withTransitionsAdvice.overallAssessment,
    result.adviceComparison.withoutTransitionsAdvice.overallAssessment
  );
});