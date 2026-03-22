/**
 * Evaluation Service
 *
 * Manages evaluation lifecycle: querying, status updates, analytics.
 */

import type {
  FilterParams,
  PaginatedResponse,
  EvaluationResult,
  WorkStatus,
} from "@/lib/domain/types";
import type { EvaluationRepository } from "@/lib/infrastructure/database/repository";

const VALID_WORK_STATUSES: WorkStatus[] = ["not_started", "in_progress", "completed"];

export class EvaluationService {
  constructor(private repository: EvaluationRepository) {}

  async getList(filters: FilterParams): Promise<PaginatedResponse<EvaluationResult>> {
    return this.repository.findWithFilters(filters);
  }

  async getById(evaluationNo: string): Promise<EvaluationResult | null> {
    return this.repository.findById(evaluationNo);
  }

  async updateWorkStatus(
    evaluationNo: string,
    workStatus: string,
    currentStep?: string
  ): Promise<void> {
    if (!VALID_WORK_STATUSES.includes(workStatus as WorkStatus)) {
      throw new Error(
        `Invalid workStatus: ${workStatus}. Valid values: ${VALID_WORK_STATUSES.join(", ")}`
      );
    }
    await this.repository.updateWorkStatus(
      evaluationNo,
      workStatus as WorkStatus,
      currentStep
    );
  }

  async getStatusCounts(
    filters: FilterParams
  ): Promise<{ allMet: number; otherOnlyUnmet: number; unmet: number }> {
    return this.repository.getStatusCounts(filters);
  }
}
