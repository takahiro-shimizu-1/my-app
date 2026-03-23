import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, Button, Paper, TextField, InputAdornment, IconButton } from '@mui/material';
import {
  Search as SearchIcon,
  SwapVert as SortIcon,
  FilterAlt as FilterIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import {
  announcementStatusConfig,
  bidTypeConfig,
} from '../data';
import { colors, pageStyles, fontSizes, iconStyles, borderRadius, rightPanelColors } from '../constants/styles';
import { evaluationStatusConfig } from '../constants/status';
import { priorityLabels, priorityColors } from '../constants/priority';
import { categories } from '../constants/categories';
import { bidTypes } from '../constants/bidType';
import { prefecturesByRegion } from '../constants/prefectures';
import { organizationGroupsByRegion } from '../constants/organizations';
import { workStatusConfig } from '../constants/workStatus';
import { NotFoundView, FloatingBackButton, ScrollToTopButton, FilterButton } from '../components/common';
import { CustomPagination } from '../components/bid';
import { RightSidePanel } from '../components/layout';
import {
  AnnouncementHeader,
  AnnouncementTabs,
  resolveAnnouncementStatus,
  resolveBidType,
  DocumentSection,
  RequirementSection,
  CompetingCompaniesSection,
} from '../components/announcement';
import type { AnnouncementDetail } from '../components/announcement';
import { useSidebar } from '../contexts/SidebarContext';
import type { BidType, AnnouncementStatus } from '../types/announcement';
import type { EvaluationStatus, WorkStatus, CompanyPriority } from '../types';
import { getApiUrl } from '../config/api';
import { useDocumentPreview } from '../hooks/useDocumentPreview';
import { useRelatedAnnouncements } from '../hooks/useRelatedAnnouncements';
import { useProgressingCompanies } from '../hooks/useProgressingCompanies';
import type { SortOption } from '../hooks/useRelatedAnnouncements';
import type { RelatedFilterState } from '../hooks/useRelatedAnnouncements';
import type { CompanySortOption, CompanyFilterState } from '../hooks/useProgressingCompanies';

// ソートフィールド定義
const SORT_FIELDS = [
  { field: 'deadline', label: '締切', ascLabel: '近い', descLabel: '遠い' },
  { field: 'status', label: 'ステータス', ascLabel: '公告中→終了', descLabel: '終了→公告中' },
  { field: 'publish', label: '公告日', ascLabel: '古い', descLabel: '新しい' },
  { field: 'prefecture', label: '都道府県', ascLabel: '北→南', descLabel: '南→北' },
] as const;

// フィルタータブ定義
const FILTER_TABS = [
  { id: 'status', label: 'ステータス' },
  { id: 'bidType', label: '入札方式' },
  { id: 'category', label: '種別' },
  { id: 'prefecture', label: '都道府県' },
  { id: 'organization', label: '発注機関' },
] as const;

// 着手企業用ソートフィールド定義
const COMPANY_SORT_FIELDS = [
  { field: 'priority', label: '優先度', ascLabel: '高い→低い', descLabel: '低い→高い' },
  { field: 'evaluationStatus', label: '参加可否', ascLabel: '可→不可', descLabel: '不可→可' },
  { field: 'workStatus', label: '着手状況', ascLabel: '着手中→完了', descLabel: '完了→着手中' },
  { field: 'company', label: '企業名', ascLabel: 'あ→わ', descLabel: 'わ→あ' },
] as const;

// 着手企業用フィルタータブ定義
const COMPANY_FILTER_TABS = [
  { id: 'evaluationStatus', label: '参加可否' },
  { id: 'workStatus', label: '着手状況' },
  { id: 'priority', label: '優先度' },
] as const;

// ステータスオプション
const STATUS_OPTIONS: AnnouncementStatus[] = ['upcoming', 'ongoing', 'awaiting_result', 'closed'];

// 参加可否オプション
const EVALUATION_STATUS_OPTIONS: EvaluationStatus[] = ['all_met', 'other_only_unmet', 'unmet'];

// 着手状況オプション
const WORK_STATUS_OPTIONS: Extract<WorkStatus, 'in_progress' | 'completed'>[] = ['in_progress', 'completed'];

// 優先度オプション
const PRIORITY_OPTIONS: CompanyPriority[] = [1, 2, 3, 4, 5];

// 関連案件用表示条件パネル
interface RelatedConditionsPanelProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sortOption: SortOption | null;
  onSortChange: (option: SortOption | null) => void;
  filters: RelatedFilterState;
  onFilterChange: (filters: RelatedFilterState) => void;
  onClearAll: () => void;
  activeTab?: 'sort' | 'filter';
  onTabChange?: (tab: 'sort' | 'filter') => void;
}

