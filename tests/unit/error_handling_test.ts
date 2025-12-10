/**
 * Tests for error handling utilities and components
 * Validates: Requirements 1.1, 2.1
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { 
  safeMilestoneDetection, 
  safeAdviceGeneration,
  validateMilestones,
  validateAdvice,
  createEmptyMilestoneResult,
  createEmptyAdviceResult,
  sanitizeMilestoneForDisplay,
  sanitizeAdviceForDisplay,
  RetryManager,
  withGracefulDegradation
} from "../../lib/error_handling_utils.ts";
import type { Milestone } from "../../types/milestones.ts";

Deno.test("safeMilestoneDetection - handles successful operation", async () => {
  const mockResult = { success: true };
  const { result, errors } = await safeMilestoneDetection(
    () => mockResult,
    "test operation",
    { success: false }
  );
  
  assertEquals(result, mockResult);
  assertEquals(errors.length, 0);
});

Deno.test("safeMilestoneDetection - handles failed operation", async () => {
  const mockError = new Error("Test error");
  const fallback = { success: false };
  
  const { result, errors } = await safeMilestoneDetection(
    () => { throw mockError; },
    "test operation",
    fallback
  );
  
  assertEquals(result, fallback);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].code, "MILESTONE_OPERATION_FAILED");
  assertEquals(errors[0].severity, "error");
});

Deno.test("safeAdviceGeneration - handles successful operation", async () => {
  const mockResult = { advice: "test" };
  const { result, errors } = await safeAdviceGeneration(
    () => mockResult,
    "test operation",
    { advice: "fallback" }
  );
  
  assertEquals(result, mockResult);
  assertEquals(errors.length, 0);
});

Deno.test("safeAdviceGeneration - handles failed operation", async () => {
  const mockError = new Error("Test error");
  const fallback = { advice: "fallback" };
  
  const { result, errors } = await safeAdviceGeneration(
    () => { throw mockError; },
    "test operation",
    fallback
  );
  
  assertEquals(result, fallback);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].code, "ADVICE_OPERATION_FAILED");
  assertEquals(errors[0].severity, "error");
});

Deno.test("validateMilestones - detects missing ID", () => {
  const invalidMilestone = {
    id: "",
    type: "loan_payoff" as const,
    category: "debt" as const,
    date: new Date(),
    title: "Test Milestone",
    description: "Test description",
  } as Milestone;
  
  const errors = validateMilestones([invalidMilestone]);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].code, "INVALID_MILESTONE_ID");
});

Deno.test("validateMilestones - detects invalid date", () => {
  const invalidMilestone = {
    id: "test-1",
    type: "loan_payoff" as const,
    category: "debt" as const,
    date: new Date("invalid"),
    title: "Test Milestone",
    description: "Test description",
  } as Milestone;
  
  const errors = validateMilestones([invalidMilestone]);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].code, "INVALID_MILESTONE_DATE");
});

Deno.test("validateAdvice - detects missing assessment", () => {
  const invalidAdvice = {
    overallAssessment: undefined,
    retirementFeasibility: { canRetireAtTarget: false },
    recommendations: [],
    quickWins: [],
    longTermStrategies: [],
  } as any;
  
  const errors = validateAdvice(invalidAdvice);
  assertEquals(errors.length, 1);
  assertEquals(errors[0].code, "MISSING_ASSESSMENT");
});

Deno.test("createEmptyMilestoneResult - creates valid empty result", () => {
  const result = createEmptyMilestoneResult();
  assertEquals(result.milestones.length, 0);
  assertEquals(result.errors.length, 0);
  assertEquals(result.warnings.length, 0);
});

Deno.test("createEmptyAdviceResult - creates valid empty result", () => {
  const result = createEmptyAdviceResult();
  assertEquals(result.advice.overallAssessment, "critical");
  assertEquals(result.advice.retirementFeasibility.canRetireAtTarget, false);
  assertEquals(result.advice.recommendations.length, 0);
  assertEquals(result.errors.length, 0);
});

Deno.test("sanitizeMilestoneForDisplay - handles missing title", () => {
  const milestone = {
    id: "test-1",
    type: "loan_payoff" as const,
    category: "debt" as const,
    date: new Date(),
    title: "",
    description: "Test description",
  } as Milestone;
  
  const sanitized = sanitizeMilestoneForDisplay(milestone);
  assertEquals(sanitized.title, "Untitled Milestone");
});

Deno.test("sanitizeAdviceForDisplay - handles missing data", () => {
  const advice = {
    overallAssessment: undefined,
    retirementFeasibility: undefined,
    recommendations: undefined,
    quickWins: undefined,
    longTermStrategies: undefined,
  } as any;
  
  const sanitized = sanitizeAdviceForDisplay(advice);
  assertEquals(sanitized.overallAssessment, "critical");
  assertExists(sanitized.retirementFeasibility);
  assertEquals(sanitized.recommendations.length, 0);
  assertEquals(sanitized.quickWins.length, 0);
  assertEquals(sanitized.longTermStrategies.length, 0);
});

Deno.test("RetryManager - executes successfully on first try", async () => {
  const retryManager = new RetryManager(3, 100);
  let attempts = 0;
  
  const result = await retryManager.execute(async () => {
    attempts++;
    return "success";
  });
  
  assertEquals(result, "success");
  assertEquals(attempts, 1);
  assertEquals(retryManager.getAttempts(), 0); // Reset after success
});

Deno.test("RetryManager - retries on failure then succeeds", async () => {
  const retryManager = new RetryManager(3, 10); // Short delay for testing
  let attempts = 0;
  
  const result = await retryManager.execute(async () => {
    attempts++;
    if (attempts < 2) {
      throw new Error("Temporary failure");
    }
    return "success";
  });
  
  assertEquals(result, "success");
  assertEquals(attempts, 2);
});

Deno.test("withGracefulDegradation - uses primary operation when successful", () => {
  const result = withGracefulDegradation(
    () => "primary",
    () => "fallback",
    "test context"
  );
  
  assertEquals(result, "primary");
});

Deno.test("withGracefulDegradation - uses fallback when primary fails", () => {
  const result = withGracefulDegradation(
    () => { throw new Error("Primary failed"); },
    () => "fallback",
    "test context"
  );
  
  assertEquals(result, "fallback");
});