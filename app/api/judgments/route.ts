import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/judgments
 *
 * Trigger judgment processing for an announcement.
 * Accepts company/office combinations and enqueues the judgment job.
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { announcementNo, companyOffices } = body;

  if (!announcementNo || typeof announcementNo !== "string") {
    return NextResponse.json(
      { error: "announcementNo is required" },
      { status: 400 }
    );
  }

  if (!Array.isArray(companyOffices) || companyOffices.length === 0) {
    return NextResponse.json(
      { error: "companyOffices array is required and must not be empty" },
      { status: 400 }
    );
  }

  for (const co of companyOffices) {
    if (!co.companyNo || !co.officeNo) {
      return NextResponse.json(
        { error: "Each companyOffice must have companyNo and officeNo" },
        { status: 400 }
      );
    }
  }

  // TODO: Wire up to JudgmentService.enqueueJudgment()
  const jobId = `job_${Date.now()}`;

  return NextResponse.json(
    {
      jobId,
      status: "pending",
      announcementNo,
      companyOfficeCount: companyOffices.length,
    },
    { status: 202 }
  );
}

/**
 * GET /api/judgments
 *
 * Get judgment job status.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { error: "jobId query parameter is required" },
      { status: 400 }
    );
  }

  // TODO: Wire up to JobQueue.getJob()
  return NextResponse.json(
    { error: `Job ${jobId} not found` },
    { status: 404 }
  );
}
