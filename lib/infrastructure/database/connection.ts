/**
 * Database Connection
 *
 * Manages PostgreSQL connection pooling.
 * Supports configuration via environment variables or explicit params.
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  schema?: string;
  maxConnections?: number;
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.PGHOST ?? "localhost",
    port: parseInt(process.env.PGPORT ?? "5432", 10),
    database: process.env.PGDATABASE ?? "biddb",
    user: process.env.PGUSER ?? "postgres",
    password: process.env.PGPASSWORD ?? "",
    ssl: process.env.PGSSLMODE === "require",
    schema: process.env.PG_SCHEMA ?? "public",
    maxConnections: parseInt(process.env.PG_MAX_CONNECTIONS ?? "20", 10),
  };
}

/**
 * Connection string builder for pg Pool.
 */
export function buildConnectionString(config: DatabaseConfig): string {
  const { host, port, database, user, password, ssl } = config;
  const sslParam = ssl ? "?sslmode=require" : "";
  return `postgresql://${user}:${password}@${host}:${port}/${database}${sslParam}`;
}
