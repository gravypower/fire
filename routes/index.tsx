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
      {/* Header moved to MainIsland for interactivity */}

      {/* Main Content - Delegated to Island */}
      <div class="flex-1 overflow-hidden">
        <MainIsland />
      </div>
    </div>
  );
}
