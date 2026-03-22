/**
 * Repository Interfaces
 *
 * Abstract data access following the Repository pattern.
 * Concrete implementations live alongside their database adapter.
 */

import type {
  Announcement,
  Company,
  Office,
  Requirement,
  EvaluationResult,
  FilterParams,
  PaginatedResponse,
  WorkStatus,
} from "@/lib/domain/types";

export interface AnnouncementRepository {
  findByNo(announcementNo: string): Promise<Announcement | null>;
  findAll(params?: FilterParams): Promise<PaginatedResponse<Announcement>>;
  findRequirements(announcementNo: string): Promise<Requirement[]>;
}

export interface CompanyRepository {
  findByNo(companyNo: string): Promise<Company | null>;
  findAll(params?: FilterParams): Promise<PaginatedResponse<Company>>;
}

export interface OfficeRepository {
  findByNo(officeNo: string): Promise<Office | null>;
  findByCompany(companyNo: string): Promise<Office[]>;
}

export interface EvaluationRepository {
  findById(evaluationNo: string): Promise<EvaluationResult | null>;
  findWithFilters(params: FilterParams): Promise<PaginatedResponse<EvaluationResult>>;
  save(result: EvaluationResult): Promise<void>;
  saveBatch(results: EvaluationResult[]): Promise<void>;
  updateWorkStatus(
    evaluationNo: string,
    workStatus: WorkStatus,
    currentStep?: string
  ): Promise<void>;
  getStatusCounts(
    params: FilterParams
  ): Promise<{ allMet: number; otherOnlyUnmet: number; unmet: number }>;
}
