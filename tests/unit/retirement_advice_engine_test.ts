import { assert, assertEquals, assertExists } from "$std/assert/mod.ts";
import { RetirementAdviceEngine } from "../../lib/retirement_advice_engine.ts";
import type {
  FinancialState,
  Person,
  SimulationResult,
  UserParameters,
} from "../../types/financial.ts";

// Helper to create a complete, valid set of test parameters
function getTestParameters(
  overrides: Partial<UserParameters> = {},
): UserParameters {
  return {
    currentAge: 30,
    retirementAge: 65,
    annualSalary: 80000,
    salaryFrequency: "yearly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 3000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 0,
    loanInterestRate: 0,
    loanPaymentAmount: 0,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 10.5,
    superReturnRate: 7,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 60000,
    simulationYears: 40,
    startDate: new Date("2024-01-01"),
    householdMode: "single",
    people: [],
    ...overrides,
  };
}

// Helper to build a plausible set of monthly financial states: growing
// while working, drawing down after the target retirement age.
function buildTestStates(params: UserParameters): FinancialState[] {
  const states: FinancialState[] = [];
  const monthlyIntervals = params.simulationYears * 12;

  let investments = params.currentInvestmentBalance;
  let superannuation = params.currentSuperBalance;

  for (let i = 0; i < monthlyIntervals; i++) {
    const ageAtState = params.currentAge + i / 12;
    const isRetired = ageAtState >= params.retirementAge;

    if (!isRetired) {
      investments += 1200; // Saving toward investments
      superannuation += 800; // Super growth + contributions
    } else {
      investments = Math.max(0, investments - 2000);
      superannuation = Math.max(0, superannuation - 1000);
    }

    const netWorth = investments + superannuation;

    states.push({
      date: new Date(
        params.startDate.getFullYear(),
        params.startDate.getMonth() + i,
        1,
      ),
      cash: 5000,
      investments,
      superannuation,
      loanBalance: 0,
      offsetBalance: 0,
      netWorth,
      cashFlow: isRetired ? -3000 : 2000,
      taxPaid: 1000,
      expenses: 3000,
      interestSaved: 0,
      deductibleInterest: 0,
    });
  }

  return states;
}

// Helper to build a complete, valid SimulationResult for the given parameters
function getTestSimulationResult(
  params: UserParameters,
  overrides: Partial<SimulationResult> = {},
): SimulationResult {
  const states = buildTestStates(params);
  const yearsToRetirement = params.retirementAge - params.currentAge;

  return {
    states,
    retirementDate: new Date(
      params.startDate.getFullYear() + yearsToRetirement,
      params.startDate.getMonth(),
      1,
    ),
    retirementAge: params.retirementAge,
    isSustainable: true,
    warnings: [],
    ...overrides,
  };
}

Deno.test("RetirementAdviceEngine - assesses retirement readiness correctly", () => {
  const engine = new RetirementAdviceEngine();
  const params = getTestParameters();

  // Case 1: On track - sustainable and retiring at target age
  const resultOnTrack = getTestSimulationResult(params);
  const adviceOnTrack = engine.generateAdvice(resultOnTrack, params);

  assertExists(adviceOnTrack.advice);
  assertEquals(adviceOnTrack.advice.overallAssessment, "on_track");

  // Case 2: Critical - trajectory is not sustainable
  const resultCritical = getTestSimulationResult(params, {
    isSustainable: false,
  });

  const adviceCritical = engine.generateAdvice(resultCritical, params);
  assertEquals(adviceCritical.advice.overallAssessment, "critical");
});

Deno.test("RetirementAdviceEngine - calculates feasibility correctly", () => {
  const engine = new RetirementAdviceEngine();
  const params = getTestParameters();
  const result = getTestSimulationResult(params);

  const advice = engine.generateAdvice(result, params);

  assertExists(advice.advice.retirementFeasibility);
  assertExists(advice.advice.retirementFeasibility.canRetireAtTarget);

  // retirementAge matches params.retirementAge, so target should be feasible
  assertEquals(advice.advice.retirementFeasibility.canRetireAtTarget, true);
});

Deno.test("RetirementAdviceEngine - generates investment advice", () => {
  const engine = new RetirementAdviceEngine({
    includeInvestmentAdvice: true,
    includeDebtAdvice: false,
    includeExpenseAdvice: false,
    includeIncomeAdvice: false,
  });
  const params = getTestParameters({ monthlyInvestmentContribution: 100 });

  const result = getTestSimulationResult(params);
  const advice = engine.generateAdvice(result, params);

  // Should have investment recommendations
  const investmentAdvice = advice.advice.recommendations.filter((r) =>
    r.category === "investment"
  );
  assert(investmentAdvice.length > 0, "Should generate investment advice");

  // Check structure of advice
  const firstAdvice = investmentAdvice[0];
  assertExists(firstAdvice.id);
  assertExists(firstAdvice.title);
  assertExists(firstAdvice.description);
  assertExists(firstAdvice.priority);
  assertExists(firstAdvice.effectivenessScore);
});

Deno.test("RetirementAdviceEngine - handles household mode correctly", () => {
  const engine = new RetirementAdviceEngine();
  const params = getTestParameters({ householdMode: "couple" });

  const person1: Person = {
    id: "p1",
    name: "Person 1",
    currentAge: 30,
    retirementAge: 65,
    superAccounts: [{
      id: "s1",
      label: "Super 1",
      balance: 50000,
      contributionRate: 10.5,
      returnRate: 7,
    }],
    incomeSources: [{
      id: "i1",
      label: "Salary 1",
      amount: 80000,
      frequency: "yearly",
      isBeforeTax: true,
    }],
  };

  params.people = [person1];

  const result = getTestSimulationResult(params);
  const advice = engine.generateAdvice(result, params);

  assertExists(advice.advice);
  // Should have generated advice without errors
  assertEquals(advice.errors.length, 0);
});

Deno.test("RetirementAdviceEngine - handles errors gracefully", () => {
  const engine = new RetirementAdviceEngine();
  const params = getTestParameters();

  // Force an error by passing an invalid result, to exercise the error boundary
  try {
    const advice = engine.generateAdvice({} as unknown as SimulationResult, params);
    // Should return error structure
    assertEquals(advice.errors.length > 0, true);
    assertEquals(advice.advice.overallAssessment, "critical");
  } catch (_e) {
    // If it throws instead of catching, that's also a fail for the error boundary test
    // but the engine catches errors internally
    assert(false, "Engine should catch errors internally");
  }
});
