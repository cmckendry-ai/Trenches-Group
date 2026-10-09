# Operating review, 2026-10-01

Scope: everything reachable from this account. The Trenches-Group and Vivid
repos, seven Cloudflare Workers, the `trenches-production` D1 database, two
runners, Hyperagent threads, Google Drive, Monday. Numbers are from D1 queries
run on 2026-10-01 between 03:00 and 04:00 UTC.

Confidence tags: [Certain] = read from code or a query. [Likely] = consistent
with the evidence but not directly observed. [Guessing] = inference.

## 1. Verdict

[Certain] The pipeline has produced zero real conversations and zero revenue in
seven weeks, and it has been fully stalled since 2026-09-13. The reason it feels
hands-on is not that automation is missing. It is that every automated stage
hands off to a stage that is switched off, broken, or pointed at a dead
provider, so the only thing that ever moves a lead is you clicking in the
Command Center.

[Certain] You have also been building without a memory. The repo had one
commit, the Vivid repo has none, the original TypeScript source is gone, and
production drifted 600 lines past the repo in the two days after the recovery
commit. Every session has started from a fresh container and a summary of what
the last session thought it did. That is the single biggest reason the system
is hard to operate.

## 2. What the numbers say

Pipeline, lifetime (2026-08-16 to 2026-10-01):

| Stage | Count | Note |
|---|---|---|
| Prospecting campaigns created | 292 | 32 completed, 258 failed, 2 paused |
| Campaigns created in September | 240 | 20 completed, 220 failed |
| Candidates discovered | 1,149 | 699 enriched, 245 duplicate, 83 still queued |
| Leads | 730 | 281 in Aug, 448 in Sep, 1 in Oct (a test) |
| DISQUALIFIED | 347 | 189 "modern website found" |
| HUMAN_REVIEW | 361 | 127 "confidence below 0.70", 92 "priority C, hold", 70 "contradictory website research" |
| QUALIFIED | 19 | 0 of these have a verified email, 0 have a phone |
| AWAITING_REPLY | 1 | Ray's Roofing, since 2026-09-08 |
| Priority A | 2 | |
| Real outreach emails sent | 90 | 10 per day on 9 send days, 2026-08-31 to 2026-09-11, via Gmail |
| Genuine prospect replies | 0 | see below |
| Bounces | 3 or more | |
| Demo sites built | 0 | 3 demo jobs, all FAILED |
| Quotes | 2 | both tests, both viewed |
| Portal members | 2 | |
| Stripe payments | 0 | |

[Certain] The "81 inbound emails" in the database are not prospect replies. The
Gmail sync ingests the whole `connor@trenchesgroup.com` inbox. The 34 rows
classified OPT_OUT are Smartlead onboarding drips, Google Workspace billing,
Stripe marketing and Novo bank reminders. The rows classified PRICE are Google
Workspace invoices. The "AUTOMATION_QUESTION" is a newsletter from
chap@fenloproperties.com. The regex intent classifier has never seen a real
prospect sentence.

[Certain] Why the pipeline stalled, in order:

1. 2026-09-12: the Smartlead trial ended. No Smartlead campaign was ever
   created (no `SMARTLEAD_*_CAMPAIGN_ID` flag, zero `SMARTLEAD_CAMPAIGN_ENROLLED`
   events).
2. 2026-09-13: the outreach orchestrator was rewired to enroll into Smartlead
   and then paused (`OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED=false`, actor
   `CLAUDE_SAFETY_PAUSE`). Gmail sending stopped the same day.
3. 2026-09-13 onward: 110 concierge sequences with 255 pending email steps are
   orphaned. The live code never reads `outreach_sequence_steps` again.
4. 2026-09-21 to 2026-09-28: the cron kept creating 20 campaigns a day. Every
   one failed after 6 attempts because the Orgo runner's Claude OAuth session
   expired and the OpenAI key had no credits. 220 failed campaigns in
   September cost you runner time and produced nothing.
5. 2026-09-28: the Orgo runner stopped heartbeating. A Windows runner on your
   office PC took over and has been heartbeating since, but no campaign has
   been created since 2026-09-28 (the daily cap counts failed campaigns toward
   the 20-campaign backlog, so the orchestrator believes it is full). [Likely]
