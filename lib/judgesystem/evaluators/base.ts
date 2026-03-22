/**
 * Evaluator Interface & Base Class
 *
 * Strategy pattern: each requirement type implements this interface.
 * Evaluators are stateless — all data is passed via EvaluatorContext.
 */

import type {
  EvaluationResult,
  RequirementType,
  MasterData,
} from "@/lib/judgesystem/domain/types";

/** Context passed to every evaluator — contains all data needed for judgment */
export interface EvaluatorContext {
  readonly requirementText: string;
  readonly companyNo: string;
  readonly officeNo: string;
  readonly masterData: MasterData;
}

/** Every evaluator must implement this interface */
export interface Evaluator {
  readonly type: RequirementType;
  evaluate(ctx: EvaluatorContext): EvaluationResult;
}
