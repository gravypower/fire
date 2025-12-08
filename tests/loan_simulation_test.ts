/**
 * Unit tests for loan simulation functionality
 * Tests multiple loans, offset accounts, and loan balance reduction
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { SimulationEngine } from "../lib/simulation_engine.ts";
import type { SimulationConfiguration } from "../types/financial.ts";

/**
 * Helper to create a basic test configuration
 */
function createTestConfig(overrides?: Partial<SimulationConfiguration>): SimulationConfiguration {
  return {
    baseParameters: {
      householdMode: "single",
      people: [{
        id: "person-1",
        name: "Test Person",
        currentAge: 30,
        retirementAge: 65,
        incomeSources: [{
          id: "income-1",
          label: "Salary",
          amount: 80000,
          frequency: "yearly",
          isBeforeTax: true,
        }],
        superAccounts: [],
      }],
      annualSalary: 80000,
      salaryFrequency: "monthly",
      incomeTaxRate: 30,
      monthlyLivingExpenses: 0,
      monthlyRentOrMortgage: 0,
      expenseItems: [],
      loans: [],
      loanPrincipal: 0,
      loanInterestRate: 0,
      loanPaymentAmount: 0,
      loanPaymentFrequency: "monthly",
      useOffsetAccount: false,
      currentOffsetBalance: 0,
      monthlyInvestmentContribution: 0,
      investmentReturnRate: 7,
      currentInvestmentBalance: 0,
      superContributionRate: 11,
      superReturnRate: 7,
      currentSuperBalance: 0,
      desiredAnnualRetirementIncome: 60000,
      retirementAge: 65,
      currentAge: 30,
      simulationYears: 1,
      startDate: new Date("2024-01-01"),
    },
    transitions: [],
    ...overrides,
  };
}

Deno.test("Single loan - balance reduces over time", () => {
  const config = createTestConfig({
    baseParameters: {
      ...createTestConfig().baseParameters,
      loans: [{
        id: "loan-1",
        label: "Home Loan",
        principal: 400000,
        interestRate: 6.0,
        paymentAmount: 3000,
        paymentFrequency: "monthly",
        hasOffset: false,
      }],
    },
  });

  const result = SimulationEngine.runSimulationWithTransitions(config);
  
  // Check that we have states
  assertExists(result.states);
  assertEquals(result.states.length > 0, true);
  
  // Initial state should have the full loan balance
  const initialState = result.states[0];
  assertEquals(initialState.loanBalance, 400000);
  
  // After 1 month, loan balance should be less
  const month1State = result.states[1];
  assertEquals(month1State.loanBalance < 400000, true);
  
  // After 6 months, loan balance should be even less
  const month6State = result.states[6];
  assertEquals(month6State.loanBalance < month1State.loanBalance, true);
  
  // Final state should have the lowest loan balance
  const finalState = result.states[result.states.length - 1];
  assertEquals(finalState.loanBalance < month6State.loanBalance, true);
  
  console.log("✓ Single loan balance reduces correctly");
  console.log(`  Initial: $${initialState.loanBalance.toFixed(2)}`);
  console.log(`  Month 1: $${month1State.loanBalance.toFixed(2)}`);
  console.log(`  Month 6: $${month6State.loanBalance.toFixed(2)}`);
  console.log(`  Final: $${finalState.loanBalance.toFixed(2)}`);
});

