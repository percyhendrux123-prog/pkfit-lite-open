// Google Sheets lead-capture client — real implementation, gated behind
// service-account env vars. No googleapis/google-auth-library dependency:
// this signs a JWT with Node's built-in crypto, exchanges it for an OAuth
// access token, then appends one row via the Sheets API v4 REST endpoint
// directly. Keeps the deploy dependency-light.
//
// Requires three env vars (set in Netlify — never commit these):
//   GOOGLE_SERVICE_ACCOUNT_EMAIL       - service account's client_email
//   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY - service account's private_key
//   GOOGLE_SHEET_ID                    - target spreadsheet ID
//
// Setup steps (create service account, share the Sheet with it, etc.) are
// in DEPLOY.md. This file makes zero network calls unless all three env
// vars are present — see getServiceAccountConfig().

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SHEET_RANGE = "Sheet1!A:C"; // email | source | captured_at (UTC ISO)

export interface ServiceAccountConfig {
  clientEmail: string;
  privateKey: string;
  sheetId: string;
}

// GOOGLE_SHEET_ID may hold the bare id or the whole Sheet URL
// (https://docs.google.com/spreadsheets/d/<id>/edit...). Pasting the URL is
// an easy mistake, and with it the append call hits a 404, so accept both.
export function normaliseSheetId(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : trimmed;
}

export function getServiceAccountConfig(): ServiceAccountConfig | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const sheetId = normaliseSheetId(process.env.GOOGLE_SHEET_ID ?? "");

  if (!clientEmail || !privateKeyRaw || !sheetId) {
    return null;
  }

  return {
    clientEmail,
    // Env vars are stored single-line with literal "\n" sequences; the
    // real PEM key needs real newlines before it can be used to sign.
    privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
    sheetId,
  };
}

function base64url(input: Buffer | string): string {
  return (Buffer.isBuffer(input) ? input : Buffer.from(input))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function getAccessToken(config: ServiceAccountConfig): Promise<string> {
  const { createSign } = await import("node:crypto");

  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: config.clientEmail,
    scope: SHEETS_SCOPE,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(claims),
  )}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = base64url(signer.sign(config.privateKey));
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Google token exchange returned no access_token");
  }
  return data.access_token;
}

export async function appendLeadRow(
  config: ServiceAccountConfig,
  row: [email: string, source: string, capturedAtIso: string],
): Promise<void> {
  const accessToken = await getAccessToken(config);

  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}` +
    `/values/${encodeURIComponent(SHEET_RANGE)}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Sheets append failed: ${response.status} ${body}`);
  }
}
