# Finance Simulation Tool - Design Document

## Overview

The Finance Simulation Tool is a Deno Fresh web application that models personal financial trajectories over time. The system uses a time-stepped simulation engine that processes financial events (income, expenses, loan payments, investment growth) at configurable intervals to project future financial states. The application provides an interactive interface where users can adjust parameters and immediately see updated projections, including a calculated retirement date based on sustainable withdrawal principles.

The architecture separates concerns into distinct layers: a simulation engine for financial calculations, a state management layer for user parameters, a visualization layer for charts and displays, and a persistence layer for data storage. This separation enables testing of financial logic independently from UI concerns and allows for future extensibility.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Fresh Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Input      │  │  Simulation  │  │ Visualization│  │
│  │  Islands     │  │   Island     │  │   Island     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                  Simulation Engine                       │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Time-Stepped Financial State Calculator        │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Income     │  │   Expense    │  │  Investment  │  │
│  │  Processor   │  │  Processor   │  │  Processor   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │     Loan     │  │  Retirement  │                     │
│  │  Processor   │  │  Calculator  │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Local Storage Persistence                   │
└─────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. User modifies financial parameters in Input Islands
2. Input Islands update application state
3. State change triggers Simulation Island to run simulation
4. Simulation Engine processes time-stepped calculations
5. Results are passed to Visualization Island
6. Charts and metrics are rendered
7. Parameters are persisted to Local Storage

## Components and Interfaces

### 1. Financial State Model

The core data structure representing financial state at a point in time:

```typescript
interface FinancialState {
  date: Date;
  cash: number;
  investments: number;
  superannuation: number;
  loanBalance: number;
  netWorth: number;
  cashFlow: number;
}
```

### 2. User Parameters Model

Configuration inputs from the user:

```typescript
interface UserParameters {
  // Income
  annualSalary: number;
  salaryFrequency: 'weekly' | 'fortnightly' | 'monthly';
  
  // Expenses
  monthlyLivingExpenses: number;
  monthlyRentOrMortgage: number;
  
  // Loans
  loanPrincipal: number;
  loanInterestRate: number; // annual percentage
  loanPaymentAmount: number;
  loanPaymentFrequency: 'weekly' | 'fortnightly' | 'monthly';
  
  // Investments
  monthlyInvestmentContribution: number;
  investmentReturnRate: number; // annual percentage
  currentInvestmentBalance: number;
  
  // Superannuation
  superContributionRate: number; // percentage of salary
  superReturnRate: number; // annual percentage
  currentSuperBalance: number;
  
  // Retirement
  desiredAnnualRetirementIncome: number;
  retirementAge: number;
  currentAge: number;
  
  // Simulation
  simulationYears: number;
  startDate: Date;
}
```

### 3. Simulation Engine

Core interface for running financial simulations:

```typescript
interface SimulationEngine {
  /**
   * Runs a complete simulation from start date to end date
   */
  runSimulation(params: UserParameters): SimulationResult;
  
  /**
   * Calculates financial state for a single time step
   */
  calculateTimeStep(
    currentState: FinancialState,
    params: UserParameters,
    interval: TimeInterval
  ): FinancialState;
}

interface SimulationResult {
  states: FinancialState[];
  retirementDate: Date | null;
  retirementAge: number | null;
  isSustainable: boolean;
  warnings: string[];
}

type TimeInterval = 'week' | 'month' | 'year';
```

### 4. Financial Processors

Individual processors for each financial component:

```typescript
interface IncomeProcessor {
  calculateIncome(params: UserParameters, interval: TimeInterval): number;
}

interface ExpenseProcessor {
  calculateExpenses(params: UserParameters, interval: TimeInterval): number;
}

interface LoanProcessor {
  calculateLoanPayment(
    balance: number,
    interestRate: number,
    payment: number,
    interval: TimeInterval
  ): { newBalance: number; interestPaid: number; principalPaid: number };
}

interface InvestmentProcessor {
  calculateInvestmentGrowth(
    balance: number,
    contribution: number,
    returnRate: number,
    interval: TimeInterval
  ): number;
}

interface RetirementCalculator {
  findRetirementDate(
    states: FinancialState[],
    desiredIncome: number,
    currentAge: number,
    retirementAge: number
  ): { date: Date | null; age: number | null };
  
  calculateSafeWithdrawal(
    investments: number,
    superannuation: number,
    age: number
  ): number;
}
```

