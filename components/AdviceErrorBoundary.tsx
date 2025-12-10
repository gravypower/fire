/**
 * AdviceErrorBoundary - Specialized error boundary for retirement advice components
 * Provides fallback UI specifically for advice generation and display failures
 * Validates: Requirements 2.1
 */

import { Component, ComponentChildren } from "preact";
import type { AdviceGenerationError } from "../types/milestones.ts";

interface AdviceErrorBoundaryProps {
  children: ComponentChildren;
  /** Optional callback when user wants to retry */
  onRetry?: () => void;
  /** Optional fallback component */
  fallback?: (error: Error, retry: () => void) => ComponentChildren;
  /** Context about what advice operation failed */
  context?: string;
}

interface AdviceErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

/**
 * AdviceErrorBoundary component
 * 
 * Catches errors in advice-related components and displays a user-friendly
 * fallback UI with options to retry or continue without advice.
 */
export default class AdviceErrorBoundary extends Component<
  AdviceErrorBoundaryProps,
  AdviceErrorBoundaryState
> {
  constructor(props: AdviceErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AdviceErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Advice component error:", error);
    console.error("Error context:", this.props.context);
    console.error("Error info:", errorInfo);
    
    this.setState({
      errorInfo: errorInfo?.componentStack || "No additional error information available",
    });
  }

  handleRetry = () => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call parent retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default advice-specific fallback UI
      return (
        <div class="card p-6 fade-in">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg
                class="h-8 w-8 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div class="ml-4 flex-1">
              <h3 class="text-lg font-semibold text-blue-800 mb-2">
                Retirement Advice Unavailable
              </h3>
              <div class="text-sm text-blue-700 mb-4">
                <p class="mb-2">
                  We encountered an issue while {this.props.context || "generating retirement advice"}. 
                  Your simulation results are still available and accurate.
                </p>
                <div class="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                  <p class="text-xs text-blue-800">
                    <strong>What this means:</strong> The financial simulation completed successfully, 
                    but we couldn't generate personalized recommendations. You can still review your 
                    timeline, milestones, and make your own strategic decisions.
                  </p>
                </div>
                <div class="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                  <p class="text-xs text-blue-800">
                    <strong>Alternative:</strong> Consider consulting with a financial advisor for 
                    personalized recommendations based on your simulation results.
                  </p>
                </div>
                <details class="mt-3">
                  <summary class="cursor-pointer font-medium hover:text-blue-800">
                    Technical details
                  </summary>
                  <div class="mt-2 p-3 bg-blue-50 rounded border border-blue-200 overflow-auto">
                    <p class="font-mono text-xs mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </p>
                    <p class="font-mono text-xs text-blue-600">
                      <strong>Context:</strong> {this.props.context || "Unknown"}
                    </p>
                  </div>
                </details>
              </div>
              <div class="flex gap-3">
                <button
                  onClick={this.handleRetry}
                  class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
                >
                  Retry Advice
                </button>
                <button
                  onClick={() => window.location.reload()}
                  class="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors duration-200 text-sm font-medium"
                >
                  Refresh Page
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

/**
 * Hook-style error boundary for functional components
 */
export function withAdviceErrorBoundary<T extends Record<string, any>>(
  Component: (props: T) => ComponentChildren,
  context?: string
) {
  return function WrappedComponent(props: T) {
    return (
      <AdviceErrorBoundary context={context}>
        <Component {...props} />
      </AdviceErrorBoundary>
    );
  };
}