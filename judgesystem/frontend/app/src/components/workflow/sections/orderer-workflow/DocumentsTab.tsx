/**
 * DocumentsTab - Pre-submission documents tab with email templates and file upload.
 */
import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  AttachFile as AttachFileIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import {
  colors,
  fontSizes,
  borderRadius,
  sectionStyles,
  buttonStyles,
  iconStyles,
  chipStyles,
  staffSelectStyles,
} from '../../../../constants/styles';
import type { PreSubmitDocument } from '../../../../types';
import { useStaffDirectory } from '../../../../contexts/StaffContext';
import { PersonIcon } from '../../../../constants/icons';

// ============================================================================
// Props
// ============================================================================

export interface EmailTemplate {
  id: string;
  label: string;
  subject: string;
  body: string;
}

export interface DocumentsTabProps {
  /** Email templates to display in the text accordion. */
  emailTemplates: EmailTemplate[];

  /** Pre-submission documents list. */
  preSubmitDocs: PreSubmitDocument[];
  onDeleteDoc: (id: string) => void;

  /** Email assignee state (managed by parent). */
  emailAssignees: Record<string, string>;
  onEmailAssigneeChange: (templateId: string, staffId: string) => void;

  /** Docs upload assignee (managed by parent). */
  docsAssignee: string;
  onDocsAssigneeChange: (staffId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function DocumentsTab({
  emailTemplates,
  preSubmitDocs,
  onDeleteDoc,
  emailAssignees,
  onEmailAssigneeChange,
  docsAssignee,
  onDocsAssigneeChange,
}: DocumentsTabProps) {
  const { staff, findById } = useStaffDirectory();

  const [selectedTemplate, setSelectedTemplate] = useState<string>('1');
  const [editSubject, setEditSubject] = useState(emailTemplates[0]?.subject || '');
  const [editBody, setEditBody] = useState(emailTemplates[0]?.body || '');
  const [textAccordionOpen, setTextAccordionOpen] = useState(true);
  const [docsAccordionOpen, setDocsAccordionOpen] = useState(true);

  const selectTemplate = (templateId: string) => {
    const template = emailTemplates.find((t) => t.id === templateId);
    setSelectedTemplate(templateId);
    setEditSubject(template?.subject || '');
    setEditBody(template?.body || '');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {/* Send button */}
      <Button
        variant="contained"
        fullWidth
        startIcon={<EmailIcon />}
        sx={{
          py: 1.5,
          backgroundColor: colors.accent.blue,
          fontWeight: 600,
          fontSize: fontSizes.sm,
          '&:hover': { backgroundColor: colors.accent.blueHover },
        }}
      >
        メールを送信
      </Button>

      {/* Text accordion */}
      <Accordion
        expanded={textAccordionOpen}
        onChange={() => setTextAccordionOpen(!textAccordionOpen)}
        elevation={0}
        sx={{
          border: `1px solid ${colors.border.main}`,
          borderRadius: `${borderRadius.xs} !important`,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            minHeight: 44,
            '&.Mui-expanded': { minHeight: 44 },
            '& .MuiAccordionSummary-content': { margin: '8px 0' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon sx={{ ...iconStyles.medium, color: colors.accent.blue }} />
            <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: colors.text.secondary }}>
              文章
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 2 }}>
          {/* Template selector + assignee */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {emailTemplates.map((template) => {
                const isSelected = selectedTemplate === template.id;
                return (
                  <Chip
                    key={template.id}
                    label={template.label}
                    size="small"
                    icon={<EmailIcon sx={iconStyles.small} />}
                    onClick={() => selectTemplate(template.id)}
                    sx={{
                      ...chipStyles.medium,
                      fontWeight: isSelected ? 600 : 400,
                      backgroundColor: isSelected
                        ? colors.accent.blueBg
                        : 'transparent',
                      color: isSelected
                        ? colors.accent.blue
                        : colors.text.muted,
                      border: `1px solid ${isSelected
                        ? colors.accent.blue
                        : colors.border.main}`,
                      cursor: 'pointer',
                      '& .MuiChip-icon': {
                        color: isSelected
                          ? colors.accent.blue
                          : colors.text.muted,
                      },
                    }}
                  />
                );
              })}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PersonIcon sx={{ ...iconStyles.small, color: colors.accent.blue }} />
              <FormControl size="small">
                <Select
                  value={emailAssignees[selectedTemplate] || ''}
                  onChange={(e) => onEmailAssigneeChange(selectedTemplate, e.target.value)}
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
          </Box>

          {/* Subject */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted, mb: 0.5 }}>
              件名
            </Typography>
            <TextField
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              size="small"
              fullWidth
              sx={sectionStyles.textField}
            />
          </Box>

          {/* Body */}
          <Box>
            <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted, mb: 0.5 }}>
              本文
            </Typography>
            <TextField
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              size="small"
              fullWidth
              multiline
              minRows={8}
              sx={sectionStyles.textField}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Documents accordion */}
      <Accordion
        expanded={docsAccordionOpen}
        onChange={() => setDocsAccordionOpen(!docsAccordionOpen)}
        elevation={0}
        sx={{
          border: `1px solid ${colors.border.main}`,
          borderRadius: `${borderRadius.xs} !important`,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0 },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            minHeight: 44,
            '&.Mui-expanded': { minHeight: 44 },
            '& .MuiAccordionSummary-content': { margin: '8px 0' },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachFileIcon sx={{ ...iconStyles.medium, color: colors.status.success.main }} />
            <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: colors.text.secondary }}>
              提出書類
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PersonIcon sx={{ ...iconStyles.small, color: colors.accent.blue }} />
              <FormControl size="small">
                <Select
                  value={docsAssignee}
                  onChange={(e) => onDocsAssigneeChange(e.target.value)}
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
              startIcon={<UploadIcon sx={iconStyles.small} />}
              sx={{ ...buttonStyles.small, color: colors.accent.blue, fontSize: fontSizes.xs }}
            >
              ファイルを追加
            </Button>
          </Box>
          {preSubmitDocs.length === 0 ? (
            <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted, textAlign: 'center', py: 2 }}>
              提出書類がありません
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {preSubmitDocs.map((doc) => {
                const isUploaded = doc.status === 'submitted';
                return (
                  <Box
                    key={doc.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      borderRadius: borderRadius.xs,
                      backgroundColor: isUploaded ? 'rgba(5, 150, 105, 0.05)' : colors.text.white,
                      border: `1px solid ${isUploaded ? 'rgba(5, 150, 105, 0.2)' : colors.border.main}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      id={`attach-${doc.id}`}
                      defaultChecked={isUploaded}
                      disabled={!isUploaded}
                      style={{ cursor: isUploaded ? 'pointer' : 'not-allowed' }}
                    />
                    <AttachFileIcon sx={{ ...iconStyles.medium, color: isUploaded ? colors.status.success.main : colors.text.muted }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        component="label"
                        htmlFor={`attach-${doc.id}`}
                        sx={{ fontSize: fontSizes.sm, color: colors.text.secondary, cursor: isUploaded ? 'pointer' : 'default', display: 'block' }}
                      >
                        {doc.name}
                      </Typography>
                      {doc.dueDate && (
                        <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
                          期限: {doc.dueDate}
                        </Typography>
                      )}
                    </Box>
                    {isUploaded ? (
                      <Chip
                        size="small"
                        label="アップロード済"
                        sx={{ ...chipStyles.small, backgroundColor: 'rgba(5, 150, 105, 0.15)', color: colors.status.success.main }}
                      />
                    ) : (
                      <Button
                        size="small"
                        startIcon={<UploadIcon sx={iconStyles.small} />}
                        sx={{ ...buttonStyles.small, fontSize: fontSizes.xs, color: colors.accent.blue }}
                      >
                        アップロード
                      </Button>
                    )}
                    <IconButton size="small" onClick={() => onDeleteDoc(doc.id)}>
                      <DeleteIcon sx={{ ...iconStyles.small, color: colors.text.light, '&:hover': { color: colors.status.error.main } }} />
                    </IconButton>
                  </Box>
                );
              })}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
