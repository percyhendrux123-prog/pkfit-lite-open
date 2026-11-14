// Netlify Function — optional lead-capture email write.
// Appends one row (email, source, captured_at) to a Google Sheet via the
// Sheets API v4, authenticated as a service account. No database.
//
// Optional. Turned on only when all three are set (see README):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
//   GOOGLE_SHEET_ID
//
// GET answers { configured: true|false } so the app knows whether to show
// the email step. If the vars aren't all set, POST returns 501
// "not configured" and makes no network call.

import type { Handler } from "@netlify/functions";
import { appendLeadRow, getServiceAccountConfig } from "./lib/googleSheets";

type LeadSource =
  | "landing"
  | "program_generator"
  | "meal_plan_generator"
  | "cardio_calculator";

interface CaptureEmailBody {
  email: string;
  source: LeadSource;
}

const VALID_SOURCES: LeadSource[] = [
  "landing",
  "program_generator",
  "meal_plan_generator",
  "cardio_calculator",
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const handler: Handler = async (event) => {
  const config = getServiceAccountConfig();

  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configured: !!config }),
    };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!config) {
    return {
      statusCode: 501,
      body: JSON.stringify({
        error:
          "Email capture not configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, " +
          "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_SHEET_ID. See README.",
      }),
    };
  }

  const payload: Partial<CaptureEmailBody> = event.body
    ? JSON.parse(event.body)
    : {};

  if (!payload.email || !isValidEmail(payload.email)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "A valid email is required." }),
    };
  }

  const source: LeadSource = VALID_SOURCES.includes(
    payload.source as LeadSource,
  )
    ? (payload.source as LeadSource)
    : "landing";

  try {
    await appendLeadRow(config, [
      payload.email,
      source,
      new Date().toISOString(),
    ]);
  } catch (error) {
    console.error("[capture-email] Sheets append failed:", error);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: "Failed to record lead." }),
    };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
