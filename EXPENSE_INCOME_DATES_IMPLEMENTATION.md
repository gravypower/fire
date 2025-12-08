# Expense and Income Date Features - Implementation Summary

## Overview

Added comprehensive date-based features for expenses and income, allowing users to model:
- Expenses with end dates (e.g., school fees)
- One-off expenses (e.g., new caravan, house gate)
- One-off income (e.g., car sale, asset sale)
- Start and end dates for recurring income

## Changes Made

### 1. Type Definitions

#### `types/expenses.ts`
Added new optional fields to `ExpenseItem`:
- `startDate?: Date` - When expense starts (optional)
- `endDate?: Date` - When expense ends (optional)
- `isOneOff?: boolean` - Whether this is a one-off expense
- `oneOffDate?: Date` - Date when one-off expense occurs

#### `types/financial.ts`
Added new optional fields to `IncomeSource`:
- `startDate?: Date` - When income starts (optional)
- `endDate?: Date` - When income ends (optional)
- `isOneOff?: boolean` - Whether this is a one-off income
- `oneOffDate?: Date` - Date when one-off income occurs

### 2. Processor Logic

#### `lib/processors.ts`

**ExpenseProcessor Updates:**
- `calculateExpenses()` - Now accepts optional `currentDate` parameter
- `calculateExpensesFromItems()` - Now accepts optional `currentDate` parameter
  - Checks if expense is one-off and applies it only on the one-off date
  - Checks if recurring expense is within its start/end date range
  - Filters out expenses that haven't started or have ended

**IncomeProcessor Updates:**
- `calculateIncome()` - Now accepts optional `currentDate` parameter
- `calculateTotalAnnualIncome()` - Now accepts optional `currentDate` parameter
- `calculateTotalAnnualAfterTaxIncome()` - Now accepts optional `currentDate` parameter
- `calculateTax()` - Now accepts optional `currentDate` parameter
- `calculateHouseholdTax()` - Now accepts optional `currentDate` parameter
- Added new method `calculateIncomeFromSource()`:
  - Handles one-off income (applies only in the year it occurs)
  - Checks if recurring income is within its start/end date range
  - Returns 0 for income that hasn't started or has ended

### 3. Simulation Engine

#### `lib/simulation_engine.ts`

**calculateTimeStep() Updates:**
- Now passes `currentState.date` to `IncomeProcessor.calculateIncome()`
- Now passes `currentState.date` to `ExpenseProcessor.calculateExpenses()`
- Now passes `currentState.date` to `IncomeProcessor.calculateTotalAnnualIncome()` for tax calculation

This ensures that date-based filtering is applied at each simulation step.

### 4. User Interface

#### `islands/ExpenseManagerIsland.tsx`

Added UI controls for:
- **One-off Expense Toggle**: Checkbox to mark expense as one-off
- **One-off Date Input**: Date picker for when one-off expense occurs
- **Date Range Section**: For recurring expenses
  - Start Date input (optional)
  - End Date input (optional)
- **Display Updates**: Shows one-off status and end dates in expense list

**Form Validation:**
- One-off expenses show date picker for one-off date
- Recurring expenses show start/end date range inputs
- Form data includes all new fields when saving

#### `islands/HouseholdManagerIsland.tsx`

Added UI controls for income sources:
- **One-off Income Toggle**: Checkbox to mark income as one-off
- **One-off Date Input**: Date picker for when one-off income occurs
- **Date Range Inputs**: For recurring income
  - Start Date input (optional)
  - End Date input (optional)

**Updates Applied To:**
- Income source editing in household manager
- Both single and couple household modes

## How It Works

### One-Off Items

**Expenses:**
1. User marks expense as one-off and sets a date
2. During simulation, `calculateExpensesFromItems()` checks if current date falls within the same interval as the one-off date
3. If yes, the expense amount is applied once
4. If no, the expense is skipped

**Income:**
1. User marks income as one-off and sets a date
2. During simulation, `calculateIncomeFromSource()` checks if current year matches the one-off year
3. If yes, the income amount is applied (for that year)
4. If no, income is 0

### Recurring Items with Date Ranges

**Expenses:**
1. User sets optional start and/or end dates
2. During simulation, `calculateExpensesFromItems()` checks:
   - If `startDate` exists and current date < start date → skip expense
   - If `endDate` exists and current date >= end date → skip expense
   - Otherwise → include expense in calculation

**Income:**
1. User sets optional start and/or end dates
2. During simulation, `calculateIncomeFromSource()` checks:
   - If `startDate` exists and current date < start date → return 0
   - If `endDate` exists and current date >= end date → return 0
   - Otherwise → calculate income normally

## Backward Compatibility

All new fields are optional, ensuring:
- Existing expenses and income sources continue to work without modification
- If no dates are set, items behave as before (active for entire simulation)
- Legacy code paths remain unchanged

## Testing Recommendations

1. **One-off Expenses:**
   - Add a one-off expense (e.g., $10,000 caravan on specific date)
   - Verify it appears as a spike in the timeline on that date
   - Verify it doesn't repeat

2. **One-off Income:**
   - Add a one-off income (e.g., $15,000 car sale)
   - Verify it appears as income spike on that date
   - Verify it doesn't repeat

3. **End Dates:**
   - Add recurring expense with end date (e.g., school fees ending in 5 years)
   - Verify expense stops after end date in timeline
   - Verify monthly totals decrease after end date

4. **Start Dates:**
   - Add expense with future start date
   - Verify expense doesn't appear before start date
   - Verify expense appears after start date

5. **Combined Scenarios:**
   - Model buying a caravan (one-off expense) and selling it later (one-off income)
   - Model school fees with start and end dates
   - Verify timeline shows correct cash flow changes

## Files Modified

1. `types/expenses.ts` - Added date fields to ExpenseItem
2. `types/financial.ts` - Added date fields to IncomeSource
3. `lib/processors.ts` - Updated expense and income processors with date filtering
4. `lib/simulation_engine.ts` - Pass current date to processors
5. `islands/ExpenseManagerIsland.tsx` - Added UI for expense dates
6. `islands/HouseholdManagerIsland.tsx` - Added UI for income dates

## Documentation

Created `EXPENSE_INCOME_DATES_GUIDE.md` with:
- Feature overview
- Use cases and examples
- Step-by-step instructions
- Tips and best practices
