/**
 * Simulation Engine Core
 * Orchestrates financial calculations over time
 * Validates: Requirements 2.1, 2.2, 7.1, 7.2
 */

import type {
  ComparisonSimulationResult,
  EnhancedSimulationResult,
  FinancialState,
  IncomeSource,
  SimulationConfiguration,
  SimulationResult,
  SuperAccount,
  TimeInterval,
  TransitionPoint,
  UserParameters,
} from "../types/financial.ts";
import {
  ExpenseProcessor,
  IncomeProcessor,
  InvestmentProcessor,
  InvestmentTaxProcessor,
  LoanProcessor,
  peopleHaveIncomeSources,
  peopleHaveSuperAccounts,
  RetirementCalculator,
} from "./processors.ts";
import { formatCurrency, generateWarnings } from "./result_utils.ts";
import {
  buildParameterPeriods,
  resolveParametersForDate,
} from "./transition_manager.ts";
import { detectMilestonesFromSimulation } from "./milestone_detector.ts";
import {
  EventCollector,
  SimulationEventType,
  SimulationPhase,
} from "./simulation_events.ts";
import { resolveHousePurchaseEffects } from "./property_resolver.ts";
import {
  evaluateRetirementAccountWithdrawal,
  getCountryModule,
} from "./tax_modules/index.ts";

/**
 * Converts a time interval to number of periods per year
 */
function intervalToPeriodsPerYear(interval: TimeInterval): number {
  switch (interval) {
    case "week":
      return 52;
    case "month":
      return 12;
    case "year":
      return 1;
    case "fortnight":
      return 26;
    default:
      return 12; // Default to monthly
  }
}

/**
 * Converts an annual rate to an interval-specific rate
 * Uses the formula: intervalRate = (1 + annualRate) ^ (interval / year) - 1
 */
export function convertAnnualRateToInterval(
  annualRate: number,
  interval: TimeInterval,
): number {
  const periodsPerYear = intervalToPeriodsPerYear(interval);
  return Math.pow(1 + annualRate, 1 / periodsPerYear) - 1;
}

/**
 * Converts a payment frequency to an interval-specific payment amount
 */
function convertPaymentToInterval(
  paymentAmount: number,
  paymentFrequency: "weekly" | "fortnightly" | "monthly" | "yearly",
  targetInterval: TimeInterval,
): number {
  // First convert payment to annual
  let annualPayment: number;
  switch (paymentFrequency) {
    case "weekly":
      annualPayment = paymentAmount * 52;
      break;
    case "fortnightly":
      annualPayment = paymentAmount * 26;
      break;
    case "monthly":
      annualPayment = paymentAmount * 12;
      break;
    case "yearly":
      annualPayment = paymentAmount;
      break;
    default:
      annualPayment = paymentAmount * 12; // Default to monthly
  }

  // Then convert annual to target interval
  const periodsPerYear = intervalToPeriodsPerYear(targetInterval);
  return annualPayment / periodsPerYear;
}

/**
 * Advances a date by one interval
 */
function advanceDate(date: Date, interval: TimeInterval): Date {
  const newDate = new Date(date);
  switch (interval) {
    case "week":
      newDate.setDate(newDate.getDate() + 7);
      break;
    case "fortnight":
      newDate.setDate(newDate.getDate() + 14);
      break;
    case "month":
      newDate.setMonth(newDate.getMonth() + 1);
      break;
    case "year":
      newDate.setFullYear(newDate.getFullYear() + 1);
      break;
  }
  return newDate;
}

/**
 * Simulation Engine
 * Core engine that runs financial simulations over time
 */
