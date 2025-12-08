# Storage Testing Quick Reference Guide

## Quick Test Commands

### Run All Storage Tests
```bash
# Comprehensive unit tests (20 tests)
deno run --allow-read test_storage_comprehensive.ts

# Integration test (full user workflow)
deno run --allow-read test_storage_integration.ts

# Original storage tests
deno run --allow-read test_storage.ts
deno run --allow-read test_storage_age.ts
```

## Browser Testing

### Interactive Test Page
1. Open `test_browser_storage.html` in your browser
2. Available tests:
   - **Run All Tests** - Execute all automated tests
   - **Inspect Storage** - View current localStorage contents
   - **Test Reload Persistence** - Verify data survives reload
   - **Clear All Storage** - Reset localStorage
   - **Reload Page** - Test actual page reload

### Console Diagnostics
1. Open your app in browser
2. Press F12 to open DevTools
3. Go to Console tab
4. Copy and paste contents of `test_storage_diagnostics.ts`
5. Available commands:
   ```javascript
   inspectConfig()        // View current configuration
   testSave(age)          // Test saving with specific age
   testLoad()             // Test loading configuration
   clearStorage()         // Clear all storage
   monitorChanges()       // Watch for config changes
   ```

## Manual Testing Checklist

### Test 1: Basic Persistence
- [ ] Enter financial data
- [ ] Reload page (F5)
- [ ] Verify data is still there

### Test 2: Age Persistence
- [ ] Set age to 30
- [ ] Save
- [ ] Reload page
- [ ] Verify age is still 30
- [ ] Change age to 35
- [ ] Reload page
- [ ] Verify age is now 35

### Test 3: Expense Persistence
- [ ] Add 3 expenses
- [ ] Reload page
- [ ] Verify all 3 expenses are there
- [ ] Add 2 more expenses
- [ ] Reload page
- [ ] Verify all 5 expenses are there

### Test 4: Transition Persistence
- [ ] Add a transition
- [ ] Reload page
- [ ] Verify transition is there
- [ ] Add another transition
- [ ] Reload page
- [ ] Verify both transitions are there

### Test 5: Loan Persistence
- [ ] Add a loan with offset account
- [ ] Set offset balance
- [ ] Reload page
- [ ] Verify loan and offset balance persist

### Test 6: Household Persistence
- [ ] Switch to couple mode
- [ ] Add second person
- [ ] Reload page
- [ ] Verify both people are there

## Debugging Storage Issues

### Check if localStorage is available
```javascript
// In browser console
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('✅ localStorage available');
} catch (e) {
  console.log('❌ localStorage NOT available:', e);
}
```

### Inspect raw storage data
```javascript
// In browser console
const config = localStorage.getItem('finance-simulation-config');
if (config) {
  console.log(JSON.parse(config));
} else {
  console.log('No config found');
}
```

### Check storage size
```javascript
// In browser console
let total = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    total += localStorage[key].length;
  }
}
console.log(`Total storage: ${(total / 1024).toFixed(2)} KB`);
```

### Monitor storage changes
```javascript
// In browser console
window.addEventListener('storage', (e) => {
  console.log('Storage changed:', e.key, e.newValue);
});
```

### Clear specific storage key
```javascript
// In browser console
localStorage.removeItem('finance-simulation-config');
console.log('Config cleared');
```

## Common Issues and Solutions

### Issue: Data resets on page reload
**Cause:** Race condition in component lifecycle  
**Solution:** Fixed in InputIsland.tsx - removed onConfigurationChange from useEffect  
**Verify:** Run integration test or reload page manually

### Issue: Age not persisting
**Cause:** Age sync between legacy field and people array  
**Solution:** Storage layer handles sync automatically  
**Verify:** Run test_storage_age.ts

### Issue: Expenses disappear
**Cause:** expenseItems array not being saved  
**Solution:** Ensure expenseItems is included in baseParameters  
**Verify:** Run test_storage_comprehensive.ts

### Issue: Transitions lost
**Cause:** Transitions array not being saved  
**Solution:** Use saveConfiguration() not saveParameters()  
**Verify:** Check transitions section in test results

### Issue: localStorage quota exceeded
**Cause:** Too much data stored  
**Solution:** Clear old data or compress configuration  
**Check:** Run storage quota test in browser

## Storage Keys Reference

### Current Keys
- `finance-simulation-config` - Main configuration (v2.0)
- `finance-simulation-parameters` - Legacy format (deprecated)

### Data Structure
```typescript
{
  version: "2.0",
  baseParameters: {
    householdMode: "single" | "couple",
    people: [...],
    loans: [...],
    expenseItems: [...],
    taxBrackets: [...],
    // ... legacy fields
  },
  transitions: [...],
  savedAt: "ISO timestamp"
}
```

## Test Coverage

### Unit Tests (test_storage_comprehensive.ts)
- ✅ Basic save/load
- ✅ Clear configuration
- ✅ Page reload simulation
- ✅ Age persistence
- ✅ Multiple updates
- ✅ Complex data structures
- ✅ Transitions
- ✅ Date handling
- ✅ Error handling
- ✅ Legacy migration
- ✅ Age synchronization
- ✅ Real-world scenarios

### Integration Tests (test_storage_integration.ts)
- ✅ Complete user workflow
- ✅ Multiple reloads
- ✅ Data integrity
- ✅ All fields persist

### Browser Tests (test_browser_storage.html)
- ✅ Actual localStorage behavior
- ✅ Real page reload
- ✅ Storage inspection
- ✅ Quota monitoring

## Performance Benchmarks

### Save Operation
- Typical size: 2-5 KB
- Time: < 1ms

### Load Operation
- Parse time: < 1ms
- Validation time: < 1ms

### Storage Limits
- localStorage quota: ~5-10 MB (browser dependent)
- Typical usage: < 10 KB
- Safe margin: > 99%

## Maintenance

### Regular Checks
1. Run test suite monthly
2. Check browser console for errors
3. Monitor storage quota
4. Verify backward compatibility

### When Adding New Fields
1. Add to UserParameters type
2. Add to SerializableUserParameters
3. Update validation in isValidParametersStructure
4. Add test case in test_storage_comprehensive.ts
5. Test save/load cycle
6. Test page reload

### When Changing Data Structure
1. Increment version number
2. Add migration logic
3. Test legacy format migration
4. Update all tests
5. Document changes

## Support

### If Tests Fail
1. Check browser console for errors
2. Run diagnostics script
3. Inspect raw storage data
4. Check for quota issues
5. Verify localStorage is enabled

### If Data Still Resets
1. Open browser DevTools
2. Go to Application → Local Storage
3. Watch for changes during reload
4. Check if data is being saved
5. Check if data is being loaded
6. Look for JavaScript errors

### Getting Help
1. Run all tests and note which fail
2. Run diagnostics script and save output
3. Check browser console for errors
4. Note exact steps to reproduce
5. Include browser and version info
