# Changelog

Dated, newest first. One line per thing that changed in prod, in flags, or in
the repo. Write it at the end of every session.

## 2026-10-29 (daily partner run 8, 06:36 CT)

- Connor sent the ODS reply (Skyler McLain) and the Benson follow-up at
  05:23 CT; the Get Lit follow-up draft is the only one left. PR #22 got a
  fifth commit at 05:29 CT: the outreach sequence is now a two-step soft
  opener (day 0 check-in, day 3 bump, no pitch), demo offer by hand after
  an interested reply. Still unmerged; same deploy order.
- Two new routines created through the Claude app at 05:00 CT ("Morning
  brief" daily 08:23 CT, "Heartbeat" every 3 h) overlap the partner brief
  and the Monday Brief; put to Connor which one to keep.
- D1 unread for the sixth day. Runner: 28 green windows. Lightscout: 57
  checked, 1 email, about 47 pending, no key. No cloud batch. Brief emailed.

## 2026-10-28 (daily partner run 7, 06:36 CT)

- trenches-hq: PR #21 (Vivid Light Show page, guestbook, deploy workflow
  now covers vivid-lightscapes and vivid-leads-worker) merged 2026-10-27
  21:25 CT and both Vivid Workers deployed at 02:26 UTC. PR #22 (restart
  Trenches outreach with a 4-email sequence, hot lead alerts, EMAIL_SENT
  webhook storage, webhook secret moved to a Cloudflare secret, runner
  backoff and varied discovery terms, 350-minute chained prospector
  windows) opened 02:40 UTC, mergeable, not merged. Its deploy order needs
  Connor for the secret, merge, deploys and flags; step 3 is live sending.
- D1 unread for the fifth day (Cloudflare connector). Runner: 24 green
  windows, credit holding. Lightscout: 0 leads, 0 emails, 46 pending.
  Three drafts unsent (ODS 1 day, Get Lit and Benson 6 days). No cloud
  batch. Brief emailed.

## 2026-10-27 (daily partner run 6, 06:36 CT)

- Runner credit restored: run 29 (10:37 UTC) saved leads again. The
  Cloudflare connector is unauthorized account-wide (the Monday Brief
  session reported the same on 10-26), so D1 is unread for a fourth day.
- Skyler McLain (Overhead Door Systems, skylerm@odsinc.net) replied on
  10-26: missed call, will find time. Reply drafted in Gmail (not sent).
  The ODS contact is still NEEDS HUMAN INPUT in the trenches-hq roster.
- Lightscout found 18 emails (about 46 pending upload, no key). Marketplace
  Monitor and Books refresh stopped again on 10-26 for the same reasons as
  10-19. vivid-weekly-social-batch still produced no draft. Both Oct 22
  follow-up drafts still unsent (5 days). No cloud batch. Brief emailed.

## 2026-10-26 (daily partner run 5, 06:36 CT)

- Prospector runner out of Anthropic API credit: run 24 (06:17 UTC) logged
  "Credit balance is too low" on every discovery call (Pest Control
  Eagleville, camp_64a46f5a) and idled to the end of its window; the
  workflow still reports success. The orchestrator is confirmed creating
  new campaigns while the runner heartbeats without working.
- D1 unreadable for the third day (Cloudflare connector). No cloud batch
  today: no campaign can be chosen without D1 and the weekly review called
  the batches make-work.
- vivid-weekly-social-batch left no Gmail draft after its first unattended
  run (Oct 25). Lightscout: Franklin, 1 lead, 0 emails, about 28 pending.
  Both Oct 22 follow-up drafts still unsent (4 days). Brief emailed with one
  ask at the top (credit top-up), per the weekly review.

## 2026-10-25 (first weekly self evaluation, 18:36 CT)

- Wrote docs/reviews/2026-10-25-weekly.md: runner alive (13 green windows),
  partner blind for two days (Cloudflare connector), one of five standing
  asks cleared this week, fenloservices.com runs code not on main (PR #19
  open), discovery loop wastes most of each runner window. Three changes
  and three decisions put to Connor. Daily prompt changes proposed, not yet
  applied.

## 2026-10-25 (daily partner run 4, 06:36 CT)

- D1 unreadable for the second day (Cloudflare connector not authorized).
  Snapshot D1 figures still carry the 2026-10-23 read.
- Prospector runner: runs 10 to 19 all green, each the full 50 minutes,
  about every 5 hours. Log tails show Tree Service Smyrna (run 16) and
  Electrical Smyrna (run 19), campaigns that were not in the Oct 13 backlog,
  so the orchestrator is likely creating campaigns again. Every log ends in
  all-duplicate discovery calls; an exclusion list plus a stop rule is the
  proposed fix (decision put to Connor).
