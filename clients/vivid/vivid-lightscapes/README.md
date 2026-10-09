# vivid-lightscapes (Cloudflare Worker)

The vividlightscapes.com marketing site. Worker id `259b8711084f406aaaa3bbeb88713b91`
(from the Cloudflare API on 2026-10-01).

## Status of this folder
`dist/` is empty on purpose. `workers_get_worker_code` returned an empty body for this
worker on two attempts, which is the behaviour for an assets-only Worker (static site served
entirely by the `ASSETS` binding, no JavaScript entrypoint). There is no script to recover.

## What it does
- Serves the static Vivid Lightscapes site. The browser code on that site calls two sibling
  Workers in this directory: `vivid-leads-worker` (`POST /api/lead`, the free-design form) and
  `vivid-chatbot-worker` (`POST /api/chat`). Both allow `https://vividlightscapes.com`,
  `https://www.vividlightscapes.com` and `https://vivid-lightscapes.cmckendry-ai.workers.dev`
  as origins, so this Worker must keep answering on those hostnames.

## Bindings
- `ASSETS` only, as far as can be determined without the wrangler config.

To rebuild this deployment you need the static asset bundle and the routes/custom-domain
settings from the Cloudflare dashboard.

Recovered from the live Cloudflare deployment on 2026-10-01. Static assets (env.ASSETS) and the
wrangler binding config are NOT in this folder; export them from the Cloudflare dashboard.
