/**
 * Test route for VisualizationIsland component
 */

import VisualizationIsland from "../islands/VisualizationIsland.tsx";
import type { SimulationResult } from "../types/financial.ts";

export default function TestVisualizationPage() {
  // Create mock simulation result for testing
  const mockResult: SimulationResult = {
    states: [
      {
        date: new Date("2024-01-01"),
        cash: 5000,
        investments: 50000,
        superannuation: 100000,
        loanBalance: 300000,
        netWorth: -145000,
        cashFlow: 1000,
      },
      {
        date: new Date("2024-02-01"),
        cash: 6000,
        investments: 51000,
        superannuation: 101000,
        loanBalance: 298000,
        netWorth: -140000,
        cashFlow: 1000,
      },
      {
        date: new Date("2024-03-01"),
        cash: 7000,
        investments: 52000,
        superannuation: 102000,
        loanBalance: 296000,
        netWorth: -135000,
        cashFlow: 1000,
      },
      {
        date: new Date("2025-01-01"),
        cash: 15000,
        investments: 65000,
        superannuation: 115000,
        loanBalance: 280000,
        netWorth: -85000,
        cashFlow: 1200,
      },
      {
        date: new Date("2026-01-01"),
        cash: 25000,
        investments: 80000,
        superannuation: 130000,
        loanBalance: 260000,
        netWorth: -25000,
        cashFlow: 1500,
      },
      {
        date: new Date("2027-01-01"),
        cash: 35000,
        investments: 100000,
        superannuation: 150000,
        loanBalance: 240000,
        netWorth: 45000,
        cashFlow: 2000,
      },
    ],
    retirementDate: new Date("2045-06-15"),
    retirementAge: 65,
    isSustainable: true,
    warnings: [
      "Loan balance is increasing over time ($5,000.00 increase). This indicates unsustainable debt growth.",
      "Consider increasing your investment contributions to reach retirement sooner.",
    ],
  };

  return (
    <div class="min-h-screen bg-gray-100 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">
          VisualizationIsland Test Page
        </h1>
        
        <VisualizationIsland result={mockResult} />
      </div>
    </div>
  );
}
