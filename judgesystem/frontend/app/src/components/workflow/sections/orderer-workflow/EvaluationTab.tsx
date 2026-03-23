/**
 * EvaluationTab - Evaluation records tab with add/edit/delete/sort.
 */
import { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import {
  colors,
  fontSizes,
  sectionStyles,
  buttonStyles,
} from '../../../../constants/styles';
import { MemoCard } from './MemoCard';
import type { CallMemo } from './types';

// ============================================================================
// Props
// ============================================================================

export interface EvaluationTabProps {
  evaluations: CallMemo[];
  onEvaluationsChange: (updater: (prev: CallMemo[]) => CallMemo[]) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function getDateStr(): string {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function sortByDate<T extends { createdAt: string }>(items: T[], newest: boolean): T[] {
  return [...items].sort((a, b) => {
    const dateA = new Date(a.createdAt.replace(/\//g, '-')).getTime();
    const dateB = new Date(b.createdAt.replace(/\//g, '-')).getTime();
    return newest ? dateB - dateA : dateA - dateB;
  });
}

// ============================================================================
// Component
// ============================================================================

export function EvaluationTab({ evaluations, onEvaluationsChange }: EvaluationTabProps) {
  const [newEvaluationText, setNewEvaluationText] = useState('');
  const [showEvaluationInput, setShowEvaluationInput] = useState(false);
  const [editingEvalId, setEditingEvalId] = useState<string | null>(null);
  const [editEvalText, setEditEvalText] = useState('');
  const [evalSortNewest, setEvalSortNewest] = useState(true);

  const addEvaluation = () => {
    if (!newEvaluationText.trim()) return;
    onEvaluationsChange((prev) => [
      { id: Date.now().toString(), createdAt: getDateStr(), content: newEvaluationText, tag: 'evaluation' },
      ...prev,
    ]);
    setNewEvaluationText('');
    setShowEvaluationInput(false);
  };

  const startEditEval = (eval_: CallMemo) => {
    setEditingEvalId(eval_.id);
    setEditEvalText(eval_.content);
  };

  const saveEditEval = (id: string) => {
    if (!editEvalText.trim()) return;
    onEvaluationsChange((prev) =>
      prev.map((e) => (e.id === id ? { ...e, content: editEvalText, updatedAt: getDateStr() } : e))
    );
    setEditingEvalId(null);
    setEditEvalText('');
  };

  const cancelEditEval = () => {
    setEditingEvalId(null);
    setEditEvalText('');
  };

  const deleteEval = (id: string) => {
    onEvaluationsChange((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <Box>
      {!showEvaluationInput && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Button
            size="small"
            startIcon={evalSortNewest ? <ArrowDownIcon /> : <ArrowUpIcon />}
            onClick={() => setEvalSortNewest(!evalSortNewest)}
            sx={{ ...buttonStyles.small, color: colors.text.muted }}
          >
            {evalSortNewest ? '新しい順' : '古い順'}
          </Button>
          <Button size="small" startIcon={<AddIcon />} onClick={() => setShowEvaluationInput(true)} sx={{ ...buttonStyles.small, color: colors.accent.blue }}>
            追加
          </Button>
        </Box>
      )}
      {showEvaluationInput && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'flex-start' }}>
          <TextField
            value={newEvaluationText}
            onChange={(e) => setNewEvaluationText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && newEvaluationText.trim()) {
                e.preventDefault();
                addEvaluation();
              }
            }}
            placeholder="評価内容を入力... (Ctrl+Enterで記録)"
            size="small"
            fullWidth
            multiline
            minRows={3}
            autoFocus
            sx={sectionStyles.textField}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Button variant="contained" onClick={addEvaluation} disabled={!newEvaluationText.trim()} sx={{ minWidth: 80, backgroundColor: colors.accent.blue, ...buttonStyles.small, '&:hover': { backgroundColor: colors.accent.blueHover } }}>
              記録
            </Button>
            <Button size="small" onClick={() => { setShowEvaluationInput(false); setNewEvaluationText(''); }} sx={{ ...buttonStyles.small, color: colors.text.muted }}>
              キャンセル
            </Button>
          </Box>
        </Box>
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {sortByDate(evaluations, evalSortNewest).map((eval_: CallMemo) => (
          <MemoCard
            key={eval_.id}
            memo={eval_}
            isEditing={editingEvalId === eval_.id}
            editText={editEvalText}
            onEditTextChange={setEditEvalText}
            onStartEdit={() => startEditEval(eval_)}
            onSaveEdit={() => saveEditEval(eval_.id)}
            onCancelEdit={cancelEditEval}
            onDelete={() => deleteEval(eval_.id)}
          />
        ))}
      </Box>
    </Box>
  );
}
