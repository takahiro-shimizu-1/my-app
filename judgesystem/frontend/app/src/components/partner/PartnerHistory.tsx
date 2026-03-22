import { Box, Typography } from '@mui/material';
import { bidTypeConfig } from '../../data';
import { colors, fontSizes, borderRadius } from '../../constants/styles';
import { workStatusConfig } from '../../constants/workStatus';
import { evaluationStatusConfig } from '../../constants/status';
import { priorityLabels, priorityColors } from '../../constants/priority';
import { CustomPagination } from '../bid';
import type { PastProject } from '../../types/partner';
import type { CompanyPriority } from '../../types';

function getDeadlineColor(deadline: string): { textColor: string } {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);

  const diffTime = deadlineDate.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (days < 0) return { textColor: colors.text.muted };
  if (days === 0) return { textColor: colors.status.error.main };
  if (days <= 3) return { textColor: colors.status.error.main };
  if (days <= 7) return { textColor: colors.status.warning.main };
  if (days <= 14) return { textColor: colors.accent.yellowDark };
  return { textColor: colors.status.success.main };
}

interface PartnerHistoryProps {
  projects: PastProject[];
  page: number;
  pageSize: number;
  filteredCount: number;
  onPageChange: (page: number) => void;
  onNavigate: (path: string) => void;
}

export function PartnerHistory({
  projects,
  page,
  pageSize,
  filteredCount,
  onPageChange,
  onNavigate,
}: PartnerHistoryProps) {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* スクロール可能なカードグリッド */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
        {projects.length > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 1.5 }}>
            {projects.map((project) => {
              const wsConfig = workStatusConfig[project.workStatus];
              const evalConfig = evaluationStatusConfig[project.evaluationStatus];
              const priorityValue = project.priority as CompanyPriority | null;
              const priorityColor = priorityValue
                ? priorityColors[priorityValue]
                : { color: colors.text.light, bgColor: colors.background.alt, borderColor: colors.border.main, gradient: colors.text.light };
              const priorityLabel = priorityValue
                ? priorityLabels[priorityValue]
                : '優先度: 未設定';
              const bidType = project.bidType ? bidTypeConfig[project.bidType] : null;
              const deadlineColor = getDeadlineColor(project.deadline);
              return (
                <Box
                  key={project.announcementId}
                  onClick={() => onNavigate(`/detail/${project.evaluationId}`)}
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    p: 2,
                    backgroundColor: colors.text.white,
                    border: `1px solid ${colors.border.main}`,
                    borderRadius: borderRadius.xs,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': { borderColor: 'rgba(59, 130, 246, 0.4)', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' },
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '3px',
                      backgroundColor: wsConfig.color,
                      borderRadius: `${borderRadius.xs} 0 0 ${borderRadius.xs}`,
                    },
                  }}
                >
                  {/* 1行目: No. + 着手ステータス + 参加可否 + 優先度 + 入札形式 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.light }}>
                      No. {String(project.announcementNo).padStart(8, '0')}
                    </Typography>
                    <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: wsConfig.color }}>
                      {wsConfig.label}
                    </Typography>
                    <Box sx={{ width: '1px', height: '12px', backgroundColor: colors.border.main }} />
                    <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: evalConfig.color }}>
                      {evalConfig.label}
                    </Typography>
                    <Box sx={{ width: '1px', height: '12px', backgroundColor: colors.border.main }} />
                    <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: priorityColor.color }}>
                      {priorityLabel}
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
                  {/* 2行目: タイトル */}
                  <Typography sx={{ fontWeight: 600, fontSize: fontSizes.md, color: colors.text.secondary, lineHeight: 1.5, mb: 1, flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {project.announcementTitle}
                  </Typography>
                  {/* 3行目: 支店名 */}
                  <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted, mb: 0.75 }}>
                    {project.branchName}
                  </Typography>
                  {/* 4行目: 発注機関・都道府県・種別 */}
                  <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.light, mb: 0.75 }}>
                    {project.organization}{project.prefecture && `・${project.prefecture}`}・{project.category}
                  </Typography>
                  {/* 5行目: 判定日・締切日 */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>
                      判定日 {project.evaluatedAt}
                    </Typography>
                    <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>/</Typography>
                    <Typography sx={{ fontSize: fontSizes.xs, color: deadlineColor.textColor, fontWeight: 500 }}>
                      締切日 {project.deadline}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', color: colors.text.light }}>該当する対応案件がありません</Box>
        )}
      </Box>
      {/* フッター（ページネーション） */}
      <Box sx={{ backgroundColor: colors.text.white, borderTop: `1px solid ${colors.border.main}`, px: 2 }}>
        <CustomPagination
          page={page}
          pageSize={pageSize}
          rowCount={filteredCount}
          onPageChange={onPageChange}
          onPageSizeChange={() => {}}
        />
      </Box>
    </Box>
  );
}
