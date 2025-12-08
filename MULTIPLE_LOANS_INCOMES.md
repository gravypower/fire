# Multiple Loans, Incomes, and Super Accounts Feature

## Overview
The application now supports multiple income sources, multiple loans, and multiple superannuation accounts, allowing for more realistic financial modeling for individuals and couples.

## Changes Made

### 1. Type Definitions (types/financial.ts)
- Updated `PaymentFrequency` type to include "yearly" option
- Added `IncomeSource` interface with fields: id, label, amount, frequency, isBeforeTax
- Added `Loan` interface with fields: id, label, principal, interestRate, paymentAmount, paymentFrequency
- Added `SuperAccount` interface with fields: id, label, balance, contributionRate, returnRate
- Updated `UserParameters` to include optional arrays:
  - `incomeSources?: IncomeSource[]` - Multiple income sources
  - `loans?: Loan[]` - Multiple loans
  - `superAccounts?: SuperAccount[]` - Multiple super accounts
- Updated `FinancialState` to include:
  - `loanBalances?: { [loanId: string]: number }` - Track individual loan balances
  - `superBalances?: { [superId: string]: number }` - Track individual super balances
- Legacy fields maintained for backward compatibility

### 2. Processors (lib/processors.ts)
- **IncomeProcessor**:
  - Added `calculateTotalAnnualIncome()` - Sums all before-tax income sources
  - Added `calculateTotalAnnualAfterTaxIncome()` - Sums all after-tax income sources
  - Updated `calculateIncome()` to combine both before-tax and after-tax income
  - Handles "yearly" frequency option
  - Falls back to legacy `annualSalary` field if no income sources defined
  
- **LoanProcessor**:
  - Added `calculateTotalLoanPayment()` - Sums all loan payments
  - Handles conversion of different payment frequencies
  - Falls back to legacy single loan fields if no loans array defined

### 3. Simulation Engine (lib/simulation_engine.ts)
- Updated `calculateTimeStep()` to process multiple loans:
  - Iterates through all loans in the array
  - Tracks individual loan balances by loan ID
  - Handles partial payments when cash is insufficient
  - Distributes offset account benefits across all loans
  
- Updated `calculateTimeStep()` to process multiple super accounts:
  - Iterates through all super accounts in the array
  - Tracks individual super balances by super ID
  - Each account has its own contribution rate and return rate
  - Sums all balances for total superannuation
  
- Updated initial state creation in both:
  - `runSimulation()` - Single scenario
  - `runSimulationWithTransitions()` - Multiple scenarios with transitions
  
- Maintains backward compatibility with legacy single loan and super fields

### 4. User Interface (islands/InputIsland.tsx)
- **Income Section**:
  - Added "+ Add Income" button (with preventDefault to avoid tab switching)
  - Shows list of income sources with editable fields:
    - Label (text input)
    - Amount (number input)
    - Frequency (dropdown: weekly/fortnightly/monthly/yearly)
    - Before Tax checkbox (determines if income is taxable)
  - Remove button for each income source
  - Falls back to legacy single salary input if no income sources
  
- **Loans Section**:
  - Added "+ Add Loan" button (with preventDefault to avoid tab switching)
  - Shows list of loans with editable fields:
    - Label (text input for description)
    - Principal Balance (number input)
    - Interest Rate (number input)
    - Payment Amount (number input)
    - Payment Frequency (dropdown: weekly/fortnightly/monthly/yearly)
  - Remove button for each loan
  - Falls back to legacy single loan inputs if no loans array

- **Superannuation Section**:
  - Added "+ Add Super" button (with preventDefault to avoid tab switching)
  - Shows list of super accounts with editable fields:
    - Label (text input for description, e.g., "Partner 1 Super", "Partner 2 Super")
    - Current Balance (number input)
    - Contribution Rate (percentage of gross income)
    - Return Rate (expected annual return percentage)
  - Remove button for each super account
  - Falls back to legacy single super inputs if no super accounts array

- **Handler Functions**:
  - `addIncomeSource(e)` - Creates new income with unique ID, prevents default
  - `removeIncomeSource(index)` - Removes income at index
  - `updateIncomeSource(index, field, value)` - Updates specific field
  - `addLoan(e)` - Creates new loan with unique ID, prevents default
  - `removeLoan(index)` - Removes loan at index
  - `updateLoan(index, field, value)` - Updates specific field
  - `addSuperAccount(e)` - Creates new super account with unique ID, prevents default
  - `removeSuperAccount(index)` - Removes super account at index
  - `updateSuperAccount(index, field, value)` - Updates specific field

## Usage

### Adding Multiple Income Sources
1. Click "+ Add Income" button in the Income section
2. Enter a label (e.g., "Main Job", "Side Business", "Rental Income", "Partner's Salary")
3. Enter the amount and select frequency (weekly/fortnightly/monthly/yearly)
4. Check "Before tax" if this income is taxable (unchecked means after-tax income)
5. Add more income sources as needed
6. Remove any income source using the "Remove" button

### Adding Multiple Loans
1. Click "+ Add Loan" button in the Loans section
2. Enter a label (e.g., "Home Mortgage", "Car Loan", "Personal Loan")
3. Enter principal balance, interest rate, payment amount, and frequency
4. Add more loans as needed
5. Remove any loan using the "Remove" button

### Adding Multiple Super Accounts (For Couples)
1. Click "+ Add Super" button in the Superannuation section
2. Enter a label (e.g., "Partner 1 Super", "Partner 2 Super", "Self-Managed Super")
3. Enter current balance, contribution rate (% of gross income), and expected return rate
4. Add more super accounts as needed (useful for couples planning together)
5. Remove any super account using the "Remove" button

## Backward Compatibility
- All legacy fields are maintained
- If no `incomeSources` array exists, uses `annualSalary` field
- If no `loans` array exists, uses single loan fields (`loanPrincipal`, etc.)
- If no `superAccounts` array exists, uses single super fields (`currentSuperBalance`, etc.)
- Existing saved configurations will continue to work
- Users can migrate to new system by clicking "+ Add Income", "+ Add Loan", or "+ Add Super"

## Technical Notes
- Each income source, loan, and super account has a unique ID generated using timestamp
- Loan balances are tracked individually in the simulation state
- Super balances are tracked individually in the simulation state
- Total loan balance is calculated as sum of all individual balances
- Total super balance is calculated as sum of all individual balances
- Offset account benefits are distributed across all loans proportionally
- Before-tax income is subject to tax calculation, after-tax income is not
- All calculations maintain precision using proper frequency conversions
- "Yearly" frequency option added for annual bonuses, dividends, etc.

## Use Cases
- **Couples**: Add separate income sources and super accounts for each partner
- **Multiple Jobs**: Track primary job, side hustles, and passive income separately
- **Complex Debt**: Model home mortgage, car loans, and personal loans independently
- **Tax Planning**: Separate before-tax and after-tax income for accurate tax calculations
- **Retirement Planning**: Track multiple super accounts with different contribution rates
