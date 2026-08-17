/**
 * CashFlowChart - Chart component for displaying cash flow over time
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { useEffect, useRef } from "preact/hooks";
import type {
  FinancialState,
  TimeInterval,
  TransitionPoint,
} from "../types/financial.ts";
import type { ExpenseItem } from "../types/expenses.ts";
import { CATEGORY_INFO } from "../types/expenses.ts";
import {
  type ChartEventMarker,
  findStateIndexForDate,
  formatCurrency,
} from "../lib/result_utils.ts";
import { ExpenseProcessor } from "../lib/processors.ts";

/** A state augmented with the period-aggregated figures the tooltip's cash
 *  flow breakdown is built from - summed across every simulation tick in
 *  that display period, rather than just the tick landed on when sampling,
 *  so a lumpy income/expense (e.g. an annual salary or yearly bill) reads
 *  correctly instead of appearing as a single spike with every other
 *  period reading zero. */
type StateWithPeriodTotals = FinancialState & {
  periodCashFlow?: number;
  periodNetIncome?: number;
  periodRetirementWithdrawal?: number;
  periodExpenses?: number;
  periodLoanPayment?: number;
  periodInvestmentContribution?: number;
};

interface CashFlowChartProps {
  states: StateWithPeriodTotals[];
  transitionPoints?: TransitionPoint[];
  /** Point-in-time events (house purchases, retirement, loan payoffs, ...)
   *  pinned on the chart so a jump in cash flow has a visible explanation. */
  eventMarkers?: ChartEventMarker[];
  /** Configured expense items - used to list which expenses were active in
   *  the hovered period and how much each contributed, in the tooltip. */
  expenseItems?: ExpenseItem[];
  /** Display granularity the expense breakdown should be scaled to (should
   *  match whatever granularity `states` was grouped at). */
  granularity?: TimeInterval;
}

/**
 * CashFlowChart component
 *
 * Displays a bar chart showing cash flow (income - expenses) over time.
 * Positive cash flow is shown in green, negative in red.
 *
 * Requirements 6.1: Visual chart format
 * Requirements 6.2: Time on x-axis, monetary values on y-axis
 * Requirements 6.3: Distinct colors for different metrics
 * Requirements 6.4: Hover tooltips with exact values and dates
 * Requirements 4.1, 4.2, 4.3, 4.4: Transition markers and visualization
 */
