import { Router, Request, Response } from "express";
import { OrdererService } from "../services/ordererService";
import { parsePagination } from "../utils/validation";

const router = Router();
const service = new OrdererService();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { page, pageSize } = parsePagination(req.query as Record<string, any>);
    const result = await service.getList(page, pageSize);
    res.json(result);
  } catch (err) {
    console.error("GET /api/orderers error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const orderer = await service.getById(req.params.id);
    if (!orderer) {
      res.status(404).json({ error: "Orderer not found", code: "NOT_FOUND" });
      return;
    }
    res.json(orderer);
  } catch (err) {
    console.error("GET /api/orderers/:id error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

export default router;
