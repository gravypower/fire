# Expense Manager Integration Guide

## Overview
The ExpenseManagerIsland component provides a user-friendly interface for managing individual expense items with different frequencies. This guide shows how to integrate it into your application.

## Quick Integration

### 1. Import the Component

```typescript
import ExpenseManagerIsland from "../islands/ExpenseManagerIsland.tsx";
import type { ExpenseItem } from "../types/expenses.ts";
```

### 2. Add to Your Configuration State

```typescript
// In your main island or page component
const [config, setConfig] = useState<SimulationConfiguration>({
  baseParameters: {
    // ... other parameters
    expenseItems: [], // Add this field
  },
  transitions: [],
});
```

### 3. Handle Expense Changes

```typescript
function handleExpensesChange(expenses: ExpenseItem[]) {
  setConfig({
    ...config,
    baseParameters: {
      ...config.baseParameters,
      expenseItems: expenses,
    },
  });
}
```

### 4. Render the Component

```typescript
<ExpenseManagerIsland
  expenses={config.baseParameters.expenseItems || []}
  onExpensesChange={handleExpensesChange}
/>
```

## Full Example Integration

### In MainIsland.tsx or Similar

```typescript
import { useState } from "preact/hooks";
import ExpenseManagerIsland from "../islands/ExpenseManagerIsland.tsx";
import InputIsland from "../islands/InputIsland.tsx";
import TransitionManagerIsland from "../islands/TransitionManagerIsland.tsx";
import type { SimulationConfiguration } from "../types/financial.ts";
import type { ExpenseItem } from "../types/expenses.ts";

export default function MainIsland() {
  const [config, setConfig] = useState<SimulationConfiguration | null>(null);
  const [showExpenseManager, setShowExpenseManager] = useState(false);

  function handleExpensesChange(expenses: ExpenseItem[]) {
    if (!config) return;
    
    setConfig({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        expenseItems: expenses,
      },
    });
  }

  return (
    <div class="container mx-auto p-6">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Inputs */}
        <div class="space-y-6">
          <InputIsland
            config={config}
            onConfigurationChange={setConfig}
          />
          
          {/* Toggle for Expense Manager */}
          <div class="card p-4">
            <button
              onClick={() => setShowExpenseManager(!showExpenseManager)}
              class="btn-secondary w-full"
            >
              {showExpenseManager ? "Hide" : "Show"} Detailed Expenses
            </button>
          </div>
          
          {/* Expense Manager */}
          {showExpenseManager && config && (
            <ExpenseManagerIsland
              expenses={config.baseParameters.expenseItems || []}
              onExpensesChange={handleExpensesChange}
            />
          )}
        </div>

        {/* Right Column - Transitions & Results */}
        <div class="space-y-6">
          {config && (
            <TransitionManagerIsland
              config={config}
              onConfigChange={setConfig}
            />
          )}
        </div>
      </div>
    </div>
  );
}
```

## Migration from Legacy Expenses

### Automatic Migration Helper

```typescript
function migrateLegacyExpenses(params: UserParameters): ExpenseItem[] {
  const items: ExpenseItem[] = [];
  
  // Migrate monthly living expenses
  if (params.monthlyLivingExpenses > 0) {
    items.push({
      id: crypto.randomUUID(),
      name: "Living Expenses",
      amount: params.monthlyLivingExpenses,
      frequency: "monthly",
      category: "other",
      enabled: true,
    });
  }
  
  // Migrate rent/mortgage
  if (params.monthlyRentOrMortgage > 0) {
    items.push({
      id: crypto.randomUUID(),
      name: "Rent/Mortgage",
      amount: params.monthlyRentOrMortgage,
      frequency: "monthly",
      category: "housing",
      enabled: true,
    });
  }
  
  return items;
}

// Usage
if (!config.baseParameters.expenseItems || config.baseParameters.expenseItems.length === 0) {
  const migratedExpenses = migrateLegacyExpenses(config.baseParameters);
  if (migratedExpenses.length > 0) {
    setConfig({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        expenseItems: migratedExpenses,
      },
    });
  }
}
```

## Styling

The ExpenseManagerIsland uses Tailwind CSS classes. Ensure your project has:

