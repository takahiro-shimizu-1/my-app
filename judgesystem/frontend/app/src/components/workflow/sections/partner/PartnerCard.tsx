import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  IconButton,
  Paper,
  TextField,
  Tabs,
  Tab,
  Collapse,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  Add as AddIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Mic as MicIcon,
  MenuBook as ScriptIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  AttachFile as AttachFileIcon,
  Check as CheckIcon,
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
import { MEMO_TAGS, type MemoTag, type MemoTagConfig, type RecordMemo } from '../../../../constants/memoTags';
import type { Partner, PartnerStatus } from '../../../../types';
import { ContactInfo, ContactActions } from '../../../common/ContactInfo';
import { useStaffDirectory } from '../../../../contexts/StaffContext';
import { PersonIcon } from '../../../../constants/icons';
import { SCRIPT_TEMPLATES, replacePlaceholders } from './templates';
import { StatusChip, SurveyApprovedButton } from './PartnerFilters';

type CallMemo = RecordMemo;

export interface PartnerCardProps {
  partner: Partner;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: PartnerStatus) => void;
  onToggleSurvey: () => void;
  projectName: string;
  companyName: string;
  myName: string;
  workflowAssigneeId?: string;
}

const CARD_STYLE = {
  p: 2,
  backgroundColor: colors.text.white,
  borderRadius: borderRadius.xs,
  border: `1px solid ${colors.border.main}`,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
} as const;

