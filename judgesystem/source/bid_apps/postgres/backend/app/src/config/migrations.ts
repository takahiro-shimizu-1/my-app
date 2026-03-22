import * as fs from "fs";
import * as path from "path";
import { pool, schemaPrefix } from "./database";

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${schemaPrefix}schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(): Promise<Set<string>> {
  const { rows } = await pool.query(
    `SELECT filename FROM ${schemaPrefix}schema_migrations ORDER BY id`
  );
  return new Set(rows.map((r: { filename: string }) => r.filename));
}

export async function runMigrations(): Promise<void> {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        `INSERT INTO ${schemaPrefix}schema_migrations (filename) VALUES ($1)`,
        [file]
      );
      await client.query("COMMIT");
      console.log(`Migration applied: ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`Migration failed: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}
