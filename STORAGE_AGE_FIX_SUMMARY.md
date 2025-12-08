# Storage Age Fix Summary

## Issue
When updating age from 30 to 40 in the Household Configuration and refreshing the page, the age would reset back to 30.

## Root Cause
The application has two places where age is stored:
1. **Legacy fields**: `baseParameters.currentAge` and `baseParameters.retirementAge`
2. **New structure**: `baseParameters.people[0].currentAge` and `baseParameters.people[0].retirementAge`

When updating age in the UI (HouseholdManagerIsland), only the `people` array was being updated. The legacy fields were not synced, so when the configuration was saved and reloaded, the legacy fields would overwrite the people array values.

## Fixes Applied

### 1. Sync on Update (HouseholdManagerIsland)
When a person's age is updated, now also updates the legacy fields:

```typescript
const updatePerson = (personId: string, updates: Partial<Person>) => {
  // ... update people array
  
  // Sync legacy fields with first person's data
  const firstPerson = updatedPeople[0];
  const legacyUpdates: Partial<UserParameters> = {};
  
  if (firstPerson) {
    if (updates.currentAge !== undefined) {
      legacyUpdates.currentAge = firstPerson.currentAge;
    }
    if (updates.retirementAge !== undefined) {
      legacyUpdates.retirementAge = firstPerson.retirementAge;
    }
  }
  
  onConfigChange({
    ...config,
    baseParameters: {
      ...config.baseParameters,
      ...legacyUpdates,  // Apply legacy updates
      people: updatedPeople,
    },
  });
};
```

### 2. Sync on Save (storage.ts)
Before saving to localStorage, sync legacy fields with people array:

```typescript
saveConfiguration(config: SimulationConfiguration): void {
  // Sync legacy fields with people array before saving
  const configToSave = { ...config };
  if (configToSave.baseParameters.people && configToSave.baseParameters.people.length > 0) {
    const firstPerson = configToSave.baseParameters.people[0];
    configToSave.baseParameters = {
      ...configToSave.baseParameters,
      currentAge: firstPerson.currentAge,
      retirementAge: firstPerson.retirementAge,
    };
  }
  
  // ... save to storage
}
```

### 3. Sync on Load (storage.ts)
After loading from localStorage, sync legacy fields with people array:

```typescript
loadConfiguration(): SimulationConfiguration | null {
  // ... load from storage
  
  const config = configFromSerializable(parsed);
  
  // Sync legacy fields with people array if present
  if (config.baseParameters.people && config.baseParameters.people.length > 0) {
    const firstPerson = config.baseParameters.people[0];
    config.baseParameters.currentAge = firstPerson.currentAge;
    config.baseParameters.retirementAge = firstPerson.retirementAge;
  }
  
  return config;
}
```

## Test Results

✅ **Save with age 30**
- Legacy field: 30
- People array: 30

✅ **Update to age 40 and save**
- Both fields updated to 40

✅ **Reload configuration**
- Legacy field: 40 ✅
- People array: 40 ✅

✅ **Raw storage data**
- Both fields stored as 40

## Why This Approach?

We maintain both the legacy fields and the new people array structure for:

1. **Backward Compatibility**: Old code that reads `currentAge` still works
2. **Forward Compatibility**: New code uses the `people` array
3. **Data Integrity**: Both are always in sync
4. **Smooth Migration**: Users don't lose data during the transition

## Summary

The age (and retirement age) now persists correctly across page reloads. The fix ensures that:
- When you update age in the UI, both structures are updated
- When saving, both structures are synced
- When loading, both structures are synced
- The data is consistent everywhere

**Status: ✅ FIXED**

You can now update your age from 30 to 40, refresh the page, and it will stay at 40!
