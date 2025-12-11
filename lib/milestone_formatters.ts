/**
 * Milestone formatting and display utilities
 * Provides consistent formatting for all milestone types and financial impacts
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */

import type {
  Milestone,
  LoanPayoffMilestone,
  OffsetCompletionMilestone,
  RetirementMilestone,
  ParameterTransitionMilestone,
  ExpenseExpirationMilestone,
  MilestoneCategory,
  MilestoneType,
} from "../types/milestones.ts";
import { formatCurrency } from "./result_utils.ts";

/**
 * Formats a date for milestone display
 * @param date Date to format
 * @returns Formatted date string
 */
export function formatMilestoneDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats financial impact with appropriate highlighting
 * @param impact Financial impact amount (positive for gains, negative for costs)
 * @param showSign Whether to show + sign for positive values
 * @returns Formatted financial impact string with appropriate styling class
 */
export function formatFinancialImpact(
  impact: number | undefined,
  showSign: boolean = true,
): { text: string; className: string } {
  if (impact === undefined) {
    return { text: "No financial impact", className: "text-gray-500" };
  }

  const isPositive = impact > 0;
  const isNegative = impact < 0;
  const sign = showSign && isPositive ? "+" : "";
  
  return {
    text: `${sign}${formatCurrency(impact)}`,
    className: isPositive 
      ? "text-green-600 font-semibold" 
      : isNegative 
        ? "text-red-600 font-semibold"
        : "text-gray-600",
  };
}

/**
 * Formats a loan payoff milestone for display
 * @param milestone Loan payoff milestone
 * @returns Formatted milestone display object
 */
export function formatLoanPayoffMilestone(milestone: LoanPayoffMilestone): MilestoneDisplay {
  const impact = formatFinancialImpact(milestone.totalInterestPaid, false);
  
  return {
    id: milestone.id,
    type: milestone.type,
    category: milestone.category,
    date: formatMilestoneDate(milestone.date),
    title: milestone.title,
    description: milestone.description,
    primaryDetail: `Final payment: ${formatCurrency(milestone.finalPaymentAmount)}`,
    secondaryDetails: [
      `Total interest paid: ${impact.text}`,
      `Loan duration: ${milestone.monthsToPayoff} months`,
      `Loan: ${milestone.loanName}`,
    ],
    financialImpact: impact,
    icon: "💳",
    badgeColor: "bg-green-100 text-green-800",
  };
}

/**
 * Formats an offset completion milestone for display
 * @param milestone Offset completion milestone
 * @returns Formatted milestone display object
 */
export function formatOffsetCompletionMilestone(milestone: OffsetCompletionMilestone): MilestoneDisplay {
  const annualSavings = milestone.loanBalance * (milestone.interestSavingsRate / 100);
  const impact = formatFinancialImpact(annualSavings);
  
  return {
    id: milestone.id,
    type: milestone.type,
    category: milestone.category,
    date: formatMilestoneDate(milestone.date),
    title: milestone.title,
    description: milestone.description,
    primaryDetail: `Offset: ${formatCurrency(milestone.offsetAmount)}`,
    secondaryDetails: [
      `Loan balance: ${formatCurrency(milestone.loanBalance)}`,
      `Interest rate: ${milestone.interestSavingsRate.toFixed(2)}%`,
      `Annual savings: ${formatCurrency(annualSavings)}`,
    ],
    financialImpact: impact,
    icon: "🏦",
    badgeColor: "bg-blue-100 text-blue-800",
  };
}

/**
 * Formats a retirement milestone for display
 * @param milestone Retirement milestone
 * @returns Formatted milestone display object
 */
export function formatRetirementMilestone(milestone: RetirementMilestone): MilestoneDisplay {
  const surplus = milestone.actualAssets - milestone.requiredAssets;
  const impact = formatFinancialImpact(surplus);
  
  const secondaryDetails = [
    `Required assets: ${formatCurrency(milestone.requiredAssets)}`,
    `Available assets: ${formatCurrency(milestone.actualAssets)}`,
    `Monthly capacity: ${formatCurrency(milestone.monthlyWithdrawalCapacity)}`,
  ];

  if (milestone.yearsEarlierThanTarget) {
    secondaryDetails.push(
      `${milestone.yearsEarlierThanTarget.toFixed(1)} years earlier than target`
    );
  }
  
  return {
    id: milestone.id,
    type: milestone.type,
    category: milestone.category,
    date: formatMilestoneDate(milestone.date),
    title: milestone.title,
    description: milestone.description,
    primaryDetail: `Monthly capacity: ${formatCurrency(milestone.monthlyWithdrawalCapacity)}`,
    secondaryDetails,
    financialImpact: impact,
    icon: "🏖️",
    badgeColor: "bg-purple-100 text-purple-800",
  };
}

