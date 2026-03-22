/**
 * 欠格要件チェッカー
 *
 * Checks disqualification requirements against company data.
 * Ported from: source/bid_announcement_judgement_tools/requirements/ineligibility.py
 */

import type { JudgmentResult } from "@/lib/domain/types";
import type { RequirementChecker, CheckerContext, CheckerDataSources } from "../types";

export class IneligibilityChecker implements RequirementChecker {
  readonly type = "ineligibility" as const;

  check(context: CheckerContext, data: CheckerDataSources): JudgmentResult {
    const { requirementText, companyNo, officeNo } = context;
    const { company, officeRegistrationAuthorization } = data;

    if (!company) {
      return {
        isOk: false,
        reason: `欠格要件：企業No=${companyNo}が見つからない`,
        requirementType: this.type,
      };
    }

    // 拠点指名停止チェック
    if (officeRegistrationAuthorization?.isSuspended) {
      return {
        isOk: false,
        reason: `欠格要件：拠点No=${officeNo}は指名停止中`,
        requirementType: this.type,
      };
    }

    // 70条チェック（破産/暴力団/成年後見等）
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
          requirementType: this.type,
        };
      }
      return { isOk: true, reason: "欠格要件：70条OK", requirementType: this.type };
    }

    // 71条チェック
    if (/71条/.test(requirementText)) {
      if (company.article71Flag) {
        return {
          isOk: false,
          reason: "欠格要件：71条NG(71条該当フラグ)",
          requirementType: this.type,
        };
      }
      return { isOk: true, reason: "欠格要件：71条OK", requirementType: this.type };
    }

    // 破産/倒産チェック
    if (/破産|倒産/.test(requirementText)) {
      if (company.bankruptcyFlag) {
        return {
          isOk: false,
          reason: "欠格要件：破産NG(破産フラグ)",
          requirementType: this.type,
        };
      }
      return { isOk: true, reason: "欠格要件：破産OK", requirementType: this.type };
    }

    // 会社更生/民事再生チェック
    if (/会社更生|民事再生|更生法|再生手続/.test(requirementText)) {
      if (
        company.corporateReorganizationFlag &&
        !company.postReorganizationReacquisitionDate
      ) {
        return {
          isOk: false,
          reason: "欠格要件：更生/再生NG(再取得なし)",
          requirementType: this.type,
        };
      }
      return { isOk: true, reason: "欠格要件：更生/再生OK", requirementType: this.type };
    }

    // 暴力団チェック
    if (/暴力団|反社/.test(requirementText)) {
      if (company.antiSocialForcesFlag) {
        return {
          isOk: false,
          reason: "欠格要件：反社NG(反社フラグ)",
          requirementType: this.type,
        };
      }
      return { isOk: true, reason: "欠格要件：反社OK", requirementType: this.type };
    }

    // 社会保険チェック
    if (/社会保険|健康保険|厚生年金|雇用保険/.test(requirementText)) {
      if (!company.noSocialInsuranceArrearsFlag) {
        return {
          isOk: false,
          reason: "欠格要件：社会保険NG(滞納あり)",
          requirementType: this.type,
        };
      }
      return { isOk: true, reason: "欠格要件：社会保険OK", requirementType: this.type };
    }

    // 情報セキュリティチェック
    if (/情報セキュリティ|ISMS|ISO27001/.test(requirementText)) {
      if (!company.informationSecurityFrameworkFlag) {
        return {
          isOk: false,
          reason: "欠格要件：情報セキュリティNG(未認証)",
          requirementType: this.type,
        };
      }
      return {
        isOk: true,
        reason: "欠格要件：情報セキュリティOK",
        requirementType: this.type,
      };
    }

    // 日銀取引停止チェック
    if (/日銀|取引停止/.test(requirementText)) {
      if (company.bojTransactionSuspensionFlag) {
        return {
          isOk: false,
          reason: "欠格要件：日銀取引停止NG",
          requirementType: this.type,
        };
      }
      return { isOk: true, reason: "欠格要件：日銀取引停止OK", requirementType: this.type };
    }

    // 外国法チェック
    if (/外国|海外法人/.test(requirementText)) {
      if (company.foreignLegalRestrictionFlag) {
        return {
          isOk: false,
          reason: "欠格要件：外国法NG",
          requirementType: this.type,
        };
      }
      return { isOk: true, reason: "欠格要件：外国法OK", requirementType: this.type };
    }

    // デフォルト：全フラグ総合チェック
    const hasAnyDisqualification =
      company.article70Flag ||
      company.article71Flag ||
      company.bankruptcyFlag ||
      company.antiSocialForcesFlag ||
      company.adultWardFlag ||
      company.bojTransactionSuspensionFlag ||
      (company.corporateReorganizationFlag &&
        !company.postReorganizationReacquisitionDate);

    if (hasAnyDisqualification) {
      return {
        isOk: false,
        reason: "欠格要件：総合チェックNG",
        requirementType: this.type,
      };
    }

    return { isOk: true, reason: "欠格要件：総合チェックOK", requirementType: this.type };
  }
}
