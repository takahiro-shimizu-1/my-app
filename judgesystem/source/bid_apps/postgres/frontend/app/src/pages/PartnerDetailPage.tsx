import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  ArrowBack as ArrowBackIcon,
  SwapVert as SortIcon,
  FilterAlt as FilterIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { bidTypeConfig } from '../data';
import { colors, pageStyles, fontSizes, iconStyles, borderRadius, rightPanelColors } from '../constants/styles';
import { workStatusConfig } from '../constants/workStatus';
import { evaluationStatusConfig } from '../constants/status';
import { priorityLabels, priorityColors } from '../constants/priority';
import { categories } from '../constants/categories';
import { bidTypes } from '../constants/bidType';
import { prefecturesByRegion } from '../constants/prefectures';
import { organizationGroupsByRegion } from '../constants/organizations';
import { NotFoundView, FloatingBackButton, ScrollToTopButton } from '../components/common';
import { RightSidePanel } from '../components/layout';
import { PartnerBasicInfo, PartnerQualifications, PartnerHistory } from '../components/partner';
import { useSidebar } from '../contexts/SidebarContext';
import type { PastProject } from '../types/partner';
import type { BidType } from '../types/announcement';
import type { EvaluationStatus, WorkStatus, CompanyPriority } from '../types';
import { getApiUrl } from '../config/api';

// ソートオプション
type SortOption =
  | 'deadline_asc' | 'deadline_desc'
  | 'evaluationStatus_asc' | 'evaluationStatus_desc'
  | 'workStatus_asc' | 'workStatus_desc'
  | 'priority_asc' | 'priority_desc'
  | 'prefecture_asc' | 'prefecture_desc'
  | 'evaluatedAt_asc' | 'evaluatedAt_desc';

// ソートフィールド定義
const SORT_FIELDS = [
  { field: 'deadline', label: '締切', ascLabel: '近い', descLabel: '遠い' },
  { field: 'evaluationStatus', label: '参加可否', ascLabel: '可能→不可', descLabel: '不可→可能' },
  { field: 'workStatus', label: '着手状況', ascLabel: '未着手→完了', descLabel: '完了→未着手' },
  { field: 'priority', label: '優先度', ascLabel: '高→低', descLabel: '低→高' },
  { field: 'prefecture', label: '都道府県', ascLabel: 'あ→わ', descLabel: 'わ→あ' },
  { field: 'evaluatedAt', label: '判定日', ascLabel: '古い→新しい', descLabel: '新しい→古い' },
] as const;

// フィルタータブ定義
const FILTER_TABS = [
  { id: 'evaluationStatus', label: '参加可否' },
  { id: 'priority', label: '優先度' },
  { id: 'workStatus', label: '着手状況' },
  { id: 'bidType', label: '入札方式' },
  { id: 'category', label: '種別' },
  { id: 'prefecture', label: '都道府県' },
  { id: 'organization', label: '発注機関' },
] as const;

// フィルター状態の型
interface ProjectFilterState {
  workStatuses: WorkStatus[];
  evaluationStatuses: EvaluationStatus[];
  priorities: CompanyPriority[];
  bidTypes: string[];
  categories: string[];
  prefectures: string[];
  organizations: string[];
}

// WorkStatus, EvaluationStatus, Priority の配列
const WORK_STATUS_OPTIONS: WorkStatus[] = ['not_started', 'in_progress', 'completed'];
const EVALUATION_STATUS_OPTIONS: EvaluationStatus[] = ['all_met', 'other_only_unmet', 'unmet'];
const PRIORITY_OPTIONS: CompanyPriority[] = [1, 2, 3, 4, 5];

// WorkStatusの順序（ソート用）
const WORK_STATUS_ORDER: Record<WorkStatus, number> = {
  not_started: 0,
  in_progress: 1,
  completed: 2,
};

// EvaluationStatusの順序（ソート用：all_met→other_only_unmet→unmet）
const EVALUATION_STATUS_ORDER: Record<EvaluationStatus, number> = {
  all_met: 0,
  other_only_unmet: 1,
  unmet: 2,
};

// フィルターボタン
function FilterButton({
  label,
  selected,
  onClick,
  color,
  bgColor,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  color?: string;
  bgColor?: string;
}) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        position: 'relative',
        padding: '6px 12px',
        paddingLeft: selected ? '14px' : '12px',
        borderRadius: borderRadius.xs,
        fontSize: fontSizes.xs,
        fontWeight: selected ? 600 : 500,
        cursor: 'pointer',
        border: `1px solid ${selected ? (color || colors.accent.blue) : rightPanelColors.inputBorder}`,
        transition: 'all 0.2s ease',
        backgroundColor: selected ? bgColor || `${colors.accent.blue}26` : 'transparent',
        color: selected ? (color || colors.text.white) : rightPanelColors.textMuted,
        overflow: 'hidden',
        ...(selected && {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '3px',
            backgroundColor: color || colors.accent.blue,
          },
        }),
        '&:hover': {
          backgroundColor: selected ? bgColor || `${colors.accent.blue}33` : 'rgba(255, 255, 255, 0.06)',
          color: selected ? (color || colors.text.white) : rightPanelColors.text,
          borderColor: selected ? (color || colors.accent.blue) : `${colors.text.light}99`,
        },
      }}
    >
      {label}
    </Box>
  );
}

