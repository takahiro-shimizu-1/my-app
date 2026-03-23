import { Router, Request, Response } from "express";
import { pool, TABLES, schemaPrefix } from "../config/database";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const page = Number(req.query.page ?? 0);
    const pageSize = Number(req.query.pageSize ?? 25);
    const offset = page * pageSize;

    const countResult = await client.query(
      `SELECT COUNT(*) as count FROM ${schemaPrefix}${TABLES.partners}`
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await client.query(
      `SELECT
        partner_no::text AS id,
        partner_no AS no,
        COALESCE(partner_name, '') AS name,
        COALESCE(partner_address, '') AS address
      FROM ${schemaPrefix}${TABLES.partners}
      ORDER BY partner_no DESC
      LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    res.json({ data: result.rows, total, page, pageSize });
  } catch (err) {
    console.error("GET /api/partners error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
        p.partner_no::text AS id,
        p.partner_no AS no,
        COALESCE(p.partner_name, '') AS name,
        COALESCE(p.partner_address, '') AS address,
        COALESCE(p.partner_telephone, '') AS phone,
        COALESCE(p.partner_email, '') AS email
      FROM ${schemaPrefix}${TABLES.partners} p
      WHERE p.partner_no::text = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Partner not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/partners/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
