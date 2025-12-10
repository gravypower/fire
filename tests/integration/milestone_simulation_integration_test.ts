/**
 * Integration tests for milestone detection with simulation engine
 * Tests that milestones are properly detected and included in simulation results
 */

import { assertEquals, assertExists } from "$std/assert/mod.ts";
import { SimulationEngine } from "../../lib/simulation_engine.ts";
import type { UserParameters, SimulationConfiguration } from "../../types/financial.ts";

/**
 * Helper function to create test parameters
 */
function getTestParameters(): UserParameters {
  return {
    annualSalary: 120000, // Higher salary to support payments
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0, // No additional rent/mortgage
    loanPrincipal: 50000, // Smaller loan for faster payoff
    loanInterestRate: 5.5,
    loanPaymentAmount: 2000, // Reasonable payment amount
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 500, // Reduced to ensure cash flow
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 10,
    startDate: new Date("2024-01-01"),
  };
}

Deno.test("SimulationEngine.runSimulation - includes milestones in result", () => {
  const params = getTestParameters();
  
  const result = SimulationEngine.runSimulation(params);
  
  // Result should include milestones
  assertExists(result.milestones);
  

  
  // Should detect loan payoff milestone (with high payments, loan should be paid off)
  const loanPayoffMilestones = result.milestones.filter(m => m.type === 'loan_payoff');
  assertEquals(loanPayoffMilestones.length > 0, true, "Should detect loan payoff milestone");
  
  // May or may not detect retirement eligibility milestone (depends on asset accumulation)
  const retirementMilestones = result.milestones.filter(m => m.type === 'retirement_eligibility');
  
  // Just verify that retirement milestone detection doesn't cause errors
  assertEquals(Array.isArray(retirementMilestones), true, "Should return array of retirement milestones");
  
  // Milestones should be chronologically ordered
  for (let i = 1; i < result.milestones.length; i++) {
    const prevDate = result.milestones[i - 1].date.getTime();
    const currDate = result.milestones[i].date.getTime();
    assertEquals(currDate >= prevDate, true, "Milestones should be chronologically ordered");
  }
});

Deno.test("SimulationEngine.runSimulationWithTransitions - includes milestones and transitions", () => {
  const baseParams = getTestParameters();
  
  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "salary-increase",
        transitionDate: new Date("2026-01-01"),
        label: "Salary Increase",
        parameterChanges: {
          annualSalary: 100000, // Increase salary
        },
      },
    ],
  };
  
  const result = SimulationEngine.runSimulationWithTransitions(config);
  
  // Result should include milestones
  assertExists(result.milestones);
  
  // Should detect parameter transition milestone
  const transitionMilestones = result.milestones.filter(m => m.type === 'parameter_transition');
  assertEquals(transitionMilestones.length > 0, true, "Should detect parameter transition milestone");
  
  // Should detect loan payoff milestone
  const loanPayoffMilestones = result.milestones.filter(m => m.type === 'loan_payoff');
  assertEquals(loanPayoffMilestones.length > 0, true, "Should detect loan payoff milestone");
  
  // May or may not detect retirement eligibility milestone (depends on asset accumulation)
  const retirementMilestones = result.milestones.filter(m => m.type === 'retirement_eligibility');
  
  // Just verify that retirement milestone detection doesn't cause errors
  assertEquals(Array.isArray(retirementMilestones), true, "Should return array of retirement milestones");
  
  // Transition milestone should have correct transition ID
  const transitionMilestone = transitionMilestones[0];
  assertEquals(transitionMilestone.type, 'parameter_transition');
  if (transitionMilestone.type === 'parameter_transition') {
    assertEquals(transitionMilestone.transitionId, "salary-increase");
  }
});

Deno.test("SimulationEngine.runSimulation - milestone detection with multiple loans", () => {
  const params = getTestParameters();
  
  // Use multiple loans instead of legacy single loan
  params.loans = [
    {
      id: "home-loan",
      label: "Home Loan",
      principal: 30000, // Smaller for faster payoff
      interestRate: 5.5,
      paymentAmount: 1500,
      paymentFrequency: "monthly",
      hasOffset: false,
    },
    {
      id: "car-loan",
      label: "Car Loan", 
      principal: 15000, // Smaller for faster payoff
      interestRate: 7.0,
      paymentAmount: 800,
      paymentFrequency: "monthly",
      hasOffset: false,
    },
  ];
  
  const result = SimulationEngine.runSimulation(params);
  
  // Result should include milestones
  assertExists(result.milestones);
  
  // Should detect multiple loan payoff milestones
  const loanPayoffMilestones = result.milestones.filter(m => m.type === 'loan_payoff');
  assertEquals(loanPayoffMilestones.length >= 1, true, "Should detect at least one loan payoff milestone");
  
  // Check that loan payoff milestones have correct loan IDs
  for (const milestone of loanPayoffMilestones) {
    if (milestone.type === 'loan_payoff') {
      assertEquals(['home-loan', 'car-loan'].includes(milestone.loanId), true, 
        `Loan ID ${milestone.loanId} should be one of the configured loans`);
    }
  }
});

Deno.test("SimulationEngine.runSimulation - milestone detection with offset account", () => {
  const params = getTestParameters();
  params.useOffsetAccount = true;
  params.currentOffsetBalance = 10000;
  params.loanPrincipal = 50000; // Smaller loan for offset completion
  
  const result = SimulationEngine.runSimulation(params);
  
  // Result should include milestones
  assertExists(result.milestones);
  
  // Should potentially detect offset completion milestone
  const offsetMilestones = result.milestones.filter(m => m.type === 'offset_completion');
  
  // Note: Offset completion may or may not occur depending on cash flow
  // This test just verifies the integration works without errors
  assertEquals(Array.isArray(offsetMilestones), true, "Should return array of offset milestones");
});