import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Paper } from '@mui/material';
import { colors, pageStyles, borderRadius } from '../constants/styles';
import { NotFoundView, FloatingBackButton, ScrollToTopButton } from '../components/common';
import { RightSidePanel } from '../components/layout';
import {
  AnnouncementHeader,
  AnnouncementTabs,
  DocumentSection,
  RequirementSection,
  CompetingCompaniesSection,
} from '../components/announcement';
import type { AnnouncementDetail } from '../components/announcement';
import { useSidebar } from '../contexts/SidebarContext';
import { getApiUrl } from '../config/api';
import { useDocumentPreview } from '../hooks/useDocumentPreview';
import { useRelatedAnnouncements } from '../hooks/useRelatedAnnouncements';
import { useProgressingCompanies } from '../hooks/useProgressingCompanies';
import {
  RelatedConditionsPanel,
  CompanyConditionsPanel,
  RelatedAnnouncementsTab,
} from './announcement-detail';

// ナビゲーション追跡用
const NAV_TRACKING_KEY = 'lastVisitedPath';

export default function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const { rightPanelOpen, toggleRightPanel, closeRightPanel, isMobile } = useSidebar();
  const [conditionTab, setConditionTab] = useState<'sort' | 'filter'>('sort');

  // 詳細ページのパスを保存（一覧に戻った時のページ復元用）
  useEffect(() => {
    try {
      sessionStorage.setItem(NAV_TRACKING_KEY, location.pathname);
    } catch { /* ignore */ }
  }, [location.pathname]);

  // API からデータ取得
  const [announcement, setAnnouncement] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    const fetchAnnouncement = async () => {
      setLoading(true);
      setError(null);
      try {
        // id から ann- プレフィックスを除去して公告番号を取得
        const announcementNo = id.startsWith('ann-') ? id.substring(4) : id;
        const response = await fetch(getApiUrl(`/api/announcements/${announcementNo}`), { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Failed to fetch announcement: ${response.status}`);
        }
        const data = await response.json();
        setAnnouncement(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('リクエストがタイムアウトしました');
        } else {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    };
    fetchAnnouncement();
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [id]);

  // Composed hooks
  const { documentPreviewState, loadPdfPreview } = useDocumentPreview(
    announcement?.announcementNo,
    announcement?.documents,
  );

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

  // サイドパネル制御
  const handleOpenWithTab = useCallback((tab: 'sort' | 'filter') => {
    setConditionTab(tab);
    if (!rightPanelOpen) {
      toggleRightPanel();
    }
  }, [rightPanelOpen, toggleRightPanel]);

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography>読み込み中...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center', color: colors.status.error.main }}>
        <Typography>{error}</Typography>
      </Box>
    );
  }

  if (!announcement) {
    return (
      <NotFoundView
        message="指定された入札公告が見つかりません。"
        backLabel="一覧に戻る"
        onBack={() => navigate('/announcements')}
      />
    );
  }

  // タブインデックス計算用（資料タブが条件付きのため）
  const hasDocuments = announcement.documents && announcement.documents.length > 0;
  const tabIndex = {
    basicInfo: 0,
    documents: hasDocuments ? 1 : -1,
    related: hasDocuments ? 2 : 1,
    companies: hasDocuments ? 3 : 2,
  };

  return (
    <Box sx={{ height: '100vh', bgcolor: colors.page.background, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ ...pageStyles.contentArea, maxWidth: '100%', py: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

        {/* ヘッダー */}
        <AnnouncementHeader announcement={announcement} onBack={() => navigate('/announcements')} />

        {/* メインカード + サイドパネル */}
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <Paper
            sx={{
              borderRadius: borderRadius.xs,
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* タブ */}
            <AnnouncementTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              hasDocuments={!!hasDocuments}
              relatedCount={baseRelatedAnnouncements.length}
              companiesCount={progressingCompanies.length}
            />

            {/* タブコンテンツ */}
            <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: colors.background.hover, display: 'flex', flexDirection: 'column' }}>

            {/* 基本情報タブ */}
            {activeTab === tabIndex.basicInfo && (
              <RequirementSection
                announcement={announcement}
                progressingCompanies={progressingCompanies}
                onNavigate={navigate}
              />
            )}


            {/* 着手企業タブ */}
            {activeTab === tabIndex.companies && (
              <CompetingCompaniesSection
                companies={paginatedProgressingCompanies}
                isLoading={isProgressingLoading}
                totalCount={progressingCompanies.length}
                page={companyPage}
                pageSize={companyPageSize}
                filteredCount={filteredProgressingCompanies.length}
                onPageChange={setCompanyPage}
                onNavigate={navigate}
              />
            )}

            {/* 関連案件タブ */}
            {activeTab === tabIndex.related && (
              <RelatedAnnouncementsTab
                paginatedAnnouncements={paginatedRelatedAnnouncements}
                filteredCount={filteredRelatedAnnouncements.length}
                page={relatedPage}
                pageSize={relatedPageSize}
                onPageChange={setRelatedPage}
                onNavigate={navigate}
              />
            )}

            {/* 資料タブ */}
            {activeTab === tabIndex.documents && hasDocuments && announcement.documents && (
              <DocumentSection
                documents={announcement.documents}
                documentPreviewState={documentPreviewState}
                loadPdfPreview={loadPdfPreview}
              />
            )}
            </Box>
          </Paper>

          {/* 右サイドパネル（関連案件タブまたは着手企業タブの時のみ表示） */}
          {(activeTab === tabIndex.related || activeTab === tabIndex.companies) && (
            <RightSidePanel
              open={rightPanelOpen}
              onToggle={toggleRightPanel}
              onClose={closeRightPanel}
              onOpenWithTab={handleOpenWithTab}
              isMobile={isMobile}
            >
              {activeTab === tabIndex.related ? (
                <RelatedConditionsPanel
                  searchQuery={relatedSearchQuery}
                  onSearchChange={handleRelatedSearchChange}
                  sortOption={relatedSortOption}
                  onSortChange={setRelatedSortOption}
                  filters={relatedFilters}
                  onFilterChange={setRelatedFilters}
                  onClearAll={clearRelated}
                  activeTab={conditionTab}
                  onTabChange={setConditionTab}
                />
              ) : (
                <CompanyConditionsPanel
                  searchQuery={companySearchQuery}
                  onSearchChange={handleCompanySearchChange}
                  sortOption={companySortOption}
                  onSortChange={setCompanySortOption}
                  filters={companyFilters}
                  onFilterChange={setCompanyFilters}
                  onClearAll={clearCompany}
                  activeTab={conditionTab}
                  onTabChange={setConditionTab}
                />
              )}
            </RightSidePanel>
          )}
        </Box>
      </Box>
      <FloatingBackButton onClick={() => navigate('/announcements')} />
      <ScrollToTopButton />
    </Box>
  );
}
