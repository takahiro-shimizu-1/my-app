import { describe, it, expect } from "vitest";
import { AppError, ValidationError, NotFoundError, DatabaseError } from "../errors";

describe("AppError", () => {
  it("creates error with default status 500", () => {
    const err = new AppError("something failed");
    expect(err.message).toBe("something failed");
    expect(err.statusCode).toBe(500);
    expect(err.name).toBe("AppError");
    expect(err).toBeInstanceOf(Error);
  });

  it("creates error with custom status and code", () => {
    const err = new AppError("bad request", 400, "BAD_REQUEST");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
  });
});

describe("ValidationError", () => {
  it("has status 400", () => {
    const err = new ValidationError("invalid input");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.name).toBe("ValidationError");
    expect(err).toBeInstanceOf(AppError);
  });
});

describe("NotFoundError", () => {
  it("has status 404 and formatted message", () => {
    const err = new NotFoundError("Evaluation");
    expect(err.message).toBe("Evaluation not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
  });
});

describe("DatabaseError", () => {
  it("has status 503 with default message", () => {
    const err = new DatabaseError();
    expect(err.message).toBe("Database error");
    expect(err.statusCode).toBe(503);
    expect(err.code).toBe("DATABASE_ERROR");
  });

  it("accepts custom message", () => {
    const err = new DatabaseError("Connection timeout");
    expect(err.message).toBe("Connection timeout");
  });
});
