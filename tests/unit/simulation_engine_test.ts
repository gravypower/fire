/**
 * Unit tests for simulation engine calculations
 * Tests all calculation logic including parameter transitions
 */

import { assertEquals, assertExists, assert } from "$std/assert/mod.ts";
import { SimulationEngine, convertAnnualRateToInterval } from "../../lib/simulation_engine.ts";
import type { UserParameters, SimulationConfiguration } from "../../types/financial.ts";

/**
 * Helper to create default test parameters
 */
function getTestParameters(): UserParameters {
  return {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 300000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 5,
    startDate: new Date("2024-01-01"),
  };
}

Deno.test("convertAnnualRateToInterval - monthly conversion", () => {
  const annualRate = 0.12; // 12% annual
  const monthlyRate = convertAnnualRateToInterval(annualRate, "month");
  
  // Monthly rate should be approximately 0.9489% (compound formula)
  assertEquals(Math.abs(monthlyRate - 0.009489) < 0.0001, true);
});

Deno.test("convertAnnualRateToInterval - weekly conversion", () => {
  const annualRate = 0.12; // 12% annual
  const weeklyRate = convertAnnualRateToInterval(annualRate, "week");
  
  // Weekly rate should be approximately 0.2186%
  assertEquals(Math.abs(weeklyRate - 0.002186) < 0.0001, true);
});

Deno.test("SimulationEngine.runSimulation - generates states", () => {
  const params = getTestParameters();
  const result = SimulationEngine.runSimulation(params);
  
  assertExists(result.states);
  assertEquals(result.states.length > 0, true);
  
  // Should have approximately 60 monthly states for 5 years (5 * 12 = 60)
  assertEquals(result.states.length >= 55, true);
  assertEquals(result.states.length <= 65, true);
});

Deno.test("SimulationEngine.runSimulation - initial state is correct", () => {
  const params = getTestParameters();
  const result = SimulationEngine.runSimulation(params);
  
  const initialState = result.states[0];
  
  assertEquals(initialState.cash, 0);
  assertEquals(initialState.investments, params.currentInvestmentBalance);
  assertEquals(initialState.superannuation, params.currentSuperBalance);
  assertEquals(initialState.loanBalance, params.loanPrincipal);
  assertEquals(initialState.offsetBalance, params.currentOffsetBalance);
});

Deno.test("SimulationEngine.runSimulation - loan balance decreases over time", () => {
  const params = getTestParameters();
  const result = SimulationEngine.runSimulation(params);
  
  const initialLoan = result.states[0].loanBalance;
  const finalLoan = result.states[result.states.length - 1].loanBalance;
  
  // Loan should decrease
  assertEquals(finalLoan < initialLoan, true);
});

Deno.test("SimulationEngine.runSimulation - investments grow over time", () => {
  const params = getTestParameters();
  const result = SimulationEngine.runSimulation(params);
  
  const initialInvestments = result.states[0].investments;
  const finalInvestments = result.states[result.states.length - 1].investments;
  
  // Investments should grow (contributions + returns)
  assertEquals(finalInvestments > initialInvestments, true);
});

Deno.test("SimulationEngine.runSimulation - superannuation grows over time", () => {
  const params = getTestParameters();
  const result = SimulationEngine.runSimulation(params);
  
  const initialSuper = result.states[0].superannuation;
  const finalSuper = result.states[result.states.length - 1].superannuation;
  
  // Super should grow (contributions + returns)
  assertEquals(finalSuper > initialSuper, true);
});

Deno.test("SimulationEngine.calculateTimeStep - income calculation", () => {
  const params = getTestParameters();
  const initialState = {
    date: new Date("2024-01-01"),
    cash: 0,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 300000,
    offsetBalance: 0,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };
  
  const newState = SimulationEngine.calculateTimeStep(initialState, params, "month");
  
  // Monthly gross income should be 80000 / 12 = 6666.67
  const expectedGrossIncome = 80000 / 12;
  
  // Tax should be approximately 30% = 2000
  const expectedTax = expectedGrossIncome * 0.30;
  
  assertEquals(newState.taxPaid > 0, true);
  assertEquals(Math.abs(newState.taxPaid - expectedTax) < 10, true);
});

