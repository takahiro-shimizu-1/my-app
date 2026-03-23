import { AnnouncementRepository } from "../repositories/announcementRepository";
import { DocumentService } from "./documentService";
import type { FilterParams, AnnouncementStatus } from "../../../../shared/types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "../../../../shared/constants";

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
  ): Promise<{ data: any[]; total: number; page: number; pageSize: number }> {
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
  async getByNo(announcementNo: number): Promise<any | null> {
    const announcement = await this.repository.findByNo(announcementNo);
    if (!announcement) return null;

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
  async getProgressingCompanies(announcementNo: number): Promise<any[]> {
    return this.repository.findProgressingCompanies(announcementNo);
  }

  /**
   * Get similar cases for an announcement.
   */
  async getSimilarCases(announcementNo: number): Promise<any[]> {
    return this.repository.findSimilarCases(announcementNo);
  }

  /**
   * Get a document file for preview/download.
   * Delegates file lookup to repository (DB query for metadata),
   * then downloads the actual file via documentService.
   */
  async getDocumentPreview(
    announcementNo: number,
    documentId: string
  ): Promise<{ data: Buffer; fileFormat: string; title: string } | null> {
    return this.repository.getDocumentFile(announcementNo, documentId);
  }

  /**
   * Get related announcements sharing category/organization/location.
   */
  async getRelated(announcementNo: number): Promise<any[]> {
    return this.repository.findRelated(announcementNo);
  }

  /**
   * Filter announcements by status in TypeScript.
   * Can be used when status filtering needs to happen after data retrieval.
   */
  filterByStatuses(
    announcements: any[],
    statuses: AnnouncementStatus[]
  ): any[] {
    if (!statuses || statuses.length === 0) return announcements;
    const statusSet = new Set(statuses);
    return announcements.filter((a) => statusSet.has(a.status));
  }

  /**
   * Sort announcements by status in TypeScript.
   * Can be used for post-retrieval sorting.
   */
  sortByStatus(
    announcements: any[],
    direction: "asc" | "desc" = "asc"
  ): any[] {
    return [...announcements].sort((a, b) =>
      compareByStatus(a, b, direction)
    );
  }
}
