# Test Scenarios for Offset Excess Cash Feature

## Quick Test Guide

### Scenario 1: Excess Offset Without Auto-Payout
**Goal:** Verify that excess cash accumulates once offset reaches loan balance

**Setup:**
1. Add a loan:
   - Label: "Home Loan"
   - Principal: $100,000
   - Interest Rate: 5.5%
   - Payment Amount: $1,000
   - Payment Frequency: Monthly
   - ✅ Enable "Use Offset Account"
   - Current Offset Balance: $0
   - ❌ Leave "Auto-payout" UNCHECKED

2. Set income to generate surplus:
   - Annual Salary: $120,000
   - Monthly Living Expenses: $3,000 (via Expense Tracker)

3. Run simulation for 10 years

**Expected Results:**
- **First ~8 years:** Offset balance grows toward $100,000
- **After offset reaches $100k:** 
  - Loan balance stays at $100,000
  - Offset balance stays at $100,000
  - Cash balance starts growing (visible on timeline)
  - Interest paid = $0 (fully offset)
- **Timeline shows:** Blue cash line climbing after offset maxes out

---

### Scenario 2: Auto-Payout Enabled
**Goal:** Verify loan pays out automatically when offset equals principal

**Setup:**
1. Add a loan:
   - Label: "Home Loan"
   - Principal: $100,000
   - Interest Rate: 5.5%
   - Payment Amount: $1,000
   - Payment Frequency: Monthly
   - ✅ Enable "Use Offset Account"
   - Current Offset Balance: $0
   - ✅ Enable "Auto-payout when offset equals outstanding principal"

2. Set income to generate surplus:
   - Annual Salary: $120,000
   - Monthly Living Expenses: $3,000

3. Run simulation for 10 years

**Expected Results:**
- **First ~8 years:** Offset balance grows toward $100,000
- **When offset reaches $100k:**
  - Loan balance drops to $0 (paid out)
  - Offset balance drops to $0 (converted to cash)
  - Cash balance jumps to $100,000
- **After payout:**
  - No loan balance (red line at $0)
  - No offset balance
  - Cash continues growing from $100k base
- **Timeline shows:** 
  - Red loan line drops to zero
  - Blue cash line jumps up at payout point
  - Cash continues climbing

---

### Scenario 3: Multiple Loans with Different Settings
**Goal:** Verify each loan handles offset independently

**Setup:**
1. Add Loan 1:
   - Label: "Home Loan"
   - Principal: $300,000
   - Interest Rate: 5.5%
   - Payment: $2,000/month
   - ✅ Offset enabled
   - ❌ Auto-payout disabled

2. Add Loan 2:
   - Label: "Investment Property"
   - Principal: $200,000
   - Interest Rate: 6.0%
   - Payment: $1,500/month
   - ✅ Offset enabled
   - ✅ Auto-payout enabled

3. Set high income:
   - Annual Salary: $200,000
   - Monthly Expenses: $4,000

4. Run simulation for 15 years

**Expected Results:**
- Leftover cash goes to biggest loan with offset (Home Loan)
- Home Loan offset grows to $300k, then excess becomes cash
- Investment Property continues with regular payments
- When Investment Property offset reaches $200k:
  - Investment Property pays out automatically
  - Its offset converts to cash
- Home Loan remains (not auto-paid)
- Timeline shows both behaviors

---

### Scenario 4: Starting with Existing Offset
**Goal:** Verify auto-payout works with pre-existing offset balance

**Setup:**
1. Add a loan:
   - Label: "Nearly Paid Loan"
   - Principal: $50,000
   - Interest Rate: 5.0%
   - Payment: $1,000/month
   - ✅ Offset enabled
   - Current Offset Balance: $45,000 (already have $45k saved)
   - ✅ Auto-payout enabled

2. Set income:
   - Annual Salary: $100,000
   - Monthly Expenses: $3,000

3. Run simulation for 5 years

**Expected Results:**
- Offset quickly grows from $45k to $50k (within months)
- Loan pays out automatically when offset hits $50k
- Cash balance immediately shows $50,000
- Continues growing from there
- Timeline shows rapid payout event

---

### Scenario 5: No Offset Account (Control Test)
**Goal:** Verify normal loan behavior unchanged

**Setup:**
1. Add a loan:
   - Label: "Standard Loan"
   - Principal: $100,000
   - Interest Rate: 5.5%
   - Payment: $1,000/month
   - ❌ Offset DISABLED

2. Set income:
   - Annual Salary: $100,000
   - Monthly Expenses: $3,000

3. Run simulation for 10 years

**Expected Results:**
- Loan balance decreases normally with payments
- Interest is charged on full balance
- Leftover cash accumulates as cash (not offset)
- Timeline shows:
  - Red loan line declining
  - Blue cash line growing
  - Normal amortization behavior

---

## Visual Checks on Timeline

### What to Look For:

1. **Cash Line (Blue):**
   - Should be flat at $0 while offset is growing
   - Should start climbing once offset = loan balance
   - Should jump up when auto-payout occurs

2. **Loan Line (Red, shown as negative):**
   - Should stay constant when fully offset
   - Should drop to $0 when auto-payout triggers
   - Should decline normally without offset

3. **Offset Line (if displayed separately):**
   - Should grow until it equals loan balance
   - Should cap at loan balance (not exceed)
   - Should drop to $0 when auto-payout occurs

4. **Net Worth Line (Green):**
   - Should continue growing regardless
   - Should be smooth (no jumps from payout)
   - Payout is just moving money around, not creating/destroying value

---

## Common Issues to Watch For

### Issue 1: Cash Not Accumulating
**Symptom:** Cash stays at $0 even after offset reaches loan balance
**Check:** Verify the Phase 6 logic is capping offset at loan balance

### Issue 2: Auto-Payout Not Triggering
**Symptom:** Offset exceeds loan balance but loan doesn't pay out
**Check:** 
- Verify checkbox is checked in UI
- Verify `autoPayoutWhenOffsetFull` is true in saved config
- Check Phase 6b logic is executing

### Issue 3: Cash Jumps Incorrectly
**Symptom:** Cash balance shows wrong amount after payout
**Check:** Verify offset amount is being added to cash correctly

### Issue 4: Multiple Loans Interfere
**Symptom:** One loan's payout affects another loan
**Check:** Verify each loan's balances are tracked independently in the maps

---

## Browser Console Checks

Open browser console and check for:
```javascript
// Check saved configuration
JSON.parse(localStorage.getItem('financial-simulation-config'))

// Look for:
// - loans[].autoPayoutWhenOffsetFull: true/false
// - loans[].hasOffset: true/false
// - loans[].offsetBalance: number
```

---

## Success Criteria

✅ **Feature is working correctly if:**
1. Excess cash accumulates when offset = loan balance (without auto-payout)
2. Loan pays out automatically when offset = loan balance (with auto-payout)
3. Offset converts to cash upon payout
4. Timeline clearly shows cash accumulation
5. Multiple loans work independently
6. No errors in browser console
7. Configuration saves and loads correctly

❌ **Feature has issues if:**
1. Cash doesn't accumulate (stays at $0)
2. Offset exceeds loan balance
3. Auto-payout doesn't trigger
4. Cash amount is incorrect after payout
5. Timeline doesn't show changes
6. Errors in console
7. Settings don't persist after page reload