Deno.test("SimulationEngine.calculateTimeStep - expense deduction", () => {
  const params = getTestParameters();
  params.monthlyLivingExpenses = 2000;
  params.monthlyRentOrMortgage = 0;
  
  const initialState = {
    date: new Date("2024-01-01"),
    cash: 10000,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 0,
    offsetBalance: 0,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };
  
  const newState = SimulationEngine.calculateTimeStep(initialState, params, "month");
  
  // Cash should decrease by expenses (after income is added)
  // Income: 80000/12 = 6666.67, Tax: ~2000, Net: ~4666.67
  // Expenses: 2000
  // Expected cash: 10000 + 4666.67 - 2000 = 12666.67
  assertEquals(newState.cash > initialState.cash, true);
});

Deno.test("SimulationEngine.calculateTimeStep - loan payment with interest", () => {
  const params = getTestParameters();
  params.loanPrincipal = 300000;
  params.loanInterestRate = 6.0; // 6% annual
  params.loanPaymentAmount = 2000;
  params.useOffsetAccount = false;
  
  const initialState = {
    date: new Date("2024-01-01"),
    cash: 10000,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 300000,
    offsetBalance: 0,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };
  
  const newState = SimulationEngine.calculateTimeStep(initialState, params, "month");
  
  // Loan balance should decrease
  assertEquals(newState.loanBalance < initialState.loanBalance, true);
  
  // But not by the full payment amount (interest is charged)
  const principalPaid = initialState.loanBalance - newState.loanBalance;
  assertEquals(principalPaid < params.loanPaymentAmount, true);
});

Deno.test("SimulationEngine.calculateTimeStep - offset account reduces interest", () => {
  const params = getTestParameters();
  params.loanPrincipal = 300000;
  params.loanInterestRate = 6.0;
  params.loanPaymentAmount = 2000;
  params.useOffsetAccount = true;
  params.currentOffsetBalance = 50000;
  
  const initialState = {
    date: new Date("2024-01-01"),
    cash: 10000,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 300000,
    offsetBalance: 50000,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };
  
  const newState = SimulationEngine.calculateTimeStep(initialState, params, "month");
  
  // Interest saved should be positive
  assertEquals(newState.interestSaved > 0, true);
  
  // Leftover cash should go to offset
  assertEquals(newState.offsetBalance >= initialState.offsetBalance, true);
});

Deno.test("SimulationEngine.calculateTimeStep - investment contributions and growth", () => {
  const params = getTestParameters();
  params.monthlyInvestmentContribution = 500;
  params.investmentReturnRate = 8.0; // 8% annual
  
  const initialState = {
    date: new Date("2024-01-01"),
    cash: 10000,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 0,
    offsetBalance: 0,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };
  
  const newState = SimulationEngine.calculateTimeStep(initialState, params, "month");
  
  // Investments should grow by more than just the contribution (due to returns)
  const investmentGrowth = newState.investments - initialState.investments;
  assertEquals(investmentGrowth > params.monthlyInvestmentContribution, true);
});

Deno.test("SimulationEngine.calculateTimeStep - negative cash flow handling", () => {
  const params = getTestParameters();
  params.annualSalary = 30000; // Low income
  params.monthlyLivingExpenses = 3000; // High expenses
  params.loanPaymentAmount = 2000;
  
  const initialState = {
    date: new Date("2024-01-01"),
    cash: 100,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 300000,
    offsetBalance: 0,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };
  
  const newState = SimulationEngine.calculateTimeStep(initialState, params, "month");
  
  // Cash flow should be negative (expenses exceed net income after loan payments)
  assert(newState.cashFlow < 0, `Expected negative cash flow, got ${newState.cashFlow}`);
  
  // With these parameters (low income, high expenses), cash should go negative
  // This represents an unsustainable financial situation
  assert(newState.cash < 0, "Cash should go negative when expenses exceed income");
});

