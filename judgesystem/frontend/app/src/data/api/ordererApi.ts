/**
 * Orderer API client.
 *
 * Pure async functions for fetching orderer data from the backend.
 * No React state or hooks -- those belong in the hook layer.
 */
import { getApiUrl } from '../../config/api';
import type { Orderer } from '../../types/orderer';

/**
 * Fetch all orderers from the backend.
 *
 * Corresponds to `GET /api/orderers`.
 *
 * @param options - Optional abort signal.
 * @returns Array of orderer records.
 */
export async function fetchOrderers(
  options?: { signal?: AbortSignal },
): Promise<Orderer[]> {
  const response = await fetch(
    getApiUrl('/api/orderers'),
    options?.signal ? { signal: options.signal } : undefined,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch orderers: ${response.status}`);
  }
  const data: unknown = await response.json();
  return Array.isArray(data) ? data : ((data as Record<string, unknown>).data as Orderer[] ?? []);
}