export function PartnerCard({
  partner,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  onToggleSurvey,
  projectName,
  companyName,
  myName,
  workflowAssigneeId,
}: PartnerCardProps) {
  const { staff, findById } = useStaffDirectory();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('talk-intro');
  const [editedContent, setEditedContent] = useState<string | null>(null);

  // テンプレートごとの担当者
  const [templateAssignees, setTemplateAssignees] = useState<Record<string, string>>({});
  const [receivedDocsAssignee, setReceivedDocsAssignee] = useState<string>('');

  // メールタブ用
  const [selectedEmailTemplateId, setSelectedEmailTemplateId] = useState<string>('email-request');
  const [editedEmailSubject, setEditedEmailSubject] = useState<string | null>(null);
  const [editedEmailContent, setEditedEmailContent] = useState<string | null>(null);
  const [emailAssignees, setEmailAssignees] = useState<Record<string, string>>({});

  const TALK_TEMPLATE_IDS = ['talk-intro', 'talk-followup'];
  const EMAIL_TEMPLATE_IDS = ['email-request', 'email-estimate'];

  // ワークフロー担当者が変更されたら、空の担当者欄を自動で埋める
  useEffect(() => {
    if (!workflowAssigneeId) return;
    setTemplateAssignees((prev) => {
      const updated = { ...prev };
      TALK_TEMPLATE_IDS.forEach((id) => {
        if (!updated[id]) updated[id] = workflowAssigneeId;
      });
      return updated;
    });
    setEmailAssignees((prev) => {
      const updated = { ...prev };
      EMAIL_TEMPLATE_IDS.forEach((id) => {
        if (!updated[id]) updated[id] = workflowAssigneeId;
      });
      return updated;
    });
    setReceivedDocsAssignee((prev) => (prev === '' ? workflowAssigneeId : prev));
  }, [workflowAssigneeId]);

  // 架電記録メモ
  const [callMemos, setCallMemos] = useState<CallMemo[]>([]);
  const [newCallMemo, setNewCallMemo] = useState('');
  const [newMemoTag, setNewMemoTag] = useState<MemoTag>('memo');
  const [showCallMemoInput, setShowCallMemoInput] = useState(false);
  const [editingCallMemoId, setEditingCallMemoId] = useState<string | null>(null);
  const [editCallMemoText, setEditCallMemoText] = useState('');
  const [answerTargetId, setAnswerTargetId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  const getDateStr = () => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const addCallMemo = () => {
    if (!newCallMemo.trim()) return;
    setCallMemos((prev) => [
      { id: Date.now().toString(), createdAt: getDateStr(), content: newCallMemo, tag: newMemoTag },
      ...prev,
    ]);
    setNewCallMemo('');
    setNewMemoTag('memo');
    setShowCallMemoInput(false);
  };

  const addAnswer = (parentId: string) => {
    if (!answerText.trim()) return;
    setCallMemos((prev) => [
      { id: Date.now().toString(), createdAt: getDateStr(), content: answerText, tag: 'answer', parentId },
      ...prev,
    ]);
    setAnswerText('');
    setAnswerTargetId(null);
  };

  const saveCallMemo = (id: string) => {
    if (!editCallMemoText.trim()) return;
    setCallMemos((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: editCallMemoText, updatedAt: getDateStr() } : m))
    );
    setEditingCallMemoId(null);
    setEditCallMemoText('');
  };

  const deleteCallMemo = (id: string) => {
    setCallMemos((prev) => prev.filter((m) => m.id !== id && m.parentId !== id));
  };

  // テンプレート関連
  const selectedTemplate = SCRIPT_TEMPLATES.find((t) => t.id === selectedTemplateId) || SCRIPT_TEMPLATES[0];
  const renderedContent = replacePlaceholders(selectedTemplate.content, partner, projectName, companyName, myName);
  const displayContent = editedContent !== null ? editedContent : renderedContent;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setEditedContent(null);
  };

  const resetToTemplate = () => {
    setEditedContent(null);
  };

  return (
    <Paper elevation={0} sx={CARD_STYLE}>
      {/* ヘッダー */}
      <Box
        onClick={onToggleExpand}
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', mb: 1.5 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: fontSizes.md, fontWeight: 600, color: colors.text.secondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {partner.name}
          </Typography>
          <StatusChip status={partner.status} onStatusChange={onStatusChange} />
          <SurveyApprovedButton approved={partner.surveyApproved} onToggle={onToggleSurvey} />
        </Box>
        <IconButton size="small">
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* 電話・メールボタン */}
      <Box sx={{ mb: 1 }}>
        <ContactActions phone={partner.phone} email={partner.email} size="small" />
      </Box>

      {/* 展開時のコンテンツ */}
      <Collapse in={isExpanded}>
        <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${colors.border.light}` }}>
          {/* 連絡先情報 */}
          <Box sx={{ mb: 1.5 }}>
            <ContactInfo
              contactPerson={partner.contactPerson}
              phone={partner.phone}
              email={partner.email}
              fax={partner.fax}
              layout="row"
            />
          </Box>

          {/* タブ */}
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{ minHeight: 36, mb: 2, '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 1.5, fontSize: fontSizes.sm, textTransform: 'none' }, '& .MuiTabs-indicator': { backgroundColor: colors.accent.blue }, '& .Mui-selected': { color: colors.accent.blue } }}
          >
            <Tab icon={<ScriptIcon sx={iconStyles.small} />} iconPosition="start" label="スクリプト" />
            <Tab icon={<EmailIcon sx={iconStyles.small} />} iconPosition="start" label="メール" />
            <Tab icon={<AttachFileIcon sx={iconStyles.small} />} iconPosition="start" label={`受信資料(${partner.receivedDocuments.length})`} />
            <Tab icon={<MicIcon sx={iconStyles.small} />} iconPosition="start" label={`文字起こし(${partner.transcriptions.length})`} />
          </Tabs>

          {/* スクリプトタブ */}
          {activeTab === 0 && (
            <Box>
              {/* テンプレート選択 + 担当者 */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {SCRIPT_TEMPLATES.filter((t) => t.type === 'talk').map((template) => (
                    <Chip
                      key={template.id}
                      label={template.label}
                      size="small"
                      icon={<PhoneIcon sx={iconStyles.small} />}
                      onClick={() => handleTemplateSelect(template.id)}
                      sx={{
                        ...chipStyles.medium,
                        fontWeight: selectedTemplateId === template.id ? 600 : 400,
                        backgroundColor: selectedTemplateId === template.id ? 'rgba(5, 150, 105, 0.1)' : 'transparent',
                        color: selectedTemplateId === template.id ? colors.accent.greenDark : colors.text.muted,
                        border: `1px solid ${selectedTemplateId === template.id ? colors.accent.greenDark : colors.border.main}`,
                        cursor: 'pointer',
                        '& .MuiChip-icon': { color: selectedTemplateId === template.id ? colors.accent.greenDark : colors.text.muted },
                      }}
                    />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonIcon sx={{ ...iconStyles.small, color: colors.accent.blue }} />
                  <FormControl size="small">
                    <Select
                      value={templateAssignees[selectedTemplateId] || ''}
                      onChange={(e) => setTemplateAssignees(prev => ({ ...prev, [selectedTemplateId]: e.target.value }))}
                      displayEmpty
                      sx={staffSelectStyles}
                      renderValue={(value) => {
                        if (!value) return <span style={{ color: colors.text.light, fontSize: fontSizes.xs }}>未割当</span>;
                        const staffMember = findById(value);
                        return <span style={{ fontSize: fontSizes.xs }}>{staffMember?.name || '未割当'}</span>;
                      }}
                    >
                      <MenuItem value=""><em style={{ color: colors.text.light, fontSize: fontSizes.xs }}>未割当</em></MenuItem>
                      {staff.map((member) => (
                        <MenuItem key={member.id} value={member.id} sx={{ fontSize: fontSizes.xs }}>{member.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>

              {/* 本文 */}
              <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted, mb: 0.5 }}>本文</Typography>
              <TextField value={displayContent} onChange={(e) => setEditedContent(e.target.value)} fullWidth multiline minRows={12} sx={{ ...sectionStyles.textField, mb: 1.5 }} />

              {/* アクションボタン */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Button size="small" onClick={resetToTemplate} disabled={editedContent === null}>テンプレートに戻す</Button>
                <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(displayContent)}>本文をコピー</Button>
              </Box>

              {/* 記録セクション */}
              <Box sx={{ borderTop: `1px solid ${colors.border.light}`, pt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: colors.text.secondary }}>
                    記録 {callMemos.length > 0 && `(${callMemos.filter(m => !m.parentId).length})`}
                  </Typography>
                  {!showCallMemoInput && (
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setShowCallMemoInput(true)} sx={{ ...buttonStyles.small, color: colors.accent.blue }}>追加</Button>
                  )}
                </Box>

                {/* 入力欄 */}
                {showCallMemoInput && (
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
                      {(Object.entries(MEMO_TAGS) as [MemoTag, MemoTagConfig][])
                        .filter(([key]) => key !== 'answer' && key !== 'evaluation')
                        .map(([key, config]) => {
                          const isSelected = newMemoTag === key;
                          const IconComponent = config.icon;
                          return (
                            <Button key={key} size="small" startIcon={<IconComponent sx={iconStyles.small} />} onClick={() => setNewMemoTag(key)}
                              sx={{ minWidth: 'auto', px: 1.5, py: 0.5, fontSize: fontSizes.xs, borderRadius: borderRadius.xs, textTransform: 'none', backgroundColor: isSelected ? config.bgColor : 'transparent', color: isSelected ? config.color : colors.text.muted, border: `1px solid ${isSelected ? config.color : colors.border.main}`, '&:hover': { backgroundColor: config.bgColor, color: config.color } }}>
                              {config.label}
                            </Button>
                          );
                        })}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <TextField value={newCallMemo} onChange={(e) => setNewCallMemo(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey && newCallMemo.trim()) { e.preventDefault(); addCallMemo(); } }} placeholder="内容を入力... (Ctrl+Enterで記録)" size="small" fullWidth multiline minRows={2} autoFocus sx={sectionStyles.textField} />
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Button variant="contained" onClick={addCallMemo} disabled={!newCallMemo.trim()} sx={{ minWidth: 60, backgroundColor: colors.accent.blue, ...buttonStyles.small, '&:hover': { backgroundColor: colors.accent.blueHover } }}>記録</Button>
                        <Button size="small" onClick={() => { setShowCallMemoInput(false); setNewCallMemo(''); setNewMemoTag('memo'); }} sx={{ ...buttonStyles.small, color: colors.text.muted }}>取消</Button>
                      </Box>
                    </Box>
                  </Box>
                )}

                {/* メモ一覧 */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 300, overflow: 'auto' }}>
                  {callMemos.filter((m) => !m.parentId).map((memo) => {
                    const tagConfig = MEMO_TAGS[memo.tag];
                    const TagIcon = tagConfig.icon;
                    const isEditing = editingCallMemoId === memo.id;
                    const answers = callMemos.filter((m) => m.parentId === memo.id);
                    const isQuestion = memo.tag === 'question';

                    return (
                      <Box key={memo.id}>
                        <Paper elevation={0} sx={{ p: 1.5, backgroundColor: colors.text.white, borderRadius: borderRadius.xs, border: `1px solid ${colors.border.main}` }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip size="small" icon={<TagIcon sx={iconStyles.small} />} label={tagConfig.label} sx={{ ...chipStyles.small, backgroundColor: tagConfig.bgColor, color: tagConfig.color, '& .MuiChip-icon': { color: tagConfig.color } }} />
                              <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>{memo.createdAt}</Typography>
                            </Box>
                            {!isEditing && (
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton size="small" onClick={() => { setEditingCallMemoId(memo.id); setEditCallMemoText(memo.content); }} sx={{ p: 0.5 }}><EditIcon sx={{ ...iconStyles.small, color: colors.text.muted }} /></IconButton>
                                <IconButton size="small" onClick={() => deleteCallMemo(memo.id)} sx={{ p: 0.5 }}><DeleteIcon sx={{ ...iconStyles.small, color: colors.status.error.main }} /></IconButton>
                              </Box>
                            )}
                          </Box>
                          {isEditing ? (
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                              <TextField value={editCallMemoText} onChange={(e) => setEditCallMemoText(e.target.value)} size="small" fullWidth multiline autoFocus sx={sectionStyles.textField} />
                              <IconButton size="small" onClick={() => saveCallMemo(memo.id)} color="primary"><CheckIcon sx={iconStyles.medium} /></IconButton>
                              <IconButton size="small" onClick={() => setEditingCallMemoId(null)}><CloseIcon sx={{ ...iconStyles.medium, color: colors.text.muted }} /></IconButton>
                            </Box>
                          ) : (
                            <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.secondary }}>{memo.content}</Typography>
                          )}
                          {isQuestion && !answerTargetId && !isEditing && (
                            <Button size="small" onClick={() => setAnswerTargetId(memo.id)} sx={{ mt: 1, py: 0.5, px: 1.5, backgroundColor: MEMO_TAGS.answer.bgColor, color: MEMO_TAGS.answer.color, fontWeight: 600, fontSize: fontSizes.xs, borderRadius: borderRadius.xs, '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.2)' } }}>回答を追加</Button>
                          )}
                          {answerTargetId === memo.id && (
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                              <TextField value={answerText} onChange={(e) => setAnswerText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey && answerText.trim()) { e.preventDefault(); addAnswer(memo.id); } }} placeholder="回答を入力... (Ctrl+Enterで記録)" size="small" fullWidth multiline minRows={1} autoFocus sx={sectionStyles.textField} />
                              <Button variant="contained" onClick={() => addAnswer(memo.id)} disabled={!answerText.trim()} sx={{ minWidth: 50, backgroundColor: MEMO_TAGS.answer.color, ...buttonStyles.small, '&:hover': { backgroundColor: colors.accent.greenDark } }}>記録</Button>
                              <Button size="small" onClick={() => { setAnswerTargetId(null); setAnswerText(''); }} sx={{ ...buttonStyles.small, color: colors.text.muted, minWidth: 40 }}>取消</Button>
                            </Box>
                          )}
                        </Paper>
                        {answers.length > 0 && (
                          <Box sx={{ ml: 2, mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {answers.map((answer) => {
                              const answerConfig = MEMO_TAGS.answer;
                              const AnswerTagIcon = answerConfig.icon;
                              const isAnswerEditing = editingCallMemoId === answer.id;
                              return (
                                <Paper key={answer.id} elevation={0} sx={{ p: 1, backgroundColor: answerConfig.bgColor, border: `1px solid ${answerConfig.color}20`, borderRadius: borderRadius.xs }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <AnswerTagIcon sx={{ ...iconStyles.small, color: answerConfig.color }} />
                                      <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>{answer.createdAt}</Typography>
                                    </Box>
                                    {!isAnswerEditing && (
                                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <IconButton size="small" onClick={() => { setEditingCallMemoId(answer.id); setEditCallMemoText(answer.content); }} sx={{ p: 0.25 }}><EditIcon sx={{ ...iconStyles.small, color: colors.text.muted }} /></IconButton>
                                        <IconButton size="small" onClick={() => deleteCallMemo(answer.id)} sx={{ p: 0.25 }}><DeleteIcon sx={{ ...iconStyles.small, color: colors.status.error.main }} /></IconButton>
                                      </Box>
                                    )}
                                  </Box>
                                  {isAnswerEditing ? (
                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                                      <TextField value={editCallMemoText} onChange={(e) => setEditCallMemoText(e.target.value)} size="small" fullWidth autoFocus sx={sectionStyles.textField} />
                                      <IconButton size="small" onClick={() => saveCallMemo(answer.id)} color="primary"><CheckIcon sx={iconStyles.medium} /></IconButton>
                                      <IconButton size="small" onClick={() => setEditingCallMemoId(null)}><CloseIcon sx={{ ...iconStyles.medium, color: colors.text.muted }} /></IconButton>
                                    </Box>
                                  ) : (
                                    <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.secondary }}>{answer.content}</Typography>
                                  )}
                                </Paper>
                              );
                            })}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
                {callMemos.length === 0 && !showCallMemoInput && (
                  <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.muted, textAlign: 'center', py: 2 }}>記録がありません</Typography>
                )}
              </Box>
            </Box>
          )}

          {/* メールタブ */}
          {activeTab === 1 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {SCRIPT_TEMPLATES.filter((t) => t.type === 'email').map((template) => (
                    <Chip key={template.id} label={template.label} size="small" icon={<EmailIcon sx={iconStyles.small} />}
                      onClick={() => { setSelectedEmailTemplateId(template.id); setEditedEmailSubject(null); setEditedEmailContent(null); }}
                      sx={{ ...chipStyles.medium, fontWeight: selectedEmailTemplateId === template.id ? 600 : 400, backgroundColor: selectedEmailTemplateId === template.id ? colors.accent.blueBg : 'transparent', color: selectedEmailTemplateId === template.id ? colors.accent.blue : colors.text.muted, border: `1px solid ${selectedEmailTemplateId === template.id ? colors.accent.blue : colors.border.main}`, cursor: 'pointer', '& .MuiChip-icon': { color: selectedEmailTemplateId === template.id ? colors.accent.blue : colors.text.muted } }} />
                  ))}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonIcon sx={{ ...iconStyles.small, color: colors.accent.blue }} />
                  <FormControl size="small">
                    <Select value={emailAssignees[selectedEmailTemplateId] || ''} onChange={(e) => setEmailAssignees(prev => ({ ...prev, [selectedEmailTemplateId]: e.target.value }))} displayEmpty sx={staffSelectStyles}
                      renderValue={(value) => { if (!value) return <span style={{ color: colors.text.light, fontSize: fontSizes.xs }}>未割当</span>; const staffMember = findById(value); return <span style={{ fontSize: fontSizes.xs }}>{staffMember?.name || '未割当'}</span>; }}>
                      <MenuItem value=""><em style={{ color: colors.text.light, fontSize: fontSizes.xs }}>未割当</em></MenuItem>
                      {staff.map((member) => (<MenuItem key={member.id} value={member.id} sx={{ fontSize: fontSizes.xs }}>{member.name}</MenuItem>))}
                    </Select>
                  </FormControl>
                </Box>
              </Box>
              {(() => {
                const emailTemplate = SCRIPT_TEMPLATES.find((t) => t.id === selectedEmailTemplateId);
                const renderedEmailSubject = emailTemplate?.subject ? replacePlaceholders(emailTemplate.subject, partner, projectName, companyName, myName) : '';
                const renderedEmailContent = emailTemplate ? replacePlaceholders(emailTemplate.content, partner, projectName, companyName, myName) : '';
                const displayEmailSubject = editedEmailSubject !== null ? editedEmailSubject : renderedEmailSubject;
                const displayEmailContent = editedEmailContent !== null ? editedEmailContent : renderedEmailContent;
                return (
                  <>
                    <Box sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted, mb: 0.5 }}>件名</Typography>
                      <TextField value={displayEmailSubject} onChange={(e) => setEditedEmailSubject(e.target.value)} size="small" fullWidth sx={sectionStyles.textField} />
                    </Box>
                    <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted, mb: 0.5 }}>本文</Typography>
                    <TextField value={displayEmailContent} onChange={(e) => setEditedEmailContent(e.target.value)} fullWidth multiline minRows={10} sx={{ ...sectionStyles.textField, mb: 1.5 }} />
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Button size="small" onClick={() => { setEditedEmailSubject(null); setEditedEmailContent(null); }} disabled={editedEmailSubject === null && editedEmailContent === null}>テンプレートに戻す</Button>
                      <Button size="small" variant="outlined" onClick={() => navigator.clipboard.writeText(displayEmailContent)}>本文をコピー</Button>
                      <Button size="small" variant="contained" startIcon={<EmailIcon />} onClick={() => window.location.href = `mailto:${partner.email}?subject=${encodeURIComponent(displayEmailSubject)}&body=${encodeURIComponent(displayEmailContent)}`}
                        sx={{ backgroundColor: colors.accent.blue, '&:hover': { backgroundColor: colors.accent.blueHover } }}>メール作成</Button>
                    </Box>
                  </>
                );
              })()}
            </Box>
          )}

          {/* 受信資料タブ */}
          {activeTab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PersonIcon sx={{ ...iconStyles.small, color: colors.accent.blue }} />
                  <FormControl size="small">
                    <Select value={receivedDocsAssignee} onChange={(e) => setReceivedDocsAssignee(e.target.value)} displayEmpty sx={staffSelectStyles}
                      renderValue={(value) => { if (!value) return <span style={{ color: colors.text.light, fontSize: fontSizes.xs }}>未割当</span>; const staffMember = findById(value); return <span style={{ fontSize: fontSizes.xs }}>{staffMember?.name || '未割当'}</span>; }}>
                      <MenuItem value=""><em style={{ color: colors.text.light, fontSize: fontSizes.xs }}>未割当</em></MenuItem>
                      {staff.map((member) => (<MenuItem key={member.id} value={member.id} sx={{ fontSize: fontSizes.xs }}>{member.name}</MenuItem>))}
                    </Select>
                  </FormControl>
                </Box>
                <Button size="small" startIcon={<AddIcon />} sx={{ ...buttonStyles.small, color: colors.accent.blue, fontSize: fontSizes.xs }}>ファイルを追加</Button>
              </Box>
              {partner.receivedDocuments.length === 0 ? (
                <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.muted, textAlign: 'center', py: 2 }}>受信資料がありません</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {partner.receivedDocuments.map((doc) => (
                    <Box key={doc.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: borderRadius.xs, backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <input type="checkbox" id={`doc-${partner.id}-${doc.id}`} defaultChecked style={{ cursor: 'pointer' }} />
                      <AttachFileIcon sx={{ ...iconStyles.medium, color: colors.status.success.main }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography component="label" htmlFor={`doc-${partner.id}-${doc.id}`} sx={{ fontSize: fontSizes.sm, color: colors.text.secondary, cursor: 'pointer', display: 'block' }}>{doc.name}</Typography>
                        <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>受信日: {doc.date}</Typography>
                      </Box>
                      <IconButton size="small"><DeleteIcon sx={{ ...iconStyles.small, color: colors.text.light, '&:hover': { color: colors.status.error.main } }} /></IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* 文字起こしタブ */}
          {activeTab === 3 && (
            <Box>
              {partner.transcriptions.length === 0 ? (
                <Typography sx={{ fontSize: fontSizes.md, color: colors.text.muted, textAlign: 'center', py: 2 }}>文字起こしデータなし</Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 200, overflow: 'auto' }}>
                  {partner.transcriptions.map((trans) => (
                    <Box key={trans.id} sx={{ p: 1.5, backgroundColor: 'rgba(37, 99, 235, 0.05)', borderRadius: borderRadius.xs, border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <MicIcon sx={{ ...iconStyles.small, color: colors.accent.blue }} />
                        <Typography sx={{ fontSize: fontSizes.sm, color: colors.text.muted }}>{trans.date}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: fontSizes.md, fontStyle: 'italic', color: colors.text.secondary }}>{trans.content}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
