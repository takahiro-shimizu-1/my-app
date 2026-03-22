/**
 * 実績要件チェッカー
 *
 * Checks experience/track record requirements against work achievements.
 * Ported from: source/bid_announcement_judgement_tools/requirements/experience.py
 */

import type { JudgmentResult } from "@/lib/domain/types";
import type { RequirementChecker, CheckerContext, CheckerDataSources } from "../types";

/** Parse Japanese fiscal year references from requirement text */
function parseFiscalYearFrom(text: string): number | null {
  // 令和
  const reiwaMatch = text.match(/令和(\d+)年/);
  if (reiwaMatch) return 2018 + parseInt(reiwaMatch[1], 10);

  // 平成
  const heiseiMatch = text.match(/平成(\d+)年/);
  if (heiseiMatch) return 1988 + parseInt(heiseiMatch[1], 10);

  // 西暦
  const yearMatch = text.match(/(20\d{2})年/);
  if (yearMatch) return parseInt(yearMatch[1], 10);

  return null;
}

/** Parse contractor layer requirement */
function parseContractorLayer(text: string): string | null {
  if (/元請/.test(text)) return "元請";
  if (/一次/.test(text)) return "一次下請";
  if (/二次/.test(text)) return "二次下請";
  return null;
}

/** Parse minimum JV ratio */
function parseJvRatio(text: string): number | null {
  const match = text.match(/(\d+)[%％]以上/);
  if (match) return parseInt(match[1], 10);
  return null;
}

/** Parse minimum construction score */
function parseMinScore(text: string): number | null {
  const match = text.match(/(\d+)点以上/);
  if (match) return parseInt(match[1], 10);
  return null;
}

export class ExperienceChecker implements RequirementChecker {
  readonly type = "experience" as const;

  check(context: CheckerContext, data: CheckerDataSources): JudgmentResult {
    const { requirementText, companyNo, officeNo } = context;
    const { workAchievements } = data;

    if (workAchievements.length === 0) {
      return {
        isOk: false,
        reason: `実績要件：企業No=${companyNo},拠点No=${officeNo}の工事実績なし`,
        requirementType: this.type,
      };
    }

    let filtered = [...workAchievements];

    // Filter by fiscal year
    const fiscalYearFrom = parseFiscalYearFrom(requirementText);
    if (fiscalYearFrom !== null) {
      filtered = filtered.filter((wa) => wa.fiscalYear >= fiscalYearFrom);
      if (filtered.length === 0) {
        return {
          isOk: false,
          reason: `実績要件：${fiscalYearFrom}年度以降の実績なし`,
          requirementType: this.type,
        };
      }
    }

    // Filter by contractor layer
    const requiredLayer = parseContractorLayer(requirementText);
    if (requiredLayer !== null) {
      filtered = filtered.filter((wa) => wa.contractorLayer === requiredLayer);
      if (filtered.length === 0) {
        return {
          isOk: false,
          reason: `実績要件：${requiredLayer}としての実績なし`,
          requirementType: this.type,
        };
      }
    }

    // Check JV ratio
    const minJvRatio = parseJvRatio(requirementText);
    if (minJvRatio !== null) {
      filtered = filtered.filter(
        (wa) => wa.jvRatio !== undefined && wa.jvRatio >= minJvRatio
      );
      if (filtered.length === 0) {
        return {
          isOk: false,
          reason: `実績要件：JV比率${minJvRatio}%以上の実績なし`,
          requirementType: this.type,
        };
      }
    }

    // Check construction score
    const minScore = parseMinScore(requirementText);
    if (minScore !== null) {
      const qualifyingAchievements = filtered.filter(
        (wa) => wa.constructionScore !== undefined && wa.constructionScore >= minScore
      );
      if (qualifyingAchievements.length === 0) {
        // Check average score
        const scores = filtered
          .map((wa) => wa.constructionScore)
          .filter((s): s is number => s !== undefined);
        if (scores.length > 0) {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          if (avg < minScore) {
            return {
              isOk: false,
              reason: `実績要件：工事成績${minScore}点以上の実績なし（平均${avg.toFixed(1)}点）`,
              requirementType: this.type,
            };
          }
        } else {
          return {
            isOk: false,
            reason: `実績要件：工事成績点数の記録なし`,
            requirementType: this.type,
          };
        }
      }
    }

    return {
      isOk: true,
      reason: "実績要件：条件充足",
      requirementType: this.type,
      details: { matchingAchievements: filtered.length },
    };
  }
}
