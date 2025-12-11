/**
 * FinancialTimelineTables - Component for rendering different views of financial timeline data
 */

import type { FinancialState, TransitionPoint } from "../types/financial.ts";
import type { Milestone } from "../types/milestones.ts";
import { formatCurrency } from "../lib/result_utils.ts";

interface TableProps {
  states: Array<FinancialState & {
    periodTaxPaid?: number;
    periodExpenses?: number;
    periodInterestSaved?: number;
    periodDeductibleInterest?: number;
    periodCashFlow?: number;
  }>;
  transitionPoints: TransitionPoint[];
  retirementDate?: Date;
  allStates: FinancialState[];
  milestones?: Milestone[];
}

function getEventInfo(
  state: FinancialState,
  index: number,
  states: FinancialState[],
  transitionPoints: TransitionPoint[],
  retirementDate: Date | undefined,
  allStates: FinancialState[],
  milestones: Milestone[] = []
) {
  const originalIndex = allStates.findIndex(s => s.date.getTime() === state.date.getTime());
  
  const isRetirementDate = retirementDate && 
    state.date.toDateString() === retirementDate.toDateString();
  
  const transitionAtThisState = transitionPoints.find(
    tp => tp.stateIndex === originalIndex
  );
  
  const isPreviousLoanBalance = index > 0 && states[index - 1].loanBalance > 0;
  const isLoanPayoff = isPreviousLoanBalance && state.loanBalance === 0;

  // Check for milestones at this date
  const milestonesAtThisDate = milestones.filter(milestone => 
    milestone.date.toDateString() === state.date.toDateString()
  );
  
  const hasEvent = isRetirementDate || transitionAtThisState || isLoanPayoff || milestonesAtThisDate.length > 0;
  let rowClass = "";
  if (isRetirementDate) rowClass = "bg-green-50 border-l-4 border-green-500";
  else if (isLoanPayoff) rowClass = "bg-blue-50 border-l-4 border-blue-500";
  else if (transitionAtThisState) rowClass = "bg-purple-50 border-l-4 border-purple-500";
  else if (milestonesAtThisDate.length > 0) {
    // Use different colors based on milestone category
    const primaryMilestone = milestonesAtThisDate[0];
    switch (primaryMilestone.category) {
      case 'debt':
        rowClass = "bg-green-50 border-l-4 border-green-400";
        break;
      case 'retirement':
        rowClass = "bg-purple-50 border-l-4 border-purple-400";
        break;
      case 'transition':
        rowClass = "bg-yellow-50 border-l-4 border-yellow-400";
        break;
      case 'expense':
        rowClass = "bg-orange-50 border-l-4 border-orange-400";
        break;
      default:
        rowClass = "bg-gray-50 border-l-4 border-gray-400";
    }
  }
  
  return { isRetirementDate, isLoanPayoff, transitionAtThisState, milestonesAtThisDate, hasEvent, rowClass };
}

