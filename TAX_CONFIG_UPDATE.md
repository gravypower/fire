# Tax Configuration Update Instructions

## Summary
Moving tax configuration to server-side and making it read-only in the UI.

## Files Created

### 1. `config/tax_brackets.json`
Server-side tax configuration file with Australian tax brackets.

### 2. `routes/api/tax-config.ts`
API endpoint to serve tax configuration to the client.

## Changes Needed in `islands/InputIsland.tsx`

### Step 1: Remove these functions (lines 332-377):
Delete the `handleTaxBracketChange` and `resetTaxBrackets` functions - they're no longer needed.

### Step 2: The tax config loading useEffect has already been added (lines 90-125)
This fetches tax config from the server on mount.

### Step 3: Replace the Tax Configuration Section (around line 640-730)

Replace the entire Tax Configuration section with this read-only version:

```tsx
        {/* Tax Configuration Section - Read Only */}
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-gray-700 mb-4 flex items-center">
            <svg class="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Tax Configuration
            <span class="ml-2 text-xs font-normal text-gray-500">(Read-only)</span>
          </h3>
          
          {taxConfigLoading ? (
            <div class="p-4 bg-gray-50 rounded-md border border-gray-200 text-center">
              <p class="text-sm text-gray-600">Loading tax configuration...</p>
            </div>
          ) : (
            <div class="p-4 bg-blue-50 rounded-md border border-blue-200">
              {taxConfigInfo && (
                <div class="mb-3 pb-3 border-b border-blue-300">
                  <p class="text-xs font-semibold text-blue-900">{taxConfigInfo.country} - {taxConfigInfo.taxYear}</p>
                  <p class="text-xs text-blue-700 mt-1">{taxConfigInfo.description}</p>
                </div>
              )}
              
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span class="text-sm font-medium text-gray-700">Tax Brackets (Progressive)</span>
                </div>
                <button
                  onClick={() => setShowTaxBrackets(!showTaxBrackets)}
                  class="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showTaxBrackets ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              
              {!showTaxBrackets && (
                <div>
                  <p class="text-xs text-gray-700 font-medium mb-2">Tax Rates:</p>
                  <ul class="text-xs text-gray-600 space-y-1">
                    {(parameters.taxBrackets || DEFAULT_AU_TAX_BRACKETS).map((bracket, i) => (
                      <li key={i} class="flex justify-between items-center py-1">
                        <span>
                          ${bracket.min.toLocaleString()} - {bracket.max ? `$${bracket.max.toLocaleString()}` : 'No limit'}
                        </span>
                        <span class="font-semibold text-blue-700">{bracket.rate}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {showTaxBrackets && (
                <div class="space-y-2 fade-in">
                  <p class="text-xs text-gray-600 mb-3">
                    Tax brackets are managed server-side. To update tax rates, edit <code class="bg-gray-200 px-1 rounded">config/tax_brackets.json</code>
                  </p>
                  
                  {(parameters.taxBrackets || DEFAULT_AU_TAX_BRACKETS).map((bracket, index) => (
                    <div key={index} class="p-3 bg-white rounded border border-blue-200">
                      <div class="grid grid-cols-3 gap-3 text-xs">
                        <div>
                          <label class="text-gray-500 font-medium">Minimum</label>
                          <p class="text-gray-900 font-semibold mt-1">${bracket.min.toLocaleString()}</p>
                        </div>
                        <div>
                          <label class="text-gray-500 font-medium">Maximum</label>
                          <p class="text-gray-900 font-semibold mt-1">
                            {bracket.max ? `$${bracket.max.toLocaleString()}` : 'No limit'}
                          </p>
                        </div>
                        <div>
                          <label class="text-gray-500 font-medium">Tax Rate</label>
                          <p class="text-blue-700 font-bold mt-1 text-base">{bracket.rate}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div class="mt-3 pt-3 border-t border-blue-300">
                <p class="text-xs text-gray-600">
                  <svg class="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                  </svg>
                  Tax brackets loaded from server configuration
                </p>
              </div>
            </div>
          )}
        </div>
```

## Testing

1. Start the dev server: `deno task start`
2. Open the app in your browser
3. Check that:
   - Tax configuration loads from server
   - Shows "Australia - 2024-25" header
   - Tax brackets are displayed but not editable
   - "Show Details" button works
   - No edit/reset buttons appear

## Benefits

- ✅ Tax rates managed in one place (config file)
- ✅ No user confusion about editing tax rates
- ✅ Easy to update for new tax years
- ✅ Can add different country configs later
- ✅ Cleaner UI without edit controls

## Future Enhancements

- Add multiple country configs
- Add tax year selector
- Include Medicare levy in calculations
- Add HELP/HECS debt calculations
