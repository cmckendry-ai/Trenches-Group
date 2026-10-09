# trenches-site (Cloudflare Worker)

Public website + client portal for trenchesgroup.com. `dist/index.js` is the esbuild
bundle that was live; the original sources (`src/estimates.js`, `src/account.js`,
`src/portal.js`, `src/proposals.js`, `src/worker.js`, per the bundle markers) are lost.

## What it does
- Serves the static site from `env.ASSETS` with canonical-URL redirects.
- Proposals / onboarding: `POST /api/proposals`, `/api/proposals/:token`, `/portal/proposals/:token`,
  Stripe Checkout for deposit + final payment, `POST /api/stripe/webhook`.
- Social-media and outreach-agent orders: `/api/social-orders[/..]`, `/api/social-intake/:token`,
  `/api/outreach-orders[/..]`, `/api/outreach-intake/:token`, intake pages under
  `/social-media/intake/` and `/outreach-agents/intake/`.
- Member portal API under `/api/portal/*`: signup, login, logout, me, account, services, addons,
  estimates, analytics, change-requests, setup, stripe-webhook, and admin-auth
  (`login`, `logout`, `setup`, `setup/confirm`, `status`; TOTP based).
- `POST /upload` stores files in R2 (`env.UPLOADS`), served from the public R2 URL
  `pub-c3f61584f4554fd699fb3d5dea486710.r2.dev`.
- Links out to the admin UI at `trenches-os-api.cmckendry-ai.workers.dev/admin`.

## External services
- Stripe REST API (`api.stripe.com/v1`): checkout sessions, subscriptions, webhook endpoints.
- Cloudflare Email Workers send binding (`env.EMAIL.send`) for portal mail.

## Bindings and secrets referenced
- `ASSETS` (static assets), `CLIENTS` (D1; `prepare`/`batch` calls, same schema as
  `trenches-os-api/migrations/0000_baseline.sql` portal tables), `UPLOADS` (R2), `EMAIL` (send_email).
- Secrets/vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PORTAL_STRIPE_WEBHOOK_SECRET`,
  `PORTAL_ADMIN_EMAIL`, `PORTAL_ADMIN_KEY`, `PORTAL_FROM_EMAIL`.

No hardcoded credentials were found in the bundle (the `sk_live_` string at line 595 is only a
prefix check used to label the Stripe key mode).

Recovered from the live Cloudflare deployment on 2026-10-01. Static assets (env.ASSETS) and the
wrangler binding config are NOT in this folder; export them from the Cloudflare dashboard.
