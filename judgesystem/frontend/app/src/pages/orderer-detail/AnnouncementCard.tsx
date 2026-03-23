import { Box, Typography } from '@mui/material';
import { announcementStatusConfig, bidTypeConfig } from '../../data';
import { colors, fontSizes, borderRadius } from '../../constants/styles';
import type { AnnouncementWithStatus } from '../../types';

/** Props for the AnnouncementCard component */
export interface AnnouncementCardProps {
  announcement: AnnouncementWithStatus;
  onClick: () => void;
}

/**
 * Compact grid-style announcement card.
 * Displays status, bid type, title, location, and dates.
 */
export function AnnouncementCard({ announcement, onClick }: AnnouncementCardProps) {
  const statusConfig = announcementStatusConfig[announcement.status];
  const bidType = announcement.bidType ? bidTypeConfig[announcement.bidType] : null;

  const prefecture = announcement.workLocation
    ? announcement.workLocation.match(/^(.+?[都道府県])/)?.[1] || ''
    : '';

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        backgroundColor: colors.text.white,
        borderRadius: borderRadius.xs,
        border: `1px solid ${colors.border.main}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        height: '100%',
        '&:hover': {
          borderColor: 'rgba(59, 130, 246, 0.4)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '3px',
          backgroundColor: statusConfig.color,
          borderRadius: `${borderRadius.xs} 0 0 ${borderRadius.xs}`,
        },
      }}
    >
      {/* Row 1: No. + status + bid type */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.light }}>
          No. {String(announcement.no).padStart(8, '0')}
        </Typography>
        <Typography
          sx={{
            fontSize: fontSizes.xs,
            fontWeight: 600,
            color: statusConfig.color,
          }}
        >
          {statusConfig.label}
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

      {/* Row 2: Title */}
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: fontSizes.md,
          color: colors.text.secondary,
          lineHeight: 1.5,
          mb: 1,
          flex: 1,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          transition: 'color 0.15s',
          '.MuiBox-root:hover &': {
            color: colors.primary.main,
          },
        }}
      >
        {announcement.title}
      </Typography>

      {/* Row 3: Prefecture / category */}
      <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.light, mb: 0.75 }}>
        {prefecture && `${prefecture}・`}{announcement.category}
      </Typography>

      {/* Row 4: Publish date / deadline */}
      <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
        公告日 {announcement.publishDate} / 締切日 {announcement.deadline}
      </Typography>
    </Box>
  );
}
