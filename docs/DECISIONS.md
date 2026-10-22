# Decisions

Dated. One entry per decision that a future session should not re-litigate.
Format: date, decision, reason, what would change it.

## 2026-10-22 Deploys run only from GitHub Actions in trenches-hq

Decision (Connor, 2026-10-22): the "Deploy app" workflow in trenches-hq
(`.github/workflows/deploy-apps.yml`) is the only way trenches-os-api,
trenches-site and chatbot-worker reach production. The `/deploy` skill
dispatches it. No `wrangler deploy` from a laptop, worktree or cloud session.
Reason: on 2026-10-21/22 one session deployed trenches-os-api from a desktop
at 00:06 UTC and another from Actions at 01:40 UTC. One path, from `main`,
with the previous version recorded and a tag on every deploy.
What still needs a desktop: remote D1 migrations (by hand, before the deploy),
and `mode=full` deploys until the Cloudflare token also has Workers Routes,
Queues and Workflows edit scopes.
Would change it: GitHub Actions unavailable for more than a day.

## 2026-10-22 Smartlead is the outreach channel for Trenches Group

Decision (Connor, 2026-10-22): Trenches Group cold outreach goes through
Smartlead, not Gmail. The warmed sender is connor.trenches@discovertrenchesgroup.com.
Reason: the sender is already warmed at 50/day, the Vivid reply watcher
proves the API works from the cloud, and Gmail would cap volume at 10/day and
need the deleted reply stack restored.
What it still needs before a send: a Smartlead campaign for the website
track and its id in `system_flags` as `SMARTLEAD_WEBSITE_CAMPAIGN_ID`
(and `SMARTLEAD_CONCIERGE_CAMPAIGN_ID` if the concierge track is ever used),
the Smartlead API key in the Claude environment as `SMARTLEAD_API_KEY` so the
partner can read campaign health, and Connor's explicit say-so in a session
before `OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED` moves to true. Campaign
launches stay Connor's click (house rule 4).
Would change it: Smartlead deliverability collapses, or a second channel is
needed after ten real conversations.

## 2026-10-22 trenches-hq is the code repo; this repo keeps docs, the dashboard and patches (recommended, awaiting Connor)

Decision (recommended by the 2026-10-22 review, not yet confirmed): the
TypeScript source in `cmckendry-ai/trenches-hq/apps/*` is the only thing that
deploys. `Trenches-Group` stops syncing bundles after this session and keeps
`docs/`, `ops-dashboard/`, `business-partner/` and `patches/`. Code changes for
the workers are written against trenches-hq.
Reason: trenches-hq has the source, the agents, the skills, the client logs,
the site-edit runner with deploy secrets, and every session since 2026-10-10.
Two repos claiming to be the source of truth means every fix lands twice or
not at all. The 2026-10-01 "monorepo" decision below was made before
trenches-hq existed.
Would change it: Connor says otherwise.

## 2026-10-22 The business partner runs daily and never contacts a prospect

Decision: a scheduled task runs every morning, queries state, pushes
prospecting as far as drafts and lead files, refreshes the Ops Desk, and emails
Connor. It never emails a prospect, never touches Smartlead, and writes to D1
only the orchestrator flag and an audit event.
Reason: campaigns stop because nobody watches the joints. The partner watches
them. Sends stay human because house rule 4 and 10 in trenches-hq say so.
Would change it: Connor's explicit say-so for a specific channel, recorded here.

## 2026-10-01 Monorepo for everything Trenches operates

Decision: one repo (`cmckendry-ai/Trenches-Group`) holds the API, the site, the
chatbot product, the runner, docs, and hosted client sites under `clients/`.
Vivid Lightscapes may move to `cmckendry-ai/Vivid` because it is a separate
business, but not before the pipeline is sending again.
Reason: one operator, two members, zero payments. A repo per customer is
overhead with no owner to serve. Split a client out the day they need access.
Would change it: a client who needs read access to their own code, or a second
developer.

## 2026-10-01 Prospect work stays in D1; customers get a folder; a repo only on handoff

Decision: prospect demos and quotes live in `demo_sites` and `quotes`, never in
git. When a prospect pays, their worker bundle and a hand-over README go in
`clients/<name>/`. A client gets its own repo only when they hire a developer
who needs access, take ownership of the Cloudflare account, or buy the site
outright.
Reason: one operator. A separate repo is a separate session with no view of
the shared D1, Stripe or portal state. Fenlo is the only paying client and
none of the three triggers applies.
Would change it: any of the three triggers.

## 2026-10-01 The repo is the memory

Decision: every session reads `docs/SYSTEM-MAP.md` first, appends to
`docs/CHANGELOG.md` last, and ends with a push. Numbers in docs come from
queries. Prod is diffed before prod is edited.
Reason: the original TypeScript was lost, the repo had one commit, and prod
drifted 600 lines in two days. Chat summaries produced a false "Gmail removed"
claim.
Would change it: nothing.

## 2026-10-01 Nothing reaches production except from a commit

Decision: no `wrangler deploy` from a container or laptop. Deploys run from
GitHub Actions on push to `main`, once `trenches-os-api/wrangler.jsonc`
declares the cron trigger, the `EMAIL` binding, and the queue and workflow
names. Until then, no deploys at all.
Reason: a deploy from the committed bundle on 2026-09-30 would have rolled
back quotes, Stripe and the offering split.
Would change it: nothing.

## Open (need Connor)

- Confirm trenches-hq as the only code repo (2026-10-22).
- Runner: office PC, or the GitHub Actions workflow in `patches/trenches-hq/`.
- May the partner clean up orphaned pipeline rows (sequences, candidates,
  failed campaigns, test drafts).
- Windows runner permanent or a bridge to an API-key runner.
- Concierge offering real or experiment.
- Fenlo: client, or something else.
- Requalify 361 HUMAN_REVIEW leads automatically after the scorer fix, or
  hand-check the first 50.
