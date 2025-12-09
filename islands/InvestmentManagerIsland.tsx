/**
 * InvestmentManagerIsland - Enhanced investment portfolio manager
 * Tracks individual holdings with purchase history and live price updates
 */

import { useState } from "preact/hooks";
import type { SimulationConfiguration } from "../types/financial.ts";
import type { InvestmentHolding, InvestmentPurchase, InvestmentType } from "../types/investments.ts";
import { INVESTMENT_TYPE_INFO, INVESTMENT_TEMPLATES } from "../types/investments.ts";

interface InvestmentManagerIslandProps {
  config: SimulationConfiguration;
  onConfigChange: (config: SimulationConfiguration) => void;
}

export default function InvestmentManagerIsland({ config, onConfigChange }: InvestmentManagerIslandProps) {
  const [showTemplates, setShowTemplates] = useState(false);
  const [isAddingInvestment, setIsAddingInvestment] = useState(false);
  const [editingInvestmentId, setEditingInvestmentId] = useState<string | null>(null);
  const [investmentFormData, setInvestmentFormData] = useState<Partial<InvestmentHolding>>({});
  const [expandedInvestmentId, setExpandedInvestmentId] = useState<string | null>(null);
  const [isAddingPurchase, setIsAddingPurchase] = useState<string | null>(null);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [purchaseFormData, setPurchaseFormData] = useState<Partial<InvestmentPurchase>>({});

  const investments = config.baseParameters.investmentHoldings || [];

  const startAddInvestment = (template?: Partial<InvestmentHolding>) => {
    setInvestmentFormData({
      name: template?.name || "New Investment",
      type: template?.type || "shares",
      currentValue: template?.currentValue || 0,
      returnRate: template?.returnRate || 7,
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
    if (!investmentFormData.name || investmentFormData.currentValue === undefined || investmentFormData.currentValue < 0) {
      alert("Please enter a valid investment name and current value");
      return;
    }

    if (editingInvestmentId) {
      const updatedInvestments = investments.map(inv =>
        inv.id === editingInvestmentId ? { ...inv, ...investmentFormData } as InvestmentHolding : inv
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
    const updatedInvestments = investments.filter(inv => inv.id !== id);
    onConfigChange({
      ...config,
      baseParameters: {
        ...config.baseParameters,
        investmentHoldings: updatedInvestments,
      },
    });
  };

  const toggleEnabled = (id: string) => {
    const updatedInvestments = investments.map(inv =>
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
      date: new Date().toISOString().split('T')[0],
      units: 0,
      pricePerUnit: 0,
      totalCost: 0,
      fees: 0,
    });
    setIsAddingPurchase(investmentId);
    setEditingPurchaseId(null);
  };

  const startEditPurchase = (investmentId: string, purchase: InvestmentPurchase) => {
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
    if (!purchaseFormData.units || !purchaseFormData.pricePerUnit || purchaseFormData.units <= 0 || purchaseFormData.pricePerUnit <= 0) {
      alert("Please enter valid units and price per unit");
      return;
    }

    const updatedInvestments = investments.map(inv => {
      if (inv.id === investmentId) {
        let purchases;
        
        if (editingPurchaseId) {
          // Update existing purchase
          purchases = (inv.purchases || []).map(p => 
            p.id === editingPurchaseId 
              ? {
                  ...p,
                  date: purchaseFormData.date || p.date,
                  units: purchaseFormData.units!,
                  pricePerUnit: purchaseFormData.pricePerUnit!,
                  totalCost: purchaseFormData.totalCost || (purchaseFormData.units! * purchaseFormData.pricePerUnit! + (purchaseFormData.fees || 0)),
                  fees: purchaseFormData.fees,
                  notes: purchaseFormData.notes,
                }
              : p
          );
        } else {
          // Add new purchase
          const newPurchase: InvestmentPurchase = {
            id: `purchase-${Date.now()}`,
            date: purchaseFormData.date || new Date().toISOString().split('T')[0],
            units: purchaseFormData.units,
            pricePerUnit: purchaseFormData.pricePerUnit,
            totalCost: purchaseFormData.totalCost || (purchaseFormData.units * purchaseFormData.pricePerUnit + (purchaseFormData.fees || 0)),
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
          currentValue: inv.currentPrice ? totalUnits * inv.currentPrice : inv.currentValue,
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

    const updatedInvestments = investments.map(inv => {
      if (inv.id === investmentId) {
        const purchases = (inv.purchases || []).filter(p => p.id !== purchaseId);
        const totalUnits = purchases.reduce((sum, p) => sum + p.units, 0);
        const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
        const avgCost = totalUnits > 0 ? totalCost / totalUnits : 0;
        
        return {
          ...inv,
          purchases,
          units: totalUnits,
          purchasePrice: avgCost,
          currentValue: inv.currentPrice ? totalUnits * inv.currentPrice : inv.currentValue,
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

  const sellUnits = (investmentId: string, unitsToSell: number, salePrice: number) => {
    const investment = investments.find(inv => inv.id === investmentId);
    if (!investment || !investment.purchases || investment.purchases.length === 0) return;

    const totalUnits = investment.purchases.reduce((sum, p) => sum + p.units, 0);
    if (unitsToSell > totalUnits) {
      alert(`Cannot sell ${unitsToSell} units. You only have ${totalUnits} units.`);
      return;
    }

    // Use FIFO (First In, First Out) method for selling
    let remainingToSell = unitsToSell;
    const updatedPurchases = [...investment.purchases].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const newPurchases: InvestmentPurchase[] = [];
    
    for (const purchase of updatedPurchases) {
      if (remainingToSell <= 0) {
        newPurchases.push(purchase);
      } else if (purchase.units <= remainingToSell) {
        // Sell entire purchase
        remainingToSell -= purchase.units;
        // Don't add to newPurchases (it's fully sold)
      } else {
        // Partial sale
        const remainingUnits = purchase.units - remainingToSell;
        const costPerUnit = purchase.totalCost / purchase.units;
        newPurchases.push({
          ...purchase,
          units: remainingUnits,
          totalCost: remainingUnits * costPerUnit,
        });
        remainingToSell = 0;
      }
    }

    const totalUnitsAfter = newPurchases.reduce((sum, p) => sum + p.units, 0);
    const totalCostAfter = newPurchases.reduce((sum, p) => sum + p.totalCost, 0);
    const avgCost = totalUnitsAfter > 0 ? totalCostAfter / totalUnitsAfter : 0;

    const updatedInvestments = investments.map(inv => {
      if (inv.id === investmentId) {
        return {
          ...inv,
          purchases: newPurchases,
          units: totalUnitsAfter,
          purchasePrice: avgCost,
          currentValue: inv.currentPrice ? totalUnitsAfter * inv.currentPrice : totalCostAfter,
          currentPrice: salePrice || inv.currentPrice,
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
    const investment = investments.find(inv => inv.id === investmentId);
    if (!investment) return;

    const totalUnits = (investment.purchases || []).reduce((sum, p) => sum + p.units, 0);
    const unitsToSell = prompt(`How many units do you want to sell? (Available: ${totalUnits})`);
    
    if (!unitsToSell || isNaN(parseFloat(unitsToSell))) return;
    
    const units = parseFloat(unitsToSell);
    if (units <= 0 || units > totalUnits) {
      alert("Invalid number of units");
      return;
    }

    const salePriceInput = prompt(`What is the sale price per unit? (Current: $${investment.currentPrice?.toFixed(2) || 'Not set'})`);
    if (!salePriceInput || isNaN(parseFloat(salePriceInput))) return;
    
    const salePrice = parseFloat(salePriceInput);
    if (salePrice <= 0) {
      alert("Invalid sale price");
      return;
    }

    const totalSaleValue = units * salePrice;
    const avgCost = investment.purchasePrice || 0;
    const costBasis = units * avgCost;
    const profit = totalSaleValue - costBasis;

    if (confirm(
      `Sell ${units} units at $${salePrice.toFixed(2)} each?\n\n` +
      `Sale Value: $${totalSaleValue.toFixed(2)}\n` +
      `Cost Basis: $${costBasis.toFixed(2)}\n` +
      `Profit/Loss: $${profit.toFixed(2)} (${((profit / costBasis) * 100).toFixed(2)}%)`
    )) {
      sellUnits(investmentId, units, salePrice);
    }
  };

  // Update current price manually
  const updateCurrentPrice = (investmentId: string) => {
    const investment = investments.find(inv => inv.id === investmentId);
    if (!investment) return;

    const currentPriceStr = investment.currentPrice?.toString() || "";
    const newPriceInput = prompt(
      `Enter current price per unit for ${investment.name}:`,
      currentPriceStr
    );
    
    if (!newPriceInput || isNaN(parseFloat(newPriceInput))) return;
    
    const newPrice = parseFloat(newPriceInput);
    if (newPrice <= 0) {
      alert("Invalid price");
      return;
    }

    const updatedInvestments = investments.map(inv => {
      if (inv.id === investmentId) {
        const totalUnits = (inv.purchases || []).reduce((sum, p) => sum + p.units, 0);
        return {
          ...inv,
          currentPrice: newPrice,
          currentValue: totalUnits > 0 ? totalUnits * newPrice : inv.currentValue,
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

  const totalValue = investments
    .filter(inv => inv.enabled)
    .reduce((sum, inv) => sum + inv.currentValue, 0);

  const avgReturnRate = investments.length > 0
    ? investments
        .filter(inv => inv.enabled)
        .reduce((sum, inv) => sum + (inv.currentValue * inv.returnRate), 0) / totalValue
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

    return { totalUnits, totalCost, avgCost, currentValue, gainLoss, gainLossPercent };
  };

  return (
    <div class="card p-6">
      <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <svg class="w-7 h-7 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        Investment Portfolio
      </h2>

      {/* Summary */}
      {investments.length > 0 && (
        <div class="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div class="grid grid-cols-2 gap-6">
            <div>
              <p class="text-sm text-gray-600 mb-1">Total Portfolio Value</p>
              <p class="text-3xl font-bold text-blue-700">
                ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p class="text-sm text-gray-600 mb-1">Weighted Avg Return</p>
              <p class="text-3xl font-bold text-blue-700">
                {avgReturnRate.toFixed(2)}%
              </p>
            </div>
          </div>
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
          <p class="text-sm font-medium text-gray-700 mb-2">Quick Add Templates:</p>
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
                    <p class="text-sm font-medium text-gray-800">{template.name}</p>
                    <p class="text-xs text-gray-500">{template.returnRate}% return</p>
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
            <label class="block text-xs font-medium text-gray-700 mb-1">Investment Name *</label>
            <input
              type="text"
              value={investmentFormData.name || ""}
              onInput={(e) => setInvestmentFormData({ ...investmentFormData, name: (e.target as HTMLInputElement).value })}
              placeholder="e.g., CBA Shares, VAS ETF"
              class="input-field text-sm"
            />
          </div>

          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-700 mb-1">Investment Type *</label>
            <select
              value={investmentFormData.type || "shares"}
              onChange={(e) => setInvestmentFormData({ ...investmentFormData, type: (e.target as HTMLSelectElement).value as InvestmentType })}
              class="input-field text-sm"
            >
              {Object.entries(INVESTMENT_TYPE_INFO).map(([type, info]) => (
                <option key={type} value={type}>
                  {info.icon} {info.label}
                </option>
              ))}
            </select>
            <p class="text-xs text-gray-500 mt-1">
              {INVESTMENT_TYPE_INFO[investmentFormData.type || "shares"].description}
            </p>
          </div>

          {(investmentFormData.type === "shares" || investmentFormData.type === "etf" || investmentFormData.type === "crypto") && (
            <div class="mb-3 p-3 bg-white rounded border border-gray-200">
              <p class="text-xs font-medium text-gray-700 mb-2">
                📊 Ticker Information (For price tracking)
              </p>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-gray-600 mb-1">
                    Ticker Symbol {investmentFormData.type === "crypto" ? "(e.g., BTC, ETH)" : "(e.g., CBA, VAS)"}
                  </label>
                  <input
                    type="text"
                    value={investmentFormData.tickerSymbol || ""}
                    onInput={(e) => setInvestmentFormData({ ...investmentFormData, tickerSymbol: (e.target as HTMLInputElement).value.toUpperCase() })}
                    class="input-field text-sm uppercase"
                    placeholder={investmentFormData.type === "crypto" ? "BTC" : "CBA"}
                  />
                </div>
                <div>
                  <label class="block text-xs text-gray-600 mb-1">
                    Exchange {investmentFormData.type === "crypto" ? "(optional)" : "(e.g., ASX, NYSE)"}
                  </label>
                  <input
                    type="text"
                    value={investmentFormData.exchange || ""}
                    onInput={(e) => setInvestmentFormData({ ...investmentFormData, exchange: (e.target as HTMLInputElement).value.toUpperCase() })}
                    class="input-field text-sm uppercase"
                    placeholder={investmentFormData.type === "crypto" ? "" : "ASX"}
                  />
                </div>
              </div>
            </div>
          )}

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Current Value ($) *</label>
              <input
                type="number"
                value={investmentFormData.currentValue ?? ""}
                onInput={(e) => setInvestmentFormData({ ...investmentFormData, currentValue: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                class="input-field text-sm"
                step="100"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-700 mb-1">Return Rate (%) *</label>
              <input
                type="number"
                value={investmentFormData.returnRate ?? ""}
                onInput={(e) => setInvestmentFormData({ ...investmentFormData, returnRate: parseFloat((e.target as HTMLInputElement).value) || 0 })}
                class="input-field text-sm"
                step="0.1"
              />
            </div>
          </div>

          <div class="mb-3 p-3 bg-white rounded border border-gray-200">
            <p class="text-xs font-medium text-gray-700 mb-2">Regular Contributions (Optional)</p>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-gray-600 mb-1">Amount ($)</label>
                <input
                  type="number"
                  value={investmentFormData.contributionAmount ?? ""}
                  onInput={(e) => setInvestmentFormData({ ...investmentFormData, contributionAmount: (e.target as HTMLInputElement).value ? parseFloat((e.target as HTMLInputElement).value) : undefined })}
                  class="input-field text-sm"
                  placeholder="0"
                  step="10"
                />
              </div>
              <div>
                <label class="block text-xs text-gray-600 mb-1">Frequency</label>
                <select
                  value={investmentFormData.contributionFrequency || "monthly"}
                  onChange={(e) => setInvestmentFormData({ ...investmentFormData, contributionFrequency: (e.target as HTMLSelectElement).value as any })}
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
            <label class="block text-xs font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea
              value={investmentFormData.notes || ""}
              onInput={(e) => setInvestmentFormData({ ...investmentFormData, notes: (e.target as HTMLTextAreaElement).value })}
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
          {investments.length > 0 ? (
            <div class="space-y-4">
              {investments.map((investment) => {
                const metrics = calculateInvestmentMetrics(investment);
                const isExpanded = expandedInvestmentId === investment.id;
                const purchases = investment.purchases || [];

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
                                  {investment.exchange && `:${investment.exchange}`}
                                </span>
                              )}
                            </div>
                            <div class="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <span>
                                Value: <span class="font-medium text-gray-800">${metrics.currentValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </span>
                              <span>
                                Return: <span class="font-medium text-gray-800">{investment.returnRate}%</span>
                              </span>
                              {metrics.totalUnits > 0 && (
                                <>
                                  <span>
                                    Units: <span class="font-medium text-gray-800">{metrics.totalUnits.toLocaleString()}</span>
                                  </span>
                                  <span class={metrics.gainLoss >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                    {metrics.gainLoss >= 0 ? '↑' : '↓'} ${Math.abs(metrics.gainLoss).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({metrics.gainLossPercent.toFixed(2)}%)
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div class="flex items-center gap-2 ml-4">
                          {metrics.totalUnits > 0 && (
                            <button
                              onClick={() => updateCurrentPrice(investment.id)}
                              class="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-700 hover:bg-green-100 rounded transition-colors"
                              title="Update current price"
                            >
                              💲 Set Price
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedInvestmentId(isExpanded ? null : investment.id)}
                            class="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                          >
                            {isExpanded ? "▼ Hide" : "▶ Details"}
                          </button>
                          <label class="flex items-center cursor-pointer" title={investment.enabled ? "Enabled" : "Disabled"}>
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
                          <h5 class="text-sm font-semibold text-gray-700 mb-2">Investment Details</h5>
                          <div class="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <p class="text-gray-600">Total Cost Basis</p>
                              <p class="font-medium">${metrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p class="text-gray-600">Avg Cost per Unit</p>
                              <p class="font-medium">${metrics.avgCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div>
                              <p class="text-gray-600">Current Price</p>
                              <p class="font-medium">
                                {investment.currentPrice 
                                  ? `$${investment.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : "Not set"}
                              </p>
                            </div>
                          </div>
                          {investment.lastPriceFetch && (
                            <p class="text-xs text-gray-500 mt-2">
                              Last updated: {new Date(investment.lastPriceFetch).toLocaleString()}
                            </p>
                          )}
                        </div>

                        {/* Purchase History */}
                        <div class="mb-4">
                          <div class="flex items-center justify-between mb-2">
                            <h5 class="text-sm font-semibold text-gray-700">Purchase History</h5>
                            {isAddingPurchase !== investment.id && (
                              <div class="flex gap-2">
                                {metrics.totalUnits > 0 && (
                                  <button
                                    onClick={() => startSellUnits(investment.id)}
                                    class="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                                  >
                                    💰 Sell Units
                                  </button>
                                )}
                                <button
                                  onClick={() => startAddPurchase(investment.id)}
                                  class="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  + Add Purchase
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Add/Edit Purchase Form */}
                          {isAddingPurchase === investment.id && (
                            <div class="mb-3 p-3 bg-green-50 border border-green-200 rounded">
                              <h6 class="text-xs font-semibold text-gray-700 mb-2">
                                {editingPurchaseId ? "Edit Purchase" : "New Purchase"}
                              </h6>
                              <div class="grid grid-cols-3 gap-2 mb-2">
                                <div>
                                  <label class="block text-xs text-gray-600 mb-1">Date</label>
                                  <input
                                    type="date"
                                    value={purchaseFormData.date || ""}
                                    onInput={(e) => setPurchaseFormData({ ...purchaseFormData, date: (e.target as HTMLInputElement).value })}
                                    class="input-field text-xs"
                                  />
                                </div>
                                <div>
                                  <label class="block text-xs text-gray-600 mb-1">Units *</label>
                                  <input
                                    type="number"
                                    value={purchaseFormData.units ?? ""}
                                    onInput={(e) => {
                                      const units = parseFloat((e.target as HTMLInputElement).value) || 0;
                                      const pricePerUnit = purchaseFormData.pricePerUnit || 0;
                                      const fees = purchaseFormData.fees || 0;
                                      setPurchaseFormData({ 
                                        ...purchaseFormData, 
                                        units,
                                        totalCost: units * pricePerUnit + fees
                                      });
                                    }}
                                    class="input-field text-xs"
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <label class="block text-xs text-gray-600 mb-1">Price per Unit *</label>
                                  <input
                                    type="number"
                                    value={purchaseFormData.pricePerUnit ?? ""}
                                    onInput={(e) => {
                                      const pricePerUnit = parseFloat((e.target as HTMLInputElement).value) || 0;
                                      const units = purchaseFormData.units || 0;
                                      const fees = purchaseFormData.fees || 0;
                                      setPurchaseFormData({ 
                                        ...purchaseFormData, 
                                        pricePerUnit,
                                        totalCost: units * pricePerUnit + fees
                                      });
                                    }}
                                    class="input-field text-xs"
                                    step="0.01"
                                  />
                                </div>
                              </div>
                              <div class="grid grid-cols-3 gap-2 mb-2">
                                <div>
                                  <label class="block text-xs text-gray-600 mb-1">Fees/Brokerage</label>
                                  <input
                                    type="number"
                                    value={purchaseFormData.fees ?? ""}
                                    onInput={(e) => {
                                      const fees = parseFloat((e.target as HTMLInputElement).value) || 0;
                                      const units = purchaseFormData.units || 0;
                                      const pricePerUnit = purchaseFormData.pricePerUnit || 0;
                                      setPurchaseFormData({ 
                                        ...purchaseFormData, 
                                        fees,
                                        totalCost: units * pricePerUnit + fees
                                      });
                                    }}
                                    class="input-field text-xs"
                                    step="0.01"
                                  />
                                </div>
                                <div>
                                  <label class="block text-xs text-gray-600 mb-1">Total Cost</label>
                                  <input
                                    type="number"
                                    value={purchaseFormData.totalCost ?? ""}
                                    readOnly
                                    class="input-field text-xs bg-gray-100"
                                  />
                                </div>
                                <div class="col-span-1">
                                  <label class="block text-xs text-gray-600 mb-1">Notes</label>
                                  <input
                                    type="text"
                                    value={purchaseFormData.notes || ""}
                                    onInput={(e) => setPurchaseFormData({ ...purchaseFormData, notes: (e.target as HTMLInputElement).value })}
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
                                  {editingPurchaseId ? "Update Purchase" : "Save Purchase"}
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

                          {/* Purchase List */}
                          {purchases.length > 0 ? (
                            <div class="space-y-2">
                              {purchases.map((purchase) => (
                                <div key={purchase.id} class="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                  <div class="flex-1 grid grid-cols-5 gap-2">
                                    <div>
                                      <p class="text-gray-600">Date</p>
                                      <p class="font-medium">{new Date(purchase.date).toLocaleDateString()}</p>
                                    </div>
                                    <div>
                                      <p class="text-gray-600">Units</p>
                                      <p class="font-medium">{purchase.units.toLocaleString()}</p>
                                    </div>
                                    <div>
                                      <p class="text-gray-600">Price/Unit</p>
                                      <p class="font-medium">${purchase.pricePerUnit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                    <div>
                                      <p class="text-gray-600">Total Cost</p>
                                      <p class="font-medium">${purchase.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                    <div>
                                      <p class="text-gray-600">Notes</p>
                                      <p class="font-medium">{purchase.notes || "-"}</p>
                                    </div>
                                  </div>
                                  <div class="flex gap-1 ml-2">
                                    <button
                                      onClick={() => startEditPurchase(investment.id, purchase)}
                                      class="px-2 py-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded"
                                      title="Edit purchase"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      onClick={() => removePurchase(investment.id, purchase.id)}
                                      class="px-2 py-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded"
                                      title="Delete purchase"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p class="text-xs text-gray-500 text-center py-3">No purchases recorded yet</p>
                          )}
                        </div>

                        {investment.notes && (
                          <div class="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                            <p class="text-xs text-gray-700"><strong>Notes:</strong> {investment.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div class="text-center py-12 text-gray-500">
              <svg class="w-20 h-20 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <p class="text-base font-medium">No investments yet</p>
              <p class="text-sm mt-1">Click "Add Investment" or use templates to get started</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
