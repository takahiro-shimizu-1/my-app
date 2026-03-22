import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/evaluations/:id
 *
 * Get a single evaluation by its evaluation number.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // TODO: Wire up to EvaluationService
  return NextResponse.json(
    { error: `Evaluation ${id} not found` },
    { status: 404 }
  );
}

/**
 * PATCH /api/evaluations/:id
 *
 * Update work status of an evaluation.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await request.json();
  const { workStatus, currentStep } = body;

  const validStatuses = ["not_started", "in_progress", "completed"];
  if (!validStatuses.includes(workStatus)) {
    return NextResponse.json(
      { error: `Invalid workStatus. Valid values: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  // TODO: Wire up to EvaluationService
  return NextResponse.json({
    evaluationNo: id,
    workStatus,
    currentStep: currentStep ?? null,
    updatedAt: new Date().toISOString(),
  });
}
