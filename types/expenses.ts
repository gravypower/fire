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
  
  /** Optional start date (if not set, starts from simulation start) */
  startDate?: Date;
  
  /** Optional end date (if not set, continues indefinitely) */
  endDate?: Date;
  
  /** Whether this is a one-off expense (occurs only once) */
  isOneOff?: boolean;
  
  /** Date when one-off expense occurs (required if isOneOff is true) */
  oneOffDate?: Date;
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
  | "education"
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
  // Housing
  { name: "Rent/Mortgage", category: "housing", frequency: "monthly" },
  { name: "Property Rates", category: "housing", frequency: "yearly" },
  { name: "Strata/Body Corporate", category: "housing", frequency: "monthly" },
  { name: "Home Maintenance", category: "housing", frequency: "monthly" },
  
  // Utilities
  { name: "Electricity", category: "utilities", frequency: "monthly" },
  { name: "Water", category: "utilities", frequency: "monthly" },
  { name: "Internet", category: "utilities", frequency: "monthly" },
  { name: "Gas", category: "utilities", frequency: "monthly" },
  { name: "Phone Bill", category: "utilities", frequency: "monthly" },
  
  // Food & Dining
  { name: "Groceries", category: "food", frequency: "weekly" },
  { name: "Dining Out", category: "food", frequency: "weekly" },
  { name: "Coffee/Takeaway", category: "food", frequency: "weekly" },
  
  // Transportation
  { name: "Car Payment", category: "transportation", frequency: "monthly" },
  { name: "Fuel", category: "transportation", frequency: "weekly" },
  { name: "Public Transport", category: "transportation", frequency: "weekly" },
  { name: "Car Registration", category: "transportation", frequency: "yearly" },
  { name: "Car Servicing", category: "transportation", frequency: "yearly" },
  { name: "Parking", category: "transportation", frequency: "monthly" },
  
  // Insurance
  { name: "Car Insurance", category: "insurance", frequency: "yearly" },
  { name: "Health Insurance", category: "insurance", frequency: "monthly" },
  { name: "Home Insurance", category: "insurance", frequency: "yearly" },
  { name: "Life Insurance", category: "insurance", frequency: "yearly" },
  { name: "Income Protection", category: "insurance", frequency: "yearly" },
  
  // Entertainment
  { name: "Streaming Services", category: "entertainment", frequency: "monthly" },
  { name: "Gym Membership", category: "entertainment", frequency: "monthly" },
  { name: "Movies/Events", category: "entertainment", frequency: "monthly" },
  { name: "Hobbies", category: "entertainment", frequency: "monthly" },
  { name: "Books/Magazines", category: "entertainment", frequency: "monthly" },
  
  // Healthcare
  { name: "Doctor Visits", category: "healthcare", frequency: "monthly" },
  { name: "Dental", category: "healthcare", frequency: "yearly" },
  { name: "Optometrist", category: "healthcare", frequency: "yearly" },
  { name: "Medications", category: "healthcare", frequency: "monthly" },
  { name: "Physiotherapy", category: "healthcare", frequency: "monthly" },
  
  // Personal Care
  { name: "Haircuts", category: "personal", frequency: "monthly" },
  { name: "Clothing", category: "personal", frequency: "monthly" },
  { name: "Personal Care Items", category: "personal", frequency: "monthly" },
  
  // Education
  { name: "School Fees", category: "education", frequency: "yearly" },
  { name: "University Fees", category: "education", frequency: "yearly" },
  { name: "Textbooks", category: "education", frequency: "yearly" },
  { name: "Online Courses", category: "education", frequency: "monthly" },
  { name: "Professional Development", category: "education", frequency: "yearly" },
  { name: "Tutoring", category: "education", frequency: "weekly" },
  { name: "School Supplies", category: "education", frequency: "yearly" },
  { name: "Childcare", category: "education", frequency: "weekly" },
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
  education: { label: "Education", icon: "🎓", color: "teal" },
  other: { label: "Other", icon: "📦", color: "gray" },
};
