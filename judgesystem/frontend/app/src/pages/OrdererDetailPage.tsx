import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { useOrderers } from '../hooks';
import { prefecturesByRegion } from '../constants/prefectures';
import { colors, pageStyles, fontSizes, borderRadius } from '../constants/styles';
import { useListPageState } from '../hooks';
import { useSidebar } from '../contexts/SidebarContext';
import { NotFoundView, FloatingBackButton, ScrollToTopButton } from '../components/common';
import { RightSidePanel } from '../components/layout';
import { getApiUrl } from '../config/api';
import {
  OrdererDetailHeader,
  OrdererInfoTab,
  OrdererAnnouncementsTab,
  AnnouncementConditionsPanel,
} from './orderer-detail';
import type {
  SortOption,
  StatusFilter,
  AnnouncementFilterState,
} from './orderer-detail';
import { STATUS_ORDER, NAV_TRACKING_KEY } from './orderer-detail';
import type { AnnouncementWithStatus } from '../types';

export default function OrdererDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const { rightPanelOpen, toggleRightPanel, closeRightPanel, isMobile } = useSidebar();
  const { orderers } = useOrderers();
  const [conditionTab, setConditionTab] = useState<'sort' | 'filter'>('sort');

  // Save detail page path for page restoration when returning to list
  useEffect(() => {
    try {
      sessionStorage.setItem(NAV_TRACKING_KEY, location.pathname);
    } catch { /* ignore */ }
  }, [location.pathname]);

  // Sort & filter state
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [filters, setFilters] = useState<AnnouncementFilterState>({
    statuses: [],
    bidTypes: [],
    categories: [],
    prefectures: [],
  });

  // Side panel control
  const handleOpenWithTab = useCallback((tab: 'sort' | 'filter') => {
    setConditionTab(tab);
    if (!rightPanelOpen) {
      toggleRightPanel();
    }
  }, [rightPanelOpen, toggleRightPanel]);

  const orderer = orderers.find((o) => o.id === id);

  // Fetch announcements for this orderer from API
  const [ordererAnnouncements, setOrdererAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await fetch(getApiUrl(`/api/announcements?ordererId=${id}&pageSize=1000`));
        if (!response.ok) {
          throw new Error(`Failed to fetch announcements: ${response.status}`);
        }
        const result = await response.json();
        setOrdererAnnouncements(result.data || []);
      } catch (err) {
        console.error('Error fetching announcements:', err);
        setOrdererAnnouncements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, [id]);

  const {
    searchQuery,
    paginationModel,
    rows: baseRows,
    handleSearchChange,
    handlePaginationModelChange,
  } = useListPageState(ordererAnnouncements, {
    searchFields: ['title', 'category', 'workLocation'],
  });

  // Prefecture ordering (north to south)
  const PREFECTURE_ORDER: Record<string, number> = useMemo(() => {
    const order: Record<string, number> = {};
    let idx = 0;
    prefecturesByRegion.forEach(region => {
      region.prefectures.forEach(pref => {
        order[pref] = idx++;
      });
    });
    return order;
  }, []);

  // Extract prefecture from work location
  const extractPrefecture = (workLocation: string): string => {
    const match = workLocation?.match(/^(.+?[都道府県])/);
    return match ? match[1] : '';
  };

  // Apply filters and sort
  const announcementRows = useMemo(() => {
    let filtered = baseRows.filter((row) => {
      if (filters.statuses.length > 0 && !filters.statuses.includes(row.status as StatusFilter)) {
        return false;
      }
      if (filters.bidTypes.length > 0 && (!row.bidType || !filters.bidTypes.includes(row.bidType))) {
        return false;
      }
      if (filters.categories.length > 0 && !filters.categories.includes(row.category)) {
        return false;
      }
      if (filters.prefectures.length > 0) {
        const pref = extractPrefecture(row.workLocation);
        if (!pref || !filters.prefectures.includes(pref)) {
          return false;
        }
      }
      return true;
    });

    if (!sortOption) {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'deadline_asc':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'deadline_desc':
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        case 'publish_asc':
          return new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime();
        case 'publish_desc':
          return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
        case 'status_asc':
          return STATUS_ORDER[a.status as StatusFilter] - STATUS_ORDER[b.status as StatusFilter];
        case 'status_desc':
          return STATUS_ORDER[b.status as StatusFilter] - STATUS_ORDER[a.status as StatusFilter];
        case 'prefecture_asc': {
          const prefA = extractPrefecture(a.workLocation);
          const prefB = extractPrefecture(b.workLocation);
          return (PREFECTURE_ORDER[prefA] ?? 999) - (PREFECTURE_ORDER[prefB] ?? 999);
        }
        case 'prefecture_desc': {
          const prefA = extractPrefecture(a.workLocation);
          const prefB = extractPrefecture(b.workLocation);
          return (PREFECTURE_ORDER[prefB] ?? 999) - (PREFECTURE_ORDER[prefA] ?? 999);
        }
        default:
          return 0;
      }
    });
  }, [baseRows, filters, sortOption, PREFECTURE_ORDER]);

  const handleAnnouncementClick = (announcementId: string) => {
    navigate(`/announcements/${announcementId}`);
  };

  if (!orderer) {
    return (
      <NotFoundView
        message="指定された発注者が見つかりません。"
        backLabel="一覧に戻る"
        onBack={() => navigate('/orderers')}
      />
    );
  }

  return (
    <Box sx={{ height: '100vh', bgcolor: colors.page.background, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ ...pageStyles.contentArea, maxWidth: '100%', py: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Header */}
        <OrdererDetailHeader
          orderer={orderer}
          onBack={() => navigate('/orderers')}
        />

        {/* Main card + side panel */}
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <Paper sx={{ borderRadius: borderRadius.xs, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Tabs */}
            <Box sx={{ borderBottom: `1px solid ${colors.border.main}`, backgroundColor: colors.text.white }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{
                  px: 2,
                  '& .MuiTabs-indicator': { backgroundColor: colors.primary.main, height: 2 },
                  '& .MuiTab-root': { textTransform: 'none', fontSize: fontSizes.md, fontWeight: 500, color: colors.text.muted, minWidth: 'auto', px: 2, py: 1.5, '&.Mui-selected': { color: colors.primary.main, fontWeight: 600 } },
                }}
              >
                <Tab label="基本情報" />
                <Tab label={`入札案件 (${announcementRows.length})`} />
              </Tabs>
            </Box>

            {/* Tab content */}
            <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: colors.background.hover, display: 'flex', flexDirection: 'column' }}>
              {activeTab === 0 && (
                <OrdererInfoTab orderer={orderer} />
              )}

              {activeTab === 1 && (
                <OrdererAnnouncementsTab
                  loading={loading}
                  announcements={announcementRows as AnnouncementWithStatus[]}
                  paginationModel={paginationModel}
                  onPaginationModelChange={handlePaginationModelChange}
                  onAnnouncementClick={handleAnnouncementClick}
                />
              )}
            </Box>
          </Paper>

          {/* Right side panel (visible only on announcements tab) */}
          {activeTab === 1 && (
            <RightSidePanel
              open={rightPanelOpen}
              onToggle={toggleRightPanel}
              onClose={closeRightPanel}
              onOpenWithTab={handleOpenWithTab}
              isMobile={isMobile}
            >
              <AnnouncementConditionsPanel
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                sortOption={sortOption}
                onSortChange={setSortOption}
                filters={filters}
                onFilterChange={setFilters}
                onClearAll={() => {
                  handleSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
                  setSortOption(null);
                  setFilters({ statuses: [], bidTypes: [], categories: [], prefectures: [] });
                }}
                activeTab={conditionTab}
                onTabChange={setConditionTab}
              />
            </RightSidePanel>
          )}
        </Box>
      </Box>
      <FloatingBackButton onClick={() => navigate('/orderers')} />
      <ScrollToTopButton />
    </Box>
  );
}
