/**
 * JudgeSystem Domain Types
 *
 * Shared type definitions across all layers.
 * No external dependencies - pure TypeScript types.
 */

// ============================================================
// Requirement Types
// ============================================================

export const REQUIREMENT_TYPES = [
  "ineligibility",
  "experience",
  "location",
  "grade_item",
  "technician",
] as const;

export type RequirementType = (typeof REQUIREMENT_TYPES)[number];

export const REQUIREMENT_TYPE_LABELS: Record<RequirementType, string> = {
  ineligibility: "欠格要件",
  experience: "実績要件",
  location: "所在地要件",
  grade_item: "等級・種別要件",
  technician: "技術者要件",
};

// ============================================================
// Evaluation Status
// ============================================================

export type EvaluationStatus = "all_met" | "partially_met" | "unmet" | "pending";

export type WorkStatus = "not_started" | "in_progress" | "completed";

export type Priority = "A" | "B" | "C" | "D" | "E";

// ============================================================
// Bid Categories
// ============================================================

export type BidType =
  | "一般競争入札"
  | "指名競争入札"
  | "随意契約"
  | "公募型プロポーザル";

export type Category = "工事" | "コンサル" | "物品" | "役務";

// ============================================================
// Core Entities
// ============================================================

export interface Announcement {
  announcementNo: string;
  workName: string;
  topAgencyName: string;
  category: Category | string;
  bidType: BidType | string;
  workPlace: string;
  bidEndDate: string;
  estimatedAmountMin?: number;
  estimatedAmountMax?: number;
}

export interface Company {
  companyNo: string;
  companyName: string;
  article70Flag: boolean;
  article71Flag: boolean;
  bankruptcyFlag: boolean;
  corporateReorganizationFlag: boolean;
  corporateReorganizationStartDate: string | null;
  postReorganizationReacquisitionDate: string | null;
  antiSocialForcesFlag: boolean;
  adultWardFlag: boolean;
  foreignLegalRestrictionFlag: boolean;
  subversiveOrganizationFlag: boolean;
  noSocialInsuranceArrearsFlag: boolean;
  informationSecurityFrameworkFlag: boolean;
  bojTransactionSuspensionFlag: boolean;
  priority: Priority;
}

export interface Office {
  officeNo: string;
  companyNo: string;
  officeName: string;
  officeAddress: string;
  officePrefecture: string;
  officeType: string;
  officeTelephone?: string;
  officeEmail?: string;
  officeFax?: string;
  officePostalCode?: string;
  isSuspended: boolean;
}

export interface Employee {
  employeeNo: string;
  companyNo: string;
  officeNo: string;
  employeeName: string;
}

export interface EmployeeQualification {
  employeeNo: string;
  qualificationCode: string;
  qualificationName: string;
  acquiredDate?: string;
}

export interface Requirement {
  announcementNo: string;
  requirementNo: string;
  requirementType: RequirementType;
  requirementText: string;
  isOcrFailed: boolean;
}

export interface Document {
  announcementId: string;
  documentId: string;
  type: string;
  title: string;
  fileFormat: string;
  pageCount: number;
  url: string;
  markdownPath?: string;
  ocrJsonPath?: string;
  savePath?: string;
}

// ============================================================
// Judgment Results
// ============================================================

export interface JudgmentResult {
  isOk: boolean;
  reason: string;
  requirementType: RequirementType;
  details?: Record<string, unknown>;
}

export interface EvaluationResult {
  evaluationNo: string;
  announcementNo: string;
  companyNo: string;
  officeNo: string;
  requirementIneligibility: boolean;
  requirementExperience: boolean;
  requirementLocation: boolean;
  requirementGradeItem: boolean;
  requirementTechnician: boolean;
  finalStatus: boolean;
  deficitRequirementMessage: string;
  sufficientRequirements: SufficientRequirement[];
  insufficientRequirements: InsufficientRequirement[];
}

export interface SufficientRequirement {
  evaluationNo: string;
  announcementNo: string;
  companyNo: string;
  officeNo: string;
  requirementNo: string;
  requirementType: RequirementType;
}

export interface InsufficientRequirement {
  evaluationNo: string;
  announcementNo: string;
  companyNo: string;
  officeNo: string;
  requirementNo: string;
  requirementType: RequirementType;
  suggestionsForImprovement: string;
  finalComment: string;
}

// ============================================================
// Work Achievement & Qualification Data
// ============================================================

export interface WorkAchievement {
  officeNo: string;
  companyNo: string;
  workName: string;
  agencyName: string;
  constructionType: string;
  contractorLayer: string;
  jvRatio?: number;
  constructionScore?: number;
  fiscalYear: number;
}

export interface TechnicianQualification {
  qualificationCode: string;
  qualificationName: string;
  category: string;
}

export interface OfficeRegistrationAuthorization {
  officeNo: string;
  isSuspended: boolean;
  suspensionStartDate?: string;
  suspensionEndDate?: string;
}

// ============================================================
// API Types
// ============================================================

export interface FilterParams {
  page?: number;
  pageSize?: number;
  statuses?: EvaluationStatus[];
  workStatuses?: WorkStatus[];
  priorities?: Priority[];
  categories?: string[];
  bidTypes?: string[];
  organizations?: string[];
  prefectures?: string[];
  searchQuery?: string;
  sortField?: string;
  sortOrder?: "asc" | "desc";
  ordererId?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================
// Pipeline Types
// ============================================================

export type PipelineStep = "document_preparation" | "transfer" | "ocr" | "judgment";

export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface PipelineJob {
  jobId: string;
  step: PipelineStep;
  status: JobStatus;
  announcementNo?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  progress?: number;
}
