# Trenches Group — working rules for Claude sessions

Read `docs/SYSTEM-MAP.md` first. It is the only durable description of what is
deployed. Then read the newest file in `docs/reviews/`.

## Ground truth

- Production is the Cloudflare Worker `trenches-os-api` plus the D1 database
  `trenches-production` (id `2261ffe8-712f-4b07-aec2-73bba0ad155e`).
- `src/index.js` is the esbuild bundle that is live. `recovered/*.js` is the
  same bundle split at the `// src/*.ts` markers for reading. Neither is the
  original TypeScript; that source was lost. Do not hand-edit `recovered/`.
- Before changing `src/index.js`, pull the live worker code and diff it against
  the repo. Prod has drifted from the repo before (2026-09-28 to 2026-09-30)
  and a blind deploy would have rolled back quotes, Stripe and Gmail features.
- Every session must end with a commit and push to the designated branch.
  Work that lives only in a container is lost when the container is reclaimed.
  This has already happened once.

## Operating conventions

- Feature flags live in the `system_flags` table, not in code. Check them with
  a D1 query before assuming a subsystem is on or off.
- The `events` table is the audit log. Query it before claiming anything about
  what the system did.
- Never enable live sending (`OUTREACH_EMAIL_LIVE_MODE`,
  `OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED`, `OUTREACH_LIVE_MODE`) without
  Connor's explicit say-so in the same session.
- Anything that goes into `docs/` is written for a reader who has never seen
  the chat. Dates are ISO. Numbers come from a query, not memory.

## Session end checklist

1. `git status` clean, pushed.
2. If prod was changed by `wrangler deploy` or the dashboard, update
   `src/index.js` from the live worker and regenerate `recovered/` with the awk
   one-liner in `docs/SYSTEM-MAP.md`.
3. Append a dated entry to `docs/CHANGELOG.md`: what changed, what flags
   moved, what is still broken.
