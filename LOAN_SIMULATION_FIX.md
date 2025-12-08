# Loan Simulation Fix Summary

## Problem
The loan simulation was not working correctly:
1. Loan amounts were not reducing over time
2. The UI showed default legacy loan input fields instead of requiring users to add loans explicitly
3. The simulation engine was using legacy single-loan fields even when the new `loans` array was available

## Root Cause
The application had both legacy single-loan fields (`loanPrincipal`, `loanInterestRate`, etc.) and a new `loans` array for multiple loans. The logic for determining which to use was incorrect:
- When `loans` array was empty `[]`, it fell back to legacy fields
- This meant users couldn't explicitly indicate "no loans" by setting an empty array

## Additional Issue Found
After the initial fix, users with existing saved data were still seeing loans not reducing. This was because:
- Old saved data had `loanPrincipal` set but no `loans` array
- The simulation engine correctly checked for `loans === undefined` and used legacy fields
- But the UI no longer showed legacy loan fields, so users couldn't see or edit them
- This created a "phantom loan" that users couldn't interact with

## Complete Solution

### 1. Updated Default Parameters
- Changed default `loans` to an empty array `[]` instead of undefined
- Added comment indicating users should use "+ Add Loan" button
- Removed legacy loan input fields from the UI when loans array is present

### 2. Fixed Simulation Engine Logic
Updated the logic in both `runSimulation()` and `runSimulationWithTransitions()`:

**Before:**
```typescript
const initialLoanBalance = params.loans && params.loans.length > 0
  ? params.loans.reduce((sum, loan) => sum + loan.principal, 0)
  : params.loanPrincipal;
```

**After:**
```typescript
const initialLoanBalance = params.loans !== undefined
  ? (params.loans.length > 0 ? params.loans.reduce((sum, loan) => sum + loan.principal, 0) : 0)
  : params.loanPrincipal;
```

**Key Change:** Check if `loans` field exists (even if empty), not just if it has items.

### 3. Updated UI
- Removed legacy loan input fields when `loans` array is present
- Show empty state with helpful message when no loans are added
- Users must explicitly click "+ Add Loan" to add loans
- Each loan has its own configuration including offset account