6. 2026-09-30: the Gmail reply stack (`sendLiveReply`, auto-reply, inbox
   sync, unsubscribe tokens) was deleted from the production bundle. Replies
   are now "human in Smartlead": the Smartlead webhook emails you at
   cmckendry.ai@gmail.com through a Cloudflare `EMAIL` binding and does nothing
   else. Demo delivery no longer emails the prospect either; it notifies you
   and still marks the lead DEMO_SENT, so lead state and reality diverge.
   Gmail OAuth now exists only to send quotes and quote-view alerts. That
   deleted code is still in commit 69f7d8d if you want it back.
7. 2026-09-28 to 2026-10-01: all other activity is quotes, portal, Stripe
   checkout and admin auth. Nothing touched the lead pipeline.

[Certain] Leads that reach QUALIFIED cannot be contacted. Website-track outreach
requires `email_verified=1`, which only the runner's enrichment can set. All 19
QUALIFIED leads have `has_email=0`. The 2 priority-A leads: one has an email
and sits QUALIFIED untouched since 2026-08-31; the other is in HUMAN_REVIEW for
contradictory research.

## 3. Why it is hands-on (root causes, not symptoms)

1. **No source of truth.** [Certain] Code lived in containers, got summarized
   into chat, and was rebuilt from memory. The README itself says prior
   session notes were wrong about Gmail being removed. Each rebuild added a
   new "phase" (V14, V15, Phase 3A, 3B, 3C, V19, V22, V23) and none removed the
   previous one. The bundle carries 29 modules and at least 8 display-only
   flags that nothing reads.
2. **Every gate defaults to "ask Connor".** [Certain] `DEMO_REQUIRE_APPROVAL=
   true`, `OUTREACH_EMAIL_AUTO_REPLY_MODE=DRAFT_ONLY`, follow-ups DRAFT_ONLY,
   SMS hard-locked to a test allowlist, demo automation off. Approving a draft
   changes a status column and sends nothing. The system was designed to be
   safe to demo, never flipped to run.
3. **The scorer and the gate disagree.** [Certain] A business with no website
   is exactly the target. The gap gate marks it ELIGIBLE, but the scorer gives
   digital-gap points only for a website *quality* value, so a no-website lead
   with quality UNKNOWN gets 0 of 40 points and rarely clears 65. That is why
   361 leads are in HUMAN_REVIEW and 19 are QUALIFIED. The queue you are
   clearing by hand is created by a scoring bug.
4. **The runner is a laptop.** [Certain] Discovery and enrichment run through
   a logged-in Claude Code CLI on a Claude Pro subscription, first on an Orgo
   VM, now on your Windows PC. When the OAuth session expires, everything
   stops and nothing tells you. There is no alert on `/health`, no DLQ replay,
   no notification channel for escalations.
5. **Four email identities, none finished.** [Certain] `connor@trenchesgroup.com`
   (Gmail OAuth; sent the 90 outreach emails and synced the whole inbox until
   2026-09-30; now sends only quotes), `connor.trenches@discovertrenchesgroup.com`
   (Smartlead mailbox, trial expired, never attached to a campaign),
   `replies@trenchesgroup.com` (Cloudflare `EMAIL` binding, notifies you of
   Smartlead replies that cannot arrive), `portal@trenchesgroup.com` (the
   portal, only emails you). As of 2026-09-30 there is no code path that
   sends a reply to a prospect at all.
6. **Two workers write one database with no contract.** [Certain]
   `trenches-site` and `trenches-os-api` both write `quotes`, `members` and
   `stripe_webhook_events`. Stripe sends the same event id to all three webhook
   endpoints, and whichever endpoint records it first makes the others skip it.
   A paid add-on can silently never activate.

## 4. What is broken right now, in priority order

Blockers to any revenue:

1. [Certain] Outreach is off and wired to a dead provider. Decide: Gmail only,
   or pay for Smartlead. Until then nothing sends.
2. [Certain] Qualified leads have no verified email. Enrichment must capture
   and verify email, or outreach must accept unverified email with bounce
   handling.
3. [Certain] Scoring bug above. Fix the digital-gap points to use
   `website_status` as well as `website_quality`.
4. [Certain] Inbox sync classifies vendor email as prospect intent. Filter
   inbound to threads the system sent, by `In-Reply-To`/`References` or by
   matching `to_email` against known leads.
5. [Certain] Campaign orchestrator: failed campaigns should not count toward
   backlog, and the runner should fail fast on an auth error instead of
   burning 6 attempts over 90 minutes per campaign.
