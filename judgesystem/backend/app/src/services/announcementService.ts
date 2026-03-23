import { AnnouncementRepository } from "../repositories/announcementRepository";
import { DocumentService } from "./documentService";
import type { FilterParams, PaginatedResponse, AnnouncementListItem, AnnouncementStatus, Department, DocumentMeta } from "../../../../shared/types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "../../../../shared/constants";

// -- Service-layer response types --

/** Full announcement detail returned by getByNo. */
export interface AnnouncementDetail {
  id: string;
  no: number;
  announcementNo: number;
  ordererId: string;
  title: string;
  organization: string;
  category: string;
  bidType: string;
  workLocation: string;
  department: Department;
  publishDate: string;
  explanationStartDate: string;
  explanationEndDate: string;
  applicationStartDate: string;
  applicationEndDate: string;
  bidStartDate: string;
  bidEndDate: string;
  deadline: string;
  estimatedAmountMin: number | null;
  estimatedAmountMax: number | null;
  actualAmount: number | null;
  winningCompanyId: string | null;
  winningCompanyName: string | null;
  documents: DocumentMeta[];
  competingCompanies: CompetingCompany[];
}

/** Competing company entry within an announcement detail. */
interface CompetingCompany {
  name: string;
  isWinner: boolean;
  bidAmounts: number[];
}

/** Row returned by the progressing-companies query. */
export interface ProgressingCompanyRow {
  evaluationId: string;
  announcementNo: string;
  companyId: string;
  companyName: string;
  branchId: string;
  branchName: string;
  branchAddress: string;
  companyAddress: string;
  finalStatus: boolean;
  requirementIneligibility: boolean;
  requirementGradeItem: boolean;
  requirementLocation: boolean;
  requirementExperience: boolean;
  requirementTechnician: boolean;
  requirementOther: boolean;
  workStatus: string | null;
  updatedAt: string | null;
}

/** Similar case entry returned by getSimilarCases. */
export interface SimilarCaseRow {
  id: string;
  announcementId: string;
  similarAnnouncementId: string;
  caseName: string;
  winningCompany: string;
  winningAmount: number | null;
  competitors: string[];
}

/** Related announcement returned by getRelated. */
export interface RelatedAnnouncementRow {
  id: string;
  no: number;
  announcementNo: number;
  title: string;
  organization: string;
  category: string;
  bidType: string;
  workLocation: string;
  publishDate: string;
  deadline: string;
}

/** Announcement with a status field (used by filter/sort helpers). */
interface AnnouncementWithStatus {
  status: AnnouncementStatus;
  [key: string]: unknown;
}

/**
 * Determine announcement status from the bid end date.
 * This is the single source of truth -- mirrors the SQL CASE that was
 * previously duplicated in both findWithFilters and findByNo queries.
 *
 * Rules:
 *  - No valid date           -> 'closed'
 *  - End date >= now + 14d   -> 'upcoming'  (公告中)
 *  - End date >= now         -> 'ongoing'   (締切間近)
 *  - End date < now          -> 'awaiting_result' (結果待)
 */
export function determineAnnouncementStatus(
  bidEndDate: string | null | undefined
): AnnouncementStatus {
  if (!bidEndDate || !/^\d{4}-\d{2}-\d{2}/.test(bidEndDate)) {
    return "closed";
  }

  const end = new Date(bidEndDate);
  // Guard against invalid Date
  if (isNaN(end.getTime())) return "closed";

  const now = new Date();
  // Reset to start of day for consistent comparison
  now.setHours(0, 0, 0, 0);

  const in14days = new Date(now);
  in14days.setDate(now.getDate() + 14);

  if (end >= in14days) return "upcoming";
  if (end >= now) return "ongoing";
  return "awaiting_result";
}

/**
 * Normalize bidType: treat NULL, undefined, or empty string as 'unknown'.
 */
export function normalizeBidType(
  bidType: string | null | undefined
): string {
  if (!bidType || bidType.trim() === "") return "unknown";
  return bidType;
}

// -- Sorting helpers --

const STATUS_SORT_ORDER: Record<AnnouncementStatus, number> = {
  upcoming: 1,
  ongoing: 2,
  awaiting_result: 3,
  closed: 4,
};

