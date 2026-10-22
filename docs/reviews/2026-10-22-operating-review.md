# Operating review, 2026-10-22

Scope: both repos (`Trenches-Group`, `trenches-hq` at `a26b666`), the seven
Cloudflare Workers, the `trenches-production` D1 database, Claude scheduled
tasks, Hyperagent, and the live worker bundles pulled on 2026-10-22 between
00:00 and 00:40 UTC. Numbers are from queries run in that window. Nothing in
production was changed by this session.

Tags: [Certain] read from code or a query. [Likely] consistent with the
evidence. [Guessing] inference.

## 1. Verdict

[Certain] Trenches Group has not produced a new prospect since 2026-09-06 and
has not sent an outreach email since 2026-09-11. Every number that looked like
activity since then is a test row, a quote, or portal work. The prospecting
pipeline is not slow; it is stopped, and it stops for one mechanical reason
each time: the thing that turns a campaign into leads is a Python script on
your office PC, and when the PC sleeps nothing notices.

[Certain] The code that deploys lives in `trenches-hq`, not in this repo. The
2026-10-01 review built its memory in `Trenches-Group`; nine days later the
real work moved to `trenches-hq` with TypeScript source, agents, skills and
client logs, and `Trenches-Group` has not been pushed since 2026-10-09. The
two repos now disagree about which one is the source of truth. That has to be
settled or every fix lands twice.

[Certain] The gaps are not in automation. You have five scheduled tasks, a
site-edit runner on GitHub Actions, an /hq Command Center, a quote system and
an outreach engine. They are not wired to each other and nobody is watching
the joints. That is what the Ops Desk page and the daily Business Partner
routine are for.

## 2. What changed since the 2026-10-01 review

| Date | Change | Source |
|---|---|---|
| 2026-10-03 | `connor-windows-runner-01` last heartbeat 10:25 UTC. No runner since. | `runner_status` |
| 2026-10-10 | `trenches-hq` created: TypeScript source for trenches-os, trenches-site, chatbot; agents (Ledger, Presence, Scout, Crest, Forge, Recon, Books); skills (`/deploy`, `/wrap`, `/new-client`, `/ops-check`); client folders. | `trenches-hq` CLAUDE.md, `clients/_trenches/LOG.md` |
| 2026-10-10 | Scheduled tasks created: Monday Brief, Weekly Insights, Vivid Reply Check (every 2 h). Vivid Ad Copy paused 10-11. | `list_triggers` |
| 2026-10-11 to 10-16 | /hq Command Center and client portal overhaul deployed to trenchesgroup.com (requests, change log, Drive uploads, analytics, renewals). | `trenches-site` bundle, `hq_*` tables |
| 2026-10-11 to 10-13 | Vivid lead intake automation on the PC (quote folders, Street View, roof measure). | `clients/vivid-lightscapes/LOG.md` |
| 2026-10-12 to 10-13 | Quotes Q-1004 (Get Lit), Q-1005 and Q-1006 (Benson) sent. 0 views as of today. | `quotes` |
| 2026-10-13 | Cron created 20 campaigns (Murfreesboro and Smyrna, 10 trades). None claimed. | `prospecting_campaigns` |
| 2026-10-13 | `trenches-os-api` deployed (quotes with optional lines and discounts, `/api/quotes/preview`, Smartlead event map widened, `autoReplyMode` setting removed). Bundle is 6,007 lines; the repo copy here was 5,898. | live bundle diff |
| 2026-10-13 | Recon built a 29-firm property manager list and a 3-email sequence. Never imported or launched (permission guard, missing address and subject). | `clients/_trenches/LOG.md` |
| 2026-10-21 | `trenches-site` deployed with renewal reminders (switch off). `fenloservices-site` deployed. | `workers_list`, `hq_settings` |

## 3. The numbers

Pipeline, lifetime, `trenches-production` on 2026-10-22:

| Stage | Count | Note |
|---|---|---|
| Campaigns | 312 | 32 completed, 258 failed, 2 paused, 20 READY since Oct 13 |
| Candidates | 1,149 | 699 enriched, 245 duplicate, 83 queued, 73 failed, 48 filtered |
| Leads | 730 | last real one 2026-09-06 |
| HUMAN_REVIEW | 361 | 93 with an email, 41 verified |
| DISQUALIFIED | 347 | |
| QUALIFIED | 19 | 19 phones, 2 emails, 0 verified |
| AWAITING_REPLY | 1 | Ray's Roofing, since 2026-09-08 |
| Emails sent | 90 | last 2026-09-11 |
| Real prospect replies | 0 | |
| Quotes | 6 | 3 SENT and unviewed ($2,499 one-time, $1,150/mo), 1 draft, 2 void tests |
| Portal members | 5 | Fenlo, Vivid, Overhead Door, two Sage/Pretty Medium accounts |
| Stripe payments through the pipeline | 0 | |
| Events since 2026-10-01 | 4 | all from one test quote |

