/**
 * Unit tests for simulation engine calculations
 * Tests all calculation logic including parameter transitions
 */

import { assert, assertEquals, assertExists } from "$std/assert/mod.ts";
import {
  convertAnnualRateToInterval,
  SimulationEngine,
} from "../../lib/simulation_engine.ts";
import { EventCollector } from "../../lib/simulation_events.ts";
import type {
  SimulationConfiguration,
  UserParameters,
} from "../../types/financial.ts";

/**
 * Helper to create default test parameters
 */
function getTestParameters(): UserParameters {
  return {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 300000,
    loanInterestRate: 5.5,
    loanPaymentAmount: 2000,
    loanPaymentFrequency: "monthly",
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 500,
    investmentReturnRate: 7,
    currentInvestmentBalance: 10000,
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 5,
    startDate: new Date("2024-01-01"),
  };
}

Deno.test("convertAnnualRateToInterval - monthly conversion", () => {
  const annualRate = 0.12; // 12% annual
  const monthlyRate = convertAnnualRateToInterval(annualRate, "month");

  // Monthly rate should be approximately 0.9489% (compound formula)
  assertEquals(Math.abs(monthlyRate - 0.009489) < 0.0001, true);
});

Deno.test("convertAnnualRateToInterval - weekly conversion", () => {
  const annualRate = 0.12; // 12% annual
  const weeklyRate = convertAnnualRateToInterval(annualRate, "week");

  // Weekly rate should be approximately 0.2186%
  assertEquals(Math.abs(weeklyRate - 0.002186) < 0.0001, true);
});

Deno.test("SimulationEngine.runSimulation - generates states", () => {
  const params = getTestParameters();
  const result = SimulationEngine.runSimulation(params);

  assertExists(result.states);
  assertEquals(result.states.length > 0, true);

  // Should have approximately 60 monthly states for 5 years (5 * 12 = 60)
  assertEquals(result.states.length >= 55, true);
  assertEquals(result.states.length <= 65, true);
});

Deno.test("SimulationEngine.runSimulation - initial state is correct", () => {
  const params = getTestParameters();
  const result = SimulationEngine.runSimulation(params);

  const initialState = result.states[0];

  assertEquals(initialState.cash, 0);
  assertEquals(initialState.investments, params.currentInvestmentBalance);
  assertEquals(initialState.superannuation, params.currentSuperBalance);
  assertEquals(initialState.loanBalance, params.loanPrincipal);
  assertEquals(initialState.offsetBalance, params.currentOffsetBalance);
});

Deno.test("SimulationEngine.runSimulation - loan balance decreases over time", () => {
  const params = getTestParameters();
  const result = SimulationEngine.runSimulation(params);

  const initialLoan = result.states[0].loanBalance;
  const finalLoan = result.states[result.states.length - 1].loanBalance;

  // Loan should decrease
  assertEquals(finalLoan < initialLoan, true);
});

Deno.test("SimulationEngine.runSimulation - investments grow over time", () => {
  const params = getTestParameters();
  const result = SimulationEngine.runSimulation(params);

  const initialInvestments = result.states[0].investments;
  const finalInvestments = result.states[result.states.length - 1].investments;

  // Investments should grow (contributions + returns)
  assertEquals(finalInvestments > initialInvestments, true);
});

Deno.test("SimulationEngine.runSimulation - superannuation grows over time", () => {
  const params = getTestParameters();
  const result = SimulationEngine.runSimulation(params);

  const initialSuper = result.states[0].superannuation;
  const finalSuper = result.states[result.states.length - 1].superannuation;

  // Super should grow (contributions + returns)
  assertEquals(finalSuper > initialSuper, true);
});

Deno.test("SimulationEngine.calculateTimeStep - income calculation", () => {
  const params = getTestParameters();
  const initialState = {
    date: new Date("2024-01-01"),
    cash: 0,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 300000,
    offsetBalance: 0,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };

  const newState = SimulationEngine.calculateTimeStep(
    initialState,
    params,
    "month",
    new EventCollector(),
  );

  // Monthly gross income should be 80000 / 12 = 6666.67
  const expectedGrossIncome = 80000 / 12;

  // Tax should be approximately 30% = 2000
  const expectedTax = expectedGrossIncome * 0.30;

  assertEquals(newState.taxPaid > 0, true);
  assertEquals(Math.abs(newState.taxPaid - expectedTax) < 10, true);
});

