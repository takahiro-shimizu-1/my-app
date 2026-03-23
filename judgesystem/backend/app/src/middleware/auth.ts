import crypto from "crypto";
import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/**
 * API Key authentication middleware.
 * - Reads expected key from API_KEY env var
 * - Skips auth for public routes (/, /health)
 * - When API_KEY is set: requires Authorization: Bearer <key> on all routes
 * - When API_KEY is not set: allows GET requests without auth (dev mode),
 *   but blocks write operations (POST/PATCH/PUT/DELETE)
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for public endpoints
  if (req.path === "/" || req.path === "/health") {
    return next();
  }

  const apiKey = env.API_KEY;
  const isWriteOperation = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method);

  // If no API_KEY configured: dev mode
  // Allow GETs, block writes
  if (!apiKey) {
    if (isWriteOperation) {
      res.status(403).json({
        error: "Write operations require API_KEY to be configured",
        code: "AUTH_NOT_CONFIGURED",
      });
      return;
    }
    return next();
  }

  // API_KEY is configured: validate the bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Authorization header required (Bearer <api-key>)",
      code: "UNAUTHORIZED",
    });
    return;
  }

  const token = authHeader.substring(7);
  const tokenBuf = Buffer.from(token);
  const apiKeyBuf = Buffer.from(apiKey);
  if (tokenBuf.length !== apiKeyBuf.length || !crypto.timingSafeEqual(tokenBuf, apiKeyBuf)) {
    res.status(401).json({
      error: "Invalid API key",
      code: "UNAUTHORIZED",
    });
    return;
  }

  next();
}
