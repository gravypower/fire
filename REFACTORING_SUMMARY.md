# Refactoring Summary: Super, Tax Config, and Retirement Age

## Changes Made

### 1. Super Accounts Attached to People

**What Changed:**
- Super accounts are now managed per person, similar to income sources
- Each person in the household can have multiple super accounts
- Super accounts are added/edited/removed within the Household Configuration section

**Type Changes:**
- Removed `taxBrackets` from `Person` interface (moved to global config)
- Added `personId` field to `SuperAccount` interface for tracking ownership
- `Person.superAccounts` is now a required field (not optional)

**UI Changes:**
- Added "Super Accounts" section in HouseholdManagerIsland for each person
- Each person can add multiple super accounts with:
  - Label/name
  - Current balance
  - Contribution rate (% of gross income)
  - Return rate (expected annual return %)
- Super section in InputIsland now only shows for legacy/backward compatibility when no people are configured

### 2. Tax Configuration Moved to Separate Section

**What Changed:**
- Tax brackets moved from "Retirement & Simulation" to dedicated "Tax Configuration" section
- Tax config is now clearly separated as something that doesn't change often
- Cleaner organization with dedicated icon and section

**UI Changes:**
- New "Tax Configuration" card in InputIsland
- Tax brackets are now in their own section with calculator icon
- Same functionality (edit brackets, reset to AU defaults)

### 3. Retirement Age Removed from Retirement Section

**What Changed:**
- Current age and retirement age removed from the "Retirement" section
- These fields are now only in the Household Configuration section
- Each person has their own current age and retirement age

**UI Changes:**
- "Retirement" section renamed to "Retirement Income"
- Only shows "Desired Annual Retirement Income" field
- Added helper text: "Set your current age and retirement age in the Household Configuration section above"
- Removed duplicate age fields that were confusing

## Benefits

1. **Better Organization**: Super is now logically grouped with the person who owns it
2. **Clearer Tax Config**: Tax settings are in their own section, making it clear they're configuration rather than frequently-changed parameters
3. **No Duplication**: Age fields are only in one place (Household Configuration)
4. **Consistent Pattern**: Super accounts work the same way as income sources (add/edit/remove per person)
5. **Couple Mode Support**: Each person in a couple can have their own super accounts with different contribution rates

## Backward Compatibility

- Legacy super fields (`superContributionRate`, `superReturnRate`, `currentSuperBalance`) still exist in types
- Super section in InputIsland still shows when `people` array is empty
- Existing saved configurations will continue to work

## Migration Path

Users with existing data will see:
1. Their household configuration with age fields
2. Tax configuration in its own section
3. Super accounts can be added per person in Household Configuration
4. Legacy super fields hidden when using household mode with people configured
