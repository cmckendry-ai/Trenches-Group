# fenloservices-site (Cloudflare Worker)

The fenloservices.com site. The HTML, CSS and images (as data: URIs; the bundle is ~1 MB with
very long lines) are inlined in `dist/index.js`, which is why it does not use `env.ASSETS`.
Original source (`src/worker.js`) is lost.

## What it does
- Serves the single-page site at `/`, `/og-image.png`, and `/field-photos/1..5.jpg` from
  embedded data.
- Customer reviews with moderation:
  - `GET /api/reviews` lists approved reviews from D1 (`env.REVIEWS_DB`, table `reviews`).
  - `POST /api/reviews` verifies a Cloudflare Turnstile token
    (`challenges.cloudflare.com/turnstile/v0/siteverify`, secret `env.TURNSTILE_SECRET`),
    inserts the review as pending, then emails `info@fenloservices.com` from
    `noreply@fenloservices.com` via `env.EMAIL.send` with approve/reject links.
  - `GET /api/reviews/approve` and `GET /api/reviews/reject` take an HMAC token signed with
    `env.REVIEW_APPROVAL_SECRET` and flip the review status.
- Page loads Google Analytics (`googletagmanager.com/gtag/js`), Microsoft Clarity
  (`clarity.ms/tag/`), Turnstile (`challenges.cloudflare.com/turnstile/v0/api.js`), and a hero
  video hosted at `pub.hyperagent.com`.

## Bindings and secrets referenced
- `REVIEWS_DB` (D1; `reviews` table with columns id, name, rating, body, status, created_at,
  decided_at), `EMAIL` (send_email binding).
- Secrets: `TURNSTILE_SECRET`, `REVIEW_APPROVAL_SECRET`.
- The Turnstile *site key* embedded in the HTML (line 855) is the public widget key, not a secret.

No hardcoded credentials in the bundle.

Recovered from the live Cloudflare deployment on 2026-10-01. Static assets (env.ASSETS) and the
wrangler binding config are NOT in this folder; export them from the Cloudflare dashboard.
