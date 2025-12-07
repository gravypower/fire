# Implementation Plan

- [x] 1. Create core data models and types for parameter transitions





  - Define ParameterTransition, ParameterPeriod, SimulationConfiguration interfaces in types/financial.ts
  - Define TransitionPoint, EnhancedSimulationResult, ComparisonSimulationResult interfaces
  - Define TransitionTemplate interface and TRANSITION_TEMPLATES constant
  - Ensure all types are properly exported
  - _Requirements: 1.2, 2.1, 7.1_

- [x] 2. Implement Parameter Transition Manager





- [x] 2.1 Create transition manager module with core functions


  - Create lib/transition_manager.ts
  - Implement addTransition function with validation
  - Implement updateTransition function with re-sorting
  - Implement removeTransition function
  - Implement getTransitions function
  - _Requirements: 1.2, 1.4, 5.1, 5.2, 5.3, 5.4_

- [x] 2.2 Implement parameter resolution logic


  - Implement resolveParametersForDate function
  - Implement buildParameterPeriods function
  - Handle edge cases (no transitions, single transition, multiple transitions)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2.3 Implement transition validation


  - Implement validateTransition function
  - Validate transition dates are within simulation timeframe
  - Validate no duplicate transition dates
  - Validate parameter values are positive and numeric
  - Validate at least one parameter is specified
  - _Requirements: 1.3, 8.1, 8.2, 8.4_

- [ ]* 2.4 Write property test for chronological ordering
  - **Property 2: Chronological ordering invariant**
  - **Validates: Requirements 1.4**

- [ ]* 2.5 Write property test for parameter resolution
  - **Property 8: Parameter resolution correctness**
  - **Validates: Requirements 3.4**

- [ ]* 2.6 Write property test for selective parameter modification
  - **Property 4: Selective parameter modification**
  - **Validates: Requirements 2.1, 2.2**

- [ ]* 2.7 Write unit tests for transition manager
  - Test addTransition with valid and invalid inputs
  - Test updateTransition maintains ordering
  - Test removeTransition extends periods correctly
  - Test validateTransition with edge cases
  - _Requirements: 1.2, 1.3, 1.4, 5.2, 5.4, 8.1, 8.2_

- [x] 3. Enhance simulation engine to support transitions


- [x] 3.1 Extend simulation engine with transition support


  - Create runSimulationWithTransitions function in lib/simulation_engine.ts
  - Modify time-step loop to resolve parameters for each date
  - Track transition points that occur during simulation
  - Build parameter periods for result
  - Maintain backward compatibility with existing runSimulation
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3.2 Implement comparison simulation

  - Create runComparisonSimulation function
  - Run simulation with transitions
  - Run simulation with base parameters only
  - Calculate comparison metrics (retirement date difference, net worth difference, sustainability change)
  - _Requirements: 10.1, 10.2, 10.3_

- [ ]* 3.3 Write property test for base parameters before first transition
  - **Property 5: Base parameters apply before first transition**
  - **Validates: Requirements 3.1**

- [ ]* 3.4 Write property test for parameter switching
  - **Property 6: Parameter switching at transitions**
  - **Validates: Requirements 3.2**

- [ ]* 3.5 Write property test for chronological transition application
  - **Property 7: Chronological transition application**
  - **Validates: Requirements 3.3**

- [ ]* 3.6 Write unit tests for enhanced simulation engine
  - Test simulation with no transitions matches original behavior
  - Test simulation with single transition
  - Test simulation with multiple transitions
  - Test comparison simulation produces two distinct results
  - _Requirements: 3.1, 3.2, 3.3, 10.2_

- [x] 4. Implement transition templates




- [x] 4.1 Create template definitions and application logic

  - Define TRANSITION_TEMPLATES array with common life events
  - Implement semi-retirement template
  - Implement full-retirement template
  - Implement relocation-cheaper template
  - Implement career-change templates (higher and lower income)
  - Implement increase-savings template
  - Create applyTemplate function that generates parameter changes
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 4.2 Write unit tests for templates
  - Test each template generates expected parameter changes
  - Test template customization preserves user edits
  - Test template application with various base parameters
  - _Requirements: 7.2, 7.3, 7.4_

- [x] 5. Enhance storage service for transitions





- [x] 5.1 Extend storage to persist transitions


  - Modify lib/storage.ts to support SimulationConfiguration
  - Implement saveConfiguration function
  - Implement loadConfiguration function
  - Implement clearConfiguration function
  - Handle serialization of dates to ISO strings
  - Handle deserialization with validation
  - _Requirements: 6.1, 6.2, 6.4, 6.5_

- [x] 5.2 Implement legacy format migration


  - Detect old storage format (base parameters only)
  - Migrate to new format with empty transitions array
  - Preserve existing user data during migration
  - _Requirements: 6.2_

- [ ]* 5.3 Write property test for configuration round-trip
  - **Property 14: Configuration round-trip preservation**
  - **Validates: Requirements 6.2**

- [ ]* 5.4 Write property test for persistence completeness
  - **Property 13: Persistence completeness**
  - **Validates: Requirements 6.1**

