import { assert, assertEquals, assertThrows } from "$std/assert/mod.ts";
import { sellFromPurchases, totalRealizedGainLoss } from "../../lib/investment_ledger_utils.ts";
import type { InvestmentPurchase, InvestmentSale } from "../../types/investments.ts";

function makePurchase(overrides: Partial<InvestmentPurchase>): InvestmentPurchase {
  return {
    id: `purchase-${Math.random()}`,
    date: "2024-01-01",
    units: 100,
    pricePerUnit: 10,
    totalCost: 1000,
    ...overrides,
  };
}

Deno.test("sellFromPurchases - selling less than one lot leaves it partially consumed", () => {
  const purchases = [makePurchase({ id: "p1", date: "2024-01-01", units: 100, pricePerUnit: 10, totalCost: 1000 })];

  const { remainingPurchases, sale } = sellFromPurchases(purchases, 40, 15, "2024-06-01");

  assertEquals(remainingPurchases.length, 1);
  assertEquals(remainingPurchases[0].units, 60);
  assertEquals(remainingPurchases[0].totalCost, 600); // 60 units * $10 cost basis

  assertEquals(sale.units, 40);
  assertEquals(sale.pricePerUnit, 15);
  assertEquals(sale.totalProceeds, 600); // 40 * 15
  assertEquals(sale.costBasis, 400); // 40 * 10
  assertEquals(sale.realizedGainLoss, 200); // profit
});

Deno.test("sellFromPurchases - selling exactly one lot removes it entirely", () => {
  const purchases = [
    makePurchase({ id: "p1", date: "2024-01-01", units: 50, pricePerUnit: 10, totalCost: 500 }),
    makePurchase({ id: "p2", date: "2024-02-01", units: 50, pricePerUnit: 12, totalCost: 600 }),
  ];

  const { remainingPurchases, sale } = sellFromPurchases(purchases, 50, 20, "2024-06-01");

  assertEquals(remainingPurchases.length, 1);
  assertEquals(remainingPurchases[0].id, "p2");
  assertEquals(sale.costBasis, 500); // fully consumed the oldest (p1) lot
});

Deno.test("sellFromPurchases - selling across multiple lots consumes FIFO (oldest first)", () => {
  const purchases = [
    makePurchase({ id: "p2", date: "2024-03-01", units: 30, pricePerUnit: 20, totalCost: 600 }),
    makePurchase({ id: "p1", date: "2024-01-01", units: 20, pricePerUnit: 10, totalCost: 200 }),
    makePurchase({ id: "p3", date: "2024-05-01", units: 30, pricePerUnit: 25, totalCost: 750 }),
  ];

  // Sell 40 units - should consume all of p1 (20 units, oldest) then 20 of p2 (next oldest)
  const { remainingPurchases, sale } = sellFromPurchases(purchases, 40, 30, "2024-06-01");

  const remainingIds = remainingPurchases.map((p) => p.id).sort();
  assertEquals(remainingIds, ["p2", "p3"]);

  const remainingP2 = remainingPurchases.find((p) => p.id === "p2")!;
  assertEquals(remainingP2.units, 10); // 30 - 20 consumed

  // Cost basis: all of p1 ($200) + 20 units of p2 at $20/unit ($400) = $600
  assertEquals(sale.costBasis, 600);
  assertEquals(sale.units, 40);
});

Deno.test("sellFromPurchases - realized loss is negative", () => {
  const purchases = [makePurchase({ id: "p1", date: "2024-01-01", units: 100, pricePerUnit: 50, totalCost: 5000 })];

  const { sale } = sellFromPurchases(purchases, 100, 30, "2024-06-01");

  assertEquals(sale.totalProceeds, 3000);
  assertEquals(sale.costBasis, 5000);
  assertEquals(sale.realizedGainLoss, -2000);
  assert(sale.realizedGainLoss < 0);
});

Deno.test("sellFromPurchases - fees reduce proceeds and therefore realized gain", () => {
  const purchases = [makePurchase({ id: "p1", date: "2024-01-01", units: 10, pricePerUnit: 100, totalCost: 1000 })];

  const { sale } = sellFromPurchases(purchases, 10, 150, "2024-06-01", 20);

  assertEquals(sale.totalProceeds, 1480); // 10*150 - 20 fees
  assertEquals(sale.realizedGainLoss, 480); // 1480 - 1000
  assertEquals(sale.fees, 20);
});

Deno.test("sellFromPurchases - throws when selling more than available", () => {
  const purchases = [makePurchase({ units: 10, totalCost: 100 })];

  assertThrows(
    () => sellFromPurchases(purchases, 20, 10, "2024-06-01"),
    Error,
    "only 10 available",
  );
});

Deno.test("sellFromPurchases - throws for non-positive units", () => {
  const purchases = [makePurchase({ units: 10, totalCost: 100 })];

  assertThrows(() => sellFromPurchases(purchases, 0, 10, "2024-06-01"), Error);
  assertThrows(() => sellFromPurchases(purchases, -5, 10, "2024-06-01"), Error);
});

Deno.test("totalRealizedGainLoss - sums across sales, empty/undefined yields 0", () => {
  const sales: InvestmentSale[] = [
    { id: "s1", date: "2024-01-01", units: 1, pricePerUnit: 1, totalProceeds: 100, costBasis: 60, realizedGainLoss: 40 },
    { id: "s2", date: "2024-02-01", units: 1, pricePerUnit: 1, totalProceeds: 50, costBasis: 80, realizedGainLoss: -30 },
  ];

  assertEquals(totalRealizedGainLoss(sales), 10);
  assertEquals(totalRealizedGainLoss([]), 0);
  assertEquals(totalRealizedGainLoss(undefined), 0);
});
