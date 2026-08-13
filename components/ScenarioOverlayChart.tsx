/**
 * ScenarioOverlayChart - Overlays the net worth trajectory of 2-4 scenarios
 * on a single chart, so they can be compared side by side.
 */

import { useEffect, useRef } from "preact/hooks";
import type { FinancialState } from "../types/financial.ts";
import { formatCurrency } from "../lib/result_utils.ts";

interface ScenarioSeries {
  label: string;
  states: FinancialState[];
}

interface ScenarioOverlayChartProps {
  scenarios: ScenarioSeries[];
}

// Fixed palette so each scenario keeps a stable, distinct color
const SERIES_COLORS = [
  "rgb(34, 197, 94)", // green-500
  "rgb(59, 130, 246)", // blue-500
  "rgb(234, 179, 8)", // yellow-500
  "rgb(239, 68, 68)", // red-500
];

/**
 * Converts a scenario's states into {x, y} points where x is years elapsed
 * since that scenario's own start date. Using elapsed time (rather than
 * calendar dates) keeps scenarios comparable even when they have different
 * start dates or simulation lengths.
 */
function toElapsedYearsSeries(states: FinancialState[]) {
  if (states.length === 0) return [];
  const startMs = states[0].date.getTime();
  const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
  return states.map((state) => ({
    x: (state.date.getTime() - startMs) / msPerYear,
    y: state.netWorth,
  }));
}

export default function ScenarioOverlayChart({ scenarios }: ScenarioOverlayChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || scenarios.length === 0) return;

    import("chart.js/auto").then((ChartModule) => {
      const Chart = ChartModule.default;

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx) return;

      const datasets = scenarios.map((scenario, index) => ({
        label: scenario.label,
        data: toElapsedYearsSeries(scenario.states),
        borderColor: SERIES_COLORS[index % SERIES_COLORS.length],
        backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length],
        borderWidth: 3,
        tension: 0.3,
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 5,
      }));

      chartRef.current = new Chart(ctx, {
        type: "line",
        data: { datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 750,
            easing: "easeInOutQuart",
          },
          interaction: {
            mode: "index",
            intersect: false,
          },
          plugins: {
            title: {
              display: true,
              text: "Net Worth by Scenario",
              font: { size: 16, weight: "bold" },
              padding: { top: 10, bottom: 20 },
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (label) label += ": ";
                  if (context.parsed.y !== null) {
                    label += formatCurrency(context.parsed.y);
                  }
                  return label;
                },
                title: function (context) {
                  const years = context[0]?.parsed.x;
                  return typeof years === "number"
                    ? `${years.toFixed(1)} years in`
                    : "";
                },
              },
            },
            legend: {
              display: true,
              position: "bottom",
              labels: { padding: 15, usePointStyle: true },
            },
          },
          scales: {
            x: {
              type: "linear",
              title: {
                display: true,
                text: "Years from Scenario Start",
                font: { weight: "bold" },
              },
              grid: { display: false },
            },
            y: {
              title: {
                display: true,
                text: "Net Worth ($)",
                font: { weight: "bold" },
              },
              ticks: {
                callback: function (value) {
                  return formatCurrency(value as number);
                },
              },
              grid: { color: "rgba(0, 0, 0, 0.05)" },
            },
          },
        },
      });
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [scenarios]);

  if (!scenarios || scenarios.length === 0) {
    return null;
  }

  return (
    <div class="card p-4 chart-transition">
      <div style={{ height: "400px" }}>
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
