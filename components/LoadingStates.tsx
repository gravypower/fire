/**
 * LoadingStates - Reusable loading state components for async operations
 * Provides consistent loading UI for milestone and advice generation
 * Validates: Requirements 1.1, 2.1
 */

import { ComponentChildren } from "preact";

/**
 * Props for loading state components
 */
interface LoadingStateProps {
  /** Loading message to display */
  message?: string;
  /** Additional details about what's loading */
  details?: string;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Whether to show a progress indicator */
  showProgress?: boolean;
}

/**
 * Generic loading spinner component
 */
export function LoadingSpinner({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
  };

  return (
    <svg
      class={`animate-spin ${sizeClasses[size]} text-blue-600`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Loading state for milestone detection
 */
export function MilestoneLoadingState({ 
  message = "Detecting milestones...", 
  details = "Analyzing your financial timeline for major events",
  size = 'medium',
  showProgress = false 
}: LoadingStateProps) {
  return (
    <div class="card p-6 fade-in">
      <div class="flex items-center justify-center">
        <div class="text-center">
          <div class="flex justify-center mb-4">
            <LoadingSpinner size={size} />
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {message}
          </h3>
          {details && (
            <p class="text-sm text-gray-600 mb-4">
              {details}
            </p>
          )}
          {showProgress && (
            <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div class="bg-blue-600 h-2 rounded-full animate-pulse" style="width: 60%"></div>
            </div>
          )}
          <div class="flex items-center justify-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
              />
            </svg>
            <span>Processing financial events...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading state for retirement advice generation
 */
export function AdviceLoadingState({ 
  message = "Generating retirement advice...", 
  details = "Analyzing your financial situation and creating personalized recommendations",
  size = 'medium',
  showProgress = false 
}: LoadingStateProps) {
  return (
    <div class="card p-6 fade-in">
      <div class="flex items-center justify-center">
        <div class="text-center">
          <div class="flex justify-center mb-4">
            <LoadingSpinner size={size} />
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mb-2">
            {message}
          </h3>
          {details && (
            <p class="text-sm text-gray-600 mb-4">
              {details}
            </p>
          )}
          {showProgress && (
            <div class="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div class="bg-blue-600 h-2 rounded-full animate-pulse" style="width: 75%"></div>
            </div>
          )}
          <div class="flex items-center justify-center gap-2 text-xs text-gray-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <span>Calculating recommendations...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline loading state for smaller components
 */
export function InlineLoadingState({ 
  message = "Loading...", 
  size = 'small' 
}: { message?: string; size?: 'small' | 'medium' }) {
  return (
    <div class="flex items-center gap-2 text-gray-600">
      <LoadingSpinner size={size} />
      <span class="text-sm">{message}</span>
    </div>
  );
}

/**
 * Skeleton loading state for milestone cards
 */
export function MilestoneSkeletonLoader() {
  return (
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-6">Financial Milestones</h3>
      <div class="space-y-6">
        {[1, 2, 3].map((index) => (
          <div key={index} class="relative">
            {/* Timeline dot */}
            <div class="absolute left-4 w-4 h-4 rounded-full bg-gray-300 animate-pulse hidden sm:block" />
            
            {/* Milestone card skeleton */}
            <div class="sm:pl-12">
              <div class="border rounded-lg p-4 border-gray-200 bg-gray-50">
                {/* Header */}
                <div class="flex items-start justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gray-300 rounded animate-pulse" />
                    <div>
                      <div class="h-4 bg-gray-300 rounded w-32 mb-2 animate-pulse" />
                      <div class="h-3 bg-gray-300 rounded w-20 animate-pulse" />
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="h-6 bg-gray-300 rounded-full w-16 animate-pulse" />
                    <div class="w-4 h-4 bg-gray-300 rounded animate-pulse" />
                  </div>
                </div>

                {/* Content */}
                <div class="space-y-2">
                  <div class="h-4 bg-gray-300 rounded w-full animate-pulse" />
                  <div class="h-4 bg-gray-300 rounded w-3/4 animate-pulse" />
                  <div class="h-4 bg-gray-300 rounded w-1/2 animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for advice cards
 */
export function AdviceSkeletonLoader() {
  return (
    <div class="card p-6">
      <h3 class="text-lg font-semibold text-gray-800 mb-6">Retirement Advice</h3>
      
      {/* Overall assessment skeleton */}
      <div class="rounded-lg p-4 mb-6 bg-gray-50 border border-gray-200">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-8 h-8 bg-gray-300 rounded animate-pulse" />
          <div>
            <div class="h-5 bg-gray-300 rounded w-48 mb-2 animate-pulse" />
            <div class="h-6 bg-gray-300 rounded-full w-24 animate-pulse" />
          </div>
        </div>
        <div class="space-y-2">
          <div class="h-4 bg-gray-300 rounded w-full animate-pulse" />
          <div class="h-4 bg-gray-300 rounded w-2/3 animate-pulse" />
        </div>
      </div>

      {/* Advice cards skeleton */}
      <div class="space-y-4">
        {[1, 2, 3].map((index) => (
          <div key={index} class="border rounded-lg p-4 border-gray-200 bg-gray-50">
            {/* Header */}
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-gray-300 rounded animate-pulse" />
                <div class="flex-1">
                  <div class="h-4 bg-gray-300 rounded w-40 mb-2 animate-pulse" />
                  <div class="flex items-center gap-2">
                    <div class="h-5 bg-gray-300 rounded-full w-16 animate-pulse" />
                    <div class="h-5 bg-gray-300 rounded-full w-20 animate-pulse" />
                  </div>
                </div>
              </div>
              <div class="w-4 h-4 bg-gray-300 rounded animate-pulse" />
            </div>

            {/* Content */}
            <div class="space-y-2 mb-3">
              <div class="h-4 bg-gray-300 rounded w-full animate-pulse" />
              <div class="h-4 bg-gray-300 rounded w-5/6 animate-pulse" />
            </div>

            {/* Impact metrics */}
            <div class="grid grid-cols-3 gap-2 mb-3">
              <div class="h-4 bg-gray-300 rounded animate-pulse" />
              <div class="h-4 bg-gray-300 rounded animate-pulse" />
              <div class="h-4 bg-gray-300 rounded animate-pulse" />
            </div>

            {/* Progress bars */}
            <div class="grid grid-cols-2 gap-4">
              <div>
                <div class="h-3 bg-gray-300 rounded w-20 mb-1 animate-pulse" />
                <div class="h-2 bg-gray-300 rounded animate-pulse" />
              </div>
              <div>
                <div class="h-3 bg-gray-300 rounded w-20 mb-1 animate-pulse" />
                <div class="h-2 bg-gray-300 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Higher-order component that adds loading state to any component
 */
export function withLoadingState<T extends Record<string, any>>(
  Component: (props: T) => ComponentChildren,
  LoadingComponent: () => ComponentChildren
) {
  return function WrappedComponent(props: T & { isLoading?: boolean }) {
    if (props.isLoading) {
      return <LoadingComponent />;
    }
    
    const { isLoading, ...componentProps } = props;
    return <Component {...(componentProps as T)} />;
  };
}