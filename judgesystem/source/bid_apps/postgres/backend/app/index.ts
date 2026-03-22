import express from "express";
import cors from "cors";
import compression from "compression";
import {
  EvaluationController,
  AnnouncementController,
  PartnerController,
  OrdererController,
  ContactController,
  CompanyController,
} from "./src/controllers";
import { pool } from "./src/config/database";
import { runMigrations } from "./src/config/migrations";

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["*"],
  credentials: false
}));

app.options("*", cors());

// gzip圧縮を有効化
app.use(compression());

// Middleware to parse JSON body (must be before routes)
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

// Root path
app.get("/", (req, res) => {
  res.send("Backend API is running");
});

// Health check endpoint
app.get("/health", async (req, res) => {
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

// Initialize controllers
const evaluationController = new EvaluationController();
const announcementController = new AnnouncementController();
const partnerController = new PartnerController();
const ordererController = new OrdererController();
const contactController = new ContactController();
const companyController = new CompanyController();

// Evaluation routes
app.get("/api/evaluations/stats", evaluationController.getStats);
app.get("/api/evaluations/status-counts", evaluationController.getStatusCounts);
app.get("/api/evaluations", evaluationController.getList);
app.get("/api/evaluations/:id", evaluationController.getById);
app.patch("/api/evaluations/:evaluationNo", evaluationController.updateWorkStatus);
app.get("/api/evaluations/:evaluationNo/assignees", evaluationController.getAssignees);
app.put("/api/evaluations/:evaluationNo/assignees", evaluationController.updateAssignee);

// Announcement routes
app.get("/api/announcements", announcementController.getList);
app.get("/api/announcements/:announcementNo", announcementController.getByNo);
app.get("/api/announcements/:announcementNo/progressing-companies", announcementController.getProgressingCompanies);
app.get("/api/announcements/:announcementNo/similar-cases", announcementController.getSimilarCases);
app.get("/api/announcements/:announcementNo/documents/:documentId/preview", announcementController.getDocumentPreview);

// Partner routes
app.get("/api/partners", partnerController.getList);
app.get("/api/partners/:id", partnerController.getById);

// Orderer routes
app.get("/api/orderers", ordererController.getList);
app.get("/api/orderers/:id", ordererController.getById);

// Contact routes
app.get("/api/contacts", contactController.getList);
app.get("/api/contacts/:id", contactController.getById);
app.post("/api/contacts", contactController.create);
app.patch("/api/contacts/:id", contactController.update);
app.delete("/api/contacts/:id", contactController.delete);

// Company routes
app.get("/api/companies", companyController.getList);

// Cloud Run は PORT 環境変数を使う
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
