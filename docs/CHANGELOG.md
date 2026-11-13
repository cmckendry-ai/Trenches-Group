# Changelog

Dated, newest first. One line per thing that changed in prod, in flags, or in
the repo. Write it at the end of every session.

## 2026-11-13 (partner, PR 27 vs PR 29 review, on Connor's request)

- Fetched both trenches-hq branches, read the diffs, ran typecheck and
  tests for each in a worktree: PR 27 124 of 124 pass, PR 29 31 of 31 pass.
- Recommendation sent in chat: merge PR 29 (claude/outreach-gates), close
  PR 27. Reasons: PR 29 pushes every existing suppression row to Smartlead
  (PR 27 only syncs opt-outs that happen after deploy), fails closed when
  the sync is behind, refuses unverified emails, and replaces a campaign
  whose copy is stale instead of documenting a manual step. Two fixes before
  merge: rename its migration (PR 24 also uses 0019) and verify the
  add-domain-block-list call against a test address. Nothing merged here.

## 2026-11-12 (daily partner run 22, 06:36 CT)

- Brief emailed first ("Trenches partner brief, November 12"), then the
  dashboard tiles, advice and actions merged (version 30) and
  history/2026-11-12 written. Attention list on the page still the Nov 5 one.
- trenches-hq: seven PRs opened Nov 11 21:53 to 22:07 CT by four sessions:
  23 (portal invites split from estimate links, tokens off the URL, hashed
  sessions), 24 (Stripe webhooks retry safe), 25 (portal links need a
  verified email, confirmation and reset), 26 (tighten Claude permissions,
  deploy gate, site-edit runner), 27 and 29 (two competing enrollment gate
  and Smartlead opt-out sync PRs), 28 (decision cap rule). Nothing deployed.
- GitHub Actions: Prospector runner runs 89 and 90 and both Test apps jobs
  on PRs 23 and 24 failed in under 4 seconds with no runner and no log
  (404). [Likely] the month's Actions minutes are exhausted. Runner runs
  87 and 88 (Nov 11) were normal idle 50-minute windows. Credit out 13 days.
- D1 unread day 20. No client mail. Lightscout Nov 9 to 12 not read.

## 2026-11-11 (daily partner run 21, 06:36 CT)

- Brief emailed first ("Trenches partner brief, November 11"), then the
  dashboard tiles, advice and actions merged (version 29) and
  history/2026-11-11 written. The attention list on the page is still the
  Nov 5 list: its Nov 10 rewrite was held for an approval and lost.
- Found the Claude app routines "Morning brief" and "Heartbeat" auto-paused
  on Nov 10 with reason owner_idle. Nothing from Connor since Oct 29.
- Runner runs 84 to 86 (Nov 10 17:52 UTC to Nov 11 07:17 UTC) idle 50-minute
  windows; no Claude call since Nov 4; credit out 12 days. D1 unread day 19.
  Q-1004 and Q-1005 expired Nov 10 (per Weekly Insights). No client mail.
  PR #22 unchanged 13 days. Lightscout Nov 9 to 11 results not read.
  New decision 5: is Connor away; if so drop to two briefs a week.

## 2026-11-10 (daily partner run 20, 06:36 CT)

- LOST RUNS: Nov 8 (run 18), Nov 8 weekly self evaluation, and Nov 9
  (run 19) all died in session worker restarts before their output; the
  Nov 9 dashboard write was also held for an approval nobody answered. No
  brief went out Nov 6 through Nov 9 and no weekly review was written.
  The Nov 8 snapshot (ops-dashboard/snapshot-2026-11-08.json) is committed
  here; it is the last state the partner gathered.
- Nov 10: brief emailed FIRST ("Trenches partner brief, November 10"),
  then this commit, then the dashboard write. Runner runs 77 to 83 (Nov 8
  15:14 UTC to Nov 10 10:44 UTC) all 50-minute idle windows; no Claude call
  since Nov 4; credit out 11 days. D1 unread day 18. Monday Brief (Nov 9)
  and Weekly Insights (Nov 6) went out without D1 or Stripe. Q-1004 and
  Q-1005 expire today; Get Lit draft 19 days old. Lightscout about 76
  pending as of Nov 8; Nov 9 and 10 runs not read. No client mail.
  PR #22 unchanged 12 days. New decision 4: a 07:36 CT retry trigger.