- [ ]* 5.5 Write unit tests for enhanced storage
  - Test save and load with transitions
  - Test migration from legacy format
  - Test handling of corrupted data
  - Test deserialization validation
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [-] 6. Create Transition Manager UI Island


- [x] 6.1 Create TransitionManagerIsland component


  - Create islands/TransitionManagerIsland.tsx
  - Display list of existing transitions in chronological order
  - Implement add transition button and form
  - Implement edit transition functionality
  - Implement delete transition functionality
  - Show transition date and modified parameters for each transition
  - Integrate template selector
  - _Requirements: 1.1, 1.2, 1.5, 5.1, 5.2, 5.3, 5.4, 7.1, 7.5_

- [x] 6.2 Implement transition form with validation


  - Create form for transition date input
  - Create parameter selection checkboxes
  - Create parameter value inputs
  - Display validation errors inline
  - Prevent duplicate transition dates
  - Validate date is within simulation timeframe
  - _Requirements: 1.2, 1.3, 8.1, 8.2, 8.4, 8.5_

- [x] 6.3 Implement template selector UI



  - Display template categories
  - Show template descriptions
  - Apply template on selection
  - Allow customization of template values
  - _Requirements: 7.1, 7.2, 7.5_

- [ ]* 6.4 Write unit tests for TransitionManagerIsland
  - Test adding transition updates state
  - Test editing transition maintains ordering
  - Test deleting transition removes it
  - Test validation prevents invalid inputs
  - _Requirements: 1.2, 5.2, 5.4, 8.1, 8.2_

- [-] 7. Create Timeline Summary UI Component


- [x] 7.1 Create TimelineSummary component



  - Create components/TimelineSummary.tsx
  - Display all transitions in chronological timeline view
  - Show transition date and brief description for each
  - Group multiple parameter changes at same date
  - Show parameter period durations
  - Implement click navigation to transition details
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 7.2 Write unit tests for TimelineSummary
  - Test timeline displays all transitions
  - Test period durations calculated correctly
  - Test grouping of multiple changes at same date
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 8. Enhance visualization components with transition markers


- [x] 8.1 Update chart components to show transition markers



  - Modify components/NetWorthChart.tsx to accept transition markers
  - Modify components/CashFlowChart.tsx to accept transition markers
  - Render vertical lines or markers at transition dates
  - Add labels for transition markers
  - Implement hover tooltips showing parameter changes
  - Visually distinguish different parameter periods (optional background shading)
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 8.2 Write unit tests for chart enhancements
  - Test markers appear at correct dates
  - Test all transitions have corresponding markers
  - Test marker tooltips contain correct information
  - _Requirements: 4.1, 4.4_

- [x] 9. Create Comparison Simulation UI



- [x] 9.1 Create ComparisonView component


  - Create components/ComparisonView.tsx
  - Display side-by-side results (with vs without transitions)
  - Show retirement date comparison
  - Show final net worth comparison
  - Show sustainability comparison
  - Highlight differences clearly
  - Show impact of each transition
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 9.2 Add comparison trigger to UI


  - Add "Compare Scenarios" button to main interface
  - Trigger runComparisonSimulation when clicked
  - Display ComparisonView with results
  - _Requirements: 10.1_

- [ ]* 9.3 Write unit tests for ComparisonView
  - Test comparison displays both results
  - Test differences calculated correctly
  - Test impact indicators shown correctly
  - _Requirements: 10.2, 10.3_

- [x] 10. Integrate transitions into main application flow




- [x] 10.1 Update MainIsland to use enhanced simulation


  - Modify islands/MainIsland.tsx to manage SimulationConfiguration
  - Replace UserParameters state with SimulationConfiguration state
  - Call runSimulationWithTransitions instead of runSimulation
  - Pass transition markers to visualization components
  - Trigger simulation on parameter or transition changes
  - _Requirements: 5.3, 5.5_

- [x] 10.2 Update InputIsland to work with configuration


  - Modify islands/InputIsland.tsx to update baseParameters in configuration
  - Maintain backward compatibility with existing parameter inputs
  - _Requirements: 1.5, 2.1_

- [x] 10.3 Update VisualizationIsland to display transitions


  - Modify islands/VisualizationIsland.tsx to accept and display transition markers
  - Pass markers to chart components
  - Display timeline summary
  - _Requirements: 4.1, 4.4, 9.1_

- [x] 10.4 Update storage integration


  - Replace saveParameters/loadParameters calls with saveConfiguration/loadConfiguration
  - Handle migration from legacy format on first load
  - _Requirements: 6.1, 6.2_

- [ ]* 10.5 Write integration tests for full workflow
  - Test adding transition, running simulation, viewing results
  - Test editing transition updates simulation
  - Test deleting transition updates simulation
  - Test persistence across page reloads
  - Test comparison simulation workflow
  - _Requirements: 1.2, 3.1, 3.2, 5.2, 5.4, 6.2, 10.2_

- [ ] 11. Final checkpoint - Ensure all tests pass






  - Ensure all tests pass, ask the user if questions arise.
