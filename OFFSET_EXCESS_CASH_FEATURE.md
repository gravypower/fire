# Offset Excess Cash & Auto-Payout Feature

## Overview
This feature enhances the loan offset functionality to handle scenarios where the offset balance exceeds the loan principal. When this happens, the excess amount is now held as cash and displayed on the timeline. Additionally, users can opt to automatically pay out the loan when the offset equals the outstanding principal.

## Key Changes

### 1. Excess Offset as Cash
**Previous Behavior:**
- Leftover cash was continuously added to the offset account without limit
- No handling for when offset exceeded loan balance

**New Behavior:**
- Leftover cash is added to offset only up to the loan balance
- Once offset equals loan balance, additional cash is held as liquid cash
- This cash appears in the timeline's cash balance
- Provides more realistic modeling of savings behavior

### 2. Auto-Payout Option
**Feature:**
- New checkbox: "Auto-payout loan when offset equals outstanding principal"
- When enabled, the loan is automatically paid out once offset >= principal
- The offset balance is converted to cash upon payout
- Loan balance becomes $0

**Use Cases:**
- Users who want to eliminate debt as soon as they have sufficient offset
- Modeling scenarios where paying off the loan is a priority
- Comparing strategies: keeping offset vs. paying out the loan

## Implementation Details

### Type Changes
**File:** `types/financial.ts`

Added new optional field to `Loan` interface:
```typescript
export interface Loan {
  // ... existing fields
  /** Whether to automatically pay out the loan when offset equals outstanding principal */
  autoPayoutWhenOffsetFull?: boolean;
}
```

### UI Changes
**File:** `islands/InputIsland.tsx`

Added checkbox in the offset account section for each loan:
- Only visible when "Use Offset Account" is enabled
- Clear description of the auto-payout behavior
- Defaults to unchecked (opt-in feature)

### Simulation Engine Changes
**File:** `lib/simulation_engine.ts`

**Phase 6 - Offset Account Logic:**
```typescript
// Calculate maximum offset increase (capped at loan balance)
const maxOffsetIncrease = Math.max(0, loanBalance - currentOffsetBalance);
const offsetIncrease = Math.min(cash, maxOffsetIncrease);

// Add to offset
offsetBalances[loanId] = currentOffsetBalance + offsetIncrease;
cash -= offsetIncrease;

// Excess cash stays as cash (shown on timeline)
```

**Phase 6b - Auto-Payout Logic:**
```typescript
if (loan.hasOffset && loan.autoPayoutWhenOffsetFull) {
  if (currentOffsetBalance >= currentLoanBalance) {
    // Pay out the loan
    loanBalances[loan.id] = 0;
    
    // Convert offset to cash
    cash += currentOffsetBalance;
    offsetBalances[loan.id] = 0;
    
    // Update totals
    loanBalance = sum of all loan balances
    offsetBalance = sum of all offset balances
  }
}
```

## Timeline Impact

### Cash Balance Display
- **Before:** Cash was always $0 (all excess went to offset)
- **After:** Cash accumulates once offset reaches loan balance
- Users can see their liquid savings growing on the timeline

### Loan Payout Events
When auto-payout is enabled:
1. Offset grows until it equals loan balance
2. Loan is paid out (balance → $0)
3. Offset converts to cash
4. Cash balance increases by the offset amount
5. Timeline shows the transition clearly

## User Benefits

1. **More Realistic Modeling:**
   - Reflects actual banking behavior (can't offset more than you owe)
   - Shows true liquid cash position

2. **Strategic Planning:**
   - Compare keeping offset vs. paying out loan
   - Understand cash flow implications
   - Model different debt elimination strategies

3. **Flexibility:**
   - Auto-payout is optional (checkbox)
   - Can be configured per loan
   - Supports multiple loan scenarios

## Example Scenarios

### Scenario 1: Excess Offset Without Auto-Payout
- Loan: $300,000 @ 5.5%
- Offset enabled, auto-payout disabled
- Monthly surplus: $5,000

**Timeline:**
- Months 1-60: Offset grows to $300,000
- Months 61+: Cash balance grows by $5,000/month
- Loan remains at $300,000 (fully offset, no interest)
- User has $300k offset + growing cash

### Scenario 2: Auto-Payout Enabled
- Same loan and surplus

**Timeline:**
- Months 1-60: Offset grows to $300,000
- Month 60: Loan paid out automatically
- Month 60: Cash balance = $300,000
- Months 61+: Cash grows by $5,000/month
- No loan, no offset, just cash

## Testing Recommendations

1. **Test excess offset:**
   - Create loan with offset
   - Set high monthly surplus
   - Verify cash accumulates after offset = principal

2. **Test auto-payout:**
   - Enable auto-payout checkbox
   - Run simulation
   - Verify loan pays out when offset = principal
   - Verify offset converts to cash

3. **Test multiple loans:**
   - Create 2+ loans with different offset settings
   - Verify excess cash behavior per loan
   - Verify auto-payout works independently per loan

4. **Test timeline display:**
   - Check cash line shows accumulation
   - Check loan line shows payout event
   - Check offset line shows conversion to cash

## Future Enhancements

Possible additions:
- Option to redirect excess cash to investments instead of holding as cash
- Configurable payout threshold (e.g., pay out at 95% offset)
- Notification/marker on timeline when payout occurs
- Comparison view: with vs. without auto-payout
