/**
 * Integration tests for error handling in milestone and advice components
 * Validates: Requirements 1.1, 2.1
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { MilestoneDetector } from "../../lib/milestone_detector.ts";
import { RetirementAdviceEngine } from "../../lib/retirement_advice_engine.ts";
import type { FinancialState, UserParameters, SimulationResult } from "../../types/financial.ts";

// Helper to create minimal valid financial state
function createMinimalFinancialState(date: Date): FinancialState {
  return {
    date,
    cash: 5000,
    investments: 50000,
    superannuation: 30000,
    loanBalance: 200000,
    offsetBalance: 0,
    netWorth: 100000,
    cashFlow: 1000,
    taxPaid: 500,
    expenses: 4000,
    interestSaved: 0,
  };
}

// Helper to create minimal valid user parameters
function createMinimalUserParameters(): UserParameters {
  return {
    annualSalary: 60000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 3000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 200000,
    loanInterestRate: 4.5,
    loanPaymentAmount: 2000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    currentInvestmentBalance: 50000,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    superContributionRate: 9.5,
    superReturnRate: 7,
    currentSuperBalance: 30000,
    currentAge: 30,
    retirementAge: 65,
    desiredAnnualRetirementIncome: 40000,
    simulationYears: 35,
    startDate: new Date('2024-01-01'),
  };
}

Deno.test("MilestoneDetector - handles empty states gracefully", () => {
  const detector = new MilestoneDetector();
  const params = createMinimalUserParameters();
  
  // Test with empty states array
  const result = detector.detectMilestones([], params);
  
  assertEquals(result.milestones.length, 0);
  assertExists(result.errors);
  assertExists(result.warnings);
});

Deno.test("MilestoneDetector - handles invalid states gracefully", () => {
  const detector = new MilestoneDetector();
  const params = createMinimalUserParameters();
  
  // Test with single state (insufficient for detection)
  const states = [createMinimalFinancialState(new Date())];
  const result = detector.detectMilestones(states, params);
  
  assertEquals(result.milestones.length, 0);
  assertExists(result.errors);
  assertExists(result.warnings);
});

Deno.test("MilestoneDetector - handles corrupted state data", () => {
  const detector = new MilestoneDetector();
  const params = createMinimalUserParameters();
  
  // Create states with some corrupted data
  const states = [
    createMinimalFinancialState(new Date('2024-01-01')),
    {
      ...createMinimalFinancialState(new Date('2024-02-01')),
      loanBalance: NaN, // Corrupted data
    } as FinancialState,
  ];
  
  // Should not throw, should handle gracefully
  const result = detector.detectMilestones(states, params);
  
  assertExists(result);
  assertExists(result.milestones);
  assertExists(result.errors);
});

Deno.test("RetirementAdviceEngine - handles empty simulation result", () => {
  const engine = new RetirementAdviceEngine();
  const params = createMinimalUserParameters();
  
  // Create empty simulation result
  const emptyResult: SimulationResult = {
    states: [],
    retirementDate: null,
    retirementAge: null,
    isSustainable: false,
    warnings: [],
  };
  
  const result = engine.generateAdvice(emptyResult, params);
  
  assertExists(result.advice);
  assertEquals(result.advice.overallAssessment, "critical");
  assertEquals(result.advice.recommendations.length, 0);
  assertExists(result.errors);
});

Deno.test("RetirementAdviceEngine - handles corrupted simulation data", () => {
  const engine = new RetirementAdviceEngine();
  const params = createMinimalUserParameters();
  
  // Create simulation result with corrupted data
  const corruptedResult: SimulationResult = {
    states: [
      {
        ...createMinimalFinancialState(new Date()),
        netWorth: NaN, // Corrupted data
        investments: Infinity, // More corrupted data
      } as FinancialState,
    ],
    retirementDate: null,
    retirementAge: null,
    isSustainable: false,
    warnings: [],
  };
  
  // Should not throw, should handle gracefully
  const result = engine.generateAdvice(corruptedResult, params);
  
  assertExists(result);
  assertExists(result.advice);
  assertExists(result.errors);
});

Deno.test("MilestoneDetector - configuration validation", () => {
  // Test with invalid configuration
  const detector = new MilestoneDetector({
    detectLoanPayoffs: true,
    detectOffsetCompletion: true,
    detectRetirementEligibility: true,
    detectParameterTransitions: true,
    minimumImpactThreshold: -1000, // Invalid threshold
  });
  
  const params = createMinimalUserParameters();
  const states = [
    createMinimalFinancialState(new Date('2024-01-01')),
    createMinimalFinancialState(new Date('2024-02-01')),
  ];
  
  // Should still work despite invalid config
  const result = detector.detectMilestones(states, params);
  
  assertExists(result);
  assertExists(result.milestones);
});

Deno.test("RetirementAdviceEngine - configuration validation", () => {
  // Test with invalid configuration
  const engine = new RetirementAdviceEngine({
    includeDebtAdvice: true,
    includeInvestmentAdvice: true,
    includeExpenseAdvice: true,
    includeIncomeAdvice: true,
    maxRecommendations: -5, // Invalid max
    minEffectivenessThreshold: 150, // Invalid threshold
  });
  
  const params = createMinimalUserParameters();
  const states = [
    createMinimalFinancialState(new Date('2024-01-01')),
    createMinimalFinancialState(new Date('2024-02-01')),
  ];
  
  const simulationResult: SimulationResult = {
    states,
    retirementDate: new Date('2050-01-01'),
    retirementAge: 65,
    isSustainable: true,
    warnings: [],
  };
  
  // Should still work despite invalid config
  const result = engine.generateAdvice(simulationResult, params);
  
  assertExists(result);
  assertExists(result.advice);
});