function RelatedConditionsPanel({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  filters,
  onFilterChange,
  onClearAll,
  activeTab,
  onTabChange,
}: RelatedConditionsPanelProps) {
  const [internalTab, setInternalTab] = useState<'sort' | 'filter'>('sort');
  const [activeFilterTab, setActiveFilterTab] = useState(0);
  const mainTab = activeTab ?? internalTab;
  const setMainTab = (tab: 'sort' | 'filter') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // フィルター件数
  const filterCounts = {
    status: filters.statuses.length,
    bidType: filters.bidTypes.length,
    category: filters.categories.length,
    prefecture: filters.prefectures.length,
    organization: filters.organizations.length,
  };
  const totalFilterCount = Object.values(filterCounts).reduce((a, b) => a + b, 0);
  const hasConditions = searchQuery.trim() || sortOption !== null || totalFilterCount > 0;

  // トグル関数
  const toggleStatus = (status: AnnouncementStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter(s => s !== status)
      : [...filters.statuses, status];
    onFilterChange({ ...filters, statuses: newStatuses });
  };

  const toggleBidType = (bidType: string) => {
    const newBidTypes = filters.bidTypes.includes(bidType)
      ? filters.bidTypes.filter(b => b !== bidType)
      : [...filters.bidTypes, bidType];
    onFilterChange({ ...filters, bidTypes: newBidTypes });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const togglePrefecture = (pref: string) => {
    const newPrefs = filters.prefectures.includes(pref)
      ? filters.prefectures.filter(p => p !== pref)
      : [...filters.prefectures, pref];
    onFilterChange({ ...filters, prefectures: newPrefs });
  };

  const togglePrefRegion = (regionItems: readonly string[]) => {
    const allSelected = regionItems.every(item => filters.prefectures.includes(item));
    if (allSelected) {
      onFilterChange({
        ...filters,
        prefectures: filters.prefectures.filter(p => !regionItems.includes(p)),
      });
    } else {
      const newPrefs = new Set([...filters.prefectures, ...regionItems]);
      onFilterChange({ ...filters, prefectures: Array.from(newPrefs) });
    }
  };

  const getPrefRegionSelectionState = (regionItems: readonly string[]): 'all' | 'partial' | 'none' => {
    const selectedCount = regionItems.filter(item => filters.prefectures.includes(item)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === regionItems.length) return 'all';
    return 'partial';
  };

  const toggleOrganization = (org: string) => {
    const newOrgs = filters.organizations.includes(org)
      ? filters.organizations.filter(o => o !== org)
      : [...filters.organizations, org];
    onFilterChange({ ...filters, organizations: newOrgs });
  };

  const toggleOrgRegion = (regionItems: string[]) => {
    const allSelected = regionItems.every(item => filters.organizations.includes(item));
    if (allSelected) {
      onFilterChange({
        ...filters,
        organizations: filters.organizations.filter(o => !regionItems.includes(o)),
      });
    } else {
      const newOrgs = new Set([...filters.organizations, ...regionItems]);
      onFilterChange({ ...filters, organizations: Array.from(newOrgs) });
    }
  };

  const getOrgRegionSelectionState = (regionItems: string[]): 'all' | 'partial' | 'none' => {
    const selectedCount = regionItems.filter(item => filters.organizations.includes(item)).length;
    if (selectedCount === 0) return 'none';
    if (selectedCount === regionItems.length) return 'all';
    return 'partial';
  };

  const sectionDivider = {
    borderBottom: `1px solid ${rightPanelColors.border}`,
    pb: 2.5,
    mb: 2.5,
  };

  // フィルターコンテンツをレンダリング
  const renderFilterContent = () => {
    const tabId = FILTER_TABS[activeFilterTab].id;

    switch (tabId) {
      case 'status':
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {STATUS_OPTIONS.map((status) => {
              const config = announcementStatusConfig[status];
              return (
                <FilterButton
                  key={status}
                  label={config.label}
                  selected={filters.statuses.includes(status)}
                  onClick={() => toggleStatus(status)}
                  color={config.color}
                  bgColor={config.bgColor}
                />
              );
            })}
          </Box>
        );

      case 'bidType':
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {bidTypes.map((bidType: BidType) => {
              const config = bidTypeConfig[bidType];
              return (
                <FilterButton
                  key={bidType}
                  label={config.label}
                  selected={filters.bidTypes.includes(bidType)}
                  onClick={() => toggleBidType(bidType)}
                  color={config.color}
                  bgColor={config.bgColor}
                />
              );
            })}
          </Box>
        );

      case 'category':
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {categories.map((cat) => (
              <FilterButton
                key={cat}
                label={cat}
                selected={filters.categories.includes(cat)}
                onClick={() => toggleCategory(cat)}
              />
            ))}
          </Box>
        );

      case 'prefecture':
        return (
          <Box>
            {prefecturesByRegion.map((region) => {
              const selectionState = getPrefRegionSelectionState(region.prefectures);
              return (
                <Box key={region.region} sx={{ mb: 2 }}>
                  <button
                    onClick={() => togglePrefRegion(region.prefectures)}
                    aria-label={`${region.region}の都道府県を一括選択`}
                    aria-pressed={selectionState === 'all'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: fontSizes.xs,
                      fontWeight: 600,
                      color: selectionState === 'none' ? rightPanelColors.textMuted : rightPanelColors.text,
                      marginBottom: '8px',
                      padding: '4px 10px',
                      borderRadius: borderRadius.xs,
                      border: 'none',
                      cursor: 'pointer',
                      background:
                        selectionState === 'all'
                          ? `${colors.accent.blue}40`
                          : selectionState === 'partial'
                            ? `${colors.accent.blue}26`
                            : 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '3px',
                        border: selectionState === 'none' ? `2px solid ${colors.text.muted}` : 'none',
                        background:
                          selectionState === 'all'
                            ? colors.accent.blue
                            : selectionState === 'partial'
                              ? colors.status.info.light
                              : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: colors.text.white,
                      }}
                    >
                      {selectionState === 'all' && '✓'}
                      {selectionState === 'partial' && '−'}
                    </span>
                    {region.region}
                    <span style={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
                      ({region.prefectures.filter(p => filters.prefectures.includes(p)).length}/{region.prefectures.length})
                    </span>
                  </button>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {region.prefectures.map((pref) => (
                      <FilterButton
                        key={pref}
                        label={pref}
                        selected={filters.prefectures.includes(pref)}
                        onClick={() => togglePrefecture(pref)}
                      />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        );

      case 'organization':
        return (
          <Box>
            {organizationGroupsByRegion.map((region) => {
              const selectionState = getOrgRegionSelectionState(region.items);
              return (
                <Box key={region.region} sx={{ mb: 2 }}>
                  <button
                    onClick={() => toggleOrgRegion(region.items)}
                    aria-label={`${region.region}の発注機関を一括選択`}
                    aria-pressed={selectionState === 'all'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: fontSizes.xs,
                      fontWeight: 600,
                      color: selectionState === 'none' ? rightPanelColors.textMuted : rightPanelColors.text,
                      marginBottom: '8px',
                      padding: '4px 10px',
                      borderRadius: borderRadius.xs,
                      border: 'none',
                      cursor: 'pointer',
                      background:
                        selectionState === 'all'
                          ? `${colors.accent.blue}40`
                          : selectionState === 'partial'
                            ? `${colors.accent.blue}26`
                            : 'rgba(255, 255, 255, 0.08)',
                    }}
                  >
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: '3px',
                        border: selectionState === 'none' ? `2px solid ${colors.text.muted}` : 'none',
                        background:
                          selectionState === 'all'
                            ? colors.accent.blue
                            : selectionState === 'partial'
                              ? colors.status.info.light
                              : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        color: colors.text.white,
                      }}
                    >
                      {selectionState === 'all' && '✓'}
                      {selectionState === 'partial' && '−'}
                    </span>
                    {region.region}
                    <span style={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
                      ({region.items.filter(o => filters.organizations.includes(o)).length}/{region.items.length})
                    </span>
                  </button>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {region.items.map((org) => (
                      <FilterButton
                        key={org}
                        label={org}
                        selected={filters.organizations.includes(org)}
                        onClick={() => toggleOrganization(org)}
                      />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* クリアボタン */}
      <Box sx={sectionDivider}>
        <Button
          onClick={onClearAll}
          variant="outlined"
          size="small"
          fullWidth
          disabled={!hasConditions}
          sx={{
            color: hasConditions ? colors.accent.red : rightPanelColors.textMuted,
            borderColor: hasConditions ? `${colors.accent.red}80` : rightPanelColors.inputBorder,
            fontSize: fontSizes.xs,
            py: 0.75,
            '&:hover': {
              borderColor: colors.accent.red,
              backgroundColor: `${colors.accent.red}1a`,
            },
            '&.Mui-disabled': {
              color: rightPanelColors.textMuted,
              borderColor: rightPanelColors.inputBorder,
            },
          }}
        >
          すべてクリア
        </Button>
      </Box>

      {/* 検索 */}
      <Box sx={sectionDivider}>
        <TextField
          placeholder="検索..."
          value={searchQuery}
          onChange={onSearchChange}
          size="small"
          fullWidth
          aria-label="関連案件を検索"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: fontSizes.sm,
              color: rightPanelColors.text,
              backgroundColor: rightPanelColors.inputBg,
              '& fieldset': { borderColor: rightPanelColors.inputBorder },
              '&:hover fieldset': { borderColor: `${colors.text.light}99` },
              '&.Mui-focused fieldset': { borderColor: colors.accent.blue },
            },
            '& .MuiInputBase-input::placeholder': { color: rightPanelColors.textMuted },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ ...iconStyles.medium, color: rightPanelColors.textMuted }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => onSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
                  sx={{ color: rightPanelColors.textMuted }}
                  aria-label="検索をクリア"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* ソート/フィルター タブ */}
      <Box role="tablist" aria-label="関連案件の表示条件">
        <Box sx={{ display: 'flex', borderBottom: `1px solid ${rightPanelColors.border}`, mb: 2 }}>
          <Box
            role="tab"
            aria-selected={mainTab === 'sort'}
            aria-label="ソート"
            onClick={() => setMainTab('sort')}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              py: 1.25,
              cursor: 'pointer',
              borderBottom: mainTab === 'sort' ? `2px solid ${colors.accent.blue}` : '2px solid transparent',
              color: mainTab === 'sort' ? rightPanelColors.text : rightPanelColors.textMuted,
              fontWeight: 600,
              fontSize: fontSizes.sm,
            }}
          >
            <SortIcon sx={iconStyles.medium} />
            ソート
          </Box>
          <Box
            role="tab"
            aria-selected={mainTab === 'filter'}
            aria-label="フィルター"
            onClick={() => setMainTab('filter')}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              py: 1.25,
              cursor: 'pointer',
              borderBottom: mainTab === 'filter' ? `2px solid ${colors.accent.blue}` : '2px solid transparent',
              color: mainTab === 'filter' ? rightPanelColors.text : rightPanelColors.textMuted,
              fontWeight: 600,
              fontSize: fontSizes.sm,
            }}
          >
            <FilterIcon sx={iconStyles.medium} />
            フィルター
            {totalFilterCount > 0 && (
              <Box
                component="span"
                sx={{
                  padding: '2px 6px',
                  borderRadius: borderRadius.xs,
                  fontSize: fontSizes.xs,
                  fontWeight: 600,
                  backgroundColor: `${colors.accent.blue}4d`,
                  color: colors.accent.blue,
                }}
              >
                {totalFilterCount}
              </Box>
            )}
          </Box>
        </Box>

        {/* ソートコンテンツ */}
        {mainTab === 'sort' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {SORT_FIELDS.map(({ field, label, ascLabel, descLabel }) => {
              const ascOption = `${field}_asc` as SortOption;
              const descOption = `${field}_desc` as SortOption;
              const isAsc = sortOption === ascOption;
              const isDesc = sortOption === descOption;
              const isActive = isAsc || isDesc;
              const buttonText = !isActive
                ? label
                : isAsc
                  ? `${label}：${ascLabel}↑`
                  : `${label}：${descLabel}↓`;

              return (
                <Box
                  component="button"
                  key={field}
                  aria-label={`ソート: ${label}`}
                  aria-pressed={isActive}
                  onClick={() => {
                    if (!isActive) {
                      onSortChange(ascOption);
                    } else if (isAsc) {
                      onSortChange(descOption);
                    } else {
                      onSortChange(null);
                    }
                  }}
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    width: '100%',
                    px: 2,
                    pl: isActive ? 2.5 : 2,
                    py: 1.5,
                    fontSize: fontSizes.md,
                    fontWeight: isActive ? 600 : 500,
                    borderRadius: borderRadius.xs,
                    border: `1px solid ${isActive ? colors.accent.blue : rightPanelColors.inputBorder}`,
                    cursor: 'pointer',
                    backgroundColor: isActive ? `${colors.accent.blue}26` : 'transparent',
                    color: isActive ? colors.text.white : rightPanelColors.textMuted,
                    ...(isActive && {
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        backgroundColor: colors.accent.blue,
                      },
                    }),
                    '&:hover': {
                      backgroundColor: isActive ? `${colors.accent.blue}33` : 'rgba(255, 255, 255, 0.06)',
                      color: isActive ? colors.text.white : rightPanelColors.text,
                    },
                  }}
                >
                  {buttonText}
                </Box>
              );
            })}
          </Box>
        )}

        {/* フィルターコンテンツ */}
        {mainTab === 'filter' && (
          <Box>
            {/* カテゴリ選択ボタン（グリッド） */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0.75,
              mb: 2,
              pb: 2,
              borderBottom: `1px solid ${rightPanelColors.border}`
            }}>
              {FILTER_TABS.map((tab, index) => {
                const count = filterCounts[tab.id as keyof typeof filterCounts];
                const isActive = activeFilterTab === index;
                return (
                  <Box
                    component="button"
                    key={tab.id}
                    aria-label={`フィルター: ${tab.label}`}
                    aria-pressed={isActive}
                    onClick={() => setActiveFilterTab(index)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1,
                      py: 1.25,
                      fontSize: fontSizes.xs,
                      fontWeight: isActive ? 600 : 500,
                      borderRadius: borderRadius.xs,
                      border: `1px solid ${isActive ? colors.accent.blue : rightPanelColors.inputBorder}`,
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: isActive ? `${colors.accent.blue}26` : 'transparent',
                      color: isActive ? colors.text.white : rightPanelColors.textMuted,
                      ...(isActive && {
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '3px',
                          backgroundColor: colors.accent.blue,
                        },
                      }),
                      '&:hover': {
                        backgroundColor: isActive ? `${colors.accent.blue}33` : 'rgba(255, 255, 255, 0.06)',
                        color: isActive ? colors.text.white : rightPanelColors.text,
                      },
                    }}
                  >
                    {tab.label}
                    {count > 0 && (
                      <Box
                        component="span"
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          padding: '1px 5px',
                          borderRadius: borderRadius.xs,
                          fontSize: fontSizes.xs,
                          fontWeight: 700,
                          backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : `${colors.accent.blue}cc`,
                          color: colors.text.white,
                          minWidth: 14,
                          textAlign: 'center',
                        }}
                      >
                        {count}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* フィルター詳細コンテンツ */}
            <Box sx={{ minHeight: 100 }}>
              {renderFilterContent()}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

// 着手企業用表示条件パネル
interface CompanyConditionsPanelProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sortOption: CompanySortOption | null;
  onSortChange: (option: CompanySortOption | null) => void;
  filters: CompanyFilterState;
  onFilterChange: (filters: CompanyFilterState) => void;
  onClearAll: () => void;
  activeTab?: 'sort' | 'filter';
  onTabChange?: (tab: 'sort' | 'filter') => void;
}

function CompanyConditionsPanel({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  filters,
  onFilterChange,
  onClearAll,
  activeTab,
  onTabChange,
}: CompanyConditionsPanelProps) {
  const [internalTab, setInternalTab] = useState<'sort' | 'filter'>('sort');
  const [activeFilterTab, setActiveFilterTab] = useState(0);
  const mainTab = activeTab ?? internalTab;
  const setMainTab = (tab: 'sort' | 'filter') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // フィルター件数
  const filterCounts = {
    evaluationStatus: filters.evaluationStatuses.length,
    workStatus: filters.workStatuses.length,
    priority: filters.priorities.length,
  };
  const totalFilterCount = Object.values(filterCounts).reduce((a, b) => a + b, 0);
  const hasConditions = searchQuery.trim() || sortOption !== null || totalFilterCount > 0;

  // トグル関数
  const toggleEvaluationStatus = (status: EvaluationStatus) => {
    const newStatuses = filters.evaluationStatuses.includes(status)
      ? filters.evaluationStatuses.filter(s => s !== status)
      : [...filters.evaluationStatuses, status];
    onFilterChange({ ...filters, evaluationStatuses: newStatuses });
  };

  const toggleWorkStatus = (status: 'in_progress' | 'completed') => {
    const newStatuses = filters.workStatuses.includes(status)
      ? filters.workStatuses.filter(s => s !== status)
      : [...filters.workStatuses, status];
    onFilterChange({ ...filters, workStatuses: newStatuses });
  };

  const togglePriority = (priority: 1 | 2 | 3 | 4 | 5) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onFilterChange({ ...filters, priorities: newPriorities });
  };

  const sectionDivider = {
    borderBottom: `1px solid ${rightPanelColors.border}`,
    pb: 2.5,
    mb: 2.5,
  };

  // フィルターコンテンツをレンダリング
  const renderFilterContent = () => {
    const tabId = COMPANY_FILTER_TABS[activeFilterTab].id;

    switch (tabId) {
      case 'evaluationStatus':
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {EVALUATION_STATUS_OPTIONS.map((status) => {
              const config = evaluationStatusConfig[status];
              return (
                <FilterButton
                  key={status}
                  label={config.label}
                  selected={filters.evaluationStatuses.includes(status)}
                  onClick={() => toggleEvaluationStatus(status)}
                  color={config.color}
                  bgColor={config.bgColor}
                />
              );
            })}
          </Box>
        );

      case 'workStatus':
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {WORK_STATUS_OPTIONS.map((status) => {
              const config = workStatusConfig[status];
              return (
                <FilterButton
                  key={status}
                  label={config.label}
                  selected={filters.workStatuses.includes(status)}
                  onClick={() => toggleWorkStatus(status)}
                  color={config.color}
                  bgColor={`${config.color}26`}
                />
              );
            })}
          </Box>
        );

      case 'priority':
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {PRIORITY_OPTIONS.map((priority) => {
              const config = priorityColors[priority];
              return (
                <FilterButton
                  key={priority}
                  label={priorityLabels[priority]}
                  selected={filters.priorities.includes(priority)}
                  onClick={() => togglePriority(priority)}
                  color={config.color}
                  bgColor={config.bgColor}
                />
              );
            })}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* クリアボタン */}
      <Box sx={sectionDivider}>
        <Button
          onClick={onClearAll}
          variant="outlined"
          size="small"
          fullWidth
          disabled={!hasConditions}
          sx={{
            color: hasConditions ? colors.accent.red : rightPanelColors.textMuted,
            borderColor: hasConditions ? `${colors.accent.red}80` : rightPanelColors.inputBorder,
            fontSize: fontSizes.xs,
            py: 0.75,
            '&:hover': {
              borderColor: colors.accent.red,
              backgroundColor: `${colors.accent.red}1a`,
            },
            '&.Mui-disabled': {
              color: rightPanelColors.textMuted,
              borderColor: rightPanelColors.inputBorder,
            },
          }}
        >
          すべてクリア
        </Button>
      </Box>

      {/* 検索 */}
      <Box sx={sectionDivider}>
        <TextField
          placeholder="企業名で検索..."
          value={searchQuery}
          onChange={onSearchChange}
          size="small"
          fullWidth
          aria-label="企業名で検索"
          sx={{
            '& .MuiOutlinedInput-root': {
              fontSize: fontSizes.sm,
              color: rightPanelColors.text,
              backgroundColor: rightPanelColors.inputBg,
              '& fieldset': { borderColor: rightPanelColors.inputBorder },
              '&:hover fieldset': { borderColor: `${colors.text.light}99` },
              '&.Mui-focused fieldset': { borderColor: colors.accent.blue },
            },
            '& .MuiInputBase-input::placeholder': { color: rightPanelColors.textMuted },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ ...iconStyles.medium, color: rightPanelColors.textMuted }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => onSearchChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)}
                  sx={{ color: rightPanelColors.textMuted }}
                  aria-label="検索をクリア"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* ソート/フィルター タブ */}
      <Box role="tablist" aria-label="着手企業の表示条件">
        <Box sx={{ display: 'flex', borderBottom: `1px solid ${rightPanelColors.border}`, mb: 2 }}>
          <Box
            role="tab"
            aria-selected={mainTab === 'sort'}
            aria-label="ソート"
            onClick={() => setMainTab('sort')}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              py: 1.25,
              cursor: 'pointer',
              borderBottom: mainTab === 'sort' ? `2px solid ${colors.accent.blue}` : '2px solid transparent',
              color: mainTab === 'sort' ? rightPanelColors.text : rightPanelColors.textMuted,
              fontWeight: 600,
              fontSize: fontSizes.sm,
            }}
          >
            <SortIcon sx={iconStyles.medium} />
            ソート
          </Box>
          <Box
            role="tab"
            aria-selected={mainTab === 'filter'}
            aria-label="フィルター"
            onClick={() => setMainTab('filter')}
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              py: 1.25,
              cursor: 'pointer',
              borderBottom: mainTab === 'filter' ? `2px solid ${colors.accent.blue}` : '2px solid transparent',
              color: mainTab === 'filter' ? rightPanelColors.text : rightPanelColors.textMuted,
              fontWeight: 600,
              fontSize: fontSizes.sm,
            }}
          >
            <FilterIcon sx={iconStyles.medium} />
            フィルター
            {totalFilterCount > 0 && (
              <Box
                component="span"
                sx={{
                  padding: '2px 6px',
                  borderRadius: borderRadius.xs,
                  fontSize: fontSizes.xs,
                  fontWeight: 600,
                  backgroundColor: `${colors.accent.blue}4d`,
                  color: colors.accent.blue,
                }}
              >
                {totalFilterCount}
              </Box>
            )}
          </Box>
        </Box>

        {/* ソートコンテンツ */}
        {mainTab === 'sort' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {COMPANY_SORT_FIELDS.map(({ field, label, ascLabel, descLabel }) => {
              const ascOption = `${field}_asc` as CompanySortOption;
              const descOption = `${field}_desc` as CompanySortOption;
              const isAsc = sortOption === ascOption;
              const isDesc = sortOption === descOption;
              const isActive = isAsc || isDesc;
              const buttonText = !isActive
                ? label
                : isAsc
                  ? `${label}：${ascLabel}↑`
                  : `${label}：${descLabel}↓`;

              return (
                <Box
                  component="button"
                  key={field}
                  aria-label={`ソート: ${label}`}
                  aria-pressed={isActive}
                  onClick={() => {
                    if (!isActive) {
                      onSortChange(ascOption);
                    } else if (isAsc) {
                      onSortChange(descOption);
                    } else {
                      onSortChange(null);
                    }
                  }}
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    width: '100%',
                    px: 2,
                    pl: isActive ? 2.5 : 2,
                    py: 1.5,
                    fontSize: fontSizes.md,
                    fontWeight: isActive ? 600 : 500,
                    borderRadius: borderRadius.xs,
                    border: `1px solid ${isActive ? colors.accent.blue : rightPanelColors.inputBorder}`,
                    cursor: 'pointer',
                    backgroundColor: isActive ? `${colors.accent.blue}26` : 'transparent',
                    color: isActive ? colors.text.white : rightPanelColors.textMuted,
                    ...(isActive && {
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: '3px',
                        backgroundColor: colors.accent.blue,
                      },
                    }),
                    '&:hover': {
                      backgroundColor: isActive ? `${colors.accent.blue}33` : 'rgba(255, 255, 255, 0.06)',
                      color: isActive ? colors.text.white : rightPanelColors.text,
                    },
                  }}
                >
                  {buttonText}
                </Box>
              );
            })}
          </Box>
        )}

        {/* フィルターコンテンツ */}
        {mainTab === 'filter' && (
          <Box>
            {/* カテゴリ選択ボタン（グリッド） */}
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0.75,
              mb: 2,
              pb: 2,
              borderBottom: `1px solid ${rightPanelColors.border}`
            }}>
              {COMPANY_FILTER_TABS.map((tab, index) => {
                const count = filterCounts[tab.id as keyof typeof filterCounts];
                const isActive = activeFilterTab === index;
                return (
                  <Box
                    component="button"
                    key={tab.id}
                    aria-label={`フィルター: ${tab.label}`}
                    aria-pressed={isActive}
                    onClick={() => setActiveFilterTab(index)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1,
                      py: 1.25,
                      fontSize: fontSizes.xs,
                      fontWeight: isActive ? 600 : 500,
                      borderRadius: borderRadius.xs,
                      border: `1px solid ${isActive ? colors.accent.blue : rightPanelColors.inputBorder}`,
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: isActive ? `${colors.accent.blue}26` : 'transparent',
                      color: isActive ? colors.text.white : rightPanelColors.textMuted,
                      ...(isActive && {
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '3px',
                          backgroundColor: colors.accent.blue,
                        },
                      }),
                      '&:hover': {
                        backgroundColor: isActive ? `${colors.accent.blue}33` : 'rgba(255, 255, 255, 0.06)',
                        color: isActive ? colors.text.white : rightPanelColors.text,
                      },
                    }}
                  >
                    {tab.label}
                    {count > 0 && (
                      <Box
                        component="span"
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          padding: '1px 5px',
                          borderRadius: borderRadius.xs,
                          fontSize: fontSizes.xs,
                          fontWeight: 700,
                          backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : `${colors.accent.blue}cc`,
                          color: colors.text.white,
                          minWidth: 14,
                          textAlign: 'center',
                        }}
                      >
                        {count}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>

            {/* フィルター詳細コンテンツ */}
            <Box sx={{ minHeight: 100 }}>
              {renderFilterContent()}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}


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
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
                  {paginatedRelatedAnnouncements.length > 0 ? (
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 1.5 }}>
                      {paginatedRelatedAnnouncements.map((ann) => {
                        const annStatusKey = resolveAnnouncementStatus(ann.status as string | undefined);
                        const annStatusConfig = announcementStatusConfig[annStatusKey];
                        const bidType = bidTypeConfig[resolveBidType(ann.bidType)];
                        const prefecture = ann.workLocation?.match(/^(.+?[都道府県])/)?.[1] || '';
                        return (
                          <Box
                            key={ann.id}
                            onClick={() => navigate(`/announcements/${ann.id}`)}
                            sx={{
                              position: 'relative',
                              display: 'flex',
                              flexDirection: 'column',
                              backgroundColor: colors.text.white,
                              borderRadius: borderRadius.xs,
                              border: `1px solid ${colors.border.main}`,
                              p: 2,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              '&:hover': { borderColor: 'rgba(59, 130, 246, 0.4)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' },
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: '3px',
                                backgroundColor: annStatusConfig.color,
                                borderRadius: `${borderRadius.xs} 0 0 ${borderRadius.xs}`,
                              },
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.light }}>
                                No. {String(ann.no).padStart(8, '0')}
                              </Typography>
                              <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: annStatusConfig.color }}>
                                {annStatusConfig.label}
                              </Typography>
                              {bidType && (
                                <>
                                  <Box sx={{ width: '1px', height: '12px', backgroundColor: colors.border.main }} />
                                  <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
                                    {bidType.label}
                                  </Typography>
                                </>
                              )}
                            </Box>
                            <Typography sx={{ fontWeight: 600, fontSize: fontSizes.md, color: colors.text.secondary, lineHeight: 1.5, mb: 1, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {ann.title}
                            </Typography>
                            <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.light, mb: 0.5 }}>
                              {ann.organization}
                            </Typography>
                            <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.light, mb: 0.75 }}>
                              {prefecture && `${prefecture}・`}{ann.category}
                            </Typography>
                            <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
                              公告日 {ann.publishDate} / 締切日 {ann.deadline}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Box sx={{ p: 4, textAlign: 'center', color: colors.text.light }}>
                      関連案件がありません
                    </Box>
                  )}
                </Box>
                <Box sx={{ backgroundColor: colors.text.white, borderTop: `1px solid ${colors.border.main}`, px: 2 }}>
                  <CustomPagination
                    page={relatedPage}
                    pageSize={relatedPageSize}
                    rowCount={filteredRelatedAnnouncements.length}
                    onPageChange={setRelatedPage}
                    onPageSizeChange={() => {}}
                  />
                </Box>
              </Box>
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
