/**
 * CashFlowChart - Chart component for displaying cash flow over time
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { useEffect, useRef, useState } from "preact/hooks";
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

/** A state augmented with the period-aggregated figures the breakdown is
 *  built from - summed across every simulation tick in that display
 *  period, rather than just the tick landed on when sampling, so a lumpy
 *  income/expense (e.g. an annual salary or yearly bill) reads correctly
 *  instead of appearing as a single spike with every other period reading
 *  zero. */
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
   *  the selected/hovered period and how much each contributed. */
  expenseItems?: ExpenseItem[];
  /** Display granularity the expense breakdown should be scaled to (should
   *  match whatever granularity `states` was grouped at). */
  granularity?: TimeInterval;
}

interface CashFlowBreakdown {
  income: number;
  retirementWithdrawal: number;
  expenses: number;
  loanPayment: number;
  investmentContribution: number;
  netCashFlow: number;
}

/** One color per breakdown component, shared by the chart's stacked bar
 *  segments, its tooltip, and the click-through details panel so the same
 *  figure always reads as the same color everywhere. */
const SEGMENT_COLORS = {
  income: { bg: "rgba(34, 197, 94, 0.75)", border: "rgb(21, 128, 61)" },
  retirementWithdrawal: {
    bg: "rgba(16, 185, 129, 0.75)",
    border: "rgb(4, 120, 87)",
  },
  expenses: { bg: "rgba(239, 68, 68, 0.75)", border: "rgb(185, 28, 28)" },
  loanPayment: { bg: "rgba(249, 115, 22, 0.75)", border: "rgb(194, 65, 12)" },
  investmentContribution: {
    bg: "rgba(139, 92, 246, 0.75)",
    border: "rgb(109, 40, 217)",
  },
} as const;

function getBreakdown(state: StateWithPeriodTotals): CashFlowBreakdown {
  return {
    income: state.periodNetIncome ?? state.netIncome ?? 0,
    retirementWithdrawal: state.periodRetirementWithdrawal ??
      state.retirementWithdrawal ?? 0,
    expenses: state.periodExpenses ?? state.expenses ?? 0,
    loanPayment: state.periodLoanPayment ?? state.loanPayment ?? 0,
    investmentContribution: state.periodInvestmentContribution ??
      state.investmentContribution ?? 0,
    netCashFlow: state.periodCashFlow ?? state.cashFlow,
  };
}

