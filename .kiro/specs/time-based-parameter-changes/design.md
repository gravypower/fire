# Time-Based Parameter Changes - Design Document

## Overview

The Time-Based Parameter Changes feature extends the Finance Simulation Tool to support dynamic parameter configurations that change at specific dates during the simulation. This enables realistic modeling of life transitions such as reducing work hours, career changes, relocations, or planned lifestyle adjustments.

The design introduces a new concept of "parameter periods" - discrete time spans where a specific set of financial parameters remains constant. Users define transition points where parameters change, and the simulation engine applies the appropriate parameter set for each time period during calculation. The architecture maintains backward compatibility with the existing simulation engine while adding a layer that manages parameter transitions.

The system stores parameter changes as a chronologically ordered list of transitions, each specifying a date and the parameters that change at that point. During simulation, the engine determines which parameter set is active for each time step and uses those values for calculations. Visualizations mark transition points on charts, allowing users to see the relationship between life events and financial outcomes.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Fresh Frontend                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Input      │  │  Transition  │  │ Visualization│  │
│  │  Islands     │  │   Manager    │  │   Island     │  │
│  │              │  │   Island     │  │  (Enhanced)  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│            Parameter Transition Manager                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Transition Validator & Chronological Sorter    │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Active Parameter Resolver (for given date)     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│            Enhanced Simulation Engine                    │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Time-Stepped Calculator with Dynamic Params    │   │
│  └──────────────────────────────────────────────────┘   │
│  (Existing processors remain unchanged)                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│         Enhanced Local Storage Persistence               │
│         (Stores base params + transitions)               │
└─────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. User defines base parameters and adds parameter transitions
2. Transition Manager validates and sorts transitions chronologically
3. User triggers simulation
4. Enhanced Simulation Engine iterates through time steps
5. For each time step, Active Parameter Resolver determines which parameters apply
6. Simulation Engine uses resolved parameters for calculations
7. Results include transition markers for visualization
8. Visualization Island renders charts with transition indicators
9. All parameters and transitions are persisted to Local Storage

## Components and Interfaces

### 1. Parameter Transition Model

The core data structure representing a parameter change at a specific date:

```typescript
interface ParameterTransition {
  /** Unique identifier for this transition */
  id: string;
  
  /** Date when this transition takes effect */
  transitionDate: Date;
  
  /** Optional label/description for this transition */
  label?: string;
  
  /** Parameters that change at this transition (partial UserParameters) */
  /** Only specified fields will change; others carry forward */
  parameterChanges: Partial<UserParameters>;
}
```

### 2. Parameter Period Model

Represents a continuous time span with constant parameters:

```typescript
interface ParameterPeriod {
  /** Start date of this period (inclusive) */
  startDate: Date;
  
  /** End date of this period (exclusive), null for final period */
  endDate: Date | null;
  
  /** Complete parameter set active during this period */
  parameters: UserParameters;
  
  /** Reference to the transition that started this period (null for base period) */
  transitionId: string | null;
}
```

### 3. Simulation Configuration with Transitions

Extended configuration that includes transitions:

```typescript
interface SimulationConfiguration {
  /** Base parameters (apply from start until first transition) */
  baseParameters: UserParameters;
  
  /** Array of parameter transitions, sorted chronologically */
  transitions: ParameterTransition[];
}
```

### 4. Parameter Transition Manager

Core interface for managing parameter transitions:

```typescript
interface ParameterTransitionManager {
  /**
   * Adds a new parameter transition
   * Validates date and parameters, maintains chronological order
   */
  addTransition(transition: ParameterTransition): ValidationResult;
  
  /**
   * Updates an existing transition
   */
  updateTransition(id: string, updates: Partial<ParameterTransition>): ValidationResult;
  
  /**
   * Removes a transition by ID
   */
  removeTransition(id: string): void;
  
  /**
   * Gets all transitions in chronological order
   */
  getTransitions(): ParameterTransition[];
  
  /**
   * Resolves the active parameters for a specific date
   * Applies all transitions up to and including that date
   */
  resolveParametersForDate(date: Date, config: SimulationConfiguration): UserParameters;
  
  /**
   * Converts configuration into parameter periods
   * Useful for visualization and analysis
   */
  buildParameterPeriods(config: SimulationConfiguration): ParameterPeriod[];
  
  /**
   * Validates a transition
   */
  validateTransition(
    transition: ParameterTransition,
    config: SimulationConfiguration
  ): ValidationResult;
}
```

