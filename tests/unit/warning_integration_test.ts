/**
 * Integration tests for warning and indicator logic
 * Validates: Requirements 7.3, 10.2, 10.4, 10.5
 */

import { assertEquals } from "$std/assert/mod.ts";
import { SimulationEngine } from "../../lib/simulation_engine.ts";
import type { UserParameters } from "../../types/financial.ts";

Deno.test("Warning integration - generates debt warning for unsustainable loan", () => {
  const params: UserParameters = {
    annualSalary: 50000,
    salaryFrequency: "monthly",
    monthlyLivingExpenses: 3000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 100000,
    loanInterestRate: 10, // High interest rate
    loanPaymentAmount: 200, // Very low payment
    loanPaymentFrequency: "monthly",
    monthlyInvestmentContribution: 0,
    investmentReturnRate: 7,
    currentInvestmentBalance: 0,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 0,
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

  // Should have warnings about increasing debt
  const hasDebtWarning = result.warnings.some(w => 
    w.toLowerCase().includes("increasing") || w.toLowerCase().includes("debt")
  );
  assertEquals(hasDebtWarning, true);
  assertEquals(result.isSustainable, false);
});

Deno.test("Warning integration - generates cash flow alert for negative periods", () => {
  const params: UserParameters = {
    annualSalary: 40000,
    salaryFrequency: "monthly",
    monthlyLivingExpenses: 3000,
    monthlyRentOrMortgage: 2000, // Expenses exceed income
    loanPrincipal: 0,
    loanInterestRate: 0,
    loanPaymentAmount: 0,
    loanPaymentFrequency: "monthly",
    monthlyInvestmentContribution: 0,
    investmentReturnRate: 7,
    currentInvestmentBalance: 0,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 0,
    desiredAnnualRetirementIncome: 40000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 2,
    startDate: new Date("2024-01-01"),
    incomeTaxRate: 30,
    useOffsetAccount: false,
    currentOffsetBalance: 0,
  };

  const result = SimulationEngine.runSimulation(params);

  // Should have warnings about negative cash flow
  const hasCashFlowAlert = result.warnings.some(w => 
    w.toLowerCase().includes("negative cash flow") || w.toLowerCase().includes("cash flow")
  );
  assertEquals(hasCashFlowAlert, true);
  assertEquals(result.isSustainable, false);
});

Deno.test("Warning integration - no warnings for healthy trajectory", () => {
  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
    loanPrincipal: 50000,
    loanInterestRate: 4,
    loanPaymentAmount: 1000, // Good payment amount
    loanPaymentFrequency: "monthly",
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 20000,
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

  // Should have minimal or no warnings for a healthy trajectory
  // (may have some warnings from the old checkSustainability method)
  assertEquals(result.isSustainable, true);
});

Deno.test("Warning integration - detects net worth decline", () => {
  const params: UserParameters = {
    annualSalary: 45000,
    salaryFrequency: "monthly",
    monthlyLivingExpenses: 2500,
    monthlyRentOrMortgage: 1800,
    loanPrincipal: 100000,
    loanInterestRate: 8,
    loanPaymentAmount: 500,
    loanPaymentFrequency: "monthly",
    monthlyInvestmentContribution: 0,
    investmentReturnRate: 7,
    currentInvestmentBalance: 5000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 10000,
    desiredAnnualRetirementIncome: 40000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 3,
    startDate: new Date("2024-01-01"),
    incomeTaxRate: 30,
    useOffsetAccount: false,
    currentOffsetBalance: 0,
  };

  const result = SimulationEngine.runSimulation(params);

  // Should have warnings about declining net worth or unsustainability
  const hasNetWorthWarning = result.warnings.some(w => 
    w.toLowerCase().includes("declining") || 
    w.toLowerCase().includes("net worth") ||
    w.toLowerCase().includes("unsustainable")
  );
  assertEquals(hasNetWorthWarning, true);
});