export const SimulationEngine = {
  /**
   * Runs a complete simulation from start date to end date
   * Validates: Requirements 2.1, 2.2
   */
  runSimulation(params: UserParameters): SimulationResult {
    params = resolveHousePurchaseEffects(params);
    const interval: TimeInterval = "month"; // Default to monthly intervals
    const states: FinancialState[] = [];
    const warnings: string[] = [];
    const eventCollector = new EventCollector();

    // Initialize starting state
    // If loans array exists (even if empty), use it; otherwise fall back to legacy.
    // A loan with a startDate after the simulation start (e.g. a house-purchase
    // mortgage that doesn't exist yet) contributes 0 until it activates.
    const initialLoanBalance = params.loans !== undefined
      ? (params.loans.length > 0
        ? params.loans.reduce(
          (sum, loan) => sum + this.loanInitialBalance(loan, params.startDate),
          0,
        )
        : 0)
      : params.loanPrincipal;

    const initialLoanBalances =
      params.loans !== undefined && params.loans.length > 0
        ? params.loans.reduce(
          (acc, loan) => ({
            ...acc,
            [loan.id]: this.loanInitialBalance(loan, params.startDate),
          }),
          {} as { [loanId: string]: number },
        )
        : undefined;

    // Collect all super accounts from all people, or top-level superAccounts
    const allSuperAccounts: SuperAccount[] = [];

    if (peopleHaveSuperAccounts(params)) {
      // Collect super accounts from all people - backfilling personId from
      // the owning person when the account itself doesn't have one set, so
      // contribution attribution below always has an owner to check against.
      for (const person of params.people!) {
        allSuperAccounts.push(
          ...person.superAccounts.map((acc) => ({
            ...acc,
            personId: acc.personId ?? person.id,
          })),
        );
      }
    } else if (params.superAccounts && params.superAccounts.length > 0) {
      // Use top-level super accounts (legacy or single mode)
      allSuperAccounts.push(...params.superAccounts);
    }

    const initialSuperBalance = allSuperAccounts.length > 0
      ? allSuperAccounts.reduce((sum, superAcc) => sum + superAcc.balance, 0)
      : params.currentSuperBalance;

    const initialSuperBalances = allSuperAccounts.length > 0
      ? allSuperAccounts.reduce(
        (acc, superAcc) => ({ ...acc, [superAcc.id]: superAcc.balance }),
        {} as { [superId: string]: number },
      )
      : undefined;

    const initialOffsetBalance = params.loans !== undefined
      ? (params.loans.length > 0
        ? params.loans.reduce((sum, loan) => sum + (loan.offsetBalance || 0), 0)
        : 0)
      : (params.currentOffsetBalance || 0);

    const initialOffsetBalances = params.loans && params.loans.length > 0
      ? params.loans.reduce(
        (acc, loan) => ({ ...acc, [loan.id]: loan.offsetBalance || 0 }),
        {} as { [loanId: string]: number },
      )
      : undefined;

    // A house purchased before the simulation start (e.g. a primary home
    // already owned) needs its value credited from the very first state,
    // matching how its mortgage's principal is already seeded above via
    // loanInitialBalance - otherwise net worth understates by the full
    // house price until the first PROPERTY phase tick runs.
    const initialHouseValues = params.housePurchases &&
        params.housePurchases.length > 0
      ? params.housePurchases.reduce(
        (acc, house) => ({
          ...acc,
          [house.id]: house.purchaseDate <= params.startDate ? house.price : 0,
        }),
        {} as { [houseId: string]: number },
      )
      : undefined;
    const initialPropertyValue = initialHouseValues
      ? Object.values(initialHouseValues).reduce((sum, v) => sum + v, 0)
      : 0;

    let currentState: FinancialState = {
      date: new Date(params.startDate),
      cash: params.currentCashBalance ?? 0,
      investments: params.currentInvestmentBalance,
      superannuation: initialSuperBalance,
      loanBalance: initialLoanBalance,
      offsetBalance: initialOffsetBalance,
      netWorth: 0,
      cashFlow: 0,
      taxPaid: 0,
      expenses: 0,
      interestSaved: 0,
      deductibleInterest: 0,
      loanBalances: initialLoanBalances,
      superBalances: initialSuperBalances,
      offsetBalances: initialOffsetBalances,
      propertyValue: initialPropertyValue,
      houseValues: initialHouseValues,
    };

    // Calculate initial net worth
    currentState.netWorth = currentState.cash + currentState.investments +
      currentState.superannuation + currentState.offsetBalance +
      currentState.propertyValue - currentState.loanBalance;

    states.push(currentState);

    // Calculate end date
    const endDate = new Date(params.startDate);
    endDate.setFullYear(endDate.getFullYear() + params.simulationYears);

    // Run simulation for each time interval
    let currentDate = new Date(params.startDate);
    while (currentDate < endDate) {
      currentDate = advanceDate(currentDate, interval);
      currentState = this.calculateTimeStep(
        currentState,
        params,
        interval,
        eventCollector,
      );
      currentState.date = new Date(currentDate);
      states.push(currentState);
    }

    // Find retirement date
    const retirement = RetirementCalculator.findRetirementDate(
      states,
      params.desiredAnnualRetirementIncome,
      params.currentAge,
      params.retirementAge,
      params.preservationAge ??
        getCountryModule(params.country).retirementAccessRule.accessAge,
    );

    // Generate warnings and alerts for unsustainable scenarios
    const financialWarnings = generateWarnings(states, retirement.date);
    const warningMessages = financialWarnings.map((w) => w.message);

    // Add warning if retirement is not achievable at desired age
    if (retirement.date === null) {
      const yearsSimulated = params.simulationYears;
      const finalAge = params.currentAge + yearsSimulated;
      warningMessages.push(
        `⚠️ RETIREMENT NOT ACHIEVABLE: You want to retire at age ${params.retirementAge}, but your assets will not support ${
          formatCurrency(params.desiredAnnualRetirementIncome)
        }/year income at that age. ` +
          `Even by age ${Math.floor(finalAge)}, you won't have enough saved. ` +
          `To retire at ${params.retirementAge}, you need to: save more aggressively, reduce expenses, lower your retirement income target, or work longer.`,
      );
    } else if (retirement.age && retirement.age > params.retirementAge + 1) {
      // Retirement is achievable but much later than desired
      warningMessages.push(
        `⚠️ DELAYED RETIREMENT: You want to retire at age ${params.retirementAge}, but you won't have enough assets until age ${
          Math.floor(retirement.age)
        }. ` +
          `That's ${
            Math.floor(retirement.age - params.retirementAge)
          } years later than planned. ` +
          `To retire earlier, consider: increasing savings, reducing expenses, or lowering your retirement income target from ${
            formatCurrency(params.desiredAnnualRetirementIncome)
          }/year.`,
      );
    }

    // Check sustainability (basic check)
    const isSustainable = this.checkSustainability(
      states,
      warnings,
      retirement.date,
    );

    // Detect milestones from simulation results
    const milestoneResult = detectMilestonesFromSimulation(states, params);

    // Add milestone detection warnings to simulation warnings
    const allWarnings = [
      ...warnings,
      ...warningMessages,
      ...milestoneResult.warnings,
    ];

    return {
      states,
      retirementDate: retirement.date,
      retirementAge: retirement.age,
      isSustainable,
      warnings: allWarnings,
      milestones: milestoneResult.milestones,
      events: eventCollector.getAll(),
    };
  },

  /**
   * Starting balance for a loan as of the simulation start date - 0 if the
   * loan has a startDate that hasn't been reached yet (e.g. a house-purchase
   * mortgage that doesn't exist until settlement), otherwise its principal.
   */
  loanInitialBalance(
    loan: { principal: number; startDate?: Date },
    simulationStartDate: Date,
  ): number {
    if (loan.startDate && loan.startDate > simulationStartDate) {
      return 0;
    }
    return loan.principal;
  },

  /**
   * Calculates financial state for a single time step
   * Orchestrates all processors in the correct sequence
   * Validates: Requirements 2.2, 7.1, 7.2
   *
   * Sequence:
   * 1. Income Phase: Add salary income and deduct tax
   * 2. Expense Phase: Deduct living expenses and rent/mortgage
   * 2b. Retirement Phase: Withdraw retirement income from investments if retired
   * 3. Loan Phase: Process loan payment (interest + principal) with offset account
   * 4. Investment Phase: Add contributions and apply growth
   * 5. Super Phase: Add contributions and apply growth
   * 6. Offset Phase: Move leftover cash to offset account
   * 6b. Deficit Resolution: Sell assets if cash is negative (Pre-retirement or shortfall)
   * 7. State Update: Calculate net worth and cash flow
   */
  calculateTimeStep(
    currentState: FinancialState,
    params: UserParameters,
    interval: TimeInterval,
    eventCollector: EventCollector,
  ): FinancialState {
    // Start with current state values
    let cash = currentState.cash;
    let investments = currentState.investments;
    let superannuation = currentState.superannuation;
    let loanBalance = currentState.loanBalance;
    let offsetBalance = currentState.offsetBalance;
    let taxPaid = 0;
    let interestSaved = 0;
    let deductibleInterest = 0;
    let netIncome = 0;

    // Investment cost-basis tracking (for realized capital gains on sales)
    // and per-holding balances, kept live through the whole step so a
    // withdrawal earlier in the period (Phase 2b/6b) is reflected by the
    // growth phase (Phase 4) later in the same period, rather than being
    // silently overwritten. Cost basis defaults to the opening balance
    // (assumes zero unrealized gain at the point tracking starts) since the
    // engine has no earlier record of what was actually paid for it.
    let investmentBalances: { [holdingId: string]: number } =
      params.investmentHoldings && params.investmentHoldings.length > 0
        ? params.investmentHoldings.reduce(
          (acc, h) => ({
            ...acc,
            [h.id]: currentState.investmentBalances?.[h.id] ?? h.currentValue,
          }),
          {} as { [holdingId: string]: number },
        )
        : {};
    let investmentCostBases: { [holdingId: string]: number } =
      params.investmentHoldings && params.investmentHoldings.length > 0
        ? params.investmentHoldings.reduce(
          (acc, h) => ({
            ...acc,
            [h.id]: currentState.investmentCostBases?.[h.id] ??
              (currentState.investmentBalances?.[h.id] ?? h.currentValue),
          }),
          {} as { [holdingId: string]: number },
        )
        : {};
    let investmentCostBasis = currentState.investmentCostBasis ??
      params.currentInvestmentBalance;

    // Accumulates this period's dividend income and realized capital gains
    // (from retirement-income/deficit withdrawals), and any taxable
    // retirement-account withdrawal amount (US 401k/IRA), for the tax phase.
    let dividendIncome = 0;
    let shortTermGain = 0;
    let longTermGain = 0;
    let taxableRetirementWithdrawal = 0;

    // Phase 1: Income - Add salary income (tax will be calculated later after we know deductible interest)
    eventCollector.emit({
      type: SimulationEventType.PHASE_START,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.INCOME,
      description: `Starting income phase`,
      data: { phase: SimulationPhase.INCOME },
    });

    // Calculate current age and retirement status
    const yearsElapsed =
      (currentState.date.getTime() - params.startDate.getTime()) /
      (1000 * 60 * 60 * 24 * 365.25);

    // Handle one or more people with explicit income sources
    let grossIncome = 0;
    let anyPersonStillWorking = false;

    if (peopleHaveIncomeSources(params)) {
      // One or more people - check each person's retirement status
      for (const person of params.people!) {
        const personCurrentAge = person.currentAge + yearsElapsed;
        if (personCurrentAge < person.retirementAge) {
          anyPersonStillWorking = true;
          // Calculate income for this person's income sources
          for (const incomeSource of person.incomeSources) {
            if (this.isIncomeSourceActive(incomeSource, currentState.date)) {
              const personIncome = this.calculateIncomeSourceAmount(
                incomeSource,
                interval,
              );
              grossIncome += personIncome;
            }
          }
        }
      }
    } else {
      // Legacy mode - top-level incomeSources or annualSalary
      const currentAge = params.currentAge + yearsElapsed;
      if (currentAge < params.retirementAge) {
        anyPersonStillWorking = true;
        grossIncome = IncomeProcessor.calculateIncome(
          params,
          interval,
          currentState.date,
        );
      }
    }

    cash += grossIncome;

    eventCollector.emit({
      type: SimulationEventType.PHASE_END,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.INCOME,
      description: `Completed income phase`,
      data: { phase: SimulationPhase.INCOME },
    });

    // Phase 2: Expenses - Deduct living expenses only
    eventCollector.emit({
      type: SimulationEventType.PHASE_START,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.EXPENSES,
      description: `Starting expenses phase`,
      data: { phase: SimulationPhase.EXPENSES },
    });

    // Note: Mortgage payments are handled in the loan phase
    const expenses = ExpenseProcessor.calculateExpenses(
      params,
      interval,
      currentState.date,
    );
    cash -= expenses;

    eventCollector.emit({
      type: SimulationEventType.PHASE_END,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.EXPENSES,
      description: `Completed expenses phase`,
      data: { phase: SimulationPhase.EXPENSES },
    });

    // Phase 2b: Retirement Income - Withdraw from investments if retired
    // Determine if we need retirement income (when no one is working)
    const needsRetirementIncome = !anyPersonStillWorking;

    // Emit phase start event
    eventCollector.emit({
      type: SimulationEventType.PHASE_START,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.RETIREMENT_INCOME,
      description: `Starting retirement income phase`,
      data: { phase: SimulationPhase.RETIREMENT_INCOME },
    });

    if (needsRetirementIncome) {
      const annualRetirementIncome = params.desiredAnnualRetirementIncome;
      const periodsPerYear = intervalToPeriodsPerYear(interval);
      const periodRetirementIncome = annualRetirementIncome / periodsPerYear;

      // First try to use cash if available
      if (cash >= periodRetirementIncome) {
        // We have enough cash - deduct the retirement income from cash
        cash -= periodRetirementIncome;

        eventCollector.emit({
          type: SimulationEventType.DECISION,
          timestamp: new Date(currentState.date),
          phase: SimulationPhase.RETIREMENT_INCOME,
          description: `Retirement income paid from cash`,
          data: {
            decision: "paid_from_cash",
            reason: `Cash was sufficient to cover retirement income of $${
              periodRetirementIncome.toFixed(2)
            }`,
            context: {
              cashBefore: cash + periodRetirementIncome,
              cashAfter: cash,
              periodRetirementIncome,
            },
          },
        });
      } else {
        // Need to withdraw from investments to fund retirement
        const shortfall = periodRetirementIncome - Math.max(0, cash);

        // Emit withdrawal strategy selection
        const ages = this.calculateCurrentAges(params, yearsElapsed);
        const retirementAccessRule = getCountryModule(params.country)
          .retirementAccessRule;
        const preservationAge = params.preservationAge ??
          retirementAccessRule.accessAge;
        const anyoneOverPreservationAge = ages.some((age) =>
          age >= preservationAge
        );
        const strategy = params.drawdownStrategy || "investments_first";

        eventCollector.emit({
          type: SimulationEventType.WITHDRAWAL_STRATEGY_SELECTED,
          timestamp: new Date(currentState.date),
          phase: SimulationPhase.RETIREMENT_INCOME,
          description: `Selected withdrawal strategy: ${strategy}`,
          data: {
            strategy,
            eligibleForSuper: anyoneOverPreservationAge,
            ages,
            preservationAge,
          },
        });

        // Enhanced withdrawal strategy
        const withdrawalResult = this.processRetirementWithdrawals(
          shortfall,
          investments,
          superannuation,
          params,
          yearsElapsed,
          currentState,
          investmentBalances,
          investmentCostBases,
          investmentCostBasis,
        );

        // Emit withdrawal event
        eventCollector.emit({
          type: SimulationEventType.RETIREMENT_WITHDRAWAL,
          timestamp: new Date(currentState.date),
          phase: SimulationPhase.RETIREMENT_INCOME,
          description: `Withdrew $${
            withdrawalResult.withdrawnAmount.toFixed(2)
          } for retirement income`,
          data: {
            shortfall,
            fromInvestments: investments - withdrawalResult.newInvestments,
            fromSuper: superannuation - withdrawalResult.newSuperannuation,
            totalWithdrawn: withdrawalResult.withdrawnAmount,
            remainingShortfall: shortfall - withdrawalResult.withdrawnAmount,
            reason: `Needed $${shortfall.toFixed(2)} for retirement income`,
          },
        });

        investments = withdrawalResult.newInvestments;
        superannuation = withdrawalResult.newSuperannuation;
        cash += withdrawalResult.withdrawnAmount;
        investmentBalances = withdrawalResult.newInvestmentBalances;
        investmentCostBases = withdrawalResult.newInvestmentCostBases;
        investmentCostBasis = withdrawalResult.newInvestmentCostBasis;
        shortTermGain += withdrawalResult.shortTermGain;
        longTermGain += withdrawalResult.longTermGain;
        taxableRetirementWithdrawal += withdrawalResult.taxableSuperWithdrawal;
      }
    } else {
      eventCollector.emit({
        type: SimulationEventType.DECISION,
        timestamp: new Date(currentState.date),
        phase: SimulationPhase.RETIREMENT_INCOME,
        description: `Still working - no retirement withdrawals needed`,
        data: {
          decision: "no_retirement_income_needed",
          reason: "At least one person is still working",
          context: { anyPersonStillWorking },
        },
      });
    }

    // Emit phase end event
    eventCollector.emit({
      type: SimulationEventType.PHASE_END,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.RETIREMENT_INCOME,
      description: `Completed retirement income phase`,
      data: { phase: SimulationPhase.RETIREMENT_INCOME },
    });

    // Phase 2c: Property - Apply any house purchases due this period, and
    // grow the value of houses already purchased. Runs before the loan phase
    // so a purchase's deposit/costs are already reflected in cash when that
    // period's (possibly newly-activated) mortgage payment is computed.
    eventCollector.emit({
      type: SimulationEventType.PHASE_START,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.PROPERTY,
      description: `Starting property phase`,
      data: { phase: SimulationPhase.PROPERTY },
    });

    let propertyValue = currentState.propertyValue;
    let houseValues: { [houseId: string]: number } = {
      ...currentState.houseValues,
    };

    if (params.housePurchases && params.housePurchases.length > 0) {
      const periodEnd = advanceDate(currentState.date, interval);

      for (const house of params.housePurchases) {
        const alreadyPurchased = houseValues[house.id] !== undefined &&
          houseValues[house.id] > 0;
        const purchasesThisPeriod = !alreadyPurchased &&
          house.purchaseDate > currentState.date &&
          house.purchaseDate <= periodEnd;

        if (purchasesThisPeriod) {
          const loanPrincipal = Math.max(0, house.price - house.depositAmount);
          cash -= house.depositAmount + house.buyingCosts;
          houseValues[house.id] = house.price;

          eventCollector.emit({
            type: SimulationEventType.HOUSE_PURCHASED,
            timestamp: new Date(currentState.date),
            phase: SimulationPhase.PROPERTY,
            description: `Purchased ${house.name} for $${
              house.price.toFixed(2)
            }`,
            data: {
              houseId: house.id,
              houseName: house.name,
              price: house.price,
              depositAmount: house.depositAmount,
              buyingCosts: house.buyingCosts,
              loanPrincipal,
            },
          });
        } else if (
          alreadyPurchased || house.purchaseDate <= currentState.date
        ) {
          // Already owned - grow the value for this period
          houseValues[house.id] = InvestmentProcessor.calculateInvestmentGrowth(
            houseValues[house.id] ?? house.price,
            0,
            house.appreciationRate / 100,
            interval,
          );
        }
      }

      propertyValue = Object.values(houseValues).reduce(
        (sum, value) => sum + value,
        0,
      );
    }

    eventCollector.emit({
      type: SimulationEventType.PHASE_END,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.PROPERTY,
      description: `Completed property phase`,
      data: { phase: SimulationPhase.PROPERTY },
    });

    // Requirements 7.1: Handle negative cash flow by reducing available cash
    // Cash can go negative, representing debt or overdraft

    // Phase 3: Loan - Process loan payments with offset account
    eventCollector.emit({
      type: SimulationEventType.PHASE_START,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.LOAN_PAYMENT,
      description: `Starting loan payment phase`,
      data: { phase: SimulationPhase.LOAN_PAYMENT },
    });

    // Track deductible interest for debt recycling loans
    // If loans array exists (even if empty), use it; otherwise use legacy single loan
    let loanBalances: { [loanId: string]: number } = {};
    let offsetBalances: { [loanId: string]: number } = {};
    let totalLoanPayment = 0;

    if (params.loans !== undefined && params.loans.length > 0) {
      // Multiple loans - process each loan with its own offset
      const loanPhasePeriodEnd = advanceDate(currentState.date, interval);

      for (const loan of params.loans) {
        // A loan with a startDate (e.g. a house-purchase mortgage) doesn't
        // exist yet if that date is still in the future - skip it entirely
        // and keep its balance at 0 until the period its startDate falls in.
        if (loan.startDate && loan.startDate > loanPhasePeriodEnd) {
          loanBalances[loan.id] = 0;
          offsetBalances[loan.id] = currentState.offsetBalances?.[loan.id] ??
            (loan.offsetBalance || 0);
          continue;
        }

        const activatesThisPeriod = loan.startDate &&
          loan.startDate > currentState.date &&
          loan.startDate <= loanPhasePeriodEnd;

        const loanPayment = convertPaymentToInterval(
          loan.paymentAmount,
          loan.paymentFrequency,
          interval,
        );
        totalLoanPayment += loanPayment;

        // Get current balance for this loan. A loan activating this period
        // seeds from its principal, ignoring any carried-forward 0 from
        // periods before it existed.
        const currentLoanBalance = activatesThisPeriod
          ? loan.principal
          : (currentState.loanBalances?.[loan.id] ?? loan.principal);

        // Get current offset balance for this loan
        const currentOffsetBalance = currentState.offsetBalances?.[loan.id] ??
          (loan.offsetBalance || 0);
        offsetBalances[loan.id] = currentOffsetBalance;

        if (currentLoanBalance > 0 && cash >= loanPayment) {
          const loanResult = LoanProcessor.calculateLoanPayment(
            currentLoanBalance,
            currentOffsetBalance,
            loan.interestRate / 100,
            loanPayment,
            interval,
            loan.hasOffset || false,
            loan.isDebtRecycling || false,
          );
          loanBalances[loan.id] = loanResult.newBalance;
          interestSaved += loanResult.interestSaved;
          deductibleInterest += loanResult.deductibleInterest;
          cash -= loanPayment;
        } else if (currentLoanBalance > 0) {
          // Partial payment scenario
          const partialPayment = Math.max(0, Math.min(cash, loanPayment));
          const loanResult = LoanProcessor.calculateLoanPayment(
            currentLoanBalance,
            currentOffsetBalance,
            loan.interestRate / 100,
            partialPayment,
            interval,
            loan.hasOffset || false,
            loan.isDebtRecycling || false,
          );
          loanBalances[loan.id] = loanResult.newBalance;
          interestSaved += loanResult.interestSaved;
          deductibleInterest += loanResult.deductibleInterest;
          cash -= partialPayment;
        } else {
          loanBalances[loan.id] = 0;
        }
      }

      // Calculate total loan balance for legacy field
      loanBalance = Object.values(loanBalances).reduce(
        (sum, bal) => sum + bal,
        0,
      );
      // Calculate total offset balance for legacy field
      offsetBalance = Object.values(offsetBalances).reduce(
        (sum, bal) => sum + bal,
        0,
      );
    } else if (params.loans === undefined) {
      // Legacy single loan (only if loans array doesn't exist)
      const loanPayment = convertPaymentToInterval(
        params.loanPaymentAmount,
        params.loanPaymentFrequency,
        interval,
      );
      totalLoanPayment = loanPayment;

      if (loanBalance > 0) {
        // Check if we have enough cash for loan payment
        if (cash >= loanPayment) {
          const loanResult = LoanProcessor.calculateLoanPayment(
            loanBalance,
            offsetBalance,
            params.loanInterestRate / 100, // Convert percentage to decimal
            loanPayment,
            interval,
            params.useOffsetAccount || false,
            false, // Legacy loans don't support debt recycling
          );
          loanBalance = loanResult.newBalance;
          interestSaved = loanResult.interestSaved;
          cash -= loanPayment;
        } else {
          // Negative cash flow scenario - can't make full loan payment
          // Requirements 7.1, 7.2: Handle negative cash flow
          // Pay what we can, but this creates an unsustainable situation
          const partialPayment = Math.max(0, cash);
          const loanResult = LoanProcessor.calculateLoanPayment(
            loanBalance,
            offsetBalance,
            params.loanInterestRate / 100,
            partialPayment,
            interval,
            params.useOffsetAccount || false,
            false, // Legacy loans don't support debt recycling
          );
          loanBalance = loanResult.newBalance;
          interestSaved = loanResult.interestSaved;
          cash = 0; // All cash used for partial loan payment
        }
      }
    } else {
      // loans array exists but is empty - no loans to process
      loanBalance = 0;
      offsetBalance = 0;
      totalLoanPayment = 0;
    }

    const periodsPerYear = intervalToPeriodsPerYear(interval);

    // Phase 3a: Dividend Income - cash distributions paid on the opening
    // investment balance (after any Phase 2b withdrawal), before growth is
    // applied. Runs before the tax phase so dividends are included in this
    // period's taxable income.
    if (params.investmentHoldings && params.investmentHoldings.length > 0) {
      for (const holding of params.investmentHoldings) {
        const holdingBalance = investmentBalances[holding.id] ??
          holding.currentValue;
        dividendIncome += InvestmentProcessor.calculateDividendIncome(
          holdingBalance,
          holding.dividendYieldRate,
          interval,
        );
      }
    } else {
      dividendIncome += InvestmentProcessor.calculateDividendIncome(
        investments,
        params.investmentDividendYieldRate,
        interval,
      );
    }
    cash += dividendIncome;

    // Now calculate tax with deductible interest deduction
    // Convert deductible interest to annual amount for tax calculation
    const annualDeductibleInterest = deductibleInterest * periodsPerYear;

    // Calculate taxable income (gross income minus deductible interest)
    const annualGrossIncome = IncomeProcessor.calculateTotalAnnualIncome(
      params,
      currentState.date,
    );
    const taxableIncome = Math.max(
      0,
      annualGrossIncome - annualDeductibleInterest,
    );

    // Calculate tax on taxable income
    const annualTax = IncomeProcessor.calculateAnnualTax(params, taxableIncome);
    const periodSalaryTax = annualTax / periodsPerYear;

    // Investment-related tax (dividends, realized capital gains from any
    // Phase 2b withdrawal above, and taxable retirement-account withdrawals
    // e.g. US 401k/IRA) stacks on top of ordinary taxable income at the
    // marginal rate, using the active country module's capital gains rule.
    const cgRule = getCountryModule(params.country).capitalGainsRule;
    const annualDividendIncome = dividendIncome * periodsPerYear;
    const annualShortTermGain = shortTermGain * periodsPerYear;
    const annualLongTermGain = longTermGain * periodsPerYear;
    const annualTaxableRetirementWithdrawal = taxableRetirementWithdrawal *
      periodsPerYear;
    const discountedLongTermGain = cgRule.longTermFlatRate > 0
      ? 0
      : annualLongTermGain * (1 - cgRule.longTermDiscount);
    const flatRateGains = cgRule.longTermFlatRate > 0 ? annualLongTermGain : 0;
    const additionalOrdinaryIncome = annualDividendIncome +
      annualShortTermGain + discountedLongTermGain +
      annualTaxableRetirementWithdrawal;
    const annualInvestmentTax = InvestmentTaxProcessor.calculateInvestmentTax(
      params,
      taxableIncome,
      additionalOrdinaryIncome,
      flatRateGains,
    );
    const periodInvestmentTax = annualInvestmentTax / periodsPerYear;

    taxPaid = periodSalaryTax + periodInvestmentTax;

    // Subtract tax from cash (we already added gross income/dividends earlier)
    cash -= taxPaid;
    netIncome = grossIncome - taxPaid;

    eventCollector.emit({
      type: SimulationEventType.PHASE_END,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.LOAN_PAYMENT,
      description: `Completed loan payment phase`,
      data: { phase: SimulationPhase.LOAN_PAYMENT },
    });

    // Phase 4: Investment - Add contributions and apply growth
    eventCollector.emit({
      type: SimulationEventType.PHASE_START,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.INVESTMENT,
      description: `Starting investment phase`,
      data: { phase: SimulationPhase.INVESTMENT },
    });

    // Investment growth/contributions build on investmentBalances /
    // investmentCostBasis(es) as they stand after any Phase 2b withdrawal
    // and the dividend phase above - not the prior period's stored state -
    // so a withdrawal earlier this period is actually reflected here.
    let actualInvestmentContribution = 0;

    // Only make investment contributions if someone is still working
    if (anyPersonStillWorking) {
      if (params.investmentHoldings && params.investmentHoldings.length > 0) {
        // Use individual holdings
        const investmentResult = InvestmentProcessor
          .calculateInvestmentHoldings(
            params,
            currentState.date,
            investmentBalances,
            interval,
            cash,
            investmentCostBases,
          );

        investments = investmentResult.totalBalance;
        investmentBalances = investmentResult.holdingBalances;
        investmentCostBases = investmentResult.holdingCostBases;
        actualInvestmentContribution = investmentResult.cashUsed;
        cash -= actualInvestmentContribution;
      } else {
        // Legacy single investment calculation
        const investmentContribution =
          (params.monthlyInvestmentContribution * 12) /
          intervalToPeriodsPerYear(interval);

        // Requirements 7.2: Prevent investment contributions if cash is negative or insufficient
        if (cash > 0 && cash >= investmentContribution) {
          actualInvestmentContribution = investmentContribution;
          cash -= investmentContribution;
        } else {
          // Can't afford investment contribution - skip it
          actualInvestmentContribution = 0;
        }

        const netGrowthRate = (params.investmentReturnRate -
          (params.investmentDividendYieldRate ?? 0)) / 100;
        investments = InvestmentProcessor.calculateInvestmentGrowth(
          investments,
          actualInvestmentContribution,
          netGrowthRate,
          interval,
        );
        investmentCostBasis += actualInvestmentContribution;
      }
    } else {
      // Retired - no new contributions, just apply growth to existing investments
      if (params.investmentHoldings && params.investmentHoldings.length > 0) {
        const investmentResult = InvestmentProcessor
          .calculateInvestmentHoldings(
            params,
            currentState.date,
            investmentBalances,
            interval,
            0, // No cash available for contributions
            investmentCostBases,
          );

        investments = investmentResult.totalBalance;
        investmentBalances = investmentResult.holdingBalances;
        investmentCostBases = investmentResult.holdingCostBases;
      } else {
        const netGrowthRate = (params.investmentReturnRate -
          (params.investmentDividendYieldRate ?? 0)) / 100;
        investments = InvestmentProcessor.calculateInvestmentGrowth(
          investments,
          0, // No contributions
          netGrowthRate,
          interval,
        );
      }
    }

    // Apply any planned sale rules due this period (one-off or recurring
    // drawdowns configured on an individual holding). Only meaningful for
    // the individual-holdings model, since that's the only place a planned
    // sale can be attached to a specific balance. Runs after this period's
    // tax phase already ran, so any realized gain's tax is deducted
    // immediately below rather than folded into taxPaid above.
    let plannedSaleShortTermGain = 0;
    let plannedSaleLongTermGain = 0;

    if (params.investmentHoldings && params.investmentHoldings.length > 0) {
      const periodEnd = advanceDate(currentState.date, interval);
      const longTermThresholdDays = cgRule.longTermThresholdDays;

      for (const holding of params.investmentHoldings) {
        if (!holding.plannedSales || holding.plannedSales.length === 0) {
          continue;
        }

        let holdingBalance = investmentBalances[holding.id] ??
          holding.currentValue;
        const balanceBefore = holdingBalance;
        let holdingCostBasis = investmentCostBases[holding.id] ??
          holdingBalance;
        let totalSold = 0;

        for (const plannedSale of holding.plannedSales) {
          const soldAmount = InvestmentProcessor.calculatePlannedSaleAmount(
            plannedSale,
            holdingBalance,
            currentState.date,
            periodEnd,
          );
          if (soldAmount > 0) {
            const costBasisFraction = holdingBalance > 0
              ? Math.min(1, holdingCostBasis / holdingBalance)
              : 1;
            const costBasisOfSale = soldAmount * costBasisFraction;
            const gain = soldAmount - costBasisOfSale;
            const acquisitionDate = holding.startDate ?? params.startDate;
            const daysHeld =
              (currentState.date.getTime() - acquisitionDate.getTime()) /
              (1000 * 60 * 60 * 24);
            if (daysHeld >= longTermThresholdDays) {
              plannedSaleLongTermGain += gain;
            } else {
              plannedSaleShortTermGain += gain;
            }

            holdingBalance -= soldAmount;
            holdingCostBasis = Math.max(0, holdingCostBasis - costBasisOfSale);
            totalSold += soldAmount;
          }
        }

        if (totalSold > 0) {
          investmentBalances[holding.id] = holdingBalance;
          investmentCostBases[holding.id] = holdingCostBasis;
          investments -= totalSold;
          cash += totalSold;

          eventCollector.emit({
            type: SimulationEventType.PLANNED_SALE_EXECUTED,
            timestamp: new Date(currentState.date),
            phase: SimulationPhase.INVESTMENT,
            description: `Planned sale of $${
              totalSold.toFixed(2)
            } from ${holding.name}`,
            data: {
              holdingId: holding.id,
              holdingLabel: holding.name,
              balanceBefore,
              balanceAfter: holdingBalance,
              amountSold: totalSold,
            },
          });
        }
      }
    }

    // Tax on planned-sale gains, deducted immediately since it's realized
    // after this period's main tax phase already ran.
    if (plannedSaleShortTermGain > 0 || plannedSaleLongTermGain > 0) {
      const discountedPlannedLongTermGain = cgRule.longTermFlatRate > 0
        ? 0
        : plannedSaleLongTermGain * (1 - cgRule.longTermDiscount);
      const plannedFlatRateGains = cgRule.longTermFlatRate > 0
        ? plannedSaleLongTermGain
        : 0;
      const plannedSaleTax = InvestmentTaxProcessor.calculateInvestmentTax(
        params,
        taxableIncome + additionalOrdinaryIncome,
        plannedSaleShortTermGain * periodsPerYear +
          discountedPlannedLongTermGain * periodsPerYear,
        plannedFlatRateGains * periodsPerYear,
      ) / periodsPerYear;

      taxPaid += plannedSaleTax;
      cash -= plannedSaleTax;
      shortTermGain += plannedSaleShortTermGain;
      longTermGain += plannedSaleLongTermGain;
    }

    eventCollector.emit({
      type: SimulationEventType.PHASE_END,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.INVESTMENT,
      description: `Completed investment phase`,
      data: { phase: SimulationPhase.INVESTMENT },
    });

    // Phase 5: Superannuation - Add contributions and apply growth
    eventCollector.emit({
      type: SimulationEventType.PHASE_START,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.SUPERANNUATION,
      description: `Starting superannuation phase`,
      data: { phase: SimulationPhase.SUPERANNUATION },
    });

    // Handle multiple super accounts if provided, otherwise use legacy single super
    let superBalances: { [superId: string]: number } = {};

    // Collect all super accounts from all people, or top-level superAccounts
    const allSuperAccounts: SuperAccount[] = [];

    if (peopleHaveSuperAccounts(params)) {
      // Collect super accounts from all people - backfilling personId from
      // the owning person when the account itself doesn't have one set, so
      // the per-person contribution logic below always has an owner to
      // check against. Without this, an account missing personId fell into
      // the "legacy household" branch and kept accruing contributions off
      // the whole household's income - including after its own owner
      // retired, as long as anyone else was still working.
      for (const person of params.people!) {
        allSuperAccounts.push(
          ...person.superAccounts.map((acc) => ({
            ...acc,
            personId: acc.personId ?? person.id,
          })),
        );
      }
    } else if (params.superAccounts && params.superAccounts.length > 0) {
      // Use top-level super accounts (legacy or single mode)
      allSuperAccounts.push(...params.superAccounts);
    }

    if (allSuperAccounts.length > 0) {
      // Multiple super accounts - handle person-specific contributions
      superannuation = 0;
      for (const superAcc of allSuperAccounts) {
        const currentBalance = currentState.superBalances?.[superAcc.id] ??
          superAcc.balance;

        // Calculate contribution based on person's working status
        let superContribution = 0;
        if (anyPersonStillWorking && superAcc.personId) {
          // Find the person this super account belongs to
          const person = params.people?.find((p) => p.id === superAcc.personId);
          if (person) {
            const personCurrentAge = person.currentAge + yearsElapsed;
            if (personCurrentAge < person.retirementAge) {
              // Calculate this person's income for super contribution
              let personIncome = 0;
              for (const incomeSource of person.incomeSources) {
                if (
                  this.isIncomeSourceActive(incomeSource, currentState.date)
                ) {
                  personIncome += this.calculateIncomeSourceAmount(
                    incomeSource,
                    interval,
                  );
                }
              }
              superContribution = (personIncome * superAcc.contributionRate) /
                100;
            }
          }
        } else if (anyPersonStillWorking && !superAcc.personId) {
          // Legacy super account - use total household income
          superContribution = (grossIncome * superAcc.contributionRate) / 100;
        }

        const superGrowthRate = superAcc.returnRate / 100;
        const intervalSuperRate = convertAnnualRateToInterval(
          superGrowthRate,
          interval,
        );

        // Apply growth to existing balance
        const superAfterGrowth = currentBalance * (1 + intervalSuperRate);
        // Add contribution without growth (contributions arrive throughout the period)
        const newBalance = superAfterGrowth + superContribution;

        superBalances[superAcc.id] = newBalance;
        superannuation += newBalance;
      }
    } else {
      // Legacy single super account
      // Only contribute if someone is still working
      const superContribution = anyPersonStillWorking
        ? (grossIncome * params.superContributionRate) / 100
        : 0;
      const superGrowthRate = params.superReturnRate / 100;
      const intervalSuperRate = convertAnnualRateToInterval(
        superGrowthRate,
        interval,
      );

      // Apply growth to existing balance
      const superAfterGrowth = superannuation * (1 + intervalSuperRate);
      // Add contribution without growth (contributions arrive throughout the period)
      superannuation = superAfterGrowth + superContribution;
    }

    eventCollector.emit({
      type: SimulationEventType.PHASE_END,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.SUPERANNUATION,
      description: `Completed superannuation phase`,
      data: { phase: SimulationPhase.SUPERANNUATION },
    });

    // Phase 6: Offset Account - Move leftover cash to offset account
    eventCollector.emit({
      type: SimulationEventType.PHASE_START,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.OFFSET,
      description: `Starting offset phase`,
      data: { phase: SimulationPhase.OFFSET },
    });

    // For multiple loans, add to the biggest loan with offset enabled
    // Handle excess offset (when offset > loan balance) as cash
    if (cash > 0 && loanBalance > 0) {
      if (params.loans !== undefined && params.loans.length > 0) {
        // Find the biggest loan with offset enabled
        let biggestLoanWithOffset: {
          id: string;
          balance: number;
          loan: typeof params.loans[0];
        } | null = null;

        for (const loan of params.loans) {
          if (loan.hasOffset) {
            const currentBalance = loanBalances[loan.id] || 0;
            if (
              currentBalance > 0 &&
              (!biggestLoanWithOffset ||
                currentBalance > biggestLoanWithOffset.balance)
            ) {
              biggestLoanWithOffset = {
                id: loan.id,
                balance: currentBalance,
                loan,
              };
            }
          }
        }

        // Add leftover cash to the biggest loan's offset
        if (biggestLoanWithOffset) {
          const currentOffsetBalance =
            offsetBalances[biggestLoanWithOffset.id] || 0;
          const loanBalance = biggestLoanWithOffset.balance;

          // Calculate how much we can add to offset (capped at loan balance)
          const maxOffsetIncrease = Math.max(
            0,
            loanBalance - currentOffsetBalance,
          );
          const offsetIncrease = Math.min(cash, maxOffsetIncrease);

          // Add to offset
          offsetBalances[biggestLoanWithOffset.id] = currentOffsetBalance +
            offsetIncrease;
          offsetBalance += offsetIncrease;
          cash -= offsetIncrease;

          // Any remaining cash stays as cash (excess offset scenario)
          // This cash is now held as savings and will show on the timeline
        }
      } else if (params.loans === undefined && params.useOffsetAccount) {
        // Legacy single loan offset (only if loans array doesn't exist)
        const maxOffsetIncrease = Math.max(0, loanBalance - offsetBalance);
        const offsetIncrease = Math.min(cash, maxOffsetIncrease);

        offsetBalance += offsetIncrease;
        cash -= offsetIncrease;
        // Excess cash stays as cash
      }
    }

    // Phase 6b: Auto-payout loans when offset equals outstanding principal
    if (params.loans !== undefined && params.loans.length > 0) {
      for (const loan of params.loans) {
        if (loan.hasOffset && loan.autoPayoutWhenOffsetFull) {
          const currentLoanBalance = loanBalances[loan.id] || 0;
          const currentOffsetBalance = offsetBalances[loan.id] || 0;

          // If offset equals or exceeds loan balance, pay out the loan
          if (
            currentLoanBalance > 0 && currentOffsetBalance >= currentLoanBalance
          ) {
            // Pay out the loan (set balance to 0)
            loanBalances[loan.id] = 0;

            // Clear the offset for this loan and convert to cash
            offsetBalances[loan.id] = 0;

            // Add the offset amount to cash (it was already saved, now it's liquid)
            cash += currentOffsetBalance;

            // Update totals
            loanBalance = Object.values(loanBalances).reduce(
              (sum, bal) => sum + bal,
              0,
            );
            offsetBalance = Object.values(offsetBalances).reduce(
              (sum, bal) => sum + bal,
              0,
            );
          }
        }
      }
    }

    eventCollector.emit({
      type: SimulationEventType.PHASE_END,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.OFFSET,
      description: `Completed offset phase`,
      data: { phase: SimulationPhase.OFFSET },
    });

    // Phase 6b: Deficit Resolution - Sell assets if cash is negative
    // This happens if expenses > income + cash
    if (cash < 0) {
      const shortfall = -cash;

      eventCollector.emit({
        type: SimulationEventType.PHASE_START,
        timestamp: new Date(currentState.date),
        phase: SimulationPhase.DEFICIT,
        description: `Starting deficit resolution phase (Shortfall: $${
          shortfall.toFixed(2)
        })`,
        data: { phase: SimulationPhase.DEFICIT },
      });

      // Confirm strategy selection for deficit
      const ages = this.calculateCurrentAges(params, yearsElapsed);
      const preservationAge = params.preservationAge ??
        getCountryModule(params.country).retirementAccessRule.accessAge;
      const anyoneOverPreservationAge = ages.some((age) =>
        age >= preservationAge
      );
      const strategy = params.drawdownStrategy || "investments_first";

      eventCollector.emit({
        type: SimulationEventType.WITHDRAWAL_STRATEGY_SELECTED,
        timestamp: new Date(currentState.date),
        phase: SimulationPhase.DEFICIT,
        description: `Selected deficit resolution strategy: ${strategy}`,
        data: {
          strategy,
          eligibleForSuper: anyoneOverPreservationAge,
          ages,
          preservationAge,
        },
      });

      const withdrawalResult = this.processRetirementWithdrawals(
        shortfall,
        investments,
        superannuation,
        params,
        yearsElapsed,
        currentState,
        investmentBalances,
        investmentCostBases,
        investmentCostBasis,
      );

      // Apply results
      const fromInvestments = investments - withdrawalResult.newInvestments;
      const fromSuper = superannuation - withdrawalResult.newSuperannuation;

      investments = withdrawalResult.newInvestments;
      superannuation = withdrawalResult.newSuperannuation;
      investmentBalances = withdrawalResult.newInvestmentBalances;
      investmentCostBases = withdrawalResult.newInvestmentCostBases;
      investmentCostBasis = withdrawalResult.newInvestmentCostBasis;
      const totalWithdrawn = withdrawalResult.withdrawnAmount;

      // Add withdrawn funds to cash to cover deficit
      cash += totalWithdrawn;

      // Tax on this withdrawal's realized gains and any taxable
      // retirement-account portion, deducted immediately since it's
      // realized after this period's main tax phase already ran.
      shortTermGain += withdrawalResult.shortTermGain;
      longTermGain += withdrawalResult.longTermGain;
      taxableRetirementWithdrawal += withdrawalResult.taxableSuperWithdrawal;
      if (
        withdrawalResult.shortTermGain > 0 ||
        withdrawalResult.longTermGain > 0 ||
        withdrawalResult.taxableSuperWithdrawal > 0
      ) {
        const discountedGain = cgRule.longTermFlatRate > 0
          ? 0
          : withdrawalResult.longTermGain * (1 - cgRule.longTermDiscount);
        const flatGain = cgRule.longTermFlatRate > 0
          ? withdrawalResult.longTermGain
          : 0;
        const deficitInvestmentTax =
          InvestmentTaxProcessor.calculateInvestmentTax(
            params,
            taxableIncome + additionalOrdinaryIncome,
            (withdrawalResult.shortTermGain + discountedGain +
              withdrawalResult.taxableSuperWithdrawal) * periodsPerYear,
            flatGain * periodsPerYear,
          ) / periodsPerYear;

        taxPaid += deficitInvestmentTax;
        cash -= deficitInvestmentTax;
      }

      eventCollector.emit({
        type: SimulationEventType.RETIREMENT_WITHDRAWAL,
        timestamp: new Date(currentState.date),
        phase: SimulationPhase.DEFICIT,
        description: `Withdrew $${totalWithdrawn.toFixed(2)} to cover deficit`,
        data: {
          shortfall,
          fromInvestments,
          fromSuper,
          totalWithdrawn,
          remainingShortfall: shortfall - totalWithdrawn,
          reason: "Cash deficit resolution",
        },
      });

      eventCollector.emit({
        type: SimulationEventType.PHASE_END,
        timestamp: new Date(currentState.date),
        phase: SimulationPhase.DEFICIT,
        description: `Completed deficit resolution phase`,
        data: { phase: SimulationPhase.DEFICIT },
      });
    }

    // Phase 7: Calculate net worth and cash flow
    eventCollector.emit({
      type: SimulationEventType.PHASE_START,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.STATE_UPDATE,
      description: `Starting state update phase`,
      data: { phase: SimulationPhase.STATE_UPDATE },
    });

    const netWorth = cash + investments + superannuation + offsetBalance +
      propertyValue - loanBalance;
    const cashFlow = netIncome - expenses - totalLoanPayment -
      actualInvestmentContribution;

    eventCollector.emit({
      type: SimulationEventType.PHASE_END,
      timestamp: new Date(currentState.date),
      phase: SimulationPhase.STATE_UPDATE,
      description: `Completed state update phase`,
      data: { phase: SimulationPhase.STATE_UPDATE },
    });

    return {
      date: currentState.date, // Will be updated by caller
      cash,
      investments,
      superannuation,
      loanBalance,
      offsetBalance,
      netWorth,
      cashFlow,
      taxPaid,
      expenses,
      interestSaved,
      deductibleInterest,
      loanBalances: params.loans && params.loans.length > 0
        ? loanBalances
        : undefined,
      superBalances: allSuperAccounts.length > 0 ? superBalances : undefined,
      offsetBalances: params.loans && params.loans.length > 0
        ? offsetBalances
        : undefined,
      investmentBalances:
        params.investmentHoldings && params.investmentHoldings.length > 0
          ? investmentBalances
          : undefined,
      propertyValue,
      houseValues: params.housePurchases && params.housePurchases.length > 0
        ? houseValues
        : undefined,
      dividendIncome,
      realizedCapitalGains: shortTermGain + longTermGain,
      investmentTaxPaid: taxPaid - periodSalaryTax,
      investmentCostBasis:
        params.investmentHoldings && params.investmentHoldings.length > 0
          ? undefined
          : investmentCostBasis,
      investmentCostBases:
        params.investmentHoldings && params.investmentHoldings.length > 0
          ? investmentCostBases
          : undefined,
    };
  },

  /**
   * Checks if the financial trajectory is sustainable
   * Adds warnings for concerning patterns
   */
  checkSustainability(
    states: FinancialState[],
    warnings: string[],
    retirementDate: Date | null = null,
  ): boolean {
    if (states.length < 2) {
      return true;
    }

    let isSustainable = true;

    // Check for increasing debt
    const firstLoanBalance = states[0].loanBalance;
    const lastLoanBalance = states[states.length - 1].loanBalance;
    if (lastLoanBalance > firstLoanBalance) {
      warnings.push("Loan balance is increasing over time");
      isSustainable = false;
    }

    // Check for consecutive negative cash flow while still working. Once
    // retired, cashFlow (income minus expenses/loans/contributions) is
    // expected to run negative every period - it doesn't account for the
    // retirement withdrawals that cover the gap - so counting those periods
    // here would flag a fully-funded, on-track retirement as unsustainable.
    const preRetirementStates = retirementDate
      ? states.filter((s) => s.date < retirementDate)
      : states;
    let consecutiveNegative = 0;
    for (const state of preRetirementStates) {
      if (state.cashFlow < 0) {
        consecutiveNegative++;
        if (consecutiveNegative >= 3) {
          warnings.push("Sustained negative cash flow detected");
          isSustainable = false;
          break;
        }
      } else {
        consecutiveNegative = 0;
      }
    }

    // Check for negative net worth
    if (states[states.length - 1].netWorth < 0) {
      warnings.push("Net worth is negative");
      isSustainable = false;
    }

    return isSustainable;
  },

  /**
   * Runs simulation with parameter transitions
   * Resolves parameters for each time step based on active transitions
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4
   */
  runSimulationWithTransitions(
    config: SimulationConfiguration,
  ): EnhancedSimulationResult {
    config = {
      ...config,
      baseParameters: resolveHousePurchaseEffects(config.baseParameters),
    };
    const interval: TimeInterval = "month"; // Default to monthly intervals
    const states: FinancialState[] = [];
    const warnings: string[] = [];
    const transitionPoints: TransitionPoint[] = [];
    const eventCollector = new EventCollector();

    // Build parameter periods for the result
    const periods = buildParameterPeriods(config);

    // Get initial parameters (base parameters)
    let currentParams = resolveParametersForDate(
      config.baseParameters.startDate,
      config,
    );

    // Initialize starting state
    // If loans array exists (even if empty), use it; otherwise fall back to legacy.
    // A loan with a startDate after the simulation start contributes 0 until
    // it activates (see loanInitialBalance).
    const initialLoanBalance = currentParams.loans !== undefined
      ? (currentParams.loans.length > 0
        ? currentParams.loans.reduce(
          (sum, loan) =>
            sum +
            this.loanInitialBalance(loan, config.baseParameters.startDate),
          0,
        )
        : 0)
      : currentParams.loanPrincipal;

    const initialLoanBalances =
      currentParams.loans !== undefined && currentParams.loans.length > 0
        ? currentParams.loans.reduce(
          (acc, loan) => ({
            ...acc,
            [loan.id]: this.loanInitialBalance(
              loan,
              config.baseParameters.startDate,
            ),
          }),
          {} as { [loanId: string]: number },
        )
        : undefined;

    // Collect all super accounts from all people, or top-level superAccounts
    const allSuperAccountsTransitions: SuperAccount[] = [];

    if (peopleHaveSuperAccounts(currentParams)) {
      // Collect super accounts from all people - backfilling personId from
      // the owning person when the account itself doesn't have one set (see
      // the matching comment in runSimulation for why this matters).
      for (const person of currentParams.people!) {
        allSuperAccountsTransitions.push(
          ...person.superAccounts.map((acc) => ({
            ...acc,
            personId: acc.personId ?? person.id,
          })),
        );
      }
    } else if (
      currentParams.superAccounts && currentParams.superAccounts.length > 0
    ) {
      // Use top-level super accounts (legacy or single mode)
      allSuperAccountsTransitions.push(...currentParams.superAccounts);
    }

    const initialSuperBalance = allSuperAccountsTransitions.length > 0
      ? allSuperAccountsTransitions.reduce(
        (sum, superAcc) => sum + superAcc.balance,
        0,
      )
      : currentParams.currentSuperBalance;

    const initialSuperBalances = allSuperAccountsTransitions.length > 0
      ? allSuperAccountsTransitions.reduce(
        (acc, superAcc) => ({ ...acc, [superAcc.id]: superAcc.balance }),
        {} as { [superId: string]: number },
      )
      : undefined;

    const initialOffsetBalance = currentParams.loans !== undefined
      ? (currentParams.loans.length > 0
        ? currentParams.loans.reduce(
          (sum, loan) => sum + (loan.offsetBalance || 0),
          0,
        )
        : 0)
      : (currentParams.currentOffsetBalance || 0);

    const initialOffsetBalances =
      currentParams.loans !== undefined && currentParams.loans.length > 0
        ? currentParams.loans.reduce(
          (acc, loan) => ({ ...acc, [loan.id]: loan.offsetBalance || 0 }),
          {} as { [loanId: string]: number },
        )
        : undefined;

    // A house purchased before the simulation start (e.g. a primary home
    // already owned) needs its value credited from the very first state,
    // matching how its mortgage's principal is already seeded above via
    // loanInitialBalance - otherwise net worth understates by the full
    // house price until the first PROPERTY phase tick runs.
    const initialHouseValues = currentParams.housePurchases &&
        currentParams.housePurchases.length > 0
      ? currentParams.housePurchases.reduce(
        (acc, house) => ({
          ...acc,
          [house.id]: house.purchaseDate <= config.baseParameters.startDate
            ? house.price
            : 0,
        }),
        {} as { [houseId: string]: number },
      )
      : undefined;
    const initialPropertyValue = initialHouseValues
      ? Object.values(initialHouseValues).reduce((sum, v) => sum + v, 0)
      : 0;

    let currentState: FinancialState = {
      date: new Date(config.baseParameters.startDate),
      cash: currentParams.currentCashBalance ?? 0,
      investments: currentParams.currentInvestmentBalance,
      superannuation: initialSuperBalance,
      loanBalance: initialLoanBalance,
      offsetBalance: initialOffsetBalance,
      netWorth: 0,
      cashFlow: 0,
      taxPaid: 0,
      expenses: 0,
      interestSaved: 0,
      deductibleInterest: 0,
      loanBalances: initialLoanBalances,
      superBalances: initialSuperBalances,
      offsetBalances: initialOffsetBalances,
      propertyValue: initialPropertyValue,
      houseValues: initialHouseValues,
    };

    // Calculate initial net worth
    currentState.netWorth = currentState.cash + currentState.investments +
      currentState.superannuation + currentState.offsetBalance +
      currentState.propertyValue - currentState.loanBalance;

    states.push(currentState);

    // Calculate end date
    const endDate = new Date(config.baseParameters.startDate);
    endDate.setFullYear(
      endDate.getFullYear() + config.baseParameters.simulationYears,
    );

    // Sort transitions chronologically
    const sortedTransitions = [...config.transitions].sort(
      (a, b) => a.transitionDate.getTime() - b.transitionDate.getTime(),
    );

    // Track which transitions we've passed
    let nextTransitionIndex = 0;

    // Run simulation for each time interval
    let currentDate = new Date(config.baseParameters.startDate);
    while (currentDate < endDate) {
      currentDate = advanceDate(currentDate, interval);

      // Check if we've crossed a transition point
      while (
        nextTransitionIndex < sortedTransitions.length &&
        sortedTransitions[nextTransitionIndex].transitionDate <= currentDate
      ) {
        const transition = sortedTransitions[nextTransitionIndex];

        // Resolve new parameters
        currentParams = resolveParametersForDate(currentDate, config);

        // Create a summary of what changed
        const changedParams = Object.keys(transition.parameterChanges);
        const changesSummary = transition.label ||
          `Changed: ${changedParams.join(", ")}`;

        // Record the transition point
        transitionPoints.push({
          date: new Date(transition.transitionDate),
          stateIndex: states.length,
          transition: transition,
          changesSummary: changesSummary,
        });

        nextTransitionIndex++;
      }

      // Calculate next state using current parameters
      currentState = this.calculateTimeStep(
        currentState,
        currentParams,
        interval,
        eventCollector,
      );
      currentState.date = new Date(currentDate);
      states.push(currentState);
    }

    // Find retirement date
    const retirement = RetirementCalculator.findRetirementDate(
      states,
      currentParams.desiredAnnualRetirementIncome,
      currentParams.currentAge,
      currentParams.retirementAge,
      currentParams.preservationAge ??
        getCountryModule(currentParams.country).retirementAccessRule
          .accessAge,
    );

    // Generate warnings
    const financialWarnings = generateWarnings(states, retirement.date);
    const warningMessages = financialWarnings.map((w) => w.message);

    // Add warning if retirement is not achievable at desired age
    if (retirement.date === null) {
      const yearsSimulated = config.baseParameters.simulationYears;
      const finalAge = config.baseParameters.currentAge + yearsSimulated;
      warningMessages.push(
        `⚠️ RETIREMENT NOT ACHIEVABLE: You want to retire at age ${config.baseParameters.retirementAge}, but your assets will not support ${
          formatCurrency(config.baseParameters.desiredAnnualRetirementIncome)
        }/year income at that age. ` +
          `Even by age ${Math.floor(finalAge)}, you won't have enough saved. ` +
          `To retire at ${config.baseParameters.retirementAge}, you need to: save more aggressively, reduce expenses, lower your retirement income target, or work longer.`,
      );
    } else if (
      retirement.age && retirement.age > config.baseParameters.retirementAge + 1
    ) {
      // Retirement is achievable but much later than desired
      warningMessages.push(
        `⚠️ DELAYED RETIREMENT: You want to retire at age ${config.baseParameters.retirementAge}, but you won't have enough assets until age ${
          Math.floor(retirement.age)
        }. ` +
          `That's ${
            Math.floor(retirement.age - config.baseParameters.retirementAge)
          } years later than planned. ` +
          `To retire earlier, consider: increasing savings, reducing expenses, or lowering your retirement income target from ${
            formatCurrency(config.baseParameters.desiredAnnualRetirementIncome)
          }/year.`,
      );
    }

    // Check sustainability
    const isSustainable = this.checkSustainability(
      states,
      warnings,
      retirement.date,
    );

    // Detect milestones from simulation results, including parameter transitions
    const milestoneResult = detectMilestonesFromSimulation(
      states,
      currentParams,
      transitionPoints,
    );

    // Add milestone detection warnings to simulation warnings
    const allWarnings = [
      ...warnings,
      ...warningMessages,
      ...milestoneResult.warnings,
    ];

    return {
      states,
      retirementDate: retirement.date,
      retirementAge: retirement.age,
      isSustainable,
      warnings: allWarnings,
      milestones: milestoneResult.milestones,
      transitionPoints,
      periods,
      events: eventCollector.getAll(),
    };
  },

  /**
   * Runs comparison simulation (with vs without transitions)
   * Validates: Requirements 10.1, 10.2, 10.3, 5.1, 5.2, 5.3, 5.4, 5.5
   */
  async runComparisonSimulation(
    config: SimulationConfiguration,
  ): Promise<ComparisonSimulationResult> {
    // Run simulation with transitions
    const withTransitions = this.runSimulationWithTransitions(config);

    // Run simulation without transitions (base parameters only)
    const withoutTransitions = this.runSimulation(config.baseParameters);

    // Calculate comparison metrics
    let retirementDateDifference: number | null = null;
    if (
      withTransitions.retirementDate && withoutTransitions.retirementDate
    ) {
      const diffMs = withTransitions.retirementDate.getTime() -
        withoutTransitions.retirementDate.getTime();
      retirementDateDifference = diffMs / (1000 * 60 * 60 * 24 * 365.25); // Convert to years
    }

    const finalNetWorthWithTransitions = withTransitions.states.length > 0
      ? withTransitions.states[withTransitions.states.length - 1].netWorth
      : 0;

    const finalNetWorthWithoutTransitions = withoutTransitions.states.length >
        0
      ? withoutTransitions.states[withoutTransitions.states.length - 1]
        .netWorth
      : 0;

    const finalNetWorthDifference = finalNetWorthWithTransitions -
      finalNetWorthWithoutTransitions;

    const sustainabilityChanged = withTransitions.isSustainable !==
      withoutTransitions.isSustainable;

    const baseComparison = {
      withTransitions,
      withoutTransitions,
      comparison: {
        retirementDateDifference,
        finalNetWorthDifference,
        sustainabilityChanged,
      },
    };

    // Enhance with milestone and advice comparison
    const { ScenarioComparisonEngine } = await import(
      "./scenario_comparison_engine.ts"
    );
    return ScenarioComparisonEngine.enhanceComparisonWithMilestonesAndAdvice(
      baseComparison,
      config,
    );
  },

  /**
   * Helper method to check if an income source is active at a given date
   */
  isIncomeSourceActive(incomeSource: IncomeSource, currentDate: Date): boolean {
    // Check start date
    if (incomeSource.startDate && currentDate < incomeSource.startDate) {
      return false;
    }

    // Check end date
    if (incomeSource.endDate && currentDate > incomeSource.endDate) {
      return false;
    }

    // Check one-off income
    if (incomeSource.isOneOff) {
      if (!incomeSource.oneOffDate) {
        return false;
      }
      // One-off income is only active on the specific date (within the same month)
      const sameMonth =
        currentDate.getFullYear() === incomeSource.oneOffDate.getFullYear() &&
        currentDate.getMonth() === incomeSource.oneOffDate.getMonth();
      return sameMonth;
    }

    return true;
  },

  /**
   * Helper method to calculate income amount for a specific interval
   */
  calculateIncomeSourceAmount(
    incomeSource: IncomeSource,
    interval: TimeInterval,
  ): number {
    if (incomeSource.isOneOff) {
      // One-off income is paid in full during the month it occurs
      return incomeSource.amount;
    }

    return convertPaymentToInterval(
      incomeSource.amount,
      incomeSource.frequency,
      interval,
    );
  },

  /**
   * Enhanced retirement withdrawal processing with flexible strategies
   */
  processRetirementWithdrawals(
    shortfall: number,
    currentInvestments: number,
    currentSuperannuation: number,
    params: UserParameters,
    yearsElapsed: number,
    _currentState: FinancialState,
    currentInvestmentBalances: { [holdingId: string]: number },
    currentInvestmentCostBases: { [holdingId: string]: number },
    currentInvestmentCostBasis: number,
  ): {
    newInvestments: number;
    newSuperannuation: number;
    withdrawnAmount: number;
    newInvestmentBalances: { [holdingId: string]: number };
    newInvestmentCostBases: { [holdingId: string]: number };
    newInvestmentCostBasis: number;
    shortTermGain: number;
    longTermGain: number;
    taxableSuperWithdrawal: number;
  } {
    let investments = currentInvestments;
    let superannuation = currentSuperannuation;
    let withdrawnAmount = 0;
    let remainingShortfall = shortfall;

    // Selling down investments to fund a withdrawal realizes a capital gain
    // against cost basis, tracked (and taxed later, by the caller) alongside
    // the plain balance reduction below.
    let investmentBalances = { ...currentInvestmentBalances };
    let investmentCostBases = { ...currentInvestmentCostBases };
    let investmentCostBasis = currentInvestmentCostBasis;
    let shortTermGain = 0;
    let longTermGain = 0;
    let taxableSuperWithdrawal = 0;

    const countryModule = getCountryModule(params.country);
    const longTermThresholdDays =
      countryModule.capitalGainsRule.longTermThresholdDays;

    const sellInvestments = (amount: number) => {
      if (amount <= 0) return;
      if (params.investmentHoldings && params.investmentHoldings.length > 0) {
        const result = InvestmentProcessor.sellFromHoldings(
          params.investmentHoldings,
          investmentBalances,
          investmentCostBases,
          amount,
          _currentState.date,
          params.startDate,
          longTermThresholdDays,
        );
        investmentBalances = result.newHoldingBalances;
        investmentCostBases = result.newHoldingCostBases;
        shortTermGain += result.shortTermGain;
        longTermGain += result.longTermGain;
      } else {
        const result = InvestmentProcessor.sellFromAggregate(
          investments,
          investmentCostBasis,
          amount,
          _currentState.date,
          params.startDate,
          longTermThresholdDays,
        );
        investmentCostBasis = result.newCostBasis;
        shortTermGain += result.shortTermGain;
        longTermGain += result.longTermGain;
      }
    };

    // US 401k/IRA-style modules tax the whole withdrawal as ordinary
    // income (on top of any early-withdrawal penalty already applied by
    // evaluateRetirementAccountWithdrawal); AU superannuation does not.
    const recordSuperWithdrawal = (amountReceived: number) => {
      if (countryModule.retirementWithdrawalsTaxedAsIncome) {
        taxableSuperWithdrawal += amountReceived;
      }
    };

    // Determine ages for withdrawal eligibility. The retirement account is
    // treated as a single pooled fund (not per-person), so - consistent with
    // the pre-module behavior - eligibility is "does anyone in the household
    // meet the age", represented as the oldest person's age.
    const ages = this.calculateCurrentAges(params, yearsElapsed);
    const representativeAge = ages.length > 0 ? Math.max(...ages) : 0;
    const accessRule = getCountryModule(params.country).retirementAccessRule;
    const preservationAge = params.preservationAge ?? accessRule.accessAge;
    const anyoneOverPreservationAge = representativeAge >= preservationAge;
    // Whether the super-touching branches should even be attempted: either
    // fully accessible already, or the module allows penalized early access
    // (hardGate: false, e.g. US 401k/IRA) - a hard-gated account (AU super)
    // below preservationAge yields nothing, so there's no point attempting.
    const superAttemptable = anyoneOverPreservationAge || !accessRule.hardGate;

    // Default strategy is investments_first
    const strategy = params.drawdownStrategy || "investments_first";

    if (strategy === "super_first" && superAttemptable) {
      // STRATEGY: Super First
      // 1. Withdraw from super first if eligible (possibly penalized)
      if (remainingShortfall > 0 && superannuation > 0) {
        const result = evaluateRetirementAccountWithdrawal(
          { ...accessRule, accessAge: preservationAge },
          representativeAge,
          remainingShortfall,
          superannuation,
        );
        superannuation -= result.amountReceived + result.penaltyPaid;
        withdrawnAmount += result.amountReceived;
        remainingShortfall -= result.amountReceived;
        recordSuperWithdrawal(result.amountReceived);
      }

      // 2. Withdraw from investments if still short
      if (remainingShortfall > 0 && investments > 0) {
        const investmentWithdrawal = Math.min(remainingShortfall, investments);
        sellInvestments(investmentWithdrawal);
        investments -= investmentWithdrawal;
        withdrawnAmount += investmentWithdrawal;
        remainingShortfall -= investmentWithdrawal;
      }
    } else if (strategy === "proportional" && superAttemptable) {
      // STRATEGY: Proportional
      // Withdraw proportionally from available liquid assets
      const availableSuper = superannuation;
      const availableInvestments = investments;
      const totalAvailable = availableSuper + availableInvestments;

      if (totalAvailable > 0 && remainingShortfall > 0) {
        // Calculate proportions
        const superShare = availableSuper / totalAvailable;
        const investmentShare = availableInvestments / totalAvailable;

        // Calculate target withdrawals
        const totalWithdrawalNeeded = Math.min(
          remainingShortfall,
          totalAvailable,
        );

        const superTarget = totalWithdrawalNeeded * superShare;
        const investmentWithdrawal = totalWithdrawalNeeded * investmentShare;

        // Apply withdrawals - super may be penalized below preservationAge
        const superResult = evaluateRetirementAccountWithdrawal(
          { ...accessRule, accessAge: preservationAge },
          representativeAge,
          superTarget,
          superannuation,
        );
        superannuation -= superResult.amountReceived + superResult.penaltyPaid;
        sellInvestments(investmentWithdrawal);
        investments -= investmentWithdrawal;
        withdrawnAmount += superResult.amountReceived + investmentWithdrawal;
        remainingShortfall -= superResult.amountReceived + investmentWithdrawal;
        recordSuperWithdrawal(superResult.amountReceived);
      }
    } else {
      // STRATEGY: Investments First (Default)
      // Also used as fallback if not eligible for super yet in other strategies

      // 1. Withdraw from investments (always accessible)
      if (remainingShortfall > 0 && investments > 0) {
        const investmentWithdrawal = Math.min(remainingShortfall, investments);
        sellInvestments(investmentWithdrawal);
        investments -= investmentWithdrawal;
        withdrawnAmount += investmentWithdrawal;
        remainingShortfall -= investmentWithdrawal;
      }

      // 2. Withdraw from superannuation if eligible (possibly penalized)
      if (remainingShortfall > 0 && superannuation > 0 && superAttemptable) {
        const result = evaluateRetirementAccountWithdrawal(
          { ...accessRule, accessAge: preservationAge },
          representativeAge,
          remainingShortfall,
          superannuation,
        );
        superannuation -= result.amountReceived + result.penaltyPaid;
        withdrawnAmount += result.amountReceived;
        remainingShortfall -= result.amountReceived;
        recordSuperWithdrawal(result.amountReceived);
      }
    }

    // Emergency withdrawal from super if over the module's pension age (more
    // flexible access, e.g. AU Age Pension eligibility). Applies to all
    // strategies if there's still a shortfall and funds remaining. For a
    // module where the account isn't hard-gated (US), pensionAge equals
    // accessAge, so this is a harmless no-op there - access was never denied.
    const anyoneOverPensionAge = representativeAge >= accessRule.pensionAge;
    if (remainingShortfall > 0 && superannuation > 0 && anyoneOverPensionAge) {
      const emergencyWithdrawal = Math.min(remainingShortfall, superannuation);
      superannuation -= emergencyWithdrawal;
      withdrawnAmount += emergencyWithdrawal;
      remainingShortfall -= emergencyWithdrawal;
      recordSuperWithdrawal(emergencyWithdrawal);
    }

    return {
      newInvestments: investments,
      newSuperannuation: superannuation,
      withdrawnAmount,
      newInvestmentBalances: investmentBalances,
      newInvestmentCostBases: investmentCostBases,
      newInvestmentCostBasis: investmentCostBasis,
      shortTermGain,
      longTermGain,
      taxableSuperWithdrawal,
    };
  },

  /**
   * Calculate current ages for all people in the household
   */
  calculateCurrentAges(params: UserParameters, yearsElapsed: number): number[] {
    const ages: number[] = [];

    if (
      params.householdMode === "couple" && params.people &&
      params.people.length > 0
    ) {
      for (const person of params.people) {
        ages.push(person.currentAge + yearsElapsed);
      }
    } else {
      // Single person or legacy mode
      ages.push(params.currentAge + yearsElapsed);
    }

    return ages;
  },
};
