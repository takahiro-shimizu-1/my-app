import { Box, Button, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { ordererCategoryConfig } from '../../data';
import { colors, pageStyles, fontSizes, iconStyles } from '../../constants/styles';
import type { Orderer } from '../../types/orderer';

/** Props for OrdererDetailHeader */
export interface OrdererDetailHeaderProps {
  orderer: Orderer;
  onBack: () => void;
}

/**
 * Header section for the orderer detail page.
 * Displays category, name, last announcement date, and count.
 */
export function OrdererDetailHeader({ orderer, onBack }: OrdererDetailHeaderProps) {
  const categoryConfig = ordererCategoryConfig[orderer.category];

  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', mb: 2 }}>
      <Box sx={{ pl: 2, borderLeft: '4px solid', borderColor: categoryConfig.color }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 0.5, flexWrap: 'wrap' }}>
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
          <Typography sx={{ fontSize: fontSizes.base, fontWeight: 700, color: categoryConfig.color }}>
            {categoryConfig.label}
          </Typography>
          <Typography sx={{ color: colors.border.dark }}>|</Typography>
          <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted }}>
            最終公告: {orderer.lastAnnouncementDate}
          </Typography>
        </Box>
        <Typography sx={pageStyles.detailPageTitle}>
          {orderer.name}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light }}>
          No. {String(orderer.no).padStart(8, '0')}
        </Typography>
        <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 700, color: colors.primary.main }}>
          <Typography component="span" sx={{ fontSize: fontSizes.sm, fontWeight: 500, color: colors.text.muted }}>
            公告件数{" "}
          </Typography>
          {orderer.announcementCount.toLocaleString()}件
        </Typography>
      </Box>
    </Box>
  );
}
