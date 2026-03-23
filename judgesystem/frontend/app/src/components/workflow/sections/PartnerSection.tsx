/**
 * 協力会社セクション（候補者リスト）
 * 企業情報、ステータス管理、メモ、文字起こし、トークスクリプトを表示
 *
 * Sub-components are located in ./partner/
 */
import { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  sectionStyles,
  buttonStyles,
  iconStyles,
  colors,
} from '../../../constants/styles';
import type { Partner, PartnerStatus, PartnerDocument } from '../../../types';
import { partnerStatusPriority } from '../../../constants/partnerStatus';
import {
  PartnerCard,
  FilterChips,
  SentDocumentsSection,
} from './partner';

// ============================================================================
// Props
// ============================================================================

interface PartnerSectionProps {
  evaluation?: import('../../../types').BidEvaluation;
  partners: Partner[];
  onPartnersChange: (partners: Partner[]) => void;
  /** ワークフロー（協力会社タブ）の担当者ID */
  workflowAssigneeId?: string;
}

// ============================================================================
// メインコンポーネント
// ============================================================================

export function PartnerSection({ evaluation, partners, onPartnersChange, workflowAssigneeId }: PartnerSectionProps) {
  // 案件・自社情報をevaluationから取得
  const projectName = evaluation?.announcement?.title || '（案件名）';
  const companyName = evaluation?.company?.name || '（自社名）';
  const myName = '営業担当';

  // 展開状態
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);

  // 送付資料
  const [documents] = useState<PartnerDocument[]>([
    { id: '1', name: '見積依頼書', type: 'sent', date: '2024/01/15' },
  ]);

  // フィルター状態
  const [selectedStatuses, setSelectedStatuses] = useState<PartnerStatus[]>([
    'not_called', 'waiting_documents', 'waiting_response', 'estimate_in_progress', 'estimate_completed', 'estimate_adopted',
  ]);
  const [showUnavailable, setShowUnavailable] = useState(false);

  // コールバック
  const changeStatus = useCallback((id: string, newStatus: PartnerStatus) => {
    onPartnersChange(partners.map((p) => p.id === id ? { ...p, status: newStatus } : p));
  }, [partners, onPartnersChange]);

  const toggleSurvey = useCallback((id: string) => {
    onPartnersChange(partners.map((p) => p.id === id ? { ...p, surveyApproved: !p.surveyApproved } : p));
  }, [partners, onPartnersChange]);

  // フィルター + ソート
  const filteredAndSortedPartners = useMemo(() => {
    const filtered = partners.filter((p) => {
      if (p.status === 'unavailable') return showUnavailable;
      return selectedStatuses.includes(p.status);
    });
    return filtered.sort((a, b) => partnerStatusPriority[a.status] - partnerStatusPriority[b.status]);
  }, [partners, selectedStatuses, showUnavailable]);

  const toggleStatus = (status: PartnerStatus) => {
    setSelectedStatuses((prev) => prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]);
  };

  return (
    <Box sx={sectionStyles.container}>
      {/* 候補者リストセクション */}
      <Box>
        {/* ヘッダー */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography sx={{ ...sectionStyles.title, mb: 0 }}>
            <BusinessIcon sx={{ ...iconStyles.medium, color: colors.text.muted }} />
            候補者リスト ({filteredAndSortedPartners.length}社)
          </Typography>
          <Button size="small" startIcon={<AddIcon />} sx={{ ...buttonStyles.small, color: colors.accent.blue }}>
            追加
          </Button>
        </Box>

        {/* フィルター */}
        <FilterChips
          selectedStatuses={selectedStatuses}
          showUnavailable={showUnavailable}
          onToggleStatus={toggleStatus}
          onToggleShowUnavailable={() => setShowUnavailable(!showUnavailable)}
        />

        {/* リスト */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredAndSortedPartners.map((partner) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              isExpanded={expandedPartnerId === partner.id}
              onToggleExpand={() => setExpandedPartnerId(expandedPartnerId === partner.id ? null : partner.id)}
              onStatusChange={(s) => changeStatus(partner.id, s)}
              onToggleSurvey={() => toggleSurvey(partner.id)}
              projectName={projectName}
              companyName={companyName}
              myName={myName}
              workflowAssigneeId={workflowAssigneeId}
            />
          ))}
        </Box>
      </Box>

      {/* 送付資料セクション */}
      <SentDocumentsSection
        documents={documents}
        workflowAssigneeId={workflowAssigneeId}
      />
    </Box>
  );
}