### 5. Enhanced Simulation Engine

Extended simulation engine that supports parameter transitions:

```typescript
interface EnhancedSimulationEngine {
  /**
   * Runs simulation with parameter transitions
   * Resolves parameters for each time step based on active transitions
   */
  runSimulationWithTransitions(config: SimulationConfiguration): EnhancedSimulationResult;
  
  /**
   * Runs comparison simulation (with vs without transitions)
   */
  runComparisonSimulation(
    config: SimulationConfiguration
  ): ComparisonSimulationResult;
}

interface EnhancedSimulationResult extends SimulationResult {
  /** Transition points that occurred during simulation */
  transitionPoints: TransitionPoint[];
  
  /** Parameter periods used in simulation */
  periods: ParameterPeriod[];
}

interface TransitionPoint {
  /** Date of transition */
  date: Date;
  
  /** Index in states array where transition occurred */
  stateIndex: number;
  
  /** Transition that occurred */
  transition: ParameterTransition;
  
  /** Summary of what changed */
  changesSummary: string;
}

interface ComparisonSimulationResult {
  /** Result with transitions */
  withTransitions: EnhancedSimulationResult;
  
  /** Result without transitions (base parameters only) */
  withoutTransitions: SimulationResult;
  
  /** Comparison metrics */
  comparison: {
    retirementDateDifference: number | null; // in years
    finalNetWorthDifference: number;
    sustainabilityChanged: boolean;
  };
}
```

### 6. Transition Templates

Predefined templates for common life events:

```typescript
interface TransitionTemplate {
  /** Template identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Description of this life event */
  description: string;
  
  /** Category (e.g., "career", "lifestyle", "retirement") */
  category: string;
  
  /** Function that generates parameter changes based on current params */
  generateChanges: (currentParams: UserParameters) => Partial<UserParameters>;
}

// Example templates
const TRANSITION_TEMPLATES: TransitionTemplate[] = [
  {
    id: "semi-retirement",
    name: "Semi-Retirement",
    description: "Reduce work hours and income, lower expenses",
    category: "retirement",
    generateChanges: (current) => ({
      annualSalary: current.annualSalary * 0.5,
      monthlyLivingExpenses: current.monthlyLivingExpenses * 0.8,
    }),
  },
  {
    id: "full-retirement",
    name: "Full Retirement",
    description: "Stop working, rely on investments and super",
    category: "retirement",
    generateChanges: (current) => ({
      annualSalary: 0,
      monthlyInvestmentContribution: 0,
      monthlyLivingExpenses: current.monthlyLivingExpenses * 0.7,
    }),
  },
  {
    id: "relocation-cheaper",
    name: "Relocate to Cheaper Area",
    description: "Move to area with lower cost of living",
    category: "lifestyle",
    generateChanges: (current) => ({
      monthlyRentOrMortgage: current.monthlyRentOrMortgage * 0.7,
      monthlyLivingExpenses: current.monthlyLivingExpenses * 0.85,
    }),
  },
  {
    id: "career-change-higher",
    name: "Career Change (Higher Income)",
    description: "Switch to higher-paying career",
    category: "career",
    generateChanges: (current) => ({
      annualSalary: current.annualSalary * 1.3,
    }),
  },
  {
    id: "career-change-lower",
    name: "Career Change (Lower Income)",
    description: "Switch to lower-paying but more fulfilling career",
    category: "career",
    generateChanges: (current) => ({
      annualSalary: current.annualSalary * 0.7,
    }),
  },
  {
    id: "increase-savings",
    name: "Increase Savings Rate",
    description: "Boost investment contributions",
    category: "financial",
    generateChanges: (current) => ({
      monthlyInvestmentContribution: current.monthlyInvestmentContribution * 1.5,
    }),
  },
];
```

### 7. Enhanced Storage Service

Extended storage to persist transitions:

```typescript
interface EnhancedStorageService {
  /** Save complete configuration including transitions */
  saveConfiguration(config: SimulationConfiguration): void;
  
  /** Load configuration with transitions */
  loadConfiguration(): SimulationConfiguration | null;
  
  /** Clear all stored data */
  clearConfiguration(): void;
  
  /** Backward compatibility: load old format (base params only) */
  migrateFromLegacyFormat(): SimulationConfiguration | null;
}
```

