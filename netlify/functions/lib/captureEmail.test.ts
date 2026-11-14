import { afterEach, describe, expect, it, vi } from "vitest";
import { handler } from "../capture-email";

const KEYS = [
  "GOOGLE_SERVICE_ACCOUNT_EMAIL",
  "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  "GOOGLE_SHEET_ID",
] as const;

afterEach(() => {
  for (const k of KEYS) delete process.env[k];
  vi.restoreAllMocks();
});

async function call(httpMethod: string, body?: unknown) {
  const res = await handler(
    { httpMethod, body: body ? JSON.stringify(body) : null } as never,
    {} as never,
  );
  return res as { statusCode: number; body: string };
}

describe("capture-email when not configured", () => {
  it("tells the app capture is off", async () => {
    const res = await call("GET");
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ configured: false });
  });

  it("answers 501 not configured to a POST and makes no network call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await call("POST", { email: "someone@example.com", source: "landing" });
    expect(res.statusCode).toBe(501);
    expect(res.body).toContain("not configured");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("capture-email when configured", () => {
  it("tells the app capture is on", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "svc@example.com";
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = "placeholder";
    process.env.GOOGLE_SHEET_ID = "placeholder";
    const res = await call("GET");
    expect(JSON.parse(res.body)).toEqual({ configured: true });
  });
});
