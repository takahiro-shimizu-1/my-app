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
      `SELECT COUNT(*) as count FROM ${schemaPrefix}${TABLES.orderers}`
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await client.query(
      `SELECT
        orderer_id::text AS id,
        COALESCE(orderer_name, '') AS name,
        COALESCE(orderer_address, '') AS address
      FROM ${schemaPrefix}${TABLES.orderers}
      ORDER BY orderer_id DESC
      LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    res.json({ data: result.rows, total, page, pageSize });
  } catch (err) {
    console.error("GET /api/orderers error:", err);
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
        orderer_id::text AS id,
        COALESCE(orderer_name, '') AS name,
        COALESCE(orderer_address, '') AS address,
        COALESCE(orderer_telephone, '') AS phone
      FROM ${schemaPrefix}${TABLES.orderers}
      WHERE orderer_id::text = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      res.status(404).json({ error: "Orderer not found" });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/orderers/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
