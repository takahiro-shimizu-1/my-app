import { pool, TABLES, schemaPrefix } from "../config/database";

export class OrdererRepository {
  async findWithPagination(page: number, pageSize: number) {
    const client = await pool.connect();
    try {
      const offset = page * pageSize;
      const countResult = await client.query(
        `SELECT COUNT(*) as count FROM ${schemaPrefix}${TABLES.orderers}`
      );
      const total = parseInt(countResult.rows[0].count);
      const result = await client.query(
        `SELECT orderer_id::text AS id, COALESCE(orderer_name, '') AS name, COALESCE(orderer_address, '') AS address
         FROM ${schemaPrefix}${TABLES.orderers} ORDER BY orderer_id DESC LIMIT $1 OFFSET $2`,
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
        `SELECT orderer_id::text AS id, COALESCE(orderer_name, '') AS name, COALESCE(orderer_address, '') AS address,
                COALESCE(orderer_telephone, '') AS phone
         FROM ${schemaPrefix}${TABLES.orderers} WHERE orderer_id::text = $1`,
        [id]
      );
      return result.rowCount === 0 ? null : result.rows[0];
    } finally {
      client.release();
    }
  }
}
