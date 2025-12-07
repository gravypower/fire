# Implementation Plan

- [x] 1. Initialize Deno Fresh project and setup





  - Create new Fresh project with Deno
  - Configure TypeScript settings for strict type checking
  - Set up project directory structure (islands/, components/, lib/, types/)
  - Install fast-check for property-based testing
  - _Requirements: 8.1_

- [ ] 2. Define core data models and types
  - Create TypeScript interfaces for FinancialState
  - Create TypeScript interfaces for UserParameters
  - Create types for TimeInterval, SimulationResult
  - Add validation helper functions for parameter bounds
  - _Requirements: 1.2, 1.3, 1.4_

- [ ]* 2.1 Write property test for input validation
  - **Property 1: Input validation consistency**
  - **Validates: Requirements 1.2, 1.3, 1.4**

- [ ] 3. Implement financial processor modules
  - Create IncomeProcessor with calculateIncome function
  - Create ExpenseProcessor with calculateExpenses function
  - Create LoanProcessor with calculateLoanPayment function
  - Create InvestmentProcessor with calculateInvestmentGrowth function
  - Create RetirementCalculator with findRetirementDate and calculateSafeWithdrawal functions
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 4.1, 4.3_

- [ ]* 3.1 Write property test for loan balance calculation
  - **Property 4: Loan balance calculation correctness**
  - **Validates: Requirements 2.3**

- [ ]* 3.2 Write property test for investment compound growth
  - **Property 5: Investment compound growth**
  - **Validates: Requirements 2.4**

- [ ]* 3.3 Write property test for superannuation calculation
  - **Property 6: Superannuation calculation correctness**
  - **Validates: Requirements 2.5**

- [ ]* 3.4 Write property test for safe withdrawal rate
  - **Property 12: Safe withdrawal rate application**
  - **Validates: Requirements 4.3**

- [ ] 4. Build simulation engine core
  - Implement SimulationEngine interface with runSimulation method
  - Implement calculateTimeStep method that orchestrates all processors
  - Add interval conversion utilities (annual rates to weekly/monthly)
  - Implement net worth and cash flow calculations
  - Handle negative cash flow scenarios (reduce cash, prevent investments)
  - _Requirements: 2.1, 2.2, 7.1, 7.2_

- [ ]* 4.1 Write property test for simulation completeness
  - **Property 3: Simulation completeness**
  - **Validates: Requirements 2.1**

- [ ]* 4.2 Write property test for chronological ordering
  - **Property 10: Chronological ordering invariant**
  - **Validates: Requirements 3.4**

- [ ]* 4.3 Write property test for negative cash flow handling
  - **Property 16: Negative cash flow handling**
  - **Validates: Requirements 7.1, 7.2**

- [ ]* 4.4 Write unit test for operation sequence
  - Test that income, expenses, loans, and investments are applied in correct order
  - _Requirements: 2.2_

- [ ] 5. Implement retirement calculation logic
  - Add retirement date finder that scans simulation states
  - Implement sustainable withdrawal calculation with 4% rule
  - Handle superannuation preservation age logic (age 60 threshold)
  - Return null when retirement is not achievable
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 7.5_

- [ ]* 5.1 Write property test for retirement date correctness
  - **Property 11: Retirement date correctness**
  - **Validates: Requirements 4.1**

- [ ]* 5.2 Write property test for superannuation accessibility
  - **Property 18: Superannuation accessibility by age**
  - **Validates: Requirements 7.5**

- [ ]* 5.3 Write unit test for retirement edge cases
  - Test scenario where retirement is not achievable
  - Test scenario at preservation age boundary
  - _Requirements: 4.5_

- [ ] 6. Create local storage persistence layer
  - Implement StorageService interface with saveParameters, loadParameters, clearParameters
  - Add JSON serialization/deserialization for UserParameters
  - Handle corrupted data with try-catch and default fallback
  - Add error handling for quota exceeded and storage unavailable
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ]* 6.1 Write property test for parameter persistence round-trip
  - **Property 2: Parameter persistence round-trip**
  - **Validates: Requirements 9.1, 9.2, 9.5**

- [ ]* 6.2 Write property test for data clearing
  - **Property 19: Data clearing completeness**
  - **Validates: Requirements 9.4**

- [ ]* 6.3 Write unit test for corrupted data handling
  - Test that corrupted JSON falls back to defaults
  - _Requirements: 9.3_

- [ ] 7. Build result aggregation and formatting utilities
  - Create function to group simulation states by time interval (weekly/monthly/yearly)
  - Implement currency formatting function with symbol and decimal precision
  - Add function to extract financial state completeness (all required fields)
  - Create sustainability checker (increasing debt, negative cash flow detection)
  - _Requirements: 3.1, 3.2, 3.3, 10.1_

- [ ]* 7.1 Write property test for time interval aggregation
  - **Property 7: Time interval aggregation**
  - **Validates: Requirements 3.1**

- [ ]* 7.2 Write property test for financial state completeness
  - **Property 8: Financial state completeness**
  - **Validates: Requirements 3.2**

- [ ]* 7.3 Write property test for currency formatting
  - **Property 9: Currency formatting consistency**
  - **Validates: Requirements 3.3**

