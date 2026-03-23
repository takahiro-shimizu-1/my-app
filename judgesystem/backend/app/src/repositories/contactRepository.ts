import { pool, TABLES, schemaPrefix } from "../config/database";

const table = () => `${schemaPrefix}${TABLES.contacts}`;

export class ContactRepository {
  async findAll() {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT contact_id::text AS id, COALESCE(contact_name, '') AS name,
                COALESCE(contact_email, '') AS email, COALESCE(contact_telephone, '') AS phone
         FROM ${table()} ORDER BY contact_id DESC`
      );
      return result.rows;
    } finally {
      client.release();
    }
  }

  async findById(id: string) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT contact_id::text AS id, COALESCE(contact_name, '') AS name,
                COALESCE(contact_email, '') AS email, COALESCE(contact_telephone, '') AS phone
         FROM ${table()} WHERE contact_id = $1::integer`,
        [id]
      );
      return result.rowCount === 0 ? null : result.rows[0];
    } finally {
      client.release();
    }
  }

  async create(name: string, email: string, phone: string) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO ${table()} (contact_name, contact_email, contact_telephone)
         VALUES ($1, $2, $3)
         RETURNING contact_id::text AS id, contact_name AS name, contact_email AS email, contact_telephone AS phone`,
        [name, email, phone]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  }

  async update(id: string, name?: string, email?: string, phone?: string) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `UPDATE ${table()}
         SET contact_name = COALESCE($2, contact_name),
             contact_email = COALESCE($3, contact_email),
             contact_telephone = COALESCE($4, contact_telephone)
         WHERE contact_id = $1::integer
         RETURNING contact_id::text AS id, contact_name AS name, contact_email AS email, contact_telephone AS phone`,
        [id, name, email, phone]
      );
      return result.rowCount === 0 ? null : result.rows[0];
    } finally {
      client.release();
    }
  }

  async delete(id: string) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `DELETE FROM ${table()} WHERE contact_id = $1::integer RETURNING contact_id::text AS id`,
        [id]
      );
      return result.rowCount === 0 ? null : result.rows[0];
    } finally {
      client.release();
    }
  }
}
