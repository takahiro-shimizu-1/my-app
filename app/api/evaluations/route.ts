import { NextRequest, NextResponse } from "next/server";
import type { FilterParams } from "@/lib/domain/types";

/**
 * GET /api/evaluations
 *
 * List evaluations with filtering, sorting, and pagination.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const filters: FilterParams = {
    page: parseInt(searchParams.get("page") ?? "0", 10),
    pageSize: parseInt(searchParams.get("pageSize") ?? "25", 10),
    statuses: searchParams.getAll("status").length > 0
      ? searchParams.getAll("status") as FilterParams["statuses"]
      : undefined,
    workStatuses: searchParams.getAll("workStatus").length > 0
      ? searchParams.getAll("workStatus") as FilterParams["workStatuses"]
      : undefined,
    priorities: searchParams.getAll("priority").length > 0
      ? searchParams.getAll("priority") as FilterParams["priorities"]
      : undefined,
    categories: searchParams.getAll("category").length > 0
      ? searchParams.getAll("category")
      : undefined,
    bidTypes: searchParams.getAll("bidType").length > 0
      ? searchParams.getAll("bidType")
      : undefined,
    organizations: searchParams.getAll("organization").length > 0
      ? searchParams.getAll("organization")
      : undefined,
    prefectures: searchParams.getAll("prefecture").length > 0
      ? searchParams.getAll("prefecture")
      : undefined,
    searchQuery: searchParams.get("q") ?? undefined,
    sortField: searchParams.get("sortField") ?? undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") ?? undefined,
  };

  // TODO: Wire up to EvaluationService once database is configured
  return NextResponse.json({
    data: [],
    total: 0,
    page: filters.page ?? 0,
    pageSize: filters.pageSize ?? 25,
  });
}