### 8. Visualization Enhancements

Extended visualization to show transitions:

```typescript
interface TransitionMarker {
  /** Date of transition */
  date: Date;
  
  /** Label to display */
  label: string;
  
  /** Color for marker */
  color: string;
  
  /** Tooltip content */
  tooltip: string;
}

interface EnhancedChartData {
  /** Existing financial states */
  states: FinancialState[];
  
  /** Transition markers to overlay on chart */
  transitionMarkers: TransitionMarker[];
  
  /** Parameter periods for background shading */
  periods: ParameterPeriod[];
}
```

## Data Models

### Parameter Resolution Algorithm

When resolving parameters for a specific date during simulation:

1. Start with base parameters
2. Get all transitions with `transitionDate <= currentDate`
3. Sort transitions chronologically
4. Apply each transition's parameter changes in order
5. Result is the active parameter set for that date

```typescript
function resolveParametersForDate(
  date: Date,
  config: SimulationConfiguration
): UserParameters {
  // Start with base parameters
  let activeParams = { ...config.baseParameters };
  
  // Apply all transitions up to this date
  const applicableTransitions = config.transitions
    .filter(t => t.transitionDate <= date)
    .sort((a, b) => a.transitionDate.getTime() - b.transitionDate.getTime());
  
  for (const transition of applicableTransitions) {
    // Merge parameter changes
    activeParams = {
      ...activeParams,
      ...transition.parameterChanges,
    };
  }
  
  return activeParams;
}
```

### Transition Validation Rules

1. **Date Validation**:
   - Transition date must be after simulation start date
   - Transition date must be before simulation end date
   - No duplicate transition dates allowed

2. **Parameter Validation**:
   - All parameter changes must pass existing validation rules
   - At least one parameter must be specified in changes
   - Numeric values must be positive (where applicable)

3. **Chronological Integrity**:
   - Transitions must be sortable by date
   - No circular dependencies

### Storage Format

