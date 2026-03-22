import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/announcements/:announcementNo
 *
 * Get a single announcement by its number.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ announcementNo: string }> }
) {
  const { announcementNo } = await params;

  // TODO: Wire up to AnnouncementRepository
  return NextResponse.json(
    { error: `Announcement ${announcementNo} not found` },
    { status: 404 }
  );
}
