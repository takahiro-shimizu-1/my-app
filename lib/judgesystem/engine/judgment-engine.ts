/**
 * Judgment Engine
 *
 * Core orchestrator that evaluates all requirement types for a given
 * company × office × announcement combination.
 *
 * Design principles:
 * - Stateless: all state passed via parameters
 * - Pluggable: evaluators injected via EvaluatorRegistry
 * - Batchable: processes multiple targets in parallel-ready chunks
 * - Observable: emits structured results for each evaluation
 */

import { randomUUID } from "crypto";
import type {
  EvaluationTarget,
  Requirement,
  RequirementType,
  EvaluationSummary,
  RequirementJudgment,
  SufficientRequirement,
  InsufficientRequirement,
  MasterData,
} from "@/lib/judgesystem/domain/types";
import type { EvaluatorRegistry } from "@/lib/judgesystem/evaluators/registry";
import type { EvaluatorContext } from "@/lib/judgesystem/evaluators/base";

// Re-import the actual values (not just types)
const REQUIREMENT_TYPE_LOOKUP: Record<string, RequirementType> = {
  "欠格要件": "ineligibility",
  "業種・等級要件": "gradeItem",
  "所在地要件": "location",
  "実績要件": "experience",
  "技術者要件": "technician",
};

const REQUIREMENT_FIELD_LOOKUP: Record<string, keyof EvaluationSummary> = {
  ineligibility: "requirementIneligibility",
  gradeItem: "requirementGradeItem",
  location: "requirementLocation",
  experience: "requirementExperience",
  technician: "requirementTechnician",
};

export interface JudgmentResult {
  readonly summary: EvaluationSummary;
  readonly judgments: RequirementJudgment[];
  readonly sufficient: SufficientRequirement[];
  readonly insufficient: InsufficientRequirement[];
}

export interface BatchResult {
  readonly results: JudgmentResult[];
  readonly totalTargets: number;
  readonly passCount: number;
  readonly failCount: number;
}

export class JudgmentEngine {
  constructor(private readonly registry: EvaluatorRegistry) {}

  /**
   * Evaluate a single target (company × office) against all requirements
   * for an announcement.
   */
  evaluateTarget(
    target: EvaluationTarget,
    requirements: Requirement[],
    masterData: MasterData
  ): JudgmentResult {
    const evaluationNo = randomUUID();
    const now = new Date();
    const judgments: RequirementJudgment[] = [];
    const sufficient: SufficientRequirement[] = [];
    const insufficient: InsufficientRequirement[] = [];

    // Initialize summary with all requirements passing by default
    const summaryFlags: Record<string, boolean> = {
      requirementIneligibility: true,
      requirementGradeItem: true,
      requirementLocation: true,
      requirementExperience: true,
      requirementTechnician: true,
      requirementOther: true,
    };
    const deficitMessages: string[] = [];

    for (const requirement of requirements) {
      const reqType = REQUIREMENT_TYPE_LOOKUP[requirement.requirementType];
      const evaluator = reqType ? this.registry.get(reqType) : undefined;

      const ctx: EvaluatorContext = {
        requirementText: requirement.requirementText,
        companyNo: target.companyNo,
        officeNo: target.officeNo,
        masterData,
      };

      const result = evaluator
        ? evaluator.evaluate(ctx)
        : { isOk: false, reason: "その他要件があります。確認してください" };

      judgments.push({
        evaluationNo,
        requirementNo: requirement.requirementNo,
        companyNo: target.companyNo,
        officeNo: target.officeNo,
        requirementType: reqType ?? "ineligibility",
        isOk: result.isOk,
        result: result.reason,
      });

      if (result.isOk) {
        sufficient.push({
          sufficiencyDetailNo: randomUUID(),
          evaluationNo,
          announcementNo: target.announcementNo,
          requirementNo: requirement.requirementNo,
          companyNo: target.companyNo,
          officeNo: target.officeNo,
          requirementType: reqType ?? "ineligibility",
          requirementDescription: result.reason,
          createdDate: now,
          updatedDate: now,
        });
      } else {
        insufficient.push({
          shortageDetailNo: randomUUID(),
          evaluationNo,
          announcementNo: target.announcementNo,
          requirementNo: requirement.requirementNo,
          companyNo: target.companyNo,
          officeNo: target.officeNo,
          requirementType: reqType ?? "ineligibility",
          requirementDescription: result.reason,
          suggestionsForImprovement: "",
          finalComment: "",
          createdDate: now,
          updatedDate: now,
        });

        // Mark the corresponding requirement type as failed
        const fieldName = reqType
          ? REQUIREMENT_FIELD_LOOKUP[reqType]
          : "requirementOther";
        if (fieldName) {
          summaryFlags[fieldName as string] = false;
        }
        deficitMessages.push(result.reason);
      }
    }

    const finalStatus = Object.values(summaryFlags).every(Boolean);

    const summary: EvaluationSummary = {
      evaluationNo,
      announcementNo: target.announcementNo,
      companyNo: target.companyNo,
      officeNo: target.officeNo,
      requirementIneligibility: summaryFlags.requirementIneligibility,
      requirementGradeItem: summaryFlags.requirementGradeItem,
      requirementLocation: summaryFlags.requirementLocation,
      requirementExperience: summaryFlags.requirementExperience,
      requirementTechnician: summaryFlags.requirementTechnician,
      requirementOther: summaryFlags.requirementOther,
      deficitRequirementMessage: deficitMessages.join("; "),
      finalStatus,
      message: finalStatus ? "全要件充足" : "不足要件あり",
      remarks: "",
      createdDate: now,
      updatedDate: now,
    };

    return { summary, judgments, sufficient, insufficient };
  }

  /**
   * Evaluate a batch of targets. Groups requirements by announcement
   * for efficient lookup.
   */
  evaluateBatch(
    targets: EvaluationTarget[],
    requirements: Requirement[],
    masterData: MasterData
  ): BatchResult {
    // Group requirements by announcement for O(1) lookup
    const requirementsByAnnouncement = new Map<string, Requirement[]>();
    for (const req of requirements) {
      const existing = requirementsByAnnouncement.get(req.announcementNo) ?? [];
      existing.push(req);
      requirementsByAnnouncement.set(req.announcementNo, existing);
    }

    const results: JudgmentResult[] = [];
    let passCount = 0;
    let failCount = 0;

    for (const target of targets) {
      const announcementReqs =
        requirementsByAnnouncement.get(target.announcementNo) ?? [];

      if (announcementReqs.length === 0) continue;

      const result = this.evaluateTarget(target, announcementReqs, masterData);
      results.push(result);

      if (result.summary.finalStatus) {
        passCount++;
      } else {
        failCount++;
      }
    }

    return { results, totalTargets: targets.length, passCount, failCount };
  }
}
