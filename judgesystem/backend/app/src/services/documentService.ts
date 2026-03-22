import {
  readMultipleMarkdownFromGCS,
  downloadFileFromGCS,
} from "../utils/gcs";

const FALLBACK_CONTENT = "文字起こしデータがありません";

/**
 * Shared service for GCS document operations.
 * Centralizes all GCS-related business logic so that
 * repositories stay pure data-access and never touch GCS.
 */
export class DocumentService {
  /**
   * Batch-fetch markdown content from GCS for an array of documents.
   * Each document is expected to have an optional `markdown_path` field.
   * Returns a new array with `content` populated and `markdown_path` removed.
   */
  async attachDocumentContents(documents: any[]): Promise<any[]> {
    if (!documents || documents.length === 0) return [];

    // Collect valid GCS paths and track their indices
    const gcsPaths: string[] = [];
    const gcsIndexMap: number[] = [];
    documents.forEach((doc, i) => {
      if (
        doc.markdown_path &&
        typeof doc.markdown_path === "string" &&
        doc.markdown_path.startsWith("gs://")
      ) {
        gcsPaths.push(doc.markdown_path);
        gcsIndexMap.push(i);
      }
    });

    // Parallel batch fetch (individual failures fall back gracefully)
    const contents = await readMultipleMarkdownFromGCS(
      gcsPaths,
      FALLBACK_CONTENT
    );

    // Map results back to documents
    return documents.map((doc, i) => {
      const gcsIdx = gcsIndexMap.indexOf(i);
      const content = gcsIdx !== -1 ? contents[gcsIdx] : FALLBACK_CONTENT;
      return { ...doc, content, markdown_path: undefined };
    });
  }

  /**
   * Download a single file from GCS.
   * Validates the path starts with gs:// before attempting download.
   */
  async downloadDocument(gcsPath: string): Promise<Buffer> {
    if (!gcsPath || !gcsPath.startsWith("gs://")) {
      throw new Error("Invalid GCS path: must start with gs://");
    }
    return downloadFileFromGCS(gcsPath);
  }
}
