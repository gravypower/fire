/**
 * Performance Tests for Milestone Detection and Advice Generation
 * Tests performance with large simulation datasets (10+ years, multiple loans/investments)
 * Validates: Requirements 1.1, 2.1, 5.1
 */

import { assertEquals, assert } from "$std/assert/mod.ts";
import { MilestoneDetector } from "../../lib/milestone_detector.ts";
import { RetirementAdviceEngine } from "../../lib/retirement_advice_engine.ts";
import { SimulationEngine } from "../../lib/simulation_engine.ts";
import { globalPerformanceMonitor } from "../../lib/performance_utils.ts";
import type { UserParameters, FinancialState } from "../../types/financial.ts";

/**
 * Helper to create large-scale test parameters with multiple loans and investments
 */
function createLargeScaleParameters(years: number): UserParameters {
  return {
    annualSalary: 120000,
    salaryFrequency: "monthly" as const,
    incomeTaxRate: 32,
    monthlyLivingExpenses: 3500,
    monthlyRentOrMortgage: 0,
    loanPrincipal: 0, // Using loans array instead
    loanInterestRate: 0,
    loanPaymentAmount: 0,
    loanPaymentFrequency: "monthly" as const,
    useOffsetAccount: false,
    currentOffsetBalance: 0,
    monthlyInvestmentContribution: 2000,
    investmentReturnRate: 8,
    currentInvestmentBalance: 75000,
    superContributionRate: 11,
    superReturnRate: 7.5,
    currentSuperBalance: 150000,
    desiredAnnualRetirementIncome: 80000,
    retirementAge: 65,
    currentAge: 35,
    simulationYears: years,
    startDate: new Date("2024-01-01"),
    
    // Multiple loans for complex scenarios
    loans: [
      {
        id: "home-loan",
        label: "Home Loan",
        principal: 450000,
        interestRate: 5.8,
        paymentAmount: 2800,
        paymentFrequency: "monthly" as const,
        hasOffset: true,
        offsetBalance: 25000,
        autoPayoutWhenOffsetFull: false,
        isDebtRecycling: false,
      },
      {
        id: "investment-loan",
        label: "Investment Property Loan",
        principal: 320000,
        interestRate: 6.2,
        paymentAmount: 2100,
        paymentFrequency: "monthly" as const,
        hasOffset: false,
        offsetBalance: 0,
        autoPayoutWhenOffsetFull: false,
        isDebtRecycling: true,
      },
      {
        id: "car-loan",
        label: "Car Loan",
        principal: 35000,
        interestRate: 7.5,
        paymentAmount: 650,
        paymentFrequency: "monthly" as const,
        hasOffset: false,
        offsetBalance: 0,
        autoPayoutWhenOffsetFull: false,
        isDebtRecycling: false,
      },
    ],

    // Multiple investment holdings
    investmentHoldings: [
      {
        id: "etf-portfolio",
        name: "ETF Portfolio",
        type: "etf" as const,
        currentValue: 45000,
        returnRate: 8.5,
        contributionAmount: 1200,
        contributionFrequency: "monthly" as const,
        enabled: true,
      },
      {
        id: "managed-fund",
        name: "Managed Fund",
        type: "managed-fund" as const,
        currentValue: 30000,
        returnRate: 7.2,
        contributionAmount: 800,
        contributionFrequency: "monthly" as const,
        enabled: true,
      },
    ],

    // Multiple super accounts
    superAccounts: [
      {
        id: "main-super",
        label: "Main Super Fund",
        balance: 120000,
        contributionRate: 11,
        returnRate: 7.8,
      },
      {
        id: "old-super",
        label: "Previous Employer Super",
        balance: 30000,
        contributionRate: 0, // No new contributions
        returnRate: 6.5,
      },
    ],
  };
}

/**
 * Helper to generate large simulation states for testing
 */
function generateLargeSimulationStates(years: number): FinancialState[] {
  const params = createLargeScaleParameters(years);
  const result = SimulationEngine.runSimulation(params);
  return result.states;
}

/**
 * Performance test for milestone detection with large datasets
 */
