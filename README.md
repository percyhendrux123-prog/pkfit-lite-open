<p align="center">
  <a href="https://deployaxiom.com"><img src=".github/deploy-axiom-lockup.svg" alt="Deploy Axiom™" width="420"></a>
</p>

# Lite Tools

Three fitness calculators on one page, with fixed formulas and no accounts:

- **Training split selector**: `src/lib/trainingSplit.ts`
- **Macro and meal calculator** (Mifflin-St Jeor): `src/lib/mealPlan.ts`
- **MET-based cardio calorie calculator**: `src/lib/cardioCalc.ts`

The engines are deterministic: the same inputs always give the same output. Nothing is saved
on a server. Results export as an image the visitor saves themselves.

The calculators give general fitness and nutrition education, not medical advice.

## Run

```
npm ci
npm run dev
```

## Test

```
npm test
```

44 tests across the three engines (`trainingSplit.test.ts`, `mealPlan.test.ts`,
`cardioCalc.test.ts`), plus tests for promo links, attribution and the in-app browser check.

## Build

```
npm run build
```

Type-checks (`tsc -b`) and builds the client to `dist/`.

## Deploy

Any static host works for the calculators. `netlify.toml` is set up for Netlify: build command
`npm run build`, publish directory `dist`, functions in `netlify/functions`. Connect the repo
in Netlify and deploy; no environment variables are required.

Optional build settings:

| Variable | What it does |
|---|---|
| `VITE_PRODUCT_NAME` | Name shown in the header. Default "Lite Tools". |
| `VITE_SUPPORT_EMAIL` | Contact address shown in the footer. Hidden when unset. |

## Optional email capture

Off by default: with nothing set, the tools open straight away. Turn it on by setting all three
in your host's environment variables (never in the repo):

| Variable | Value |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | the service account's `client_email` |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | the service account's `private_key`, with literal `\n` (the code un-escapes them) |
| `GOOGLE_SHEET_ID` | the id from the Sheet's URL, between `/d/` and `/edit` |

Then visitors enter an email first, and `capture-email` appends one row (`email | source |
captured_at`) to the Sheet. If the Sheet write fails, the visitor still gets the tools. With the
variables unset, `capture-email` answers "not configured" and the app skips the step.

Setup: in Google Cloud, enable the Google Sheets API, create a service account, download a JSON
key, then share the Sheet with the service account's email as Editor.

## Fonts

Anton, Bebas Neue and DM Mono are self-hosted in `public/fonts` under the SIL Open Font License
1.1; see `public/fonts/OFL.txt`.

## Licence

Code: MIT, see `LICENSE`. Names and marks are not licensed; see `TRADEMARKS.md`.

---

Built by [Deploy Axiom™](https://deployaxiom.com). The code is MIT licensed. The Deploy Axiom name and logo are trademarks of Deploy Axiom LLC and are not covered by the licence; see [TRADEMARKS.md](TRADEMARKS.md).
