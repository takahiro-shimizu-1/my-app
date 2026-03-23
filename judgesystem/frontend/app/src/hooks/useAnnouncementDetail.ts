import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getApiUrl } from '../config/api';
import type { AnnouncementDetail } from '../components/announcement';
import { useDocumentPreview } from './useDocumentPreview';
import { useRelatedAnnouncements } from './useRelatedAnnouncements';
import { useProgressingCompanies } from './useProgressingCompanies';

// Re-export types so existing consumers keep working
export type { PreviewState } from './useDocumentPreview';
export type { SortOption, RelatedFilterState } from './useRelatedAnnouncements';
export type { CompanySortOption, CompanyFilterState } from './useProgressingCompanies';

// -- Constants --

const NAV_TRACKING_KEY = 'lastVisitedPath';

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

  // Nav tracking
  useEffect(() => {
    try { sessionStorage.setItem(NAV_TRACKING_KEY, location.pathname); } catch { /* ignore */ }
  }, [location.pathname]);

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

  // Composed hooks
  const {
    documentPreviewState,
    loadPdfPreview,
  } = useDocumentPreview(announcement?.announcementNo, announcement?.documents);

  const {
    searchQuery: relatedSearchQuery,
    handleSearchChange: handleRelatedSearchChange,
    sortOption: relatedSortOption,
    setSortOption: setRelatedSortOption,
    filters: relatedFilters,
    setFilters: setRelatedFilters,
    page: relatedPage,
    setPage: setRelatedPage,
    pageSize: relatedPageSize,
    baseRelatedAnnouncements,
    filteredAnnouncements: filteredRelatedAnnouncements,
    paginatedAnnouncements: paginatedRelatedAnnouncements,
    clear: clearRelated,
  } = useRelatedAnnouncements(announcement?.announcementNo);

  const {
    searchQuery: companySearchQuery,
    handleSearchChange: handleCompanySearchChange,
    sortOption: companySortOption,
    setSortOption: setCompanySortOption,
    filters: companyFilters,
    setFilters: setCompanyFilters,
    page: companyPage,
    setPage: setCompanyPage,
    pageSize: companyPageSize,
    companies: progressingCompanies,
    isLoading: isProgressingLoading,
    filteredCompanies: filteredProgressingCompanies,
    paginatedCompanies: paginatedProgressingCompanies,
    clear: clearCompany,
  } = useProgressingCompanies(announcement?.announcementNo);

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
