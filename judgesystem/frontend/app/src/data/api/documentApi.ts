/**
 * Document API client.
 *
 * Pure async functions for fetching document preview data.
 * No React state or hooks -- those belong in the hook layer.
 */
import { getApiUrl } from '../../config/api';

/**
 * Fetch a document preview (PDF blob) for a specific announcement document.
 *
 * Corresponds to `GET /api/announcements/:announcementNo/documents/:documentId/preview`.
 *
 * @param announcementNo - The announcement number.
 * @param documentId - The document identifier (stringified).
 * @param options - Optional abort signal.
 * @returns The raw Blob of the PDF preview.
 */
export async function fetchDocumentPreview(
  announcementNo: string,
  documentId: string,
  options?: { signal?: AbortSignal },
): Promise<Blob> {
  const response = await fetch(
    getApiUrl(
      `/api/announcements/${announcementNo}/documents/${documentId}/preview`,
    ),
    options?.signal ? { signal: options.signal } : undefined,
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch preview (${response.status})`);
  }
  return response.blob();
}
