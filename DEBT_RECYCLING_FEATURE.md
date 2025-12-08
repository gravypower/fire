# Debt Recycling Feature

## Overview

Debt recycling is a tax strategy where loan interest can be claimed as a tax deduction, effectively reducing your taxable income. This feature has been implemented to allow users to configure loans as "debt recycling" loans, where the interest paid is automatically deducted from taxable income during simulation.

## What is Debt Recycling?

Debt recycling is an investment strategy where you use borrowed funds (typically from a home loan or investment loan) to invest in income-producing assets. The key benefit is that the interest on the loan becomes tax deductible, which can significantly reduce your tax burden and accelerate wealth building.

### Example Scenario

- You have a $500,000 home loan at 6% interest
- You have $50,000 in your offset account
- Instead of keeping the $50,000 in offset, you:
  1. Use it to invest in shares/property
  2. Redraw $50,000 from your loan for investment purposes
  3. The interest on that $50,000 portion becomes tax deductible

## How It Works in the Simulator

### 1. Loan Configuration

When configuring a loan, you can now enable the "Debt Recycling" option:

```typescript
{
  id: "loan-1",
  label: "Investment Loan",
  principal: 300000,
  interestRate: 6.5,
  paymentAmount: 2000,
  paymentFrequency: "monthly",
  isDebtRecycling: true  // Enable debt recycling
}
```

### 2. Interest Calculation

For each simulation period:
- Interest is calculated on the effective loan balance (after offset)
- If `isDebtRecycling` is enabled, this interest is tracked as deductible
- The deductible interest is accumulated across all debt recycling loans

### 3. Tax Calculation

The tax calculation is modified to account for deductible interest:

```
Taxable Income = Gross Income - Deductible Interest
Tax Paid = Calculate Tax on Taxable Income (using progressive brackets)
```

This means:
- Higher income earners benefit more (higher marginal tax rate)
- Interest deductions reduce tax in the same period they're paid
- The tax savings increase your net cash flow

### 4. Financial State Tracking

Each financial state now includes:
- `deductibleInterest`: The amount of tax-deductible interest paid in that period
- This is displayed in the simulation results and can be tracked over time

## Using the Feature

### Step 1: Add or Edit a Loan

1. Navigate to the "Loans & Mortgages" section
2. Click "+ Add Loan" or edit an existing loan
3. Configure the loan details (principal, interest rate, payment amount)

### Step 2: Enable Debt Recycling

1. Scroll to the "Enable Debt Recycling" checkbox
2. Check the box to enable tax-deductible interest
3. Read the warning about proper usage

### Step 3: Review Tax Impact

After running the simulation:
- Your tax paid will be lower due to interest deductions
- Net cash flow will improve
- The timeline will show the cumulative tax savings

## Important Considerations

### ⚠️ Tax Compliance

**This feature is for simulation purposes only.** Debt recycling has specific tax rules:

1. **Purpose Test**: The borrowed funds must be used for income-producing investments
2. **Documentation**: You must maintain clear records of how funds are used
3. **Apportionment**: If a loan is used for both deductible and non-deductible purposes, you must apportion the interest
4. **Tax Law**: Rules vary by jurisdiction (Australia, US, etc.)

**Always consult a qualified tax professional or financial advisor before implementing debt recycling strategies.**

### When to Use This Feature

✅ **Appropriate scenarios:**
- Investment property loans
- Margin loans for shares
- Business loans for income-producing activities
- Loans explicitly used to purchase income-producing assets

❌ **Inappropriate scenarios:**
- Owner-occupied home loans (not tax deductible in most jurisdictions)
- Personal loans for consumption
- Car loans (unless for business use)
- Credit cards

### Combining with Offset Accounts

You can use both offset accounts and debt recycling together:

1. **Offset reduces interest**: Offset balance reduces the effective loan balance
2. **Deductible interest**: Only the interest actually paid (after offset) is deductible
3. **Strategy**: You might choose to keep less in offset to maximize deductible interest

