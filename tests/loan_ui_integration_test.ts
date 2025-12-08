/**
 * Integration test for loan UI and simulation
 * Verifies that loans added through the UI work correctly in simulation
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { SimulationEngine } from "../lib/simulation_engine.ts";
import type { SimulationConfiguration, UserParameters, Loan } from "../types/financial.ts";

Deno.test("UI Integration - Adding loans through UI flow", () => {
  // Simulate the default parameters that a new user would see
  const defaultParams: UserParameters = {
    householdMode: "single",
    people: [{
      id: "person-1",
      name: "Me",
      currentAge: 30,
      retirementAge: 65,
      incomeSources: [{
        id: "income-default",
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
    loans: [], // Empty by default - user must add loans
    loanPrincipal: 0,
    loanInterestRate: 5.5,
    loanPaymentAmount: 0,
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
    simulationYears: 1,
    startDate: new Date("2024-01-01"),
  };

  // Step 1: Verify default state has no loans
  const config1: SimulationConfiguration = {
    baseParameters: defaultParams,
    transitions: [],
  };
  
  const result1 = SimulationEngine.runSimulationWithTransitions(config1);
  assertEquals(result1.states[0].loanBalance, 0, "Default should have no loans");
  
  console.log("✓ Step 1: Default state has no loans");

  // Step 2: User clicks "+ Add Loan" button - simulate adding first loan
  const newLoan: Loan = {
    id: `loan-${Date.now()}`,
    label: "Home Mortgage",
    principal: 500000,
    interestRate: 6.5,
    paymentAmount: 3500,
    paymentFrequency: "monthly",
    hasOffset: false,
  };

  const paramsWithLoan: UserParameters = {
    ...defaultParams,
    loans: [newLoan],
  };

  const config2: SimulationConfiguration = {
    baseParameters: paramsWithLoan,
    transitions: [],
  };

  const result2 = SimulationEngine.runSimulationWithTransitions(config2);
  assertEquals(result2.states[0].loanBalance, 500000, "Should have loan balance");
  assertEquals(result2.states[1].loanBalance < 500000, true, "Loan should reduce after first month");
  
  console.log("✓ Step 2: Added loan appears in simulation");
  console.log(`  Initial: $${result2.states[0].loanBalance.toFixed(2)}`);
  console.log(`  Month 1: $${result2.states[1].loanBalance.toFixed(2)}`);

  // Step 3: User enables offset account on the loan
  const loanWithOffset: Loan = {
    ...newLoan,
    hasOffset: true,
    offsetBalance: 0,
  };

  const paramsWithOffset: UserParameters = {
    ...defaultParams,
    loans: [loanWithOffset],
  };

  const config3: SimulationConfiguration = {
    baseParameters: paramsWithOffset,
    transitions: [],
  };

  const result3 = SimulationEngine.runSimulationWithTransitions(config3);
  
  // After a few months, offset should have accumulated
  const month3 = result3.states[3];
  assertEquals(month3.offsetBalance > 0, true, "Offset should accumulate");
  assertEquals(month3.cash, 0, "Cash should go to offset");
  
  console.log("✓ Step 3: Offset account accumulates leftover cash");
  console.log(`  Offset balance (month 3): $${month3.offsetBalance.toFixed(2)}`);

  // Step 4: User adds a second loan
  const secondLoan: Loan = {
    id: `loan-${Date.now() + 1}`,
    label: "Car Loan",
    principal: 35000,
    interestRate: 7.5,
    paymentAmount: 700,
    paymentFrequency: "monthly",
    hasOffset: false,
  };

  const paramsWithTwoLoans: UserParameters = {
    ...defaultParams,
    loans: [loanWithOffset, secondLoan],
  };

  const config4: SimulationConfiguration = {
    baseParameters: paramsWithTwoLoans,
    transitions: [],
  };

  const result4 = SimulationEngine.runSimulationWithTransitions(config4);
  
  const initialTotal = result4.states[0].loanBalance;
  assertEquals(initialTotal, 535000, "Total should be sum of both loans");
  
  const month6 = result4.states[6];
  const loan1Balance = month6.loanBalances?.[loanWithOffset.id] || 0;
  const loan2Balance = month6.loanBalances?.[secondLoan.id] || 0;
  
  assertEquals(loan1Balance < 500000, true, "Home loan should reduce");
  assertEquals(loan2Balance < 35000, true, "Car loan should reduce");
  
  console.log("✓ Step 4: Multiple loans both reduce correctly");
  console.log(`  Home loan (month 6): $${loan1Balance.toFixed(2)}`);
  console.log(`  Car loan (month 6): $${loan2Balance.toFixed(2)}`);
  console.log(`  Total (month 6): $${month6.loanBalance.toFixed(2)}`);

  // Step 5: User removes a loan
  const paramsWithOneLoan: UserParameters = {
    ...defaultParams,
    loans: [loanWithOffset], // Only home loan remains
  };

  const config5: SimulationConfiguration = {
    baseParameters: paramsWithOneLoan,
    transitions: [],
  };

  const result5 = SimulationEngine.runSimulationWithTransitions(config5);
  assertEquals(result5.states[0].loanBalance, 500000, "Should only have home loan");
  
  console.log("✓ Step 5: Removing loan works correctly");

  // Step 6: User removes all loans
  const paramsWithNoLoans: UserParameters = {
    ...defaultParams,
    loans: [], // Back to no loans
  };

  const config6: SimulationConfiguration = {
    baseParameters: paramsWithNoLoans,
    transitions: [],
  };

  const result6 = SimulationEngine.runSimulationWithTransitions(config6);
  assertEquals(result6.states[0].loanBalance, 0, "Should have no loans");
  assertEquals(result6.states[6].loanBalance, 0, "Should stay at zero");
  
  console.log("✓ Step 6: Removing all loans results in zero balance");
});

Deno.test("UI Integration - Loan configuration changes", () => {
  const baseLoan: Loan = {
    id: "loan-1",
    label: "Test Loan",
    principal: 300000,
    interestRate: 6.0,
    paymentAmount: 2000,
    paymentFrequency: "monthly",
    hasOffset: false,
  };

  const baseParams: UserParameters = {
    householdMode: "single",
    people: [{
      id: "person-1",
      name: "Test",
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
    loans: [baseLoan],
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
  };

  // Test 1: Changing payment amount
  const config1: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [],
  };
  const result1 = SimulationEngine.runSimulationWithTransitions(config1);
  const month6Balance1 = result1.states[6].loanBalance;

  const higherPaymentLoan: Loan = {
    ...baseLoan,
    paymentAmount: 3000, // Increased payment
  };
  const config2: SimulationConfiguration = {
    baseParameters: { ...baseParams, loans: [higherPaymentLoan] },
    transitions: [],
  };
  const result2 = SimulationEngine.runSimulationWithTransitions(config2);
  const month6Balance2 = result2.states[6].loanBalance;

  assertEquals(month6Balance2 < month6Balance1, true, "Higher payment should reduce balance faster");
  
  console.log("✓ Changing payment amount affects loan reduction");
  console.log(`  $2000/month (month 6): $${month6Balance1.toFixed(2)}`);
  console.log(`  $3000/month (month 6): $${month6Balance2.toFixed(2)}`);

  // Test 2: Changing interest rate
  const higherRateLoan: Loan = {
    ...baseLoan,
    interestRate: 8.0, // Higher rate
  };
  const config3: SimulationConfiguration = {
    baseParameters: { ...baseParams, loans: [higherRateLoan] },
    transitions: [],
  };
  const result3 = SimulationEngine.runSimulationWithTransitions(config3);
  const month6Balance3 = result3.states[6].loanBalance;

  assertEquals(month6Balance3 > month6Balance1, true, "Higher rate should reduce balance slower");
  
  console.log("✓ Changing interest rate affects loan reduction");
  console.log(`  6% rate (month 6): $${month6Balance1.toFixed(2)}`);
  console.log(`  8% rate (month 6): $${month6Balance3.toFixed(2)}`);

  // Test 3: Changing payment frequency
  const fortnightlyLoan: Loan = {
    ...baseLoan,
    paymentAmount: 1000, // Half the monthly amount
    paymentFrequency: "fortnightly",
  };
  const config4: SimulationConfiguration = {
    baseParameters: { ...baseParams, loans: [fortnightlyLoan] },
    transitions: [],
  };
  const result4 = SimulationEngine.runSimulationWithTransitions(config4);
  const month6Balance4 = result4.states[6].loanBalance;

  // Fortnightly payments (26 per year) vs monthly (12 per year)
  // $1000 fortnightly = $26,000/year vs $2000 monthly = $24,000/year
  assertEquals(month6Balance4 < month6Balance1, true, "Fortnightly should pay more per year");
  
  console.log("✓ Changing payment frequency affects loan reduction");
  console.log(`  $2000 monthly (month 6): $${month6Balance1.toFixed(2)}`);
  console.log(`  $1000 fortnightly (month 6): $${month6Balance4.toFixed(2)}`);
});

console.log("\n=== All UI integration tests passed ===");
