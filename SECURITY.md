# Security

## Reporting a problem

Please do not open a public issue for a security problem. Use the repository's private
vulnerability reporting (GitHub: Security tab, "Report a vulnerability") and include the steps to
reproduce it. You will get an acknowledgement, and a fix or a decision, as soon as the maintainers
can manage. This is a volunteer project with no bounty.

## Running it safely

- The calculators run in the browser. Nothing a visitor types into them is sent anywhere.
- The only server code is the optional email capture (`netlify/functions/capture-email.ts`). Its
  Google service account key and Sheet id belong in your host's environment variables only, never
  in the repo or in any `VITE_*` variable.
- If you turn on email capture you are collecting personal data. Tell visitors what you do with
  their email and follow the law that applies to you.
- Share the Google Sheet with the service account only, with no public link.