Deno.test("SimulationEngine.calculateTimeStep - expense deduction", () => {
  const params = getTestParameters();
  params.monthlyLivingExpenses = 2000;
  params.monthlyRentOrMortgage = 0;

  const initialState = {
    date: new Date("2024-01-01"),
    cash: 10000,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 0,
    offsetBalance: 0,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };

  const newState = SimulationEngine.calculateTimeStep(
    initialState,
    params,
    "month",
    new EventCollector(),
  );

  // Cash should decrease by expenses (after income is added)
  // Income: 80000/12 = 6666.67, Tax: ~2000, Net: ~4666.67
  // Expenses: 2000
  // Expected cash: 10000 + 4666.67 - 2000 = 12666.67
  assertEquals(newState.cash > initialState.cash, true);
});

Deno.test("SimulationEngine.calculateTimeStep - loan payment with interest", () => {
  const params = getTestParameters();
  params.loanPrincipal = 300000;
  params.loanInterestRate = 6.0; // 6% annual
  params.loanPaymentAmount = 2000;
  params.useOffsetAccount = false;

  const initialState = {
    date: new Date("2024-01-01"),
    cash: 10000,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 300000,
    offsetBalance: 0,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };

  const newState = SimulationEngine.calculateTimeStep(
    initialState,
    params,
    "month",
    new EventCollector(),
  );

  // Loan balance should decrease
  assertEquals(newState.loanBalance < initialState.loanBalance, true);

  // But not by the full payment amount (interest is charged)
  const principalPaid = initialState.loanBalance - newState.loanBalance;
  assertEquals(principalPaid < params.loanPaymentAmount, true);
});

Deno.test("SimulationEngine.calculateTimeStep - offset account reduces interest", () => {
  const params = getTestParameters();
  params.loanPrincipal = 300000;
  params.loanInterestRate = 6.0;
  params.loanPaymentAmount = 2000;
  params.useOffsetAccount = true;
  params.currentOffsetBalance = 50000;

  const initialState = {
    date: new Date("2024-01-01"),
    cash: 10000,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 300000,
    offsetBalance: 50000,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };

  const newState = SimulationEngine.calculateTimeStep(
    initialState,
    params,
    "month",
    new EventCollector(),
  );

  // Interest saved should be positive
  assertEquals(newState.interestSaved > 0, true);

  // Leftover cash should go to offset
  assertEquals(newState.offsetBalance >= initialState.offsetBalance, true);
});

Deno.test("SimulationEngine.calculateTimeStep - investment contributions and growth", () => {
  const params = getTestParameters();
  params.monthlyInvestmentContribution = 500;
  params.investmentReturnRate = 8.0; // 8% annual

  const initialState = {
    date: new Date("2024-01-01"),
    cash: 10000,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 0,
    offsetBalance: 0,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };

  const newState = SimulationEngine.calculateTimeStep(
    initialState,
    params,
    "month",
    new EventCollector(),
  );

  // Investments should grow by more than just the contribution (due to returns)
  const investmentGrowth = newState.investments - initialState.investments;
  assertEquals(investmentGrowth > params.monthlyInvestmentContribution, true);
});

Deno.test("SimulationEngine.calculateTimeStep - negative cash flow handling", () => {
  const params = getTestParameters();
  params.annualSalary = 30000; // Low income
  params.monthlyLivingExpenses = 3000; // High expenses
  params.loanPaymentAmount = 2000;

  const initialState = {
    date: new Date("2024-01-01"),
    cash: 100,
    investments: 10000,
    superannuation: 50000,
    loanBalance: 300000,
    offsetBalance: 0,
    netWorth: 0,
    cashFlow: 0,
    taxPaid: 0,
    expenses: 0,
    interestSaved: 0,
  };

  const newState = SimulationEngine.calculateTimeStep(
    initialState,
    params,
    "month",
    new EventCollector(),
  );

  // Cash flow should be negative (expenses exceed net income after loan payments)
  assert(
    newState.cashFlow < 0,
    `Expected negative cash flow, got ${newState.cashFlow}`,
  );

  // The deficit resolution phase covers a cash shortfall by selling assets,
  // so cash settles back to (approximately) zero rather than going deeply
  // negative. It's not exactly zero: selling appreciated investments
  // realizes a small capital gain, and the tax on that gain is deducted
  // immediately (since it's realized after this period's main tax phase).
  assert(
    Math.abs(newState.cash) < 5,
    `Cash should be topped back up to ~zero, got ${newState.cash}`,
  );

  // ...at the cost of depleting investments to cover the deficit.
  assert(
    newState.investments < initialState.investments,
    "Investments should be drawn down to cover the cash shortfall",
  );
});

