# Trenches Group system map

As found on 2026-10-01. Every fact below comes from the live Cloudflare account,
the D1 database, or the deployed worker bundles, not from chat memory.

## 1. What exists

| Component | Where | State on 2026-10-01 |
|---|---|---|
| `trenches-os-api` Worker | Cloudflare, `trenches-os-api.cmckendry-ai.workers.dev` | Live. 5,898-line bundle. Cron + queue + workflow. Modified 2026-09-30. |
| `trenches-site` Worker | Cloudflare, serves trenchesgroup.com | Live. Static site + member portal + Stripe + estimates. Modified 2026-10-01. |
| `trenches-production` D1 | id `2261ffe8-712f-4b07-aec2-73bba0ad155e` | 16 MB, 68 tables, 31 migrations applied. Shared by both workers above. |
| `trenches-uploads` R2 | public `pub-c3f6…r2.dev` | Client logo uploads from the portal. |
| `vivid-lightscapes`, `vivid-leads-worker`, `vivid-chatbot-worker` | Cloudflare | Vivid Lightscapes site, lead form (SMTP via Gmail app password, KV `VIVID_LEADS`), Llama chatbot (KV `RATE_LIMIT`). |
| `chatbot-worker` | Cloudflare | Generic Anthropic-SDK site chatbot with `/leads` admin page. KV `SITES`, `LEADS`. |
| `fenloservices-site` + `fenlo-reviews` D1 | Cloudflare | Separate client site. D1 is empty (0 tables). |
| Runner `connor-windows-runner-01` | McK-Home-Office Windows box, Python 3.12, Claude Code 2.1.259 on a Claude Pro login | Heartbeating every minute as of 2026-10-01 03:26 UTC. Only provider: CLAUDE. |
| Runner `orgo-trenches-runner-01` | Orgo cloud desktop | Last seen 2026-09-28 01:52 UTC. Dead. Its Claude OAuth expired and its OpenAI key has no credits. |
| Hyperagent agents | hyperagent | `Prospector` (lead research), `Site Builder`. 12 threads, last activity 2026-09-06. |
| GitHub | `cmckendry-ai/Trenches-Group` (this repo), `cmckendry-ai/Vivid` (empty) | Trenches: 1 commit before this session. Vivid: zero commits. |
| Google Drive | cmckendry.ai@gmail.com | Intake forms, Apps Script, "Books (rebuilt 2026-09-28)", construction-lead sheets. Not wired to anything. |
| Monday.com | usdockdoor.monday.com, workspace "Connor McKendry Vibes" | Not referenced by any code. |

## 2. Lead lifecycle as coded

```
prospector_jobs (140 city x trade rows, 21-day cadence)
  -> cron creates prospecting_campaigns (cap 20/day WEBSITE, 6/day CONCIERGE)
  -> runner claims campaign  (/integrations/runner/claim)
  -> runner runs DISCOVERY via Claude Code CLI, posts candidates
  -> runner runs ENRICHMENT per candidate, posts to /integrations/runner/prospects
  -> leads row + lead_research row; EVENTS_QUEUE -> LeadLifecycleWorkflow
  -> validation + scoring (0-100, A/B/C/PASS) + website-gap hard gate
  -> QUALIFIED | HUMAN_REVIEW | DISQUALIFIED
QUALIFIED + WEBSITE track  -> demo_jobs (DEMO_AUTOMATION_ENABLED=false, so nothing)
DISQUALIFIED "modern site" + CONCIERGE track -> outreach_sequences CONCIERGE_FIRST (email)
  -> runAutonomousOutreach (OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED=false since 2026-09-13)
  -> Gmail OAuth send (connor@trenchesgroup.com), 10/day cap, 8-18 CT, Mon-Fri
Inbound (since 2026-09-30): Smartlead webhook only -> regex intent -> notifyConnor via EMAIL binding.
  The Gmail inbox sync and auto-reply path were removed from prod on 2026-09-30.
Demo delivery (since 2026-09-30): notifies Connor only, still marks lead DEMO_SENT.
Demo CTA: /demo/:slug/checkout -> Stripe Checkout ($500 + $125 domain) -> /integrations/stripe/webhook -> WON -> ONBOARDING
Quotes: /api/quotes -> Gmail send -> trenches-site tracks opens/views -> cron sends first-view alert
```

