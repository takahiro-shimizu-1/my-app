import type { EvaluationStatus, WorkStatus, CompanyPriority } from '../../types';

/** Sort option for partner projects list */
export type SortOption =
  | 'deadline_asc' | 'deadline_desc'
  | 'evaluationStatus_asc' | 'evaluationStatus_desc'
  | 'workStatus_asc' | 'workStatus_desc'
  | 'priority_asc' | 'priority_desc'
  | 'prefecture_asc' | 'prefecture_desc'
  | 'evaluatedAt_asc' | 'evaluatedAt_desc';

/** Filter state for partner projects */
export interface ProjectFilterState {
  workStatuses: WorkStatus[];
  evaluationStatuses: EvaluationStatus[];
  priorities: CompanyPriority[];
  bidTypes: string[];
  categories: string[];
  prefectures: string[];
  organizations: string[];
}

/** Sort field definition */
export const SORT_FIELDS = [
  { field: 'deadline', label: '締切', ascLabel: '近い', descLabel: '遠い' },
  { field: 'evaluationStatus', label: '参加可否', ascLabel: '可能→不可', descLabel: '不可→可能' },
  { field: 'workStatus', label: '着手状況', ascLabel: '未着手→完了', descLabel: '完了→未着手' },
  { field: 'priority', label: '優先度', ascLabel: '高→低', descLabel: '低→高' },
  { field: 'prefecture', label: '都道府県', ascLabel: 'あ→わ', descLabel: 'わ→あ' },
  { field: 'evaluatedAt', label: '判定日', ascLabel: '古い→新しい', descLabel: '新しい→古い' },
] as const;

/** Filter tab definition */
export const FILTER_TABS = [
  { id: 'evaluationStatus', label: '参加可否' },
  { id: 'priority', label: '優先度' },
  { id: 'workStatus', label: '着手状況' },
  { id: 'bidType', label: '入札方式' },
  { id: 'category', label: '種別' },
  { id: 'prefecture', label: '都道府県' },
  { id: 'organization', label: '発注機関' },
] as const;

/** Status filter options */
export const WORK_STATUS_OPTIONS: WorkStatus[] = ['not_started', 'in_progress', 'completed'];
export const EVALUATION_STATUS_OPTIONS: EvaluationStatus[] = ['all_met', 'other_only_unmet', 'unmet'];
export const PRIORITY_OPTIONS: CompanyPriority[] = [1, 2, 3, 4, 5];

/** WorkStatus ordering for sort */
export const WORK_STATUS_ORDER: Record<WorkStatus, number> = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
};

/** EvaluationStatus ordering for sort (all_met -> other_only_unmet -> unmet) */
export const EVALUATION_STATUS_ORDER: Record<EvaluationStatus, number> = {
  all_met: 0,
  other_only_unmet: 1,
  unmet: 2,
};

/** Session storage key for navigation tracking */
export const NAV_TRACKING_KEY = 'lastVisitedPath';