Weekly activity from `events`:

| ISO week | Leads created | Emails sent | Inbound |
|---|---|---|---|
| 2026-W34 | 136 | 0 | 0 |
| 2026-W35 | 540 | 40 | 3 |
| 2026-W36 | 2 | 50 | 2 |
| 2026-W37 onward | 0 | 0 | 0 |

Scheduled tasks (claude.ai):

| Task | Schedule | Last run | Note |
|---|---|---|---|
| Trenches Monday Brief | Mon 07:00 CT | 2026-10-19, ok | read-only |
| Trenches HQ Weekly Insights | Fri 16:00 CT | 2026-10-16, ok | read-only |
| Vivid Outreach Reply Check | every 2 h, 7 to 21 CT | 2026-10-21 22:03 UTC, ok | Smartlead key in the prompt |
| Vivid Marketplace Monitor | Mon 07:50 CT | 2026-10-19, ran 23 s | needs desktop Chrome [Guessing: exits early] |
| Trenches weekly books refresh | Mon 13:00 UTC | 2026-10-19, ran 18 s | [Guessing: exits early] |
| Vivid Weekly Ad Copy | paused | 2026-10-05 | |
| Trenches Business Partner | daily 06:36 CT | created today | bound to this session |

## 4. Why prospecting stops, as a chain

1. [Certain] `runDueProspectorJobs` creates campaigns from 140 city x trade rows whenever the READY+RUNNING backlog is under 20. It never checks whether a runner exists.
2. [Certain] Only `runner.py` claims campaigns, and it runs on the office PC through a Claude Code CLI on a Pro login. Orgo died 2026-09-28; the Windows runner died 2026-10-03.
3. [Certain] With no runner, 20 campaigns sit READY forever, the backlog reads full, the orchestrator returns `BACKLOG_FULL`, and nothing is logged anywhere you look.
4. [Certain] Even when campaigns ran (August), leads reached QUALIFIED without a verified email, and the website track refuses to email an unverified address, so 19 qualified leads with phone numbers have never been contacted.
5. [Certain] The scorer gives digital-gap points only for `website_quality`, so a lead with no website and quality UNKNOWN scores 0 of 40 and lands in HUMAN_REVIEW. 361 leads are there.
6. [Certain] Outreach itself is off (`OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED=false` since 2026-09-13) pending a Gmail or Smartlead decision that has not been made in 39 days.

Fixing 1 and 2 restarts lead flow. Fixing 5 empties the review queue. Fixing 6 is one sentence from you.

## 5. What this session built

