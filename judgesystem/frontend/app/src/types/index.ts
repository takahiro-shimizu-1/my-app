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
