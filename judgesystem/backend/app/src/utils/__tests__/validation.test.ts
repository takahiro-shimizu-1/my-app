import { describe, it, expect } from "vitest";
import {
  parseFilterParams,
  parsePositiveInt,
  parsePagination,
  validateContactInput,
} from "../validation";

describe("parseFilterParams", () => {
  it("returns empty params for empty query", () => {
    const result = parseFilterParams({});
    expect(result).toEqual({});
  });

  it("parses page and pageSize", () => {
    const result = parseFilterParams({ page: "2", pageSize: "50" });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(50);
  });

  it("clamps pageSize to max 100", () => {
    const result = parseFilterParams({ pageSize: "999" });
    expect(result.pageSize).toBe(100);
  });

  it("defaults invalid page to 0", () => {
    const result = parseFilterParams({ page: "-1" });
    expect(result.page).toBe(0);
  });

  it("defaults invalid pageSize to 25", () => {
    const result = parseFilterParams({ pageSize: "0" });
    expect(result.pageSize).toBe(25);
  });

  it("parses comma-separated array fields", () => {
    const result = parseFilterParams({
      categories: "建築,土木",
      bidTypes: "general-competitive-bidding",
    });
    expect(result.categories).toEqual(["建築", "土木"]);
    expect(result.bidTypes).toEqual(["general-competitive-bidding"]);
  });

  it("handles already-array fields", () => {
    const result = parseFilterParams({
      categories: ["建築", "土木"],
    });
    expect(result.categories).toEqual(["建築", "土木"]);
  });

  it("ignores empty string arrays", () => {
    const result = parseFilterParams({ categories: "" });
    expect(result.categories).toBeUndefined();
  });

  it("parses sort options", () => {
    const result = parseFilterParams({ sortField: "deadline", sortOrder: "desc" });
    expect(result.sortField).toBe("deadline");
    expect(result.sortOrder).toBe("desc");
  });

  it("ignores invalid sortOrder", () => {
    const result = parseFilterParams({ sortOrder: "invalid" });
    expect(result.sortOrder).toBeUndefined();
  });

  it("parses searchQuery and trims whitespace", () => {
    const result = parseFilterParams({ searchQuery: "  建築工事  " });
    expect(result.searchQuery).toBe("建築工事");
  });

  it("parses ordererId", () => {
    const result = parseFilterParams({ ordererId: "123" });
    expect(result.ordererId).toBe("123");
  });
});

describe("parsePositiveInt", () => {
  it("returns parsed number for valid string", () => {
    expect(parsePositiveInt("42")).toBe(42);
  });

  it("returns 0 for '0'", () => {
    expect(parsePositiveInt("0")).toBe(0);
  });

  it("returns null for undefined", () => {
    expect(parsePositiveInt(undefined)).toBeNull();
  });

  it("returns null for negative", () => {
    expect(parsePositiveInt("-1")).toBeNull();
  });

  it("returns null for non-numeric", () => {
    expect(parsePositiveInt("abc")).toBeNull();
  });
});

describe("parsePagination", () => {
  it("returns defaults for empty query", () => {
    const result = parsePagination({});
    expect(result.page).toBe(0);
    expect(result.pageSize).toBe(25);
  });

  it("parses valid values", () => {
    const result = parsePagination({ page: "3", pageSize: "50" });
    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(50);
  });

  it("clamps pageSize to max 100", () => {
    const result = parsePagination({ pageSize: "500" });
    expect(result.pageSize).toBe(100);
  });

  it("defaults NaN page to 0", () => {
    const result = parsePagination({ page: "abc" });
    expect(result.page).toBe(0);
  });

  it("defaults negative page to 0", () => {
    const result = parsePagination({ page: "-5" });
    expect(result.page).toBe(0);
  });
});

describe("validateContactInput", () => {
  it("requires name on create", () => {
    expect(() => validateContactInput({}, true)).toThrow("name is required");
    expect(() => validateContactInput({ name: "" }, true)).toThrow("name is required");
    expect(() => validateContactInput({ name: "  " }, true)).toThrow("name is required");
  });

  it("accepts valid create input", () => {
    const result = validateContactInput({ name: " John ", email: " john@test.com ", phone: " 090-1234 " }, true);
    expect(result.name).toBe("John");
    expect(result.email).toBe("john@test.com");
    expect(result.phone).toBe("090-1234");
  });

  it("does not require name on update", () => {
    const result = validateContactInput({ email: "new@test.com" }, false);
    expect(result.name).toBeUndefined();
    expect(result.email).toBe("new@test.com");
  });

  it("throws for non-string name", () => {
    expect(() => validateContactInput({ name: 123 }, false)).toThrow("name must be a string");
  });

  it("throws for non-string email", () => {
    expect(() => validateContactInput({ email: 123 }, false)).toThrow("email must be a string");
  });

  it("throws for non-string phone", () => {
    expect(() => validateContactInput({ phone: true }, false)).toThrow("phone must be a string");
  });

  it("returns empty object when no fields provided on update", () => {
    const result = validateContactInput({}, false);
    expect(result).toEqual({});
  });
});
