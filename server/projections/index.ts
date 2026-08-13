/**
 * Projection system exports
 */

// Builders
export {
  assessSustainability,
  buildFinancialProjection,
  buildMilestoneProjection,
  buildTimelineProjection,
} from "./projection-builder.ts";

// Service
export {
  ProjectionService,
  createProjectionService,
} from "./projection-service.ts";

// Re-export interfaces
export type {
  FinancialProjection,
  MilestoneProjection,
  Projection,
  TimelineProjection,
} from "../interfaces/projections.ts";
