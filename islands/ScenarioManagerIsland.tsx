/**
 * ScenarioManagerIsland - Save named scenarios and compare 2-4 of them side by side
 */

import { useEffect, useState } from "preact/hooks";
import type {
  SavedScenario,
  ScenarioComparisonResult,
  SimulationConfiguration,
} from "../types/financial.ts";
import { apiClient } from "../lib/api-client.ts";
import { storageService } from "../lib/storage.ts";
import MultiScenarioComparisonView from "../components/MultiScenarioComparisonView.tsx";

interface ScenarioManagerIslandProps {
  config: SimulationConfiguration;
}

const MAX_COMPARE = 4;
const MIN_COMPARE = 2;

export default function ScenarioManagerIsland({ config }: ScenarioManagerIslandProps) {
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [comparison, setComparison] = useState<ScenarioComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setScenarios(storageService.getScenarios());
  }, []);

  const handleSaveCurrent = () => {
    const name = prompt("Name this scenario:");
    if (!name || !name.trim()) return;

    try {
      storageService.saveScenario(name.trim(), config);
      setScenarios(storageService.getScenarios());
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save scenario");
    }
  };

  const handleRename = (id: string, currentName: string) => {
    const name = prompt("Rename scenario:", currentName);
    if (!name || !name.trim() || name.trim() === currentName) return;

    storageService.renameScenario(id, name.trim());
    setScenarios(storageService.getScenarios());
  };

  const handleDelete = (id: string) => {
    if (!confirm("Delete this scenario? This cannot be undone.")) return;

    storageService.deleteScenario(id);
    setScenarios(storageService.getScenarios());
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setComparison(null);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE) {
        next.add(id);
      }
      return next;
    });
  };

  const handleCompare = async () => {
    setIsLoading(true);
    setError(null);
    setComparison(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 0));

      const selected = scenarios.filter((s) => selectedIds.has(s.id));
      const result = await apiClient.runNamedScenarioComparison(
        selected.map((s) => ({ id: s.id, name: s.name, configuration: s.configuration })),
      );

      setComparison(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred comparing scenarios",
      );
      console.error("Scenario comparison error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const canCompare = selectedIds.size >= MIN_COMPARE && selectedIds.size <= MAX_COMPARE;

  return (
    <div class="fade-in space-y-6">
      <div class="card p-4">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-1">Saved Scenarios</h3>
            <p class="text-sm text-gray-600">
              Save your current configuration as a named scenario, then select {MIN_COMPARE}-{MAX_COMPARE}{" "}
              to compare side by side.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveCurrent}
            class="ml-4 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium whitespace-nowrap"
          >
            + Save Current as Scenario
          </button>
        </div>

        {scenarios.length === 0
          ? (
            <p class="text-sm text-gray-500 py-4 text-center">
              No scenarios saved yet. Click "Save Current as Scenario" to save your current
              configuration.
            </p>
          )
          : (
            <div class="space-y-2">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  class={`flex items-center justify-between p-3 rounded-lg border ${
                    selectedIds.has(scenario.id)
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200"
                  }`}
                >
                  <label class="flex items-center flex-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(scenario.id)}
                      onChange={() => toggleSelected(scenario.id)}
                      disabled={!selectedIds.has(scenario.id) && selectedIds.size >= MAX_COMPARE}
                      class="mr-3 h-4 w-4"
                    />
                    <div>
                      <div class="font-medium text-gray-800">{scenario.name}</div>
                      <div class="text-xs text-gray-500">
                        Retirement age {scenario.configuration.baseParameters.retirementAge} · Updated{" "}
                        {scenario.updatedAt.toLocaleDateString()}
                      </div>
                    </div>
                  </label>
                  <div class="flex gap-2 ml-4">
                    <button
                      type="button"
                      onClick={() => handleRename(scenario.id, scenario.name)}
                      class="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(scenario.id)}
                      class="px-3 py-1 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        {scenarios.length > 0 && (
          <div class="mt-4 flex items-center justify-between">
            <span class="text-sm text-gray-500">
              {selectedIds.size === 0
                ? `Select ${MIN_COMPARE}-${MAX_COMPARE} scenarios to compare`
                : `${selectedIds.size} selected`}
            </span>
            <button
              type="button"
              onClick={handleCompare}
              disabled={!canCompare || isLoading}
              class="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Compare Selected
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div class="card p-8 fade-in">
          <div class="flex flex-col items-center justify-center space-y-4">
            <div class="spinner-lg"></div>
            <p class="text-lg font-medium text-gray-700">Running comparison...</p>
          </div>
        </div>
      )}

      {error && (
        <div class="card p-6 fade-in">
          <div class="alert-error">
            <h3 class="text-lg font-semibold text-red-800 mb-2">Comparison Error</h3>
            <p class="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {comparison && !isLoading && !error && (
        <MultiScenarioComparisonView comparison={comparison} />
      )}
    </div>
  );
}