- Brief emailed. 12-row Murfreesboro plumbing shortlist saved to Drive (not
  deduped, campaign unconfirmed, 4 phones). Both Oct 22 follow-up drafts
  still unsent (72 h). Lightscout: 45 checked, 0 emails, about 28 pending,
  no key. Self Evaluation fires tonight 18:36 CT.

## 2026-10-24 (daily partner run 3, 06:36 CT)

- The GitHub Prospector runner is alive: TRENCHES_RUNNER_KEY was added on
  2026-10-23 evening. Runs at 23:10 (manual), 00:44 and 05:56 UTC each used
  the full 50-minute window; Electrical and Fencing Murfreesboro were worked
  and at least 7 leads saved (first new leads since 2026-09-06). Logs show
  discovery calls returning mostly duplicates (0 to 2 new names per call);
  an exclusion list in the discovery prompt is the next fix.
- D1 could not be read this run: the Cloudflare connector lost its
  authorization. Snapshot numbers from D1 are carried from 2026-10-23 and
  marked as such. Connor must reconnect the connector.
- Brief emailed. 11-row Murfreesboro HVAC shortlist saved to Drive (not
  deduped, 6 phones). Both Oct 22 follow-up drafts still unsent. Weekly
  Insights ran 2026-10-23 16:05 CT. Lightscout: 1 lead, about 21 pending
  upload, no key. No OPS_PARTNER_ACTION event written (D1 unavailable).

## 2026-10-23 (daily partner run 2, 06:36 CT)

- Brief emailed. No client or prospect replies in 7 days; the two Oct 22
  follow-up drafts are still unsent. 12-row Murfreesboro roofing shortlist
  saved to Drive (snippet-verified only, 1 phone). Dashboard snapshot
  refreshed (ops-dashboard/snapshot-2026-10-23.json). No flags moved.
- Found: the trenches-hq "Prospector runner" workflow has failed 6 times on
  its hourly schedule since 2026-10-22 07:37 UTC because TRENCHES_RUNNER_KEY
  is empty. PR #20 (The Door Crew proposal and demo site) merged to main
  2026-10-22 18:44 CT by another session and is not deployed; no client
  folder or roster entry exists for The Door Crew.
- Lightscout 10-23 run: email backfill, 87 checked, 7 emails, 27 pending
  upload, still no Smartlead key.
- OPS_PARTNER_ACTION event written to D1 (first one; yesterday's was not).

## 2026-10-22 (first daily partner run, 06:36 CT)

- Brief emailed. Two follow-up drafts left in Gmail (Q-1004, Q-1006 covering
  Q-1005). 7-row Murfreesboro tree-service shortlist saved to Drive
  (directory sites unreachable from the cloud, so snippet-verified only).
  Dashboard snapshot refreshed. No flags moved; the deployed runner guard
  replaces the routine's flag rule, prompt updated accordingly.
- Found "Lightscout Nightly Lead Sweep" (created 2026-10-21 by another
  session, 02:17 CT daily): Vivid B2B prospecting into its own artifact DB.
  Its 10-22 run: 1 lead, about 20 emailed leads pending upload, no Smartlead
  key. The partner no longer does a Vivid batch.
- Still blocked on Connor: TRENCHES_RUNNER_KEY, SMARTLEAD_API_KEY, the
  Smartlead campaign id, the orphan cleanup.


- Prod: `trenches-os-api` deployed again from GitHub Actions at 02:23 UTC
  (run 39711110115, commit 251dac5, includes PR #17 failed-job logging and
  PR #18). Workflow tagged `deploy/trenches-os/2026-10-22-0223`. Live bundle
  (6,079 lines) synced into `trenches-os-api/src/index.js`.

- Decision: GitHub Actions is the only deploy path (Connor). trenches-hq
  `/deploy` skill rewritten to dispatch the workflow; chatbot-widget added;
  `mode=full` for config changes. See DECISIONS.md.
- Requalification: 347 of 361 HUMAN_REVIEW leads re-driven through
  LeadLifecycleWorkflow via `deferred_events` (reason REQUALIFY_2026-10-22),
  25 per cron tick. 14 have no research row and were not eligible. Early
  readout: gap points now land, but validation (confidence under 0.70,
  missing listing evidence, contradictions) keeps most in review; a few
  DISQUALIFIED (modern site found). Final: 347 scored, 342 back to review
  with refreshed reasons, 5 DISQUALIFIED, 0 QUALIFIED. Review, section 12.
- trenches-hq main also took PR #17 (log and count failed prospector jobs),
  not yet deployed.

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