Deno.test("SimulationEngine.runSimulationWithTransitions - applies transitions", () => {
  const baseParams = getTestParameters();
  baseParams.annualSalary = 80000;
  baseParams.simulationYears = 3;

  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2025-01-01"),
        label: "Salary increase",
        parameterChanges: {
          annualSalary: 100000,
        },
      },
    ],
  };

  const result = SimulationEngine.runSimulationWithTransitions(config);

  assertExists(result.transitionPoints);
  assertEquals(result.transitionPoints.length, 1);
  assertEquals(result.transitionPoints[0].transition.id, "transition-1");
});

Deno.test("SimulationEngine.runSimulationWithTransitions - transition affects calculations", () => {
  const baseParams = getTestParameters();
  baseParams.annualSalary = 50000;
  baseParams.simulationYears = 2;

  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2024-07-01"),
        label: "Salary increase",
        parameterChanges: {
          annualSalary: 100000, // Double salary
        },
      },
    ],
  };

  const result = SimulationEngine.runSimulationWithTransitions(config);

  // Find states before and after transition
  const transitionIndex = result.transitionPoints[0].stateIndex;
  const beforeState = result.states[transitionIndex - 1];
  const afterState = result.states[transitionIndex + 1];

  // Cash flow should be higher after transition
  assertEquals(afterState.cashFlow > beforeState.cashFlow, true);
});

Deno.test("SimulationEngine.runSimulationWithTransitions - multiple transitions", () => {
  const baseParams = getTestParameters();
  baseParams.simulationYears = 3;

  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2024-06-01"),
        label: "First change",
        parameterChanges: {
          annualSalary: 90000,
        },
      },
      {
        id: "transition-2",
        transitionDate: new Date("2025-06-01"),
        label: "Second change",
        parameterChanges: {
          monthlyLivingExpenses: 1500,
        },
      },
    ],
  };

  const result = SimulationEngine.runSimulationWithTransitions(config);

  assertEquals(result.transitionPoints.length, 2);
  assertEquals(result.transitionPoints[0].transition.id, "transition-1");
  assertEquals(result.transitionPoints[1].transition.id, "transition-2");
});

Deno.test("SimulationEngine.runComparisonSimulation - compares scenarios", async () => {
  const baseParams = getTestParameters();
  baseParams.simulationYears = 3;

  const config: SimulationConfiguration = {
    baseParameters: baseParams,
    transitions: [
      {
        id: "transition-1",
        transitionDate: new Date("2025-01-01"),
        label: "Salary increase",
        parameterChanges: {
          annualSalary: 120000,
        },
      },
    ],
  };

  const result = await SimulationEngine.runComparisonSimulation(config);

  assertExists(result.withTransitions);
  assertExists(result.withoutTransitions);
  assertExists(result.comparison);

  // With transitions should have better net worth
  const withTransitionsNetWorth =
    result.withTransitions.states[result.withTransitions.states.length - 1]
      .netWorth;
  const withoutTransitionsNetWorth = result.withoutTransitions
    .states[result.withoutTransitions.states.length - 1].netWorth;

  assertEquals(withTransitionsNetWorth > withoutTransitionsNetWorth, true);
  assertEquals(result.comparison.finalNetWorthDifference > 0, true);
});

Deno.test("SimulationEngine.checkSustainability - detects unsustainable scenarios", () => {
  const params = getTestParameters();
  params.annualSalary = 30000; // Very low income
  params.monthlyLivingExpenses = 3000;
  params.loanPaymentAmount = 2000;
  params.simulationYears = 2;

  const result = SimulationEngine.runSimulation(params);

  assertEquals(result.isSustainable, false);
  assertEquals(result.warnings.length > 0, true);
});

Deno.test("SimulationEngine.checkSustainability - detects sustainable scenarios", () => {
  const params = getTestParameters();
  params.annualSalary = 100000; // Good income
  params.monthlyLivingExpenses = 2000;
  params.loanPaymentAmount = 2000;
  params.simulationYears = 5;

  const result = SimulationEngine.runSimulation(params);

  // Should be sustainable with good income
  assertEquals(result.isSustainable, true);
});