- [ ]* 7.4 Write property test for sustainability indication
  - **Property 20: Sustainability indication**
  - **Validates: Requirements 10.1**

- [ ] 8. Create InputIsland component
  - Build Fresh island with form inputs for all UserParameters
  - Add input validation with error messages for invalid values
  - Implement onChange handlers that update parent state
  - Load saved parameters from storage on mount
  - Save parameters to storage on change
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 9.1, 9.2_

- [ ]* 8.1 Write unit test for initial render
  - Test that all required input fields are present
  - _Requirements: 1.1_

- [ ] 9. Create SimulationIsland component
  - Build Fresh island that receives UserParameters as props
  - Trigger simulation engine when parameters change
  - Manage loading state during simulation execution
  - Pass SimulationResult to child components
  - Handle simulation errors gracefully
  - _Requirements: 5.1, 5.2_

- [ ]* 9.1 Write property test for parameter change triggering
  - **Property 13: Parameter change triggers simulation**
  - **Validates: Requirements 5.1, 5.2**

- [ ] 10. Implement warning and indicator logic
  - Create function to detect increasing debt over time
  - Create function to detect consecutive negative cash flow periods (3+)
  - Create function to detect net worth growth
  - Add warning/alert generation for unsustainable scenarios
  - _Requirements: 7.3, 10.2, 10.4, 10.5_

- [ ]* 10.1 Write property test for debt increase warning
  - **Property 21: Debt increase warning**
  - **Validates: Requirements 10.2**

- [ ]* 10.2 Write property test for negative cash flow alert
  - **Property 22: Negative cash flow alert**
  - **Validates: Requirements 10.4**

- [ ]* 10.3 Write property test for net worth growth indication
  - **Property 23: Net worth growth indication**
  - **Validates: Requirements 10.5**

- [ ]* 10.4 Write unit test for unsustainable scenario flagging
  - Test that loan payments exceeding cash triggers unsustainable flag
  - _Requirements: 7.3_

- [ ] 11. Create VisualizationIsland component
  - Build Fresh island that receives SimulationResult as props
  - Display key metrics: retirement date, current net worth, sustainability status
  - Show warnings and alerts from indicator logic
  - Add time granularity selector (weekly/monthly/yearly)
  - Render filtered results based on selected granularity
  - _Requirements: 3.5, 4.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 11.1 Write unit test for granularity selector
  - Test that selecting each granularity filters results correctly
  - _Requirements: 3.5_

- [ ]* 11.2 Write unit test for retirement display
  - Test that retirement date and age are displayed when found
  - _Requirements: 4.4_

- [ ]* 11.3 Write unit test for positive outcome display
  - Test that achievable retirement shows positive outcome
  - _Requirements: 10.3_

- [ ] 12. Add chart visualization with Chart.js or similar
  - Install and configure charting library (Chart.js or Recharts)
  - Create NetWorthChart component showing net worth over time
  - Create CashFlowChart component showing cash flow over time
  - Configure charts with time on x-axis, currency on y-axis
  - Use distinct colors for different metrics
  - Add hover tooltips showing exact values and dates
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 12.1 Write unit tests for chart rendering
  - Test that chart elements are present in DOM
  - Test that axes are configured correctly
  - Test that distinct colors are used for metrics
  - Test that tooltips appear on hover
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 13. Implement what-if scenario comparison features
  - Add property tests for mortgage payment impact
  - Add property tests for investment contribution impact
  - Add support for variable investment return rates
  - _Requirements: 5.4, 5.5, 7.4_

- [ ]* 13.1 Write property test for mortgage payment impact
  - **Property 14: Mortgage payment impact**
  - **Validates: Requirements 5.4**

- [ ]* 13.2 Write property test for investment contribution impact
  - **Property 15: Investment contribution impact**
  - **Validates: Requirements 5.5**

- [ ]* 13.3 Write property test for variable return rate support
  - **Property 17: Variable return rate support**
  - **Validates: Requirements 7.4**

- [ ] 14. Create main page route
  - Build Fresh route at routes/index.tsx
  - Compose InputIsland, SimulationIsland, and VisualizationIsland
  - Set up state management for UserParameters
  - Add page title and basic styling
  - Implement responsive layout
  - _Requirements: 8.2, 8.3, 8.4_

- [ ] 15. Add styling and UI polish
  - Create CSS/Tailwind styles for all components
  - Ensure responsive design for mobile and desktop
  - Add loading spinners for simulation execution
  - Style error messages and validation feedback
  - Add smooth transitions for chart updates
  - _Requirements: 6.5_

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Add error boundary and error handling UI
  - Implement error boundary component for React errors
  - Add user-friendly error messages for all error types
  - Create fallback UI for chart rendering failures
  - Add "No data available" states
  - _Requirements: All error handling requirements_

- [ ] 18. Final integration and testing
  - Run all unit tests and property-based tests
  - Test complete user flows end-to-end
  - Verify persistence across browser sessions
  - Test with various parameter combinations
  - Verify all requirements are met
  - _Requirements: All requirements_

- [ ] 19. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