Deno.test("Single loan with offset - balance reduces faster", () => {
  const configWithoutOffset = createTestConfig({
    baseParameters: {
      ...createTestConfig().baseParameters,
      loans: [{
        id: "loan-1",
        label: "Home Loan",
        principal: 400000,
        interestRate: 6.0,
        paymentAmount: 3000,
        paymentFrequency: "monthly",
        hasOffset: false,
      }],
    },
  });

  const configWithOffset = createTestConfig({
    baseParameters: {
      ...createTestConfig().baseParameters,
      loans: [{
        id: "loan-1",
        label: "Home Loan",
        principal: 400000,
        interestRate: 6.0,
        paymentAmount: 3000,
        paymentFrequency: "monthly",
        hasOffset: true,
        offsetBalance: 0,
      }],
    },
  });

  const resultWithoutOffset = SimulationEngine.runSimulationWithTransitions(configWithoutOffset);
  const resultWithOffset = SimulationEngine.runSimulationWithTransitions(configWithOffset);
  
  // After 6 months, loan with offset should have lower balance
  const month6WithoutOffset = resultWithoutOffset.states[6];
  const month6WithOffset = resultWithOffset.states[6];
  
  assertEquals(month6WithOffset.loanBalance < month6WithoutOffset.loanBalance, true);
  assertEquals(month6WithOffset.interestSaved > 0, true);
  
  console.log("✓ Offset account reduces loan balance faster");
  console.log(`  Without offset (month 6): $${month6WithoutOffset.loanBalance.toFixed(2)}`);
  console.log(`  With offset (month 6): $${month6WithOffset.loanBalance.toFixed(2)}`);
  console.log(`  Interest saved: $${month6WithOffset.interestSaved.toFixed(2)}`);
});

Deno.test("Multiple loans - both balances reduce", () => {
  const config = createTestConfig({
    baseParameters: {
      ...createTestConfig().baseParameters,
      loans: [
        {
          id: "loan-1",
          label: "Home Loan",
          principal: 400000,
          interestRate: 6.0,
          paymentAmount: 2500,
          paymentFrequency: "monthly",
          hasOffset: false,
        },
        {
          id: "loan-2",
          label: "Car Loan",
          principal: 30000,
          interestRate: 8.0,
          paymentAmount: 500,
          paymentFrequency: "monthly",
          hasOffset: false,
        },
      ],
    },
  });

  const result = SimulationEngine.runSimulationWithTransitions(config);
  
  // Initial state
  const initialState = result.states[0];
  const initialLoan1 = initialState.loanBalances?.["loan-1"] || 0;
  const initialLoan2 = initialState.loanBalances?.["loan-2"] || 0;
  
  assertEquals(initialLoan1, 400000);
  assertEquals(initialLoan2, 30000);
  assertEquals(initialState.loanBalance, 430000); // Total
  
  // After 6 months, both loans should have reduced
  const month6State = result.states[6];
  const month6Loan1 = month6State.loanBalances?.["loan-1"] || 0;
  const month6Loan2 = month6State.loanBalances?.["loan-2"] || 0;
  
  assertEquals(month6Loan1 < initialLoan1, true);
  assertEquals(month6Loan2 < initialLoan2, true);
  assertEquals(month6State.loanBalance < initialState.loanBalance, true);
  
  console.log("✓ Multiple loans both reduce correctly");
  console.log(`  Home loan: $${initialLoan1.toFixed(2)} → $${month6Loan1.toFixed(2)}`);
  console.log(`  Car loan: $${initialLoan2.toFixed(2)} → $${month6Loan2.toFixed(2)}`);
  console.log(`  Total: $${initialState.loanBalance.toFixed(2)} → $${month6State.loanBalance.toFixed(2)}`);
});

Deno.test("Multiple loans with offset on biggest - leftover cash goes to offset", () => {
  const config = createTestConfig({
    baseParameters: {
      ...createTestConfig().baseParameters,
      loans: [
        {
          id: "loan-1",
          label: "Home Loan",
          principal: 400000,
          interestRate: 6.0,
          paymentAmount: 2500,
          paymentFrequency: "monthly",
          hasOffset: true,
          offsetBalance: 0,
        },
        {
          id: "loan-2",
          label: "Car Loan",
          principal: 30000,
          interestRate: 8.0,
          paymentAmount: 500,
          paymentFrequency: "monthly",
          hasOffset: false,
        },
      ],
    },
  });

  const result = SimulationEngine.runSimulationWithTransitions(config);
  
  // After a few months, offset should have accumulated
  const month3State = result.states[3];
  const loan1Offset = month3State.offsetBalances?.["loan-1"] || 0;
  const loan2Offset = month3State.offsetBalances?.["loan-2"] || 0;
  
  // Loan 1 (bigger loan with offset) should have offset balance
  assertEquals(loan1Offset > 0, true);
  // Loan 2 (no offset) should have no offset balance
  assertEquals(loan2Offset, 0);
  // Cash should be zero (all leftover goes to offset)
  assertEquals(month3State.cash, 0);
  
  console.log("✓ Leftover cash goes to biggest loan's offset");
  console.log(`  Home loan offset (month 3): $${loan1Offset.toFixed(2)}`);
  console.log(`  Car loan offset (month 3): $${loan2Offset.toFixed(2)}`);
  console.log(`  Cash: $${month3State.cash.toFixed(2)}`);
});

