/**
 * Investment tracking types
 * Supports individual investment holdings with different types
 * 
 * FUTURE ENHANCEMENT: Price Lookup API Integration
 * The ticker symbol and exchange fields enable future integration with:
 * - Yahoo Finance API (for ASX, NYSE, NASDAQ stocks)
 * - CoinGecko/CoinMarketCap API (for cryptocurrency)
 * - Alpha Vantage API (for comprehensive market data)
 * 
 * This will allow automatic price updates and real-time portfolio valuation.
 * Consider this a "Pro" feature for future monetization.
 */

/**
 * Investment type - flexible to support various asset classes
 */
export type InvestmentType =
  | "shares"
  | "term-deposit"
  | "managed-fund"
  | "etf"
  | "property"
  | "crypto"
  | "bonds"
  | "cash-savings"
  | "other";

/**
 * Individual purchase/parcel of an investment
 */
export interface InvestmentPurchase {
  /** Unique identifier for this purchase */
  id: string;
  
  /** Date of purchase */
  date: string;
  
  /** Number of units purchased */
  units: number;
  
  /** Price per unit at purchase */
  pricePerUnit: number;
  
  /** Total cost (units * pricePerUnit + fees) */
  totalCost: number;
  
  /** Any fees or brokerage paid */
  fees?: number;
  
  /** Notes about this purchase */
  notes?: string;
}

/**
 * Individual investment holding
 */
export interface InvestmentHolding {
  /** Unique identifier */
  id: string;
  
  /** Name/description of the investment */
  name: string;
  
  /** Type of investment */
  type: InvestmentType;
  
  /** Current value/balance */
  currentValue: number;
  
  /** Expected annual return rate as percentage (e.g., 7 for 7%) */
  returnRate: number;
  
  /** Regular contribution amount (optional) */
  contributionAmount?: number;
  
  /** How often contributions are made (optional) */
  contributionFrequency?: "weekly" | "fortnightly" | "monthly" | "yearly";
  
  /** Whether this investment is active */
  enabled: boolean;
  
  /** Optional start date (if not set, starts from simulation start) */
  startDate?: Date;
  
  /** Optional end date (if not set, continues indefinitely) */
  endDate?: Date;
  
  /** Which person this investment belongs to (for household mode) */
  personId?: string;
  
  /** Additional notes or details */
  notes?: string;
  
  // Unit-based tracking (for shares, ETFs, crypto, etc.)
  /** Ticker symbol or code (e.g., "CBA.AX", "VAS.AX", "BTC") - for future price lookups */
  tickerSymbol?: string;
  
  /** Number of units/shares held (DEPRECATED - use purchases array) */
  units?: number;
  
  /** Purchase price per unit (cost basis) (DEPRECATED - use purchases array) */
  purchasePrice?: number;
  
  /** Current price per unit (optional, can be updated manually or via API) */
  currentPrice?: number;
  
  /** Exchange or market (e.g., "ASX", "NYSE", "NASDAQ") */
  exchange?: string;
  
  /** Array of purchases/parcels for this investment */
  purchases?: InvestmentPurchase[];
  
  /** Last time price was fetched from API */
  lastPriceFetch?: string;
}

/**
 * Investment summary by type
 */
export interface InvestmentSummary {
  type: InvestmentType;
  totalValue: number;
  holdings: InvestmentHolding[];
  totalAnnualReturn: number;
}

/**
 * Investment type display information
 */
export const INVESTMENT_TYPE_INFO: Record<InvestmentType, { 
  label: string; 
  icon: string; 
  color: string;
  description: string;
}> = {
  shares: { 
    label: "Shares/Stocks", 
    icon: "📈", 
    color: "blue",
    description: "Individual company shares"
  },
  "term-deposit": { 
    label: "Term Deposit", 
    icon: "🏦", 
    color: "green",
    description: "Fixed-term bank deposit"
  },
  "managed-fund": { 
    label: "Managed Fund", 
    icon: "💼", 
    color: "purple",
    description: "Professionally managed investment fund"
  },
  etf: { 
    label: "ETF", 
    icon: "📊", 
    color: "indigo",
    description: "Exchange-traded fund"
  },
  property: { 
    label: "Investment Property", 
    icon: "🏘️", 
    color: "orange",
    description: "Rental or investment property"
  },
  crypto: { 
    label: "Cryptocurrency", 
    icon: "₿", 
    color: "yellow",
    description: "Digital currency holdings"
  },
  bonds: { 
    label: "Bonds", 
    icon: "📜", 
    color: "teal",
    description: "Government or corporate bonds"
  },
  "cash-savings": { 
    label: "Cash Savings", 
    icon: "💰", 
    color: "emerald",
    description: "High-interest savings account"
  },
  other: { 
    label: "Other", 
    icon: "📦", 
    color: "gray",
    description: "Other investment types"
  },
};

/**
 * Default investment templates
 */
export const INVESTMENT_TEMPLATES: Partial<InvestmentHolding>[] = [
  { 
    name: "Vanguard ASX 200 ETF", 
    type: "etf", 
    returnRate: 7.5,
    contributionFrequency: "monthly",
    tickerSymbol: "VAS",
    exchange: "ASX"
  },
  { 
    name: "Term Deposit", 
    type: "term-deposit", 
    returnRate: 4.5,
  },
  { 
    name: "CBA Shares", 
    type: "shares", 
    returnRate: 8.0,
    contributionFrequency: "monthly",
    tickerSymbol: "CBA",
    exchange: "ASX"
  },
  { 
    name: "Bitcoin", 
    type: "crypto", 
    returnRate: 15.0,
    tickerSymbol: "BTC",
  },
  { 
    name: "Managed Fund", 
    type: "managed-fund", 
    returnRate: 6.5,
    contributionFrequency: "monthly"
  },
  { 
    name: "High Interest Savings", 
    type: "cash-savings", 
    returnRate: 5.0,
    contributionFrequency: "monthly"
  },
];