Deno.test({
  name: "Performance: Milestone detection with 30-year simulation (360+ states)",
  fn: () => {
    globalPerformanceMonitor.clearMetrics();
    
    const params = createLargeScaleParameters(30);
    const states = generateLargeSimulationStates(30);
    
    console.log(`Generated ${states.length} financial states for 30-year simulation`);
    
    // Test milestone detection performance
    const detector = new MilestoneDetector();
    
    const startTime = performance.now();
    const result = detector.detectMilestones(states, params);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    console.log(`Milestone detection took ${duration.toFixed(2)}ms for ${states.length} states`);
    console.log(`Found ${result.milestones.length} milestones`);
    console.log(`Performance: ${(duration / states.length).toFixed(4)}ms per state`);
    
    // Performance assertions
    assert(duration < 1000, `Milestone detection should complete within 1 second, took ${duration}ms`);
    assert(duration / states.length < 2, `Should process each state in under 2ms, actual: ${(duration / states.length).toFixed(4)}ms`);
    
    // Verify milestones were found
    assert(result.milestones.length > 0, "Should detect milestones in 30-year simulation");
    assertEquals(result.errors.length, 0, "Should not have errors");
    
    // Print performance report
    console.log("\nPerformance Report:");
    console.log(globalPerformanceMonitor.generateReport());
  },
});

/**
 * Performance test for advice generation with large datasets
 */
Deno.test({
  name: "Performance: Advice generation with 30-year simulation",
  fn: () => {
    globalPerformanceMonitor.clearMetrics();
    
    const params = createLargeScaleParameters(30);
    const result = SimulationEngine.runSimulation(params);
    
    console.log(`Generated simulation with ${result.states.length} states`);
    
    // Test advice generation performance
    const adviceEngine = new RetirementAdviceEngine();
    
    const startTime = performance.now();
    const adviceResult = adviceEngine.generateAdvice(result, params);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    console.log(`Advice generation took ${duration.toFixed(2)}ms`);
    console.log(`Generated ${adviceResult.advice.recommendations.length} recommendations`);
    
    // Performance assertions
    assert(duration < 500, `Advice generation should complete within 500ms, took ${duration}ms`);
    
    // Verify advice was generated
    assert(adviceResult.advice.recommendations.length > 0, "Should generate recommendations");
    assertEquals(adviceResult.errors.length, 0, "Should not have errors");
    
    // Print performance report
    console.log("\nPerformance Report:");
    console.log(globalPerformanceMonitor.generateReport());
  },
});

/**
 * Performance test for cached advice generation (should be faster on repeat calls)
 */
Deno.test({
  name: "Performance: Cached advice generation performance",
  fn: () => {
    globalPerformanceMonitor.clearMetrics();
    
    const params = createLargeScaleParameters(20);
    const result = SimulationEngine.runSimulation(params);
    
    const adviceEngine = new RetirementAdviceEngine();
    
    // First call (cold cache)
    const startTime1 = performance.now();
    const adviceResult1 = adviceEngine.generateAdvice(result, params);
    const endTime1 = performance.now();
    const duration1 = endTime1 - startTime1;
    
    // Second call (warm cache)
    const startTime2 = performance.now();
    const adviceResult2 = adviceEngine.generateAdvice(result, params);
    const endTime2 = performance.now();
    const duration2 = endTime2 - startTime2;
    
    console.log(`First call (cold cache): ${duration1.toFixed(2)}ms`);
    console.log(`Second call (warm cache): ${duration2.toFixed(2)}ms`);
    console.log(`Cache speedup: ${(duration1 / duration2).toFixed(2)}x`);
    
    // Cache should provide significant speedup
    assert(duration2 < duration1, "Cached call should be faster than initial call");
    assert(duration2 < duration1 * 0.8, "Cache should provide at least 20% speedup");
    
    // Results should be identical
    assertEquals(
      adviceResult1.advice.recommendations.length,
      adviceResult2.advice.recommendations.length,
      "Cached results should match original results"
    );
  },
});

/**
 * Performance test for milestone detection with multiple loan scenarios
 */