/**
 * Formats a parameter transition milestone for display
 * @param milestone Parameter transition milestone
 * @returns Formatted milestone display object
 */
export function formatParameterTransitionMilestone(milestone: ParameterTransitionMilestone): MilestoneDisplay {
  const impact = formatFinancialImpact(milestone.financialImpact);
  
  const changes = Object.entries(milestone.parameterChanges).map(([param, change]) => {
    const fromValue = typeof change.from === 'number' ? formatCurrency(change.from) : String(change.from);
    const toValue = typeof change.to === 'number' ? formatCurrency(change.to) : String(change.to);
    return `${formatParameterName(param)}: ${fromValue} → ${toValue}`;
  });
  
  return {
    id: milestone.id,
    type: milestone.type,
    category: milestone.category,
    date: formatMilestoneDate(milestone.date),
    title: milestone.title,
    description: milestone.description,
    primaryDetail: milestone.impactSummary,
    secondaryDetails: changes,
    financialImpact: impact,
    icon: "📊",
    badgeColor: "bg-yellow-100 text-yellow-800",
  };
}

/**
 * Formats an expense expiration milestone for display
 * @param milestone Expense expiration milestone
 * @returns Formatted milestone display object
 */
export function formatExpenseExpirationMilestone(milestone: ExpenseExpirationMilestone): MilestoneDisplay {
  const impact = formatFinancialImpact(milestone.annualSavings);
  
  return {
    id: milestone.id,
    type: milestone.type,
    category: milestone.category,
    date: formatMilestoneDate(milestone.date),
    title: milestone.title,
    description: milestone.description,
    primaryDetail: `Saves ${formatCurrency(milestone.monthlySavings)}/month`,
    secondaryDetails: [
      `Expense: ${milestone.expenseName}`,
      `Category: ${milestone.expenseCategory}`,
      `Monthly savings: ${formatCurrency(milestone.monthlySavings)}`,
      `Annual savings: ${formatCurrency(milestone.annualSavings)}`,
      `End date: ${formatMilestoneDate(milestone.date)}`,
    ],
    financialImpact: impact,
    icon: "💸",
    badgeColor: "bg-orange-100 text-orange-800",
  };
}

/**
 * Formats any milestone for display using the appropriate formatter
 * @param milestone Milestone to format
 * @returns Formatted milestone display object
 */
export function formatMilestone(milestone: Milestone): MilestoneDisplay {
  switch (milestone.type) {
    case 'loan_payoff':
      return formatLoanPayoffMilestone(milestone as LoanPayoffMilestone);
    case 'offset_completion':
      return formatOffsetCompletionMilestone(milestone as OffsetCompletionMilestone);
    case 'retirement_eligibility':
      return formatRetirementMilestone(milestone as RetirementMilestone);
    case 'parameter_transition':
      return formatParameterTransitionMilestone(milestone as ParameterTransitionMilestone);
    case 'expense_expiration':
      return formatExpenseExpirationMilestone(milestone as ExpenseExpirationMilestone);
    default:
      // Fallback for unknown milestone types
      const baseMilestone = milestone as Milestone;
      const impact = formatFinancialImpact(baseMilestone.financialImpact);
      return {
        id: baseMilestone.id,
        type: baseMilestone.type,
        category: baseMilestone.category,
        date: formatMilestoneDate(baseMilestone.date),
        title: baseMilestone.title,
        description: baseMilestone.description,
        primaryDetail: baseMilestone.description,
        secondaryDetails: [],
        financialImpact: impact,
        icon: "📅",
        badgeColor: "bg-gray-100 text-gray-800",
      };
  }
}