/**
 * CashFlowChart component
 *
 * Displays a diverging stacked bar chart: inflows (income, retirement
 * withdrawal) stack upward from zero, outflows (expenses, loan payment,
 * investment contribution) stack downward - so every bar visibly shows how
 * that period's cash flow is composed, not just its net total. Clicking a
 * bar opens a details panel with the full breakdown and active expenses;
 * scroll/drag zooms and pans the timeline.
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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // The zoom/pan window the user is currently looking at, in bar-index
  // terms - kept in sync with the zoom plugin's own state via
  // onZoomComplete/onPanComplete below, and restored after the chart is
  // rebuilt (e.g. new milestones landing) so a click or an unrelated data
  // refresh never silently resets what the user was looking at. Only an
  // actual granularity change (a different bar-per-period scale entirely)
  // deliberately recomputes it.
  const zoomRangeRef = useRef<{ min: number; max: number } | null>(null);
  const prevGranularityRef = useRef<TimeInterval | null>(null);

  // Resolved once per render so both the chart's annotations and the
  // details panel agree on which markers land on which bar.
  const resolvedEventMarkers = eventMarkers
    .map((marker) => ({
      marker,
      stateIndex: findStateIndexForDate(states, marker.date),
    }))
    .filter(({ stateIndex }) => stateIndex >= 0);

  useEffect(() => {
    if (!canvasRef.current || states.length === 0) return;

    // Guards the async continuation below against running after this
    // effect has already been cleaned up (e.g. a fast granularity switch
    // firing another update while the dynamic import is still in flight) -
    // without it, canvasRef.current can go null out from under
    // getContext() by the time the import resolves.
    let cancelled = false;

    // Dynamically import Chart.js and plugins only on the client side
    Promise.all([
      import("chart.js/auto"),
      import("chartjs-plugin-annotation"),
      import("chartjs-plugin-zoom"),
    ]).then(([ChartModule, AnnotationModule, ZoomModule]) => {
      if (cancelled || !canvasRef.current) return;

      const Chart = ChartModule.default;
      Chart.register(AnnotationModule.default);
      // deno-lint-ignore no-explicit-any
      Chart.register(ZoomModule.default as any);

      if (chartRef.current) {
        chartRef.current.destroy();
      }

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      const labels = states.map((state) => state.date.toLocaleDateString());
      const breakdowns = states.map(getBreakdown);

      // Skip a segment entirely (data + legend entry) when it's zero for
      // every period - e.g. no loan payment dataset at all when there's no
      // loan, rather than a legend entry that never draws anything.
      const allSegments: {
        key: keyof typeof SEGMENT_COLORS;
        label: string;
        values: number[];
      }[] = [
        {
          key: "income" as const,
          label: "Income",
          values: breakdowns.map((b) => b.income),
        },
        {
          key: "retirementWithdrawal" as const,
          label: "Retirement Withdrawal",
          values: breakdowns.map((b) => b.retirementWithdrawal),
        },
        {
          key: "expenses" as const,
          label: "Expenses",
          values: breakdowns.map((b) => -b.expenses),
        },
        {
          key: "loanPayment" as const,
          label: "Loan Payment",
          values: breakdowns.map((b) => -b.loanPayment),
        },
        {
          key: "investmentContribution" as const,
          label: "Investment Contribution",
          values: breakdowns.map((b) => -b.investmentContribution),
        },
      ];
      const segments = allSegments.filter((segment) =>
        segment.values.some((v) => v !== 0)
      );

      const datasets = segments.map((segment) => ({
        label: segment.label,
        data: segment.values,
        backgroundColor: SEGMENT_COLORS[segment.key].bg,
        borderColor: SEGMENT_COLORS[segment.key].border,
        borderWidth: 1,
        borderRadius: 3,
        stack: "cashflow",
      }));

      // Prepare transition + event marker annotations, plus a highlight on
      // whichever bar is currently selected for the details panel.
      const annotations: any = {};
      transitionPoints.forEach((tp, index) => {
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
            font: { size: 10, weight: "bold" },
            padding: 4,
            rotation: 0,
          },
        };
      });

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
            font: { size: 10, weight: "bold" },
            padding: 4,
            rotation: 0,
          },
        };
      });

      chartRef.current = new Chart(ctx, {
        type: "bar",
        data: { labels, datasets },
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
          onClick: (_event, elements) => {
            if (elements.length === 0) return;
            const index = elements[0].index;
            setSelectedIndex((current) => current === index ? null : index);
          },
          plugins: {
            title: {
              display: true,
              text: "Cash Flow Over Time",
              font: { size: 16, weight: "bold" },
              padding: { top: 10, bottom: 10 },
            },
            legend: {
              display: true,
              position: "bottom",
              labels: { boxWidth: 12, padding: 12, font: { size: 11 } },
            },
            zoom: {
              pan: {
                enabled: true,
                mode: "x",
                onPanComplete: ({ chart }) => {
                  zoomRangeRef.current = {
                    min: chart.scales.x.min,
                    max: chart.scales.x.max,
                  };
                },
              },
              zoom: {
                wheel: { enabled: true },
                pinch: { enabled: true },
                mode: "x",
                onZoomComplete: ({ chart }) => {
                  zoomRangeRef.current = {
                    min: chart.scales.x.min,
                    max: chart.scales.x.max,
                  };
                },
              },
              limits: { x: { minRange: 3 } },
            },
            tooltip: {
              backgroundColor: "rgba(0, 0, 0, 0.85)",
              padding: 10,
              cornerRadius: 8,
              displayColors: false,
              // The click-through details panel is where the full
              // breakdown/expense list lives now - the hover tooltip is
              // just a quick at-a-glance summary. Keeping exactly one
              // (arbitrary) tooltip item, rather than filtering all of
              // them out, is what keeps title/label callbacks below from
              // running with no data - Chart.js hands every callback the
              // same filtered item list.
              filter: (_item, index) => index === 0,
              callbacks: {
                label: function (context) {
                  const state = states[context.dataIndex];
                  if (!state) return "";
                  return `Net Cash Flow: ${
                    formatCurrency(getBreakdown(state).netCashFlow)
                  }`;
                },
                afterLabel: () => "Click bar for full breakdown →",
                title: function (context) {
                  const dateLabel = context[0].label;
                  const lines = [dateLabel];

                  const transitionAtIndex = transitionPoints.find(
                    (tp) => tp.stateIndex === context[0].dataIndex,
                  );
                  if (transitionAtIndex) {
                    lines.push(
                      `🔄 ${
                        transitionAtIndex.transition.label || "Transition"
                      }`,
                    );
                  }

                  resolvedEventMarkers
                    .filter(({ stateIndex }) =>
                      stateIndex === context[0].dataIndex
                    )
                    .forEach(({ marker }) => {
                      lines.push(`📌 ${marker.label}`);
                    });

                  return lines;
                },
              },
            },
            annotation: {
              annotations: annotations,
            },
          },
          scales: {
            x: {
              stacked: true,
              title: {
                display: true,
                text: "Date",
                font: { weight: "bold" },
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
              stacked: true,
              title: {
                display: true,
                text: "Cash Flow ($)",
                font: { weight: "bold" },
              },
              ticks: {
                callback: function (value) {
                  return formatCurrency(value as number);
                },
              },
              grid: {
                color: function (context) {
                  return context.tick.value === 0
                    ? "rgba(0, 0, 0, 0.5)"
                    : "rgba(0, 0, 0, 0.05)";
                },
                lineWidth: function (context) {
                  return context.tick.value === 0 ? 2 : 1;
                },
              },
            },
          },
        },
      });

      // Stashed on the instance (not React state) so the selection-only
      // effect below can rebuild the annotations map - transitions/markers
      // plus whichever bar is selected - without needing to redo all this
      // setup itself.
      chartRef.current.__baseAnnotations = annotations;

      // A granularity switch changes how many bars exist per unit of time
      // (e.g. weekly vs yearly), so the previous zoom window's index range
      // no longer means the same thing - recompute a readable default
      // instead. Anything else that triggered a rebuild (new milestones,
      // an edited expense, ...) keeps the window the user was already on.
      const granularityChanged = prevGranularityRef.current !== null &&
        prevGranularityRef.current !== granularity;
      prevGranularityRef.current = granularity;

      const DEFAULT_WINDOW: Record<TimeInterval, number> = {
        week: 52,
        fortnight: 26,
        month: 24,
        year: Infinity,
      };

      let targetRange = zoomRangeRef.current;
      if (!targetRange || granularityChanged) {
        const windowSize = Math.min(
          DEFAULT_WINDOW[granularity],
          states.length,
        );
        targetRange = windowSize < states.length
          ? { min: 0, max: windowSize - 1 }
          : null;
      } else {
        // Clamp a restored range to the (possibly shorter/longer) new data.
        targetRange = {
          min: Math.max(0, targetRange.min),
          max: Math.min(states.length - 1, targetRange.max),
        };
      }

      zoomRangeRef.current = targetRange;
      if (targetRange) {
        chartRef.current.zoomScale("x", targetRange, "default");
      }
    });

    return () => {
      cancelled = true;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [states, transitionPoints, eventMarkers, expenseItems, granularity]);

  // Highlighting the selected bar is a pure annotation-plugin update on
  // the existing chart instance, deliberately kept out of the rebuild
  // effect above - recreating the whole Chart.js instance on every click
  // would reset the zoom/pan window the user was looking at.
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const base = chart.__baseAnnotations ?? {};
    const annotations = { ...base };
    if (selectedIndex !== null && selectedIndex < states.length) {
      annotations["selected-bar"] = {
        type: "box",
        xMin: selectedIndex - 0.5,
        xMax: selectedIndex + 0.5,
        backgroundColor: "rgba(59, 130, 246, 0.12)",
        borderColor: "rgba(59, 130, 246, 0.6)",
        borderWidth: 2,
        borderDash: [4, 2],
        drawTime: "beforeDatasetsDraw",
      };
    }
    chart.options.plugins.annotation.annotations = annotations;
    chart.update("none");
  }, [selectedIndex, states.length]);

  const resetZoom = () => {
    chartRef.current?.resetZoom?.();
  };

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

  const selectedState = selectedIndex !== null
    ? states[selectedIndex]
    : undefined;

  return (
    <div class="card p-4 chart-transition">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs text-gray-500">
          Scroll/pinch to zoom, drag to pan, click a bar for details
        </p>
        <button
          type="button"
          onClick={resetZoom}
          class="text-xs text-blue-600 hover:text-blue-800 hover:underline"
        >
          Reset Zoom
        </button>
      </div>
      <div class="flex flex-col lg:flex-row gap-4">
        <div style={{ height: "400px" }} class="flex-1 min-w-0">
          <canvas ref={canvasRef}></canvas>
        </div>
        <div class="lg:w-72 shrink-0 lg:border-l lg:pl-4 lg:h-[400px] lg:overflow-y-auto lg:pr-1">
          {selectedState
            ? (
              <CashFlowDetailsPanel
                state={selectedState}
                expenseItems={expenseItems}
                granularity={granularity}
                transitionPoint={transitionPoints.find((tp) =>
                  tp.stateIndex === selectedIndex
                )}
                markers={resolvedEventMarkers
                  .filter(({ stateIndex }) => stateIndex === selectedIndex)
                  .map(({ marker }) => marker)}
                onClose={() => setSelectedIndex(null)}
              />
            )
            : (
              <div class="h-full flex items-center justify-center text-center text-sm text-gray-400 italic p-6">
                Click a bar to see its full breakdown here
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function CashFlowDetailsPanel({
  state,
  expenseItems,
  granularity,
  transitionPoint,
  markers,
  onClose,
}: {
  state: StateWithPeriodTotals;
  expenseItems: ExpenseItem[];
  granularity: TimeInterval;
  transitionPoint?: TransitionPoint;
  markers: ChartEventMarker[];
  onClose: () => void;
}) {
  const breakdown = getBreakdown(state);
  const expenseBreakdown = ExpenseProcessor.getActiveExpenseBreakdown(
    expenseItems,
    granularity,
    state.date,
  );

  const rows: {
    label: string;
    value: number;
    color: string;
    sign: "+" | "−";
  }[] = [];
  if (breakdown.income !== 0) {
    rows.push({
      label: "Income",
      value: breakdown.income,
      color: SEGMENT_COLORS.income.border,
      sign: "+",
    });
  }
  if (breakdown.retirementWithdrawal !== 0) {
    rows.push({
      label: "Retirement Withdrawal",
      value: breakdown.retirementWithdrawal,
      color: SEGMENT_COLORS.retirementWithdrawal.border,
      sign: "+",
    });
  }
  if (breakdown.expenses !== 0) {
    rows.push({
      label: "Expenses",
      value: breakdown.expenses,
      color: SEGMENT_COLORS.expenses.border,
      sign: "−",
    });
  }
  if (breakdown.loanPayment !== 0) {
    rows.push({
      label: "Loan Payment",
      value: breakdown.loanPayment,
      color: SEGMENT_COLORS.loanPayment.border,
      sign: "−",
    });
  }
  if (breakdown.investmentContribution !== 0) {
    rows.push({
      label: "Investment Contribution",
      value: breakdown.investmentContribution,
      color: SEGMENT_COLORS.investmentContribution.border,
      sign: "−",
    });
  }

  return (
    <div class="fade-in">
      <div class="flex items-start justify-between mb-3">
        <h4 class="font-semibold text-gray-800">
          {state.date.toLocaleDateString()}
        </h4>
        <button
          type="button"
          onClick={onClose}
          class="text-gray-400 hover:text-gray-600 text-lg leading-none"
          aria-label="Close details"
        >
          ×
        </button>
      </div>

      {(transitionPoint || markers.length > 0) && (
        <div class="mb-3 space-y-1.5">
          {transitionPoint && (
            <div class="text-xs bg-pink-50 border border-pink-200 rounded px-2 py-1.5">
              <span class="font-medium text-pink-800">
                🔄 {transitionPoint.transition.label || "Transition"}
              </span>
              <p class="text-pink-700 mt-0.5">
                {transitionPoint.changesSummary}
              </p>
            </div>
          )}
          {markers.map((marker, i) => (
            <div
              key={i}
              class="text-xs rounded px-2 py-1.5 border"
              style={{
                backgroundColor: `${marker.color.replace("0.85", "0.1")}`,
                borderColor: marker.color,
              }}
            >
              <span class="font-medium">📌 {marker.label}</span>
              {marker.description && (
                <p class="text-gray-600 mt-0.5">{marker.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div class="space-y-1 mb-3">
        {rows.map((row) => (
          <div
            key={row.label}
            class="flex items-center justify-between text-sm"
          >
            <span class="flex items-center gap-1.5 text-gray-700">
              <span
                class="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: row.color }}
              />
              {row.label}
            </span>
            <span class="font-medium text-gray-900">
              {row.sign} {formatCurrency(Math.abs(row.value))}
            </span>
          </div>
        ))}
        <div class="flex items-center justify-between text-sm pt-1.5 mt-1.5 border-t border-gray-200 font-semibold">
          <span>Net Cash Flow</span>
          <span
            class={breakdown.netCashFlow >= 0
              ? "text-green-700"
              : "text-red-700"}
          >
            {formatCurrency(breakdown.netCashFlow)}
          </span>
        </div>
      </div>

      {expenseBreakdown.length > 0 && (
        <div>
          <h5 class="text-xs font-semibold text-gray-600 uppercase mb-1.5">
            Expenses
          </h5>
          <div class="space-y-1">
            {expenseBreakdown.map((item) => (
              <div
                key={item.id}
                class="flex items-center justify-between text-xs"
              >
                <span class="flex items-center gap-1 text-gray-600">
                  <span>{CATEGORY_INFO[item.category]?.icon ?? ""}</span>
                  {item.name}
                </span>
                <span class="text-gray-800">
                  {formatCurrency(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
