/**
 * Partner-specific type definitions.
 *
 * Used by PartnerDetailPage and usePartnerDetail hook
 * to represent a company's past project participation.
 */

import type { EvaluationStatus, WorkStatus, CompanyPriority } from './index';

/** A past project record for a partner company. */
export interface PastProject {
  announcementId: string;
  announcementTitle: string;
  category: string;
  prefecture: string;
  branchName: string;
  workStatus: WorkStatus;
  evaluationStatus: EvaluationStatus;
  priority: CompanyPriority | null;
  bidType?: string;
  organization: string;
  deadline: string;
  evaluatedAt: string;
}
