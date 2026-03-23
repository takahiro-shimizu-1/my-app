import { Router, Request, Response } from "express";
import { CompanyService } from "../services/companyService";

const router = Router();
const service = new CompanyService();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const companies = await service.getAll();
    res.json(companies);
  } catch (err) {
    console.error("GET /api/companies error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
