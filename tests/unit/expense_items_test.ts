/**
 * Unit tests for individual expense items functionality
 */

import { assertEquals } from "$std/assert/mod.ts";
import { ExpenseProcessor } from "../../lib/processors.ts";
import type { ExpenseItem } from "../../types/expenses.ts";

Deno.test("ExpenseProcessor.calculateExpensesFromItems - single monthly expense", () => {
  const items: ExpenseItem[] = [
    {
      id: "1",
      name: "Rent",
      amount: 2000,
      frequency: "monthly",
      category: "housing",
      enabled: true,
    },
  ];

  const monthly = ExpenseProcessor.calculateExpensesFromItems(items, "month");
  assertEquals(monthly, 2000);
});

Deno.test("ExpenseProcessor.calculateExpensesFromItems - single weekly expense", () => {
  const items: ExpenseItem[] = [
    {
      id: "1",
      name: "Groceries",
      amount: 200,
      frequency: "weekly",
      category: "food",
      enabled: true,
    },
  ];

  const monthly = ExpenseProcessor.calculateExpensesFromItems(items, "month");
  // 200 * 52 / 12 = 866.67
  assertEquals(Math.abs(monthly - 866.67) < 0.1, true);
});

Deno.test("ExpenseProcessor.calculateExpensesFromItems - single fortnightly expense", () => {
  const items: ExpenseItem[] = [
    {
      id: "1",
      name: "Fuel",
      amount: 100,
      frequency: "fortnightly",
      category: "transportation",
      enabled: true,
    },
  ];

  const monthly = ExpenseProcessor.calculateExpensesFromItems(items, "month");
  // 100 * 26 / 12 = 216.67
  assertEquals(Math.abs(monthly - 216.67) < 0.1, true);
});

Deno.test("ExpenseProcessor.calculateExpensesFromItems - multiple expenses", () => {
  const items: ExpenseItem[] = [
    {
      id: "1",
      name: "Rent",
      amount: 2000,
      frequency: "monthly",
      category: "housing",
      enabled: true,
    },
    {
      id: "2",
      name: "Groceries",
      amount: 200,
      frequency: "weekly",
      category: "food",
      enabled: true,
    },
    {
      id: "3",
      name: "Electricity",
      amount: 150,
      frequency: "monthly",
      category: "utilities",
      enabled: true,
    },
  ];

  const monthly = ExpenseProcessor.calculateExpensesFromItems(items, "month");
  // 2000 + (200 * 52 / 12) + 150 = 3016.67
  assertEquals(Math.abs(monthly - 3016.67) < 0.1, true);
});

Deno.test("ExpenseProcessor.calculateExpensesFromItems - disabled expenses excluded", () => {
  const items: ExpenseItem[] = [
    {
      id: "1",
      name: "Rent",
      amount: 2000,
      frequency: "monthly",
      category: "housing",
      enabled: true,
    },
    {
      id: "2",
      name: "Gym",
      amount: 50,
      frequency: "monthly",
      category: "entertainment",
      enabled: false, // Disabled
    },
  ];

  const monthly = ExpenseProcessor.calculateExpensesFromItems(items, "month");
  assertEquals(monthly, 2000); // Only rent
});

Deno.test("ExpenseProcessor.calculateExpensesFromItems - weekly interval conversion", () => {
  const items: ExpenseItem[] = [
    {
      id: "1",
      name: "Groceries",
      amount: 200,
      frequency: "weekly",
      category: "food",
      enabled: true,
    },
  ];

  const weekly = ExpenseProcessor.calculateExpensesFromItems(items, "week");
  assertEquals(weekly, 200);
});

Deno.test("ExpenseProcessor.calculateExpensesFromItems - mixed frequencies to weekly", () => {
  const items: ExpenseItem[] = [
    {
      id: "1",
      name: "Groceries",
      amount: 200,
      frequency: "weekly",
      category: "food",
      enabled: true,
    },
    {
      id: "2",
      name: "Rent",
      amount: 2000,
      frequency: "monthly",
      category: "housing",
      enabled: true,
    },
  ];

  const weekly = ExpenseProcessor.calculateExpensesFromItems(items, "week");
  // 200 + (2000 * 12 / 52) = 200 + 461.54 = 661.54
  assertEquals(Math.abs(weekly - 661.54) < 0.1, true);
});

Deno.test("ExpenseProcessor.calculateMonthlyTotal - calculates correctly", () => {
  const items: ExpenseItem[] = [
    {
      id: "1",
      name: "Rent",
      amount: 1500,
      frequency: "monthly",
      category: "housing",
      enabled: true,
    },
    {
      id: "2",
      name: "Groceries",
      amount: 150,
      frequency: "weekly",
      category: "food",
      enabled: true,
    },
  ];

  const monthly = ExpenseProcessor.calculateMonthlyTotal(items);
  // 1500 + (150 * 52 / 12) = 1500 + 650 = 2150
  assertEquals(Math.abs(monthly - 2150) < 0.1, true);
});

Deno.test("ExpenseProcessor.calculateExpenses - uses items when provided", () => {
  const params = {
    monthlyLivingExpenses: 1000, // Should be ignored
    monthlyRentOrMortgage: 500, // Should be ignored
    expenseItems: [
      {
        id: "1",
        name: "Rent",
        amount: 2000,
        frequency: "monthly" as const,
        category: "housing" as const,
        enabled: true,
      },
    ],
  } as any;

  const monthly = ExpenseProcessor.calculateExpenses(params, "month");
  assertEquals(monthly, 2000); // Uses items, not legacy fields
});

Deno.test("ExpenseProcessor.calculateExpenses - falls back to legacy fields", () => {
  const params = {
    monthlyLivingExpenses: 1000,
    monthlyRentOrMortgage: 500,
    expenseItems: [], // Empty items
  } as any;

  const monthly = ExpenseProcessor.calculateExpenses(params, "month");
  assertEquals(monthly, 1500); // Uses legacy fields
});

Deno.test("ExpenseProcessor.calculateExpenses - empty items array uses legacy", () => {
  const params = {
    monthlyLivingExpenses: 2000,
    monthlyRentOrMortgage: 1000,
    expenseItems: undefined, // No items
  } as any;

  const monthly = ExpenseProcessor.calculateExpenses(params, "month");
  assertEquals(monthly, 3000); // Uses legacy fields
});
