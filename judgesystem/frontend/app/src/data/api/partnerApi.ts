/**
 * Partner API client.
 *
 * Pure async functions for fetching partner data from the backend.
 * No React state or hooks -- those belong in the hook layer.
 */
import { getApiUrl } from '../../config/api';

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
): Promise<Record<string, unknown>> {
  const response = await fetch(
    getApiUrl(`/api/partners/${id}`),
    options?.signal ? { signal: options.signal } : undefined,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch partner: ${response.status}`);
  }
  return response.json();
}
