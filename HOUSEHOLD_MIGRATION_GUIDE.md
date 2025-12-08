# Household Configuration Migration Guide

## Summary of Changes

The Finance Simulation Tool has been updated to consolidate all income configuration into the **Household Configuration** section. This simplifies the interface and makes it clearer how income and tax calculations work.

## What Changed

### ✅ Before (Old System)
- Income Sources section in InputIsland
- Separate "Add Income" buttons
- Confusing split between single salary and multiple income sources
- Tax calculated on combined household income

### ✅ After (New System)
- **Single unified Household Configuration section**
- Works for both single person and couple mode
- Income sources managed per person
- Tax calculated correctly per person (in couple mode)

## Key Improvements

### 1. **Unified Interface**
All income configuration is now in one place:
- **Household Configuration** section at the top of the Configure tab
- Single mode: Configure one person's income
- Couple mode: Configure two people's incomes separately

### 2. **Clearer Tax Calculation**
- Single mode: One person, one tax calculation
- Couple mode: Two people, two separate tax calculations (tax savings!)

### 3. **Removed Deprecated Fields**
The following have been removed from the UI:
- Standalone "Income Sources" section
- Legacy "Annual Salary" fields (when income sources exist)
- Confusing dual-mode income entry

## How to Use the New System

### For Single Person

1. The **Household Configuration** section shows "Single Person" mode by default
2. Configure your details:
   - Name (optional, defaults to "Me")
   - Current age
   - Retirement age
   - Income sources (click "+ Add Income")

3. Each income source has:
   - Label (e.g., "Main Job", "Side Hustle")
   - Amount per pay period
   - Frequency (weekly, fortnightly, monthly, yearly)
   - Before/After tax checkbox

### For Couples

1. Click **"Couple/Household"** button in Household Configuration
2. Configure Person 1:
   - Name, ages, income sources
3. Configure Person 2:
   - Name, ages, income sources
4. See tax savings automatically calculated!

## Migration for Existing Users

### Your Data is Safe
- Existing configurations will automatically work
- The system creates a default person in single mode
- Your income data is preserved

### If You Had Multiple Income Sources
- They will be assigned to Person 1 in single mode
- You can edit them in the Household Configuration section
- Everything continues to work as before

### If You Want to Add a Partner
1. Click "Couple/Household" in Household Configuration
2. Person 1 will have your existing income
3. Add Person 2's income sources
4. See your tax savings!

## Technical Details

### Default Configuration
New users start with:
- Single person mode
- One person named "Me"
- One income source: $80,000/year salary
- Australian tax brackets (2024-25)

### Backward Compatibility
The system maintains legacy fields for:
- `annualSalary` - Falls back if no income sources
- `incomeTaxRate` - Falls back if no tax brackets
- `incomeSources` - Migrated to person's income sources

### Data Structure
```typescript
// New structure
{
  householdMode: "single" | "couple",
  people: [
    {
      id: "person-1",
      name: "Me",
      currentAge: 30,
      retirementAge: 65,
      incomeSources: [
        {
          id: "income-1",
          label: "Salary",
          amount: 80000,
          frequency: "yearly",
          isBeforeTax: true
        }
      ],
      taxBrackets: [...],
      superAccounts: [...]
    }
  ]
}
```

## Benefits

### 1. **Simpler Interface**
- One place for all income configuration
- No confusion about where to add income
- Clear visual hierarchy

### 2. **Better Tax Accuracy**
- Couple mode: Each person taxed separately
- Automatic tax savings calculation
- More realistic retirement planning

### 3. **Easier to Understand**
- Clear distinction between single and couple
- Visual indicators for each person
- Obvious where to add income sources

### 4. **Future-Proof**
- Ready for additional household features
- Can easily add more people if needed
- Extensible for complex scenarios

## Troubleshooting

### "I don't see my income sources"
- Check the **Household Configuration** section at the top
- Your income should be under Person 1 in single mode
- Click "+ Add Income" to add more sources

### "My tax seems wrong"
- In single mode: Tax is calculated on your total income
- In couple mode: Each person is taxed separately
- Check that income sources are marked "Before tax"

### "I want to go back to single mode"
- Click "Single Person" in Household Configuration
- Person 1's data is preserved
- Person 2's data is removed (can be re-added later)

### "Where did the old Income section go?"
- It's been replaced by Household Configuration
- All functionality is preserved
- The new section is more powerful and clearer

## Summary

The new Household Configuration system:
- ✅ Consolidates all income management
- ✅ Provides accurate per-person tax calculations
- ✅ Simplifies the user interface
- ✅ Maintains backward compatibility
- ✅ Enables better couple financial planning

All your existing data is safe and will continue to work. The new system just makes it clearer and more powerful!
