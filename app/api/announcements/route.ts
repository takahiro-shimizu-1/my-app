import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/announcements
 *
 * List bid announcements with pagination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page = parseInt(searchParams.get("page") ?? "0", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "25", 10);

  // TODO: Wire up to AnnouncementRepository
  return NextResponse.json({
    data: [],
    total: 0,
    page,
    pageSize,
  });
}
