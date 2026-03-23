import { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchProgressingCompanies as fetchProgressingCompaniesApi } from '../data/api';
import { isAbortError } from '../utils/fetch';
import type { ProgressingCompany } from '../components/announcement';
import type { EvaluationStatus, WorkStatus, CompanyPriority } from '../types';

// -- Types --

export type CompanySortOption =
  | 'priority_asc' | 'priority_desc'
  | 'workStatus_asc' | 'workStatus_desc'
  | 'company_asc' | 'company_desc'
  | 'evaluationStatus_asc' | 'evaluationStatus_desc';

export interface CompanyFilterState {
  evaluationStatuses: EvaluationStatus[];
  workStatuses: ('in_progress' | 'completed')[];
  priorities: (1 | 2 | 3 | 4 | 5)[];
}

/** Raw row shape from the progressing-companies API response. */
interface ProgressingCompanyApiRow {
  companyId?: string | number;
  companyName?: string;
  branchId?: string | number;
  branchName?: string;
  priority?: number;
  workStatus?: string;
  evaluationId?: string | number;
  evaluationStatus?: string;
}

// -- Constants --

const EVALUATION_STATUS_ORDER: Record<EvaluationStatus, number> = {
  all_met: 0,
  other_only_unmet: 1,
  unmet: 2,
};

const WORK_STATUS_ORDER: Record<Extract<WorkStatus, 'in_progress' | 'completed'>, number> = {
  in_progress: 0,
  completed: 1,
};

const PRIORITY_ORDER: Record<CompanyPriority, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

const normalizePriority = (value: number): CompanyPriority => {
  const rounded = Math.round(value);
  return ([1, 2, 3, 4, 5].includes(rounded) ? rounded : 1) as CompanyPriority;
};

const normalizeWorkStatus = (value: string): Extract<WorkStatus, 'in_progress' | 'completed'> =>
  value === 'completed' ? 'completed' : 'in_progress';

// -- Hook --

/**
 * Progressing companies hook.
 * Fetches progressing companies from the API and provides
 * search / filter / sort / pagination capabilities.
 *
 * @param announcementNo - The announcement number used in the API path.
 * @returns Company state and handlers.
 */
export function useProgressingCompanies(announcementNo: string | undefined) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<CompanySortOption | null>(null);
  const [filters, setFilters] = useState<CompanyFilterState>({
    evaluationStatuses: [], workStatuses: [], priorities: [],
  });
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const [companies, setCompanies] = useState<ProgressingCompany[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch from API
  useEffect(() => {
    if (!announcementNo) { setCompanies([]); return; }
    let isCancelled = false;
    const controller = new AbortController();
    const loadProgressingCompanies = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchProgressingCompaniesApi(announcementNo, {
          signal: controller.signal,
        });
        if (isCancelled) return;
        setCompanies(
          data.map((row: unknown) => {
            const r = row as ProgressingCompanyApiRow;
            return {
              companyId: String(r.companyId ?? ''),
              companyName: r.companyName ?? '',
              branchId: String(r.branchId ?? ''),
              branchName: r.branchName ?? '',
              priority: normalizePriority(Number(r.priority ?? 1)),
              workStatus: normalizeWorkStatus(r.workStatus ?? ''),
              evaluationId: String(r.evaluationId ?? ''),
              evaluationStatus: (r.evaluationStatus ?? 'unmet') as EvaluationStatus,
            };
          }),
        );
      } catch (err) {
        if (!isCancelled) {
          if (isAbortError(err)) {
            setError('リクエストがタイムアウトしました');
          } else {
            setError(err instanceof Error ? err.message : String(err));
          }
          setCompanies([]);
        }
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    };
    loadProgressingCompanies();
    return () => { isCancelled = true; controller.abort(); };
  }, [announcementNo]);

  // Search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(0);
  }, []);

  // Filtered + sorted list
  const filteredCompanies = useMemo<ProgressingCompany[]>(() => {
    let filtered = companies;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.companyName.toLowerCase().includes(query) || c.branchName.toLowerCase().includes(query),
      );
    }

    filtered = filtered.filter(c => {
      if (filters.evaluationStatuses.length > 0 && !filters.evaluationStatuses.includes(c.evaluationStatus)) return false;
      if (filters.workStatuses.length > 0 && !filters.workStatuses.includes(c.workStatus)) return false;
      if (filters.priorities.length > 0 && !filters.priorities.includes(c.priority)) return false;
      return true;
    });

    if (!sortOption) return filtered;
    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'priority_asc': return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        case 'priority_desc': return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        case 'evaluationStatus_asc': return EVALUATION_STATUS_ORDER[a.evaluationStatus] - EVALUATION_STATUS_ORDER[b.evaluationStatus];
        case 'evaluationStatus_desc': return EVALUATION_STATUS_ORDER[b.evaluationStatus] - EVALUATION_STATUS_ORDER[a.evaluationStatus];
        case 'workStatus_asc': return WORK_STATUS_ORDER[a.workStatus] - WORK_STATUS_ORDER[b.workStatus];
        case 'workStatus_desc': return WORK_STATUS_ORDER[b.workStatus] - WORK_STATUS_ORDER[a.workStatus];
        case 'company_asc': return a.companyName.localeCompare(b.companyName, 'ja');
        case 'company_desc': return b.companyName.localeCompare(a.companyName, 'ja');
        default: return 0;
      }
    });
  }, [companies, searchQuery, filters, sortOption]);

  // Paginated slice
  const paginatedCompanies = useMemo<ProgressingCompany[]>(() => {
    const start = page * pageSize;
    return filteredCompanies.slice(start, start + pageSize);
  }, [filteredCompanies, page]);

  // Clear all conditions
  const clear = useCallback(() => {
    setSearchQuery('');
    setSortOption(null);
    setFilters({ evaluationStatuses: [], workStatuses: [], priorities: [] });
    setPage(0);
  }, []);

  return {
    searchQuery, setSearchQuery,
    sortOption, setSortOption,
    filters, setFilters,
    page, setPage, pageSize,
    companies, isLoading, error,
    filteredCompanies,
    paginatedCompanies,
    total: filteredCompanies.length,
    handleSearchChange,
    clear,
  };
}
