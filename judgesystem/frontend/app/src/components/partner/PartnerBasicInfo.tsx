import { Box, Typography, Chip, Link, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import {
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Email as EmailIcon,
  Print as FaxIcon,
  Language as LanguageIcon,
  Person as PersonIcon,
  CalendarMonth as CalendarIcon,
  AccountBalance as AccountBalanceIcon,
  People as PeopleIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { colors, fontSizes, chipStyles, iconStyles, borderRadius } from '../../constants/styles';
import type { PartnerDetail, PartnerBranch } from '../../types/partner';

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.25, borderBottom: `1px solid ${colors.background.hover}`, '&:last-child': { borderBottom: 'none' } }}>
      {icon && <Box sx={{ mt: 0.25 }}>{icon}</Box>}
      <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted, fontWeight: 500, minWidth: 80 }}>{label}</Typography>
      <Typography component="div" sx={{ fontSize: fontSizes.md, color: colors.text.secondary, fontWeight: 500, flex: 1 }}>{value}</Typography>
    </Box>
  );
}

interface PartnerBasicInfoProps {
  partner: PartnerDetail;
}

export function PartnerBasicInfo({ partner }: PartnerBasicInfoProps) {
  const capitalDisplay = partner.capital != null
    ? `${(partner.capital / 100000000).toLocaleString()}億円`
    : '未設定';
  const employeeDisplay = partner.employeeCount != null
    ? `${partner.employeeCount.toLocaleString()}名`
    : '未設定';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* 会社情報 */}
      <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
          <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>会社情報</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2, pb: 2, px: 2.5 }}>
          <InfoRow label="住所" value={`〒${partner.postalCode} ${partner.address}`} icon={<LocationIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
          <InfoRow label="電話番号" value={partner.phone} icon={<PhoneIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
          <InfoRow label="FAX" value={partner.fax} icon={<FaxIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
          <InfoRow label="メール" value={<Link href={`mailto:${partner.email}`} sx={{ color: colors.accent.blue }}>{partner.email}</Link>} icon={<EmailIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
          {partner.url && <InfoRow label="HP" value={<Link href={partner.url} target="_blank" rel="noopener noreferrer" sx={{ color: colors.accent.blue }}>{partner.url}</Link>} icon={<LanguageIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />}
          <InfoRow label="代表者" value={partner.representative} icon={<PersonIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
          <InfoRow label="設立" value={`${partner.established}年`} icon={<CalendarIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
          <InfoRow label="資本金" value={capitalDisplay} icon={<AccountBalanceIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
          <InfoRow label="従業員数" value={employeeDisplay} icon={<PeopleIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
        </AccordionDetails>
      </Accordion>

      {/* 拠点一覧 */}
      <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
          <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>拠点一覧 ({partner.branches.length})</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2, pb: 2, px: 2.5 }}>
          {partner.branches.map((branch: PartnerBranch, index: number) => (
            <Box key={index} sx={{ py: 1.25, borderBottom: index < partner.branches.length - 1 ? `1px solid ${colors.border.light}` : 'none' }}>
              <Typography sx={{ fontWeight: 600, fontSize: fontSizes.md, color: colors.text.secondary }}>{branch.name}</Typography>
              <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted }}>{branch.address}</Typography>
            </Box>
          ))}
        </AccordionDetails>
      </Accordion>

      {/* カテゴリ */}
      <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
          <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>カテゴリ ({partner.categories.length})</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2, pb: 2, px: 2.5 }}>
          <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
            {partner.categories.map((category: string) => (
              <Chip
                key={category}
                label={category}
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
  );
}
