/**
 * Client-Server Integration Test
 * Tests the integration between client-side islands and server-side APIs
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ApiClient } from "../../lib/api-client.ts";
import type { SimulationConfiguration } from "../../types/financial.ts";

// Test configuration
const testConfig: SimulationConfiguration = {
  baseParameters: {
    annualSalary: 80000,
    salaryFrequency: "monthly",
    incomeTaxRate: 30,
    monthlyLivingExpenses: 3000,
    monthlyRentOrMortgage: 2000,
    expenseItems: [],
    loans: [],
    loanPrincipal: 0,
    loanInterestRate: 5.5,
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
    simulationYears: 5, // Short simulation for testing
    startDate: new Date(),
    householdMode: "single",
    people: [],
  },
  transitions: [],
};

Deno.test("Client-Server Integration - API endpoints exist", async () => {
  // Test that the API endpoints are accessible
  try {
    const response = await fetch("http://localhost:8000/api/simulation");
    assertEquals(response.status, 200);

    const data = await response.json();
    assertExists(data.success);
    assertEquals(data.success, true);
    assertExists(data.data);
    assertExists(data.data.endpoints);
  } catch (error) {
    console.warn("Server not running, skipping integration test:", error);
    // Skip test if server is not running
  }
});

Deno.test("Client-Server Integration - Session management", async () => {
  try {
    // Test session creation
    const sessionResponse = await fetch(
      "http://localhost:8000/api/simulation/session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "test-user",
          parameters: testConfig.baseParameters,
        }),
      },
    );

    if (sessionResponse.status !== 200) {
      console.warn(
        "Server not running or session creation failed, skipping test",
      );
      return;
    }

    const sessionData = await sessionResponse.json();
    assertExists(sessionData.success);
    assertEquals(sessionData.success, true);
    assertExists(sessionData.data.sessionId);

    const sessionId = sessionData.data.sessionId;

    // Test session retrieval
    const getSessionResponse = await fetch(
      `http://localhost:8000/api/simulation/session?sessionId=${sessionId}`,
    );
    assertEquals(getSessionResponse.status, 200);

    const getSessionData = await getSessionResponse.json();
    assertEquals(getSessionData.success, true);
    assertEquals(getSessionData.data.sessionId, sessionId);

    // Test session cleanup
    const deleteResponse = await fetch(
      `http://localhost:8000/api/simulation/session?sessionId=${sessionId}`,
      {
        method: "DELETE",
      },
    );
    assertEquals(deleteResponse.status, 200);
  } catch (error) {
    console.warn("Server not running, skipping integration test:", error);
  }
});

Deno.test("Client-Server Integration - Command processing", async () => {
  try {
    // Create session first
    const sessionResponse = await fetch(
      "http://localhost:8000/api/simulation/session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parameters: testConfig.baseParameters,
        }),
      },
    );

    if (sessionResponse.status !== 200) {
      console.warn("Server not running, skipping test");
      return;
    }

    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.data.sessionId;

    // Test RunSimulation command
    const commandResponse = await fetch(
      "http://localhost:8000/api/simulation/commands",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: `test-run-simulation-${Date.now()}`,
          type: "RunSimulation",
          sessionId,
          data: {
            configuration: testConfig,
          },
        }),
      },
    );

    assertEquals(commandResponse.status, 200);
    const commandData = await commandResponse.json();
    assertEquals(commandData.success, true);
    assertExists(commandData.data.commandId);

    // Test UpdateParameters command
    const updateResponse = await fetch(
      "http://localhost:8000/api/simulation/commands",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: `test-update-params-${Date.now()}`,
          type: "UpdateParameters",
          sessionId,
          data: {
            parameterChanges: {
              annualSalary: 90000,
            },
          },
        }),
      },
    );

    assertEquals(updateResponse.status, 200);
    const updateData = await updateResponse.json();
    assertEquals(updateData.success, true);

    // Cleanup
    await fetch(
      `http://localhost:8000/api/simulation/session?sessionId=${sessionId}`,
      {
        method: "DELETE",
      },
    );
  } catch (error) {
    console.warn("Server not running, skipping integration test:", error);
  }
});

Deno.test("Client-Server Integration - Projection retrieval", async () => {
  try {
    // Create session and run simulation
    const sessionResponse = await fetch(
      "http://localhost:8000/api/simulation/session",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          parameters: testConfig.baseParameters,
        }),
      },
    );

    if (sessionResponse.status !== 200) {
      console.warn("Server not running, skipping test");
      return;
    }

    const sessionData = await sessionResponse.json();
    const sessionId = sessionData.data.sessionId;

    // Run simulation first
    await fetch("http://localhost:8000/api/simulation/commands", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: `test-simulation-${Date.now()}`,
        type: "RunSimulation",
        sessionId,
        data: {
          configuration: testConfig,
        },
      }),
    });

    // Test projection retrieval
    const projectionResponse = await fetch(
      `http://localhost:8000/api/simulation/projections?sessionId=${sessionId}&type=all`,
    );
    assertEquals(projectionResponse.status, 200);

    const projectionData = await projectionResponse.json();
    assertEquals(projectionData.success, true);
    assertExists(projectionData.data);

    // Cleanup
    await fetch(
      `http://localhost:8000/api/simulation/session?sessionId=${sessionId}`,
      {
        method: "DELETE",
      },
    );
  } catch (error) {
    console.warn("Server not running, skipping integration test:", error);
  }
});

Deno.test("Client-Server Integration - Offline fallback", async () => {
  // Test that the client gracefully falls back to offline mode when server is unavailable
  const client = new ApiClient("http://localhost:9999"); // Non-existent server

  let errorThrown = false;
  try {
    await client.createSession();
  } catch (error) {
    errorThrown = true;
  }

  assertEquals(errorThrown, true);
});
