/**
 * Repository Interfaces
 *
 * Abstract data access layer. Implementations can target
 * PostgreSQL, SQLite, BigQuery, or in-memory stores.
 */

import type {
  Announcement,
  Requirement,
  EvaluationTarget,
  EvaluationSummary,
  SufficientRequirement,
  InsufficientRequirement,
  MasterData,
} from "@/lib/judgesystem/domain/types";

export interface AnnouncementRepository {
  findAll(): Promise<Announcement[]>;
  findById(announcementNo: string): Promise<Announcement | null>;
}

export interface RequirementRepository {
  findByAnnouncement(announcementNo: string): Promise<Requirement[]>;
  findByAnnouncements(announcementNos: string[]): Promise<Requirement[]>;
}

export interface EvaluationTargetRepository {
  findPending(): Promise<EvaluationTarget[]>;
}

export interface EvaluationResultRepository {
  saveSummaries(summaries: EvaluationSummary[]): Promise<void>;
  saveSufficientRequirements(items: SufficientRequirement[]): Promise<void>;
  saveInsufficientRequirements(items: InsufficientRequirement[]): Promise<void>;
}

export interface MasterDataRepository {
  loadAll(): Promise<MasterData>;
}

/** Aggregates all repositories — used for dependency injection */
export interface RepositorySet {
  readonly announcements: AnnouncementRepository;
  readonly requirements: RequirementRepository;
  readonly evaluationTargets: EvaluationTargetRepository;
  readonly evaluationResults: EvaluationResultRepository;
  readonly masterData: MasterDataRepository;
}
