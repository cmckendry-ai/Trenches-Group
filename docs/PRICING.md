# Trenches Group pricing

Drafted 2026-10-09. Status: PROPOSAL, not live. Nothing below has been loaded into
Stripe, the `addons` table, or the quote builder. Prices marked LIVE come from a D1
query on 2026-10-09. Everything else is a proposed number.

## 1. What is already live (D1 `trenches-production`, queried 2026-10-09)

| Item | Price | Source |
|---|---|---|
| Website build (demo checkout) | $500 one-time | `system_flags.STRIPE_BASE_PRICE_CENTS` = 50000 |
| Domain setup and publishing | $125 one-time | `STRIPE_DOMAIN_PRICE_CENTS` = 12500 |
| Website care plan (retainer) | $100 per month | `STRIPE_RETAINER_PRICE_CENTS` = 10000 |
| Social Media, Core Presence | $599 per month, $500 onboarding | `addons` table |
| Social Media, Growth Engine | $999 per month, $750 onboarding | `addons` table |
| Social Media, Local Authority | $1,599 per month, $1,000 onboarding | `addons` table |
| AI Concierge Diagnostic Call | free | `services` table |
| Process redesign, automation, workflows, takeoffs | custom quote | `services` table |

There is no live price for brand design, a larger website, social design only, or the
outreach agent. Those are proposed below.

## 2. A la carte menu (proposed)

### Brand design

| Tier | Price | Includes |
|---|---|---|
| Brand Essentials | $1,200 | Logo (primary and icon), color palette, two typefaces, one-page brand sheet, 2 revision rounds |
| Brand Complete | $2,500 | Everything in Essentials, plus logo suite (light, dark, stacked), business card and email signature, 12-page brand guide, social profile assets, 3 revision rounds |

### Website design

| Tier | Price | Includes |
|---|---|---|
| Starter (LIVE) | $500 + $125 domain | Single-page site, 2 revision rounds |
| Standard | $2,500 | Up to 5 pages, mobile-first, contact and quote form, basic SEO, analytics |
| Pro | $4,500 | Up to 10 pages, service and location pages, booking or estimate flow, Google Business Profile setup, full on-page SEO |
| Care plan (LIVE) | $100 per month | Updates, hosting, security. Optional on Starter, included in startup packages below |

### Social media design

| Item | Price | Includes |
|---|---|---|
| Template Kit | $750 one-time | 12 on-brand editable post and story templates, highlight covers, profile and cover art |
| Design retainer | $350 per month | 12 custom graphics per month, no posting or strategy |

### Social media marketing (LIVE)

| Tier | Monthly | Onboarding |
|---|---|---|
| Core Presence | $599 | $500 |
| Growth Engine | $999 | $750 |
| Local Authority | $1,599 | $1,000 |

## 3. Full startup packages (proposed)

Each package is brand, website, social design and social management together. The
one-time price is about 20 percent under the a la carte total. The monthly line is the
live social tier. The website care plan is included for as long as the social
subscription is active, which is the lock-in that justifies the discount.

| | Launch | Growth | Authority |
|---|---|---|---|
| Brand | Essentials | Complete | Complete |
| Website | Standard (5 pages) | Pro (10 pages) | Pro (10 pages) |
| Social design | Template Kit | Template Kit | Template Kit |
| Social management tier | Core Presence | Growth Engine | Local Authority |
| A la carte one-time total | $4,950 | $8,500 | $8,750 |
| **Package one-time price** | **$3,900** | **$6,500** | **$7,500** |
| **Monthly** | **$599** | **$999** | **$1,599** |
| Minimum term | 3 months | 3 months | 6 months |
| Year-one total | $11,088 | $18,488 | $26,688 |

A la carte totals include the tier's social onboarding fee ($500, $750, $1,000). Year
one is the one-time price plus 12 months of the monthly fee.

Payment terms: 50 percent at signing, 50 percent at website launch. The monthly fee
starts on the first posting month, not at signing.

## 4. Automated outreach agent add-on (proposed)

What it is, from the code (`docs/SYSTEM-MAP.md` section 2): prospecting by trade and
city, lead scoring, sequenced email from the client's own domain, reply notification,
and a daily digest. Capped at 10 sends per day per mailbox in the current build.

| | Outreach Starter | Outreach Pro |
|---|---|---|
| Setup (one-time) | $1,500 | $1,500 |
| Setup with any startup package | $1,000 | $1,000 |
| Monthly | $497 | $897 |
| Mailboxes and sending domains | 1 | 2 |
| Target markets (city and trade combos) | 3 | 10 |
| Email verification and bounce handling | yes | yes |
| Reply drafts for client approval | yes | yes |
| Auto-reply on high-confidence intents | no | yes |
| Daily digest and weekly report | weekly | daily and weekly |
| Pass-through costs | mailbox and domain at cost | mailbox and domain at cost |
| Minimum term | 3 months | 3 months |

Year-one cost with a startup package: Starter $6,964, Pro $11,764. Stand-alone setup
price adds $500 to each.

## 5. Gaps that affect these numbers

1. [Certain] The outreach agent has produced 0 genuine replies and 0 revenue in its own
   operation (`docs/reviews/2026-10-01-operating-review.md`, section 2). Live sending is
   off. Do not sell it at these prices until `OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED`
   is on with Connor's sign-off and the system has logged at least 10 real
   conversations. Until then, offer it only as a founding-client rate at 50 percent of
   the monthly fee, with a written "pilot, no result guaranteed" clause.
2. [Certain] The operating review lists a social order pricing bug (item 11): choosing
   "Account Setup" subtracts $450 instead of adding it. Fix before quoting social
   through the portal. Quote through `/api/quotes` with explicit line items instead.
3. [Likely] The outreach agent has no per-client isolation yet. It runs against one Gmail
   identity and one D1 database. Multi-client delivery needs a tenant column and a
   per-client mailbox before the second client.
4. [Guessing] The brand and website prices come from typical small-agency ranges, not
   from your win rate or costs. No Trenches client has paid above $500 so far (0 Stripe
   payments in the review period). Test the Launch package with three prospects before
   treating any number here as validated.
5. [Certain] Not modeled: your hours. Confirm Brand Complete plus Pro site fits in the
   time you will actually spend, or the 20 percent discount is a loss.

## 6. To make these live

- Add the packages and tiers as `addons` rows and `/api/quotes` templates.
- Create Stripe prices for the monthly lines. The `ensureStripePrice` path in
  `trenches-site` creates them on first subscribe.
- Wire the outreach add-on to `outreach_orders`, which exists in the site worker but has
  no priced `addons` row.