6. [Certain] Prospector `prospector_jobs` has 140 city×trade rows at a 21-day
   cadence, all WEBSITE track, none CONCIERGE. The concierge offering has no
   feeder at all.

Also blocking:

- [Certain] `wrangler.jsonc` does not declare the `EMAIL` send binding,
  `SITE_BASE_URL`, the Stripe secrets, the cron trigger, or the queue and
  workflow names. A `wrangler deploy` from this repo today could strip the
  `EMAIL` binding and silently kill reply notifications.
- [Certain] `tryDeliverDemoEmail` marks the lead DEMO_SENT and the site
  PUBLISHED without sending anything to the prospect.

Security, fix before any public traffic:

7. [Certain] `POST /upload` on `trenches-site` has no auth, no size or type
   limit, caller-controlled content type and key. It is a public file host on
   your domain.
8. [Certain] Reflected XSS in the demo quote page (`service` and `timing`
   query params unescaped) on the same origin as `/admin`, whose key sits in
   `sessionStorage`.
9. [Certain] Stripe webhook idempotency collides across three endpoints
   (shared `stripe_webhook_events`, recorded before processing, so failures
   never retry). Neither `trenches-site` verifier checks the timestamp.
10. [Certain] ACH checkouts never complete: `checkout.session.async_payment_succeeded`
    is not handled, so ACH orders stay pending forever.
11. [Certain] Social order pricing subtracts the setup fee instead of adding
    it: choosing "Account Setup" cuts the first charge by $450.
12. [Certain] Demo slugs are the business name and any GET moves the lead to
    DEMO_VIEWED or PRICING_VIEWED. Worse, `GET /demo/:slug/checkout` is
    unauthenticated and creates a Stripe Checkout session, inserts a
    `client_orders` row and moves the lead to CHECKOUT_STARTED on every hit.
    A link scanner can do all of that.
12b. [Certain] The quote view token doubles as a pre-approved portal invite.
    Anyone who receives a forwarded estimate link can create a verified,
    pricing-unlocked portal account.
13. [Certain] Global pause does not stop Smartlead enrollment or the cron, and
    `normalizeDemoApprovedFlags` un-pauses leads a human paused.
14. [Certain] `CREDENTIAL_ENCRYPTION_KEY` is not in the documented secret list.
    If it is lost, every stored Gmail refresh token is unrecoverable.
15. [Certain] The Smartlead webhook secret is in `system_flags` in plaintext
    and returned by a GET.

Hygiene:

16. `wrangler.jsonc` has no cron trigger, no queue or workflow names, and the
    repo has no migrations. The worker cannot be redeployed from a clean
    account. [Certain]
17. 110 orphaned concierge sequences, 255 pending steps, 83 queued candidates
    and 3 failed demo jobs should be closed out so dashboards mean something.
18. The Vivid lead form sends through SMTP with a Gmail app password stored as
    a plain worker secret, and the chatbot runs Llama 3.1 8B with no lead
    handoff. Neither is in a repo. [Certain]

## 5. The plan: make it run without you

Principle: one channel, one provider, one path, flags on. Add a second
channel only after the first one has produced ten real conversations.

### Week 1: stop the bleeding and get memory

- Commit this review. Keep `CLAUDE.md`, `docs/SYSTEM-MAP.md` and
  `docs/CHANGELOG.md` current at the end of every session. (Done in this
  session.)
- Pull the cron schedule, queue and workflow names from the Cloudflare
  dashboard into `wrangler.jsonc`. Export the D1 schema into
  `migrations/0000_baseline.sql`. Then `wrangler deploy` from the repo once,
  so the repo is proven deployable.
- Close orphaned state: cancel the 110 sequences and 255 steps with
  `stop_reason='ORPHANED_2026-09-13'`, archive the 258 failed campaigns, fail
  the 83 queued candidates whose campaigns are dead.
- Lock `/upload` behind the member session and cap size and type. Escape the
  demo quote params. Both are one-line fixes.
- Set `PROSPECTOR_ORCHESTRATOR_ENABLED=false` until the runner question is
  settled, so the cron stops creating campaigns that fail.

### Week 2: one working path, end to end, by hand first

- Pick Gmail. Drop Smartlead from the orchestrator (keep the module, flag it
  off). Restore `sendLiveReply`/`buildMime` from commit 69f7d8d, add
  `In-Reply-To` and `References` headers, and send from
  `connor@trenchesgroup.com`. Keep `notifyConnor` so every reply still lands
  in your inbox.
