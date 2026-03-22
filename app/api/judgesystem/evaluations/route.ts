/**
 * POST /api/judgesystem/evaluations
 *
 * Runs judgment evaluation for a batch of targets.
 * Accepts targets, requirements, and master data in the request body.
 *
 * GET /api/judgesystem/evaluations
 *
 * Returns evaluation results (placeholder for DB-backed implementation).
 */

import { NextRequest, NextResponse } from "next/server";
import { JudgmentEngine } from "@/lib/judgesystem/engine/judgment-engine";
import { createDefaultRegistry } from "@/lib/judgesystem/evaluators/registry";
import type {
  EvaluationTarget,
  Requirement,
  MasterData,
} from "@/lib/judgesystem/domain/types";

const registry = createDefaultRegistry();
const engine = new JudgmentEngine(registry);

interface EvaluationRequest {
  targets: EvaluationTarget[];
  requirements: Requirement[];
  masterData: MasterData;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EvaluationRequest;

    if (!body.targets || !body.requirements || !body.masterData) {
      return NextResponse.json(
        { error: "Missing required fields: targets, requirements, masterData" },
        { status: 400 }
      );
    }

    const result = engine.evaluateBatch(
      body.targets,
      body.requirements,
      body.masterData
    );

    return NextResponse.json({
      totalTargets: result.totalTargets,
      passCount: result.passCount,
      failCount: result.failCount,
      results: result.results.map((r) => ({
        evaluationNo: r.summary.evaluationNo,
        announcementNo: r.summary.announcementNo,
        companyNo: r.summary.companyNo,
        officeNo: r.summary.officeNo,
        finalStatus: r.summary.finalStatus,
        message: r.summary.message,
        deficitRequirementMessage: r.summary.deficitRequirementMessage,
        judgmentCount: r.judgments.length,
        sufficientCount: r.sufficient.length,
        insufficientCount: r.insufficient.length,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Evaluation listing requires database connection. Use POST to run evaluations.",
    registeredEvaluators: registry.getRegisteredTypes(),
  });
}
