# Trenches OS API

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

## Actual state of the email migration

As of the initial recovery commit, contrary to earlier session notes claiming
Gmail was fully removed:

- **Bulk outreach** genuinely runs through Smartlead (`recovered/smartlead.js`)
  — campaign creation, sequences, webhook registration.
- **Live conversational replies** (`sendLiveReply` in `recovered/email.js`)
  still sent through **Gmail API with OAuth**, not a Cloudflare Email
  Binding. There was a live `/integrations/gmail/oauth/callback` route and a
  `gmail_connections` D1 table backing it.
- The email-voice recapitalization fix (`formatEmailCorrespondence` in
  `recovered/correspondence.js`) was already live and correct.

### Gmail cutover (this branch, not yet deployed)

`sendLiveReply` now sends via a Cloudflare Workers `send_email` binding
(`env.SEND_EMAIL` + `EmailMessage` from `cloudflare:email`) instead of Gmail
OAuth. Removed entirely: the OAuth start/callback routes, `gmail_connections`
lookups, and the AES credential-encryption helpers that existed only to store
the Google OAuth client secret and refresh token. `buildMime` is unchanged
and reused directly as the raw MIME payload passed to `EmailMessage`.

**This is not safe to deploy yet.** Two things need to be true first, neither
of which could be confirmed in the recovery session (no Cloudflare zone/DNS
tool was available):

1. `discovertrenchesgroup.com` needs Workers email sending enabled —
   `npx wrangler email sending enable discovertrenchesgroup.com` — which was
   previously blocked because the domain's nameservers stayed at
   Zapmail/Google Cloud DNS rather than Cloudflare.
2. `wrangler.jsonc`'s `send_email` binding is the only new binding here; the
   `queues`/`workflows` resource names in that file are still TODO
   placeholders inferred from the bundle, not confirmed against the account.

Until #1 is confirmed, deploying this will make `sendLiveReply` fail closed
(`env.SEND_EMAIL` undefined -> `LIVE_REPLY_MAILBOX_NOT_CONNECTED`) rather than
silently misbehave, but live conversational replies will stop going out
entirely until it's sorted out. Don't run `wrangler deploy` from this branch
without checking that first.

The `gmail_connections` and `outreach_provider_credentials` D1 tables are now
dead (nothing reads or writes them) but were left in place rather than
migrated away, to keep this change scoped to the email-sending path.
