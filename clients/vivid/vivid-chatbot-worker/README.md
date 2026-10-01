# vivid-chatbot-worker (Cloudflare Worker)

Website chat assistant for Vivid Lightscapes, backed by Workers AI.

## What it does
- Single route: `POST /api/chat` with JSON `{ siteId: "vivid-lightscapes", messages: [...] }`.
  `OPTIONS` handled for CORS; anything else 404.
- Allowed origins: `https://vividlightscapes.com`, `https://www.vividlightscapes.com`,
  `https://vivid-lightscapes.cmckendry-ai.workers.dev`. Other origins get 403.
- Rate limit: 60 requests per IP per UTC day, counted in KV (`env.RATE_LIMIT`, key `rl:<ip>:<date>`).
- Prepends a hardcoded system prompt (business facts, products, tone) and runs
  `@cf/meta/llama-3.1-8b-instruct-fp8` through `env.AI` with streaming; the SSE stream is
  converted to plain text for the browser.
- Every conversation is logged to KV (`env.LEADS`, key `lead:<siteId>:<ts>:<rand>`, 180-day TTL).

## Bindings referenced
- `AI` (Workers AI), `RATE_LIMIT` (KV), `LEADS` (KV).
- No secrets. Note the system prompt lives in code, so prompt edits require a redeploy.

No hardcoded credentials in the bundle.

Recovered from the live Cloudflare deployment on 2026-10-01. Static assets (env.ASSETS) and the
wrangler binding config are NOT in this folder; export them from the Cloudflare dashboard.
