import { assert } from "$std/assert/mod.ts";
import { SimulationEngine } from "../../lib/simulation_engine.ts";
import type { UserParameters } from "../../types/financial.ts";

function getEarlyRetirementParameters(): UserParameters {
  return {
    annualSalary: 0, // Retired
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 5000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 0,
    loanInterestRate: 0,
    loanPaymentAmount: 0,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 0,
    investmentReturnRate: 5,
    currentInvestmentBalance: 1000,
    superContributionRate: 0,
    superReturnRate: 5,
    currentSuperBalance: 500000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 55,
    currentAge: 55, // Early retirement
    simulationYears: 4, // Up to 59
    startDate: new Date("2024-01-01"),
    householdMode: "single",
  };
}

Deno.test("Reproduction - Super should NOT decrease before preservation age (60)", () => {
  const params = getEarlyRetirementParameters();

  // Run simulation
  const result = SimulationEngine.runSimulation(params);

  const initialSuper = result.states[0].superannuation;
  const finalSuper = result.states[result.states.length - 1].superannuation;

  console.log(`Initial Super (Age 55): ${initialSuper}`);
  console.log(`Final Super (Age 59): ${finalSuper}`);

  // Super should INCREASE (returns only) because we can't touch it yet
  assert(
    finalSuper > initialSuper,
    `Super should have GROWN. Initial: ${initialSuper}, Final: ${finalSuper}`,
  );
});
