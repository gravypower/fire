/**
 * Unit tests for resolveHousePurchaseEffects
 */

import { assert, assertEquals, assertExists } from "$std/assert/mod.ts";
import {
  houseHoldingCostsExpenseId,
  mortgageLoanId,
  resolveHousePurchaseEffects,
} from "../../lib/property_resolver.ts";
import type { UserParameters } from "../../types/financial.ts";
import type { HousePurchase } from "../../types/property.ts";

function getTestParameters(
  overrides: Partial<UserParameters> = {},
): UserParameters {
  return {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 2000,
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
    superContributionRate: 11,
    superReturnRate: 7,
    currentSuperBalance: 50000,
    desiredAnnualRetirementIncome: 60000,
    retirementAge: 65,
    currentAge: 30,
    simulationYears: 20,
    startDate: new Date("2024-01-01"),
    ...overrides,
  };
}

function getTestHouse(overrides: Partial<HousePurchase> = {}): HousePurchase {
  return {
    id: "house-1",
    name: "Primary Home",
    purchaseDate: new Date("2029-01-01"),
    price: 600000,
    depositAmount: 120000,
    buyingCosts: 25000,
    appreciationRate: 4,
    movingIn: true,
    mortgageInterestRate: 5,
    mortgagePaymentAmount: 2800,
    mortgagePaymentFrequency: "monthly",
    monthlyHoldingCosts: 400,
    ...overrides,
  };
}

Deno.test("resolveHousePurchaseEffects - returns params unchanged when no house purchases", () => {
  const params = getTestParameters();
  const resolved = resolveHousePurchaseEffects(params);
  assertEquals(resolved, params);
});

Deno.test("resolveHousePurchaseEffects - injects a mortgage loan with the right principal and startDate", () => {
  const house = getTestHouse();
  const params = getTestParameters({ housePurchases: [house] });

  const resolved = resolveHousePurchaseEffects(params);

  assertExists(resolved.loans);
  assertEquals(resolved.loans!.length, 1);

  const mortgage = resolved.loans![0];
  assertEquals(mortgage.id, mortgageLoanId(house.id));
  assertEquals(mortgage.principal, house.price - house.depositAmount);
  assertEquals(mortgage.interestRate, house.mortgageInterestRate);
  assertEquals(mortgage.paymentAmount, house.mortgagePaymentAmount);
  assertEquals(mortgage.startDate, house.purchaseDate);
});

Deno.test("resolveHousePurchaseEffects - preserves existing loans alongside the new mortgage", () => {
  const house = getTestHouse();
  const params = getTestParameters({
    housePurchases: [house],
    loans: [{
      id: "car-loan",
      label: "Car Loan",
      principal: 20000,
      interestRate: 7,
      paymentAmount: 500,
      paymentFrequency: "monthly",
    }],
  });

  const resolved = resolveHousePurchaseEffects(params);

  assertEquals(resolved.loans!.length, 2);
  assert(resolved.loans!.some((loan) => loan.id === "car-loan"));
  assert(resolved.loans!.some((loan) => loan.id === mortgageLoanId(house.id)));
});

Deno.test("resolveHousePurchaseEffects - clamps a linked rent expense's endDate to the purchase date when movingIn", () => {
  const house = getTestHouse({ movingIn: true, linkedRentExpenseId: "rent-1" });
  const params = getTestParameters({
    housePurchases: [house],
    expenseItems: [{
      id: "rent-1",
      name: "Rent",
      amount: 2000,
      frequency: "monthly",
      category: "housing",
      enabled: true,
    }],
  });

  const resolved = resolveHousePurchaseEffects(params);
  const rent = resolved.expenseItems!.find((item) => item.id === "rent-1");

  assertExists(rent);
  assertEquals(rent!.endDate, house.purchaseDate);
});

