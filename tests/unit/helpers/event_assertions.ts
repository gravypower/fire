/**
 * Test helper utilities for event-based testing
 */

import type {
  AnySimulationEvent,
  SimulationEventType,
  SimulationPhase,
} from "../../../lib/simulation_events.ts";

/**
 * Find events of a specific type
 */
export function findEventsOfType(
  events: AnySimulationEvent[],
  type: SimulationEventType,
): AnySimulationEvent[] {
  return events.filter((e) => e.type === type);
}

/**
 * Find events in a specific phase
 */
export function findEventsInPhase(
  events: AnySimulationEvent[],
  phase: SimulationPhase,
): AnySimulationEvent[] {
  return events.filter((e) => e.phase === phase);
}

/**
 * Print event timeline for debugging
 */
export function printEventTimeline(events: AnySimulationEvent[]): void {
  let currentDate: Date | null = null;
  let currentPhase: SimulationPhase | null = null;

  console.log("\n" + "=".repeat(80));
  console.log("EVENT TIMELINE");
  console.log("=".repeat(80));

  for (const event of events) {
    // Date header
    if (!currentDate || event.timestamp.getTime() !== currentDate.getTime()) {
      currentDate = event.timestamp;
      console.log("");
      console.log(`\n${"═".repeat(60)}`);
      console.log(`DATE: ${currentDate.toISOString().split("T")[0]}`);
      console.log("═".repeat(60));
    }

    // Phase tracking
    if (event.type === "phase_start") {
      currentPhase = event.phase;
      console.log(`\n┌─ PHASE: ${event.phase.toUpperCase()}`);
    } else if (event.type === "phase_end") {
      console.log(`└─ END PHASE: ${event.phase.toUpperCase()}`);
      currentPhase = null;
    } else {
      // Regular event
      const indent = currentPhase ? "│  " : "";
      const icon = getEventIcon(event.type);
      console.log(`${indent}${icon} ${event.description}`);

      // Print important data
      const details = formatEventData(event);
      if (details) {
        console.log(`${indent}   ${details}`);
      }
    }
  }

  console.log("\n" + "=".repeat(80) + "\n");
}

/**
 * Get icon for event type
 */
function getEventIcon(type: SimulationEventType): string {
  switch (type) {
    case "income_received":
      return "💰";
    case "tax_calculated":
      return "🧾";
    case "expense_paid":
      return "💸";
    case "retirement_withdrawal":
      return "🏦";
    case "withdrawal_strategy_selected":
      return "🎯";
    case "loan_payment":
      return "🏠";
    case "investment_contribution":
    case "investment_growth":
      return "📈";
    case "super_contribution":
    case "super_growth":
      return "🎯";
    case "offset_transfer":
      return "💳";
    case "warning":
      return "⚠️";
    case "decision":
      return "🤔";
    case "state_snapshot":
      return "📊";
    default:
      return "•";
  }
}

/**
 * Format event data for display
 */
function formatEventData(event: AnySimulationEvent): string | null {
  switch (event.type) {
    case "retirement_withdrawal":
      return `Investments: $${event.data.fromInvestments}, Super: $${event.data.fromSuper}, Total: $${event.data.totalWithdrawn}`;

    case "withdrawal_strategy_selected":
      return `Strategy: ${event.data.strategy}, Eligible for Super: ${event.data.eligibleForSuper}, Ages: ${event.data.ages}`;

    case "decision":
      return `Decision: ${event.data.decision}, Reason: ${event.data.reason}`;

    default:
      return null;
  }
}
