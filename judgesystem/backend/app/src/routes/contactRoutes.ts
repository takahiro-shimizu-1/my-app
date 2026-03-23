import { Router, Request, Response } from "express";
import { pool, TABLES, schemaPrefix } from "../config/database";

const router = Router();
const table = () => `${schemaPrefix}${TABLES.contacts}`;

router.get("/", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT
        contact_id::text AS id,
        COALESCE(contact_name, '') AS name,
        COALESCE(contact_email, '') AS email,
        COALESCE(contact_telephone, '') AS phone
      FROM ${table()}
      ORDER BY contact_id DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("GET /api/contacts error:", err);
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
        contact_id::text AS id,
        COALESCE(contact_name, '') AS name,
        COALESCE(contact_email, '') AS email,
        COALESCE(contact_telephone, '') AS phone
      FROM ${table()}
      WHERE contact_id::text = $1`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET /api/contacts/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.post("/", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { name, email, phone } = req.body;
    const result = await client.query(
      `INSERT INTO ${table()} (contact_name, contact_email, contact_telephone)
       VALUES ($1, $2, $3)
       RETURNING contact_id::text AS id, contact_name AS name, contact_email AS email, contact_telephone AS phone`,
      [name, email, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("POST /api/contacts error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.patch("/:id", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { name, email, phone } = req.body;
    const result = await client.query(
      `UPDATE ${table()}
       SET contact_name = COALESCE($2, contact_name),
           contact_email = COALESCE($3, contact_email),
           contact_telephone = COALESCE($4, contact_telephone)
       WHERE contact_id::text = $1
       RETURNING contact_id::text AS id, contact_name AS name, contact_email AS email, contact_telephone AS phone`,
      [req.params.id, name, email, phone]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("PATCH /api/contacts/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `DELETE FROM ${table()} WHERE contact_id::text = $1 RETURNING contact_id::text AS id`,
      [req.params.id]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Contact not found" });
      return;
    }
    res.json({ deleted: true });
  } catch (err) {
    console.error("DELETE /api/contacts/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
