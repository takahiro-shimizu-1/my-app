import { describe, it, expect } from "vitest";
import {
  determineEvaluationStatus,
  defaultWorkStatus,
  defaultCurrentStep,
  defaultPriority,
  validateWorkStatus,
  validateCurrentStep,
} from "../evaluationService";

describe("determineEvaluationStatus", () => {
  it("returns 'all_met' when final_status is true", () => {
    expect(
      determineEvaluationStatus({
        final_status: true,
        requirement_ineligibility: false,
        requirement_grade_item: false,
        requirement_location: false,
        requirement_experience: false,
        requirement_technician: false,
        requirement_other: false,
      })
    ).toBe("all_met");
  });

  it("returns 'other_only_unmet' when all requirements met except other", () => {
    expect(
      determineEvaluationStatus({
        final_status: false,
        requirement_ineligibility: true,
        requirement_grade_item: true,
        requirement_location: true,
        requirement_experience: true,
        requirement_technician: true,
        requirement_other: false,
      })
    ).toBe("other_only_unmet");
  });

  it("returns 'unmet' when any core requirement is not met", () => {
    expect(
      determineEvaluationStatus({
        final_status: false,
        requirement_ineligibility: true,
        requirement_grade_item: false,
        requirement_location: true,
        requirement_experience: true,
        requirement_technician: true,
        requirement_other: false,
      })
    ).toBe("unmet");
  });

  it("returns 'unmet' when all requirements met including other", () => {
    expect(
      determineEvaluationStatus({
        final_status: false,
        requirement_ineligibility: true,
        requirement_grade_item: true,
        requirement_location: true,
        requirement_experience: true,
        requirement_technician: true,
        requirement_other: true,
      })
    ).toBe("unmet");
  });

  it("returns 'unmet' when all fields are false/undefined", () => {
    expect(determineEvaluationStatus({})).toBe("unmet");
  });

  it("final_status takes priority over other requirements", () => {
    expect(
      determineEvaluationStatus({
        final_status: true,
        requirement_ineligibility: false,
        requirement_grade_item: false,
        requirement_location: false,
        requirement_experience: false,
        requirement_technician: false,
        requirement_other: true,
      })
    ).toBe("all_met");
  });
});

describe("defaultWorkStatus", () => {
  it("returns value when valid", () => {
    expect(defaultWorkStatus("in_progress")).toBe("in_progress");
    expect(defaultWorkStatus("completed")).toBe("completed");
  });

  it("returns 'not_started' for null", () => {
    expect(defaultWorkStatus(null)).toBe("not_started");
  });

  it("returns 'not_started' for undefined", () => {
    expect(defaultWorkStatus(undefined)).toBe("not_started");
  });

  it("returns 'not_started' for empty string", () => {
    expect(defaultWorkStatus("")).toBe("not_started");
  });
});

describe("defaultCurrentStep", () => {
  it("returns value when valid", () => {
    expect(defaultCurrentStep("document_review")).toBe("document_review");
  });

  it("returns 'judgment' for null", () => {
    expect(defaultCurrentStep(null)).toBe("judgment");
  });

  it("returns 'judgment' for undefined", () => {
    expect(defaultCurrentStep(undefined)).toBe("judgment");
  });

  it("returns 'judgment' for empty string", () => {
    expect(defaultCurrentStep("")).toBe("judgment");
  });
});

describe("defaultPriority", () => {
  it("returns value when provided", () => {
    expect(defaultPriority(3)).toBe(3);
    expect(defaultPriority(0)).toBe(0);
  });

  it("returns 1 for null", () => {
    expect(defaultPriority(null)).toBe(1);
  });

  it("returns 1 for undefined", () => {
    expect(defaultPriority(undefined)).toBe(1);
  });
});

describe("validateWorkStatus", () => {
  it("accepts valid statuses", () => {
    expect(() => validateWorkStatus("not_started")).not.toThrow();
    expect(() => validateWorkStatus("in_progress")).not.toThrow();
    expect(() => validateWorkStatus("completed")).not.toThrow();
    expect(() => validateWorkStatus("on_hold")).not.toThrow();
    expect(() => validateWorkStatus("cancelled")).not.toThrow();
  });

  it("rejects invalid status", () => {
    expect(() => validateWorkStatus("invalid")).toThrow(/Invalid workStatus/);
    expect(() => validateWorkStatus("")).toThrow(/Invalid workStatus/);
  });
});

describe("validateCurrentStep", () => {
  it("accepts valid steps", () => {
    expect(() => validateCurrentStep("judgment")).not.toThrow();
    expect(() => validateCurrentStep("document_review")).not.toThrow();
    expect(() => validateCurrentStep("field_survey")).not.toThrow();
    expect(() => validateCurrentStep("final_review")).not.toThrow();
  });

  it("rejects invalid step", () => {
    expect(() => validateCurrentStep("invalid")).toThrow(/Invalid currentStep/);
    expect(() => validateCurrentStep("")).toThrow(/Invalid currentStep/);
  });
});
