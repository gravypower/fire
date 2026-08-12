import { assert, assertEquals } from "$std/assert/mod.ts";
import { SimulationEngine } from "../../lib/simulation_engine.ts";
import type { UserParameters } from "../../types/financial.ts";

function getRetirementParameters(
  strategy?: "investments_first" | "super_first" | "proportional",
): UserParameters {
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
    currentInvestmentBalance: 100000,
    superContributionRate: 0,
    superReturnRate: 5,
    currentSuperBalance: 100000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 60,
    currentAge: 65, // Already retired
    simulationYears: 5,
    startDate: new Date("2024-01-01"),
    householdMode: "single",
    drawdownStrategy: strategy,
  };
}

Deno.test("Drawdown - Investments First (Default)", () => {
  const params = getRetirementParameters("investments_first");
  const result = SimulationEngine.runSimulation(params);

  const initialInvestments = result.states[0].investments;
  const finalInvestments = result.states[result.states.length - 1].investments;

  // Investments should be heavily depleted
  assert(
    finalInvestments < initialInvestments * 0.5,
    "Investments should be significantly depleted",
  );

  // Super should be relatively untouched (only growth) or slightly depleted if investments ran out
  // But here we set enough investments (100k) to last ~2 years, so eventually super will be used
  // Let's check the FIRST few months to see order

  const month2State = result.states[2];
  // Investments should have dropped (withdrawal)
  assert(
    month2State.investments < 100000,
    "Investments should drop immediately",
  );
  // Super should have GROWN (no withdrawal yet)
  assert(month2State.superannuation > 100000, "Super should grow initially");
});

Deno.test("Drawdown - Super First", () => {
  const params = getRetirementParameters("super_first");
  const result = SimulationEngine.runSimulation(params);

  // Check first few months
  const month2State = result.states[2];

  // Investments should have GROWN (no withdrawal yet)
  assert(month2State.investments > 100000, "Investments should grow initially");

  // Super should have DROPPED (withdrawal)
  assert(month2State.superannuation < 100000, "Super should drop immediately");
});

Deno.test("Drawdown - Proportional", () => {
  const params = getRetirementParameters("proportional");
  const result = SimulationEngine.runSimulation(params);

  // Check first few months
  const month2State = result.states[2];

  // BOTH should have DROPPED
  assert(month2State.investments < 100000, "Investments should drop");
  assert(month2State.superannuation < 100000, "Super should drop");

  // Since balances are equal (100k vs 100k), drops should be roughly equal
  const investmentDrop = 100000 - month2State.investments;
  const superDrop = 100000 - month2State.superannuation;

  // Allow small margin for floating point differences
  assertEquals(
    Math.abs(investmentDrop - superDrop) < 100,
    true,
    `Drops should be similar. Invest: ${investmentDrop}, Super: ${superDrop}`,
  );
});
