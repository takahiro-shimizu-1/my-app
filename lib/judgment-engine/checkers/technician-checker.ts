/**
 * 技術者要件チェッカー
 *
 * Checks technician/qualification requirements.
 * Ported from: source/bid_announcement_judgement_tools/requirements/technician.py
 */

import type { JudgmentResult } from "@/lib/domain/types";
import type { RequirementChecker, CheckerContext, CheckerDataSources } from "../types";

/** Known qualification patterns */
const QUALIFICATION_PATTERNS: Record<string, RegExp> = {
  "1級建築士": /1級建築士|一級建築士/,
  "2級建築士": /2級建築士|二級建築士/,
  "1級建築施工管理技士": /1級建築施工管理|一級建築施工管理/,
  "1級土木施工管理技士": /1級土木施工管理|一級土木施工管理/,
  "1級電気工事施工管理技士": /1級電気工事施工管理|一級電気工事施工管理/,
  "1級管工事施工管理技士": /1級管工事施工管理|一級管工事施工管理/,
  技術士: /技術士/,
  監理技術者: /監理技術者/,
  主任技術者: /主任技術者/,
};

/** Extract required qualifications from text */
function extractRequiredQualifications(text: string): string[] {
  const required: string[] = [];
  for (const [name, pattern] of Object.entries(QUALIFICATION_PATTERNS)) {
    if (pattern.test(text)) {
      required.push(name);
    }
  }
  return required;
}

export class TechnicianChecker implements RequirementChecker {
  readonly type = "technician" as const;

  check(context: CheckerContext, data: CheckerDataSources): JudgmentResult {
    const { requirementText, companyNo, officeNo } = context;
    const { employees, employeeQualifications } = data;

    if (employees.length === 0) {
      return {
        isOk: false,
        reason: `技術者要件：企業No=${companyNo},拠点No=${officeNo}に技術者なし`,
        requirementType: this.type,
      };
    }

    // Extract required qualifications from requirement text
    const requiredQualNames = extractRequiredQualifications(requirementText);

    if (requiredQualNames.length === 0) {
      // No specific qualification identified in text
      return {
        isOk: true,
        reason: "技術者要件：特定資格要件なし（技術者在籍確認済）",
        requirementType: this.type,
        details: { employeeCount: employees.length },
      };
    }

    // Build a set of qualification names held by employees at this office
    const employeeNos = new Set(employees.map((e) => e.employeeNo));
    const heldQualifications = new Set(
      employeeQualifications
        .filter((eq) => employeeNos.has(eq.employeeNo))
        .map((eq) => eq.qualificationName)
    );

    // Check each required qualification
    const unmetQualifications: string[] = [];
    for (const reqQual of requiredQualNames) {
      // Check by name match (fuzzy)
      const hasQual = Array.from(heldQualifications).some((held) =>
        held.includes(reqQual) || reqQual.includes(held)
      );

      if (!hasQual) {
        unmetQualifications.push(reqQual);
      }
    }

    if (unmetQualifications.length > 0) {
      return {
        isOk: false,
        reason: `技術者要件：不足資格（${unmetQualifications.join(", ")}）`,
        requirementType: this.type,
        details: {
          requiredQualifications: requiredQualNames,
          unmetQualifications,
          heldQualifications: Array.from(heldQualifications),
        },
      };
    }

    return {
      isOk: true,
      reason: `技術者要件：条件充足（${requiredQualNames.join(", ")}）`,
      requirementType: this.type,
      details: {
        requiredQualifications: requiredQualNames,
        employeeCount: employees.length,
      },
    };
  }
}
