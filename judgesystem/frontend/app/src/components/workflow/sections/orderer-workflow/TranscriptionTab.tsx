/**
 * TranscriptionTab - Displays audio transcription records.
 */
import {
  Box,
  Typography,
  Paper,
} from '@mui/material';
import {
  Mic as MicIcon,
} from '@mui/icons-material';
import {
  colors,
  fontSizes,
  borderRadius,
  iconStyles,
} from '../../../../constants/styles';

// ============================================================================
// Props
// ============================================================================

export interface TranscriptionTabProps {
  transcriptions: { id: string; date: string; content: string }[];
}

// ============================================================================
// Component
// ============================================================================

export function TranscriptionTab({ transcriptions }: TranscriptionTabProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {transcriptions.length === 0 ? (
        <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.muted, textAlign: 'center', py: 4 }}>
          録音データはありません
        </Typography>
      ) : (
        transcriptions.map((t) => (
          <Paper
            key={t.id}
            elevation={0}
            sx={{ p: 2, backgroundColor: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.15)', borderRadius: borderRadius.xs }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <MicIcon sx={{ ...iconStyles.small, color: colors.accent.blue }} />
              <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>{t.date}</Typography>
            </Box>
            <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.secondary, fontStyle: 'italic' }}>
              {t.content}
            </Typography>
          </Paper>
        ))
      )}
    </Box>
  );
}
