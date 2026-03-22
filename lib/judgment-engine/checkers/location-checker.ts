/**
 * 所在地要件チェッカー
 *
 * Checks location requirements against office data.
 * Ported from: source/bid_announcement_judgement_tools/requirements/location.py
 */

import type { JudgmentResult } from "@/lib/domain/types";
import type { RequirementChecker, CheckerContext, CheckerDataSources } from "../types";

/** All 47 Japanese prefectures grouped by region */
const REGION_PREFECTURES: Record<string, string[]> = {
  北海道: ["北海道"],
  東北: ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
  関東: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"],
  北陸: ["新潟県", "富山県", "石川県", "福井県"],
  中部: ["山梨県", "長野県", "岐阜県", "静岡県", "愛知県", "三重県"],
  近畿: ["滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"],
  中国: ["鳥取県", "島根県", "岡山県", "広島県", "山口県"],
  四国: ["徳島県", "香川県", "愛媛県", "高知県"],
  九州: [
    "福岡県",
    "佐賀県",
    "長崎県",
    "熊本県",
    "大分県",
    "宮崎県",
    "鹿児島県",
  ],
  沖縄: ["沖縄県"],
};

/** Office type hierarchy */
const OFFICE_TYPE_PATTERNS: Record<string, RegExp> = {
  本社: /本社|本店/,
  支店: /支店/,
  営業所: /営業所/,
  出張所: /出張所/,
};

/** Expand region names in text to prefectures */
function extractRequiredPrefectures(text: string): string[] {
  const prefectures: string[] = [];

  // Check for region names
  for (const [region, prefs] of Object.entries(REGION_PREFECTURES)) {
    if (text.includes(region)) {
      prefectures.push(...prefs);
    }
  }

  // Check for specific prefecture names
  const allPrefectures = Object.values(REGION_PREFECTURES).flat();
  for (const pref of allPrefectures) {
    // Match with or without suffix (県/都/府/道)
    const baseName = pref.replace(/[県都府道]$/, "");
    if (text.includes(baseName) && !prefectures.includes(pref)) {
      prefectures.push(pref);
    }
  }

  return prefectures;
}

/** Extract required office type from text */
function extractRequiredOfficeType(text: string): string | null {
  for (const [type, pattern] of Object.entries(OFFICE_TYPE_PATTERNS)) {
    if (pattern.test(text)) {
      return type;
    }
  }
  return null;
}

export class LocationChecker implements RequirementChecker {
  readonly type = "location" as const;

  check(context: CheckerContext, data: CheckerDataSources): JudgmentResult {
    const { requirementText, officeNo } = context;
    const { office, agencyRegions } = data;

    if (!office) {
      return {
        isOk: false,
        reason: `所在地要件：拠点No=${officeNo}が見つからない`,
        requirementType: this.type,
      };
    }

    // Collect required prefectures from requirement text and agency regions
    const requiredPrefectures = extractRequiredPrefectures(requirementText);

    if (requiredPrefectures.length === 0 && agencyRegions.length > 0) {
      for (const ar of agencyRegions) {
        if (requirementText.includes(ar.regionName)) {
          requiredPrefectures.push(...ar.prefectures);
        }
      }
    }

    // Check office type requirement
    const requiredOfficeType = extractRequiredOfficeType(requirementText);
    if (requiredOfficeType) {
      const pattern = OFFICE_TYPE_PATTERNS[requiredOfficeType];
      if (pattern && !pattern.test(office.officeType)) {
        return {
          isOk: false,
          reason: `所在地要件：${requiredOfficeType}でない（現在：${office.officeType}）`,
          requirementType: this.type,
        };
      }
    }

    // Check prefecture requirement
    if (requiredPrefectures.length > 0) {
      const officePrefecture = office.officePrefecture;
      if (!requiredPrefectures.includes(officePrefecture)) {
        return {
          isOk: false,
          reason: `所在地要件：所在地${officePrefecture}は対象外（対象：${requiredPrefectures.join("/")}）`,
          requirementType: this.type,
          details: { requiredPrefectures, actualPrefecture: officePrefecture },
        };
      }
    }

    return {
      isOk: true,
      reason: "所在地要件：条件充足",
      requirementType: this.type,
    };
  }
}
