# Tiered Tax Rate Implementation

## Overview
Implemented a progressive tax bracket system for Australian taxation, replacing the simple flat tax rate with editable tax brackets.

## Changes Made

### 1. Type System Updates (`types/financial.ts`)
- Added `TaxBracket` interface with `min`, `max`, and `rate` properties
- Added optional `taxBrackets` array to `UserParameters`
- Kept `incomeTaxRate` for backward compatibility (marked as deprecated)

### 2. Tax Calculation Logic (`lib/processors.ts`)
- Added `calculateTaxWithBrackets()` function for progressive tax calculation
- Added `DEFAULT_AU_TAX_BRACKETS` constant with 2024-25 Australian tax rates:
  - $0 - $18,200: 0%
  - $18,201 - $45,000: 19%
  - $45,001 - $120,000: 32.5%
  - $120,001 - $180,000: 37%
  - $180,001+: 45%
- Updated `IncomeProcessor.calculateTax()` to use brackets if available, fallback to flat rate
- Added `calculateAnnualTax()` method for annual tax calculation

### 3. Simulation Engine Updates (`lib/simulation_engine.ts`)
- Updated to use new `IncomeProcessor.calculateTax(params, interval)` signature
- Tax is now calculated using progressive brackets automatically

### 4. UI Implementation (`islands/InputIsland.tsx`)
- Added collapsible tax bracket editor in the Income section
- Shows current tax brackets in summary view
- Allows editing of each bracket's min, max, and rate values
- "Reset to AU Defaults" button to restore Australian tax brackets
- Tax brackets are saved with the configuration

### 5. Layout Improvements (`islands/MainIsland.tsx`)
- Increased max width from 1600px to 1800px
- Adjusted grid layout:
  - Left panel (Parameters): 3/12 columns on large screens, 2/12 on XL screens
  - Right panel (Results): 9/12 columns on large screens, 10/12 on XL screens
- Results now have significantly more space (75-83% of screen width)

## How It Works

### Tax Calculation
1. When calculating income tax, the system checks if `taxBrackets` are defined
2. If brackets exist, it uses progressive calculation:
   - For each bracket, calculate taxable income within that bracket
   - Apply the bracket's rate to that portion
   - Sum all bracket taxes for total tax
3. If no brackets, falls back to simple percentage (`incomeTaxRate`)

### User Experience
1. By default, Australian tax brackets are pre-loaded
2. Users can click "Edit" to modify brackets
3. Each bracket shows:
   - Minimum income threshold
   - Maximum income threshold (empty = no limit for top bracket)
   - Tax rate percentage
4. Changes are saved automatically and trigger simulation re-run
5. "Reset to AU Defaults" restores the 2024-25 Australian brackets

## Benefits

1. **Accurate Tax Calculation**: Progressive taxation matches real-world tax systems
2. **Flexibility**: Users can customize brackets for different countries or scenarios
3. **Backward Compatible**: Existing configurations with flat rates still work
4. **User-Friendly**: Simple interface to view and edit complex tax structures
5. **More Screen Space**: Results panel now has 75-83% of screen width vs 67% before

## Technical Details

### Progressive Tax Formula
```typescript
For income = $100,000 with AU brackets:
- $0 - $18,200 @ 0% = $0
- $18,200 - $45,000 @ 19% = $5,092
- $45,000 - $100,000 @ 32.5% = $17,875
Total tax = $22,967 (effective rate: 22.97%)
```

### Data Structure
```typescript
interface TaxBracket {
  min: number;        // e.g., 45000
  max: number | null; // e.g., 120000 or null for top bracket
  rate: number;       // e.g., 32.5 for 32.5%
}
```

## Testing
- ✅ All existing tests still pass (110 passing)
- ✅ Tax calculation works with both brackets and flat rate
- ✅ Backward compatibility maintained
- ✅ UI updates trigger simulation correctly

## Future Enhancements
- Add ability to add/remove tax brackets dynamically
- Support for tax offsets and rebates
- Medicare levy and other additional taxes
- Tax bracket templates for different countries
