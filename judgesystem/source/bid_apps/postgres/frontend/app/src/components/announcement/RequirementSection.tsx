import { Box, Typography, Button, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import {
  AccountBalance as OrdererIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  Print as FaxIcon,
  OpenInNew as OpenInNewIcon,
  Category as CategoryIcon,
  CurrencyYen as CurrencyYenIcon,
  ExpandMore as ExpandMoreIcon,
  Gavel as BidTypeIcon,
} from '@mui/icons-material';
import { bidTypeConfig } from '../../data';
import { getDocumentTypeConfig, getFileFormatConfig } from '../../constants/documentType';
import { colors, fontSizes, iconStyles, borderRadius } from '../../constants/styles';
import { formatAmountInManYen } from '../../utils';
import { resolveAnnouncementStatus, resolveBidType } from './AnnouncementHeader';
import type { AnnouncementDetail } from './AnnouncementHeader';
import type { ProgressingCompany } from './CompetingCompaniesSection';
import type { DocumentOcr } from '../../types';

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, py: 1.25, borderBottom: `1px solid ${colors.background.hover}`, '&:last-child': { borderBottom: 'none' } }}>
      {icon && <Box sx={{ mt: 0.25 }}>{icon}</Box>}
      <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted, fontWeight: 500, minWidth: 90 }}>{label}</Typography>
      <Typography sx={{ fontSize: fontSizes.md, color: colors.text.secondary, fontWeight: 500, flex: 1 }}>{value}</Typography>
    </Box>
  );
}

interface RequirementSectionProps {
  announcement: AnnouncementDetail;
  progressingCompanies: ProgressingCompany[];
  onNavigate: (path: string) => void;
}

