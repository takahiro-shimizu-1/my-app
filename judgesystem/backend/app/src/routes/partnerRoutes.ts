import { Router, Request, Response } from "express";
import { PartnerService } from "../services/partnerService";

const router = Router();
const service = new PartnerService();

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page ?? 0);
    const pageSize = Number(req.query.pageSize ?? 25);
    const result = await service.getList(
      isNaN(page) || page < 0 ? 0 : page,
      isNaN(pageSize) || pageSize < 1 ? 25 : pageSize
    );
    res.json(result);
  } catch (err) {
    console.error("GET /api/partners error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const partner = await service.getById(req.params.id);
    if (!partner) { res.status(404).json({ error: "Partner not found" }); return; }
    res.json(partner);
  } catch (err) {
    console.error("GET /api/partners/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
