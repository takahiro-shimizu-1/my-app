import { Pool, PoolConfig } from "pg";
import { env } from "./env";
import { logger } from "../utils/logger";

const buildPoolConfig = (): PoolConfig => {
  const config: PoolConfig = env.DATABASE_URL
    ? { connectionString: env.DATABASE_URL }
    : {
        host: env.PGHOST,
        port: env.PGPORT,
        database: env.PGDATABASE,
        user: env.PGUSER,
        password: env.PGPASSWORD,
      };

  if (env.PGSSLMODE === "require" || env.PGSSLMODE === "true") {
    config.ssl = {
      rejectUnauthorized:
        (process.env.PGSSL_REJECT_UNAUTHORIZED ?? "false").toLowerCase() === "true",
    };
  }

  config.connectionTimeoutMillis = 10000; // 10 seconds
  config.idleTimeoutMillis = 30000; // 30 seconds

  return config;
};

export const pool = new Pool(buildPoolConfig());

pool.on("error", (err) => {
  logger.error("PostgreSQL pool error", { error: err.message });
});

export const TABLES = {
  orderers: "bid_orderers",
  contacts: "workflow_contacts",
  partners: "partners_master",
  partnerCategories: "partners_categories",
  partnerPastProjects: "partners_past_projects",
  partnerBranches: "partners_branches",
  partnerQualificationsUnified: "partners_qualifications_unified",
  partnerQualificationsOrderers: "partners_qualifications_orderers",
  partnerQualificationsOrdererItems: "partners_qualifications_orderer_items",
  evaluationStatuses: "backend_evaluation_statuses",
  evaluationAssignees: "evaluation_assignees",
  companyMaster: "company_master",
  officeMaster: "office_master",
} as const;

export const schemaPrefix = env.PG_SCHEMA ? `${env.PG_SCHEMA}.` : "";
