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
    <div class="h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header class="bg-white shadow-sm flex-shrink-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <svg class="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <div>
                <h1 class="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  Finance Simulation Tool
                </h1>
                <p class="mt-1 text-xs sm:text-sm text-gray-600">
                  Model your financial future and plan for retirement
                </p>
              </div>
            </div>
            <a 
              href="/help" 
              class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
              title="Learn how to use this tool"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span class="hidden sm:inline">Help</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content - Delegated to Island */}
      <div class="flex-1 overflow-hidden">
        <MainIsland />
      </div>
    </div>
  );
}
