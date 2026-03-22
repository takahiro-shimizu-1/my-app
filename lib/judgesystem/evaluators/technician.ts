/**
 * Technician Evaluator (技術者要件)
 *
 * Validates that a company has employees with required qualifications
 * (licensed engineers, certifications) at the relevant office.
 */

import type { EvaluationResult } from "@/lib/judgesystem/domain/types";
import type { Evaluator, EvaluatorContext } from "./base";

/** Core qualification categories for quick matching */
const QUALIFICATION_KEYWORDS = [
  "監理技術者",
  "主任技術者",
  "1級土木施工管理技士",
  "2級土木施工管理技士",
  "1級建築施工管理技士",
  "2級建築施工管理技士",
  "1級電気工事施工管理技士",
  "1級管工事施工管理技士",
  "1級建築士",
  "2級建築士",
  "技術士",
  "電気主任技術者",
] as const;

function extractRequiredQualifications(text: string): string[] {
  const found: string[] = [];
  for (const keyword of QUALIFICATION_KEYWORDS) {
    if (text.includes(keyword)) {
      found.push(keyword);
    }
  }
  return found;
}

export class TechnicianEvaluator implements Evaluator {
  readonly type = "technician" as const;

  evaluate(ctx: EvaluatorContext): EvaluationResult {
    const { requirementText, companyNo, officeNo, masterData } = ctx;

    // Find employees at this office/company
    const officeEmployees = masterData.employees.filter(
      (e) => e.companyNo === companyNo && e.officeNo === officeNo
    );

    if (officeEmployees.length === 0) {
      return { isOk: false, reason: "技術者要件：該当拠点に従業員データなし" };
    }

    const requiredQualifications = extractRequiredQualifications(requirementText);

    if (requiredQualifications.length === 0) {
      return { isOk: true, reason: "技術者要件：特定資格の指定なし" };
    }

    // Check if any employee has the required qualifications
    const employeeNos = new Set(officeEmployees.map((e) => e.employeeNo));
    const relevantQualifications = masterData.employeeQualifications.filter(
      (q) => employeeNos.has(q.employeeNo)
    );

    const missingQualifications: string[] = [];

    for (const required of requiredQualifications) {
      const hasQualification = relevantQualifications.some((q) =>
        q.qualificationName.includes(required)
      );
      if (!hasQualification) {
        missingQualifications.push(required);
      }
    }

    if (missingQualifications.length === 0) {
      return {
        isOk: true,
        reason: `技術者要件：必要資格(${requiredQualifications.join(",")})をすべて保有`,
      };
    }

    return {
      isOk: false,
      reason: `技術者要件：不足資格(${missingQualifications.join(",")})`,
    };
  }
}
