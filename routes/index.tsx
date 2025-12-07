/**
 * Main page route for Finance Simulation Tool
 * Validates: Requirements 8.2, 8.3, 8.4
 * 
 * This route provides the static layout and delegates interactive logic to MainIsland
 */

import MainIsland from "../islands/MainIsland.tsx";

/**
 * Home component - Main page for the Finance Simulation Tool
 * 
 * Requirements 8.2: Uses Fresh's island architecture for interactive components
 * Requirements 8.3: Leverages server-side rendering for initial page loads
 * Requirements 8.4: Uses Fresh islands for client-side interactivity
 */
export default function Home() {
  return (
    <div class="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header class="bg-white shadow-sm sticky top-0 z-10">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center">
            <svg class="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <div>
              <h1 class="text-2xl sm:text-3xl font-bold text-gray-900">
                Finance Simulation Tool
              </h1>
              <p class="mt-1 text-xs sm:text-sm text-gray-600">
                Model your financial future and plan for retirement
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Delegated to Island */}
      <MainIsland />

      {/* Footer */}
      <footer class="bg-white border-t border-gray-200 mt-8 sm:mt-12 no-print">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p class="text-center text-xs sm:text-sm text-gray-500">
            Finance Simulation Tool - Plan your financial future with confidence
          </p>
        </div>
      </footer>
    </div>
  );
}
