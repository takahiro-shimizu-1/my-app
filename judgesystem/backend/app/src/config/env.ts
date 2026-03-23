/**
 * Environment variable validation and type-safe access.
 * Validates on import — server fails fast if config is invalid.
 */

interface EnvConfig {
  PORT: number;
  CORS_ORIGIN: string;
  DATABASE_URL: string | undefined;
  PGHOST: string;
  PGPORT: number;
  PGDATABASE: string;
  PGUSER: string;
  PGPASSWORD: string | undefined;
  PGSSLMODE: string;
  PG_SCHEMA: string;
  GCS_BUCKET: string | undefined;
  API_KEY: string | undefined;
}

function parseEnv(): EnvConfig {
  const port = Number(process.env.PORT || "8080");
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: "${process.env.PORT}". Must be a number between 1 and 65535.`);
  }

  const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";

  // Database: either DATABASE_URL or individual PG* vars
  const databaseUrl = process.env.DATABASE_URL;
  const pgHost = process.env.PGHOST ?? "127.0.0.1";
  const pgPort = Number(process.env.PGPORT ?? "5432");
  if (isNaN(pgPort)) {
    throw new Error(`Invalid PGPORT: "${process.env.PGPORT}". Must be a number.`);
  }

  return {
    PORT: port,
    CORS_ORIGIN: corsOrigin,
    DATABASE_URL: databaseUrl,
    PGHOST: pgHost,
    PGPORT: pgPort,
    PGDATABASE: process.env.PGDATABASE ?? "postgres",
    PGUSER: process.env.PGUSER ?? "postgres",
    PGPASSWORD: process.env.PGPASSWORD,
    PGSSLMODE: (process.env.PGSSLMODE ?? process.env.PGSSL ?? "").toLowerCase(),
    PG_SCHEMA: process.env.PG_SCHEMA ?? "",
    GCS_BUCKET: process.env.GCS_BUCKET,
    API_KEY: process.env.API_KEY,
  };
}

export const env = parseEnv();
