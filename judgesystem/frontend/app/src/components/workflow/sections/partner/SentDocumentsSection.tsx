/**
 * SentDocumentsSection - Displays sent documents with assignee and file management.
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  Add as AddIcon,
  AttachFile as AttachFileIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import {
  colors,
  fontSizes,
  borderRadius,
  sectionStyles,
  buttonStyles,
  iconStyles,
  staffSelectStyles,
} from '../../../../constants/styles';
import type { PartnerDocument } from '../../../../types';
import { useStaffDirectory } from '../../../../contexts/StaffContext';
import { PersonIcon } from '../../../../constants/icons';

// ============================================================================
// Props
// ============================================================================

export interface SentDocumentsSectionProps {
  documents: PartnerDocument[];
  workflowAssigneeId?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SentDocumentsSection({ documents, workflowAssigneeId }: SentDocumentsSectionProps) {
  const { staff, findById } = useStaffDirectory();
  const [sentDocsAssignee, setSentDocsAssignee] = useState<string>('');

  useEffect(() => {
    if (!workflowAssigneeId) return;
    setSentDocsAssignee((prev) => (prev === '' ? workflowAssigneeId : prev));
  }, [workflowAssigneeId]);

  const sentDocs = documents.filter((d: PartnerDocument) => d.type === 'sent');

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography sx={sectionStyles.title}>
          <AttachFileIcon sx={{ ...iconStyles.medium, color: colors.accent.blue }} />
          送付資料
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon sx={{ ...iconStyles.small, color: colors.accent.blue }} />
            <FormControl size="small">
              <Select
                value={sentDocsAssignee}
                onChange={(e) => setSentDocsAssignee(e.target.value)}
                displayEmpty
                sx={staffSelectStyles}
                renderValue={(value) => {
                  if (!value) return <span style={{ color: colors.text.light, fontSize: fontSizes.xs }}>未割当</span>;
                  const staffMember = findById(value);
                  return <span style={{ fontSize: fontSizes.xs }}>{staffMember?.name || '未割当'}</span>;
                }}
              >
                <MenuItem value="">
                  <em style={{ color: colors.text.light, fontSize: fontSizes.xs }}>未割当</em>
                </MenuItem>
                {staff.map((member) => (
                  <MenuItem key={member.id} value={member.id} sx={{ fontSize: fontSizes.xs }}>
                    {member.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Button
            size="small"
            startIcon={<AddIcon />}
            sx={{ ...buttonStyles.small, color: colors.accent.blue, fontSize: fontSizes.xs }}
          >
            ファイルを追加
          </Button>
        </Box>
      </Box>

      {sentDocs.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {sentDocs.map((doc: PartnerDocument) => (
            <Box
              key={doc.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1,
                borderRadius: borderRadius.xs,
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <input
                type="checkbox"
                id={`sent-doc-${doc.id}`}
                defaultChecked
                style={{ cursor: 'pointer' }}
              />
              <AttachFileIcon sx={{ ...iconStyles.medium, color: colors.accent.blue }} />
              <Box sx={{ flex: 1 }}>
                <Typography
                  component="label"
                  htmlFor={`sent-doc-${doc.id}`}
                  sx={{ fontSize: fontSizes.sm, color: colors.text.secondary, cursor: 'pointer', display: 'block' }}
                >
                  {doc.name}
                </Typography>
                <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
                  送付日: {doc.date}
                </Typography>
              </Box>
              <IconButton size="small">
                <DeleteIcon sx={{ ...iconStyles.small, color: colors.text.light, '&:hover': { color: colors.status.error.main } }} />
              </IconButton>
            </Box>
          ))}
        </Box>
      ) : (
        <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.light }}>
          送付資料がありません
        </Typography>
      )}
    </Box>
  );
}
