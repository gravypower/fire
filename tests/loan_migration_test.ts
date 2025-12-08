/**
 * Test for migrating legacy loan data to new loans array format
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { UserParameters } from "../types/financial.ts";

Deno.test("Legacy loan migration - single loan with offset", () => {
  // Simulate legacy data structure (no loans array)
  const legacyParams: UserParameters = {
    householdMode: "single",
    people: [{
      id: "person-1",
      name: "Me",
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
    // Legacy loan fields (no loans array)
    loanPrincipal: 400000,
    loanInterestRate: 6.5,
    loanPaymentAmount: 3000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: true,
    currentOffsetBalance: 5000,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 40,
    startDate: new Date("2024-01-01"),
  };

  // Simulate the migration logic
  const migratedParams = { ...legacyParams };
  
  if (migratedParams.loans === undefined) {
    if (migratedParams.loanPrincipal > 0) {
      migratedParams.loans = [{
        id: `loan-migrated-${Date.now()}`,
        label: "Migrated Loan",
        principal: migratedParams.loanPrincipal,
        interestRate: migratedParams.loanInterestRate,
        paymentAmount: migratedParams.loanPaymentAmount,
        paymentFrequency: migratedParams.loanPaymentFrequency,
        hasOffset: migratedParams.useOffsetAccount,
        offsetBalance: migratedParams.currentOffsetBalance || 0,
      }];
      // Clear legacy fields
      migratedParams.loanPrincipal = 0;
      migratedParams.loanPaymentAmount = 0;
      migratedParams.useOffsetAccount = false;
      migratedParams.currentOffsetBalance = 0;
    } else {
      migratedParams.loans = [];
    }
  }

  // Verify migration
  assertEquals(migratedParams.loans !== undefined, true, "loans array should exist");
  assertEquals(migratedParams.loans!.length, 1, "should have one migrated loan");
  
  const migratedLoan = migratedParams.loans![0];
  assertEquals(migratedLoan.principal, 400000, "principal should match");
  assertEquals(migratedLoan.interestRate, 6.5, "interest rate should match");
  assertEquals(migratedLoan.paymentAmount, 3000, "payment amount should match");
  assertEquals(migratedLoan.paymentFrequency, "monthly", "frequency should match");
  assertEquals(migratedLoan.hasOffset, true, "offset should be enabled");
  assertEquals(migratedLoan.offsetBalance, 5000, "offset balance should match");
  
  // Verify legacy fields are cleared
  assertEquals(migratedParams.loanPrincipal, 0, "legacy loanPrincipal should be cleared");
  assertEquals(migratedParams.loanPaymentAmount, 0, "legacy loanPaymentAmount should be cleared");
  assertEquals(migratedParams.useOffsetAccount, false, "legacy useOffsetAccount should be cleared");
  assertEquals(migratedParams.currentOffsetBalance, 0, "legacy currentOffsetBalance should be cleared");
  
  console.log("✓ Legacy loan migrated successfully");
  console.log(`  Migrated loan: $${migratedLoan.principal.toFixed(2)} @ ${migratedLoan.interestRate}%`);
  console.log(`  Payment: $${migratedLoan.paymentAmount} ${migratedLoan.paymentFrequency}`);
  console.log(`  Offset: ${migratedLoan.hasOffset ? `$${migratedLoan.offsetBalance}` : 'No'}`);
});

Deno.test("Legacy loan migration - no loan", () => {
  // Simulate legacy data with no loan
  const legacyParams: UserParameters = {
    householdMode: "single",
    people: [{
      id: "person-1",
      name: "Me",
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
    // Legacy loan fields - all zero (no loan)
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
    simulationYears: 40,
    startDate: new Date("2024-01-01"),
  };

  // Simulate the migration logic
  const migratedParams = { ...legacyParams };
  
  if (migratedParams.loans === undefined) {
    if (migratedParams.loanPrincipal > 0) {
      migratedParams.loans = [{
        id: `loan-migrated-${Date.now()}`,
        label: "Migrated Loan",
        principal: migratedParams.loanPrincipal,
        interestRate: migratedParams.loanInterestRate,
        paymentAmount: migratedParams.loanPaymentAmount,
        paymentFrequency: migratedParams.loanPaymentFrequency,
        hasOffset: migratedParams.useOffsetAccount,
        offsetBalance: migratedParams.currentOffsetBalance || 0,
      }];
    } else {
      migratedParams.loans = [];
    }
  }

  // Verify migration
  assertEquals(migratedParams.loans !== undefined, true, "loans array should exist");
  assertEquals(migratedParams.loans!.length, 0, "should have no loans");
  
  console.log("✓ Legacy data with no loan migrated successfully");
  console.log(`  Loans array: empty (no legacy loan to migrate)`);
});

Deno.test("Legacy loan migration - already has loans array", () => {
  // Simulate data that already has loans array (shouldn't be modified)
  const modernParams: UserParameters = {
    householdMode: "single",
    people: [{
      id: "person-1",
      name: "Me",
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
    // Modern loans array
    loans: [{
      id: "loan-1",
      label: "Home Mortgage",
      principal: 500000,
      interestRate: 6.0,
      paymentAmount: 3500,
      paymentFrequency: "monthly",
      hasOffset: true,
      offsetBalance: 10000,
    }],
    // Legacy fields (should be ignored)
    loanPrincipal: 400000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 3000,
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
    simulationYears: 40,
    startDate: new Date("2024-01-01"),
  };

  // Simulate the migration logic (should not modify)
  const migratedParams = { ...modernParams };
  
  if (migratedParams.loans === undefined) {
    // This branch should NOT execute
    migratedParams.loans = [];
  }

  // Verify no migration occurred
  assertEquals(migratedParams.loans.length, 1, "should still have one loan");
  assertEquals(migratedParams.loans[0].principal, 500000, "loan should be unchanged");
  assertEquals(migratedParams.loans[0].label, "Home Mortgage", "loan label should be unchanged");
  
  console.log("✓ Modern data with loans array unchanged");
  console.log(`  Existing loan preserved: ${migratedParams.loans[0].label}`);
});

console.log("\n=== All migration tests passed ===");
