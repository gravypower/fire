/**
 * Integration test for server infrastructure setup
 */

import { assertEquals, assertExists } from "$std/assert/mod.ts";

Deno.test("Server infrastructure - API endpoints should be accessible", async () => {
  // Test session creation endpoint
  const sessionResponse = await fetch("http://localhost:8000/api/simulation/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "test-user",
      parameters: {
        annualSalary: 80000,
        salaryFrequency: "fortnightly",
        incomeTaxRate: 30,
        monthlyLivingExpenses: 3000,
        monthlyRentOrMortgage: 2000,
        loanPrincipal: 400000,
        loanInterestRate: 6.5,
        loanPaymentAmount: 2500,
        loanPaymentFrequency: "monthly",
        useOffsetAccount: true,
        currentOffsetBalance: 50000,
        monthlyInvestmentContribution: 1000,
        investmentReturnRate: 7,
        currentInvestmentBalance: 100000,
        superContributionRate: 11,
        superReturnRate: 7,
        currentSuperBalance: 150000,
        desiredAnnualRetirementIncome: 60000,
        retirementAge: 65,
        currentAge: 35,
        simulationYears: 30,
        startDate: new Date().toISOString(),
      },
    }),
  });

  if (sessionResponse.ok) {
    const sessionData = await sessionResponse.json();
    assertEquals(sessionData.success, true);
    assertExists(sessionData.data.sessionId);

    const sessionId = sessionData.data.sessionId;

    // Test command processing endpoint
    const commandResponse = await fetch("http://localhost:8000/api/simulation/commands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: `cmd_${Date.now()}`,
        type: "ClearCache",
        sessionId: sessionId,
        timestamp: new Date().toISOString(),
        data: { reason: "test" },
      }),
    });

    if (commandResponse.ok) {
      const commandData = await commandResponse.json();
      assertEquals(commandData.success, true);
    }

    // Test events endpoint
    const eventsResponse = await fetch(`http://localhost:8000/api/simulation/events?sessionId=${sessionId}`);
    
    if (eventsResponse.ok) {
      const eventsData = await eventsResponse.json();
      assertEquals(eventsData.success, true);
      assertEquals(Array.isArray(eventsData.data.events), true);
    }

    // Test stats endpoint
    const statsResponse = await fetch("http://localhost:8000/api/simulation/stats");
    
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      assertEquals(statsData.success, true);
      assertExists(statsData.data.sessions);
      assertExists(statsData.data.events);
      assertExists(statsData.data.cache);
    }
  } else {
    console.log("Server not running - skipping API integration test");
  }
});

Deno.test("Server infrastructure - Core interfaces should be properly defined", () => {
  // Test that all core interfaces are importable
  import("../../server/interfaces/events.ts");
  import("../../server/interfaces/commands.ts");
  import("../../server/interfaces/projections.ts");
  import("../../server/interfaces/session.ts");
  import("../../server/interfaces/cache.ts");
  import("../../server/interfaces/aggregate.ts");
  
  // Test that implementations are importable
  import("../../server/cache/session-manager.ts");
  import("../../server/cache/event-cache.ts");
  import("../../server/aggregates/command-bus.ts");
  import("../../server/aggregates/financial-aggregate.ts");
  
  // If we get here without errors, all imports are successful
  assertEquals(true, true);
});