### 5. Persistence Layer

```typescript
interface StorageService {
  saveParameters(params: UserParameters): void;
  loadParameters(): UserParameters | null;
  clearParameters(): void;
}
```

### 6. Fresh Islands

**InputIsland**: Handles user parameter inputs
- Renders form fields for all financial parameters
- Validates input values
- Emits parameter changes to parent

**SimulationIsland**: Orchestrates simulation execution
- Receives parameter updates
- Triggers simulation engine
- Manages loading states
- Passes results to visualization

**VisualizationIsland**: Renders charts and metrics
- Displays net worth over time chart
- Shows cash flow chart
- Renders key metrics (retirement date, current net worth, etc.)
- Provides time granularity selector

## Data Models

### Time-Stepped Calculation Model

The simulation operates on discrete time intervals. For each interval:

1. **Income Phase**: Add salary income based on payment frequency
2. **Expense Phase**: Deduct living expenses and rent/mortgage
3. **Loan Phase**: Process loan payment (interest + principal)
4. **Investment Phase**: Add contributions and apply growth
5. **Super Phase**: Add contributions and apply growth
6. **State Update**: Calculate net worth and cash flow

### Interval Conversion

All rates and frequencies are normalized to the simulation interval:

- Weekly interval: 52 weeks per year
- Monthly interval: 12 months per year
- Yearly interval: 1 year per year

Interest rates and return rates are converted from annual to interval-specific rates using:
```
intervalRate = (1 + annualRate) ^ (interval / year) - 1
```

### Net Worth Calculation

```
netWorth = cash + investments + superannuation - loanBalance
```

### Cash Flow Calculation

