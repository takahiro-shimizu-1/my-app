import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  determineAnnouncementStatus,
  normalizeBidType,
} from "../announcementService";

describe("determineAnnouncementStatus", () => {
  let realDate: typeof Date;

  beforeEach(() => {
    realDate = globalThis.Date;
    // Fix "now" to 2025-06-15 00:00:00
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'closed' for null", () => {
    expect(determineAnnouncementStatus(null)).toBe("closed");
  });

  it("returns 'closed' for undefined", () => {
    expect(determineAnnouncementStatus(undefined)).toBe("closed");
  });

  it("returns 'closed' for empty string", () => {
    expect(determineAnnouncementStatus("")).toBe("closed");
  });

  it("returns 'closed' for invalid date format", () => {
    expect(determineAnnouncementStatus("not-a-date")).toBe("closed");
  });

  it("returns 'upcoming' when end date is 14+ days in the future", () => {
    // 2025-06-30 is 15 days after 2025-06-15
    expect(determineAnnouncementStatus("2025-06-30")).toBe("upcoming");
  });

  it("returns 'ongoing' when end date is within 14 days", () => {
    // 2025-06-20 is 5 days after 2025-06-15
    expect(determineAnnouncementStatus("2025-06-20")).toBe("ongoing");
  });

  it("returns 'ongoing' when end date is today", () => {
    expect(determineAnnouncementStatus("2025-06-15")).toBe("ongoing");
  });

  it("returns 'awaiting_result' when end date is in the past", () => {
    expect(determineAnnouncementStatus("2025-06-01")).toBe("awaiting_result");
  });

  it("returns 'upcoming' for exactly 14 days boundary", () => {
    // 2025-06-29 is exactly 14 days after 2025-06-15
    expect(determineAnnouncementStatus("2025-06-29")).toBe("upcoming");
  });

  it("returns 'ongoing' for 13 days in future (just under boundary)", () => {
    // 2025-06-28 is 13 days
    expect(determineAnnouncementStatus("2025-06-28")).toBe("ongoing");
  });
});

describe("normalizeBidType", () => {
  it("returns value when valid", () => {
    expect(normalizeBidType("general-competitive-bidding")).toBe("general-competitive-bidding");
    expect(normalizeBidType("design-competition")).toBe("design-competition");
  });

  it("returns 'unknown' for null", () => {
    expect(normalizeBidType(null)).toBe("unknown");
  });

  it("returns 'unknown' for undefined", () => {
    expect(normalizeBidType(undefined)).toBe("unknown");
  });

  it("returns 'unknown' for empty string", () => {
    expect(normalizeBidType("")).toBe("unknown");
  });

  it("returns 'unknown' for whitespace-only string", () => {
    expect(normalizeBidType("   ")).toBe("unknown");
  });
});
