/**
 * Evaluation data module.
 *
 * Re-exports API functions from data/api/evaluationApi.ts for backwards
 * compatibility. Also provides mock similar-case data for the workflow
 * similar-cases panel.
 *
 * Note: Server-side pagination means full data fetching is handled by
 * useBidListState. Do not add bulk fetch logic here.
 */
import type {
  SimilarCase
} from '../types';

// -- Re-export API functions for backwards compatibility ---------------------
export { updateWorkStatus, updateEvaluationAssignee } from './api/evaluationApi';

// -- Mock data (similar cases) -----------------------------------------------

const similarCaseTemplates = [
  '令和{year}年度{district}地区道路拡幅工事',
  '令和{year}年度{district}橋梁補強工事',
  '{district}市庁舎改修工事（第{num}期）',
  '{district}公園整備工事',
  '令和{year}年度{district}河川護岸修繕工事',
  '{district}学校体育館建設工事',
  '{district}市下水道管渠更新工事',
  '{district}消防署建設工事',
  '令和{year}年度{district}高速道路舗装工事',
  '{district}港湾岸壁補強工事',
  '令和{year}年度{district}トンネル補修工事',
  '{district}浄水場ポンプ更新工事',
  '令和{year}年度{district}堤防補強工事',
  '{district}庁舎空調設備更新工事',
  '令和{year}年度{district}砂防堰堤工事',
  '{district}住宅団地外壁改修工事',
  '令和{year}年度{district}電線共同溝整備工事',
  '{district}文化会館音響設備工事',
  '令和{year}年度{district}急傾斜地対策工事',
  '{district}スポーツセンター建設工事',
];

const districts = [
  '○○', '△△', '□□', '◇◇', '☆☆', '北', '南', '東', '西', '中央',
  '上流', '下流', 'A', 'B', '甲', '乙', '第一', '第二', '本',
];

/** Placeholder company names used by mock similar-case data. */
const placeholderCompanies = [
  '建設A社', '建設B社', '建設C社', '建設D社', '建設E社',
  '建設F社', '建設G社', '建設H社', '建設I社', '建設J社',
  '建設K社', '建設L社', '建設M社', '建設N社', '建設O社',
  '建設P社', '建設Q社', '建設R社', '建設S社', '建設T社',
  '建設U社', '建設V社', '建設W社', '建設X社', '建設Y社',
  '建設Z社', '建設AA社', '建設BB社', '建設CC社', '建設DD社',
];

const generateSimilarCases = (): SimilarCase[] => {
  const cases: SimilarCase[] = [];

  for (let i = 0; i < 50; i++) {
    const template = similarCaseTemplates[i % similarCaseTemplates.length];
    const district = districts[i % districts.length];
    const year = 5 + (i % 3);
    const num = (i % 3) + 1;

    const caseName = template
      .replace('{year}', String(year))
      .replace('{district}', district)
      .replace('{num}', String(num));

    const winningCompany = placeholderCompanies[i % placeholderCompanies.length];
    const winningAmount = (Math.floor(i * 7 + 10) % 90 + 10) * 10000000;

    const competitorCount = 3 + (i % 4);
    const competitors = [winningCompany];
    for (let j = 1; j < competitorCount; j++) {
      const competitor = placeholderCompanies[(i + j * 3) % placeholderCompanies.length];
      if (!competitors.includes(competitor)) {
        competitors.push(competitor);
      }
    }

    cases.push({
      id: `similar-${i + 1}`,
      announcementId: `ann-${i + 1}`,
      similarAnnouncementId: `ann-${((i + 5) % 50) + 1}`,
      caseName,
      winningCompany,
      winningAmount,
      competitors,
    });
  }

  return cases;
};

export const similarCases: SimilarCase[] = generateSimilarCases();

export const getSimilarCases = (count: number = 5): SimilarCase[] => {
  const shuffled = [...similarCases].sort((a, b) => {
    const hashA = a.id.charCodeAt(a.id.length - 1);
    const hashB = b.id.charCodeAt(b.id.length - 1);
    return hashA - hashB;
  });
  return shuffled.slice(0, count);
};
