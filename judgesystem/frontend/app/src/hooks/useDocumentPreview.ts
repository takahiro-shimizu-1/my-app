import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchDocumentPreview } from '../data/api';
import type { DocumentOcr } from '../types';

// -- Types --

export type PreviewState = { url?: string; loading: boolean; error?: string };

// -- Hook --

/**
 * Document preview hook.
 * Manages PDF blob URL lifecycle (fetch, cache, revoke) for announcement documents.
 *
 * @param announcementNo - The announcement number used in the API path.
 * @param documents - The list of documents attached to the announcement.
 * @returns documentPreviewState and loadPdfPreview callback.
 */
export function useDocumentPreview(
  announcementNo: string | undefined,
  documents: DocumentOcr[] | undefined,
) {
  const [documentPreviewState, setDocumentPreviewState] = useState<Record<string, PreviewState>>({});
  const previewUrlRef = useRef<Record<string, string>>({});
  const documentPreviewStateRef = useRef<Record<string, PreviewState>>({});
  const previewFetchControllersRef = useRef<Record<string, AbortController>>({});

  // -- Cleanup helpers --

  const abortAllPreviewFetches = useCallback(() => {
    Object.values(previewFetchControllersRef.current).forEach(c => c.abort());
    previewFetchControllersRef.current = {};
  }, []);

  const revokeAllPreviewUrls = useCallback(() => {
    Object.values(previewUrlRef.current).forEach(url => {
      if (url) URL.revokeObjectURL(url);
    });
    previewUrlRef.current = {};
  }, []);

  const resetPreviewState = useCallback(() => {
    abortAllPreviewFetches();
    revokeAllPreviewUrls();
    setDocumentPreviewState(() => {
      documentPreviewStateRef.current = {};
      return {};
    });
  }, [abortAllPreviewFetches, revokeAllPreviewUrls]);

  // Cleanup on unmount
  useEffect(() => () => {
    abortAllPreviewFetches();
    revokeAllPreviewUrls();
  }, [abortAllPreviewFetches, revokeAllPreviewUrls]);

  // Reset when announcementNo changes
  useEffect(() => {
    resetPreviewState();
  }, [announcementNo, resetPreviewState]);

  // -- Load PDF preview --

  const loadPdfPreview = useCallback(
    async (documentId: number, options?: { force?: boolean }) => {
      if (!announcementNo) return;
      const docKey = String(documentId);
      const forceReload = options?.force ?? false;
      const currentState = documentPreviewStateRef.current[docKey];
      if (!forceReload && (currentState?.loading || currentState?.url)) return;

      if (forceReload && previewUrlRef.current[docKey]) {
        URL.revokeObjectURL(previewUrlRef.current[docKey]);
        delete previewUrlRef.current[docKey];
      }

      const existingController = previewFetchControllersRef.current[docKey];
      if (existingController) existingController.abort();

      const controller = new AbortController();
      previewFetchControllersRef.current[docKey] = controller;

      setDocumentPreviewState(prev => {
        const nextState = { ...prev, [docKey]: { loading: true } };
        documentPreviewStateRef.current = nextState;
        return nextState;
      });

      try {
        const blob = await fetchDocumentPreview(announcementNo, docKey, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        const objectUrl = URL.createObjectURL(blob);
        if (previewUrlRef.current[docKey]) URL.revokeObjectURL(previewUrlRef.current[docKey]);
        previewUrlRef.current[docKey] = objectUrl;

        setDocumentPreviewState(prev => {
          const nextState = { ...prev, [docKey]: { loading: false, url: objectUrl } };
          documentPreviewStateRef.current = nextState;
          return nextState;
        });
      } catch (err) {
        if ((err instanceof DOMException && err.name === 'AbortError') || controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'PDF\u30D7\u30EC\u30D3\u30E5\u30FC\u306E\u53D6\u5F97\u306B\u5931\u6557\u3057\u307E\u3057\u305F';
        setDocumentPreviewState(prev => {
          const nextState = { ...prev, [docKey]: { loading: false, error: message } };
          documentPreviewStateRef.current = nextState;
          return nextState;
        });
      } finally {
        if (previewFetchControllersRef.current[docKey] === controller) {
          delete previewFetchControllersRef.current[docKey];
        }
      }
    },
    [announcementNo],
  );

  // Auto-load first PDF when documents change
  useEffect(() => {
    if (!documents) return;
    const firstPdfDoc = documents.find(
      (doc: DocumentOcr) => doc.fileFormat && doc.fileFormat.toLowerCase() === 'pdf',
    );
    if (firstPdfDoc) loadPdfPreview(firstPdfDoc.id);
  }, [documents, loadPdfPreview]);

  return { documentPreviewState, loadPdfPreview };
}
