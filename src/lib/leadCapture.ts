// Lead-capture client interface. Talks to netlify/functions/capture-email.ts.
// Failures are reported back, never thrown, so the UI can carry on.

export type LeadSource =
  | "landing"
  | "program_generator"
  | "meal_plan_generator"
  | "cardio_calculator";

export interface CaptureEmailRequest {
  email: string;
  source: LeadSource;
}

export interface CaptureEmailResult {
  ok: boolean;
  error?: string;
}

// Email capture is optional. The server answers GET with
// { configured: true } only when the three Google env vars are set; any
// other answer (including no server, as under `vite dev`) means "skip the
// email step and open the tools".
export async function isCaptureConfigured(): Promise<boolean> {
  try {
    const response = await fetch("/api/capture-email", { method: "GET" });
    if (!response.ok) return false;
    const data = (await response.json().catch(() => ({}))) as {
      configured?: unknown;
    };
    return data.configured === true;
  } catch {
    return false;
  }
}

export async function captureEmail(
  request: CaptureEmailRequest,
): Promise<CaptureEmailResult> {
  try {
    const response = await fetch("/api/capture-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      keepalive: true,
    });
    if (!response.ok) {
      return { ok: false, error: "Email capture is not configured." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Email capture is not reachable." };
  }
}

// Same as captureEmail, but never waits longer than `ms`. On timeout it
// reports { ok: false, error: "timeout" }; the request itself carries on.
export function captureEmailWithin(
  request: CaptureEmailRequest,
  ms: number,
): Promise<CaptureEmailResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: "timeout" }), ms);
    void captureEmail(request).then((result) => {
      clearTimeout(timer);
      resolve(result);
    });
  });
}
