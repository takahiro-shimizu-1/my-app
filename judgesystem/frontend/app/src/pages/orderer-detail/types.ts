import type { AnnouncementWithStatus } from '../../types';

/** Sort option for announcements list */
export type SortOption =
  | 'deadline_asc' | 'deadline_desc'
  | 'publish_asc' | 'publish_desc'
  | 'status_asc' | 'status_desc'
  | 'prefecture_asc' | 'prefecture_desc';

/** Status filter derived from announcement status */
export type StatusFilter = AnnouncementWithStatus['status'];

/** Filter state for announcements */
export interface AnnouncementFilterState {
  statuses: StatusFilter[];
  bidTypes: string[];
  categories: string[];
  prefectures: string[];
}

/** Sort field definition */
export const SORT_FIELDS = [
  { field: 'deadline', label: '締切', ascLabel: '近い', descLabel: '遠い' },
  { field: 'publish', label: '公告日', ascLabel: '古い', descLabel: '新しい' },
  { field: 'status', label: 'ステータス', ascLabel: '公開予定→終了', descLabel: '終了→公開予定' },
  { field: 'prefecture', label: '都道府県', ascLabel: '北→南', descLabel: '南→北' },
] as const;

/** Filter tab definition */
export const FILTER_TABS = [
  { id: 'status', label: 'ステータス' },
  { id: 'bidType', label: '入札方式' },
  { id: 'category', label: '種別' },
  { id: 'prefecture', label: '都道府県' },
] as const;

/** Status filter options */
export const STATUS_FILTERS: StatusFilter[] = ['upcoming', 'ongoing', 'awaiting_result', 'closed'];

/** Status ordering for sort */
export const STATUS_ORDER: Record<StatusFilter, number> = {
  upcoming: 0,
  ongoing: 1,
  awaiting_result: 2,
  closed: 3,
};

/** Session storage key for navigation tracking */
export const NAV_TRACKING_KEY = 'lastVisitedPath';
