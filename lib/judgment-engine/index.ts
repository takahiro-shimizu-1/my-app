/**
 * Judgment Engine - Public API
 *
 * Usage:
 *   import { createDefaultConfig, evaluateBatch } from "@/lib/judgment-engine";
 *   import { PostgresDataSourceProvider } from "@/lib/infrastructure/database/postgres-data-source-provider";
 *
 *   const config = createDefaultConfig();
 *   const provider = new PostgresDataSourceProvider(pool);
 *   const results = await evaluateBatch(inputs, provider, config);
 */

export { createDefaultConfig, evaluateSingle, evaluateBatch } from "./pipeline";
export type { EvaluationInput } from "./pipeline";
export type { DataSourceProvider } from "./data-source-provider";
export { InMemoryDataSourceProvider } from "./data-source-provider";
export type {
  RequirementChecker,
  CheckerContext,
  CheckerDataSources,
  PipelineConfig,
} from "./types";

// Re-export individual checkers for custom pipeline configuration
export {
  IneligibilityChecker,
  ExperienceChecker,
  LocationChecker,
  GradeItemChecker,
  TechnicianChecker,
} from "./checkers";
