# Patch set for trenches-hq (prepared 2026-10-22)

> **Landed later the same day.** The scorer change was superseded by trenches-hq PR #14 (merged 2026-10-21 19:06 CT). The orchestrator guard, the workflow and four security fixes are on trenches-hq branch `claude/orchestrator-guard-scorer-fix` (700acb4), waiting for merge and deploy. This folder is the record of what was prepared.

These changes belong in `cmckendry-ai/trenches-hq`, which is the repo that
actually deploys `trenches-os-api`. They were written and typechecked against
trenches-hq `main` at `a26b666` (2026-10-21) but not pushed there, because this
session was only authorized to push to Trenches-Group. Nothing here is deployed.

| File | What it does |
|---|---|
| `0001-orchestrator-guard-and-scorer-fix.patch` | Unified diff for `apps/trenches-os/src/prospector-jobs.ts` and `apps/trenches-os/src/phase2.ts`. |
| `apps/trenches-os/src/prospector-jobs.ts` | Patched copy. The cron stops creating campaigns when no runner has heartbeated in the last 15 minutes (`NO_RUNNER_ONLINE`). Flag `PROSPECTOR_RUNNER_STALE_MINUTES` overrides the window. |
| `apps/trenches-os/src/phase2.ts` | Patched copy. Digital-gap points now come from `website_status` as well as `website_quality`, so a no-website lead scores 40 instead of 0. |
| `.github/workflows/prospector-runner.yml` | Hourly GitHub Actions job that runs `runner.py` for 50 minutes with an API key. Needs the `TRENCHES_RUNNER_KEY` repo secret (the worker's `RUNNER_API_KEY`). `ANTHROPIC_API_KEY` already exists for the site-edit runner. |

## Why

- 240 campaigns were created between 2026-09-21 and 2026-10-13 and none produced a lead, because no runner was alive to claim them. The last 20 (Oct 13) still sit READY and fill the backlog, so the orchestrator reports `BACKLOG_FULL` and creates nothing. The guard makes that state visible instead of silent.
- 361 leads sit in HUMAN_REVIEW mostly because `digitalPoints()` ignored `website_status`. A business with no website is the target and scored 0 of 40 gap points.
- The runner is a Python script on the office PC that stops when the PC sleeps (last heartbeat 2026-10-03). GitHub Actions already has `ANTHROPIC_API_KEY` for the site-edit runner, so the same place can host prospecting.

## Apply

```sh
cd C:\dev\trenches-hq            # or any clone of trenches-hq on main
git switch -c claude/orchestrator-guard-scorer-fix
git apply <path to this folder>/0001-orchestrator-guard-and-scorer-fix.patch
cp <path to this folder>/.github/workflows/prospector-runner.yml .github/workflows/
cd apps/trenches-os && npm install && npx wrangler types && npm run typecheck && npm test
```

Then `/deploy trenches-os` (Connor's yes required), add the `TRENCHES_RUNNER_KEY`
secret in GitHub, run the "Prospector runner" workflow once by hand from the
Actions tab, and watch `runner_status` for `github-actions-runner-01`.

After the scorer fix is live, requalify the HUMAN_REVIEW leads:
`POST /api/leads/requalify` (Command Center) or review the first 50 by hand
first, whichever Connor chose.

## Not included on purpose

- No change to `src/index.js` in Trenches-Group. That bundle is no longer what deploys.
- No migration. The new flag `PROSPECTOR_RUNNER_STALE_MINUTES` is optional and read with a default.
- No automatic expiry of the 20 READY campaigns. Once a runner is online they are valid work and get claimed oldest first.
