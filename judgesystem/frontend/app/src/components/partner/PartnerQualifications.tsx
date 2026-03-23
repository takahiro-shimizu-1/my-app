import { Box, Typography, Rating, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { colors, fontSizes, borderRadius } from '../../constants/styles';
import type { PartnerDetail, UnifiedQualification, OrdererQualification, OrdererQualificationItem } from '../../types/partner';

interface PartnerQualificationsProps {
  partner: PartnerDetail;
}

export function PartnerQualifications({ partner }: PartnerQualificationsProps) {
  const ratingValue = partner.rating ?? 0;
  const surveyDisplay = partner.surveyCount != null ? `${partner.surveyCount}回` : '未設定';
  const resultDisplay = partner.resultCount != null ? `${partner.resultCount}件` : '未設定';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* 実績サマリー */}
      <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
          <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>実績サマリー</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2, pb: 2, px: 0, backgroundColor: colors.background.hover }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted }}>評価</Typography>
              <Rating value={ratingValue} max={3} precision={0.5} readOnly size="small" />
            </Box>
            <Typography sx={{ color: colors.border.dark, px: 1 }}>|</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted }}>現地調査</Typography>
              <Typography sx={{ fontSize: fontSizes.base, fontWeight: 700, color: colors.text.secondary }}>{surveyDisplay}</Typography>
            </Box>
            <Typography sx={{ color: colors.border.dark, px: 1 }}>|</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
              <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted }}>実績数</Typography>
              <Typography sx={{ fontSize: fontSizes.base, fontWeight: 700, color: colors.text.secondary }}>{resultDisplay}</Typography>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* 競争参加資格 */}
      <Accordion defaultExpanded sx={{ boxShadow: 'none', border: `1px solid ${colors.border.main}`, borderRadius: `${borderRadius.xs} !important`, '&:before': { display: 'none' }, '&.Mui-expanded': { margin: 0 } }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 48, borderBottom: `1px solid ${colors.border.main}`, '&.Mui-expanded': { minHeight: 48 } }}>
          <Typography sx={{ fontSize: fontSizes.base, fontWeight: 600, color: colors.primary.main }}>競争参加資格</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 2, pb: 2, px: 2.5 }}>
          {/* 全省庁統一資格 */}
          <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: colors.text.muted, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>全省庁統一資格</Typography>
          {partner.qualifications.unified.length === 0 ? (
            <Typography sx={{ color: colors.text.light, fontSize: fontSizes.sm, mb: 2.5 }}>登録なし</Typography>
          ) : (
            <Box sx={{ mb: 2.5, border: `1px solid ${colors.border.main}`, borderRadius: borderRadius.xs, overflow: 'hidden' }}>
              {/* テーブルヘッダー */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 80px 70px', backgroundColor: colors.background.alt, borderBottom: `1px solid ${colors.border.main}` }}>
                <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.muted }}>大分類</Typography>
                <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.muted }}>種別</Typography>
                <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.muted }}>地域</Typography>
                <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.muted, textAlign: 'right' }}>点数</Typography>
                <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.muted, textAlign: 'center' }}>等級</Typography>
              </Box>
              {/* テーブルボディ */}
              {partner.qualifications.unified.map((q: UnifiedQualification, idx: number) => (
                <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 80px 70px', borderBottom: idx < partner.qualifications.unified.length - 1 ? `1px solid ${colors.border.light}` : 'none', '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' } }}>
                  <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.sm, color: colors.text.secondary }}>{q.mainCategory}</Typography>
                  <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.sm, color: colors.text.secondary }}>{q.category}</Typography>
                  <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.sm, color: colors.text.muted }}>{q.region}</Typography>
                  <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.sm, color: colors.text.secondary, fontWeight: 600, textAlign: 'right' }}>{q.value}</Typography>
                  <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.sm, color: colors.accent.blue, fontWeight: 600, textAlign: 'center' }}>{q.grade}</Typography>
                </Box>
              ))}
            </Box>
          )}

          {/* 発注者別資格 */}
          <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: colors.text.muted, mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.03em' }}>発注者別資格</Typography>
          {partner.qualifications.orderers.length === 0 ? (
            <Typography sx={{ color: colors.text.light, fontSize: fontSizes.sm }}>登録なし</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {partner.qualifications.orderers.map((orderer: OrdererQualification, idx: number) => (
                <Box key={idx}>
                  <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: colors.text.secondary, mb: 1, pl: 1.5, borderLeft: `3px solid ${colors.accent.blue}` }}>{orderer.ordererName}</Typography>
                  <Box sx={{ border: `1px solid ${colors.border.main}`, borderRadius: borderRadius.xs, overflow: 'hidden' }}>
                    {/* テーブルヘッダー */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 70px', backgroundColor: colors.background.alt, borderBottom: `1px solid ${colors.border.main}` }}>
                      <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.muted }}>種別</Typography>
                      <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.muted }}>地域</Typography>
                      <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.muted, textAlign: 'right' }}>点数</Typography>
                      <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.xs, fontWeight: 600, color: colors.text.muted, textAlign: 'center' }}>等級</Typography>
                    </Box>
                    {/* テーブルボディ */}
                    {orderer.items.map((item: OrdererQualificationItem, itemIdx: number) => (
                      <Box key={itemIdx} sx={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px 70px', borderBottom: itemIdx < orderer.items.length - 1 ? `1px solid ${colors.border.light}` : 'none', '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' } }}>
                        <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.sm, color: colors.text.secondary }}>{item.category}</Typography>
                        <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.sm, color: colors.text.muted }}>{item.region}</Typography>
                        <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.sm, color: colors.text.secondary, fontWeight: 600, textAlign: 'right' }}>{item.value}</Typography>
                        <Typography sx={{ px: 1.5, py: 1, fontSize: fontSizes.sm, color: colors.accent.blue, fontWeight: 600, textAlign: 'center' }}>{item.grade}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
