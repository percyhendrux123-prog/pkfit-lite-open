import { afterEach, describe, expect, it, vi } from "vitest";
import { captureEmailWithin } from "./leadCapture";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.useRealTimers();
});

describe("captureEmailWithin", () => {
  it("gives up waiting on a request that never settles", async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(() => new Promise<Response>(() => {})) as never;
    const pending = captureEmailWithin({ email: "a@example.com", source: "landing" }, 2500);
    await vi.advanceTimersByTimeAsync(2500);
    await expect(pending).resolves.toEqual({ ok: false, error: "timeout" });
  });

  it("returns the real result when the write is quick", async () => {
    globalThis.fetch = vi.fn(async () => new Response("{}", { status: 200 })) as never;
    await expect(
      captureEmailWithin({ email: "a@example.com", source: "landing" }, 2500),
    ).resolves.toEqual({ ok: true });
  });

  it("reports a failed write without throwing", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("offline");
    }) as never;
    const result = await captureEmailWithin({ email: "a@example.com", source: "landing" }, 2500);
    expect(result.ok).toBe(false);
  });
});