/**
 * Compare function for status-based sorting.
 */
function compareByStatus(
  a: { status: AnnouncementStatus },
  b: { status: AnnouncementStatus },
  direction: "asc" | "desc"
): number {
  const diff =
    (STATUS_SORT_ORDER[a.status] ?? 99) -
    (STATUS_SORT_ORDER[b.status] ?? 99);
  return direction === "desc" ? -diff : diff;
}

// -- Service class --

export class AnnouncementService {
  private repository: AnnouncementRepository;
  private documentService: DocumentService;

  constructor(
    repository?: AnnouncementRepository,
    documentService?: DocumentService
  ) {
    this.repository = repository ?? new AnnouncementRepository();
    this.documentService = documentService ?? new DocumentService();
  }

  /**
   * Get paginated announcements list.
   * Flow: repository (raw SQL data) -> return
   *
   * Note: status computation and bidType normalization are currently
   * performed in SQL (CASE expression and COALESCE). Status filtering
   * is also handled by the repository's WHERE clause for efficiency.
   * The service layer handles pagination defaults and delegates to repository.
   */
  async getList(
    filters: FilterParams
  ): Promise<PaginatedResponse<AnnouncementListItem>> {
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
   * Get a single announcement by announcement_no.
   * Flow: repository (raw data with documents) -> enrich documents via GCS -> return
   */
  async getByNo(announcementNo: number): Promise<AnnouncementDetail | null> {
    const row = await this.repository.findByNo(announcementNo);
    if (!row) return null;

    const announcement = row as unknown as AnnouncementDetail;

    // Enrich documents with GCS markdown content
    if (announcement.documents && Array.isArray(announcement.documents)) {
      announcement.documents =
        await this.documentService.attachDocumentContents(
          announcement.documents
        );
    }

    return announcement;
  }

  /**
   * Get companies progressing on a given announcement
   * (those with workStatus in_progress or completed).
   */
  async getProgressingCompanies(announcementNo: number): Promise<ProgressingCompanyRow[]> {
    const rows = await this.repository.findProgressingCompanies(announcementNo);
    return rows as unknown as ProgressingCompanyRow[];
  }

  /**
   * Get similar cases for an announcement.
   */
  async getSimilarCases(announcementNo: number): Promise<SimilarCaseRow[]> {
    const rows = await this.repository.findSimilarCases(announcementNo);
    return rows as unknown as SimilarCaseRow[];
  }

  /**
   * Get a document file for preview/download.
   * Fetches metadata from repository (DB), then downloads via documentService (GCS).
   */
  async getDocumentPreview(
    announcementNo: number,
    documentId: string
  ): Promise<{ data: Buffer; fileFormat: string; title: string } | null> {
    const row = await this.repository.findDocumentMeta(announcementNo, documentId);
    if (!row) return null;

    const gcsPath = row.save_path as string | undefined;
    if (!gcsPath || !gcsPath.startsWith("gs://")) return null;

    const data = await this.documentService.downloadDocument(gcsPath);
    return {
      data,
      fileFormat: (row.fileFormat as string) || "pdf",
      title: (row.title as string) || `document-${documentId}`,
    };
  }

  /**
   * Get related announcements sharing category/organization/location.
   */
  async getRelated(announcementNo: number): Promise<RelatedAnnouncementRow[]> {
    const rows = await this.repository.findRelated(announcementNo);
    return rows as unknown as RelatedAnnouncementRow[];
  }

  /**
   * Filter announcements by status in TypeScript.
   * Can be used when status filtering needs to happen after data retrieval.
   */
  filterByStatuses<T extends AnnouncementWithStatus>(
    announcements: T[],
    statuses: AnnouncementStatus[]
  ): T[] {
    if (!statuses || statuses.length === 0) return announcements;
    const statusSet = new Set(statuses);
    return announcements.filter((a) => statusSet.has(a.status));
  }

  /**
   * Sort announcements by status in TypeScript.
   * Can be used for post-retrieval sorting.
   */
  sortByStatus<T extends AnnouncementWithStatus>(
    announcements: T[],
    direction: "asc" | "desc" = "asc"
  ): T[] {
    return [...announcements].sort((a, b) =>
      compareByStatus(a, b, direction)
    );
  }
}
