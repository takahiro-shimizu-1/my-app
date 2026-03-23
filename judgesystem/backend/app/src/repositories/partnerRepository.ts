import { pool, TABLES, schemaPrefix } from "../config/database";

export class PartnerRepository {
  async findWithPagination(page: number, pageSize: number) {
    const client = await pool.connect();
    try {
      const offset = page * pageSize;
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM ${schemaPrefix}${TABLES.partners}`
      );
      const total = parseInt(countResult.rows[0].count);
      const result = await client.query(
        `SELECT partner_no::text AS id, partner_no AS no, COALESCE(partner_name, '') AS name, COALESCE(partner_address, '') AS address
         FROM ${schemaPrefix}${TABLES.partners} ORDER BY partner_no DESC LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      );
      return { data: result.rows, total };
    } finally {
      client.release();
    }
  }

  async findById(id: string) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT p.partner_no::text AS id, p.partner_no AS no, COALESCE(p.partner_name, '') AS name,
                COALESCE(p.partner_address, '') AS address, COALESCE(p.partner_telephone, '') AS phone,
                COALESCE(p.partner_email, '') AS email
         FROM ${schemaPrefix}${TABLES.partners} p WHERE p.partner_no::text = $1`,
        [id]
      );
      return result.rowCount === 0 ? null : result.rows[0];
    } finally {
      client.release();
    }
  }
}