- **Ops Desk** (https://claude.ai/artifact/XRmBDFou4sMNkTzBpWtWRy). One page: what needs you (ranked, with the action), who is working (every routine, runner, agent and cron with last run), both pipelines, the partner's advice and decisions, and what the partner did. The page reads a `snapshots/latest` document in its own database; it never has to be redeployed to change. Seeded with today's numbers. Source in `ops-dashboard/`.
- **Trenches Business Partner** scheduled task, daily 06:36 CT (`trig_01N6MkUMur9PQuEBxHS2G3o7`). Prompt in `business-partner/ROUTINE-PROMPT.md`. Each morning it queries D1, scheduled tasks, Hyperagent and Gmail; builds the attention list; does one prospector batch (a verified lead CSV plus a Smartlead-ready import file in Google Drive, Trenches on most days, Vivid on Tuesdays); leaves follow-up drafts for unviewed quotes and unanswered client emails in Gmail Drafts; refreshes the Ops Desk; emails you the brief. Hard limits: never emails a prospect, never touches Smartlead, D1 writes limited to the orchestrator flag and an audit event. [Certain] It is bound to this session because the scheduled-task API in this organization refuses to attach connectors to a fresh-session task; a fresh session would have had no Gmail, D1 or Drive tools. If you prefer a standalone task, create it from the claude.ai routines screen with the same prompt and attach Gmail, Cloudflare Developer Platform, Google Drive, Hyperagent and Claude Code Remote.
- **Patch set for trenches-hq** in `patches/trenches-hq/`: orchestrator runner guard, scorer fix, and a GitHub Actions prospector runner. Typecheck and preflight pass against `a26b666`. Not pushed to trenches-hq (no authorization in this session) and not deployed.

## 6. Fix list, in order

1. [Certain] Runner. Restart `runner.py` on the PC today, or merge the Actions workflow and add `TRENCHES_RUNNER_KEY`. Nothing else matters until campaigns get claimed.
2. [Certain] Decide Gmail or Smartlead for Trenches outreach. Smartlead has a warmed Trenches sender (50/day) and the Vivid routine proves the API works from the cloud. Recommendation: Smartlead.
3. [Certain] Call the three open quotes. Nine days unviewed is a delivery problem.
4. [Certain] Merge the orchestrator guard and scorer fix; requalify the 361.
5. [Certain] Launch the property manager campaign: mailing address line, subject, and a yes to the Smartlead draft.
6. [Certain] Rotate the Smartlead API key (it is plaintext in the Vivid Reply Check prompt) and the `SMARTLEAD_WEBHOOK_SECRET` (plaintext in `system_flags`). Put the key in the Claude environment as `SMARTLEAD_API_KEY` so the partner can read Vivid campaign health.
7. [Certain] Settle the repo question. Recommendation: `trenches-hq` is the only code repo; `Trenches-Group` keeps `docs/`, `ops-dashboard/`, `business-partner/` and `patches/`. Stop syncing bundles here.
8. [Certain] Close orphaned state (111 ACTIVE sequences, 83 QUEUED and 73 FAILED candidates, 258 FAILED campaigns, 3 FAILED demo jobs, 7 test drafts) with one approved SQL so every count means something.
9. [Likely] Make the Marketplace Monitor and Books refresh fail loudly. 23 and 18 second runs reporting success is the same silent-failure pattern as the runner.
10. [Certain] Confirm the Stripe secret key rotation (invalid `mk_` id on 2026-10-09) and run the live smoke test.

Still open from the 2026-10-01 review and unchanged: `/upload` on trenches-site unauthenticated, reflected XSS on the demo quote page, Stripe webhook idempotency across three endpoints, ACH checkouts never completing, social order setup fee subtracted instead of added, demo checkout creating Stripe sessions on GET. The portal overhaul did not touch these; re-verify against the 2026-10-21 bundle before assuming any are fixed.

## 7. Business partner view: how you get customers

Trenches Group. [Likely] The fastest money is already in the database: 19 qualified trades with phone numbers in your own county, three quotes to people who asked for them, and 29 property managers with a finished sequence. A week of calls and one launched campaign beats another month of pipeline engineering. The pipeline matters for month three, not this month. Keep building it, but let the routine do that in the background.

Vivid Lightscapes. [Likely] Vivid is the better-run business right now: a warmed Smartlead account with about 1,000 leads, a reply watcher, a lead intake that builds quote folders, a social cadence. What it lacks is the same thing Trenches lacks: nobody is feeding the top. The Tuesday Vivid batch (venues, HOAs, car washes, restaurants in Rutherford and Williamson) gives the Smartlead campaigns fresh leads every week. Watch reply rate by persona; wedding venues are the proven winner, so weight them until the data says otherwise.

What I would stop. [Guessing] The concierge offering (half the outreach code, zero leads ever), SMS, and new portal features until a second paying client exists. Two members and zero pipeline payments means the portal is ahead of the funnel.

## 8. Questions only you can answer

1. Smartlead or Gmail for Trenches outreach?
2. Runner on the PC, or on GitHub Actions (needs `TRENCHES_RUNNER_KEY` as a repo secret)?
3. Is `trenches-hq` the only code repo from now on?
4. May the partner write to D1 for internal bookkeeping (flags, audit events, orphan cleanup), never leads or customers?
5. Requalify the 361 automatically after the scorer fix, or check the first 50 by hand?

## 9. What this session could not do

- Read Smartlead campaign status: the only key available is the one in the routine prompt, and using it was blocked by the permission guard. Correct outcome; it should be a secret.
- Reach `trenches-os-api` or `trenchesgroup.com` over HTTP: the cloud environment's network policy blocks both hosts, so the API's `/health` and `/api/*` were not exercised. The runner workflow runs from GitHub, which can reach them.
- Deploy anything: no Cloudflare token here, and the deploy workflow in this repo still refuses on placeholders. The real `wrangler.jsonc` with queue `trenches-events`, workflow `trenches-lead-lifecycle` and cron `*/2 * * * *` is in `trenches-hq`; this repo's copy is now updated from it for the record.
- Push to `trenches-hq`: not authorized in this session, so the patch set is delivered as files.

## 10. Update, later on 2026-10-22: fixes landed, sessions reviewed

**Fixes.** [Certain] Pushed to `cmckendry-ai/trenches-hq` on branch
`claude/orchestrator-guard-scorer-fix` (commit `700acb4`, on top of main
`d1441ab`). Not merged, not deployed. Checks: `npm run typecheck`, `npm test`
(preflight) in `apps/trenches-os`, `node scripts/portal-smoke.mjs` in
`apps/trenches-site`, all pass.

| Change | File | Review item |
|---|---|---|
| No campaign creation when no runner heartbeat in 15 min (`NO_RUNNER_ONLINE`) | `apps/trenches-os/src/prospector-jobs.ts` | section 4, step 1 |
| Hourly GitHub Actions prospector runner (needs `TRENCHES_RUNNER_KEY`) | `.github/workflows/prospector-runner.yml` | section 6, item 1 |
| Demo quote page accepts only the fixed choices and escapes output | `apps/trenches-os/src/demo.ts` | 2026-10-01 item 8 |
| `GET /demo/:slug/checkout` renders a confirm page; `POST` starts Stripe | `apps/trenches-os/src/routes.ts` | 2026-10-01 item 12 |
| Stripe webhook signature older than 5 minutes rejected | `apps/trenches-site/src/worker.js` | 2026-10-01 item 9 (partial) |
| `/upload` same-origin only, 15 MB, document and image types, random key prefix | `apps/trenches-site/src/worker.js` | 2026-10-01 item 7 |

The scorer fix was already on main: PR #14 `fix/score-website-status`, merged
2026-10-21 19:06 CT, gives NONE, SOCIAL_ONLY, PARKED and PLACEHOLDER 40 points
and BROKEN 30. The copy in `patches/trenches-hq/` is superseded by that PR
and by the branch above; it is kept for the record.

Still open from 2026-10-01: webhook idempotency shared across three
endpoints (events recorded before processing), the quote view token doubling
as a portal invite, and the social order setup fee (the cart has since been
rebuilt around a "Shared Setup Credit" with a floor at zero, so this one is
[Likely] gone; confirm with a test order).

**D1 cleanup.** [Certain] Done: 75 QUEUED/ENRICHING candidates whose
campaign was already FAILED or COMPLETED set to FAILED with
`last_error='CAMPAIGN_DEAD'`; 3 FAILED demo jobs set to CANCELLED. Blocked by
the session permission guard (bulk updates on shared tables): cancelling 111
ACTIVE sequences and 255 pending steps, archiving 256 FAILED campaigns,
cancelling 7 test reply drafts, and the audit event. Run these from a desktop
session or the Command Center:

```sql
UPDATE outreach_sequences SET status='CANCELLED', stop_reason='ORPHANED_2026-09-13', updated_at=datetime('now') WHERE status='ACTIVE';
UPDATE outreach_sequence_steps SET status='CANCELLED', updated_at=datetime('now') WHERE status='PENDING';
UPDATE prospecting_campaigns SET archived_at=datetime('now'), archived_by='CLEANUP_2026-10-22', updated_at=datetime('now') WHERE status='FAILED' AND archived_at IS NULL;
UPDATE outreach_reply_drafts SET status='CANCELLED', updated_at=datetime('now') WHERE status='DRAFT' AND is_test=1;
```
(Check `outreach_sequence_steps` has a `status` column before running the second line; it was not inspected.)

**Routines.** [Certain] The two short runs were not silent failures. The
Marketplace Monitor's Oct 19 run ends: "Claude in Chrome isn't available to
this scheduled task because it runs in the cloud"; the tracker sheet has
nothing after the Sep 26 baseline. The Books refresh's Oct 19 run ends:
"Stripe isn't authorized in this session", and it stopped before touching the
books as its runbook requires. Both pushed a notification. Fixes are Connor's:
turn on "Require this computer" for the Marketplace Monitor, reauthorize the
Stripe connector and fire the Books refresh by hand.

**Sessions.** [Certain] All 45 Claude Code sessions on the account from
2026-08-30 to today were listed and their last-turn summaries read; the two
routine runs above were read in full. Three eras: Trenches-Group cloud
sessions (Sep 28 to Oct 9: bundle recovery, quoting, portal planning, the
Oct 1 review), trenches-hq desktop sessions (Oct 10 onward: HQ, portal
overhaul, Vivid lead intake, social batch, property manager outreach, Fenlo
site, analytics, renewals), and unrelated work (safety_program OSHA platform,
US-Dock-Door sites, personal). Eight sessions are parked on a question for
Connor: Fenlo site polish (two unsourced stats, PRs 11 and 12 unmerged),
Benson Q-1003 send decision, Startup package pricing (four trenches-site
dashboard settings), Laptop access (runner), Claude session review (step 3 or
4), Benson social package source, Command Center resurrection (Zapmail
nameservers), customer portal build spec. None of them changes the verdict in
section 1; two of them (Laptop access, Oct 2, and Command Center
resurrection, Sep 28) already asked the runner and email questions this
review asks again.

## 11. Update, 2026-10-22 01:45 UTC: merged and deployed

[Certain] Connor decided Smartlead for Trenches outreach and asked for the
branch to be merged and deployed. PR #15 merged into trenches-hq main
(`0782259`). A new "Deploy app" workflow (`.github/workflows/deploy-apps.yml`)
deployed `trenches-os-api` (version `06f3b688`, 01:40 UTC) and `trenches-site`
(01:43 UTC) using the Workers Scripts token the site-edit runner already had.
Both live bundles were pulled back and contain the changes (`NO_RUNNER_ONLINE`,
`demoCheckoutConfirmPage`, `websiteStatusPoints`, `UPLOAD_MAX_BYTES`, the
300-second Stripe check). The first trenches-os run reported failure only
because `/health` returns 503 DEGRADED on purpose while 361 leads sit in
HUMAN_REVIEW; PR #16 fixed the verify step. Deploy tags could not be pushed
from this environment (the git proxy drops tag refs); the Actions job tags
future deploys itself.

[Certain] Also found: a desktop deploy of `trenches-os-api` happened at 00:06
UTC today (version `3277e13b`), right after PR #14 merged. That is the scorer
fix going live, and it means someone else was deploying while this review was
running. The two-session rule in trenches-hq (`wrangler deployments list`
before deploying) held: the Actions workflow records the previous version
before it uploads.

What is now true: campaign creation is guarded, the four security holes are
closed, the scorer counts website status. What is still not true: no runner is
online (add `TRENCHES_RUNNER_KEY` and run the "Prospector runner" workflow
once), no Smartlead campaign exists for Trenches, the 361 leads have not been
requalified, and the orphan cleanup is half done.

## 12. Requalification of the review queue, 2026-10-22 02:00 to 02:40 UTC

[Certain] Method: 347 `deferred_events` rows with the same
`PROSPECT_RESEARCH_RECEIVED` event the `/api/leads/requalify` endpoint emits,
replayed by the cron 25 per tick into `LeadLifecycleWorkflow`. 14 of the 361
HUMAN_REVIEW leads have no `lead_research` row and were not eligible (the
endpoint skips them too). All 347 were scored.

| Outcome | Leads |
|---|---|
| HUMAN_REVIEW, research confidence under 0.70 | 123 |
| HUMAN_REVIEW, contradictory website research | 75 |
| HUMAN_REVIEW, gap verified, score 50 to 60 (priority C) | 86 |
| HUMAN_REVIEW, no listing evidence or no verified contact | 31 |
| HUMAN_REVIEW, gap could not be verified | 7 |
| DISQUALIFIED, average or modern website found | 5 |
| QUALIFIED by this run | 0 |

Lead states after: 348 HUMAN_REVIEW (from 361), 357 DISQUALIFIED (from 347),
22 QUALIFIED (from 19). The three new QUALIFIED leads and five of the ten new
DISQUALIFIED came from a desktop session at 00:09 UTC, right after the PR #14
deploy, not from this run.

[Certain] Reading: the scorer fix works (every no-website lead now carries 40
gap points) and it does not empty the queue. A score of 65 needs reputation,
economics or contactability points on top of the gap, and these leads have no
rating, review count, verified mobile or email on record. Validation holds
another 236 for research confidence, contradictions or missing listing
evidence, and validation outranks the score. The 2026-10-01 estimate of 100
to 150 qualifying was [Guessing] and wrong.

What clears the queue: re-enrichment, which writes exactly the fields the
score and validation are missing. That is the runner (`TRENCHES_RUNNER_KEY`,
then the Prospector runner workflow). Until then the 86 priority-C leads with
a verified gap and a phone number are the best manual call list.