Deno.test("SimulationEngine.runSimulation - applies a one-off planned sale on the holding", () => {
  const params = getTestParameters();
  params.simulationYears = 3;
  params.investmentHoldings = [{
    id: "holding-1",
    name: "Test ETF",
    type: "etf",
    currentValue: 100000,
    returnRate: 0, // Isolate the sale's effect from growth
    enabled: true,
    plannedSales: [{
      id: "sale-1",
      startDate: "2025-06-01",
      frequency: "once",
      mode: "fixed-amount",
      amount: 20000,
    }],
  }];

  const result = SimulationEngine.runSimulation(params);

  // Skip states[0] (the hand-constructed initial state, before any timestep
  // has run) since it has no investmentBalances map populated yet
  const steppedStates = result.states.slice(1);
  const beforeSale = steppedStates.find((s) =>
    s.date < new Date("2025-06-01")
  )!;
  const afterSale = steppedStates.find((s) =>
    s.date >= new Date("2025-06-01") && s.date < new Date("2025-07-01")
  )!;
  const wellAfterSale = result.states[result.states.length - 1];

  const holdingBefore = beforeSale.investmentBalances!["holding-1"];
  const holdingAfter = afterSale.investmentBalances!["holding-1"];

  // The holding drops by (approximately) the sale amount, and never again
  assert(
    holdingBefore - holdingAfter >= 19999 &&
      holdingBefore - holdingAfter <= 20001,
  );
  const holdingFinal = wellAfterSale.investmentBalances!["holding-1"];
  assert(Math.abs(holdingFinal - holdingAfter) < 1); // no further drawdown after the one-off fires

  // Cash increases by the same amount the holding lost
  assert(afterSale.cash - beforeSale.cash >= 19000); // net of normal monthly cash flow, still clearly reflects the ~$20k injection
});

Deno.test("SimulationEngine.runSimulation - recurring yearly percent drawdown tapers the holding", () => {
  const params = getTestParameters();
  params.simulationYears = 3;
  params.annualSalary = 0; // Retired, no other cash flow complicating the check
  params.monthlyLivingExpenses = 0;
  params.loanPaymentAmount = 0;
  params.monthlyInvestmentContribution = 0;
  params.currentInvestmentBalance = 0;
  params.currentSuperBalance = 0;
  params.superContributionRate = 0;
  params.investmentHoldings = [{
    id: "holding-1",
    name: "Drawdown Holding",
    type: "etf",
    currentValue: 100000,
    returnRate: 0, // Isolate the drawdown's effect from growth
    enabled: true,
    plannedSales: [{
      id: "drawdown-1",
      startDate: "2024-01-01",
      frequency: "yearly",
      mode: "percent-of-balance",
      amount: 20,
    }],
  }];

  const result = SimulationEngine.runSimulation(params);

  const finalBalance = result.states[result.states.length - 1]
    .investmentBalances!["holding-1"];

  // Never fully depletes - each occurrence only takes 20% of what's left
  assert(finalBalance > 0);
  // After ~3 years of 20%/year, well below the original 100,000 but not
  // anywhere near zero (roughly 0.8^3 = 51.2% would remain with exact
  // calendar-year firing; allow a wide band for the occurrence-timing
  // approximation)
  assert(finalBalance < 90000);
  assert(finalBalance > 30000);
});

