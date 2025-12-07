/**
 * Test route for SimulationIsland component
 * Tests integration between InputIsland and SimulationIsland
 * Validates: Requirements 5.1, 5.2
 */

import { useSignal } from "@preact/signals";
import InputIsland from "../islands/InputIsland.tsx";
import SimulationIsland from "../islands/SimulationIsland.tsx";
import type { UserParameters } from "../types/financial.ts";

export default function TestSimulation() {
  return (
    <div class="min-h-screen bg-gray-100 py-8">
      <div class="max-w-6xl mx-auto">
        <h1 class="text-3xl font-bold mb-6 text-center">
          Finance Simulation - Full Test
        </h1>
        
        <p class="text-center text-gray-600 mb-6">
          This page tests the integration between InputIsland and SimulationIsland.
          Modify parameters on the left to see simulation results update automatically on the right.
        </p>
        
        <TestSimulationContent />
      </div>
    </div>
  );
}

/**
 * Content component that manages state between islands
 */
function TestSimulationContent() {
  const parameters = useSignal<UserParameters | null>(null);

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input Section */}
      <div>
        <InputIsland onParametersChange={(params) => {
          parameters.value = params;
        }} />
      </div>
      
      {/* Results Section */}
      <div>
        {parameters.value ? (
          <SimulationIsland 
            parameters={parameters.value}
            onSimulationComplete={(result) => {
              console.log("Simulation completed:", result);
            }}
          />
        ) : (
          <div class="bg-white p-6 rounded-lg shadow-md">
            <p class="text-gray-600 text-center">
              Loading parameters...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
