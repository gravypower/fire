/**
 * Unit tests for Simulation Engine
 * Tests core simulation functionality
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import { SimulationEngine } from "../../lib/simulation_engine.ts";
import type { UserParameters } from "../../types/financial.ts";

Deno.test("SimulationEngine - runSimulation produces states for entire duration", () => {
  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 0,
    loanInterestRate: 0,
    loanPaymentAmount: 0,
    loanPaymentFrequency: "monthly",
    monthlyInvestmentContribution: 1000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 40000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 5,
    startDate: new Date("2024-01-01"),
    incomeTaxRate: 30,
    useOffsetAccount: false,
    currentOffsetBalance: 0,
  };

  const result = SimulationEngine.runSimulation(params);

  // Should have states for each month plus initial state
  // 5 years * 12 months + 1 initial state = 61 states
  assertEquals(result.states.length, 61);
  assertExists(result.states[0]);
  assertExists(result.warnings);
});

Deno.test("SimulationEngine - calculateTimeStep applies income and expenses", () => {
  const params: UserParameters = {
    annualSalary: 60000,
    salaryFrequency: "monthly",
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1000,
    loanPrincipal: 0,
    loanInterestRate: 0,
    loanPaymentAmount: 0,
    loanPaymentFrequency: "monthly",
    monthlyInvestmentContribution: 0,
    investmentReturnRate: 0,
    currentInvestmentBalance: 0,
    superContributionRate: 11,
    superReturnRate: 0,
    currentSuperBalance: 0,
    desiredAnnualRetirementIncome: 40000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 1,
    startDate: new Date("2024-01-01"),
    incomeTaxRate: 30,
    useOffsetAccount: false,
    currentOffsetBalance: 0,
  };

  const initialState = {
    date: new Date("2024-01-01"),
    cash: 0,
    investments: 0,
    superannuation: 0,
    loanBalance: 0,
    netWorth: 0,
    cashFlow: 0,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
  };

  const newState = SimulationEngine.calculateTimeStep(
    initialState,
    params,
    "month",
  );

  // Monthly income: 60000 / 12 = 5000
  // Monthly expenses: 2000 + 1000 = 3000
  // Expected cash: 5000 - 3000 = 2000
  assertEquals(newState.cash, 2000);
});

Deno.test("SimulationEngine - handles negative cash flow by preventing investments", () => {
  const params: UserParameters = {
    annualSalary: 36000, // $3000/month
    salaryFrequency: "monthly",
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500, // Total expenses: $3500/month
    loanPrincipal: 0,
    loanInterestRate: 0,
    loanPaymentAmount: 0,
    loanPaymentFrequency: "monthly",
    monthlyInvestmentContribution: 500, // Can't afford this
    investmentReturnRate: 7,
    currentInvestmentBalance: 1000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 0,
    desiredAnnualRetirementIncome: 40000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 1,
    startDate: new Date("2024-01-01"),
    incomeTaxRate: 30,
    useOffsetAccount: false,
    currentOffsetBalance: 0,
  };

  const initialState = {
    date: new Date("2024-01-01"),
    cash: 0,
    investments: 1000,
    superannuation: 0,
    loanBalance: 0,
    netWorth: 1000,
    cashFlow: 0,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
  };

  const newState = SimulationEngine.calculateTimeStep(
    initialState,
    params,
    "month",
  );

  // Income: 3000, Expenses: 3500, Net: -500
  // Should not make investment contribution
  // Cash should be -500 (negative cash flow reduces available cash per Req 7.1)
  assertEquals(newState.cash, -500);
  
  // Investment should only grow from existing balance, no contribution
  // Since we can't afford the contribution, investment stays at ~1000 (plus growth)
  assertEquals(newState.investments > 1000, true);
  assertEquals(newState.investments < 1100, true); // Growth should be small for one month
});

Deno.test("SimulationEngine - processes loan payments correctly", () => {
  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 100000,
    loanInterestRate: 5, // 5% annual
    loanPaymentAmount: 1000,
    loanPaymentFrequency: "monthly",
    monthlyInvestmentContribution: 0,
    investmentReturnRate: 0,
    currentInvestmentBalance: 0,
    superContributionRate: 11,
    superReturnRate: 0,
    currentSuperBalance: 0,
    desiredAnnualRetirementIncome: 40000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 1,
    startDate: new Date("2024-01-01"),
    incomeTaxRate: 30,
    useOffsetAccount: false,
    currentOffsetBalance: 0,
  };

  const initialState = {
    date: new Date("2024-01-01"),
    cash: 0,
    investments: 0,
    superannuation: 0,
    loanBalance: 100000,
    netWorth: -100000,
    cashFlow: 0,
      offsetBalance: 0,
      taxPaid: 0,
      interestSaved: 0,
  };

  const newState = SimulationEngine.calculateTimeStep(
    initialState,
    params,
    "month",
  );

  // Loan balance should decrease (payment includes principal)
  assertEquals(newState.loanBalance < 100000, true);
  
  // Cash should be positive after income, expenses, and loan payment
  // Income: 80000/12 = 6666.67, Expenses: 2000, Loan: 1000
  // Expected: ~3666.67
  assertEquals(newState.cash > 3000, true);
  assertEquals(newState.cash < 4000, true);
});

Deno.test("SimulationEngine - calculates net worth correctly", () => {
  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1000,
    loanPrincipal: 50000,
    loanInterestRate: 5,
    loanPaymentAmount: 500,
    loanPaymentFrequency: "monthly",
    monthlyInvestmentContribution: 1000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 20000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 30000,
    desiredAnnualRetirementIncome: 40000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 1,
    startDate: new Date("2024-01-01"),
    incomeTaxRate: 30,
    useOffsetAccount: false,
    currentOffsetBalance: 0,
  };

  const result = SimulationEngine.runSimulation(params);
  
  // Check that net worth is calculated correctly for each state
  for (const state of result.states) {
    const calculatedNetWorth = state.cash + state.investments + 
      state.superannuation - state.loanBalance;
    assertEquals(
      Math.abs(state.netWorth - calculatedNetWorth) < 0.01,
      true,
      `Net worth mismatch: ${state.netWorth} vs ${calculatedNetWorth}`,
    );
  }
});