```
cashFlow = income - expenses - loanPayment - investmentContribution
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Input validation consistency
*For any* financial parameter input, the system should accept all positive numeric values and reject all non-positive or non-numeric values consistently across all input fields.
**Validates: Requirements 1.2, 1.3, 1.4**

### Property 2: Parameter persistence round-trip
*For any* valid set of user parameters, saving them and then loading them should produce an equivalent parameter set with all values preserved.
**Validates: Requirements 1.5, 9.1, 9.2, 9.5**

### Property 3: Simulation completeness
*For any* valid user parameters and simulation duration, running a simulation should produce financial states for every time interval from start date to end date with no gaps.
**Validates: Requirements 2.1**

### Property 4: Loan balance calculation correctness
*For any* loan with positive balance, interest rate, and payment amount, calculating the next period's balance should correctly apply interest to the current balance and reduce it by the payment amount (split between interest and principal).
**Validates: Requirements 2.3**

### Property 5: Investment compound growth
*For any* investment balance, contribution amount, and return rate, calculating growth over multiple periods should produce the same result as the compound interest formula: FV = PV × (1 + r)^n + PMT × [((1 + r)^n - 1) / r].
**Validates: Requirements 2.4**

### Property 6: Superannuation calculation correctness
*For any* superannuation balance, contribution rate, and return rate, the updated balance should equal the previous balance plus contributions plus growth on the total.
**Validates: Requirements 2.5**

### Property 7: Time interval aggregation
*For any* completed simulation, grouping results by weekly, monthly, or yearly intervals should produce non-overlapping time periods that cover the entire simulation duration.
**Validates: Requirements 3.1**

### Property 8: Financial state completeness
*For any* financial state in simulation results, it should contain all required fields: date, cash, investments, superannuation, loan balance, net worth, and cash flow.
**Validates: Requirements 3.2**

### Property 9: Currency formatting consistency
*For any* numeric currency value, formatting it should produce a string with a currency symbol, proper thousands separators, and exactly two decimal places.
**Validates: Requirements 3.3**

### Property 10: Chronological ordering invariant
*For any* simulation result, the financial states should be ordered such that each state's date is greater than or equal to the previous state's date.
**Validates: Requirements 3.4**

### Property 11: Retirement date correctness
*For any* simulation where total assets exceed the amount needed for sustainable withdrawal at the desired income level, the calculated retirement date should be the earliest date where this condition is met and remains true thereafter.
**Validates: Requirements 4.1**

### Property 12: Safe withdrawal rate application
*For any* investment and superannuation balance at retirement age, the calculated sustainable withdrawal should equal the sum of balances multiplied by the safe withdrawal rate (typically 4% annually).
**Validates: Requirements 4.3**

### Property 13: Parameter change triggers simulation
*For any* modification to user parameters, the system should automatically execute a new simulation run and produce updated results that differ from the previous results.
**Validates: Requirements 5.1, 5.2**

### Property 14: Mortgage payment impact
*For any* two simulations that differ only in mortgage payment amount, the simulation with higher payments should result in an earlier loan payoff date and lower total interest paid.
**Validates: Requirements 5.4**

### Property 15: Investment contribution impact
*For any* two simulations that differ only in investment contribution rate, the simulation with higher contributions should result in higher final investment balance and earlier retirement date (if retirement is achievable).
**Validates: Requirements 5.5**

### Property 16: Negative cash flow handling
*For any* time period where expenses exceed income, the system should reduce available cash by the deficit amount, and if cash becomes negative, should either increase debt or prevent investment contributions.
**Validates: Requirements 7.1, 7.2**

### Property 17: Variable return rate support
*For any* simulation with variable investment return rates specified for different periods, the investment growth calculation should apply the correct rate for each period rather than using a single fixed rate.
**Validates: Requirements 7.4**

### Property 18: Superannuation accessibility by age
*For any* simulation, superannuation funds should only be included in retirement calculations when the user's age reaches the preservation age threshold (typically 60 in Australia).
**Validates: Requirements 7.5**

### Property 19: Data clearing completeness
*For any* stored financial parameters, executing a clear operation should result in local storage containing no financial parameter data.
**Validates: Requirements 9.4**

### Property 20: Sustainability indication
*For any* simulation result, the system should indicate "sustainable" if net worth is non-decreasing and all obligations can be met, or "unsustainable" if debt is increasing or cash flow is consistently negative.
**Validates: Requirements 10.1**

### Property 21: Debt increase warning
*For any* simulation where loan balance increases over time, the system should display a warning indicator highlighting the increasing debt.
**Validates: Requirements 10.2**

### Property 22: Negative cash flow alert
*For any* simulation with three or more consecutive periods of negative cash flow, the system should display an alert indicating the unsustainable situation.
**Validates: Requirements 10.4**

### Property 23: Net worth growth indication
*For any* simulation where net worth at the end exceeds net worth at the start, the system should display positive trend indicators.
**Validates: Requirements 10.5**

## Error Handling

### Input Validation Errors

- **Invalid numeric input**: Display inline error message, prevent form submission
- **Negative values**: Show error indicating values must be positive
- **Missing required fields**: Highlight missing fields, provide clear guidance
- **Out-of-range values**: Validate reasonable bounds (e.g., interest rates 0-100%)

### Simulation Errors

- **Unsustainable scenario**: Flag scenario as unsustainable, show specific issues (negative cash, increasing debt)
- **Infinite loop detection**: Limit simulation to maximum iterations, timeout after reasonable duration
- **Numerical overflow**: Handle very large numbers gracefully, show warning if values exceed safe limits
- **Division by zero**: Prevent division by zero in calculations, use safe defaults

### Storage Errors

- **Local storage unavailable**: Fall back to in-memory storage, notify user data won't persist
- **Quota exceeded**: Clear old data or notify user to free space
- **Corrupted data**: Use default values, log error, notify user
- **Serialization failure**: Catch JSON errors, use defaults, notify user

### Display Errors

- **Chart rendering failure**: Show error message, fall back to table view
- **Missing data**: Display "No data available" message
- **Invalid date ranges**: Validate date inputs, show error for invalid ranges

## Testing Strategy

### Unit Testing

The application will use Deno's built-in test runner for unit tests. Unit tests will focus on:

- **Individual processor functions**: Test income, expense, loan, investment, and super calculations with specific examples
- **Edge cases**: Empty inputs, zero values, boundary conditions
- **Error conditions**: Invalid inputs, corrupted data, storage failures
- **Integration points**: Component interactions, data flow between layers

Example unit tests:
- Loan payment calculation with specific values
- Investment growth with zero contribution
- Retirement calculation when retirement is not achievable
- Currency formatting with edge cases (zero, very large numbers)

### Property-Based Testing

The application will use **fast-check** (a TypeScript property-based testing library) for property-based tests. Each property-based test will:

- Run a minimum of 100 iterations with randomly generated inputs
- Be tagged with a comment referencing the specific correctness property from this design document
- Use the format: `// Feature: finance-simulation, Property N: [property text]`

