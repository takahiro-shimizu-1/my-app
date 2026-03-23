import { EvaluationRepository } from "../repositories/evaluationRepository";
import { DocumentService } from "./documentService";
import type { FilterParams, PaginatedResponse, EvaluationListItem } from "../../../../shared/types";
import type { EvaluationStatus, WorkStatus, CurrentStep } from "../../../../shared/types";
import { VALID_WORK_STATUSES, VALID_CURRENT_STEPS } from "../../../../shared/types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "../../../../shared/constants";

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

export function validateWorkStatus(value: string): void {
  if (!VALID_WORK_STATUSES.has(value)) {
    throw new Error(
      `Invalid workStatus: "${value}". Must be one of: ${[...VALID_WORK_STATUSES].join(", ")}`
    );
  }
}

export function validateCurrentStep(value: string): void {
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
  ): Promise<PaginatedResponse<EvaluationListItem>> {
    const page = filters.page ?? DEFAULT_PAGE;
    const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE;

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
    const rows = await this.repository.getStatusCountsRaw(filters);
    const counts = { all_met: 0, other_only_unmet: 0, unmet: 0 };
    for (const row of rows) {
      const status = determineEvaluationStatus(row);
      counts[status]++;
    }
    return counts;
  }

  /**
   * Get assignees for an evaluation.
   */
  async getAssignees(evaluationNo: string): Promise<any[]> {
    return this.repository.findAssignees(evaluationNo);
  }

  /**
   * Update assignee for an evaluation.
   */
  async updateAssignee(
    evaluationNo: string,
    body: { stepId: string; staffId: string }
  ): Promise<any | null> {
    return this.repository.updateAssignee(evaluationNo, body);
  }
}
