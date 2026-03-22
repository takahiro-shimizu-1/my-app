/**
 * Experience Evaluator (実績要件)
 *
 * Evaluates whether a company's office has sufficient work experience
 * (completed projects) matching the announcement requirements.
 */

import type { EvaluationResult, OfficeWorkAchievement } from "@/lib/judgesystem/domain/types";
import type { Evaluator, EvaluatorContext } from "./base";

interface ExperienceConditions {
  yearFrom: number | null;
  requiredContractorLayer: string | null;
  requiresOriginalContractor: boolean;
  minAmount: number | null;
  minScore: number | null;
  requiredConstructionType: string | null;
  requiredAgencyNo: string | null;
}

function extractExperienceConditions(text: string): ExperienceConditions {
  const conditions: ExperienceConditions = {
    yearFrom: null,
    requiredContractorLayer: null,
    requiresOriginalContractor: false,
    minAmount: null,
    minScore: null,
    requiredConstructionType: null,
    requiredAgencyNo: null,
  };

  // Year condition: 令和X年度以降 or 平成X年度以降
  const reiwaMatch = text.match(/令和(\d+)年度以降/);
  if (reiwaMatch) {
    conditions.yearFrom = 2018 + parseInt(reiwaMatch[1], 10);
  }
  const heiseiMatch = text.match(/平成(\d+)年度以降/);
  if (heiseiMatch) {
    conditions.yearFrom = 1988 + parseInt(heiseiMatch[1], 10);
  }

  // Contractor layer
  if (/元請/.test(text)) {
    conditions.requiresOriginalContractor = true;
    conditions.requiredContractorLayer = "元請";
  } else if (/一次/.test(text)) {
    conditions.requiredContractorLayer = "一次下請";
  }

  // Minimum amount
  const amountMatch = text.match(/(\d[\d,]*)万円以上/);
  if (amountMatch) {
    conditions.minAmount = parseInt(amountMatch[1].replace(/,/g, ""), 10) * 10000;
  }

  // Minimum score
  const scoreMatch = text.match(/(\d+)点以上/);
  if (scoreMatch) {
    conditions.minScore = parseInt(scoreMatch[1], 10);
  }

  return conditions;
}

function matchesConditions(
  achievement: OfficeWorkAchievement,
  conditions: ExperienceConditions
): { matches: boolean; reason: string } {
  // Year check
  if (conditions.yearFrom && achievement.completionDate) {
    const completionYear = new Date(achievement.completionDate).getFullYear();
    if (completionYear < conditions.yearFrom) {
      return { matches: false, reason: `完了年度(${completionYear})が要件年度(${conditions.yearFrom})より前` };
    }
  }

  // Contractor layer check
  if (conditions.requiredContractorLayer) {
    if (achievement.contractorLayer !== conditions.requiredContractorLayer) {
      return { matches: false, reason: `請負階層(${achievement.contractorLayer})が要件(${conditions.requiredContractorLayer})と不一致` };
    }
  }

  // Amount check
  if (conditions.minAmount != null) {
    if (achievement.totalAmount < conditions.minAmount) {
      return { matches: false, reason: `契約金額(${achievement.totalAmount})が最低金額(${conditions.minAmount})未満` };
    }
  }

  // Score check
  if (conditions.minScore != null) {
    if (achievement.finalScore < conditions.minScore) {
      return { matches: false, reason: `工事成績(${achievement.finalScore})が最低点(${conditions.minScore})未満` };
    }
  }

  return { matches: true, reason: "条件充足" };
}

export class ExperienceEvaluator implements Evaluator {
  readonly type = "experience" as const;

  evaluate(ctx: EvaluatorContext): EvaluationResult {
    const { requirementText, officeNo, masterData } = ctx;

    const achievements = masterData.officeWorkAchievements.filter(
      (a) => a.officeNo === officeNo
    );

    if (achievements.length === 0) {
      return { isOk: false, reason: "実績要件：該当拠点の工事実績なし" };
    }

    const conditions = extractExperienceConditions(requirementText);

    const matchingAchievements = achievements.filter(
      (a) => matchesConditions(a, conditions).matches
    );

    if (matchingAchievements.length > 0) {
      return {
        isOk: true,
        reason: `実績要件：${matchingAchievements.length}件の適合実績あり`,
      };
    }

    return {
      isOk: false,
      reason: "実績要件：条件を満たす実績なし",
    };
  }
}