Deno.test("SimulationEngine.runSimulation - house purchase draws down cash, creates a mortgage, and grows in value", () => {
  const params = getTestParameters();
  params.simulationYears = 5;
  params.loans = undefined;
  params.loanPrincipal = 0;
  params.currentInvestmentBalance = 500000; // Enough cash flow to fund the deposit
  params.expenseItems = [{
    id: "rent-1",
    name: "Rent",
    amount: 2000,
    frequency: "monthly",
    category: "housing",
    enabled: true,
  }];
  params.housePurchases = [{
    id: "house-1",
    name: "Primary Home",
    purchaseDate: new Date("2026-06-01"),
    price: 600000,
    depositAmount: 120000,
    buyingCosts: 25000,
    appreciationRate: 4,
    movingIn: true,
    linkedRentExpenseId: "rent-1",
    mortgageInterestRate: 5,
    mortgagePaymentAmount: 2800,
    mortgagePaymentFrequency: "monthly",
    monthlyHoldingCosts: 400,
  }];

  const result = SimulationEngine.runSimulation(params);
  const steppedStates = result.states.slice(1);

  const beforePurchase = steppedStates.find((s) =>
    s.date < new Date("2026-06-01")
  )!;
  const afterPurchase = steppedStates.find((s) =>
    s.date >= new Date("2026-06-01") && s.date < new Date("2026-07-01")
  )!;
  const wellAfterPurchase = result.states[result.states.length - 1];

  // No mortgage/house value before the purchase date
  assertEquals(beforePurchase.houseValues?.["house-1"] ?? 0, 0);
  assertEquals(beforePurchase.loanBalances?.["mortgage-house-1"] ?? 0, 0);

  // House value seeded to price, mortgage seeded to price - deposit, on the
  // purchase period
  assertEquals(afterPurchase.houseValues!["house-1"], 600000);
  const expectedPrincipal = 600000 - 120000;
  assert(
    Math.abs(
      afterPurchase.loanBalances!["mortgage-house-1"] - expectedPrincipal,
    ) < expectedPrincipal * 0.05, // within one payment's worth of amortization
  );

  // House value appreciates over time
  const finalHouseValue = wellAfterPurchase.houseValues!["house-1"];
  assert(finalHouseValue > 600000);

  // Net worth includes propertyValue
  assertEquals(
    Math.round(wellAfterPurchase.netWorth),
    Math.round(
      wellAfterPurchase.cash + wellAfterPurchase.investments +
        wellAfterPurchase.superannuation + wellAfterPurchase.offsetBalance +
        wellAfterPurchase.propertyValue - wellAfterPurchase.loanBalance,
    ),
  );
});

Deno.test("SimulationEngine.runSimulation - house purchase stops linked rent when movingIn", () => {
  const params = getTestParameters();
  params.simulationYears = 3;
  params.loans = undefined;
  params.loanPrincipal = 0;
  params.currentInvestmentBalance = 500000;
  params.expenseItems = [{
    id: "rent-1",
    name: "Rent",
    amount: 2000,
    frequency: "monthly",
    category: "housing",
    enabled: true,
  }];
  params.housePurchases = [{
    id: "house-1",
    name: "Primary Home",
    purchaseDate: new Date("2025-06-01"),
    price: 600000,
    depositAmount: 120000,
    buyingCosts: 25000,
    appreciationRate: 4,
    movingIn: true,
    linkedRentExpenseId: "rent-1",
    mortgageInterestRate: 5,
    mortgagePaymentAmount: 2800,
    mortgagePaymentFrequency: "monthly",
    monthlyHoldingCosts: 0,
  }];

  const result = SimulationEngine.runSimulation(params);
  const steppedStates = result.states.slice(1);

  const beforePurchase = steppedStates.find((s) =>
    s.date < new Date("2025-06-01")
  )!;
  const wellAfterPurchase = result.states[result.states.length - 1];

  // Rent (2000/month) is included in expenses before the purchase...
  assert(beforePurchase.expenses >= 1900);
  // ...but stops being charged well after moving in (only holding costs of 0
  // remain, so expenses should be near zero absent other configured costs)
  assert(wellAfterPurchase.expenses < 100);
});

Deno.test("SimulationEngine.runSimulation - AU hard-gates retirement account access before preservation age, US allows a penalized early withdrawal", () => {
  const params = getTestParameters();
  params.simulationYears = 2;
  params.currentAge = 55; // Below both AU's 60 and US's 59.5 access age
  params.retirementAge = 55; // Already "retired" from day one
  params.annualSalary = 0;
  params.monthlyLivingExpenses = 0;
  params.loanPrincipal = 0;
  params.loanPaymentAmount = 0;
  params.monthlyInvestmentContribution = 0;
  params.currentInvestmentBalance = 0; // Nothing else to draw from
  params.superContributionRate = 0;
  params.currentSuperBalance = 200000;
  params.desiredAnnualRetirementIncome = 40000;

  const auParams = { ...params, country: undefined }; // undefined = AU default
  const usParams = { ...params, country: "US" as const };

  const auResult = SimulationEngine.runSimulation(auParams);
  const usResult = SimulationEngine.runSimulation(usParams);

  const auFinal = auResult.states[auResult.states.length - 1];
  const usFinal = usResult.states[usResult.states.length - 1];

  // AU: hard-gated, no access before 60 - the retirement account is
  // untouched (only grows from returns), and income needs go unmet (cash
  // never accumulates from withdrawals).
  assert(auFinal.superannuation >= 200000);
  assert(auFinal.cash < 1000);

  // US: penalized early access before 59.5 - the account is drawn down
  // (partially offsetting its growth) and some income is actually received,
  // unlike AU where nothing ever gets through.
  assert(usFinal.superannuation < auFinal.superannuation);
  assert(usFinal.cash > auFinal.cash);
  assert(usFinal.cash > 1000); // a real amount was received, not just 0
});

