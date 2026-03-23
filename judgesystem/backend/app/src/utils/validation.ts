import type { FilterParams } from "../../../../shared/types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "../../../../shared/constants";

/**
 * Parse and validate query parameters into FilterParams.
 * Returns a sanitized FilterParams object, stripping invalid values.
 */
export function parseFilterParams(query: Record<string, any>): FilterParams {
  const params: FilterParams = {};

  // Pagination
  if (query.page !== undefined) {
    const page = parseInt(String(query.page), 10);
    params.page = isNaN(page) || page < 0 ? DEFAULT_PAGE : page;
  }
  if (query.pageSize !== undefined) {
    const pageSize = parseInt(String(query.pageSize), 10);
    params.pageSize =
      isNaN(pageSize) || pageSize < 1 ? DEFAULT_PAGE_SIZE : Math.min(pageSize, 100);
  }

  // Arrays (comma-separated or already arrays)
  const arrayFields = [
    "statuses",
    "workStatuses",
    "priorities",
    "categories",
    "bidTypes",
    "organizations",
    "prefectures",
  ] as const;

  for (const field of arrayFields) {
    const raw = query[field];
    if (raw !== undefined && raw !== "") {
      params[field] = Array.isArray(raw) ? raw : String(raw).split(",");
    }
  }

  // Sort
  if (query.sortField && typeof query.sortField === "string") {
    params.sortField = query.sortField;
  }
  if (query.sortOrder === "asc" || query.sortOrder === "desc") {
    params.sortOrder = query.sortOrder;
  }

  // Search
  if (query.searchQuery && typeof query.searchQuery === "string") {
    params.searchQuery = query.searchQuery.trim();
  }

  // ordererId
  if (query.ordererId && typeof query.ordererId === "string") {
    params.ordererId = query.ordererId;
  }

  return params;
}

/**
 * Validate that a string is a positive integer. Returns the parsed number or null.
 */
export function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const n = parseInt(value, 10);
  return isNaN(n) || n < 0 ? null : n;
}
