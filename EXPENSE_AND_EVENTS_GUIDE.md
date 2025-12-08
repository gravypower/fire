# Expense Management & Event Tracking Guide

## Multiple Expenses with Different Frequencies ✅

Your application **already supports** adding multiple expenses with different frequencies!

### How to Use the Expense Manager

1. **Access the Expense Manager**: The `ExpenseManagerIsland` component allows you to manage individual expenses
2. **Add Expenses**: Click "Add Expense" to create new expense items
3. **Set Frequencies**: Each expense can have its own frequency:
   - Weekly
   - Fortnightly  
   - Monthly

### Expense Features

- **Categories**: Organize expenses by type (Housing, Utilities, Food, Transportation, Insurance, Entertainment, Healthcare, Personal, Other)
- **Templates**: Quick-start with common expense templates (Rent, Groceries, Utilities, etc.)
- **Enable/Disable**: Toggle expenses on/off without deleting them
- **Monthly Totals**: Automatically calculates monthly equivalents for all frequencies
- **Category Summaries**: Groups expenses by category with totals

### Example Expenses

```typescript
{
  name: "Groceries",
  amount: 150,
  frequency: "weekly",
  category: "food"
}

{
  name: "Rent",
  amount: 2000,
  frequency: "monthly",
  category: "housing"
}

{
  name: "Fuel",
  amount: 80,
  frequency: "fortnightly",
  category: "transportation"
}
```

## Event Indicators in Table ✅ NEW!

The visualization table now shows important financial events directly in the timeline:

### Events Displayed

1. **🎉 Retirement Date**
   - Highlighted in green
   - Shows when you can retire based on your financial goals
   - Appears on the exact date retirement becomes achievable

2. **✓ Loan Paid Off**
   - Highlighted in blue
   - Shows when your loan balance reaches zero
   - Marks your debt-free date

3. **🔄 Parameter Transitions**
   - Highlighted in purple
   - Shows when life events or parameter changes occur
   - Displays the transition label (e.g., "Semi-Retirement", "Career Change")

### Visual Indicators

- **Row Highlighting**: Rows with events have a yellow background
- **Event Labels**: Small badges appear under the date showing the event type
- **Icons**: Each event type has a distinct icon for quick recognition

### How It Works

The table automatically detects:
- When the retirement date matches a row date
- When loan balance transitions from positive to zero
- When parameter transitions occur (from the Transition Manager)

All events are clearly marked so you can see exactly when major financial milestones happen in your projection.

## Integration Points

### In InputIsland
- Legacy fields: `monthlyLivingExpenses` and `monthlyRentOrMortgage` (deprecated)
- New field: `expenseItems` array (preferred method)

### In Simulation Engine
- `ExpenseProcessor.calculateExpenses()` handles both legacy and new expense formats
- Automatically converts all frequencies to the simulation interval
- Sums all enabled expenses for each time period

### In VisualizationIsland
- Table rows now check for retirement dates, loan payoffs, and transitions
- Events are highlighted with colored backgrounds and labeled badges
- Original state indices are matched to detect transition points

## UI Integration ✅ COMPLETE!

The Expense Manager is now integrated into the main UI with a clean tabbed layout!

### New Tabbed Interface

The app now has two main tabs:

1. **Configure Tab** 🛠️
   - Input Parameters (income, expenses, loans, investments, etc.)
   - Expense Tracker (add/edit individual expenses)
   - Transition Manager (life events and parameter changes)

2. **Results Tab** 📊
   - Comparison View (with vs without transitions)
   - Financial Timeline (charts and tables)
   - Event Indicators (retirement, loan payoff, transitions)

### Where to Find It

The **Expense Tracker** appears in the **Configure tab**, below the main input parameters. It's automatically shown once you have a configuration loaded.

### How to Use

1. **Start the app** - You'll see the Configure tab by default
2. **Scroll down** to find the Expense Tracker
3. **Click "Add Expense"** - Opens the expense form
4. **Fill in details**:
   - Name (e.g., "Groceries", "Rent", "Gym Membership")
   - Amount (dollar value)
   - Frequency (weekly, fortnightly, or monthly)
   - Category (housing, food, utilities, etc.)
5. **Use Templates** - Click "Use Template" for quick-start with common expenses
6. **Enable/Disable** - Toggle expenses on/off with the checkbox
7. **Edit/Delete** - Use the icons on each expense item
8. **View Results** - The app automatically switches to the Results tab when simulation completes

### Legacy Fields

The old "Monthly Living Expenses" and "Monthly Rent" fields are still available in the Input Island (marked as "Legacy") for backward compatibility. However, the new Expense Tracker is the recommended way to manage expenses.

### Data Flow

- Expenses are stored in `config.baseParameters.expenseItems`
- The simulation engine automatically uses `expenseItems` if present, otherwise falls back to legacy fields
- All changes are automatically saved to local storage
- The simulation re-runs automatically when expenses change
- The app automatically switches to the Results tab to show updated projections

### Tab Features

**Configure Tab:**
- Full-width layout for easier data entry
- All configuration options in one scrollable view
- No distractions from results while configuring

**Results Tab:**
- Full-width charts and tables
- Better visibility of financial projections
- Comparison views when transitions are configured
- Event indicators clearly visible in timeline

The expense manager is fully functional and integrated into your tabbed UI!
