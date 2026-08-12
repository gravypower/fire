import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

/**
 * Test suite for Date Serialization Logic
 * Mirrors the logic implemented in routes/api/simulation/commands.ts
 */

// Copy of the logic from commands.ts for testing
const deserializeDates = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Check if string is an ISO date
    if (
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(obj) ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(obj)
    ) {
      const date = new Date(obj);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deserializeDates(item));
  }

  if (typeof obj === "object") {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = deserializeDates(obj[key]);
      }
    }
    return result;
  }

  return obj;
};

Deno.test("Transformation - Deserialize ISO strings to Date objects", () => {
  const input = {
    date: "2023-01-01T00:00:00.000Z",
    name: "Test Event",
    count: 5,
  };

  const output = deserializeDates(input);

  assertEquals(output.date instanceof Date, true);
  assertEquals(output.date.toISOString(), "2023-01-01T00:00:00.000Z");
  assertEquals(output.name, "Test Event");
  assertEquals(output.count, 5);
});

Deno.test("Transformation - Recursively deserialize nested objects", () => {
  const input = {
    meta: {
      created: "2023-01-01T00:00:00.000Z",
    },
    data: {
      items: [
        { id: 1, due: "2023-02-01T00:00:00.000Z" },
      ],
    },
  };

  const output = deserializeDates(input);

  assertEquals(output.meta.created instanceof Date, true);
  assertEquals(output.data.items[0].due instanceof Date, true);
});

Deno.test("Transformation - Leave non-date strings alone", () => {
  const input = {
    text: "This is not a date",
    partial: "2023-01-01", // Simple date string usually not ISO ISO 8601 full format needed by our regex
    number: 123,
  };

  const output = deserializeDates(input);

  assertEquals(typeof output.text, "string");
  // Our regex is strict about T separator, so simple YYYY-MM-DD might be skipped or kept as string depending on regex implementation details.
  // The regex provided: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
  // So "2023-01-01" should remain a string
  assertEquals(typeof output.partial, "string");
});
