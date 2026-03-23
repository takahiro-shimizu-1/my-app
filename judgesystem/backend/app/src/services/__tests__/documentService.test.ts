import { describe, it, expect, vi, beforeEach } from "vitest";
import { DocumentService } from "../documentService";

// Mock GCS utilities
vi.mock("../../utils/gcs", () => ({
  readMultipleMarkdownFromGCS: vi.fn(),
  downloadFileFromGCS: vi.fn(),
}));

import { readMultipleMarkdownFromGCS, downloadFileFromGCS } from "../../utils/gcs";

const mockedReadMultiple = vi.mocked(readMultipleMarkdownFromGCS);
const mockedDownload = vi.mocked(downloadFileFromGCS);

describe("DocumentService", () => {
  let service: DocumentService;

  beforeEach(() => {
    service = new DocumentService();
    vi.clearAllMocks();
  });

  describe("attachDocumentContents", () => {
    it("returns empty array for empty input", async () => {
      expect(await service.attachDocumentContents([])).toEqual([]);
    });

    it("returns empty array for null input", async () => {
      expect(await service.attachDocumentContents(null as any)).toEqual([]);
    });

    it("enriches documents with GCS content", async () => {
      const docs = [
        { id: 1, title: "doc1", markdown_path: "gs://bucket/path1.md" },
        { id: 2, title: "doc2", markdown_path: "gs://bucket/path2.md" },
      ];

      mockedReadMultiple.mockResolvedValue(["# Content 1", "# Content 2"]);

      const result = await service.attachDocumentContents(docs);

      expect(mockedReadMultiple).toHaveBeenCalledWith(
        ["gs://bucket/path1.md", "gs://bucket/path2.md"],
        "文字起こしデータがありません"
      );

      expect(result[0].content).toBe("# Content 1");
      expect(result[0].markdown_path).toBeUndefined();
      expect(result[1].content).toBe("# Content 2");
      expect(result[1].markdown_path).toBeUndefined();
    });

    it("uses fallback for documents without markdown_path", async () => {
      const docs = [
        { id: 1, title: "doc1" },
        { id: 2, title: "doc2", markdown_path: "gs://bucket/path.md" },
      ];

      mockedReadMultiple.mockResolvedValue(["# Content"]);

      const result = await service.attachDocumentContents(docs);

      expect(result[0].content).toBe("文字起こしデータがありません");
      expect(result[1].content).toBe("# Content");
    });

    it("skips non-gs:// paths", async () => {
      const docs = [
        { id: 1, title: "doc1", markdown_path: "http://example.com/file.md" },
        { id: 2, title: "doc2", markdown_path: "gs://bucket/path.md" },
      ];

      mockedReadMultiple.mockResolvedValue(["# Content"]);

      const result = await service.attachDocumentContents(docs);

      expect(mockedReadMultiple).toHaveBeenCalledWith(
        ["gs://bucket/path.md"],
        "文字起こしデータがありません"
      );
      expect(result[0].content).toBe("文字起こしデータがありません");
      expect(result[1].content).toBe("# Content");
    });
  });

  describe("downloadDocument", () => {
    it("downloads file from valid GCS path", async () => {
      const buffer = Buffer.from("pdf-content");
      mockedDownload.mockResolvedValue(buffer);

      const result = await service.downloadDocument("gs://bucket/file.pdf");

      expect(mockedDownload).toHaveBeenCalledWith("gs://bucket/file.pdf");
      expect(result).toBe(buffer);
    });

    it("throws for invalid path", async () => {
      await expect(service.downloadDocument("")).rejects.toThrow("Invalid GCS path");
      await expect(service.downloadDocument("http://example.com")).rejects.toThrow("Invalid GCS path");
    });
  });
});
