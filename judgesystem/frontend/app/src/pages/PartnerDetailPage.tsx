import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { colors, pageStyles, fontSizes, borderRadius } from '../constants/styles';
import { NotFoundView, FloatingBackButton, ScrollToTopButton } from '../components/common';
import { RightSidePanel } from '../components/layout';
import { PartnerBasicInfo, PartnerQualifications, PartnerHistory } from '../components/partner';
import { useSidebar } from '../contexts/SidebarContext';
import type { PastProject, PartnerDetail } from '../types/partner';
import type { EvaluationStatus, WorkStatus, CompanyPriority } from '../types';
import { getApiUrl } from '../config/api';
import {
  PartnerDetailHeader,
  ProjectConditionsPanel,
} from './partner-detail';
import type { SortOption, ProjectFilterState } from './partner-detail';
import {
  WORK_STATUS_ORDER,
  EVALUATION_STATUS_ORDER,
  NAV_TRACKING_KEY,
} from './partner-detail';

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const { rightPanelOpen, toggleRightPanel, closeRightPanel, isMobile } = useSidebar();
  const [conditionTab, setConditionTab] = useState<'sort' | 'filter'>('sort');

  // API data fetch
  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Save detail page path for page restoration when returning to list
  useEffect(() => {
    try {
      sessionStorage.setItem(NAV_TRACKING_KEY, location.pathname);
    } catch { /* ignore */ }
  }, [location.pathname]);

  // Fetch partner info from API
  useEffect(() => {
    const fetchPartner = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(getApiUrl(`/api/partners/${id}`));
        if (!response.ok) {
          throw new Error(`Failed to fetch partner: ${response.status}`);
        }
        const data = await response.json();
        setPartner(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchPartner();
  }, [id]);

  // Project pagination & search state
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectPage, setProjectPage] = useState(0);
  const projectPageSize = 25;

  // Sort & filter state
  const [sortOption, setSortOption] = useState<SortOption | null>(null);
  const [filters, setFilters] = useState<ProjectFilterState>({
    workStatuses: [],
    evaluationStatuses: [],
    priorities: [],
    bidTypes: [],
    categories: [],
    prefectures: [],
    organizations: [],
  });

  // Side panel control
  const handleOpenWithTab = useCallback((tab: 'sort' | 'filter') => {
    setConditionTab(tab);
    if (!rightPanelOpen) {
      toggleRightPanel();
    }
  }, [rightPanelOpen, toggleRightPanel]);

  // Filter projects
  const filteredProjects = useMemo((): PastProject[] => {
    if (!partner) return [];
    const pastProjects = partner.pastProjects || [];
    if (!Array.isArray(pastProjects)) return [];

    // Search filter
    let filtered = pastProjects;
    if (projectSearchQuery) {
      const query = projectSearchQuery.toLowerCase();
      filtered = filtered.filter(
        (p: PastProject) =>
          p.announcementTitle.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          p.prefecture.toLowerCase().includes(query) ||
          p.branchName.toLowerCase().includes(query)
      );
    }

    // Apply filters
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

    // Apply sort
    if (!sortOption) return filtered;

    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'deadline_asc':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'deadline_desc':
          return new Date(b.deadline).getTime() - new Date(a.deadline).getTime();
        case 'evaluationStatus_asc':
          return EVALUATION_STATUS_ORDER[a.evaluationStatus as EvaluationStatus] - EVALUATION_STATUS_ORDER[b.evaluationStatus as EvaluationStatus];
        case 'evaluationStatus_desc':
          return EVALUATION_STATUS_ORDER[b.evaluationStatus as EvaluationStatus] - EVALUATION_STATUS_ORDER[a.evaluationStatus as EvaluationStatus];
        case 'workStatus_asc':
          return WORK_STATUS_ORDER[a.workStatus as WorkStatus] - WORK_STATUS_ORDER[b.workStatus as WorkStatus];
        case 'workStatus_desc':
          return WORK_STATUS_ORDER[b.workStatus as WorkStatus] - WORK_STATUS_ORDER[a.workStatus as WorkStatus];
        case 'priority_asc': {
          const aPriority = a.priority;
          const bPriority = b.priority;
          if (aPriority == null && bPriority == null) return 0;
          if (aPriority == null) return 1;
          if (bPriority == null) return -1;
          return aPriority - bPriority;
        }
        case 'priority_desc': {
          const aPriority = a.priority;
          const bPriority = b.priority;
          if (aPriority == null && bPriority == null) return 0;
          if (aPriority == null) return 1;
          if (bPriority == null) return -1;
          return bPriority - aPriority;
        }
        case 'prefecture_asc':
          return a.prefecture.localeCompare(b.prefecture, 'ja');
        case 'prefecture_desc':
          return b.prefecture.localeCompare(a.prefecture, 'ja');
        case 'evaluatedAt_asc':
          return new Date(a.evaluatedAt).getTime() - new Date(b.evaluatedAt).getTime();
        case 'evaluatedAt_desc':
          return new Date(b.evaluatedAt).getTime() - new Date(a.evaluatedAt).getTime();
        default:
          return 0;
      }
    });
  }, [partner, projectSearchQuery, filters, sortOption]);

  // Paginated projects
  const paginatedProjects = useMemo(() => {
    const start = projectPage * projectPageSize;
    return filteredProjects.slice(start, start + projectPageSize);
  }, [filteredProjects, projectPage]);

  // Search change handler
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectSearchQuery(e.target.value);
    setProjectPage(0);
  }, []);

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

  if (!partner) {
    return (
      <NotFoundView
        message="指定された会社が見つかりません。"
        backLabel="一覧に戻る"
        onBack={() => navigate('/partners')}
      />
    );
  }

  // Ensure data structure defaults
  const safePartner = {
    ...partner,
    branches: partner.branches || [],
    categories: partner.categories || [],
    pastProjects: partner.pastProjects || [],
    qualifications: partner.qualifications || { unified: [], orderers: [] },
  };

  return (
    <Box sx={{ height: '100vh', bgcolor: colors.page.background, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Box sx={{ ...pageStyles.contentArea, maxWidth: '100%', py: 3, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Header */}
        <PartnerDetailHeader
          partner={safePartner}
          projectCount={safePartner.pastProjects.length}
          onBack={() => navigate('/partners')}
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
                <Tab label={`対応案件 (${safePartner.pastProjects.length})`} />
              </Tabs>
            </Box>

            {/* Tab content */}
            <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: colors.background.hover, display: 'flex', flexDirection: 'column' }}>
              {activeTab === 0 && (
                <Box sx={{ p: 2.5 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
                    <PartnerBasicInfo partner={safePartner} />
                    <PartnerQualifications partner={safePartner} />
                  </Box>
                </Box>
              )}

              {activeTab === 1 && (
                <PartnerHistory
                  projects={paginatedProjects}
                  page={projectPage}
                  pageSize={projectPageSize}
                  filteredCount={filteredProjects.length}
                  onPageChange={setProjectPage}
                  onNavigate={navigate}
                />
              )}
            </Box>
          </Paper>

          {/* Right side panel (visible only on project history tab) */}
          {activeTab === 1 && (
            <RightSidePanel
              open={rightPanelOpen}
              onToggle={toggleRightPanel}
              onClose={closeRightPanel}
              onOpenWithTab={handleOpenWithTab}
              isMobile={isMobile}
            >
              <ProjectConditionsPanel
                searchQuery={projectSearchQuery}
                onSearchChange={handleSearchChange}
                sortOption={sortOption}
                onSortChange={setSortOption}
                filters={filters}
                onFilterChange={setFilters}
                onClearAll={() => {
                  setProjectSearchQuery('');
                  setSortOption(null);
                  setFilters({
                    workStatuses: [],
                    evaluationStatuses: [],
                    priorities: [],
                    bidTypes: [],
                    categories: [],
                    prefectures: [],
                    organizations: [],
                  });
                  setProjectPage(0);
                }}
                activeTab={conditionTab}
                onTabChange={setConditionTab}
                projects={partner?.pastProjects || []}
              />
            </RightSidePanel>
          )}
        </Box>
      </Box>
      <FloatingBackButton onClick={() => navigate('/partners')} />
      <ScrollToTopButton />
    </Box>
  );
}
