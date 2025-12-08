/**
 * Storage Diagnostics Script
 * Run this to diagnose storage issues in the browser console
 */

// Copy this entire script and paste it into your browser console while the app is running

(function() {
  console.log("=== STORAGE DIAGNOSTICS ===\n");

  const STORAGE_KEY = "finance-simulation-config";
  const LEGACY_KEY = "finance-simulation-parameters";

  // 1. Check if localStorage is available
  console.log("1. Checking localStorage availability...");
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    console.log("✅ localStorage is available");
  } catch (e) {
    console.error("❌ localStorage is NOT available:", e);
    return;
  }

  // 2. Check current storage contents
  console.log("\n2. Current storage contents:");
  const config = localStorage.getItem(STORAGE_KEY);
  const legacy = localStorage.getItem(LEGACY_KEY);

  if (config) {
    console.log(`✅ Config found (${config.length} bytes)`);
    try {
      const parsed = JSON.parse(config);
      console.log("   Version:", parsed.version);
      console.log("   Saved at:", parsed.savedAt);
      console.log("   Current age (legacy):", parsed.baseParameters.currentAge);
      console.log("   Current age (people):", parsed.baseParameters.people?.[0]?.currentAge);
      console.log("   Transitions:", parsed.transitions?.length || 0);
      console.log("   Expenses:", parsed.baseParameters.expenseItems?.length || 0);
      console.log("   Loans:", parsed.baseParameters.loans?.length || 0);
    } catch (e) {
      console.error("❌ Failed to parse config:", e);
    }
  } else {
    console.log("⚠️  No config found");
  }

  if (legacy) {
    console.log(`ℹ️  Legacy format found (${legacy.length} bytes)`);
  }

  // 3. List all localStorage keys
  console.log("\n3. All localStorage keys:");
  const allKeys = Object.keys(localStorage);
  console.log(`   Total keys: ${allKeys.length}`);
  allKeys.forEach(key => {
    const size = localStorage.getItem(key)?.length || 0;
    console.log(`   - ${key} (${size} bytes)`);
  });

  // 4. Test write and read
  console.log("\n4. Testing write and read...");
  const testData = {
    version: "2.0",
    testId: Date.now(),
    timestamp: new Date().toISOString(),
  };

  try {
    localStorage.setItem("test-diagnostic", JSON.stringify(testData));
    const readBack = JSON.parse(localStorage.getItem("test-diagnostic"));
    
    if (readBack.testId === testData.testId) {
      console.log("✅ Write and read test passed");
    } else {
      console.error("❌ Write and read test failed - data mismatch");
    }
    
    localStorage.removeItem("test-diagnostic");
  } catch (e) {
    console.error("❌ Write and read test failed:", e);
  }

  // 5. Monitor storage events
  console.log("\n5. Setting up storage event monitor...");
  console.log("   (This will log any storage changes)");
  
  window.addEventListener('storage', (e) => {
    console.log("📝 Storage event detected:");
    console.log("   Key:", e.key);
    console.log("   Old value:", e.oldValue?.substring(0, 100));
    console.log("   New value:", e.newValue?.substring(0, 100));
    console.log("   URL:", e.url);
  });

  // 6. Check for storage quota
  console.log("\n6. Checking storage quota...");
  if (navigator.storage && navigator.storage.estimate) {
    navigator.storage.estimate().then(({ usage, quota }) => {
      const usageInMB = (usage / (1024 * 1024)).toFixed(2);
      const quotaInMB = (quota / (1024 * 1024)).toFixed(2);
      const percentUsed = ((usage / quota) * 100).toFixed(2);
      
      console.log(`   Usage: ${usageInMB} MB / ${quotaInMB} MB (${percentUsed}%)`);
      
      if (percentUsed > 80) {
        console.warn("⚠️  Storage quota is high!");
      } else {
        console.log("✅ Storage quota is healthy");
      }
    });
  } else {
    console.log("ℹ️  Storage quota API not available");
  }

  // 7. Provide helper functions
  console.log("\n7. Helper functions available:");
  console.log("   - inspectConfig() - View current config");
  console.log("   - testSave(age) - Test saving with specific age");
  console.log("   - testLoad() - Test loading config");
  console.log("   - clearStorage() - Clear all storage");
  console.log("   - monitorChanges() - Watch for config changes");

  window.inspectConfig = function() {
    const config = localStorage.getItem(STORAGE_KEY);
    if (config) {
      const parsed = JSON.parse(config);
      console.log("Current config:", parsed);
      return parsed;
    } else {
      console.log("No config found");
      return null;
    }
  };

  window.testSave = function(age = 30) {
    const config = {
      version: "2.0",
      baseParameters: {
        currentAge: age,
        people: [{ currentAge: age }],
      },
      transitions: [],
      savedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    console.log(`Saved config with age ${age}`);
    
    const loaded = JSON.parse(localStorage.getItem(STORAGE_KEY));
    console.log("Loaded back:", loaded.baseParameters.currentAge);
  };

  window.testLoad = function() {
    const config = localStorage.getItem(STORAGE_KEY);
    if (config) {
      const parsed = JSON.parse(config);
      console.log("Loaded config:");
      console.log("  Age (legacy):", parsed.baseParameters.currentAge);
      console.log("  Age (people):", parsed.baseParameters.people?.[0]?.currentAge);
      return parsed;
    } else {
      console.log("No config to load");
      return null;
    }
  };

  window.clearStorage = function() {
    if (confirm("Clear all localStorage?")) {
      localStorage.clear();
      console.log("Storage cleared");
    }
  };

  window.monitorChanges = function() {
    let lastConfig = localStorage.getItem(STORAGE_KEY);
    
    setInterval(() => {
      const currentConfig = localStorage.getItem(STORAGE_KEY);
      
      if (currentConfig !== lastConfig) {
        console.log("🔄 Config changed!");
        
        if (lastConfig) {
          const oldParsed = JSON.parse(lastConfig);
          console.log("  Old age:", oldParsed.baseParameters.currentAge);
        }
        
        if (currentConfig) {
          const newParsed = JSON.parse(currentConfig);
          console.log("  New age:", newParsed.baseParameters.currentAge);
        }
        
        lastConfig = currentConfig;
      }
    }, 1000);
    
    console.log("Monitoring config changes every 1 second...");
  };

  console.log("\n=== DIAGNOSTICS COMPLETE ===");
  console.log("Run inspectConfig() to view current configuration");
})();
