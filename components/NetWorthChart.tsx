/**
 * NetWorthChart - Chart component for displaying net worth over time
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { useEffect, useRef } from "preact/hooks";
import type { FinancialState, TransitionPoint } from "../types/financial.ts";
import { formatCurrency } from "../lib/result_utils.ts";

interface NetWorthChartProps {
  states: FinancialState[];
  transitionPoints?: TransitionPoint[];
}

/**
 * NetWorthChart component
 * 
 * Displays a line chart showing net worth progression over time.
 * 
 * Requirements 6.1: Visual chart format
 * Requirements 6.2: Time on x-axis, monetary values on y-axis
 * Requirements 6.3: Distinct colors for different metrics
 * Requirements 6.4: Hover tooltips with exact values and dates
 * Requirements 4.1, 4.2, 4.3, 4.4: Transition markers and visualization
 */
export default function NetWorthChart({ states, transitionPoints = [] }: NetWorthChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || states.length === 0) return;

    // Dynamically import Chart.js and annotation plugin only on the client side
    Promise.all([
      import("chart.js/auto"),
      import("chartjs-plugin-annotation"),
    ]).then(([ChartModule, AnnotationModule]) => {
      const Chart = ChartModule.default;
      const annotationPlugin = AnnotationModule.default;

      // Register the annotation plugin
      Chart.register(annotationPlugin);

      // Destroy existing chart if it exists
      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current!.getContext("2d");
      if (!ctx) return;

      // Prepare data
      const labels = states.map((state) => state.date.toLocaleDateString());
      const netWorthData = states.map((state) => state.netWorth);
      const cashData = states.map((state) => state.cash);
      const investmentsData = states.map((state) => state.investments);
      const superData = states.map((state) => state.superannuation);
      const loanData = states.map((state) => -state.loanBalance); // Negative for visualization

      // Prepare transition annotations
      const annotations: any = {};
      transitionPoints.forEach((tp, index) => {
        // Add vertical line annotation
        annotations[`transition-line-${index}`] = {
          type: "line",
          xMin: tp.stateIndex,
          xMax: tp.stateIndex,
          borderColor: "rgba(255, 99, 132, 0.8)",
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            display: true,
            content: tp.transition.label || "Transition",
            position: "start",
            backgroundColor: "rgba(255, 99, 132, 0.9)",
            color: "white",
            font: {
              size: 10,
              weight: "bold",
            },
            padding: 4,
            rotation: 0,
          },
        };
      });

      // Create chart
      chartRef.current = new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Net Worth",
              data: netWorthData,
              borderColor: "rgb(34, 197, 94)", // green-500
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              borderWidth: 3,
              tension: 0.3,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 5,
            },
            {
              label: "Cash",
              data: cashData,
              borderColor: "rgb(59, 130, 246)", // blue-500
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
            {
              label: "Investments",
              data: investmentsData,
              borderColor: "rgb(168, 85, 247)", // purple-500
              backgroundColor: "rgba(168, 85, 247, 0.1)",
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
            {
              label: "Superannuation",
              data: superData,
              borderColor: "rgb(234, 179, 8)", // yellow-500
              backgroundColor: "rgba(234, 179, 8, 0.1)",
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
            {
              label: "Loan (Debt)",
              data: loanData,
              borderColor: "rgb(239, 68, 68)", // red-500
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              borderWidth: 2,
              tension: 0.3,
              fill: false,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        },
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
              text: "Net Worth Over Time",
              font: {
                size: 16,
                weight: "bold",
              },
              padding: {
                top: 10,
                bottom: 20,
              },
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              padding: 12,
              cornerRadius: 8,
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (label) {
                    label += ": ";
                  }
                  if (context.parsed.y !== null) {
                    label += formatCurrency(Math.abs(context.parsed.y));
                  }
                  return label;
                },
                title: function (context) {
                  const dateLabel = context[0].label;
                  // Check if this index corresponds to a transition
                  const transitionAtIndex = transitionPoints.find(
                    (tp) => tp.stateIndex === context[0].dataIndex
                  );
                  if (transitionAtIndex) {
                    return [
                      dateLabel,
                      `🔄 ${transitionAtIndex.transition.label || "Transition"}`,
                      transitionAtIndex.changesSummary,
                    ];
                  }
                  return dateLabel;
                },
              },
            },
            legend: {
              display: true,
              position: "bottom",
              labels: {
                padding: 15,
                usePointStyle: true,
              },
            },
            annotation: {
              annotations: annotations,
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: "Date",
                font: {
                  weight: "bold",
                },
              },
              ticks: {
                maxRotation: 45,
                minRotation: 45,
              },
              grid: {
                display: false,
              },
            },
            y: {
              title: {
                display: true,
                text: "Amount ($)",
                font: {
                  weight: "bold",
                },
              },
              ticks: {
                callback: function (value) {
                  return formatCurrency(value as number);
                },
              },
              grid: {
                color: "rgba(0, 0, 0, 0.05)",
              },
            },
          },
        },
      });
    });

    // Cleanup
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [states, transitionPoints]);

  // No data available state
  if (!states || states.length === 0) {
    return (
      <div class="card p-8 fade-in">
        <div class="text-center">
          <svg class="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">No Data Available</h3>
          <p class="text-sm text-gray-500 mb-4">
            Run a simulation to see your net worth projection over time.
          </p>
          <div class="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
            <svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="text-sm text-blue-700 font-medium">
              Enter your financial parameters to begin
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class="card p-4 chart-transition">
      <div style={{ height: "400px" }}>
        <canvas ref={canvasRef}></canvas>
      </div>
    </div>
  );
}
