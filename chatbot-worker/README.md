# chatbot-worker (Cloudflare Worker)

Multi-tenant website chat assistant backed by the Anthropic API. `dist/index.js` bundles
`@anthropic-ai/sdk` (about 4,500 of its 4,893 lines) plus the app code from `src/leadsPage.ts`
and `src/index.ts`, which are lost.

## What it does
- `POST /api/chat` with JSON `{ siteId, messages }`. Looks up `siteId` in KV (`env.SITES`); the
  stored JSON has `allowedOrigins` (array), `systemPrompt`, and optional `model`. Unknown
  siteId -> 404; Origin not in `allowedOrigins` -> 403. `OPTIONS` handled for CORS.
- Rate limit per `siteId:ip` in KV (`env.RATE_LIMIT`, 60 s window).
- Streams `client.messages.stream({ model: site.model ?? env.DEFAULT_MODEL, system: site.systemPrompt
  + FORMATTING_SUFFIX, ... })` to the browser as `text/plain`.
- Lead capture: the model is told to append `<<<LEAD>>>{json}<<<END>>>`; the worker strips that
  marker from the stream, truncates each field (name, email, phone, company) to 200 chars, and
  stores it in KV (`env.LEADS`, key `<siteId>:<ts>:<uuid>`).
- `GET /leads` is a small HTML admin page; `GET /api/leads?siteId=..&secret=..` lists leads for a
  site, gated by a timing-safe compare against `env.ADMIN_SECRET`.

## External services
- `https://api.anthropic.com` via the bundled SDK.

## Bindings and secrets referenced
- KV: `SITES` (site configs), `RATE_LIMIT`, `LEADS`.
- Secrets/vars: `ANTHROPIC_API_KEY`, `ADMIN_SECRET`, `DEFAULT_MODEL`.

No hardcoded credentials in the bundle (the `secret=` at line 4671 is a query-string parameter
name in the admin page, not a value).

Recovered from the live Cloudflare deployment on 2026-10-01. Static assets (env.ASSETS) and the
wrangler binding config are NOT in this folder; export them from the Cloudflare dashboard.
