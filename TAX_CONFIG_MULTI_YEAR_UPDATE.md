# Tax Configuration Multi-Year Update

## Summary
Removed tax configuration from the main UI and moved it to the Help page. Updated the tax configuration to support multiple financial years.

## Changes Made

### 1. Tax Configuration File (`config/tax_brackets.json`)
**Updated structure to support multiple years:**
- Changed from single year format to multi-year format
- Added `years` object containing tax brackets for each financial year
- Added `defaultYear` field to specify which year to use by default
- Currently includes:
  - **2024-25**: Current tax brackets
  - **2025-26**: Upcoming tax brackets (Stage 3 tax cuts)

**New Structure:**
```json
{
  "country": "Australia",
  "description": "Australian tax brackets for residents",
  "years": {
    "2024-25": { brackets, medicareLevy },
    "2025-26": { brackets, medicareLevy }
  },
  "defaultYear": "2024-25"
}
```

### 2. API Route (`routes/api/tax-config.ts`)
**Enhanced to support year selection:**
- Added query parameter support: `/api/tax-config?year=2025-26`
- Returns tax brackets for requested year or default year
- Returns list of available years in response
- Returns 404 if requested year not found

**API Response:**
```json
{
  "country": "Australia",
  "taxYear": "2024-25",
  "description": "...",
  "brackets": [...],
  "medicareLevy": {...},
  "availableYears": ["2024-25", "2025-26"]
}
```

### 3. Input Island (`islands/InputIsland.tsx`)
**Removed tax configuration UI:**
- Removed entire "Tax Configuration Section" card
- Removed unused state variables:
  - `showTaxBrackets`
  - `taxConfigLoading`
  - `taxConfigInfo`
- Removed unused functions:
  - `handleTaxBracketChange()`
  - `resetTaxBrackets()`
  - `loadTaxConfig()` useEffect
- Tax brackets still loaded from DEFAULT_AU_TAX_BRACKETS for calculations
- Added comment indicating tax info moved to Help page

### 4. Help Page (`routes/help.tsx`)
**Added comprehensive tax bracket information:**
- Enhanced "Tax Calculation" section with detailed bracket information
- Shows both 2024-25 and 2025-26 tax brackets
- Includes Medicare Levy information
- Color-coded sections (purple for 2024-25, blue for 2025-26)
- Easy reference for users without cluttering main UI

## Tax Brackets Included

### 2024-25 Financial Year
- $0 - $18,200: 0% (Tax-free threshold)
- $18,200 - $45,000: 19%
- $45,000 - $120,000: 32.5%
- $120,000 - $180,000: 37%
- $180,000+: 45%
- Plus 2% Medicare Levy

### 2025-26 Financial Year (Stage 3 Tax Cuts)
- $0 - $18,200: 0% (Tax-free threshold)
- $18,200 - $45,000: 16% (reduced from 19%)
- $45,000 - $135,000: 30% (reduced from 32.5%, expanded range)
- $135,000 - $190,000: 37% (expanded range)
- $190,000+: 45%
- Plus 2% Medicare Levy

## Benefits

1. **Cleaner UI**: Removed rarely-changed configuration from main interface
2. **Future-Ready**: Easy to add more financial years as they're announced
3. **Better UX**: Tax information available in Help section where users expect reference material
4. **Maintainable**: Centralized tax configuration that's easy to update
5. **API-Driven**: Can be extended to support user selection of tax year in future

## Future Enhancements

Potential improvements for later:
1. Add year selector in UI to choose which tax year to use for calculations
2. Automatically switch to new tax year based on simulation start date
3. Support for multiple countries/regions
4. Historical tax bracket data for backtesting scenarios
5. Tax bracket comparison tool in Help page

## Testing

To test the changes:
1. Start the dev server: `deno task start`
2. Verify tax configuration section is removed from main UI
3. Check Help page shows both 2024-25 and 2025-26 tax brackets
4. Test API endpoint: `curl http://localhost:8000/api/tax-config`
5. Test with year parameter: `curl http://localhost:8000/api/tax-config?year=2025-26`
6. Verify simulations still calculate tax correctly using default brackets

## Files Modified

- `config/tax_brackets.json` - Updated structure for multiple years
- `routes/api/tax-config.ts` - Added year parameter support
- `islands/InputIsland.tsx` - Removed tax configuration UI and unused code
- `routes/help.tsx` - Added tax bracket reference information

## Migration Notes

- Existing user data is not affected (tax brackets stored in user parameters remain unchanged)
- Default tax brackets (DEFAULT_AU_TAX_BRACKETS) still used for calculations
- No breaking changes to simulation engine or calculation logic
