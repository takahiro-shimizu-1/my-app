export type EvaluationStatus = "all_met" | "other_only_unmet" | "unmet";

export type WorkStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "cancelled";

export type CurrentStep =
  | "judgment"
  | "document_review"
  | "field_survey"
  | "final_review";

export const VALID_WORK_STATUSES: ReadonlySet<string> = new Set([
  "not_started",
  "in_progress",
  "completed",
  "on_hold",
  "cancelled",
]);

export const VALID_CURRENT_STEPS: ReadonlySet<string> = new Set([
  "judgment",
  "document_review",
  "field_survey",
  "final_review",
]);

/** Company priority ranking (1 = highest, 5 = lowest). */
export type CompanyPriority = 1 | 2 | 3 | 4 | 5;

// -- Concrete response types --

export interface EvaluationListItem {
  id: string;
  evaluationNo: string;
  announcement: {
    title: string;
    organization: string;
    category: string;
    bidType: string;
    deadline: string;
    workLocation: string;
    estimatedAmountMin: number | null;
    estimatedAmountMax: number | null;
  };
  company: { name: string };
  branch: {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    fax: string;
    postalCode: string;
  };
  finalStatus: boolean;
  requirementIneligibility: boolean;
  requirementGradeItem: boolean;
  requirementLocation: boolean;
  requirementExperience: boolean;
  requirementTechnician: boolean;
  requirementOther: boolean;
  workStatus: WorkStatus | null;
  currentStep: CurrentStep | null;
  evaluatedAt: string | null;
}

export interface StatusCounts {
  all_met: number;
  other_only_unmet: number;
  unmet: number;
}

export interface AssigneeRecord {
  stepId: string;
  staffId: string;
  assignedAt: string;
}
