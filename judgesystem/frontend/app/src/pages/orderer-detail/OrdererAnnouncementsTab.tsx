import { Box, Typography } from '@mui/material';
import { colors, fontSizes, borderRadius } from '../../constants/styles';
import { CustomPagination } from '../../components/bid';
import { AnnouncementCard } from './AnnouncementCard';
import type { AnnouncementWithStatus } from '../../types';

/** Props for OrdererAnnouncementsTab */
export interface OrdererAnnouncementsTabProps {
  loading: boolean;
  announcements: AnnouncementWithStatus[];
  paginationModel: { page: number; pageSize: number };
  onPaginationModelChange: (model: { page: number; pageSize: number }) => void;
  onAnnouncementClick: (id: string) => void;
}

/**
 * Announcements tab for the orderer detail page.
 * Shows a card grid of announcements with pagination.
 */
export function OrdererAnnouncementsTab({
  loading,
  announcements,
  paginationModel,
  onPaginationModelChange,
  onAnnouncementClick,
}: OrdererAnnouncementsTabProps) {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Card grid */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2, backgroundColor: colors.background.hover }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light }}>
              読み込み中...
            </Typography>
          </Box>
        ) : announcements.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography sx={{ fontSize: fontSizes.md, color: colors.text.light }}>
              案件が見つかりません
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 1.5,
            }}
          >
            {announcements
              .slice(
                paginationModel.page * paginationModel.pageSize,
                (paginationModel.page + 1) * paginationModel.pageSize
              )
              .map((announcement) => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  onClick={() => onAnnouncementClick(announcement.id)}
                />
              ))}
          </Box>
        )}
      </Box>
      {/* Pagination */}
      <Box sx={{ backgroundColor: colors.text.white, borderTop: `1px solid ${colors.border.main}`, px: 2 }}>
        <CustomPagination
          page={paginationModel.page}
          pageSize={paginationModel.pageSize}
          rowCount={announcements.length}
          onPageChange={(page) => onPaginationModelChange({ ...paginationModel, page })}
          onPageSizeChange={(pageSize) => onPaginationModelChange({ page: 0, pageSize })}
        />
      </Box>
    </Box>
  );
}
