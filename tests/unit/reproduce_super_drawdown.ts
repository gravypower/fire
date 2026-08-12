import { assert } from "$std/assert/mod.ts";
import { SimulationEngine } from "../../lib/simulation_engine.ts";
import type { UserParameters } from "../../types/financial.ts";
import {
  findEventsInPhase,
  findEventsOfType,
  printEventTimeline,
} from "./helpers/event_assertions.ts";
import {
  SimulationEventType,
  SimulationPhase,
} from "../../lib/simulation_events.ts";

function getRetirementParameters(): UserParameters {
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
    currentInvestmentBalance: 1000, // Low investments
    superContributionRate: 0,
    superReturnRate: 5,
    currentSuperBalance: 500000, // High super
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 60,
    currentAge: 65, // Already retired
    simulationYears: 5,
    startDate: new Date("2024-01-01"),
    householdMode: "single",
  };
}

Deno.test("Reproduction - Super should decrease when retired and investments depleted", () => {
  const params = getRetirementParameters();

  // Run simulation
  const result = SimulationEngine.runSimulation(params);

  const initialSuper = result.states[0].superannuation;
  const finalSuper = result.states[result.states.length - 1].superannuation;
  const events = result.events ?? [];

  console.log(`\nInitial Super: $${initialSuper.toFixed(2)}`);
  console.log(`Final Super: $${finalSuper.toFixed(2)}`);
  console.log(`Total Events: ${events.length}`);

  // Print event timeline for debugging
  console.log("\n" + "=".repeat(80));
  console.log("DEBUGGING: Event Timeline for First 3 Months");
  console.log("=".repeat(80));

  // Get events for first 3 months
  const firstThreeMonths = events.filter((e) => {
    const monthsSinceStart =
      (e.timestamp.getTime() - params.startDate.getTime()) /
      (1000 * 60 * 60 * 24 * 30);
    return monthsSinceStart <= 3;
  });

  printEventTimeline(firstThreeMonths);

  // Show retirement withdrawal events
  const retirementEvents = findEventsInPhase(
    events,
    SimulationPhase.RETIREMENT_INCOME,
  );
  const withdrawalEvents = findEventsOfType(
    events,
    "retirement_withdrawal" as SimulationEventType,
  );

  console.log(`\nRetirement Phase Events: ${retirementEvents.length}`);
  console.log(`Withdrawal Events: ${withdrawalEvents.length}`);

  if (withdrawalEvents.length > 0) {
    console.log("\nFirst Withdrawal Event:");
    console.log(JSON.stringify(withdrawalEvents[0], null, 2));
  }

  // Super should decrease because expenses (5000*12 = 60000/yr) > returns (500000*0.05 = 25000/yr)
  // And investments (1000) are negligible
  assert(
    finalSuper < initialSuper,
    `Super should have decreased. Initial: $${
      initialSuper.toFixed(2)
    }, Final: $${
      finalSuper.toFixed(2)
    }\n\nCheck the event timeline above to see what happened!`,
  );
});
