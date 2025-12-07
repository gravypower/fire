/**
 * Test route for InputIsland component
 */

import InputIsland from "../islands/InputIsland.tsx";
import type { UserParameters } from "../types/financial.ts";

export default function TestInput() {
  const handleParametersChange = (params: UserParameters) => {
    console.log("Parameters changed:", params);
  };

  return (
    <div class="min-h-screen bg-gray-100 py-8">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-6 text-center">
          Finance Simulation - Input Test
        </h1>
        <InputIsland onParametersChange={handleParametersChange} />
      </div>
    </div>
  );
}
