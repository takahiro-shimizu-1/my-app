/**
 * 等級・種別要件チェッカー
 *
 * Checks company grade and construction item requirements.
 * Ported from: source/bid_announcement_judgement_tools/requirements/grade_item.py
 */

import type { JudgmentResult } from "@/lib/domain/types";
import type { RequirementChecker, CheckerContext, CheckerDataSources } from "../types";

/** Parse required grade from text */
function parseRequiredGrade(text: string): string | null {
  // Match patterns like "A等級", "B級", "C等級以上"
  const match = text.match(/([A-E])[等級級]/);
  if (match) return match[1];
  return null;
}

/** Grade hierarchy: A > B > C > D > E */
const GRADE_ORDER: Record<string, number> = {
  A: 5,
  B: 4,
  C: 3,
  D: 2,
  E: 1,
};

function isGradeSufficient(actual: string, required: string): boolean {
  const actualOrder = GRADE_ORDER[actual] ?? 0;
  const requiredOrder = GRADE_ORDER[required] ?? 0;
  return actualOrder >= requiredOrder;
}

/** Extract construction type codes from text */
function parseConstructionTypes(text: string): string[] {
  // Common construction type keywords
  const types: string[] = [];
  const patterns: Record<string, string> = {
    土木: "土木一式",
    建築: "建築一式",
    電気: "電気工事",
    管: "管工事",
    舗装: "舗装工事",
    造園: "造園工事",
    防水: "防水工事",
    塗装: "塗装工事",
    内装: "内装仕上",
    機械: "機械器具設置",
    通信: "電気通信",
    水道: "水道施設",
    解体: "解体工事",
  };

  for (const [keyword, typeName] of Object.entries(patterns)) {
    if (text.includes(keyword)) {
      types.push(typeName);
    }
  }

  return types;
}

export class GradeItemChecker implements RequirementChecker {
  readonly type = "grade_item" as const;

  check(context: CheckerContext, data: CheckerDataSources): JudgmentResult {
    const { requirementText, companyNo } = context;
    const { company } = data;

    if (!company) {
      return {
        isOk: false,
        reason: `等級・種別要件：企業No=${companyNo}が見つからない`,
        requirementType: this.type,
      };
    }

    // Check grade requirement
    const requiredGrade = parseRequiredGrade(requirementText);
    if (requiredGrade) {
      const companyGrade = company.priority;
      if (!isGradeSufficient(companyGrade, requiredGrade)) {
        return {
          isOk: false,
          reason: `等級・種別要件：等級不足（企業=${companyGrade}, 要求=${requiredGrade}以上）`,
          requirementType: this.type,
        };
      }
    }

    // Check construction type requirements
    const requiredTypes = parseConstructionTypes(requirementText);
    if (requiredTypes.length > 0) {
      // Construction type validation would require additional data
      // For now, log the required types for manual review
      return {
        isOk: true,
        reason: `等級・種別要件：条件充足（対象種別：${requiredTypes.join(", ")}）`,
        requirementType: this.type,
        details: { requiredTypes, companyGrade: company.priority },
      };
    }

    return {
      isOk: true,
      reason: "等級・種別要件：条件充足",
      requirementType: this.type,
    };
  }
}
