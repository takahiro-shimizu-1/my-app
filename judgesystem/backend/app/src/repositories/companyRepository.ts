import { pool, TABLES, schemaPrefix } from "../config/database";

export class CompanyRepository {
  async findAll() {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT company_no::text AS id, COALESCE(company_name, '') AS name, COALESCE(company_address, '') AS address
         FROM ${schemaPrefix}${TABLES.companyMaster} ORDER BY company_name`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}
