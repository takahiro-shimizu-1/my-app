/**
 * CallLogTab - Call log tab with talk script accordion, sort controls, and memo list.
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
  Phone as PhoneIcon,
  Add as AddIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  Sort as SortIcon,
  ExpandMore as ExpandMoreIcon,
  MenuBook as ScriptIcon,
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
import { MEMO_TAGS, type MemoTag, type MemoTagConfig } from '../../../../constants/memoTags';
import { useStaffDirectory } from '../../../../contexts/StaffContext';
import { PersonIcon } from '../../../../constants/icons';
import { MemoCard } from './MemoCard';
import type { CallMemo, SortType } from './types';
import { STYLES } from './types';

// ============================================================================
// Props
// ============================================================================

export interface CallLogTabProps {
  /** Current list of call memos (managed by parent). */
  callMemos: CallMemo[];
  onCallMemosChange: (updater: (prev: CallMemo[]) => CallMemo[]) => void;

  /** Talk-script templates. */
  talkScriptTemplates: { id: string; label: string; content: string }[];

  /** Script assignee map and handler. */
  scriptAssignees: Record<string, string>;
  onScriptAssigneeChange: (scriptId: string, staffId: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================

const CATEGORY_ORDER: Record<MemoTag, number> = {
  question: 1,
  answer: 2,
  memo: 3,
  idea: 4,
  evaluation: 5,
};

function sortMemos(items: CallMemo[], type: SortType): CallMemo[] {
  return [...items].sort((a, b) => {
    if (type === 'category') {
      const catDiff = CATEGORY_ORDER[a.tag] - CATEGORY_ORDER[b.tag];
      if (catDiff !== 0) return catDiff;
      const dateA = new Date(a.createdAt.replace(/\//g, '-')).getTime();
      const dateB = new Date(b.createdAt.replace(/\//g, '-')).getTime();
      return dateB - dateA;
    }
    const dateA = new Date(a.createdAt.replace(/\//g, '-')).getTime();
    const dateB = new Date(b.createdAt.replace(/\//g, '-')).getTime();
    return type === 'newest' ? dateB - dateA : dateA - dateB;
  });
}

function getDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function getSortLabel(type: SortType): string {
  switch (type) {
    case 'newest': return '新しい順';
    case 'oldest': return '古い順';
    case 'category': return 'カテゴリー順';
  }
}

function nextSortType(current: SortType): SortType {
  switch (current) {
    case 'newest': return 'oldest';
    case 'oldest': return 'category';
    case 'category': return 'newest';
  }
}

// ============================================================================
// Component
// ============================================================================

export function CallLogTab({
  callMemos,
  onCallMemosChange,
  talkScriptTemplates,
  scriptAssignees,
  onScriptAssigneeChange,
}: CallLogTabProps) {
  const { staff, findById } = useStaffDirectory();

  // Script state
  const [selectedScriptId, setSelectedScriptId] = useState<string>('intro');
  const [editedScriptContent, setEditedScriptContent] = useState<string | null>(null);
  const [scriptOpen, setScriptOpen] = useState(true);

  const selectedScript = talkScriptTemplates.find((t) => t.id === selectedScriptId) || talkScriptTemplates[0];
  const displayScriptContent = editedScriptContent !== null ? editedScriptContent : selectedScript.content;

  const handleScriptSelect = (scriptId: string) => {
    setSelectedScriptId(scriptId);
    setEditedScriptContent(null);
  };
  const resetScript = () => setEditedScriptContent(null);

  // Memo input state
  const [newMemo, setNewMemo] = useState('');
  const [newMemoTag, setNewMemoTag] = useState<MemoTag>('memo');
  const [showMemoInput, setShowMemoInput] = useState(false);

  // Answer input state
  const [answerTargetId, setAnswerTargetId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Sort state
  const [sortType, setSortType] = useState<SortType>('newest');

  // Memo operations
  const addMemo = () => {
    if (!newMemo.trim()) return;
    onCallMemosChange((prev) => [
      { id: Date.now().toString(), createdAt: getDateStr(), content: newMemo, tag: newMemoTag },
      ...prev,
    ]);
    setNewMemo('');
    setNewMemoTag('memo');
    setShowMemoInput(false);
  };

  const addAnswer = (parentId: string) => {
    if (!answerText.trim()) return;
    onCallMemosChange((prev) => [
      { id: Date.now().toString(), createdAt: getDateStr(), content: answerText, tag: 'answer', parentId },
      ...prev,
    ]);
    setAnswerText('');
    setAnswerTargetId(null);
  };

  const startEdit = (memo: CallMemo) => {
    setEditingId(memo.id);
    setEditText(memo.content);
  };

  const saveEdit = (id: string) => {
    if (!editText.trim()) return;
    onCallMemosChange((prev) =>
      prev.map((m) => (m.id === id ? { ...m, content: editText, updatedAt: getDateStr() } : m))
    );
    setEditingId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const deleteMemo = (id: string) => {
    onCallMemosChange((prev) => prev.filter((m) => m.id !== id && m.parentId !== id));
  };

  return (
    <Box>
      {/* Call button */}
      <Box sx={{ mb: 1.5 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<PhoneIcon />}
          sx={{
            py: 1.5,
            backgroundColor: colors.accent.greenDark,
            fontWeight: 600,
            fontSize: fontSizes.sm,
            '&:hover': { backgroundColor: colors.accent.greenHover },
          }}
        >
          電話をかける
        </Button>
      </Box>

      {/* Talk-script accordion */}
      <Accordion
        expanded={scriptOpen}
        onChange={() => setScriptOpen(!scriptOpen)}
        elevation={0}
        sx={{
          mb: 1.5,
          border: `1px solid ${colors.border.main}`,
          borderRadius: `${borderRadius.xs} !important`,
          '&:before': { display: 'none' },
          '&.Mui-expanded': { margin: 0, mb: 1.5 },
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
            <ScriptIcon sx={{ ...iconStyles.medium, color: colors.accent.greenDark }} />
            <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: colors.text.secondary }}>
              トークスクリプト
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0, pb: 2 }}>
          {/* Template selector + assignee */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {talkScriptTemplates.map((template) => (
                <Chip
                  key={template.id}
                  label={template.label}
                  size="small"
                  icon={<PhoneIcon sx={iconStyles.small} />}
                  onClick={() => handleScriptSelect(template.id)}
                  sx={{
                    ...chipStyles.medium,
                    fontWeight: selectedScriptId === template.id ? 600 : 400,
                    backgroundColor: selectedScriptId === template.id
                      ? 'rgba(5, 150, 105, 0.1)'
                      : 'transparent',
                    color: selectedScriptId === template.id
                      ? colors.accent.greenDark
                      : colors.text.muted,
                    border: `1px solid ${selectedScriptId === template.id
                      ? colors.accent.greenDark
                      : colors.border.main}`,
                    cursor: 'pointer',
                    '& .MuiChip-icon': {
                      color: selectedScriptId === template.id
                        ? colors.accent.greenDark
                        : colors.text.muted,
                    },
                  }}
                />
              ))}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PersonIcon sx={{ ...iconStyles.small, color: colors.accent.blue }} />
              <FormControl size="small">
                <Select
                  value={scriptAssignees[selectedScriptId] || ''}
                  onChange={(e) => onScriptAssigneeChange(selectedScriptId, e.target.value)}
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

          {/* Script body */}
          <TextField
            value={displayScriptContent}
            onChange={(e) => setEditedScriptContent(e.target.value)}
            fullWidth
            multiline
            minRows={10}
            sx={{ ...sectionStyles.textField, mb: 1.5 }}
          />

          {/* Action buttons */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button size="small" onClick={resetScript} disabled={editedScriptContent === null}>
              テンプレートに戻す
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigator.clipboard.writeText(displayScriptContent)}
            >
              コピー
            </Button>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Sort + add header */}
      {!showMemoInput && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Button
            size="small"
            startIcon={sortType === 'category' ? <SortIcon /> : sortType === 'newest' ? <ArrowDownIcon /> : <ArrowUpIcon />}
            onClick={() => setSortType(nextSortType(sortType))}
            sx={{ ...buttonStyles.small, color: colors.text.muted }}
          >
            {getSortLabel(sortType)}
          </Button>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setShowMemoInput(true)}
            sx={{ ...buttonStyles.small, color: colors.accent.blue }}
          >
            追加
          </Button>
        </Box>
      )}

      {/* New memo input */}
      {showMemoInput && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
            {(Object.entries(MEMO_TAGS) as [MemoTag, MemoTagConfig][])
              .filter(([key]) => key !== 'answer' && key !== 'evaluation')
              .map(([key, config]) => {
                const isSelected = newMemoTag === key;
                const TagIcon = config.icon;
                return (
                  <Button
                    key={key}
                    size="small"
                    startIcon={<TagIcon sx={iconStyles.small} />}
                    onClick={() => setNewMemoTag(key)}
                    sx={{
                      ...STYLES.tagButton,
                      backgroundColor: isSelected ? config.bgColor : 'transparent',
                      color: isSelected ? config.color : colors.text.muted,
                      border: `1px solid ${isSelected ? config.color : colors.border.main}`,
                      '&:hover': { backgroundColor: config.bgColor, color: config.color },
                    }}
                  >
                    {config.label}
                  </Button>
                );
              })}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
            <TextField
              value={newMemo}
              onChange={(e) => setNewMemo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey && newMemo.trim()) {
                  e.preventDefault();
                  addMemo();
                }
              }}
              placeholder="内容を入力... (Ctrl+Enterで記録)"
              size="small"
              fullWidth
              multiline
              minRows={3}
              autoFocus
              sx={sectionStyles.textField}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Button
                variant="contained"
                onClick={addMemo}
                disabled={!newMemo.trim()}
                sx={{ minWidth: 80, backgroundColor: colors.accent.blue, ...buttonStyles.small, '&:hover': { backgroundColor: colors.accent.blueHover } }}
              >
                記録
              </Button>
              <Button
                size="small"
                onClick={() => { setShowMemoInput(false); setNewMemo(''); setNewMemoTag('memo'); }}
                sx={{ ...buttonStyles.small, color: colors.text.muted }}
              >
                キャンセル
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      {/* Memo list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sortMemos(callMemos.filter((m: CallMemo) => !m.parentId), sortType).map((memo: CallMemo) => {
          const isEditing = editingId === memo.id;
          const answers = callMemos.filter((m: CallMemo) => m.parentId === memo.id);
          const isQuestion = memo.tag === 'question';

          return (
            <Box key={memo.id}>
              <MemoCard
                memo={memo}
                isEditing={isEditing}
                editText={editText}
                onEditTextChange={setEditText}
                onStartEdit={() => startEdit(memo)}
                onSaveEdit={() => saveEdit(memo.id)}
                onCancelEdit={cancelEdit}
                onDelete={() => deleteMemo(memo.id)}
              >
                {isQuestion && !answerTargetId && (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => setAnswerTargetId(memo.id)}
                    sx={{ mt: 1.5, py: 0.75, px: 2, backgroundColor: MEMO_TAGS.answer.color, color: colors.text.white, fontWeight: 600, fontSize: fontSizes.sm, borderRadius: borderRadius.xs, '&:hover': { backgroundColor: colors.accent.greenDark } }}
                  >
                    回答を追加
                  </Button>
                )}
                {answerTargetId === memo.id && (
                  <Box sx={{ mt: 1.5, display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                    <TextField
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey && answerText.trim()) {
                          e.preventDefault();
                          addAnswer(memo.id);
                        }
                      }}
                      placeholder="回答を入力... (Ctrl+Enterで記録)"
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                      autoFocus
                      sx={sectionStyles.textField}
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      <Button variant="contained" onClick={() => addAnswer(memo.id)} disabled={!answerText.trim()} sx={{ minWidth: 60, backgroundColor: MEMO_TAGS.answer.color, ...buttonStyles.small, '&:hover': { backgroundColor: colors.accent.greenDark } }}>
                        記録
                      </Button>
                      <Button size="small" onClick={() => { setAnswerTargetId(null); setAnswerText(''); }} sx={{ ...buttonStyles.small, color: colors.text.muted, minWidth: 60 }}>
                        取消
                      </Button>
                    </Box>
                  </Box>
                )}
              </MemoCard>
              {answers.length > 0 && (
                <Box sx={{ ml: 3, mt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {answers.map((answer: CallMemo) => (
                    <MemoCard
                      key={answer.id}
                      memo={answer}
                      isEditing={editingId === answer.id}
                      editText={editText}
                      onEditTextChange={setEditText}
                      onStartEdit={() => startEdit(answer)}
                      onSaveEdit={() => saveEdit(answer.id)}
                      onCancelEdit={cancelEdit}
                      onDelete={() => deleteMemo(answer.id)}
                      variant="answer"
                    />
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
