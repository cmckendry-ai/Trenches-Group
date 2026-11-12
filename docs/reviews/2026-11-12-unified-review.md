# Unified review and action plan, 2026-11-12

Written for a reader who has not seen the chat. Dates are ISO.

## Read this first: this file is deliberately redacted

On 2026-11-12 this repository (`cmckendry-ai/Trenches-Group`) was **public** on
GitHub. For that reason this file leaves out:

- route names, file paths and line numbers for unpatched security findings,
- client and prospect names, contact details and amounts paid or quoted,
- anything about ventures outside Trenches Group.

The full findings were given to Connor in the review session on 2026-11-12
(session id `session_01DFNLAUVZsVcJgP5YvtmEVp`). Once this repo is private, or
the review is moved to the private `trenches-hq` repo, a later session should
replace this file with the unredacted version.

## What was reviewed

Read-only, on 2026-11-12:

- Titles and one-line summaries of 51 Claude sessions dated 2026-08-30 to
  2026-11-12. Personal sessions were excluded.
- This repo: 7 commits, the last on 2026-10-01.
- The private repo `trenches-hq`, which holds the code that has been deployed
  since 2026-10-10. Shallow clone, last commit 2026-10-27.
- One other private venture repo. Three further repos were empty or held only
  a README.

Not reviewed: the live Cloudflare account, the D1 database, Stripe, Smartlead
and OneDrive. No connector for them was authorized in the session. Every
statement about what is "live" comes from code or docs, not from production.
Nothing after 2026-10-27 was visible.

## State of this repo

- This repo is stale. `docs/SYSTEM-MAP.md`, `docs/DECISIONS.md` and the
  2026-10-01 review describe the system as of 2026-10-01. Active work moved to
  `trenches-hq` on 2026-10-10. Do not deploy from here.
- Of the week-one actions in `docs/reviews/2026-10-01-operating-review.md`,
  the repo and documentation items were done on 2026-10-01. None of the
  production, flag or security items is recorded as done in
  `docs/CHANGELOG.md`.
- The 18 security findings from the 2026-10-01 review were rechecked against
  the current `trenches-hq` source: 2 fixed, 6 partly fixed, 10 still present.
  New findings were added from the client portal and the site-edit runner.

## Findings, in general terms

### How the work is run

1. Build effort is far ahead of sales activity. Several systems exist in two
   or three versions (CRM, quoting, chatbot, outreach). The repos contain no
   record of outreach emails sent, replies or meetings since the stack was
   rebuilt.
2. Too many offerings for one operator. The public site and cart list about
   15, across more than one business. Payment evidence exists for one.
3. The limiting resource is the owner's decisions. About 45 dated items in
   `trenches-hq` are waiting on the owner. The oldest was raised 2026-09-01.
   Adding agent sessions adds to that queue.
4. Incidents produce written rules, not enforcement. The agent permission
   allowlist still permits production deploys and remote migrations that a
   written rule retired on 2026-10-22. Client logs stop between 2026-10-13 and
   2026-10-15.
5. Several prices sit below the house 55 percent margin floor, and the labor
   rate that the margin maths depends on is undecided.

### Security and compliance (classes only, details withheld)

Fix now:

1. This repo is public and contains the production schema, recovered worker
   bundles, account identifiers, third-party contact data and a prior list of
   vulnerabilities.
2. An account-linking flaw in the client portal can expose one client's data
   to someone else.
3. Cold outreach is not safe to enable: pause, suppression and opt-out
   handling are incomplete, and the sequence copy lacks opt-out wording.
4. One client site makes a credential claim that has not been verified.
5. The site-edit automation runs model-driven steps with more secrets and
   write access than they need.

Fix next: token reuse between quote links and portal invites, payment webhook
handling that can drop a paid event, chatbot spend and abuse controls, a single
shared admin key, an SMS opt-in handler that clears blocks it should keep, a
webhook secret that is logged and readable, an over-broad Google scope, and
reminder emails that can send without a human.

Single points of failure: the prospecting runner exists on one PC, one
encryption key has no documented backup, there is no scheduled database
export and no staging environment.

Looks solid: admin sign-in with TOTP and lockout, per-client scoping of portal
queries, server-side price recompute in the cart, CSP on generated demo pages,
send-only Gmail scope, no secrets committed in either repo, a single deploy
workflow with a concurrency lock.

## Action plan

### Today, owner only

- Set this repo to private and archive it. `trenches-hq` is the source of truth.
- In Smartlead, pause anything still sending and confirm the footer carries a
  postal address and an unsubscribe.
- Upgrade to Workers Paid. First raised 2026-09-01.
- Phone the prospects whose proposals have expired.

### Week 1, in `trenches-hq`, one pull request per item, each with a test

- Portal: require a verified email before linking an account to a client.
  Add email verification and password reset.
- Outreach: one enrollment gate used by every path. It checks global pause,
  suppression, lead state, live mode, daily cap and postal address.
- Outreach: push opt-outs to the sending provider. Add opt-out wording to
  every sequence.
- Remove production deploy and remote migration commands from the agent
  allowlist. Add a required reviewer to the deploy workflow.
- Disable the site-edit workflow until its secrets are scoped per step.
- Verify or remove the unverified credential claim.
- Keep invite tokens out of third-party analytics.

### Weeks 2 to 4

- One offer and one channel. Freeze other building.
- Work through the "fix next" list in order.
- Start one outreach campaign at a volume the sender can sustain, after week 1
  is merged. Track four numbers weekly: sent, replies, calls booked, dollars
  collected.
- Decide the labor rate. Reprice or remove anything under the margin floor.
- Fill or delete every open `NEEDS HUMAN INPUT` marker in `trenches-hq`
  (about 28 open on 2026-10-27).

### Operating rhythm

- One open-decisions file in `trenches-hq`, capped at 10 items. No new build
  session while it is over the cap.
- One 30-minute weekly review against the four numbers above.
- At most two concurrent agent sessions.

## Confidence

Counts in this file come from reading the two repos on 2026-11-12 and from
session summaries. They were not checked against production. Treat them as
accurate for the repos and unverified for the live system.