function DateCell({ state, eventInfo }: { state: FinancialState; eventInfo: ReturnType<typeof getEventInfo> }) {
  const getMilestoneIcon = (type: string) => {
    switch (type) {
      case 'loan_payoff': return '💳';
      case 'offset_completion': return '🏦';
      case 'retirement_eligibility': return '🏖️';
      case 'parameter_transition': return '📊';
      case 'expense_expiration': return '💸';
      default: return '📅';
    }
  };

  const getMilestoneColors = (category: string) => {
    switch (category) {
      case 'debt': return { bg: 'bg-green-100', text: 'text-green-700' };
      case 'investment': return { bg: 'bg-blue-100', text: 'text-blue-700' };
      case 'retirement': return { bg: 'bg-purple-100', text: 'text-purple-700' };
      case 'transition': return { bg: 'bg-yellow-100', text: 'text-yellow-700' };
      case 'expense': return { bg: 'bg-orange-100', text: 'text-orange-700' };
      default: return { bg: 'bg-gray-100', text: 'text-gray-700' };
    }
  };

  return (
    <td class="text-gray-900 font-medium">
      <div class={eventInfo.hasEvent ? "font-bold" : ""}>{state.date.toLocaleDateString()}</div>
      {eventInfo.isRetirementDate && (
        <div class="text-xs font-bold text-green-700 mt-1 flex items-center bg-green-100 px-2 py-1 rounded">
          <span class="mr-1">🎉</span>
          Retirement Date
        </div>
      )}
      {eventInfo.isLoanPayoff && (
        <div class="text-xs font-bold text-blue-700 mt-1 flex items-center bg-blue-100 px-2 py-1 rounded">
          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          Loan Paid Off
        </div>
      )}
      {eventInfo.transitionAtThisState && (
        <div class="text-xs font-bold text-purple-700 mt-1 flex items-center bg-purple-100 px-2 py-1 rounded">
          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
          {eventInfo.transitionAtThisState.transition.label || "Transition"}
        </div>
      )}
      {eventInfo.milestonesAtThisDate && eventInfo.milestonesAtThisDate.map((milestone) => {
        const colors = getMilestoneColors(milestone.category);
        return (
          <div key={milestone.id} class={`text-xs font-bold mt-1 flex items-center px-2 py-1 rounded ${colors.bg} ${colors.text}`}>
            <span class="mr-1">{getMilestoneIcon(milestone.type)}</span>
            {milestone.title}
          </div>
        );
      })}
    </td>
  );
}

