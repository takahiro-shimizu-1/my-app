/**
 * Shared types and style constants for OrdererWorkflowSection sub-components.
 */
import {
  colors,
  fontSizes,
  borderRadius,
} from '../../../../constants/styles';
import type { RecordMemo } from '../../../../constants/memoTags';

/** Alias retained for backward compatibility. */
export type CallMemo = RecordMemo;

/** Sort order for memo lists. */
export type SortType = 'newest' | 'oldest' | 'category';

/** Shared inline-style constants. */
export const STYLES = {
  callLogCard: {
    p: 2,
    backgroundColor: colors.text.white,
    borderRadius: borderRadius.xs,
    border: `1px solid ${colors.border.main}`,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
  },
  documentCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    p: 1.5,
    borderRadius: borderRadius.xs,
  },
  tagButton: {
    minWidth: 'auto',
    px: 1.5,
    py: 0.5,
    fontSize: fontSizes.xs,
    borderRadius: borderRadius.xs,
    textTransform: 'none' as const,
  },
} as const;