```typescript
interface StoredConfiguration {
  version: string; // "2.0" for transition support
  baseParameters: UserParameters;
  transitions: Array<{
    id: string;
    transitionDate: string; // ISO date string
    label?: string;
    parameterChanges: Partial<UserParameters>;
  }>;
  savedAt: string; // ISO timestamp
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Transition date validation
*For any* transition date and simulation configuration, the system should accept the date if and only if it falls after the simulation start date and before the simulation end date.
**Validates: Requirements 1.3, 8.4**

### Property 2: Chronological ordering invariant
*For any* set of parameter transitions, after adding them to the system, they should be maintained in chronological order by transition date.
**Validates: Requirements 1.4**

### Property 3: Display completeness for transitions
*For any* parameter transition, when rendered for display, the output should contain the transition date and all modified parameter values.
**Validates: Requirements 1.5**

### Property 4: Selective parameter modification
*For any* parameter transition with partial parameter changes, only the specified parameters should differ from the previous period, while all unspecified parameters should remain unchanged.
**Validates: Requirements 2.1, 2.2**

### Property 5: Base parameters apply before first transition
*For any* simulation with parameter transitions, all financial states before the first transition date should be calculated using the base parameters.
**Validates: Requirements 3.1**

### Property 6: Parameter switching at transitions
*For any* transition date during simulation, all financial states at or after that date should use the new parameter values until the next transition.
**Validates: Requirements 3.2**

### Property 7: Chronological transition application
*For any* simulation with multiple transitions, applying them in chronological order should produce the same result as applying them in any order and then sorting by date.
**Validates: Requirements 3.3**

### Property 8: Parameter resolution correctness
*For any* date during simulation, resolving the active parameters should produce a parameter set that includes all transitions up to and including that date, applied in chronological order.
**Validates: Requirements 3.4**

### Property 9: Transition markers completeness
*For any* simulation with parameter transitions, the visualization should include markers at exactly the dates where transitions occur, with no missing or extra markers.
**Validates: Requirements 4.1, 4.4**

### Property 10: Chronological ordering maintained after updates
*For any* existing set of transitions, modifying a transition date should result in the transitions being re-sorted in chronological order.
**Validates: Requirements 5.2**

### Property 11: Modification triggers simulation
*For any* parameter transition modification (date or parameter values), the system should trigger a new simulation run with the updated configuration.
**Validates: Requirements 5.3**

### Property 12: Period extension after deletion
*For any* transition deletion, the parameter period before the deleted transition should extend to the next transition date (or simulation end if no next transition exists).
**Validates: Requirements 5.4**

### Property 13: Persistence completeness
*For any* simulation configuration with transitions, saving it should persist all transition dates and parameter changes.
**Validates: Requirements 6.1**

### Property 14: Configuration round-trip preservation
*For any* valid simulation configuration with transitions, saving and then loading should produce an equivalent configuration with all transitions preserved in chronological order.
**Validates: Requirements 6.2**

### Property 15: Deserialization validation
*For any* stored configuration data, deserializing should validate that all transition dates are within the simulation timeframe and all parameters are within acceptable ranges, rejecting invalid data.
**Validates: Requirements 6.5**

### Property 16: Parameter validation for transitions
*For any* parameter change in a transition, the system should accept all positive numeric values for numeric parameters and reject all non-positive or non-numeric values.
**Validates: Requirements 8.1**

### Property 17: Duplicate date prevention
*For any* attempt to create a transition with a date that matches an existing transition date, the system should reject the creation and maintain the existing transition.
**Validates: Requirements 8.2**

### Property 18: Timeline display completeness
*For any* simulation configuration with transitions, the timeline summary should include an entry for each transition showing its date and description.
**Validates: Requirements 9.1, 9.2**

### Property 19: Period duration calculation
*For any* parameter period, the displayed duration should equal the time span from the period start date to the period end date (or simulation end for the final period).
**Validates: Requirements 9.4**

### Property 20: Comparison simulation execution
*For any* simulation configuration with transitions, running a comparison should produce two distinct simulation results: one with transitions applied and one with only base parameters.
**Validates: Requirements 10.2**

### Property 21: Comparison metrics calculation
*For any* comparison simulation, the calculated differences (retirement date, net worth, sustainability) should accurately reflect the delta between the two simulation results.
**Validates: Requirements 10.3**

## Error Handling

### Transition Validation Errors

- **Invalid transition date**: Display error message indicating date must be within simulation timeframe
- **Duplicate transition date**: Show error that a transition already exists at that date, offer to edit existing
- **Invalid parameter values**: Highlight specific parameters with validation errors
- **Empty parameter changes**: Require at least one parameter to be modified in a transition
- **Chronological conflicts**: Automatically re-sort transitions, notify user of reordering

### Simulation Errors with Transitions

- **Parameter resolution failure**: Fall back to base parameters, log error, notify user
- **Transition application error**: Skip problematic transition, continue simulation, warn user
- **Invalid parameter combination**: Validate that resolved parameters create viable scenario
- **Date calculation errors**: Handle edge cases like daylight saving time, leap years

### Storage Errors for Transitions

- **Corrupted transition data**: Fall back to base parameters only, notify user of data loss
- **Migration from legacy format**: Detect old format (no transitions), migrate gracefully
- **Serialization failure**: Catch errors, attempt to save base parameters at minimum
- **Version mismatch**: Handle different storage format versions, migrate if possible

### UI Errors

- **Transition marker rendering failure**: Show chart without markers, log error
- **Timeline display error**: Fall back to simple list view
- **Template application failure**: Show error, allow manual parameter entry
- **Comparison visualization error**: Show results in table format as fallback

## Testing Strategy

### Unit Testing

The application will use Deno's built-in test runner for unit tests. Unit tests will focus on:

- **Parameter resolution logic**: Test resolveParametersForDate with specific transition configurations
- **Transition validation**: Test validation rules with specific valid and invalid inputs
- **Chronological sorting**: Test sorting with specific date sequences
- **Period building**: Test buildParameterPeriods with specific configurations
- **Template generation**: Test each template produces expected parameter changes
- **Edge cases**: Empty transition lists, single transition, transitions at simulation boundaries
- **Error conditions**: Corrupted data, invalid dates, missing parameters

Example unit tests:
- Resolve parameters with no transitions returns base parameters
- Resolve parameters with one transition before date applies that transition
- Resolve parameters with multiple transitions applies all in order
- Adding transition with duplicate date is rejected
- Deleting middle transition extends previous period correctly

### Property-Based Testing

The application will use **fast-check** (TypeScript property-based testing library) for property-based tests. Each property-based test will:

- Run a minimum of 100 iterations with randomly generated inputs
- Be tagged with a comment referencing the specific correctness property from this design document
- Use the format: `// Feature: time-based-parameter-changes, Property N: [property text]`

