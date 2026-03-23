import { Router, Request, Response } from "express";
import { OrdererService } from "../services/ordererService";

const router = Router();
const service = new OrdererService();

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
    console.error("GET /api/orderers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const orderer = await service.getById(req.params.id);
    if (!orderer) { res.status(404).json({ error: "Orderer not found" }); return; }
    res.json(orderer);
  } catch (err) {
    console.error("GET /api/orderers/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
