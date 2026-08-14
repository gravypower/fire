/**
 * Unit tests for buildYahooSymbol
 */

import { assertEquals } from "$std/assert/mod.ts";
import { buildYahooSymbol } from "../../lib/quote_utils.ts";

Deno.test("buildYahooSymbol - appends .AX for ASX-listed tickers", () => {
  assertEquals(
    buildYahooSymbol({ tickerSymbol: "CBA", exchange: "ASX" }),
    "CBA.AX",
  );
});

Deno.test("buildYahooSymbol - ASX suffix is case-insensitive on exchange", () => {
  assertEquals(
    buildYahooSymbol({ tickerSymbol: "vas", exchange: "asx" }),
    "VAS.AX",
  );
});

Deno.test("buildYahooSymbol - US tickers pass through unchanged", () => {
  assertEquals(
    buildYahooSymbol({ tickerSymbol: "AAPL", exchange: "NASDAQ" }),
    "AAPL",
  );
});

Deno.test("buildYahooSymbol - no exchange set passes through unchanged", () => {
  assertEquals(
    buildYahooSymbol({ tickerSymbol: "AAPL" }),
    "AAPL",
  );
});

Deno.test("buildYahooSymbol - appends -USD for crypto without a suffix", () => {
  assertEquals(
    buildYahooSymbol({ tickerSymbol: "BTC", type: "crypto" }),
    "BTC-USD",
  );
});

Deno.test("buildYahooSymbol - does not double-suffix crypto that already has one", () => {
  assertEquals(
    buildYahooSymbol({ tickerSymbol: "BTC-USD", type: "crypto" }),
    "BTC-USD",
  );
  assertEquals(
    buildYahooSymbol({ tickerSymbol: "ETH-AUD", type: "crypto" }),
    "ETH-AUD",
  );
});

Deno.test("buildYahooSymbol - ASX takes priority over crypto suffixing", () => {
  // Unlikely combination, but ASX-listed crypto ETFs exist - exchange wins.
  assertEquals(
    buildYahooSymbol({ tickerSymbol: "CRYP", exchange: "ASX", type: "crypto" }),
    "CRYP.AX",
  );
});

Deno.test("buildYahooSymbol - trims and uppercases the ticker", () => {
  assertEquals(
    buildYahooSymbol({ tickerSymbol: " aapl " }),
    "AAPL",
  );
});
