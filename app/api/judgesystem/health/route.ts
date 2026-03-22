/**
 * GET /api/judgesystem/health
 *
 * Health check endpoint for the judgment system.
 */

import { NextResponse } from "next/server";
import { createDefaultRegistry } from "@/lib/judgesystem/evaluators/registry";

export async function GET() {
  const registry = createDefaultRegistry();

  return NextResponse.json({
    status: "ok",
    system: "judgesystem",
    version: "1.0.0",
    evaluators: registry.getRegisteredTypes(),
    evaluatorCount: registry.getAll().length,
    timestamp: new Date().toISOString(),
  });
}
