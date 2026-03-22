/**
 * judgesystem - Scalable Bid Announcement Judgment System
 *
 * Public API surface for the judgment engine.
 */

// Domain types
export type {
  EvaluationResult,
  RequirementJudgment,
  EvaluationSummary,
  SufficientRequirement,
  InsufficientRequirement,
  RequirementType,
  Announcement,
  Requirement,
  Company,
  Office,
  Agency,
  MasterData,
  EvaluationTarget,
} from "./domain/types";

export {
  REQUIREMENT_TYPES,
  REQUIREMENT_TYPE_MAP,
  REQUIREMENT_FIELD_MAP,
} from "./domain/types";

// Evaluators
export {
  type Evaluator,
  type EvaluatorContext,
  EvaluatorRegistry,
  createDefaultRegistry,
} from "./evaluators";

// Engine
export {
  JudgmentEngine,
  type JudgmentResult,
  type BatchResult,
} from "./engine/judgment-engine";

// Repositories
export type { RepositorySet } from "./repositories";
export { createInMemoryRepositorySet } from "./repositories";
