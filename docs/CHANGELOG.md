# Changelog

Dated, newest first. One line per thing that changed in prod, in flags, or in
the repo. Write it at the end of every session.

## 2026-10-01 (later)

- Repo: restructured as a monorepo. API moved to `trenches-os-api/`. Live
  bundles for `trenches-site`, `chatbot-worker`, the three Vivid workers and
  `fenloservices-site` recovered into `<name>/dist/index.js` with READMEs.
  D1 schema exported to `trenches-os-api/migrations/0000_baseline.sql`.
  Added `docs/DECISIONS.md`, `runner/README.md` (placeholder), root
  `README.md`, `.gitignore`, and a manual-only deploy workflow that refuses
  to run until `wrangler.jsonc` is complete.
- Not recovered (needs desktop or dashboard): `runner.py` and its `.env`;
  static assets behind `env.ASSETS` for `trenches-site` and
  `vivid-lightscapes`; binding configs for every worker except the API.
- Prod: no changes. No flags moved.

## 2026-10-01

- Repo: `src/index.js` replaced with the bundle live in production on
  2026-10-01 (5,898 lines; adds `gmail.ts`, `quotes.ts`, `stripe.ts`, the
  `/api/quotes*`, `/api/outreach/concierge/status` and
  `/integrations/stripe/webhook` routes, removes
  `/api/outreach/email/live-reply/oauth/start`). `recovered/` regenerated from
  it. The previous repo bundle (2026-09-28) would have rolled these back.
- Repo: added `CLAUDE.md`, `docs/SYSTEM-MAP.md`, `docs/CHANGELOG.md`,
  `docs/reviews/2026-10-01-operating-review.md`.
- Prod: no changes. No flags moved.
- Still broken: see the review, section 4.

## 2026-09-28

- Repo: first commit, bundle recovered from the live worker.
- Prod: Orgo runner `orgo-trenches-runner-01` last heartbeat 01:52 UTC.
  Windows runner `connor-windows-runner-01` online. 20 campaigns created by
  cron, all failed (Claude OAuth expired on Orgo, OpenAI no credits).

## 2026-09-13

- Prod: outreach orchestrator rewired to Smartlead and paused
  (`OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED=false`, actor CLAUDE_SAFETY_PAUSE).
  Smartlead webhook secret and mailbox flags set. Smartlead trial had ended
  2026-09-12. No Smartlead campaign was ever created. Last Gmail sync.
