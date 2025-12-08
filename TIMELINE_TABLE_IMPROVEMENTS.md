# Financial Timeline Table Improvements

## Summary
Split the Financial Timeline into multiple focused tables with a summary view and detailed breakdowns. Changed the default time granularity to yearly view for better overview.

## Changes Made

### 1. Default Time Granularity
- Changed default from **monthly** to **yearly** view
- Users can still switch between weekly, fortnightly, monthly, and yearly views

### 2. Multiple Table Views
Created 5 specialized table views accessible via tabs:

#### Summary Table (Default)
- High-level overview with key metrics
- Columns: Date, Net Worth, Cash, Total Assets, Total Debt
- Perfect for quick assessment of financial trajectory

#### Loans & Debt Table
- Focused on debt management
- Columns: Date, Loan Balance, Offset Balance, Interest Saved, Effective Debt
- Shows cumulative interest saved
- Highlights loan payoff events

#### Investments & Super Table
- Asset growth tracking
- Columns: Date, Investments, Superannuation, Total Assets, Cash
- Clear view of wealth accumulation

#### Tax & Deductions Table
- Tax planning insights
- Columns: Date, Tax Paid, Deductible Interest, Tax Benefit
- Shows cumulative tax paid and deductions
- Estimates tax benefits from deductions (~30% marginal rate)

#### Cash Flow & Expenses Table
- Income and spending analysis
- Columns: Date, Cash Flow, Expenses, Cash Balance, Net Worth
- Tracks period-by-period cash flow
- Shows cumulative expenses

### 3. Technical Implementation

#### New Component: `components/FinancialTimelineTables.tsx`
- Modular table components for each view
- Shared event detection logic (retirement, loan payoff, transitions)
- Reusable `DateCell` component for consistent event display
- Type-safe props with proper TypeScript interfaces

#### Updated: `islands/VisualizationIsland.tsx`
- Added table view selector state
- Imports new table components
- Conditional rendering based on selected view
- Maintains all existing functionality (charts, metrics, warnings)

### 4. User Experience Improvements
- **Less overwhelming**: Focused tables show only relevant data
- **Better performance**: Yearly default means fewer rows to render
- **Easier navigation**: Tab-based interface for switching views
- **Consistent events**: All tables highlight retirement, loan payoff, and transitions
- **Clear totals**: Headers show final values or cumulative totals

## Usage
1. Run simulation as normal
2. Scroll to "Financial Timeline" section
3. Use "Time Granularity" buttons to change period (defaults to Yearly)
4. Use "Table View" buttons to switch between different data views
5. Look for highlighted rows showing important events

## Benefits
- **Yearly default**: Better for long-term planning (10-30 year projections)
- **Focused views**: See exactly what you need without clutter
- **Faster loading**: Fewer rows = better performance
- **Better insights**: Specialized tables make patterns more obvious
- **Flexible**: Can still drill down to weekly/monthly when needed

## Files Modified
- `islands/VisualizationIsland.tsx` - Main visualization component
- `components/FinancialTimelineTables.tsx` - New table components (created)

## Backward Compatibility
- All existing features preserved
- Charts unchanged
- Metrics unchanged
- Event highlighting maintained
- Time granularity selector still works
