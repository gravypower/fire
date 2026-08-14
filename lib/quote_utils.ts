/**
 * Maps an investment holding's ticker/exchange/type to the symbol Yahoo
 * Finance's unofficial endpoints expect. Kept as a pure function so it can
 * be tested without a network call.
 */

export interface QuoteLookup {
  tickerSymbol: string;
  exchange?: string;
  type?: string;
}

export function buildYahooSymbol(holding: QuoteLookup): string {
  const ticker = holding.tickerSymbol.trim().toUpperCase();
  const exchange = holding.exchange?.trim().toUpperCase();

  if (exchange === "ASX") {
    return `${ticker}.AX`;
  }

  if (holding.type === "crypto" && !ticker.includes("-")) {
    return `${ticker}-USD`;
  }

  // US exchanges (NASDAQ/NYSE/etc.) and anything unrecognized: use as-is.
  return ticker;
}