export default function CashFlowChart(
  {
    states,
    transitionPoints = [],
    eventMarkers = [],
    expenseItems = [],
    granularity = "month",
  }: CashFlowChartProps,
) {
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
      const cashFlowData = states.map((state) =>
        state.periodCashFlow ?? state.cashFlow
      );

      // Create background colors based on positive/negative values
      const backgroundColors = cashFlowData.map((value) =>
        value >= 0
          ? "rgba(34, 197, 94, 0.7)" // green for positive
          : "rgba(239, 68, 68, 0.7)" // red for negative
      );

      const borderColors = cashFlowData.map((value) =>
        value >= 0
          ? "rgb(34, 197, 94)" // green for positive
          : "rgb(239, 68, 68)" // red for negative
      );

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

      // Prepare event marker annotations (house purchases, retirement, loan
      // payoffs, ...) - resolved to a stateIndex on this chart's own
      // (possibly time-granularity-filtered) x-axis.
      const resolvedEventMarkers = eventMarkers
        .map((marker) => ({
          marker,
          stateIndex: findStateIndexForDate(states, marker.date),
        }))
        .filter(({ stateIndex }) => stateIndex >= 0);

      resolvedEventMarkers.forEach(({ marker, stateIndex }, index) => {
        annotations[`event-marker-${index}`] = {
          type: "line",
          xMin: stateIndex,
          xMax: stateIndex,
          borderColor: marker.color,
          borderWidth: 2,
          borderDash: [2, 2],
          label: {
            display: true,
            content: `📌 ${marker.label}`,
            position: "end",
            backgroundColor: marker.color,
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
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Cash Flow",
              data: cashFlowData,
              backgroundColor: backgroundColors,
              borderColor: borderColors,
              borderWidth: 1,
              borderRadius: 4,
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
              text: "Cash Flow Over Time",
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
                // Breaks the single "Cash Flow" figure down into the income
                // and outflow components it's netted from (returning an
                // array from `label` renders one line per entry).
                label: function (context) {
                  const state = states[context.dataIndex];
                  if (!state) {
                    return context.parsed.y !== null
                      ? formatCurrency(context.parsed.y)
                      : "";
                  }

                  const netIncome = state.periodNetIncome ??
                    state.netIncome ?? 0;
                  const retirementWithdrawal =
                    state.periodRetirementWithdrawal ??
                    state.retirementWithdrawal ?? 0;
                  const expensesAmount = state.periodExpenses ??
                    state.expenses ?? 0;
                  const loanPayment = state.periodLoanPayment ??
                    state.loanPayment ?? 0;
                  const investmentContribution =
                    state.periodInvestmentContribution ??
                    state.investmentContribution ?? 0;

                  const lines: string[] = [];
                  if (netIncome !== 0) {
                    lines.push(`Income: ${formatCurrency(netIncome)}`);
                  }
                  if (retirementWithdrawal !== 0) {
                    lines.push(
                      `+ Retirement Withdrawal: ${
                        formatCurrency(retirementWithdrawal)
                      }`,
                    );
                  }
                  if (expensesAmount !== 0) {
                    lines.push(
                      `− Expenses: ${formatCurrency(expensesAmount)}`,
                    );
                  }
                  if (loanPayment !== 0) {
                    lines.push(
                      `− Loan Payment: ${formatCurrency(loanPayment)}`,
                    );
                  }
                  if (investmentContribution !== 0) {
                    lines.push(
                      `− Investment Contribution: ${
                        formatCurrency(investmentContribution)
                      }`,
                    );
                  }
                  lines.push(
                    `= Net Cash Flow: ${formatCurrency(context.parsed.y)}`,
                  );

                  return lines;
                },
                // Lists which configured expenses were active this period
                // and how much each contributed, under the breakdown above.
                afterBody: function (context) {
                  if (!expenseItems.length || context.length === 0) return [];

                  const state = states[context[0].dataIndex];
                  if (!state) return [];

                  const breakdown = ExpenseProcessor.getActiveExpenseBreakdown(
                    expenseItems,
                    granularity,
                    state.date,
                  );
                  if (breakdown.length === 0) return [];

                  const maxLines = 8;
                  const lines = ["", "Expenses:"];
                  breakdown.slice(0, maxLines).forEach((item) => {
                    const icon = CATEGORY_INFO[item.category]?.icon ?? "";
                    lines.push(
                      `${icon} ${item.name}: ${formatCurrency(item.amount)}`,
                    );
                  });
                  if (breakdown.length > maxLines) {
                    lines.push(`+ ${breakdown.length - maxLines} more`);
                  }

                  return lines;
                },
                title: function (context) {
                  const dateLabel = context[0].label;
                  const lines = [dateLabel];

                  // Check if this index corresponds to a transition
                  const transitionAtIndex = transitionPoints.find(
                    (tp) => tp.stateIndex === context[0].dataIndex,
                  );
                  if (transitionAtIndex) {
                    lines.push(
                      `🔄 ${
                        transitionAtIndex.transition.label || "Transition"
                      }`,
                      transitionAtIndex.changesSummary,
                    );
                  }

                  // Check if this index corresponds to one or more event
                  // markers (house purchase, retirement, loan payoff, ...)
                  resolvedEventMarkers
                    .filter(({ stateIndex }) =>
                      stateIndex === context[0].dataIndex
                    )
                    .forEach(({ marker }) => {
                      lines.push(`📌 ${marker.label}`);
                      if (marker.description) {
                        lines.push(marker.description);
                      }
                    });

                  return lines;
                },
              },
            },
            legend: {
              display: false,
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
                text: "Cash Flow ($)",
                font: {
                  weight: "bold",
                },
              },
              ticks: {
                callback: function (value) {
                  return formatCurrency(value as number);
                },
              },
              // Add a zero line for reference
              grid: {
                color: function (context) {
                  if (context.tick.value === 0) {
                    return "rgba(0, 0, 0, 0.5)";
                  }
                  return "rgba(0, 0, 0, 0.05)";
                },
                lineWidth: function (context) {
                  if (context.tick.value === 0) {
                    return 2;
                  }
                  return 1;
                },
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
  }, [states, transitionPoints, eventMarkers, expenseItems, granularity]);

  // No data available state
  if (!states || states.length === 0) {
    return (
      <div class="card p-8 fade-in">
        <div class="text-center">
          <svg
            class="mx-auto h-16 w-16 text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 class="text-lg font-semibold text-gray-700 mb-2">
            No Data Available
          </h3>
          <p class="text-sm text-gray-500 mb-4">
            Run a simulation to see your cash flow projection over time.
          </p>
          <div class="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
            <svg
              class="w-5 h-5 text-blue-600 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
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
