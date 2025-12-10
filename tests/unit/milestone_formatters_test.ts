/**
 * Unit tests for milestone formatting and display utilities
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  formatMilestone,
  formatMilestones,
  formatMilestoneDate,
  formatFinancialImpact,
  sortMilestonesByDate,
  filterMilestonesByCategory,
  filterMilestonesByType,
  filterMilestonesByDateRange,
  groupMilestonesByCategory,
  groupMilestonesByYear,
} from "../../lib/milestone_formatters.ts";
import type {
  LoanPayoffMilestone,
  OffsetCompletionMilestone,
  RetirementMilestone,
  ParameterTransitionMilestone,
} from "../../types/milestones.ts";

// Test data
const loanPayoffMilestone: LoanPayoffMilestone = {
  id: "loan-1-payoff",
  type: "loan_payoff",
  category: "debt",
  date: new Date("2030-06-15"),
  title: "Home Loan Paid Off",
  description: "Your home loan has been completely paid off!",
  financialImpact: 45000,
  loanId: "home-loan-1",
  loanName: "Home Loan",
  finalPaymentAmount: 2500,
  totalInterestPaid: 45000,
  monthsToPayoff: 240,
};

const offsetMilestone: OffsetCompletionMilestone = {
  id: "offset-complete",
  type: "offset_completion",
  category: "debt",
  date: new Date("2028-03-10"),
  title: "Offset Account Complete",
  description: "Offset account balance now equals loan balance",
  financialImpact: 8000,
  loanId: "home-loan-1",
  offsetAmount: 150000,
  loanBalance: 150000,
  interestSavingsRate: 5.5,
};

const retirementMilestone: RetirementMilestone = {
  id: "retirement-eligible",
  type: "retirement_eligibility",
  category: "retirement",
  date: new Date("2035-03-01"),
  title: "Retirement Eligible",
  description: "You have sufficient assets to retire comfortably!",
  financialImpact: 150000,
  requiredAssets: 800000,
  actualAssets: 950000,
  monthlyWithdrawalCapacity: 3800,
  yearsEarlierThanTarget: 2.5,
};

const parameterMilestone: ParameterTransitionMilestone = {
  id: "salary-increase",
  type: "parameter_transition",
  category: "transition",
  date: new Date("2029-01-01"),
  title: "Salary Increase",
  description: "Annual income increased due to promotion",
  financialImpact: 15000,
  transitionId: "promotion-2029",
  parameterChanges: {
    annualIncome: { from: 80000, to: 95000 },
    investmentContribution: { from: 500, to: 750 },
  },
  impactSummary: "Increased income and investment contributions",
};

Deno.test("formatMilestoneDate - formats dates correctly", () => {
  const date = new Date("2030-06-15");
  const formatted = formatMilestoneDate(date);
  assertEquals(formatted, "15 June 2030");
});

Deno.test("formatFinancialImpact - handles positive values", () => {
  const result = formatFinancialImpact(45000);
  assertEquals(result.text, "+$45,000.00");
  assertEquals(result.className, "text-green-600 font-semibold");
});

Deno.test("formatFinancialImpact - handles negative values", () => {
  const result = formatFinancialImpact(-5000);
  assertEquals(result.text, "-$5,000.00");
  assertEquals(result.className, "text-red-600 font-semibold");
});

Deno.test("formatFinancialImpact - handles undefined values", () => {
  const result = formatFinancialImpact(undefined);
  assertEquals(result.text, "No financial impact");
  assertEquals(result.className, "text-gray-500");
});

Deno.test("formatFinancialImpact - handles zero values", () => {
  const result = formatFinancialImpact(0);
  assertEquals(result.text, "$0.00");
  assertEquals(result.className, "text-gray-600");
});

Deno.test("formatMilestone - formats loan payoff milestone correctly", () => {
  const formatted = formatMilestone(loanPayoffMilestone);
  
  assertEquals(formatted.id, "loan-1-payoff");
  assertEquals(formatted.type, "loan_payoff");
  assertEquals(formatted.category, "debt");
  assertEquals(formatted.date, "15 June 2030");
  assertEquals(formatted.title, "Home Loan Paid Off");
  assertEquals(formatted.primaryDetail, "Final payment: $2,500.00");
  assertEquals(formatted.icon, "💳");
  assertEquals(formatted.badgeColor, "bg-green-100 text-green-800");
  assertEquals(formatted.secondaryDetails.length, 3);
  assertEquals(formatted.secondaryDetails[0], "Total interest paid: $45,000.00");
  assertEquals(formatted.secondaryDetails[1], "Loan duration: 240 months");
  assertEquals(formatted.secondaryDetails[2], "Loan: Home Loan");
});

Deno.test("formatMilestone - formats offset completion milestone correctly", () => {
  const formatted = formatMilestone(offsetMilestone);
  
  assertEquals(formatted.id, "offset-complete");
  assertEquals(formatted.type, "offset_completion");
  assertEquals(formatted.category, "debt");
  assertEquals(formatted.primaryDetail, "Offset: $150,000.00");
  assertEquals(formatted.icon, "🏦");
  assertEquals(formatted.badgeColor, "bg-blue-100 text-blue-800");
  assertEquals(formatted.secondaryDetails.length, 3);
  assertEquals(formatted.secondaryDetails[0], "Loan balance: $150,000.00");
  assertEquals(formatted.secondaryDetails[1], "Interest rate: 5.50%");
  assertEquals(formatted.secondaryDetails[2], "Annual savings: $8,250.00");
});

Deno.test("formatMilestone - formats retirement milestone correctly", () => {
  const formatted = formatMilestone(retirementMilestone);
  
  assertEquals(formatted.id, "retirement-eligible");
  assertEquals(formatted.type, "retirement_eligibility");
  assertEquals(formatted.category, "retirement");
  assertEquals(formatted.primaryDetail, "Monthly capacity: $3,800.00");
  assertEquals(formatted.icon, "🏖️");
  assertEquals(formatted.badgeColor, "bg-purple-100 text-purple-800");
  assertEquals(formatted.secondaryDetails.length, 4);
  assertEquals(formatted.secondaryDetails[3], "2.5 years earlier than target");
});

Deno.test("formatMilestone - formats parameter transition milestone correctly", () => {
  const formatted = formatMilestone(parameterMilestone);
  
  assertEquals(formatted.id, "salary-increase");
  assertEquals(formatted.type, "parameter_transition");
  assertEquals(formatted.category, "transition");
  assertEquals(formatted.primaryDetail, "Increased income and investment contributions");
  assertEquals(formatted.icon, "📊");
  assertEquals(formatted.badgeColor, "bg-yellow-100 text-yellow-800");
  assertEquals(formatted.secondaryDetails.length, 2);
  assertEquals(formatted.secondaryDetails[0], "Annual Income: $80,000.00 → $95,000.00");
  assertEquals(formatted.secondaryDetails[1], "Investment Contribution: $500.00 → $750.00");
});

Deno.test("formatMilestones - formats multiple milestones", () => {
  const milestones = [loanPayoffMilestone, retirementMilestone];
  const formatted = formatMilestones(milestones);
  
  assertEquals(formatted.length, 2);
  assertEquals(formatted[0].id, "loan-1-payoff");
  assertEquals(formatted[1].id, "retirement-eligible");
});

Deno.test("sortMilestonesByDate - sorts milestones chronologically", () => {
  const milestones = [retirementMilestone, offsetMilestone, loanPayoffMilestone, parameterMilestone];
  const sorted = sortMilestonesByDate(milestones);
  
  assertEquals(sorted[0].id, "offset-complete"); // 2028
  assertEquals(sorted[1].id, "salary-increase"); // 2029
  assertEquals(sorted[2].id, "loan-1-payoff"); // 2030
  assertEquals(sorted[3].id, "retirement-eligible"); // 2035
});

Deno.test("filterMilestonesByCategory - filters by debt category", () => {
  const milestones = [loanPayoffMilestone, offsetMilestone, retirementMilestone, parameterMilestone];
  const debtMilestones = filterMilestonesByCategory(milestones, "debt");
  
  assertEquals(debtMilestones.length, 2);
  assertEquals(debtMilestones[0].id, "loan-1-payoff");
  assertEquals(debtMilestones[1].id, "offset-complete");
});

Deno.test("filterMilestonesByType - filters by loan payoff type", () => {
  const milestones = [loanPayoffMilestone, offsetMilestone, retirementMilestone];
  const loanPayoffs = filterMilestonesByType(milestones, "loan_payoff");
  
  assertEquals(loanPayoffs.length, 1);
  assertEquals(loanPayoffs[0].id, "loan-1-payoff");
});

Deno.test("filterMilestonesByDateRange - filters by date range", () => {
  const milestones = [loanPayoffMilestone, offsetMilestone, retirementMilestone, parameterMilestone];
  const startDate = new Date("2029-01-01");
  const endDate = new Date("2030-12-31");
  const filtered = filterMilestonesByDateRange(milestones, startDate, endDate);
  
  assertEquals(filtered.length, 2);
  assertEquals(filtered[0].id, "loan-1-payoff");
  assertEquals(filtered[1].id, "salary-increase");
});

Deno.test("groupMilestonesByCategory - groups milestones by category", () => {
  const milestones = [loanPayoffMilestone, offsetMilestone, retirementMilestone, parameterMilestone];
  const grouped = groupMilestonesByCategory(milestones);
  
  assertEquals(grouped.debt.length, 2);
  assertEquals(grouped.retirement.length, 1);
  assertEquals(grouped.transition.length, 1);
  assertEquals(grouped.investment.length, 0);
});

Deno.test("groupMilestonesByYear - groups milestones by year", () => {
  const milestones = [loanPayoffMilestone, offsetMilestone, retirementMilestone, parameterMilestone];
  const grouped = groupMilestonesByYear(milestones);
  
  assertEquals(grouped[2028].length, 1);
  assertEquals(grouped[2029].length, 1);
  assertEquals(grouped[2030].length, 1);
  assertEquals(grouped[2035].length, 1);
  assertEquals(grouped[2028][0].id, "offset-complete");
});