State machine states (from `recovered/state-machine.js`): NEW, QUALIFIED,
HUMAN_REVIEW, DISQUALIFIED, OUTREACH_SENT, AWAITING_REPLY, REPLIED, INTERESTED,
NOT_INTERESTED, OPTED_OUT, DEMO_*, CUSTOMER and related. Read the file for the
exact transition table.

## 3. Scheduled work (one cron, lease `scheduled-main`, 110 s)

Order inside `scheduled()` (`src/index.js` around line 5845):
1. `reapStaleDemoJobs`
2. `replayDeferredEvents` -> queue
3. `runDueProspectorJobs` (creates campaigns if `PROSPECTOR_ORCHESTRATOR_ENABLED`)
4. `keepRunnerAlive` (pings Orgo)
5. in parallel: `processDueFollowups` (draft only), `runAutonomousOutreach`,
   `repairDemoConsentHandoffs`, `reconcileApprovedDemoJobs`, `sendFirstViewAlerts`

The cron schedule itself is not in `wrangler.jsonc` (unknown; confirm in the
dashboard). Queue and Workflow resource names are also unconfirmed there.

## 4. Feature flags that matter (`system_flags`, 2026-10-01)

| Flag | Value | Effect |
|---|---|---|
| PROSPECTOR_ORCHESTRATOR_ENABLED | true | Cron keeps creating campaigns for the runner. |
| PROSPECTOR_JOBS_PER_DAY / _CONCIERGE | 20 / 6 | Daily campaign creation caps. |
| OUTREACH_EMAIL_LIVE_MODE | true | Real sends allowed… |
| OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED | false (CLAUDE_SAFETY_PAUSE, 2026-09-13) | …but nothing calls send. Outreach is off. |
| OUTREACH_EMAIL_AUTO_REPLY_MODE | DRAFT_ONLY | Replies are drafted, never sent. |
| OUTREACH_DAILY_EMAIL_CAP | 10 | |
| DEMO_AUTOMATION_ENABLED | false | No demo sites get built. |
| DEMO_REQUIRE_APPROVAL | true | |
| OUTREACH_LIVE_MODE (SMS) | false | Twilio path never went live. |
| SMARTLEAD_MAILBOX_EMAIL | connor.trenches@discovertrenchesgroup.com | Smartlead campaign ids were never created (no `SMARTLEAD_*_CAMPAIGN_ID` flag, zero `SMARTLEAD_CAMPAIGN_ENROLLED` events). Smartlead trial ended ~2026-09-12. |

## 5. Secrets and bindings

`trenches-os-api`: `DB`, `EVENTS_QUEUE`, `LEAD_WORKFLOW`, `PUBLIC_BASE_URL`,
`ADMIN_API_KEY`, `PROSPECT_INGEST_KEY`, `RUNNER_API_KEY`, `SMARTLEAD_API_KEY`,
`ORGO_API_KEY`, `ORGO_COMPUTER_ID`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
`TWILIO_MESSAGING_SERVICE_SID`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`CREDENTIAL_ENCRYPTION_KEY`, `SITE_BASE_URL` (optional), and the `EMAIL`
send_email binding (from `replies@trenchesgroup.com`). `wrangler.jsonc` is
missing the last three plus the cron trigger and the queue/workflow names.
Gmail OAuth client id/secret live encrypted in `outreach_provider_credentials`;
the refresh token lives encrypted in `gmail_connections`.

`trenches-site`: `CLIENTS` (same D1), `ASSETS`, `UPLOADS` (R2), `EMAIL` (Cloudflare
Email Service), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`PORTAL_STRIPE_WEBHOOK_SECRET`, `PORTAL_ADMIN_EMAIL`, `PORTAL_ADMIN_KEY`,
`PORTAL_FROM_EMAIL`.

## 6. Keeping this repo equal to prod

```sh
# 1. pull the live bundle (Cloudflare MCP: workers_get_worker_code trenches-os-api), save as live.js
# 2. strip the multipart framing
sed '1,3d' live.js | sed '/^\/\/# sourceMappingURL=index.js.map$/,$d' > src/index.js
# 3. regenerate the readable split
rm -f recovered/*.js
awk '/^\/\/ src\/[a-z0-9_-]*\.ts$/{ if(out) close(out); m=$0; sub(/^\/\/ src\//,"",m); sub(/\.ts$/,"",m); out="recovered/" m ".js"; next } out{ print > out }' src/index.js
```

## 7. Related reports

- `docs/reviews/2026-10-01-operating-review.md` — findings, numbers, and the plan.
- `docs/CHANGELOG.md` — dated log of what changed and what is still broken.
