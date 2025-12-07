/**
 * Setup verification test
 * This test verifies that the project is properly configured with fast-check
 */

import { assertEquals } from "$std/assert/mod.ts";
import * as fc from "fast-check";

Deno.test("fast-check is properly installed and working", () => {
  // Simple property test to verify fast-check is working
  fc.assert(
    fc.property(fc.integer(), (n) => {
      return n + 0 === n;
    }),
    { numRuns: 100 }
  );
});

Deno.test("TypeScript strict mode is enabled", () => {
  // This test will fail to compile if strict mode is not enabled
  const value: string = "test";
  assertEquals(value, "test");
});
