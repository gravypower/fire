/**
 * Property-based test for API communication consistency
 * **Feature: event-sourced-server-refactor, Property 9: API communication consistency**
 * **Validates: Requirements 5.1, 5.2, 5.3**
 */

import { assertEquals, assert } from "$std/assert/mod.ts";
import * as fc from "fast-check";
import type { UserParameters } from "../../types/financial.ts";

// Test generators for API requests
const validUserParametersArb = fc.record({
  annualSalary: fc.integer({ min: 30000, max: 200000 }),
  salaryFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly'),
  incomeTaxRate: fc.integer({ min: 0, max: 50 }),
  monthlyLivingExpenses: fc.integer({ min: 1000, max: 8000 }),
  monthlyRentOrMortgage: fc.integer({ min: 500, max: 5000 }),
  loanPrincipal: fc.integer({ min: 0, max: 1000000 }),
  loanInterestRate: fc.float({ min: 0, max: 15, noNaN: true }),
  loanPaymentAmount: fc.integer({ min: 0, max: 10000 }),
  loanPaymentFrequency: fc.constantFrom('weekly', 'fortnightly', 'monthly', 'yearly'),
  useOffsetAccount: fc.boolean(),
  currentOffsetBalance: fc.integer({ min: 0, max: 100000 }),
  monthlyInvestmentContribution: fc.integer({ min: 0, max: 5000 }),
  investmentReturnRate: fc.float({ min: 0, max: 20, noNaN: true }),
  currentInvestmentBalance: fc.integer({ min: 0, max: 500000 }),
  superContributionRate: fc.float({ min: 0, max: 25, noNaN: true }),
  superReturnRate: fc.float({ min: 0, max: 15, noNaN: true }),
  currentSuperBalance: fc.integer({ min: 0, max: 1000000 }),
  desiredAnnualRetirementIncome: fc.integer({ min: 30000, max: 150000 }),
  currentAge: fc.integer({ min: 20, max: 60 }),
  retirementAge: fc.integer({ min: 61, max: 75 }),
  simulationYears: fc.integer({ min: 5, max: 50 }),
  startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
}) as fc.Arbitrary<UserParameters>;

const validCommandArb = fc.oneof(
  // RunSimulation command
  fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    type: fc.constant('RunSimulation'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date({ max: new Date() }),
    data: fc.record({
      parameters: validUserParametersArb,
      startDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2025-01-01') }),
      endDate: fc.date({ min: new Date('2025-01-02'), max: new Date('2080-12-31') }),
    }),
  }),
  // UpdateParameters command
  fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    type: fc.constant('UpdateParameters'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date({ max: new Date() }),
    data: fc.record({
      parameterChanges: fc.record({
        annualSalary: fc.integer({ min: 30000, max: 300000 }),
        monthlyLivingExpenses: fc.integer({ min: 1000, max: 10000 }),
      }),
    }),
  }),
  // ClearCache command
  fc.record({
    id: fc.string({ minLength: 10, maxLength: 50 }),
    type: fc.constant('ClearCache'),
    sessionId: fc.string({ minLength: 10, maxLength: 50 }),
    timestamp: fc.date({ max: new Date() }),
  })
);

// Helper function to make API requests
async function makeApiRequest(
  endpoint: string, 
  method: string = 'GET', 
  body?: any,
  params?: Record<string, string>
): Promise<Response> {
  const baseUrl = 'http://localhost:8000';
  let url = `${baseUrl}${endpoint}`;
  
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  return await fetch(url, options);
}

// Helper function to parse JSON response
async function parseJsonResponse(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    // If JSON parsing fails, try to get text
    try {
      const text = await response.text();
      return { error: 'Invalid JSON response', body: text };
    } catch {
      return { error: 'Failed to read response body' };
    }
  }
}

