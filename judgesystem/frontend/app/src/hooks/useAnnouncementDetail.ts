import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { resolveAnnouncementStatus, resolveBidType } from '../components/announcement';
import { getOrganizationGroup } from '../constants/organizations';
import { getApiUrl } from '../config/api';
import type { AnnouncementDetail, ProgressingCompany } from '../components/announcement';
import type { EvaluationStatus, WorkStatus, CompanyPriority, DocumentOcr } from '../types';
import type { AnnouncementStatus } from '../types/announcement';

// -- Types --

export type SortOption = 'deadline_asc' | 'deadline_desc' | 'publish_asc' | 'publish_desc' | 'status_asc' | 'status_desc' | 'prefecture_asc' | 'prefecture_desc';
export type CompanySortOption = 'priority_asc' | 'priority_desc' | 'workStatus_asc' | 'workStatus_desc' | 'company_asc' | 'company_desc' | 'evaluationStatus_asc' | 'evaluationStatus_desc';
export type PreviewState = { url?: string; loading: boolean; error?: string };

export interface RelatedFilterState {
  statuses: AnnouncementStatus[];
  bidTypes: string[];
  categories: string[];
  prefectures: string[];
  organizations: string[];
}

export interface CompanyFilterState {
  evaluationStatuses: EvaluationStatus[];
  workStatuses: ('in_progress' | 'completed')[];
  priorities: (1 | 2 | 3 | 4 | 5)[];
}

// -- Constants --

const STATUS_ORDER: Record<AnnouncementStatus, number> = {
  upcoming: 0, ongoing: 1, awaiting_result: 2, closed: 3,
};
const EVALUATION_STATUS_ORDER: Record<EvaluationStatus, number> = {
  all_met: 0, other_only_unmet: 1, unmet: 2,
};
const WORK_STATUS_ORDER: Record<Extract<WorkStatus, 'in_progress' | 'completed'>, number> = {
  in_progress: 0, completed: 1,
};
const PRIORITY_ORDER: Record<CompanyPriority, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };
const NAV_TRACKING_KEY = 'lastVisitedPath';

const normalizePriority = (value: number): CompanyPriority => {
  const rounded = Math.round(value);
  return ([1, 2, 3, 4, 5].includes(rounded) ? rounded : 1) as CompanyPriority;
};
const normalizeWorkStatus = (value: string): Extract<WorkStatus, 'in_progress' | 'completed'> =>
  value === 'completed' ? 'completed' : 'in_progress';

const getStatusOrderValue = (status?: string) =>
  STATUS_ORDER[resolveAnnouncementStatus(status)] ?? 0;

// -- Hook --

