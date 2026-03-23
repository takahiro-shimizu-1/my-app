import type { FilterParams } from "../../../../shared/types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from "../../../../shared/constants";
import { ValidationError } from "./errors";

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

/**
 * Validate and clamp pagination parameters.
 * Used by routes that don't go through parseFilterParams.
 */
export function parsePagination(query: Record<string, any>): { page: number; pageSize: number } {
  const page = parseInt(String(query.page ?? 0), 10);
  const pageSize = parseInt(String(query.pageSize ?? DEFAULT_PAGE_SIZE), 10);
  return {
    page: isNaN(page) || page < 0 ? DEFAULT_PAGE : page,
    pageSize: isNaN(pageSize) || pageSize < 1 ? DEFAULT_PAGE_SIZE : Math.min(pageSize, 100),
  };
}

/**
 * Validate contact input for create/update operations.
 */
export function validateContactInput(
  body: Record<string, any>,
  isCreate: boolean
): { name?: string; email?: string; phone?: string } {
  if (isCreate && (!body.name || typeof body.name !== 'string' || body.name.trim() === '')) {
    throw new ValidationError('name is required');
  }

  const result: { name?: string; email?: string; phone?: string } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string') throw new ValidationError('name must be a string');
    result.name = body.name.trim();
  }
  if (body.email !== undefined) {
    if (typeof body.email !== 'string') throw new ValidationError('email must be a string');
    result.email = body.email.trim();
  }
  if (body.phone !== undefined) {
    if (typeof body.phone !== 'string') throw new ValidationError('phone must be a string');
    result.phone = body.phone.trim();
  }

  return result;
}
