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

/** Branch (office) within a partner company. */
export interface PartnerBranch {
  name: string;
  address: string;
}

/** Unified qualification row. */
export interface UnifiedQualification {
  mainCategory: string;
  category: string;
  region: string;
  value: number;
  grade: string;
}

/** Item within an orderer-specific qualification. */
export interface OrdererQualificationItem {
  category: string;
  region: string;
  value: number;
  grade: string;
}

/** Orderer-specific qualification group. */
export interface OrdererQualification {
  ordererName: string;
  items: OrdererQualificationItem[];
}

/** Partner qualifications data. */
export interface PartnerQualifications {
  unified: UnifiedQualification[];
  orderers: OrdererQualification[];
}

/** Full partner detail returned by the API. */
export interface PartnerDetail {
  id: string;
  no: number;
  name: string;
  address: string;
  postalCode: string;
  phone: string;
  fax: string;
  email: string;
  url?: string;
  representative: string;
  established: number;
  capital: number | null;
  employeeCount: number | null;
  rating: number | null;
  surveyCount: number | null;
  resultCount: number | null;
  branches: PartnerBranch[];
  categories: string[];
  pastProjects: PastProject[];
  qualifications: PartnerQualifications;
}
