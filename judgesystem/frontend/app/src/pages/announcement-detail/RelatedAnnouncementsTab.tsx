import { Box, Typography } from '@mui/material';
import {
  announcementStatusConfig,
  bidTypeConfig,
} from '../../data';
import { colors, fontSizes, borderRadius } from '../../constants/styles';
import { CustomPagination } from '../../components/bid';
import {
  resolveAnnouncementStatus,
  resolveBidType,
} from '../../components/announcement';

interface RelatedAnnouncement {
  id: string;
  no: number;
  title: string;
  organization: string;
  status?: string;
  bidType?: string;
  workLocation?: string;
  category?: string;
  publishDate: string;
  deadline: string;
}

export interface RelatedAnnouncementsTabProps {
  paginatedAnnouncements: RelatedAnnouncement[];
  filteredCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onNavigate: (path: string) => void;
}

export function RelatedAnnouncementsTab({
  paginatedAnnouncements,
  filteredCount,
  page,
  pageSize,
  onPageChange,
  onNavigate,
}: RelatedAnnouncementsTabProps) {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
        {paginatedAnnouncements.length > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 1.5 }}>
            {paginatedAnnouncements.map((ann) => {
              const annStatusKey = resolveAnnouncementStatus(ann.status as string | undefined);
              const annStatusConfig = announcementStatusConfig[annStatusKey];
              const bidType = bidTypeConfig[resolveBidType(ann.bidType)];
              const prefecture = ann.workLocation?.match(/^(.+?[都道府県])/)?.[1] || '';
              return (
                <Box
                  key={ann.id}
                  onClick={() => onNavigate(`/announcements/${ann.id}`)}
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: colors.text.white,
                    borderRadius: borderRadius.xs,
                    border: `1px solid ${colors.border.main}`,
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: 'rgba(59, 130, 246, 0.4)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '3px',
                      backgroundColor: annStatusConfig.color,
                      borderRadius: `${borderRadius.xs} 0 0 ${borderRadius.xs}`,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.light }}>
                      No. {String(ann.no).padStart(8, '0')}
                    </Typography>
                    <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: annStatusConfig.color }}>
                      {annStatusConfig.label}
                    </Typography>
                    {bidType && (
                      <>
                        <Box sx={{ width: '1px', height: '12px', backgroundColor: colors.border.main }} />
                        <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
                          {bidType.label}
                        </Typography>
                      </>
                    )}
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: fontSizes.md, color: colors.text.secondary, lineHeight: 1.5, mb: 1, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {ann.title}
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.light, mb: 0.5 }}>
                    {ann.organization}
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.light, mb: 0.75 }}>
                    {prefecture && `${prefecture}\u30FB`}{ann.category}
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
                    公告日 {ann.publishDate} / 締切日 {ann.deadline}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', color: colors.text.light }}>
            関連案件がありません
          </Box>
        )}
      </Box>
      <Box sx={{ backgroundColor: colors.text.white, borderTop: `1px solid ${colors.border.main}`, px: 2 }}>
        <CustomPagination
          page={page}
          pageSize={pageSize}
          rowCount={filteredCount}
          onPageChange={onPageChange}
          onPageSizeChange={() => {}}
        />
      </Box>
    </Box>
  );
}
