# Storage Reset Issue Analysis

## Problem
Storage appears to reset when the page is reloaded.

## Root Cause Analysis

### Issue 1: Race Condition in InputIsland
**Location:** `islands/InputIsland.tsx` lines 86-98

```typescript
useEffect(() => {
  if (config) {
    setParameters(config.baseParameters);
  } else {
    // Create initial configuration with default parameters
    const defaultParams = getDefaultParameters();
    setParameters(defaultParams);
    onConfigurationChange({
      baseParameters: defaultParams,
      transitions: [],
    });
  }
}, []); // Empty dependency array - only runs once
```

**Problem:** 
1. When the page loads, `MainIsland` mounts first
2. `MainIsland` loads config from storage in its `useEffect`
3. But `InputIsland` also mounts and its `useEffect` runs
4. If `config` prop is `null` initially (before MainIsland's useEffect completes), InputIsland creates default parameters and calls `onConfigurationChange`
5. This overwrites the loaded config with defaults

### Issue 2: Missing Dependency in useEffect
The `useEffect` has an empty dependency array `[]`, so it doesn't react when `config` prop changes from `null` to the loaded value.

## Solution

### Fix 1: Add config to dependency array and check for initial mount
```typescript
const [isInitialized, setIsInitialized] = useState(false);

useEffect(() => {
  if (config) {
    setParameters(config.baseParameters);
    setIsInitialized(true);
  } else if (!isInitialized) {
    // Only create defaults on first mount if no config exists
    const defaultParams = getDefaultParameters();
    setParameters(defaultParams);
    onConfigurationChange({
      baseParameters: defaultParams,
      transitions: [],
    });
    setIsInitialized(true);
  }
}, [config]); // Add config as dependency
```

### Fix 2: Don't call onConfigurationChange in InputIsland's useEffect
Let MainIsland handle the initial configuration creation:

```typescript
useEffect(() => {
  if (config) {
    setParameters(config.baseParameters);
  } else {
    // Just set local state, don't trigger onChange
    setParameters(getDefaultParameters());
  }
}, [config]);
```

Then in MainIsland, ensure config is created if null:

```typescript
useEffect(() => {
  const loadedConfig = storageService.loadConfiguration();
  if (loadedConfig) {
    setConfig(loadedConfig);
    runSimulation(loadedConfig);
  } else {
    // Create default config
    const defaultConfig = {
      baseParameters: getDefaultParameters(),
      transitions: [],
    };
    setConfig(defaultConfig);
  }
}, []);
```

## Test Results

All comprehensive storage tests pass (20/20), which means:
- ✅ Storage save/load works correctly
- ✅ Age synchronization works
- ✅ Data persists across simulated reloads
- ✅ Complex data structures persist
- ✅ Transitions persist

The issue is NOT in the storage layer itself, but in the React component lifecycle and prop flow.

## Recommended Fix

Apply Fix 2 (simpler and cleaner):
1. Remove `onConfigurationChange` call from InputIsland's useEffect
2. Add config dependency to useEffect
3. Ensure MainIsland creates default config if storage is empty
4. This prevents InputIsland from overwriting loaded config

## Additional Improvements

1. Add loading state to prevent race conditions
2. Add debug logging to track config flow
3. Consider using a ref to track if config has been loaded from storage