Deno.test("resolveHousePurchaseEffects - does not touch rent when movingIn is false", () => {
  const house = getTestHouse({
    movingIn: false,
    linkedRentExpenseId: "rent-1",
  });
  const params = getTestParameters({
    housePurchases: [house],
    expenseItems: [{
      id: "rent-1",
      name: "Rent",
      amount: 2000,
      frequency: "monthly",
      category: "housing",
      enabled: true,
    }],
  });

  const resolved = resolveHousePurchaseEffects(params);
  const rent = resolved.expenseItems!.find((item) => item.id === "rent-1");

  assertExists(rent);
  assertEquals(rent!.endDate, undefined);
});

Deno.test("resolveHousePurchaseEffects - clamps to the earlier of an existing rent endDate and the purchase date", () => {
  const house = getTestHouse({
    movingIn: true,
    linkedRentExpenseId: "rent-1",
    purchaseDate: new Date("2029-06-01"),
  });
  const earlierEndDate = new Date("2028-01-01");
  const params = getTestParameters({
    housePurchases: [house],
    expenseItems: [{
      id: "rent-1",
      name: "Rent",
      amount: 2000,
      frequency: "monthly",
      category: "housing",
      enabled: true,
      endDate: earlierEndDate,
    }],
  });

  const resolved = resolveHousePurchaseEffects(params);
  const rent = resolved.expenseItems!.find((item) => item.id === "rent-1");

  assertEquals(rent!.endDate, earlierEndDate);
});

Deno.test("resolveHousePurchaseEffects - injects a recurring holding-cost expense from the purchase date", () => {
  const house = getTestHouse({ monthlyHoldingCosts: 350 });
  const params = getTestParameters({ housePurchases: [house] });

  const resolved = resolveHousePurchaseEffects(params);
  const holdingCosts = resolved.expenseItems!.find((item) =>
    item.id === houseHoldingCostsExpenseId(house.id)
  );

  assertExists(holdingCosts);
  assertEquals(holdingCosts!.amount, 350);
  assertEquals(holdingCosts!.frequency, "monthly");
  assertEquals(holdingCosts!.startDate, house.purchaseDate);
  assertEquals(holdingCosts!.endDate, undefined);
});

Deno.test("resolveHousePurchaseEffects - skips the holding-cost expense when monthlyHoldingCosts is 0", () => {
  const house = getTestHouse({ monthlyHoldingCosts: 0 });
  const params = getTestParameters({ housePurchases: [house] });

  const resolved = resolveHousePurchaseEffects(params);
  const holdingCosts = resolved.expenseItems?.find((item) =>
    item.id === houseHoldingCostsExpenseId(house.id)
  );

  assertEquals(holdingCosts, undefined);
});

Deno.test("resolveHousePurchaseEffects - handles multiple house purchases independently", () => {
  const home = getTestHouse({
    id: "home",
    name: "Primary Home",
    movingIn: true,
    linkedRentExpenseId: "rent-1",
  });
  const investmentProperty = getTestHouse({
    id: "investment-property",
    name: "Investment Property",
    purchaseDate: new Date("2032-01-01"),
    movingIn: false,
  });

  const params = getTestParameters({
    housePurchases: [home, investmentProperty],
    expenseItems: [{
      id: "rent-1",
      name: "Rent",
      amount: 2000,
      frequency: "monthly",
      category: "housing",
      enabled: true,
    }],
  });

  const resolved = resolveHousePurchaseEffects(params);

  assertEquals(resolved.loans!.length, 2);
  const rent = resolved.expenseItems!.find((item) => item.id === "rent-1");
  assertEquals(rent!.endDate, home.purchaseDate);

  const homeCosts = resolved.expenseItems!.find((item) =>
    item.id === houseHoldingCostsExpenseId(home.id)
  );
  const investmentCosts = resolved.expenseItems!.find((item) =>
    item.id === houseHoldingCostsExpenseId(investmentProperty.id)
  );
  assertExists(homeCosts);
  assertExists(investmentCosts);
});
