import { useState, useMemo, useCallback, useEffect } from 'react';
import { resolveAnnouncementStatus } from '../components/announcement';
import { getOrganizationGroup } from '../constants/organizations';
import { fetchRelatedAnnouncements as fetchRelatedAnnouncementsApi } from '../data/api';
import type { AnnouncementStatus } from '../types/announcement';

// -- Related announcement row returned by the API --

/** A related announcement entry from the backend. */
export interface RelatedAnnouncement {
  id: string;
  no: number;
  announcementNo: number;
  title: string;
  organization: string;
  category: string;
  bidType: string;
  workLocation: string;
  publishDate: string;
  deadline: string;
  status?: string;
}

// -- Types --

export type SortOption =
  | 'deadline_asc' | 'deadline_desc'
  | 'publish_asc' | 'publish_desc'
  | 'status_asc' | 'status_desc'
  | 'prefecture_asc' | 'prefecture_desc';

export interface RelatedFilterState {
  statuses: AnnouncementStatus[];
  bidTypes: string[];
  categories: string[];
  prefectures: string[];
  organizations: string[];
}

// -- Constants --

const STATUS_ORDER: Record<AnnouncementStatus, number> = {
  upcoming: 0,
  ongoing: 1,
  awaiting_result: 2,
  closed: 3,
};

const getStatusOrderValue = (status?: string) =>
  STATUS_ORDER[resolveAnnouncementStatus(status)] ?? 0;

// -- Hook --

/**
 * Related announcements hook.
 * Fetches related announcements from the API and provides
 * search / filter / sort / pagination capabilities.
 *
 * @param announcementNo - The announcement number used in the API path.
 * @returns Related announcement state and handlers.
 */
export function useRelatedAnnouncements(announcementNo: string | undefined) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [filters, setFilters] = useState<RelatedFilterState>({
    statuses: [], bidTypes: [], categories: [], prefectures: [], organizations: [],
  });
  const [page, setPage] = useState(0);
  const pageSize = 25;

  // Base data fetched from API
  const [baseRelatedAnnouncements, setBaseRelatedAnnouncements] = useState<RelatedAnnouncement[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!announcementNo) { setBaseRelatedAnnouncements([]); return; }
    let isCancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const loadRelated = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchRelatedAnnouncementsApi(announcementNo, {
          signal: controller.signal,
        });
        if (!isCancelled) setBaseRelatedAnnouncements(data as RelatedAnnouncement[]);
      } catch (err) {
        if (!isCancelled) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            setError('リクエストがタイムアウトしました');
          } else {
            setError(err instanceof Error ? err.message : String(err));
          }
          setBaseRelatedAnnouncements([]);
        }
      } finally {
        clearTimeout(timeoutId);
        if (!isCancelled) setIsLoading(false);
      }
    };
    loadRelated();
    return () => { isCancelled = true; clearTimeout(timeoutId); controller.abort(); };
  }, [announcementNo]);

  // Search handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(0);
  }, []);

  // Filtered + sorted list
  const filteredAnnouncements = useMemo(() => {
    let filtered = baseRelatedAnnouncements;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((a) =>
        a.title.toLowerCase().includes(query) ||
        a.category.toLowerCase().includes(query) ||
        a.workLocation.toLowerCase().includes(query),
      );
    }

    filtered = filtered.filter((a) => {
      if (filters.statuses.length > 0 && !filters.statuses.includes(resolveAnnouncementStatus(a.status as string | undefined))) return false;
      if (filters.bidTypes.length > 0 && (!a.bidType || !filters.bidTypes.includes(a.bidType))) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(a.category)) return false;
      if (filters.prefectures.length > 0) {
        const prefecture = a.workLocation?.match(/^(.+?[都道府県])/)?.[1] || '';
        if (!filters.prefectures.includes(prefecture)) return false;
      }
      if (filters.organizations.length > 0) {
        if (!filters.organizations.includes(getOrganizationGroup(a.organization))) return false;
      }
      return true;
    });

    if (!sortOption) return filtered;
    return [...filtered].sort((a, b) => {
      switch (sortOption) {
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
  }, [baseRelatedAnnouncements, searchQuery, filters, sortOption]);

  // Paginated slice
  const paginatedAnnouncements = useMemo(() => {
    const start = page * pageSize;
    return filteredAnnouncements.slice(start, start + pageSize);
  }, [filteredAnnouncements, page]);

  // Clear all conditions
  const clear = useCallback(() => {
    setSearchQuery('');
    setSortOption(null);
    setFilters({ statuses: [], bidTypes: [], categories: [], prefectures: [], organizations: [] });
    setPage(0);
  }, []);

  return {
    searchQuery, setSearchQuery,
    sortOption, setSortOption,
    filters, setFilters,
    page, setPage, pageSize,
    baseRelatedAnnouncements,
    filteredAnnouncements,
    paginatedAnnouncements,
    total: filteredAnnouncements.length,
    handleSearchChange,
    clear,
    error,
    isLoading,
  };
}
