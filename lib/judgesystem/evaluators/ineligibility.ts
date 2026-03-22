/**
 * Ineligibility Evaluator (欠格要件)
 *
 * Checks company-level disqualification criteria:
 * - Article 70/71 violations
 * - Bankruptcy, reorganization
 * - Anti-social forces, terrorism
 * - Social insurance arrears
 * - Office suspension status
 */

import type { EvaluationResult } from "@/lib/judgesystem/domain/types";
import type { Evaluator, EvaluatorContext } from "./base";

export class IneligibilityEvaluator implements Evaluator {
  readonly type = "ineligibility" as const;

  evaluate(ctx: EvaluatorContext): EvaluationResult {
    const { requirementText, companyNo, officeNo, masterData } = ctx;

    const company = masterData.companies.find((c) => c.companyNo === companyNo);
    if (!company) {
      return { isOk: false, reason: `欠格要件：企業No=${companyNo}が見つからない` };
    }

    // Article 70 check
    if (/70条/.test(requirementText)) {
      if (
        company.article70Flag ||
        company.bankruptcyFlag ||
        company.antiSocialForcesFlag ||
        company.adultWardFlag
      ) {
        return {
          isOk: false,
          reason: "欠格要件：70条NG(破産/暴力団/成年後見等フラグ)",
        };
      }
      return { isOk: true, reason: "欠格要件：70条OK" };
    }

    // Article 71 check
    if (/71条/.test(requirementText)) {
      if (company.article71Flag) {
        return { isOk: false, reason: "欠格要件：71条NG" };
      }
      return { isOk: true, reason: "欠格要件：71条OK" };
    }

    // Bankruptcy check
    if (/破産|倒産/.test(requirementText)) {
      if (company.bankruptcyFlag) {
        return { isOk: false, reason: "欠格要件：破産フラグNG" };
      }
    }

    // Corporate reorganization check
    if (/再生|更生/.test(requirementText)) {
      if (company.corporateReorganizationFlag) {
        if (company.postReorganizationReacquisitionDate) {
          return { isOk: true, reason: "欠格要件：再生手続済（再取得済）" };
        }
        return { isOk: false, reason: "欠格要件：再生/更生手続中" };
      }
    }

    // Anti-social forces
    if (/暴力団|反社/.test(requirementText)) {
      if (company.antiSocialForcesFlag) {
        return { isOk: false, reason: "欠格要件：反社会的勢力該当" };
      }
    }

    // Social insurance
    if (/社会保険/.test(requirementText)) {
      if (!company.noSocialInsuranceArrearsFlag) {
        return { isOk: false, reason: "欠格要件：社会保険未納" };
      }
    }

    // Office suspension check
    if (/指名停止/.test(requirementText)) {
      const auth = masterData.officeRegistrationAuthorizations.find(
        (a) => a.officeNo === officeNo
      );
      if (auth?.isSuspended) {
        return { isOk: false, reason: "欠格要件：拠点が指名停止中" };
      }
    }

    // Foreign legal restriction
    if (/外国/.test(requirementText)) {
      if (company.foreignLegalRestrictionFlag) {
        return { isOk: false, reason: "欠格要件：外国法令制限該当" };
      }
    }

    // Subversive organization
    if (/破壊活動/.test(requirementText)) {
      if (company.subversiveOrganizationFlag) {
        return { isOk: false, reason: "欠格要件：破壊活動防止法該当" };
      }
    }

    // BOJ transaction suspension
    if (/取引停止/.test(requirementText)) {
      if (company.bojTransactionSuspensionFlag) {
        return { isOk: false, reason: "欠格要件：銀行取引停止該当" };
      }
    }

    return { isOk: true, reason: "欠格要件：該当なし" };
  }
}
