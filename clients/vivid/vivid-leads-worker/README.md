# vivid-leads-worker (Cloudflare Worker)

Lead-capture endpoint for the Vivid Lightscapes website (vividlightscapes.com).
`dist/index.js` bundles `worker-mailer` (SMTP over `cloudflare:sockets`) plus `src/index.js`.

## What it does
- Single route: `POST /api/lead` (multipart form). `OPTIONS` handled for CORS; anything else 404.
- Allowed origins: `https://vividlightscapes.com`, `https://www.vividlightscapes.com`,
  `https://vivid-lightscapes.cmckendry-ai.workers.dev`. Other origins get 403.
- Required fields: firstName, lastName, phone, email, product, address. Optional: where,
  installDate, lightDir, notes, newsletter, photo (max 10 MB, base64-encoded into the record).
- Writes the lead to KV as `lead:<leadId>` (`env.LEADS`), then sends two emails via Gmail SMTP
  (`smtp.gmail.com:465`, AUTH PLAIN): a notification to `connor@vividlightscapes.com` and
  `mail@vividlightscapes.com` (photo attached), and a confirmation to the submitter.
- Email failures are logged, not surfaced; the response is `{ ok: true, leadId }`.

## Bindings and secrets referenced
- `LEADS` (KV namespace).
- Secrets: `GMAIL_USER`, `GMAIL_APP_PASSWORD`.

No hardcoded credentials in the bundle.

Recovered from the live Cloudflare deployment on 2026-10-01. Static assets (env.ASSETS) and the
wrangler binding config are NOT in this folder; export them from the Cloudflare dashboard.
