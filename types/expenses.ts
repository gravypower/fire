/**
 * Expense tracking types
 * Supports individual expense items with different frequencies
 */

import type { PaymentFrequency } from "./financial.ts";

/**
 * Individual expense item
 */
export interface ExpenseItem {
  /** Unique identifier */
  id: string;
  
  /** Name/description of the expense */
  name: string;
  
  /** Amount per payment period */
  amount: number;
  
  /** How often this expense occurs */
  frequency: PaymentFrequency;
  
  /** Category for grouping */
  category: ExpenseCategory;
  
  /** Whether this expense is active */
  enabled: boolean;
}

/**
 * Expense categories for organization
 */
export type ExpenseCategory =
  | "housing"
  | "utilities"
  | "food"
  | "transportation"
  | "insurance"
  | "entertainment"
  | "healthcare"
  | "personal"
  | "other";

/**
 * Expense summary by category
 */
export interface ExpenseSummary {
  category: ExpenseCategory;
  monthlyTotal: number;
  items: ExpenseItem[];
}

/**
 * Default expense templates
 */
export const EXPENSE_TEMPLATES: Partial<ExpenseItem>[] = [
  { name: "Rent/Mortgage", category: "housing", frequency: "monthly" },
  { name: "Electricity", category: "utilities", frequency: "monthly" },
  { name: "Water", category: "utilities", frequency: "monthly" },
  { name: "Internet", category: "utilities", frequency: "monthly" },
  { name: "Gas", category: "utilities", frequency: "monthly" },
  { name: "Groceries", category: "food", frequency: "weekly" },
  { name: "Dining Out", category: "food", frequency: "weekly" },
  { name: "Car Payment", category: "transportation", frequency: "monthly" },
  { name: "Fuel", category: "transportation", frequency: "weekly" },
  { name: "Public Transport", category: "transportation", frequency: "weekly" },
  { name: "Car Insurance", category: "insurance", frequency: "monthly" },
  { name: "Health Insurance", category: "insurance", frequency: "monthly" },
  { name: "Home Insurance", category: "insurance", frequency: "monthly" },
  { name: "Streaming Services", category: "entertainment", frequency: "monthly" },
  { name: "Gym Membership", category: "entertainment", frequency: "monthly" },
  { name: "Phone Bill", category: "utilities", frequency: "monthly" },
];

/**
 * Category display information
 */
export const CATEGORY_INFO: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
  housing: { label: "Housing", icon: "🏠", color: "blue" },
  utilities: { label: "Utilities", icon: "⚡", color: "yellow" },
  food: { label: "Food & Dining", icon: "🍽️", color: "green" },
  transportation: { label: "Transportation", icon: "🚗", color: "purple" },
  insurance: { label: "Insurance", icon: "🛡️", color: "indigo" },
  entertainment: { label: "Entertainment", icon: "🎬", color: "pink" },
  healthcare: { label: "Healthcare", icon: "⚕️", color: "red" },
  personal: { label: "Personal Care", icon: "💇", color: "orange" },
  other: { label: "Other", icon: "📦", color: "gray" },
};