- Fix the scorer so `website_status in (NONE, BROKEN, PARKED, SOCIAL_ONLY,
  PLACEHOLDER)` earns the digital-gap points.
- Fix inbound filtering to outreach threads only.
- Replace the regex classifier with a Claude API call (Haiku 4.5 is enough)
  that returns intent + confidence + a drafted reply. Keep DRAFT_ONLY for one
  week and read every draft.
- Re-run qualification on the 361 HUMAN_REVIEW leads with the fixed scorer.
  Expect 100 to 150 to qualify. [Guessing]
- Add email verification in enrichment (an MX check plus a verification API
  such as ZeroBounce or NeverBounce). Without this, bounces will burn the
  domain.

### Week 3: turn the gates to AUTO with guardrails

- `OUTREACH_EMAIL_AUTO_REPLY_MODE=AUTO` for intents INTERESTED, QUESTION,
  PRICE above confidence 0.85. Everything else drafts and escalates.
- Escalations and `/health` degradation push to your phone (Twilio SMS to
  you, or a Slack webhook). Today they sit in a table you have to open.
- Demo: keep `DEMO_REQUIRE_APPROVAL=true` but generate the demo *before* the
  prospect says yes, so the first reply can include a link. The static
  template path already exists. A demo you approve in 30 seconds beats one you
  approve after a reply you may miss.
- Daily digest email at 07:00 CT: sends, replies by intent, escalations open,
  runner status, campaigns failed. Generated by the cron, not by you.

### Week 4: remove the laptop

- Move discovery and enrichment off the Claude Code CLI onto the Claude API
  with an API key, run inside the Worker or a Cloudflare container. The
  "runner" exists only because the pipeline was built on a Pro login. An API
  key does not expire at 2 a.m.
- Then `PROSPECTOR_ORCHESTRATOR_ENABLED=true` with failed campaigns excluded
  from backlog and a hard stop after 3 consecutive auth failures.

### Do not do yet

- SMS. A2P 10DLC registration, consent capture and quiet hours are not built,
  and `phone_e164` is never written so inbound SMS cannot match a lead anyway.
- The concierge offering. It has no feeder, no reply handling and no booking
  sync. Finish the website offer first.
- More portal features. Two members and zero payments means the portal is
  ahead of the funnel.

## 6. How to use me as a second brain

What has not worked: asking for a deep dive from chat memory. Chat memory
produced the Gmail-removed claim that the README had to retract.

What works:

- **The repo is the memory, not the chat.** Every session reads
  `docs/SYSTEM-MAP.md` first and appends to `docs/CHANGELOG.md` last. A
  session that does not push is a session that did not happen.
- **State lives in D1, and I query it.** When you ask "what is going on",
  the answer comes from `events`, `system_flags`, `runner_status` and
  campaign counts, with the query in the message. Never from a summary.
- **Prod is checked before prod is touched.** Pull the live bundle, diff it
  against `src/index.js`, and only then edit. The section-6 recipe in the
  system map does this in three commands.
- **One flag change per message.** When a flag moves, the message says
  which flag, from what, to what, and why. Then `CHANGELOG.md` gets the line.
- **Decisions get a date and a reason.** `docs/DECISIONS.md` is where "we
  chose Gmail over Smartlead because…" lives, so the next session does not
  re-litigate it.
- **A weekly check-in I run.** A scheduled session that queries D1, compares
  to last week, reads `/health`, and writes `docs/reviews/<date>-weekly.md`.
  You read a page, not a dashboard. This is the first thing to set up once
  the pipeline is sending again.

## 7. Questions only you can answer

1. Gmail or Smartlead? Smartlead costs money and was never connected. Gmail
   caps you at low volume but it already works.
2. Is the Windows PC runner meant to be permanent, or a bridge until an
   API-key runner exists? It is the only thing keeping the prospector alive
   and it stops when the PC sleeps.
3. Is the concierge offering real, or an experiment? It is half the outreach
   code and has never produced a lead.
4. Who is `chap@fenloproperties.com`? The Fenlo site and D1 exist on your
   account with an empty database. If it is a client, it needs its own
   section in the system map.
5. Do you want the 361 HUMAN_REVIEW leads requalified automatically once the
   scorer is fixed, or do you want to review the first 50 by hand to check the
   new scoring before letting it run?
