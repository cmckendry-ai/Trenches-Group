# Trenches OS API

Start with `CLAUDE.md` and `docs/SYSTEM-MAP.md`. The bundle below was re-synced
to production on 2026-10-01; see `docs/CHANGELOG.md`.

## Provenance of this commit

There was no prior git history for this project. The `smartlead-rebuild` branch
and all earlier work referenced in past session notes existed only inside an
ephemeral container that has since been reclaimed; it was never pushed to a
remote. This repository was empty until this commit.

This baseline was recovered directly from the **live Cloudflare deployment**
(`trenches-os-api`), not from the original TypeScript source:

- `src/index.js` is the exact bundled JS currently running in production,
  pulled via the Cloudflare Workers API. This is what actually deploys —
  don't restructure it into multiple files without re-wiring imports/exports,
  since the bundler flattened everything into one shared scope.
- `recovered/*.js` splits that same bundle back into files matching the
  original TypeScript module boundaries (`src/email.ts` -> `recovered/email.js`,
  etc.), inferred from esbuild's `// src/xxx.ts` comments. These are
  **reference copies only** — types are erased and they are not wired as
  independent modules. Useful for code review and for locating logic; not
  deployable on their own.

## Known gaps in this recovery

- `wrangler.jsonc` bindings for the D1 database are confirmed (`trenches-production`,
  `2261ffe8-712f-4b07-aec2-73bba0ad155e`). The Queues and Workflows resource
  names are **not** confirmed — only the binding names (`EVENTS_QUEUE`,
  `LEAD_WORKFLOW`) and the Workflow class (`LeadLifecycleWorkflow`) could be
  read out of the bundle. No Queues/Workflows API tool was available to look
  up the underlying resource names; confirm in the Cloudflare dashboard before
  trusting this file to redeploy the worker from a clean account.
- Secrets (`ADMIN_API_KEY`, `SMARTLEAD_API_KEY`, `TWILIO_*`, etc.) are already
  set live and are not recoverable through this process. They need
  `wrangler secret put` again only if the worker is ever redeployed from a
  fresh account.

## Actual state of the email migration (as of this commit)

Contrary to earlier session notes claiming Gmail was fully removed:

- **Bulk outreach** genuinely runs through Smartlead (`src/smartlead.ts` /
  `recovered/smartlead.js`) — campaign creation, sequences, webhook
  registration.
- **Live conversational replies** (`sendLiveReply` in `recovered/email.js`)
  still send through **Gmail API with OAuth**, not a Cloudflare Email
  Binding. There's a live `/integrations/gmail/oauth/callback` route and a
  `gmail_connections` D1 table backing it.
- The email-voice recapitalization fix (`formatEmailCorrespondence` in
  `recovered/correspondence.js`) is live and correct.
