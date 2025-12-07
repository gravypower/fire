# Offset Account and Tax Features

## Overview
Added offset account functionality and income tax tracking to the financial simulation tool.

## New Features

### 1. Offset Account
- **What it does**: Automatically moves leftover cash into an offset account that reduces the effective loan balance for interest calculations
- **How it works**: 
  - After all expenses, loan payments, and investments are made, any remaining positive cash is transferred to the offset account
  - The offset balance reduces the loan balance used for interest calculations (not the principal)
  - Interest saved is tracked and displayed
- **Configuration**:
  - Toggle "Use Offset Account" checkbox in the Loans section
  - Set initial offset balance if you already have one

### 2. Income Tax
- **What it does**: Deducts income tax from your gross salary before other calculations
- **How it works**:
  - Tax is calculated on gross income at the rate you specify
  - Net income (after tax) is used for expenses, loan payments, and investments
  - Total tax paid over the simulation period is tracked and displayed
- **Configuration**:
  - Set "Income Tax Rate (%)" in the Income section (e.g., 30 for 30%)

## Changes Made

### Type Definitions (`types/financial.ts`)
- Added `incomeTaxRate` to UserParameters
- Added `useOffsetAccount` and `currentOffsetBalance` to UserParameters
- Added `offsetBalance`, `taxPaid`, and `interestSaved` to FinancialState

### Processors (`lib/processors.ts`)
- Updated `LoanProcessor.calculateLoanPayment()` to accept offset balance and calculate interest savings
- Added `IncomeProcessor.calculateTax()` to calculate income tax

### Simulation Engine (`lib/simulation_engine.ts`)
- Modified calculation sequence to:
  1. Calculate gross income and deduct tax
  2. Process expenses
  3. Process loan payments with offset account consideration
  4. Process investments
  5. Process superannuation
  6. Transfer leftover cash to offset account (if enabled)
- Updated net worth calculation to include offset balance

### User Interface (`islands/InputIsland.tsx`)
- Added "Income Tax Rate (%)" field in Income section
- Added "Use Offset Account" checkbox in Loans section
- Added "Current Offset Balance" field (shown when offset is enabled)
- Updated default parameters to include new fields

### Visualization (`islands/VisualizationIsland.tsx`)
- Added display of final offset balance in summary statistics
- Added display of total tax paid over simulation period
- Added display of total interest saved from offset account
- Added offset balance, tax, and interest saved columns to data table

## Example Usage

### Scenario: Mortgage with Offset Account
1. Set your loan details (principal, interest rate, payment amount)
2. Enable "Use Offset Account"
3. Set your income tax rate (e.g., 30%)
4. Run simulation
5. View how leftover funds accumulate in the offset account and reduce interest payments

### Benefits
- See exactly how much tax you're paying over time
- Understand the interest savings from using an offset account
- Make informed decisions about whether to pay down the loan faster or use an offset account
