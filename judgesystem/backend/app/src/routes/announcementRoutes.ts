import { Router, Request, Response } from "express";
import { AnnouncementService } from "../services/announcementService";
import { parseFilterParams } from "../utils/validation";

const router = Router();
const service = new AnnouncementService();

router.get("/", async (req: Request, res: Response) => {
  try {
    const filters = parseFilterParams(req.query as Record<string, any>);
    const result = await service.getList(filters);
    res.json(result);
  } catch (err) {
    console.error("GET /api/announcements error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/:announcementNo", async (req: Request, res: Response) => {
  try {
    const no = Number(req.params.announcementNo);
    if (isNaN(no)) {
      res.status(400).json({ error: "Invalid announcement number", code: "VALIDATION_ERROR" });
      return;
    }
    const announcement = await service.getByNo(no);
    if (!announcement) {
      res.status(404).json({ error: "Announcement not found", code: "NOT_FOUND" });
      return;
    }
    res.json(announcement);
  } catch (err) {
    console.error("GET /api/announcements/:announcementNo error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/:announcementNo/progressing-companies", async (req: Request, res: Response) => {
  try {
    const no = Number(req.params.announcementNo);
    if (isNaN(no)) {
      res.status(400).json({ error: "Invalid announcement number", code: "VALIDATION_ERROR" });
      return;
    }
    const companies = await service.getProgressingCompanies(no);
    res.json(companies);
  } catch (err) {
    console.error("GET /api/announcements/:announcementNo/progressing-companies error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/:announcementNo/similar-cases", async (req: Request, res: Response) => {
  try {
    const no = Number(req.params.announcementNo);
    if (isNaN(no)) {
      res.status(400).json({ error: "Invalid announcement number", code: "VALIDATION_ERROR" });
      return;
    }
    const cases = await service.getSimilarCases(no);
    res.json(cases);
  } catch (err) {
    console.error("GET /api/announcements/:announcementNo/similar-cases error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/:announcementNo/related", async (req: Request, res: Response) => {
  try {
    const no = Number(req.params.announcementNo);
    if (isNaN(no)) {
      res.status(400).json({ error: "Invalid announcement number", code: "VALIDATION_ERROR" });
      return;
    }
    const related = await service.getRelated(no);
    res.json(related);
  } catch (err) {
    console.error("GET /api/announcements/:announcementNo/related error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/:announcementNo/documents/:documentId/preview", async (req: Request, res: Response) => {
  try {
    const no = Number(req.params.announcementNo);
    if (isNaN(no)) {
      res.status(400).json({ error: "Invalid announcement number", code: "VALIDATION_ERROR" });
      return;
    }
    const result = await service.getDocumentPreview(no, req.params.documentId);
    if (!result) {
      res.status(404).json({ error: "Document not found", code: "NOT_FOUND" });
      return;
    }
    res.setHeader("Content-Type", `application/${result.fileFormat || "pdf"}`);
    res.setHeader("Content-Disposition", `inline; filename="${result.title}"`);
    res.send(result.data);
  } catch (err) {
    console.error("GET /api/announcements/:announcementNo/documents/:documentId/preview error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

export default router;
