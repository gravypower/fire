/**
 * MultiScenarioComparisonView - Summary table + net worth overlay chart
 * for comparing 2-4 named scenarios side by side.
 */

import type { ScenarioComparisonResult } from "../types/financial.ts";
import { formatCurrency } from "../lib/result_utils.ts";
import ScenarioOverlayChart from "./ScenarioOverlayChart.tsx";

interface MultiScenarioComparisonViewProps {
  comparison: ScenarioComparisonResult;
}

export default function MultiScenarioComparisonView(
  { comparison }: MultiScenarioComparisonViewProps,
) {
  const { scenarios } = comparison;

  const rows = scenarios.map((scenario) => {
    const finalState =
      scenario.result.states[scenario.result.states.length - 1];
    const firstRetirementMilestone = scenario.milestones
      .filter((m) => m.type === "retirement_eligibility")
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

    return {
      id: scenario.id,
      name: scenario.name,
      finalNetWorth: finalState?.netWorth ?? 0,
      retirementDate: scenario.result.retirementDate,
      retirementAge: scenario.result.retirementAge,
      isSustainable: scenario.result.isSustainable,
      firstMilestoneDate: firstRetirementMilestone?.date ?? null,
    };
  });

  const bestNetWorth = Math.max(...rows.map((r) => r.finalNetWorth));

  return (
    <div class="card p-6 fade-in space-y-6">
      <h2 class="text-2xl font-bold text-gray-800">Scenario Comparison</h2>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead>
            <tr class="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th class="py-2 pr-4">Scenario</th>
              <th class="py-2 pr-4">Final Net Worth</th>
              <th class="py-2 pr-4">Retirement Date</th>
              <th class="py-2 pr-4">Retirement Age</th>
              <th class="py-2 pr-4">Sustainable</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr
                key={row.id}
                class={row.finalNetWorth === bestNetWorth ? "bg-green-50" : ""}
              >
                <td class="py-3 pr-4 font-medium text-gray-800">{row.name}</td>
                <td class="py-3 pr-4">{formatCurrency(row.finalNetWorth)}</td>
                <td class="py-3 pr-4">
                  {row.retirementDate
                    ? row.retirementDate.toLocaleDateString()
                    : "Not Achievable"}
                </td>
                <td class="py-3 pr-4">
                  {row.retirementAge !== null
                    ? row.retirementAge.toFixed(1)
                    : "—"}
                </td>
                <td class="py-3 pr-4">
                  <span
                    class={`px-2 py-1 rounded-full text-xs font-medium ${
                      row.isSustainable
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {row.isSustainable ? "Sustainable" : "Unsustainable"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ScenarioOverlayChart
        scenarios={scenarios.map((s) => ({
          label: s.name,
          states: s.result.states,
        }))}
      />
    </div>
  );
}
