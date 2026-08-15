import { buildYahooSymbol } from "../../lib/quote_utils.ts";
import { Handlers } from "fresh/compat";

interface QuoteRequestHolding {
  id: string;
  tickerSymbol: string;
  exchange?: string;
  type?: string;
}

interface QuoteResult {
  price?: number;
  currency?: string;
  error?: string;
}

async function fetchOneQuote(symbol: string): Promise<QuoteResult> {
  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${
        encodeURIComponent(symbol)
      }`,
      {
        headers: {
          // Yahoo's chart endpoint rejects requests with no User-Agent
          "User-Agent":
            "Mozilla/5.0 (compatible; fire-finance-sim/1.0; +https://localhost)",
        },
      },
    );

    if (!response.ok) {
      return { error: `Ticker not found (HTTP ${response.status})` };
    }

    const data = await response.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice;

    if (typeof price !== "number") {
      const errorDescription = data?.chart?.error?.description;
      return { error: errorDescription || "Ticker not found" };
    }

    return { price, currency: meta?.currency };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to fetch price",
    };
  }
}

export const handler: Handlers = {
  async POST(ctx) {
    const req = ctx.req;

    try {
      const body = await req.json();
      const holdings: QuoteRequestHolding[] = body?.holdings ?? [];

      if (!Array.isArray(holdings) || holdings.length === 0) {
        return new Response(
          JSON.stringify({ error: "Request must include a holdings array" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const results = await Promise.allSettled(
        holdings.map(async (holding) => {
          if (!holding.tickerSymbol) {
            return {
              id: holding.id,
              result: { error: "No ticker symbol set" } as QuoteResult,
            };
          }
          const symbol = buildYahooSymbol(holding);
          const result = await fetchOneQuote(symbol);
          return { id: holding.id, result };
        }),
      );

      const quotes: Record<string, QuoteResult> = {};
      for (let i = 0; i < results.length; i++) {
        const outcome = results[i];
        const holdingId = holdings[i].id;
        quotes[holdingId] = outcome.status === "fulfilled"
          ? outcome.value.result
          : { error: "Failed to fetch price" };
      }

      return new Response(JSON.stringify({ quotes }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch quotes" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  },
};
