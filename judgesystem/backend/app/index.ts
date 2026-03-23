import express from "express";
import cors from "cors";
import compression from "compression";
import { env } from "./src/config/env";
import { pool } from "./src/config/database";
import { runMigrations } from "./src/config/migrations";
import {
  evaluationRoutes,
  announcementRoutes,
  partnerRoutes,
  ordererRoutes,
  contactRoutes,
  companyRoutes,
} from "./src/routes";
import { errorHandler } from "./src/middleware/errorHandler";
import { authMiddleware } from "./src/middleware/auth";
import { logger } from "./src/utils/logger";

const app = express();

app.use(cors({
  origin: env.CORS_ORIGIN,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

app.options("*", cors());
app.use(compression());
app.use(express.json());

// Authentication
app.use(authMiddleware);

// Request logging middleware
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const start = Date.now();
  res.on("finish", () => {
    logger.info("request", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start,
    });
  });
  next();
});

// Root & health
app.get("/", (_req, res) => {
  res.send("Backend API is running");
});

app.get("/health", async (_req, res) => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: "connected"
    });
  } catch {
    res.status(503).json({ status: "unhealthy", database: "disconnected" });
  }
});

// Domain routes
app.use("/api/evaluations", evaluationRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/partners", partnerRoutes);
app.use("/api/orderers", ordererRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/companies", companyRoutes);

// Error handler (must be after all routes)
app.use(errorHandler);

// Start server
const port = env.PORT;

(async () => {
  try {
    await runMigrations();
  } catch (err) {
    logger.error("Migration failed, starting server anyway", { error: String(err) });
  }

  const server = app.listen(port, () => {
    logger.info("API server running", { port });
  });

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      logger.info("Shutting down gracefully", { signal });
      server.close(() => {
        pool.end().then(() => process.exit(0));
      });
    });
  }
})();