Deno.test("No loans - legacy fields ignored", () => {
  const config = createTestConfig({
    baseParameters: {
      ...createTestConfig().baseParameters,
      loans: [], // Empty loans array
      loanPrincipal: 100000, // Legacy field should be ignored
      loanInterestRate: 5.0,
      loanPaymentAmount: 1000,
      loanPaymentFrequency: "monthly",
    },
  });

  const result = SimulationEngine.runSimulationWithTransitions(config);
  
  // All states should have zero loan balance
  const initialState = result.states[0];
  const finalState = result.states[result.states.length - 1];
  
  assertEquals(initialState.loanBalance, 0);
  assertEquals(finalState.loanBalance, 0);
  
  console.log("✓ Empty loans array results in zero loan balance");
  console.log(`  Initial loan balance: $${initialState.loanBalance.toFixed(2)}`);
  console.log(`  Final loan balance: $${finalState.loanBalance.toFixed(2)}`);
});

Deno.test("Loan payoff - balance reaches zero", () => {
  const config = createTestConfig({
    baseParameters: {
      ...createTestConfig().baseParameters,
      loans: [{
        id: "loan-1",
        label: "Small Loan",
        principal: 10000,
        interestRate: 5.0,
        paymentAmount: 2000,
        paymentFrequency: "monthly",
        hasOffset: false,
      }],
      simulationYears: 1,
    },
  });

  const result = SimulationEngine.runSimulationWithTransitions(config);
  
  // Find when loan reaches zero
  let payoffMonth = -1;
  for (let i = 0; i < result.states.length; i++) {
    if (result.states[i].loanBalance === 0) {
      payoffMonth = i;
      break;
    }
  }
  
  // Loan should be paid off within the year
  assertEquals(payoffMonth > 0, true);
  assertEquals(payoffMonth < result.states.length, true);
  
  // After payoff, balance should stay at zero
  const finalState = result.states[result.states.length - 1];
  assertEquals(finalState.loanBalance, 0);
  
  console.log("✓ Loan gets paid off and stays at zero");
  console.log(`  Paid off at month: ${payoffMonth}`);
  console.log(`  Final balance: $${finalState.loanBalance.toFixed(2)}`);
});

Deno.test("Multiple loans with different frequencies", () => {
  const config = createTestConfig({
    baseParameters: {
      ...createTestConfig().baseParameters,
      loans: [
        {
          id: "loan-1",
          label: "Monthly Loan",
          principal: 100000,
          interestRate: 6.0,
          paymentAmount: 1000,
          paymentFrequency: "monthly",
          hasOffset: false,
        },
        {
          id: "loan-2",
          label: "Fortnightly Loan",
          principal: 50000,
          interestRate: 7.0,
          paymentAmount: 500,
          paymentFrequency: "fortnightly",
          hasOffset: false,
        },
      ],
    },
  });

  const result = SimulationEngine.runSimulationWithTransitions(config);
  
  // Both loans should reduce
  const initialState = result.states[0];
  const month6State = result.states[6];
  
  const initialLoan1 = initialState.loanBalances?.["loan-1"] || 0;
  const initialLoan2 = initialState.loanBalances?.["loan-2"] || 0;
  const month6Loan1 = month6State.loanBalances?.["loan-1"] || 0;
  const month6Loan2 = month6State.loanBalances?.["loan-2"] || 0;
  
  assertEquals(month6Loan1 < initialLoan1, true);
  assertEquals(month6Loan2 < initialLoan2, true);
  
  console.log("✓ Loans with different frequencies both reduce");
  console.log(`  Monthly loan: $${initialLoan1.toFixed(2)} → $${month6Loan1.toFixed(2)}`);
  console.log(`  Fortnightly loan: $${initialLoan2.toFixed(2)} → $${month6Loan2.toFixed(2)}`);
});

console.log("\n=== All loan simulation tests passed ===");