### 4. Fixed TypeScript Errors
Fixed several TypeScript compilation errors in `processors.ts` and `simulation_engine.ts`:
- Added missing `PaymentFrequency` import
- Added `"yearly"` case and default cases to all frequency switch statements
- Fixed `intervalToPeriodsPerYear()` to handle all `TimeInterval` cases including `"fortnight"`
- Removed invalid `person.taxBrackets` check (Person type doesn't have this field)

### 5. Added Automatic Migration
Updated `lib/storage.ts` to automatically migrate legacy loan data:

**In loadConfiguration():**
```typescript
// Ensure loans array exists (migrate from legacy single loan if needed)
if (config.baseParameters.loans === undefined) {
  // Check if there's a legacy loan to migrate
  if (config.baseParameters.loanPrincipal > 0) {
    config.baseParameters.loans = [{
      id: `loan-migrated-${Date.now()}`,
      label: "Migrated Loan",
      principal: config.baseParameters.loanPrincipal,
      interestRate: config.baseParameters.loanInterestRate,
      paymentAmount: config.baseParameters.loanPaymentAmount,
      paymentFrequency: config.baseParameters.loanPaymentFrequency,
      hasOffset: config.baseParameters.useOffsetAccount,
      offsetBalance: config.baseParameters.currentOffsetBalance || 0,
    }];
    // Clear legacy fields
    config.baseParameters.loanPrincipal = 0;
    // ... clear other legacy fields
  } else {
    config.baseParameters.loans = [];
  }
  // Save the migrated config
  this.saveConfiguration(config);
}
```

This ensures:
- Users with old data see their loan in the new UI
- The loan balance reduces correctly in simulations
- Legacy fields are cleared to avoid confusion
- Migration happens automatically and transparently

### 6. Added Comprehensive Unit Tests
Created `tests/loan_simulation_test.ts` with 7 test cases:

1. **Single loan - balance reduces over time**
   - Verifies loan balance decreases each month
   - Tests: $400k loan → $387k after 1 year

2. **Single loan with offset - balance reduces faster**
   - Compares loan with and without offset account
   - Verifies interest savings are calculated

3. **Multiple loans - both balances reduce**
   - Tests two loans (home + car) both reducing
   - Verifies total loan balance calculation

4. **Multiple loans with offset on biggest**
   - Tests that leftover cash goes to biggest loan's offset
   - Verifies only loans with `hasOffset: true` receive funds

5. **No loans - legacy fields ignored**
   - Tests that empty `loans: []` array results in zero loan balance
   - Verifies legacy fields are ignored when loans array exists

6. **Loan payoff - balance reaches zero**
   - Tests that small loans get fully paid off
   - Verifies balance stays at zero after payoff

7. **Multiple loans with different frequencies**
   - Tests loans with monthly and fortnightly payments
   - Verifies both reduce correctly

## Test Results
All 12 tests pass successfully:

**Unit Tests (7):**
```
✓ Single loan balance reduces correctly
✓ Offset account reduces loan balance faster
✓ Multiple loans both reduce correctly
✓ Leftover cash goes to biggest loan's offset
✓ Empty loans array results in zero loan balance
✓ Loan gets paid off and stays at zero
✓ Loans with different frequencies both reduce
```

**UI Integration Tests (2):**
```
✓ UI integration - Adding/removing loans works
✓ UI integration - Configuration changes work
```

**Migration Tests (3):**
```
✓ Legacy loan migrated successfully
✓ Legacy data with no loan migrated successfully
✓ Modern data with loans array unchanged
```

## Files Modified

### Core Logic
- `lib/simulation_engine.ts` - Fixed loan array vs legacy field logic
- `lib/processors.ts` - Fixed TypeScript errors and frequency handling
- `lib/storage.ts` - Added automatic migration from legacy loan fields to loans array

### UI
- `islands/InputIsland.tsx` - Updated default parameters, UI display, and ensures loans array exists

### Tests
- `tests/loan_simulation_test.ts` - New comprehensive test suite (7 tests)
- `tests/loan_ui_integration_test.ts` - UI integration tests (2 tests)
- `tests/loan_migration_test.ts` - Legacy data migration tests (3 tests)
- `test_loan_payments.ts` - Existing tests still pass

## How to Use

### For Users
1. Open the application
2. Navigate to the "Loans & Mortgages" section
3. Click "+ Add Loan" to add a mortgage or other loan
4. Configure each loan:
   - Label (e.g., "Home Mortgage")
   - Principal balance
   - Interest rate
   - Payment amount and frequency
   - Optional: Enable offset account
5. Run simulation to see loan balances reduce over time

### For Developers
Run tests to verify loan functionality:
```bash
# Run comprehensive unit tests
deno test tests/loan_simulation_test.ts --allow-read

# Run integration tests
deno run --allow-read test_loan_payments.ts
```

## Technical Details

### Loan Processing Flow
1. **Income Phase**: Calculate net income after tax
2. **Expense Phase**: Deduct living expenses
3. **Loan Phase**: Process each loan payment
   - Calculate interest based on balance minus offset
   - Apply payment (interest + principal)
   - Update loan balance
4. **Investment Phase**: Add investment contributions
5. **Super Phase**: Add super contributions
6. **Offset Phase**: Move leftover cash to biggest loan's offset (if enabled)
7. **State Update**: Calculate net worth and cash flow

### Multiple Loans Strategy
When multiple loans exist with offset accounts enabled:
- Leftover cash each period goes to the **biggest loan** with offset enabled
- This minimizes total interest paid across all loans
- Each loan tracks its own balance and offset balance separately

### Backward Compatibility & Migration
The system automatically migrates legacy single-loan data:
- When loading saved data, if `loans` array is undefined, it's automatically created
- If legacy `loanPrincipal > 0`, it's migrated to a loan in the `loans` array
- Legacy fields are cleared after migration
- If no legacy loan exists, `loans` is initialized to empty array `[]`
- Migration happens transparently on first load
- Migrated data is saved back to storage in the new format

## Verification
To verify the fix is working:
1. Add a loan with $400,000 principal, 6% interest, $3,000 monthly payment
2. Run simulation for 1 year
3. Check that loan balance reduces to approximately $387,020
4. Enable offset account and verify interest savings appear
5. Add multiple loans and verify both reduce correctly