export function SummaryTable({ states, transitionPoints, retirementDate, allStates, milestones = [] }: TableProps) {
  const finalState = states[states.length - 1];
  const finalCashAvailable = (finalState?.cash || 0) + (finalState?.offsetBalance || 0);
  
  return (
    <div class="overflow-x-auto rounded-lg border border-gray-200 max-h-[600px] overflow-y-auto">
      <table class="data-table">
        <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
          <tr>
            <th class="sticky-header">
              <div>Date</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                Final: {finalState?.date.toLocaleDateString()}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Net Worth</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency(finalState?.netWorth || 0)}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Cash Available</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency(finalCashAvailable)}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Total Assets</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency((finalState?.investments || 0) + (finalState?.superannuation || 0))}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Total Debt</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency(finalState?.loanBalance || 0)}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {states.map((state, index) => {
            const eventInfo = getEventInfo(state, index, states, transitionPoints, retirementDate, allStates, milestones);
            const totalAssets = state.investments + state.superannuation;
            const cashAvailable = state.cash + state.offsetBalance;
            
            return (
              <tr key={index} class={eventInfo.rowClass}>
                <DateCell state={state} eventInfo={eventInfo} />
                <td class={`text-right font-semibold ${state.netWorth < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(state.netWorth)}
                </td>
                <td 
                  class={`text-right ${cashAvailable < 0 ? "text-red-600 font-semibold" : "text-gray-900"}`}
                  title={`Cash: ${formatCurrency(state.cash)}\nOffset: ${formatCurrency(state.offsetBalance)}`}
                >
                  {formatCurrency(cashAvailable)}
                </td>
                <td class="text-gray-900 text-right">
                  {formatCurrency(totalAssets)}
                </td>
                <td class="text-gray-900 text-right">
                  {formatCurrency(state.loanBalance)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function LoansTable({ states, transitionPoints, retirementDate, allStates, milestones = [] }: TableProps) {
  const finalState = states[states.length - 1];
  const filteredInterestSaved = states.reduce((sum, state) => sum + (state.periodInterestSaved || 0), 0);
  
  return (
    <div class="overflow-x-auto rounded-lg border border-gray-200 max-h-[600px] overflow-y-auto">
      <table class="data-table">
        <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
          <tr>
            <th class="sticky-header">
              <div>Date</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                Final: {finalState?.date.toLocaleDateString()}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Loan Balance</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency(finalState?.loanBalance || 0)}
              </div>
            </th>
            <th class="text-right sticky-header bg-blue-50">
              <div class="text-blue-700">Offset Balance</div>
              <div class="text-xs font-normal text-blue-600 mt-1">
                {formatCurrency(finalState?.offsetBalance || 0)}
              </div>
            </th>
            <th class="text-right sticky-header bg-green-50">
              <div class="text-green-700">Interest Saved</div>
              <div class="text-xs font-normal text-green-600 mt-1">
                Total: {formatCurrency(filteredInterestSaved)}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Effective Debt</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency((finalState?.loanBalance || 0) - (finalState?.offsetBalance || 0))}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {states.map((state, index) => {
            const eventInfo = getEventInfo(state, index, states, transitionPoints, retirementDate, allStates, milestones);
            const effectiveDebt = state.loanBalance - state.offsetBalance;
            
            return (
              <tr key={index} class={eventInfo.rowClass}>
                <DateCell state={state} eventInfo={eventInfo} />
                <td class="text-gray-900 text-right">
                  {formatCurrency(state.loanBalance)}
                </td>
                <td class="text-blue-700 text-right font-medium">
                  {formatCurrency(state.offsetBalance)}
                </td>
                <td class="text-green-700 text-right">
                  {formatCurrency(state.periodInterestSaved || 0)}
                </td>
                <td class={`text-right font-semibold ${effectiveDebt > 0 ? "text-gray-900" : "text-green-600"}`}>
                  {formatCurrency(effectiveDebt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function InvestmentsTable({ states, transitionPoints, retirementDate, allStates, milestones = [] }: TableProps) {
  const finalState = states[states.length - 1];
  const finalCashAvailable = (finalState?.cash || 0) + (finalState?.offsetBalance || 0);
  
  return (
    <div class="overflow-x-auto rounded-lg border border-gray-200 max-h-[600px] overflow-y-auto">
      <table class="data-table">
        <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
          <tr>
            <th class="sticky-header">
              <div>Date</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                Final: {finalState?.date.toLocaleDateString()}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Investments</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency(finalState?.investments || 0)}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Superannuation</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency(finalState?.superannuation || 0)}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Total Assets</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency((finalState?.investments || 0) + (finalState?.superannuation || 0))}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Cash Available</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency(finalCashAvailable)}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {states.map((state, index) => {
            const eventInfo = getEventInfo(state, index, states, transitionPoints, retirementDate, allStates, milestones);
            const totalAssets = state.investments + state.superannuation;
            const cashAvailable = state.cash + state.offsetBalance;
            
            return (
              <tr key={index} class={eventInfo.rowClass}>
                <DateCell state={state} eventInfo={eventInfo} />
                <td class="text-gray-900 text-right">
                  {formatCurrency(state.investments)}
                </td>
                <td class="text-gray-900 text-right">
                  {formatCurrency(state.superannuation)}
                </td>
                <td class="text-gray-900 text-right font-semibold">
                  {formatCurrency(totalAssets)}
                </td>
                <td 
                  class={`text-right ${cashAvailable < 0 ? "text-red-600 font-semibold" : "text-gray-900"}`}
                  title={`Cash: ${formatCurrency(state.cash)}\nOffset: ${formatCurrency(state.offsetBalance)}`}
                >
                  {formatCurrency(cashAvailable)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function TaxTable({ states, transitionPoints, retirementDate, allStates, milestones = [] }: TableProps) {
  const finalState = states[states.length - 1];
  const filteredTaxPaid = states.reduce((sum, state) => sum + (state.periodTaxPaid || 0), 0);
  const filteredDeductibleInterest = states.reduce((sum, state) => sum + (state.periodDeductibleInterest || 0), 0);
  
  return (
    <div class="overflow-x-auto rounded-lg border border-gray-200 max-h-[600px] overflow-y-auto">
      <table class="data-table">
        <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
          <tr>
            <th class="sticky-header">
              <div>Date</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                Final: {finalState?.date.toLocaleDateString()}
              </div>
            </th>
            <th class="text-right sticky-header bg-red-50">
              <div class="text-red-700">Tax Paid</div>
              <div class="text-xs font-normal text-red-600 mt-1">
                Total: {formatCurrency(filteredTaxPaid)}
              </div>
            </th>
            <th class="text-right sticky-header bg-blue-50">
              <div class="text-blue-700">Deductible Interest</div>
              <div class="text-xs font-normal text-blue-600 mt-1">
                Total: {formatCurrency(filteredDeductibleInterest)}
              </div>
            </th>
            <th class="text-right sticky-header bg-green-50">
              <div class="text-green-700">Tax Benefit</div>
              <div class="text-xs font-normal text-green-600 mt-1">
                Estimated savings from deductions
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {states.map((state, index) => {
            const eventInfo = getEventInfo(state, index, states, transitionPoints, retirementDate, allStates, milestones);
            // Rough estimate: tax benefit is deductible interest * marginal tax rate (assume ~30%)
            const estimatedTaxBenefit = (state.periodDeductibleInterest || 0) * 0.3;
            
            return (
              <tr key={index} class={eventInfo.rowClass}>
                <DateCell state={state} eventInfo={eventInfo} />
                <td class="text-red-700 text-right font-medium">
                  {formatCurrency(state.periodTaxPaid || 0)}
                </td>
                <td class="text-blue-700 text-right">
                  {formatCurrency(state.periodDeductibleInterest || 0)}
                </td>
                <td class="text-green-700 text-right">
                  {formatCurrency(estimatedTaxBenefit)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function CashFlowTable({ states, transitionPoints, retirementDate, allStates, milestones = [] }: TableProps) {
  const finalState = states[states.length - 1];
  const filteredExpenses = states.reduce((sum, state) => sum + (state.periodExpenses || 0), 0);
  const filteredCashFlow = states.reduce((sum, state) => sum + (state.periodCashFlow || 0), 0);
  const finalCashAvailable = (finalState?.cash || 0) + (finalState?.offsetBalance || 0);
  
  return (
    <div class="overflow-x-auto rounded-lg border border-gray-200 max-h-[600px] overflow-y-auto">
      <table class="data-table">
        <thead class="sticky top-0 z-10 bg-gray-50 shadow-sm">
          <tr>
            <th class="sticky-header">
              <div>Date</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                Final: {finalState?.date.toLocaleDateString()}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Cash Flow</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                Total: {formatCurrency(filteredCashFlow)}
              </div>
            </th>
            <th class="text-right sticky-header bg-orange-50">
              <div class="text-orange-700">Expenses</div>
              <div class="text-xs font-normal text-orange-600 mt-1">
                Total: {formatCurrency(filteredExpenses)}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Cash Available</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency(finalCashAvailable)}
              </div>
            </th>
            <th class="text-right sticky-header bg-gray-50">
              <div>Net Worth</div>
              <div class="text-xs font-normal text-gray-500 mt-1">
                {formatCurrency(finalState?.netWorth || 0)}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {states.map((state, index) => {
            const eventInfo = getEventInfo(state, index, states, transitionPoints, retirementDate, allStates, milestones);
            const cashAvailable = state.cash + state.offsetBalance;
            
            return (
              <tr key={index} class={eventInfo.rowClass}>
                <DateCell state={state} eventInfo={eventInfo} />
                <td class={`text-right font-medium ${(state.periodCashFlow || 0) < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(state.periodCashFlow || 0)}
                </td>
                <td class="text-orange-700 text-right">
                  {formatCurrency(state.periodExpenses || 0)}
                </td>
                <td 
                  class={`text-right ${cashAvailable < 0 ? "text-red-600 font-semibold" : "text-gray-900"}`}
                  title={`Cash: ${formatCurrency(state.cash)}\nOffset: ${formatCurrency(state.offsetBalance)}`}
                >
                  {formatCurrency(cashAvailable)}
                </td>
                <td class={`text-right font-semibold ${state.netWorth < 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(state.netWorth)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}