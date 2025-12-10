# Local Storage Age Persistence Fix

## Issue Description
User reported that when changing their age from 30 to 44 in the Household Configuration, the change would not persist after reloading the page. The age would revert back to 30.

## Root Cause Analysis

### The Problem
There was a race condition in the initialization sequence:

1. **MainIsland** mounts with `config = null`
2. **InputIsland** renders and its `useEffect` runs
3. **InputIsland** creates default configuration with `currentAge: 30` and immediately calls `onConfigurationChange`
4. This default config gets saved to localStorage
5. **MainIsland**'s `useEffect` runs (after InputIsland's)
6. **MainIsland** loads the saved config from localStorage
7. But by this time, the default config with age 30 has already been saved, potentially overwriting any previously saved data

### Why It Happened
The `InputIsland` component was designed to create and save a default configuration when no config was provided. This was intended to initialize the app on first use, but it was running on every mount, even when `MainIsland` was about to load a saved configuration.

## The Fix

### Changes Made

#### 1. **islands/InputIsland.tsx**
- Removed the automatic creation and saving of default configuration
- Now only sets local state to defaults when no config is provided
- Lets `MainIsland` handle the creation of initial configuration

```typescript
// Before:
if (config) {
  // ... set parameters from config
} else {
  // Create initial config with defaults
  const defaultParams = getDefaultParameters();
  setParameters(defaultParams);
  
  // Create and save initial configuration
  const initialConfig: SimulationConfiguration = {
    baseParameters: defaultParams,
    transitions: [],
  };
  onConfigurationChange(initialConfig); // ❌ This was causing the race condition
}

// After:
if (config) {
  // ... set parameters from config
} else {
  // Just set default parameters locally, don't save yet
  // MainIsland will handle creating initial config if needed
  const defaultParams = getDefaultParameters();
  setParameters(defaultParams); // ✅ Only set local state
}
```

#### 2. **islands/MainIsland.tsx**
- Enhanced the initialization logic to create and save default configuration if none exists
- Ensures configuration is created before any child components try to initialize

```typescript
// Load configuration on mount
useEffect(() => {
  const loadedConfig = storageService.loadConfiguration();
  if (loadedConfig) {
    setConfig(loadedConfig);
    runSimulation(loadedConfig);
  } else {
    // ✅ Create default config here, not in InputIsland
    const defaultConfig: SimulationConfiguration = {
      baseParameters: { /* defaults */ },
      transitions: [],
    };
    setConfig(defaultConfig);
    storageService.saveConfiguration(defaultConfig);
    runSimulation(defaultConfig);
  }
}, []);
```

#### 3. **lib/storage.ts**
- Fixed type definition to include "yearly" frequency (was causing type errors)
- Existing sync logic between `people` array and legacy fields was already correct

```typescript
// Before:
salaryFrequency: "weekly" | "fortnightly" | "monthly";

// After:
salaryFrequency: "weekly" | "fortnightly" | "monthly" | "yearly";
```

### Existing Correct Behavior
The following mechanisms were already working correctly:

1. **HouseholdManagerIsland.updatePerson()** - Correctly syncs legacy fields when person data changes
2. **storage.saveConfiguration()** - Syncs legacy fields with people array before saving
3. **storage.loadConfiguration()** - Syncs legacy fields with people array after loading

## Testing

### New Tests Added
Created `tests/unit/storage_age_persistence_test.ts` with 7 comprehensive tests:

1. ✅ Age 44 persists after save and load
2. ✅ Changing from 30 to 44 persists
3. ✅ Retirement age persists correctly
4. ✅ Both ages sync correctly in couple mode
5. ✅ Legacy fields sync when people array exists
6. ✅ Multiple save/load cycles maintain age
7. ✅ Raw storage data contains correct age

### Test Results
```
✅ All 7 new tests pass
✅ All 23 existing storage tests pass
✅ Total: 30/30 tests passing
✅ No type errors in modified files
```

## Verification Steps

To verify the fix works:

1. Open the app in a browser
2. Go to Household Configuration
3. Change current age from 30 to 44
4. Reload the page (F5)
5. ✅ Age should still be 44

## Technical Details

### Data Flow
```
User changes age in HouseholdManagerIsland
  ↓
updatePerson() called
  ↓
Syncs legacy fields (currentAge, retirementAge)
  ↓
onConfigChange() called
  ↓
MainIsland.handleConfigurationChange()
  ↓
storageService.saveConfiguration()
  ↓
Syncs legacy fields again (defensive)
  ↓
Saves to localStorage
  ↓
On page reload:
  ↓
MainIsland loads from localStorage
  ↓
storageService.loadConfiguration()
  ↓
Syncs legacy fields after loading
  ↓
Config set in state
  ↓
HouseholdManagerIsland renders with correct age
```

### Backward Compatibility
The fix maintains full backward compatibility:
- Legacy single-field age storage still works
- Migration from old format to new format works
- Both single and couple modes work correctly
- All existing features continue to function

## Files Modified
1. `islands/InputIsland.tsx` - Removed premature config creation
2. `islands/MainIsland.tsx` - Added proper initialization logic
3. `lib/storage.ts` - Fixed type definition for frequency
4. `tests/unit/storage_age_persistence_test.ts` - New comprehensive tests

## Conclusion
The race condition has been eliminated by centralizing configuration initialization in `MainIsland` and preventing `InputIsland` from creating and saving default configurations. Age changes now persist correctly across page reloads.
