import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We test the middleware by importing it and passing mock req/res/next
// Need to handle process.env.API_KEY

describe("authMiddleware", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const mockReq = (overrides: any = {}) => ({
    path: "/api/evaluations",
    method: "GET",
    headers: {},
    ...overrides,
  });

  const mockRes = () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  it("skips auth for / path", async () => {
    const mod = await import("../auth");
    const req = mockReq({ path: "/" });
    const res = mockRes();
    const next = vi.fn();
    mod.authMiddleware(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it("skips auth for /health path", async () => {
    const mod = await import("../auth");
    const req = mockReq({ path: "/health" });
    const res = mockRes();
    const next = vi.fn();
    mod.authMiddleware(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it("allows GET without API_KEY (dev mode)", async () => {
    delete process.env.API_KEY;
    const mod = await import("../auth");
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    const next = vi.fn();
    mod.authMiddleware(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it("blocks POST without API_KEY configured", async () => {
    delete process.env.API_KEY;
    const mod = await import("../auth");
    const req = mockReq({ method: "POST" });
    const res = mockRes();
    const next = vi.fn();
    mod.authMiddleware(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("requires auth header when API_KEY is set", async () => {
    process.env.API_KEY = "test-key-123";
    const mod = await import("../auth");
    const req = mockReq({ method: "GET" });
    const res = mockRes();
    const next = vi.fn();
    mod.authMiddleware(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("accepts valid bearer token", async () => {
    process.env.API_KEY = "test-key-123";
    const mod = await import("../auth");
    const req = mockReq({
      method: "GET",
      headers: { authorization: "Bearer test-key-123" },
    });
    const res = mockRes();
    const next = vi.fn();
    mod.authMiddleware(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it("rejects invalid bearer token", async () => {
    process.env.API_KEY = "test-key-123";
    const mod = await import("../auth");
    const req = mockReq({
      method: "GET",
      headers: { authorization: "Bearer wrong-key" },
    });
    const res = mockRes();
    const next = vi.fn();
    mod.authMiddleware(req as any, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
