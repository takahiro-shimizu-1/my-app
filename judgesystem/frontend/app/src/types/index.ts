/**
 * Frontend type definitions for the Judge System.
 *
 * These types are used across pages, hooks, and components.
 * They are defined here as the single source of truth for
 * the frontend application.
 */

/** Evaluation status of a company against announcement requirements. */
export type EvaluationStatus = 'all_met' | 'other_only_unmet' | 'unmet';

/** Work progress status. */
export type WorkStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';

/** Step identifier for multi-step evaluation flows. */
export type CurrentStep = 'judgment' | 'document_review' | 'field_survey' | 'final_review';

/** Company priority ranking (1 = highest, 5 = lowest). */
export type CompanyPriority = 1 | 2 | 3 | 4 | 5;

/** Lifecycle status of an announcement. */
export type AnnouncementStatus = 'upcoming' | 'ongoing' | 'awaiting_result' | 'closed';

/** Bid type classification. */
export type BidType =
  | 'general-competitive-bidding'
  | 'design-competition'
  | 'one-off'
  | 'proposal'
  | 'negotiated-contract'
  | 'unknown';

/** OCR-extracted document metadata attached to an announcement. */
export interface DocumentOcr {
  id: number;
  type: string;
  title: string;
  fileFormat: string;
  pageCount: number | null;
  extractedAt: string | null;
  url: string;
  markdown_path?: string;
  content?: string;
}

/** Announcement summary used in list views and detail pages. */
export interface Announcement {
  title: string;
  organization: string;
  category: string;
  bidType: string;
  workLocation: string;
  publishDate: string;
  deadline: string;
  estimatedAmountMin: number | null;
  estimatedAmountMax: number | null;
  documents?: DocumentOcr[];
}

// ---------------------------------------------------------------------------
// Filter state
// ---------------------------------------------------------------------------

/** Filter state for the bid (evaluation) list page. */
export interface FilterState {
  statuses: string[];
  workStatuses: string[];
  priorities: string[];
  categories: string[];
  bidTypes: string[];
  organizations: string[];
  prefectures: string[];
}

// ---------------------------------------------------------------------------
// Row types used by list hooks / DataGrid
// ---------------------------------------------------------------------------

/** Row type for the announcement list DataGrid (matches API response shape). */
export interface AnnouncementListRow {
  id: string;
  announcementNo: number;
  title: string;
  organization: string;
  category: string;
  bidType: string;
  workLocation: string;
  publishDate: string;
  deadline: string;
}

/** Raw evaluation item returned from the /api/evaluations endpoint. */
export interface EvaluationApiItem {
  id: string;
  evaluationNo: string;
  status: EvaluationStatus;
  workStatus: WorkStatus | null;
  announcement: {
    title: string;
    organization: string;
    category: string;
    bidType: string;
    deadline: string;
    workLocation: string;
  } | null;
  company: {
    name: string;
    priority: CompanyPriority | null;
  } | null;
  branch: {
    name: string;
  } | null;
  evaluatedAt: string | null;
}

/** Flattened row type for the evaluation list DataGrid. */
export interface EvaluationListRow {
  id: string;
  evaluationNo: string;
  status: EvaluationStatus;
  workStatus: WorkStatus | null;
  priority: CompanyPriority | 0;
  title: string;
  company: string;
  branch: string;
  organization: string;
  category: string;
  bidType: string | undefined;
  deadline: string;
  evaluatedAt: string;
  prefecture: string;
}
