import { Router, Request, Response } from "express";
import { ContactService } from "../services/contactService";

const router = Router();
const service = new ContactService();

router.get("/", async (_req: Request, res: Response) => {
  try {
    res.json(await service.getAll());
  } catch (err) {
    console.error("GET /api/contacts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const contact = await service.getById(req.params.id);
    if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
    res.json(contact);
  } catch (err) {
    console.error("GET /api/contacts/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, email, phone } = req.body;
    const contact = await service.create(name, email, phone);
    res.status(201).json(contact);
  } catch (err: any) {
    if (err.message === 'name is required') {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error("POST /api/contacts error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { name, email, phone } = req.body;
    const contact = await service.update(req.params.id, name, email, phone);
    if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
    res.json(contact);
  } catch (err) {
    console.error("PATCH /api/contacts/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const contact = await service.delete(req.params.id);
    if (!contact) { res.status(404).json({ error: "Contact not found" }); return; }
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/contacts/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
