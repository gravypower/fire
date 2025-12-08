# Quick Start: Offset Excess Cash Feature

## What's New?

Two new behaviors for loans with offset accounts:

1. **Excess Offset → Cash**: When your offset balance reaches your loan balance, additional savings are held as cash instead of being added to offset
2. **Auto-Payout Option**: Optional checkbox to automatically pay out the loan when offset equals outstanding principal

## How to Use

### Step 1: Add a Loan with Offset

1. Click **"+ Add Loan"** button
2. Fill in loan details:
   - Label: e.g., "Home Loan"
   - Principal: e.g., $300,000
   - Interest Rate: e.g., 5.5%
   - Payment Amount: e.g., $2,000
   - Payment Frequency: Monthly

3. ✅ Check **"Use Offset Account"**
4. Enter current offset balance (if any)

### Step 2: Choose Auto-Payout Behavior

**Option A: Keep Loan with Full Offset (Default)**
- Leave **"Auto-payout loan when offset equals outstanding principal"** UNCHECKED
- Result: Loan stays at original balance, fully offset (no interest)
- Excess savings accumulate as cash

**Option B: Auto-Payout When Fully Offset**
- ✅ Check **"Auto-payout loan when offset equals outstanding principal"**
- Result: Loan automatically pays out when offset reaches principal
- Offset converts to cash
- No more loan or offset

### Step 3: Run Simulation

1. Set your income and expenses
2. Click **"Run Simulation"** or let it auto-run
3. Watch the timeline

## What You'll See on Timeline

### Without Auto-Payout:
```
Offset Balance: Grows to $300k → Stays at $300k
Loan Balance:   Stays at $300k (fully offset, no interest)
Cash Balance:   $0 → $0 → Starts growing after offset maxes out
```

### With Auto-Payout:
```
Offset Balance: Grows to $300k → Drops to $0 (converted to cash)
Loan Balance:   Stays at $300k → Drops to $0 (paid out)
Cash Balance:   $0 → Jumps to $300k → Continues growing
```

## Real-World Example

**Scenario:** You have a $400k mortgage and save $3k/month

**Without Auto-Payout:**
- Years 1-11: Offset grows to $400k
- Year 11+: Cash grows by $3k/month
- You have: $400k loan (fully offset) + growing cash
- Interest paid: $0 (fully offset)

**With Auto-Payout:**
- Years 1-11: Offset grows to $400k
- Year 11: Loan pays out automatically
- Year 11+: Cash grows by $3k/month from $400k base
- You have: No loan + $400k+ cash
- Interest paid: $0 (was fully offset before payout)

## Which Option to Choose?

### Choose "No Auto-Payout" if:
- ✅ You want flexibility to access offset funds anytime
- ✅ You like having the loan as a financial buffer
- ✅ You want to keep the loan for tax reasons (investment property)
- ✅ You prefer the psychological comfort of having a loan facility

### Choose "Auto-Payout" if:
- ✅ You want to be completely debt-free
- ✅ You prefer simplicity (no loan to manage)
- ✅ You want to eliminate the loan as soon as possible
- ✅ You don't need the loan facility anymore

## Multiple Loans

You can mix and match:
- Loan 1: Offset enabled, auto-payout OFF (keep as buffer)
- Loan 2: Offset enabled, auto-payout ON (eliminate debt)
- Loan 3: No offset (standard loan)

Each loan behaves independently!

## Tips

1. **Start Simple**: Test with one loan first
2. **Compare Scenarios**: Run simulation twice (with/without auto-payout) to compare
3. **Check Timeline**: Blue cash line shows your liquid savings
4. **Watch for Payout**: Red loan line drops to zero when auto-payout triggers
5. **Verify Settings**: Refresh page to ensure settings saved correctly

## Troubleshooting

**Cash not accumulating?**
- Check that offset account is enabled
- Verify you have positive cash flow (income > expenses + loan payment)
- Look at timeline - offset should reach loan balance first

**Auto-payout not working?**
- Verify checkbox is checked
- Refresh page and check if setting persisted
- Check browser console for errors (F12)

**Settings not saving?**
- Check browser localStorage isn't full
- Try clearing old data
- Check for storage quota warnings

## Documentation

- **OFFSET_EXCESS_CASH_FEATURE.md** - Full feature documentation
- **OFFSET_EXCESS_TEST_SCENARIOS.md** - Detailed test scenarios
- **OFFSET_IMPLEMENTATION_SUMMARY.md** - Technical implementation details

## Questions?

The feature is designed to be intuitive:
1. Add loan
2. Enable offset
3. Choose auto-payout (optional)
4. Run simulation
5. Watch timeline

That's it! The simulation handles all the complex calculations automatically.
