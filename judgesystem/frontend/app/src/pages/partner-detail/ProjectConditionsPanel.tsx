import { useState, useMemo } from 'react';
import {
  Box,
  Button,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  SwapVert as SortIcon,
  FilterAlt as FilterIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { bidTypeConfig } from '../../data';
import { colors, fontSizes, borderRadius, rightPanelColors, iconStyles } from '../../constants/styles';
import { workStatusConfig } from '../../constants/workStatus';
import { evaluationStatusConfig } from '../../constants/status';
import { priorityLabels, priorityColors } from '../../constants/priority';
import { categories } from '../../constants/categories';
import { bidTypes } from '../../constants/bidType';
import { prefecturesByRegion } from '../../constants/prefectures';
import { organizationGroupsByRegion } from '../../constants/organizations';
import { FilterButton } from '../../components/common';
import type { BidType } from '../../types/announcement';
import type { EvaluationStatus, WorkStatus, CompanyPriority } from '../../types';
import type { PastProject } from '../../types/partner';
import type { SortOption, ProjectFilterState } from './types';
import {
  SORT_FIELDS,
  FILTER_TABS,
  WORK_STATUS_OPTIONS,
  EVALUATION_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
} from './types';

/** Props for ProjectConditionsPanel */
export interface ProjectConditionsPanelProps {
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

/**
 * Side panel for controlling search, sort, and filter conditions
 * on the partner's project history list.
 */
export function ProjectConditionsPanel({
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

  // Status counts computed from source data
  const statusCounts = useMemo(() => ({
    all_met: projects.filter(p => p.evaluationStatus === 'all_met').length,
    other_only_unmet: projects.filter(p => p.evaluationStatus === 'other_only_unmet').length,
    unmet: projects.filter(p => p.evaluationStatus === 'unmet').length,
  }), [projects]);

  // Filter counts
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

  // Toggle functions
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

  // Render filter content by active tab
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
                      {selectionState === 'all' && String.fromCharCode(10003)}
                      {selectionState === 'partial' && String.fromCharCode(8722)}
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
                      {selectionState === 'all' && String.fromCharCode(10003)}
                      {selectionState === 'partial' && String.fromCharCode(8722)}
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
      {/* Clear button */}
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

      {/* Search */}
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

      {/* Sort / Filter tabs */}
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

        {/* Sort content */}
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

        {/* Filter content */}
        {mainTab === 'filter' && (
          <Box>
            {/* Category selection buttons (grid) */}
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

            {/* Filter detail content */}
            <Box sx={{ minHeight: 100 }}>
              {renderFilterContent()}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
