/**
 * Projection system exports
 */

// Builders
export {
  FinancialProjectionBuilder,
  TimelineProjectionBuilder,
  MilestoneProjectionBuilder,
  ProjectionBuilderFactory,
} from "./projection-builder.ts";

// Store
export { InMemoryProjectionStore } from "./projection-store.ts";

// Service
export { 
  ProjectionService,
  createProjectionService,
  type ProjectionServiceConfig 
} from "./projection-service.ts";

// Re-export interfaces
export type {
  ProjectionBuilder,
  FinancialProjection,
  TimelineProjection,
  MilestoneProjection,
  ProjectionStore,
  Projection,
} from "../interfaces/projections.ts";