Property-based tests will verify:

- **Mathematical correctness**: Compound interest, loan amortization, net worth calculations
- **Invariants**: Chronological ordering, data completeness, non-negative balances (where applicable)
- **Round-trip properties**: Parameter persistence, serialization/deserialization
- **Metamorphic properties**: Increasing contributions leads to better outcomes, higher payments reduce debt faster
- **Input validation**: All positive numbers accepted, all invalid inputs rejected

Each correctness property listed above will be implemented as a single property-based test. The tests will generate random but valid financial scenarios and verify the properties hold across all generated cases.

### Integration Testing

- **End-to-end user flows**: Complete simulation from parameter input to result display
- **State management**: Parameter changes triggering simulations and UI updates
- **Persistence**: Save, reload, and verify data across sessions
- **Chart rendering**: Verify charts display correct data

### Test Organization

```
tests/
├── unit/
│   ├── processors/
│   │   ├── income_test.ts
│   │   ├── expense_test.ts
│   │   ├── loan_test.ts
│   │   ├── investment_test.ts
│   │   └── retirement_test.ts
│   ├── simulation_engine_test.ts
│   └── storage_test.ts
├── property/
│   ├── calculation_properties_test.ts
│   ├── persistence_properties_test.ts
│   ├── validation_properties_test.ts
│   └── simulation_properties_test.ts
└── integration/
    ├── simulation_flow_test.ts
    └── ui_interaction_test.ts
```

## Performance Considerations

### Simulation Performance

- **Incremental calculation**: Calculate only changed intervals when parameters update
- **Web Workers**: Consider offloading simulation to web worker for long-running calculations
- **Memoization**: Cache intermediate results for common parameter combinations
- **Lazy evaluation**: Calculate detailed intervals only when user requests specific granularity

### Rendering Performance

- **Virtual scrolling**: For large result sets, render only visible items
- **Chart optimization**: Use canvas-based charts for better performance with large datasets
- **Debouncing**: Debounce parameter input changes to avoid excessive simulation runs
- **Progressive rendering**: Show results incrementally as simulation progresses

### Storage Performance

- **Compression**: Compress stored data to reduce storage footprint
- **Selective persistence**: Only persist changed parameters, not entire result sets
- **Batch updates**: Batch multiple parameter changes before triggering simulation

## Security Considerations

- **Input sanitization**: Validate and sanitize all user inputs to prevent injection attacks
- **Local storage limits**: Respect browser storage quotas, handle quota exceeded gracefully
- **No sensitive data**: Application stores only financial parameters, no personal identification
- **Client-side only**: All calculations performed client-side, no data sent to servers
- **XSS prevention**: Properly escape all user-generated content in UI

## Future Extensibility

### Planned Extensions

- **Multiple scenarios**: Save and compare multiple what-if scenarios side-by-side
- **Tax calculations**: Include tax implications in income and investment calculations
- **Inflation adjustment**: Apply inflation rates to future expenses and income
- **Monte Carlo simulation**: Run probabilistic simulations with variable market returns
- **Goal tracking**: Set specific financial goals and track progress
- **Export functionality**: Export results to CSV, PDF, or other formats

### Architecture Support for Extensions

- **Processor pattern**: Easy to add new financial processors (tax, inflation, etc.)
- **Plugin architecture**: Processors can be added without modifying core engine
- **Extensible data model**: Financial state can be extended with additional fields
- **Configurable intervals**: Support for custom time intervals beyond week/month/year
