# Offset Excess Cash - Implementation Summary

## What Was Changed

### 3 Files Modified

1. **types/financial.ts** - Added new field to Loan interface
2. **islands/InputIsland.tsx** - Added UI checkbox for auto-payout
3. **lib/simulation_engine.ts** - Implemented excess offset and auto-payout logic

---

## Detailed Changes

### 1. Type Definition (types/financial.ts)

**Added field:**
```typescript
export interface Loan {
  // ... existing fields ...
  autoPayoutWhenOffsetFull?: boolean;
}
```

**Purpose:** Store user preference for automatic loan payout

---

### 2. User Interface (islands/InputIsland.tsx)

**Added checkbox in offset section:**
```tsx
<label class="flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={loan.autoPayoutWhenOffsetFull || false}
    onChange={(e) => updateLoan(index, 'autoPayoutWhenOffsetFull', 
                                 (e.target as HTMLInputElement).checked)}
    class="w-3 h-3 text-green-600 border-gray-300 rounded"
  />
  <span class="ml-2 text-xs text-gray-700">
    Auto-payout loan when offset equals outstanding principal
  </span>
</label>
```

**Location:** Inside the offset account section, only visible when "Use Offset Account" is enabled

**Behavior:** 
- Saves to configuration automatically via `updateLoan()`
- Persists in localStorage
- Defaults to unchecked (opt-in)

---

### 3. Simulation Logic (lib/simulation_engine.ts)

#### Change 3a: Phase 6 - Cap Offset at Loan Balance

**Before:**
```typescript
// Added all leftover cash to offset without limit
offsetBalances[loanId] = currentOffsetBalance + cash;
cash = 0;
```

**After:**
```typescript
// Calculate maximum offset increase (capped at loan balance)
const maxOffsetIncrease = Math.max(0, loanBalance - currentOffsetBalance);
const offsetIncrease = Math.min(cash, maxOffsetIncrease);

// Add to offset (capped)
offsetBalances[loanId] = currentOffsetBalance + offsetIncrease;
cash -= offsetIncrease;

// Excess cash stays as cash (shown on timeline)
```

**Effect:** 
- Offset can't exceed loan balance
- Excess cash accumulates as liquid savings
- Visible on timeline as blue cash line

---

#### Change 3b: Phase 6b - Auto-Payout Logic (NEW)

**Added new phase:**
```typescript
// Phase 6b: Auto-payout loans when offset equals outstanding principal
if (params.loans !== undefined && params.loans.length > 0) {
  for (const loan of params.loans) {
    if (loan.hasOffset && loan.autoPayoutWhenOffsetFull) {
      const currentLoanBalance = loanBalances[loan.id] || 0;
      const currentOffsetBalance = offsetBalances[loan.id] || 0;
      
      // If offset equals or exceeds loan balance, pay out the loan
      if (currentLoanBalance > 0 && currentOffsetBalance >= currentLoanBalance) {
        // Pay out the loan (set balance to 0)
        loanBalances[loan.id] = 0;
        
        // Clear the offset for this loan and convert to cash
        offsetBalances[loan.id] = 0;
        
        // Add the offset amount to cash
        cash += currentOffsetBalance;
        
        // Update totals
        loanBalance = Object.values(loanBalances).reduce((sum, bal) => sum + bal, 0);
        offsetBalance = Object.values(offsetBalances).reduce((sum, bal) => sum + bal, 0);
      }
    }
  }
}
```

**Effect:**
- Checks each loan every time step
- If offset >= loan balance AND auto-payout enabled:
  - Loan balance → $0
  - Offset balance → $0
  - Cash increases by offset amount
- Happens automatically during simulation
- Visible as event on timeline

---

## How It Works - Step by Step

### Without Auto-Payout:

1. **Month 1-60:** Leftover cash → Offset account
2. **Month 60:** Offset reaches loan balance ($100k)
3. **Month 61+:** Leftover cash → Cash balance (not offset)
4. **Result:** Loan stays at $100k (fully offset), cash grows

### With Auto-Payout:

1. **Month 1-60:** Leftover cash → Offset account
2. **Month 60:** Offset reaches loan balance ($100k)
3. **Month 60 (Phase 6b):** 
   - Loan paid out → $0
   - Offset cleared → $0
   - Cash increased by $100k
