import { Router, Request, Response } from "express";
import { EvaluationService } from "../services/evaluationService";
import { parseFilterParams } from "../utils/validation";

const router = Router();
const service = new EvaluationService();

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await service.getStats();
    res.json(stats);
  } catch (err) {
    console.error("GET /api/evaluations/stats error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/status-counts", async (req: Request, res: Response) => {
  try {
    const filters = parseFilterParams(req.query as Record<string, any>);
    const counts = await service.getStatusCounts(filters);
    res.json(counts);
  } catch (err) {
    console.error("GET /api/evaluations/status-counts error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const filters = parseFilterParams(req.query as Record<string, any>);
    const result = await service.getList(filters);
    res.json(result);
  } catch (err) {
    console.error("GET /api/evaluations error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const evaluation = await service.getById(req.params.id);
    if (!evaluation) {
      res.status(404).json({ error: "Evaluation not found", code: "NOT_FOUND" });
      return;
    }
    res.json(evaluation);
  } catch (err) {
    console.error("GET /api/evaluations/:id error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.patch("/:evaluationNo", async (req: Request, res: Response) => {
  try {
    const { workStatus, currentStep } = req.body;
    if (!workStatus) {
      res.status(400).json({ error: "workStatus is required", code: "VALIDATION_ERROR" });
      return;
    }
    const result = await service.updateWorkStatus(
      req.params.evaluationNo,
      workStatus,
      currentStep
    );
    if (!result) {
      res.status(404).json({ error: "Evaluation not found", code: "NOT_FOUND" });
      return;
    }
    res.json(result);
  } catch (err: any) {
    if (err.message?.startsWith("Invalid")) {
      res.status(400).json({ error: err.message, code: "VALIDATION_ERROR" });
      return;
    }
    console.error("PATCH /api/evaluations/:evaluationNo error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.get("/:evaluationNo/assignees", async (req: Request, res: Response) => {
  try {
    const assignees = await service.getAssignees(req.params.evaluationNo);
    res.json(assignees);
  } catch (err) {
    console.error("GET /api/evaluations/:evaluationNo/assignees error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

router.put("/:evaluationNo/assignees", async (req: Request, res: Response) => {
  try {
    const result = await service.updateAssignee(
      req.params.evaluationNo,
      req.body
    );
    if (!result) {
      res.status(404).json({ error: "Evaluation not found", code: "NOT_FOUND" });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error("PUT /api/evaluations/:evaluationNo/assignees error:", err);
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

export default router;