Deno.test({
  name: "Performance: Milestone detection with multiple loans (stress test)",
  fn: () => {
    globalPerformanceMonitor.clearMetrics();
    
    // Create scenario with many loans
    const params = createLargeScaleParameters(25);
    
    // Add more loans for stress testing
    params.loans!.push(
      {
        id: "personal-loan",
        label: "Personal Loan",
        principal: 15000,
        interestRate: 12.5,
        paymentAmount: 400,
        paymentFrequency: "monthly" as const,
        hasOffset: false,
        offsetBalance: 0,
        autoPayoutWhenOffsetFull: false,
        isDebtRecycling: false,
      },
      {
        id: "line-of-credit",
        label: "Line of Credit",
        principal: 50000,
        interestRate: 8.9,
        paymentAmount: 300,
        paymentFrequency: "monthly" as const,
        hasOffset: true,
        offsetBalance: 5000,
        autoPayoutWhenOffsetFull: true,
        isDebtRecycling: false,
      }
    );
    
    const states = generateLargeSimulationStates(25);
    console.log(`Testing with ${params.loans!.length} loans and ${states.length} states`);
    
    const detector = new MilestoneDetector();
    
    const startTime = performance.now();
    const result = detector.detectMilestones(states, params);
    const endTime = performance.now();
    
    const duration = endTime - startTime;
    console.log(`Multi-loan milestone detection took ${duration.toFixed(2)}ms`);
    console.log(`Found ${result.milestones.length} milestones across ${params.loans!.length} loans`);
    
    // Performance should scale reasonably with number of loans
    const expectedMaxDuration = params.loans!.length * 200; // 200ms per loan max
    assert(duration < expectedMaxDuration, 
      `Detection should complete within ${expectedMaxDuration}ms for ${params.loans!.length} loans, took ${duration}ms`);
    
    // Should find at least some milestones in a 25-year simulation
    assert(result.milestones.length >= 1, 
      "Should find at least one milestone in 25-year simulation with multiple loans");
    
    console.log("\nPerformance Report:");
    console.log(globalPerformanceMonitor.generateReport());
  },
});

/**
 * Performance test for large dataset batch processing
 */
Deno.test({
  name: "Performance: Batch processing with 50-year simulation",
  fn: () => {
    globalPerformanceMonitor.clearMetrics();
    
    const params = createLargeScaleParameters(50); // Very long simulation
    
    console.log("Running 50-year simulation for batch processing test...");
    const startSimTime = performance.now();
    const result = SimulationEngine.runSimulation(params);
    const endSimTime = performance.now();
    
    console.log(`Simulation took ${(endSimTime - startSimTime).toFixed(2)}ms for ${result.states.length} states`);
    
    // Test both milestone detection and advice generation
    const detector = new MilestoneDetector();
    const adviceEngine = new RetirementAdviceEngine();
    
    const startTime = performance.now();
    
    // Run milestone detection
    const milestoneResult = detector.detectMilestones(result.states, params);
    
    // Run advice generation
    const adviceResult = adviceEngine.generateAdvice(result, params, milestoneResult.milestones);
    
    const endTime = performance.now();
    const totalDuration = endTime - startTime;
    
    console.log(`Total processing took ${totalDuration.toFixed(2)}ms for ${result.states.length} states`);
    console.log(`Found ${milestoneResult.milestones.length} milestones`);
    console.log(`Generated ${adviceResult.advice.recommendations.length} recommendations`);
    console.log(`Performance: ${(totalDuration / result.states.length).toFixed(4)}ms per state`);
    
    // Performance assertions for very large datasets
    assert(totalDuration < 5000, `Total processing should complete within 5 seconds, took ${totalDuration}ms`);
    assert(totalDuration / result.states.length < 5, 
      `Should process each state in under 5ms, actual: ${(totalDuration / result.states.length).toFixed(4)}ms`);
    
    // Verify results
    assert(milestoneResult.milestones.length > 0, "Should detect milestones in 50-year simulation");
    assert(adviceResult.advice.recommendations.length > 0, "Should generate advice recommendations");
    assertEquals(milestoneResult.errors.length, 0, "Should not have milestone errors");
    assertEquals(adviceResult.errors.length, 0, "Should not have advice errors");
    
    console.log("\nFinal Performance Report:");
    console.log(globalPerformanceMonitor.generateReport());
  },
});

/**
 * Memory usage and performance monitoring test
 */
Deno.test({
  name: "Performance: Memory usage monitoring",
  fn: () => {
    globalPerformanceMonitor.clearMetrics();
    
    const params = createLargeScaleParameters(30);
    
    // Monitor memory usage during processing
    const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    const result = SimulationEngine.runSimulation(params);
    const detector = new MilestoneDetector();
    const adviceEngine = new RetirementAdviceEngine();
    
    // Process multiple times to test for memory leaks
    for (let i = 0; i < 5; i++) {
      detector.detectMilestones(result.states, params);
      adviceEngine.generateAdvice(result, params);
    }
    
    const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    console.log(`Memory usage increased by ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB during processing`);
    
    // Memory increase should be reasonable (less than 50MB for this test)
    if (initialMemory > 0) {
      assert(memoryIncrease < 50 * 1024 * 1024, 
        `Memory increase should be less than 50MB, actual: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    }
    
    console.log("\nPerformance Report:");
    console.log(globalPerformanceMonitor.generateReport());
  },
});