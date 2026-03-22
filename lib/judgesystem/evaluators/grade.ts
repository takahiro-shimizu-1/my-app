/**
 * Grade & Item Evaluator (業種・等級要件)
 *
 * Checks whether a company's office has the required grade (A/B/C/D)
 * and construction type registration for the announcement.
 */

import type { EvaluationResult } from "@/lib/judgesystem/domain/types";
import type { Evaluator, EvaluatorContext } from "./base";

const GRADES = ["A", "B", "C", "D"] as const;
type Grade = (typeof GRADES)[number];

function parseGrade(text: string): Grade | null {
  for (const g of GRADES) {
    if (text.includes(g + "等級") || text.includes(g + "級") || text === g) {
      return g;
    }
  }
  return null;
}

function compareGrade(
  licenseGrade: string,
  requiredGrade: string,
  comparison: string
): boolean {
  const licIndex = GRADES.indexOf(licenseGrade as Grade);
  const reqIndex = GRADES.indexOf(requiredGrade as Grade);

  if (licIndex === -1 || reqIndex === -1) return false;

  switch (comparison) {
    case "以上":
      return licIndex <= reqIndex; // A=0 is higher than D=3
    case "以下":
      return licIndex >= reqIndex;
    case "等しい":
      return licIndex === reqIndex;
    default:
      return licIndex <= reqIndex;
  }
}

export class GradeEvaluator implements Evaluator {
  readonly type = "gradeItem" as const;

  evaluate(ctx: EvaluatorContext): EvaluationResult {
    const { requirementText, officeNo, masterData } = ctx;

    // Find office registration/authorization records
    const officeAuths = masterData.officeRegistrationAuthorizations.filter(
      (a) => a.officeNo === officeNo
    );

    if (officeAuths.length === 0) {
      return { isOk: false, reason: "業種・等級要件：拠点の登録情報なし" };
    }

    // Check suspension
    const suspended = officeAuths.some((a) => a.isSuspended);
    if (suspended) {
      return { isOk: false, reason: "業種・等級要件：拠点が指名停止中" };
    }

    // Extract required grade
    const requiredGrade = parseGrade(requirementText);

    if (!requiredGrade) {
      // No specific grade required, just check registration exists
      return { isOk: true, reason: "業種・等級要件：等級指定なし（登録あり）" };
    }

    // Check if any registration matches the required grade
    const comparison = requirementText.includes("以上")
      ? "以上"
      : requirementText.includes("以下")
        ? "以下"
        : "以上";

    const matchingAuth = officeAuths.find((a) =>
      compareGrade(a.grade, requiredGrade, comparison)
    );

    if (matchingAuth) {
      return {
        isOk: true,
        reason: `業種・等級要件：等級${matchingAuth.grade}が要件(${requiredGrade}${comparison})を充足`,
      };
    }

    const availableGrades = [...new Set(officeAuths.map((a) => a.grade))].join(",");
    return {
      isOk: false,
      reason: `業種・等級要件：保有等級(${availableGrades})が要件(${requiredGrade}${comparison})を満たさない`,
    };
  }
}
