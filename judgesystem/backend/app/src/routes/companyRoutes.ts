import { Router, Request, Response } from "express";
import { pool, TABLES, schemaPrefix } from "../config/database";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
        company_no::text AS id,
        COALESCE(company_name, '') AS name,
        COALESCE(company_address, '') AS address
      FROM ${schemaPrefix}${TABLES.companyMaster}
      ORDER BY company_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/companies error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