export function RequirementSection({ announcement, progressingCompanies, onNavigate }: RequirementSectionProps) {
  const announcementStatus = resolveAnnouncementStatus(announcement.status as string | undefined);

  const scheduleItems = [
    { label: '公告日', date: announcement.publishDate },
    { label: '説明書交付開始', date: announcement.explanationStartDate },
    { label: '説明書交付終了', date: announcement.explanationEndDate },
    { label: '申請受付開始', date: announcement.applicationStartDate },
    { label: '申請受付終了', date: announcement.applicationEndDate },
    { label: '入札開始', date: announcement.bidStartDate },
    { label: '入札締切', date: announcement.bidEndDate, highlight: true },
  ];

  const sortedCompetitors = [...(announcement.competingCompanies || [])].sort((a, b) => {
    if (a.isWinner && !b.isWinner) return -1;
    if (!a.isWinner && b.isWinner) return 1;
    return 0;
  });

  const formatBidAmount = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '-';
    return `${(amount / 10000).toLocaleString()}万`;
  };

  return (
    <Box sx={{ p: 2.5 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
        {/* 左カラム */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* 案件情報 */}
          <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
              <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>案件情報</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 2, pb: 2, px: 2.5 }}>
              <InfoRow label="発注機関" value={announcement.organization} icon={<OrdererIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <InfoRow label="工種" value={announcement.category} icon={<CategoryIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <InfoRow label="入札形式" value={bidTypeConfig[resolveBidType(announcement.bidType)].label} icon={<BidTypeIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <InfoRow label="履行場所" value={announcement.workLocation} icon={<LocationIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <InfoRow label="予想金額" value={formatAmountInManYen(announcement.estimatedAmountMin, announcement.estimatedAmountMax)} icon={<CurrencyYenIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
            </AccordionDetails>
          </Accordion>

          {/* 担当部署 */}
          <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
              <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>担当部署</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 2, pb: 2, px: 2.5 }}>
              <InfoRow label="部署名" value={announcement.department.name} icon={<OrdererIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <InfoRow label="担当者" value={announcement.department.contactPerson} icon={<PersonIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <InfoRow label="住所" value={`〒${announcement.department.postalCode} ${announcement.department.address}`} icon={<LocationIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <InfoRow label="電話" value={announcement.department.phone} icon={<PhoneIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <InfoRow label="FAX" value={announcement.department.fax} icon={<FaxIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
              <InfoRow label="メール" value={announcement.department.email} icon={<EmailIcon sx={{ ...iconStyles.small, color: colors.text.light }} />} />
            </AccordionDetails>
          </Accordion>

          {/* 資料リンク */}
          <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
              <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>資料リンク</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 2, pb: 2, px: 2.5 }}>
              {announcement.documents && announcement.documents.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {announcement.documents.map((doc: DocumentOcr) => {
                    const typeConfig = getDocumentTypeConfig(doc.type || 'other');
                    const formatConfig = getFileFormatConfig(doc.fileFormat);
                    return (
                      <Button
                        key={doc.id}
                        variant="outlined"
                        size="small"
                        endIcon={<OpenInNewIcon sx={iconStyles.small} />}
                        component="a"
                        href={doc.url || '#'}
                        target="_blank"
                        disabled={!doc.url}
                        sx={{ borderRadius: borderRadius.xs, borderColor: formatConfig.color, color: doc.url ? formatConfig.color : colors.text.light, fontWeight: 500, fontSize: fontSizes.md, textTransform: 'none', justifyContent: 'space-between' }}
                      >
                        {typeConfig.label}（{formatConfig.label}）
                      </Button>
                    );
                  })}
                </Box>
              ) : (
                <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light }}>
                  資料がありません
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        </Box>

        {/* 右カラム */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* 落札情報 */}
          <Accordion defaultExpanded sx={{ boxShadow: 'none', border: announcementStatus === 'closed' && announcement.actualAmount ? '1px solid #a7f3d0' : `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
              <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: announcementStatus === 'closed' && announcement.actualAmount ? colors.status.success.main : colors.primary.main }}>落札情報</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 2, pb: 2, px: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mb: (announcement.competingCompanies?.length || progressingCompanies.length > 0) ? 2 : 0 }}>
                <Box>
                  <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted, mb: 0.25 }}>見積予想金額</Typography>
                  <Typography sx={{ fontSize: fontSizes.lg, fontWeight: 700, color: colors.text.secondary }}>
                    {formatAmountInManYen(announcement.estimatedAmountMin, announcement.estimatedAmountMax)}
                  </Typography>
                </Box>
                {announcementStatus === 'closed' && announcement.actualAmount && (
                  <>
                    <Box>
                      <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted, mb: 0.25 }}>落札金額</Typography>
                      <Typography sx={{ fontSize: fontSizes.lg, fontWeight: 700, color: colors.status.success.main }}>
                        {(announcement.actualAmount / 10000).toLocaleString()}万円
                      </Typography>
                    </Box>
                    {announcement.winningCompanyName && (
                      <Box>
                        <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted, mb: 0.25 }}>落札企業</Typography>
                        <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.text.secondary }}>
                          {announcement.winningCompanyName}
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
              {/* 競争参加企業 */}
              {(announcement.competingCompanies?.length || progressingCompanies.length > 0) && (
                <Box sx={{ pt: 2, borderTop: `1px solid ${colors.border.light}` }}>
                  <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted, mb: 1.5 }}>
                    競争参加企業 ({sortedCompetitors.length + progressingCompanies.length}社)
                  </Typography>
                  {/* ヘッダー */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 110px', gap: 1, mb: 1, pb: 1, borderBottom: `1px solid ${colors.border.main}` }}>
                    <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.light, fontWeight: 500 }}>企業名</Typography>
                    <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.light, fontWeight: 500, textAlign: 'right' }}>1回目</Typography>
                    <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.light, fontWeight: 500, textAlign: 'right' }}>2回目</Typography>
                    <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.light, fontWeight: 500, textAlign: 'right' }}>3回目</Typography>
                  </Box>
                  {/* 企業一覧 */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {sortedCompetitors.map((company, idx) => (
                      <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 110px', gap: 1, alignItems: 'center', py: 0.5 }}>
                        <Typography sx={{ fontSize: fontSizes.md, fontWeight: company.isWinner ? 600 : 400, color: company.isWinner ? colors.status.success.main : colors.text.secondary }}>
                          {company.name}
                        </Typography>
                        <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {formatBidAmount(company.bidAmounts?.[0])}
                        </Typography>
                        <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {formatBidAmount(company.bidAmounts?.[1])}
                        </Typography>
                        <Typography sx={{ fontSize: fontSizes.md, color: company.isWinner ? colors.status.success.main : colors.text.muted, fontWeight: company.isWinner ? 600 : 400, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {formatBidAmount(company.bidAmounts?.[2])}
                        </Typography>
                      </Box>
                    ))}
                    {progressingCompanies.map((company) => (
                      <Box
                        key={`${company.companyId}-${company.branchId}`}
                        onClick={() => onNavigate(`/detail/${company.evaluationId}`)}
                        sx={{ display: 'grid', gridTemplateColumns: '1fr 110px 110px 110px', gap: 1, alignItems: 'center', py: 0.5, cursor: 'pointer', '&:hover': { backgroundColor: colors.background.hover, mx: -1, px: 1, borderRadius: borderRadius.xs } }}
                      >
                        <Typography sx={{ fontSize: fontSizes.md, fontWeight: 500, color: colors.accent.blue }}>{company.companyName}</Typography>
                        <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light, textAlign: 'right' }}>-</Typography>
                        <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light, textAlign: 'right' }}>-</Typography>
                        <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light, textAlign: 'right' }}>-</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>

          {/* スケジュール */}
          <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
              <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>スケジュール</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1, pb: 0, px: 0 }}>
              {scheduleItems.map((item, index) => (
                <Box
                  key={item.label}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 2.5,
                    py: 1.25,
                    borderBottom: index < scheduleItems.length - 1 ? `1px solid ${colors.border.light}` : 'none',
                    backgroundColor: item.highlight ? colors.status.info.bg : 'transparent',
                  }}
                >
                  <Typography sx={{ fontSize: fontSizes.md, color: item.highlight ? colors.primary.main : colors.text.muted, fontWeight: item.highlight ? 600 : 400 }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes.md, color: item.highlight ? colors.primary.main : colors.text.secondary, fontWeight: item.highlight ? 700 : 500 }}>
                    {item.date}
                  </Typography>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>
    </Box>
  );
}
