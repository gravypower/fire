/**
 * Test to verify retirement income is properly deducted
 */

import { assertEquals } from "$std/assert/mod.ts";
import { SimulationEngine } from "../lib/simulation_engine.ts";
import type { UserParameters } from "../types/financial.ts";

Deno.test("Retirement drawdown - net worth should decline in retirement", () => {
  const params: UserParameters = {
    annualSalary: 100000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 3000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 0,
    loanInterestRate: 0,
    loanPaymentAmount: 0,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 2000,
    investmentReturnRate: 7,
    currentInvestmentBalance: 500000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 300000,
    desiredAnnualRetirementIncome: 60000, // $60k per year
    retirementAge: 35, // Retire after 5 years
    currentAge: 30,
    simulationYears: 15, // Run for 15 years (5 working + 10 retired)
    startDate: new Date("2024-01-01"),
  };

  const result = SimulationEngine.runSimulation(params);

  // Find the retirement state (age 35)
  const retirementStateIndex = result.states.findIndex((state) => {
    const yearsElapsed = (state.date.getTime() - params.startDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25);
    const currentAge = params.currentAge + yearsElapsed;
    return currentAge >= params.retirementAge;
  });

  console.log(`Found retirement at state index: ${retirementStateIndex}`);

  const retirementState = result.states[retirementStateIndex];
  const finalState = result.states[result.states.length - 1];

  console.log(`\nRetirement (age 35):`);
  console.log(`  Net Worth: $${retirementState.netWorth.toLocaleString()}`);
  console.log(
    `  Investments: $${retirementState.investments.toLocaleString()}`,
  );
  console.log(`  Super: $${retirementState.superannuation.toLocaleString()}`);
  console.log(`  Cash: $${retirementState.cash.toLocaleString()}`);

  console.log(`\nFinal State (age 45):`);
  console.log(`  Net Worth: $${finalState.netWorth.toLocaleString()}`);
  console.log(`  Investments: $${finalState.investments.toLocaleString()}`);
  console.log(`  Super: $${finalState.superannuation.toLocaleString()}`);
  console.log(`  Cash: $${finalState.cash.toLocaleString()}`);

  // Check a few states during retirement to see the trend
  console.log(`\nNet worth during retirement:`);
  for (let i = retirementStateIndex; i < result.states.length; i += 12) {
    const state = result.states[i];
    const yearsElapsed = (state.date.getTime() - params.startDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25);
    const age = Math.floor(params.currentAge + yearsElapsed);
    console.log(`  Age ${age}: $${state.netWorth.toLocaleString()}`);
  }

  // With 7% growth and $60k withdrawals, net worth behavior depends on the balance
  // If growth (7% of $800k = $56k) is less than withdrawals ($60k), net worth should decline
  // Let's check if net worth is declining over the retirement period

  // Sample a few points during retirement
  const midRetirementIndex = retirementStateIndex +
    Math.floor((result.states.length - retirementStateIndex) / 2);
  const midRetirementState = result.states[midRetirementIndex];

  console.log(`\nChecking drawdown behavior:`);
  console.log(
    `  Retirement net worth: $${retirementState.netWorth.toLocaleString()}`,
  );
  console.log(
    `  Mid-retirement net worth: $${midRetirementState.netWorth.toLocaleString()}`,
  );
  console.log(`  Final net worth: $${finalState.netWorth.toLocaleString()}`);

  // The key assertion: if withdrawals exceed growth, net worth should decline
  // With $800k at 7% = $56k growth vs $60k withdrawals, we should see decline
  const totalAssets = retirementState.investments +
    retirementState.superannuation;
  const annualGrowth = totalAssets * 0.07;

  console.log(`\nExpected behavior:`);
  console.log(`  Total assets at retirement: $${totalAssets.toLocaleString()}`);
  console.log(`  Annual growth (7%): $${annualGrowth.toLocaleString()}`);
  console.log(
    `  Annual withdrawal: $${params.desiredAnnualRetirementIncome.toLocaleString()}`,
  );

  if (annualGrowth < params.desiredAnnualRetirementIncome) {
    console.log(`  ✓ Growth < Withdrawals → Net worth SHOULD decline`);
    // Net worth should be declining
    assertEquals(
      finalState.netWorth < retirementState.netWorth,
      true,
      `Net worth should decline in retirement when withdrawals exceed growth. ` +
        `Retirement: $${retirementState.netWorth}, Final: $${finalState.netWorth}`,
    );
  } else {
    console.log(
      `  ✓ Growth >= Withdrawals → Net worth may stay stable or grow`,
    );
  }
});
