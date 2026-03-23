/**
 * 発注者ワークフローセクション
 * 架電記録、事前提出資料を表示
 *
 * Sub-components are located in ./orderer-workflow/
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';
import {
  Phone as PhoneIcon,
  AttachFile as AttachFileIcon,
  Mic as MicIcon,
  StarOutline as EvaluationIcon,
} from '@mui/icons-material';
import {
  colors,
  fontSizes,
  iconStyles,
  staffSelectStyles,
} from '../../../constants/styles';
import type { PreSubmitDocument, BidEvaluation } from '../../../types';
import { useStaffDirectory } from '../../../contexts/StaffContext';
import { PersonIcon } from '../../../constants/icons';
import {
  CallLogTab,
  EvaluationTab,
  TranscriptionTab,
  DocumentsTab,
} from './orderer-workflow';
import type { CallMemo, EmailTemplate } from './orderer-workflow';

// ============================================================================
// Props
// ============================================================================

interface OrdererWorkflowSectionProps {
  evaluation?: BidEvaluation;
  /** ワークフロー（発注者タブ）の担当者ID */
  workflowAssigneeId?: string;
}

// ============================================================================
// メインコンポーネント
// ============================================================================

export function OrdererWorkflowSection({ evaluation, workflowAssigneeId }: OrdererWorkflowSectionProps) {
  const { staff, findById } = useStaffDirectory();

  // 案件・発注者・自社情報
  const projectName = evaluation?.announcement?.title || '（案件名）';
  const ordererOrg = evaluation?.announcement?.organization || '（発注機関）';
  const ordererContact = evaluation?.announcement?.department?.contactPerson || '担当者';
  const companyName = evaluation?.company?.name || '（自社名）';
  const myName = '営業担当';

  // 架電記録
  const [callMemos, setCallMemos] = useState<CallMemo[]>([
    { id: '1', createdAt: '2024/01/15 09:00', content: '工期が厳しいので、協力会社の確保を優先する必要あり', tag: 'question' },
    { id: '2', createdAt: '2024/01/15 10:30', content: '担当者不在。折り返し依頼済み。', tag: 'memo' },
    { id: '3', createdAt: '2024/01/15 14:00', updatedAt: '2024/01/15 15:30', content: '3月末完成予定で変更なし。協力会社は早めに確保する。', tag: 'answer', parentId: '1' },
    { id: '4', createdAt: '2024/01/15 14:10', content: '発注者は現場説明会を重視している印象。参加必須かも。', tag: 'idea' },
    { id: '5', createdAt: '2024/01/16 09:30', content: '本案件の技術者要件について確認したい。特に監理技術者の資格要件と、現場代理人との兼任可否について。また、配置予定技術者の経験年数の算定基準（実務経験のカウント方法）も確認が必要。過去の類似案件では厳格に審査された経緯あり。', tag: 'question' },
    { id: '6', createdAt: '2024/01/16 11:00', content: '監理技術者は1級土木施工管理技士が必須。現場代理人との兼任は原則不可だが、工事規模によっては協議可能とのこと。経験年数は、資格取得後の実務経験を基本とするが、資格取得前の経験も一定条件下で算入可能。詳細は入札説明書の別紙3を参照。担当者から「過去に兼任を認めた事例もあるので、個別相談してほしい」とのコメントあり。', tag: 'answer', parentId: '5' },
    { id: '7', createdAt: '2024/01/16 14:00', content: '入札説明書を精読したところ、地元企業との JV 構成について言及あり。地元企業の定義は「本店所在地が〇〇県内にある企業」とのこと。当社は該当しないため、地元企業とのJV構成を検討する必要がある。候補企業として、A建設（過去に2回JV経験あり、関係良好）、B工業（技術力高いが過去取引なし）、C組（地元では最大手、ただし他案件でバッティングの可能性）の3社をリストアップ。来週中に各社へのアプローチ方針を決定予定。', tag: 'memo' },
  ]);

  // 録音文字起こし
  const [transcriptions] = useState<{ id: string; date: string; content: string }[]>([
    { id: '1', date: '2024/01/15 14:00', content: '「はい、工期については3月末の予定で変更ありません。現場説明会は来週の月曜日に予定しております。参加をお願いいたします。」' },
  ]);

  // トークスクリプトテンプレート
  const talkScriptTemplates = [
    {
      id: 'intro',
      label: '初回架電',
      content: `【挨拶】
お世話になっております。${companyName}の${myName}と申します。

【用件】
本日は「${projectName}」の件でご連絡させていただきました。
入札参加を検討しておりまして、いくつか確認させていただきたい点がございます。

【確認事項】
・現場説明会の日程について
・入札参加資格の確認
・質問書の提出期限について

【クロージング】
ご確認いただきありがとうございます。
また何かございましたらご連絡させていただきます。
失礼いたします。`,
    },
    {
      id: 'followup',
      label: 'フォローアップ',
      content: `【挨拶】
お世話になっております。${companyName}の${myName}です。

【用件】
先日ご質問させていただいた「${projectName}」の件で、
ご回答の状況を確認させていただきたくお電話いたしました。

【確認事項】
・質問への回答予定について
・追加で必要な情報があるか

【クロージング】
お忙しいところ恐れ入ります。
ご対応いただけますと幸いです。`,
    },
  ];

  // 評価記録
  const [evaluations, setEvaluations] = useState<CallMemo[]>([
    { id: '1', createdAt: '2024/01/15 14:30', content: '発注者の対応は協力的。追加情報も積極的に提供してくれた。', tag: 'evaluation' },
  ]);

  // 事前提出書類
  const [preSubmitDocs, setPreSubmitDocs] = useState<PreSubmitDocument[]>([
    { id: '1', name: '参加資格確認申請書', status: 'submitted', dueDate: '2024/01/20' },
    { id: '2', name: '技術者配置予定表', status: 'pending', dueDate: '2024/01/22' },
  ]);

  const deleteDoc = (id: string) => {
    setPreSubmitDocs((prev) => prev.filter((d) => d.id !== id));
  };

  // タブ管理
  const [activeTab, setActiveTab] = useState(0);

  // タブごとの担当者（記録、提出書類、評価、文字起こし）
  const [tabAssignees, setTabAssignees] = useState<string[]>(['', '', '', '']);
  const handleTabAssigneeChange = (tabIndex: number, staffId: string) => {
    setTabAssignees((prev) => {
      const newAssignees = [...prev];
      newAssignees[tabIndex] = staffId;
      return newAssignees;
    });
  };

  // トークスクリプトテンプレートごとの担当者
  const [scriptAssignees, setScriptAssignees] = useState<Record<string, string>>({});
  const handleScriptAssigneeChange = (scriptId: string, staffId: string) => {
    setScriptAssignees((prev) => ({ ...prev, [scriptId]: staffId }));
  };

  // メールテンプレートごとの担当者
  const [emailAssignees, setEmailAssignees] = useState<Record<string, string>>({});
  const handleEmailAssigneeChange = (templateId: string, staffId: string) => {
    setEmailAssignees((prev) => ({ ...prev, [templateId]: staffId }));
  };

  // 提出書類アップロードの担当者
  const [docsAssignee, setDocsAssignee] = useState<string>('');

  // テンプレートIDの定数
  const SCRIPT_TEMPLATE_IDS = ['intro', 'followup'];
  const EMAIL_TEMPLATE_IDS = ['1', '2', '3'];

  // ワークフロー担当者が変更されたら、空の担当者欄を自動で埋める
  useEffect(() => {
    if (!workflowAssigneeId) return;

    setTabAssignees((prev) => prev.map((val) => (val === '' ? workflowAssigneeId : val)));

    setScriptAssignees((prev) => {
      const updated = { ...prev };
      SCRIPT_TEMPLATE_IDS.forEach((id) => {
        if (!updated[id]) {
          updated[id] = workflowAssigneeId;
        }
      });
      return updated;
    });

    setEmailAssignees((prev) => {
      const updated = { ...prev };
      EMAIL_TEMPLATE_IDS.forEach((id) => {
        if (!updated[id]) {
          updated[id] = workflowAssigneeId;
        }
      });
      return updated;
    });

    setDocsAssignee((prev) => (prev === '' ? workflowAssigneeId : prev));
  }, [workflowAssigneeId]);

  // メールテンプレート
  const emailTemplates: EmailTemplate[] = [
    {
      id: '1',
      label: '資料請求',
      subject: `【資料請求】${projectName}に関する入札資料のご送付のお願い`,
      body: `${ordererOrg}\n${ordererContact}様\n\nお世話になっております。\n${companyName}の${myName}でございます。\n\n貴機関が公告されております「${projectName}」につきまして、\n入札参加を検討しております。\n\nつきましては、下記資料のご送付をお願いできますでしょうか。\n\n・入札説明書\n・設計図書\n・その他関連資料\n\nご多忙のところ恐れ入りますが、\n何卒よろしくお願いいたします。\n\n─────────────────────\n${companyName}\n${myName}\n─────────────────────`,
    },
    {
      id: '2',
      label: '質問送付',
      subject: `【質問】${projectName}入札に関するご質問`,
      body: `${ordererOrg}\n${ordererContact}様\n\nお世話になっております。\n${companyName}の${myName}でございます。\n\n貴機関が公告されております「${projectName}」につきまして、\n下記の点についてご質問させていただきます。\n\n【質問事項】\n1.\n\nご回答いただけますと幸いです。\n何卒よろしくお願いいたします。\n\n─────────────────────\n${companyName}\n${myName}\n─────────────────────`,
    },
    {
      id: '3',
      label: '書類提出',
      subject: `【書類提出】${projectName} 参加資格確認申請書の提出`,
      body: `${ordererOrg}\n${ordererContact}様\n\nお世話になっております。\n${companyName}の${myName}でございます。\n\n貴機関が公告されております「${projectName}」につきまして、\n参加資格確認申請書を提出させていただきます。\n\n添付書類：\n・参加資格確認申請書\n・技術者配置予定表\n・その他必要書類\n\nご査収のほど、よろしくお願いいたします。\n\n─────────────────────\n${companyName}\n${myName}\n─────────────────────`,
    },
  ];

  return (
    <Box>
      {/* タブ + 担当者選択 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 32,
            flex: 1,
            '& .MuiTab-root': { fontSize: fontSizes.sm, minHeight: 32, py: 0.5, textTransform: 'none' },
            '& .MuiTabs-indicator': { backgroundColor: colors.accent.blue },
            '& .Mui-selected': { color: colors.accent.blue },
          }}
        >
          <Tab icon={<PhoneIcon sx={iconStyles.small} />} iconPosition="start" label="記録" />
          <Tab icon={<AttachFileIcon sx={iconStyles.small} />} iconPosition="start" label="提出書類" />
          <Tab icon={<EvaluationIcon sx={iconStyles.small} />} iconPosition="start" label="評価" />
          <Tab icon={<MicIcon sx={iconStyles.small} />} iconPosition="start" label="文字起こし" />
        </Tabs>
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PersonIcon sx={{ ...iconStyles.small, color: colors.accent.blue }} />
            <FormControl size="small">
              <Select
                value={tabAssignees[activeTab] || ''}
                onChange={(e) => handleTabAssigneeChange(activeTab, e.target.value)}
                displayEmpty
                sx={staffSelectStyles}
                renderValue={(value) => {
                  if (!value) return <span style={{ color: colors.text.light, fontSize: fontSizes.xs }}>担当者</span>;
                  const staffMember = findById(value);
                  return <span style={{ fontSize: fontSizes.xs }}>{staffMember?.name || '担当者'}</span>;
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
        )}
      </Box>

      {/* タブコンテンツ */}
      <Box>
        {activeTab === 0 && (
          <CallLogTab
            callMemos={callMemos}
            onCallMemosChange={setCallMemos}
            talkScriptTemplates={talkScriptTemplates}
            scriptAssignees={scriptAssignees}
            onScriptAssigneeChange={handleScriptAssigneeChange}
          />
        )}
        {activeTab === 1 && (
          <DocumentsTab
            emailTemplates={emailTemplates}
            preSubmitDocs={preSubmitDocs}
            onDeleteDoc={deleteDoc}
            emailAssignees={emailAssignees}
            onEmailAssigneeChange={handleEmailAssigneeChange}
            docsAssignee={docsAssignee}
            onDocsAssigneeChange={setDocsAssignee}
          />
        )}
        {activeTab === 2 && (
          <EvaluationTab
            evaluations={evaluations}
            onEvaluationsChange={setEvaluations}
          />
        )}
        {activeTab === 3 && (
          <TranscriptionTab
            transcriptions={transcriptions}
          />
        )}
      </Box>
    </Box>
  );
}
