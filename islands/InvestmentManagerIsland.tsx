/**
 * InvestmentManagerIsland - Enhanced investment portfolio manager
 * Tracks individual holdings with purchase history and live price updates
 */

import { useState } from "preact/hooks";
import type { SimulationConfiguration } from "../types/financial.ts";
import type {
  InvestmentHolding,
  InvestmentPurchase,
  InvestmentSale,
  InvestmentType,
  PlannedSale,
  PlannedSaleFrequency,
} from "../types/investments.ts";
import {
  INVESTMENT_TEMPLATES,
  INVESTMENT_TYPE_INFO,
} from "../types/investments.ts";
import {
  sellFromPurchases,
  totalRealizedGainLoss,
} from "../lib/investment_ledger_utils.ts";
import { apiClient } from "../lib/api-client.ts";

const PLANNED_SALE_FREQUENCY_LABELS: Record<PlannedSaleFrequency, string> = {
  once: "Once",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "half-yearly": "Every 6 Months",
  yearly: "Yearly",
};

interface InvestmentManagerIslandProps {
  config: SimulationConfiguration;
  onConfigChange: (config: SimulationConfiguration) => void;
}

export default function InvestmentManagerIsland(
  { config, onConfigChange }: InvestmentManagerIslandProps,
) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [isAddingInvestment, setIsAddingInvestment] = useState(false);
  const [editingInvestmentId, setEditingInvestmentId] = useState<string | null>(
    null,
  );
  const [investmentFormData, setInvestmentFormData] = useState<
    Partial<InvestmentHolding>
  >({});
  const [expandedInvestmentId, setExpandedInvestmentId] = useState<
    string | null
  >(null);
  const [isAddingPurchase, setIsAddingPurchase] = useState<string | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(
    null,
  );
  const [purchaseFormData, setPurchaseFormData] = useState<
    Partial<InvestmentPurchase>
  >({});
  const [isSellingUnits, setIsSellingUnits] = useState<string | null>(null);
  const [sellFormData, setSellFormData] = useState<{
    date: string;
    units?: number;
    pricePerUnit?: number;
    fees?: number;
  }>({ date: new Date().toISOString().split("T")[0] });
  const [sellError, setSellError] = useState<string | null>(null);
  const [isAddingPlannedSale, setIsAddingPlannedSale] = useState<string | null>(
    null,
  );
  const [plannedSaleFormData, setPlannedSaleFormData] = useState<
    Partial<PlannedSale>
  >({});
  const [plannedSaleError, setPlannedSaleError] = useState<string | null>(null);
  const [priceFetchErrors, setPriceFetchErrors] = useState<
    Record<string, string>
  >({});
  const [isFetchingPrice, setIsFetchingPrice] = useState<
    Record<string, boolean>
  >({});
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  const investments = config.baseParameters.investmentHoldings || [];

  const startAddInvestment = (template?: Partial<InvestmentHolding>) => {
    setInvestmentFormData({
      name: template?.name || "New Investment",
      type: template?.type || "shares",
      currentValue: template?.currentValue || 0,
      returnRate: template?.returnRate || 7,
      dividendYieldRate: template?.dividendYieldRate,
      contributionAmount: template?.contributionAmount,
      contributionFrequency: template?.contributionFrequency || "monthly",
      enabled: true,
      notes: template?.notes,
      tickerSymbol: template?.tickerSymbol,
      exchange: template?.exchange,
      purchases: [],
    });
    setIsAddingInvestment(true);
    setEditingInvestmentId(null);
    setShowTemplates(false);
  };

  const startEditInvestment = (investment: InvestmentHolding) => {
    setInvestmentFormData({ ...investment });
    setIsAddingInvestment(false);
    setEditingInvestmentId(investment.id);
  };

  const cancelInvestmentForm = () => {
    setInvestmentFormData({});
    setIsAddingInvestment(false);
    setEditingInvestmentId(null);
  };

  const saveInvestment = () => {
    if (
      !investmentFormData.name ||
      investmentFormData.currentValue === undefined ||
      investmentFormData.currentValue < 0
    ) {
      alert("Please enter a valid investment name and current value");
      return;
    }

    if (editingInvestmentId) {
      const updatedInvestments = investments.map((inv) =>
        inv.id === editingInvestmentId
          ? { ...inv, ...investmentFormData } as InvestmentHolding
          : inv
      );
      onConfigChange({
        ...config,
        baseParameters: {
          ...config.baseParameters,
          investmentHoldings: updatedInvestments,
        },
      });
    } else {
      const newInvestment: InvestmentHolding = {
        id: `investment-${Date.now()}`,
        ...investmentFormData as any,
      };
      onConfigChange({
        ...config,
        baseParameters: {
          ...config.baseParameters,
          investmentHoldings: [...investments, newInvestment],
        },
      });
    }

    cancelInvestmentForm();
  };

  const removeInvestment = (id: string) => {
    if (!confirm("Delete this investment?")) return;
    const updatedInvestments = investments.filter((inv) => inv.id !== id);
    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        investmentHoldings: updatedInvestments,
      },
    });
  };

  const toggleEnabled = (id: string) => {
    const updatedInvestments = investments.map((inv) =>
      inv.id === id ? { ...inv, enabled: !inv.enabled } : inv
    );
    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        investmentHoldings: updatedInvestments,
      },
    });
  };

  // Purchase management
  const startAddPurchase = (investmentId: string) => {
    setPurchaseFormData({
      date: new Date().toISOString().split("T")[0],
      units: 0,
      pricePerUnit: 0,
      totalCost: 0,
      fees: 0,
    });
    setIsAddingPurchase(investmentId);
    setEditingPurchaseId(null);
  };

  const startEditPurchase = (
    investmentId: string,
    purchase: InvestmentPurchase,
  ) => {
    setPurchaseFormData({ ...purchase });
    setEditingPurchaseId(purchase.id);
    setIsAddingPurchase(investmentId);
  };

  const cancelPurchaseForm = () => {
    setPurchaseFormData({});
    setIsAddingPurchase(null);
    setEditingPurchaseId(null);
  };

  const savePurchase = (investmentId: string) => {
    if (
      !purchaseFormData.units || !purchaseFormData.pricePerUnit ||
      purchaseFormData.units <= 0 || purchaseFormData.pricePerUnit <= 0
    ) {
      alert("Please enter valid units and price per unit");
      return;
    }

    const updatedInvestments = investments.map((inv) => {
      if (inv.id === investmentId) {
        let purchases;

        if (editingPurchaseId) {
          // Update existing purchase
          purchases = (inv.purchases || []).map((p) =>
            p.id === editingPurchaseId
              ? {
                ...p,
                date: purchaseFormData.date || p.date,
                units: purchaseFormData.units!,
                pricePerUnit: purchaseFormData.pricePerUnit!,
                totalCost: purchaseFormData.totalCost ||
                  (purchaseFormData.units! * purchaseFormData.pricePerUnit! +
                    (purchaseFormData.fees || 0)),
                fees: purchaseFormData.fees,
                notes: purchaseFormData.notes,
              }
              : p
          );
        } else {
          // Add new purchase
          const newPurchase: InvestmentPurchase = {
            id: `purchase-${Date.now()}`,
            date: purchaseFormData.date ||
              new Date().toISOString().split("T")[0],
            // Both fields are already validated as defined and positive by
            // the guard at the top of this function.
            units: purchaseFormData.units!,
            pricePerUnit: purchaseFormData.pricePerUnit!,
            totalCost: purchaseFormData.totalCost ||
              (purchaseFormData.units! * purchaseFormData.pricePerUnit! +
                (purchaseFormData.fees || 0)),
            fees: purchaseFormData.fees,
            notes: purchaseFormData.notes,
          };
          purchases = [...(inv.purchases || []), newPurchase];
        }

        const totalUnits = purchases.reduce((sum, p) => sum + p.units, 0);
        const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
        const avgCost = totalUnits > 0 ? totalCost / totalUnits : 0;

        return {
          ...inv,
          purchases,
          units: totalUnits,
          purchasePrice: avgCost,
          currentValue: inv.currentPrice
            ? totalUnits * inv.currentPrice
            : inv.currentValue,
        };
      }
      return inv;
    });

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        investmentHoldings: updatedInvestments,
      },
    });

    cancelPurchaseForm();
  };

  const removePurchase = (investmentId: string, purchaseId: string) => {
    if (!confirm("Delete this purchase?")) return;

    const updatedInvestments = investments.map((inv) => {
      if (inv.id === investmentId) {
        const purchases = (inv.purchases || []).filter((p) =>
          p.id !== purchaseId
        );
        const totalUnits = purchases.reduce((sum, p) => sum + p.units, 0);
        const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
        const avgCost = totalUnits > 0 ? totalCost / totalUnits : 0;

        return {
          ...inv,
          purchases,
          units: totalUnits,
          purchasePrice: avgCost,
          currentValue: inv.currentPrice
            ? totalUnits * inv.currentPrice
            : inv.currentValue,
        };
      }
      return inv;
    });

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        investmentHoldings: updatedInvestments,
      },
    });
  };

  const startSellUnits = (investmentId: string) => {
    setIsSellingUnits(investmentId);
    setSellFormData({ date: new Date().toISOString().split("T")[0] });
    setSellError(null);
  };

  const cancelSellForm = () => {
    setIsSellingUnits(null);
    setSellFormData({ date: new Date().toISOString().split("T")[0] });
    setSellError(null);
  };

  const confirmSellUnits = (investmentId: string) => {
    const investment = investments.find((inv) => inv.id === investmentId);
    if (
      !investment || !investment.purchases || investment.purchases.length === 0
    ) return;

    const { units, pricePerUnit, fees, date } = sellFormData;

    if (!units || units <= 0) {
      setSellError("Please enter a valid number of units");
      return;
    }
    if (!pricePerUnit || pricePerUnit <= 0) {
      setSellError("Please enter a valid sale price");
      return;
    }
    if (!date) {
      setSellError("Please enter a sale date");
      return;
    }

    let remainingPurchases, sale;
    try {
      ({ remainingPurchases, sale } = sellFromPurchases(
        investment.purchases,
        units,
        pricePerUnit,
        date,
        fees,
      ));
    } catch (err) {
      setSellError(err instanceof Error ? err.message : "Failed to sell units");
      return;
    }

    const totalUnitsAfter = remainingPurchases.reduce(
      (sum, p) => sum + p.units,
      0,
    );
    const totalCostAfter = remainingPurchases.reduce(
      (sum, p) => sum + p.totalCost,
      0,
    );
    const avgCost = totalUnitsAfter > 0 ? totalCostAfter / totalUnitsAfter : 0;

    const updatedInvestments = investments.map((inv) => {
      if (inv.id === investmentId) {
        return {
          ...inv,
          purchases: remainingPurchases,
          sales: [...(inv.sales || []), sale],
          units: totalUnitsAfter,
          purchasePrice: avgCost,
          currentValue: inv.currentPrice
            ? totalUnitsAfter * inv.currentPrice
            : totalCostAfter,
          currentPrice: pricePerUnit,
        };
      }
      return inv;
    });

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        investmentHoldings: updatedInvestments,
      },
    });

    cancelSellForm();
  };

  // Planned sale (forward-looking drawdown rule) management
  const startAddPlannedSale = (investmentId: string) => {
    setIsAddingPlannedSale(investmentId);
    setPlannedSaleFormData({
      startDate: new Date().toISOString().split("T")[0],
      frequency: "once",
      mode: "fixed-amount",
    });
    setPlannedSaleError(null);
  };

  const cancelPlannedSaleForm = () => {
    setIsAddingPlannedSale(null);
    setPlannedSaleFormData({});
    setPlannedSaleError(null);
  };

  const savePlannedSale = (investmentId: string) => {
    const { startDate, endDate, frequency, mode, amount, notes } =
      plannedSaleFormData;

    if (!startDate) {
      setPlannedSaleError("Please enter a start date");
      return;
    }
    if (!frequency) {
      setPlannedSaleError("Please select a frequency");
      return;
    }
    if (!mode) {
      setPlannedSaleError("Please select fixed amount or percent of balance");
      return;
    }
    if (!amount || amount <= 0) {
      setPlannedSaleError("Please enter a valid amount");
      return;
    }
    if (mode === "percent-of-balance" && amount > 100) {
      setPlannedSaleError("Percent of balance must be 100 or less");
      return;
    }

    const newPlannedSale: PlannedSale = {
      id: `planned-sale-${Date.now()}`,
      startDate,
      endDate: endDate || undefined,
      frequency,
      mode,
      amount,
      notes: notes || undefined,
    };

    const updatedInvestments = investments.map((inv) =>
      inv.id === investmentId
        ? {
          ...inv,
          plannedSales: [...(inv.plannedSales || []), newPlannedSale],
        }
        : inv
    );

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        investmentHoldings: updatedInvestments,
      },
    });

    cancelPlannedSaleForm();
  };

  const removePlannedSale = (investmentId: string, plannedSaleId: string) => {
    if (!confirm("Remove this planned sale rule?")) return;

    const updatedInvestments = investments.map((inv) =>
      inv.id === investmentId
        ? {
          ...inv,
          plannedSales: (inv.plannedSales || []).filter((s) =>
            s.id !== plannedSaleId
          ),
        }
        : inv
    );

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        investmentHoldings: updatedInvestments,
      },
    });
  };

  const describePlannedSale = (sale: PlannedSale): string => {
    const amountLabel = sale.mode === "fixed-amount"
      ? `$${
        sale.amount.toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 2,
        })
      }`
      : `${sale.amount}% of balance`;
    const startLabel = new Date(sale.startDate).toLocaleDateString();

    if (sale.frequency === "once") {
      return `${amountLabel}, once on ${startLabel}`;
    }

    const freqLabel = PLANNED_SALE_FREQUENCY_LABELS[sale.frequency]
      .toLowerCase();
    const endLabel = sale.endDate
      ? ` until ${new Date(sale.endDate).toLocaleDateString()}`
      : "";
    return `${amountLabel}, ${freqLabel} from ${startLabel}${endLabel}`;
  };

  // Update current price manually
  const updateCurrentPrice = (investmentId: string) => {
    const investment = investments.find((inv) => inv.id === investmentId);
    if (!investment) return;

    const currentPriceStr = investment.currentPrice?.toString() || "";
    const newPriceInput = prompt(
      `Enter current price per unit for ${investment.name}:`,
      currentPriceStr,
    );

    if (!newPriceInput || isNaN(parseFloat(newPriceInput))) return;

    const newPrice = parseFloat(newPriceInput);
    if (newPrice <= 0) {
      alert("Invalid price");
      return;
    }

    const updatedInvestments = investments.map((inv) => {
      if (inv.id === investmentId) {
        const totalUnits = (inv.purchases || []).reduce(
          (sum, p) => sum + p.units,
          0,
        );
        return {
          ...inv,
          currentPrice: newPrice,
          currentValue: totalUnits > 0
            ? totalUnits * newPrice
            : inv.currentValue,
          lastPriceFetch: new Date().toISOString(),
        };
      }
      return inv;
    });

    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        investmentHoldings: updatedInvestments,
      },
    });
  };

  /** Applies a fetched price to a holding: updates currentPrice/currentValue/
   *  lastPriceFetch, same as the manual path above. */
  const applyFetchedPrice = (
    holdings: InvestmentHolding[],
    investmentId: string,
    price: number,
  ): InvestmentHolding[] =>
    holdings.map((inv) => {
      if (inv.id !== investmentId) return inv;
      const totalUnits = (inv.purchases || []).reduce(
        (sum, p) => sum + p.units,
        0,
      );
      return {
        ...inv,
        currentPrice: price,
        currentValue: totalUnits > 0 ? totalUnits * price : inv.currentValue,
        lastPriceFetch: new Date().toISOString(),
      };
    });

  const toQuoteLookup = (inv: InvestmentHolding) => ({
    id: inv.id,
    tickerSymbol: inv.tickerSymbol!,
    exchange: inv.exchange,
    type: inv.type,
  });

  // Auto-fetch the current price for a single holding with a ticker symbol
  const refreshPrice = async (investmentId: string) => {
    const investment = investments.find((inv) => inv.id === investmentId);
    if (!investment || !investment.tickerSymbol) return;

    setIsFetchingPrice((prev) => ({ ...prev, [investmentId]: true }));
    setPriceFetchErrors((prev) => {
      const { [investmentId]: _removed, ...rest } = prev;
      return rest;
    });

    try {
      const quotes = await apiClient.fetchQuotes([toQuoteLookup(investment)]);
      const quote = quotes[investmentId];

      if (!quote || quote.error || typeof quote.price !== "number") {
        setPriceFetchErrors((prev) => ({
          ...prev,
          [investmentId]: quote?.error || "Failed to fetch price",
        }));
        return;
      }

      onConfigChange({
        ...config,
        baseParameters: {
          ...config.baseParameters,
          investmentHoldings: applyFetchedPrice(
            investments,
            investmentId,
            quote.price,
          ),
        },
      });
    } catch (_error) {
      setPriceFetchErrors((prev) => ({
        ...prev,
        [investmentId]: "Failed to fetch price",
      }));
    } finally {
      setIsFetchingPrice((prev) => ({ ...prev, [investmentId]: false }));
    }
  };

  // Auto-fetch prices for every holding that has a ticker symbol, in one request
  const refreshAllPrices = async () => {
    const tickeredInvestments = investments.filter((inv) => inv.tickerSymbol);
    if (tickeredInvestments.length === 0) return;

    setIsRefreshingAll(true);
    setPriceFetchErrors((prev) => {
      const rest = { ...prev };
      for (const inv of tickeredInvestments) delete rest[inv.id];
      return rest;
    });

    try {
      const quotes = await apiClient.fetchQuotes(
        tickeredInvestments.map(toQuoteLookup),
      );

      let updatedInvestments = investments;
      const newErrors: Record<string, string> = {};

      for (const inv of tickeredInvestments) {
        const quote = quotes[inv.id];
        if (quote && !quote.error && typeof quote.price === "number") {
          updatedInvestments = applyFetchedPrice(
            updatedInvestments,
            inv.id,
            quote.price,
          );
        } else {
          newErrors[inv.id] = quote?.error || "Failed to fetch price";
        }
      }

      if (Object.keys(newErrors).length > 0) {
        setPriceFetchErrors((prev) => ({ ...prev, ...newErrors }));
      }

      onConfigChange({
        ...config,
        baseParameters: {
          ...config.baseParameters,
          investmentHoldings: updatedInvestments,
        },
      });
    } catch (_error) {
      const newErrors: Record<string, string> = {};
      for (const inv of tickeredInvestments) {
        newErrors[inv.id] = "Failed to fetch price";
      }
      setPriceFetchErrors((prev) => ({ ...prev, ...newErrors }));
    } finally {
      setIsRefreshingAll(false);
    }
  };

  const totalValue = investments
    .filter((inv) => inv.enabled)
    .reduce((sum, inv) => sum + inv.currentValue, 0);

  const avgReturnRate = investments.length > 0
    ? investments
      .filter((inv) => inv.enabled)
      .reduce((sum, inv) => sum + (inv.currentValue * inv.returnRate), 0) /
      totalValue
    : 0;

  const calculateInvestmentMetrics = (investment: InvestmentHolding) => {
    const purchases = investment.purchases || [];
    const totalUnits = purchases.reduce((sum, p) => sum + p.units, 0);
    const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
    const avgCost = totalUnits > 0 ? totalCost / totalUnits : 0;
    const currentValue = investment.currentPrice && totalUnits > 0
      ? totalUnits * investment.currentPrice
      : investment.currentValue;
    const gainLoss = currentValue - totalCost;
    const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
    const realizedGainLoss = totalRealizedGainLoss(investment.sales);

    return {
      totalUnits,
      totalCost,
      avgCost,
      currentValue,
      gainLoss,
      gainLossPercent,
      realizedGainLoss,
    };
  };

  return (
    <div class="card p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <svg
          class="w-7 h-7 mr-3 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
        Investment Portfolio
      </h2>

      {/* Summary */}
      {investments.length > 0 && (
        <div class="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div class="grid grid-cols-2 gap-6 mb-4">
            <div>
              <p class="text-sm text-gray-600 mb-1">Total Portfolio Value</p>
              <p class="text-3xl font-bold text-blue-700">
                ${totalValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600 mb-1">Weighted Avg Return</p>
              <p class="text-3xl font-bold text-blue-700">
                {avgReturnRate.toFixed(2)}%
              </p>
            </div>
          </div>
          {investments.some((inv) => inv.tickerSymbol) && (
            <button
              onClick={refreshAllPrices}
              disabled={isRefreshingAll}
              class="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRefreshingAll ? "Refreshing..." : "🔄 Refresh All Prices"}
            </button>
          )}
        </div>
      )}

      {/* Add Investment Button */}
      {!isAddingInvestment && !editingInvestmentId && (
        <div class="mb-4 flex gap-2">
          <button
            onClick={() => startAddInvestment()}
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            + Add Investment
          </button>
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            class="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            {showTemplates ? "Hide" : "Templates"}
          </button>
        </div>
      )}

      {/* Templates */}
      {!isAddingInvestment && !editingInvestmentId && showTemplates && (
        <div class="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p class="text-sm font-medium text-gray-700 mb-2">
            Quick Add Templates:
          </p>
          <div class="grid grid-cols-2 gap-2">
            {INVESTMENT_TEMPLATES.map((template, idx) => (
              <button
                key={idx}
                onClick={() => startAddInvestment(template)}
                class="text-left px-3 py-2 bg-white border border-gray-300 rounded hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div class="flex items-center">
                  <span class="text-lg mr-2">
                    {INVESTMENT_TYPE_INFO[template.type!].icon}
                  </span>
                  <div>
                    <p class="text-sm font-medium text-gray-800">
                      {template.name}
                    </p>
                    <p class="text-xs text-gray-500">
                      {template.returnRate}% return
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Investment Form (Add/Edit) */}
      {(isAddingInvestment || editingInvestmentId) && (
        <div class="border border-blue-300 rounded-lg p-4 bg-blue-50 mb-4 fade-in">
          <h4 class="text-md font-semibold mb-3 text-gray-800">
            {editingInvestmentId ? "Edit Investment" : "Add New Investment"}
          </h4>

          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Investment Name *
            </label>
            <input
              type="text"
              value={investmentFormData.name || ""}
              onInput={(e) =>
                setInvestmentFormData({
                  ...investmentFormData,
                  name: (e.target as HTMLInputElement).value,
                })}
              placeholder="e.g., CBA Shares, VAS ETF"
              class="input-field text-sm"
            />
          </div>

          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Investment Type *
            </label>
            <select
              value={investmentFormData.type || "shares"}
              onChange={(e) =>
                setInvestmentFormData({
                  ...investmentFormData,
                  type: (e.target as HTMLSelectElement).value as InvestmentType,
                })}
              class="input-field text-sm"
            >
              {Object.entries(INVESTMENT_TYPE_INFO).map(([type, info]) => (
                <option key={type} value={type}>
                  {info.icon} {info.label}
                </option>
              ))}
            </select>
            <p class="text-xs text-gray-500 mt-1">
              {INVESTMENT_TYPE_INFO[investmentFormData.type || "shares"]
                .description}
            </p>
          </div>

          {(investmentFormData.type === "shares" ||
            investmentFormData.type === "etf" ||
            investmentFormData.type === "crypto") && (
            <div class="mb-3 p-3 bg-white rounded border border-gray-200">
              <p class="text-xs font-medium text-gray-700 mb-2">
                📊 Ticker Information (For price tracking)
              </p>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-gray-600 mb-1">
                    Ticker Symbol {investmentFormData.type === "crypto"
                      ? "(e.g., BTC, ETH)"
                      : "(e.g., CBA, VAS)"}
                  </label>
                  <input
                    type="text"
                    value={investmentFormData.tickerSymbol || ""}
                    onInput={(e) =>
                      setInvestmentFormData({
                        ...investmentFormData,
                        tickerSymbol: (e.target as HTMLInputElement).value
                          .toUpperCase(),
                      })}
                    class="input-field text-sm uppercase"
                    placeholder={investmentFormData.type === "crypto"
                      ? "BTC"
                      : "CBA"}
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-600 mb-1">
                    Exchange {investmentFormData.type === "crypto"
                      ? "(optional)"
                      : "(e.g., ASX, NYSE)"}
                  </label>
                  <input
                    type="text"
                    value={investmentFormData.exchange || ""}
                    onInput={(e) =>
                      setInvestmentFormData({
                        ...investmentFormData,
                        exchange: (e.target as HTMLInputElement).value
                          .toUpperCase(),
                      })}
                    class="input-field text-sm uppercase"
                    placeholder={investmentFormData.type === "crypto"
                      ? ""
                      : "ASX"}
                  />
                </div>
              </div>
            </div>
          )}

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Current Value ($) *
              </label>
              <input
                type="number"
                value={investmentFormData.currentValue ?? ""}
                onInput={(e) =>
                  setInvestmentFormData({
                    ...investmentFormData,
                    currentValue:
                      parseFloat((e.target as HTMLInputElement).value) || 0,
                  })}
                class="input-field text-sm"
                step="100"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">
                Return Rate (%) *
              </label>
              <input
                type="number"
                value={investmentFormData.returnRate ?? ""}
                onInput={(e) =>
                  setInvestmentFormData({
                    ...investmentFormData,
                    returnRate:
                      parseFloat((e.target as HTMLInputElement).value) || 0,
                  })}
                class="input-field text-sm"
                step="0.1"
              />
            </div>
          </div>

          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Dividend Yield (%) (Optional)
            </label>
            <input
              type="number"
              value={investmentFormData.dividendYieldRate ?? ""}
              onInput={(e) => {
                const raw = (e.target as HTMLInputElement).value;
                setInvestmentFormData({
                  ...investmentFormData,
                  dividendYieldRate: raw ? parseFloat(raw) : undefined,
                });
              }}
              class="input-field text-sm"
              placeholder="0"
              step="0.1"
            />
            <p class="text-xs text-gray-500 mt-1">
              Portion of the return rate above paid out as a taxable cash
              dividend each period, instead of compounding. E.g. a 7% return
              rate with a 4% dividend yield means 4% is paid as cash and 3%
              compounds as capital growth. Leave blank if this investment
              doesn't pay distributions.
            </p>
          </div>

          <div class="mb-3 p-3 bg-white rounded border border-gray-200">
            <p class="text-xs font-medium text-gray-700 mb-2">
              Regular Contributions (Optional)
            </p>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-gray-600 mb-1">
                  Amount ($)
                </label>
                <input
                  type="number"
                  value={investmentFormData.contributionAmount ?? ""}
                  onInput={(e) =>
                    setInvestmentFormData({
                      ...investmentFormData,
                      contributionAmount: (e.target as HTMLInputElement).value
                        ? parseFloat((e.target as HTMLInputElement).value)
                        : undefined,
                    })}
                  class="input-field text-sm"
                  placeholder="0"
                  step="10"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-600 mb-1">
                  Frequency
                </label>
                <select
                  value={investmentFormData.contributionFrequency || "monthly"}
                  onChange={(e) =>
                    setInvestmentFormData({
                      ...investmentFormData,
                      contributionFrequency: (e.target as HTMLSelectElement)
                        .value as any,
                    })}
                  class="input-field text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          </div>

          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={investmentFormData.notes || ""}
              onInput={(e) =>
                setInvestmentFormData({
                  ...investmentFormData,
                  notes: (e.target as HTMLTextAreaElement).value,
                })}
              class="input-field text-sm"
              placeholder="Add any notes about this investment..."
              rows={2}
            />
          </div>

          <div class="flex gap-3 mt-4">
            <button onClick={saveInvestment} class="btn-primary flex-1">
              {editingInvestmentId ? "Update" : "Add"} Investment
            </button>
            <button onClick={cancelInvestmentForm} class="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Investment List */}
      {!isAddingInvestment && !editingInvestmentId && (
        <>
          {investments.length > 0
            ? (
              <div class="space-y-4">
                {investments.map((investment) => {
                  const metrics = calculateInvestmentMetrics(investment);
                  const isExpanded = expandedInvestmentId === investment.id;
                  const purchases = investment.purchases || [];
                  const sales = investment.sales || [];
                  const transactions: Array<
                    | { kind: "buy"; date: string; data: InvestmentPurchase }
                    | { kind: "sell"; date: string; data: InvestmentSale }
                  > = [
                    ...purchases.map((p) => ({
                      kind: "buy" as const,
                      date: p.date,
                      data: p,
                    })),
                    ...sales.map((s) => ({
                      kind: "sell" as const,
                      date: s.date,
                      data: s,
                    })),
                  ].sort((a, b) =>
                    new Date(a.date).getTime() - new Date(b.date).getTime()
                  );

                  return (
                    <div
                      key={investment.id}
                      class={`border-2 rounded-lg transition-all ${
                        investment.enabled
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-200 bg-gray-50 opacity-60"
                      }`}
                    >
                      {/* Investment Header */}
                      <div class="p-4">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center flex-1">
                            <span class="text-3xl mr-3">
                              {INVESTMENT_TYPE_INFO[investment.type].icon}
                            </span>
                            <div class="flex-1">
                              <div class="flex items-center gap-2">
                                <h4 class="text-base font-semibold text-gray-800">
                                  {investment.name}
                                </h4>
                                {investment.tickerSymbol && (
                                  <span class="text-xs font-mono bg-gray-200 px-2 py-0.5 rounded">
                                    {investment.tickerSymbol}
                                    {investment.exchange &&
                                      `:${investment.exchange}`}
                                  </span>
                                )}
                              </div>
                              {priceFetchErrors[investment.id] && (
                                <p class="text-xs text-red-600 mt-1">
                                  {priceFetchErrors[investment.id]}
                                </p>
                              )}
                              <div class="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <span>
                                  Value:{" "}
                                  <span class="font-medium text-gray-800">
                                    ${metrics.currentValue.toLocaleString(
                                      undefined,
                                      {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      },
                                    )}
                                  </span>
                                </span>
                                <span>
                                  Return:{" "}
                                  <span class="font-medium text-gray-800">
                                    {investment.returnRate}%
                                  </span>
                                </span>
                                {!!investment.dividendYieldRate && (
                                  <span>
                                    Dividend:{" "}
                                    <span class="font-medium text-gray-800">
                                      {investment.dividendYieldRate}%
                                    </span>
                                  </span>
                                )}
                                {metrics.totalUnits > 0 && (
                                  <>
                                    <span>
                                      Units:{" "}
                                      <span class="font-medium text-gray-800">
                                        {metrics.totalUnits.toLocaleString()}
                                      </span>
                                    </span>
                                    <span
                                      class={metrics.gainLoss >= 0
                                        ? "text-green-600 font-medium"
                                        : "text-red-600 font-medium"}
                                    >
                                      {metrics.gainLoss >= 0 ? "↑" : "↓"}{" "}
                                      ${Math.abs(metrics.gainLoss)
                                        .toLocaleString(undefined, {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        })}{" "}
                                      ({metrics.gainLossPercent.toFixed(2)}%)
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div class="flex items-center gap-2 ml-4">
                            {metrics.totalUnits > 0 && (
                              investment.tickerSymbol
                                ? (
                                  <button
                                    onClick={() => refreshPrice(investment.id)}
                                    disabled={isFetchingPrice[investment.id]}
                                    class="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Fetch current price from Yahoo Finance"
                                  >
                                    {isFetchingPrice[investment.id]
                                      ? "Fetching..."
                                      : "🔄 Refresh Price"}
                                  </button>
                                )
                                : (
                                  <button
                                    onClick={() =>
                                      updateCurrentPrice(investment.id)}
                                    class="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                                    title="Set current price manually"
                                  >
                                    💲 Set Price
                                  </button>
                                )
                            )}
                            <button
                              onClick={() =>
                                setExpandedInvestmentId(
                                  isExpanded ? null : investment.id,
                                )}
                              class="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                            >
                              {isExpanded ? "▼ Hide" : "▶ Details"}
                            </button>
                            <label
                              class="flex items-center cursor-pointer"
                              title={investment.enabled
                                ? "Enabled"
                                : "Disabled"}
                            >
                              <input
                                type="checkbox"
                                checked={investment.enabled}
                                onChange={() => toggleEnabled(investment.id)}
                                class="w-4 h-4 text-blue-600 border-gray-300 rounded"
                              />
                            </label>
                            <button
                              onClick={() => startEditInvestment(investment)}
                              class="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => removeInvestment(investment.id)}
                              class="text-red-600 hover:text-red-700 text-xs px-2 py-1"
                              title="Delete"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div class="border-t border-blue-200 bg-white p-4">
                          <div class="mb-4">
                            <h5 class="text-sm font-semibold text-gray-700 mb-2">
                              Investment Details
                            </h5>
                            <div class="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <p class="text-gray-600">Total Cost Basis</p>
                                <p class="font-medium">
                                  ${metrics.totalCost.toLocaleString(
                                    undefined,
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}
                                </p>
                              </div>
                              <div>
                                <p class="text-gray-600">Avg Cost per Unit</p>
                                <p class="font-medium">
                                  ${metrics.avgCost.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </p>
                              </div>
                              <div>
                                <p class="text-gray-600">Current Price</p>
                                <p class="font-medium">
                                  {investment.currentPrice
                                    ? `$${
                                      investment.currentPrice.toLocaleString(
                                        undefined,
                                        {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2,
                                        },
                                      )
                                    }`
                                    : "Not set"}
                                </p>
                              </div>
                              <div>
                                <p class="text-gray-600">Realized Gain/Loss</p>
                                <p
                                  class={`font-medium ${
                                    metrics.realizedGainLoss >= 0
                                      ? "text-green-600"
                                      : "text-red-600"
                                  }`}
                                >
                                  {metrics.realizedGainLoss >= 0 ? "↑" : "↓"}
                                  {" "}
                                  ${Math.abs(metrics.realizedGainLoss)
                                    .toLocaleString(undefined, {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}
                                </p>
                              </div>
                            </div>
                            {investment.lastPriceFetch && (
                              <p class="text-xs text-gray-500 mt-2">
                                Last updated:{" "}
                                {new Date(investment.lastPriceFetch)
                                  .toLocaleString()}
                              </p>
                            )}
                          </div>

                          {/* Transaction History */}
                          <div class="mb-4">
                            <div class="flex items-center justify-between mb-2">
                              <h5 class="text-sm font-semibold text-gray-700">
                                Transaction History
                              </h5>
                              {isAddingPurchase !== investment.id &&
                                isSellingUnits !== investment.id && (
                                <div class="flex gap-2">
                                  {metrics.totalUnits > 0 && (
                                    <button
                                      onClick={() =>
                                        startSellUnits(investment.id)}
                                      class="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                    >
                                      💰 Sell Units
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      startAddPurchase(investment.id)}
                                    class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    + Add Purchase
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Sell Units Form */}
                            {isSellingUnits === investment.id && (
                              <div class="mb-3 p-3 bg-orange-50 border border-orange-200 rounded">
                                <h6 class="text-xs font-semibold text-gray-700 mb-2">
                                  Sell Units (Available:{" "}
                                  {metrics.totalUnits.toLocaleString()})
                                </h6>
                                <div class="grid grid-cols-3 gap-2 mb-2">
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Date
                                    </label>
                                    <input
                                      type="date"
                                      value={sellFormData.date}
                                      onInput={(e) =>
                                        setSellFormData({
                                          ...sellFormData,
                                          date: (e.target as HTMLInputElement)
                                            .value,
                                        })}
                                      class="input-field text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Units *
                                    </label>
                                    <input
                                      type="number"
                                      value={sellFormData.units ?? ""}
                                      onInput={(e) =>
                                        setSellFormData({
                                          ...sellFormData,
                                          units: parseFloat(
                                            (e.target as HTMLInputElement)
                                              .value,
                                          ) || undefined,
                                        })}
                                      class="input-field text-xs"
                                      step="0.01"
                                      max={metrics.totalUnits}
                                    />
                                  </div>
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Sale Price/Unit *
                                    </label>
                                    <input
                                      type="number"
                                      value={sellFormData.pricePerUnit ??
                                        (investment.currentPrice ?? "")}
                                      onInput={(e) =>
                                        setSellFormData({
                                          ...sellFormData,
                                          pricePerUnit: parseFloat(
                                            (e.target as HTMLInputElement)
                                              .value,
                                          ) || undefined,
                                        })}
                                      class="input-field text-xs"
                                      step="0.01"
                                    />
                                  </div>
                                </div>
                                <div class="grid grid-cols-3 gap-2 mb-2">
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Fees/Brokerage
                                    </label>
                                    <input
                                      type="number"
                                      value={sellFormData.fees ?? ""}
                                      onInput={(e) =>
                                        setSellFormData({
                                          ...sellFormData,
                                          fees: parseFloat(
                                            (e.target as HTMLInputElement)
                                              .value,
                                          ) || undefined,
                                        })}
                                      class="input-field text-xs"
                                      step="0.01"
                                    />
                                  </div>
                                  <div class="col-span-2 flex items-end">
                                    {sellFormData.units &&
                                      sellFormData.pricePerUnit && (
                                      <p class="text-xs text-gray-600">
                                        Proceeds: ${(sellFormData.units *
                                            sellFormData.pricePerUnit -
                                          (sellFormData.fees || 0))
                                          .toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {sellError && (
                                  <p class="text-xs text-red-600 mb-2">
                                    {sellError}
                                  </p>
                                )}
                                <div class="flex gap-2">
                                  <button
                                    onClick={() =>
                                      confirmSellUnits(investment.id)}
                                    class="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                  >
                                    Confirm Sale
                                  </button>
                                  <button
                                    onClick={cancelSellForm}
                                    class="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Add/Edit Purchase Form */}
                            {isAddingPurchase === investment.id && (
                              <div class="mb-3 p-3 bg-green-50 border border-green-200 rounded">
                                <h6 class="text-xs font-semibold text-gray-700 mb-2">
                                  {editingPurchaseId
                                    ? "Edit Purchase"
                                    : "New Purchase"}
                                </h6>
                                <div class="grid grid-cols-3 gap-2 mb-2">
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Date
                                    </label>
                                    <input
                                      type="date"
                                      value={purchaseFormData.date || ""}
                                      onInput={(e) =>
                                        setPurchaseFormData({
                                          ...purchaseFormData,
                                          date: (e.target as HTMLInputElement)
                                            .value,
                                        })}
                                      class="input-field text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Units *
                                    </label>
                                    <input
                                      type="number"
                                      value={purchaseFormData.units ?? ""}
                                      onInput={(e) => {
                                        const units = parseFloat(
                                          (e.target as HTMLInputElement)
                                            .value,
                                        ) || 0;
                                        const pricePerUnit =
                                          purchaseFormData.pricePerUnit || 0;
                                        const fees = purchaseFormData.fees || 0;
                                        setPurchaseFormData({
                                          ...purchaseFormData,
                                          units,
                                          totalCost: units * pricePerUnit +
                                            fees,
                                        });
                                      }}
                                      class="input-field text-xs"
                                      step="0.01"
                                    />
                                  </div>
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Price per Unit *
                                    </label>
                                    <input
                                      type="number"
                                      value={purchaseFormData.pricePerUnit ??
                                        ""}
                                      onInput={(e) => {
                                        const pricePerUnit = parseFloat(
                                          (e.target as HTMLInputElement)
                                            .value,
                                        ) || 0;
                                        const units = purchaseFormData.units ||
                                          0;
                                        const fees = purchaseFormData.fees || 0;
                                        setPurchaseFormData({
                                          ...purchaseFormData,
                                          pricePerUnit,
                                          totalCost: units * pricePerUnit +
                                            fees,
                                        });
                                      }}
                                      class="input-field text-xs"
                                      step="0.01"
                                    />
                                  </div>
                                </div>
                                <div class="grid grid-cols-3 gap-2 mb-2">
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Fees/Brokerage
                                    </label>
                                    <input
                                      type="number"
                                      value={purchaseFormData.fees ?? ""}
                                      onInput={(e) => {
                                        const fees = parseFloat(
                                          (e.target as HTMLInputElement)
                                            .value,
                                        ) || 0;
                                        const units = purchaseFormData.units ||
                                          0;
                                        const pricePerUnit =
                                          purchaseFormData.pricePerUnit || 0;
                                        setPurchaseFormData({
                                          ...purchaseFormData,
                                          fees,
                                          totalCost: units * pricePerUnit +
                                            fees,
                                        });
                                      }}
                                      class="input-field text-xs"
                                      step="0.01"
                                    />
                                  </div>
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Total Cost
                                    </label>
                                    <input
                                      type="number"
                                      value={purchaseFormData.totalCost ?? ""}
                                      readOnly
                                      class="input-field text-xs bg-gray-100"
                                    />
                                  </div>
                                  <div class="col-span-1">
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Notes
                                    </label>
                                    <input
                                      type="text"
                                      value={purchaseFormData.notes || ""}
                                      onInput={(e) =>
                                        setPurchaseFormData({
                                          ...purchaseFormData,
                                          notes: (e.target as HTMLInputElement)
                                            .value,
                                        })}
                                      class="input-field text-xs"
                                      placeholder="Optional"
                                    />
                                  </div>
                                </div>
                                <div class="flex gap-2">
                                  <button
                                    onClick={() => savePurchase(investment.id)}
                                    class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    {editingPurchaseId
                                      ? "Update Purchase"
                                      : "Save Purchase"}
                                  </button>
                                  <button
                                    onClick={cancelPurchaseForm}
                                    class="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Transaction List (buys and sells, chronological) */}
                            {transactions.length > 0
                              ? (
                                <div class="space-y-2">
                                  {transactions.map((txn) =>
                                    txn.kind === "buy"
                                      ? (
                                        <div
                                          key={`buy-${txn.data.id}`}
                                          class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs"
                                        >
                                          <div class="flex-1 grid grid-cols-6 gap-2">
                                            <div>
                                              <span class="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                                                BUY
                                              </span>
                                            </div>
                                            <div>
                                              <p class="text-gray-600">Date</p>
                                              <p class="font-medium">
                                                {new Date(txn.data.date)
                                                  .toLocaleDateString()}
                                              </p>
                                            </div>
                                            <div>
                                              <p class="text-gray-600">Units</p>
                                              <p class="font-medium">
                                                {txn.data.units
                                                  .toLocaleString()}
                                              </p>
                                            </div>
                                            <div>
                                              <p class="text-gray-600">
                                                Price/Unit
                                              </p>
                                              <p class="font-medium">
                                                ${txn.data.pricePerUnit
                                                  .toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  })}
                                              </p>
                                            </div>
                                            <div>
                                              <p class="text-gray-600">
                                                Total Cost
                                              </p>
                                              <p class="font-medium">
                                                ${txn.data.totalCost
                                                  .toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  })}
                                              </p>
                                            </div>
                                            <div>
                                              <p class="text-gray-600">Notes</p>
                                              <p class="font-medium">
                                                {txn.data.notes || "-"}
                                              </p>
                                            </div>
                                          </div>
                                          <div class="flex gap-1 ml-2">
                                            <button
                                              onClick={() =>
                                                startEditPurchase(
                                                  investment.id,
                                                  txn.data,
                                                )}
                                              class="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded"
                                              title="Edit purchase"
                                            >
                                              ✎
                                            </button>
                                            <button
                                              onClick={() =>
                                                removePurchase(
                                                  investment.id,
                                                  txn.data.id,
                                                )}
                                              class="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded"
                                              title="Delete purchase"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        </div>
                                      )
                                      : (
                                        <div
                                          key={`sell-${txn.data.id}`}
                                          class="flex items-center justify-between p-2 bg-orange-50 rounded text-xs"
                                        >
                                          <div class="flex-1 grid grid-cols-6 gap-2">
                                            <div>
                                              <span class="inline-block px-1.5 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                                                SELL
                                              </span>
                                            </div>
                                            <div>
                                              <p class="text-gray-600">Date</p>
                                              <p class="font-medium">
                                                {new Date(txn.data.date)
                                                  .toLocaleDateString()}
                                              </p>
                                            </div>
                                            <div>
                                              <p class="text-gray-600">Units</p>
                                              <p class="font-medium">
                                                {txn.data.units
                                                  .toLocaleString()}
                                              </p>
                                            </div>
                                            <div>
                                              <p class="text-gray-600">
                                                Price/Unit
                                              </p>
                                              <p class="font-medium">
                                                ${txn.data.pricePerUnit
                                                  .toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  })}
                                              </p>
                                            </div>
                                            <div>
                                              <p class="text-gray-600">
                                                Proceeds
                                              </p>
                                              <p class="font-medium">
                                                ${txn.data.totalProceeds
                                                  .toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  })}
                                              </p>
                                            </div>
                                            <div>
                                              <p class="text-gray-600">
                                                Realized
                                              </p>
                                              <p
                                                class={`font-medium ${
                                                  txn.data.realizedGainLoss >= 0
                                                    ? "text-green-600"
                                                    : "text-red-600"
                                                }`}
                                              >
                                                {txn.data.realizedGainLoss >= 0
                                                  ? "↑"
                                                  : "↓"} ${Math.abs(
                                                    txn.data.realizedGainLoss,
                                                  ).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                  })}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      )
                                  )}
                                </div>
                              )
                              : (
                                <p class="text-xs text-gray-500 text-center py-3">
                                  No transactions recorded yet
                                </p>
                              )}
                          </div>

                          {/* Planned Sales - forward-looking rules the simulation applies */}
                          <div class="mb-4">
                            <div class="flex items-center justify-between mb-2">
                              <h5 class="text-sm font-semibold text-gray-700">
                                Planned Sales (Simulation)
                              </h5>
                              {isAddingPlannedSale !== investment.id && (
                                <button
                                  onClick={() =>
                                    startAddPlannedSale(investment.id)}
                                  class="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                  + Add Planned Sale
                                </button>
                              )}
                            </div>
                            <p class="text-xs text-gray-500 mb-2">
                              One-off or recurring drawdowns the simulation will
                              apply to this holding as it projects forward.
                            </p>

                            {isAddingPlannedSale === investment.id && (
                              <div class="mb-3 p-3 bg-purple-50 border border-purple-200 rounded">
                                <h6 class="text-xs font-semibold text-gray-700 mb-2">
                                  New Planned Sale
                                </h6>
                                <div class="grid grid-cols-3 gap-2 mb-2">
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Start Date
                                    </label>
                                    <input
                                      type="date"
                                      value={plannedSaleFormData.startDate ||
                                        ""}
                                      onInput={(e) =>
                                        setPlannedSaleFormData({
                                          ...plannedSaleFormData,
                                          startDate:
                                            (e.target as HTMLInputElement)
                                              .value,
                                        })}
                                      class="input-field text-xs"
                                    />
                                  </div>
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Frequency
                                    </label>
                                    <select
                                      value={plannedSaleFormData.frequency ||
                                        "once"}
                                      onChange={(e) =>
                                        setPlannedSaleFormData({
                                          ...plannedSaleFormData,
                                          frequency:
                                            (e.target as HTMLSelectElement)
                                              .value as PlannedSaleFrequency,
                                        })}
                                      class="input-field text-xs"
                                    >
                                      {Object.entries(
                                        PLANNED_SALE_FREQUENCY_LABELS,
                                      ).map(([value, label]) => (
                                        <option key={value} value={value}>
                                          {label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      End Date (optional)
                                    </label>
                                    <input
                                      type="date"
                                      value={plannedSaleFormData.endDate || ""}
                                      onInput={(e) =>
                                        setPlannedSaleFormData({
                                          ...plannedSaleFormData,
                                          endDate:
                                            (e.target as HTMLInputElement)
                                              .value || undefined,
                                        })}
                                      disabled={plannedSaleFormData
                                        .frequency === "once"}
                                      class="input-field text-xs disabled:bg-gray-100 disabled:text-gray-400"
                                    />
                                  </div>
                                </div>
                                <div class="grid grid-cols-3 gap-2 mb-2">
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Type
                                    </label>
                                    <select
                                      value={plannedSaleFormData.mode ||
                                        "fixed-amount"}
                                      onChange={(e) =>
                                        setPlannedSaleFormData({
                                          ...plannedSaleFormData,
                                          mode: (e.target as HTMLSelectElement)
                                            .value as
                                              | "fixed-amount"
                                              | "percent-of-balance",
                                        })}
                                      class="input-field text-xs"
                                    >
                                      <option value="fixed-amount">
                                        Fixed $ Amount
                                      </option>
                                      <option value="percent-of-balance">
                                        % of Balance
                                      </option>
                                    </select>
                                  </div>
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      {plannedSaleFormData.mode ===
                                          "percent-of-balance"
                                        ? "Percent (%)"
                                        : "Amount ($)"}
                                    </label>
                                    <input
                                      type="number"
                                      value={plannedSaleFormData.amount ?? ""}
                                      onInput={(e) =>
                                        setPlannedSaleFormData({
                                          ...plannedSaleFormData,
                                          amount: parseFloat(
                                            (e.target as HTMLInputElement)
                                              .value,
                                          ) || undefined,
                                        })}
                                      class="input-field text-xs"
                                      step={plannedSaleFormData.mode ===
                                          "percent-of-balance"
                                        ? "1"
                                        : "100"}
                                      max={plannedSaleFormData.mode ===
                                          "percent-of-balance"
                                        ? 100
                                        : undefined}
                                    />
                                  </div>
                                  <div>
                                    <label class="block text-xs text-gray-600 mb-1">
                                      Notes
                                    </label>
                                    <input
                                      type="text"
                                      value={plannedSaleFormData.notes || ""}
                                      onInput={(e) =>
                                        setPlannedSaleFormData({
                                          ...plannedSaleFormData,
                                          notes: (e.target as HTMLInputElement)
                                            .value,
                                        })}
                                      class="input-field text-xs"
                                      placeholder="Optional"
                                    />
                                  </div>
                                </div>
                                {plannedSaleError && (
                                  <p class="text-xs text-red-600 mb-2">
                                    {plannedSaleError}
                                  </p>
                                )}
                                <div class="flex gap-2">
                                  <button
                                    onClick={() =>
                                      savePlannedSale(investment.id)}
                                    class="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                  >
                                    Save Planned Sale
                                  </button>
                                  <button
                                    onClick={cancelPlannedSaleForm}
                                    class="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            {(investment.plannedSales || []).length > 0
                              ? (
                                <div class="space-y-2">
                                  {(investment.plannedSales || []).map((
                                    plannedSale,
                                  ) => (
                                    <div
                                      key={plannedSale.id}
                                      class="flex items-center justify-between p-2 bg-purple-50 rounded text-xs"
                                    >
                                      <div>
                                        <p class="font-medium text-gray-800">
                                          {describePlannedSale(plannedSale)}
                                        </p>
                                        {plannedSale.notes && (
                                          <p class="text-gray-500 mt-0.5">
                                            {plannedSale.notes}
                                          </p>
                                        )}
                                      </div>
                                      <button
                                        onClick={() =>
                                          removePlannedSale(
                                            investment.id,
                                            plannedSale.id,
                                          )}
                                        class="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded"
                                        title="Remove planned sale"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )
                              : (
                                isAddingPlannedSale !== investment.id && (
                                  <p class="text-xs text-gray-500 text-center py-3">
                                    No planned sales configured
                                  </p>
                                )
                              )}
                          </div>

                          {investment.notes && (
                            <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                              <p class="text-xs text-gray-700">
                                <strong>Notes:</strong> {investment.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
            : (
              <div class="text-center py-12 text-gray-500">
                <svg
                  class="w-20 h-20 mx-auto mb-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                <p class="text-base font-medium">No investments yet</p>
                <p class="text-sm mt-1">
                  Click "Add Investment" or use templates to get started
                </p>
              </div>
            )}
        </>
      )}
    </div>
  );
}
