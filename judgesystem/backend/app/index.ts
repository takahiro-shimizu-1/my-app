import express from "express";
import cors from "cors";
import compression from "compression";
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

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["*"],
  credentials: false
}));

app.options("*", cors());
app.use(compression());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const start = Date.now();
  res.on("finish", () => {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: Date.now() - start
    }));
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

// Start server
const port = process.env.PORT || 8080;

(async () => {
  try {
    await runMigrations();
  } catch (err) {
    console.error("Migration failed, starting server anyway:", err);
  }

  const server = app.listen(port, () => {
    console.log(`API server running on port ${port}`);
  });

  for (const signal of ["SIGTERM", "SIGINT"] as const) {
    process.on(signal, () => {
      console.log(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        pool.end().then(() => process.exit(0));
      });
    });
  }
})();
