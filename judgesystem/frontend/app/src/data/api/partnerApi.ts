/**
 * Partner API client.
 *
 * Pure async functions for fetching partner data from the backend.
 * No React state or hooks -- those belong in the hook layer.
 */
import { getApiUrl } from '../../config/api';
import type { PartnerListItem } from '../../types';
import type { PartnerDetail } from '../../types/partner';

/**
 * Fetch all partners (list view).
 *
 * Corresponds to `GET /api/partners`.
 *
 * @param options - Optional abort signal.
 * @returns Array of partner list items.
 */
export async function fetchPartnerList(
  options?: { signal?: AbortSignal },
): Promise<PartnerListItem[]> {
  const response = await fetch(
    getApiUrl('/api/partners'),
    options?.signal ? { signal: options.signal } : undefined,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch partners: ${response.status}`);
  }
  const data: unknown = await response.json();
  return Array.isArray(data) ? data : ((data as Record<string, unknown>).data as PartnerListItem[] ?? []);
}

/**
 * Fetch a partner detail by ID.
 *
 * Corresponds to `GET /api/partners/:id`.
 *
 * @param id - The partner identifier.
 * @param options - Optional abort signal.
 * @returns The partner detail object.
 */
export async function fetchPartnerDetail(
  id: string,
  options?: { signal?: AbortSignal },
): Promise<PartnerDetail> {
  const response = await fetch(
    getApiUrl(`/api/partners/${id}`),
    options?.signal ? { signal: options.signal } : undefined,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch partner: ${response.status}`);
  }
  return response.json() as Promise<PartnerDetail>;
}