Deno.test("SimulationEngine.runSimulation - dividend yield pays taxable cash income instead of compounding", () => {
  const params = getTestParameters();
  params.simulationYears = 1;
  params.annualSalary = 0;
  params.monthlyLivingExpenses = 0;
  params.loanPrincipal = 0;
  params.loanPaymentAmount = 0;
  params.monthlyInvestmentContribution = 0;
  params.currentSuperBalance = 0;
  params.superContributionRate = 0;
  params.desiredAnnualRetirementIncome = 0;
  params.investmentHoldings = [{
    id: "holding-1",
    name: "Dividend ETF",
    type: "etf",
    currentValue: 100000,
    returnRate: 4, // total return, all of it a distribution
    dividendYieldRate: 4,
    enabled: true,
  }];

  const result = SimulationEngine.runSimulation(params);
  const month1 = result.states[1];

  // The holding's balance shouldn't have grown - its whole return was paid
  // out as a cash dividend rather than compounding.
  assert(month1.investmentBalances!["holding-1"] <= 100000.01);

  // The dividend was received as taxable cash income this period.
  assert(month1.dividendIncome! > 0);
  assert(month1.cash > 0);
  // Tax was paid on it (flat incomeTaxRate fallback, no taxBrackets set).
  assert(month1.investmentTaxPaid! > 0);
});

Deno.test("SimulationEngine.runSimulation - selling appreciated shares to fund retirement income realizes a taxed capital gain", () => {
  const params = getTestParameters();
  params.simulationYears = 2;
  params.currentAge = 65; // Past AU preservation age
  params.retirementAge = 60;
  params.annualSalary = 0;
  params.monthlyLivingExpenses = 0;
  params.loanPrincipal = 0;
  params.loanPaymentAmount = 0;
  params.monthlyInvestmentContribution = 0;
  params.currentSuperBalance = 0;
  params.superContributionRate = 0;
  params.desiredAnnualRetirementIncome = 60000;
  params.currentInvestmentBalance = 0;
  params.investmentHoldings = [{
    id: "holding-1",
    name: "Appreciated ETF",
    type: "etf",
    currentValue: 500000,
    returnRate: 10, // fast growth so gains build up to sell against
    enabled: true,
  }];

  const result = SimulationEngine.runSimulation(params);

  // Once the holding has been growing for a while, a retirement-income
  // withdrawal sells down units worth more than their cost basis - that
  // realized gain should show up as taxed investment income.
  const later = result.states[result.states.length - 1];
  assert(later.realizedCapitalGains! > 0);
  assert(later.investmentTaxPaid! > 0);
});

Deno.test("SimulationEngine.runSimulation - US 401k/IRA withdrawals are taxed as ordinary income, AU super is not", () => {
  const params = getTestParameters();
  params.simulationYears = 2;
  params.currentAge = 65; // Past both AU's 60 and US's 59.5 access age
  params.retirementAge = 60;
  params.annualSalary = 0;
  params.monthlyLivingExpenses = 0;
  params.loanPrincipal = 0;
  params.loanPaymentAmount = 0;
  params.monthlyInvestmentContribution = 0;
  params.currentInvestmentBalance = 0; // Force every dollar through super
  params.superContributionRate = 0;
  params.currentSuperBalance = 500000;
  params.desiredAnnualRetirementIncome = 60000;

  const auResult = SimulationEngine.runSimulation({
    ...params,
    country: undefined,
  });
  const usResult = SimulationEngine.runSimulation({
    ...params,
    country: "US" as const,
  });

  const auLater = auResult.states[auResult.states.length - 1];
  const usLater = usResult.states[usResult.states.length - 1];

  // AU superannuation withdrawals after preservation age are tax-free.
  assertEquals(auLater.investmentTaxPaid ?? 0, 0);

  // US 401k/IRA withdrawals are ordinary taxable income even after the
  // account is fully accessible (no early-withdrawal penalty at this age).
  assert(usLater.investmentTaxPaid! > 0);
});
