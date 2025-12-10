/**
 * Unit tests for MilestoneDetector
 * Tests core milestone detection functionality
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { MilestoneDetector } from "../../lib/milestone_detector.ts";
import type { FinancialState, UserParameters } from "../../types/financial.ts";

Deno.test("MilestoneDetector - Basic instantiation", () => {
  const detector = new MilestoneDetector();
  assertExists(detector);
  
  const config = detector.getConfig();
  assertEquals(config.detectLoanPayoffs, true);
  assertEquals(config.detectOffsetCompletion, true);
  assertEquals(config.detectRetirementEligibility, true);
  assertEquals(config.detectParameterTransitions, true);
});

Deno.test("MilestoneDetector - Loan payoff detection", () => {
  const detector = new MilestoneDetector();
  
  // Create test data with a loan being paid off
  const states: FinancialState[] = [
    {
      date: new Date('2024-01-01'),
      cash: 1000,
      investments: 50000,
      superannuation: 100000,
      loanBalance: 10000, // Starting with $10k loan
      offsetBalance: 0,
      netWorth: 141000,
      cashFlow: 1000,
      taxPaid: 500,
      expenses: 2000,
      interestSaved: 0,
    },
    {
      date: new Date('2024-02-01'),
      cash: 1000,
      investments: 50000,
      superannuation: 100000,
      loanBalance: 5000, // Loan reduced to $5k
      offsetBalance: 0,
      netWorth: 146000,
      cashFlow: 1000,
      taxPaid: 500,
      expenses: 2000,
      interestSaved: 0,
    },
    {
      date: new Date('2024-03-01'),
      cash: 1000,
      investments: 50000,
      superannuation: 100000,
      loanBalance: 0, // Loan paid off!
      offsetBalance: 0,
      netWorth: 151000,
      cashFlow: 1000,
      taxPaid: 500,
      expenses: 2000,
      interestSaved: 0,
    },
  ];

  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: 'monthly',
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 10000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 500,
    loanPaymentFrequency: 'monthly',
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 1000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date('2024-01-01'),
  };

  const result = detector.detectMilestones(states, params);
  
  assertEquals(result.errors.length, 0);
  assertEquals(result.milestones.length, 1);
  assertEquals(result.milestones[0].type, 'loan_payoff');
  assertEquals(result.milestones[0].title, 'Primary Loan Paid Off');
});

Deno.test("MilestoneDetector - Offset completion detection", () => {
  const detector = new MilestoneDetector({ minimumImpactThreshold: 100 }); // Lower threshold for test
  
  // Create test data with offset completing
  const states: FinancialState[] = [
    {
      date: new Date('2024-01-01'),
      cash: 1000,
      investments: 50000,
      superannuation: 100000,
      loanBalance: 10000,
      offsetBalance: 5000, // Offset at $5k
      netWorth: 146000,
      cashFlow: 1000,
      taxPaid: 500,
      expenses: 2000,
      interestSaved: 100,
    },
    {
      date: new Date('2024-02-01'),
      cash: 1000,
      investments: 50000,
      superannuation: 100000,
      loanBalance: 9500,
      offsetBalance: 9500, // Offset now equals loan balance!
      netWorth: 151000,
      cashFlow: 1000,
      taxPaid: 500,
      expenses: 2000,
      interestSaved: 200,
    },
  ];

  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: 'monthly',
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 10000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 500,
    loanPaymentFrequency: 'monthly',
    useOffsetAccount: true,
    currentOffsetBalance: 5000,
    monthlyInvestmentContribution: 1000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date('2024-01-01'),
  };

  const result = detector.detectMilestones(states, params);
  

  
  assertEquals(result.errors.length, 0);
  assertEquals(result.milestones.length, 1);
  assertEquals(result.milestones[0].type, 'offset_completion');
  assertEquals(result.milestones[0].title, 'Primary Loan Offset Complete');
});

Deno.test("MilestoneDetector - Empty states handling", () => {
  const detector = new MilestoneDetector();
  
  const params: UserParameters = {
    annualSalary: 80000,
    salaryFrequency: 'monthly',
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 10000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 500,
    loanPaymentFrequency: 'monthly',
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 1000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 50000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 35,
    startDate: new Date('2024-01-01'),
  };

  const result = detector.detectMilestones([], params);
  
  assertEquals(result.errors.length, 0);
  assertEquals(result.milestones.length, 0);
});