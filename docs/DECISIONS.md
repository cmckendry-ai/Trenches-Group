# Decisions

Dated. One entry per decision that a future session should not re-litigate.
Format: date, decision, reason, what would change it.

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

- Gmail or Smartlead for outreach.
- Windows runner permanent or a bridge to an API-key runner.
- Concierge offering real or experiment.
- Fenlo: client, or something else.
- Requalify 361 HUMAN_REVIEW leads automatically after the scorer fix, or
  hand-check the first 50.