Property-based tests will verify:

- **Parameter resolution**: Generate random transitions and dates, verify correct parameters resolved
- **Chronological ordering**: Generate random transition sets, verify always sorted
- **Partial updates**: Generate random partial parameter changes, verify only specified fields change
- **Round-trip persistence**: Generate random configurations, verify save/load preserves data
- **Validation rules**: Generate random dates and parameters, verify validation correctness
- **Period calculations**: Generate random transitions, verify period durations are correct
- **Comparison correctness**: Generate random configurations, verify comparison metrics accurate

Each correctness property listed above will be implemented as a single property-based test. The tests will generate random but valid simulation configurations with transitions and verify the properties hold across all generated cases.

### Integration Testing

- **End-to-end transition workflow**: Create transition, run simulation, verify results reflect changes
- **UI interaction**: Add, edit, delete transitions through UI, verify state updates correctly
- **Persistence across sessions**: Save configuration with transitions, reload, verify preserved
- **Chart rendering with markers**: Verify transition markers appear at correct positions
- **Template application**: Apply template, customize, run simulation, verify results
- **Comparison simulation**: Run comparison, verify both results displayed correctly

### Test Organization

```
tests/
├── unit/
│   ├── transition_manager_test.ts
│   ├── parameter_resolution_test.ts
│   ├── transition_validation_test.ts
│   ├── period_builder_test.ts
│   └── templates_test.ts
├── property/
│   ├── transition_properties_test.ts
│   ├── parameter_resolution_properties_test.ts
│   ├── persistence_properties_test.ts
│   └── comparison_properties_test.ts
└── integration/
    ├── transition_workflow_test.ts
    ├── simulation_with_transitions_test.ts
    └── comparison_simulation_test.ts
```

## Performance Considerations

### Transition Management Performance

- **Efficient sorting**: Use efficient sort algorithm for maintaining chronological order
- **Caching resolved parameters**: Cache parameter resolution results for frequently accessed dates
- **Lazy period building**: Build parameter periods only when needed for visualization
- **Incremental updates**: When transition changes, only recalculate affected periods

### Simulation Performance with Transitions

- **Parameter lookup optimization**: Use binary search to find active transition for a date
- **Minimize parameter resolution calls**: Resolve once per period, not per time step
- **Batch transition application**: Apply multiple transitions in single pass when possible
- **Comparison optimization**: Reuse base simulation results when running comparisons

### Storage Performance

- **Compact serialization**: Store only parameter changes, not full parameter sets
- **Compression**: Compress transition data if many transitions exist
- **Incremental saves**: Save only changed transitions, not entire configuration each time
- **Lazy loading**: Load transitions on demand if configuration is large

### Visualization Performance

- **Marker rendering optimization**: Use canvas for markers if many transitions exist
- **Period shading**: Use CSS for period backgrounds rather than drawing shapes
- **Lazy marker tooltips**: Generate tooltip content on hover, not upfront
- **Virtual scrolling for timeline**: If many transitions, render only visible timeline entries

## Security Considerations

- **Input sanitization**: Validate and sanitize all transition dates and parameter values
- **Prevent injection**: Escape user-provided labels and descriptions in UI
- **Storage limits**: Respect browser storage quotas, limit number of transitions
- **Data validation**: Validate all loaded data before use, reject malformed configurations
- **No sensitive data**: Transitions contain only financial parameters, no personal identification

## Future Extensibility

### Planned Extensions

- **Recurring transitions**: Support transitions that repeat (e.g., annual salary increases)
- **Conditional transitions**: Transitions that apply only if certain conditions are met
- **Transition dependencies**: Link transitions so one triggers another
- **Scenario branching**: Create multiple future scenarios from a single base
- **Transition impact analysis**: Show detailed breakdown of how each transition affects outcomes
- **Import/export transitions**: Share transition configurations between users
- **Transition recommendations**: AI-suggested transitions based on goals

### Architecture Support for Extensions

- **Extensible transition model**: Easy to add new fields to ParameterTransition
- **Plugin architecture**: Support custom transition types through plugins
- **Event system**: Emit events when transitions occur for extensibility
- **Flexible validation**: Validation rules can be extended without modifying core
- **Template system**: Easy to add new templates or allow user-defined templates
