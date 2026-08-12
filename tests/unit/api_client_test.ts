/**
 * API Client Unit Tests
 * Tests the client-side API integration for server communication
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { ApiClient } from "../../lib/api-client.ts";
import type { SimulationConfiguration } from "../../types/financial.ts";

// Mock fetch for testing
const originalFetch = globalThis.fetch;

function mockFetch(responses: Record<string, any>) {
  globalThis.fetch = async (input: string | Request | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const method = init?.method || 'GET';
    const key = `${method} ${url}`;
    
    if (responses[key]) {
      return new Response(JSON.stringify(responses[key]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Default error response
    return new Response(JSON.stringify({
      success: false,
      error: 'Not found',
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

Deno.test("ApiClient - creates session successfully", async () => {
  const mockResponse = {
    success: true,
    data: {
      sessionId: 'test-session-123',
      userId: 'test-user',
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    },
  };

  mockFetch({
    'POST /api/simulation/session': mockResponse,
  });

  try {
    const client = new ApiClient();
    const session = await client.createSession('test-user');
    
    assertExists(session);
    assertEquals(session.sessionId, 'test-session-123');
    assertEquals(session.userId, 'test-user');
    assertEquals(client.getCurrentSessionId(), 'test-session-123');
  } finally {
    restoreFetch();
  }
});

Deno.test("ApiClient - handles server errors gracefully", async () => {
  mockFetch({
    'POST /api/simulation/session': {
      success: false,
      error: 'Server error',
    },
  });

  try {
    const client = new ApiClient();
    
    let errorThrown = false;
    try {
      await client.createSession('test-user');
    } catch (error) {
      errorThrown = true;
      assertEquals((error as Error).message, 'Server error');
    }
    
    assertEquals(errorThrown, true, 'Should throw error when server fails');
  } finally {
    restoreFetch();
  }
});

Deno.test("ApiClient - runs simulation successfully", async () => {
  const sessionResponse = {
    success: true,
    data: {
      sessionId: 'test-session-123',
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    },
  };

  const commandResponse = {
    success: true,
    data: {
      success: true,
      commandId: 'cmd-123',
      events: [],
      data: {},
    },
  };

  const projectionResponse = {
    success: true,
    data: {
      timeline: {
        states: [
          {
            date: new Date(),
            cash: 1000,
            investments: 10000,
            superannuation: 50000,
            loanBalance: 0,
            offsetBalance: 0,
            netWorth: 61000,
            cashFlow: 500,
          },
        ],
        retirementAnalysis: {
          retirementDate: new Date(2050, 0, 1),
          retirementAge: 65,
          isSustainable: true,
        },
      },
      milestone: {
        milestones: [],
      },
    },
  };

  mockFetch({
    'POST /api/simulation/session': sessionResponse,
    'POST /api/simulation/commands': commandResponse,
    'GET /api/simulation/projections?sessionId=test-session-123&type=all': projectionResponse,
  });

  try {
    const client = new ApiClient();
    
    // Create session first
    await client.createSession();
    
    // Run simulation
    const config: SimulationConfiguration = {
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
        simulationYears: 40,
        startDate: new Date(),
        householdMode: "single",
        people: [],
      },
      transitions: [],
    };
    
    const result = await client.runSimulation(config);
    
    assertExists(result);
    assertExists(result.states);
    assertEquals(result.states.length, 1);
    assertEquals(result.states[0].netWorth, 61000);
    assertEquals(result.isSustainable, true);
  } finally {
    restoreFetch();
  }
});

Deno.test("ApiClient - updates parameters successfully", async () => {
  const sessionResponse = {
    success: true,
    data: {
      sessionId: 'test-session-123',
      createdAt: new Date(),
      lastAccessedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    },
  };

  const updateResponse = {
    success: true,
    data: {
      success: true,
      commandId: 'update-cmd-123',
      events: [],
      data: {},
    },
  };

  mockFetch({
    'POST /api/simulation/session': sessionResponse,
    'POST /api/simulation/commands': updateResponse,
  });

  try {
    const client = new ApiClient();
    
    // Create session first
    await client.createSession();
    
    // Update parameters
    await client.updateParameters({
      annualSalary: 90000,
      monthlyInvestmentContribution: 600,
    });
    
    // Should not throw error
  } finally {
    restoreFetch();
  }
});

Deno.test("ApiClient - WebSocket manager handles connection", () => {
  // Note: This is a basic test since WebSocket mocking is complex
  // In a real implementation, you might use a WebSocket mock library
  
  const client = new ApiClient();
  
  // Test initial state
  assertEquals(client.getCurrentSessionId(), null);

  // Test cleanup
  client.disconnect();
  assertEquals(client.getCurrentSessionId(), null);
});