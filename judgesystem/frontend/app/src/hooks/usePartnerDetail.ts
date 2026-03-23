import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getApiUrl } from '../config/api';
import type { PastProject } from '../types/partner';
import type { EvaluationStatus, WorkStatus, CompanyPriority } from '../types';

// -- Types --

export type SortOption =
  | 'deadline_asc' | 'deadline_desc'
  | 'evaluationStatus_asc' | 'evaluationStatus_desc'
  | 'workStatus_asc' | 'workStatus_desc'
  | 'priority_asc' | 'priority_desc'
  | 'prefecture_asc' | 'prefecture_desc'
  | 'evaluatedAt_asc' | 'evaluatedAt_desc';

export interface ProjectFilterState {
  workStatuses: WorkStatus[];
  evaluationStatuses: EvaluationStatus[];
  priorities: CompanyPriority[];
  bidTypes: string[];
  categories: string[];
  prefectures: string[];
  organizations: string[];
}

// -- Constants --

const WORK_STATUS_ORDER: Record<WorkStatus, number> = {
  not_started: 0, in_progress: 1, completed: 2,
};
const EVALUATION_STATUS_ORDER: Record<EvaluationStatus, number> = {
  all_met: 0, other_only_unmet: 1, unmet: 2,
};
const NAV_TRACKING_KEY = 'lastVisitedPath';

const EMPTY_FILTERS: ProjectFilterState = {
  workStatuses: [], evaluationStatuses: [], priorities: [],
  bidTypes: [], categories: [], prefectures: [], organizations: [],
};

// -- Hook --

export function usePartnerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState(0);
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Project list state
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectPage, setProjectPage] = useState(0);
  const projectPageSize = 25;
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [filters, setFilters] = useState<ProjectFilterState>(EMPTY_FILTERS);

  // Nav tracking
  useEffect(() => {
    try { sessionStorage.setItem(NAV_TRACKING_KEY, location.pathname); } catch { /* ignore */ }
  }, [location.pathname]);

  // Fetch partner
  useEffect(() => {
    const fetchPartner = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(getApiUrl(`/api/partners/${id}`));
        if (!response.ok) throw new Error(`Failed to fetch partner: ${response.status}`);
        setPartner(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchPartner();
  }, [id]);

  // Search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectSearchQuery(e.target.value);
    setProjectPage(0);
  }, []);

  // Filtered projects
  const filteredProjects = useMemo((): PastProject[] => {
    if (!partner) return [];
    const pastProjects = partner.pastProjects || [];
    if (!Array.isArray(pastProjects)) return [];

    let filtered = pastProjects;
    if (projectSearchQuery) {
      const query = projectSearchQuery.toLowerCase();
      filtered = filtered.filter((p: PastProject) =>
        p.announcementTitle.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.prefecture.toLowerCase().includes(query) ||
        p.branchName.toLowerCase().includes(query)
      );
    }

    filtered = filtered.filter((p: PastProject) => {
      if (filters.workStatuses.length > 0 && !filters.workStatuses.includes(p.workStatus)) return false;
      if (filters.evaluationStatuses.length > 0 && !filters.evaluationStatuses.includes(p.evaluationStatus)) return false;
      if (filters.priorities.length > 0) {
        if (p.priority == null || !filters.priorities.includes(p.priority as CompanyPriority)) return false;
      }
      if (filters.bidTypes.length > 0 && (!p.bidType || !filters.bidTypes.includes(p.bidType))) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(p.category)) return false;
      if (filters.prefectures.length > 0 && !filters.prefectures.includes(p.prefecture)) return false;
      if (filters.organizations.length > 0 && !filters.organizations.includes(p.organization)) return false;
      return true;
    });

    if (!sortOption) return filtered;
    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'deadline_asc': return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'deadline_desc': return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        case 'evaluationStatus_asc': return EVALUATION_STATUS_ORDER[a.evaluationStatus as EvaluationStatus] - EVALUATION_STATUS_ORDER[b.evaluationStatus as EvaluationStatus];
        case 'evaluationStatus_desc': return EVALUATION_STATUS_ORDER[b.evaluationStatus as EvaluationStatus] - EVALUATION_STATUS_ORDER[a.evaluationStatus as EvaluationStatus];
        case 'workStatus_asc': return WORK_STATUS_ORDER[a.workStatus as WorkStatus] - WORK_STATUS_ORDER[b.workStatus as WorkStatus];
        case 'workStatus_desc': return WORK_STATUS_ORDER[b.workStatus as WorkStatus] - WORK_STATUS_ORDER[a.workStatus as WorkStatus];
        case 'priority_asc': return (a.priority ?? 99) - (b.priority ?? 99);
        case 'priority_desc': return (b.priority ?? 0) - (a.priority ?? 0);
        case 'prefecture_asc': return a.prefecture.localeCompare(b.prefecture, 'ja');
        case 'prefecture_desc': return b.prefecture.localeCompare(a.prefecture, 'ja');
        case 'evaluatedAt_asc': return new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime();
        case 'evaluatedAt_desc': return new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime();
        default: return 0;
      }
    });
  }, [partner, projectSearchQuery, filters, sortOption]);

  const paginatedProjects = useMemo(() => {
    const start = projectPage * projectPageSize;
    return filteredProjects.slice(start, start + projectPageSize);
  }, [filteredProjects, projectPage]);

  // Safe partner (with defaults)
  const safePartner = partner ? {
    ...partner,
    branches: partner.branches || [],
    categories: partner.categories || [],
    pastProjects: partner.pastProjects || [],
    qualifications: partner.qualifications || { unified: [], orderers: [] },
  } : null;

  const clearAll = useCallback(() => {
    setProjectSearchQuery('');
    setSortOption(null);
    setFilters(EMPTY_FILTERS);
    setProjectPage(0);
  }, []);

  return {
    id, navigate, activeTab, setActiveTab,
    partner: safePartner, loading, error,
    projectSearchQuery, handleSearchChange,
    projectPage, setProjectPage, projectPageSize,
    sortOption, setSortOption,
    filters, setFilters,
    filteredProjects, paginatedProjects,
    clearAll,
  };
}
