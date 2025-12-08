/**
 * Unit tests for financial processors
 * Tests income, expense, loan, investment, and retirement calculations
 */

import { assertEquals, assertExists } from "$std/assert/mod.ts";
import {
  IncomeProcessor,
  ExpenseProcessor,
  LoanProcessor,
  InvestmentProcessor,
  RetirementCalculator,
  calculateTaxWithBrackets,
  DEFAULT_AU_TAX_BRACKETS,
} from "../../lib/processors.ts";
import type { UserParameters, FinancialState, TaxBracket } from "../../types/financial.ts";

/**
 * Helper to create test parameters
 */
function getTestParameters(): UserParameters {
  return {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1500,
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
    simulationYears: 35,
    startDate: new Date(),
  };
}

// ===== Tax Calculation Tests =====

Deno.test("calculateTaxWithBrackets - no tax below threshold", () => {
  const brackets: TaxBracket[] = [
    { min: 0, max: 18200, rate: 0 },
    { min: 18200, max: 45000, rate: 19 },
  ];
  
  const tax = calculateTaxWithBrackets(15000, brackets);
  assertEquals(tax, 0);
});

Deno.test("calculateTaxWithBrackets - single bracket", () => {
  const brackets: TaxBracket[] = [
    { min: 0, max: 18200, rate: 0 },
    { min: 18200, max: 45000, rate: 19 },
  ];
  
  const tax = calculateTaxWithBrackets(30000, brackets);
  // Tax on (30000 - 18200) = 11800 * 0.19 = 2242
  assertEquals(Math.abs(tax - 2242) < 1, true);
});

Deno.test("calculateTaxWithBrackets - multiple brackets", () => {
  const brackets: TaxBracket[] = [
    { min: 0, max: 18200, rate: 0 },
    { min: 18200, max: 45000, rate: 19 },
    { min: 45000, max: 120000, rate: 32.5 },
  ];
  
  const tax = calculateTaxWithBrackets(60000, brackets);
  // Bracket 1: 0
  // Bracket 2: (45000 - 18200) * 0.19 = 5092
  // Bracket 3: (60000 - 45000) * 0.325 = 4875
  // Total: 9967
  assertEquals(Math.abs(tax - 9967) < 1, true);
});

Deno.test("calculateTaxWithBrackets - top bracket with no max", () => {
  const brackets: TaxBracket[] = [
    { min: 0, max: 18200, rate: 0 },
    { min: 18200, max: 45000, rate: 19 },
    { min: 45000, max: null, rate: 45 },
  ];
  
  const tax = calculateTaxWithBrackets(200000, brackets);
  // Bracket 1: 0
  // Bracket 2: (45000 - 18200) * 0.19 = 5092
  // Bracket 3: (200000 - 45000) * 0.45 = 69750
  // Total: 74842
  assertEquals(Math.abs(tax - 74842) < 1, true);
});

Deno.test("calculateTaxWithBrackets - Australian tax brackets", () => {
  // Test with actual AU brackets
  const tax80k = calculateTaxWithBrackets(80000, DEFAULT_AU_TAX_BRACKETS);
  // Expected: 0 + (45000-18200)*0.19 + (80000-45000)*0.325 = 5092 + 11375 = 16467
  assertEquals(Math.abs(tax80k - 16467) < 1, true);
  
  const tax150k = calculateTaxWithBrackets(150000, DEFAULT_AU_TAX_BRACKETS);
  // Expected: 0 + 5092 + (120000-45000)*0.325 + (150000-120000)*0.37 = 5092 + 24375 + 11100 = 40567
  assertEquals(Math.abs(tax150k - 40567) < 1, true);
});

// ===== Income Processor Tests =====

Deno.test("IncomeProcessor.calculateIncome - monthly interval", () => {
  const params = getTestParameters();
  params.annualSalary = 120000;
  
  const income = IncomeProcessor.calculateIncome(params, "month");
  assertEquals(income, 10000); // 120000 / 12
});

