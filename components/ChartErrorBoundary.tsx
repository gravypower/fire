/**
 * ChartErrorBoundary - Specialized error boundary for chart components
 * Provides fallback UI specifically for chart rendering failures
 */

import { Component, ComponentChildren } from "preact";

interface ChartErrorBoundaryProps {
  children: ComponentChildren;
  chartName?: string;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ChartErrorBoundary component
 * 
 * Catches errors in chart components and displays a user-friendly
 * fallback UI with the option to retry or view data in table format.
 */
export default class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ChartErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Chart rendering error:", error);
    console.error("Error info:", errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const chartName = this.props.chartName || "Chart";

      return (
        <div class="card p-6 fade-in">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg
                class="h-8 w-8 text-orange-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div class="ml-4 flex-1">
              <h3 class="text-lg font-semibold text-orange-800 mb-2">
                {chartName} Unavailable
              </h3>
              <p class="text-sm text-orange-700 mb-4">
                We encountered an issue while rendering the chart. This might be due to
                browser compatibility or data formatting issues.
              </p>
              <div class="bg-orange-50 border border-orange-200 rounded-md p-3 mb-4">
                <p class="text-xs text-orange-800">
                  <strong>Tip:</strong> Try refreshing the page or viewing the data in table format below.
                </p>
              </div>
              <div class="flex gap-3">
                <button
                  onClick={this.handleReset}
                  class="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors duration-200 text-sm font-medium"
                >
                  Retry Chart
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
