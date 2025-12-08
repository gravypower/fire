# Loan Simulation Fix - User Guide

## What Changed?

We've fixed the loan simulation so that loan balances now reduce correctly over time. If you had loans configured before this update, they have been automatically migrated to the new system.

## For Existing Users

### If You Had a Loan Configured:

1. **Refresh the page** - Your browser will load the updated code
2. **Your loan has been automatically migrated** - You'll see it in the "Loans & Mortgages" section
3. **Check your loan details** - The migrated loan will be labeled "Migrated Loan"
4. **Edit if needed** - Click on the loan to update the label, amounts, or settings
5. **View results** - Switch to the "Results" tab to see your loan balance reducing over time

### If You Had No Loans:

- Nothing changes for you
- When you want to add a loan, click the "+ Add Loan" button in the "Loans & Mortgages" section

## How to Add a Loan

1. Go to the **Configure** tab
2. Scroll to the **"Loans & Mortgages"** section
3. Click **"+ Add Loan"**
4. Fill in the details:
   - **Label**: Give your loan a name (e.g., "Home Mortgage", "Car Loan")
   - **Principal Balance**: The current amount you owe
   - **Interest Rate**: Annual interest rate (e.g., 6.5 for 6.5%)
   - **Payment Amount**: How much you pay each period
   - **Payment Frequency**: How often you make payments (weekly, fortnightly, monthly, yearly)
   - **Use Offset Account** (optional): Enable if you have an offset account
   - **Current Offset Balance** (if offset enabled): Current balance in your offset account

5. Click **"Results"** tab to see your projection

## Multiple Loans

You can add multiple loans (e.g., home mortgage + car loan):

1. Click **"+ Add Loan"** for each loan
2. Configure each loan separately
3. The simulation will process all loans and show:
   - Individual loan balances in the detailed table
   - Total loan balance in the summary
   - When each loan will be paid off

## Offset Account Strategy

If you have multiple loans with offset accounts enabled:
- Leftover cash each period automatically goes to the **biggest loan** with offset enabled
- This minimizes your total interest paid
- You'll see "Interest Saved" in the results showing how much you're saving

## Viewing Results

In the **Results** tab, you'll see:

1. **Key Metrics**:
   - Loan Paid Off date (when your loan reaches $0)
   - Final Net Worth
   - Financial Health status

2. **Charts**:
   - Net Worth over time (shows loan balance decreasing)
   - Cash Flow over time

3. **Detailed Table**:
   - Loan balance for each period
   - Offset balance (if enabled)
   - Interest saved (if using offset)
   - All other financial metrics

## Troubleshooting

### "My loan balance isn't showing"
- Make sure you've added a loan using the "+ Add Loan" button
- Check that the Principal Balance is greater than $0
- Refresh the page to ensure you have the latest code

### "My loan balance isn't reducing"
- Check that your Payment Amount is greater than $0
- Verify your income is sufficient to cover the loan payment
- If cash flow is negative, you may not be able to make full payments

### "I see a 'Migrated Loan' I don't recognize"
- This is your old loan data that was automatically migrated
- You can edit it to update the label and details
- Or remove it if it's no longer needed

### "I want to start fresh"
- You can remove all loans by clicking "Remove" on each loan
- Or clear all your data using your browser's developer tools:
  1. Open Developer Tools (F12)
  2. Go to Application/Storage tab
  3. Find Local Storage
  4. Delete the finance-simulation keys
  5. Refresh the page

## Need Help?

If you're still having issues:
1. Check the browser console (F12) for any error messages
2. Try clearing your browser cache and refreshing
3. Make sure you're using a modern browser (Chrome, Firefox, Edge, Safari)

## Technical Details

For developers interested in the technical changes, see:
- `LOAN_SIMULATION_FIX.md` - Complete technical documentation
- `tests/loan_simulation_test.ts` - Unit tests
- `tests/loan_ui_integration_test.ts` - UI integration tests
- `tests/loan_migration_test.ts` - Migration tests
