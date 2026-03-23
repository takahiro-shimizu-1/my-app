/**
 * Evaluation API client.
 *
 * Pure async functions for fetching and mutating evaluation data.
 * No React state or hooks -- those belong in the hook layer.
 */
import { getApiUrl } from '../../config/api';
import type { EvaluationStatus, WorkStatus, EvaluationApiItem } from '../../types';
import type { FilterState } from '../../types';
import type { GridSortModel } from '@mui/x-data-grid';

// -- Shared helpers ----------------------------------------------------------

/**
 * Append filter fields to a URLSearchParams instance.
 *
 * @param queryParams - The target URLSearchParams.
 * @param filters - The filter state to serialise.
 * @param options - Pass `{ includeStatuses: false }` to skip status params.
 */
export function appendFilterParams(
  queryParams: URLSearchParams,
  filters: FilterState,
  options?: { includeStatuses?: boolean },
): void {
  const includeStatuses = options?.includeStatuses ?? true;

  if (includeStatuses && filters.statuses.length > 0) {
    filters.statuses.forEach(s => queryParams.append('statuses', s));
  }
  if (filters.workStatuses.length > 0) {
    filters.workStatuses.forEach(s => queryParams.append('workStatuses', s));
  }
  if (filters.priorities.length > 0) {
    filters.priorities.forEach(s =>
      queryParams.append('priorities', s.toString()),
    );
  }
  if (filters.categories.length > 0) {
    filters.categories.forEach(s => queryParams.append('categories', s));
  }
  if (filters.bidTypes.length > 0) {
    filters.bidTypes.forEach(s => queryParams.append('bidTypes', s));
  }
  if (filters.organizations.length > 0) {
    filters.organizations.forEach(s => queryParams.append('organizations', s));
  }
  if (filters.prefectures.length > 0) {
    filters.prefectures.forEach(s => queryParams.append('prefectures', s));
  }
}

// -- Request / Response types ------------------------------------------------

/** Parameters accepted by {@link fetchEvaluations}. */
export interface FetchEvaluationsParams {
  page: number;
  pageSize: number;
  filters: FilterState;
  searchQuery: string;
  sortModel: GridSortModel;
}

/** Shape returned by the evaluations list endpoint. */
export interface EvaluationsResponse {
  data: EvaluationApiItem[];
  total: number;
}

/** Parameters accepted by {@link fetchStatusCounts}. */
export interface FetchStatusCountsParams {
  filters: FilterState;
  searchQuery: string;
}

// -- API functions -----------------------------------------------------------

/**
 * Fetch a paginated, filtered, and sorted list of evaluations.
 *
 * Corresponds to `GET /api/evaluations`.
 */
export async function fetchEvaluations(
  params: FetchEvaluationsParams,
): Promise<EvaluationsResponse> {
  const { page, pageSize, filters, searchQuery, sortModel } = params;

  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  queryParams.append('pageSize', pageSize.toString());

  // Filters
  appendFilterParams(queryParams, filters);

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
    getApiUrl(`/api/evaluations?${queryParams.toString()}`),
  );
  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', response.status, errorText);
    throw new Error(
      `Failed to fetch evaluations: ${response.status} - ${errorText}`,
    );
  }

  const result: EvaluationsResponse = await response.json();
  console.log('API Response:', result);
  return result;
}

/**
 * Fetch evaluation status counts (excluding the status filter itself).
 *
 * Corresponds to `GET /api/evaluations/status-counts`.
 */
export async function fetchStatusCounts(
  params: FetchStatusCountsParams,
): Promise<Record<EvaluationStatus, number>> {
  const { filters, searchQuery } = params;
  const queryParams = new URLSearchParams();
  appendFilterParams(queryParams, filters, { includeStatuses: false });

  if (searchQuery.trim()) {
    queryParams.append('searchQuery', searchQuery.trim());
  }

  const response = await fetch(
    getApiUrl(`/api/evaluations/status-counts?${queryParams.toString()}`),
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch status counts: ${response.status}`);
  }

  const result = await response.json();
  return {
    all_met: Number(result?.all_met ?? 0),
    other_only_unmet: Number(result?.other_only_unmet ?? 0),
    unmet: Number(result?.unmet ?? 0),
  };
}

/**
 * Fetch progressing companies for a given announcement.
 *
 * Corresponds to `GET /api/announcements/:announcementNo/progressing-companies`.
 *
 * @param announcementNo - The announcement number.
 * @param options - Optional abort signal.
 * @returns Raw API rows (caller is responsible for mapping).
 */
export async function fetchProgressingCompanies(
  announcementNo: string,
  options?: { signal?: AbortSignal },
): Promise<unknown[]> {
  const response = await fetch(
    getApiUrl(
      `/api/announcements/${announcementNo}/progressing-companies`,
    ),
    options?.signal ? { signal: options.signal } : undefined,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status}`);
  }
  const data: unknown = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Update the work status (and optionally the current step) of an evaluation.
 *
 * Corresponds to `PATCH /api/evaluations/:evaluationNo`.
 *
 * @returns `true` on success, `false` on failure.
 */
export async function updateWorkStatus(
  evaluationNo: string,
  workStatus: WorkStatus,
  currentStep?: string,
): Promise<boolean> {
  try {
    const response = await fetch(getApiUrl(`/api/evaluations/${evaluationNo}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workStatus, currentStep }),
    });

    if (!response.ok) {
      console.error(
        `Failed to update workStatus: ${response.status} ${response.statusText}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating workStatus:', error);
    return false;
  }
}

/**
 * Update the assignee for a specific evaluation step.
 *
 * Corresponds to `PUT /api/evaluations/:evaluationNo/assignees`.
 *
 * @returns `true` on success, `false` on failure.
 */
export async function updateEvaluationAssignee(
  evaluationNo: string,
  stepId: string,
  staffId: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      getApiUrl(`/api/evaluations/${evaluationNo}/assignees`),
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, contactId: staffId || null }),
      },
    );

    if (!response.ok) {
      console.error(
        `Failed to update assignee: ${response.status} ${response.statusText}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error updating assignee:', error);
    return false;
  }
}
