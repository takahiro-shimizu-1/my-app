import { Box, Typography } from '@mui/material';
import { colors, fontSizes, borderRadius } from '../../constants/styles';
import { workStatusConfig } from '../../constants/workStatus';
import { evaluationStatusConfig } from '../../constants/status';
import { priorityLabels, priorityColors } from '../../constants/priority';
import { CustomPagination } from '../bid';
import type { EvaluationStatus, WorkStatus, CompanyPriority } from '../../types';

export type ProgressingCompany = {
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
  priority: CompanyPriority;
  workStatus: Extract<WorkStatus, 'in_progress' | 'completed'>;
  evaluationId: string;
  evaluationStatus: EvaluationStatus;
};

interface CompetingCompaniesSectionProps {
  companies: ProgressingCompany[];
  isLoading: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  filteredCount: number;
  onPageChange: (page: number) => void;
  onNavigate: (path: string) => void;
}

export function CompetingCompaniesSection({
  companies,
  isLoading,
  totalCount,
  page,
  pageSize,
  filteredCount,
  onPageChange,
  onNavigate,
}: CompetingCompaniesSectionProps) {
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* スクロール可能なカードグリッド */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
        {isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center', color: colors.text.light }}>
            データを読み込み中です...
          </Box>
        ) : companies.length > 0 ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 1.5 }}>
            {companies.map((company) => {
              const wsConfig = workStatusConfig[company.workStatus];
              const pConfig = priorityColors[company.priority];
              const esConfig = evaluationStatusConfig[company.evaluationStatus];
              return (
                <Box
                  key={`${company.companyId}-${company.branchId}`}
                  onClick={() => onNavigate(`/detail/${company.evaluationId}`)}
                  sx={{
                    position: 'relative',
                    backgroundColor: colors.text.white,
                    borderRadius: borderRadius.xs,
                    border: `1px solid ${colors.border.main}`,
                    p: 2,
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: wsConfig.color }}>{wsConfig.label}</Typography>
                    <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: esConfig.color }}>{esConfig.label}</Typography>
                    <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: pConfig.color, ml: 'auto' }}>{priorityLabels[company.priority]}</Typography>
                  </Box>
                  <Typography sx={{ fontWeight: 600, fontSize: fontSizes.md, color: colors.text.secondary, mb: 0.5, lineHeight: 1.5 }}>{company.companyName}</Typography>
                  <Typography sx={{ fontSize: fontSizes.xs, color: colors.text.muted }}>{company.branchName}</Typography>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Box sx={{ p: 4, textAlign: 'center', color: colors.text.light }}>
            {totalCount > 0 ? '条件に一致する企業がありません' : '着手企業がありません'}
          </Box>
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