Deno.test("IncomeProcessor.calculateIncome - weekly interval", () => {
  const params = getTestParameters();
  params.annualSalary = 52000;
  
  const income = IncomeProcessor.calculateIncome(params, "week");
  assertEquals(income, 1000); // 52000 / 52
});

Deno.test("IncomeProcessor.calculateTax - flat rate", () => {
  const params = getTestParameters();
  params.annualSalary = 100000;
  params.incomeTaxRate = 25;
  params.taxBrackets = undefined;
  
  const tax = IncomeProcessor.calculateTax(params, "month");
  // Annual tax: 100000 * 0.25 = 25000
  // Monthly: 25000 / 12 = 2083.33
  assertEquals(Math.abs(tax - 2083.33) < 1, true);
});

Deno.test("IncomeProcessor.calculateTax - progressive brackets", () => {
  const params = getTestParameters();
  params.annualSalary = 80000;
  params.taxBrackets = DEFAULT_AU_TAX_BRACKETS;
  
  const monthlyTax = IncomeProcessor.calculateTax(params, "month");
  const annualTax = IncomeProcessor.calculateAnnualTax(params, 80000);
  
  // Monthly should be annual / 12
  assertEquals(Math.abs(monthlyTax - (annualTax / 12)) < 0.01, true);
});

// ===== Expense Processor Tests =====

Deno.test("ExpenseProcessor.calculateExpenses - monthly interval", () => {
  const params = getTestParameters();
  params.monthlyLivingExpenses = 2000;
  params.monthlyRentOrMortgage = 1500;
  
  const expenses = ExpenseProcessor.calculateExpenses(params, "month");
  assertEquals(expenses, 3500); // 2000 + 1500
});

Deno.test("ExpenseProcessor.calculateExpenses - weekly interval", () => {
  const params = getTestParameters();
  params.monthlyLivingExpenses = 2600; // 600/week * 52/12
  params.monthlyRentOrMortgage = 0;
  
  const expenses = ExpenseProcessor.calculateExpenses(params, "week");
  // (2600 * 12) / 52 = 600
  assertEquals(Math.abs(expenses - 600) < 1, true);
});

// ===== Loan Processor Tests =====

Deno.test("LoanProcessor.calculateLoanPayment - basic payment", () => {
  const result = LoanProcessor.calculateLoanPayment(
    100000, // balance
    0, // offset
    0.06, // 6% annual rate
    1000, // payment
    "month",
    false
  );
  
  // Interest for month: 100000 * (1.06^(1/12) - 1) ≈ 487
  // Principal: 1000 - 487 = 513
  // New balance: 100000 - 513 = 99487
  assertEquals(result.interestPaid > 0, true);
  assertEquals(result.principalPaid > 0, true);
  assertEquals(result.newBalance < 100000, true);
  assertEquals(Math.abs(result.newBalance - 99487) < 10, true);
});

Deno.test("LoanProcessor.calculateLoanPayment - with offset account", () => {
  const withoutOffset = LoanProcessor.calculateLoanPayment(
    100000,
    0,
    0.06,
    1000,
    "month",
    false
  );
  
  const withOffset = LoanProcessor.calculateLoanPayment(
    100000,
    20000, // $20k offset
    0.06,
    1000,
    "month",
    true
  );
  
  // With offset, interest should be less
  assertEquals(withOffset.interestPaid < withoutOffset.interestPaid, true);
  
  // Principal paid should be more
  assertEquals(withOffset.principalPaid > withoutOffset.principalPaid, true);
  
  // Interest saved should be positive
  assertEquals(withOffset.interestSaved > 0, true);
});

Deno.test("LoanProcessor.calculateLoanPayment - zero balance", () => {
  const result = LoanProcessor.calculateLoanPayment(
    0,
    0,
    0.06,
    1000,
    "month",
    false
  );
  
  assertEquals(result.newBalance, 0);
  assertEquals(result.interestPaid, 0);
  assertEquals(result.principalPaid, 0);
});

