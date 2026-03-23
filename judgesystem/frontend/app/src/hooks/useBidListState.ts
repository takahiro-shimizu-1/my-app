/**
 * 入札一覧ページの状態管理フック（サーバーサイドページネーション対応）
 * localStorage永続化を含む各種状態を一括管理
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { GridFilterModel, GridSortModel, GridPaginationModel } from '@mui/x-data-grid';
import { extractPrefecture } from '../constants/prefectures';
import type { EvaluationStatus, FilterState } from '../types';
import { fetchEvaluations, fetchStatusCounts } from '../data/api';

// ナビゲーション追跡用のsessionStorageキー
const NAV_TRACKING_KEY = 'lastVisitedPath';

// ローカルストレージのキー
const STORAGE_KEYS = {
  FILTERS: 'bidlist-filters',
  GRID_FILTER: 'bidlist-grid-filter',
  SEARCH: 'bidlist-search',
  SORT: 'bidlist-sort',
  PAGE: 'bidlist-page',
} as const;

// デフォルト値
const DEFAULT_FILTERS: FilterState = {
  statuses: [],
  workStatuses: [],
  priorities: [],
  categories: [],
  bidTypes: [],
  organizations: [],
  prefectures: [],
};

const DEFAULT_SORT: GridSortModel = [];
const DEFAULT_PAGINATION: GridPaginationModel = { pageSize: 25, page: 0 };
const DEFAULT_STATUS_COUNTS: Record<EvaluationStatus, number> = {
  all_met: 0,
  other_only_unmet: 0,
  unmet: 0,
};

/**
 * localStorage から安全に値を読み込む
 */
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return defaultValue;
}

/**
 * localStorage に値を保存
 */
function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/**
 * 詳細ページから戻ってきたかどうかを判定
 */
function isReturningFromDetail(): boolean {
  try {
    const lastPath = sessionStorage.getItem(NAV_TRACKING_KEY);
    // /detail/* パターンにマッチするか確認
    return lastPath ? /^\/detail\//.test(lastPath) : false;
  } catch {
    return false;
  }
}

/**
 * 入札一覧の状態管理フック
 */