```css
/* In your styles.css or global CSS */

/* Button styles */
.btn-primary {
  @apply px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors;
}

.btn-secondary {
  @apply px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors;
}

/* Card styles */
.card {
  @apply bg-white rounded-lg shadow-md;
}

/* Input styles */
.input-field {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500;
}

/* Fade-in animation */
.fade-in {
  animation: fadeIn 0.2s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

## Features Showcase

### 1. Add Expense from Template
```typescript
// User clicks "Use Template" button
// Selects "Groceries" template
// Form auto-fills with:
{
  name: "Groceries",
  category: "food",
  frequency: "weekly"
}
// User enters amount and saves
```

### 2. Enable/Disable Expenses
```typescript
// User can temporarily disable expenses without deleting
// Useful for seasonal expenses or temporary changes
// Disabled expenses are grayed out but preserved
```

### 3. Category Grouping
```typescript
// Expenses automatically grouped by category
// Each category shows:
// - Icon (🏠, ⚡, 🍽️, etc.)
// - Category name
// - Monthly total for that category
// - List of items in category
```

### 4. Frequency Conversion
```typescript
// User enters: $200/week for groceries
// System shows: $200/week ($866.67/month)
// Simulation uses correct conversion for any interval
```

## API Reference

### ExpenseManagerIsland Props

```typescript
interface ExpenseManagerIslandProps {
  expenses: ExpenseItem[];           // Current expense items
  onExpensesChange: (expenses: ExpenseItem[]) => void; // Callback when expenses change
}
```

### ExpenseItem Type

```typescript
interface ExpenseItem {
  id: string;                        // Unique identifier
  name: string;                      // Display name
  amount: number;                    // Amount per frequency period
  frequency: PaymentFrequency;       // "weekly" | "fortnightly" | "monthly"
  category: ExpenseCategory;         // Category for grouping
  enabled: boolean;                  // Whether expense is active
}
```

### ExpenseCategory Options

```typescript
type ExpenseCategory =
  | "housing"        // 🏠 Rent, mortgage, property tax
  | "utilities"      // ⚡ Electricity, water, internet
  | "food"           // 🍽️ Groceries, dining out
  | "transportation" // 🚗 Car payment, fuel, public transport
  | "insurance"      // 🛡️ Health, car, home insurance
  | "entertainment"  // 🎬 Streaming, gym, hobbies
  | "healthcare"     // ⚕️ Medical, dental, prescriptions
  | "personal"       // 💇 Personal care, clothing
  | "other";         // 📦 Miscellaneous
```

## Best Practices

### 1. Start with Templates
Encourage users to use templates for common expenses to ensure consistency.

### 2. Regular Review
Add a "Review Expenses" reminder to help users keep their expenses up to date.

### 3. Category Budgets
Consider adding budget limits per category for better financial planning.

### 4. Expense Trends
Track expense changes over time to identify spending patterns.

### 5. Export/Import
Allow users to export their expense list and import it in other scenarios.

## Troubleshooting

### Expenses Not Showing in Simulation
- Check that `expenseItems` is properly set in `UserParameters`
- Verify that at least one expense has `enabled: true`
- Ensure the simulation is re-run after expense changes

### Frequency Conversion Issues
- The system automatically converts all frequencies to the simulation interval
- Weekly: amount × 52 ÷ periods per year
- Fortnightly: amount × 26 ÷ periods per year
- Monthly: amount × 12 ÷ periods per year

### Legacy Expenses Still Used
- If `expenseItems` is undefined or empty, the system falls back to `monthlyLivingExpenses`
- Set `expenseItems` to an empty array `[]` to use only individual items
- Use the migration helper to convert legacy expenses

## Example Expense Sets

### Minimal Setup
```typescript
const expenses: ExpenseItem[] = [
  {
    id: "1",
    name: "Rent",
    amount: 2000,
    frequency: "monthly",
    category: "housing",
    enabled: true,
  },
  {
    id: "2",
    name: "Groceries",
    amount: 150,
    frequency: "weekly",
    category: "food",
    enabled: true,
  },
];
```

### Comprehensive Setup
```typescript
const expenses: ExpenseItem[] = [
  // Housing
  { id: "1", name: "Rent", amount: 2000, frequency: "monthly", category: "housing", enabled: true },
  
  // Utilities
  { id: "2", name: "Electricity", amount: 150, frequency: "monthly", category: "utilities", enabled: true },
  { id: "3", name: "Water", amount: 80, frequency: "monthly", category: "utilities", enabled: true },
  { id: "4", name: "Internet", amount: 70, frequency: "monthly", category: "utilities", enabled: true },
  
  // Food
  { id: "5", name: "Groceries", amount: 150, frequency: "weekly", category: "food", enabled: true },
  { id: "6", name: "Dining Out", amount: 50, frequency: "weekly", category: "food", enabled: true },
  
  // Transportation
  { id: "7", name: "Fuel", amount: 80, frequency: "weekly", category: "transportation", enabled: true },
  { id: "8", name: "Car Insurance", amount: 100, frequency: "monthly", category: "insurance", enabled: true },
  
  // Entertainment
  { id: "9", name: "Streaming Services", amount: 30, frequency: "monthly", category: "entertainment", enabled: true },
  { id: "10", name: "Gym", amount: 60, frequency: "monthly", category: "entertainment", enabled: true },
];
```

## Conclusion

The ExpenseManagerIsland provides a powerful, user-friendly way to track individual expenses with different frequencies. It integrates seamlessly with the existing simulation system while maintaining backward compatibility.