Deno.test("Property 9: API communication consistency - Session creation should return valid session data", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.option(fc.string({ minLength: 5, maxLength: 50 })), // userId
      fc.option(validUserParametersArb), // parameters
      async (userId, parameters) => {
        const body: any = {};
        if (userId) body.userId = userId;
        if (parameters) body.parameters = parameters;

        const response = await makeApiRequest('/api/simulation/session', 'POST', body);
        const data = await parseJsonResponse(response);

        // Session creation should succeed
        assertEquals(response.status, 201, "Session creation should return 201 status");
        assertEquals(data.success, true, "Response should indicate success");
        
        // Response should contain required session data
        assert(typeof data.data.sessionId === 'string' && data.data.sessionId.length > 0, "Should return valid sessionId");
        assert(data.data.createdAt, "Should return createdAt timestamp");
        assert(data.data.expiresAt, "Should return expiresAt timestamp");
        
        // Timestamps should be valid dates
        const createdAt = new Date(data.data.createdAt);
        const expiresAt = new Date(data.data.expiresAt);
        assert(!isNaN(createdAt.getTime()), "createdAt should be valid date");
        assert(!isNaN(expiresAt.getTime()), "expiresAt should be valid date");
        assert(expiresAt > createdAt, "expiresAt should be after createdAt");

        // Clean up - delete the session
        const deleteResponse = await makeApiRequest('/api/simulation/session', 'DELETE', null, { sessionId: data.data.sessionId });
        await parseJsonResponse(deleteResponse); // Consume the response body
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 9: API communication consistency - Session retrieval should return consistent data", async () => {
  await fc.assert(
    fc.asyncProperty(
      validUserParametersArb,
      async (parameters) => {
        // Create session
        const createResponse = await makeApiRequest('/api/simulation/session', 'POST', { parameters });
        const createData = await parseJsonResponse(createResponse);
        assertEquals(createResponse.status, 201, "Session creation should succeed");
        
        const sessionId = createData.data.sessionId;

        try {
          // Retrieve session
          const getResponse = await makeApiRequest('/api/simulation/session', 'GET', null, { sessionId });
          const getData = await parseJsonResponse(getResponse);

          // Session retrieval should succeed
          assertEquals(getResponse.status, 200, "Session retrieval should return 200 status");
          assertEquals(getData.success, true, "Response should indicate success");
          
          // Data should be consistent
          assertEquals(getData.data.sessionId, sessionId, "SessionId should match");
          assertEquals(getData.data.createdAt, createData.data.createdAt, "CreatedAt should match");
          
          // Parameters should match if provided
          if (parameters) {
            assert(getData.data.parameters, "Parameters should be returned");
            assertEquals(getData.data.parameters.annualSalary, parameters.annualSalary, "Parameters should match");
          }

          // lastAccessedAt should be updated
          assert(getData.data.lastAccessedAt, "Should have lastAccessedAt");
          const lastAccessed = new Date(getData.data.lastAccessedAt);
          assert(!isNaN(lastAccessed.getTime()), "lastAccessedAt should be valid date");
        } finally {
          // Clean up
          const deleteResponse = await makeApiRequest('/api/simulation/session', 'DELETE', null, { sessionId });
          await parseJsonResponse(deleteResponse); // Consume the response body
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 9: API communication consistency - Command processing should return proper acknowledgments", async () => {
  await fc.assert(
    fc.asyncProperty(
      validCommandArb,
      async (command) => {
        // Create session first
        const sessionResponse = await makeApiRequest('/api/simulation/session', 'POST', {});
        const sessionData = await parseJsonResponse(sessionResponse);
        const sessionId = sessionData.data.sessionId;

        // Update command with valid session ID
        const commandWithSession = { ...command, sessionId };

        try {
          // Process command
          const response = await makeApiRequest('/api/simulation/commands', 'POST', commandWithSession);
          const data = await parseJsonResponse(response);

          // Command processing should return proper response
          assert(response.status === 200 || response.status === 400, "Should return 200 or 400 status");
          assert(typeof data.success === 'boolean', "Response should have success field");
          
          if (data.success) {
            // Successful commands should have proper structure
            assert(data.data, "Successful response should have data");
            assertEquals(data.data.commandId, commandWithSession.id, "Should return correct command ID");
            assert(Array.isArray(data.data.events), "Should return events array");
            assert(data.data.events.length >= 0, "Events array should be non-negative length");
          } else {
            // Failed commands should have error message
            assert(typeof data.error === 'string' && data.error.length > 0, "Failed response should have error message");
          }
        } finally {
          // Clean up
          const deleteResponse = await makeApiRequest('/api/simulation/session', 'DELETE', null, { sessionId });
          await parseJsonResponse(deleteResponse); // Consume the response body
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 9: API communication consistency - Projection retrieval should return valid data structures", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constantFrom('financial', 'timeline', 'milestone', 'all'),
      fc.boolean(), // forceRebuild
      async (projectionType, forceRebuild) => {
        // Create session
        const sessionResponse = await makeApiRequest('/api/simulation/session', 'POST', {});
        const sessionData = await parseJsonResponse(sessionResponse);
        const sessionId = sessionData.data.sessionId;

        try {
          // Get projection
          const params: Record<string, string> = { sessionId, type: projectionType };
          if (forceRebuild) params.rebuild = 'true';
          
          const response = await makeApiRequest('/api/simulation/projections', 'GET', null, params);
          const data = await parseJsonResponse(response);

          // Projection retrieval should succeed or fail gracefully
          assert(response.status === 200 || response.status === 400 || response.status === 401, 
                "Should return valid HTTP status");
          assert(typeof data.success === 'boolean', "Response should have success field");
          
          if (data.success) {
            // Successful projection should have proper structure
            assert(data.data, "Successful response should have data");
            
            if (projectionType === 'all') {
              // All projections should have financial, timeline, and milestone
              assert(data.data.financial, "All projections should include financial");
              assert(data.data.timeline, "All projections should include timeline");
              assert(data.data.milestone, "All projections should include milestone");
            } else {
              // Single projection should have sessionId and version
              assert(typeof data.data.sessionId === 'string', "Projection should have sessionId");
              assert(typeof data.data.version === 'number', "Projection should have version");
              assert(data.data.lastUpdated, "Projection should have lastUpdated");
            }
          } else {
            // Failed requests should have error message
            assert(typeof data.error === 'string' && data.error.length > 0, 
                  "Failed response should have error message");
          }
        } finally {
          // Clean up
          const deleteResponse = await makeApiRequest('/api/simulation/session', 'DELETE', null, { sessionId });
          await parseJsonResponse(deleteResponse); // Consume the response body
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 9: API communication consistency - Event retrieval should return properly formatted events", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.option(fc.string({ minLength: 5, maxLength: 30 })), // eventType filter
      fc.option(fc.integer({ min: 0, max: 100 })), // fromVersion
      async (eventType, fromVersion) => {
        // Create session
        const sessionResponse = await makeApiRequest('/api/simulation/session', 'POST', {});
        const sessionData = await parseJsonResponse(sessionResponse);
        const sessionId = sessionData.data.sessionId;

        try {
          // Get events
          const params: Record<string, string> = { sessionId };
          if (eventType) params.type = eventType;
          if (fromVersion !== null && fromVersion !== undefined) params.fromVersion = fromVersion.toString();
          
          const response = await makeApiRequest('/api/simulation/events', 'GET', null, params);
          const data = await parseJsonResponse(response);

          // Event retrieval should succeed
          assertEquals(response.status, 200, "Event retrieval should return 200 status");
          assertEquals(data.success, true, "Response should indicate success");
          
          // Response should have proper structure
          assert(Array.isArray(data.data.events), "Should return events array");
          assert(typeof data.data.count === 'number', "Should return event count");
          assertEquals(data.data.count, data.data.events.length, "Count should match events array length");
          
          // Each event should have proper structure
          for (const event of data.data.events) {
            assert(typeof event.id === 'string' && event.id.length > 0, "Event should have valid ID");
            assertEquals(event.sessionId, sessionId, "Event should belong to correct session");
            assert(typeof event.type === 'string' && event.type.length > 0, "Event should have valid type");
            assert(event.timestamp, "Event should have timestamp");
            assert(typeof event.data === 'object', "Event should have data object");
            
            // If filtering by type, all events should match
            if (eventType) {
              assertEquals(event.type, eventType, "Filtered events should match requested type");
            }
          }
        } finally {
          // Clean up
          const deleteResponse = await makeApiRequest('/api/simulation/session', 'DELETE', null, { sessionId });
          await parseJsonResponse(deleteResponse); // Consume the response body
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 9: API communication consistency - Invalid session IDs should be rejected consistently", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.oneof(
        fc.string({ minLength: 1, maxLength: 5 }), // Too short
        fc.string({ minLength: 100, maxLength: 200 }), // Too long
        fc.constant(''), // Empty
        fc.constant('invalid-session-id'), // Non-existent
        fc.string().filter(s => s.includes(' ') || s.includes('\n')), // Invalid characters
      ),
      async (invalidSessionId) => {
        // Test various endpoints with invalid session ID
        const endpoints = [
          { path: '/api/simulation/session', method: 'GET', params: { sessionId: invalidSessionId } },
          { path: '/api/simulation/commands', method: 'POST', body: { 
            id: 'test-cmd', type: 'RunSimulation', sessionId: invalidSessionId 
          }},
          { path: '/api/simulation/events', method: 'GET', params: { sessionId: invalidSessionId } },
          { path: '/api/simulation/projections', method: 'GET', params: { sessionId: invalidSessionId } },
        ];

        for (const endpoint of endpoints) {
          const response = await makeApiRequest(
            endpoint.path, 
            endpoint.method, 
            endpoint.body, 
            endpoint.params
          );
          const data = await parseJsonResponse(response);

          // Invalid session should be rejected consistently
          assert(response.status === 400 || response.status === 401 || response.status === 404, 
                `Invalid session should be rejected with 4xx status, got ${response.status} for ${endpoint.path}`);
          assertEquals(data.success, false, `Response should indicate failure for ${endpoint.path}`);
          assert(typeof data.error === 'string' && data.error.length > 0, 
                `Should return error message for ${endpoint.path}`);
          
          // Error message should mention session issue
          assert(
            data.error.toLowerCase().includes('session') || 
            data.error.toLowerCase().includes('invalid') ||
            data.error.toLowerCase().includes('expired') ||
            data.error.toLowerCase().includes('required'),
            `Error should mention session issue: ${data.error} for ${endpoint.path}`
          );
        }
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 9: API communication consistency - API endpoints should handle malformed requests gracefully", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.oneof(
        fc.constant(''), // Empty body
        fc.constant('invalid json'), // Invalid JSON
        fc.constant('null'), // Null string
        fc.record({ invalidField: fc.string() }), // Invalid structure
        fc.array(fc.string()), // Array instead of object
        fc.integer(), // Number instead of object
      ),
      async (malformedBody) => {
        // Test command endpoint with malformed body
        const response = await fetch('http://localhost:8000/api/simulation/commands', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: typeof malformedBody === 'string' ? malformedBody : JSON.stringify(malformedBody),
        });

        // Malformed requests should be handled gracefully
        assert(response.status >= 400 && response.status < 600, 
              `Malformed request should return 4xx or 5xx status, got ${response.status}`);
        
        const data = await parseJsonResponse(response);
        assertEquals(data.success, false, "Response should indicate failure");
        assert(typeof data.error === 'string' && data.error.length > 0, 
              "Should return descriptive error message");
      }
    ),
    { numRuns: 100 }
  );
});

Deno.test("Property 9: API communication consistency - System stats should return consistent structure", async () => {
  await fc.assert(
    fc.asyncProperty(
      fc.constant(null), // No input needed for stats
      async (_) => {
        const response = await makeApiRequest('/api/simulation/stats', 'GET');
        const data = await parseJsonResponse(response);

        // Stats should always succeed
        assertEquals(response.status, 200, "Stats endpoint should return 200 status");
        assertEquals(data.success, true, "Response should indicate success");
        
        // Response should have consistent structure
        assert(data.data, "Should have data object");
        assert(data.data.sessions, "Should have sessions stats");
        assert(data.data.events, "Should have events stats");
        assert(data.data.projections, "Should have projections stats");
        assert(data.data.websockets, "Should have websockets stats");
        assert(data.data.cache, "Should have cache stats");
        assert(data.data.system, "Should have system stats");
        
        // Numeric fields should be valid numbers
        assert(typeof data.data.sessions.active === 'number' && data.data.sessions.active >= 0, 
              "Active sessions should be non-negative number");
        assert(typeof data.data.events.total === 'number' && data.data.events.total >= 0, 
              "Total events should be non-negative number");
        assert(typeof data.data.websockets.totalConnections === 'number' && data.data.websockets.totalConnections >= 0, 
              "Total connections should be non-negative number");
      }
    ),
    { numRuns: 100 }
  );
});