Example:
- Loan: $400,000 at 6%
- Offset: $100,000
- Effective balance: $300,000
- Annual interest: $300,000 × 6% = $18,000 (deductible)
- Interest saved by offset: $100,000 × 6% = $6,000 (not deductible, but saves money)

## Technical Implementation

### Type Definitions

```typescript
// Loan interface (types/financial.ts)
interface Loan {
  id: string;
  label: string;
  principal: number;
  interestRate: number;
  paymentAmount: number;
  paymentFrequency: PaymentFrequency;
  hasOffset?: boolean;
  offsetBalance?: number;
  autoPayoutWhenOffsetFull?: boolean;
  isDebtRecycling?: boolean;  // NEW: Enable tax deductions
}

// Financial state (types/financial.ts)
interface FinancialState {
  // ... other fields
  deductibleInterest?: number;  // NEW: Track deductible interest
}
```

### Calculation Flow

1. **Loan Processing** (`lib/processors.ts`):
   ```typescript
   calculateLoanPayment(
     balance, offsetBalance, interestRate, payment, interval,
     useOffset, isDebtRecycling  // NEW parameter
   )
   ```
   - Returns `deductibleInterest` in addition to other values

2. **Simulation Engine** (`lib/simulation_engine.ts`):
   - Accumulates deductible interest from all loans
   - Converts to annual amount for tax calculation
   - Calculates taxable income = gross income - deductible interest
   - Applies progressive tax brackets to taxable income

3. **UI** (`islands/InputIsland.tsx`):
   - Checkbox to enable/disable debt recycling per loan
   - Warning message about proper usage
   - Visual indication (green background) for debt recycling section

## Benefits in Simulation

### Tax Savings

For a $300,000 investment loan at 6% interest:
- Annual interest: $18,000
- If your marginal tax rate is 37%:
  - Tax saving: $18,000 × 37% = $6,660 per year
  - Effective interest rate: 6% × (1 - 0.37) = 3.78%

### Improved Cash Flow

The tax savings improve your net cash flow:
- More cash available for investments
- Faster loan repayment (if desired)
- Better retirement outcomes

### Long-term Wealth Building

Over 20-30 years, the compounding effect of tax savings can be substantial:
- Reinvest tax savings into investments
- Accelerate wealth accumulation
- Achieve financial goals sooner

## Example Scenarios

### Scenario 1: Investment Property

```typescript
{
  id: "investment-property",
  label: "Investment Property Loan",
  principal: 500000,
  interestRate: 6.5,
  paymentAmount: 3200,
  paymentFrequency: "monthly",
  hasOffset: false,
  isDebtRecycling: true  // Interest is tax deductible
}
```

### Scenario 2: Share Portfolio Loan

```typescript
{
  id: "share-loan",
  label: "Margin Loan for Shares",
  principal: 100000,
  interestRate: 7.5,
  paymentAmount: 800,
  paymentFrequency: "monthly",
  hasOffset: true,
  offsetBalance: 20000,
  isDebtRecycling: true  // Interest is tax deductible
}
```

### Scenario 3: Mixed Portfolio

You can have multiple loans with different configurations:
- Home loan (not debt recycling)
- Investment property loan (debt recycling enabled)
- Car loan (not debt recycling)

The simulator will correctly calculate tax deductions only for the debt recycling loans.

## Future Enhancements

Potential improvements for this feature:

1. **Partial Debt Recycling**: Allow specifying what percentage of a loan is used for investment
2. **Rental Income**: Track rental income from investment properties
3. **Depreciation**: Include depreciation deductions for investment properties
4. **Capital Gains**: Model capital gains tax on investment sales
5. **Negative Gearing**: Explicitly model negative gearing scenarios

## Support and Questions

For questions about:
- **Technical implementation**: Review the code in `lib/simulation_engine.ts` and `lib/processors.ts`
- **Tax implications**: Consult a qualified tax professional
- **Financial strategy**: Speak with a licensed financial advisor

## Disclaimer

This simulation tool is for educational and planning purposes only. It does not constitute financial or tax advice. Tax laws are complex and vary by jurisdiction. Always seek professional advice before implementing any debt recycling or tax strategy.

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Author**: Financial Simulation Tool Team