// 案件用表示条件パネル
interface ProjectConditionsPanelProps {
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  sortOption: SortOption | null;
  onSortChange: (option: SortOption | null) => void;
  filters: ProjectFilterState;
  onFilterChange: (filters: ProjectFilterState) => void;
  onClearAll: () => void;
  activeTab?: 'sort' | 'filter';
  onTabChange?: (tab: 'sort' | 'filter') => void;
  projects: PastProject[];
}

function ProjectConditionsPanel({
  searchQuery,
  onSearchChange,
  sortOption,
  onSortChange,
  filters,
  onFilterChange,
  onClearAll,
  activeTab,
  onTabChange,
  projects,
}: ProjectConditionsPanelProps) {
  const [internalTab, setInternalTab] = useState<'sort' | 'filter'>('sort');
  const [activeFilterTab, setActiveFilterTab] = useState(0);
  const mainTab = activeTab ?? internalTab;
  const setMainTab = (tab: 'sort' | 'filter') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // ステータス件数（元データから計算）
  const statusCounts = useMemo(() => ({
    all_met: projects.filter(p => p.evaluationStatus === 'all_met').length,
    other_only_unmet: projects.filter(p => p.evaluationStatus === 'other_only_unmet').length,
    unmet: projects.filter(p => p.evaluationStatus === 'unmet').length,
  }), [projects]);

  // フィルター件数
  const filterCounts = {
    workStatus: filters.workStatuses.length,
    evaluationStatus: filters.evaluationStatuses.length,
    priority: filters.priorities.length,
    bidType: filters.bidTypes.length,
    category: filters.categories.length,
    prefecture: filters.prefectures.length,
    organization: filters.organizations.length,
  };
  const totalFilterCount = Object.values(filterCounts).reduce((a, b) => a + b, 0);
  const hasConditions = searchQuery.trim() || sortOption !== null || totalFilterCount > 0;

  // トグル関数
  const toggleWorkStatus = (status: WorkStatus) => {
    const newStatuses = filters.workStatuses.includes(status)
      ? filters.workStatuses.filter(s => s !== status)
      : [...filters.workStatuses, status];
    onFilterChange({ ...filters, workStatuses: newStatuses });
  };

  const toggleEvaluationStatus = (status: EvaluationStatus) => {
    const newStatuses = filters.evaluationStatuses.includes(status)
      ? filters.evaluationStatuses.filter(s => s !== status)
      : [...filters.evaluationStatuses, status];
    onFilterChange({ ...filters, evaluationStatuses: newStatuses });
  };

  const togglePriority = (priority: CompanyPriority) => {
    const newPriorities = filters.priorities.includes(priority)
      ? filters.priorities.filter(p => p !== priority)
      : [...filters.priorities, priority];
    onFilterChange({ ...filters, priorities: newPriorities });
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
                  bgColor={config.bgColor}
                />
              );
            })}
          </Box>
        );

      case 'evaluationStatus':
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {EVALUATION_STATUS_OPTIONS.map((status) => {
              const config = evaluationStatusConfig[status];
              return (
                <FilterButton
                  key={status}
                  label={`${config.label} (${statusCounts[status]})`}
                  selected={filters.evaluationStatuses.includes(status)}
                  onClick={() => toggleEvaluationStatus(status)}
                  color={config.color}
                  bgColor={config.bgColor}
                />
              );
            })}
          </Box>
        );

      case 'priority':
        return (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {PRIORITY_OPTIONS.map((priority) => {
              const pColor = priorityColors[priority];
              return (
                <FilterButton
                  key={priority}
                  label={priorityLabels[priority]}
                  selected={filters.priorities.includes(priority)}
                  onClick={() => togglePriority(priority)}
                  color={pColor.color}
                  bgColor={pColor.bgColor}
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
                    <span style={{ fontSize: fontSizes.xs, color: rightPanelColors.textMuted }}>
                      ({region.prefectures.filter(item => filters.prefectures.includes(item)).length}/{region.prefectures.length})
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
            {organizationGroupsByRegion.map((group) => {
              const selectionState = getOrgRegionSelectionState(group.items);
              return (
                <Box key={group.region} sx={{ mb: 2 }}>
                  <button
                    onClick={() => toggleOrgRegion(group.items)}
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
                    {group.region}
                    <span style={{ fontSize: fontSizes.xs, color: rightPanelColors.textMuted }}>
                      ({group.items.filter(item => filters.organizations.includes(item)).length}/{group.items.length})
                    </span>
                  </button>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {group.items.map((org) => (
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
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* ソート/フィルター タブ */}
      <Box>
        <Box sx={{ display: 'flex', borderBottom: `1px solid ${rightPanelColors.border}`, mb: 2 }}>
          <Box
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
                const handleDoubleClick = () => {
                  switch (tab.id) {
                    case 'evaluationStatus':
                      onFilterChange({ ...filters, evaluationStatuses: [] });
                      break;
                    case 'priority':
                      onFilterChange({ ...filters, priorities: [] });
                      break;
                    case 'workStatus':
                      onFilterChange({ ...filters, workStatuses: [] });
                      break;
                    case 'bidType':
                      onFilterChange({ ...filters, bidTypes: [] });
                      break;
                    case 'category':
                      onFilterChange({ ...filters, categories: [] });
                      break;
                    case 'prefecture':
                      onFilterChange({ ...filters, prefectures: [] });
                      break;
                    case 'organization':
                      onFilterChange({ ...filters, organizations: [] });
                      break;
                  }
                };
                return (
                  <Box
                    component="button"
                    key={tab.id}
                    onClick={() => setActiveFilterTab(index)}
                    onDoubleClick={handleDoubleClick}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1,
                      py: 1.25,
                      fontSize: fontSizes.sm,
                      fontWeight: isActive ? 600 : 500,
                      borderRadius: borderRadius.xs,
                      border: `1px solid ${isActive ? colors.accent.blue : rightPanelColors.inputBorder}`,
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      backgroundColor: isActive ? `${colors.accent.blue}26` : 'transparent',
                      color: isActive ? colors.text.white : rightPanelColors.textMuted,
                      transition: 'all 0.2s ease',
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
                        borderColor: isActive ? colors.accent.blue : `${colors.text.light}99`,
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

export default function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const { rightPanelOpen, toggleRightPanel, closeRightPanel, isMobile } = useSidebar();
  const [conditionTab, setConditionTab] = useState<'sort' | 'filter'>('sort');

  // APIからデータ取得
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 詳細ページのパスを保存（一覧に戻った時のページ復元用）
  useEffect(() => {
    try {
      sessionStorage.setItem(NAV_TRACKING_KEY, location.pathname);
    } catch { /* ignore */ }
  }, [location.pathname]);

  // パートナー情報をAPIから取得
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

  // 対応案件のページネーション・検索状態
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [projectPage, setProjectPage] = useState(0);
  const projectPageSize = 25;

  // ソート・フィルター状態
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

  // サイドパネル制御
  const handleOpenWithTab = useCallback((tab: 'sort' | 'filter') => {
    setConditionTab(tab);
    if (!rightPanelOpen) {
      toggleRightPanel();
    }
  }, [rightPanelOpen, toggleRightPanel]);

  // 対応案件のフィルタリング
  const filteredProjects = useMemo((): PastProject[] => {
    if (!partner) return [];
    const pastProjects = partner.pastProjects || [];
    if (!Array.isArray(pastProjects)) return [];

    // 検索フィルター
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

    // フィルター適用
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

    // ソート適用
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

  // ページネーションされた対応案件
  const paginatedProjects = useMemo(() => {
    const start = projectPage * projectPageSize;
    return filteredProjects.slice(start, start + projectPageSize);
  }, [filteredProjects, projectPage]);

  // 検索変更ハンドラ
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

  // データ構造の保証（デフォルト値設定）
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
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', mb: 2 }}>
          <Box sx={{ pl: 2, borderLeft: '4px solid', borderColor: colors.accent.blue }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 0.5, flexWrap: 'wrap' }}>
              <Button
                size="small"
                startIcon={<ArrowBackIcon sx={iconStyles.small} />}
                onClick={() => navigate('/partners')}
                sx={{
                  color: colors.text.muted,
                  fontWeight: 500,
                  fontSize: fontSizes.sm,
                  textTransform: 'none',
                  px: 1,
                  py: 0.25,
                  minWidth: 'auto',
                  '&:hover': { backgroundColor: colors.border.light },
                }}
              >
                一覧に戻る
              </Button>
            </Box>
            <Typography sx={pageStyles.detailPageTitle}>
              {safePartner.name}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light }}>
              No. {String(safePartner.no).padStart(8, '0')}
            </Typography>
            <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 700, color: colors.accent.blue }}>
              <Typography component="span" sx={{ fontSize: fontSizes.sm, fontWeight: 500, color: colors.text.muted }}>
                対応案件実績{" "}
              </Typography>
              {safePartner.pastProjects.length}件
            </Typography>
          </Box>
        </Box>

        {/* メインカード + サイドパネル */}
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <Paper sx={{ borderRadius: borderRadius.xs, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)', flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* タブ */}
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

            {/* タブコンテンツ */}
            <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: colors.background.hover, display: 'flex', flexDirection: 'column' }}>
            {/* 基本情報タブ */}
            {activeTab === 0 && (
              <Box sx={{ p: 2.5 }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
                  {/* 左カラム */}
                  <PartnerBasicInfo partner={safePartner} />

                  {/* 右カラム */}
                  <PartnerQualifications partner={safePartner} />
                </Box>
              </Box>
            )}

            {/* 対応案件タブ */}
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

          {/* 右サイドパネル（対応案件タブの時のみ表示） */}
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
