# Trenches Group monorepo

> **2026-10-22:** the code that deploys lives in `cmckendry-ai/trenches-hq`.
> This repo keeps the operating reviews (`docs/`), the Ops Desk page
> (`ops-dashboard/`), the business partner routine (`business-partner/`) and
> patches prepared for trenches-hq (`patches/`). The worker bundles here are
> recovered copies for reading. Do not deploy from here.

Everything Trenches Group owns and operates, in one place. Start with
`CLAUDE.md`, then `docs/SYSTEM-MAP.md`, then the newest file in `docs/reviews/`.

| Folder | What | Deploys to |
|---|---|---|
| `trenches-os-api/` | Lead pipeline API: D1, cron, queue, workflow, Command Center at `/admin`. Source of truth is `src/index.js` (the live bundle). | Worker `trenches-os-api` |
| `trenches-site/` | trenchesgroup.com: static site, member portal, estimates, Stripe, uploads. `dist/index.js` is the live bundle; static assets are not here yet. | Worker `trenches-site` |
| `chatbot-worker/` | Anthropic-powered site chatbot with a `/leads` admin page, meant to be embedded on client sites. | Worker `chatbot-worker` |
| `runner/` | The Python runner that does discovery, enrichment and demo builds through the Claude Code CLI. **Not yet committed; lives on the Windows PC.** | Your PC |
| `clients/vivid/` | Vivid Lightscapes site, lead form worker, chatbot worker. Candidate for its own repo (`cmckendry-ai/Vivid`, currently empty). | 3 Workers |
| `clients/fenlo/` | Fenlo Services site. | Worker `fenloservices-site` |
| `docs/` | System map, reviews, changelog, decisions. | |

Rules: nothing reaches production except from a commit. Every session ends
with a push. Prod is diffed before prod is edited. See `CLAUDE.md`.
