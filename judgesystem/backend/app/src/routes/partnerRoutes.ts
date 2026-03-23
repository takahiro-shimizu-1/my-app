import { Router, Request, Response } from "express";
import { PartnerService } from "../services/partnerService";
import { parsePagination } from "../utils/validation";

const router = Router();
const service = new PartnerService();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req.query as Record<string, any>);
    const result = await service.getList(page, pageSize);
    res.json(result);
  } catch (err) {
    console.error("GET /api/partners error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const partner = await service.getById(req.params.id);
    if (!partner) {
      res.status(404).json({ error: "Partner not found", code: "NOT_FOUND" });
      return;
    }
    res.json(partner);
  } catch (err) {
    console.error("GET /api/partners/:id error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

export default router;
