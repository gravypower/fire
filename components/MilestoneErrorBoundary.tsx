/**
 * MilestoneErrorBoundary - Specialized error boundary for milestone components
 * Provides fallback UI specifically for milestone detection and display failures
 * Validates: Requirements 1.1, 2.1
 */

import { Component, ComponentChildren } from "preact";
import type { MilestoneDetectionError } from "../types/milestones.ts";

interface MilestoneErrorBoundaryProps {
  children: ComponentChildren;
  /** Optional callback when user wants to retry */
  onRetry?: () => void;
  /** Optional fallback component */
  fallback?: (error: Error, retry: () => void) => ComponentChildren;
  /** Context about what milestone operation failed */
  context?: string;
}

interface MilestoneErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

/**
 * MilestoneErrorBoundary component
 * 
 * Catches errors in milestone-related components and displays a user-friendly
 * fallback UI with options to retry or continue without milestones.
 */
export default class MilestoneErrorBoundary extends Component<
  MilestoneErrorBoundaryProps,
  MilestoneErrorBoundaryState
> {
  constructor(props: MilestoneErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<MilestoneErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("Milestone component error:", error);
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

      // Default milestone-specific fallback UI
      return (
        <div class="card p-6 fade-in">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <svg
                class="h-8 w-8 text-amber-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
            </div>
            <div class="ml-4 flex-1">
              <h3 class="text-lg font-semibold text-amber-800 mb-2">
                Milestone Detection Issue
              </h3>
              <div class="text-sm text-amber-700 mb-4">
                <p class="mb-2">
                  We encountered an issue while {this.props.context || "processing milestones"}. 
                  Your simulation results are still available, but milestone information may be incomplete.
                </p>
                <div class="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
                  <p class="text-xs text-amber-800">
                    <strong>What this means:</strong> The core simulation completed successfully, 
                    but we couldn't detect or display some milestone events. You can still view 
                    your financial timeline and other results.
                  </p>
                </div>
                <details class="mt-3">
                  <summary class="cursor-pointer font-medium hover:text-amber-800">
                    Technical details
                  </summary>
                  <div class="mt-2 p-3 bg-amber-50 rounded border border-amber-200 overflow-auto">
                    <p class="font-mono text-xs mb-2">
                      <strong>Error:</strong> {this.state.error.message}
                    </p>
                    <p class="font-mono text-xs text-amber-600">
                      <strong>Context:</strong> {this.props.context || "Unknown"}
                    </p>
                  </div>
                </details>
              </div>
              <div class="flex gap-3">
                <button
                  onClick={this.handleRetry}
                  class="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 transition-colors duration-200 text-sm font-medium"
                >
                  Retry Milestones
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
export function withMilestoneErrorBoundary<T extends Record<string, any>>(
  Component: (props: T) => ComponentChildren,
  context?: string
) {
  return function WrappedComponent(props: T) {
    return (
      <MilestoneErrorBoundary context={context}>
        <Component {...props} />
      </MilestoneErrorBoundary>
    );
  };
}