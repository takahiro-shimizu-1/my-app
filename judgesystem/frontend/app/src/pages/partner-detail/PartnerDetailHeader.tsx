import { Box, Button, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { colors, pageStyles, fontSizes, iconStyles } from '../../constants/styles';
import type { PartnerDetail } from '../../types/partner';

/** Props for PartnerDetailHeader */
export interface PartnerDetailHeaderProps {
  partner: PartnerDetail;
  projectCount: number;
  onBack: () => void;
}

/**
 * Header section for the partner detail page.
 * Displays partner name, number, and project count.
 */
export function PartnerDetailHeader({ partner, projectCount, onBack }: PartnerDetailHeaderProps) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', mb: 2 }}>
      <Box sx={{ pl: 2, borderLeft: '4px solid', borderColor: colors.accent.blue }}>
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
        </Box>
        <Typography sx={pageStyles.detailPageTitle}>
          {partner.name}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'right', flexShrink: 0, ml: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light }}>
          No. {String(partner.no).padStart(8, '0')}
        </Typography>
        <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 700, color: colors.accent.blue }}>
          <Typography component="span" sx={{ fontSize: fontSizes.sm, fontWeight: 500, color: colors.text.muted }}>
            対応案件実績{" "}
          </Typography>
          {projectCount}件
        </Typography>
      </Box>
    </Box>
  );
}
