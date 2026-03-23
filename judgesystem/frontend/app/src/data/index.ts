/**
 * Data layer barrel export.
 *
 * Usage:
 *   import { fetchOrderers, allCategories, ordererCategoryConfig } from '../data';
 *
 * Structure:
 *   api/              - API client layer (all fetch functions)
 *   orderers.ts       - Re-exports fetchOrderers from API layer
 *   partners.ts       - Re-exports fetchPartnerList + static category list
 *   companies.ts      - Re-exports fetchCompanies + getCompanyPriority
 *   announcements.ts  - Empty collection (data fetched via API)
 *   evaluations.ts    - Mock similar-case data + API re-exports
 *
 * Notes:
 *   - Types come from types/
 *   - Display config comes from constants/
 *   - API functions come from data/api/
 */

// API client layer
export * from './api';

// Orderers
export { fetchOrderers } from './orderers';

// Orderer types / config re-exports
export { ordererCategoryConfig } from '../constants/ordererCategory';
export type { OrdererCategory } from '../types/orderer';

// Companies
export {
  fetchCompanies,
  getCompanyPriority,
  findCompanyById,
  findCompanyByName,
} from './companies';
export type { CompanyWithDetails } from './companies';

// Partners
export {
  fetchPartnerList,
  allCategories,
} from './partners';

// Announcements
export {
  announcements,
  findAnnouncementById,
  getAnnouncementsByOrdererId,
} from './announcements';

// Announcement types / config re-exports
export { announcementStatusConfig } from '../constants/announcementStatus';
export { bidTypeConfig } from '../constants/bidType';
export { documentTypeConfig } from '../constants/documentType';
export type { AnnouncementStatus, BidType } from '../types/announcement';
export type { DocumentType, DocumentOcr } from '../types';

// Evaluations (mock similar-case data)
// Note: updateWorkStatus, updateEvaluationAssignee are exported from data/api/
export {
  similarCases,
  getSimilarCases,
} from './evaluations';