## 2026-11-08 (daily partner run 18, 06:36 CT)

LOST RUN (see 2026-11-10). Runner runs 69 to 76 claimed nothing. D1 unread
day 16. Lightscout Nov 7 backfill 5 emails, Nov 8 Franklin pass 0 leads,
about 76 pending. Q-1003 expired. Snapshot built and committed on Nov 10.

## 2026-11-07 (daily partner run 17, 06:36 CT)

- Recovered run 16 (see the Nov 6 entry): wrote history/2026-11-06 to the
  dashboard from the saved snapshot and committed both snapshots.
- Runner runs 65 to 72 claimed nothing (352 to 357 byte logs). No Claude
  call since run 61 on Nov 4; credit untested three days, out eight.
- D1 unread for the fifteenth day. Lightscout Nov 7 backfill: 52 checked,
  5 emails, about 76 pending upload, no key. Weekly Insights ran Nov 6
  22:05 UTC without D1 or Stripe (third week), emailed with a push; it
  repeats the credit and connector asks. No client mail. PR #22 unchanged
  9 days. Weekly review decisions unanswered 6 days; third review fires
  Nov 8 18:36 CT. No cloud batch. Dashboard written before the brief.
  Brief emailed.

## 2026-11-06 (daily partner run 16, 06:36 CT)

LOST RUN. The session worker restarted after the gather step, before the
dashboard write, the brief and the commit. The snapshot below was built and
saved in the container; the Nov 7 run wrote it to the dashboard history and
committed it. No brief went out on Nov 6.

- Runner runs 65 to 68 claimed nothing (353 to 354 byte logs). No Claude
  call since run 61 on Nov 4, so the credit is untested; still out as far
  as anyone knows. Five markets burned.
- D1 unread for the fourteenth day. Lightscout Nov 6 new-leads pass added
  one Franklin lead (Triple Crown Bakery); about 71 pending upload, no key.
  No client mail. PR #22 unchanged 8 days. Weekly review decisions
  unanswered 5 days. Weekly Insights fires today 16:00 CT without D1 or
  Stripe. No cloud batch (blocked by D1). Dashboard written before the
  brief. Brief emailed.

## 2026-11-05 (daily partner run 15, 06:36 CT)

- Runner runs 62 to 64 claimed nothing; the last Claude call (run 61,
  Nov 4) failed on credit. Credit out since Oct 30, five markets burned.
- D1 unread for the thirteenth day. Lightscout Nov 5 backfill: 53 checked,
  8 emails, about 70 pending upload, no key. No client mail. PR #22
  unchanged 7 days. Weekly review decisions unanswered 4 days. No cloud
  batch (blocked by D1). Dashboard written before the brief. Brief emailed.

## 2026-11-04 (daily partner run 14, 06:36 CT)

- Runner run 61 (09:17 to 10:07 UTC) claimed Painting Smyrna and failed it
  six times on "Credit balance is too low": the credit has been out since
  Oct 30 and five markets are now burned. Runs 58 to 60 claimed nothing.
- D1 unread for the twelfth day. Lightscout Nov 4: 0 leads, fourth night
  without browser tools, about 62 pending upload, no key. No client mail.
  PR #22 unchanged 6 days. Weekly review decisions unanswered 3 days. No
  cloud batch (blocked by D1). Dashboard written before the brief. Brief
  emailed.

## 2026-11-03 (daily partner run 13, 06:36 CT)

- Runner runs 53 to 57 claimed no campaign (355-byte logs), so the credit
  state is still unknown since run 50. Monday routines: the Monday Brief
  emailed without Stripe or D1, the Books refresh stopped (Stripe not
  signed in, fourth week), the Marketplace Monitor stopped (no Chrome)
  and pushed a warning about unread Marketplace messages.
- D1 unread for the eleventh day. Lightscout Nov 3: 40 checked, 2 emails,
  about 62 pending upload, no key. Social batch still no draft. No client
  mail in 2 days. PR #22 unchanged 5 days.
