import { Box, Typography, Button, Tabs, Tab } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { announcementStatusConfig, bidTypeConfig } from '../../data';
import { colors, pageStyles, fontSizes, iconStyles, borderRadius } from '../../constants/styles';
import type { BidType, AnnouncementStatus } from '../../types/announcement';
import type { Announcement as AnnouncementType } from '../../types';

export type AnnouncementDetail = AnnouncementType & {
  announcementNo: number;
  no: number;
  status?: AnnouncementStatus | string;
};

export const resolveAnnouncementStatus = (status?: string | null): AnnouncementStatus => {
  if (status && typeof status === 'string' && (announcementStatusConfig as Record<string, unknown>)[status]) {
    return status as AnnouncementStatus;
  }
  return 'upcoming';
};

export const resolveBidType = (bidType?: string | null): BidType => {
  if (bidType && typeof bidType === 'string' && (bidTypeConfig as Record<string, unknown>)[bidType]) {
    return bidType as BidType;
  }
  return 'unknown';
};

interface AnnouncementHeaderProps {
  announcement: AnnouncementDetail;
  onBack: () => void;
}

export function AnnouncementHeader({ announcement, onBack }: AnnouncementHeaderProps) {
  const announcementStatus = resolveAnnouncementStatus(announcement.status as string | undefined);
  const statusConfig = announcementStatusConfig[announcementStatus];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', mb: 2 }}>
      <Box
        sx={{
          pl: 2,
          borderLeft: '4px solid',
          borderColor: statusConfig.color,
        }}
      >
        {/* ステータス類 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 0.5, flexWrap: 'wrap' }}>
          {/* 一覧に戻る */}
          <Button
            size="small"
            startIcon={<ArrowBackIcon sx={iconStyles.small} />}
            onClick={onBack}
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

          {/* ステータス */}
          <Typography
            sx={{
              fontSize: fontSizes.base,
              fontWeight: 700,
              color: statusConfig.color,
            }}
          >
            {statusConfig.label}
          </Typography>

          <Typography sx={{ color: colors.border.dark }}>|</Typography>

          {/* カテゴリ */}
          <Typography sx={{ fontSize: fontSizes.base, fontWeight: 700, color: colors.primary.dark }}>
            {announcement.category}
          </Typography>

          <Typography sx={{ color: colors.border.dark }}>|</Typography>

          {/* 入札形式 */}
          <Typography sx={{ fontSize: fontSizes.base, fontWeight: 700, color: colors.primary.dark }}>
            {bidTypeConfig[resolveBidType(announcement.bidType)].label}
          </Typography>
        </Box>

        {/* タイトル */}
        <Typography sx={pageStyles.detailPageTitle}>
          {announcement.title}
        </Typography>
      </Box>

      {/* 右上No */}
      <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light, flexShrink: 0, ml: 2 }}>
        No. {String(announcement.no).padStart(8, '0')}
      </Typography>
    </Box>
  );
}

interface AnnouncementTabsProps {
  activeTab: number;
  onTabChange: (value: number) => void;
  hasDocuments: boolean;
  relatedCount: number;
  companiesCount: number;
}

export function AnnouncementTabs({
  activeTab,
  onTabChange,
  hasDocuments,
  relatedCount,
  companiesCount,
}: AnnouncementTabsProps) {
  return (
    <Box sx={{ borderBottom: `1px solid ${colors.border.main}`, backgroundColor: colors.text.white }}>
      <Tabs
        value={activeTab}
        onChange={(_, v) => onTabChange(v)}
        sx={{
          px: 2,
          '& .MuiTabs-indicator': { backgroundColor: colors.primary.main, height: 2 },
          '& .MuiTab-root': {
            textTransform: 'none',
            fontSize: fontSizes.md,
            fontWeight: 500,
            color: colors.text.muted,
            minWidth: 'auto',
            px: 2,
            py: 1.5,
            '&.Mui-selected': { color: colors.primary.main, fontWeight: 600 },
          },
        }}
      >
        <Tab label="基本情報" />
        {hasDocuments && <Tab label="資料" />}
        <Tab label={`関連案件 (${relatedCount})`} />
        <Tab label={`着手企業 (${companiesCount})`} />
      </Tabs>
    </Box>
  );
}
