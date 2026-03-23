import {
  Box,
  Chip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Print as FaxIcon,
  CalendarMonth as CalendarIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { colors, fontSizes, chipStyles, iconStyles, borderRadius } from '../../constants/styles';
import type { Orderer } from '../../types/orderer';

/** Props for OrdererInfoTab */
export interface OrdererInfoTabProps {
  orderer: Orderer;
}

/** Local info row for orderer detail display */
function OrdererInfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.25, borderBottom: `1px solid ${colors.background.hover}`, '&:last-child': { borderBottom: 'none' } }}>
      {icon && <Box sx={{ mt: 0.25 }}>{icon}</Box>}
      <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted, fontWeight: 500, minWidth: 80 }}>{label}</Typography>
      <Typography sx={{ fontSize: fontSizes.md, color: colors.text.secondary, fontWeight: 500, flex: 1 }}>{value}</Typography>
    </Box>
  );
}

/**
 * Basic information tab for the orderer detail page.
 * Shows orderer info, statistics summary, and departments.
 */
export function OrdererInfoTab({ orderer }: OrdererInfoTabProps) {
  return (
    <Box sx={{ p: 2.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
        {/* Left column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Basic info */}
          <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
              <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>発注者情報</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 2, pb: 2, px: 2.5 }}>
              <OrdererInfoRow label="所在地" value={orderer.address} icon={<LocationIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <OrdererInfoRow label="電話番号" value={orderer.phone} icon={<PhoneIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <OrdererInfoRow label="FAX" value={orderer.fax} icon={<FaxIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <OrdererInfoRow label="メール" value={orderer.email} icon={<EmailIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <OrdererInfoRow label="最終公告日" value={orderer.lastAnnouncementDate} icon={<CalendarIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* Right column */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Statistics summary */}
          <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
              <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>統計サマリー</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 2, pb: 2, px: 0, backgroundColor: colors.background.hover }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted }}>公告件数</Typography>
                  <Typography sx={{ fontSize: fontSizes.base, fontWeight: 700, color: colors.text.secondary }}>{orderer.announcementCount.toLocaleString()}件</Typography>
                </Box>
                <Typography sx={{ color: colors.border.dark, px: 1 }}>|</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted }}>落札件数</Typography>
                  <Typography sx={{ fontSize: fontSizes.base, fontWeight: 700, color: colors.text.secondary }}>{orderer.awardCount.toLocaleString()}件</Typography>
                </Box>
                <Typography sx={{ color: colors.border.dark, px: 1 }}>|</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted }}>平均落札額</Typography>
                  <Typography sx={{ fontSize: fontSizes.base, fontWeight: 700, color: colors.text.secondary }}>{(orderer.averageAmount / 10000).toLocaleString()}万</Typography>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Departments */}
          <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
              <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>担当部署 ({orderer.departments.length})</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 2, pb: 2, px: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                {orderer.departments.map((dept) => (
                  <Chip
                    key={dept}
                    label={dept}
                    size="small"
                    sx={{
                      ...chipStyles.small,
                      backgroundColor: colors.status.info.bg,
                      color: colors.accent.blue,
                    }}
                  />
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>
    </Box>
  );
}
