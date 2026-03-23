/**
 * Company API client.
 *
 * Pure async functions for fetching company data from the backend.
 * No React state or hooks -- those belong in the hook layer.
 */
import { getApiUrl } from '../../config/api';

/** Company detail shape returned by the API. */
export interface CompanyWithDetails {
  id: string;
  no: number;
  name: string;
  address: string;
  grade: string;
  priority: number;
  phone: string;
  email: string;
  fax?: string | null;
  postalCode?: string | null;
  representative: string;
  established: string;
  capital: number;
  employeeCount: number;
  branches: { name: string; address: string }[];
  certifications: string[];
}

/**
 * Fetch all companies from the backend.
 *
 * Corresponds to `GET /api/companies`.
 *
 * @param options - Optional abort signal.
 * @returns Array of company records.
 */
export async function fetchCompanies(
  options?: { signal?: AbortSignal },
): Promise<CompanyWithDetails[]> {
  const response = await fetch(
    getApiUrl('/api/companies'),
    options?.signal ? { signal: options.signal } : undefined,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch companies: ${response.status}`);
  }
  const data: unknown = await response.json();
  return Array.isArray(data) ? data : ((data as Record<string, unknown>).data as CompanyWithDetails[] ?? []);
}
