/**
 * Announcement API client.
 *
 * Pure async functions for fetching announcement data from the backend.
 * No React state or hooks -- those belong in the hook layer.
 */
import { getApiUrl } from '../../config/api';
import type { AnnouncementFilterState } from '../../components/announcement';
import type { GridSortModel } from '@mui/x-data-grid';

// -- Request / Response types ------------------------------------------------

/** Parameters accepted by {@link fetchAnnouncements}. */
export interface FetchAnnouncementsParams {
  page: number;
  pageSize: number;
  filters: AnnouncementFilterState;
  searchQuery: string;
  sortModel: GridSortModel;
}

/** Shape returned by the announcements list endpoint. */
export interface AnnouncementsResponse {
  data: Record<string, unknown>[];
  total: number;
}

// -- API functions -----------------------------------------------------------

/**
 * Fetch a paginated, filtered, and sorted list of announcements.
 *
 * Corresponds to `GET /api/announcements`.
 */
export async function fetchAnnouncements(
  params: FetchAnnouncementsParams,
): Promise<AnnouncementsResponse> {
  const { page, pageSize, filters, searchQuery, sortModel } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('pageSize', pageSize.toString());

  // Filters
  if (filters.statuses.length > 0) {
    queryParams.append('statuses', filters.statuses.join(','));
  }
  if (filters.bidTypes.length > 0) {
    queryParams.append('bidTypes', filters.bidTypes.join(','));
  }
  if (filters.categories.length > 0) {
    queryParams.append('categories', filters.categories.join(','));
  }
  if (filters.organizations.length > 0) {
    queryParams.append('organizations', filters.organizations.join(','));
  }
  if (filters.prefectures.length > 0) {
    queryParams.append('prefectures', filters.prefectures.join(','));
  }

  // Search
  if (searchQuery.trim()) {
    queryParams.append('searchQuery', searchQuery.trim());
  }

  // Sort
  if (sortModel.length > 0) {
    const sort = sortModel[0];
    queryParams.append('sortField', sort.field);
    queryParams.append('sortOrder', sort.sort || 'asc');
  }

  const response = await fetch(
    getApiUrl(`/api/announcements?${queryParams.toString()}`),
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', response.status, errorText);
    throw new Error(
      `Failed to fetch announcements: ${response.status} - ${errorText}`,
    );
  }

  const result: AnnouncementsResponse = await response.json();
  console.log('Announcements API Response:', result);
  return result;
}

/**
 * Fetch a single announcement by its announcement number.
 *
 * Corresponds to `GET /api/announcements/:announcementNo`.
 *
 * @param announcementNo - The announcement number (without the `ann-` prefix).
 * @param options - Optional abort signal.
 * @returns The announcement detail object.
 */
export async function fetchAnnouncementDetail(
  announcementNo: string,
  options?: { signal?: AbortSignal },
): Promise<Record<string, unknown>> {
  const response = await fetch(
    getApiUrl(`/api/announcements/${announcementNo}`),
    options?.signal ? { signal: options.signal } : undefined,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch announcement: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch related announcements for a given announcement.
 *
 * Corresponds to `GET /api/announcements/:announcementNo/related`.
 *
 * @param announcementNo - The announcement number.
 * @param options - Optional abort signal.
 * @returns Array of related announcement rows.
 */
export async function fetchRelatedAnnouncements(
  announcementNo: string,
  options?: { signal?: AbortSignal },
): Promise<unknown[]> {
  const response = await fetch(
    getApiUrl(`/api/announcements/${announcementNo}/related`),
    options?.signal ? { signal: options.signal } : undefined,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  const data: unknown = await response.json();
  return Array.isArray(data) ? data : [];
}