- Weekly review decision 3 unanswered by the Nov 3 deadline, so the
  partner is back on the committed ROUTINE-PROMPT.md; its cloud batch
  step stays blocked by D1. Dashboard written before the brief. Brief
  emailed.

## 2026-11-02 (daily partner run 12, 06:36 CT)

- Runner runs 53 and 54 claimed no campaign (355-byte logs), so the credit
  state is unconfirmed since run 50 (Nov 1 07:47 UTC, still "Credit
  balance is too low"). Either the READY queue is drained or the dead
  runner failed everything. Asked Connor again for a top-up with
  auto-reload and a campaign reset once D1 is readable.
- D1 unread for the tenth day; three Monday routines fire into it this
  morning. Lightscout Nov 2: 1 lead (HOA manager, email found), third night
  without browser tools, about 60 pending upload, no key.
  vivid-weekly-social-batch missed a second Sunday. No client mail in
  2 days. PR #22 unchanged 4 days. No cloud batch. Dashboard written
  before the brief, as the weekly review proposed. Brief emailed.

## 2026-11-01 (weekly self evaluation, run 2, 18:36 CT)

- Wrote docs/reviews/2026-11-01-weekly.md. Verdict: prospecting ran about
  36 h of 168 (API credit out 10-26 and again from 10-30, runner green while
  dead); Connor acted on two drafts and none of four standing decisions;
  the partner dropped the 11-01 dashboard write (worker restart), let the
  attention list grow to 27 with 16 unchanged items, and drifted its daily
  practice from the committed prompt. Three changes proposed: runner exits
  red on api_error plus auto-reload, push notifications and a 12-item cap,
  Lightscout new-leads mode plus SMARTLEAD_API_KEY. Dashboard refreshed
  (the missed 11-01 write was also caught up at 00:40 UTC), review emailed.

## 2026-11-01 (daily partner run 11, 06:36 CT)

- Runner API credit still out (54 h at run 50, 07:36 to 08:26 UTC, which
  failed a new Pest Control Tullahoma campaign six times). Run 48 (Oct 31
  21:37 UTC) is red: GitHub lost the job in 2 s before any step. Run 49
  claimed nothing. Ten windows since Oct 29 evening, zero leads.
- D1 unread for the ninth day; the three Monday routines will hit the same
  wall tomorrow. Lightscout Nov 1 backfill: 36 checked, 0 emails, about
  230 email-blank leads left with little yield; about 59 pending upload, no
  key. No client mail in 2 days. PR #22 unchanged 3 days. No cloud batch.
  Brief emailed. Self evaluation fires tonight 18:36 CT.

## 2026-10-31 (daily partner run 10, 06:36 CT)

- Runner API credit still out: runs 40 to 45 (Oct 30 01:02 UTC to Oct 31
  06:35 UTC) failed every Claude call and all exited 0. Run 45 claimed a
  new Pest Control Mt. Juliet campaign and failed it six times. Asked
  Connor again for a top-up with auto-reload.
- D1 unread for the eighth day. Weekly Insights ran Oct 30 without Stripe
  or D1; it lists Q-1003, Q-1004 and Q-1005 as expiring Nov 8 to 10 and
  asks whether ODS is a client, whether to void Q-1003, and whether the
  Fenlo Buford bid is live.
- Lightscout Oct 31 backfill: 66 checked, 12 emails, about 59 pending
  upload, no key. Get Lit draft 9 days old. No client mail. No cloud
  batch. Brief emailed.

## 2026-10-30 (daily partner run 9, 06:36 CT)

- Runner API credit ran out again: run 40 logged "Credit balance is too
  low" at 01:52 UTC and run 41 (07:10 to 08:00 UTC) failed every discovery
  call while exiting 0. Second outage since Oct 26. Asked Connor to top up
  and set auto-reload; the fail-on-api_error runner change is still owed.
- D1 unread for the seventh day. PR #22 unchanged since Oct 29. Lightscout
  Oct 30: 0 leads, second night without browser tools. Get Lit draft still
  unsent; no replies yet from ODS or Benson. No cloud batch. Brief emailed.

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