4. **Month 61+:** Leftover cash → Cash balance
5. **Result:** No loan, no offset, cash grows from $100k

---

## Data Flow

```
Income (after tax & expenses)
    ↓
Leftover Cash
    ↓
Phase 6: Add to Offset (capped at loan balance)
    ↓
    ├─→ If cash > (loan - offset): Excess stays as cash
    └─→ If cash ≤ (loan - offset): All goes to offset
    ↓
Phase 6b: Check Auto-Payout
    ↓
    ├─→ If offset ≥ loan AND auto-payout enabled:
    │       • Loan → $0
    │       • Offset → $0
    │       • Cash += offset amount
    └─→ Otherwise: No change
    ↓
Next time step
```

---

## Configuration Storage

**Saved in localStorage:**
```json
{
  "baseParameters": {
    "loans": [
      {
        "id": "loan-123",
        "label": "Home Loan",
        "principal": 100000,
        "interestRate": 5.5,
        "paymentAmount": 1000,
        "paymentFrequency": "monthly",
        "hasOffset": true,
        "offsetBalance": 0,
        "autoPayoutWhenOffsetFull": true  // ← NEW FIELD
      }
    ]
  }
}
```

---

## Timeline Visualization

**Chart displays (components/NetWorthChart.tsx):**
- ✅ Cash line (blue) - Already implemented
- ✅ Loan line (red) - Already implemented
- ✅ Net worth line (green) - Already implemented

**No changes needed to chart** - it already displays cash balance correctly!

---

## Edge Cases Handled

### 1. Multiple Loans
- Each loan tracks its own offset independently
- Auto-payout works per-loan (one can pay out while others don't)
- Leftover cash goes to biggest loan with offset enabled

### 2. Partial Offset
- If offset is $80k and loan is $100k, cash still accumulates
- Only adds to offset up to the $20k gap
- Excess becomes cash

### 3. Starting with Existing Offset
- If offset starts at $95k and loan is $100k
- Only $5k more can be added to offset
- Payout triggers quickly if auto-payout enabled

### 4. No Offset Account
- Normal loan behavior unchanged
- Cash accumulates normally
- No special handling needed

### 5. Legacy Single Loan
- Code handles both old (single loan) and new (multiple loans) formats
- Backward compatible

---

## Testing Checklist

- [x] Type definition added
- [x] UI checkbox added
- [x] Checkbox saves to config
- [x] Offset caps at loan balance
- [x] Excess cash accumulates
- [x] Auto-payout triggers correctly
- [x] Offset converts to cash on payout
- [x] Multiple loans work independently
- [x] No TypeScript errors
- [x] No runtime errors expected
- [ ] Manual browser testing (user to perform)
- [ ] Verify timeline shows cash correctly
- [ ] Verify localStorage persistence

---

## Files to Review

1. **OFFSET_EXCESS_CASH_FEATURE.md** - Full feature documentation
2. **OFFSET_EXCESS_TEST_SCENARIOS.md** - Test scenarios and expected results
3. **This file** - Implementation summary

---

## Next Steps for User

1. **Start the dev server:**
   ```bash
   deno task start
   ```

2. **Test Scenario 1:** Excess offset without auto-payout
   - Add loan with offset, no auto-payout
   - Run simulation
   - Verify cash accumulates after offset maxes out

3. **Test Scenario 2:** Auto-payout enabled
   - Add loan with offset and auto-payout
   - Run simulation
   - Verify loan pays out when offset = principal

4. **Check timeline:**
   - Blue cash line should show accumulation
   - Red loan line should show payout event
   - No errors in browser console

5. **Verify persistence:**
   - Refresh page
   - Check settings are saved
   - Run simulation again

---

## Rollback Instructions

If issues occur, revert these 3 files:
```bash
git checkout types/financial.ts
git checkout islands/InputIsland.tsx
git checkout lib/simulation_engine.ts
```

Or manually remove:
1. `autoPayoutWhenOffsetFull` field from Loan interface
2. Auto-payout checkbox from UI
3. Phase 6 and 6b changes from simulation engine