export function useAnnouncementDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Core state
  const [activeTab, setActiveTab] = useState(0);
  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Related announcements
  const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
  const [relatedSortOption, setRelatedSortOption] = useState<SortOption | null>(null);
  const [relatedFilters, setRelatedFilters] = useState<RelatedFilterState>({
    statuses: [], bidTypes: [], categories: [], prefectures: [], organizations: [],
  });
  const [relatedPage, setRelatedPage] = useState(0);
  const relatedPageSize = 25;

  // Progressing companies
  const [companySearchQuery, setCompanySearchQuery] = useState('');
  const [companySortOption, setCompanySortOption] = useState<CompanySortOption | null>(null);
  const [companyFilters, setCompanyFilters] = useState<CompanyFilterState>({
    evaluationStatuses: [], workStatuses: [], priorities: [],
  });
  const [companyPage, setCompanyPage] = useState(0);
  const companyPageSize = 25;
  const [progressingCompanies, setProgressingCompanies] = useState<ProgressingCompany[]>([]);
  const [isProgressingLoading, setIsProgressingLoading] = useState(false);

  // Document preview
  const [documentPreviewState, setDocumentPreviewState] = useState<Record<string, PreviewState>>({});
  const previewUrlRef = useRef<Record<string, string>>({});
  const documentPreviewStateRef = useRef<Record<string, PreviewState>>({});
  const previewFetchControllersRef = useRef<Record<string, AbortController>>({});

  // Nav tracking
  useEffect(() => {
    try { sessionStorage.setItem(NAV_TRACKING_KEY, location.pathname); } catch { /* ignore */ }
  }, [location.pathname]);

  // Preview cleanup helpers
  const abortAllPreviewFetches = useCallback(() => {
    Object.values(previewFetchControllersRef.current).forEach(c => c.abort());
    previewFetchControllersRef.current = {};
  }, []);

  const revokeAllPreviewUrls = useCallback(() => {
    Object.values(previewUrlRef.current).forEach(url => { if (url) URL.revokeObjectURL(url); });
    previewUrlRef.current = {};
  }, []);

  const resetPreviewState = useCallback(() => {
    abortAllPreviewFetches();
    revokeAllPreviewUrls();
    setDocumentPreviewState(() => { documentPreviewStateRef.current = {}; return {}; });
  }, [abortAllPreviewFetches, revokeAllPreviewUrls]);

  useEffect(() => () => { abortAllPreviewFetches(); revokeAllPreviewUrls(); }, [abortAllPreviewFetches, revokeAllPreviewUrls]);
  useEffect(() => { resetPreviewState(); }, [announcement?.announcementNo, resetPreviewState]);

  // Fetch announcement
  useEffect(() => {
    const fetchAnnouncement = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const announcementNo = id.startsWith('ann-') ? id.substring(4) : id;
        const response = await fetch(getApiUrl(`/api/announcements/${announcementNo}`));
        if (!response.ok) throw new Error(`Failed to fetch announcement: ${response.status}`);
        setAnnouncement(await response.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncement();
  }, [id]);

  // Load PDF preview
  const loadPdfPreview = useCallback(
    async (documentId: number, options?: { force?: boolean }) => {
      if (!announcement?.announcementNo) return;
      const docKey = String(documentId);
      const forceReload = options?.force ?? false;
      const currentState = documentPreviewStateRef.current[docKey];
      if (!forceReload && (currentState?.loading || currentState?.url)) return;

      if (forceReload && previewUrlRef.current[docKey]) {
        URL.revokeObjectURL(previewUrlRef.current[docKey]);
        delete previewUrlRef.current[docKey];
      }

      const existingController = previewFetchControllersRef.current[docKey];
      if (existingController) existingController.abort();

      const controller = new AbortController();
      previewFetchControllersRef.current[docKey] = controller;

      setDocumentPreviewState(prev => {
        const nextState = { ...prev, [docKey]: { loading: true } };
        documentPreviewStateRef.current = nextState;
        return nextState;
      });

      try {
        const response = await fetch(
          getApiUrl(`/api/announcements/${announcement.announcementNo}/documents/${docKey}/preview`),
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Failed to fetch preview (${response.status})`);
        const blob = await response.blob();
        if (controller.signal.aborted) return;

        const objectUrl = URL.createObjectURL(blob);
        if (previewUrlRef.current[docKey]) URL.revokeObjectURL(previewUrlRef.current[docKey]);
        previewUrlRef.current[docKey] = objectUrl;

        setDocumentPreviewState(prev => {
          const nextState = { ...prev, [docKey]: { loading: false, url: objectUrl } };
          documentPreviewStateRef.current = nextState;
          return nextState;
        });
      } catch (err) {
        if ((err instanceof DOMException && err.name === 'AbortError') || controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'PDFプレビューの取得に失敗しました';
        setDocumentPreviewState(prev => {
          const nextState = { ...prev, [docKey]: { loading: false, error: message } };
          documentPreviewStateRef.current = nextState;
          return nextState;
        });
      } finally {
        if (previewFetchControllersRef.current[docKey] === controller) {
          delete previewFetchControllersRef.current[docKey];
        }
      }
    },
    [announcement?.announcementNo]
  );

  // Auto-load first PDF
  useEffect(() => {
    if (!announcement?.documents) return;
    const firstPdfDoc = announcement.documents.find(
      (doc: DocumentOcr) => doc.fileFormat && doc.fileFormat.toLowerCase() === 'pdf'
    );
    if (firstPdfDoc) loadPdfPreview(firstPdfDoc.id);
  }, [announcement?.documents, loadPdfPreview]);

  // Fetch progressing companies
  useEffect(() => {
    if (!announcement?.announcementNo) { setProgressingCompanies([]); return; }
    let isCancelled = false;
    const fetchProgressingCompanies = async () => {
      setIsProgressingLoading(true);
      try {
        const response = await fetch(
          getApiUrl(`/api/announcements/${announcement.announcementNo}/progressing-companies`)
        );
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const data = await response.json();
        if (isCancelled) return;
        setProgressingCompanies(
          Array.isArray(data) ? data.map((row: any) => ({
            companyId: String(row.companyId ?? ''),
            companyName: row.companyName ?? '',
            branchId: String(row.branchId ?? ''),
            branchName: row.branchName ?? '',
            priority: normalizePriority(Number(row.priority ?? 1)),
            workStatus: normalizeWorkStatus(row.workStatus ?? ''),
            evaluationId: String(row.evaluationId ?? ''),
            evaluationStatus: (row.evaluationStatus ?? 'unmet') as EvaluationStatus,
          })) : []
        );
      } catch (err) {
        console.error('Failed to fetch progressing companies:', err);
        if (!isCancelled) setProgressingCompanies([]);
      } finally {
        if (!isCancelled) setIsProgressingLoading(false);
      }
    };
    fetchProgressingCompanies();
    return () => { isCancelled = true; };
  }, [announcement?.announcementNo]);

  // Search handlers
  const handleRelatedSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setRelatedSearchQuery(e.target.value);
    setRelatedPage(0);
  }, []);

  const handleCompanySearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCompanySearchQuery(e.target.value);
    setCompanyPage(0);
  }, []);

  // Fetch related announcements from API
  const [baseRelatedAnnouncements, setBaseRelatedAnnouncements] = useState<any[]>([]);
  useEffect(() => {
    if (!announcement?.announcementNo) { setBaseRelatedAnnouncements([]); return; }
    let isCancelled = false;
    const fetchRelated = async () => {
      try {
        const response = await fetch(
          getApiUrl(`/api/announcements/${announcement.announcementNo}/related`)
        );
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const data = await response.json();
        if (!isCancelled) setBaseRelatedAnnouncements(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch related announcements:', err);
        if (!isCancelled) setBaseRelatedAnnouncements([]);
      }
    };
    fetchRelated();
    return () => { isCancelled = true; };
  }, [announcement?.announcementNo]);

  const filteredRelatedAnnouncements = useMemo(() => {
    let filtered = baseRelatedAnnouncements;

    if (relatedSearchQuery) {
      const query = relatedSearchQuery.toLowerCase();
      filtered = filtered.filter((a) =>
        a.title.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query) ||
        a.workLocation.toLowerCase().includes(query)
      );
    }

    filtered = filtered.filter((a) => {
      if (relatedFilters.statuses.length > 0 && !relatedFilters.statuses.includes(resolveAnnouncementStatus(a.status as string | undefined))) return false;
      if (relatedFilters.bidTypes.length > 0 && (!a.bidType || !relatedFilters.bidTypes.includes(a.bidType))) return false;
      if (relatedFilters.categories.length > 0 && !relatedFilters.categories.includes(a.category)) return false;
      if (relatedFilters.prefectures.length > 0) {
        const prefecture = a.workLocation?.match(/^(.+?[都道府県])/)?.[1] || '';
        if (!relatedFilters.prefectures.includes(prefecture)) return false;
      }
      if (relatedFilters.organizations.length > 0) {
        if (!relatedFilters.organizations.includes(getOrganizationGroup(a.organization))) return false;
      }
      return true;
    });

    if (!relatedSortOption) return filtered;
    return [...filtered].sort((a, b) => {
      switch (relatedSortOption) {
        case 'deadline_asc': return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'deadline_desc': return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        case 'publish_asc': return new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime();
        case 'publish_desc': return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
        case 'status_asc': return getStatusOrderValue(a.status as string | undefined) - getStatusOrderValue(b.status as string | undefined);
        case 'status_desc': return getStatusOrderValue(b.status as string | undefined) - getStatusOrderValue(a.status as string | undefined);
        case 'prefecture_asc': return (a.workLocation?.match(/^(.+?[都道府県])/)?.[1] || '').localeCompare(b.workLocation?.match(/^(.+?[都道府県])/)?.[1] || '', 'ja');
        case 'prefecture_desc': return (b.workLocation?.match(/^(.+?[都道府県])/)?.[1] || '').localeCompare(a.workLocation?.match(/^(.+?[都道府県])/)?.[1] || '', 'ja');
        default: return 0;
      }
    });
  }, [baseRelatedAnnouncements, relatedSearchQuery, relatedFilters, relatedSortOption]);

  const paginatedRelatedAnnouncements = useMemo(() => {
    const start = relatedPage * relatedPageSize;
    return filteredRelatedAnnouncements.slice(start, start + relatedPageSize);
  }, [filteredRelatedAnnouncements, relatedPage]);

  // Company filtering
  const filteredProgressingCompanies = useMemo<ProgressingCompany[]>(() => {
    let filtered = progressingCompanies;

    if (companySearchQuery) {
      const query = companySearchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.companyName.toLowerCase().includes(query) || c.branchName.toLowerCase().includes(query)
      );
    }

    filtered = filtered.filter(c => {
      if (companyFilters.evaluationStatuses.length > 0 && !companyFilters.evaluationStatuses.includes(c.evaluationStatus)) return false;
      if (companyFilters.workStatuses.length > 0 && !companyFilters.workStatuses.includes(c.workStatus)) return false;
      if (companyFilters.priorities.length > 0 && !companyFilters.priorities.includes(c.priority)) return false;
      return true;
    });

    if (!companySortOption) return filtered;
    return [...filtered].sort((a, b) => {
      switch (companySortOption) {
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
  }, [progressingCompanies, companySearchQuery, companyFilters, companySortOption]);

  const paginatedProgressingCompanies = useMemo<ProgressingCompany[]>(() => {
    const start = companyPage * companyPageSize;
    return filteredProgressingCompanies.slice(start, start + companyPageSize);
  }, [filteredProgressingCompanies, companyPage, companyPageSize]);

  // Clear handlers
  const clearRelated = useCallback(() => {
    setRelatedSearchQuery('');
    setRelatedSortOption(null);
    setRelatedFilters({ statuses: [], bidTypes: [], categories: [], prefectures: [], organizations: [] });
    setRelatedPage(0);
  }, []);

  const clearCompany = useCallback(() => {
    setCompanySearchQuery('');
    setCompanySortOption(null);
    setCompanyFilters({ evaluationStatuses: [], workStatuses: [], priorities: [] });
    setCompanyPage(0);
  }, []);

  return {
    id, navigate, activeTab, setActiveTab,
    announcement, loading, error,
    // Related
    relatedSearchQuery, handleRelatedSearchChange,
    relatedSortOption, setRelatedSortOption,
    relatedFilters, setRelatedFilters,
    relatedPage, setRelatedPage, relatedPageSize,
    baseRelatedAnnouncements,
    filteredRelatedAnnouncements,
    paginatedRelatedAnnouncements,
    clearRelated,
    // Companies
    companySearchQuery, handleCompanySearchChange,
    companySortOption, setCompanySortOption,
    companyFilters, setCompanyFilters,
    companyPage, setCompanyPage, companyPageSize,
    progressingCompanies,
    isProgressingLoading,
    filteredProgressingCompanies,
    paginatedProgressingCompanies,
    clearCompany,
    // Documents
    documentPreviewState, loadPdfPreview,
  };
}