export function useBidListState() {
  // 検索クエリ
  const [searchQuery, setSearchQuery] = useState(() =>
    loadFromStorage(STORAGE_KEYS.SEARCH, '')
  );

  // カスタムフィルター（ステータス/優先順位/工種/発注機関）
  const [filters, setFilters] = useState<FilterState>(() => {
    const saved = loadFromStorage<Partial<FilterState>>(STORAGE_KEYS.FILTERS, {});
    // 古い保存データに新しいプロパティがない場合に備えてマージ
    return { ...DEFAULT_FILTERS, ...saved };
  });

  // DataGridの列フィルター
  const [gridFilterModel, setGridFilterModel] = useState<GridFilterModel>(() =>
    loadFromStorage(STORAGE_KEYS.GRID_FILTER, { items: [] })
  );

  // ソート状態
  const [sortModel, setSortModel] = useState<GridSortModel>(() =>
    loadFromStorage(STORAGE_KEYS.SORT, DEFAULT_SORT)
  );

  // ページネーション（詳細から戻った場合のみ復元、それ以外は0ページ目から）
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>(() => {
    const saved = loadFromStorage(STORAGE_KEYS.PAGE, DEFAULT_PAGINATION);
    if (isReturningFromDetail()) {
      return saved;
    }
    // 他のページから来た場合は0ページ目から開始（pageSizeは維持）
    return { ...saved, page: 0 };
  });

  // モーダル表示
  const [showFilterModal, setShowFilterModal] = useState(false);

  // API状態
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<EvaluationStatus, number>>(DEFAULT_STATUS_COUNTS);

  // 前回の値を追跡（実際に値が変わった時のみページリセット）
  const prevSearchQuery = useRef(searchQuery);
  const prevFilters = useRef(filters);

  // 現在のパスを記録（他の一覧から来た場合のページリセット用）
  useEffect(() => {
    try {
      sessionStorage.setItem(NAV_TRACKING_KEY, '/');
    } catch { /* ignore */ }
  }, [paginationModel]);

  // 検索クエリの永続化 & ページリセット
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.SEARCH, searchQuery);
    // 実際に値が変わった時のみページリセット（初回マウント時はスキップ）
    if (prevSearchQuery.current !== searchQuery) {
      prevSearchQuery.current = searchQuery;
      setPaginationModel(prev => prev.page !== 0 ? { ...prev, page: 0 } : prev);
    }
  }, [searchQuery]);

  // フィルターの永続化 & ページリセット
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.FILTERS, filters);
    // 実際に値が変わった時のみページリセット（初回マウント時はスキップ）
    if (prevFilters.current !== filters) {
      prevFilters.current = filters;
      setPaginationModel(prev => prev.page !== 0 ? { ...prev, page: 0 } : prev);
    }
  }, [filters]);

  // DataGrid列フィルターの変更ハンドラ
  const handleGridFilterChange = useCallback((model: GridFilterModel) => {
    setGridFilterModel(model);
    saveToStorage(STORAGE_KEYS.GRID_FILTER, model);
    // 列フィルター変更時はページを先頭に戻す
    setPaginationModel(prev => prev.page !== 0 ? { ...prev, page: 0 } : prev);
  }, []);

  // ソートの変更ハンドラ
  const handleSortModelChange = useCallback((model: GridSortModel) => {
    setSortModel(model);
    saveToStorage(STORAGE_KEYS.SORT, model);
    // ソート変更時はページを先頭に戻す
    setPaginationModel(prev => prev.page !== 0 ? { ...prev, page: 0 } : prev);
  }, []);

  // ページネーションの変更ハンドラ
  const handlePaginationModelChange = useCallback((model: GridPaginationModel) => {
    setPaginationModel(model);
    saveToStorage(STORAGE_KEYS.PAGE, model);
  }, []);

  // データ取得
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchEvaluations({
          page: paginationModel.page,
          pageSize: paginationModel.pageSize,
          filters,
          searchQuery,
          sortModel,
        });

        if (!isCancelled) {
          // データをマッピング（JSONB構造から展開）
          if (!result || !result.data || !Array.isArray(result.data)) {
            console.error('Invalid API response structure:', result);
            throw new Error('Invalid API response: data is not an array');
          }

          const mapped = result.data.map((e: Record<string, unknown>) => {
            const announcement = e.announcement as Record<string, unknown> | undefined;
            const company = e.company as Record<string, unknown> | undefined;
            const branch = e.branch as Record<string, unknown> | undefined;
            return {
              id: e.id,
              evaluationNo: e.evaluationNo,
              status: e.status,
              workStatus: e.workStatus,
              priority: (company?.priority as number) || 0,
              title: (announcement?.title as string) || '',
              company: (company?.name as string) || '',
              branch: (branch?.name as string) || '',
              organization: (announcement?.organization as string) || '',
              category: (announcement?.category as string) || '',
              bidType: announcement?.bidType,
              deadline: (announcement?.deadline as string) || '',
              evaluatedAt: e.evaluatedAt ? (e.evaluatedAt as string).substring(0, 10) : '',
              prefecture: extractPrefecture((announcement?.workLocation as string) || '') ?? '',
            };
          });

          setRows(mapped);
          setTotalCount(result.total);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Failed to fetch evaluations:', err);
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [paginationModel, filters, searchQuery, sortModel]);

  // ステータス件数の取得（ステータスフィルターは除外して集計）
  useEffect(() => {
    let isCancelled = false;

    const loadStatusCounts = async () => {
      try {
        const counts = await fetchStatusCounts({ filters, searchQuery });
        if (!isCancelled) {
          setStatusCounts(counts);
        }
      } catch (err) {
        console.error('Failed to fetch status counts:', err);
        if (!isCancelled) {
          setStatusCounts(DEFAULT_STATUS_COUNTS);
        }
      }
    };

    loadStatusCounts();

    return () => {
      isCancelled = true;
    };
  }, [filters, searchQuery]);

  // フィルター件数
  const activeFilterCount =
    filters.statuses.length +
    filters.workStatuses.length +
    filters.priorities.length +
    filters.categories.length +
    filters.bidTypes.length +
    filters.organizations.length +
    filters.prefectures.length;

  const columnFilterCount = gridFilterModel.items.filter(
    item => item.value
  ).length;

  const totalFilterCount = activeFilterCount + columnFilterCount;

  // 列フィルター削除
  const removeColumnFilter = useCallback(
    (field: string) => {
      const newItems = gridFilterModel.items.filter(item => item.field !== field);
      handleGridFilterChange({ items: newItems });
    },
    [gridFilterModel, handleGridFilterChange]
  );

  // フィルター全クリア
  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    handleGridFilterChange({ items: [] });
    setSearchQuery('');
    handleSortModelChange([]);
  }, [handleGridFilterChange, handleSortModelChange]);

  return {
    // 状態
    searchQuery,
    filters,
    gridFilterModel,
    sortModel,
    paginationModel,
    showFilterModal,
    rows,
    filteredRows: rows, // サーバーサイドでフィルター済み
    isLoading,
    error,
    totalCount,
    statusCounts,

    // フィルター件数
    activeFilterCount,
    columnFilterCount,
    totalFilterCount,

    // セッター
    setSearchQuery,
    setFilters,
    setShowFilterModal,

    // ハンドラ
    handleGridFilterChange,
    handleSortModelChange,
    handlePaginationModelChange,
    removeColumnFilter,
    clearAllFilters,
  };
}
