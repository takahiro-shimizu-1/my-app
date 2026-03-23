/**
 * API client layer barrel export.
 *
 * All backend communication goes through this module.
 * Hooks and components should import API functions from here
 * rather than calling fetch() directly.
 */

// Announcement API
export {
  fetchAnnouncements,
  fetchAnnouncementDetail,
  fetchRelatedAnnouncements,
} from './announcementApi';
export type {
  FetchAnnouncementsParams,
  AnnouncementsResponse,
} from './announcementApi';

// Evaluation API
export {
  fetchEvaluations,
  fetchStatusCounts,
  fetchProgressingCompanies,
  updateWorkStatus,
  updateEvaluationAssignee,
  appendFilterParams,
} from './evaluationApi';
export type {
  FetchEvaluationsParams,
  EvaluationsResponse,
  FetchStatusCountsParams,
} from './evaluationApi';

// Partner API
export { fetchPartnerDetail } from './partnerApi';

// Document API
export { fetchDocumentPreview } from './documentApi';
