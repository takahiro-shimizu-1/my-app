import { EvaluationRepository } from "../repositories/evaluationRepository";
import { DocumentService } from "./documentService";
import { FilterParams } from "../types";

// -- Status determination types --

type EvaluationStatus = "all_met" | "other_only_unmet" | "unmet";

type WorkStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "on_hold"
  | "cancelled";

type CurrentStep =
  | "judgment"
  | "document_review"
  | "field_survey"
  | "final_review";

// -- Raw row shape from repository (the boolean flags come from SQL) --

interface RawEvaluationRow {
  final_status?: boolean;
  requirement_ineligibility?: boolean;
  requirement_grade_item?: boolean;
  requirement_location?: boolean;
  requirement_experience?: boolean;
  requirement_technician?: boolean;
  requirement_other?: boolean;
  workStatus?: string;
  currentStep?: string;
  priority?: number;
  [key: string]: any;
}

// -- Pure business-logic functions (stateless, testable) --

/**
 * Determine evaluation status from the raw requirement flags.
 * Mirrors the SQL CASE expression that was previously in the repository layer.
 */
export function determineEvaluationStatus(
  row: RawEvaluationRow
): EvaluationStatus {
  if (row.final_status) return "all_met";

  if (
    row.requirement_ineligibility &&
    row.requirement_grade_item &&
    row.requirement_location &&
    row.requirement_experience &&
    row.requirement_technician &&
    !row.requirement_other
  ) {
    return "other_only_unmet";
  }

  return "unmet";
}

/**
 * Apply default for workStatus when the DB value is null/empty.
 */
export function defaultWorkStatus(raw: string | null | undefined): WorkStatus {
  return (raw as WorkStatus) || "not_started";
}

/**
 * Apply default for currentStep when the DB value is null/empty.
 */
export function defaultCurrentStep(
  raw: string | null | undefined
): CurrentStep {
  return (raw as CurrentStep) || "judgment";
}

/**
 * Apply default for priority when the DB value is null/undefined.
 */
export function defaultPriority(raw: number | null | undefined): number {
  return raw ?? 1;
}

// -- Validation --

const VALID_WORK_STATUSES: ReadonlySet<string> = new Set([
  "not_started",
  "in_progress",
  "completed",
  "on_hold",
  "cancelled",
]);

const VALID_CURRENT_STEPS: ReadonlySet<string> = new Set([
  "judgment",
  "document_review",
  "field_survey",
  "final_review",
]);

function validateWorkStatus(value: string): void {
  if (!VALID_WORK_STATUSES.has(value)) {
    throw new Error(
      `Invalid workStatus: "${value}". Must be one of: ${[...VALID_WORK_STATUSES].join(", ")}`
    );
  }
}

function validateCurrentStep(value: string): void {
  if (!VALID_CURRENT_STEPS.has(value)) {
    throw new Error(
      `Invalid currentStep: "${value}". Must be one of: ${[...VALID_CURRENT_STEPS].join(", ")}`
    );
  }
}

// -- Service class --

export class EvaluationService {
  private repository: EvaluationRepository;
  private documentService: DocumentService;

  constructor(
    repository?: EvaluationRepository,
    documentService?: DocumentService
  ) {
    this.repository = repository ?? new EvaluationRepository();
    this.documentService = documentService ?? new DocumentService();
  }

  /**
   * Get paginated evaluations list.
   * Flow: repository (raw SQL data) -> apply defaults -> return
   *
   * Note: status/workStatus/currentStep/priority defaults are currently
   * computed in SQL via CASE/COALESCE expressions in the repository.
   * The service layer validates pagination and delegates to the repository.
   * Document enrichment only applies to detail views (getById), not lists.
   */
  async getList(
    filters: FilterParams
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
    const page = filters.page ?? 0;
    const pageSize = filters.pageSize ?? 25;

    const result = await this.repository.findWithFilters({
      ...filters,
      page,
      pageSize,
    });

    return {
      data: result.data,
      total: result.total,
      page,
      pageSize,
    };
  }

  /**
   * Get a single evaluation by ID.
   * Flow: repository (raw data with documents) -> enrich documents via GCS -> return
   */
  async getById(id: string): Promise<any | null> {
    const evaluation = await this.repository.findById(id);
    if (!evaluation) return null;

    // Enrich documents with GCS content
    if (
      evaluation?.announcement?.documents &&
      Array.isArray(evaluation.announcement.documents)
    ) {
      evaluation.announcement.documents =
        await this.documentService.attachDocumentContents(
          evaluation.announcement.documents
        );
    }

    return evaluation;
  }

  /**
   * Update workStatus (and optionally currentStep) for an evaluation.
   * Validates input values before passing to repository.
   */
  async updateWorkStatus(
    evaluationNo: string,
    workStatus: string,
    currentStep?: string
  ): Promise<any | null> {
    validateWorkStatus(workStatus);
    if (currentStep !== undefined) {
      validateCurrentStep(currentStep);
    }

    return this.repository.updateWorkStatus(
      evaluationNo,
      workStatus,
      currentStep
    );
  }

  /**
   * Get statistics for the analytics dashboard.
   * Pure delegation to repository -- aggregation is done in SQL.
   */
  async getStats(): Promise<any> {
    return this.repository.getStats();
  }

  /**
   * Get status counts with current filters applied.
   * Pure delegation to repository -- aggregation is done in SQL.
   */
  async getStatusCounts(
    filters: FilterParams
  ): Promise<{ all_met: number; other_only_unmet: number; unmet: number }> {
    return this.repository.getStatusCounts(filters);
  }

  /**
   * Get assignees for an evaluation.
   * Delegates to repository if the method exists.
   */
  async getAssignees(evaluationNo: string): Promise<any[]> {
    if (typeof (this.repository as any).findAssignees === "function") {
      return (this.repository as any).findAssignees(evaluationNo);
    }
    return [];
  }

  /**
   * Update assignee for an evaluation.
   * Delegates to repository if the method exists.
   */
  async updateAssignee(
    evaluationNo: string,
    body: any
  ): Promise<any | null> {
    if (typeof (this.repository as any).updateAssignee === "function") {
      return (this.repository as any).updateAssignee(evaluationNo, body);
    }
    return null;
  }
}
