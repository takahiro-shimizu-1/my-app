/**
 * In-Memory Repository Implementation
 *
 * Used for testing and development without external database dependencies.
 * Data is stored in plain arrays and lookups use linear scans.
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
import type {
  AnnouncementRepository,
  RequirementRepository,
  EvaluationTargetRepository,
  EvaluationResultRepository,
  MasterDataRepository,
  RepositorySet,
} from "./types";

export class InMemoryAnnouncementRepository implements AnnouncementRepository {
  constructor(private data: Announcement[] = []) {}

  async findAll(): Promise<Announcement[]> {
    return [...this.data];
  }

  async findById(announcementNo: string): Promise<Announcement | null> {
    return this.data.find((a) => a.announcementNo === announcementNo) ?? null;
  }

  load(announcements: Announcement[]): void {
    this.data = [...announcements];
  }
}

export class InMemoryRequirementRepository implements RequirementRepository {
  constructor(private data: Requirement[] = []) {}

  async findByAnnouncement(announcementNo: string): Promise<Requirement[]> {
    return this.data.filter((r) => r.announcementNo === announcementNo);
  }

  async findByAnnouncements(announcementNos: string[]): Promise<Requirement[]> {
    const set = new Set(announcementNos);
    return this.data.filter((r) => set.has(r.announcementNo));
  }

  load(requirements: Requirement[]): void {
    this.data = [...requirements];
  }
}

export class InMemoryEvaluationTargetRepository
  implements EvaluationTargetRepository
{
  constructor(private data: EvaluationTarget[] = []) {}

  async findPending(): Promise<EvaluationTarget[]> {
    return [...this.data];
  }

  load(targets: EvaluationTarget[]): void {
    this.data = [...targets];
  }
}

export class InMemoryEvaluationResultRepository
  implements EvaluationResultRepository
{
  readonly summaries: EvaluationSummary[] = [];
  readonly sufficientRequirements: SufficientRequirement[] = [];
  readonly insufficientRequirements: InsufficientRequirement[] = [];

  async saveSummaries(summaries: EvaluationSummary[]): Promise<void> {
    this.summaries.push(...summaries);
  }

  async saveSufficientRequirements(
    items: SufficientRequirement[]
  ): Promise<void> {
    this.sufficientRequirements.push(...items);
  }

  async saveInsufficientRequirements(
    items: InsufficientRequirement[]
  ): Promise<void> {
    this.insufficientRequirements.push(...items);
  }
}

export class InMemoryMasterDataRepository implements MasterDataRepository {
  constructor(
    private data: MasterData = {
      companies: [],
      offices: [],
      agencies: [],
      constructions: [],
      officeWorkAchievements: [],
      employees: [],
      employeeQualifications: [],
      employeeExperiences: [],
      officeRegistrationAuthorizations: [],
    }
  ) {}

  async loadAll(): Promise<MasterData> {
    return this.data;
  }

  load(masterData: MasterData): void {
    this.data = masterData;
  }
}

/** Creates a full in-memory repository set for testing */
export function createInMemoryRepositorySet(): RepositorySet & {
  announcements: InMemoryAnnouncementRepository;
  requirements: InMemoryRequirementRepository;
  evaluationTargets: InMemoryEvaluationTargetRepository;
  evaluationResults: InMemoryEvaluationResultRepository;
  masterData: InMemoryMasterDataRepository;
} {
  return {
    announcements: new InMemoryAnnouncementRepository(),
    requirements: new InMemoryRequirementRepository(),
    evaluationTargets: new InMemoryEvaluationTargetRepository(),
    evaluationResults: new InMemoryEvaluationResultRepository(),
    masterData: new InMemoryMasterDataRepository(),
  };
}