Deno.test("LoanProcessor.calculateLoanPayment - payment exceeds balance", () => {
  const result = LoanProcessor.calculateLoanPayment(
    500, // small balance
    0,
    0.06,
    1000, // large payment
    "month",
    false
  );
  
  // Should pay off completely
  assertEquals(result.newBalance, 0);
  assertEquals(result.principalPaid <= 500, true);
});

// ===== Investment Processor Tests =====

Deno.test("InvestmentProcessor.calculateInvestmentGrowth - with contribution", () => {
  const newBalance = InvestmentProcessor.calculateInvestmentGrowth(
    10000, // balance
    500, // contribution
    0.08, // 8% annual return
    "month"
  );
  
  // Should be more than 10500 due to growth
  assertEquals(newBalance > 10500, true);
  
  // Monthly growth rate: (1.08)^(1/12) - 1 ≈ 0.00643
  // Expected: 10000 * 1.00643 + 500 * 1.00643 ≈ 10567
  assertEquals(Math.abs(newBalance - 10567) < 10, true);
});

Deno.test("InvestmentProcessor.calculateInvestmentGrowth - no contribution", () => {
  const newBalance = InvestmentProcessor.calculateInvestmentGrowth(
    10000,
    0,
    0.08,
    "month"
  );
  
  // Should grow by monthly rate
  assertEquals(newBalance > 10000, true);
  assertEquals(newBalance < 10100, true); // Less than 1% monthly
});

Deno.test("InvestmentProcessor.calculateInvestmentGrowth - negative return", () => {
  const newBalance = InvestmentProcessor.calculateInvestmentGrowth(
    10000,
    0,
    -0.10, // -10% annual
    "month"
  );
  
  // Should decrease
  assertEquals(newBalance < 10000, true);
});

// ===== Retirement Calculator Tests =====

Deno.test("RetirementCalculator.calculateSafeWithdrawal - 4% rule", () => {
  const withdrawal = RetirementCalculator.calculateSafeWithdrawal(
    500000, // investments
    0, // super (below preservation age)
    55 // age
  );
  
  // 4% of 500000 = 20000
  assertEquals(withdrawal, 20000);
});

Deno.test("RetirementCalculator.calculateSafeWithdrawal - includes super at preservation age", () => {
  const withdrawal = RetirementCalculator.calculateSafeWithdrawal(
    500000, // investments
    300000, // super
    65 // age >= 60
  );
  
  // 4% of (500000 + 300000) = 32000
  assertEquals(withdrawal, 32000);
});

Deno.test("RetirementCalculator.findRetirementDate - achievable retirement", () => {
  const states: FinancialState[] = [];
  const startDate = new Date("2024-01-01");
  
  // Create states with growing wealth over 10 years (120 months)
  for (let i = 0; i < 120; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    
    states.push({
      date,
      cash: 1000,
      investments: 500000 + (i * 10000), // Growing significantly
      superannuation: 500000 + (i * 8000), // Growing significantly
      loanBalance: 0,
      offsetBalance: 0,
      netWorth: 1000000 + (i * 18000),
      cashFlow: 1000,
      taxPaid: 500,
      interestSaved: 0,
    });
  }
  
  const result = RetirementCalculator.findRetirementDate(
    states,
    40000, // desired income (4% of 1M = 40k)
    55, // current age
    60 // retirement age (5 years = 60 months)
  );
  
  assertExists(result.date);
  assertExists(result.age);
  assertEquals(result.age! >= 60, true);
});

Deno.test("RetirementCalculator.findRetirementDate - not achievable", () => {
  const states: FinancialState[] = [];
  const startDate = new Date("2024-01-01");
  
  // Create states with insufficient wealth
  for (let i = 0; i < 120; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    
    states.push({
      date,
      cash: 1000,
      investments: 10000, // Too low
      superannuation: 20000, // Too low
      loanBalance: 0,
      offsetBalance: 0,
      netWorth: 31000,
      cashFlow: 100,
      taxPaid: 500,
      interestSaved: 0,
    });
  }
  
  const result = RetirementCalculator.findRetirementDate(
    states,
    100000, // high desired income
    30,
    35
  );
  
  assertEquals(result.date, null);
  assertEquals(result.age, null);
});
