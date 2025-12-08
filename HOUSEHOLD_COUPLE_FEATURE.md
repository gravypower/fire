# Household/Couple Feature Implementation

## Overview

The Finance Simulation Tool now supports **household/couple mode**, allowing you to model finances for two people with separate incomes. This is a significant enhancement that provides more accurate tax calculations and retirement planning for couples.

## Why This Matters

### Tax Savings for Couples

When two people earn income separately, they each get their own:
- **Tax-free threshold** (e.g., $18,200 in Australia)
- **Progressive tax brackets**
- **Tax deductions**

**Example Tax Savings:**
- **Single person earning $160,000/year**: Pays ~$42,000 in tax
- **Couple earning $80,000 each ($160,000 total)**: Each pays ~$16,500 = **$33,000 total**
- **Savings: $9,000/year!**

Over 30 years, this could mean **$270,000+ more** for retirement!

## How to Use

### 1. Switch to Couple Mode

In the **Configure** tab, you'll see a new **Household Configuration** section at the top:

- Click **"Couple/Household"** to enable couple mode
- Click **"Single Person"** to return to single mode

### 2. Configure Each Person

When in couple mode, you'll see two person cards:

**For each person, you can set:**
- Name (e.g., "Alex", "Jordan")
- Current age
- Desired retirement age
- Income sources (multiple jobs, side income, etc.)

### 3. Add Income Sources

Each person can have multiple income sources:
- **Label**: Job title or income description
- **Amount**: How much per pay period
- **Frequency**: Weekly, fortnightly, monthly, or yearly
- **Before/After Tax**: Whether this income is taxable

### 4. Tax Calculation

The system automatically:
- Calculates tax **separately** for each person
- Uses Australian tax brackets (2024-25) by default
- Applies each person's tax-free threshold
- Sums the total household tax

## Features

### ✅ Implemented

1. **Household Mode Toggle**
   - Switch between single and couple mode
   - Preserves existing configuration when switching

2. **Per-Person Configuration**
   - Individual ages and retirement goals
   - Separate income sources
   - Independent tax calculations

3. **Tax Optimization**
   - Each person taxed separately
   - Progressive tax brackets applied individually
   - Significant tax savings for couples

4. **Backward Compatibility**
   - Existing single-person configurations work unchanged
   - Smooth migration to couple mode

### 🔄 Shared Finances

Currently, the following are **shared** between both people:
- Expenses (rent, groceries, utilities)
- Loans and mortgages
- Investment accounts
- Superannuation accounts (can be assigned per person)
- Retirement income goals

## Technical Implementation

### Type Changes

**New Types:**
```typescript
interface Person {
  id: string;
  name: string;
  currentAge: number;
  retirementAge: number;
  incomeSources: IncomeSource[];
  taxBrackets?: TaxBracket[];
  superAccounts?: SuperAccount[];
}

interface UserParameters {
  householdMode?: "single" | "couple";
  people?: Person[];
  // ... existing fields
}
```

### Tax Calculation

**Before (Single Mode):**
```typescript
// Combined income taxed as one person
totalIncome = $160,000
tax = calculateTax($160,000) = $42,000
```

**After (Couple Mode):**
```typescript
// Each person taxed separately
person1Income = $80,000
person2Income = $80,000
person1Tax = calculateTax($80,000) = $16,500
person2Tax = calculateTax($80,000) = $16,500
totalTax = $33,000 (saves $9,000!)
```

### Processor Updates

**IncomeProcessor:**
- `calculateHouseholdTax()` - Calculates tax per person
- `calculateTotalAnnualIncome()` - Sums income from all people
- `convertToAnnual()` - Helper for frequency conversion

## UI Components

### HouseholdManagerIsland

New island component that provides:
- Mode toggle (single vs couple)
- Person management
- Income source configuration per person
- Visual tax benefit information

**Location:** `islands/HouseholdManagerIsland.tsx`

## Example Scenarios

### Scenario 1: Equal Earners
- Person 1: $80,000/year
- Person 2: $80,000/year
- **Tax Savings**: ~$9,000/year vs single person earning $160,000

### Scenario 2: Primary + Secondary Earner
- Person 1: $120,000/year
- Person 2: $40,000/year
- **Tax Savings**: ~$5,000/year vs single person earning $160,000

### Scenario 3: One Working, One Retired
- Person 1: $90,000/year (working)
- Person 2: $30,000/year (pension)
- **Tax Savings**: Significant, as pension may be tax-free

## Future Enhancements

Potential additions for future versions:

1. **Individual Expenses**
   - Personal spending per person
   - Shared vs individual expense tracking

2. **Different Retirement Ages**
   - One person retires earlier
   - Phased retirement planning

3. **Income Splitting Strategies**
   - Optimize income distribution
   - Suggest tax-efficient arrangements

4. **Estate Planning**
   - Survivor benefits
   - Inheritance considerations

5. **More Than Two People**
   - Family households
   - Multi-generational planning

## Migration Guide

### Existing Users

Your existing configurations will continue to work in **single mode** by default. To switch to couple mode:

1. Open your saved configuration
2. Go to the Configure tab
3. Click "Couple/Household" in the Household Configuration section
4. The system will create two people, with Person 1 inheriting your existing income
5. Configure Person 2's income sources
6. Run the simulation to see your tax savings!

### Data Storage

- Household configuration is saved in localStorage
- Backward compatible with existing saved data
- No data loss when switching modes

## Testing

The feature has been tested with:
- ✅ Single mode (backward compatibility)
- ✅ Couple mode with equal incomes
- ✅ Couple mode with different incomes
- ✅ Australian tax brackets (2024-25)
- ✅ Multiple income sources per person
- ✅ Mode switching (single ↔ couple)

## Support

If you encounter any issues or have questions:
1. Check that both people have income sources configured
2. Verify tax brackets are set correctly
3. Ensure ages and retirement ages are valid
4. Check browser console for any errors

## Summary

The household/couple feature provides:
- ✅ **Accurate tax calculations** for couples
- ✅ **Significant tax savings** identification
- ✅ **Individual retirement planning** per person
- ✅ **Easy-to-use interface** for configuration
- ✅ **Backward compatible** with existing data

This makes the Finance Simulation Tool much more realistic and valuable for couples planning their financial future together!
