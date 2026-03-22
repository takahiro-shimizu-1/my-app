/**
 * Judgment Pipeline
 *
 * Orchestrates the execution of requirement checkers for each
 * (announcement, company, office) combination.
 *
 * Key improvements over the original monolithic main.py:
 * - Stateless, composable checkers via Strategy pattern
 * - Lazy data loading - only fetches what each checker needs
 * - Batch processing with configurable concurrency
 * - Clear separation of orchestration from business logic
 */

import { randomUUID } from "crypto";
import type {
  RequirementType,
  Requirement,
  JudgmentResult,
  EvaluationResult,
  SufficientRequirement,
  InsufficientRequirement,
} from "@/lib/domain/types";
import type {
  RequirementChecker,
  CheckerContext,
  PipelineConfig,
} from "./types";
import type { DataSourceProvider } from "./data-source-provider";

import {
  IneligibilityChecker,
  ExperienceChecker,
  LocationChecker,
  GradeItemChecker,
  TechnicianChecker,
} from "./checkers";

/**
 * Create default pipeline configuration with all standard checkers.
 */
export function createDefaultConfig(): PipelineConfig {
  return {
    checkers: [
      new IneligibilityChecker(),
      new ExperienceChecker(),
      new LocationChecker(),
      new GradeItemChecker(),
      new TechnicianChecker(),
    ],
    concurrency: 10,
    batchSize: 50,
  };
}

/**
 * Input for a single evaluation: one (announcement, company, office) combination.
 */
export interface EvaluationInput {
  announcementNo: string;
  companyNo: string;
  officeNo: string;
  requirements: Requirement[];
}

/**
 * Run the judgment pipeline for a single evaluation.
 */
export async function evaluateSingle(
  input: EvaluationInput,
  dataProvider: DataSourceProvider,
  config: PipelineConfig
): Promise<EvaluationResult> {
  const { announcementNo, companyNo, officeNo, requirements } = input;
  const evaluationNo = randomUUID();

  // Load data sources lazily (shared across all checkers for this evaluation)
  const dataSources = await dataProvider.loadForEvaluation(companyNo, officeNo);

  // Build checker map for O(1) lookup
  const checkerMap = new Map<RequirementType, RequirementChecker>();
  for (const checker of config.checkers) {
    checkerMap.set(checker.type, checker);
  }

  // Run each requirement through its corresponding checker
  const results: JudgmentResult[] = [];
  const sufficient: SufficientRequirement[] = [];
  const insufficient: InsufficientRequirement[] = [];

  for (const req of requirements) {
    const checker = checkerMap.get(req.requirementType);
    if (!checker) {
      results.push({
        isOk: false,
        reason: `未対応の要件タイプ: ${req.requirementType}`,
        requirementType: req.requirementType,
      });
      continue;
    }

    // Skip OCR-failed requirements
    if (req.isOcrFailed) {
      results.push({
        isOk: false,
        reason: `OCR失敗: ${req.requirementType}`,
        requirementType: req.requirementType,
      });
      insufficient.push({
        evaluationNo,
        announcementNo,
        companyNo,
        officeNo,
        requirementNo: req.requirementNo,
        requirementType: req.requirementType,
        suggestionsForImprovement: "OCR再処理が必要",
        finalComment: "OCR処理に失敗したため判定不能",
      });
      continue;
    }

    const context: CheckerContext = {
      requirementText: req.requirementText,
      requirementType: req.requirementType,
      companyNo,
      officeNo,
    };

    const result = checker.check(context, dataSources);
    results.push(result);

    if (result.isOk) {
      sufficient.push({
        evaluationNo,
        announcementNo,
        companyNo,
        officeNo,
        requirementNo: req.requirementNo,
        requirementType: req.requirementType,
      });
    } else {
      insufficient.push({
        evaluationNo,
        announcementNo,
        companyNo,
        officeNo,
        requirementNo: req.requirementNo,
        requirementType: req.requirementType,
        suggestionsForImprovement: "",
        finalComment: result.reason,
      });
    }
  }

  // Aggregate per-type results
  const typeResults = new Map<RequirementType, boolean>();
  for (const r of results) {
    const current = typeResults.get(r.requirementType);
    typeResults.set(r.requirementType, current === undefined ? r.isOk : current && r.isOk);
  }

  const finalStatus = results.length > 0 && results.every((r) => r.isOk);
  const deficitMessages = results
    .filter((r) => !r.isOk)
    .map((r) => r.reason);

  return {
    evaluationNo,
    announcementNo,
    companyNo,
    officeNo,
    requirementIneligibility: typeResults.get("ineligibility") ?? true,
    requirementExperience: typeResults.get("experience") ?? true,
    requirementLocation: typeResults.get("location") ?? true,
    requirementGradeItem: typeResults.get("grade_item") ?? true,
    requirementTechnician: typeResults.get("technician") ?? true,
    finalStatus,
    deficitRequirementMessage: deficitMessages.join("; "),
    sufficientRequirements: sufficient,
    insufficientRequirements: insufficient,
  };
}

/**
 * Run the judgment pipeline for multiple evaluations in batches.
 */
export async function evaluateBatch(
  inputs: EvaluationInput[],
  dataProvider: DataSourceProvider,
  config: PipelineConfig = createDefaultConfig()
): Promise<EvaluationResult[]> {
  const batchSize = config.batchSize ?? 50;
  const results: EvaluationResult[] = [];

  for (let i = 0; i < inputs.length; i += batchSize) {
    const batch = inputs.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((input) => evaluateSingle(input, dataProvider, config))
    );
    results.push(...batchResults);
  }

  return results;
}
