# Expense and Income Date Features Guide

## Overview

The financial simulation tool now supports advanced date-based features for both expenses and income, allowing you to model real-world scenarios more accurately.

## New Features

### 1. End Dates for Recurring Expenses

You can now set an end date for expenses that won't last forever.

**Use Cases:**
- School fees (ends when child graduates)
- Childcare costs (ends when child starts school)
- Temporary subscriptions or memberships
- Fixed-term contracts

**How to Use:**
1. Open the Expense Tracker
2. Add or edit an expense
3. In the "Date Range (Optional)" section, set an **End Date**
4. The expense will automatically stop being applied after this date in the simulation

### 2. One-Off Expenses

Model single, non-recurring expenses that happen once.

**Use Cases:**
- New caravan purchase
- House gate installation
- Major home repairs
- One-time medical procedures
- Wedding costs
- Vacation expenses

**How to Use:**
1. Open the Expense Tracker
2. Add a new expense
3. Check the box "This is a one-off expense"
4. Set the **One-off Date** when this expense will occur
5. Enter the total amount (not a recurring amount)

**Example:**
- Name: "New Caravan"
- Amount: $45,000
- One-off Date: 2026-06-15
- The $45,000 will be deducted once on June 15, 2026

### 3. Start Dates for Expenses

You can also set a start date for expenses that begin in the future.

**Use Cases:**
- Planned future subscriptions
- Expenses that start after a specific event
- Delayed recurring costs

**How to Use:**
1. In the "Date Range (Optional)" section, set a **Start Date**
2. The expense won't be applied until after this date

### 4. One-Off Income

Model single income events that happen once.

**Use Cases:**
- Sale of a car
- Sale of a caravan
- Inheritance
- Tax refund
- Bonus payment
- Sale of assets

**How to Use:**
1. Go to Household Manager (if using couple mode) or Income section
2. Add a new income source
3. Check the box "One-off income (e.g., car sale)"
4. Set the **One-off Date** when this income will be received
5. Enter the total amount

**Example:**
- Label: "Car Sale"
- Amount: $15,000
- One-off Date: 2025-03-20
- The $15,000 will be added to your cash on March 20, 2025

### 5. End Dates for Recurring Income

Set an end date for income sources that won't continue indefinitely.

**Use Cases:**
- Contract work with a fixed end date
- Rental income from a property you plan to sell
- Part-time job during studies
- Temporary side income

**How to Use:**
1. Add or edit an income source
2. Set an **End Date** (optional)
3. The income will stop being applied after this date

## Important Notes

### Date Filtering in Simulation

- The simulation engine checks dates at each time step (monthly by default)
- One-off items are applied in the period when their date falls
- Recurring items are only included when the current simulation date is within their active range

### Combining Features

You can combine start and end dates for recurring items:
- **Start Date + End Date**: Item is active only between these dates
- **Start Date only**: Item starts on this date and continues indefinitely
- **End Date only**: Item is active from simulation start until this date
- **Neither**: Item is active for the entire simulation

### Tax Implications

- One-off income is still subject to tax if marked as "Before tax"
- One-off expenses do not affect taxable income (unless you're using debt recycling for investment purposes)

## Examples

### Example 1: School Fees
```
Name: School Fees
Amount: $500
Frequency: Monthly
Start Date: 2025-02-01
End Date: 2030-12-31
Category: Personal
```
This models school fees that run from February 2025 until December 2030.

### Example 2: Car Sale
```
Label: Car Sale
Amount: $18,000
One-off: Yes
One-off Date: 2026-06-15
Before Tax: No (after-tax income)
```
This models selling your car for $18,000 on June 15, 2026.

### Example 3: New Gate Installation
```
Name: New House Gate
Amount: $3,500
One-off: Yes
One-off Date: 2025-08-10
Category: Housing
```
This models a one-time expense of $3,500 for a new gate on August 10, 2025.

### Example 4: Caravan Purchase and Later Sale
```
Expense:
  Name: New Caravan
  Amount: $45,000
  One-off: Yes
  One-off Date: 2025-05-01
  Category: Other

Income (later):
  Label: Caravan Sale
  Amount: $35,000
  One-off: Yes
  One-off Date: 2028-09-15
  Before Tax: No
```
This models buying a caravan for $45,000 in May 2025 and selling it for $35,000 in September 2028.

## Tips

1. **Plan Major Purchases**: Use one-off expenses to model major purchases and see their impact on your financial timeline
2. **Model Life Changes**: Use end dates to model expenses that will stop (like childcare when kids grow up)
3. **Asset Sales**: Use one-off income to model selling assets and see how it affects your retirement timeline
4. **Temporary Income**: Use end dates on income to model contract work or temporary jobs

## Technical Details

- Dates are checked at each simulation step (monthly intervals by default)
- One-off items are applied when the simulation date falls within the same period as the one-off date
- The simulation engine passes the current date to expense and income processors for filtering
- All date fields are optional - if not set, items behave as they did before (active for entire simulation)
