import { useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Menu,
  MenuItem,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  FilterAlt as FilterIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import {
  colors,
  fontSizes,
  iconStyles,
  chipStyles,
} from '../../../../constants/styles';
import type { PartnerStatus } from '../../../../types';
import { partnerStatusLabels, partnerStatusColors } from '../../../../constants/partnerStatus';

// ステータスチップ（クリックで変更可能）
export function StatusChip({
  status,
  onStatusChange,
}: {
  status: PartnerStatus;
  onStatusChange: (newStatus: PartnerStatus) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const config = partnerStatusColors[status];

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleSelect = (newStatus: PartnerStatus) => {
    onStatusChange(newStatus);
    handleClose();
  };

  const allStatuses: PartnerStatus[] = [
    'not_called', 'waiting_documents', 'waiting_response',
    'estimate_in_progress', 'estimate_completed', 'estimate_adopted', 'unavailable',
  ];

  return (
    <>
      <Chip
        label={partnerStatusLabels[status]}
        size="small"
        onClick={handleClick}
        deleteIcon={<ArrowDownIcon sx={iconStyles.small} />}
        onDelete={handleClick}
        sx={{
          ...chipStyles.medium,
          backgroundColor: config.bgColor,
          color: config.color,
          cursor: 'pointer',
          '& .MuiChip-deleteIcon': { color: config.color, ...iconStyles.small },
        }}
      />
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {allStatuses.map((s) => {
          const sConfig = partnerStatusColors[s];
          return (
            <MenuItem
              key={s}
              onClick={() => handleSelect(s)}
              selected={s === status}
              sx={{ fontSize: fontSizes.sm, color: sConfig.color, '&.Mui-selected': { backgroundColor: sConfig.bgColor } }}
            >
              {partnerStatusLabels[s]}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}

// 現地調査OKボタン
export function SurveyApprovedButton({ approved, onToggle }: { approved: boolean; onToggle: () => void }) {
  return (
    <Chip
      icon={approved ? <CheckCircleIcon sx={iconStyles.small} /> : <UncheckedIcon sx={iconStyles.small} />}
      label="現地調査OK"
      size="small"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      sx={{
        ...chipStyles.medium,
        backgroundColor: approved ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
        color: approved ? colors.accent.green : colors.text.muted,
        border: `1px solid ${approved ? colors.accent.green : colors.border.main}`,
        cursor: 'pointer',
        '& .MuiChip-icon': { color: approved ? colors.accent.green : colors.text.muted },
      }}
    />
  );
}

// フィルターチップ
export function FilterChips({
  selectedStatuses,
  showUnavailable,
  onToggleStatus,
  onToggleShowUnavailable,
}: {
  selectedStatuses: PartnerStatus[];
  showUnavailable: boolean;
  onToggleStatus: (status: PartnerStatus) => void;
  onToggleShowUnavailable: () => void;
}) {
  const allStatuses: PartnerStatus[] = ['not_called', 'waiting_documents', 'waiting_response', 'estimate_in_progress', 'estimate_completed', 'estimate_adopted'];

  return (
    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center', flexWrap: 'wrap', mb: 1 }}>
      <FilterIcon sx={{ ...iconStyles.medium, color: colors.text.muted }} />
      {allStatuses.map((status) => {
        const isSelected = selectedStatuses.includes(status);
        const config = partnerStatusColors[status];
        return (
          <Chip
            key={status}
            label={partnerStatusLabels[status]}
            size="small"
            onClick={() => onToggleStatus(status)}
            sx={{
              ...chipStyles.medium,
              backgroundColor: isSelected ? config.bgColor : colors.background.paper,
              color: isSelected ? config.color : colors.text.muted,
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: isSelected ? config.bgColor : colors.border.light,
              },
            }}
          />
        );
      })}
      <FormControlLabel
        control={<Checkbox checked={showUnavailable} onChange={onToggleShowUnavailable} size="small" sx={{ p: 0.5 }} />}
        label={<Typography sx={{ fontSize: fontSizes.sm, color: colors.text.muted }}>対応不可</Typography>}
        sx={{ ml: 1, mr: 0 }}
      />
    </Box>
  );
}