Deno.test("SimulationEngine.runSimulationWithTransitions - applies transitions", () => {
  const baseParams = getTestParameters();
  baseParams.annualSalary = 80000;
  baseParams.simulationYears = 3;
  
  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2025-01-01"),
        label: "Salary increase",
        parameterChanges: {
          annualSalary: 100000,
        },
      },
    ],
  };
  
  const result = SimulationEngine.runSimulationWithTransitions(config);
  
  assertExists(result.transitionPoints);
  assertEquals(result.transitionPoints.length, 1);
  assertEquals(result.transitionPoints[0].transition.id, "transition-1");
});

Deno.test("SimulationEngine.runSimulationWithTransitions - transition affects calculations", () => {
  const baseParams = getTestParameters();
  baseParams.annualSalary = 50000;
  baseParams.simulationYears = 2;
  
  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2024-07-01"),
        label: "Salary increase",
        parameterChanges: {
          annualSalary: 100000, // Double salary
        },
      },
    ],
  };
  
  const result = SimulationEngine.runSimulationWithTransitions(config);
  
  // Find states before and after transition
  const transitionIndex = result.transitionPoints[0].stateIndex;
  const beforeState = result.states[transitionIndex - 1];
  const afterState = result.states[transitionIndex + 1];
  
  // Cash flow should be higher after transition
  assertEquals(afterState.cashFlow > beforeState.cashFlow, true);
});

Deno.test("SimulationEngine.runSimulationWithTransitions - multiple transitions", () => {
  const baseParams = getTestParameters();
  baseParams.simulationYears = 3;
  
  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2024-06-01"),
        label: "First change",
        parameterChanges: {
          annualSalary: 90000,
        },
      },
      {
        id: "transition-2",
        transitionDate: new Date("2025-06-01"),
        label: "Second change",
        parameterChanges: {
          monthlyLivingExpenses: 1500,
        },
      },
    ],
  };
  
  const result = SimulationEngine.runSimulationWithTransitions(config);
  
  assertEquals(result.transitionPoints.length, 2);
  assertEquals(result.transitionPoints[0].transition.id, "transition-1");
  assertEquals(result.transitionPoints[1].transition.id, "transition-2");
});

Deno.test("SimulationEngine.runComparisonSimulation - compares scenarios", async () => {
  const baseParams = getTestParameters();
  baseParams.simulationYears = 3;
  
  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2025-01-01"),
        label: "Salary increase",
        parameterChanges: {
          annualSalary: 120000,
        },
      },
    ],
  };
  
  const result = await SimulationEngine.runComparisonSimulation(config);
  
  assertExists(result.withTransitions);
  assertExists(result.withoutTransitions);
  assertExists(result.comparison);
  
  // With transitions should have better net worth
  const withTransitionsNetWorth = result.withTransitions.states[result.withTransitions.states.length - 1].netWorth;
  const withoutTransitionsNetWorth = result.withoutTransitions.states[result.withoutTransitions.states.length - 1].netWorth;
  
  assertEquals(withTransitionsNetWorth > withoutTransitionsNetWorth, true);
  assertEquals(result.comparison.finalNetWorthDifference > 0, true);
});

Deno.test("SimulationEngine.checkSustainability - detects unsustainable scenarios", () => {
  const params = getTestParameters();
  params.annualSalary = 30000; // Very low income
  params.monthlyLivingExpenses = 3000;
  params.loanPaymentAmount = 2000;
  params.simulationYears = 2;
  
  const result = SimulationEngine.runSimulation(params);
  
  assertEquals(result.isSustainable, false);
  assertEquals(result.warnings.length > 0, true);
});

Deno.test("SimulationEngine.checkSustainability - detects sustainable scenarios", () => {
  const params = getTestParameters();
  params.annualSalary = 100000; // Good income
  params.monthlyLivingExpenses = 2000;
  params.loanPaymentAmount = 2000;
  params.simulationYears = 5;
  
  const result = SimulationEngine.runSimulation(params);
  
  // Should be sustainable with good income
  assertEquals(result.isSustainable, true);
});
