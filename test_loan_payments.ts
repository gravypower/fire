/**
 * Test script to verify loan payments and offset functionality
 */

import { SimulationEngine } from "./lib/simulation_engine.ts";
import type { SimulationConfiguration, UserParameters } from "./types/financial.ts";

// Test 1: Simple loan with monthly payments
console.log("=== Test 1: Simple Loan Payment ===");
const testConfig1: SimulationConfiguration = {
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
    loans: [{
      id: "loan-1",
      label: "Home Loan",
      principal: 400000,
      interestRate: 6.0,
      paymentAmount: 3000,
      paymentFrequency: "monthly",
      hasOffset: false,
    }],
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
};

const result1 = SimulationEngine.runSimulationWithTransitions(testConfig1);
console.log("Initial loan balance:", 400000);
console.log("Monthly payment:", 3000);
console.log("Interest rate:", "6%");
console.log("\nFirst 3 months:");
for (let i = 0; i < 3; i++) {
  const state = result1.states[i];
  console.log(`Month ${i + 1}:`);
  console.log(`  Loan balance: $${state.loanBalance.toFixed(2)}`);
  console.log(`  Cash: $${state.cash.toFixed(2)}`);
  console.log(`  Interest saved: $${state.interestSaved.toFixed(2)}`);
}

// Test 2: Loan with offset account
console.log("\n=== Test 2: Loan with Offset Account ===");
const testConfig2: SimulationConfiguration = {
  ...testConfig1,
  baseParameters: {
    ...testConfig1.baseParameters,
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
};

const result2 = SimulationEngine.runSimulationWithTransitions(testConfig2);
console.log("Initial loan balance:", 400000);
console.log("Monthly payment:", 3000);
console.log("Interest rate:", "6%");
console.log("Offset enabled: YES");
console.log("\nFirst 3 months:");
for (let i = 0; i < 3; i++) {
  const state = result2.states[i];
  console.log(`Month ${i + 1}:`);
  console.log(`  Loan balance: $${state.loanBalance.toFixed(2)}`);
  console.log(`  Offset balance: $${state.offsetBalance.toFixed(2)}`);
  console.log(`  Cash: $${state.cash.toFixed(2)}`);
  console.log(`  Interest saved: $${state.interestSaved.toFixed(2)}`);
}

// Test 3: Multiple loans with offset on biggest
console.log("\n=== Test 3: Multiple Loans (Offset on Biggest) ===");
const testConfig3: SimulationConfiguration = {
  ...testConfig1,
  baseParameters: {
    ...testConfig1.baseParameters,
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
};

const result3 = SimulationEngine.runSimulationWithTransitions(testConfig3);
console.log("Loan 1 (Home): $400,000 @ 6% - Offset enabled");
console.log("Loan 2 (Car): $30,000 @ 8% - No offset");
console.log("\nFirst 3 months:");
for (let i = 0; i < 3; i++) {
  const state = result3.states[i];
  const loan1Balance = state.loanBalances?.["loan-1"] || 0;
  const loan2Balance = state.loanBalances?.["loan-2"] || 0;
  const loan1Offset = state.offsetBalances?.["loan-1"] || 0;
  console.log(`Month ${i + 1}:`);
  console.log(`  Home loan balance: $${loan1Balance.toFixed(2)}`);
  console.log(`  Home loan offset: $${loan1Offset.toFixed(2)}`);
  console.log(`  Car loan balance: $${loan2Balance.toFixed(2)}`);
  console.log(`  Total interest saved: $${state.interestSaved.toFixed(2)}`);
  console.log(`  Cash: $${state.cash.toFixed(2)}`);
}

console.log("\n=== Tests Complete ===");
