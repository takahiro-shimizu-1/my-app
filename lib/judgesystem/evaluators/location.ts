/**
 * Location Evaluator (所在地要件)
 *
 * Checks whether a company's office is located in the required jurisdiction.
 * Maps agency regions to prefectures and validates office location.
 */

import type { EvaluationResult, Agency } from "@/lib/judgesystem/domain/types";
import type { Evaluator, EvaluatorContext } from "./base";

const PREFECTURES = [
  "北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県",
  "静岡県", "愛知県", "三重県", "滋賀県", "京都府", "大阪府", "兵庫県",
  "奈良県", "和歌山県", "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県", "福岡県", "佐賀県", "長崎県",
  "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const;

/** Fallback region → prefectures mapping (defense bureau jurisdictions) */
const REGION_PREFECTURE_MAP: Record<string, readonly string[]> = {
  "北海道防衛局": ["北海道"],
  "帯広防衛支局": ["北海道"],
  "東北防衛局": ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"],
  "北関東防衛局": ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "新潟県", "長野県"],
  "南関東防衛局": ["神奈川県", "山梨県", "静岡県"],
  "東海防衛支局": ["岐阜県", "愛知県", "三重県"],
  "近畿中部防衛局": ["富山県", "石川県", "福井県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県", "愛知県", "岐阜県", "三重県"],
  "中国四国防衛局": ["鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県"],
  "九州防衛局": ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県"],
  "沖縄防衛局": ["沖縄県"],
};

function expandRegionToPrefectures(
  regionName: string,
  agencies: Agency[]
): string[] {
  const agency = agencies.find(
    (a) => a.agencyName === regionName && a.agencyArea
  );
  if (agency?.agencyArea) {
    return agency.agencyArea.split(",").map((s) => s.trim());
  }
  return [...(REGION_PREFECTURE_MAP[regionName] ?? [])];
}

function extractPrefecturesFromText(text: string): string[] {
  return PREFECTURES.filter((p) => text.includes(p));
}

function extractRegionsFromText(
  text: string,
  agencies: Agency[]
): string[] {
  const regionNames = [
    ...agencies.map((a) => a.agencyName),
    ...Object.keys(REGION_PREFECTURE_MAP),
  ];
  const unique = [...new Set(regionNames)];
  return unique.filter((name) => text.includes(name));
}

export class LocationEvaluator implements Evaluator {
  readonly type = "location" as const;

  evaluate(ctx: EvaluatorContext): EvaluationResult {
    const { requirementText, officeNo, masterData } = ctx;

    const office = masterData.offices.find((o) => o.officeNo === officeNo);
    if (!office) {
      return { isOk: false, reason: `所在地要件：拠点No=${officeNo}が見つからない` };
    }

    const officePrefecture = office.locatedPrefecture;
    if (!officePrefecture) {
      return { isOk: false, reason: "所在地要件：拠点の都道府県が未設定" };
    }

    // Extract required prefectures from requirement text
    const requiredPrefectures = extractPrefecturesFromText(requirementText);

    // Extract regions and expand to prefectures
    const regions = extractRegionsFromText(requirementText, masterData.agencies);
    for (const region of regions) {
      const expanded = expandRegionToPrefectures(region, masterData.agencies);
      requiredPrefectures.push(...expanded);
    }

    // Deduplicate
    const uniquePrefectures = [...new Set(requiredPrefectures)];

    if (uniquePrefectures.length === 0) {
      return { isOk: true, reason: "所在地要件：都道府県指定なし（制限なし）" };
    }

    if (uniquePrefectures.includes(officePrefecture)) {
      return {
        isOk: true,
        reason: `所在地要件：${officePrefecture}は対象地域に含まれる`,
      };
    }

    return {
      isOk: false,
      reason: `所在地要件：${officePrefecture}は対象地域(${uniquePrefectures.join(",")})に含まれない`,
    };
  }
}
