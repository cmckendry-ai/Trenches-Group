# Changelog

Dated, newest first. One line per thing that changed in prod, in flags, or in
the repo. Write it at the end of every session.

## 2026-10-22 (deploys)

- Decision: Smartlead is the Trenches outreach channel (Connor). See DECISIONS.md.
- trenches-hq: PR #15 merged (runner guard, Actions prospector runner, demo
  quote escaping, checkout GET to POST, Stripe signature age check, /upload
  limits, GitHub deploy workflow). PR #16 merged (deploy verify accepts a
  DEGRADED /health).
- Prod: `trenches-os-api` deployed from GitHub Actions at 01:40 UTC, version
  `06f3b688`, commit 0782259. Previous version `3277e13b` had been deployed
  from the desktop at 00:06 UTC (the PR #14 scorer fix). `/health` answers
  503 DEGRADED by design (361 leads in HUMAN_REVIEW over 48 h); the cron
  lease updated at 01:42 UTC on the new version.
- Prod: `trenches-site` deployed from GitHub Actions at 01:43 UTC, commit
  0782259 (run 39707290569 succeeded). Live bundle carries the /upload
  limits and the Stripe timestamp check.
- Repo: both bundles re-synced into `trenches-os-api/src/index.js`
  (6,050 lines) and `trenches-site/dist/index.js` (23,806 lines);
  `recovered/` regenerated.
- claude.ai: weekly scheduled task "Trenches Self Evaluation" created
  (Sunday 18:36 CT, `trig_01TZAtk3yYH2bQ6yUSwhQbd7`), bound to the partner
  session. Prompt in `business-partner/SELF-EVALUATION-PROMPT.md`.
- Flags: none moved. Still off: OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED
  (needs a Smartlead campaign id first). Runner still offline until
  TRENCHES_RUNNER_KEY is added and the Actions runner is started.

## 2026-10-22 (later)

- trenches-hq: pushed branch `claude/orchestrator-guard-scorer-fix` (700acb4):
  runner guard in `prospector-jobs.ts`, Actions prospector runner workflow,
  demo quote escaping, checkout GET to POST, Stripe signature age check,
  `/upload` limits. Not merged, not deployed. Scorer fix was already merged
  as trenches-hq PR #14.
- Prod D1: 75 dead-campaign candidates set FAILED, 3 FAILED demo jobs set
  CANCELLED. Sequences, failed-campaign archive and test drafts still open
  (permission guard); SQL in the review, section 10.
- Dashboard snapshot updated. Review section 10 added (fixes, cleanup,
  routine findings, full session list).
- Flags: none moved.

## 2026-10-22

- Found: the code that deploys lives in `cmckendry-ai/trenches-hq` (created
  2026-10-10, TypeScript source, agents, skills, client logs). This repo had
  not been pushed since 2026-10-09. See `docs/DECISIONS.md` 2026-10-22.
- Repo: `trenches-os-api/src/index.js` and `recovered/` synced to the bundle
  live on 2026-10-13 (6,007 lines: quote optional lines and discounts,
  `/api/quotes/preview`, wider Smartlead event map, `autoReplyMode` removed).
  `trenches-site/dist/index.js` synced to the 2026-10-21 bundle (23,793
  lines: /hq Command Center, portal overhaul, analytics, renewals).
- Repo: `wrangler.jsonc` placeholders filled from trenches-hq (queue
  `trenches-events`, workflow `trenches-lead-lifecycle`, cron `*/2 * * * *`).
  Deploy workflow retired to manual-only with a typed confirmation.
- Repo: added `ops-dashboard/` (Ops Desk page and today's snapshot),
  `business-partner/ROUTINE-PROMPT.md`, `patches/trenches-hq/` (orchestrator
  runner guard, scorer fix, GitHub Actions prospector runner; typecheck and
  preflight pass), `docs/reviews/2026-10-22-operating-review.md`.
- claude.ai: published the Ops Desk
  (https://claude.ai/artifact/XRmBDFou4sMNkTzBpWtWRy) and created the daily
  scheduled task "Trenches Business Partner" (06:36 CT,
  `trig_01N6MkUMur9PQuEBxHS2G3o7`), bound to session
  `session_019R634mVtEgZAVNXziMTcSb` because fresh-session tasks cannot be
  given connectors from this API.
- Prod: no changes. No flags moved. Nothing deployed.
- Still broken: runner offline since 2026-10-03, 20 READY campaigns unclaimed,
  outreach off since 2026-09-13, 3 quotes unviewed, scorer bug, see the review.

## 2026-10-01 (later still)

- Repo: `trenches-os-api/wrangler.jsonc` now declares the `EMAIL` send_email
  binding, a cron trigger block, `migrations_dir`, and observability. Queue
  name, workflow name and cron expression remain `TODO-confirm` because no
  Cloudflare API token is available in this environment to read them.
  `trenches-os-api/scripts/pull-live-config.sh` prints them given a token.
- Repo: the deploy workflow now runs on push to `main` (paths under
  `trenches-os-api/`) and still refuses while placeholders remain.
- Blocked on Connor: add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
  to the Claude cloud environment (for the script) and to the GitHub repo
  Actions secrets (for the deploy). Then one session runs the script, fills
  the three values, and the next push to main deploys.
- Prod: no changes.

## 2026-10-01 (later)

- Repo: restructured as a monorepo. API moved to `trenches-os-api/`. Live
  bundles for `trenches-site`, `chatbot-worker`, two Vivid workers and
  `fenloservices-site` recovered into `<name>/dist/index.js` with READMEs.
  D1 schema exported to `trenches-os-api/migrations/0000_baseline.sql`.
  Added `docs/DECISIONS.md`, `runner/README.md` (placeholder), root
  `README.md`, `.gitignore`, and a manual-only deploy workflow that refuses
  to run until `wrangler.jsonc` is complete.
- Not recovered (needs desktop or dashboard): `runner.py` and its `.env`;
  `vivid-lightscapes` (assets-only worker, the API returns an empty body);
  static assets behind `env.ASSETS` for `trenches-site`; binding configs for every worker except the API.
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