/**
 * Formats multiple milestones for display
 * @param milestones Array of milestones to format
 * @returns Array of formatted milestone display objects
 */
export function formatMilestones(milestones: Milestone[]): MilestoneDisplay[] {
  return milestones.map(formatMilestone);
}

/**
 * Sorts milestones by date (earliest first)
 * @param milestones Array of milestones to sort
 * @returns Sorted array of milestones
 */
export function sortMilestonesByDate(milestones: Milestone[]): Milestone[] {
  return [...milestones].sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Filters milestones by category
 * @param milestones Array of milestones to filter
 * @param category Category to filter by
 * @returns Filtered array of milestones
 */
export function filterMilestonesByCategory(
  milestones: Milestone[],
  category: MilestoneCategory,
): Milestone[] {
  return milestones.filter(milestone => milestone.category === category);
}

/**
 * Filters milestones by type
 * @param milestones Array of milestones to filter
 * @param type Type to filter by
 * @returns Filtered array of milestones
 */
export function filterMilestonesByType(
  milestones: Milestone[],
  type: MilestoneType,
): Milestone[] {
  return milestones.filter(milestone => milestone.type === type);
}

/**
 * Filters milestones by date range
 * @param milestones Array of milestones to filter
 * @param startDate Start date (inclusive)
 * @param endDate End date (inclusive)
 * @returns Filtered array of milestones
 */
export function filterMilestonesByDateRange(
  milestones: Milestone[],
  startDate: Date,
  endDate: Date,
): Milestone[] {
  return milestones.filter(milestone => 
    milestone.date >= startDate && milestone.date <= endDate
  );
}

/**
 * Groups milestones by category
 * @param milestones Array of milestones to group
 * @returns Object with milestones grouped by category
 */
export function groupMilestonesByCategory(
  milestones: Milestone[],
): Record<MilestoneCategory, Milestone[]> {
  const groups: Record<MilestoneCategory, Milestone[]> = {
    debt: [],
    investment: [],
    retirement: [],
    transition: [],
    expense: [],
  };

  milestones.forEach(milestone => {
    groups[milestone.category].push(milestone);
  });

  return groups;
}

/**
 * Groups milestones by year
 * @param milestones Array of milestones to group
 * @returns Object with milestones grouped by year
 */
export function groupMilestonesByYear(
  milestones: Milestone[],
): Record<number, Milestone[]> {
  const groups: Record<number, Milestone[]> = {};

  milestones.forEach(milestone => {
    const year = milestone.date.getFullYear();
    if (!groups[year]) {
      groups[year] = [];
    }
    groups[year].push(milestone);
  });

  return groups;
}

/**
 * Formats a parameter name for display
 * @param paramName Parameter name to format
 * @returns Human-readable parameter name
 */
function formatParameterName(paramName: string): string {
  // Convert camelCase to readable format
  const formatted = paramName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
  
  // Handle specific parameter names
  const paramMap: Record<string, string> = {
    'Annual Income': 'Annual Income',
    'Monthly Expenses': 'Monthly Expenses',
    'Investment Contribution': 'Investment Contribution',
    'Retirement Age': 'Retirement Age',
    'Desired Annual Retirement Income': 'Desired Retirement Income',
    'Investment Return Rate': 'Investment Return Rate',
  };

  return paramMap[formatted] || formatted;
}

/**
 * Interface for formatted milestone display data
 */
export interface MilestoneDisplay {
  id: string;
  type: MilestoneType;
  category: MilestoneCategory;
  date: string;
  title: string;
  description: string;
  primaryDetail: string;
  secondaryDetails: string[];
  financialImpact: {
    text: string;
    className: string;
  };
  icon: string;
  badgeColor: string;
}

/**
 * Configuration for milestone display options
 */
export interface MilestoneDisplayConfig {
  showFinancialImpact: boolean;
  showSecondaryDetails: boolean;
  showIcons: boolean;
  showBadges: boolean;
  dateFormat: 'short' | 'long' | 'numeric';
}

/**
 * Default display configuration
 */
export const defaultDisplayConfig: MilestoneDisplayConfig = {
  showFinancialImpact: true,
  showSecondaryDetails: true,
  showIcons: true,
  showBadges: true,
  dateFormat: 'short',
};