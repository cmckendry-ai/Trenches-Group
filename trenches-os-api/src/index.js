var __freeze = Object.freeze;
var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __template = (cooked, raw) => __freeze(__defProp(cooked, "raw", { value: __freeze(raw || cooked.slice()) }));

// src/http.ts
function json(data, status = 200, headers = {}) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store",
      ...headers
    }
  });
}
__name(json, "json");
function errorResponse(code, message, status = 400, details) {
  return json({ error: { code, message, ...details === void 0 ? {} : { details } } }, status);
}
__name(errorResponse, "errorResponse");
async function readJsonObject(request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json.");
  }
  let value;
  try {
    value = await request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must contain valid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "INVALID_BODY", "Request body must be a JSON object.");
  }
  return value;
}
__name(readJsonObject, "readJsonObject");
var HttpError = class extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
  status;
  code;
  details;
  static {
    __name(this, "HttpError");
  }
};

// src/auth.ts
async function secureEqual(a, b) {
  const encoder = new TextEncoder();
  const [aHash, bHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b))
  ]);
  return crypto.subtle.timingSafeEqual(aHash, bHash);
}
__name(secureEqual, "secureEqual");
async function requireBearer(request, expected, notConfiguredCode) {
  if (!expected) throw new HttpError(503, notConfiguredCode, "Required secret is not configured.");
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "UNAUTHORIZED", "Missing bearer token.");
  const actual = header.slice("Bearer ".length);
  if (!await secureEqual(actual, expected)) throw new HttpError(401, "UNAUTHORIZED", "Invalid bearer token.");
}
__name(requireBearer, "requireBearer");
async function requireAdmin(request, env) {
  await requireBearer(request, env.ADMIN_API_KEY, "ADMIN_AUTH_NOT_CONFIGURED");
}
__name(requireAdmin, "requireAdmin");
async function requireProspectIngest(request, env) {
  await requireBearer(request, env.PROSPECT_INGEST_KEY, "PROSPECT_INGEST_NOT_CONFIGURED");
}
__name(requireProspectIngest, "requireProspectIngest");
async function requireRunner(request, env) {
  await requireBearer(request, env.RUNNER_API_KEY, "RUNNER_AUTH_NOT_CONFIGURED");
}
__name(requireRunner, "requireRunner");

// src/admin.ts
var _a;
function adminHtml() {
  return String.raw(_a || (_a = __template([`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Trenches Command Center</title>
  <style>
    :root{color-scheme:dark;--bg:#090a0c;--panel:#121419;--panel2:#181b21;--line:#2a3039;--text:#f5f6f8;--muted:#9ca5b4;--accent:#d8ff3e;--danger:#ff6363;--good:#58df8d;--warn:#ffc14d}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}.shell{max-width:1500px;margin:auto;padding:22px}.top{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:18px}.brand{display:flex;gap:12px;align-items:center}.mark{width:40px;height:40px;border:2px solid var(--accent);display:grid;place-items:center;font-weight:900;color:var(--accent)}h1{font-size:20px;margin:0}.sub{font-size:12px;color:var(--muted);margin-top:3px}.actions,.rowBtns{display:flex;gap:8px;flex-wrap:wrap}.btn{background:var(--panel2);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:8px;cursor:pointer}.btn:hover{border-color:#596270}.btn.primary{background:var(--accent);border-color:var(--accent);color:#0a0b06;font-weight:850}.btn.danger{background:#2a1618;border-color:#703238;color:#ffd0d0}.btn.good{background:#11271a;border-color:#2f6541;color:#c5ffd7}.btn.small{padding:6px 9px;font-size:12px}.status{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:12px}.dot{width:9px;height:9px;border-radius:50%;background:#6c7380}.dot.on{background:var(--good);box-shadow:0 0 0 3px rgba(88,223,141,.12)}.dot.off{background:var(--danger)}.modeBar{display:flex;gap:8px;margin-bottom:14px}.modeBtn{flex:1;padding:12px;font-weight:800;text-align:center;border-radius:9px}.modeBtn.active{background:var(--accent);border-color:var(--accent);color:#0a0b06}.metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:16px}.metric,.panel{background:var(--panel);border:1px solid var(--line);border-radius:11px}.metric{padding:14px}.metric .n{font-size:25px;font-weight:850}.metric .l{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:4px}.sectionTitle{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;border-bottom:1px solid var(--line)}.sectionTitle h2{font-size:15px;margin:0}.runnerBadge{font-size:12px;color:var(--muted)}.campaignGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px}.campaign{border:1px solid #252b34;background:#0e1115;border-radius:9px;padding:12px}.campaignHead{display:flex;justify-content:space-between;gap:10px}.campaignName{font-weight:800}.campaignMeta{font-size:12px;color:var(--muted);line-height:1.5;margin-top:5px}.progress{height:7px;background:#222830;border-radius:999px;overflow:hidden;margin:10px 0}.progress>span{display:block;height:100%;background:var(--accent)}.pill{display:inline-flex;padding:4px 7px;border:1px solid #343b47;border-radius:999px;font-size:10px;white-space:nowrap}.pill.A{color:#d9ffba;border-color:#4d7133}.pill.B{color:#e7f3ff;border-color:#496078}.pill.RUNNING{color:#c5ffd7;border-color:#315f43}.pill.READY{color:#ffe1a6;border-color:#7b6030}.pill.FAILED,.pill.ERROR{color:#ffc4c4;border-color:#70373b}.pill.COMPLETED{color:#c5ffd7;border-color:#315f43}.toolbar{display:flex;gap:9px;align-items:center;padding:12px;border-bottom:1px solid var(--line);flex-wrap:wrap}.toolbar input,.toolbar select,.modal input,.modal textarea,.modal select{background:#0d0f13;border:1px solid var(--line);color:var(--text);padding:9px 10px;border-radius:8px;outline:none}.toolbar input{min-width:260px;flex:1}.tableWrap{overflow:auto;max-height:54vh}table{width:100%;border-collapse:collapse;min-width:1020px}th,td{padding:11px 12px;border-bottom:1px solid #22262e;font-size:13px;text-align:left}th{position:sticky;top:0;background:#11141a;color:#aeb5c1;text-transform:uppercase;font-size:10px;letter-spacing:.06em}.business{font-weight:750}.muted{color:var(--muted)}.right{text-align:right}.empty{text-align:center;padding:30px;color:var(--muted)}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);display:none;align-items:flex-start;justify-content:center;padding:5vh 16px;z-index:20;overflow:auto}.overlay.open{display:flex}.modal{width:min(760px,100%);background:#101319;border:1px solid #323845;border-radius:12px;padding:18px}.modal h2{margin:0 0 13px;font-size:18px}.modal label{display:block;font-size:10px;color:var(--muted);margin:10px 0 5px;text-transform:uppercase;letter-spacing:.06em}.modal input,.modal textarea,.modal select{width:100%}.modal textarea{min-height:90px;resize:vertical}.modal .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.modalFooter{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.detailGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin:12px 0}.detailItem{padding:7px 0;border-bottom:1px solid #222832}.detailItem b{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;margin-bottom:3px}.timeline{border-top:1px solid var(--line);padding-top:12px;max-height:300px;overflow:auto}.event{padding:8px 0;border-bottom:1px solid #21252d}.eventHead{display:flex;justify-content:space-between;font-size:12px}.eventData{font-size:11px;color:#aeb5c1;margin-top:4px;white-space:pre-wrap}.login{position:fixed;inset:0;background:#08090b;display:grid;place-items:center;z-index:50}.loginCard{width:min(430px,92vw);background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:24px}.loginCard input{width:100%;margin:12px 0;background:#0b0d10;border:1px solid var(--line);color:#fff;padding:11px;border-radius:8px}.errorBar{display:none;background:#33191b;color:#ffd0d0;border:1px solid #6f3034;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px}.stack{display:grid;gap:14px}.qItem{display:grid;grid-template-columns:1fr 70px 110px 110px 34px;gap:6px;margin-bottom:6px;align-items:center}.qSend{display:grid;grid-template-columns:2fr 1fr auto;gap:8px;align-items:center}.qStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}@media(max-width:700px){.qItem{grid-template-columns:1fr 1fr}.qItem .qiDesc{grid-column:1/-1}.qSend,.qStats{grid-template-columns:1fr 1fr}}@media(max-width:1050px){.metrics{grid-template-columns:repeat(3,1fr)}.campaignGrid{grid-template-columns:1fr 1fr}}@media(max-width:700px){.shell{padding:12px}.top{align-items:flex-start;flex-direction:column}.metrics{grid-template-columns:repeat(2,1fr)}.campaignGrid{grid-template-columns:1fr}.modal .grid2,.detailGrid{grid-template-columns:1fr}.actions{width:100%}.btn{flex:1}.tableWrap{max-height:50vh}}
  </style>
</head>
<body>
<div class="login" id="login"><div class="loginCard"><h2>Trenches Command Center</h2><p class="muted">Enter the admin key created during the original deployment.</p><input id="keyInput" type="password" autocomplete="current-password" placeholder="Admin key"/><button class="btn primary" onclick="login()">Sign in</button><div class="errorBar" id="loginError"></div></div></div>
<div class="shell">
  <div class="top"><div class="brand"><div class="mark">TG</div><div><h1>Trenches Command Center</h1><div class="sub">Phase 4A v22 \xB7 Website Gap Gate + Manual Lead Control</div></div></div><div class="actions"><button class="btn" onclick="refreshAll()">Refresh</button><button class="btn danger" id="globalToggle" onclick="toggleGlobal()">Pause all automation</button><button class="btn primary" onclick="openCampaign()">+ Prospecting campaign</button></div></div>
  <div class="modeBar"><button class="btn modeBtn" id="modeWebsiteBtn" onclick="setMode('WEBSITE')">Website Business</button><button class="btn modeBtn" id="modeConciergeBtn" onclick="setMode('CONCIERGE')">AI Concierge Business</button></div>
  <div class="errorBar" id="errorBar"></div>
  <div class="metrics"><div class="metric"><div class="n" id="mTotal">\u2014</div><div class="l">Total leads</div></div><div class="metric"><div class="n" id="mQualified">\u2014</div><div class="l">Qualified</div></div><div class="metric"><div class="n" id="mPriority">\u2014</div><div class="l">Priority A/B</div></div><div class="metric"><div class="n" id="mCampaigns">\u2014</div><div class="l">Campaigns</div></div><div class="metric"><div class="n" id="mHuman">\u2014</div><div class="l">Human review</div></div><div class="metric"><div class="n" id="mWon">\u2014</div><div class="l">Customers</div></div></div>

  <div class="stack">
    <section class="panel"><div class="sectionTitle"><div><h2>Quotes &amp; Estimates</h2><div class="sub">Build a quote, send it to any email, and see every open and view. Clients see it on trenchesgroup.com and in their client portal.</div></div><div class="rowBtns" style="align-items:center"><span class="runnerBadge" id="quoteMailbox">Checking mailbox\u2026</span><span class="runnerBadge" id="quoteSummary">Loading\u2026</span><button class="btn primary" onclick="openQuote(null)">+ New quote</button></div></div><div class="tableWrap" style="max-height:420px"><table style="min-width:1000px"><thead><tr><th>Quote</th><th>Client</th><th>Title</th><th>Total</th><th>Status</th><th>Sent to</th><th>Opens</th><th>Views</th><th>Last viewed</th><th></th></tr></thead><tbody id="quoteRows"></tbody></table><div class="empty" id="quoteEmpty">No quotes yet. Click + New quote to build your first one.</div></div></section>
    <section class="panel" data-mode="WEBSITE"><div class="sectionTitle"><div><h2>Operator Dashboard <span class="pill READY">PHASE 5</span></h2><div class="sub">Your highest-value next actions. Uses existing Command Center data only\u2014no new provider calls.</div></div><div class="runnerBadge" id="operatorSummary">Loading priorities\u2026</div></div><div class="campaignGrid" id="operatorGrid"><div class="empty">Loading operator priorities\u2026</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Prospect Tracker <span class="pill READY">PHASE 7</span></h2><div class="sub">Export your Command Center prospects for a client-ready tracker. Includes opportunity, pitch hook, concept link, and current stage\u2014no Airtable account required.</div></div><button class="btn primary" onclick="downloadProspectTracker()">Download tracker CSV</button></div><div style="padding:12px 14px" class="sub">Use the CSV in Excel, Google Sheets, or import it into Airtable later if you choose. Your source of truth remains Command Center.</div></section>
    <section class="panel" data-mode="WEBSITE"><div class="sectionTitle"><div><h2>Client Launch Board <span class="pill READY">PHASE 8</span></h2><div class="sub">The handoff from live demo to customer. Review the next commercial or onboarding action without adding another system.</div></div><div class="runnerBadge" id="launchSummary">Loading launch work\u2026</div></div><div class="campaignGrid" id="launchGrid"><div class="empty">Loading client launch work\u2026</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Prospecting campaigns</h2><div class="sub">Fast discovery \u2192 deterministic filtering \u2192 one-business enrichment. One bad candidate cannot kill a campaign.</div></div><div class="rowBtns"><button class="btn small" id="archiveToggle" onclick="toggleArchived()">Show archived</button><div class="runnerBadge"><span class="dot" id="runnerDot"></span><span id="runnerText">Runner unknown</span></div></div></div><div class="campaignGrid" id="campaignGrid"><div class="empty">No campaigns yet.</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Prospector Job Queue <span class="pill READY">AUTO</span></h2><div class="sub">Rotating city \xD7 category grid. A capped number of due jobs get promoted into real prospecting campaigns automatically on the 2-minute scheduler tick \u2014 this does not bypass the daily cap or backlog limit below.</div></div><div class="rowBtns"><span class="runnerBadge" id="prospectorJobsSummary">Loading\u2026</span><button class="btn small primary" onclick="runProspectorJobsNow()">Run due jobs now</button></div></div><div class="tableWrap" style="max-height:320px"><table style="min-width:900px"><thead><tr><th>City</th><th>Category</th><th>Radius</th><th>Target</th><th>Cadence</th><th>Last run</th><th>Status</th><th></th></tr></thead><tbody id="prospectorJobRows"></tbody></table><div class="empty" id="prospectorJobEmpty">No prospector jobs seeded yet.</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Outreach Lab <span class="pill READY">TEST MODE</span></h2><div class="sub">Twilio plumbing only. Only numbers on the explicit test allowlist can receive SMS. Live prospect outreach is hard-locked.</div></div><div class="runnerBadge"><span class="dot" id="twilioDot"></span><span id="twilioText">Twilio status unknown</span></div></div><div class="toolbar"><input id="oPhone" placeholder="Your test phone, e.g. +16155551234"/><input id="oLabel" placeholder="Label, e.g. Connor iPhone"/><button class="btn" onclick="addTestNumber()">Add test number</button></div><div class="toolbar"><input id="oMessage" value="Trenches test: reply YES, PRICE, CALL ME, or STOP."/><button class="btn primary" onclick="sendTestSms()">Send test SMS</button></div><div style="padding:0 12px 10px"><div class="sub" id="outreachWebhookText"></div><div id="allowlistRows" class="rowBtns" style="margin-top:9px"></div></div><div class="tableWrap" style="max-height:260px"><table style="min-width:820px"><thead><tr><th>Time</th><th>Direction</th><th>Phone</th><th>Message</th><th>Intent</th><th>Status</th></tr></thead><tbody id="messageRows"></tbody></table><div class="empty" id="messageEmpty">No outreach test messages yet.</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Autonomous Outreach Orchestrator <span class="pill READY">EMAIL + SMS FOUNDATION</span></h2><div class="sub">Google Workspace email can run autonomously after one-time OAuth setup. Gmail replies feed the same conversation brain. SMS stays live-locked until Twilio approval; voice/social adapters remain disabled.</div></div><div class="runnerBadge"><span class="dot" id="gmailDot"></span><span id="gmailText">Gmail status unknown</span></div></div>
      <div class="toolbar"><input id="gClientId" placeholder="Smartlead sending mailbox (e.g. connor.trenches@discovertrenchesgroup.com)"/><button class="btn primary" onclick="saveSmartleadMailboxUi()">Save Smartlead mailbox</button></div>
      <div style="padding:0 12px 10px"><div class="sub" id="gmailCallback"></div></div>
      <div class="toolbar"><span class="dot on"></span><span class="sub" id="replyModelText">Replies are human-in-the-loop: answer leads directly in Smartlead. Genuine replies (not bounces/autoresponders) email a heads-up here.</span></div>
      <div style="padding:0 12px 10px"><div class="sub">Live conversational replies (price/skepticism/etc. answers) send through this mailbox via Gmail API, separate from Smartlead's bulk campaign sends. Sign in as connor.trenches@discovertrenchesgroup.com when prompted.</div></div>
      <div class="toolbar"><input id="emailFromName" placeholder="From name"/><input id="emailPostal" placeholder="Business postal address (required before live email)"/><input id="emailDailyCap" type="number" min="1" max="100" value="10" style="min-width:120px;max-width:150px"/><select id="emailReplyMode"><option value="DRAFT_ONLY">Replies: Draft only</option><option value="AUTO">Replies: Auto-send</option></select><button class="btn" onclick="saveEmailSettingsUi()">Save settings</button></div>
      <div class="toolbar"><button class="btn" id="emailLiveToggle" onclick="toggleEmailLiveUi()">Enable live email</button><button class="btn" id="emailAutoToggle" onclick="toggleEmailAutomationUi()">Enable autonomous sequences</button><button class="btn" onclick="runOrchestratorUi()">Run orchestrator now</button><div class="sub" id="emailModeText"></div></div>
      <div class="toolbar"><button class="btn" id="websiteTrackToggle" onclick="toggleWebsiteTrackUi()">Website outreach</button><button class="btn" id="conciergeTrackToggle" onclick="toggleConciergeTrackUi()">Concierge outreach</button><div class="sub">Independent per-pitch switches \u2014 each can run without the other, on top of the live-email/automation switches above.</div></div>
      <div class="toolbar"><input id="emailTestAddress" placeholder="Test email address"/><input id="emailTestLabel" placeholder="Label"/><button class="btn" onclick="addEmailTestAddressUi()">Allowlist test email</button><select id="emailTestLead" style="min-width:280px;flex:1"><option value="">Optional lead to simulate</option></select></div>
      <div class="toolbar"><input id="emailTestSubject" value="quick question about your business"/><input id="emailTestBody" value="Hey \u2014 Trenches OS email test. Reply YES, PRICE, WHAT'S THE CATCH, or UNSUBSCRIBE."/><button class="btn primary" onclick="sendEmailTestUi()">Send test email</button></div>
      <div style="padding:0 12px 10px"><div id="emailAllowlistRows" class="rowBtns"></div></div>
      <div class="sectionTitle"><div><h2>Email activity</h2><div class="sub">Inbound replies are polled automatically and mapped back to the lead/thread.</div></div></div><div class="tableWrap" style="max-height:260px"><table style="min-width:980px"><thead><tr><th>Time</th><th>Direction</th><th>Business</th><th>Email</th><th>Subject</th><th>Intent</th><th>Outcome</th><th>Status</th></tr></thead><tbody id="emailMessageRows"></tbody></table><div class="empty" id="emailMessageEmpty">No email activity yet.</div></div>
      <div class="sectionTitle"><div><h2>Autonomous sequences</h2><div class="sub">Priority A/B + VALID + verified email. Daily cap and suppression rules apply.</div></div></div><div class="tableWrap" style="max-height:260px"><table style="min-width:900px"><thead><tr><th>Business</th><th>Priority</th><th>Strategy</th><th>Status</th><th>Step</th><th>Next action</th></tr></thead><tbody id="sequenceRows"></tbody></table><div class="empty" id="sequenceEmpty">No autonomous email sequences yet.</div></div>
    </section>
    <section class="panel" data-mode="WEBSITE"><div class="sectionTitle"><div><h2>Conversation Test Bench <span class="pill READY">DRAFT ONLY</span></h2><div class="sub">No real prospect messages are sent. Normal replies keep the conversation moving toward a free live-preview demo; opt-outs still stop immediately.</div></div><div class="runnerBadge">Live auto-replies locked</div></div><div class="toolbar"><select id="simLead" style="min-width:320px;flex:1"></select><input id="simMessage" value="Yes, what is this about?" placeholder="Simulated prospect reply"/><button class="btn primary" onclick="simulateConversation()">Simulate reply</button></div><div class="toolbar"><button class="btn" onclick="makeOpenerDraft()">Draft opener</button><button class="btn" onclick="scheduleFollowupsUi()">Schedule 24h / 72h / 7d follow-ups</button><button class="btn" onclick="runFollowupsUi()">Draft due follow-ups now</button><div class="sub" id="simResult" style="flex:1"></div></div><div class="sectionTitle"><div><h2>Reply drafts</h2><div class="sub">Human-reviewable drafts only. Approving a draft does not send SMS in Phase 3B.</div></div></div><div class="tableWrap" style="max-height:300px"><table style="min-width:1000px"><thead><tr><th>Time</th><th>Business</th><th>Intent</th><th>Draft</th><th>Confidence</th><th>Status</th><th>Actions</th></tr></thead><tbody id="draftRows"></tbody></table><div class="empty" id="draftEmpty">No conversation drafts yet.</div></div><div class="sectionTitle"><div><h2>Follow-up queue</h2><div class="sub">The scheduler creates drafts when follow-ups become due; it does not auto-send.</div></div></div><div class="tableWrap" style="max-height:260px"><table style="min-width:900px"><thead><tr><th>Business</th><th>Step</th><th>Due</th><th>Status</th><th>Message</th></tr></thead><tbody id="followupRows"></tbody></table><div class="empty" id="followupEmpty">No follow-ups scheduled.</div></div><div class="sectionTitle"><div><h2>Human escalation</h2><div class="sub">CALL ME and angry/sensitive replies are surfaced here. Normal questions and unknown replies stay conversational instead of failing.</div></div></div><div class="tableWrap" style="max-height:260px"><table style="min-width:900px"><thead><tr><th>Time</th><th>Business</th><th>Priority</th><th>Reason</th><th>Recommended action</th><th>Status</th><th></th></tr></thead><tbody id="escalationRows"></tbody></table><div class="empty" id="escalationEmpty">No escalations.</div></div></section>
    <section class="panel" data-mode="WEBSITE"><div class="sectionTitle"><div><h2>Demo Fulfillment <span class="pill READY">PHASE 4</span></h2><div class="sub">Command Center balances website builds across available providers, applies deterministic and independent QA, then waits for your approval before delivery.</div></div><div class="runnerBadge"><span class="dot on"></span><span id="demoModeText">Loading demo automation\u2026</span></div></div><div class="toolbar"><select id="demoLead" style="min-width:320px;flex:1"></select><button class="btn primary" onclick="queueDemoUi()">Queue demo build</button><button class="btn" onclick="configureDemoQualityUi()">Quality controls</button><button class="btn" id="demoAutoToggle" onclick="toggleDemoAutomation()">Toggle auto build</button><button class="btn" id="demoDeliverToggle" onclick="toggleDemoDelivery()">Toggle auto delivery</button></div><div class="toolbar"><select id="staticDemoLead" style="min-width:320px;flex:1"><option value="">Choose any active lead for a no-cost sample\u2026</option></select><button class="btn good" onclick="createStaticDemoUi()">Create no-cost sample</button><div class="sub">Uses a static, clearly labeled concept\u2014no AI call or email delivery.</div></div><div class="tableWrap" style="max-height:320px"><table style="min-width:1100px"><thead><tr><th>Business</th><th>Job / Builder</th><th>State</th><th>QA</th><th>Views</th><th>CTA</th><th>Preview</th><th>Delivery</th></tr></thead><tbody id="demoRows"></tbody></table><div class="empty" id="demoEmpty">No demos yet.</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Lead pipeline</h2><div class="sub" id="systemText">Loading system status\u2026</div></div><div class="rowBtns"><button class="btn" onclick="reAuditWebsiteGapsUi()">Re-audit website gaps</button><button class="btn" onclick="openImport()">Manual research import</button></div></div><div class="toolbar"><input id="search" placeholder="Search business, city, phone, email" oninput="debouncedLoad()"/><select id="stateFilter" onchange="loadLeads()"><option value="">All states</option><option>QUALIFIED</option><option>HUMAN_REVIEW</option><option>DISQUALIFIED</option><option>RESEARCHING</option><option>QUALIFYING</option></select><select id="priorityFilter" onchange="loadLeads()"><option value="">All priorities</option><option>A</option><option>B</option><option>C</option><option>PASS</option></select></div><div class="tableWrap"><table><thead><tr><th>Business</th><th>Location</th><th>Industry</th><th>Gap</th><th>Score</th><th>Priority</th><th>State</th><th>Phone</th><th>Updated</th><th></th></tr></thead><tbody id="leadRows"></tbody></table><div class="empty" id="leadEmpty">No leads yet.</div></div></section>
  </div>
</div>

<div class="overlay" id="campaignOverlay" onclick="overlayClose(event,'campaignOverlay')"><div class="modal"><h2>New prospecting campaign</h2><div class="grid2"><div><label>Industry</label><input id="cIndustry" value="Tree Service"/></div><div><label>Target prospects</label><input id="cTarget" type="number" min="1" max="300" value="10"/></div></div><div class="grid2"><div><label>Center city / location</label><input id="cCenterLocation" value="Murfreesboro, TN" placeholder="e.g. Murfreesboro, TN"/></div><div><label>Radius from city (miles)</label><input id="cRadiusMiles" type="number" min="1" max="100" step="1" value="25"/></div></div><div class="sub" style="margin-top:7px">Trenches will discover businesses around the center city within the requested radius instead of requiring a manual city list.</div><div class="grid2"><div><label>Minimum Google rating (optional)</label><input id="cMinRating" type="number" min="0" max="5" step="0.1" placeholder="e.g. 4.2"/></div><div><label>Minimum review count (optional)</label><input id="cMinReviews" type="number" min="0" placeholder="e.g. 10"/></div></div><div class="grid2"><div><label>Discovery provider</label><select id="cDiscoveryProvider"><option value="AUTO">Auto balance</option><option value="HYPERAGENT">HyperAgent</option><option value="CLAUDE">Claude</option><option value="OPENAI">OpenAI API</option></select></div><div><label>Enrichment provider</label><select id="cEnrichmentProvider"><option value="AUTO">Auto balance</option><option value="CLAUDE">Claude</option><option value="OPENAI">OpenAI API</option><option value="HYPERAGENT">HyperAgent</option></select></div></div><div class="grid2"><div><label>Fallback if provider fails</label><select id="cFallback"><option value="true">On \u2014 try another configured provider</option><option value="false">Off \u2014 stay on selected provider</option></select></div><div><label>Claude model (when Claude is used)</label><select id="cModel"><option value="sonnet">Claude Sonnet</option><option value="opus">Claude Opus</option></select></div></div><div class="sub" style="margin-top:7px">Auto balances successful jobs across whichever providers are configured on the Orgo runner. OpenAI API usage is billed separately from ChatGPT Pro.</div><label>Notes (optional)</label><textarea id="cNotes" style="min-height:70px"></textarea><div class="modalFooter"><button class="btn" onclick="closeOverlay('campaignOverlay')">Cancel</button><button class="btn primary" onclick="createCampaign()">Start prospecting</button></div></div></div>

<div class="overlay" id="campaignDetailOverlay" onclick="overlayClose(event,'campaignDetailOverlay')"><div class="modal" id="campaignDetail"></div></div>
<div class="overlay" id="leadDetailOverlay" onclick="overlayClose(event,'leadDetailOverlay')"><div class="modal" id="leadDetail"></div></div>
<div class="overlay" id="quoteOverlay" onclick="overlayClose(event,'quoteOverlay')"><div class="modal" id="quoteModal" style="width:min(900px,100%)"></div></div>
<div class="overlay" id="importOverlay" onclick="overlayClose(event,'importOverlay')"><div class="modal"><h2>Manual researched prospect import</h2><div class="sub">Fallback/testing only. Native campaigns should normally populate leads automatically.</div><label>JSON batch</label><textarea id="importJson" style="min-height:310px;font-family:ui-monospace,Consolas,monospace;font-size:12px"></textarea><div class="modalFooter"><button class="btn" onclick="loadSampleImport()">Load sample</button><button class="btn" onclick="closeOverlay('importOverlay')">Cancel</button><button class="btn primary" onclick="importProspects()">Validate & import</button></div></div></div>
<script>
let adminKey=sessionStorage.getItem('trenches_admin_key')||'';let globalPaused=false;let timer=null;let showArchived=false;
let businessMode=(function(){try{return localStorage.getItem('trenches_mode')==='CONCIERGE'?'CONCIERGE':'WEBSITE'}catch(e){return 'WEBSITE'}})();
function setMode(mode){businessMode=mode;try{localStorage.setItem('trenches_mode',mode)}catch(e){}applyModeVisibility();refreshAll().catch(()=>{})}
function applyModeVisibility(){document.querySelectorAll('[data-mode]').forEach(el=>{el.style.display=el.getAttribute('data-mode')===businessMode?'':'none'});const wb=document.getElementById('modeWebsiteBtn'),cb=document.getElementById('modeConciergeBtn');if(wb)wb.className='btn modeBtn'+(businessMode==='WEBSITE'?' active':'');if(cb)cb.className='btn modeBtn'+(businessMode==='CONCIERGE'?' active':'')}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,opts={}){const h=new Headers(opts.headers||{});h.set('Authorization','Bearer '+adminKey);if(opts.body&&!h.has('Content-Type'))h.set('Content-Type','application/json');const r=await fetch(path,{...opts,headers:h});let b={};try{b=await r.json()}catch{}if(r.status===401){logout();throw new Error('Admin key rejected.')}if(!r.ok)throw new Error(b?.error?.message||('Request failed: '+r.status));return b}
async function downloadProspectTracker(){try{const r=await fetch('/api/tracker/export.csv',{headers:{Authorization:'Bearer '+adminKey}});if(r.status===401){logout();throw new Error('Admin key rejected.')}if(!r.ok)throw new Error('Tracker export failed: '+r.status);const blob=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='trenches-prospect-tracker.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500)}catch(e){showError(e)}}
function showError(e){const b=document.getElementById('errorBar');b.textContent=e instanceof Error?e.message:String(e);b.style.display='block';setTimeout(()=>b.style.display='none',9000)}
async function login(){const k=document.getElementById('keyInput').value.trim();if(!k)return;adminKey=k;try{await api('/api/system/status');sessionStorage.setItem('trenches_admin_key',k);document.getElementById('login').style.display='none';await refreshAll();applyDeepLink()}catch(e){adminKey='';document.getElementById('loginError').textContent=e.message;document.getElementById('loginError').style.display='block'}}function logout(){sessionStorage.removeItem('trenches_admin_key');adminKey='';document.getElementById('login').style.display='grid'}
function applyDeepLink(){try{const p=new URLSearchParams(location.search),leadId=p.get('leadId');if(leadId)openLead(encodeURIComponent(leadId))}catch(e){}}
async function refreshAll(){try{await Promise.all([loadDashboard(),loadSystem(),loadRunner(),loadCampaigns(),loadProspectorJobs(),loadOutreach(),loadEmailOutreach(),loadConversation(),loadDemos(),loadLeads(),loadOperatorDesk(),loadLaunchBoard(),loadQuotes(),loadQuoteMailbox()])}catch(e){showError(e)}}
async function loadDashboard(){const d=await api('/api/dashboard'),c=d.counts||{};document.getElementById('mTotal').textContent=d.total??0;document.getElementById('mQualified').textContent=(c.QUALIFIED||0)+(c.OUTREACH_READY||0);document.getElementById('mPriority').textContent=(d.priorityCounts?.A||0)+(d.priorityCounts?.B||0);document.getElementById('mCampaigns').textContent=Object.values(d.campaigns||{}).reduce((a,b)=>a+Number(b||0),0);document.getElementById('mHuman').textContent=d.humanRequired||0;document.getElementById('mWon').textContent=(c.WON||0)+(c.ACTIVE_CUSTOMER||0)}
async function loadOperatorDesk(){const [leadData,demoData]=await Promise.all([api('/api/leads?limit=200'),api('/api/demos/status')]),sites=new Map((demoData.sites||[]).map(x=>[x.lead_id,x])),jobs=new Map((demoData.jobs||[]).map(x=>[x.lead_id,x])),leads=(leadData.leads||[]).filter(x=>!['DISQUALIFIED','OPTED_OUT','DUPLICATE','LOST','ACTIVE_CUSTOMER'].includes(x.current_state)).sort((a,b)=>Number(b.opportunity_score||0)-Number(a.opportunity_score||0)).slice(0,6),grid=document.getElementById('operatorGrid');grid.innerHTML='';let ready=0,review=0;for(const l of leads){const site=sites.get(l.id),job=jobs.get(l.id),preview=site?'<a class="btn small good" target="_blank" rel="noopener" href="'+esc((demoData.publicBaseUrl||'')+'/demo/'+site.slug)+'">See new website</a><a class="btn small" target="_blank" rel="noopener" href="'+esc((demoData.publicBaseUrl||'')+'/demo/'+site.slug+'/quote')+'">Try quote flow</a>':'';const action=site?'Review preview':(l.current_state==='HUMAN_REVIEW'?'Resolve review':job?(job.status==='FAILED'?'Fix build path':'Build in progress'):(l.current_state==='DEMO_APPROVED'?'Queue demo':'Advance outreach'));if(site)ready++;if(l.current_state==='HUMAN_REVIEW'||job?.status==='FAILED')review++;grid.insertAdjacentHTML('beforeend','<div class="campaign"><div class="campaignHead"><div><div class="campaignName">'+esc(l.business_name)+'</div><div class="campaignMeta">'+esc(l.city)+', '+esc(l.state)+' \xB7 '+esc(l.industry)+'</div></div><span class="pill '+esc(l.priority||'READY')+'">'+esc(l.priority||'\u2014')+'</span></div><div class="campaignMeta" style="margin-top:10px">'+esc(l.website||'No website recorded')+'</div><div class="campaignMeta">Score '+esc(l.opportunity_score??'\u2014')+' \xB7 '+esc(l.current_state)+'</div><div class="campaignMeta" style="color:var(--accent);margin-top:7px">Next: '+esc(action)+'</div><div class="rowBtns" style="margin-top:10px"><button class="btn small" data-operator-lead="'+esc(encodeURIComponent(l.id))+'">Open lead</button>'+preview+'</div></div>')}if(!leads.length)grid.innerHTML='<div class="empty">No active priority leads yet. Start a prospecting campaign or review your lead pipeline.</div>';document.getElementById('operatorSummary').textContent=ready+' preview'+(ready===1?'':'s')+' ready \xB7 '+review+' need review';document.querySelectorAll('[data-operator-lead]').forEach(b=>b.addEventListener('click',()=>openLead(b.getAttribute('data-operator-lead'))))}
async function loadLaunchBoard(){const [leadData,demoData]=await Promise.all([api('/api/leads?limit=200'),api('/api/demos/status')]),sites=new Map((demoData.sites||[]).map(x=>[x.lead_id,x])),commercial=new Set(['DEMO_READY','DEMO_SENT','DEMO_VIEWED','PRICING_VIEWED','CHECKOUT_STARTED','WON','ONBOARDING','LIVE','ACTIVE_CUSTOMER']),leads=(leadData.leads||[]).filter(x=>commercial.has(x.current_state)||sites.has(x.id)).sort((a,b)=>Number(b.opportunity_score||0)-Number(a.opportunity_score||0)).slice(0,9),grid=document.getElementById('launchGrid');grid.innerHTML='';let proposal=0,onboarding=0;for(const l of leads){const site=sites.get(l.id),state=l.current_state,action=['PRICING_VIEWED','CHECKOUT_STARTED'].includes(state)?'Send proposal / close terms':['WON','ONBOARDING'].includes(state)?'Collect onboarding details':state==='LIVE'?'Confirm launch handoff':state==='ACTIVE_CUSTOMER'?'Manage active customer':site?'Approve and send preview':'Advance to a live demo';if(['PRICING_VIEWED','CHECKOUT_STARTED'].includes(state))proposal++;if(['WON','ONBOARDING','LIVE'].includes(state))onboarding++;const preview=site?'<a class="btn small good" target="_blank" rel="noopener" href="'+esc((demoData.publicBaseUrl||'')+'/demo/'+site.slug)+'">Open preview</a>':'';grid.insertAdjacentHTML('beforeend','<div class="campaign"><div class="campaignHead"><div><div class="campaignName">'+esc(l.business_name)+'</div><div class="campaignMeta">'+esc(l.city)+', '+esc(l.state)+'</div></div><span class="pill '+esc(l.priority||'READY')+'">'+esc(l.priority||'\u2014')+'</span></div><div class="campaignMeta" style="margin-top:10px">Stage: <b>'+esc(state)+'</b></div><div class="campaignMeta" style="color:var(--accent);margin-top:7px">Next: '+esc(action)+'</div><div class="rowBtns" style="margin-top:10px"><button class="btn small" data-launch-lead="'+esc(encodeURIComponent(l.id))+'">Open lead</button>'+preview+'</div></div>')}if(!leads.length)grid.innerHTML='<div class="empty">No commercial handoffs yet. A lead will appear here once a preview is ready or the sales process advances.</div>';document.getElementById('launchSummary').textContent=proposal+' proposal'+(proposal===1?'':'s')+' \xB7 '+onboarding+' onboarding';document.querySelectorAll('[data-launch-lead]').forEach(b=>b.addEventListener('click',()=>openLead(b.getAttribute('data-launch-lead'))))}
async function loadSystem(){const d=await api('/api/system/status');globalPaused=!!d.globalAutomationPaused;document.getElementById('systemText').textContent=globalPaused?'Automation paused':(d.outreachEnabled?'System online \xB7 outreach enabled':'System online \xB7 outreach locked');const b=document.getElementById('globalToggle');b.textContent=globalPaused?'Resume all automation':'Pause all automation';b.className='btn '+(globalPaused?'good':'danger')}
async function loadRunner(){const d=await api('/api/runner/status');const dot=document.getElementById('runnerDot'),text=document.getElementById('runnerText');dot.className='dot '+(d.online?'on':'off');if(d.online){const r=d.runner||{};let ps='';try{const m=JSON.parse(r.metadata_json||'{}');if(Array.isArray(m.providers))ps=' \xB7 '+m.providers.join('/')}catch{}text.textContent='Orgo runner online'+ps+(r.claude_version?' \xB7 Claude '+r.claude_version:'')}else{text.textContent='Orgo runner offline / sleeping'}}
async function loadCampaigns(){const qp=new URLSearchParams();if(showArchived)qp.set('archived','true');qp.set('offering',businessMode);const d=await api('/api/campaigns?'+qp.toString()),g=document.getElementById('campaignGrid');g.innerHTML='';document.getElementById('archiveToggle').textContent=showArchived?'Show active':'Show archived';if(!d.campaigns?.length){g.innerHTML='<div class="empty">'+(showArchived?'No archived campaigns.':'No campaigns yet. Create your first real prospecting campaign.')+'</div>';return}for(const c of d.campaigns){const target=c.requested_count||0,done=c.enriched||0,pct=target?Math.min(100,Math.round(done/target*100)):0,loc=campaignGeo(c);const counts='Enriched '+done+' / '+target+' \xB7 Raw '+(c.raw_discovered||0)+' \xB7 Queued '+(c.queued||0)+' \xB7 Failed '+(c.enrichment_failed||0);const priorities='A '+(c.priority_a||0)+' \xB7 B '+(c.priority_b||0)+' \xB7 C '+(c.priority_c||0)+' \xB7 PASS '+(c.priority_pass||0),providers='Discover '+(c.discovery_provider||'CLAUDE')+' \xB7 Enrich '+(c.enrichment_provider||'CLAUDE')+' \xB7 Fallback '+(Number(c.fallback_enabled)!==0?'ON':'OFF');g.insertAdjacentHTML('beforeend','<div class="campaign"><div class="campaignHead"><div><div class="campaignName">'+esc(c.industry)+'</div><div class="campaignMeta">'+esc(loc)+'</div></div><span class="pill '+esc(c.status)+'">'+esc(c.archived_at?'ARCHIVED':c.status)+'</span></div><div class="progress"><span style="width:'+pct+'%"></span></div><div class="campaignMeta">'+esc(counts)+'</div><div class="campaignMeta">'+esc(priorities)+' \xB7 Filtered '+(c.filtered||0)+' \xB7 Duplicates '+(c.deduped||0)+'</div><div class="campaignMeta">'+esc(providers)+'</div>'+(c.last_error?'<div class="campaignMeta" style="color:#ffbcbc">Last issue: '+esc(c.last_error)+'</div>':'')+'<div class="rowBtns" style="margin-top:10px"><button class="btn small" data-campaign="'+esc(encodeURIComponent(c.id))+'">Open</button>'+(!c.archived_at&&(c.status==='RUNNING'||c.status==='READY')?'<button class="btn small" data-pause="'+esc(encodeURIComponent(c.id))+'">Pause</button>':'')+(!c.archived_at&&c.status==='PAUSED'?'<button class="btn small good" data-resume="'+esc(encodeURIComponent(c.id))+'">Resume</button>':'')+(c.archived_at?'<button class="btn small good" data-restore="'+esc(encodeURIComponent(c.id))+'">Restore</button>':'<button class="btn small" data-archive="'+esc(encodeURIComponent(c.id))+'">Archive</button>')+'</div></div>')}document.querySelectorAll('[data-campaign]').forEach(b=>b.addEventListener('click',()=>openCampaignDetail(b.getAttribute('data-campaign'))));document.querySelectorAll('[data-pause]').forEach(b=>b.addEventListener('click',()=>campaignAction(b.getAttribute('data-pause'),'pause')));document.querySelectorAll('[data-resume]').forEach(b=>b.addEventListener('click',()=>campaignAction(b.getAttribute('data-resume'),'resume')));document.querySelectorAll('[data-archive]').forEach(b=>b.addEventListener('click',()=>archiveAction(b.getAttribute('data-archive'),'archive')));document.querySelectorAll('[data-restore]').forEach(b=>b.addEventListener('click',()=>archiveAction(b.getAttribute('data-restore'),'restore')))}
function campaignGeo(c){return c.center_location&&c.radius_miles?(c.center_location+' \xB7 '+c.radius_miles+' mi radius'):((c.geography||[]).join(' \xB7 '))}
function toggleArchived(){showArchived=!showArchived;loadCampaigns().catch(showError)}
function openCampaign(){document.getElementById('campaignOverlay').classList.add('open');document.getElementById('cIndustry').focus()}function closeOverlay(id){document.getElementById(id).classList.remove('open')}function overlayClose(e,id){if(e.target.id===id)closeOverlay(id)}
async function createCampaign(){try{const centerLocation=document.getElementById('cCenterLocation').value.trim(),radiusMiles=Number(document.getElementById('cRadiusMiles').value);if(!centerLocation)throw new Error('Center city/location is required.');if(!Number.isFinite(radiusMiles)||radiusMiles<1||radiusMiles>100)throw new Error('Radius must be between 1 and 100 miles.');const payload={industry:document.getElementById('cIndustry').value.trim(),centerLocation,radiusMiles,targetCount:Number(document.getElementById('cTarget').value),model:document.getElementById('cModel').value,discoveryProvider:document.getElementById('cDiscoveryProvider').value,enrichmentProvider:document.getElementById('cEnrichmentProvider').value,fallbackEnabled:document.getElementById('cFallback').value==='true',notes:document.getElementById('cNotes').value.trim()||undefined,offering:businessMode};const mr=document.getElementById('cMinRating').value,mv=document.getElementById('cMinReviews').value;if(mr!=='')payload.minRating=Number(mr);if(mv!=='')payload.minReviews=Number(mv);const d=await api('/api/campaigns',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify(payload)});closeOverlay('campaignOverlay');await refreshAll();alert('Campaign created for '+centerLocation+' \xB7 '+radiusMiles+' mi radius. Orgo wake: '+(d.orgo?.attempted?(d.orgo.status||'requested'):'not configured'))}catch(e){showError(e)}}
async function campaignAction(enc,action){try{await api('/api/campaigns/'+encodeURIComponent(decodeURIComponent(enc))+'/'+action,{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await refreshAll()}catch(e){showError(e)}}
async function archiveAction(enc,action){try{if(action==='archive'&&!confirm('Archive this campaign? Its leads and history will be preserved.'))return;await api('/api/campaigns/'+encodeURIComponent(decodeURIComponent(enc))+'/'+action,{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await refreshAll()}catch(e){showError(e)}}
async function loadProspectorJobs(){const d=await api('/api/prospector-jobs?offering='+businessMode),jobs=d.jobs||[],tbody=document.getElementById('prospectorJobRows'),active=jobs.filter(j=>j.active).length;document.getElementById('prospectorJobsSummary').textContent=jobs.length+' jobs \xB7 '+active+' active \xB7 '+(jobs.length-active)+' paused';if(!jobs.length){tbody.innerHTML='';document.getElementById('prospectorJobEmpty').style.display='block';return}document.getElementById('prospectorJobEmpty').style.display='none';tbody.innerHTML=jobs.map(j=>'<tr><td>'+esc(j.city)+', '+esc(j.state)+'</td><td>'+esc(j.category)+'</td><td>'+esc(j.radius_miles)+' mi</td><td>'+esc(j.target_count)+'</td><td>'+esc(j.cadence_days)+'d</td><td>'+esc(j.last_run_at?new Date(j.last_run_at).toLocaleString():'Never')+'</td><td><span class="pill '+(j.active?'READY':'FAILED')+'">'+(j.active?'ACTIVE':'PAUSED')+'</span></td><td><button class="btn small" data-jobtoggle="'+esc(encodeURIComponent(j.id))+'" data-jobactive="'+(j.active?'1':'0')+'">'+(j.active?'Pause':'Resume')+'</button></td></tr>').join('');tbody.querySelectorAll('[data-jobtoggle]').forEach(b=>b.addEventListener('click',()=>prospectorJobAction(b.getAttribute('data-jobtoggle'),b.getAttribute('data-jobactive')==='1'?'pause':'resume')))}
async function prospectorJobAction(enc,action){try{await api('/api/prospector-jobs/'+encodeURIComponent(decodeURIComponent(enc))+'/'+action,{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await loadProspectorJobs()}catch(e){showError(e)}}
async function runProspectorJobsNow(){try{const d=await api('/api/prospector-jobs/run-due',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});if(!d.ran){alert('No campaigns created: '+(d.reason||'nothing due'))}else{alert('Created '+d.created.length+' new campaign(s): '+d.created.map(c=>c.category+' @ '+c.city).join(', '))}await refreshAll()}catch(e){showError(e)}}
async function openCampaignDetail(enc){try{const d=await api('/api/campaigns/'+encodeURIComponent(decodeURIComponent(enc))),c=d.campaign,leads=d.leads||[],cands=d.candidates||[];const rows=leads.map(l=>'<tr><td>'+esc(l.business_name)+'</td><td>'+esc(l.city)+', '+esc(l.state)+'</td><td>'+esc(l.opportunity_score??'\u2014')+'</td><td>'+esc(l.priority||'\u2014')+'</td><td>'+esc(l.current_state)+'</td></tr>').join('')||'<tr><td colspan="5" class="muted">No enriched prospects linked yet.</td></tr>';const candRows=cands.slice(0,100).map(x=>'<tr><td>'+esc(x.business_name)+'</td><td>'+esc(x.target_match)+'</td><td>'+esc(x.status)+'</td><td>'+esc(x.google_rating??'\u2014')+' / '+esc(x.google_reviews??'\u2014')+'</td><td>'+esc(x.retry_count||0)+'</td></tr>').join('')||'<tr><td colspan="5" class="muted">No discovery candidates yet.</td></tr>';document.getElementById('campaignDetail').innerHTML='<div style="display:flex;justify-content:space-between;gap:12px"><div><h2>'+esc(c.industry)+'</h2><div class="muted">'+esc(campaignGeo(c))+'</div></div><button class="btn small" id="campaignClose">Close</button></div><div class="detailGrid"><div class="detailItem"><b>Status</b>'+esc(c.archived_at?'ARCHIVED \xB7 '+c.status:c.status)+'</div><div class="detailItem"><b>Stage</b>'+esc(c.last_stage||'\u2014')+'</div><div class="detailItem"><b>Target / Enriched</b>'+esc((c.requested_count||0)+' / '+(c.enriched||0))+'</div><div class="detailItem"><b>Raw discovered</b>'+esc(c.raw_discovered||0)+'</div><div class="detailItem"><b>Deduped / Filtered</b>'+esc((c.deduped||0)+' / '+(c.filtered||0))+'</div><div class="detailItem"><b>Queued / Enriching / Failed</b>'+esc((c.queued||0)+' / '+(c.enriching||0)+' / '+(c.enrichment_failed||0))+'</div><div class="detailItem"><b>Priority A/B/C/PASS</b>'+esc((c.priority_a||0)+' / '+(c.priority_b||0)+' / '+(c.priority_c||0)+' / '+(c.priority_pass||0))+'</div><div class="detailItem"><b>Discovery passes</b>'+esc(c.discovery_passes||0)+'</div><div class="detailItem"><b>Provider routing</b>'+esc((c.discovery_provider||'CLAUDE')+' discovery \xB7 '+(c.enrichment_provider||'CLAUDE')+' enrichment \xB7 fallback '+(Number(c.fallback_enabled)!==0?'ON':'OFF'))+'</div></div><h3 style="font-size:13px">Provider usage</h3><div class="tableWrap" style="max-height:180px"><table style="min-width:560px"><thead><tr><th>Provider</th><th>Stage</th><th>Status</th><th>Jobs</th><th>Est. API cost</th></tr></thead><tbody>'+((c.provider_usage||[]).map(u=>'<tr><td>'+esc(u.provider)+'</td><td>'+esc(u.stage)+'</td><td>'+esc(u.status)+'</td><td>'+esc(u.jobs)+'</td><td>'+esc(Number(u.estimated_cost_usd||0)>0?'$'+Number(u.estimated_cost_usd).toFixed(3):'\u2014')+'</td></tr>').join('')||'<tr><td colspan="5" class="muted">No provider jobs recorded yet.</td></tr>')+'</tbody></table></div><h3 style="font-size:13px">Enriched leads</h3><div class="tableWrap" style="max-height:250px"><table style="min-width:620px"><thead><tr><th>Business</th><th>Location</th><th>Score</th><th>Priority</th><th>State</th></tr></thead><tbody>'+rows+'</tbody></table></div><h3 style="font-size:13px;margin-top:16px">Discovery candidates</h3><div class="tableWrap" style="max-height:250px"><table style="min-width:620px"><thead><tr><th>Business</th><th>Match</th><th>Status</th><th>Rating / Reviews</th><th>Retries</th></tr></thead><tbody>'+candRows+'</tbody></table></div>';document.getElementById('campaignClose').onclick=()=>closeOverlay('campaignDetailOverlay');document.getElementById('campaignDetailOverlay').classList.add('open')}catch(e){showError(e)}}
async function loadOutreach(){const d=await api('/api/outreach/status'),dot=document.getElementById('twilioDot'),text=document.getElementById('twilioText');dot.className='dot '+(d.configured?'on':'off');text.textContent=d.configured?'Twilio configured \xB7 live outreach locked':'Twilio not configured';document.getElementById('outreachWebhookText').textContent='Inbound webhook: '+d.inboundWebhook+' \xB7 Status callback: '+d.statusWebhook;const a=document.getElementById('allowlistRows');a.innerHTML='';for(const x of (d.allowlist||[])){a.insertAdjacentHTML('beforeend','<span class="pill READY">'+esc(x.label||'Test')+' \xB7 '+esc(x.phone)+' <button class="btn small" style="margin-left:6px;padding:2px 5px" data-remove-test="'+esc(encodeURIComponent(x.phone))+'">\xD7</button></span>')}if(!(d.allowlist||[]).length)a.innerHTML='<span class="muted">No test numbers allowlisted.</span>';document.querySelectorAll('[data-remove-test]').forEach(b=>b.addEventListener('click',()=>removeTestNumber(b.getAttribute('data-remove-test'))));const rows=document.getElementById('messageRows');rows.innerHTML='';for(const m of (d.recentMessages||[])){const phone=m.direction==='INBOUND'?m.from_number:m.to_number;rows.insertAdjacentHTML('beforeend','<tr><td class="muted">'+esc(m.created_at?new Date(m.created_at).toLocaleString():'\u2014')+'</td><td>'+esc(m.direction)+'</td><td>'+esc(phone)+'</td><td>'+esc(m.body)+'</td><td>'+esc(m.intent||'\u2014')+'</td><td>'+esc(m.status)+'</td></tr>')}document.getElementById('messageEmpty').style.display=(d.recentMessages||[]).length?'none':'block'}
async function addTestNumber(){try{const phone=document.getElementById('oPhone').value.trim(),label=document.getElementById('oLabel').value.trim();if(!phone)throw new Error('Enter a test phone number first.');await api('/api/outreach/test-allowlist',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({phone,label})});await loadOutreach()}catch(e){showError(e)}}
async function removeTestNumber(enc){try{await api('/api/outreach/test-allowlist/'+encodeURIComponent(decodeURIComponent(enc)),{method:'DELETE',headers:{'X-Actor':'COMMAND_CENTER'}});await loadOutreach()}catch(e){showError(e)}}
async function sendTestSms(){try{const phone=document.getElementById('oPhone').value.trim(),message=document.getElementById('oMessage').value.trim();if(!phone)throw new Error('Enter an allowlisted test phone number.');if(!message)throw new Error('Enter a test message.');const d=await api('/api/outreach/test-send',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({phone,message})});await loadOutreach();alert('Test SMS queued'+(d.sid?' \xB7 '+d.sid:''))}catch(e){showError(e)}}
let emailOutreachState=null;
async function loadEmailOutreach(){const [d,l]=await Promise.all([api('/api/outreach/email/status'),api('/api/leads?limit=200')]);emailOutreachState=d;const dot=document.getElementById('gmailDot'),txt=document.getElementById('gmailText');dot.className='dot '+(d.smartleadMailbox?'on':'off');txt.textContent=d.smartleadMailbox?('Smartlead mailbox \xB7 '+d.smartleadMailbox+(d.smartleadConfigured?'':' \xB7 API key missing')):'Smartlead mailbox not set';document.getElementById('gClientId').value=d.smartleadMailbox||'';document.getElementById('gmailCallback').textContent='Smartlead webhook URL (register this in Smartlead): '+d.webhookUrl+' \xB7 website campaign '+(d.smartleadWebsiteCampaignId||'not created yet')+' \xB7 concierge campaign '+(d.smartleadConciergeCampaignId||'not created yet');document.getElementById('replyModelText').textContent='Replies are human-in-the-loop: answer leads directly in Smartlead. Genuine replies notify '+(d.notifyEmail||'you')+'.';const s=d.settings||{};document.getElementById('emailFromName').value=s.fromName||'Connor | Trenches Group';document.getElementById('emailPostal').value=s.postalAddress||'';document.getElementById('emailDailyCap').value=s.dailyCap||10;document.getElementById('emailReplyMode').value=s.autoReplyMode||'DRAFT_ONLY';const live=document.getElementById('emailLiveToggle'),auto=document.getElementById('emailAutoToggle');live.textContent=s.emailLiveMode?'Disable live email':'Enable live email';live.className='btn '+(s.emailLiveMode?'danger':'good');auto.textContent=s.orchestratorEnabled?'Pause autonomous sequences':'Enable autonomous sequences';auto.className='btn '+(s.orchestratorEnabled?'danger':'good');document.getElementById('emailModeText').textContent='Live email '+(s.emailLiveMode?'ON':'OFF')+' \xB7 automation '+(s.orchestratorEnabled?'ON':'OFF')+' \xB7 auto replies '+(s.autoReplyMode||'DRAFT_ONLY')+' \xB7 daily cap '+(s.dailyCap||10)+' \xB7 SMS LIVE LOCKED';const websiteToggle=document.getElementById('websiteTrackToggle'),conciergeToggle=document.getElementById('conciergeTrackToggle');const websiteOn=s.websiteEnabled!==false,conciergeOn=s.conciergeEnabled!==false;websiteToggle.textContent='Website outreach: '+(websiteOn?'ON':'OFF');websiteToggle.className='btn '+(websiteOn?'good':'danger');conciergeToggle.textContent='Concierge outreach: '+(conciergeOn?'ON':'OFF');conciergeToggle.className='btn '+(conciergeOn?'good':'danger');const a=document.getElementById('emailAllowlistRows');a.innerHTML='';for(const x of(d.allowlist||[])){a.insertAdjacentHTML('beforeend','<span class="pill READY">'+esc(x.label||'Test')+' \xB7 '+esc(x.email)+' <button class="btn small" style="margin-left:6px;padding:2px 5px" data-email-remove="'+esc(encodeURIComponent(x.email))+'">\xD7</button></span>')}if(!(d.allowlist||[]).length)a.innerHTML='<span class="muted">No test email addresses allowlisted.</span>';document.querySelectorAll('[data-email-remove]').forEach(b=>b.addEventListener('click',()=>removeEmailTestAddressUi(b.getAttribute('data-email-remove'))));const sel=document.getElementById('emailTestLead'),cur=sel.value;sel.innerHTML='<option value="">Optional lead to simulate</option>';for(const x of(l.leads||[])){sel.insertAdjacentHTML('beforeend','<option value="'+esc(x.id)+'">'+esc(x.business_name)+' \xB7 '+esc(x.email||'no email')+'</option>')}if(cur&&[...sel.options].some(o=>o.value===cur))sel.value=cur;const rows=document.getElementById('emailMessageRows');rows.innerHTML='';for(const m of(d.recentMessages||[])){const contact=m.direction==='INBOUND'?m.from_email:m.to_email;let raw={};try{raw=JSON.parse(m.raw_json||'{}')}catch{}const outcome=raw.conversationOutcome||'\u2014';const outcomeHtml=outcome==='DEMO_APPROVED'?'<span class="pill COMPLETED">DEMO_APPROVED</span>':esc(outcome);rows.insertAdjacentHTML('beforeend','<tr><td class="muted">'+esc(m.created_at?new Date(m.created_at).toLocaleString():'\u2014')+'</td><td>'+esc(m.direction)+'</td><td>'+esc(m.business_name||'\u2014')+'</td><td>'+esc(contact)+'</td><td>'+esc(m.subject||'\u2014')+'</td><td>'+esc(m.intent||'\u2014')+'</td><td>'+outcomeHtml+'</td><td>'+esc(m.status)+'</td></tr>')}document.getElementById('emailMessageEmpty').style.display=(d.recentMessages||[]).length?'none':'block';const sr=document.getElementById('sequenceRows');sr.innerHTML='';const modeSequences=(d.sequences||[]).filter(q=>businessMode==='CONCIERGE'?q.strategy==='SMARTLEAD_CONCIERGE':q.strategy!=='SMARTLEAD_CONCIERGE');for(const q of modeSequences){sr.insertAdjacentHTML('beforeend','<tr><td>'+esc(q.business_name)+'</td><td>'+esc(q.priority||'\u2014')+'</td><td>'+esc(q.strategy)+'</td><td>'+esc(q.status)+'</td><td>'+esc(q.current_step)+'</td><td class="muted">'+esc(q.next_action_at?new Date(q.next_action_at).toLocaleString():'\u2014')+'</td></tr>')}document.getElementById('sequenceEmpty').style.display=modeSequences.length?'none':'block'}
async function saveSmartleadMailboxUi(){try{const smartleadMailbox=document.getElementById('gClientId').value.trim();if(!smartleadMailbox)throw new Error('Enter the Smartlead sending mailbox address.');await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({smartleadMailbox})});await loadEmailOutreach();alert('Smartlead mailbox saved. Make sure it is connected as an email account inside Smartlead before enrolling leads.')}catch(e){showError(e)}}
async function saveEmailSettingsUi(){try{await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({fromName:document.getElementById('emailFromName').value.trim(),postalAddress:document.getElementById('emailPostal').value.trim(),dailyCap:Number(document.getElementById('emailDailyCap').value||10),autoReplyMode:document.getElementById('emailReplyMode').value})});await loadEmailOutreach()}catch(e){showError(e)}}
async function toggleEmailLiveUi(){try{const on=!!(emailOutreachState&&emailOutreachState.settings&&emailOutreachState.settings.emailLiveMode);if(!on&&!confirm('Enable LIVE autonomous email to qualified leads? Only verified emails, A/B priority, suppression checks, and the daily cap will be eligible.'))return;await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({liveMode:!on})});await loadEmailOutreach()}catch(e){showError(e)}}
async function toggleEmailAutomationUi(){try{const on=!!(emailOutreachState&&emailOutreachState.settings&&emailOutreachState.settings.orchestratorEnabled);if(!on&&!confirm('Enable autonomous email sequences? The live-email switch must also be ON before real prospects can be enrolled/sent.'))return;await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({orchestratorEnabled:!on})});await loadEmailOutreach()}catch(e){showError(e)}}
async function toggleWebsiteTrackUi(){try{const on=!!(emailOutreachState&&emailOutreachState.settings&&emailOutreachState.settings.websiteEnabled!==false);await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({websiteEnabled:!on})});await loadEmailOutreach()}catch(e){showError(e)}}
async function toggleConciergeTrackUi(){try{const on=!!(emailOutreachState&&emailOutreachState.settings&&emailOutreachState.settings.conciergeEnabled!==false);await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({conciergeEnabled:!on})});await loadEmailOutreach()}catch(e){showError(e)}}
async function addEmailTestAddressUi(){try{const email=document.getElementById('emailTestAddress').value.trim(),label=document.getElementById('emailTestLabel').value.trim();if(!email)throw new Error('Enter a test email address.');await api('/api/outreach/email/test-allowlist',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({email,label})});await loadEmailOutreach()}catch(e){showError(e)}}
async function removeEmailTestAddressUi(enc){try{await api('/api/outreach/email/test-allowlist/'+encodeURIComponent(decodeURIComponent(enc)),{method:'DELETE',headers:{'X-Actor':'COMMAND_CENTER'}});await loadEmailOutreach()}catch(e){showError(e)}}
async function sendEmailTestUi(){try{const email=document.getElementById('emailTestAddress').value.trim(),subject=document.getElementById('emailTestSubject').value.trim(),message=document.getElementById('emailTestBody').value.trim(),leadId=document.getElementById('emailTestLead').value||undefined;if(!email)throw new Error('Enter an allowlisted test email.');const d=await api('/api/outreach/email/test-send',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({email,subject,message,leadId})});alert('Test email sent'+(d.providerMessageId?' \xB7 '+d.providerMessageId:''));await loadEmailOutreach()}catch(e){showError(e)}}
async function runOrchestratorUi(){try{const d=await api('/api/outreach/orchestrator/run',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});alert('Orchestrator run complete \xB7 enrolled '+(d.enrolled||0)+' \xB7 sent '+((d.delivery&&d.delivery.sent)||0));await Promise.all([loadEmailOutreach(),loadConversation(),loadLeads()])}catch(e){showError(e)}}
async function loadDemos(){const [d,all]=await Promise.all([api('/api/demos/status'),api('/api/leads?limit=200')]),s=d.settings||{},sel=document.getElementById('demoLead'),cur=sel.value,staticSel=document.getElementById('staticDemoLead'),staticCur=staticSel.value,existing=new Set((d.sites||[]).map(x=>x.lead_id));document.getElementById('demoModeText').textContent='Auto build '+(s.automationEnabled?'ON':'OFF')+' \xB7 '+(s.builderProvider||'AUTO')+' balanced routing \xB7 QA '+(s.qualityMinScore||90)+'/100 \xB7 '+(s.requireApproval?'approval required':'auto delivery allowed');document.getElementById('demoAutoToggle').textContent=s.automationEnabled?'Pause auto builds':'Enable auto builds';document.getElementById('demoDeliverToggle').textContent=s.autoDeliverEmail?'Pause auto delivery':'Enable auto delivery';sel.innerHTML='<option value="">Choose a DEMO_APPROVED lead\u2026</option>';for(const x of(d.eligibleLeads||[])){sel.insertAdjacentHTML('beforeend','<option value="'+esc(x.id)+'">'+esc(x.business_name)+' \xB7 DEMO_APPROVED</option>')}if(cur&&[...sel.options].some(o=>o.value===cur))sel.value=cur;staticSel.innerHTML='<option value="">Choose any active lead for a no-cost sample\u2026</option>';for(const x of(all.leads||[])){if(existing.has(x.id)||['DISQUALIFIED','OPTED_OUT','DUPLICATE','LOST','ACTIVE_CUSTOMER'].includes(x.current_state))continue;staticSel.insertAdjacentHTML('beforeend','<option value="'+esc(x.id)+'">'+esc(x.business_name)+' \xB7 '+esc(x.current_state)+'</option>')}if(staticCur&&[...staticSel.options].some(o=>o.value===staticCur))staticSel.value=staticCur;const jobs=new Map((d.jobs||[]).map(j=>[j.lead_id,j])),rows=document.getElementById('demoRows');rows.innerHTML='';for(const site of(d.sites||[])){const j=jobs.get(site.lead_id)||{},url=(d.publicBaseUrl||'')+'/demo/'+site.slug,deliver=site.email?'<button class="btn small good" data-demo-deliver="'+esc(site.id)+'">Approve & send</button>':'No email';rows.insertAdjacentHTML('beforeend','<tr><td>'+esc(site.business_name)+'</td><td>'+esc(j.status||'READY')+'<div class="muted">'+esc(site.provider||j.provider||'\u2014')+'</div></td><td>'+esc(site.current_state||'\u2014')+'</td><td>'+esc(site.qa_score??'\u2014')+'</td><td>'+esc(site.view_count||0)+'</td><td>'+esc(site.cta_click_count||0)+'</td><td><a href="'+esc(url)+'" target="_blank" rel="noopener" style="color:var(--accent)">Open preview</a></td><td>'+deliver+'</td></tr>')}for(const j of(d.jobs||[])){if((d.sites||[]).some(x=>x.lead_id===j.lead_id))continue;rows.insertAdjacentHTML('beforeend','<tr><td>'+esc(j.business_name)+'</td><td>'+esc(j.status)+'<div class="muted">'+esc(j.provider||s.builderProvider||'AUTO')+'</div></td><td>'+esc(j.current_state||'\u2014')+'</td><td>\u2014</td><td>0</td><td>0</td><td>\u2014</td><td>'+esc(j.last_error||'Pending')+'</td></tr>')}document.getElementById('demoEmpty').style.display=((d.sites||[]).length||(d.jobs||[]).length)?'none':'block';document.querySelectorAll('[data-demo-deliver]').forEach(b=>b.addEventListener('click',()=>deliverDemoUi(b.getAttribute('data-demo-deliver'))));window.__demoSettings=s}
async function queueDemoUi(){try{const id=document.getElementById('demoLead').value;if(!id)throw new Error('Choose a lead first.');await api('/api/demos/leads/'+encodeURIComponent(id)+'/queue',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await loadDemos()}catch(e){showError(e)}}
async function createStaticDemoUi(){try{const id=document.getElementById('staticDemoLead').value;if(!id)throw new Error('Choose a lead in the no-cost sample dropdown first.');if(!confirm('Create a no-cost static concept preview for this lead? It uses no AI provider and does not email the prospect.'))return;const d=await api('/api/demos/leads/'+encodeURIComponent(id)+'/static-preview',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await refreshAll();window.open('/demo/'+encodeURIComponent(d.slug),'_blank','noopener')}catch(e){showError(e)}}
async function toggleDemoAutomation(){try{const s=window.__demoSettings||{};await api('/api/demos/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({automationEnabled:!s.automationEnabled})});await loadDemos()}catch(e){showError(e)}}
async function toggleDemoDelivery(){try{const s=window.__demoSettings||{};await api('/api/demos/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({autoDeliverEmail:!s.autoDeliverEmail})});await loadDemos()}catch(e){showError(e)}}
async function configureDemoQualityUi(){try{const s=window.__demoSettings||{},provider=(prompt('Builder routing: AUTO, CLAUDE, OPENAI, or HYPERAGENT',s.builderProvider||'AUTO')||'').trim().toUpperCase();if(!['AUTO','CLAUDE','OPENAI','HYPERAGENT'].includes(provider))throw new Error('Choose AUTO, CLAUDE, OPENAI, or HYPERAGENT.');const score=Number(prompt('Minimum QA score before a demo is ready (85\u2013100)',String(s.qualityMinScore||90)));if(!Number.isFinite(score)||score<85||score>100)throw new Error('QA score must be between 85 and 100.');const fallback=confirm('Use the next available provider automatically if the first builder fails or is unavailable?');const approval=confirm('Require your approval in Command Center before a preview can be emailed?');await api('/api/demos/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({builderProvider:provider,qualityMinScore:score,fallbackEnabled:fallback,requireApproval:approval})});await loadDemos()}catch(e){showError(e)}}
async function deliverDemoUi(id){try{if(!confirm('Approve this preview and send the demo email to the lead?'))return;const d=await api('/api/demos/'+encodeURIComponent(id)+'/deliver',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});if(!d.sent)alert('Demo is ready but email was not sent: '+(d.reason||'unknown reason'));await loadDemos()}catch(e){showError(e)}}

async function loadConversation(){const [c,l]=await Promise.all([api('/api/outreach/conversation/status'),api('/api/leads?limit=200')]),sel=document.getElementById('simLead'),current=sel.value;sel.innerHTML='<option value="">Choose a lead for simulation\u2026</option>';for(const x of (l.leads||[])){sel.insertAdjacentHTML('beforeend','<option value="'+esc(x.id)+'">'+esc(x.business_name)+' \xB7 '+esc(x.city)+', '+esc(x.state)+' \xB7 '+esc(x.priority||'\u2014')+'</option>')}if(current&&[...sel.options].some(o=>o.value===current))sel.value=current;const dr=document.getElementById('draftRows');dr.innerHTML='';for(const d of (c.drafts||[])){const actions=d.status==='DRAFT'?'<button class="btn small good" data-approve-draft="'+esc(d.id)+'">Approve</button> <button class="btn small" data-cancel-draft="'+esc(d.id)+'">Cancel</button>':'';dr.insertAdjacentHTML('beforeend','<tr><td class="muted">'+esc(d.created_at?new Date(d.created_at).toLocaleString():'\u2014')+'</td><td>'+esc(d.business_name)+'</td><td>'+esc(d.intent)+'</td><td>'+esc(d.body||'\u2014')+'</td><td>'+esc(Math.round(Number(d.confidence||0)*100)+'%')+'</td><td>'+esc(d.status)+'</td><td>'+actions+'</td></tr>')}document.getElementById('draftEmpty').style.display=(c.drafts||[]).length?'none':'block';document.querySelectorAll('[data-approve-draft]').forEach(b=>b.addEventListener('click',()=>draftAction(b.getAttribute('data-approve-draft'),'approve')));document.querySelectorAll('[data-cancel-draft]').forEach(b=>b.addEventListener('click',()=>draftAction(b.getAttribute('data-cancel-draft'),'cancel')));const fr=document.getElementById('followupRows');fr.innerHTML='';for(const f of (c.followups||[])){fr.insertAdjacentHTML('beforeend','<tr><td>'+esc(f.business_name)+'</td><td>'+esc(f.sequence_step)+'</td><td class="muted">'+esc(f.due_at?new Date(f.due_at).toLocaleString():'\u2014')+'</td><td>'+esc(f.status)+'</td><td>'+esc(f.body)+'</td></tr>')}document.getElementById('followupEmpty').style.display=(c.followups||[]).length?'none':'block';const er=document.getElementById('escalationRows');er.innerHTML='';for(const e of (c.escalations||[])){const action=e.status==='OPEN'?'<button class="btn small good" data-resolve-esc="'+esc(e.id)+'">Resolve</button>':'';er.insertAdjacentHTML('beforeend','<tr><td class="muted">'+esc(e.created_at?new Date(e.created_at).toLocaleString():'\u2014')+'</td><td>'+esc(e.business_name)+'</td><td><span class="pill '+(e.priority==='URGENT'?'FAILED':'READY')+'">'+esc(e.priority)+'</span></td><td>'+esc(e.reason)+'</td><td>'+esc(e.recommended_action||'\u2014')+'</td><td>'+esc(e.status)+'</td><td>'+action+'</td></tr>')}document.getElementById('escalationEmpty').style.display=(c.escalations||[]).length?'none':'block';document.querySelectorAll('[data-resolve-esc]').forEach(b=>b.addEventListener('click',()=>resolveEscalationUi(b.getAttribute('data-resolve-esc'))))}
function selectedSimLead(){const id=document.getElementById('simLead').value;if(!id)throw new Error('Choose a lead first.');return id}
async function simulateConversation(){try{const leadId=selectedSimLead(),message=document.getElementById('simMessage').value.trim();if(!message)throw new Error('Enter a simulated reply.');const d=await api('/api/outreach/simulate',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({leadId,message})});const x=d.decision||{};document.getElementById('simResult').textContent='Intent '+d.intent+' \xB7 '+(x.action||'\u2014')+(x.draft?' \xB7 Draft: '+x.draft:'')+(x.escalationId?' \xB7 Escalated':'');await Promise.all([loadConversation(),loadLeads()])}catch(e){showError(e)}}
async function makeOpenerDraft(){try{const leadId=selectedSimLead(),d=await api('/api/outreach/leads/'+encodeURIComponent(leadId)+'/opener-draft',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});document.getElementById('simResult').textContent='Opener draft: '+d.opener;await loadConversation()}catch(e){showError(e)}}
async function scheduleFollowupsUi(){try{const leadId=selectedSimLead();await api('/api/outreach/leads/'+encodeURIComponent(leadId)+'/followups',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});document.getElementById('simResult').textContent='Follow-up sequence scheduled.';await loadConversation()}catch(e){showError(e)}}
async function runFollowupsUi(){try{const d=await api('/api/outreach/followups/run',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({force:true})});document.getElementById('simResult').textContent='Follow-up drafts created: '+d.drafted+' \xB7 skipped '+d.skipped;await loadConversation()}catch(e){showError(e)}}
async function draftAction(id,action){try{await api('/api/outreach/drafts/'+encodeURIComponent(id)+'/'+action,{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await loadConversation()}catch(e){showError(e)}}
async function resolveEscalationUi(id){try{await api('/api/outreach/escalations/'+encodeURIComponent(id)+'/resolve',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await Promise.all([loadConversation(),loadLeads()])}catch(e){showError(e)}}
let quoteLeads=[],quoteState=null;
const QPILL={DRAFT:'',SENT:'READY',VIEWED:'RUNNING',ACCEPTED:'COMPLETED',DECLINED:'FAILED',VOID:'FAILED'};
const QEVT={CREATED:'Quote created',UPDATED:'Quote edited',SENT:'Emailed',SEND_FAILED:'Email failed',EMAIL_OPENED:'Email opened',VIEWED:'Estimate viewed',PORTAL_SIGNUP:'Created client portal account',MARKED_ACCEPTED:'Marked accepted',MARKED_DECLINED:'Marked declined',MARKED_VOID:'Voided'};
function qMoney(c){return '$'+(Number(c||0)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function qTotal(q){const a=[];if(q.one_time_cents>0||!q.monthly_cents)a.push(qMoney(q.one_time_cents));if(q.monthly_cents>0)a.push(qMoney(q.monthly_cents)+'/mo');return a.join(' + ')}
function qWhen(v){return v?new Date(v).toLocaleString():'\u2014'}
function qVal(id){const el=document.getElementById(id);return el?el.value.trim():''}
function qPill(s){return '<span class="pill '+esc(QPILL[s]||'')+'">'+esc(s)+'</span>'}
async function loadQuotes(){const d=await api('/api/quotes'),qs=d.quotes||[],rows=document.getElementById('quoteRows');rows.innerHTML=qs.map(q=>'<tr><td><b>'+esc(q.quote_number)+'</b></td><td><div class="business">'+esc(q.business_name)+'</div><div class="muted">'+esc(q.contact_name||'')+'</div></td><td>'+esc(q.title)+'</td><td>'+esc(qTotal(q))+'</td><td>'+qPill(q.status)+'</td><td class="muted">'+esc(q.sent_to||'\u2014')+'</td><td>'+esc(q.open_count||0)+'</td><td>'+esc(q.view_count||0)+'</td><td class="muted">'+esc(qWhen(q.last_viewed_at))+'</td><td class="right"><button class="btn small" data-quote="'+esc(q.id)+'">Open</button></td></tr>').join('');document.getElementById('quoteEmpty').style.display=qs.length?'none':'block';document.getElementById('quoteSummary').textContent=qs.length+' quotes \xB7 '+qs.filter(q=>q.first_sent_at).length+' sent \xB7 '+qs.filter(q=>q.view_count>0).length+' viewed';rows.querySelectorAll('[data-quote]').forEach(b=>b.addEventListener('click',()=>openQuote(b.getAttribute('data-quote'))))}
async function loadQuoteMailbox(){const el=document.getElementById('quoteMailbox');try{const d=await api('/api/quotes/mailbox');el.innerHTML=d.connected?'<span class="dot on"></span> Sending as '+esc(d.email):'<span class="dot off"></span> Google not connected <button class="btn small primary" id="quoteConnect">Connect Google</button>';const b=document.getElementById('quoteConnect');if(b)b.onclick=connectQuoteMailbox}catch(e){el.textContent=e.message}}
async function connectQuoteMailbox(){try{const d=await api('/api/quotes/mailbox/connect',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});window.open(d.authUrl,'_blank','noopener');document.getElementById('quoteMailbox').textContent='Finish signing in with Google in the new tab, then click Refresh.'}catch(e){showError(e)}}
async function loadLeadQuotes(leadId){const box=document.getElementById('leadQuotes');if(!box)return;try{const d=await api('/api/quotes?leadId='+encodeURIComponent(leadId)),qs=d.quotes||[];box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Quotes</b><button class="btn small primary" id="leadNewQuote">+ New quote for this lead</button></div>'+(qs.length?qs.map(q=>'<div class="event" style="cursor:pointer" data-lead-quote="'+esc(q.id)+'"><div class="eventHead"><b>'+esc(q.quote_number)+' \xB7 '+esc(q.title)+'</b>'+qPill(q.status)+'</div><div class="eventData">'+esc(qTotal(q))+' \xB7 opens '+esc(q.open_count||0)+' \xB7 views '+esc(q.view_count||0)+(q.last_viewed_at?' \xB7 last viewed '+esc(qWhen(q.last_viewed_at)):'')+'</div></div>').join(''):'<div class="muted">No quotes for this lead yet.</div>');document.getElementById('leadNewQuote').onclick=()=>openQuote(null,leadId);box.querySelectorAll('[data-lead-quote]').forEach(el=>el.addEventListener('click',()=>openQuote(el.getAttribute('data-lead-quote'))))}catch(e){box.textContent=e.message}}
async function openQuote(id,leadId){try{const [ld,detail]=await Promise.all([api('/api/leads?limit=200'),id?api('/api/quotes/'+encodeURIComponent(id)):Promise.resolve(null)]);quoteLeads=ld.leads||[];quoteState=detail;const want=leadId||(detail&&detail.quote.lead_id);if(want&&!quoteLeads.some(l=>l.id===want)){try{quoteLeads.unshift((await api('/api/leads/'+encodeURIComponent(want))).lead)}catch(e){}}renderQuoteModal(leadId||'');document.getElementById('quoteOverlay').classList.add('open')}catch(e){showError(e)}}
function qItemRow(it){return '<div class="qItem"><input class="qiDesc" placeholder="Description, e.g. 5-page website build" value="'+esc(it.description||'')+'"/><input class="qiQty" type="number" min="0" step="any" title="Quantity" value="'+esc(it.quantity||1)+'"/><input class="qiPrice" type="number" min="0" step="0.01" placeholder="Price $" value="'+(it.unitCents?esc((it.unitCents/100).toFixed(2)):'')+'"/><select class="qiBilling"><option value="ONE_TIME">One-time</option><option value="MONTHLY"'+(it.billing==='MONTHLY'?' selected':'')+'>Monthly</option></select><button class="btn small" data-qremove="1" title="Remove line">\xD7</button></div>'}
function qRecalc(){let one=0,mon=0;document.querySelectorAll('#qItems .qItem').forEach(r=>{const c=Math.round(Number(r.querySelector('.qiQty').value||0)*Math.round(Number(r.querySelector('.qiPrice').value||0)*100));if(r.querySelector('.qiBilling').value==='MONTHLY')mon+=c;else one+=c});const el=document.getElementById('qTotals');if(el)el.textContent='Total: '+qMoney(one)+(mon?' + '+qMoney(mon)+'/mo':'')}
function qLeadChanged(){const l=quoteLeads.find(x=>x.id===qVal('qLead'));if(!l)return;document.getElementById('qBusiness').value=l.business_name||'';const s=document.getElementById('qSendEmail');if(s&&l.email)s.value=l.email}
function renderQuoteModal(prefillLeadId){const d=quoteState,q=d?d.quote:{status:'DRAFT',line_items:[]},isNew=!d,leadId=q.lead_id||prefillLeadId||'',lead=quoteLeads.find(l=>l.id===leadId),items=(q.line_items&&q.line_items.length)?q.line_items:[{description:'',quantity:1,unitCents:0,billing:'ONE_TIME'}],sends=d?d.sends||[]:[],events=d?d.events||[]:[],sendTo=sends.length?sends[0].email:((lead&&lead.email)||'');
let h='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h2 style="margin-bottom:6px">'+(isNew?'New quote':esc(q.quote_number)+' \xB7 '+esc(q.title))+'</h2>'+(isNew?'':qPill(q.status))+'</div><button class="btn small" id="quoteClose">Close</button></div>';
if(!isNew){h+='<div class="qStats">'+[['Emails sent',sends.filter(s=>s.status==='SENT').length],['Email opens*',q.open_count||0],['Estimate views',q.view_count||0],['Last viewed',q.last_viewed_at?qWhen(q.last_viewed_at):'Not yet']].map(x=>'<div class="metric" style="padding:10px"><div class="n" style="font-size:17px">'+esc(x[1])+'</div><div class="l">'+esc(x[0])+'</div></div>').join('')+'</div>';if(sends.length)h+='<div class="tableWrap" style="max-height:200px"><table style="min-width:680px"><thead><tr><th>Sent to</th><th>Sent</th><th>Opens</th><th>Views</th><th>Last viewed</th><th>Portal invite</th><th></th></tr></thead><tbody>'+sends.map(s=>'<tr><td>'+esc(s.email)+(s.status==='FAILED'?' '+qPill('FAILED'):'')+'</td><td class="muted">'+esc(qWhen(s.sent_at))+'</td><td>'+esc(s.open_count||0)+'</td><td>'+esc(s.view_count||0)+'</td><td class="muted">'+esc(qWhen(s.last_viewed_at))+'</td><td>'+(s.included_invite?'Included':'\u2014')+'</td><td><button class="btn small" data-copy-link="'+esc(s.view_url)+'" title="Paste into your own email if needed. Opening it yourself counts as a view.">Copy link</button></td></tr>').join('')+'</tbody></table></div>';h+='<div class="sub" style="margin:6px 0 10px">*Opens are approximate (some email apps block or pre-load images). Estimate views are exact.</div>';if(events.length)h+='<details style="margin-bottom:6px"><summary class="sub" style="cursor:pointer">Activity timeline ('+events.length+')</summary><div class="timeline" style="max-height:220px">'+events.map(ev=>'<div class="event"><div class="eventHead"><b>'+esc(QEVT[ev.event_type]||ev.event_type)+'</b><span class="muted">'+esc(qWhen(ev.created_at))+'</span></div><div class="eventData">'+esc([ev.email,ev.source].filter(Boolean).join(' \xB7 '))+'</div></div>').join('')+'</div></details>'}
const leadOpts='<option value="">No linked lead (enter client manually)</option>'+quoteLeads.map(l=>'<option value="'+esc(l.id)+'"'+(l.id===leadId?' selected':'')+'>'+esc(l.business_name)+' \xB7 '+esc(l.city)+', '+esc(l.state)+(l.email?' \xB7 '+esc(l.email):'')+'</option>').join('');
h+='<label>Linked lead</label><select id="qLead">'+leadOpts+'</select><div class="grid2"><div><label>Business name</label><input id="qBusiness" value="'+esc(q.business_name||(lead?lead.business_name:''))+'"/></div><div><label>Contact name</label><input id="qContact" value="'+esc(q.contact_name||'')+'"/></div></div><label>Quote title</label><input id="qTitle" placeholder="e.g. Website build + monthly care plan" value="'+esc(q.title||'')+'"/><label>Message to client (optional)</label><textarea id="qMessage" placeholder="Thanks for the call today. Here is the estimate we discussed.">'+esc(q.message||'')+'</textarea><label>Line items (description \xB7 qty \xB7 price \xB7 billing)</label><div id="qItems">'+items.map(qItemRow).join('')+'</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><button class="btn small" id="qAddItem">+ Add line</button><div id="qTotals" style="font-weight:800"></div></div><div class="grid2"><div><label>Valid until (optional)</label><input id="qValid" type="date" value="'+esc(q.valid_until||'')+'"/></div><div></div></div><label>Terms (optional)</label><textarea id="qTerms" style="min-height:60px" placeholder="50% deposit to start, balance at launch.">'+esc(q.terms||'')+'</textarea>';
if(q.status!=='VOID')h+='<div style="border:1px solid var(--accent);border-radius:9px;padding:12px;margin-top:14px"><div style="font-weight:800;margin-bottom:8px">Send this quote to\u2026</div><div class="qSend"><input id="qSendEmail" type="email" placeholder="client@business.com" value="'+esc(sendTo)+'"/><input id="qSendName" placeholder="Their name (optional)" value="'+esc(q.contact_name||'')+'"/><button class="btn primary" id="quoteSaveSend">Save &amp; send</button></div><div class="sub" style="margin-top:6px">Sends from your Google Workspace mailbox, so it shows in your Sent folder and replies come straight to you. Clients without a portal account also get a pre-approved signup link.</div></div>';
h+='<div class="modalFooter" style="justify-content:space-between"><div class="rowBtns">'+(isNew||q.status==='VOID'?'':'<button class="btn small good" data-qstatus="ACCEPTED">Mark accepted</button><button class="btn small" data-qstatus="DECLINED">Mark declined</button><button class="btn small danger" data-qstatus="VOID">Void</button>')+'</div><button class="btn" id="quoteSave">'+(isNew?'Save draft':'Save changes')+'</button></div>';
const m=document.getElementById('quoteModal');m.innerHTML=h;m.oninput=qRecalc;m.onchange=qRecalc;m.onclick=e=>{const t=e.target;if(!(t instanceof Element))return;if(t.hasAttribute('data-qremove')){const rows=document.querySelectorAll('#qItems .qItem');if(rows.length>1)t.closest('.qItem').remove();qRecalc()}else if(t.hasAttribute('data-copy-link')){navigator.clipboard.writeText(t.getAttribute('data-copy-link')).then(()=>{t.textContent='Copied'})}else if(t.hasAttribute('data-qstatus'))quoteStatus(t.getAttribute('data-qstatus'))};document.getElementById('quoteClose').onclick=()=>closeOverlay('quoteOverlay');document.getElementById('qAddItem').onclick=()=>{document.getElementById('qItems').insertAdjacentHTML('beforeend',qItemRow({quantity:1,billing:'ONE_TIME'}));qRecalc()};document.getElementById('qLead').onchange=qLeadChanged;document.getElementById('quoteSave').onclick=()=>saveQuote(false);const ss=document.getElementById('quoteSaveSend');if(ss)ss.onclick=()=>saveQuote(true);qRecalc()}
function quotePayload(){const lineItems=[...document.querySelectorAll('#qItems .qItem')].map(r=>({description:r.querySelector('.qiDesc').value.trim(),quantity:Number(r.querySelector('.qiQty').value||1),unitCents:Math.round(Number(r.querySelector('.qiPrice').value||0)*100),billing:r.querySelector('.qiBilling').value})).filter(i=>i.description||i.unitCents);return{leadId:qVal('qLead')||null,businessName:qVal('qBusiness'),contactName:qVal('qContact')||null,title:qVal('qTitle'),message:qVal('qMessage')||null,terms:qVal('qTerms')||null,validUntil:qVal('qValid')||null,lineItems}}
async function saveQuote(send){const buttons=[...document.querySelectorAll('#quoteModal button')];try{const body=quotePayload(),email=qVal('qSendEmail'),name=qVal('qSendName');if(send){if(!email)throw new Error('Enter the email address to send this quote to.');if(!body.lineItems.length)throw new Error('Add at least one line item before sending.');if(!confirm('Send "'+(body.title||'this quote')+'" to '+email+'?'))return}buttons.forEach(b=>b.disabled=true);const hdr={'X-Actor':'COMMAND_CENTER'};let id=quoteState?quoteState.quote.id:null;const saved=id?await api('/api/quotes/'+encodeURIComponent(id),{method:'PATCH',headers:hdr,body:JSON.stringify(body)}):await api('/api/quotes',{method:'POST',headers:hdr,body:JSON.stringify(body)});id=saved.quote.id;let note='';if(send){try{const s=await api('/api/quotes/'+encodeURIComponent(id)+'/send',{method:'POST',headers:hdr,body:JSON.stringify({email,name:name||undefined})});note='Sent to '+s.email+(s.includedInvite?' with a pre-approved portal signup link.':'. They already have a portal account, so it is in their portal too.')}catch(e){note='Quote saved, but the email failed: '+e.message}}quoteState=await api('/api/quotes/'+encodeURIComponent(id));renderQuoteModal('');await loadQuotes();if(note)alert(note)}catch(e){alert(e.message)}finally{buttons.forEach(b=>b.disabled=false)}}
async function quoteStatus(status){const labels={ACCEPTED:'Mark this quote accepted?',DECLINED:'Mark this quote declined?',VOID:'Void this quote? It disappears from the client portal and can no longer be sent.'};if(!confirm(labels[status]))return;try{const id=quoteState.quote.id;await api('/api/quotes/'+encodeURIComponent(id)+'/status',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({status})});quoteState=await api('/api/quotes/'+encodeURIComponent(id));renderQuoteModal('');await loadQuotes()}catch(e){alert(e.message)}}
function debouncedLoad(){clearTimeout(timer);timer=setTimeout(loadLeads,250)}async function loadLeads(){const p=new URLSearchParams({limit:'200'}),q=document.getElementById('search').value.trim(),s=document.getElementById('stateFilter').value,pr=document.getElementById('priorityFilter').value;if(q)p.set('q',q);if(s)p.set('state',s);if(pr)p.set('priority',pr);const d=await api('/api/leads?'+p),rows=document.getElementById('leadRows');rows.innerHTML='';document.getElementById('leadEmpty').style.display=d.leads.length?'none':'block';for(const l of d.leads){const gap=l.website_gap_status||'UNKNOWN',gapClass=gap==='ELIGIBLE'?'COMPLETED':gap==='INELIGIBLE'?'FAILED':gap==='MANUAL_OVERRIDE'?'READY':'';rows.insertAdjacentHTML('beforeend','<tr><td><div class="business">'+esc(l.business_name)+'</div><div class="muted">'+esc(l.website||'No website recorded')+'</div></td><td>'+esc(l.city)+', '+esc(l.state)+'</td><td>'+esc(l.industry)+'</td><td><span class="pill '+gapClass+'">'+esc(gap)+'</span></td><td>'+esc(l.opportunity_score??'\u2014')+'</td><td><span class="pill '+esc(l.priority||'')+'">'+esc(l.priority||'\u2014')+'</span></td><td>'+esc(l.current_state)+'</td><td>'+esc(l.phone||'\u2014')+'</td><td class="muted">'+esc(l.updated_at?new Date(l.updated_at).toLocaleString():'\u2014')+'</td><td class="right"><button class="btn small" data-lead="'+esc(encodeURIComponent(l.id))+'">Open</button></td></tr>')}document.querySelectorAll('[data-lead]').forEach(b=>b.addEventListener('click',()=>openLead(b.getAttribute('data-lead'))))}
async function openLead(enc){try{const id=decodeURIComponent(enc),[d,e]=await Promise.all([api('/api/leads/'+encodeURIComponent(id)),api('/api/leads/'+encodeURIComponent(id)+'/events')]),l=d.lead,events=e.events||[],states=d.manualStateOptions||[];const details=[['Industry',l.industry],['Location',l.city+', '+l.state],['Phone',l.phone||'\u2014'],['Email',l.email||'\u2014'],['Website',l.website||'\u2014'],['Website status',l.website_status||'UNKNOWN'],['Website quality',l.website_quality||'UNKNOWN'],['Website gap',l.website_gap_status||'UNKNOWN'],['Gap reason',l.website_gap_reason||'\u2014'],['Google rating',l.google_rating??'\u2014'],['Reviews',l.google_reviews??'\u2014'],['Validation',l.validation_status||'PENDING'],['Sources',l.research_source_count??0],['Score',l.opportunity_score??'\u2014'],['Priority',l.priority||'\u2014'],['Qualification',l.qualification_reason||'\u2014'],['Outreach',l.outreach_eligible?'Eligible':'LOCKED'],['State',l.current_state],['Last manual change',l.manual_state_reason||'\u2014']].map(x=>'<div class="detailItem"><b>'+esc(x[0])+'</b>'+esc(x[1])+'</div>').join('');const timeline=events.map(ev=>'<div class="event"><div class="eventHead"><b>'+esc(ev.event_type)+'</b><span class="muted">'+esc(new Date(ev.created_at).toLocaleString())+'</span></div><div class="eventData">'+esc(ev.old_state&&ev.new_state?(ev.old_state+' \u2192 '+ev.new_state):'')+(ev.event_data_json&&ev.event_data_json!=='{}'?'<br>'+esc(ev.event_data_json):'')+'</div></div>').join('');const opts=states.map(x=>'<option value="'+esc(x)+'" '+(x===l.current_state?'selected':'')+'>'+esc(x)+'</option>').join('');const quick=l.current_state==='DISQUALIFIED'?'<button class="btn good" id="leadRestore">Restore to human review</button>':'<button class="btn danger" id="leadDisqualify">Disqualify</button>';document.getElementById('leadDetail').innerHTML='<div style="display:flex;justify-content:space-between;gap:12px"><div><h2>'+esc(l.business_name)+'</h2><div class="muted">'+esc(l.id)+'</div></div><button class="btn small" id="leadClose">Close</button></div><div class="detailGrid">'+details+'</div><div style="border:1px solid var(--line);border-radius:9px;padding:12px;margin:12px 0"><div style="font-weight:800;margin-bottom:8px">Manual lead control</div><div class="sub">Manual changes are audited. Disqualifying cancels active outreach/follow-ups/demo jobs. Setting an advanced state can explicitly override the website-gap gate.</div><div class="grid2" style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:10px"><select id="manualLeadState" style="background:#0d0f13;border:1px solid var(--line);color:var(--text);padding:9px;border-radius:8px">'+opts+'</select><input id="manualLeadReason" style="background:#0d0f13;border:1px solid var(--line);color:var(--text);padding:9px;border-radius:8px" placeholder="Reason required, e.g. website manually verified outdated"/></div><div class="rowBtns" style="margin-top:10px"><button class="btn primary" id="applyManualState">Apply status</button>'+quick+'</div></div><div id="leadQuotes" style="border:1px solid var(--line);border-radius:9px;padding:12px;margin:12px 0"><div class="muted">Loading quotes\u2026</div></div><div class="timeline">'+timeline+'</div>';document.getElementById('leadClose').onclick=()=>closeOverlay('leadDetailOverlay');document.getElementById('applyManualState').onclick=()=>manualLeadStateUi(id);const dq=document.getElementById('leadDisqualify');if(dq)dq.onclick=()=>disqualifyLeadUi(id);const rs=document.getElementById('leadRestore');if(rs)rs.onclick=()=>restoreLeadUi(id);loadLeadQuotes(id);document.getElementById('leadDetailOverlay').classList.add('open')}catch(e){showError(e)}}
async function manualLeadStateUi(id){try{const to=document.getElementById('manualLeadState').value,reason=document.getElementById('manualLeadReason').value.trim();if(!reason)throw new Error('Enter a reason for the manual status change.');if(!confirm('Set this lead to '+to+'? This is an audited admin override.'))return;await api('/api/leads/'+encodeURIComponent(id)+'/manual-state',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({to,reason})});closeOverlay('leadDetailOverlay');await refreshAll()}catch(e){showError(e)}}
async function disqualifyLeadUi(id){try{const reasons=['Modern / good website \u2014 no opportunity','Wrong industry','Outside target geography','Poor reputation','Franchise / too large','Duplicate','Closed / not operating','Bad contact information','Not a fit','Other'],choice=prompt('Disqualification reason:

'+reasons.map((x,i)=>(i+1)+'. '+x).join('
')+'

Type a number or your own reason:','1');if(choice===null)return;const n=Number(choice),reason=Number.isInteger(n)&&n>=1&&n<=reasons.length?reasons[n-1]:choice.trim();if(!reason)throw new Error('A reason is required.');await api('/api/leads/'+encodeURIComponent(id)+'/manual-state',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({to:'DISQUALIFIED',reason})});closeOverlay('leadDetailOverlay');await refreshAll()}catch(e){showError(e)}}
async function restoreLeadUi(id){try{const reason=prompt('Why are you restoring this lead?','Restore for manual review / re-check website gap');if(reason===null)return;await api('/api/leads/'+encodeURIComponent(id)+'/restore',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({reason})});closeOverlay('leadDetailOverlay');await refreshAll()}catch(e){showError(e)}}
async function reAuditWebsiteGapsUi(){try{if(!confirm('Re-audit existing early-stage leads using the new hard website-gap rule? Modern/good sites will be disqualified. Manually overridden leads will be preserved.'))return;const d=await api('/api/leads/website-gap/re-audit',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});alert('Website-gap re-audit complete. Scanned '+d.scanned+' \xB7 eligible '+d.eligible+' \xB7 disqualified '+d.disqualified+' \xB7 review '+d.review+' \xB7 unchanged '+d.unchanged);await refreshAll()}catch(e){showError(e)}}
function openImport(){document.getElementById('importOverlay').classList.add('open');if(!document.getElementById('importJson').value.trim())loadSampleImport()}function loadSampleImport(){document.getElementById('importJson').value=JSON.stringify({source:'MANUAL_TEST',prospects:[{externalId:'sample-tree-002',businessName:'Sample Tree Service',industry:'Tree Service',city:'Murfreesboro',state:'TN',phone:'6155550101',phoneType:'MOBILE',websiteQuality:'NONE',googleUrl:'https://example.com/google-profile',googleRating:4.9,googleReviewCount:180,isOperating:true,isLocalIndependent:true,isSupplier:false,isFranchiseHq:false,primaryService:'Tree Removal',services:['Tree Removal'],sources:[{url:'https://example.com/google-profile',type:'GOOGLE_BUSINESS'}],researchConfidence:.95}]},null,2)}async function importProspects(){try{const d=await api('/api/prospects/import',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:document.getElementById('importJson').value});closeOverlay('importOverlay');await refreshAll();alert('Received '+d.received+' \xB7 accepted '+d.accepted+' \xB7 duplicates '+d.duplicates+' \xB7 rejected '+d.rejected)}catch(e){showError(e)}}
async function toggleGlobal(){if(!globalPaused&&!confirm('Pause ALL Trenches automation?'))return;try{await api(globalPaused?'/api/system/resume':'/api/system/pause',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await refreshAll()}catch(e){showError(e)}}
(function(){try{const p=new URLSearchParams(location.search),state=p.get('state'),q=p.get('q');if(state)document.getElementById('stateFilter').value=state;if(q)document.getElementById('search').value=q}catch(e){}})();
applyModeVisibility();
if(adminKey){document.getElementById('login').style.display='none';refreshAll().then(applyDeepLink).catch(()=>logout())}else{document.getElementById('keyInput').addEventListener('keydown',e=>{if(e.key==='Enter')login()})}setInterval(()=>{if(adminKey){loadRunner().catch(()=>{});loadCampaigns().catch(()=>{});loadProspectorJobs().catch(()=>{});loadOutreach().catch(()=>{});loadEmailOutreach().catch(()=>{});loadConversation().catch(()=>{});loadDemos().catch(()=>{});loadOperatorDesk().catch(()=>{});loadLaunchBoard().catch(()=>{});loadQuotes().catch(()=>{})}},15000);
<\/script>
</body></html>`], [`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>Trenches Command Center</title>
  <style>
    :root{color-scheme:dark;--bg:#090a0c;--panel:#121419;--panel2:#181b21;--line:#2a3039;--text:#f5f6f8;--muted:#9ca5b4;--accent:#d8ff3e;--danger:#ff6363;--good:#58df8d;--warn:#ffc14d}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}button,input,select,textarea{font:inherit}.shell{max-width:1500px;margin:auto;padding:22px}.top{display:flex;justify-content:space-between;gap:18px;align-items:center;margin-bottom:18px}.brand{display:flex;gap:12px;align-items:center}.mark{width:40px;height:40px;border:2px solid var(--accent);display:grid;place-items:center;font-weight:900;color:var(--accent)}h1{font-size:20px;margin:0}.sub{font-size:12px;color:var(--muted);margin-top:3px}.actions,.rowBtns{display:flex;gap:8px;flex-wrap:wrap}.btn{background:var(--panel2);border:1px solid var(--line);color:var(--text);padding:9px 12px;border-radius:8px;cursor:pointer}.btn:hover{border-color:#596270}.btn.primary{background:var(--accent);border-color:var(--accent);color:#0a0b06;font-weight:850}.btn.danger{background:#2a1618;border-color:#703238;color:#ffd0d0}.btn.good{background:#11271a;border-color:#2f6541;color:#c5ffd7}.btn.small{padding:6px 9px;font-size:12px}.status{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:12px}.dot{width:9px;height:9px;border-radius:50%;background:#6c7380}.dot.on{background:var(--good);box-shadow:0 0 0 3px rgba(88,223,141,.12)}.dot.off{background:var(--danger)}.modeBar{display:flex;gap:8px;margin-bottom:14px}.modeBtn{flex:1;padding:12px;font-weight:800;text-align:center;border-radius:9px}.modeBtn.active{background:var(--accent);border-color:var(--accent);color:#0a0b06}.metrics{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:16px}.metric,.panel{background:var(--panel);border:1px solid var(--line);border-radius:11px}.metric{padding:14px}.metric .n{font-size:25px;font-weight:850}.metric .l{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:4px}.sectionTitle{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;border-bottom:1px solid var(--line)}.sectionTitle h2{font-size:15px;margin:0}.runnerBadge{font-size:12px;color:var(--muted)}.campaignGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:12px}.campaign{border:1px solid #252b34;background:#0e1115;border-radius:9px;padding:12px}.campaignHead{display:flex;justify-content:space-between;gap:10px}.campaignName{font-weight:800}.campaignMeta{font-size:12px;color:var(--muted);line-height:1.5;margin-top:5px}.progress{height:7px;background:#222830;border-radius:999px;overflow:hidden;margin:10px 0}.progress>span{display:block;height:100%;background:var(--accent)}.pill{display:inline-flex;padding:4px 7px;border:1px solid #343b47;border-radius:999px;font-size:10px;white-space:nowrap}.pill.A{color:#d9ffba;border-color:#4d7133}.pill.B{color:#e7f3ff;border-color:#496078}.pill.RUNNING{color:#c5ffd7;border-color:#315f43}.pill.READY{color:#ffe1a6;border-color:#7b6030}.pill.FAILED,.pill.ERROR{color:#ffc4c4;border-color:#70373b}.pill.COMPLETED{color:#c5ffd7;border-color:#315f43}.toolbar{display:flex;gap:9px;align-items:center;padding:12px;border-bottom:1px solid var(--line);flex-wrap:wrap}.toolbar input,.toolbar select,.modal input,.modal textarea,.modal select{background:#0d0f13;border:1px solid var(--line);color:var(--text);padding:9px 10px;border-radius:8px;outline:none}.toolbar input{min-width:260px;flex:1}.tableWrap{overflow:auto;max-height:54vh}table{width:100%;border-collapse:collapse;min-width:1020px}th,td{padding:11px 12px;border-bottom:1px solid #22262e;font-size:13px;text-align:left}th{position:sticky;top:0;background:#11141a;color:#aeb5c1;text-transform:uppercase;font-size:10px;letter-spacing:.06em}.business{font-weight:750}.muted{color:var(--muted)}.right{text-align:right}.empty{text-align:center;padding:30px;color:var(--muted)}.overlay{position:fixed;inset:0;background:rgba(0,0,0,.72);display:none;align-items:flex-start;justify-content:center;padding:5vh 16px;z-index:20;overflow:auto}.overlay.open{display:flex}.modal{width:min(760px,100%);background:#101319;border:1px solid #323845;border-radius:12px;padding:18px}.modal h2{margin:0 0 13px;font-size:18px}.modal label{display:block;font-size:10px;color:var(--muted);margin:10px 0 5px;text-transform:uppercase;letter-spacing:.06em}.modal input,.modal textarea,.modal select{width:100%}.modal textarea{min-height:90px;resize:vertical}.modal .grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.modalFooter{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}.detailGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin:12px 0}.detailItem{padding:7px 0;border-bottom:1px solid #222832}.detailItem b{display:block;color:var(--muted);font-size:10px;text-transform:uppercase;margin-bottom:3px}.timeline{border-top:1px solid var(--line);padding-top:12px;max-height:300px;overflow:auto}.event{padding:8px 0;border-bottom:1px solid #21252d}.eventHead{display:flex;justify-content:space-between;font-size:12px}.eventData{font-size:11px;color:#aeb5c1;margin-top:4px;white-space:pre-wrap}.login{position:fixed;inset:0;background:#08090b;display:grid;place-items:center;z-index:50}.loginCard{width:min(430px,92vw);background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:24px}.loginCard input{width:100%;margin:12px 0;background:#0b0d10;border:1px solid var(--line);color:#fff;padding:11px;border-radius:8px}.errorBar{display:none;background:#33191b;color:#ffd0d0;border:1px solid #6f3034;border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:13px}.stack{display:grid;gap:14px}.qItem{display:grid;grid-template-columns:1fr 70px 110px 110px 34px;gap:6px;margin-bottom:6px;align-items:center}.qSend{display:grid;grid-template-columns:2fr 1fr auto;gap:8px;align-items:center}.qStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:12px 0}@media(max-width:700px){.qItem{grid-template-columns:1fr 1fr}.qItem .qiDesc{grid-column:1/-1}.qSend,.qStats{grid-template-columns:1fr 1fr}}@media(max-width:1050px){.metrics{grid-template-columns:repeat(3,1fr)}.campaignGrid{grid-template-columns:1fr 1fr}}@media(max-width:700px){.shell{padding:12px}.top{align-items:flex-start;flex-direction:column}.metrics{grid-template-columns:repeat(2,1fr)}.campaignGrid{grid-template-columns:1fr}.modal .grid2,.detailGrid{grid-template-columns:1fr}.actions{width:100%}.btn{flex:1}.tableWrap{max-height:50vh}}
  </style>
</head>
<body>
<div class="login" id="login"><div class="loginCard"><h2>Trenches Command Center</h2><p class="muted">Enter the admin key created during the original deployment.</p><input id="keyInput" type="password" autocomplete="current-password" placeholder="Admin key"/><button class="btn primary" onclick="login()">Sign in</button><div class="errorBar" id="loginError"></div></div></div>
<div class="shell">
  <div class="top"><div class="brand"><div class="mark">TG</div><div><h1>Trenches Command Center</h1><div class="sub">Phase 4A v22 \xB7 Website Gap Gate + Manual Lead Control</div></div></div><div class="actions"><button class="btn" onclick="refreshAll()">Refresh</button><button class="btn danger" id="globalToggle" onclick="toggleGlobal()">Pause all automation</button><button class="btn primary" onclick="openCampaign()">+ Prospecting campaign</button></div></div>
  <div class="modeBar"><button class="btn modeBtn" id="modeWebsiteBtn" onclick="setMode('WEBSITE')">Website Business</button><button class="btn modeBtn" id="modeConciergeBtn" onclick="setMode('CONCIERGE')">AI Concierge Business</button></div>
  <div class="errorBar" id="errorBar"></div>
  <div class="metrics"><div class="metric"><div class="n" id="mTotal">\u2014</div><div class="l">Total leads</div></div><div class="metric"><div class="n" id="mQualified">\u2014</div><div class="l">Qualified</div></div><div class="metric"><div class="n" id="mPriority">\u2014</div><div class="l">Priority A/B</div></div><div class="metric"><div class="n" id="mCampaigns">\u2014</div><div class="l">Campaigns</div></div><div class="metric"><div class="n" id="mHuman">\u2014</div><div class="l">Human review</div></div><div class="metric"><div class="n" id="mWon">\u2014</div><div class="l">Customers</div></div></div>

  <div class="stack">
    <section class="panel"><div class="sectionTitle"><div><h2>Quotes &amp; Estimates</h2><div class="sub">Build a quote, send it to any email, and see every open and view. Clients see it on trenchesgroup.com and in their client portal.</div></div><div class="rowBtns" style="align-items:center"><span class="runnerBadge" id="quoteMailbox">Checking mailbox\u2026</span><span class="runnerBadge" id="quoteSummary">Loading\u2026</span><button class="btn primary" onclick="openQuote(null)">+ New quote</button></div></div><div class="tableWrap" style="max-height:420px"><table style="min-width:1000px"><thead><tr><th>Quote</th><th>Client</th><th>Title</th><th>Total</th><th>Status</th><th>Sent to</th><th>Opens</th><th>Views</th><th>Last viewed</th><th></th></tr></thead><tbody id="quoteRows"></tbody></table><div class="empty" id="quoteEmpty">No quotes yet. Click + New quote to build your first one.</div></div></section>
    <section class="panel" data-mode="WEBSITE"><div class="sectionTitle"><div><h2>Operator Dashboard <span class="pill READY">PHASE 5</span></h2><div class="sub">Your highest-value next actions. Uses existing Command Center data only\u2014no new provider calls.</div></div><div class="runnerBadge" id="operatorSummary">Loading priorities\u2026</div></div><div class="campaignGrid" id="operatorGrid"><div class="empty">Loading operator priorities\u2026</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Prospect Tracker <span class="pill READY">PHASE 7</span></h2><div class="sub">Export your Command Center prospects for a client-ready tracker. Includes opportunity, pitch hook, concept link, and current stage\u2014no Airtable account required.</div></div><button class="btn primary" onclick="downloadProspectTracker()">Download tracker CSV</button></div><div style="padding:12px 14px" class="sub">Use the CSV in Excel, Google Sheets, or import it into Airtable later if you choose. Your source of truth remains Command Center.</div></section>
    <section class="panel" data-mode="WEBSITE"><div class="sectionTitle"><div><h2>Client Launch Board <span class="pill READY">PHASE 8</span></h2><div class="sub">The handoff from live demo to customer. Review the next commercial or onboarding action without adding another system.</div></div><div class="runnerBadge" id="launchSummary">Loading launch work\u2026</div></div><div class="campaignGrid" id="launchGrid"><div class="empty">Loading client launch work\u2026</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Prospecting campaigns</h2><div class="sub">Fast discovery \u2192 deterministic filtering \u2192 one-business enrichment. One bad candidate cannot kill a campaign.</div></div><div class="rowBtns"><button class="btn small" id="archiveToggle" onclick="toggleArchived()">Show archived</button><div class="runnerBadge"><span class="dot" id="runnerDot"></span><span id="runnerText">Runner unknown</span></div></div></div><div class="campaignGrid" id="campaignGrid"><div class="empty">No campaigns yet.</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Prospector Job Queue <span class="pill READY">AUTO</span></h2><div class="sub">Rotating city \xD7 category grid. A capped number of due jobs get promoted into real prospecting campaigns automatically on the 2-minute scheduler tick \u2014 this does not bypass the daily cap or backlog limit below.</div></div><div class="rowBtns"><span class="runnerBadge" id="prospectorJobsSummary">Loading\u2026</span><button class="btn small primary" onclick="runProspectorJobsNow()">Run due jobs now</button></div></div><div class="tableWrap" style="max-height:320px"><table style="min-width:900px"><thead><tr><th>City</th><th>Category</th><th>Radius</th><th>Target</th><th>Cadence</th><th>Last run</th><th>Status</th><th></th></tr></thead><tbody id="prospectorJobRows"></tbody></table><div class="empty" id="prospectorJobEmpty">No prospector jobs seeded yet.</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Outreach Lab <span class="pill READY">TEST MODE</span></h2><div class="sub">Twilio plumbing only. Only numbers on the explicit test allowlist can receive SMS. Live prospect outreach is hard-locked.</div></div><div class="runnerBadge"><span class="dot" id="twilioDot"></span><span id="twilioText">Twilio status unknown</span></div></div><div class="toolbar"><input id="oPhone" placeholder="Your test phone, e.g. +16155551234"/><input id="oLabel" placeholder="Label, e.g. Connor iPhone"/><button class="btn" onclick="addTestNumber()">Add test number</button></div><div class="toolbar"><input id="oMessage" value="Trenches test: reply YES, PRICE, CALL ME, or STOP."/><button class="btn primary" onclick="sendTestSms()">Send test SMS</button></div><div style="padding:0 12px 10px"><div class="sub" id="outreachWebhookText"></div><div id="allowlistRows" class="rowBtns" style="margin-top:9px"></div></div><div class="tableWrap" style="max-height:260px"><table style="min-width:820px"><thead><tr><th>Time</th><th>Direction</th><th>Phone</th><th>Message</th><th>Intent</th><th>Status</th></tr></thead><tbody id="messageRows"></tbody></table><div class="empty" id="messageEmpty">No outreach test messages yet.</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Autonomous Outreach Orchestrator <span class="pill READY">EMAIL + SMS FOUNDATION</span></h2><div class="sub">Google Workspace email can run autonomously after one-time OAuth setup. Gmail replies feed the same conversation brain. SMS stays live-locked until Twilio approval; voice/social adapters remain disabled.</div></div><div class="runnerBadge"><span class="dot" id="gmailDot"></span><span id="gmailText">Gmail status unknown</span></div></div>
      <div class="toolbar"><input id="gClientId" placeholder="Smartlead sending mailbox (e.g. connor.trenches@discovertrenchesgroup.com)"/><button class="btn primary" onclick="saveSmartleadMailboxUi()">Save Smartlead mailbox</button></div>
      <div style="padding:0 12px 10px"><div class="sub" id="gmailCallback"></div></div>
      <div class="toolbar"><span class="dot on"></span><span class="sub" id="replyModelText">Replies are human-in-the-loop: answer leads directly in Smartlead. Genuine replies (not bounces/autoresponders) email a heads-up here.</span></div>
      <div style="padding:0 12px 10px"><div class="sub">Live conversational replies (price/skepticism/etc. answers) send through this mailbox via Gmail API, separate from Smartlead's bulk campaign sends. Sign in as connor.trenches@discovertrenchesgroup.com when prompted.</div></div>
      <div class="toolbar"><input id="emailFromName" placeholder="From name"/><input id="emailPostal" placeholder="Business postal address (required before live email)"/><input id="emailDailyCap" type="number" min="1" max="100" value="10" style="min-width:120px;max-width:150px"/><select id="emailReplyMode"><option value="DRAFT_ONLY">Replies: Draft only</option><option value="AUTO">Replies: Auto-send</option></select><button class="btn" onclick="saveEmailSettingsUi()">Save settings</button></div>
      <div class="toolbar"><button class="btn" id="emailLiveToggle" onclick="toggleEmailLiveUi()">Enable live email</button><button class="btn" id="emailAutoToggle" onclick="toggleEmailAutomationUi()">Enable autonomous sequences</button><button class="btn" onclick="runOrchestratorUi()">Run orchestrator now</button><div class="sub" id="emailModeText"></div></div>
      <div class="toolbar"><button class="btn" id="websiteTrackToggle" onclick="toggleWebsiteTrackUi()">Website outreach</button><button class="btn" id="conciergeTrackToggle" onclick="toggleConciergeTrackUi()">Concierge outreach</button><div class="sub">Independent per-pitch switches \u2014 each can run without the other, on top of the live-email/automation switches above.</div></div>
      <div class="toolbar"><input id="emailTestAddress" placeholder="Test email address"/><input id="emailTestLabel" placeholder="Label"/><button class="btn" onclick="addEmailTestAddressUi()">Allowlist test email</button><select id="emailTestLead" style="min-width:280px;flex:1"><option value="">Optional lead to simulate</option></select></div>
      <div class="toolbar"><input id="emailTestSubject" value="quick question about your business"/><input id="emailTestBody" value="Hey \u2014 Trenches OS email test. Reply YES, PRICE, WHAT'S THE CATCH, or UNSUBSCRIBE."/><button class="btn primary" onclick="sendEmailTestUi()">Send test email</button></div>
      <div style="padding:0 12px 10px"><div id="emailAllowlistRows" class="rowBtns"></div></div>
      <div class="sectionTitle"><div><h2>Email activity</h2><div class="sub">Inbound replies are polled automatically and mapped back to the lead/thread.</div></div></div><div class="tableWrap" style="max-height:260px"><table style="min-width:980px"><thead><tr><th>Time</th><th>Direction</th><th>Business</th><th>Email</th><th>Subject</th><th>Intent</th><th>Outcome</th><th>Status</th></tr></thead><tbody id="emailMessageRows"></tbody></table><div class="empty" id="emailMessageEmpty">No email activity yet.</div></div>
      <div class="sectionTitle"><div><h2>Autonomous sequences</h2><div class="sub">Priority A/B + VALID + verified email. Daily cap and suppression rules apply.</div></div></div><div class="tableWrap" style="max-height:260px"><table style="min-width:900px"><thead><tr><th>Business</th><th>Priority</th><th>Strategy</th><th>Status</th><th>Step</th><th>Next action</th></tr></thead><tbody id="sequenceRows"></tbody></table><div class="empty" id="sequenceEmpty">No autonomous email sequences yet.</div></div>
    </section>
    <section class="panel" data-mode="WEBSITE"><div class="sectionTitle"><div><h2>Conversation Test Bench <span class="pill READY">DRAFT ONLY</span></h2><div class="sub">No real prospect messages are sent. Normal replies keep the conversation moving toward a free live-preview demo; opt-outs still stop immediately.</div></div><div class="runnerBadge">Live auto-replies locked</div></div><div class="toolbar"><select id="simLead" style="min-width:320px;flex:1"></select><input id="simMessage" value="Yes, what is this about?" placeholder="Simulated prospect reply"/><button class="btn primary" onclick="simulateConversation()">Simulate reply</button></div><div class="toolbar"><button class="btn" onclick="makeOpenerDraft()">Draft opener</button><button class="btn" onclick="scheduleFollowupsUi()">Schedule 24h / 72h / 7d follow-ups</button><button class="btn" onclick="runFollowupsUi()">Draft due follow-ups now</button><div class="sub" id="simResult" style="flex:1"></div></div><div class="sectionTitle"><div><h2>Reply drafts</h2><div class="sub">Human-reviewable drafts only. Approving a draft does not send SMS in Phase 3B.</div></div></div><div class="tableWrap" style="max-height:300px"><table style="min-width:1000px"><thead><tr><th>Time</th><th>Business</th><th>Intent</th><th>Draft</th><th>Confidence</th><th>Status</th><th>Actions</th></tr></thead><tbody id="draftRows"></tbody></table><div class="empty" id="draftEmpty">No conversation drafts yet.</div></div><div class="sectionTitle"><div><h2>Follow-up queue</h2><div class="sub">The scheduler creates drafts when follow-ups become due; it does not auto-send.</div></div></div><div class="tableWrap" style="max-height:260px"><table style="min-width:900px"><thead><tr><th>Business</th><th>Step</th><th>Due</th><th>Status</th><th>Message</th></tr></thead><tbody id="followupRows"></tbody></table><div class="empty" id="followupEmpty">No follow-ups scheduled.</div></div><div class="sectionTitle"><div><h2>Human escalation</h2><div class="sub">CALL ME and angry/sensitive replies are surfaced here. Normal questions and unknown replies stay conversational instead of failing.</div></div></div><div class="tableWrap" style="max-height:260px"><table style="min-width:900px"><thead><tr><th>Time</th><th>Business</th><th>Priority</th><th>Reason</th><th>Recommended action</th><th>Status</th><th></th></tr></thead><tbody id="escalationRows"></tbody></table><div class="empty" id="escalationEmpty">No escalations.</div></div></section>
    <section class="panel" data-mode="WEBSITE"><div class="sectionTitle"><div><h2>Demo Fulfillment <span class="pill READY">PHASE 4</span></h2><div class="sub">Command Center balances website builds across available providers, applies deterministic and independent QA, then waits for your approval before delivery.</div></div><div class="runnerBadge"><span class="dot on"></span><span id="demoModeText">Loading demo automation\u2026</span></div></div><div class="toolbar"><select id="demoLead" style="min-width:320px;flex:1"></select><button class="btn primary" onclick="queueDemoUi()">Queue demo build</button><button class="btn" onclick="configureDemoQualityUi()">Quality controls</button><button class="btn" id="demoAutoToggle" onclick="toggleDemoAutomation()">Toggle auto build</button><button class="btn" id="demoDeliverToggle" onclick="toggleDemoDelivery()">Toggle auto delivery</button></div><div class="toolbar"><select id="staticDemoLead" style="min-width:320px;flex:1"><option value="">Choose any active lead for a no-cost sample\u2026</option></select><button class="btn good" onclick="createStaticDemoUi()">Create no-cost sample</button><div class="sub">Uses a static, clearly labeled concept\u2014no AI call or email delivery.</div></div><div class="tableWrap" style="max-height:320px"><table style="min-width:1100px"><thead><tr><th>Business</th><th>Job / Builder</th><th>State</th><th>QA</th><th>Views</th><th>CTA</th><th>Preview</th><th>Delivery</th></tr></thead><tbody id="demoRows"></tbody></table><div class="empty" id="demoEmpty">No demos yet.</div></div></section>
    <section class="panel"><div class="sectionTitle"><div><h2>Lead pipeline</h2><div class="sub" id="systemText">Loading system status\u2026</div></div><div class="rowBtns"><button class="btn" onclick="reAuditWebsiteGapsUi()">Re-audit website gaps</button><button class="btn" onclick="openImport()">Manual research import</button></div></div><div class="toolbar"><input id="search" placeholder="Search business, city, phone, email" oninput="debouncedLoad()"/><select id="stateFilter" onchange="loadLeads()"><option value="">All states</option><option>QUALIFIED</option><option>HUMAN_REVIEW</option><option>DISQUALIFIED</option><option>RESEARCHING</option><option>QUALIFYING</option></select><select id="priorityFilter" onchange="loadLeads()"><option value="">All priorities</option><option>A</option><option>B</option><option>C</option><option>PASS</option></select></div><div class="tableWrap"><table><thead><tr><th>Business</th><th>Location</th><th>Industry</th><th>Gap</th><th>Score</th><th>Priority</th><th>State</th><th>Phone</th><th>Updated</th><th></th></tr></thead><tbody id="leadRows"></tbody></table><div class="empty" id="leadEmpty">No leads yet.</div></div></section>
  </div>
</div>

<div class="overlay" id="campaignOverlay" onclick="overlayClose(event,'campaignOverlay')"><div class="modal"><h2>New prospecting campaign</h2><div class="grid2"><div><label>Industry</label><input id="cIndustry" value="Tree Service"/></div><div><label>Target prospects</label><input id="cTarget" type="number" min="1" max="300" value="10"/></div></div><div class="grid2"><div><label>Center city / location</label><input id="cCenterLocation" value="Murfreesboro, TN" placeholder="e.g. Murfreesboro, TN"/></div><div><label>Radius from city (miles)</label><input id="cRadiusMiles" type="number" min="1" max="100" step="1" value="25"/></div></div><div class="sub" style="margin-top:7px">Trenches will discover businesses around the center city within the requested radius instead of requiring a manual city list.</div><div class="grid2"><div><label>Minimum Google rating (optional)</label><input id="cMinRating" type="number" min="0" max="5" step="0.1" placeholder="e.g. 4.2"/></div><div><label>Minimum review count (optional)</label><input id="cMinReviews" type="number" min="0" placeholder="e.g. 10"/></div></div><div class="grid2"><div><label>Discovery provider</label><select id="cDiscoveryProvider"><option value="AUTO">Auto balance</option><option value="HYPERAGENT">HyperAgent</option><option value="CLAUDE">Claude</option><option value="OPENAI">OpenAI API</option></select></div><div><label>Enrichment provider</label><select id="cEnrichmentProvider"><option value="AUTO">Auto balance</option><option value="CLAUDE">Claude</option><option value="OPENAI">OpenAI API</option><option value="HYPERAGENT">HyperAgent</option></select></div></div><div class="grid2"><div><label>Fallback if provider fails</label><select id="cFallback"><option value="true">On \u2014 try another configured provider</option><option value="false">Off \u2014 stay on selected provider</option></select></div><div><label>Claude model (when Claude is used)</label><select id="cModel"><option value="sonnet">Claude Sonnet</option><option value="opus">Claude Opus</option></select></div></div><div class="sub" style="margin-top:7px">Auto balances successful jobs across whichever providers are configured on the Orgo runner. OpenAI API usage is billed separately from ChatGPT Pro.</div><label>Notes (optional)</label><textarea id="cNotes" style="min-height:70px"></textarea><div class="modalFooter"><button class="btn" onclick="closeOverlay('campaignOverlay')">Cancel</button><button class="btn primary" onclick="createCampaign()">Start prospecting</button></div></div></div>

<div class="overlay" id="campaignDetailOverlay" onclick="overlayClose(event,'campaignDetailOverlay')"><div class="modal" id="campaignDetail"></div></div>
<div class="overlay" id="leadDetailOverlay" onclick="overlayClose(event,'leadDetailOverlay')"><div class="modal" id="leadDetail"></div></div>
<div class="overlay" id="quoteOverlay" onclick="overlayClose(event,'quoteOverlay')"><div class="modal" id="quoteModal" style="width:min(900px,100%)"></div></div>
<div class="overlay" id="importOverlay" onclick="overlayClose(event,'importOverlay')"><div class="modal"><h2>Manual researched prospect import</h2><div class="sub">Fallback/testing only. Native campaigns should normally populate leads automatically.</div><label>JSON batch</label><textarea id="importJson" style="min-height:310px;font-family:ui-monospace,Consolas,monospace;font-size:12px"></textarea><div class="modalFooter"><button class="btn" onclick="loadSampleImport()">Load sample</button><button class="btn" onclick="closeOverlay('importOverlay')">Cancel</button><button class="btn primary" onclick="importProspects()">Validate & import</button></div></div></div>
<script>
let adminKey=sessionStorage.getItem('trenches_admin_key')||'';let globalPaused=false;let timer=null;let showArchived=false;
let businessMode=(function(){try{return localStorage.getItem('trenches_mode')==='CONCIERGE'?'CONCIERGE':'WEBSITE'}catch(e){return 'WEBSITE'}})();
function setMode(mode){businessMode=mode;try{localStorage.setItem('trenches_mode',mode)}catch(e){}applyModeVisibility();refreshAll().catch(()=>{})}
function applyModeVisibility(){document.querySelectorAll('[data-mode]').forEach(el=>{el.style.display=el.getAttribute('data-mode')===businessMode?'':'none'});const wb=document.getElementById('modeWebsiteBtn'),cb=document.getElementById('modeConciergeBtn');if(wb)wb.className='btn modeBtn'+(businessMode==='WEBSITE'?' active':'');if(cb)cb.className='btn modeBtn'+(businessMode==='CONCIERGE'?' active':'')}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,opts={}){const h=new Headers(opts.headers||{});h.set('Authorization','Bearer '+adminKey);if(opts.body&&!h.has('Content-Type'))h.set('Content-Type','application/json');const r=await fetch(path,{...opts,headers:h});let b={};try{b=await r.json()}catch{}if(r.status===401){logout();throw new Error('Admin key rejected.')}if(!r.ok)throw new Error(b?.error?.message||('Request failed: '+r.status));return b}
async function downloadProspectTracker(){try{const r=await fetch('/api/tracker/export.csv',{headers:{Authorization:'Bearer '+adminKey}});if(r.status===401){logout();throw new Error('Admin key rejected.')}if(!r.ok)throw new Error('Tracker export failed: '+r.status);const blob=await r.blob(),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='trenches-prospect-tracker.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),500)}catch(e){showError(e)}}
function showError(e){const b=document.getElementById('errorBar');b.textContent=e instanceof Error?e.message:String(e);b.style.display='block';setTimeout(()=>b.style.display='none',9000)}
async function login(){const k=document.getElementById('keyInput').value.trim();if(!k)return;adminKey=k;try{await api('/api/system/status');sessionStorage.setItem('trenches_admin_key',k);document.getElementById('login').style.display='none';await refreshAll();applyDeepLink()}catch(e){adminKey='';document.getElementById('loginError').textContent=e.message;document.getElementById('loginError').style.display='block'}}function logout(){sessionStorage.removeItem('trenches_admin_key');adminKey='';document.getElementById('login').style.display='grid'}
function applyDeepLink(){try{const p=new URLSearchParams(location.search),leadId=p.get('leadId');if(leadId)openLead(encodeURIComponent(leadId))}catch(e){}}
async function refreshAll(){try{await Promise.all([loadDashboard(),loadSystem(),loadRunner(),loadCampaigns(),loadProspectorJobs(),loadOutreach(),loadEmailOutreach(),loadConversation(),loadDemos(),loadLeads(),loadOperatorDesk(),loadLaunchBoard(),loadQuotes(),loadQuoteMailbox()])}catch(e){showError(e)}}
async function loadDashboard(){const d=await api('/api/dashboard'),c=d.counts||{};document.getElementById('mTotal').textContent=d.total??0;document.getElementById('mQualified').textContent=(c.QUALIFIED||0)+(c.OUTREACH_READY||0);document.getElementById('mPriority').textContent=(d.priorityCounts?.A||0)+(d.priorityCounts?.B||0);document.getElementById('mCampaigns').textContent=Object.values(d.campaigns||{}).reduce((a,b)=>a+Number(b||0),0);document.getElementById('mHuman').textContent=d.humanRequired||0;document.getElementById('mWon').textContent=(c.WON||0)+(c.ACTIVE_CUSTOMER||0)}
async function loadOperatorDesk(){const [leadData,demoData]=await Promise.all([api('/api/leads?limit=200'),api('/api/demos/status')]),sites=new Map((demoData.sites||[]).map(x=>[x.lead_id,x])),jobs=new Map((demoData.jobs||[]).map(x=>[x.lead_id,x])),leads=(leadData.leads||[]).filter(x=>!['DISQUALIFIED','OPTED_OUT','DUPLICATE','LOST','ACTIVE_CUSTOMER'].includes(x.current_state)).sort((a,b)=>Number(b.opportunity_score||0)-Number(a.opportunity_score||0)).slice(0,6),grid=document.getElementById('operatorGrid');grid.innerHTML='';let ready=0,review=0;for(const l of leads){const site=sites.get(l.id),job=jobs.get(l.id),preview=site?'<a class="btn small good" target="_blank" rel="noopener" href="'+esc((demoData.publicBaseUrl||'')+'/demo/'+site.slug)+'">See new website</a><a class="btn small" target="_blank" rel="noopener" href="'+esc((demoData.publicBaseUrl||'')+'/demo/'+site.slug+'/quote')+'">Try quote flow</a>':'';const action=site?'Review preview':(l.current_state==='HUMAN_REVIEW'?'Resolve review':job?(job.status==='FAILED'?'Fix build path':'Build in progress'):(l.current_state==='DEMO_APPROVED'?'Queue demo':'Advance outreach'));if(site)ready++;if(l.current_state==='HUMAN_REVIEW'||job?.status==='FAILED')review++;grid.insertAdjacentHTML('beforeend','<div class="campaign"><div class="campaignHead"><div><div class="campaignName">'+esc(l.business_name)+'</div><div class="campaignMeta">'+esc(l.city)+', '+esc(l.state)+' \xB7 '+esc(l.industry)+'</div></div><span class="pill '+esc(l.priority||'READY')+'">'+esc(l.priority||'\u2014')+'</span></div><div class="campaignMeta" style="margin-top:10px">'+esc(l.website||'No website recorded')+'</div><div class="campaignMeta">Score '+esc(l.opportunity_score??'\u2014')+' \xB7 '+esc(l.current_state)+'</div><div class="campaignMeta" style="color:var(--accent);margin-top:7px">Next: '+esc(action)+'</div><div class="rowBtns" style="margin-top:10px"><button class="btn small" data-operator-lead="'+esc(encodeURIComponent(l.id))+'">Open lead</button>'+preview+'</div></div>')}if(!leads.length)grid.innerHTML='<div class="empty">No active priority leads yet. Start a prospecting campaign or review your lead pipeline.</div>';document.getElementById('operatorSummary').textContent=ready+' preview'+(ready===1?'':'s')+' ready \xB7 '+review+' need review';document.querySelectorAll('[data-operator-lead]').forEach(b=>b.addEventListener('click',()=>openLead(b.getAttribute('data-operator-lead'))))}
async function loadLaunchBoard(){const [leadData,demoData]=await Promise.all([api('/api/leads?limit=200'),api('/api/demos/status')]),sites=new Map((demoData.sites||[]).map(x=>[x.lead_id,x])),commercial=new Set(['DEMO_READY','DEMO_SENT','DEMO_VIEWED','PRICING_VIEWED','CHECKOUT_STARTED','WON','ONBOARDING','LIVE','ACTIVE_CUSTOMER']),leads=(leadData.leads||[]).filter(x=>commercial.has(x.current_state)||sites.has(x.id)).sort((a,b)=>Number(b.opportunity_score||0)-Number(a.opportunity_score||0)).slice(0,9),grid=document.getElementById('launchGrid');grid.innerHTML='';let proposal=0,onboarding=0;for(const l of leads){const site=sites.get(l.id),state=l.current_state,action=['PRICING_VIEWED','CHECKOUT_STARTED'].includes(state)?'Send proposal / close terms':['WON','ONBOARDING'].includes(state)?'Collect onboarding details':state==='LIVE'?'Confirm launch handoff':state==='ACTIVE_CUSTOMER'?'Manage active customer':site?'Approve and send preview':'Advance to a live demo';if(['PRICING_VIEWED','CHECKOUT_STARTED'].includes(state))proposal++;if(['WON','ONBOARDING','LIVE'].includes(state))onboarding++;const preview=site?'<a class="btn small good" target="_blank" rel="noopener" href="'+esc((demoData.publicBaseUrl||'')+'/demo/'+site.slug)+'">Open preview</a>':'';grid.insertAdjacentHTML('beforeend','<div class="campaign"><div class="campaignHead"><div><div class="campaignName">'+esc(l.business_name)+'</div><div class="campaignMeta">'+esc(l.city)+', '+esc(l.state)+'</div></div><span class="pill '+esc(l.priority||'READY')+'">'+esc(l.priority||'\u2014')+'</span></div><div class="campaignMeta" style="margin-top:10px">Stage: <b>'+esc(state)+'</b></div><div class="campaignMeta" style="color:var(--accent);margin-top:7px">Next: '+esc(action)+'</div><div class="rowBtns" style="margin-top:10px"><button class="btn small" data-launch-lead="'+esc(encodeURIComponent(l.id))+'">Open lead</button>'+preview+'</div></div>')}if(!leads.length)grid.innerHTML='<div class="empty">No commercial handoffs yet. A lead will appear here once a preview is ready or the sales process advances.</div>';document.getElementById('launchSummary').textContent=proposal+' proposal'+(proposal===1?'':'s')+' \xB7 '+onboarding+' onboarding';document.querySelectorAll('[data-launch-lead]').forEach(b=>b.addEventListener('click',()=>openLead(b.getAttribute('data-launch-lead'))))}
async function loadSystem(){const d=await api('/api/system/status');globalPaused=!!d.globalAutomationPaused;document.getElementById('systemText').textContent=globalPaused?'Automation paused':(d.outreachEnabled?'System online \xB7 outreach enabled':'System online \xB7 outreach locked');const b=document.getElementById('globalToggle');b.textContent=globalPaused?'Resume all automation':'Pause all automation';b.className='btn '+(globalPaused?'good':'danger')}
async function loadRunner(){const d=await api('/api/runner/status');const dot=document.getElementById('runnerDot'),text=document.getElementById('runnerText');dot.className='dot '+(d.online?'on':'off');if(d.online){const r=d.runner||{};let ps='';try{const m=JSON.parse(r.metadata_json||'{}');if(Array.isArray(m.providers))ps=' \xB7 '+m.providers.join('/')}catch{}text.textContent='Orgo runner online'+ps+(r.claude_version?' \xB7 Claude '+r.claude_version:'')}else{text.textContent='Orgo runner offline / sleeping'}}
async function loadCampaigns(){const qp=new URLSearchParams();if(showArchived)qp.set('archived','true');qp.set('offering',businessMode);const d=await api('/api/campaigns?'+qp.toString()),g=document.getElementById('campaignGrid');g.innerHTML='';document.getElementById('archiveToggle').textContent=showArchived?'Show active':'Show archived';if(!d.campaigns?.length){g.innerHTML='<div class="empty">'+(showArchived?'No archived campaigns.':'No campaigns yet. Create your first real prospecting campaign.')+'</div>';return}for(const c of d.campaigns){const target=c.requested_count||0,done=c.enriched||0,pct=target?Math.min(100,Math.round(done/target*100)):0,loc=campaignGeo(c);const counts='Enriched '+done+' / '+target+' \xB7 Raw '+(c.raw_discovered||0)+' \xB7 Queued '+(c.queued||0)+' \xB7 Failed '+(c.enrichment_failed||0);const priorities='A '+(c.priority_a||0)+' \xB7 B '+(c.priority_b||0)+' \xB7 C '+(c.priority_c||0)+' \xB7 PASS '+(c.priority_pass||0),providers='Discover '+(c.discovery_provider||'CLAUDE')+' \xB7 Enrich '+(c.enrichment_provider||'CLAUDE')+' \xB7 Fallback '+(Number(c.fallback_enabled)!==0?'ON':'OFF');g.insertAdjacentHTML('beforeend','<div class="campaign"><div class="campaignHead"><div><div class="campaignName">'+esc(c.industry)+'</div><div class="campaignMeta">'+esc(loc)+'</div></div><span class="pill '+esc(c.status)+'">'+esc(c.archived_at?'ARCHIVED':c.status)+'</span></div><div class="progress"><span style="width:'+pct+'%"></span></div><div class="campaignMeta">'+esc(counts)+'</div><div class="campaignMeta">'+esc(priorities)+' \xB7 Filtered '+(c.filtered||0)+' \xB7 Duplicates '+(c.deduped||0)+'</div><div class="campaignMeta">'+esc(providers)+'</div>'+(c.last_error?'<div class="campaignMeta" style="color:#ffbcbc">Last issue: '+esc(c.last_error)+'</div>':'')+'<div class="rowBtns" style="margin-top:10px"><button class="btn small" data-campaign="'+esc(encodeURIComponent(c.id))+'">Open</button>'+(!c.archived_at&&(c.status==='RUNNING'||c.status==='READY')?'<button class="btn small" data-pause="'+esc(encodeURIComponent(c.id))+'">Pause</button>':'')+(!c.archived_at&&c.status==='PAUSED'?'<button class="btn small good" data-resume="'+esc(encodeURIComponent(c.id))+'">Resume</button>':'')+(c.archived_at?'<button class="btn small good" data-restore="'+esc(encodeURIComponent(c.id))+'">Restore</button>':'<button class="btn small" data-archive="'+esc(encodeURIComponent(c.id))+'">Archive</button>')+'</div></div>')}document.querySelectorAll('[data-campaign]').forEach(b=>b.addEventListener('click',()=>openCampaignDetail(b.getAttribute('data-campaign'))));document.querySelectorAll('[data-pause]').forEach(b=>b.addEventListener('click',()=>campaignAction(b.getAttribute('data-pause'),'pause')));document.querySelectorAll('[data-resume]').forEach(b=>b.addEventListener('click',()=>campaignAction(b.getAttribute('data-resume'),'resume')));document.querySelectorAll('[data-archive]').forEach(b=>b.addEventListener('click',()=>archiveAction(b.getAttribute('data-archive'),'archive')));document.querySelectorAll('[data-restore]').forEach(b=>b.addEventListener('click',()=>archiveAction(b.getAttribute('data-restore'),'restore')))}
function campaignGeo(c){return c.center_location&&c.radius_miles?(c.center_location+' \xB7 '+c.radius_miles+' mi radius'):((c.geography||[]).join(' \xB7 '))}
function toggleArchived(){showArchived=!showArchived;loadCampaigns().catch(showError)}
function openCampaign(){document.getElementById('campaignOverlay').classList.add('open');document.getElementById('cIndustry').focus()}function closeOverlay(id){document.getElementById(id).classList.remove('open')}function overlayClose(e,id){if(e.target.id===id)closeOverlay(id)}
async function createCampaign(){try{const centerLocation=document.getElementById('cCenterLocation').value.trim(),radiusMiles=Number(document.getElementById('cRadiusMiles').value);if(!centerLocation)throw new Error('Center city/location is required.');if(!Number.isFinite(radiusMiles)||radiusMiles<1||radiusMiles>100)throw new Error('Radius must be between 1 and 100 miles.');const payload={industry:document.getElementById('cIndustry').value.trim(),centerLocation,radiusMiles,targetCount:Number(document.getElementById('cTarget').value),model:document.getElementById('cModel').value,discoveryProvider:document.getElementById('cDiscoveryProvider').value,enrichmentProvider:document.getElementById('cEnrichmentProvider').value,fallbackEnabled:document.getElementById('cFallback').value==='true',notes:document.getElementById('cNotes').value.trim()||undefined,offering:businessMode};const mr=document.getElementById('cMinRating').value,mv=document.getElementById('cMinReviews').value;if(mr!=='')payload.minRating=Number(mr);if(mv!=='')payload.minReviews=Number(mv);const d=await api('/api/campaigns',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify(payload)});closeOverlay('campaignOverlay');await refreshAll();alert('Campaign created for '+centerLocation+' \xB7 '+radiusMiles+' mi radius. Orgo wake: '+(d.orgo?.attempted?(d.orgo.status||'requested'):'not configured'))}catch(e){showError(e)}}
async function campaignAction(enc,action){try{await api('/api/campaigns/'+encodeURIComponent(decodeURIComponent(enc))+'/'+action,{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await refreshAll()}catch(e){showError(e)}}
async function archiveAction(enc,action){try{if(action==='archive'&&!confirm('Archive this campaign? Its leads and history will be preserved.'))return;await api('/api/campaigns/'+encodeURIComponent(decodeURIComponent(enc))+'/'+action,{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await refreshAll()}catch(e){showError(e)}}
async function loadProspectorJobs(){const d=await api('/api/prospector-jobs?offering='+businessMode),jobs=d.jobs||[],tbody=document.getElementById('prospectorJobRows'),active=jobs.filter(j=>j.active).length;document.getElementById('prospectorJobsSummary').textContent=jobs.length+' jobs \xB7 '+active+' active \xB7 '+(jobs.length-active)+' paused';if(!jobs.length){tbody.innerHTML='';document.getElementById('prospectorJobEmpty').style.display='block';return}document.getElementById('prospectorJobEmpty').style.display='none';tbody.innerHTML=jobs.map(j=>'<tr><td>'+esc(j.city)+', '+esc(j.state)+'</td><td>'+esc(j.category)+'</td><td>'+esc(j.radius_miles)+' mi</td><td>'+esc(j.target_count)+'</td><td>'+esc(j.cadence_days)+'d</td><td>'+esc(j.last_run_at?new Date(j.last_run_at).toLocaleString():'Never')+'</td><td><span class="pill '+(j.active?'READY':'FAILED')+'">'+(j.active?'ACTIVE':'PAUSED')+'</span></td><td><button class="btn small" data-jobtoggle="'+esc(encodeURIComponent(j.id))+'" data-jobactive="'+(j.active?'1':'0')+'">'+(j.active?'Pause':'Resume')+'</button></td></tr>').join('');tbody.querySelectorAll('[data-jobtoggle]').forEach(b=>b.addEventListener('click',()=>prospectorJobAction(b.getAttribute('data-jobtoggle'),b.getAttribute('data-jobactive')==='1'?'pause':'resume')))}
async function prospectorJobAction(enc,action){try{await api('/api/prospector-jobs/'+encodeURIComponent(decodeURIComponent(enc))+'/'+action,{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await loadProspectorJobs()}catch(e){showError(e)}}
async function runProspectorJobsNow(){try{const d=await api('/api/prospector-jobs/run-due',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});if(!d.ran){alert('No campaigns created: '+(d.reason||'nothing due'))}else{alert('Created '+d.created.length+' new campaign(s): '+d.created.map(c=>c.category+' @ '+c.city).join(', '))}await refreshAll()}catch(e){showError(e)}}
async function openCampaignDetail(enc){try{const d=await api('/api/campaigns/'+encodeURIComponent(decodeURIComponent(enc))),c=d.campaign,leads=d.leads||[],cands=d.candidates||[];const rows=leads.map(l=>'<tr><td>'+esc(l.business_name)+'</td><td>'+esc(l.city)+', '+esc(l.state)+'</td><td>'+esc(l.opportunity_score??'\u2014')+'</td><td>'+esc(l.priority||'\u2014')+'</td><td>'+esc(l.current_state)+'</td></tr>').join('')||'<tr><td colspan="5" class="muted">No enriched prospects linked yet.</td></tr>';const candRows=cands.slice(0,100).map(x=>'<tr><td>'+esc(x.business_name)+'</td><td>'+esc(x.target_match)+'</td><td>'+esc(x.status)+'</td><td>'+esc(x.google_rating??'\u2014')+' / '+esc(x.google_reviews??'\u2014')+'</td><td>'+esc(x.retry_count||0)+'</td></tr>').join('')||'<tr><td colspan="5" class="muted">No discovery candidates yet.</td></tr>';document.getElementById('campaignDetail').innerHTML='<div style="display:flex;justify-content:space-between;gap:12px"><div><h2>'+esc(c.industry)+'</h2><div class="muted">'+esc(campaignGeo(c))+'</div></div><button class="btn small" id="campaignClose">Close</button></div><div class="detailGrid"><div class="detailItem"><b>Status</b>'+esc(c.archived_at?'ARCHIVED \xB7 '+c.status:c.status)+'</div><div class="detailItem"><b>Stage</b>'+esc(c.last_stage||'\u2014')+'</div><div class="detailItem"><b>Target / Enriched</b>'+esc((c.requested_count||0)+' / '+(c.enriched||0))+'</div><div class="detailItem"><b>Raw discovered</b>'+esc(c.raw_discovered||0)+'</div><div class="detailItem"><b>Deduped / Filtered</b>'+esc((c.deduped||0)+' / '+(c.filtered||0))+'</div><div class="detailItem"><b>Queued / Enriching / Failed</b>'+esc((c.queued||0)+' / '+(c.enriching||0)+' / '+(c.enrichment_failed||0))+'</div><div class="detailItem"><b>Priority A/B/C/PASS</b>'+esc((c.priority_a||0)+' / '+(c.priority_b||0)+' / '+(c.priority_c||0)+' / '+(c.priority_pass||0))+'</div><div class="detailItem"><b>Discovery passes</b>'+esc(c.discovery_passes||0)+'</div><div class="detailItem"><b>Provider routing</b>'+esc((c.discovery_provider||'CLAUDE')+' discovery \xB7 '+(c.enrichment_provider||'CLAUDE')+' enrichment \xB7 fallback '+(Number(c.fallback_enabled)!==0?'ON':'OFF'))+'</div></div><h3 style="font-size:13px">Provider usage</h3><div class="tableWrap" style="max-height:180px"><table style="min-width:560px"><thead><tr><th>Provider</th><th>Stage</th><th>Status</th><th>Jobs</th><th>Est. API cost</th></tr></thead><tbody>'+((c.provider_usage||[]).map(u=>'<tr><td>'+esc(u.provider)+'</td><td>'+esc(u.stage)+'</td><td>'+esc(u.status)+'</td><td>'+esc(u.jobs)+'</td><td>'+esc(Number(u.estimated_cost_usd||0)>0?'$'+Number(u.estimated_cost_usd).toFixed(3):'\u2014')+'</td></tr>').join('')||'<tr><td colspan="5" class="muted">No provider jobs recorded yet.</td></tr>')+'</tbody></table></div><h3 style="font-size:13px">Enriched leads</h3><div class="tableWrap" style="max-height:250px"><table style="min-width:620px"><thead><tr><th>Business</th><th>Location</th><th>Score</th><th>Priority</th><th>State</th></tr></thead><tbody>'+rows+'</tbody></table></div><h3 style="font-size:13px;margin-top:16px">Discovery candidates</h3><div class="tableWrap" style="max-height:250px"><table style="min-width:620px"><thead><tr><th>Business</th><th>Match</th><th>Status</th><th>Rating / Reviews</th><th>Retries</th></tr></thead><tbody>'+candRows+'</tbody></table></div>';document.getElementById('campaignClose').onclick=()=>closeOverlay('campaignDetailOverlay');document.getElementById('campaignDetailOverlay').classList.add('open')}catch(e){showError(e)}}
async function loadOutreach(){const d=await api('/api/outreach/status'),dot=document.getElementById('twilioDot'),text=document.getElementById('twilioText');dot.className='dot '+(d.configured?'on':'off');text.textContent=d.configured?'Twilio configured \xB7 live outreach locked':'Twilio not configured';document.getElementById('outreachWebhookText').textContent='Inbound webhook: '+d.inboundWebhook+' \xB7 Status callback: '+d.statusWebhook;const a=document.getElementById('allowlistRows');a.innerHTML='';for(const x of (d.allowlist||[])){a.insertAdjacentHTML('beforeend','<span class="pill READY">'+esc(x.label||'Test')+' \xB7 '+esc(x.phone)+' <button class="btn small" style="margin-left:6px;padding:2px 5px" data-remove-test="'+esc(encodeURIComponent(x.phone))+'">\xD7</button></span>')}if(!(d.allowlist||[]).length)a.innerHTML='<span class="muted">No test numbers allowlisted.</span>';document.querySelectorAll('[data-remove-test]').forEach(b=>b.addEventListener('click',()=>removeTestNumber(b.getAttribute('data-remove-test'))));const rows=document.getElementById('messageRows');rows.innerHTML='';for(const m of (d.recentMessages||[])){const phone=m.direction==='INBOUND'?m.from_number:m.to_number;rows.insertAdjacentHTML('beforeend','<tr><td class="muted">'+esc(m.created_at?new Date(m.created_at).toLocaleString():'\u2014')+'</td><td>'+esc(m.direction)+'</td><td>'+esc(phone)+'</td><td>'+esc(m.body)+'</td><td>'+esc(m.intent||'\u2014')+'</td><td>'+esc(m.status)+'</td></tr>')}document.getElementById('messageEmpty').style.display=(d.recentMessages||[]).length?'none':'block'}
async function addTestNumber(){try{const phone=document.getElementById('oPhone').value.trim(),label=document.getElementById('oLabel').value.trim();if(!phone)throw new Error('Enter a test phone number first.');await api('/api/outreach/test-allowlist',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({phone,label})});await loadOutreach()}catch(e){showError(e)}}
async function removeTestNumber(enc){try{await api('/api/outreach/test-allowlist/'+encodeURIComponent(decodeURIComponent(enc)),{method:'DELETE',headers:{'X-Actor':'COMMAND_CENTER'}});await loadOutreach()}catch(e){showError(e)}}
async function sendTestSms(){try{const phone=document.getElementById('oPhone').value.trim(),message=document.getElementById('oMessage').value.trim();if(!phone)throw new Error('Enter an allowlisted test phone number.');if(!message)throw new Error('Enter a test message.');const d=await api('/api/outreach/test-send',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({phone,message})});await loadOutreach();alert('Test SMS queued'+(d.sid?' \xB7 '+d.sid:''))}catch(e){showError(e)}}
let emailOutreachState=null;
async function loadEmailOutreach(){const [d,l]=await Promise.all([api('/api/outreach/email/status'),api('/api/leads?limit=200')]);emailOutreachState=d;const dot=document.getElementById('gmailDot'),txt=document.getElementById('gmailText');dot.className='dot '+(d.smartleadMailbox?'on':'off');txt.textContent=d.smartleadMailbox?('Smartlead mailbox \xB7 '+d.smartleadMailbox+(d.smartleadConfigured?'':' \xB7 API key missing')):'Smartlead mailbox not set';document.getElementById('gClientId').value=d.smartleadMailbox||'';document.getElementById('gmailCallback').textContent='Smartlead webhook URL (register this in Smartlead): '+d.webhookUrl+' \xB7 website campaign '+(d.smartleadWebsiteCampaignId||'not created yet')+' \xB7 concierge campaign '+(d.smartleadConciergeCampaignId||'not created yet');document.getElementById('replyModelText').textContent='Replies are human-in-the-loop: answer leads directly in Smartlead. Genuine replies notify '+(d.notifyEmail||'you')+'.';const s=d.settings||{};document.getElementById('emailFromName').value=s.fromName||'Connor | Trenches Group';document.getElementById('emailPostal').value=s.postalAddress||'';document.getElementById('emailDailyCap').value=s.dailyCap||10;document.getElementById('emailReplyMode').value=s.autoReplyMode||'DRAFT_ONLY';const live=document.getElementById('emailLiveToggle'),auto=document.getElementById('emailAutoToggle');live.textContent=s.emailLiveMode?'Disable live email':'Enable live email';live.className='btn '+(s.emailLiveMode?'danger':'good');auto.textContent=s.orchestratorEnabled?'Pause autonomous sequences':'Enable autonomous sequences';auto.className='btn '+(s.orchestratorEnabled?'danger':'good');document.getElementById('emailModeText').textContent='Live email '+(s.emailLiveMode?'ON':'OFF')+' \xB7 automation '+(s.orchestratorEnabled?'ON':'OFF')+' \xB7 auto replies '+(s.autoReplyMode||'DRAFT_ONLY')+' \xB7 daily cap '+(s.dailyCap||10)+' \xB7 SMS LIVE LOCKED';const websiteToggle=document.getElementById('websiteTrackToggle'),conciergeToggle=document.getElementById('conciergeTrackToggle');const websiteOn=s.websiteEnabled!==false,conciergeOn=s.conciergeEnabled!==false;websiteToggle.textContent='Website outreach: '+(websiteOn?'ON':'OFF');websiteToggle.className='btn '+(websiteOn?'good':'danger');conciergeToggle.textContent='Concierge outreach: '+(conciergeOn?'ON':'OFF');conciergeToggle.className='btn '+(conciergeOn?'good':'danger');const a=document.getElementById('emailAllowlistRows');a.innerHTML='';for(const x of(d.allowlist||[])){a.insertAdjacentHTML('beforeend','<span class="pill READY">'+esc(x.label||'Test')+' \xB7 '+esc(x.email)+' <button class="btn small" style="margin-left:6px;padding:2px 5px" data-email-remove="'+esc(encodeURIComponent(x.email))+'">\xD7</button></span>')}if(!(d.allowlist||[]).length)a.innerHTML='<span class="muted">No test email addresses allowlisted.</span>';document.querySelectorAll('[data-email-remove]').forEach(b=>b.addEventListener('click',()=>removeEmailTestAddressUi(b.getAttribute('data-email-remove'))));const sel=document.getElementById('emailTestLead'),cur=sel.value;sel.innerHTML='<option value="">Optional lead to simulate</option>';for(const x of(l.leads||[])){sel.insertAdjacentHTML('beforeend','<option value="'+esc(x.id)+'">'+esc(x.business_name)+' \xB7 '+esc(x.email||'no email')+'</option>')}if(cur&&[...sel.options].some(o=>o.value===cur))sel.value=cur;const rows=document.getElementById('emailMessageRows');rows.innerHTML='';for(const m of(d.recentMessages||[])){const contact=m.direction==='INBOUND'?m.from_email:m.to_email;let raw={};try{raw=JSON.parse(m.raw_json||'{}')}catch{}const outcome=raw.conversationOutcome||'\u2014';const outcomeHtml=outcome==='DEMO_APPROVED'?'<span class="pill COMPLETED">DEMO_APPROVED</span>':esc(outcome);rows.insertAdjacentHTML('beforeend','<tr><td class="muted">'+esc(m.created_at?new Date(m.created_at).toLocaleString():'\u2014')+'</td><td>'+esc(m.direction)+'</td><td>'+esc(m.business_name||'\u2014')+'</td><td>'+esc(contact)+'</td><td>'+esc(m.subject||'\u2014')+'</td><td>'+esc(m.intent||'\u2014')+'</td><td>'+outcomeHtml+'</td><td>'+esc(m.status)+'</td></tr>')}document.getElementById('emailMessageEmpty').style.display=(d.recentMessages||[]).length?'none':'block';const sr=document.getElementById('sequenceRows');sr.innerHTML='';const modeSequences=(d.sequences||[]).filter(q=>businessMode==='CONCIERGE'?q.strategy==='SMARTLEAD_CONCIERGE':q.strategy!=='SMARTLEAD_CONCIERGE');for(const q of modeSequences){sr.insertAdjacentHTML('beforeend','<tr><td>'+esc(q.business_name)+'</td><td>'+esc(q.priority||'\u2014')+'</td><td>'+esc(q.strategy)+'</td><td>'+esc(q.status)+'</td><td>'+esc(q.current_step)+'</td><td class="muted">'+esc(q.next_action_at?new Date(q.next_action_at).toLocaleString():'\u2014')+'</td></tr>')}document.getElementById('sequenceEmpty').style.display=modeSequences.length?'none':'block'}
async function saveSmartleadMailboxUi(){try{const smartleadMailbox=document.getElementById('gClientId').value.trim();if(!smartleadMailbox)throw new Error('Enter the Smartlead sending mailbox address.');await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({smartleadMailbox})});await loadEmailOutreach();alert('Smartlead mailbox saved. Make sure it is connected as an email account inside Smartlead before enrolling leads.')}catch(e){showError(e)}}
async function saveEmailSettingsUi(){try{await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({fromName:document.getElementById('emailFromName').value.trim(),postalAddress:document.getElementById('emailPostal').value.trim(),dailyCap:Number(document.getElementById('emailDailyCap').value||10),autoReplyMode:document.getElementById('emailReplyMode').value})});await loadEmailOutreach()}catch(e){showError(e)}}
async function toggleEmailLiveUi(){try{const on=!!(emailOutreachState&&emailOutreachState.settings&&emailOutreachState.settings.emailLiveMode);if(!on&&!confirm('Enable LIVE autonomous email to qualified leads? Only verified emails, A/B priority, suppression checks, and the daily cap will be eligible.'))return;await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({liveMode:!on})});await loadEmailOutreach()}catch(e){showError(e)}}
async function toggleEmailAutomationUi(){try{const on=!!(emailOutreachState&&emailOutreachState.settings&&emailOutreachState.settings.orchestratorEnabled);if(!on&&!confirm('Enable autonomous email sequences? The live-email switch must also be ON before real prospects can be enrolled/sent.'))return;await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({orchestratorEnabled:!on})});await loadEmailOutreach()}catch(e){showError(e)}}
async function toggleWebsiteTrackUi(){try{const on=!!(emailOutreachState&&emailOutreachState.settings&&emailOutreachState.settings.websiteEnabled!==false);await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({websiteEnabled:!on})});await loadEmailOutreach()}catch(e){showError(e)}}
async function toggleConciergeTrackUi(){try{const on=!!(emailOutreachState&&emailOutreachState.settings&&emailOutreachState.settings.conciergeEnabled!==false);await api('/api/outreach/email/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({conciergeEnabled:!on})});await loadEmailOutreach()}catch(e){showError(e)}}
async function addEmailTestAddressUi(){try{const email=document.getElementById('emailTestAddress').value.trim(),label=document.getElementById('emailTestLabel').value.trim();if(!email)throw new Error('Enter a test email address.');await api('/api/outreach/email/test-allowlist',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({email,label})});await loadEmailOutreach()}catch(e){showError(e)}}
async function removeEmailTestAddressUi(enc){try{await api('/api/outreach/email/test-allowlist/'+encodeURIComponent(decodeURIComponent(enc)),{method:'DELETE',headers:{'X-Actor':'COMMAND_CENTER'}});await loadEmailOutreach()}catch(e){showError(e)}}
async function sendEmailTestUi(){try{const email=document.getElementById('emailTestAddress').value.trim(),subject=document.getElementById('emailTestSubject').value.trim(),message=document.getElementById('emailTestBody').value.trim(),leadId=document.getElementById('emailTestLead').value||undefined;if(!email)throw new Error('Enter an allowlisted test email.');const d=await api('/api/outreach/email/test-send',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({email,subject,message,leadId})});alert('Test email sent'+(d.providerMessageId?' \xB7 '+d.providerMessageId:''));await loadEmailOutreach()}catch(e){showError(e)}}
async function runOrchestratorUi(){try{const d=await api('/api/outreach/orchestrator/run',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});alert('Orchestrator run complete \xB7 enrolled '+(d.enrolled||0)+' \xB7 sent '+((d.delivery&&d.delivery.sent)||0));await Promise.all([loadEmailOutreach(),loadConversation(),loadLeads()])}catch(e){showError(e)}}
async function loadDemos(){const [d,all]=await Promise.all([api('/api/demos/status'),api('/api/leads?limit=200')]),s=d.settings||{},sel=document.getElementById('demoLead'),cur=sel.value,staticSel=document.getElementById('staticDemoLead'),staticCur=staticSel.value,existing=new Set((d.sites||[]).map(x=>x.lead_id));document.getElementById('demoModeText').textContent='Auto build '+(s.automationEnabled?'ON':'OFF')+' \xB7 '+(s.builderProvider||'AUTO')+' balanced routing \xB7 QA '+(s.qualityMinScore||90)+'/100 \xB7 '+(s.requireApproval?'approval required':'auto delivery allowed');document.getElementById('demoAutoToggle').textContent=s.automationEnabled?'Pause auto builds':'Enable auto builds';document.getElementById('demoDeliverToggle').textContent=s.autoDeliverEmail?'Pause auto delivery':'Enable auto delivery';sel.innerHTML='<option value="">Choose a DEMO_APPROVED lead\u2026</option>';for(const x of(d.eligibleLeads||[])){sel.insertAdjacentHTML('beforeend','<option value="'+esc(x.id)+'">'+esc(x.business_name)+' \xB7 DEMO_APPROVED</option>')}if(cur&&[...sel.options].some(o=>o.value===cur))sel.value=cur;staticSel.innerHTML='<option value="">Choose any active lead for a no-cost sample\u2026</option>';for(const x of(all.leads||[])){if(existing.has(x.id)||['DISQUALIFIED','OPTED_OUT','DUPLICATE','LOST','ACTIVE_CUSTOMER'].includes(x.current_state))continue;staticSel.insertAdjacentHTML('beforeend','<option value="'+esc(x.id)+'">'+esc(x.business_name)+' \xB7 '+esc(x.current_state)+'</option>')}if(staticCur&&[...staticSel.options].some(o=>o.value===staticCur))staticSel.value=staticCur;const jobs=new Map((d.jobs||[]).map(j=>[j.lead_id,j])),rows=document.getElementById('demoRows');rows.innerHTML='';for(const site of(d.sites||[])){const j=jobs.get(site.lead_id)||{},url=(d.publicBaseUrl||'')+'/demo/'+site.slug,deliver=site.email?'<button class="btn small good" data-demo-deliver="'+esc(site.id)+'">Approve & send</button>':'No email';rows.insertAdjacentHTML('beforeend','<tr><td>'+esc(site.business_name)+'</td><td>'+esc(j.status||'READY')+'<div class="muted">'+esc(site.provider||j.provider||'\u2014')+'</div></td><td>'+esc(site.current_state||'\u2014')+'</td><td>'+esc(site.qa_score??'\u2014')+'</td><td>'+esc(site.view_count||0)+'</td><td>'+esc(site.cta_click_count||0)+'</td><td><a href="'+esc(url)+'" target="_blank" rel="noopener" style="color:var(--accent)">Open preview</a></td><td>'+deliver+'</td></tr>')}for(const j of(d.jobs||[])){if((d.sites||[]).some(x=>x.lead_id===j.lead_id))continue;rows.insertAdjacentHTML('beforeend','<tr><td>'+esc(j.business_name)+'</td><td>'+esc(j.status)+'<div class="muted">'+esc(j.provider||s.builderProvider||'AUTO')+'</div></td><td>'+esc(j.current_state||'\u2014')+'</td><td>\u2014</td><td>0</td><td>0</td><td>\u2014</td><td>'+esc(j.last_error||'Pending')+'</td></tr>')}document.getElementById('demoEmpty').style.display=((d.sites||[]).length||(d.jobs||[]).length)?'none':'block';document.querySelectorAll('[data-demo-deliver]').forEach(b=>b.addEventListener('click',()=>deliverDemoUi(b.getAttribute('data-demo-deliver'))));window.__demoSettings=s}
async function queueDemoUi(){try{const id=document.getElementById('demoLead').value;if(!id)throw new Error('Choose a lead first.');await api('/api/demos/leads/'+encodeURIComponent(id)+'/queue',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await loadDemos()}catch(e){showError(e)}}
async function createStaticDemoUi(){try{const id=document.getElementById('staticDemoLead').value;if(!id)throw new Error('Choose a lead in the no-cost sample dropdown first.');if(!confirm('Create a no-cost static concept preview for this lead? It uses no AI provider and does not email the prospect.'))return;const d=await api('/api/demos/leads/'+encodeURIComponent(id)+'/static-preview',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await refreshAll();window.open('/demo/'+encodeURIComponent(d.slug),'_blank','noopener')}catch(e){showError(e)}}
async function toggleDemoAutomation(){try{const s=window.__demoSettings||{};await api('/api/demos/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({automationEnabled:!s.automationEnabled})});await loadDemos()}catch(e){showError(e)}}
async function toggleDemoDelivery(){try{const s=window.__demoSettings||{};await api('/api/demos/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({autoDeliverEmail:!s.autoDeliverEmail})});await loadDemos()}catch(e){showError(e)}}
async function configureDemoQualityUi(){try{const s=window.__demoSettings||{},provider=(prompt('Builder routing: AUTO, CLAUDE, OPENAI, or HYPERAGENT',s.builderProvider||'AUTO')||'').trim().toUpperCase();if(!['AUTO','CLAUDE','OPENAI','HYPERAGENT'].includes(provider))throw new Error('Choose AUTO, CLAUDE, OPENAI, or HYPERAGENT.');const score=Number(prompt('Minimum QA score before a demo is ready (85\u2013100)',String(s.qualityMinScore||90)));if(!Number.isFinite(score)||score<85||score>100)throw new Error('QA score must be between 85 and 100.');const fallback=confirm('Use the next available provider automatically if the first builder fails or is unavailable?');const approval=confirm('Require your approval in Command Center before a preview can be emailed?');await api('/api/demos/settings',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({builderProvider:provider,qualityMinScore:score,fallbackEnabled:fallback,requireApproval:approval})});await loadDemos()}catch(e){showError(e)}}
async function deliverDemoUi(id){try{if(!confirm('Approve this preview and send the demo email to the lead?'))return;const d=await api('/api/demos/'+encodeURIComponent(id)+'/deliver',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});if(!d.sent)alert('Demo is ready but email was not sent: '+(d.reason||'unknown reason'));await loadDemos()}catch(e){showError(e)}}

async function loadConversation(){const [c,l]=await Promise.all([api('/api/outreach/conversation/status'),api('/api/leads?limit=200')]),sel=document.getElementById('simLead'),current=sel.value;sel.innerHTML='<option value="">Choose a lead for simulation\u2026</option>';for(const x of (l.leads||[])){sel.insertAdjacentHTML('beforeend','<option value="'+esc(x.id)+'">'+esc(x.business_name)+' \xB7 '+esc(x.city)+', '+esc(x.state)+' \xB7 '+esc(x.priority||'\u2014')+'</option>')}if(current&&[...sel.options].some(o=>o.value===current))sel.value=current;const dr=document.getElementById('draftRows');dr.innerHTML='';for(const d of (c.drafts||[])){const actions=d.status==='DRAFT'?'<button class="btn small good" data-approve-draft="'+esc(d.id)+'">Approve</button> <button class="btn small" data-cancel-draft="'+esc(d.id)+'">Cancel</button>':'';dr.insertAdjacentHTML('beforeend','<tr><td class="muted">'+esc(d.created_at?new Date(d.created_at).toLocaleString():'\u2014')+'</td><td>'+esc(d.business_name)+'</td><td>'+esc(d.intent)+'</td><td>'+esc(d.body||'\u2014')+'</td><td>'+esc(Math.round(Number(d.confidence||0)*100)+'%')+'</td><td>'+esc(d.status)+'</td><td>'+actions+'</td></tr>')}document.getElementById('draftEmpty').style.display=(c.drafts||[]).length?'none':'block';document.querySelectorAll('[data-approve-draft]').forEach(b=>b.addEventListener('click',()=>draftAction(b.getAttribute('data-approve-draft'),'approve')));document.querySelectorAll('[data-cancel-draft]').forEach(b=>b.addEventListener('click',()=>draftAction(b.getAttribute('data-cancel-draft'),'cancel')));const fr=document.getElementById('followupRows');fr.innerHTML='';for(const f of (c.followups||[])){fr.insertAdjacentHTML('beforeend','<tr><td>'+esc(f.business_name)+'</td><td>'+esc(f.sequence_step)+'</td><td class="muted">'+esc(f.due_at?new Date(f.due_at).toLocaleString():'\u2014')+'</td><td>'+esc(f.status)+'</td><td>'+esc(f.body)+'</td></tr>')}document.getElementById('followupEmpty').style.display=(c.followups||[]).length?'none':'block';const er=document.getElementById('escalationRows');er.innerHTML='';for(const e of (c.escalations||[])){const action=e.status==='OPEN'?'<button class="btn small good" data-resolve-esc="'+esc(e.id)+'">Resolve</button>':'';er.insertAdjacentHTML('beforeend','<tr><td class="muted">'+esc(e.created_at?new Date(e.created_at).toLocaleString():'\u2014')+'</td><td>'+esc(e.business_name)+'</td><td><span class="pill '+(e.priority==='URGENT'?'FAILED':'READY')+'">'+esc(e.priority)+'</span></td><td>'+esc(e.reason)+'</td><td>'+esc(e.recommended_action||'\u2014')+'</td><td>'+esc(e.status)+'</td><td>'+action+'</td></tr>')}document.getElementById('escalationEmpty').style.display=(c.escalations||[]).length?'none':'block';document.querySelectorAll('[data-resolve-esc]').forEach(b=>b.addEventListener('click',()=>resolveEscalationUi(b.getAttribute('data-resolve-esc'))))}
function selectedSimLead(){const id=document.getElementById('simLead').value;if(!id)throw new Error('Choose a lead first.');return id}
async function simulateConversation(){try{const leadId=selectedSimLead(),message=document.getElementById('simMessage').value.trim();if(!message)throw new Error('Enter a simulated reply.');const d=await api('/api/outreach/simulate',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({leadId,message})});const x=d.decision||{};document.getElementById('simResult').textContent='Intent '+d.intent+' \xB7 '+(x.action||'\u2014')+(x.draft?' \xB7 Draft: '+x.draft:'')+(x.escalationId?' \xB7 Escalated':'');await Promise.all([loadConversation(),loadLeads()])}catch(e){showError(e)}}
async function makeOpenerDraft(){try{const leadId=selectedSimLead(),d=await api('/api/outreach/leads/'+encodeURIComponent(leadId)+'/opener-draft',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});document.getElementById('simResult').textContent='Opener draft: '+d.opener;await loadConversation()}catch(e){showError(e)}}
async function scheduleFollowupsUi(){try{const leadId=selectedSimLead();await api('/api/outreach/leads/'+encodeURIComponent(leadId)+'/followups',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});document.getElementById('simResult').textContent='Follow-up sequence scheduled.';await loadConversation()}catch(e){showError(e)}}
async function runFollowupsUi(){try{const d=await api('/api/outreach/followups/run',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({force:true})});document.getElementById('simResult').textContent='Follow-up drafts created: '+d.drafted+' \xB7 skipped '+d.skipped;await loadConversation()}catch(e){showError(e)}}
async function draftAction(id,action){try{await api('/api/outreach/drafts/'+encodeURIComponent(id)+'/'+action,{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await loadConversation()}catch(e){showError(e)}}
async function resolveEscalationUi(id){try{await api('/api/outreach/escalations/'+encodeURIComponent(id)+'/resolve',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await Promise.all([loadConversation(),loadLeads()])}catch(e){showError(e)}}
let quoteLeads=[],quoteState=null;
const QPILL={DRAFT:'',SENT:'READY',VIEWED:'RUNNING',ACCEPTED:'COMPLETED',DECLINED:'FAILED',VOID:'FAILED'};
const QEVT={CREATED:'Quote created',UPDATED:'Quote edited',SENT:'Emailed',SEND_FAILED:'Email failed',EMAIL_OPENED:'Email opened',VIEWED:'Estimate viewed',PORTAL_SIGNUP:'Created client portal account',MARKED_ACCEPTED:'Marked accepted',MARKED_DECLINED:'Marked declined',MARKED_VOID:'Voided'};
function qMoney(c){return '$'+(Number(c||0)/100).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function qTotal(q){const a=[];if(q.one_time_cents>0||!q.monthly_cents)a.push(qMoney(q.one_time_cents));if(q.monthly_cents>0)a.push(qMoney(q.monthly_cents)+'/mo');return a.join(' + ')}
function qWhen(v){return v?new Date(v).toLocaleString():'\u2014'}
function qVal(id){const el=document.getElementById(id);return el?el.value.trim():''}
function qPill(s){return '<span class="pill '+esc(QPILL[s]||'')+'">'+esc(s)+'</span>'}
async function loadQuotes(){const d=await api('/api/quotes'),qs=d.quotes||[],rows=document.getElementById('quoteRows');rows.innerHTML=qs.map(q=>'<tr><td><b>'+esc(q.quote_number)+'</b></td><td><div class="business">'+esc(q.business_name)+'</div><div class="muted">'+esc(q.contact_name||'')+'</div></td><td>'+esc(q.title)+'</td><td>'+esc(qTotal(q))+'</td><td>'+qPill(q.status)+'</td><td class="muted">'+esc(q.sent_to||'\u2014')+'</td><td>'+esc(q.open_count||0)+'</td><td>'+esc(q.view_count||0)+'</td><td class="muted">'+esc(qWhen(q.last_viewed_at))+'</td><td class="right"><button class="btn small" data-quote="'+esc(q.id)+'">Open</button></td></tr>').join('');document.getElementById('quoteEmpty').style.display=qs.length?'none':'block';document.getElementById('quoteSummary').textContent=qs.length+' quotes \xB7 '+qs.filter(q=>q.first_sent_at).length+' sent \xB7 '+qs.filter(q=>q.view_count>0).length+' viewed';rows.querySelectorAll('[data-quote]').forEach(b=>b.addEventListener('click',()=>openQuote(b.getAttribute('data-quote'))))}
async function loadQuoteMailbox(){const el=document.getElementById('quoteMailbox');try{const d=await api('/api/quotes/mailbox');el.innerHTML=d.connected?'<span class="dot on"></span> Sending as '+esc(d.email):'<span class="dot off"></span> Google not connected <button class="btn small primary" id="quoteConnect">Connect Google</button>';const b=document.getElementById('quoteConnect');if(b)b.onclick=connectQuoteMailbox}catch(e){el.textContent=e.message}}
async function connectQuoteMailbox(){try{const d=await api('/api/quotes/mailbox/connect',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});window.open(d.authUrl,'_blank','noopener');document.getElementById('quoteMailbox').textContent='Finish signing in with Google in the new tab, then click Refresh.'}catch(e){showError(e)}}
async function loadLeadQuotes(leadId){const box=document.getElementById('leadQuotes');if(!box)return;try{const d=await api('/api/quotes?leadId='+encodeURIComponent(leadId)),qs=d.quotes||[];box.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><b>Quotes</b><button class="btn small primary" id="leadNewQuote">+ New quote for this lead</button></div>'+(qs.length?qs.map(q=>'<div class="event" style="cursor:pointer" data-lead-quote="'+esc(q.id)+'"><div class="eventHead"><b>'+esc(q.quote_number)+' \xB7 '+esc(q.title)+'</b>'+qPill(q.status)+'</div><div class="eventData">'+esc(qTotal(q))+' \xB7 opens '+esc(q.open_count||0)+' \xB7 views '+esc(q.view_count||0)+(q.last_viewed_at?' \xB7 last viewed '+esc(qWhen(q.last_viewed_at)):'')+'</div></div>').join(''):'<div class="muted">No quotes for this lead yet.</div>');document.getElementById('leadNewQuote').onclick=()=>openQuote(null,leadId);box.querySelectorAll('[data-lead-quote]').forEach(el=>el.addEventListener('click',()=>openQuote(el.getAttribute('data-lead-quote'))))}catch(e){box.textContent=e.message}}
async function openQuote(id,leadId){try{const [ld,detail]=await Promise.all([api('/api/leads?limit=200'),id?api('/api/quotes/'+encodeURIComponent(id)):Promise.resolve(null)]);quoteLeads=ld.leads||[];quoteState=detail;const want=leadId||(detail&&detail.quote.lead_id);if(want&&!quoteLeads.some(l=>l.id===want)){try{quoteLeads.unshift((await api('/api/leads/'+encodeURIComponent(want))).lead)}catch(e){}}renderQuoteModal(leadId||'');document.getElementById('quoteOverlay').classList.add('open')}catch(e){showError(e)}}
function qItemRow(it){return '<div class="qItem"><input class="qiDesc" placeholder="Description, e.g. 5-page website build" value="'+esc(it.description||'')+'"/><input class="qiQty" type="number" min="0" step="any" title="Quantity" value="'+esc(it.quantity||1)+'"/><input class="qiPrice" type="number" min="0" step="0.01" placeholder="Price $" value="'+(it.unitCents?esc((it.unitCents/100).toFixed(2)):'')+'"/><select class="qiBilling"><option value="ONE_TIME">One-time</option><option value="MONTHLY"'+(it.billing==='MONTHLY'?' selected':'')+'>Monthly</option></select><button class="btn small" data-qremove="1" title="Remove line">\xD7</button></div>'}
function qRecalc(){let one=0,mon=0;document.querySelectorAll('#qItems .qItem').forEach(r=>{const c=Math.round(Number(r.querySelector('.qiQty').value||0)*Math.round(Number(r.querySelector('.qiPrice').value||0)*100));if(r.querySelector('.qiBilling').value==='MONTHLY')mon+=c;else one+=c});const el=document.getElementById('qTotals');if(el)el.textContent='Total: '+qMoney(one)+(mon?' + '+qMoney(mon)+'/mo':'')}
function qLeadChanged(){const l=quoteLeads.find(x=>x.id===qVal('qLead'));if(!l)return;document.getElementById('qBusiness').value=l.business_name||'';const s=document.getElementById('qSendEmail');if(s&&l.email)s.value=l.email}
function renderQuoteModal(prefillLeadId){const d=quoteState,q=d?d.quote:{status:'DRAFT',line_items:[]},isNew=!d,leadId=q.lead_id||prefillLeadId||'',lead=quoteLeads.find(l=>l.id===leadId),items=(q.line_items&&q.line_items.length)?q.line_items:[{description:'',quantity:1,unitCents:0,billing:'ONE_TIME'}],sends=d?d.sends||[]:[],events=d?d.events||[]:[],sendTo=sends.length?sends[0].email:((lead&&lead.email)||'');
let h='<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><div><h2 style="margin-bottom:6px">'+(isNew?'New quote':esc(q.quote_number)+' \xB7 '+esc(q.title))+'</h2>'+(isNew?'':qPill(q.status))+'</div><button class="btn small" id="quoteClose">Close</button></div>';
if(!isNew){h+='<div class="qStats">'+[['Emails sent',sends.filter(s=>s.status==='SENT').length],['Email opens*',q.open_count||0],['Estimate views',q.view_count||0],['Last viewed',q.last_viewed_at?qWhen(q.last_viewed_at):'Not yet']].map(x=>'<div class="metric" style="padding:10px"><div class="n" style="font-size:17px">'+esc(x[1])+'</div><div class="l">'+esc(x[0])+'</div></div>').join('')+'</div>';if(sends.length)h+='<div class="tableWrap" style="max-height:200px"><table style="min-width:680px"><thead><tr><th>Sent to</th><th>Sent</th><th>Opens</th><th>Views</th><th>Last viewed</th><th>Portal invite</th><th></th></tr></thead><tbody>'+sends.map(s=>'<tr><td>'+esc(s.email)+(s.status==='FAILED'?' '+qPill('FAILED'):'')+'</td><td class="muted">'+esc(qWhen(s.sent_at))+'</td><td>'+esc(s.open_count||0)+'</td><td>'+esc(s.view_count||0)+'</td><td class="muted">'+esc(qWhen(s.last_viewed_at))+'</td><td>'+(s.included_invite?'Included':'\u2014')+'</td><td><button class="btn small" data-copy-link="'+esc(s.view_url)+'" title="Paste into your own email if needed. Opening it yourself counts as a view.">Copy link</button></td></tr>').join('')+'</tbody></table></div>';h+='<div class="sub" style="margin:6px 0 10px">*Opens are approximate (some email apps block or pre-load images). Estimate views are exact.</div>';if(events.length)h+='<details style="margin-bottom:6px"><summary class="sub" style="cursor:pointer">Activity timeline ('+events.length+')</summary><div class="timeline" style="max-height:220px">'+events.map(ev=>'<div class="event"><div class="eventHead"><b>'+esc(QEVT[ev.event_type]||ev.event_type)+'</b><span class="muted">'+esc(qWhen(ev.created_at))+'</span></div><div class="eventData">'+esc([ev.email,ev.source].filter(Boolean).join(' \xB7 '))+'</div></div>').join('')+'</div></details>'}
const leadOpts='<option value="">No linked lead (enter client manually)</option>'+quoteLeads.map(l=>'<option value="'+esc(l.id)+'"'+(l.id===leadId?' selected':'')+'>'+esc(l.business_name)+' \xB7 '+esc(l.city)+', '+esc(l.state)+(l.email?' \xB7 '+esc(l.email):'')+'</option>').join('');
h+='<label>Linked lead</label><select id="qLead">'+leadOpts+'</select><div class="grid2"><div><label>Business name</label><input id="qBusiness" value="'+esc(q.business_name||(lead?lead.business_name:''))+'"/></div><div><label>Contact name</label><input id="qContact" value="'+esc(q.contact_name||'')+'"/></div></div><label>Quote title</label><input id="qTitle" placeholder="e.g. Website build + monthly care plan" value="'+esc(q.title||'')+'"/><label>Message to client (optional)</label><textarea id="qMessage" placeholder="Thanks for the call today. Here is the estimate we discussed.">'+esc(q.message||'')+'</textarea><label>Line items (description \xB7 qty \xB7 price \xB7 billing)</label><div id="qItems">'+items.map(qItemRow).join('')+'</div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><button class="btn small" id="qAddItem">+ Add line</button><div id="qTotals" style="font-weight:800"></div></div><div class="grid2"><div><label>Valid until (optional)</label><input id="qValid" type="date" value="'+esc(q.valid_until||'')+'"/></div><div></div></div><label>Terms (optional)</label><textarea id="qTerms" style="min-height:60px" placeholder="50% deposit to start, balance at launch.">'+esc(q.terms||'')+'</textarea>';
if(q.status!=='VOID')h+='<div style="border:1px solid var(--accent);border-radius:9px;padding:12px;margin-top:14px"><div style="font-weight:800;margin-bottom:8px">Send this quote to\u2026</div><div class="qSend"><input id="qSendEmail" type="email" placeholder="client@business.com" value="'+esc(sendTo)+'"/><input id="qSendName" placeholder="Their name (optional)" value="'+esc(q.contact_name||'')+'"/><button class="btn primary" id="quoteSaveSend">Save &amp; send</button></div><div class="sub" style="margin-top:6px">Sends from your Google Workspace mailbox, so it shows in your Sent folder and replies come straight to you. Clients without a portal account also get a pre-approved signup link.</div></div>';
h+='<div class="modalFooter" style="justify-content:space-between"><div class="rowBtns">'+(isNew||q.status==='VOID'?'':'<button class="btn small good" data-qstatus="ACCEPTED">Mark accepted</button><button class="btn small" data-qstatus="DECLINED">Mark declined</button><button class="btn small danger" data-qstatus="VOID">Void</button>')+'</div><button class="btn" id="quoteSave">'+(isNew?'Save draft':'Save changes')+'</button></div>';
const m=document.getElementById('quoteModal');m.innerHTML=h;m.oninput=qRecalc;m.onchange=qRecalc;m.onclick=e=>{const t=e.target;if(!(t instanceof Element))return;if(t.hasAttribute('data-qremove')){const rows=document.querySelectorAll('#qItems .qItem');if(rows.length>1)t.closest('.qItem').remove();qRecalc()}else if(t.hasAttribute('data-copy-link')){navigator.clipboard.writeText(t.getAttribute('data-copy-link')).then(()=>{t.textContent='Copied'})}else if(t.hasAttribute('data-qstatus'))quoteStatus(t.getAttribute('data-qstatus'))};document.getElementById('quoteClose').onclick=()=>closeOverlay('quoteOverlay');document.getElementById('qAddItem').onclick=()=>{document.getElementById('qItems').insertAdjacentHTML('beforeend',qItemRow({quantity:1,billing:'ONE_TIME'}));qRecalc()};document.getElementById('qLead').onchange=qLeadChanged;document.getElementById('quoteSave').onclick=()=>saveQuote(false);const ss=document.getElementById('quoteSaveSend');if(ss)ss.onclick=()=>saveQuote(true);qRecalc()}
function quotePayload(){const lineItems=[...document.querySelectorAll('#qItems .qItem')].map(r=>({description:r.querySelector('.qiDesc').value.trim(),quantity:Number(r.querySelector('.qiQty').value||1),unitCents:Math.round(Number(r.querySelector('.qiPrice').value||0)*100),billing:r.querySelector('.qiBilling').value})).filter(i=>i.description||i.unitCents);return{leadId:qVal('qLead')||null,businessName:qVal('qBusiness'),contactName:qVal('qContact')||null,title:qVal('qTitle'),message:qVal('qMessage')||null,terms:qVal('qTerms')||null,validUntil:qVal('qValid')||null,lineItems}}
async function saveQuote(send){const buttons=[...document.querySelectorAll('#quoteModal button')];try{const body=quotePayload(),email=qVal('qSendEmail'),name=qVal('qSendName');if(send){if(!email)throw new Error('Enter the email address to send this quote to.');if(!body.lineItems.length)throw new Error('Add at least one line item before sending.');if(!confirm('Send "'+(body.title||'this quote')+'" to '+email+'?'))return}buttons.forEach(b=>b.disabled=true);const hdr={'X-Actor':'COMMAND_CENTER'};let id=quoteState?quoteState.quote.id:null;const saved=id?await api('/api/quotes/'+encodeURIComponent(id),{method:'PATCH',headers:hdr,body:JSON.stringify(body)}):await api('/api/quotes',{method:'POST',headers:hdr,body:JSON.stringify(body)});id=saved.quote.id;let note='';if(send){try{const s=await api('/api/quotes/'+encodeURIComponent(id)+'/send',{method:'POST',headers:hdr,body:JSON.stringify({email,name:name||undefined})});note='Sent to '+s.email+(s.includedInvite?' with a pre-approved portal signup link.':'. They already have a portal account, so it is in their portal too.')}catch(e){note='Quote saved, but the email failed: '+e.message}}quoteState=await api('/api/quotes/'+encodeURIComponent(id));renderQuoteModal('');await loadQuotes();if(note)alert(note)}catch(e){alert(e.message)}finally{buttons.forEach(b=>b.disabled=false)}}
async function quoteStatus(status){const labels={ACCEPTED:'Mark this quote accepted?',DECLINED:'Mark this quote declined?',VOID:'Void this quote? It disappears from the client portal and can no longer be sent.'};if(!confirm(labels[status]))return;try{const id=quoteState.quote.id;await api('/api/quotes/'+encodeURIComponent(id)+'/status',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({status})});quoteState=await api('/api/quotes/'+encodeURIComponent(id));renderQuoteModal('');await loadQuotes()}catch(e){alert(e.message)}}
function debouncedLoad(){clearTimeout(timer);timer=setTimeout(loadLeads,250)}async function loadLeads(){const p=new URLSearchParams({limit:'200'}),q=document.getElementById('search').value.trim(),s=document.getElementById('stateFilter').value,pr=document.getElementById('priorityFilter').value;if(q)p.set('q',q);if(s)p.set('state',s);if(pr)p.set('priority',pr);const d=await api('/api/leads?'+p),rows=document.getElementById('leadRows');rows.innerHTML='';document.getElementById('leadEmpty').style.display=d.leads.length?'none':'block';for(const l of d.leads){const gap=l.website_gap_status||'UNKNOWN',gapClass=gap==='ELIGIBLE'?'COMPLETED':gap==='INELIGIBLE'?'FAILED':gap==='MANUAL_OVERRIDE'?'READY':'';rows.insertAdjacentHTML('beforeend','<tr><td><div class="business">'+esc(l.business_name)+'</div><div class="muted">'+esc(l.website||'No website recorded')+'</div></td><td>'+esc(l.city)+', '+esc(l.state)+'</td><td>'+esc(l.industry)+'</td><td><span class="pill '+gapClass+'">'+esc(gap)+'</span></td><td>'+esc(l.opportunity_score??'\u2014')+'</td><td><span class="pill '+esc(l.priority||'')+'">'+esc(l.priority||'\u2014')+'</span></td><td>'+esc(l.current_state)+'</td><td>'+esc(l.phone||'\u2014')+'</td><td class="muted">'+esc(l.updated_at?new Date(l.updated_at).toLocaleString():'\u2014')+'</td><td class="right"><button class="btn small" data-lead="'+esc(encodeURIComponent(l.id))+'">Open</button></td></tr>')}document.querySelectorAll('[data-lead]').forEach(b=>b.addEventListener('click',()=>openLead(b.getAttribute('data-lead'))))}
async function openLead(enc){try{const id=decodeURIComponent(enc),[d,e]=await Promise.all([api('/api/leads/'+encodeURIComponent(id)),api('/api/leads/'+encodeURIComponent(id)+'/events')]),l=d.lead,events=e.events||[],states=d.manualStateOptions||[];const details=[['Industry',l.industry],['Location',l.city+', '+l.state],['Phone',l.phone||'\u2014'],['Email',l.email||'\u2014'],['Website',l.website||'\u2014'],['Website status',l.website_status||'UNKNOWN'],['Website quality',l.website_quality||'UNKNOWN'],['Website gap',l.website_gap_status||'UNKNOWN'],['Gap reason',l.website_gap_reason||'\u2014'],['Google rating',l.google_rating??'\u2014'],['Reviews',l.google_reviews??'\u2014'],['Validation',l.validation_status||'PENDING'],['Sources',l.research_source_count??0],['Score',l.opportunity_score??'\u2014'],['Priority',l.priority||'\u2014'],['Qualification',l.qualification_reason||'\u2014'],['Outreach',l.outreach_eligible?'Eligible':'LOCKED'],['State',l.current_state],['Last manual change',l.manual_state_reason||'\u2014']].map(x=>'<div class="detailItem"><b>'+esc(x[0])+'</b>'+esc(x[1])+'</div>').join('');const timeline=events.map(ev=>'<div class="event"><div class="eventHead"><b>'+esc(ev.event_type)+'</b><span class="muted">'+esc(new Date(ev.created_at).toLocaleString())+'</span></div><div class="eventData">'+esc(ev.old_state&&ev.new_state?(ev.old_state+' \u2192 '+ev.new_state):'')+(ev.event_data_json&&ev.event_data_json!=='{}'?'<br>'+esc(ev.event_data_json):'')+'</div></div>').join('');const opts=states.map(x=>'<option value="'+esc(x)+'" '+(x===l.current_state?'selected':'')+'>'+esc(x)+'</option>').join('');const quick=l.current_state==='DISQUALIFIED'?'<button class="btn good" id="leadRestore">Restore to human review</button>':'<button class="btn danger" id="leadDisqualify">Disqualify</button>';document.getElementById('leadDetail').innerHTML='<div style="display:flex;justify-content:space-between;gap:12px"><div><h2>'+esc(l.business_name)+'</h2><div class="muted">'+esc(l.id)+'</div></div><button class="btn small" id="leadClose">Close</button></div><div class="detailGrid">'+details+'</div><div style="border:1px solid var(--line);border-radius:9px;padding:12px;margin:12px 0"><div style="font-weight:800;margin-bottom:8px">Manual lead control</div><div class="sub">Manual changes are audited. Disqualifying cancels active outreach/follow-ups/demo jobs. Setting an advanced state can explicitly override the website-gap gate.</div><div class="grid2" style="display:grid;grid-template-columns:1fr 2fr;gap:8px;margin-top:10px"><select id="manualLeadState" style="background:#0d0f13;border:1px solid var(--line);color:var(--text);padding:9px;border-radius:8px">'+opts+'</select><input id="manualLeadReason" style="background:#0d0f13;border:1px solid var(--line);color:var(--text);padding:9px;border-radius:8px" placeholder="Reason required, e.g. website manually verified outdated"/></div><div class="rowBtns" style="margin-top:10px"><button class="btn primary" id="applyManualState">Apply status</button>'+quick+'</div></div><div id="leadQuotes" style="border:1px solid var(--line);border-radius:9px;padding:12px;margin:12px 0"><div class="muted">Loading quotes\u2026</div></div><div class="timeline">'+timeline+'</div>';document.getElementById('leadClose').onclick=()=>closeOverlay('leadDetailOverlay');document.getElementById('applyManualState').onclick=()=>manualLeadStateUi(id);const dq=document.getElementById('leadDisqualify');if(dq)dq.onclick=()=>disqualifyLeadUi(id);const rs=document.getElementById('leadRestore');if(rs)rs.onclick=()=>restoreLeadUi(id);loadLeadQuotes(id);document.getElementById('leadDetailOverlay').classList.add('open')}catch(e){showError(e)}}
async function manualLeadStateUi(id){try{const to=document.getElementById('manualLeadState').value,reason=document.getElementById('manualLeadReason').value.trim();if(!reason)throw new Error('Enter a reason for the manual status change.');if(!confirm('Set this lead to '+to+'? This is an audited admin override.'))return;await api('/api/leads/'+encodeURIComponent(id)+'/manual-state',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({to,reason})});closeOverlay('leadDetailOverlay');await refreshAll()}catch(e){showError(e)}}
async function disqualifyLeadUi(id){try{const reasons=['Modern / good website \u2014 no opportunity','Wrong industry','Outside target geography','Poor reputation','Franchise / too large','Duplicate','Closed / not operating','Bad contact information','Not a fit','Other'],choice=prompt('Disqualification reason:\\n\\n'+reasons.map((x,i)=>(i+1)+'. '+x).join('\\n')+'\\n\\nType a number or your own reason:','1');if(choice===null)return;const n=Number(choice),reason=Number.isInteger(n)&&n>=1&&n<=reasons.length?reasons[n-1]:choice.trim();if(!reason)throw new Error('A reason is required.');await api('/api/leads/'+encodeURIComponent(id)+'/manual-state',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({to:'DISQUALIFIED',reason})});closeOverlay('leadDetailOverlay');await refreshAll()}catch(e){showError(e)}}
async function restoreLeadUi(id){try{const reason=prompt('Why are you restoring this lead?','Restore for manual review / re-check website gap');if(reason===null)return;await api('/api/leads/'+encodeURIComponent(id)+'/restore',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:JSON.stringify({reason})});closeOverlay('leadDetailOverlay');await refreshAll()}catch(e){showError(e)}}
async function reAuditWebsiteGapsUi(){try{if(!confirm('Re-audit existing early-stage leads using the new hard website-gap rule? Modern/good sites will be disqualified. Manually overridden leads will be preserved.'))return;const d=await api('/api/leads/website-gap/re-audit',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});alert('Website-gap re-audit complete. Scanned '+d.scanned+' \xB7 eligible '+d.eligible+' \xB7 disqualified '+d.disqualified+' \xB7 review '+d.review+' \xB7 unchanged '+d.unchanged);await refreshAll()}catch(e){showError(e)}}
function openImport(){document.getElementById('importOverlay').classList.add('open');if(!document.getElementById('importJson').value.trim())loadSampleImport()}function loadSampleImport(){document.getElementById('importJson').value=JSON.stringify({source:'MANUAL_TEST',prospects:[{externalId:'sample-tree-002',businessName:'Sample Tree Service',industry:'Tree Service',city:'Murfreesboro',state:'TN',phone:'6155550101',phoneType:'MOBILE',websiteQuality:'NONE',googleUrl:'https://example.com/google-profile',googleRating:4.9,googleReviewCount:180,isOperating:true,isLocalIndependent:true,isSupplier:false,isFranchiseHq:false,primaryService:'Tree Removal',services:['Tree Removal'],sources:[{url:'https://example.com/google-profile',type:'GOOGLE_BUSINESS'}],researchConfidence:.95}]},null,2)}async function importProspects(){try{const d=await api('/api/prospects/import',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:document.getElementById('importJson').value});closeOverlay('importOverlay');await refreshAll();alert('Received '+d.received+' \xB7 accepted '+d.accepted+' \xB7 duplicates '+d.duplicates+' \xB7 rejected '+d.rejected)}catch(e){showError(e)}}
async function toggleGlobal(){if(!globalPaused&&!confirm('Pause ALL Trenches automation?'))return;try{await api(globalPaused?'/api/system/resume':'/api/system/pause',{method:'POST',headers:{'X-Actor':'COMMAND_CENTER'},body:'{}'});await refreshAll()}catch(e){showError(e)}}
(function(){try{const p=new URLSearchParams(location.search),state=p.get('state'),q=p.get('q');if(state)document.getElementById('stateFilter').value=state;if(q)document.getElementById('search').value=q}catch(e){}})();
applyModeVisibility();
if(adminKey){document.getElementById('login').style.display='none';refreshAll().then(applyDeepLink).catch(()=>logout())}else{document.getElementById('keyInput').addEventListener('keydown',e=>{if(e.key==='Enter')login()})}setInterval(()=>{if(adminKey){loadRunner().catch(()=>{});loadCampaigns().catch(()=>{});loadProspectorJobs().catch(()=>{});loadOutreach().catch(()=>{});loadEmailOutreach().catch(()=>{});loadConversation().catch(()=>{});loadDemos().catch(()=>{});loadOperatorDesk().catch(()=>{});loadLaunchBoard().catch(()=>{});loadQuotes().catch(()=>{})}},15000);
<\/script>
</body></html>`])));
}
__name(adminHtml, "adminHtml");

// src/state-machine.ts
var ALWAYS = ["OPTED_OUT", "HUMAN_REVIEW", "ERROR"];
var TRANSITIONS = {
  NEW: ["RESEARCHING", "DISQUALIFIED", "DUPLICATE", ...ALWAYS],
  RESEARCHING: ["RESEARCHED", "DISQUALIFIED", ...ALWAYS],
  RESEARCHED: ["QUALIFYING", "DISQUALIFIED", ...ALWAYS],
  QUALIFYING: ["QUALIFIED", "DISQUALIFIED", ...ALWAYS],
  QUALIFIED: ["OUTREACH_READY", "DISQUALIFIED", ...ALWAYS],
  OUTREACH_READY: ["OUTREACH_SENT", "DISQUALIFIED", ...ALWAYS],
  OUTREACH_SENT: ["AWAITING_REPLY", "BAD_NUMBER", ...ALWAYS],
  AWAITING_REPLY: ["REPLIED", "NOT_INTERESTED", "BAD_NUMBER", "LOST", ...ALWAYS],
  REPLIED: ["INTERESTED", "NOT_INTERESTED", "LOST", ...ALWAYS],
  INTERESTED: ["DEMO_APPROVED", "NOT_INTERESTED", "LOST", ...ALWAYS],
  DEMO_APPROVED: ["DEMO_BUILDING", "NOT_INTERESTED", "LOST", ...ALWAYS],
  DEMO_BUILDING: ["DEMO_QA", "DEMO_APPROVED", "LOST", ...ALWAYS],
  DEMO_QA: ["DEMO_READY", "DEMO_BUILDING", "LOST", ...ALWAYS],
  DEMO_READY: ["DEMO_SENT", "DEMO_BUILDING", "LOST", ...ALWAYS],
  DEMO_SENT: ["DEMO_VIEWED", "PRICING_VIEWED", "NOT_INTERESTED", "LOST", ...ALWAYS],
  DEMO_VIEWED: ["PRICING_VIEWED", "NOT_INTERESTED", "LOST", ...ALWAYS],
  PRICING_VIEWED: ["CHECKOUT_STARTED", "NOT_INTERESTED", "LOST", ...ALWAYS],
  CHECKOUT_STARTED: ["WON", "LOST", ...ALWAYS],
  WON: ["ONBOARDING", "LOST", ...ALWAYS],
  ONBOARDING: ["BUILD_FINAL", "LOST", ...ALWAYS],
  BUILD_FINAL: ["LIVE", "LOST", ...ALWAYS],
  LIVE: ["ACTIVE_CUSTOMER", "LOST", ...ALWAYS],
  ACTIVE_CUSTOMER: ["LOST", ...ALWAYS],
  DISQUALIFIED: ["HUMAN_REVIEW"],
  OPTED_OUT: [],
  NOT_INTERESTED: ["HUMAN_REVIEW", "OPTED_OUT"],
  BAD_NUMBER: ["HUMAN_REVIEW", "OPTED_OUT"],
  DUPLICATE: ["HUMAN_REVIEW"],
  // HUMAN_REVIEW was a trapdoor: it only exited to RESEARCHING/QUALIFYING, so a
  // lead escalated from DEMO_BUILDING (or anywhere else) could never rejoin
  // the pipeline where it left off.
  HUMAN_REVIEW: [
    "RESEARCHING",
    "RESEARCHED",
    "QUALIFYING",
    "QUALIFIED",
    "OUTREACH_READY",
    "OUTREACH_SENT",
    "AWAITING_REPLY",
    "REPLIED",
    "INTERESTED",
    "DEMO_APPROVED",
    "DEMO_BUILDING",
    "DEMO_QA",
    "DEMO_READY",
    "DEMO_SENT",
    "DEMO_VIEWED",
    "PRICING_VIEWED",
    "CHECKOUT_STARTED",
    "WON",
    "ONBOARDING",
    "BUILD_FINAL",
    "LIVE",
    "ACTIVE_CUSTOMER",
    "DISQUALIFIED",
    "NOT_INTERESTED",
    "OPTED_OUT",
    "LOST",
    "ERROR"
  ],
  // ERROR used to only reach HUMAN_REVIEW, so any error permanently destroyed
  // the lead's pipeline position.
  ERROR: ["HUMAN_REVIEW", "OPTED_OUT"],
  LOST: ["HUMAN_REVIEW", "OPTED_OUT"]
};
function canTransition(from, to) {
  return TRANSITIONS[from].includes(to);
}
__name(canTransition, "canTransition");
function allowedTransitions(from) {
  return TRANSITIONS[from];
}
__name(allowedTransitions, "allowedTransitions");

// src/db.ts
function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");
function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}
__name(newId, "newId");
async function getLead(db, leadId) {
  return await db.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
}
__name(getLead, "getLead");
async function createLead(db, input, actor) {
  const id = newId("lead");
  const timestamp = nowIso();
  const eventId = newId("evt");
  const event = {
    eventId,
    leadId: id,
    eventType: "LEAD_CREATED",
    eventData: { businessName: input.businessName, industry: input.industry },
    source: "API",
    actor
  };
  const statements = [
    db.prepare(`
      INSERT INTO leads (
        id, business_name, industry, city, state, phone, email, website,
        current_state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?)
    `).bind(
      id,
      input.businessName,
      input.industry,
      input.city,
      input.state,
      input.phone ?? null,
      input.email ?? null,
      input.website ?? null,
      timestamp,
      timestamp
    ),
    db.prepare(`
      INSERT INTO events (
        id, lead_id, event_type, event_data_json, source, actor, new_state, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'NEW', ?)
    `).bind(eventId, id, event.eventType, JSON.stringify(event.eventData), event.source, actor, timestamp)
  ];
  await db.batch(statements);
  const lead = await getLead(db, id);
  if (!lead) throw new Error("Lead creation did not persist.");
  return { lead, event };
}
__name(createLead, "createLead");
async function transitionLead(db, leadId, to, actor, reason, source = "SYSTEM") {
  const lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", `Lead ${leadId} was not found.`);
  if (lead.current_state === to) return lead;
  if (!canTransition(lead.current_state, to)) {
    throw new HttpError(409, "INVALID_STATE_TRANSITION", `Cannot transition ${lead.current_state} \u2192 ${to}.`, {
      from: lead.current_state,
      to
    });
  }
  if (actor !== "HUMAN") {
    if (lead.automation_paused) {
      throw new HttpError(409, "AUTOMATION_PAUSED", "Automation is paused for this lead.");
    }
    if (await globalAutomationPaused(db)) {
      throw new HttpError(409, "GLOBAL_AUTOMATION_PAUSED", "Global automation is paused.");
    }
  }
  const timestamp = nowIso();
  const eventId = newId("evt");
  const nextVersion = lead.version + 1;
  const update = db.prepare(`
    UPDATE leads
       SET current_state = ?, updated_at = ?, last_action_at = ?, version = ?,
           human_required = CASE
             WHEN ? = 'HUMAN_REVIEW' THEN 1
             WHEN current_state = 'HUMAN_REVIEW' THEN 0
             ELSE human_required
           END
     WHERE id = ? AND current_state = ? AND version = ?
  `).bind(to, timestamp, timestamp, nextVersion, to, leadId, lead.current_state, lead.version);
  const event = db.prepare(`
    INSERT INTO events (
      id, lead_id, event_type, event_data_json, source, actor, old_state, new_state, created_at
    )
    SELECT ?, id, 'STATE_CHANGED', ?, ?, ?, ?, ?, ?
      FROM leads
     WHERE id = ? AND current_state = ? AND version = ? AND updated_at = ?
  `).bind(
    eventId,
    JSON.stringify({ reason }),
    source,
    actor,
    lead.current_state,
    to,
    timestamp,
    leadId,
    to,
    nextVersion,
    timestamp
  );
  const results = await db.batch([update, event]);
  if ((results[0]?.meta.changes ?? 0) !== 1 || (results[1]?.meta.changes ?? 0) !== 1) {
    throw new HttpError(409, "CONCURRENT_MODIFICATION", "Lead changed while this transition was being processed. Retry the request.");
  }
  const updated = await getLead(db, leadId);
  if (!updated) throw new Error("Lead disappeared after transition.");
  return updated;
}
__name(transitionLead, "transitionLead");
async function recordEvent(db, event) {
  const timestamp = nowIso();
  const result = await db.prepare(`
    INSERT OR IGNORE INTO events (
      id, lead_id, event_type, event_data_json, source, actor, idempotency_key, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    event.eventId,
    event.leadId ?? null,
    event.eventType,
    JSON.stringify(event.eventData ?? {}),
    event.source,
    event.actor ?? null,
    event.idempotencyKey ?? null,
    timestamp
  ).run();
  return { inserted: (result.meta.changes ?? 0) === 1 };
}
__name(recordEvent, "recordEvent");
async function isSuppressed(db, phone, email) {
  if (!phone && !email) return false;
  const digits = phone ? String(phone).replace(/\D/g, "") : "";
  const e164 = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : phone ?? null;
  const mail = email ? String(email).trim().toLowerCase() : null;
  const row = await db.prepare(`
    SELECT id FROM suppressions
     WHERE (? IS NOT NULL AND (phone_e164 = ? OR phone = ?))
        OR (? IS NOT NULL AND lower(email) = ?)
     LIMIT 1
  `).bind(e164, e164, phone ?? null, mail, mail).first();
  return Boolean(row);
}
__name(isSuppressed, "isSuppressed");
async function addSuppression(db, input) {
  if (!input.phone && !input.email) {
    throw new HttpError(400, "SUPPRESSION_CONTACT_REQUIRED", "A suppression requires a phone or email.");
  }
  const timestamp = nowIso();
  const statements = [];
  if (input.phone) {
    const digits = String(input.phone).replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : null;
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO suppressions (id, lead_id, phone, phone_e164, email, reason, source, created_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
    `).bind(newId("sup"), input.leadId ?? null, input.phone, e164, input.reason, input.source, timestamp));
  }
  if (input.email) {
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO suppressions (id, lead_id, phone, email, reason, source, created_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?)
    `).bind(newId("sup"), input.leadId ?? null, input.email, input.reason, input.source, timestamp));
  }
  await db.batch(statements);
}
__name(addSuppression, "addSuppression");
async function setLeadPause(db, leadId, paused, humanRequired, actor) {
  const timestamp = nowIso();
  let result = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await getLead(db, leadId);
    if (!current) throw new HttpError(404, "LEAD_NOT_FOUND", `Lead ${leadId} was not found.`);
    result = await db.prepare(`
      UPDATE leads
         SET automation_paused = ?, human_required = ?, updated_at = ?, version = ?
       WHERE id = ? AND version = ?
    `).bind(paused ? 1 : 0, humanRequired ? 1 : 0, timestamp, current.version + 1, leadId, current.version).run();
    if ((result.meta.changes ?? 0) === 1) break;
    result = null;
  }
  if (!result) throw new HttpError(409, "CONCURRENT_MODIFICATION", "Lead changed while pausing. Retry the request.");
  await db.prepare(`
    INSERT INTO events (id, lead_id, event_type, event_data_json, source, actor, created_at)
    VALUES (?, ?, ?, ?, 'API', ?, ?)
  `).bind(newId("evt"), leadId, paused ? "AUTOMATION_PAUSED" : "AUTOMATION_RESUMED", JSON.stringify({ humanRequired }), actor, timestamp).run();
  const lead = await getLead(db, leadId);
  if (!lead) throw new Error("Lead disappeared after pause update.");
  return lead;
}
__name(setLeadPause, "setLeadPause");
async function globalAutomationPaused(db) {
  const row = await db.prepare(`SELECT value FROM system_flags WHERE key = 'GLOBAL_AUTOMATION_PAUSED'`).first();
  return row?.value === "true";
}
__name(globalAutomationPaused, "globalAutomationPaused");

// src/phase2.ts
var HIGH_TICKET_TERMS = [
  "tree",
  "roof",
  "hvac",
  "heating",
  "air conditioning",
  "plumb",
  "electric",
  "concrete",
  "foundation",
  "garage door",
  "remodel",
  "restoration",
  "septic",
  "excavat",
  "landscap",
  "pest",
  "fence",
  "floor",
  "painting",
  "pressure wash",
  "solar",
  "pool"
];
function normalizePhone(value) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits.length === 10 ? digits : value.trim().slice(0, 40);
}
__name(normalizePhone, "normalizePhone");
function normalizedText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
__name(normalizedText, "normalizedText");
async function prospectFingerprint(input) {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(digest.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(prospectFingerprint, "prospectFingerprint");
function isHighTicketIndustry(industry) {
  const n = normalizedText(industry);
  return HIGH_TICKET_TERMS.some((term) => n.includes(term));
}
__name(isHighTicketIndustry, "isHighTicketIndustry");
function isRecentIso(dateString) {
  if (!dateString) return false;
  const time = Date.parse(dateString);
  if (!Number.isFinite(time)) return false;
  const ageMs = Date.now() - time;
  return ageMs >= 0 && ageMs <= 180 * 24 * 60 * 60 * 1e3;
}
__name(isRecentIso, "isRecentIso");
function digitalPoints(quality) {
  switch (quality) {
    case "NONE":
      return 40;
    case "POOR":
      return 30;
    case "OUTDATED":
      return 20;
    case "AVERAGE":
      return 5;
    default:
      return 0;
  }
}
__name(digitalPoints, "digitalPoints");
function websiteGapDecision(input) {
  const quality = input.websiteQuality ?? "UNKNOWN";
  const status = input.websiteStatus ?? (quality === "NONE" ? "NONE" : "UNKNOWN");
  const hasUrl = Boolean(input.websiteUrl?.trim());
  if ((status === "NONE" || quality === "NONE") && hasUrl) {
    return { status: "REVIEW", reason: "Website research is contradictory: marked as no website but a website URL is present." };
  }
  if (status === "ACTIVE" && !hasUrl) {
    return { status: "REVIEW", reason: "Website research is contradictory: status is ACTIVE but no website URL is present." };
  }
  if (["NONE", "BROKEN", "PARKED", "SOCIAL_ONLY", "PLACEHOLDER"].includes(status)) {
    return { status: "ELIGIBLE", reason: `Verified digital gap: website status is ${status}.` };
  }
  if (quality === "POOR" || quality === "OUTDATED") {
    return { status: "ELIGIBLE", reason: `Verified digital gap: website quality is ${quality}.` };
  }
  if (hasUrl && quality === "MODERN") {
    return { status: "INELIGIBLE", reason: "Modern website found; no meaningful website-refresh opportunity." };
  }
  if (hasUrl && quality === "AVERAGE") {
    return { status: "INELIGIBLE", reason: "Average functional website found; digital gap is not strong enough for automated prospecting." };
  }
  return { status: "REVIEW", reason: "Website gap could not be verified as no-site, broken, parked, social-only, placeholder, poor, or outdated." };
}
__name(websiteGapDecision, "websiteGapDecision");
function validateProspect(input) {
  const reasons = [];
  let status = "VALID";
  if (input.isOperating === false) return { status: "INVALID", reasons: ["Business is not currently operating."] };
  if (input.isSupplier === true) return { status: "INVALID", reasons: ["Business is a supplier/equipment dealer rather than the target local operator."] };
  if (input.isFranchiseHq === true) return { status: "INVALID", reasons: ["Business is a franchise headquarters rather than the target local operator."] };
  if (input.isOperating !== true) {
    status = "NEEDS_RESEARCH";
    reasons.push("Operating status is not positively verified.");
  }
  const hasListingEvidence = Boolean(input.googleUrl) || input.googleRating !== void 0 && (input.googleReviewCount ?? 0) > 0 || Boolean(input.phone) && input.sources.length > 0;
  if (!hasListingEvidence) {
    status = status === "VALID" ? "NEEDS_RESEARCH" : status;
    reasons.push("No listing evidence: needs a Google profile URL, a rating with review count, or a verified phone with a source URL.");
  }
  if (!input.sources.length) {
    status = status === "VALID" ? "NEEDS_RESEARCH" : status;
    reasons.push("No research sources were supplied.");
  }
  if (!input.phone && !input.email) {
    status = status === "VALID" ? "NEEDS_RESEARCH" : status;
    reasons.push("No contact method was verified.");
  }
  if (input.researchConfidence !== void 0 && input.researchConfidence < 0.7) {
    status = status === "VALID" ? "NEEDS_RESEARCH" : status;
    reasons.push("Research confidence is below 0.70.");
  }
  if (input.websiteQuality === "NONE" && input.websiteUrl) {
    return { status: "HUMAN_REVIEW", reasons: ["Website quality says NONE but a website URL was supplied."] };
  }
  if (input.websiteQuality !== "NONE" && input.websiteQuality !== "UNKNOWN" && !input.websiteUrl) {
    status = "HUMAN_REVIEW";
    reasons.push("Website was classified but no website URL was supplied.");
  }
  if (input.websiteStatus === "NONE" && input.websiteUrl) {
    status = "HUMAN_REVIEW";
    reasons.push("Website status says NONE but a website URL was supplied.");
  }
  if ((input.contradictionFlags ?? []).length) {
    status = "HUMAN_REVIEW";
    reasons.push(...(input.contradictionFlags ?? []).map((flag3) => `Research contradiction: ${flag3}`));
  }
  if (input.googleRating !== void 0 && (input.googleRating < 0 || input.googleRating > 5)) {
    return { status: "HUMAN_REVIEW", reasons: ["Google rating is outside the 0-5 range."] };
  }
  if (!reasons.length) reasons.push("Required verification checks passed.");
  return { status, reasons };
}
__name(validateProspect, "validateProspect");
function scoreProspect(input) {
  const reasons = [];
  const digitalOpportunity = digitalPoints(input.websiteQuality);
  if (digitalOpportunity) reasons.push(`Digital gap +${digitalOpportunity} (${input.websiteQuality.toLowerCase()} website).`);
  let reputation = 0;
  if ((input.googleRating ?? 0) >= 4.7) {
    reputation += 10;
    reasons.push("Reputation +10 (4.7+ Google rating).");
  }
  if ((input.googleReviewCount ?? 0) >= 100) {
    reputation += 10;
    reasons.push("Reputation +10 (100+ Google reviews).");
  }
  if (isRecentIso(input.lastReviewAt)) {
    reputation += 5;
    reasons.push("Reputation +5 (recent review activity).");
  }
  let businessEconomics = 0;
  if (input.isLocalIndependent === true) {
    businessEconomics += 5;
    reasons.push("Economics +5 (local independent operator).");
  }
  if (isHighTicketIndustry(input.industry)) {
    businessEconomics += 5;
    reasons.push("Economics +5 (high-value service category).");
  }
  if ((input.yearsInBusiness ?? 0) >= 3 || (input.googleReviewCount ?? 0) >= 50) {
    businessEconomics += 5;
    reasons.push("Economics +5 (established operating signal).");
  }
  if ((input.googleReviewCount ?? 0) >= 100) {
    businessEconomics += 5;
    reasons.push("Economics +5 (strong demonstrated demand).");
  }
  let contactability = 0;
  if (input.phone && input.phoneType === "MOBILE") {
    contactability += 10;
    reasons.push("Contactability +10 (verified mobile).");
  }
  if (input.email) {
    contactability += 5;
    reasons.push("Contactability +5 (email available).");
  }
  const total = Math.min(100, digitalOpportunity + reputation + businessEconomics + contactability);
  return { digitalOpportunity, reputation, businessEconomics, contactability, total, reasons };
}
__name(scoreProspect, "scoreProspect");
function priorityForScore(score) {
  if (score >= 80) return "A";
  if (score >= 65) return "B";
  if (score >= 50) return "C";
  return "PASS";
}
__name(priorityForScore, "priorityForScore");
async function findDuplicate(db, input) {
  const phone = normalizePhone(input.phone);
  if (phone) {
    const byPhone = await db.prepare(`SELECT * FROM leads WHERE phone = ? OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '(', ''), ')', ''), '+1', '') = ? LIMIT 1`).bind(phone, phone).first();
    if (byPhone) return byPhone;
  }
  if (input.email) {
    const byEmail = await db.prepare("SELECT * FROM leads WHERE lower(email) = lower(?) LIMIT 1").bind(input.email).first();
    if (byEmail) return byEmail;
  }
  return await db.prepare(`
    SELECT * FROM leads
    WHERE lower(business_name) = lower(?) AND lower(city) = lower(?) AND lower(state) = lower(?)
    LIMIT 1
  `).bind(input.businessName, input.city, input.state).first();
}
__name(findDuplicate, "findDuplicate");
async function upsertResearch(db, leadId, input) {
  const timestamp = nowIso();
  await db.prepare(`
    INSERT INTO lead_research (
      id, lead_id, services_json, service_area_json, business_hours_json, owner_name,
      years_in_business, brand_colors_json, logo_url, research_confidence, source_data_json,
      researched_at, created_at, updated_at, is_operating, is_local_independent, is_supplier,
      is_franchise_hq, last_review_at, primary_service, social_activity, source_count,
      website_evidence_json, contradiction_flags_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(lead_id) DO UPDATE SET
      services_json=excluded.services_json,
      service_area_json=excluded.service_area_json,
      business_hours_json=excluded.business_hours_json,
      owner_name=excluded.owner_name,
      years_in_business=excluded.years_in_business,
      brand_colors_json=excluded.brand_colors_json,
      logo_url=excluded.logo_url,
      research_confidence=excluded.research_confidence,
      source_data_json=excluded.source_data_json,
      researched_at=excluded.researched_at,
      updated_at=excluded.updated_at,
      is_operating=excluded.is_operating,
      is_local_independent=excluded.is_local_independent,
      is_supplier=excluded.is_supplier,
      is_franchise_hq=excluded.is_franchise_hq,
      last_review_at=excluded.last_review_at,
      primary_service=excluded.primary_service,
      social_activity=excluded.social_activity,
      source_count=excluded.source_count,
      website_evidence_json=excluded.website_evidence_json,
      contradiction_flags_json=excluded.contradiction_flags_json
  `).bind(
    newId("research"),
    leadId,
    JSON.stringify(input.services ?? []),
    JSON.stringify(input.serviceArea ?? []),
    JSON.stringify(input.businessHours ?? {}),
    input.ownerName ?? null,
    input.yearsInBusiness ?? null,
    JSON.stringify(input.brandColors ?? []),
    input.logoUrl ?? null,
    input.researchConfidence ?? null,
    JSON.stringify({ sources: input.sources, externalId: input.externalId ?? null }),
    timestamp,
    timestamp,
    timestamp,
    input.isOperating === void 0 ? null : input.isOperating ? 1 : 0,
    input.isLocalIndependent === void 0 ? null : input.isLocalIndependent ? 1 : 0,
    input.isSupplier === void 0 ? null : input.isSupplier ? 1 : 0,
    input.isFranchiseHq === void 0 ? null : input.isFranchiseHq ? 1 : 0,
    input.lastReviewAt ?? null,
    input.primaryService ?? null,
    input.socialActivity ?? "UNKNOWN",
    input.sources.length,
    JSON.stringify(input.websiteEvidence ?? []),
    JSON.stringify(input.contradictionFlags ?? [])
  ).run();
}
__name(upsertResearch, "upsertResearch");
async function updateLeadFromResearch(db, leadId, input) {
  const phone = normalizePhone(input.phone);
  const timestamp = nowIso();
  await db.prepare(`
    UPDATE leads SET
      industry = ?, city = ?, state = ?, phone = ?, phone_type = ?, email = ?, website = ?,
      facebook_url = ?, instagram_url = ?, google_url = ?, google_rating = ?, google_reviews = ?,
      website_quality = ?, street_address = ?, postal_code = ?, website_status = ?, phone_verified = ?, email_verified = ?,
      research_source_count = ?, last_researched_at = ?, updated_at = ?, version = version + 1
    WHERE id = ?
  `).bind(
    input.industry,
    input.city,
    input.state,
    phone,
    input.phoneType,
    input.email ?? null,
    input.websiteUrl ?? null,
    input.facebookUrl ?? null,
    input.instagramUrl ?? null,
    input.googleUrl ?? null,
    input.googleRating ?? null,
    input.googleReviewCount ?? null,
    input.websiteQuality,
    input.streetAddress ?? null,
    input.postalCode ?? null,
    input.websiteStatus ?? (input.websiteQuality === "NONE" ? "NONE" : "UNKNOWN"),
    input.phoneVerified ? 1 : 0,
    input.emailVerified ? 1 : 0,
    input.sources.length,
    timestamp,
    timestamp,
    leadId
  ).run();
}
__name(updateLeadFromResearch, "updateLeadFromResearch");
async function ingestProspect(db, input, source, actor) {
  const normalizedPhone = normalizePhone(input.phone);
  if (await isSuppressed(db, normalizedPhone, input.email ?? null)) {
    throw new HttpError(409, "CONTACT_SUPPRESSED", "This prospect matches the suppression list.");
  }
  let lead = await findDuplicate(db, { ...input, phone: normalizedPhone ?? void 0 });
  let duplicate = Boolean(lead);
  if (!lead) {
    const created = await createLead(db, {
      businessName: input.businessName,
      industry: input.industry,
      city: input.city,
      state: input.state,
      phone: normalizedPhone ?? void 0,
      email: input.email,
      website: input.websiteUrl
    }, actor);
    lead = created.lead;
    duplicate = false;
  }
  await updateLeadFromResearch(db, lead.id, { ...input, phone: normalizedPhone ?? void 0 });
  await upsertResearch(db, lead.id, input);
  const fingerprint = await prospectFingerprint(input);
  const event = {
    eventId: newId("evt"),
    leadId: lead.id,
    eventType: "PROSPECT_RESEARCH_RECEIVED",
    eventData: {
      sourceCount: input.sources.length,
      duplicate,
      externalId: input.externalId ?? null,
      fingerprint
    },
    source,
    actor,
    idempotencyKey: `prospect-research:${source}:${input.externalId ?? lead.id}:${fingerprint}`
  };
  const inserted = await recordEvent(db, event);
  const refreshed = await getLead(db, lead.id);
  if (!refreshed) throw new Error("Lead disappeared after prospect ingestion.");
  return { lead: refreshed, event, duplicateLead: duplicate, eventInserted: inserted.inserted };
}
__name(ingestProspect, "ingestProspect");
async function applyQualification(db, leadId, input) {
  const validation = validateProspect(input);
  const websiteGap = websiteGapDecision(input);
  const score = scoreProspect(input);
  const priority = priorityForScore(score.total);
  const timestamp = nowIso();
  const reason = websiteGap.status === "INELIGIBLE" ? websiteGap.reason : websiteGap.status === "REVIEW" ? websiteGap.reason : validation.status === "VALID" ? score.total >= 65 ? `Website gap verified. Qualified with score ${score.total}.` : score.total >= 50 ? `Website gap verified. Priority C score ${score.total}; hold for nurture/manual review.` : `Website gap verified, but score ${score.total} is below the 50-point minimum.` : validation.reasons.join(" ");
  await db.prepare(`
    UPDATE leads SET
      validation_status = ?, opportunity_score = ?, priority = ?, qualification_reason = ?,
      score_breakdown_json = ?, outreach_eligible = 0, website_gap_status = ?, website_gap_reason = ?,
      updated_at = ?, version = version + 1
    WHERE id = ?
  `).bind(validation.status, score.total, priority, reason, JSON.stringify(score), websiteGap.status, websiteGap.reason, timestamp, leadId).run();
  return { validation, score, priority, websiteGap };
}
__name(applyQualification, "applyQualification");
async function loadResearchInput(db, leadId) {
  const lead = await getLead(db, leadId);
  if (!lead) return null;
  const r = await db.prepare("SELECT * FROM lead_research WHERE lead_id = ? LIMIT 1").bind(leadId).first();
  if (!r) return null;
  let sourceData = {};
  try {
    sourceData = JSON.parse(String(r.source_data_json ?? "{}"));
  } catch {
    sourceData = {};
  }
  const parseStringArray = /* @__PURE__ */ __name((raw) => {
    try {
      const v = JSON.parse(String(raw ?? "[]"));
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
    } catch {
      return [];
    }
  }, "parseStringArray");
  const parseObject = /* @__PURE__ */ __name((raw) => {
    try {
      const v = JSON.parse(String(raw ?? "{}"));
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  }, "parseObject");
  return {
    externalId: sourceData.externalId ?? void 0,
    businessName: lead.business_name,
    industry: lead.industry,
    city: lead.city,
    state: lead.state,
    phone: lead.phone ?? void 0,
    phoneType: lead.phone_type,
    email: lead.email ?? void 0,
    websiteUrl: lead.website ?? void 0,
    websiteQuality: lead.website_quality ?? "UNKNOWN",
    streetAddress: lead.street_address ?? void 0,
    postalCode: lead.postal_code ?? void 0,
    websiteStatus: lead.website_status ?? void 0,
    phoneVerified: lead.phone_verified === 1,
    emailVerified: lead.email_verified === 1,
    websiteEvidence: (() => {
      try {
        const v = JSON.parse(String(r.website_evidence_json ?? "[]"));
        return Array.isArray(v) ? v : [];
      } catch {
        return [];
      }
    })(),
    contradictionFlags: parseStringArray(r.contradiction_flags_json),
    facebookUrl: lead.facebook_url ?? void 0,
    instagramUrl: lead.instagram_url ?? void 0,
    googleUrl: lead.google_url ?? void 0,
    googleRating: lead.google_rating ?? void 0,
    googleReviewCount: lead.google_reviews ?? void 0,
    isOperating: r.is_operating === null || r.is_operating === void 0 ? void 0 : Number(r.is_operating) === 1,
    isLocalIndependent: r.is_local_independent === null || r.is_local_independent === void 0 ? void 0 : Number(r.is_local_independent) === 1,
    isSupplier: r.is_supplier === null || r.is_supplier === void 0 ? void 0 : Number(r.is_supplier) === 1,
    isFranchiseHq: r.is_franchise_hq === null || r.is_franchise_hq === void 0 ? void 0 : Number(r.is_franchise_hq) === 1,
    yearsInBusiness: r.years_in_business === null || r.years_in_business === void 0 ? void 0 : Number(r.years_in_business),
    lastReviewAt: r.last_review_at ? String(r.last_review_at) : void 0,
    primaryService: r.primary_service ? String(r.primary_service) : void 0,
    services: parseStringArray(r.services_json),
    serviceArea: parseStringArray(r.service_area_json),
    businessHours: parseObject(r.business_hours_json),
    ownerName: r.owner_name ? String(r.owner_name) : void 0,
    brandColors: parseStringArray(r.brand_colors_json),
    logoUrl: r.logo_url ? String(r.logo_url) : void 0,
    socialActivity: r.social_activity ? String(r.social_activity) : "UNKNOWN",
    sources: Array.isArray(sourceData.sources) ? sourceData.sources : [],
    researchConfidence: r.research_confidence === null || r.research_confidence === void 0 ? void 0 : Number(r.research_confidence)
  };
}
__name(loadResearchInput, "loadResearchInput");

// src/requalify.ts
async function requalifyStuckLeads(db, queue, options) {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const dryRun = options.dryRun ?? false;
  let query = `
    SELECT l.id, l.business_name, l.qualification_reason, l.updated_at
      FROM leads l
      JOIN lead_research r ON r.lead_id = l.id
     WHERE l.current_state = 'HUMAN_REVIEW'
       AND l.automation_paused = 0
  `;
  const binds = [];
  if (options.leadIds?.length) {
    query += ` AND l.id IN (${options.leadIds.map(() => "?").join(",")})`;
    binds.push(...options.leadIds);
  }
  query += ` ORDER BY l.updated_at ASC LIMIT ?`;
  binds.push(limit);
  const rows = await db.prepare(query).bind(...binds).all();
  const candidates = rows.results ?? [];
  const skipped = [];
  const leads = [];
  let queued = 0;
  const batchStamp = nowIso();
  for (const lead of candidates) {
    leads.push({
      leadId: lead.id,
      businessName: lead.business_name,
      previousReason: lead.qualification_reason
    });
    if (dryRun) continue;
    const event = {
      eventId: newId("evt"),
      leadId: lead.id,
      eventType: "PROSPECT_RESEARCH_RECEIVED",
      eventData: {
        requalify: true,
        previousReason: lead.qualification_reason,
        stuckSince: lead.updated_at
      },
      source: "ADMIN_REQUALIFY",
      actor: options.actor,
      idempotencyKey: `requalify:${lead.id}:${batchStamp}`
    };
    const recorded = await recordEvent(db, event);
    if (!recorded.inserted) {
      skipped.push({ leadId: lead.id, reason: "Duplicate event; already queued in this batch." });
      continue;
    }
    try {
      await queue.send(event);
      queued += 1;
    } catch (error) {
      skipped.push({
        leadId: lead.id,
        reason: `Queue send failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  return { scanned: candidates.length, queued, skipped, dryRun, leads };
}
__name(requalifyStuckLeads, "requalifyStuckLeads");

// src/types.ts
var LEAD_STATES = [
  "NEW",
  "RESEARCHING",
  "RESEARCHED",
  "QUALIFYING",
  "QUALIFIED",
  "OUTREACH_READY",
  "OUTREACH_SENT",
  "AWAITING_REPLY",
  "REPLIED",
  "INTERESTED",
  "DEMO_APPROVED",
  "DEMO_BUILDING",
  "DEMO_QA",
  "DEMO_READY",
  "DEMO_SENT",
  "DEMO_VIEWED",
  "PRICING_VIEWED",
  "CHECKOUT_STARTED",
  "WON",
  "ONBOARDING",
  "BUILD_FINAL",
  "LIVE",
  "ACTIVE_CUSTOMER",
  "DISQUALIFIED",
  "OPTED_OUT",
  "NOT_INTERESTED",
  "BAD_NUMBER",
  "DUPLICATE",
  "HUMAN_REVIEW",
  "ERROR",
  "LOST"
];

// src/lead-admin.ts
var STOP_STATES = /* @__PURE__ */ new Set(["DISQUALIFIED", "OPTED_OUT", "NOT_INTERESTED", "BAD_NUMBER", "DUPLICATE", "LOST"]);
var EARLY_REAUDIT_STATES = /* @__PURE__ */ new Set(["NEW", "RESEARCHING", "RESEARCHED", "QUALIFYING", "QUALIFIED", "HUMAN_REVIEW"]);
var MANUAL_STATE_OPTIONS = LEAD_STATES;
async function cancelLeadAutomation(db, leadId, reason) {
  const timestamp = nowIso();
  await db.batch([
    db.prepare(`UPDATE outreach_sequences SET status='CANCELLED', stop_reason=?, updated_at=? WHERE lead_id=? AND status IN ('ACTIVE','PAUSED')`).bind(reason, timestamp, leadId),
    db.prepare(`UPDATE outreach_sequence_steps SET status='CANCELLED', last_error=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','RUNNING')`).bind(reason, timestamp, leadId),
    db.prepare(`UPDATE outreach_followups SET status='CANCELLED', reason=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','DRAFTED')`).bind(reason, timestamp, leadId),
    db.prepare(`UPDATE outreach_reply_drafts SET status='CANCELLED', reason=?, updated_at=? WHERE lead_id=? AND status='DRAFT'`).bind(reason, timestamp, leadId),
    db.prepare(`UPDATE demo_jobs SET status='CANCELLED', last_error=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','CLAIMED','BUILDING','QA','READY')`).bind(reason, timestamp, leadId)
  ]);
}
__name(cancelLeadAutomation, "cancelLeadAutomation");
async function directSetState(db, lead, to, actor, reason, manual) {
  const timestamp = nowIso();
  const stop = STOP_STATES.has(to);
  const human = to === "HUMAN_REVIEW";
  const previous = to === "DISQUALIFIED" && lead.current_state !== "DISQUALIFIED" ? lead.current_state : lead.previous_state_before_disqualification;
  const result = await db.prepare(`
    UPDATE leads SET
      current_state = ?,
      automation_paused = ?,
      human_required = ?,
      outreach_eligible = 0,
      previous_state_before_disqualification = ?,
      manual_state_reason = CASE WHEN ? THEN ? ELSE manual_state_reason END,
      manual_state_updated_at = CASE WHEN ? THEN ? ELSE manual_state_updated_at END,
      manual_state_updated_by = CASE WHEN ? THEN ? ELSE manual_state_updated_by END,
      updated_at = ?, last_action_at = ?, version = version + 1
    WHERE id = ?
  `).bind(
    to,
    stop || human ? 1 : 0,
    human ? 1 : 0,
    previous ?? null,
    manual ? 1 : 0,
    manual ? reason : null,
    manual ? 1 : 0,
    manual ? timestamp : null,
    manual ? 1 : 0,
    manual ? actor : null,
    timestamp,
    timestamp,
    lead.id
  ).run();
  if ((result.meta.changes ?? 0) !== 1) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead was not found.");
  await recordEvent(db, {
    eventId: newId("evt"),
    leadId: lead.id,
    eventType: manual ? "MANUAL_STATE_OVERRIDE" : "WEBSITE_GAP_REAUDIT_STATE_CHANGED",
    eventData: { from: lead.current_state, to, reason },
    source: manual ? "COMMAND_CENTER" : "WEBSITE_GAP_GATE",
    actor
  });
  if (stop || human) await cancelLeadAutomation(db, lead.id, reason);
  const updated = await getLead(db, lead.id);
  if (!updated) throw new Error("Lead disappeared after state update.");
  return updated;
}
__name(directSetState, "directSetState");
async function manualOverrideLeadState(db, leadId, to, actor, reason) {
  if (!LEAD_STATES.includes(to)) throw new HttpError(400, "INVALID_STATE", `Unknown lead state ${to}.`);
  if (!reason.trim()) throw new HttpError(400, "REASON_REQUIRED", "A reason is required for manual status changes.");
  const lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  if (to === "OPTED_OUT") {
    await addSuppression(db, { leadId, phone: lead.phone ?? void 0, email: lead.email ?? void 0, reason: "OPT_OUT", source: "COMMAND_CENTER" });
  }
  if (["QUALIFIED", "OUTREACH_READY", "OUTREACH_SENT", "AWAITING_REPLY", "REPLIED", "INTERESTED", "DEMO_APPROVED", "DEMO_BUILDING", "DEMO_QA", "DEMO_READY", "DEMO_SENT", "DEMO_VIEWED", "PRICING_VIEWED", "CHECKOUT_STARTED"].includes(to)) {
    if (lead.website_gap_status !== "ELIGIBLE") {
      await db.prepare(`UPDATE leads SET website_gap_status='MANUAL_OVERRIDE', website_gap_reason=?, updated_at=?, version=version+1 WHERE id=?`).bind(`Human override: ${reason}`, nowIso(), leadId).run();
    }
  }
  return await directSetState(db, await getLead(db, leadId) ?? lead, to, actor, reason, true);
}
__name(manualOverrideLeadState, "manualOverrideLeadState");
async function restoreDisqualifiedLead(db, leadId, actor, reason) {
  const lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  if (lead.current_state !== "DISQUALIFIED") throw new HttpError(409, "NOT_DISQUALIFIED", "Only disqualified leads can be restored with this action.");
  return await directSetState(db, lead, "HUMAN_REVIEW", actor, reason || "Restored from disqualification for human review.", true);
}
__name(restoreDisqualifiedLead, "restoreDisqualifiedLead");
async function reAuditExistingWebsiteGaps(db, actor) {
  const rows = await db.prepare(`SELECT * FROM leads ORDER BY updated_at DESC LIMIT 2000`).all();
  let scanned = 0, eligible = 0, disqualified = 0, review = 0, unchanged = 0;
  for (const initial of rows.results) {
    if (!EARLY_REAUDIT_STATES.has(initial.current_state)) {
      unchanged++;
      continue;
    }
    if (initial.manual_state_updated_by) {
      unchanged++;
      continue;
    }
    const research = await loadResearchInput(db, initial.id);
    if (!research) {
      unchanged++;
      continue;
    }
    scanned++;
    const gap = websiteGapDecision(research);
    await db.prepare(`UPDATE leads SET website_gap_status=?, website_gap_reason=?, updated_at=?, version=version+1 WHERE id=?`).bind(gap.status, gap.reason, nowIso(), initial.id).run();
    const lead = await getLead(db, initial.id);
    if (!lead) continue;
    if (gap.status === "INELIGIBLE") {
      if (lead.current_state !== "DISQUALIFIED") await directSetState(db, lead, "DISQUALIFIED", actor, gap.reason, false);
      disqualified++;
    } else if (gap.status === "REVIEW") {
      if (lead.current_state !== "HUMAN_REVIEW") await directSetState(db, lead, "HUMAN_REVIEW", actor, gap.reason, false);
      review++;
    } else {
      eligible++;
      const refreshed = await getLead(db, initial.id);
      if (refreshed?.current_state === "HUMAN_REVIEW" && refreshed.validation_status === "VALID" && (refreshed.opportunity_score ?? 0) >= 65) {
        await directSetState(db, refreshed, "QUALIFIED", actor, `Website gap re-audit verified eligibility. ${gap.reason}`, false);
      }
    }
  }
  await recordEvent(db, { eventId: newId("evt"), eventType: "WEBSITE_GAP_REAUDIT_COMPLETED", eventData: { scanned, eligible, disqualified, review, unchanged }, source: "COMMAND_CENTER", actor });
  return { scanned, eligible, disqualified, review, unchanged };
}
__name(reAuditExistingWebsiteGaps, "reAuditExistingWebsiteGaps");

// src/validation.ts
function requiredString(value, field, max = 250) {
  if (typeof value !== "string" || !value.trim()) {
    throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HttpError(400, "VALIDATION_ERROR", `${field} is too long.`);
  return trimmed;
}
__name(requiredString, "requiredString");
function optionalString(value, field, max = 500) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "string") throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a string.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HttpError(400, "VALIDATION_ERROR", `${field} is too long.`);
  return trimmed;
}
__name(optionalString, "optionalString");
function truncatedString(value, field, max = 500) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "string") throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a string.`);
  const trimmed = value.trim();
  if (!trimmed) return void 0;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}
__name(truncatedString, "truncatedString");
function optionalNumber(value, field, min, max) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new HttpError(400, "VALIDATION_ERROR", `${field} must be a number.`);
  if (min !== void 0 && value < min) throw new HttpError(400, "VALIDATION_ERROR", `${field} is below the allowed minimum.`);
  if (max !== void 0 && value > max) throw new HttpError(400, "VALIDATION_ERROR", `${field} exceeds the allowed maximum.`);
  return value;
}
__name(optionalNumber, "optionalNumber");
function optionalBoolean(value, field) {
  if (value === void 0 || value === null) return void 0;
  if (typeof value !== "boolean") throw new HttpError(400, "VALIDATION_ERROR", `${field} must be true or false.`);
  return value;
}
__name(optionalBoolean, "optionalBoolean");
function stringArray(value, field, maxItems = 100) {
  if (value === void 0 || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, "VALIDATION_ERROR", `${field} must be an array.`);
  if (value.length > maxItems) throw new HttpError(400, "VALIDATION_ERROR", `${field} has too many items.`);
  return value.map((item, index) => requiredString(item, `${field}[${index}]`, 500));
}
__name(stringArray, "stringArray");
function truncatedStringArray(value, field, maxItems = 100, maxLen = 500) {
  if (value === void 0 || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, "VALIDATION_ERROR", `${field} must be an array.`);
  if (value.length > maxItems) throw new HttpError(400, "VALIDATION_ERROR", `${field} has too many items.`);
  const out = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    out.push(trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed);
  }
  return out;
}
__name(truncatedStringArray, "truncatedStringArray");
function optionalObject(value, field) {
  if (value === void 0 || value === null) return void 0;
  if (typeof value !== "object" || Array.isArray(value)) throw new HttpError(400, "VALIDATION_ERROR", `${field} must be an object.`);
  return value;
}
__name(optionalObject, "optionalObject");
function parseSources(value) {
  if (value === void 0 || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, "VALIDATION_ERROR", "sources must be an array.");
  if (value.length > 100) throw new HttpError(400, "VALIDATION_ERROR", "sources has too many items.");
  return value.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new HttpError(400, "VALIDATION_ERROR", `sources[${index}] must be an object.`);
    const row = item;
    return {
      url: requiredString(row.url, `sources[${index}].url`, 1500),
      type: truncatedString(row.type, `sources[${index}].type`, 80),
      label: truncatedString(row.label, `sources[${index}].label`, 160)
    };
  });
}
__name(parseSources, "parseSources");
function parseCreateLead(body) {
  return {
    businessName: requiredString(body.businessName, "businessName"),
    industry: requiredString(body.industry, "industry"),
    city: requiredString(body.city, "city"),
    state: requiredString(body.state, "state", 80),
    phone: optionalString(body.phone, "phone", 40),
    email: optionalString(body.email, "email", 320),
    website: optionalString(body.website, "website", 1e3)
  };
}
__name(parseCreateLead, "parseCreateLead");
function parseTransition(body) {
  const to = requiredString(body.to, "to");
  if (!LEAD_STATES.includes(to)) {
    throw new HttpError(400, "VALIDATION_ERROR", `Unknown lead state: ${to}`);
  }
  const reason = optionalString(body.reason, "reason", 500) ?? "manual transition";
  return { to, reason };
}
__name(parseTransition, "parseTransition");
function parseExternalEvent(body) {
  const eventType = requiredString(body.eventType, "eventType", 120);
  const source = requiredString(body.source, "source", 120);
  const leadId = optionalString(body.leadId, "leadId", 120);
  const actor = optionalString(body.actor, "actor", 120);
  const idempotencyKey = optionalString(body.idempotencyKey, "idempotencyKey", 300);
  const rawData = body.eventData;
  if (rawData !== void 0 && (typeof rawData !== "object" || rawData === null || Array.isArray(rawData))) {
    throw new HttpError(400, "VALIDATION_ERROR", "eventData must be a JSON object.");
  }
  return { eventType, source, leadId, actor, idempotencyKey, eventData: rawData ?? {} };
}
__name(parseExternalEvent, "parseExternalEvent");
function parseProspectResearch(body) {
  const phoneTypeRaw = (optionalString(body.phoneType, "phoneType", 20) ?? "UNKNOWN").toUpperCase();
  if (!["MOBILE", "LANDLINE", "UNKNOWN"].includes(phoneTypeRaw)) throw new HttpError(400, "VALIDATION_ERROR", "phoneType must be MOBILE, LANDLINE, or UNKNOWN.");
  const websiteQualityRaw = (optionalString(body.websiteQuality, "websiteQuality", 20) ?? "UNKNOWN").toUpperCase();
  if (!["NONE", "POOR", "OUTDATED", "AVERAGE", "MODERN", "UNKNOWN"].includes(websiteQualityRaw)) throw new HttpError(400, "VALIDATION_ERROR", "websiteQuality is invalid.");
  const socialRaw = (optionalString(body.socialActivity, "socialActivity", 20) ?? "UNKNOWN").toUpperCase();
  if (!["ACTIVE", "DORMANT", "NONE", "UNKNOWN"].includes(socialRaw)) throw new HttpError(400, "VALIDATION_ERROR", "socialActivity is invalid.");
  const websiteStatusRaw = (optionalString(body.websiteStatus, "websiteStatus", 30) ?? (websiteQualityRaw === "NONE" ? "NONE" : "UNKNOWN")).toUpperCase();
  if (!["NONE", "ACTIVE", "BROKEN", "PARKED", "SOCIAL_ONLY", "PLACEHOLDER", "UNKNOWN"].includes(websiteStatusRaw)) throw new HttpError(400, "VALIDATION_ERROR", "websiteStatus is invalid.");
  const hours = optionalObject(body.businessHours, "businessHours");
  return {
    externalId: optionalString(body.externalId, "externalId", 240),
    businessName: requiredString(body.businessName, "businessName"),
    industry: requiredString(body.industry, "industry"),
    city: requiredString(body.city, "city"),
    state: requiredString(body.state, "state", 80),
    phone: optionalString(body.phone, "phone", 40),
    phoneType: phoneTypeRaw,
    email: optionalString(body.email, "email", 320),
    websiteUrl: optionalString(body.websiteUrl, "websiteUrl", 1500),
    websiteQuality: websiteQualityRaw,
    streetAddress: optionalString(body.streetAddress, "streetAddress", 500),
    postalCode: optionalString(body.postalCode, "postalCode", 30),
    websiteStatus: websiteStatusRaw,
    phoneVerified: optionalBoolean(body.phoneVerified, "phoneVerified"),
    emailVerified: optionalBoolean(body.emailVerified, "emailVerified"),
    websiteEvidence: parseSources(body.websiteEvidence),
    contradictionFlags: truncatedStringArray(body.contradictionFlags, "contradictionFlags", 30),
    facebookUrl: optionalString(body.facebookUrl, "facebookUrl", 1500),
    instagramUrl: optionalString(body.instagramUrl, "instagramUrl", 1500),
    googleUrl: optionalString(body.googleUrl, "googleUrl", 1500),
    googleRating: optionalNumber(body.googleRating, "googleRating", 0, 5),
    googleReviewCount: optionalNumber(body.googleReviewCount, "googleReviewCount", 0, 1e7),
    isOperating: optionalBoolean(body.isOperating, "isOperating"),
    isLocalIndependent: optionalBoolean(body.isLocalIndependent, "isLocalIndependent"),
    isSupplier: optionalBoolean(body.isSupplier, "isSupplier"),
    isFranchiseHq: optionalBoolean(body.isFranchiseHq, "isFranchiseHq"),
    yearsInBusiness: optionalNumber(body.yearsInBusiness, "yearsInBusiness", 0, 300),
    lastReviewAt: optionalString(body.lastReviewAt, "lastReviewAt", 80),
    primaryService: optionalString(body.primaryService, "primaryService", 250),
    services: truncatedStringArray(body.services, "services", 100),
    serviceArea: truncatedStringArray(body.serviceArea, "serviceArea", 100),
    businessHours: hours,
    ownerName: optionalString(body.ownerName, "ownerName", 250),
    brandColors: truncatedStringArray(body.brandColors, "brandColors", 20),
    logoUrl: optionalString(body.logoUrl, "logoUrl", 1500),
    socialActivity: socialRaw,
    sources: parseSources(body.sources),
    researchConfidence: optionalNumber(body.researchConfidence, "researchConfidence", 0, 1)
  };
}
__name(parseProspectResearch, "parseProspectResearch");
function parseProspectBatch(body) {
  const source = optionalString(body.source, "source", 120) ?? "EXTERNAL_PROSPECTOR";
  const raw = body.prospects;
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, "VALIDATION_ERROR", "prospects must be a non-empty array.");
  if (raw.length > 100) throw new HttpError(400, "VALIDATION_ERROR", "A single intake request can contain at most 100 prospects.");
  const prospects = [];
  const invalid = [];
  raw.forEach((item, index) => {
    try {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new HttpError(400, "VALIDATION_ERROR", `prospects[${index}] must be an object.`);
      prospects.push({ index, prospect: parseProspectResearch(item) });
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      invalid.push({ index, code: error.code, message: error.message });
    }
  });
  return { source, prospects, invalid };
}
__name(parseProspectBatch, "parseProspectBatch");
function parseCampaignCreate(body) {
  const industry = requiredString(body.industry, "industry", 160);
  const centerLocation = optionalString(body.centerLocation, "centerLocation", 240);
  const radiusMiles = optionalNumber(body.radiusMiles, "radiusMiles", 1, 100);
  const legacyLocations = stringArray(body.locations, "locations", 30);
  const locations = centerLocation ? [centerLocation] : legacyLocations;
  if (!locations.length) throw new HttpError(400, "VALIDATION_ERROR", "A center city/location is required.");
  if (centerLocation && radiusMiles === void 0) throw new HttpError(400, "VALIDATION_ERROR", "radiusMiles is required when centerLocation is provided.");
  const targetRaw = body.targetCount;
  if (typeof targetRaw !== "number" || !Number.isInteger(targetRaw) || targetRaw < 1 || targetRaw > 300) {
    throw new HttpError(400, "VALIDATION_ERROR", "targetCount must be an integer from 1 to 300.");
  }
  const model = optionalString(body.model, "model", 80) ?? "sonnet";
  const providerValue = /* @__PURE__ */ __name((value, field) => {
    const parsed = (optionalString(value, field, 40) ?? "AUTO").toUpperCase();
    if (!["AUTO", "CLAUDE", "OPENAI", "HYPERAGENT"].includes(parsed)) throw new HttpError(400, "VALIDATION_ERROR", `${field} must be AUTO, CLAUDE, OPENAI, or HYPERAGENT.`);
    return parsed;
  }, "providerValue");
  return {
    industry,
    locations,
    centerLocation,
    radiusMiles,
    targetCount: targetRaw,
    minRating: optionalNumber(body.minRating, "minRating", 0, 5),
    minReviews: optionalNumber(body.minReviews, "minReviews", 0, 1e7),
    notes: optionalString(body.notes, "notes", 1500),
    model,
    discoveryProvider: providerValue(body.discoveryProvider, "discoveryProvider"),
    enrichmentProvider: providerValue(body.enrichmentProvider, "enrichmentProvider"),
    fallbackEnabled: body.fallbackEnabled !== false
  };
}
__name(parseCampaignCreate, "parseCampaignCreate");
function parseRunnerHeartbeat(body) {
  return {
    runnerId: requiredString(body.runnerId, "runnerId", 160),
    hostname: optionalString(body.hostname, "hostname", 240),
    claudeVersion: optionalString(body.claudeVersion, "claudeVersion", 160),
    claudeLogin: optionalString(body.claudeLogin, "claudeLogin", 160),
    currentCampaignId: optionalString(body.currentCampaignId, "currentCampaignId", 160),
    status: optionalString(body.status, "status", 80),
    lastError: optionalString(body.lastError, "lastError", 1e3),
    metadata: optionalObject(body.metadata, "metadata")
  };
}
__name(parseRunnerHeartbeat, "parseRunnerHeartbeat");
function parseDiscoveryCandidate(body) {
  const presence = (optionalString(body.websitePresence, "websitePresence", 30) ?? "UNKNOWN").toUpperCase();
  if (!["NONE", "HAS_WEBSITE", "UNKNOWN"].includes(presence)) throw new HttpError(400, "VALIDATION_ERROR", "websitePresence must be NONE, HAS_WEBSITE, or UNKNOWN.");
  return {
    externalId: optionalString(body.externalId, "externalId", 240),
    businessName: requiredString(body.businessName, "businessName"),
    category: optionalString(body.category, "category", 250),
    phone: optionalString(body.phone, "phone", 40),
    city: requiredString(body.city, "city"),
    state: requiredString(body.state, "state", 80),
    googleUrl: optionalString(body.googleUrl, "googleUrl", 1500),
    googleRating: optionalNumber(body.googleRating, "googleRating", 0, 5),
    googleReviewCount: optionalNumber(body.googleReviewCount, "googleReviewCount", 0, 1e7),
    websitePresence: presence,
    websiteUrl: optionalString(body.websiteUrl, "websiteUrl", 1500),
    sourceUrl: optionalString(body.sourceUrl, "sourceUrl", 1500)
  };
}
__name(parseDiscoveryCandidate, "parseDiscoveryCandidate");
function parseDiscoveryBatch(body) {
  const campaignId = requiredString(body.campaignId, "campaignId", 160);
  const raw = body.candidates;
  if (!Array.isArray(raw) || raw.length === 0) throw new HttpError(400, "VALIDATION_ERROR", "candidates must be a non-empty array.");
  if (raw.length > 200) throw new HttpError(400, "VALIDATION_ERROR", "A discovery batch can contain at most 200 candidates.");
  const candidates = [];
  const invalid = [];
  raw.forEach((item, index) => {
    try {
      if (!item || typeof item !== "object" || Array.isArray(item)) throw new HttpError(400, "VALIDATION_ERROR", `candidates[${index}] must be an object.`);
      candidates.push({ index, candidate: parseDiscoveryCandidate(item) });
    } catch (error) {
      if (!(error instanceof HttpError)) throw error;
      invalid.push({ index, code: error.code, message: error.message });
    }
  });
  return { campaignId, candidates, invalid };
}
__name(parseDiscoveryBatch, "parseDiscoveryBatch");
function parseProspectorJobCreate(body) {
  const offeringRaw = optionalString(body.offering, "offering", 20);
  if (offeringRaw && !["WEBSITE", "CONCIERGE"].includes(offeringRaw.toUpperCase())) {
    throw new HttpError(400, "VALIDATION_ERROR", "offering must be WEBSITE or CONCIERGE.");
  }
  return {
    city: requiredString(body.city, "city", 120),
    state: requiredString(body.state, "state", 40),
    category: requiredString(body.category, "category", 160),
    radiusMiles: optionalNumber(body.radiusMiles, "radiusMiles", 1, 100),
    targetCount: optionalNumber(body.targetCount, "targetCount", 1, 300),
    cadenceDays: optionalNumber(body.cadenceDays, "cadenceDays", 1, 365),
    active: optionalBoolean(body.active, "active"),
    offering: offeringRaw?.toUpperCase()
  };
}
__name(parseProspectorJobCreate, "parseProspectorJobCreate");

// src/campaigns.ts
function normalizeLocationItem(value) {
  return value.replace(/\\n/g, "\n").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}
__name(normalizeLocationItem, "normalizeLocationItem");
function parseGeography(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const out = [];
    for (const value of parsed) if (typeof value === "string") out.push(...normalizeLocationItem(value));
    return [...new Set(out)];
  } catch {
    return [];
  }
}
__name(parseGeography, "parseGeography");
function normalizedText2(value) {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
__name(normalizedText2, "normalizedText");
function treeTargetMatch(text2) {
  const exact = ["tree service", "tree removal", "tree trimming", "tree care", "arborist", "stump grinding", "stump removal", "tree surgery"];
  const adjacent = ["landscap", "land clearing", "brush clearing", "forestry", "lot clearing", "outdoor"];
  if (exact.some((term) => text2.includes(term))) return "MATCH";
  if (adjacent.some((term) => text2.includes(term))) return "ADJACENT";
  return "OFF_TARGET";
}
__name(treeTargetMatch, "treeTargetMatch");
function classifyTargetMatch(industry, candidate) {
  const target = normalizedText2(industry);
  const haystack = normalizedText2(`${candidate.category ?? ""} ${candidate.businessName}`);
  if (target.includes("tree")) return treeTargetMatch(haystack);
  const targetTokens = target.split(" ").filter((x) => x.length >= 4);
  if (targetTokens.some((token) => haystack.includes(token))) return "MATCH";
  const genericAdjacent = ["landscap", "outdoor", "property service", "home service", "contractor"];
  if (genericAdjacent.some((term) => haystack.includes(term))) return "ADJACENT";
  return "OFF_TARGET";
}
__name(classifyTargetMatch, "classifyTargetMatch");
async function candidateFingerprint(input) {
  const phone = normalizePhone(input.phone) ?? "";
  const seed = phone || `${normalizedText2(input.businessName)}|${normalizedText2(input.city)}|${normalizedText2(input.state)}`;
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(seed)));
  return Array.from(digest.slice(0, 12), (b) => b.toString(16).padStart(2, "0")).join("");
}
__name(candidateFingerprint, "candidateFingerprint");
async function campaignMetrics(db, campaignId) {
  const [candidateRows, leadRows, linked] = await Promise.all([
    db.prepare(`SELECT status, COUNT(*) AS count FROM prospect_candidates WHERE campaign_id = ? GROUP BY status`).bind(campaignId).all(),
    db.prepare(`
      SELECT COALESCE(l.priority,'PASS') AS priority, l.current_state, COALESCE(l.website_gap_status,'UNKNOWN') AS website_gap_status, COUNT(*) AS count
      FROM campaign_prospects cp JOIN leads l ON l.id = cp.lead_id
      WHERE cp.campaign_id = ? GROUP BY COALESCE(l.priority,'PASS'), l.current_state, COALESCE(l.website_gap_status,'UNKNOWN')
    `).bind(campaignId).all(),
    db.prepare("SELECT COUNT(*) AS count FROM campaign_prospects WHERE campaign_id = ?").bind(campaignId).first()
  ]);
  const counts = {};
  for (const row of candidateRows.results) counts[row.status] = Number(row.count || 0);
  let qualified = 0, a = 0, b = 0, c = 0, pass = 0;
  const invalidStates = /* @__PURE__ */ new Set(["DISQUALIFIED", "HUMAN_REVIEW", "OPTED_OUT", "NOT_INTERESTED", "BAD_NUMBER", "DUPLICATE", "ERROR", "LOST"]);
  for (const row of leadRows.results) {
    const n = Number(row.count || 0);
    const gapEligible = row.website_gap_status === "ELIGIBLE" || row.website_gap_status === "MANUAL_OVERRIDE";
    const liveQualified = gapEligible && !invalidStates.has(row.current_state);
    if (row.current_state === "QUALIFIED" && gapEligible) qualified += n;
    if (!liveQualified) {
      pass += n;
      continue;
    }
    if (row.priority === "A") a += n;
    else if (row.priority === "B") b += n;
    else if (row.priority === "C") c += n;
    else pass += n;
  }
  return {
    raw_discovered: Object.values(counts).reduce((sum, value) => sum + value, 0),
    deduped: counts.DUPLICATE ?? 0,
    filtered: counts.FILTERED ?? 0,
    queued: counts.QUEUED ?? 0,
    enriching: counts.ENRICHING ?? 0,
    enriched: counts.ENRICHED ?? 0,
    enrichment_failed: counts.FAILED ?? 0,
    qualified_live: qualified,
    priority_a: a,
    priority_b: b,
    priority_c: c,
    priority_pass: pass,
    linked_count: linked?.count ?? 0
  };
}
__name(campaignMetrics, "campaignMetrics");
async function providerUsage(db, campaignId) {
  const rows = await db.prepare(`
    SELECT provider, stage, status, COUNT(*) AS jobs, COALESCE(SUM(estimated_cost_usd),0) AS estimated_cost_usd
    FROM prospect_provider_usage WHERE campaign_id = ?
    GROUP BY provider, stage, status ORDER BY provider, stage, status
  `).bind(campaignId).all();
  return rows.results.map((row) => ({ ...row, jobs: Number(row.jobs || 0), estimated_cost_usd: Number(row.estimated_cost_usd || 0) }));
}
__name(providerUsage, "providerUsage");
async function recordProviderUsage(db, input) {
  await db.prepare(`INSERT INTO prospect_provider_usage (id,campaign_id,candidate_id,provider,stage,status,model,input_units,output_units,estimated_cost_usd,error,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(newId("pusage"), input.campaignId, input.candidateId ?? null, input.provider, input.stage, input.status, input.model ?? null, input.inputUnits ?? null, input.outputUnits ?? null, input.estimatedCostUsd ?? null, input.error?.slice(0, 1800) ?? null, nowIso()).run();
}
__name(recordProviderUsage, "recordProviderUsage");
async function getCampaign(db, id) {
  return await db.prepare("SELECT * FROM prospecting_campaigns WHERE id = ?").bind(id).first();
}
__name(getCampaign, "getCampaign");
async function getCampaignView(db, id) {
  const row = await getCampaign(db, id);
  if (!row) return null;
  const metrics = await campaignMetrics(db, id);
  return { ...row, ...metrics, geography: parseGeography(row.geography_json), provider_usage: await providerUsage(db, id) };
}
__name(getCampaignView, "getCampaignView");
async function listCampaigns(db, limit = 100, archived = false, offering) {
  const rows = await db.prepare(`
    SELECT * FROM prospecting_campaigns
    WHERE ${archived ? "archived_at IS NOT NULL" : "archived_at IS NULL"} ${offering ? "AND offering = ?" : ""}
    ORDER BY created_at DESC LIMIT ?
  `).bind(...offering ? [offering, limit] : [limit]).all();
  const out = [];
  for (const row of rows.results) {
    const metrics = await campaignMetrics(db, row.id);
    out.push({ ...row, ...metrics, geography: parseGeography(row.geography_json), provider_usage: await providerUsage(db, row.id) });
  }
  return out;
}
__name(listCampaigns, "listCampaigns");
async function createCampaign(db, input, actor) {
  const id = newId("camp");
  const now = nowIso();
  const centerLocation = input.centerLocation?.trim() || null;
  const radiusMiles = centerLocation ? Math.round(input.radiusMiles ?? 25) : null;
  const locations = centerLocation ? [centerLocation] : [...new Set((input.locations ?? []).flatMap(normalizeLocationItem))];
  const geographyMode = centerLocation ? "RADIUS" : "LOCATIONS";
  await db.prepare(`
    INSERT INTO prospecting_campaigns (
      id, industry, geography_json, geography_mode, center_location, radius_miles, provider, discovery_provider, enrichment_provider, fallback_enabled, status, requested_count, raw_count, ingested_count,
      qualified_count, notes, created_at, updated_at, min_rating, min_reviews, model, updated_by, last_stage, offering
    ) VALUES (?, ?, ?, ?, ?, ?, 'PROVIDER_ROUTER_V19', ?, ?, ?, 'READY', ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, 'DISCOVERY', ?)
  `).bind(
    id,
    input.industry,
    JSON.stringify(locations),
    geographyMode,
    centerLocation,
    radiusMiles,
    input.discoveryProvider ?? "AUTO",
    input.enrichmentProvider ?? "AUTO",
    input.fallbackEnabled === false ? 0 : 1,
    input.targetCount,
    input.notes ?? null,
    now,
    now,
    input.minRating ?? null,
    input.minReviews ?? null,
    input.model ?? "sonnet",
    actor,
    input.offering ?? "WEBSITE"
  ).run();
  const campaign = await getCampaignView(db, id);
  if (!campaign) throw new Error("Campaign was not persisted.");
  return campaign;
}
__name(createCampaign, "createCampaign");
async function setCampaignStatus(db, id, status, actor) {
  const existing = await getCampaign(db, id);
  if (!existing) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", `Campaign ${id} was not found.`);
  const now = nowIso();
  await db.prepare(`
    UPDATE prospecting_campaigns SET status = ?, updated_at = ?, updated_by = ?,
      completed_at = CASE WHEN ? = 'COMPLETED' THEN ? ELSE completed_at END
    WHERE id = ?
  `).bind(status, now, actor, status, now, id).run();
  const view = await getCampaignView(db, id);
  if (!view) throw new Error("Campaign disappeared after update.");
  return view;
}
__name(setCampaignStatus, "setCampaignStatus");
async function archiveCampaign(db, id, actor, restore = false) {
  const existing = await getCampaign(db, id);
  if (!existing) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", `Campaign ${id} was not found.`);
  const now = nowIso();
  if (restore) {
    await db.prepare("UPDATE prospecting_campaigns SET archived_at = NULL, archived_by = NULL, updated_at = ?, updated_by = ? WHERE id = ?").bind(now, actor, id).run();
  } else {
    const nextStatus = existing.status === "RUNNING" || existing.status === "READY" ? "PAUSED" : existing.status;
    await db.prepare("UPDATE prospecting_campaigns SET status = ?, archived_at = ?, archived_by = ?, updated_at = ?, updated_by = ? WHERE id = ?").bind(nextStatus, now, actor, now, actor, id).run();
  }
  const view = await getCampaignView(db, id);
  if (!view) throw new Error("Campaign disappeared after archive update.");
  return view;
}
__name(archiveCampaign, "archiveCampaign");
async function claimCampaign(db, runnerId) {
  const recoverable = await db.prepare(`
    SELECT id FROM prospecting_campaigns
    WHERE status = 'RUNNING' AND runner_id = ? AND archived_at IS NULL
    ORDER BY started_at ASC LIMIT 1
  `).bind(runnerId).first();
  if (recoverable) return await getCampaignView(db, recoverable.id);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = await db.prepare(`
      SELECT id FROM prospecting_campaigns
      WHERE status = 'READY' AND archived_at IS NULL
      ORDER BY created_at ASC LIMIT 1
    `).first();
    if (!candidate) return null;
    const now = nowIso();
    const result = await db.prepare(`
      UPDATE prospecting_campaigns
      SET status = 'RUNNING', runner_id = ?, claimed_at = ?, started_at = COALESCE(started_at, ?), updated_at = ?, updated_by = ?, last_error = NULL
      WHERE id = ? AND status = 'READY' AND archived_at IS NULL
    `).bind(runnerId, now, now, now, runnerId, candidate.id).run();
    if ((result.meta.changes ?? 0) === 1) return await getCampaignView(db, candidate.id);
  }
  return null;
}
__name(claimCampaign, "claimCampaign");
async function updateRunnerHeartbeat(db, input) {
  const now = nowIso();
  await db.prepare(`
    INSERT INTO runner_status (runner_id, hostname, claude_version, claude_login, status, current_campaign_id, last_seen_at, last_error, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(runner_id) DO UPDATE SET
      hostname=excluded.hostname, claude_version=excluded.claude_version, claude_login=excluded.claude_login,
      status=excluded.status, current_campaign_id=excluded.current_campaign_id, last_seen_at=excluded.last_seen_at,
      last_error=excluded.last_error, metadata_json=excluded.metadata_json
  `).bind(
    input.runnerId,
    input.hostname ?? null,
    input.claudeVersion ?? null,
    input.claudeLogin ?? null,
    input.status ?? "ONLINE",
    input.currentCampaignId ?? null,
    now,
    input.lastError ?? null,
    JSON.stringify(input.metadata ?? {})
  ).run();
}
__name(updateRunnerHeartbeat, "updateRunnerHeartbeat");
async function getRunnerStatus(db) {
  const row = await db.prepare("SELECT * FROM runner_status ORDER BY last_seen_at DESC LIMIT 1").first();
  if (!row) return { online: false, runner: null };
  const lastSeen = Date.parse(String(row.last_seen_at ?? ""));
  const online = Number.isFinite(lastSeen) && Date.now() - lastSeen < 12e4;
  return { online, runner: row };
}
__name(getRunnerStatus, "getRunnerStatus");
async function attachCampaignLead(db, campaignId, leadId, externalId, ingestStatus = "ACCEPTED") {
  await db.prepare(`
    INSERT OR IGNORE INTO campaign_prospects (id, campaign_id, lead_id, external_id, ingest_status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(newId("cpros"), campaignId, leadId, externalId ?? null, ingestStatus, nowIso()).run();
}
__name(attachCampaignLead, "attachCampaignLead");
async function existingLeadDuplicate(db, input) {
  const phone = normalizePhone(input.phone);
  if (phone) {
    const row2 = await db.prepare("SELECT id FROM leads WHERE replace(replace(replace(replace(replace(phone, '-', ''), ' ', ''), '(', ''), ')', ''), '+1', '') = ? LIMIT 1").bind(phone).first();
    if (row2) return true;
  }
  const row = await db.prepare(`SELECT id FROM leads WHERE lower(business_name)=lower(?) AND lower(city)=lower(?) AND lower(state)=lower(?) LIMIT 1`).bind(input.businessName, input.city, input.state).first();
  return Boolean(row);
}
__name(existingLeadDuplicate, "existingLeadDuplicate");
function candidateFilterReason(campaign, candidate, match) {
  if (match === "OFF_TARGET") return "OFF_TARGET: discovered business does not match the requested industry.";
  if (match === "ADJACENT") return "ADJACENT: related service, but not counted toward this campaign target.";
  if (campaign.min_rating !== null && candidate.googleRating !== void 0 && candidate.googleRating < campaign.min_rating) {
    return `MIN_RATING: ${candidate.googleRating} is below campaign minimum ${campaign.min_rating}.`;
  }
  if (campaign.min_reviews !== null && candidate.googleReviewCount !== void 0 && candidate.googleReviewCount < campaign.min_reviews) {
    return `MIN_REVIEWS: ${candidate.googleReviewCount} is below campaign minimum ${campaign.min_reviews}.`;
  }
  if (candidate.googleRating !== void 0 && candidate.googleReviewCount !== void 0 && candidate.googleReviewCount >= 5 && candidate.googleRating < 3.5) {
    return `LOW_REPUTATION: ${candidate.googleRating}\u2605 across ${candidate.googleReviewCount} reviews.`;
  }
  if (!candidate.phone && !candidate.googleUrl && !candidate.sourceUrl) return "INSUFFICIENT_DISCOVERY_EVIDENCE: no phone or source URL.";
  return null;
}
__name(candidateFilterReason, "candidateFilterReason");
async function ingestDiscoveryCandidates(db, campaignId, candidates, runnerId, invalid = []) {
  const campaign = await getCampaign(db, campaignId);
  if (!campaign) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", `Campaign ${campaignId} was not found.`);
  if (campaign.status !== "RUNNING") throw new HttpError(409, "CAMPAIGN_NOT_RUNNING", `Campaign is ${campaign.status}.`);
  let queued = 0, duplicates = 0, filtered = 0, inserted = 0;
  const rejected = invalid.length;
  const results = invalid.map((e) => ({ index: e.index, status: "REJECTED", code: e.code, message: e.message }));
  const now = nowIso();
  for (const candidate of candidates) {
    const fingerprint = await candidateFingerprint(candidate);
    const prior = await db.prepare("SELECT id, status FROM prospect_candidates WHERE campaign_id = ? AND fingerprint = ? LIMIT 1").bind(campaignId, fingerprint).first();
    if (prior) {
      duplicates += 1;
      results.push({ businessName: candidate.businessName, status: "DUPLICATE_BATCH", candidateId: prior.id });
      continue;
    }
    const id = newId("cand");
    const match = classifyTargetMatch(campaign.industry, candidate);
    const isExisting = await existingLeadDuplicate(db, candidate);
    let status = "QUEUED";
    let reason = null;
    if (isExisting) {
      status = "DUPLICATE";
      reason = "DUPLICATE_CRM: lead already exists in Trenches.";
      duplicates += 1;
    } else {
      reason = candidateFilterReason(campaign, candidate, match);
      if (reason) {
        status = "FILTERED";
        filtered += 1;
      } else {
        queued += 1;
      }
    }
    await db.prepare(`
      INSERT INTO prospect_candidates (
        id, campaign_id, fingerprint, external_id, business_name, category, phone, city, state,
        google_url, google_rating, google_reviews, website_presence, website_url, source_url,
        target_match, status, filter_reason, discovered_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      campaignId,
      fingerprint,
      candidate.externalId ?? null,
      candidate.businessName,
      candidate.category ?? null,
      normalizePhone(candidate.phone),
      candidate.city,
      candidate.state,
      candidate.googleUrl ?? null,
      candidate.googleRating ?? null,
      candidate.googleReviewCount ?? null,
      candidate.websitePresence,
      candidate.websiteUrl ?? null,
      candidate.sourceUrl ?? candidate.googleUrl ?? null,
      match,
      status,
      reason,
      now,
      now
    ).run();
    inserted += 1;
    await db.prepare(`INSERT INTO prospect_candidate_events (id,candidate_id,campaign_id,event_type,event_data_json,created_at) VALUES (?,?,?,?,?,?)`).bind(newId("cev"), id, campaignId, status === "QUEUED" ? "DISCOVERY_QUEUED" : `DISCOVERY_${status}`, JSON.stringify({ targetMatch: match, reason }), now).run();
    results.push({ candidateId: id, businessName: candidate.businessName, status, targetMatch: match, reason });
  }
  await db.prepare(`
    UPDATE prospecting_campaigns
    SET raw_count = raw_count + ?, discovery_passes = discovery_passes + 1, last_stage = 'DISCOVERY', updated_at = ?, updated_by = ?
    WHERE id = ?
  `).bind(candidates.length, nowIso(), runnerId, campaignId).run();
  return { received: candidates.length + invalid.length, inserted, queued, duplicates, filtered, rejected, results, campaign: await getCampaignView(db, campaignId) };
}
__name(ingestDiscoveryCandidates, "ingestDiscoveryCandidates");
async function claimEnrichmentCandidate(db, campaignId, runnerId) {
  const campaign = await getCampaign(db, campaignId);
  if (!campaign || campaign.status !== "RUNNING" || campaign.archived_at) return null;
  const staleCutoff = new Date(Date.now() - 20 * 60 * 1e3).toISOString();
  await db.prepare(`
    UPDATE prospect_candidates SET status='QUEUED', next_retry_at=NULL, updated_at=?, last_error=COALESCE(last_error,'Recovered stale enrichment job.')
    WHERE campaign_id=? AND status='ENRICHING' AND updated_at < ?
  `).bind(nowIso(), campaignId, staleCutoff).run();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const row = await db.prepare(`
      SELECT * FROM prospect_candidates
      WHERE campaign_id=? AND status='QUEUED' AND (next_retry_at IS NULL OR next_retry_at <= ?)
      ORDER BY CASE WHEN website_presence='NONE' THEN 0 ELSE 1 END, COALESCE(google_reviews,0) DESC, discovered_at ASC
      LIMIT 1
    `).bind(campaignId, nowIso()).first();
    if (!row) return null;
    const changed = await db.prepare(`UPDATE prospect_candidates SET status='ENRICHING', updated_at=?, last_error=NULL WHERE id=? AND status='QUEUED'`).bind(nowIso(), row.id).run();
    if ((changed.meta.changes ?? 0) === 1) {
      await db.prepare(`UPDATE prospecting_campaigns SET last_stage='ENRICHMENT', updated_at=?, updated_by=? WHERE id=?`).bind(nowIso(), runnerId, campaignId).run();
      return await db.prepare("SELECT * FROM prospect_candidates WHERE id=?").bind(row.id).first();
    }
  }
  return null;
}
__name(claimEnrichmentCandidate, "claimEnrichmentCandidate");
function contradictionFlags(candidate, prospect) {
  const flags = [...prospect.contradictionFlags ?? []];
  if (candidate.google_rating !== null && prospect.googleRating !== void 0 && Math.abs(candidate.google_rating - prospect.googleRating) > 0.4) {
    flags.push(`Google rating changed/contradicts discovery (${candidate.google_rating} vs ${prospect.googleRating}).`);
  }
  if (candidate.google_reviews !== null && prospect.googleReviewCount !== void 0) {
    const diff = Math.abs(candidate.google_reviews - prospect.googleReviewCount);
    const tolerance = Math.max(10, Math.round(candidate.google_reviews * 0.3));
    if (diff > tolerance) flags.push(`Google review count contradicts discovery (${candidate.google_reviews} vs ${prospect.googleReviewCount}).`);
  }
  if (candidate.website_presence === "NONE" && prospect.websiteStatus === "ACTIVE" && prospect.websiteUrl) {
    flags.push("Discovery said no website, but enrichment found an active website.");
  }
  return [...new Set(flags)];
}
__name(contradictionFlags, "contradictionFlags");
async function completeEnrichmentCandidate(env, campaignId, candidateId, prospect, runnerId) {
  const campaign = await getCampaign(env.DB, campaignId);
  if (!campaign) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
  const candidate = await env.DB.prepare("SELECT * FROM prospect_candidates WHERE id=? AND campaign_id=?").bind(candidateId, campaignId).first();
  if (!candidate) throw new HttpError(404, "CANDIDATE_NOT_FOUND", "Candidate not found.");
  if (!["ENRICHING", "QUEUED"].includes(candidate.status)) throw new HttpError(409, "CANDIDATE_NOT_ENRICHING", `Candidate is ${candidate.status}.`);
  const enriched = {
    ...prospect,
    externalId: prospect.externalId ?? candidate.external_id ?? candidate.id,
    businessName: prospect.businessName || candidate.business_name,
    industry: campaign.industry,
    city: prospect.city || candidate.city,
    state: prospect.state || candidate.state,
    contradictionFlags: contradictionFlags(candidate, prospect)
  };
  const result = await ingestProspect(env.DB, enriched, "NATIVE_ORGO_PROSPECTOR_V15", runnerId);
  if (result.eventInserted) await env.EVENTS_QUEUE.send(result.event);
  if (result.duplicateLead) {
    await env.DB.prepare(`UPDATE prospect_candidates SET status='DUPLICATE', enriched_lead_id=?, filter_reason='DUPLICATE_AFTER_ENRICHMENT', last_error=NULL, next_retry_at=NULL, updated_at=? WHERE id=?`).bind(result.lead.id, nowIso(), candidateId).run();
    await env.DB.prepare(`INSERT INTO prospect_candidate_events (id,candidate_id,campaign_id,event_type,event_data_json,created_at) VALUES (?,?,?,?,?,?)`).bind(newId("cev"), candidateId, campaignId, "ENRICHMENT_DUPLICATE", JSON.stringify({ leadId: result.lead.id }), nowIso()).run();
    return { leadId: result.lead.id, duplicate: true, campaign: await getCampaignView(env.DB, campaignId) };
  }
  await attachCampaignLead(env.DB, campaignId, result.lead.id, enriched.externalId, "ACCEPTED");
  await env.DB.prepare(`
    UPDATE prospect_candidates SET status='ENRICHED', enriched_lead_id=?, last_error=NULL, next_retry_at=NULL, updated_at=? WHERE id=?
  `).bind(result.lead.id, nowIso(), candidateId).run();
  await env.DB.prepare(`INSERT INTO prospect_candidate_events (id,candidate_id,campaign_id,event_type,event_data_json,created_at) VALUES (?,?,?,?,?,?)`).bind(newId("cev"), candidateId, campaignId, "ENRICHMENT_COMPLETED", JSON.stringify({ leadId: result.lead.id, contradictionFlags: enriched.contradictionFlags ?? [] }), nowIso()).run();
  const linked = await env.DB.prepare("SELECT COUNT(*) AS count FROM campaign_prospects WHERE campaign_id=?").bind(campaignId).first();
  await env.DB.prepare(`UPDATE prospecting_campaigns SET ingested_count=?, updated_at=?, updated_by=? WHERE id=?`).bind(linked?.count ?? 0, nowIso(), runnerId, campaignId).run();
  return { leadId: result.lead.id, duplicate: result.duplicateLead, campaign: await getCampaignView(env.DB, campaignId) };
}
__name(completeEnrichmentCandidate, "completeEnrichmentCandidate");
async function failEnrichmentCandidate(db, campaignId, candidateId, error, runnerId, retryable = true) {
  const row = await db.prepare("SELECT * FROM prospect_candidates WHERE id=? AND campaign_id=?").bind(candidateId, campaignId).first();
  if (!row) throw new HttpError(404, "CANDIDATE_NOT_FOUND", "Candidate not found.");
  const retries = row.retry_count + 1;
  const shouldRetry = retryable && retries < row.max_retries;
  const delaySeconds = Math.min(300, 15 * 2 ** Math.max(0, retries - 1));
  const nextRetry = shouldRetry ? new Date(Date.now() + delaySeconds * 1e3).toISOString() : null;
  const status = shouldRetry ? "QUEUED" : "FAILED";
  await db.prepare(`
    UPDATE prospect_candidates SET status=?, retry_count=?, next_retry_at=?, last_error=?, updated_at=? WHERE id=?
  `).bind(status, retries, nextRetry, error.slice(0, 1400), nowIso(), candidateId).run();
  await db.prepare(`INSERT INTO prospect_candidate_events (id,candidate_id,campaign_id,event_type,event_data_json,created_at) VALUES (?,?,?,?,?,?)`).bind(newId("cev"), candidateId, campaignId, shouldRetry ? "ENRICHMENT_RETRY_SCHEDULED" : "ENRICHMENT_FAILED", JSON.stringify({ retries, nextRetry, error: error.slice(0, 500) }), nowIso()).run();
  await db.prepare(`UPDATE prospecting_campaigns SET last_error=?, updated_at=?, updated_by=? WHERE id=?`).bind(`Candidate ${row.business_name}: ${error.slice(0, 500)}`, nowIso(), runnerId, campaignId).run();
  return { candidateId, status, retryCount: retries, nextRetryAt: nextRetry };
}
__name(failEnrichmentCandidate, "failEnrichmentCandidate");
async function ingestCampaignProspects(env, campaignId, prospects, runnerId, invalid = []) {
  const results = invalid.map((e) => ({ index: e.index, status: "REJECTED", code: e.code, message: e.message }));
  let accepted = 0, duplicates = 0, rejected = invalid.length;
  for (const { index, prospect } of prospects) {
    try {
      const result = await ingestProspect(env.DB, prospect, "NATIVE_ORGO_PROSPECTOR_LEGACY", runnerId);
      if (result.duplicateLead) duplicates += 1;
      else accepted += 1;
      await attachCampaignLead(env.DB, campaignId, result.lead.id, prospect.externalId, result.duplicateLead ? "DUPLICATE" : "ACCEPTED");
      if (result.eventInserted) await env.EVENTS_QUEUE.send(result.event);
      results.push({ index, status: "ACCEPTED", leadId: result.lead.id });
    } catch (error) {
      rejected += 1;
      results.push({ index, status: "REJECTED", message: error instanceof Error ? error.message : String(error) });
    }
  }
  results.sort((a, b) => a.index - b.index);
  return { received: prospects.length + invalid.length, accepted, duplicates, rejected, results };
}
__name(ingestCampaignProspects, "ingestCampaignProspects");
async function finishCampaign(db, campaignId, runnerId, error) {
  const existing = await getCampaign(db, campaignId);
  if (!existing) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", `Campaign ${campaignId} was not found.`);
  const now = nowIso();
  const metrics = await campaignMetrics(db, campaignId);
  const failed = Boolean(error);
  await db.prepare(`
    UPDATE prospecting_campaigns
    SET status=?, qualified_count=?, completed_at=?, last_error=?, last_stage=?, updated_at=?, updated_by=? WHERE id=?
  `).bind(failed ? "FAILED" : "COMPLETED", metrics.qualified_live, now, error ?? null, failed ? "ERROR" : "DONE", now, runnerId, campaignId).run();
  const view = await getCampaignView(db, campaignId);
  if (!view) throw new Error("Campaign disappeared after completion.");
  return view;
}
__name(finishCampaign, "finishCampaign");
async function campaignLeadRows(db, campaignId) {
  const result = await db.prepare(`
    SELECT l.* FROM campaign_prospects cp JOIN leads l ON l.id = cp.lead_id
    WHERE cp.campaign_id = ? ORDER BY l.opportunity_score DESC, l.updated_at DESC LIMIT 500
  `).bind(campaignId).all();
  return result.results;
}
__name(campaignLeadRows, "campaignLeadRows");
async function campaignCandidateRows(db, campaignId) {
  const result = await db.prepare(`
    SELECT id,business_name,category,city,state,google_rating,google_reviews,website_presence,target_match,status,retry_count,last_error,enriched_lead_id,updated_at
    FROM prospect_candidates WHERE campaign_id=? ORDER BY discovered_at DESC LIMIT 1000
  `).bind(campaignId).all();
  return result.results;
}
__name(campaignCandidateRows, "campaignCandidateRows");

// src/prospector-jobs.ts
async function getFlagInt(db, key, fallback) {
  const row = await db.prepare("SELECT value FROM system_flags WHERE key = ?").bind(key).first();
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}
__name(getFlagInt, "getFlagInt");
async function listProspectorJobs(db, offering) {
  const rows = await db.prepare(`SELECT * FROM prospector_jobs ${offering ? "WHERE offering = ?" : ""} ORDER BY active DESC, city ASC, category ASC`).bind(...offering ? [offering] : []).all();
  return rows.results;
}
__name(listProspectorJobs, "listProspectorJobs");
async function createProspectorJob(db, input) {
  const id = newId("pjob");
  const now = nowIso();
  try {
    await db.prepare(`
      INSERT INTO prospector_jobs (id, city, state, category, radius_miles, target_count, cadence_days, active, created_at, updated_at, offering)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.city.trim(),
      input.state.trim(),
      input.category.trim(),
      input.radiusMiles ?? 15,
      input.targetCount ?? 20,
      input.cadenceDays ?? 21,
      input.active === false ? 0 : 1,
      now,
      now,
      input.offering ?? "WEBSITE"
    ).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE")) throw new HttpError(409, "PROSPECTOR_JOB_EXISTS", "A job for this city/state/category already exists.");
    throw error;
  }
  const row = await db.prepare("SELECT * FROM prospector_jobs WHERE id = ?").bind(id).first();
  if (!row) throw new Error("Prospector job was not persisted.");
  return row;
}
__name(createProspectorJob, "createProspectorJob");
async function setProspectorJobActive(db, id, active) {
  const existing = await db.prepare("SELECT * FROM prospector_jobs WHERE id = ?").bind(id).first();
  if (!existing) throw new HttpError(404, "PROSPECTOR_JOB_NOT_FOUND", `Prospector job ${id} was not found.`);
  await db.prepare("UPDATE prospector_jobs SET active = ?, updated_at = ? WHERE id = ?").bind(active ? 1 : 0, nowIso(), id).run();
  const row = await db.prepare("SELECT * FROM prospector_jobs WHERE id = ?").bind(id).first();
  if (!row) throw new Error("Prospector job disappeared after update.");
  return row;
}
__name(setProspectorJobActive, "setProspectorJobActive");
var OFFERING_FLAG_KEYS = {
  WEBSITE: { dailyCap: "PROSPECTOR_JOBS_PER_DAY", maxBacklog: "PROSPECTOR_JOBS_MAX_BACKLOG" },
  CONCIERGE: { dailyCap: "PROSPECTOR_JOBS_PER_DAY_CONCIERGE", maxBacklog: "PROSPECTOR_JOBS_MAX_BACKLOG_CONCIERGE" }
};
async function runDueProspectorJobsForOffering(db, offering) {
  const flagKeys = OFFERING_FLAG_KEYS[offering];
  const [dailyCap, maxBacklog] = await Promise.all([
    getFlagInt(db, flagKeys.dailyCap, 6),
    getFlagInt(db, flagKeys.maxBacklog, 20)
  ]);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
  const [runToday, backlog] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS count FROM prospector_jobs WHERE offering = ? AND last_run_at >= ?").bind(offering, since).first(),
    db.prepare(`SELECT COUNT(*) AS count FROM prospecting_campaigns WHERE offering = ? AND status IN ('READY','RUNNING') AND archived_at IS NULL`).bind(offering).first()
  ]);
  const runTodayCount = runToday?.count ?? 0;
  const backlogCount = backlog?.count ?? 0;
  const remainingToday = dailyCap - runTodayCount;
  if (remainingToday <= 0) return { ran: false, reason: "DAILY_CAP_REACHED", created: [] };
  if (backlogCount >= maxBacklog) return { ran: false, reason: "BACKLOG_FULL", created: [] };
  const slots = Math.max(0, Math.min(remainingToday, maxBacklog - backlogCount));
  if (slots === 0) return { ran: false, reason: "BACKLOG_FULL", created: [] };
  const due = await db.prepare(`
    SELECT * FROM prospector_jobs
    WHERE offering = ? AND active = 1 AND (last_run_at IS NULL OR last_run_at <= datetime('now', '-' || cadence_days || ' days'))
    ORDER BY (last_run_at IS NOT NULL), last_run_at ASC
    LIMIT ?
  `).bind(offering, slots).all();
  const created = [];
  for (const job of due.results) {
    let campaign;
    try {
      campaign = await createCampaign(db, {
        industry: job.category,
        centerLocation: `${job.city}, ${job.state}`,
        radiusMiles: job.radius_miles,
        targetCount: job.target_count,
        notes: `Auto-created by prospector orchestrator (job ${job.id}, ${offering}).`,
        offering
      }, "PROSPECTOR_ORCHESTRATOR");
    } catch (error) {
      await db.prepare("UPDATE prospector_jobs SET updated_at = ? WHERE id = ?").bind(nowIso(), job.id).run();
      continue;
    }
    await db.prepare("UPDATE prospector_jobs SET last_run_at = ?, last_campaign_id = ?, updated_at = ? WHERE id = ?").bind(nowIso(), campaign.id, nowIso(), job.id).run();
    created.push({ jobId: job.id, city: job.city, state: job.state, category: job.category, campaignId: campaign.id });
  }
  if (created.length === 0) return { ran: false, reason: "NO_DUE_JOBS", created: [] };
  return { ran: true, created };
}
__name(runDueProspectorJobsForOffering, "runDueProspectorJobsForOffering");
async function runDueProspectorJobs(db, env) {
  void env;
  const enabledRow = await db.prepare(`SELECT value FROM system_flags WHERE key = 'PROSPECTOR_ORCHESTRATOR_ENABLED'`).first();
  if (enabledRow && enabledRow.value === "false") {
    const disabled = { ran: false, reason: "DISABLED", created: [] };
    return { website: disabled, concierge: disabled };
  }
  const [website, concierge] = await Promise.all([
    runDueProspectorJobsForOffering(db, "WEBSITE"),
    runDueProspectorJobsForOffering(db, "CONCIERGE")
  ]);
  return { website, concierge };
}
__name(runDueProspectorJobs, "runDueProspectorJobs");

// src/orgo.ts
var RUNNER_START_COMMAND = `set -eu
RUNNER_DIR="$HOME/trenches/runner"
LOG_DIR="$HOME/trenches/logs"
PID_FILE="$RUNNER_DIR/runner.pid"
mkdir -p "$RUNNER_DIR" "$LOG_DIR"
if [ ! -f "$RUNNER_DIR/runner.py" ] || [ ! -f "$RUNNER_DIR/.env" ]; then
  echo "RUNNER_FILES_MISSING"
  exit 2
fi
if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
    echo "RUNNER_ALREADY_RUNNING:$PID"
    exit 0
  fi
  rm -f "$PID_FILE"
fi
set -a
. "$RUNNER_DIR/.env"
set +a
unset ANTHROPIC_API_KEY ANTHROPIC_AUTH_TOKEN
cd "$RUNNER_DIR"
nohup /usr/bin/python3 "$RUNNER_DIR/runner.py" >> "$LOG_DIR/prospector.stdout.log" 2>&1 < /dev/null &
PID=$!
echo "$PID" > "$PID_FILE"
sleep 1
if kill -0 "$PID" 2>/dev/null; then
  echo "RUNNER_STARTED:$PID"
  exit 0
fi
echo "RUNNER_FAILED_TO_STAY_RUNNING"
tail -40 "$LOG_DIR/prospector.stdout.log" 2>/dev/null || true
exit 1`;
async function orgoFetch(env, path, init) {
  const response = await fetch(`https://www.orgo.ai/api${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${env.ORGO_API_KEY}`,
      ...init.body ? { "content-type": "application/json" } : {}
    }
  });
  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }
  return { response, body };
}
__name(orgoFetch, "orgoFetch");
async function startComputer(env) {
  const { response, body } = await orgoFetch(env, `/computers/${encodeURIComponent(env.ORGO_COMPUTER_ID)}/start`, { method: "POST" });
  if (!response.ok) {
    throw new HttpError(502, "ORGO_START_FAILED", `Orgo returned ${response.status} while starting the prospector VM.`, body);
  }
  return typeof body.status === "string" ? body.status : "starting";
}
__name(startComputer, "startComputer");
async function launchRunner(env) {
  const { response, body } = await orgoFetch(env, `/computers/${encodeURIComponent(env.ORGO_COMPUTER_ID)}/bash`, {
    method: "POST",
    body: JSON.stringify({ command: RUNNER_START_COMMAND })
  });
  if (!response.ok) {
    throw new HttpError(502, "ORGO_RUNNER_LAUNCH_FAILED", `Orgo returned ${response.status} while launching the Prospector runner.`, body);
  }
  if (body.success !== true) {
    throw new HttpError(502, "ORGO_RUNNER_LAUNCH_FAILED", "Orgo bash call did not report success.", body);
  }
  return typeof body.output === "string" ? body.output.trim().slice(0, 300) : "runner-launch-requested";
}
__name(launchRunner, "launchRunner");
async function wakeOrgoProspector(env) {
  if (!env.ORGO_API_KEY || !env.ORGO_COMPUTER_ID) return { attempted: false };
  const status = await startComputer(env);
  try {
    const runner = await launchRunner(env);
    return { attempted: true, status, runner };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { attempted: true, status: `${status}; runner-pending`, runner: message.slice(0, 240) };
  }
}
__name(wakeOrgoProspector, "wakeOrgoProspector");

// src/leases.ts
async function acquireLease(db, name, holder, ttlSeconds) {
  const now = nowIso();
  const expires = new Date(Date.now() + ttlSeconds * 1e3).toISOString();
  const result = await db.prepare(`
    INSERT INTO cron_leases(name, holder, expires_at, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE
      SET holder = excluded.holder,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
    WHERE cron_leases.expires_at <= ?
  `).bind(name, holder, expires, now, now).run();
  return (result.meta.changes ?? 0) === 1;
}
__name(acquireLease, "acquireLease");
async function releaseLease(db, name, holder) {
  await db.prepare(
    `UPDATE cron_leases SET expires_at = ?, updated_at = ? WHERE name = ? AND holder = ?`
  ).bind(nowIso(), nowIso(), name, holder).run();
}
__name(releaseLease, "releaseLease");
async function withLease(db, name, ttlSeconds, fn) {
  const holder = crypto.randomUUID();
  if (!await acquireLease(db, name, holder, ttlSeconds)) {
    return { skipped: true, reason: `lease ${name} held by another invocation` };
  }
  try {
    return await fn();
  } finally {
    await releaseLease(db, name, holder);
  }
}
__name(withLease, "withLease");
async function bumpCounter(db, name, by = 1) {
  await db.prepare(`
    INSERT INTO health_counters(name, value, last_incremented_at)
    VALUES(?, ?, ?)
    ON CONFLICT(name) DO UPDATE
      SET value = health_counters.value + excluded.value,
          last_incremented_at = excluded.last_incremented_at
  `).bind(name, by, nowIso()).run();
}
__name(bumpCounter, "bumpCounter");

// src/optout.ts
function toE164Safe(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15 && String(value).trim().startsWith("+")) return `+${digits}`;
  return null;
}
__name(toE164Safe, "toE164Safe");
function normalizeEmail(value) {
  if (!value) return null;
  const email = String(value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
__name(normalizeEmail, "normalizeEmail");
async function optOutLead(db, input) {
  const ts = nowIso();
  const actor = input.actor ?? "SYSTEM";
  let lead = null;
  if (input.leadId) lead = await getLead(db, input.leadId);
  const phones = /* @__PURE__ */ new Set();
  const emails = /* @__PURE__ */ new Set();
  for (const p of [input.phone, lead?.phone, lead?.phone_e164]) {
    const e164 = toE164Safe(p);
    if (e164) phones.add(e164);
  }
  for (const e of [input.email, lead?.email]) {
    const norm = normalizeEmail(e);
    if (norm) emails.add(norm);
  }
  const statements = [];
  for (const phone of phones) {
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO suppressions(id, lead_id, phone, phone_e164, email, reason, source, created_at)
      VALUES(?, ?, ?, ?, NULL, 'OPT_OUT', ?, ?)
    `).bind(newId("sup"), lead?.id ?? input.leadId ?? null, phone, phone, input.source, ts));
  }
  for (const email of emails) {
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO suppressions(id, lead_id, phone, phone_e164, email, reason, source, created_at)
      VALUES(?, ?, NULL, NULL, ?, 'OPT_OUT', ?, ?)
    `).bind(newId("sup"), lead?.id ?? input.leadId ?? null, email, input.source, ts));
  }
  if (statements.length) await db.batch(statements);
  let sequencesCancelled = false;
  if (lead) {
    await db.batch([
      db.prepare(`UPDATE outreach_sequences SET status='CANCELLED', stop_reason=?, updated_at=? WHERE lead_id=? AND status IN ('ACTIVE','PAUSED')`).bind(`Opt-out via ${input.source}`, ts, lead.id),
      db.prepare(`UPDATE outreach_sequence_steps SET status='CANCELLED', last_error=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','RUNNING')`).bind(`Opt-out via ${input.source}`, ts, lead.id),
      db.prepare(`UPDATE demo_jobs SET status='CANCELLED', last_error=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','CLAIMED','BUILDING','QA')`).bind(`Opt-out via ${input.source}`, ts, lead.id)
    ]);
    sequencesCancelled = true;
    await db.prepare(`
      INSERT INTO outreach_permissions(lead_id,sms_status,consent_source,consent_evidence,consent_at,revoked_at,updated_at,updated_by)
      VALUES(?,'OPTED_OUT',?,?,NULL,?,?,?)
      ON CONFLICT(lead_id) DO UPDATE SET
        sms_status='OPTED_OUT', consent_source=excluded.consent_source,
        consent_evidence=excluded.consent_evidence, revoked_at=excluded.revoked_at,
        updated_at=excluded.updated_at, updated_by=excluded.updated_by
    `).bind(lead.id, input.source, input.evidence?.slice(0, 2e3) ?? null, ts, ts, actor).run();
  }
  let transitioned = false;
  if (lead) {
    const terminal = ["OPTED_OUT", "DISQUALIFIED", "DUPLICATE", "LOST"];
    if (!terminal.includes(lead.current_state)) {
      try {
        await transitionLead(db, lead.id, "OPTED_OUT", "HUMAN", `Opt-out received via ${input.source}.`, input.source);
        transitioned = true;
      } catch (error) {
        await bumpCounter(db, "optout_transition_failed");
        await recordEvent(db, {
          eventId: newId("evt"),
          leadId: lead.id,
          eventType: "OPT_OUT_TRANSITION_FAILED",
          eventData: { from: lead.current_state, message: error instanceof Error ? error.message : String(error) },
          source: input.source,
          actor
        });
      }
    }
    await recordEvent(db, {
      eventId: newId("evt"),
      leadId: lead.id,
      eventType: "OPT_OUT_PROCESSED",
      eventData: { source: input.source, phones: [...phones].length, emails: [...emails].length, transitioned },
      source: input.source,
      actor
    });
  }
  return { suppressed: statements.length, sequencesCancelled, transitioned };
}
__name(optOutLead, "optOutLead");

// src/conversation.ts
function industryNoun(lead) {
  const value = (lead.industry || "service").trim();
  return value.length > 60 ? value.slice(0, 60).trim() : value;
}
__name(industryNoun, "industryNoun");
function businessName(lead) {
  return (lead.business_name || "your company").trim();
}
__name(businessName, "businessName");
function hasWebsite(lead) {
  const status = (lead.website_status || "").toUpperCase();
  return Boolean(lead.website) || ["ACTIVE", "BROKEN", "PARKED", "PLACEHOLDER", "SOCIAL_ONLY"].includes(status);
}
__name(hasWebsite, "hasWebsite");
function pickVariant(lead, intent, options) {
  const key = `${lead.id}:${intent}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash << 5) - hash + key.charCodeAt(i) | 0;
  return options[Math.abs(hash) % options.length] ?? options[0] ?? "";
}
__name(pickVariant, "pickVariant");
function replyFor(lead, intent, stage) {
  const company = businessName(lead);
  const industry = industryNoun(lead).toLowerCase();
  const site = hasWebsite(lead);
  if (intent === "INTERESTED" && stage === "DEMO_OFFERED") {
    return {
      action: "TRIGGER_DEMO",
      confidence: 0.99,
      reason: "Prospect accepted the free live-preview offer.",
      draft: `Perfect \u2014 I\u2019ll put a live preview together for y\u2019all and send you the link when it\u2019s ready. No charge to see it.`
    };
  }
  switch (intent) {
    case "INTERESTED":
      return site ? { action: "DRAFT_REPLY", confidence: 0.97, reason: "Positive reply; prospect appears to have a site.", demoOffer: true, draft: `Yep \u2014 I saw y\u2019all already have a site. I can build a free alternative so you can compare \u2019em side by side and see if there\u2019s a better way to capture calls and quote requests. Want me to put one together?` } : { action: "DRAFT_REPLY", confidence: 0.98, reason: "Positive reply; no verified website recorded.", demoOffer: true, draft: `Yep \u2014 that\u2019s exactly why I reached out. I can build y\u2019all a complete live-preview site for free so you can see it before deciding anything. Want me to put one together?` };
    case "PRICE":
      return { action: "DRAFT_REPLY", confidence: 0.96, reason: "Prospect asked about price.", demoOffer: true, draft: pickVariant(lead, intent, [
        `The preview doesn\u2019t cost you anything. I build it first and send y\u2019all the live link, then if you like it we can talk about what it\u2019d take to get it live. Want me to put one together?`,
        `Nothing to see the preview \u2014 I build that part free. Y\u2019all can look it over first, and only if you like it do we talk about getting it live. Want me to make one?`,
        `The demo\u2019s free. I\u2019d rather show y\u2019all what I mean than try to sell you over text. Want me to build the preview and send you the link?`
      ]) };
    case "WHO_IS_THIS":
      return { action: "DRAFT_REPLY", confidence: 0.98, reason: "Identity request.", demoOffer: true, draft: pickVariant(lead, intent, [
        `Hey -Connor with Trenches Group. I came across ${company} while looking at local ${industry} companies around ${lead.city}. I build free live-preview sites so owners can see the idea first. Want me to show you one?`,
        `Connor with Trenches Group. I found ${company} while looking through local ${industry} businesses around ${lead.city}. I build the preview free so y\u2019all can see it before deciding anything. Want me to put one together?`
      ]) };
    case "SKEPTICAL":
      return { action: "DRAFT_REPLY", confidence: 0.98, reason: "Prospect expressed skepticism or asked what the catch is.", demoOffer: true, draft: pickVariant(lead, intent, [
        `No catch \u2014 I build the whole preview completely free and send y\u2019all a live link so you can see it first. I don\u2019t need payment or access to anything. If you like it, we can talk from there. Want me to put one together?`,
        `Totally fair question. There really isn\u2019t a catch \u2014 I build the preview free, send y\u2019all the live link, and you can decide from there. No payment and no access to anything needed. Want me to make one?`,
        `Fair enough. I\u2019m basically putting my work where my mouth is \u2014 I build y\u2019all the preview free first. If you like it, we talk. If not, no worries. Want me to put one together?`
      ]) };
    case "HAS_WEBSITE":
      return { action: "DRAFT_REPLY", confidence: 0.96, reason: "Prospect says they already have a website.", demoOffer: true, draft: `Yep, I saw that. I\u2019m not asking y\u2019all to replace anything blind \u2014 I can build a free alternative so you can compare \u2019em side by side. Want me to put one together?` };
    case "AUTOMATION_QUESTION":
      return { action: "DRAFT_REPLY", confidence: 0.99, reason: "Prospect asked whether the messaging is automated/AI.", demoOffer: true, draft: `Yep, I use automation to help keep up with messages, but Connor with Trenches Group is behind the offer. The free preview is real \u2014 no payment or login needed. Want me to build one for y\u2019all?` };
    case "CALL_ME":
      return { action: "ESCALATE", confidence: 0.99, reason: "Prospect requested a phone call.", draft: `Absolutely \u2014 I\u2019ll flag this for Connor so he can give you a call.`, escalate: { priority: "URGENT", reason: "Prospect explicitly requested a call.", recommended: `Call ${company} at ${lead.phone || "their listed number"} and review the conversation first.` } };
    case "ANGRY":
      return { action: "ESCALATE", confidence: 0.99, reason: "Angry or potentially sensitive reply.", escalate: { priority: "URGENT", reason: "Prospect appears angry or threatening escalation.", recommended: "Do not auto-reply. Human should review immediately and decide whether to suppress the contact." } };
    case "QUESTION":
      return { action: "DRAFT_REPLY", confidence: 0.82, reason: "Open-ended question; use a conversational bridge instead of failing/escalating by default.", demoOffer: true, draft: pickVariant(lead, intent, [
        `Yep, happy to explain. The short version is I build y\u2019all a free live preview first so you can see exactly what I\u2019m talking about before you decide anything. What I\u2019m proposing doesn\u2019t cost you a dime to see. Want me to put one together?`,
        `Sure thing. I\u2019m not asking y\u2019all to buy anything off a text \u2014 I build the live preview free so you can see what I mean first. Want me to put one together and send it over?`
      ]) };
    case "UNKNOWN":
      return { action: "DRAFT_REPLY", confidence: 0.68, reason: "Unknown normal reply; keep the conversation moving with a safe fallback instead of failing.", demoOffer: true, draft: pickVariant(lead, intent, [
        `Gotcha. Either way, there\u2019s no pressure on it \u2014 I can put together a free live preview for y\u2019all and send the link so you can actually see what I mean. Want me to build one?`,
        `I hear ya. Easiest thing is for me to just show you \u2014 I can build y\u2019all the preview free and send the live link. Want me to put one together?`,
        `No worries. Rather than go back and forth over text, I can make the preview free and let y\u2019all see it for yourself. Want me to build one?`
      ]) };
    case "NOT_INTERESTED":
      return { action: "STOP", confidence: 0.99, reason: "Prospect declined. Stop follow-ups.", draft: `No worries \u2014 appreciate you getting back to me. I won\u2019t keep bugging y\u2019all.` };
    case "OPT_OUT":
      return { action: "STOP", confidence: 1, reason: "Opt-out received. Suppression takes priority." };
    case "OPT_IN":
      return { action: "ACKNOWLEDGE", confidence: 1, reason: "Opt-in/START received.", draft: `You got it \u2014 you\u2019re opted back in.` };
    case "HELP":
      return { action: "ACKNOWLEDGE", confidence: 0.99, reason: "HELP keyword.", draft: `Trenches Group here. Reply STOP to opt out. If you need something else, just tell me what\u2019s up and I\u2019ll get it handled.` };
    default:
      return { action: "DRAFT_REPLY", confidence: 0.6, reason: "Unsupported normal inbound intent; never fail the conversation.", demoOffer: true, draft: `Gotcha. I can make this simple \u2014 I\u2019ll build y\u2019all a free live preview and send the link so you can see it first. Want me to put one together?` };
  }
}
__name(replyFor, "replyFor");
async function cancelFollowups(db, leadId, reason) {
  await db.prepare(`UPDATE outreach_followups SET status='CANCELLED', reason=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','DRAFTED')`).bind(reason.slice(0, 500), nowIso(), leadId).run();
}
__name(cancelFollowups, "cancelFollowups");
async function createEscalation(db, lead, intent, input, inboundBody) {
  const id = newId("esc");
  const ts = nowIso();
  await db.prepare(`INSERT INTO outreach_escalations(id,lead_id,intent,priority,reason,summary,recommended_action,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'OPEN',?,?)`).bind(id, lead.id, intent, input.priority, input.reason.slice(0, 1e3), inboundBody?.slice(0, 2e3) || null, input.recommended.slice(0, 2e3), ts, ts).run();
  await setLeadPause(db, lead.id, true, true, "SYSTEM");
  await recordEvent(db, { eventId: newId("evt"), leadId: lead.id, eventType: "HUMAN_ESCALATION_CREATED", eventData: { escalationId: id, intent, priority: input.priority, reason: input.reason }, source: "CONVERSATION", actor: "SYSTEM" });
  return id;
}
__name(createEscalation, "createEscalation");
async function saveDraft(db, lead, intent, action, body, confidence, reason, inboundMessageId) {
  if (!body) return void 0;
  const id = newId("draft");
  const ts = nowIso();
  await db.prepare(`INSERT INTO outreach_reply_drafts(id,lead_id,inbound_message_id,intent,action,body,confidence,reason,status,is_test,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?, 'DRAFT',1,?,?)`).bind(id, lead.id, inboundMessageId ?? null, intent, action, body.slice(0, 5e3), confidence, reason.slice(0, 1e3), ts, ts).run();
  await recordEvent(db, { eventId: newId("evt"), leadId: lead.id, eventType: "REPLY_DRAFT_CREATED", eventData: { draftId: id, intent, action, confidence }, source: "CONVERSATION", actor: "SYSTEM" });
  return id;
}
__name(saveDraft, "saveDraft");
async function getConversationStage(db, leadId) {
  const row = await db.prepare(`SELECT stage FROM outreach_conversation_state WHERE lead_id=?`).bind(leadId).first();
  return row?.stage || "NEW";
}
__name(getConversationStage, "getConversationStage");
async function setConversationStage(db, leadId, stage) {
  const ts = nowIso();
  await db.prepare(`INSERT INTO outreach_conversation_state(lead_id,stage,updated_at) VALUES(?,?,?) ON CONFLICT(lead_id) DO UPDATE SET stage=excluded.stage,updated_at=excluded.updated_at`).bind(leadId, stage, ts).run();
}
__name(setConversationStage, "setConversationStage");
async function updateConversationState(db, leadId, intent) {
  const ts = nowIso();
  await db.prepare(`INSERT INTO outreach_conversation_state(lead_id,stage,last_intent,last_inbound_at,updated_at) VALUES(?, 'ENGAGED', ?, ?, ?) ON CONFLICT(lead_id) DO UPDATE SET stage=CASE WHEN outreach_conversation_state.stage='NEW' THEN 'ENGAGED' ELSE outreach_conversation_state.stage END,last_intent=excluded.last_intent,last_inbound_at=excluded.last_inbound_at,updated_at=excluded.updated_at`).bind(leadId, intent, ts, ts).run();
}
__name(updateConversationState, "updateConversationState");
var DEMO_CONSENT_PATH = {
  QUALIFIED: "OUTREACH_READY",
  OUTREACH_READY: "OUTREACH_SENT",
  OUTREACH_SENT: "AWAITING_REPLY",
  AWAITING_REPLY: "REPLIED",
  REPLIED: "INTERESTED",
  INTERESTED: "DEMO_APPROVED"
};
var DEMO_CONSENT_BLOCKED_STATES = /* @__PURE__ */ new Set([
  "DISQUALIFIED",
  "OPTED_OUT",
  "NOT_INTERESTED",
  "BAD_NUMBER",
  "DUPLICATE",
  "HUMAN_REVIEW",
  "ERROR",
  "LOST",
  "WON",
  "ONBOARDING",
  "BUILD_FINAL",
  "LIVE",
  "ACTIVE_CUSTOMER"
]);
async function tryMarkDemoApproved(db, lead) {
  let current = await getLead(db, lead.id) ?? lead;
  if (DEMO_CONSENT_BLOCKED_STATES.has(current.current_state)) {
    await recordEvent(db, { eventId: newId("evt"), leadId: lead.id, eventType: "DEMO_CONSENT_STATE_BLOCKED", eventData: { currentState: current.current_state }, source: "CONVERSATION", actor: "SYSTEM" });
    return current;
  }
  if (["DEMO_APPROVED", "DEMO_BUILDING", "DEMO_QA", "DEMO_READY", "DEMO_SENT", "DEMO_VIEWED", "PRICING_VIEWED", "CHECKOUT_STARTED"].includes(current.current_state)) return current;
  let guard = 0;
  while (current.current_state !== "DEMO_APPROVED" && guard < 8) {
    guard += 1;
    const next = DEMO_CONSENT_PATH[current.current_state];
    if (!next) break;
    current = await transitionLead(
      db,
      current.id,
      next,
      "SYSTEM",
      next === "DEMO_APPROVED" ? "Prospect explicitly approved free live-preview demo." : "Canonical outreach state advanced from confirmed demo consent.",
      "CONVERSATION"
    );
  }
  if (current.current_state !== "DEMO_APPROVED") {
    await recordEvent(db, { eventId: newId("evt"), leadId: lead.id, eventType: "DEMO_CONSENT_STATE_NOT_PROMOTED", eventData: { currentState: current.current_state }, source: "CONVERSATION", actor: "SYSTEM" });
  }
  return current;
}
__name(tryMarkDemoApproved, "tryMarkDemoApproved");
async function queueDemoBuildFromConsent(db, leadId) {
  const enabled = await db.prepare(`SELECT value FROM system_flags WHERE key='DEMO_AUTOMATION_ENABLED'`).first();
  if ((enabled?.value || "true").toLowerCase() !== "true") return null;
  const current = await getLead(db, leadId);
  if (!current) return null;
  if (current.current_state !== "DEMO_APPROVED" || current.automation_paused || current.human_required || await isSuppressed(db, current.phone, current.email)) {
    await recordEvent(db, { eventId: newId("evt"), leadId, eventType: "DEMO_BUILD_BLOCKED", eventData: { reason: `Lead state ${current.current_state} is not eligible for autonomous demo build.` }, source: "DEMO", actor: "SYSTEM" });
    return null;
  }
  const existing = await db.prepare(`SELECT id FROM demo_jobs WHERE lead_id=? AND status IN ('PENDING','CLAIMED','BUILDING','QA','READY') ORDER BY created_at DESC LIMIT 1`).bind(leadId).first();
  if (existing?.id) return existing.id;
  const modelRow = await db.prepare(`SELECT value FROM system_flags WHERE key='DEMO_BUILDER_MODEL'`).first();
  const id = newId("demo"), ts = nowIso();
  await db.prepare(`INSERT INTO demo_jobs(id,lead_id,status,attempt_count,max_attempts,qa_attempt_count,max_qa_attempts,model,created_at,updated_at) VALUES(?,?,'PENDING',0,3,0,2,?,?,?)`).bind(id, leadId, modelRow?.value || "sonnet", ts, ts).run();
  await recordEvent(db, { eventId: newId("evt"), leadId, eventType: "DEMO_BUILD_QUEUED", eventData: { demoJobId: id, source: "DEMO_CONSENT" }, source: "DEMO", actor: "SYSTEM" });
  try {
    await transitionLead(db, leadId, "DEMO_BUILDING", "SYSTEM", "Demo build automatically queued after consent.", "DEMO");
  } catch {
  }
  return id;
}
__name(queueDemoBuildFromConsent, "queueDemoBuildFromConsent");
async function processConversationInbound(db, lead, intent, inboundBody, inboundMessageId) {
  const stageBefore = await getConversationStage(db, lead.id);
  await updateConversationState(db, lead.id, intent);
  await cancelFollowups(db, lead.id, `Inbound reply received: ${intent}`);
  const policy = replyFor(lead, intent, stageBefore);
  let escalationId;
  if (policy.escalate) escalationId = await createEscalation(db, lead, intent, policy.escalate, inboundBody);
  const draftId = await saveDraft(db, lead, intent, policy.action, policy.draft, policy.confidence, policy.reason, inboundMessageId);
  if (policy.action === "TRIGGER_DEMO") {
    await setConversationStage(db, lead.id, "DEMO_APPROVED");
    await tryMarkDemoApproved(db, lead);
    await recordEvent(db, { eventId: newId("evt"), leadId: lead.id, eventType: "DEMO_CONSENT_CAPTURED", eventData: { inboundBody: inboundBody.slice(0, 500), intent }, source: "CONVERSATION", actor: "SYSTEM" });
    await queueDemoBuildFromConsent(db, lead.id);
  } else if (policy.demoOffer) {
    await setConversationStage(db, lead.id, "DEMO_OFFERED");
  }
  await recordEvent(db, { eventId: newId("evt"), leadId: lead.id, eventType: "CONVERSATION_DECISION", eventData: { intent, action: policy.action, confidence: policy.confidence, draftId, escalationId, stageBefore, stageAfter: policy.action === "TRIGGER_DEMO" ? "DEMO_APPROVED" : policy.demoOffer ? "DEMO_OFFERED" : stageBefore }, source: "CONVERSATION", actor: "SYSTEM" });
  return { leadId: lead.id, intent, action: policy.action, draftId, draft: policy.draft, confidence: policy.confidence, reason: policy.reason, escalationId };
}
__name(processConversationInbound, "processConversationInbound");
async function simulateInbound(db, leadId, message, intent) {
  const lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  const body = message.trim();
  if (!body) throw new HttpError(400, "MESSAGE_REQUIRED", "Simulation message is required.");
  await recordEvent(db, { eventId: newId("evt"), leadId, eventType: "SIMULATED_INBOUND", eventData: { body, intent }, source: "SIMULATOR", actor: "ADMIN" });
  return await processConversationInbound(db, lead, intent, body, null);
}
__name(simulateInbound, "simulateInbound");
async function repairDemoConsentHandoffs(db, limit = 25) {
  const rows = await db.prepare(`SELECT DISTINCT e.lead_id FROM events e JOIN leads l ON l.id=e.lead_id WHERE e.event_type='DEMO_CONSENT_CAPTURED' AND l.current_state IN ('QUALIFIED','OUTREACH_READY','OUTREACH_SENT','AWAITING_REPLY','REPLIED','INTERESTED','DEMO_APPROVED') ORDER BY e.created_at DESC LIMIT ?`).bind(limit).all();
  let checked = 0, promoted = 0, queued = 0;
  for (const row of rows.results || []) {
    const lead = await getLead(db, row.lead_id);
    if (!lead) continue;
    checked += 1;
    const before = lead.current_state;
    const current = await tryMarkDemoApproved(db, lead);
    if (before !== current.current_state) promoted += 1;
    const jobId = await queueDemoBuildFromConsent(db, lead.id);
    if (jobId) queued += 1;
  }
  return { checked, promoted, queued };
}
__name(repairDemoConsentHandoffs, "repairDemoConsentHandoffs");
async function createOpenerDraft(db, leadId, opener) {
  const lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  const id = newId("draft");
  const ts = nowIso();
  await db.prepare(`INSERT INTO outreach_reply_drafts(id,lead_id,intent,action,body,confidence,reason,status,is_test,created_at,updated_at) VALUES(?,?,'OPENER','DRAFT_REPLY',?,1,'Phase 3B opener policy','DRAFT',1,?,?)`).bind(id, leadId, opener.slice(0, 5e3), ts, ts).run();
  await setConversationStage(db, leadId, "OPENER_DRAFTED");
  await recordEvent(db, { eventId: newId("evt"), leadId, eventType: "OPENER_DRAFT_CREATED", eventData: { draftId: id, body: opener }, source: "CONVERSATION", actor: "SYSTEM" });
  return { draftId: id, opener };
}
__name(createOpenerDraft, "createOpenerDraft");
async function scheduleFollowupSequence(db, leadId, actor, now = /* @__PURE__ */ new Date()) {
  const lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  await cancelFollowups(db, leadId, "Replaced by new follow-up sequence.");
  const company = businessName(lead);
  const steps = [
    { hours: 24, body: `Hey \u2014 just circling back. Want me to put together that free preview for ${company}?` },
    { hours: 72, body: `Hey, quick follow-up on ${company}. I\u2019m still happy to build y\u2019all the preview free so you can see it first.` },
    { hours: 168, body: `Last note from me \u2014 if y\u2019all ever want me to put together that free preview for ${company}, just holler. -Connor` }
  ];
  const ts = nowIso();
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    const due = new Date(now.getTime() + step.hours * 36e5).toISOString();
    await db.prepare(`INSERT INTO outreach_followups(id,lead_id,sequence_step,due_at,body,status,reason,is_test,created_at,updated_at) VALUES(?,?,?,?,?,'PENDING','Scheduled follow-up',1,?,?)`).bind(newId("fu"), leadId, i + 1, due, step.body, ts, ts).run();
  }
  await recordEvent(db, { eventId: newId("evt"), leadId, eventType: "FOLLOWUP_SEQUENCE_SCHEDULED", eventData: { steps: 3 }, source: "CONVERSATION", actor });
}
__name(scheduleFollowupSequence, "scheduleFollowupSequence");
async function processDueFollowups(db, force = false) {
  const now = nowIso();
  const result = force ? await db.prepare(`SELECT f.*, l.automation_paused,l.current_state FROM outreach_followups f JOIN leads l ON l.id=f.lead_id WHERE f.status='PENDING' ORDER BY f.due_at LIMIT 50`).all() : await db.prepare(`SELECT f.*, l.automation_paused,l.current_state FROM outreach_followups f JOIN leads l ON l.id=f.lead_id WHERE f.status='PENDING' AND f.due_at<=? ORDER BY f.due_at LIMIT 50`).bind(now).all();
  let drafted = 0, skipped = 0;
  for (const row of result.results) {
    const id = String(row.id), leadId = String(row.lead_id), state = String(row.current_state), paused = Number(row.automation_paused || 0) === 1;
    if (paused || ["REPLIED", "INTERESTED", "NOT_INTERESTED", "OPTED_OUT", "HUMAN_REVIEW", "WON", "ACTIVE_CUSTOMER"].includes(state)) {
      await db.prepare(`UPDATE outreach_followups SET status='SKIPPED',reason=?,updated_at=? WHERE id=?`).bind(`Lead state ${state}${paused ? " / automation paused" : ""}`, now, id).run();
      skipped += 1;
      continue;
    }
    const lead = await getLead(db, leadId);
    if (!lead) {
      await db.prepare(`UPDATE outreach_followups SET status='FAILED',reason='Lead missing',updated_at=? WHERE id=?`).bind(now, id).run();
      continue;
    }
    const draftId = await saveDraft(db, lead, "FOLLOWUP", "DRAFT_REPLY", String(row.body), 1, `Follow-up step ${row.sequence_step}`, null);
    await db.prepare(`UPDATE outreach_followups SET status='DRAFTED',reason=?,updated_at=? WHERE id=?`).bind(`Draft ${draftId}`, now, id).run();
    drafted += 1;
  }
  return { drafted, skipped };
}
__name(processDueFollowups, "processDueFollowups");
async function conversationStatus(db) {
  const [drafts, followups, escalations] = await Promise.all([
    db.prepare(`SELECT d.*,l.business_name FROM outreach_reply_drafts d JOIN leads l ON l.id=d.lead_id ORDER BY d.created_at DESC LIMIT 50`).all(),
    db.prepare(`SELECT f.*,l.business_name FROM outreach_followups f JOIN leads l ON l.id=f.lead_id ORDER BY f.created_at DESC LIMIT 50`).all(),
    db.prepare(`SELECT e.*,l.business_name,l.phone FROM outreach_escalations e JOIN leads l ON l.id=e.lead_id ORDER BY CASE e.status WHEN 'OPEN' THEN 0 ELSE 1 END,e.created_at DESC LIMIT 50`).all()
  ]);
  return { drafts: drafts.results, followups: followups.results, escalations: escalations.results };
}
__name(conversationStatus, "conversationStatus");
async function resolveEscalation(db, id, actor) {
  const row = await db.prepare(`SELECT lead_id FROM outreach_escalations WHERE id=?`).bind(id).first();
  if (!row) throw new HttpError(404, "ESCALATION_NOT_FOUND", "Escalation not found.");
  const ts = nowIso();
  await db.prepare(`UPDATE outreach_escalations SET status='RESOLVED',resolved_at=?,resolved_by=?,updated_at=? WHERE id=?`).bind(ts, actor, ts, id).run();
  await setLeadPause(db, row.lead_id, false, false, "HUMAN");
  await recordEvent(db, { eventId: newId("evt"), leadId: row.lead_id, eventType: "HUMAN_ESCALATION_RESOLVED", eventData: { escalationId: id }, source: "CONVERSATION", actor });
}
__name(resolveEscalation, "resolveEscalation");
async function setDraftStatus(db, id, status, actor) {
  const row = await db.prepare(`SELECT lead_id,status FROM outreach_reply_drafts WHERE id=?`).bind(id).first();
  if (!row) throw new HttpError(404, "DRAFT_NOT_FOUND", "Reply draft not found.");
  if (row.status === "SENT") throw new HttpError(409, "DRAFT_ALREADY_SENT", "Sent drafts cannot be changed.");
  const ts = nowIso();
  await db.prepare(`UPDATE outreach_reply_drafts SET status=?,updated_at=? WHERE id=?`).bind(status, ts, id).run();
  await recordEvent(db, { eventId: newId("evt"), leadId: row.lead_id, eventType: `REPLY_DRAFT_${status}`, eventData: { draftId: id }, source: "CONVERSATION", actor });
}
__name(setDraftStatus, "setDraftStatus");

// src/correspondence.ts
var PERSONAL_SIGNATURE = "-Connor";
function cleanNewlines(value) {
  return value.replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
}
__name(cleanNewlines, "cleanNewlines");
function stripTrailingSignoff(value) {
  let text2 = cleanNewlines(value);
  text2 = text2.replace(/\n{0,2}(?:[-—–]\s*)?Connor\.?\s*$/i, "").trim();
  text2 = text2.replace(/\n{1,2}(?:best(?: regards)?|regards|sincerely|cheers|thanks|thank you)[,!]?\s*(?:\n\s*(?:[-—–]\s*)?Connor\.?)?\s*$/i, "").trim();
  return text2;
}
__name(stripTrailingSignoff, "stripTrailingSignoff");
function truncateWithoutBreakingWord(value, maxLength) {
  if (value.length <= maxLength) return value;
  const slice = value.slice(0, Math.max(0, maxLength)).trimEnd();
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > Math.max(12, Math.floor(maxLength * 0.65)) ? slice.slice(0, lastSpace) : slice).trimEnd();
}
__name(truncateWithoutBreakingWord, "truncateWithoutBreakingWord");
function formatSmsCorrespondence(body, maxLength = 1600) {
  let text2 = stripTrailingSignoff(body);
  const suffix = `

${PERSONAL_SIGNATURE}`;
  const available = Math.max(0, maxLength - suffix.length);
  text2 = truncateWithoutBreakingWord(text2, available);
  return `${text2}${suffix}`;
}
__name(formatSmsCorrespondence, "formatSmsCorrespondence");

// src/twilio.ts
function twilioConfigured(env) {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_MESSAGING_SERVICE_SID);
}
__name(twilioConfigured, "twilioConfigured");
function toE164US(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (value.startsWith("+") && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  throw new HttpError(400, "INVALID_PHONE", "Phone must be a valid US 10-digit or E.164 number.");
}
__name(toE164US, "toE164US");
async function constantTimeStringEqual(a, b) {
  const enc = new TextEncoder();
  const [ah, bh] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  return crypto.subtle.timingSafeEqual(ah, bh);
}
__name(constantTimeStringEqual, "constantTimeStringEqual");
function bytesToBase64(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
__name(bytesToBase64, "bytesToBase64");
async function validateAndReadTwilioForm(request, env) {
  if (!env.TWILIO_AUTH_TOKEN) throw new HttpError(503, "TWILIO_NOT_CONFIGURED", "Twilio Auth Token is not configured.");
  const signature = request.headers.get("x-twilio-signature");
  if (!signature) throw new HttpError(401, "TWILIO_SIGNATURE_MISSING", "Missing X-Twilio-Signature.");
  const form = await request.formData();
  const entries = [];
  form.forEach((v, k) => entries.push([k, typeof v === "string" ? v : v.name]));
  entries.sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
  let payload = request.url;
  for (const [key2, value] of entries) payload += key2 + value;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.TWILIO_AUTH_TOKEN), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)));
  const expected = bytesToBase64(digest);
  if (!await constantTimeStringEqual(signature, expected)) throw new HttpError(403, "TWILIO_SIGNATURE_INVALID", "Invalid Twilio webhook signature.");
  return form;
}
__name(validateAndReadTwilioForm, "validateAndReadTwilioForm");
function formString(form, name) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
__name(formString, "formString");
function classifyInbound(body, optOutType) {
  const text2 = body.trim().toLowerCase();
  const oot = (optOutType || "").toUpperCase();
  if (oot === "STOP" || /^(stop|stopall|unsubscribe|cancel|end|quit|revoke|optout)$/i.test(text2)) return "OPT_OUT";
  if (oot === "START" || /^(start|unstop)$/i.test(text2)) return "OPT_IN";
  if (oot === "HELP" || /^(help|info)$/i.test(text2)) return "HELP";
  if (/\b(lawyer|attorney|report you|reporting you|harassment|harassing|pissed|angry|furious|sue|lawsuit)\b/i.test(text2)) return "ANGRY";
  if (/\b(already have (a )?(website|site)|we have (a )?(website|site)|got (a )?(website|site)|have our own site)\b/i.test(text2)) return "HAS_WEBSITE";
  if (/\b(not interested|no thanks|no thank you|don't contact|do not contact|leave me alone)\b/i.test(text2)) return "NOT_INTERESTED";
  if (/\b(how much|price|pricing|cost|rate|rates)\b/i.test(text2)) return "PRICE";
  if (/\b(who is this|who are you|what company|who's this)\b/i.test(text2)) return "WHO_IS_THIS";
  if (/\b(call me|give me a call|phone me|can you call)\b/i.test(text2)) return "CALL_ME";
  if (/\b(bot|robot|automated|automation|ai|artificial intelligence|real person|human)\b/i.test(text2) && /\b(are you|is this|this a|you a|automated|automation|bot|robot|ai|human|real person)\b/i.test(text2)) return "AUTOMATION_QUESTION";
  if (/\b(scam|fake|spam|legit|legitimate|what(?:'s| is) the catch|whats the catch|is there a catch|too good to be true|why (?:is|would) (?:it|this) free|why free|how do you make money|what do you get out of this)\b/i.test(text2)) return "SKEPTICAL";
  if (/^(yes|yeah|yep|yup|sure|okay|ok|absolutely|go ahead|why not|interested|sounds good|send it|please do|do it|let's do it|lets do it)\b/i.test(text2)) return "INTERESTED";
  if (text2.includes("?")) return "QUESTION";
  return text2 ? "UNKNOWN" : "UNKNOWN";
}
__name(classifyInbound, "classifyInbound");
async function findLeadByPhone(db, phone) {
  const digits = phone.replace(/\D/g, "");
  const e164 = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : null;
  if (!e164) return null;
  return await db.prepare(
    `SELECT * FROM leads WHERE phone_e164 = ? ORDER BY updated_at DESC LIMIT 1`
  ).bind(e164).first();
}
__name(findLeadByPhone, "findLeadByPhone");
async function isPhoneSuppressed(db, phone) {
  const e164 = toE164US(phone);
  const digits = normalizePhone(phone);
  const row = await db.prepare("SELECT id FROM suppressions WHERE phone IN (?, ?) LIMIT 1").bind(e164, digits ?? e164).first();
  return Boolean(row);
}
__name(isPhoneSuppressed, "isPhoneSuppressed");
async function isTestAllowed(db, phone) {
  const e164 = toE164US(phone);
  const row = await db.prepare("SELECT phone FROM outreach_test_allowlist WHERE phone = ? LIMIT 1").bind(e164).first();
  return Boolean(row);
}
__name(isTestAllowed, "isTestAllowed");
async function addTestNumber(db, phone, label, actor) {
  const e164 = toE164US(phone);
  await db.prepare(`INSERT INTO outreach_test_allowlist(phone,label,created_at,created_by) VALUES(?,?,?,?) ON CONFLICT(phone) DO UPDATE SET label=excluded.label`).bind(e164, label?.slice(0, 160) || null, nowIso(), actor).run();
}
__name(addTestNumber, "addTestNumber");
async function removeTestNumber(db, phone) {
  await db.prepare("DELETE FROM outreach_test_allowlist WHERE phone = ?").bind(toE164US(phone)).run();
}
__name(removeTestNumber, "removeTestNumber");
async function setSmsPermission(db, leadId, status, source, evidence, actor) {
  const timestamp = nowIso();
  await db.prepare(`
    INSERT INTO outreach_permissions(lead_id,sms_status,consent_source,consent_evidence,consent_at,revoked_at,updated_at,updated_by)
    VALUES(?,?,?,?,?,?,?,?)
    ON CONFLICT(lead_id) DO UPDATE SET sms_status=excluded.sms_status,consent_source=excluded.consent_source,consent_evidence=excluded.consent_evidence,consent_at=excluded.consent_at,revoked_at=excluded.revoked_at,updated_at=excluded.updated_at,updated_by=excluded.updated_by
  `).bind(
    leadId,
    status,
    source.slice(0, 160),
    evidence?.slice(0, 2e3) || null,
    status === "OPTED_IN" ? timestamp : null,
    status === "OPTED_OUT" ? timestamp : null,
    timestamp,
    actor
  ).run();
  await recordEvent(db, { eventId: newId("evt"), leadId, eventType: "SMS_PERMISSION_UPDATED", eventData: { status, source }, source: "OUTREACH", actor });
}
__name(setSmsPermission, "setSmsPermission");
async function permissionStatus(db, leadId) {
  const row = await db.prepare("SELECT sms_status FROM outreach_permissions WHERE lead_id = ?").bind(leadId).first();
  return row?.sms_status || "UNKNOWN";
}
__name(permissionStatus, "permissionStatus");
async function storeMessage(db, input) {
  if (input.providerSid) {
    const existing = await db.prepare("SELECT id FROM outreach_messages WHERE provider_message_sid = ? LIMIT 1").bind(input.providerSid).first();
    if (existing?.id) return existing.id;
  }
  const id = newId("msg");
  const ts = nowIso();
  await db.prepare(`
    INSERT INTO outreach_messages(id,lead_id,direction,provider_message_sid,from_number,to_number,body,status,intent,is_test,error_code,error_message,raw_json,created_at,updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(id, input.leadId ?? null, input.direction, input.providerSid ?? null, input.from, input.to, input.body.slice(0, 5e3), input.status, input.intent ?? null, input.isTest ? 1 : 0, input.errorCode ?? null, input.errorMessage ?? null, JSON.stringify(input.raw ?? {}), ts, ts).run();
  return id;
}
__name(storeMessage, "storeMessage");
function base64Basic(user, password) {
  return btoa(`${user}:${password}`);
}
__name(base64Basic, "base64Basic");
async function sendTwilioSms(env, input) {
  if (!twilioConfigured(env)) throw new HttpError(503, "TWILIO_NOT_CONFIGURED", "Twilio credentials/Messaging Service are not configured.");
  if (await globalAutomationPaused(env.DB)) throw new HttpError(409, "GLOBAL_AUTOMATION_PAUSED", "Global automation is paused.");
  const to = toE164US(input.to);
  const testAllowed = await isTestAllowed(env.DB, to);
  if (await isPhoneSuppressed(env.DB, to)) throw new HttpError(409, "CONTACT_SUPPRESSED", "This phone number is suppressed.");
  const testOnly = input.testOnly !== false;
  let lead = null;
  if (input.leadId) {
    lead = await getLead(env.DB, input.leadId);
    if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  }
  if (!testAllowed) {
    const permission = lead ? await permissionStatus(env.DB, lead.id) : "UNKNOWN";
    throw new HttpError(409, "OUTREACH_TEST_MODE_LOCK", `Phase 3A only sends to the explicit test allowlist. Current lead SMS permission: ${permission}.`);
  }
  if (!testOnly) throw new HttpError(409, "OUTREACH_LIVE_MODE_LOCK", "Live prospect SMS is not enabled in Phase 3A.");
  const body = formatSmsCorrespondence(input.body, 1600);
  if (!body || body.length > 1600) throw new HttpError(400, "INVALID_MESSAGE", "SMS body must be 1-1600 characters.");
  const statusCallback = `${env.PUBLIC_BASE_URL || "https://trenches-os-api.cmckendry-ai.workers.dev"}/integrations/twilio/status`;
  const form = new URLSearchParams({ To: to, MessagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID, Body: body, StatusCallback: statusCallback });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.TWILIO_ACCOUNT_SID)}/Messages.json`, {
    method: "POST",
    headers: { "authorization": `Basic ${base64Basic(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)}`, "content-type": "application/x-www-form-urlencoded" },
    body: form.toString()
  });
  const data = await response.json();
  if (!response.ok) {
    await storeMessage(env.DB, { leadId: lead?.id, direction: "OUTBOUND", from: env.TWILIO_MESSAGING_SERVICE_SID, to, body, status: "FAILED", isTest: true, raw: data, errorCode: String(data.code ?? response.status), errorMessage: String(data.message ?? "Twilio send failed") });
    throw new HttpError(502, "TWILIO_SEND_FAILED", String(data.message ?? "Twilio send failed."), { status: response.status, code: data.code });
  }
  const sid = typeof data.sid === "string" ? data.sid : void 0;
  const from = typeof data.from === "string" ? data.from : env.TWILIO_MESSAGING_SERVICE_SID;
  await storeMessage(env.DB, { leadId: lead?.id, direction: "OUTBOUND", providerSid: sid, from, to, body, status: String(data.status ?? "queued"), isTest: true, raw: data });
  if (lead) await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "SMS_TEST_SENT", eventData: { sid, to }, source: "TWILIO", actor: "SYSTEM", idempotencyKey: sid ? `twilio-out:${sid}` : void 0 });
  return { sid, status: data.status, to, test: true };
}
__name(sendTwilioSms, "sendTwilioSms");
async function safeLeadTransitionForInbound(db, lead, intent) {
  try {
    let current = lead;
    if (["OUTREACH_SENT", "AWAITING_REPLY"].includes(current.current_state)) {
      current = await transitionLead(db, current.id, "REPLIED", "SYSTEM", "Inbound SMS reply received.", "TWILIO");
    }
    if (intent === "INTERESTED" && current.current_state === "REPLIED") await transitionLead(db, current.id, "INTERESTED", "SYSTEM", "Inbound SMS classified INTERESTED.", "TWILIO");
    if (intent === "NOT_INTERESTED" && ["AWAITING_REPLY", "REPLIED"].includes(current.current_state)) await transitionLead(db, current.id, "NOT_INTERESTED", "SYSTEM", "Inbound SMS classified NOT_INTERESTED.", "TWILIO");
    if (intent === "OPT_OUT" && !["OPTED_OUT", "NOT_INTERESTED", "DISQUALIFIED", "BAD_NUMBER", "DUPLICATE", "LOST"].includes(current.current_state)) {
      const allowed = ["OUTREACH_READY", "OUTREACH_SENT", "AWAITING_REPLY", "REPLIED", "INTERESTED", "DEMO_SENT", "DEMO_VIEWED", "PRICING_VIEWED"];
      if (allowed.includes(current.current_state)) await transitionLead(db, current.id, "OPTED_OUT", "SYSTEM", "Twilio opt-out received.", "TWILIO");
    }
  } catch (error) {
    await bumpCounter(db, "transition_refused_sms");
    await recordEvent(db, {
      eventId: newId("evt"),
      leadId: lead.id,
      eventType: "STATE_TRANSITION_REFUSED",
      eventData: { intent, fromState: lead.current_state, message: error instanceof Error ? error.message : String(error) },
      source: "TWILIO",
      actor: "SYSTEM"
    });
  }
}
__name(safeLeadTransitionForInbound, "safeLeadTransitionForInbound");
async function handleTwilioInbound(request, env) {
  const form = await validateAndReadTwilioForm(request, env);
  const from = toE164US(formString(form, "From"));
  const toRaw = formString(form, "To");
  const to = toRaw ? toE164US(toRaw) : toRaw;
  const body = formString(form, "Body");
  const sid = formString(form, "MessageSid");
  const optOutType = formString(form, "OptOutType");
  const intent = classifyInbound(body, optOutType);
  const lead = await findLeadByPhone(env.DB, from);
  const isTest = await isTestAllowed(env.DB, from);
  const raw = {};
  form.forEach((v, k) => {
    raw[k] = typeof v === "string" ? v : v.name;
  });
  const inboundMessageId = await storeMessage(env.DB, { leadId: lead?.id, direction: "INBOUND", providerSid: sid || void 0, from, to, body, status: "received", intent, isTest, raw });
  if (intent === "OPT_OUT") {
    await optOutLead(env.DB, {
      leadId: lead?.id,
      phone: from,
      email: lead?.email,
      source: "TWILIO",
      evidence: body || optOutType
    });
    if (lead) await setSmsPermission(env.DB, lead.id, "OPTED_OUT", "TWILIO_STOP", body || optOutType, "SYSTEM");
  } else if (intent === "OPT_IN") {
    const normalized = normalizePhone(from);
    await env.DB.prepare("DELETE FROM suppressions WHERE phone IN (?, ?)").bind(from, normalized ?? from).run();
    if (lead) await setSmsPermission(env.DB, lead.id, "OPTED_IN", "TWILIO_START", body || optOutType, "SYSTEM");
  }
  if (lead) {
    await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "SMS_INBOUND_RECEIVED", eventData: { sid, intent, isTest }, source: "TWILIO", actor: "SYSTEM", idempotencyKey: sid ? `twilio-in:${sid}` : void 0 });
    await safeLeadTransitionForInbound(env.DB, lead, intent);
    await processConversationInbound(env.DB, lead, intent, body, inboundMessageId);
  }
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { "content-type": "application/xml" } });
}
__name(handleTwilioInbound, "handleTwilioInbound");
async function handleTwilioStatus(request, env) {
  const form = await validateAndReadTwilioForm(request, env);
  const sid = formString(form, "MessageSid");
  const status = formString(form, "MessageStatus") || "unknown";
  const errorCode = formString(form, "ErrorCode");
  const errorMessage = formString(form, "ErrorMessage");
  if (sid) {
    await env.DB.prepare(`UPDATE outreach_messages SET status=?, error_code=?, error_message=?, updated_at=? WHERE provider_message_sid=?`).bind(status, errorCode || null, errorMessage || null, nowIso(), sid).run();
  }
  return new Response("", { status: 204 });
}
__name(handleTwilioStatus, "handleTwilioStatus");
async function outreachStatus(db, env) {
  const [allow, msgs, flags] = await Promise.all([
    db.prepare("SELECT phone,label,created_at FROM outreach_test_allowlist ORDER BY created_at DESC LIMIT 50").all(),
    db.prepare("SELECT id,lead_id,direction,from_number,to_number,body,status,intent,is_test,error_code,error_message,created_at FROM outreach_messages ORDER BY created_at DESC LIMIT 30").all(),
    db.prepare(`SELECT key,value FROM system_flags WHERE key IN ('OUTREACH_ENABLED','OUTREACH_TEST_MODE','OUTREACH_LIVE_MODE')`).all()
  ]);
  const map = new Map(flags.results.map((r) => [r.key, r.value]));
  return {
    configured: twilioConfigured(env),
    testMode: map.get("OUTREACH_TEST_MODE") !== "false",
    liveEnabled: map.get("OUTREACH_ENABLED") === "true" && map.get("OUTREACH_LIVE_MODE") === "true",
    allowlist: allow.results,
    recentMessages: msgs.results,
    inboundWebhook: `${env.PUBLIC_BASE_URL || "https://trenches-os-api.cmckendry-ai.workers.dev"}/integrations/twilio/inbound`,
    statusWebhook: `${env.PUBLIC_BASE_URL || "https://trenches-os-api.cmckendry-ai.workers.dev"}/integrations/twilio/status`
  };
}
__name(outreachStatus, "outreachStatus");
async function buildLeadOpener(db, lead) {
  const research = await db.prepare("SELECT primary_service FROM lead_research WHERE lead_id = ? LIMIT 1").bind(lead.id).first();
  let service = (research?.primary_service || lead.industry || "service").trim().toLowerCase();
  if (service.length > 44) service = service.slice(0, 44).trim();
  let text2 = `Hey, do y'all still do ${service} in ${lead.city}? Found you on Google.`;
  text2 = formatSmsCorrespondence(text2, 160);
  if (text2.length > 160) text2 = formatSmsCorrespondence(`Hey, do y'all still work in ${lead.city}? Found you on Google.`, 160);
  return text2;
}
__name(buildLeadOpener, "buildLeadOpener");

// src/reaper.ts
async function flagNumber(db, key, fallback) {
  const row = await db.prepare(`SELECT value FROM system_flags WHERE key = ?`).bind(key).first();
  const n = Number(row?.value);
  return Number.isFinite(n) ? n : fallback;
}
__name(flagNumber, "flagNumber");
async function reapStaleDemoJobs(db) {
  const leaseMinutes = await flagNumber(db, "DEMO_JOB_LEASE_MINUTES", 20);
  const maxReclaims = await flagNumber(db, "DEMO_JOB_MAX_RECLAIMS", 2);
  const cutoff = new Date(Date.now() - leaseMinutes * 6e4).toISOString();
  const ts = nowIso();
  const stale = await db.prepare(`
    SELECT id, lead_id, status, claimed_by, reclaim_count
      FROM demo_jobs
     WHERE status IN ('CLAIMED','BUILDING','QA')
       AND COALESCE(lease_expires_at, claimed_at, updated_at) <= ?
     ORDER BY updated_at ASC
     LIMIT 50
  `).bind(cutoff).all();
  let reclaimed = 0;
  let escalated = 0;
  for (const job of stale.results ?? []) {
    const nextReclaim = Number(job.reclaim_count ?? 0) + 1;
    if (nextReclaim > maxReclaims) {
      const result2 = await db.prepare(`
        UPDATE demo_jobs
           SET status='FAILED', last_error=?, reclaim_count=?, lease_expires_at=NULL, updated_at=?
         WHERE id=? AND status=?
      `).bind(
        `Abandoned by runner ${job.claimed_by ?? "unknown"} after ${nextReclaim} reclaim attempts.`,
        nextReclaim,
        ts,
        job.id,
        job.status
      ).run();
      if ((result2.meta.changes ?? 0) === 1) {
        escalated += 1;
        await db.prepare(`UPDATE leads SET human_required=1, updated_at=? WHERE id=?`).bind(ts, job.lead_id).run();
        await bumpCounter(db, "demo_job_escalated");
        await recordEvent(db, {
          eventId: newId("evt"),
          leadId: job.lead_id,
          eventType: "DEMO_JOB_ABANDONED_ESCALATED",
          eventData: { demoJobId: job.id, previousStatus: job.status, reclaimCount: nextReclaim },
          source: "DEMO",
          actor: "REAPER"
        });
      }
      continue;
    }
    const result = await db.prepare(`
      UPDATE demo_jobs
         SET status='PENDING', claimed_by=NULL, claimed_at=NULL, lease_expires_at=NULL,
             reclaim_count=?, last_error=?, updated_at=?
       WHERE id=? AND status=?
    `).bind(
      nextReclaim,
      `Reclaimed after ${leaseMinutes}m lease expiry (was ${job.status}).`,
      ts,
      job.id,
      job.status
    ).run();
    if ((result.meta.changes ?? 0) === 1) {
      reclaimed += 1;
      await bumpCounter(db, "demo_job_reclaimed");
      await recordEvent(db, {
        eventId: newId("evt"),
        leadId: job.lead_id,
        eventType: "DEMO_JOB_LEASE_RECLAIMED",
        eventData: { demoJobId: job.id, previousStatus: job.status, reclaimCount: nextReclaim, deadRunner: job.claimed_by },
        source: "DEMO",
        actor: "REAPER"
      });
    }
  }
  return { reclaimed, escalated };
}
__name(reapStaleDemoJobs, "reapStaleDemoJobs");
async function replayDeferredEvents(db, send) {
  const ts = nowIso();
  const rows = await db.prepare(`
    SELECT d.id, d.lead_id, d.event_json, d.attempts
      FROM deferred_events d
      JOIN leads l ON l.id = d.lead_id
     WHERE d.status = 'DEFERRED'
       AND l.automation_paused = 0
     ORDER BY d.created_at ASC
     LIMIT 25
  `).all();
  let replayed = 0;
  for (const row of rows.results ?? []) {
    try {
      await send(JSON.parse(row.event_json));
      await db.prepare(`UPDATE deferred_events SET status='REPLAYED', updated_at=? WHERE id=? AND status='DEFERRED'`).bind(ts, row.id).run();
      replayed += 1;
    } catch {
      const attempts = Number(row.attempts ?? 0) + 1;
      const status = attempts >= 5 ? "ABANDONED" : "DEFERRED";
      await db.prepare(`UPDATE deferred_events SET attempts=?, status=?, updated_at=? WHERE id=?`).bind(attempts, status, ts, row.id).run();
      if (status === "ABANDONED") await bumpCounter(db, "deferred_event_abandoned");
    }
  }
  const remaining = await db.prepare(`SELECT COUNT(*) AS c FROM deferred_events WHERE status='DEFERRED'`).first();
  return { replayed, stillDeferred: remaining?.c ?? 0 };
}
__name(replayDeferredEvents, "replayDeferredEvents");
async function localDayStartIso(db, at = /* @__PURE__ */ new Date()) {
  const row = await db.prepare(`SELECT value FROM system_flags WHERE key='OUTREACH_TIMEZONE'`).first();
  const tz = row?.value || "America/Chicago";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const localNow = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMs = localNow - Math.floor(at.getTime() / 1e3) * 1e3;
  const localMidnightUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) - offsetMs;
  return new Date(localMidnightUtc).toISOString();
}
__name(localDayStartIso, "localDayStartIso");

// src/smartlead.ts
var SMARTLEAD_BASE = "https://server.smartlead.ai/api/v1";
function apiKey(env) {
  const key = env.SMARTLEAD_API_KEY;
  if (!key) throw new HttpError(503, "SMARTLEAD_NOT_CONFIGURED", "SMARTLEAD_API_KEY is not configured.");
  return key;
}
__name(apiKey, "apiKey");
async function smartleadRequest(env, path, init = {}) {
  const url = `${SMARTLEAD_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(apiKey(env))}`;
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init.headers || {} } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(502, "SMARTLEAD_REQUEST_FAILED", `Smartlead ${path} failed (${response.status}).`, data);
  return data;
}
__name(smartleadRequest, "smartleadRequest");
async function flag(db, key) {
  const row = await db.prepare(`SELECT value FROM system_flags WHERE key=?`).bind(key).first();
  return row?.value ?? null;
}
__name(flag, "flag");
async function setFlag(db, key, value) {
  const ts = nowIso();
  await db.prepare(`INSERT INTO system_flags(key,value,updated_at,updated_by) VALUES(?,?,?,'SYSTEM') ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(key, value, ts).run();
}
__name(setFlag, "setFlag");
async function smartleadMailboxEmail(db) {
  return await flag(db, "SMARTLEAD_MAILBOX_EMAIL");
}
__name(smartleadMailboxEmail, "smartleadMailboxEmail");
async function setSmartleadMailboxEmail(db, email) {
  await setFlag(db, "SMARTLEAD_MAILBOX_EMAIL", email.trim().toLowerCase());
}
__name(setSmartleadMailboxEmail, "setSmartleadMailboxEmail");
async function webhookSecret(db) {
  const existing = await flag(db, "SMARTLEAD_WEBHOOK_SECRET");
  if (existing) return existing;
  const generated = crypto.randomUUID();
  await setFlag(db, "SMARTLEAD_WEBHOOK_SECRET", generated);
  return generated;
}
__name(webhookSecret, "webhookSecret");
async function findEmailAccountId(env, email) {
  const accounts = await smartleadRequest(env, "/email-accounts");
  const match = accounts.find((a) => (a.from_email || "").toLowerCase() === email.toLowerCase());
  if (!match) throw new HttpError(409, "SMARTLEAD_EMAIL_ACCOUNT_NOT_FOUND", `No Smartlead email account found for ${email}. Connect that mailbox in Smartlead first.`);
  return match.id;
}
__name(findEmailAccountId, "findEmailAccountId");
var WEBSITE_SEQUENCE = [
  { seqNumber: 1, delayDays: 0, subject: "quick question about {{company_name}}", body: `Hey \u2014 came across {{company_name}} while looking at local {{industry}} companies around {{city}}. I build free live website previews for local businesses -- no charge to see it, and if you already have a site you can compare it side by side with what you've got. Want me to put one together for {{company_name}}?

-Connor` },
  { seqNumber: 2, delayDays: 2, subject: "Re: quick question about {{company_name}}", body: `Hey \u2014 just circling back on this. I'm still happy to put together the live preview for {{company_name}} completely free so y'all can see the idea first. Want me to make one?

-Connor` },
  { seqNumber: 3, delayDays: 5, subject: "Re: quick question about {{company_name}}", body: `Quick follow-up \u2014 I'd rather show y'all what I mean than try to sell you over email. I can build the preview for {{company_name}} free and send the live link over. Want me to put it together?

-Connor` },
  { seqNumber: 4, delayDays: 9, subject: "Re: quick question about {{company_name}}", body: `Last note from me \u2014 if y'all ever want me to put together that free live preview for {{company_name}}, just holler.

-Connor` }
];
var CONCIERGE_CAL_URL = "https://cal.com/trenchesgroup/ai-discovery-call";
var CONCIERGE_SEQUENCE = [
  { seqNumber: 1, delayDays: 0, subject: `a systems guy who's been where you are \u2014 quick note for {{company_name}}`, body: `Hey \u2014 I spent 15 years running garage door repair for both commercial and residential accounts, then owned my own permanent/landscape lighting company for 4 years. I know exactly where the slop lives in a business like {{company_name}}'s: missed callbacks, quotes that go cold, scheduling that eats your whole morning -- the stuff that has nothing to do with the actual work and everything to do with why the day feels longer than it should.

I built systems to fix that in my own company. Now I'm doing it faster and cheaper using AI -- what used to take me months to build by hand, I can stand up in days. I do a free 30-minute diagnostic call where I look at your actual workflow and tell you exactly what I'd fix first. No pitch, no obligation -- just someone who's actually run one of these businesses telling you what he sees.

Want to grab a slot? ${CONCIERGE_CAL_URL}

-Connor` },
  { seqNumber: 2, delayDays: 3, subject: `Re: a systems guy who's been where you are \u2014 quick note for {{company_name}}`, body: `Hey \u2014 just circling back. I spent 15+ years in home services (garage doors, then owned a lighting company) before I started building efficiency systems full time. Happy to do a free 30-minute look at where {{company_name}}'s workflow is losing time -- no pitch: ${CONCIERGE_CAL_URL}

-Connor` },
  { seqNumber: 3, delayDays: 7, subject: `Re: a systems guy who's been where you are \u2014 quick note for {{company_name}}`, body: `Last note from me -- if you ever want a free diagnostic on your workflow from someone who's actually run one of these businesses, not just consulted on one, the offer's open: ${CONCIERGE_CAL_URL}

-Connor` }
];
async function ensureCampaign(env, flagKey, name, sequence, postalAddress) {
  const existing = await flag(env.DB, flagKey);
  if (existing) return Number(existing);
  const mailbox = await smartleadMailboxEmail(env.DB);
  if (!mailbox) throw new HttpError(409, "SMARTLEAD_MAILBOX_NOT_CONFIGURED", "Set the Smartlead sending mailbox in outreach settings first.");
  const emailAccountId = await findEmailAccountId(env, mailbox);
  const created = await smartleadRequest(env, "/campaigns/new", { method: "POST", body: JSON.stringify({ name }) });
  const campaignId = created.id;
  const footer = postalAddress.trim() ? `

Trenches Group
${postalAddress.trim()}` : "";
  await smartleadRequest(env, `/campaigns/${campaignId}/sequences`, {
    method: "POST",
    body: JSON.stringify({ sequences: sequence.map((s) => ({ seq_number: s.seqNumber, subject: s.subject, email_body: (s.body + footer).replace(/\n/g, "<br/>"), seq_delay_details: { delay_in_days: s.delayDays } })) })
  });
  await smartleadRequest(env, `/campaigns/${campaignId}/email-accounts`, { method: "POST", body: JSON.stringify({ email_account_ids: [emailAccountId] }) });
  const secret = await webhookSecret(env.DB);
  await smartleadRequest(env, "/webhook/create", {
    method: "POST",
    body: JSON.stringify({
      name: `Trenches OS ${flagKey}`,
      webhook_url: `${env.PUBLIC_BASE_URL}/integrations/smartlead/webhook/${secret}`,
      email_campaign_id: campaignId,
      association_type: 3,
      event_type_map: { EMAIL_REPLIED: true, EMAIL_BOUNCED: true, EMAIL_UNSUBSCRIBED: true }
    })
  });
  await setFlag(env.DB, flagKey, String(campaignId));
  return campaignId;
}
__name(ensureCampaign, "ensureCampaign");
async function ensureWebsiteCampaign(env, postalAddress) {
  return await ensureCampaign(env, "SMARTLEAD_WEBSITE_CAMPAIGN_ID", "Trenches -- Website Offer", WEBSITE_SEQUENCE, postalAddress);
}
__name(ensureWebsiteCampaign, "ensureWebsiteCampaign");
async function ensureConciergeCampaign(env, postalAddress) {
  return await ensureCampaign(env, "SMARTLEAD_CONCIERGE_CAMPAIGN_ID", "Trenches -- AI Concierge", CONCIERGE_SEQUENCE, postalAddress);
}
__name(ensureConciergeCampaign, "ensureConciergeCampaign");
async function campaignStatus(db) {
  const [website, concierge, mailbox] = await Promise.all([
    flag(db, "SMARTLEAD_WEBSITE_CAMPAIGN_ID"),
    flag(db, "SMARTLEAD_CONCIERGE_CAMPAIGN_ID"),
    smartleadMailboxEmail(db)
  ]);
  return { websiteCampaignId: website, conciergeCampaignId: concierge, mailboxEmail: mailbox };
}
__name(campaignStatus, "campaignStatus");
async function addLeadToCampaign(env, campaignId, lead) {
  await smartleadRequest(env, `/campaigns/${campaignId}/leads`, {
    method: "POST",
    body: JSON.stringify({
      lead_list: [{ email: lead.email, company_name: lead.businessName, custom_fields: { business_name: lead.businessName, industry: lead.industry, city: lead.city } }],
      settings: { ignore_global_block_list: false, ignore_unsubscribe_list: false, ignore_duplicate_leads_in_other_campaign: true }
    })
  });
}
__name(addLeadToCampaign, "addLeadToCampaign");
async function enrollLeadInSmartlead(env, lead, track, postalAddress) {
  if (!lead.email) throw new HttpError(409, "EMAIL_REQUIRED", "Lead has no email address.");
  const existing = await env.DB.prepare(`SELECT id FROM outreach_sequences WHERE lead_id=? AND status IN ('ACTIVE','PAUSED')`).bind(lead.id).first();
  if (existing?.id) return existing.id;
  const campaignId = track === "WEBSITE" ? await ensureWebsiteCampaign(env, postalAddress) : await ensureConciergeCampaign(env, postalAddress);
  await addLeadToCampaign(env, campaignId, { email: lead.email, businessName: lead.business_name, industry: lead.industry, city: lead.city });
  const id = newId("seq");
  const ts = nowIso();
  await env.DB.prepare(`INSERT INTO outreach_sequences(id,lead_id,strategy,status,current_step,started_at,next_action_at,created_at,updated_at) VALUES(?,?,?,'ACTIVE',1,?,NULL,?,?)`).bind(id, lead.id, track === "WEBSITE" ? "SMARTLEAD_WEBSITE" : "SMARTLEAD_CONCIERGE", ts, ts, ts).run();
  await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "SMARTLEAD_CAMPAIGN_ENROLLED", eventData: { sequenceId: id, campaignId, track }, source: "SMARTLEAD", actor: "SYSTEM" });
  return id;
}
__name(enrollLeadInSmartlead, "enrollLeadInSmartlead");

// src/concierge.ts
var CONCIERGE_CAL_URL2 = "https://cal.com/trenchesgroup/ai-discovery-call";
var DISQUALIFIED_FOR_GOOD_WEBSITE_PATTERNS = [
  "%Modern website%",
  "%Average functional website%",
  "%digital gap is not strong enough%"
];
async function enrollEligibleConciergeLeads(env, limit, postalAddress) {
  const reasonClauses = DISQUALIFIED_FOR_GOOD_WEBSITE_PATTERNS.map(() => "l.qualification_reason LIKE ?").join(" OR ");
  const rows = await env.DB.prepare(`
    SELECT l.* FROM leads l
    WHERE l.current_state='DISQUALIFIED'
      AND (${reasonClauses})
      AND l.email IS NOT NULL AND trim(l.email)<>''
      AND l.email_verified=1
      AND l.automation_paused=0
      AND NOT EXISTS(SELECT 1 FROM suppressions s WHERE lower(s.email)=lower(l.email))
      AND NOT EXISTS(SELECT 1 FROM outreach_sequences q WHERE q.lead_id=l.id AND q.status IN ('ACTIVE','PAUSED'))
    ORDER BY l.updated_at ASC
    LIMIT ?
  `).bind(...DISQUALIFIED_FOR_GOOD_WEBSITE_PATTERNS, Math.max(1, Math.min(50, limit))).all();
  let enrolled = 0;
  for (const lead of rows.results) {
    await enrollLeadInSmartlead(env, lead, "CONCIERGE", postalAddress);
    enrolled += 1;
  }
  return enrolled;
}
__name(enrollEligibleConciergeLeads, "enrollEligibleConciergeLeads");
async function conciergeStatus(db) {
  const [eligible, sequences] = await Promise.all([
    db.prepare(`
      SELECT COUNT(*) AS n FROM leads l
      WHERE l.current_state='DISQUALIFIED'
        AND (${DISQUALIFIED_FOR_GOOD_WEBSITE_PATTERNS.map(() => "l.qualification_reason LIKE ?").join(" OR ")})
        AND l.email IS NOT NULL AND trim(l.email)<>''
        AND l.email_verified=1
        AND NOT EXISTS(SELECT 1 FROM outreach_sequences q WHERE q.lead_id=l.id AND q.status IN ('ACTIVE','PAUSED'))
    `).bind(...DISQUALIFIED_FOR_GOOD_WEBSITE_PATTERNS).first(),
    db.prepare(`SELECT q.*, l.business_name FROM outreach_sequences q JOIN leads l ON l.id=q.lead_id WHERE q.strategy='SMARTLEAD_CONCIERGE' ORDER BY q.created_at DESC LIMIT 50`).all()
  ]);
  return { stillEligible: eligible?.n ?? 0, sequences: sequences.results, bookingUrl: CONCIERGE_CAL_URL2 };
}
__name(conciergeStatus, "conciergeStatus");

// src/email.ts
function normalizedEmail(value) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "INVALID_EMAIL", "Enter a valid email address.");
  return email;
}
__name(normalizedEmail, "normalizedEmail");
function trimQuotedReply(body) {
  const lines = body.replace(/\r/g, "").split("\n");
  const kept = [];
  for (const line of lines) {
    if (/^On .+wrote:$/i.test(line.trim())) break;
    if (/^From:\s/i.test(line.trim()) && kept.length > 0) break;
    if (line.trim().startsWith(">")) continue;
    kept.push(line);
  }
  return kept.join("\n").trim().slice(0, 8e3);
}
__name(trimQuotedReply, "trimQuotedReply");
function isBounceNotification(from, subject) {
  const fromLocal = from.split("@")[0]?.toLowerCase() ?? "";
  if (fromLocal === "mailer-daemon" || fromLocal === "postmaster") return true;
  const s = subject.toLowerCase();
  return /delivery status notification|undeliverable|undelivered mail|mail delivery failed|returned to sender/.test(s);
}
__name(isBounceNotification, "isBounceNotification");
function classifyEmailInbound(body) {
  const text2 = body.trim().toLowerCase();
  if (/\b(unsubscribe|remove me|take me off|stop emailing|do not email|don't email|no more emails|opt ?out)\b/i.test(text2)) return "OPT_OUT";
  return classifyInbound(body);
}
__name(classifyEmailInbound, "classifyEmailInbound");
async function settings(db) {
  const rows = await db.prepare(`SELECT key,value FROM system_flags WHERE key IN ('OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED','OUTREACH_EMAIL_TEST_MODE','OUTREACH_EMAIL_LIVE_MODE','OUTREACH_EMAIL_AUTO_REPLY_MODE','OUTREACH_DAILY_EMAIL_CAP','OUTREACH_FROM_NAME','OUTREACH_BUSINESS_POSTAL_ADDRESS','OUTREACH_WEBSITE_ENABLED','OUTREACH_CONCIERGE_ENABLED')`).all();
  const map = new Map(rows.results.map((r) => [r.key, r.value]));
  const capRaw = Number(map.get("OUTREACH_DAILY_EMAIL_CAP") || 10);
  return {
    orchestratorEnabled: map.get("OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED") === "true",
    emailTestMode: map.get("OUTREACH_EMAIL_TEST_MODE") !== "false",
    emailLiveMode: map.get("OUTREACH_EMAIL_LIVE_MODE") === "true",
    autoReplyMode: map.get("OUTREACH_EMAIL_AUTO_REPLY_MODE") || "DRAFT_ONLY",
    dailyCap: Number.isFinite(capRaw) ? Math.max(1, Math.min(100, Math.floor(capRaw))) : 10,
    fromName: map.get("OUTREACH_FROM_NAME") || "Connor | Trenches Group",
    postalAddress: map.get("OUTREACH_BUSINESS_POSTAL_ADDRESS") || "",
    // Independent per-track kill switches -- website vs. concierge are different
    // pitches to different lead pools and need to be toggleable separately from
    // each other (and from the shared live-mode/orchestrator master switches).
    websiteEnabled: map.get("OUTREACH_WEBSITE_ENABLED") !== "false",
    conciergeEnabled: map.get("OUTREACH_CONCIERGE_ENABLED") !== "false"
  };
}
__name(settings, "settings");
async function updateEmailSettings(db, input, actor) {
  const updates = [];
  if (typeof input.fromName === "string") updates.push(["OUTREACH_FROM_NAME", input.fromName.trim().slice(0, 160)]);
  if (typeof input.postalAddress === "string") updates.push(["OUTREACH_BUSINESS_POSTAL_ADDRESS", input.postalAddress.trim().slice(0, 500)]);
  if (typeof input.dailyCap === "number" && Number.isFinite(input.dailyCap)) updates.push(["OUTREACH_DAILY_EMAIL_CAP", String(Math.max(1, Math.min(100, Math.floor(input.dailyCap))))]);
  if (typeof input.orchestratorEnabled === "boolean") updates.push(["OUTREACH_AUTONOMOUS_ORCHESTRATOR_ENABLED", String(input.orchestratorEnabled)]);
  if (typeof input.liveMode === "boolean") {
    if (input.liveMode) {
      const mailbox = await smartleadMailboxEmail(db);
      const s = await settings(db);
      if (!mailbox) throw new HttpError(409, "SMARTLEAD_MAILBOX_REQUIRED", "Set the Smartlead sending mailbox before enabling live email.");
      if (!s.postalAddress.trim()) throw new HttpError(409, "POSTAL_ADDRESS_REQUIRED", "Set the business postal address before enabling live email.");
    }
    updates.push(["OUTREACH_EMAIL_LIVE_MODE", String(input.liveMode)]);
  }
  if (typeof input.autoReplyMode === "string") {
    const mode = input.autoReplyMode.toUpperCase();
    if (!["DRAFT_ONLY", "AUTO"].includes(mode)) throw new HttpError(400, "INVALID_REPLY_MODE", "Email auto reply mode must be DRAFT_ONLY or AUTO.");
    updates.push(["OUTREACH_EMAIL_AUTO_REPLY_MODE", mode]);
  }
  if (typeof input.websiteEnabled === "boolean") updates.push(["OUTREACH_WEBSITE_ENABLED", String(input.websiteEnabled)]);
  if (typeof input.conciergeEnabled === "boolean") updates.push(["OUTREACH_CONCIERGE_ENABLED", String(input.conciergeEnabled)]);
  const ts = nowIso();
  for (const [key, value] of updates) await db.prepare(`INSERT INTO system_flags(key,value,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by`).bind(key, value, ts, actor).run();
  if (typeof input.smartleadMailbox === "string" && input.smartleadMailbox.trim()) await setSmartleadMailboxEmail(db, normalizedEmail(input.smartleadMailbox));
}
__name(updateEmailSettings, "updateEmailSettings");
async function addEmailTestAddress(db, email, label, actor) {
  const normalized = normalizedEmail(email);
  await db.prepare(`INSERT INTO outreach_email_test_allowlist(email,label,created_at,created_by) VALUES(?,?,?,?) ON CONFLICT(email) DO UPDATE SET label=excluded.label`).bind(normalized, label?.trim().slice(0, 160) || null, nowIso(), actor).run();
}
__name(addEmailTestAddress, "addEmailTestAddress");
async function removeEmailTestAddress(db, email) {
  await db.prepare(`DELETE FROM outreach_email_test_allowlist WHERE email=?`).bind(normalizedEmail(email)).run();
}
__name(removeEmailTestAddress, "removeEmailTestAddress");
async function emailTestAllowed(db, email) {
  const row = await db.prepare(`SELECT email FROM outreach_email_test_allowlist WHERE email=?`).bind(normalizedEmail(email)).first();
  return Boolean(row);
}
__name(emailTestAllowed, "emailTestAllowed");
async function storeEmailMessage(db, input) {
  if (input.providerMessageId) {
    const existing = await db.prepare(`SELECT id FROM outreach_email_messages WHERE provider_message_id=?`).bind(input.providerMessageId).first();
    if (existing?.id) return existing.id;
  }
  const id = newId("emsg");
  const ts = nowIso();
  await db.prepare(`INSERT INTO outreach_email_messages(id,lead_id,direction,provider_message_id,rfc_message_id,from_email,to_email,subject,body,status,intent,is_test,error_code,error_message,raw_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id, input.leadId ?? null, input.direction, input.providerMessageId ?? null, input.rfcMessageId ?? null, input.from, input.to, input.subject.slice(0, 998), input.body.slice(0, 2e4), input.status, input.intent ?? null, input.isTest ? 1 : 0, input.errorCode ?? null, input.errorMessage ?? null, JSON.stringify(input.raw ?? {}), ts, ts).run();
  return id;
}
__name(storeEmailMessage, "storeEmailMessage");
var NOTIFY_EMAIL = "cmckendry.ai@gmail.com";
var NOTIFY_FROM = "replies@trenchesgroup.com";
function isLikelyAutoresponder(subject, body) {
  const s = `${subject} ${body}`.slice(0, 2e3).toLowerCase();
  return /out of (the )?office|automatic reply|auto-reply|autoreply|vacation (response|reply)|away from (my |the )?(email|office)|currently unavailable|will be back (on|in)|do not reply to this (e-?mail|message)|this is an automated (message|response)/.test(s);
}
__name(isLikelyAutoresponder, "isLikelyAutoresponder");
async function notifyConnor(env, input) {
  try {
    await env.EMAIL.send({
      to: NOTIFY_EMAIL,
      from: { email: NOTIFY_FROM, name: "Trenches Command Center" },
      subject: input.subject,
      text: input.text
    });
  } catch (error) {
    await recordEvent(env.DB, {
      eventId: newId("evt"),
      leadId: input.leadId ?? void 0,
      eventType: input.failureEventType,
      eventData: { error: error instanceof Error ? error.message : String(error) },
      source: "SMARTLEAD",
      actor: "SYSTEM"
    });
  }
}
__name(notifyConnor, "notifyConnor");
async function notifyGenuineReply(env, input) {
  const business = input.lead?.business_name || "Unknown business";
  const leadLink = input.lead ? `${env.PUBLIC_BASE_URL}/admin?leadId=${encodeURIComponent(input.lead.id)}` : "";
  const text2 = [
    `${business} (${input.fromEmail}) replied -- classified as ${input.intent}.`,
    "",
    `Subject: ${input.subject}`,
    "",
    input.body.slice(0, 2e3),
    leadLink ? `
Open in Command Center: ${leadLink}` : "",
    "\nReply to this lead directly from Smartlead -- nothing here sends on your behalf."
  ].join("\n");
  await notifyConnor(env, { subject: `Reply from ${business}`, text: text2, leadId: input.lead?.id, failureEventType: "REPLY_NOTIFICATION_FAILED" });
}
__name(notifyGenuineReply, "notifyGenuineReply");
async function findLeadByEmail(db, email) {
  return await db.prepare(`SELECT * FROM leads WHERE lower(email)=? ORDER BY updated_at DESC LIMIT 1`).bind(normalizedEmail(email)).first();
}
__name(findLeadByEmail, "findLeadByEmail");
async function cancelSequencesForLead(db, leadId, reason) {
  const ts = nowIso();
  await db.prepare(`UPDATE outreach_sequences SET status='CANCELLED',stop_reason=?,updated_at=? WHERE lead_id=? AND status IN ('ACTIVE','PAUSED')`).bind(reason.slice(0, 500), ts, leadId).run();
}
__name(cancelSequencesForLead, "cancelSequencesForLead");
async function safeLeadTransitionForEmail(db, lead, intent) {
  try {
    let current = lead;
    if (["OUTREACH_SENT", "AWAITING_REPLY"].includes(current.current_state)) current = await transitionLead(db, current.id, "REPLIED", "SYSTEM", "Inbound email reply received.", "SMARTLEAD");
    if (intent === "INTERESTED" && current.current_state === "REPLIED") await transitionLead(db, current.id, "INTERESTED", "SYSTEM", "Inbound email classified INTERESTED.", "SMARTLEAD");
    if (intent === "NOT_INTERESTED" && ["AWAITING_REPLY", "REPLIED"].includes(current.current_state)) await transitionLead(db, current.id, "NOT_INTERESTED", "SYSTEM", "Inbound email classified NOT_INTERESTED.", "SMARTLEAD");
    if (intent === "OPT_OUT" && !["OPTED_OUT", "NOT_INTERESTED", "DISQUALIFIED", "BAD_NUMBER", "DUPLICATE", "LOST"].includes(current.current_state)) {
      const allowed = ["OUTREACH_READY", "OUTREACH_SENT", "AWAITING_REPLY", "REPLIED", "INTERESTED", "DEMO_SENT", "DEMO_VIEWED", "PRICING_VIEWED"];
      if (allowed.includes(current.current_state)) await transitionLead(db, current.id, "OPTED_OUT", "SYSTEM", "Email opt-out received.", "SMARTLEAD");
    }
  } catch (error) {
    await bumpCounter(db, "transition_refused_email");
    await recordEvent(db, {
      eventId: newId("evt"),
      leadId: lead.id,
      eventType: "STATE_TRANSITION_REFUSED",
      eventData: { intent, fromState: lead.current_state, message: error instanceof Error ? error.message : String(error) },
      source: "SMARTLEAD",
      actor: "SYSTEM"
    });
  }
}
__name(safeLeadTransitionForEmail, "safeLeadTransitionForEmail");
async function processSmartleadWebhookEvent(env, payload) {
  const fromEmail = payload.lead?.email;
  if (!fromEmail) return { handled: false };
  const lead = await findLeadByEmail(env.DB, fromEmail);
  if (payload.event === "EMAIL_BOUNCED") {
    if (lead) {
      await cancelSequencesForLead(env.DB, lead.id, "Email bounced");
      await env.DB.prepare(`UPDATE leads SET email_verified=0,updated_at=? WHERE id=?`).bind(nowIso(), lead.id).run();
      await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "EMAIL_BOUNCED", eventData: { fromEmail }, source: "SMARTLEAD", actor: "SYSTEM" });
    }
    return { handled: true };
  }
  if (payload.event === "EMAIL_UNSUBSCRIBED") {
    if (lead) await optOutLead(env.DB, { leadId: lead.id, email: fromEmail, phone: lead.phone, source: "SMARTLEAD", evidence: "Smartlead unsubscribe event" });
    return { handled: true };
  }
  if (payload.event !== "EMAIL_REPLIED") {
    if (lead) await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: `SMARTLEAD_${payload.event}`, eventData: { campaignId: payload.campaign_id }, source: "SMARTLEAD", actor: "SYSTEM" });
    return { handled: true };
  }
  const subject = payload.reply?.subject || "(no subject)";
  const rawBody = payload.reply?.body || "";
  if (isBounceNotification(fromEmail, subject)) return { handled: true };
  const body = trimQuotedReply(rawBody);
  if (isLikelyAutoresponder(subject, body)) {
    if (lead) await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "EMAIL_AUTORESPONDER", eventData: { fromEmail, subject: subject.slice(0, 200) }, source: "SMARTLEAD", actor: "SYSTEM" });
    return { handled: true };
  }
  const intent = classifyEmailInbound(body);
  const isTest = await emailTestAllowed(env.DB, fromEmail);
  await storeEmailMessage(env.DB, { leadId: lead?.id, direction: "INBOUND", from: fromEmail, to: await smartleadMailboxEmail(env.DB) || "", subject, body, status: "RECEIVED", intent, isTest, raw: { campaignId: payload.campaign_id, leadId: payload.lead_id } });
  if (!lead) return { handled: true };
  await cancelSequencesForLead(env.DB, lead.id, `Inbound email reply: ${intent}`);
  if (intent === "OPT_OUT") await optOutLead(env.DB, { leadId: lead.id, email: fromEmail, phone: lead.phone, source: "SMARTLEAD", evidence: body.slice(0, 500) });
  await safeLeadTransitionForEmail(env.DB, lead, intent);
  await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "EMAIL_INBOUND_RECEIVED", eventData: { intent, isTest, campaignId: payload.campaign_id }, source: "SMARTLEAD", actor: "SYSTEM" });
  if (!isTest && intent !== "OPT_OUT") await notifyGenuineReply(env, { lead, fromEmail, subject, body, intent });
  if (lead.current_state === "DISQUALIFIED" && intent !== "OPT_OUT") {
    await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "CONCIERGE_REPLY_RECEIVED", eventData: { intent, isTest }, source: "SMARTLEAD", actor: "SYSTEM" });
    return { handled: true };
  }
  const decision = await processConversationInbound(env.DB, lead, intent, body, null);
  const conversationOutcome = decision.action === "TRIGGER_DEMO" ? "DEMO_APPROVED" : decision.action;
  await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "CONVERSATION_OUTCOME", eventData: { conversationOutcome }, source: "SMARTLEAD", actor: "SYSTEM" });
  return { handled: true };
}
__name(processSmartleadWebhookEvent, "processSmartleadWebhookEvent");
async function enrollEligibleWebsiteLeads(env, limit) {
  const s = await settings(env.DB);
  if (!s.orchestratorEnabled || !s.emailLiveMode || !s.websiteEnabled) return 0;
  const rows = await env.DB.prepare(`
    SELECT l.* FROM leads l
    WHERE l.priority IN ('A','B') AND l.validation_status='VALID' AND l.website_gap_status IN ('ELIGIBLE','MANUAL_OVERRIDE') AND l.email IS NOT NULL AND trim(l.email)<>''
      AND l.email_verified=1 AND l.current_state='QUALIFIED' AND l.automation_paused=0
      AND NOT EXISTS(SELECT 1 FROM suppressions s WHERE lower(s.email)=lower(l.email))
      AND NOT EXISTS(SELECT 1 FROM outreach_sequences q WHERE q.lead_id=l.id AND q.status IN ('ACTIVE','PAUSED'))
    ORDER BY CASE l.priority WHEN 'A' THEN 0 ELSE 1 END,l.opportunity_score DESC,l.updated_at ASC
    LIMIT ?
  `).bind(Math.max(1, Math.min(50, limit))).all();
  let enrolled = 0;
  for (const lead of rows.results) {
    await enrollLeadInSmartlead(env, lead, "WEBSITE", s.postalAddress);
    await transitionAfterInitialSend(env.DB, lead);
    enrolled += 1;
  }
  return enrolled;
}
__name(enrollEligibleWebsiteLeads, "enrollEligibleWebsiteLeads");
async function emailsSentToday(db) {
  const dayStart = await localDayStartIso(db);
  const row = await db.prepare(`SELECT COUNT(*) AS count FROM outreach_sequences WHERE status='ACTIVE' AND strategy LIKE 'SMARTLEAD_%' AND created_at>=?`).bind(dayStart).first();
  return row?.count ?? 0;
}
__name(emailsSentToday, "emailsSentToday");
async function transitionAfterInitialSend(db, lead) {
  try {
    let current = lead;
    if (current.current_state === "QUALIFIED") current = await transitionLead(db, current.id, "OUTREACH_READY", "SYSTEM", "Autonomous email outreach approved by deterministic gate.", "OUTREACH");
    if (current.current_state === "OUTREACH_READY") current = await transitionLead(db, current.id, "OUTREACH_SENT", "SYSTEM", "Enrolled in Smartlead outreach campaign.", "SMARTLEAD");
    if (current.current_state === "OUTREACH_SENT") await transitionLead(db, current.id, "AWAITING_REPLY", "SYSTEM", "Waiting for email reply.", "SMARTLEAD");
  } catch (error) {
    await bumpCounter(db, "transition_refused_email_initial_send");
    await recordEvent(db, {
      eventId: newId("evt"),
      leadId: lead.id,
      eventType: "STATE_TRANSITION_REFUSED",
      eventData: { fromState: lead.current_state, message: error instanceof Error ? error.message : String(error) },
      source: "OUTREACH",
      actor: "SYSTEM"
    });
  }
}
__name(transitionAfterInitialSend, "transitionAfterInitialSend");
async function runAutonomousOutreach(env) {
  const s = await settings(env.DB);
  let enrolled = 0;
  let conciergeEnrolled = 0;
  if (s.orchestratorEnabled && s.emailLiveMode) {
    const today = await emailsSentToday(env.DB);
    const slots = Math.max(0, s.dailyCap - today);
    if (slots > 0 && s.websiteEnabled) enrolled = await enrollEligibleWebsiteLeads(env, Math.min(10, slots));
    if (slots > 0 && s.conciergeEnabled) conciergeEnrolled = await enrollEligibleConciergeLeads(env, Math.min(10, slots), s.postalAddress);
  }
  return { enrolled, conciergeEnrolled, settings: s };
}
__name(runAutonomousOutreach, "runAutonomousOutreach");
async function emailOutreachStatus(db, env) {
  const [allow, messages, sequences, s, campaigns, secret] = await Promise.all([
    db.prepare(`SELECT email,label,created_at FROM outreach_email_test_allowlist ORDER BY created_at DESC LIMIT 50`).all(),
    db.prepare(`SELECT m.*,l.business_name FROM outreach_email_messages m LEFT JOIN leads l ON l.id=m.lead_id ORDER BY m.created_at DESC LIMIT 40`).all(),
    db.prepare(`SELECT q.*,l.business_name,l.priority FROM outreach_sequences q JOIN leads l ON l.id=q.lead_id ORDER BY q.created_at DESC LIMIT 40`).all(),
    settings(db),
    campaignStatus(db),
    webhookSecret(db)
  ]);
  return {
    smartleadConfigured: Boolean(env.SMARTLEAD_API_KEY),
    smartleadMailbox: campaigns.mailboxEmail,
    smartleadWebsiteCampaignId: campaigns.websiteCampaignId,
    smartleadConciergeCampaignId: campaigns.conciergeCampaignId,
    webhookUrl: `${env.PUBLIC_BASE_URL}/integrations/smartlead/webhook/${secret}`,
    replyModel: "HUMAN_IN_SMARTLEAD",
    notifyEmail: NOTIFY_EMAIL,
    settings: s,
    allowlist: allow.results,
    recentMessages: messages.results,
    sequences: sequences.results,
    voiceMode: "DISABLED",
    socialMode: "DISABLED",
    smsLiveLocked: true
  };
}
__name(emailOutreachStatus, "emailOutreachStatus");
async function handleEmailUnsubscribe(env, token) {
  const row = await env.DB.prepare(`SELECT token,lead_id,email,used_at FROM outreach_unsubscribe_tokens WHERE token=?`).bind(token).first();
  if (!row) return new Response("Invalid unsubscribe link.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (!row.used_at) {
    const ts = nowIso();
    await env.DB.prepare(`UPDATE outreach_unsubscribe_tokens SET used_at=? WHERE token=?`).bind(ts, token).run();
    await optOutLead(env.DB, { leadId: row.lead_id, email: row.email, source: "EMAIL_UNSUBSCRIBE", evidence: "One-click unsubscribe link" });
    await recordEvent(env.DB, { eventId: newId("evt"), leadId: row.lead_id, eventType: "EMAIL_UNSUBSCRIBED", eventData: { email: row.email }, source: "EMAIL", actor: "PROSPECT" });
  }
  return new Response('<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:40px"><h1>You are unsubscribed.</h1><p>Trenches Group will not send additional outreach emails to this address.</p></body>', { headers: { "content-type": "text/html; charset=utf-8" } });
}
__name(handleEmailUnsubscribe, "handleEmailUnsubscribe");
async function getEmailOutreachSettings(db) {
  return await settings(db);
}
__name(getEmailOutreachSettings, "getEmailOutreachSettings");
async function sendEmailTest(env, input) {
  await notifyConnor(env, {
    subject: input.subject || "Trenches OS notification test",
    text: `${input.message || "Trenches notification test."}

(Test requested for ${input.email}; notifications always go to ${NOTIFY_EMAIL}, never to a lead.)`,
    leadId: input.leadId,
    failureEventType: "TEST_NOTIFICATION_FAILED"
  });
  return { ok: true, notifiedEmail: NOTIFY_EMAIL };
}
__name(sendEmailTest, "sendEmailTest");

// src/stripe.ts
var STRIPE_API = "https://api.stripe.com/v1";
function envSecret(env, key) {
  const value = env[key];
  if (!value) throw new HttpError(503, "STRIPE_NOT_CONFIGURED", `${key} is not configured.`);
  return value;
}
__name(envSecret, "envSecret");
async function priceCents(db, key, fallbackCents) {
  const row = await db.prepare("SELECT value FROM system_flags WHERE key=?").bind(key).first();
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallbackCents;
}
__name(priceCents, "priceCents");
async function stripeFetch(env, path, params) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${envSecret(env, "STRIPE_SECRET_KEY")}`, "content-type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  const data = await response.json();
  if (!response.ok) {
    const err = data.error;
    throw new HttpError(502, "STRIPE_REQUEST_FAILED", String(err?.message || "Stripe request failed."));
  }
  return data;
}
__name(stripeFetch, "stripeFetch");
async function tryTransition(db, leadId, to, reason) {
  try {
    await transitionLead(db, leadId, to, "SYSTEM", reason, "STRIPE");
  } catch (error) {
    await bumpCounter(db, "transition_refused_stripe");
    await recordEvent(db, {
      eventId: newId("evt"),
      leadId,
      eventType: "STATE_TRANSITION_REFUSED",
      eventData: { to, reason, message: error instanceof Error ? error.message : String(error) },
      source: "STRIPE",
      actor: "SYSTEM"
    });
  }
}
__name(tryTransition, "tryTransition");
var CHECKOUT_ELIGIBLE_STATES = ["DEMO_SENT", "DEMO_VIEWED", "PRICING_VIEWED", "CHECKOUT_STARTED"];
async function createCheckoutSession(env, slug, leadId, domainAddon) {
  const lead = await getLead(env.DB, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  if (!CHECKOUT_ELIGIBLE_STATES.includes(lead.current_state)) {
    throw new HttpError(409, "CHECKOUT_NOT_AVAILABLE", `Checkout is not available from state ${lead.current_state}.`);
  }
  if (lead.current_state === "DEMO_SENT" || lead.current_state === "DEMO_VIEWED") {
    await tryTransition(env.DB, lead.id, "PRICING_VIEWED", "Prospect reached checkout.");
  }
  const basePriceCents = await priceCents(env.DB, "STRIPE_BASE_PRICE_CENTS", 5e4);
  const domainPriceCents = await priceCents(env.DB, "STRIPE_DOMAIN_PRICE_CENTS", 12500);
  const totalCents = basePriceCents + (domainAddon ? domainPriceCents : 0);
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("managed_payments[enabled]", "false");
  params.set("client_reference_id", lead.id);
  params.set("success_url", `${env.PUBLIC_BASE_URL}/demo/${encodeURIComponent(slug)}/checkout/success`);
  params.set("cancel_url", `${env.PUBLIC_BASE_URL}/demo/${encodeURIComponent(slug)}`);
  if (lead.email) params.set("customer_email", lead.email);
  params.set("metadata[leadId]", lead.id);
  params.set("metadata[businessName]", lead.business_name.slice(0, 480));
  params.set("metadata[domainAddon]", domainAddon ? "true" : "false");
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(basePriceCents));
  params.set("line_items[0][price_data][product_data][name]", `${lead.business_name} \u2014 Website Build`);
  params.set("line_items[0][price_data][product_data][description]", "Full HTML website build. Includes up to 2 rounds of adjustments before launch.");
  if (domainAddon) {
    params.set("line_items[1][quantity]", "1");
    params.set("line_items[1][price_data][currency]", "usd");
    params.set("line_items[1][price_data][unit_amount]", String(domainPriceCents));
    params.set("line_items[1][price_data][product_data][name]", "Domain setup & publishing");
    params.set("line_items[1][price_data][product_data][description]", "One-time domain registration/connection and publishing.");
  }
  const session = await stripeFetch(env, "/checkout/sessions", params);
  const sessionId = String(session.id);
  const url = session.url;
  if (typeof url !== "string") throw new HttpError(502, "STRIPE_SESSION_URL_MISSING", "Stripe did not return a checkout URL.");
  const ts = nowIso();
  await env.DB.prepare(`
    INSERT INTO client_orders (id, lead_id, domain_addon, amount_total_cents, currency, status, stripe_checkout_session_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'usd', 'PENDING', ?, ?, ?)
  `).bind(newId("order"), lead.id, domainAddon ? 1 : 0, totalCents, sessionId, ts, ts).run();
  await recordEvent(env.DB, {
    eventId: newId("evt"),
    leadId: lead.id,
    eventType: "CHECKOUT_SESSION_CREATED",
    eventData: { sessionId, domainAddon, amountCents: totalCents },
    source: "STRIPE",
    actor: "SYSTEM"
  });
  await tryTransition(env.DB, lead.id, "CHECKOUT_STARTED", "Prospect started Stripe checkout.");
  return url;
}
__name(createCheckoutSession, "createCheckoutSession");
function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(timingSafeEqualHex, "timingSafeEqualHex");
async function verifyStripeSignature(env, rawBody, signatureHeader) {
  if (!signatureHeader) throw new HttpError(400, "STRIPE_SIGNATURE_MISSING", "Missing Stripe-Signature header.");
  const parts = {};
  for (const piece of signatureHeader.split(",")) {
    const [key2, value] = piece.split("=");
    if (key2 && value) parts[key2] = value;
  }
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) throw new HttpError(400, "STRIPE_SIGNATURE_INVALID", "Malformed Stripe-Signature header.");
  const ageSeconds = Math.abs(Date.now() / 1e3 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) throw new HttpError(400, "STRIPE_SIGNATURE_STALE", "Stripe webhook timestamp is too old.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(envSecret(env, "STRIPE_WEBHOOK_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expectedHex = Array.from(new Uint8Array(signatureBytes), (b) => b.toString(16).padStart(2, "0")).join("");
  if (!timingSafeEqualHex(expectedHex, v1)) throw new HttpError(400, "STRIPE_SIGNATURE_MISMATCH", "Stripe signature verification failed.");
  return JSON.parse(rawBody);
}
__name(verifyStripeSignature, "verifyStripeSignature");
async function handleStripeWebhook(env, request) {
  const rawBody = await request.text();
  const event = await verifyStripeSignature(env, rawBody, request.headers.get("stripe-signature"));
  const eventId = String(event.id || "");
  if (!eventId) throw new HttpError(400, "STRIPE_EVENT_ID_MISSING", "Stripe event is missing an id.");
  const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO stripe_webhook_events (id, event_type, received_at) VALUES (?, ?, ?)`).bind(eventId, String(event.type || "unknown"), nowIso()).run();
  if ((inserted.meta.changes ?? 0) === 0) return new Response("ok", { status: 200 });
  if (event.type === "checkout.session.completed") {
    const data = event.data;
    const session = data?.object || {};
    const sessionId = String(session.id || "");
    const metadata = session.metadata;
    const leadId = String(session.client_reference_id || metadata?.leadId || "");
    const order = await env.DB.prepare(`SELECT * FROM client_orders WHERE stripe_checkout_session_id = ?`).bind(sessionId).first();
    if (order && leadId) {
      const ts = nowIso();
      const customerDetails = session.customer_details;
      await env.DB.prepare(`
        UPDATE client_orders SET status='PAID', stripe_payment_intent_id=?, stripe_customer_id=?, stripe_customer_email=?, paid_at=?, updated_at=? WHERE id=?
      `).bind(String(session.payment_intent || ""), String(session.customer || ""), String(customerDetails?.email || ""), ts, ts, order.id).run();
      await tryTransition(env.DB, leadId, "WON", "Stripe checkout completed.");
      await tryTransition(env.DB, leadId, "ONBOARDING", "Payment confirmed; onboarding started.");
      const domainAddon = Number(order.domain_addon) === 1;
      await env.DB.prepare(`
        INSERT INTO client_projects (lead_id, order_id, domain_addon, retainer_status, created_at, updated_at)
        VALUES (?, ?, ?, 'NONE', ?, ?)
        ON CONFLICT(lead_id) DO UPDATE SET order_id=excluded.order_id, domain_addon=excluded.domain_addon, updated_at=excluded.updated_at
      `).bind(leadId, order.id, domainAddon ? 1 : 0, ts, ts).run();
      await recordEvent(env.DB, {
        eventId: newId("evt"),
        leadId,
        eventType: "PAYMENT_RECEIVED",
        eventData: { sessionId, amountCents: order.amount_total_cents, domainAddon },
        source: "STRIPE",
        actor: "PROSPECT"
      });
    }
  }
  await env.DB.prepare(`UPDATE stripe_webhook_events SET processed_at=? WHERE id=?`).bind(nowIso(), eventId).run();
  return new Response("ok", { status: 200 });
}
__name(handleStripeWebhook, "handleStripeWebhook");

// src/demo.ts
function boolFlag(value, fallback) {
  if (value === void 0) return fallback;
  return value.toLowerCase() === "true";
}
__name(boolFlag, "boolFlag");
async function flag2(db, key, fallback) {
  const row = await db.prepare("SELECT value FROM system_flags WHERE key=?").bind(key).first();
  return row?.value ?? fallback;
}
__name(flag2, "flag");
async function demoSettings(db) {
  const [enabled, deliver, model, provider, fallback, minScore, approval] = await Promise.all([
    flag2(db, "DEMO_AUTOMATION_ENABLED", "true"),
    flag2(db, "DEMO_AUTO_DELIVER_EMAIL", "true"),
    flag2(db, "DEMO_BUILDER_MODEL", "sonnet"),
    flag2(db, "DEMO_BUILDER_PROVIDER", "AUTO"),
    flag2(db, "DEMO_PROVIDER_FALLBACK_ENABLED", "true"),
    flag2(db, "DEMO_QUALITY_MIN_SCORE", "90"),
    flag2(db, "DEMO_REQUIRE_APPROVAL", "true")
  ]);
  const normalizedProvider = ["AUTO", "CLAUDE", "OPENAI", "HYPERAGENT"].includes(provider.toUpperCase()) ? provider.toUpperCase() : "AUTO";
  const parsedScore = Number.parseInt(minScore, 10);
  return { automationEnabled: boolFlag(enabled, true), autoDeliverEmail: boolFlag(deliver, true), builderModel: model || "sonnet", builderProvider: normalizedProvider, fallbackEnabled: boolFlag(fallback, true), qualityMinScore: Math.max(85, Math.min(100, Number.isFinite(parsedScore) ? parsedScore : 90)), requireApproval: boolFlag(approval, true) };
}
__name(demoSettings, "demoSettings");
async function updateDemoSettings(db, input, actor) {
  const ts = nowIso();
  const updates = [];
  if (typeof input.automationEnabled === "boolean") updates.push(["DEMO_AUTOMATION_ENABLED", String(input.automationEnabled)]);
  if (typeof input.autoDeliverEmail === "boolean") updates.push(["DEMO_AUTO_DELIVER_EMAIL", String(input.autoDeliverEmail)]);
  if (typeof input.builderModel === "string" && input.builderModel.trim()) updates.push(["DEMO_BUILDER_MODEL", input.builderModel.trim().slice(0, 80)]);
  if (typeof input.builderProvider === "string" && ["AUTO", "CLAUDE", "OPENAI", "HYPERAGENT"].includes(input.builderProvider.toUpperCase())) updates.push(["DEMO_BUILDER_PROVIDER", input.builderProvider.toUpperCase()]);
  if (typeof input.fallbackEnabled === "boolean") updates.push(["DEMO_PROVIDER_FALLBACK_ENABLED", String(input.fallbackEnabled)]);
  if (typeof input.qualityMinScore === "number" && Number.isFinite(input.qualityMinScore)) {
    const score = Math.max(85, Math.min(100, Math.round(input.qualityMinScore)));
    updates.push(["DEMO_QUALITY_MIN_SCORE", String(score)]);
  }
  if (typeof input.requireApproval === "boolean") updates.push(["DEMO_REQUIRE_APPROVAL", String(input.requireApproval)]);
  for (const [key, value] of updates) {
    await db.prepare(`INSERT INTO system_flags(key,value,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at,updated_by=excluded.updated_by`).bind(key, value, ts, actor).run();
  }
}
__name(updateDemoSettings, "updateDemoSettings");
function slugBase(name) {
  return name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64) || "business";
}
__name(slugBase, "slugBase");
async function uniqueSlug(db, businessName2) {
  const base = slugBase(businessName2);
  let slug = base;
  for (let i = 0; i < 20; i += 1) {
    const exists = await db.prepare("SELECT id FROM demo_sites WHERE slug=?").bind(slug).first();
    if (!exists) return slug;
    slug = `${base}-${i + 2}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}
__name(uniqueSlug, "uniqueSlug");
async function tryTransition2(db, leadId, to, reason) {
  try {
    await transitionLead(db, leadId, to, "SYSTEM", reason, "DEMO");
  } catch (error) {
    await bumpCounter(db, "transition_refused_demo");
    await recordEvent(db, {
      eventId: newId("evt"),
      leadId,
      eventType: "STATE_TRANSITION_REFUSED",
      eventData: { to, reason, message: error instanceof Error ? error.message : String(error) },
      source: "DEMO",
      actor: "SYSTEM"
    });
  }
}
__name(tryTransition2, "tryTransition");
async function demoLeadBlockReason(db, lead, stage) {
  if (await isSuppressed(db, lead.phone, lead.email)) return "Lead/contact is suppressed.";
  if (lead.automation_paused) return "Automation is paused for this lead.";
  if (lead.human_required) return "Lead requires human review.";
  const hardBlocked = /* @__PURE__ */ new Set(["DISQUALIFIED", "OPTED_OUT", "NOT_INTERESTED", "BAD_NUMBER", "DUPLICATE", "HUMAN_REVIEW", "LOST", "ERROR", "WON", "ACTIVE_CUSTOMER"]);
  if (hardBlocked.has(lead.current_state)) return `Lead state ${lead.current_state} is not eligible for demo fulfillment.`;
  if (stage === "QUEUE" && lead.current_state !== "DEMO_APPROVED") return `Demo build requires DEMO_APPROVED; current state is ${lead.current_state}.`;
  if (stage === "CLAIM" && lead.current_state !== "DEMO_BUILDING") return `Demo runner requires DEMO_BUILDING; current state is ${lead.current_state}.`;
  if (stage === "COMPLETE" && !["DEMO_BUILDING", "DEMO_QA"].includes(lead.current_state)) return `Demo completion is blocked in state ${lead.current_state}.`;
  if (stage === "DELIVER" && lead.current_state !== "DEMO_READY") return `Demo delivery requires DEMO_READY; current state is ${lead.current_state}.`;
  return null;
}
__name(demoLeadBlockReason, "demoLeadBlockReason");
async function cancelDemoJob(db, jobId, leadId, reason, actor = "SYSTEM") {
  const ts = nowIso();
  await db.prepare(`UPDATE demo_jobs SET status='CANCELLED',last_error=?,updated_at=?,completed_at=COALESCE(completed_at,?) WHERE id=? AND status NOT IN ('CANCELLED','READY')`).bind(reason.slice(0, 1200), ts, ts, jobId).run();
  await recordEvent(db, { eventId: newId("evt"), leadId, eventType: "DEMO_BUILD_CANCELLED", eventData: { demoJobId: jobId, reason }, source: "DEMO", actor });
}
__name(cancelDemoJob, "cancelDemoJob");
async function normalizeDemoApprovedFlags(db, lead, actor = "SYSTEM") {
  if (lead.current_state !== "DEMO_APPROVED") return lead;
  if (!lead.automation_paused && !lead.human_required) return lead;
  if (await isSuppressed(db, lead.phone, lead.email)) return lead;
  const ts = nowIso();
  await db.prepare(`UPDATE leads SET automation_paused=0,human_required=0,updated_at=?,last_action_at=?,version=version+1 WHERE id=?`).bind(ts, ts, lead.id).run();
  await recordEvent(db, {
    eventId: newId("evt"),
    leadId: lead.id,
    eventType: "DEMO_APPROVED_FLAGS_RECONCILED",
    eventData: { automationPausedBefore: lead.automation_paused, humanRequiredBefore: lead.human_required },
    source: "DEMO",
    actor
  });
  return await getLead(db, lead.id) ?? lead;
}
__name(normalizeDemoApprovedFlags, "normalizeDemoApprovedFlags");
async function ensureDemoJob(db, leadId, actor = "SYSTEM") {
  let lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  lead = await normalizeDemoApprovedFlags(db, lead, actor);
  const blocked = await demoLeadBlockReason(db, lead, "QUEUE");
  if (blocked) throw new HttpError(409, "DEMO_LEAD_INELIGIBLE", blocked);
  const settings2 = await demoSettings(db);
  if (!settings2.automationEnabled) throw new HttpError(409, "DEMO_AUTOMATION_DISABLED", "Demo automation is disabled.");
  const existing = await db.prepare(`SELECT id FROM demo_jobs WHERE lead_id=? AND status IN ('PENDING','CLAIMED','BUILDING','QA','READY') ORDER BY created_at DESC LIMIT 1`).bind(leadId).first();
  if (existing?.id) return { jobId: existing.id, created: false };
  const stale = await db.prepare(`SELECT id,status FROM demo_jobs WHERE lead_id=? AND status IN ('FAILED','CANCELLED') ORDER BY created_at DESC LIMIT 1`).bind(leadId).first();
  if (stale?.id) {
    const ts2 = nowIso();
    await db.prepare(`UPDATE demo_jobs SET status='PENDING',attempt_count=0,qa_attempt_count=0,next_retry_at=NULL,claimed_by=NULL,claimed_at=NULL,started_at=NULL,completed_at=NULL,last_error=NULL,model=?,updated_at=? WHERE id=?`).bind(settings2.builderModel, ts2, stale.id).run();
    await recordEvent(db, { eventId: newId("evt"), leadId, eventType: "DEMO_BUILD_REQUEUED", eventData: { demoJobId: stale.id, previousStatus: stale.status, model: settings2.builderModel }, source: "DEMO", actor });
    if (lead.current_state === "DEMO_APPROVED") await tryTransition2(db, leadId, "DEMO_BUILDING", "Demo build re-queued after prospect approval.");
    return { jobId: stale.id, created: false, requeued: true };
  }
  const id = newId("demo");
  const ts = nowIso();
  await db.prepare(`INSERT INTO demo_jobs(id,lead_id,status,attempt_count,max_attempts,qa_attempt_count,max_qa_attempts,model,created_at,updated_at) VALUES(?,?,'PENDING',0,3,0,2,?,?,?)`).bind(id, leadId, settings2.builderModel, ts, ts).run();
  await recordEvent(db, { eventId: newId("evt"), leadId, eventType: "DEMO_BUILD_QUEUED", eventData: { demoJobId: id, model: settings2.builderModel }, source: "DEMO", actor });
  if (lead.current_state === "DEMO_APPROVED") await tryTransition2(db, leadId, "DEMO_BUILDING", "Demo build queued after prospect approval.");
  return { jobId: id, created: true };
}
__name(ensureDemoJob, "ensureDemoJob");
async function claimDemoJob(db, runnerId) {
  const now = nowIso();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const row = await db.prepare(`SELECT * FROM demo_jobs WHERE (status='PENDING' OR (status='FAILED' AND attempt_count<max_attempts AND (next_retry_at IS NULL OR next_retry_at<=?))) ORDER BY created_at LIMIT 1`).bind(now).first();
    if (!row) return null;
    const lead = await getLead(db, row.lead_id);
    if (!lead) {
      await cancelDemoJob(db, row.id, row.lead_id, "Demo job lead disappeared.", "RUNNER");
      continue;
    }
    const blocked = await demoLeadBlockReason(db, lead, "CLAIM");
    if (blocked) {
      await cancelDemoJob(db, row.id, row.lead_id, blocked, "RUNNER");
      continue;
    }
    const nextAttempt = Number(row.attempt_count || 0) + 1;
    const result = await db.prepare(`UPDATE demo_jobs SET status='CLAIMED',attempt_count=?,claimed_by=?,claimed_at=?,started_at=COALESCE(started_at,?),updated_at=?,last_error=NULL WHERE id=? AND status=? AND attempt_count=?`).bind(nextAttempt, runnerId, now, now, now, row.id, row.status, row.attempt_count).run();
    if ((result.meta.changes ?? 0) !== 1) continue;
    const research = await db.prepare(`SELECT * FROM lead_research WHERE lead_id=? ORDER BY researched_at DESC LIMIT 1`).bind(row.lead_id).first();
    const sources = await db.prepare(`SELECT event_data_json,created_at FROM events WHERE lead_id=? AND event_type IN ('PROSPECT_RESEARCH_RECEIVED','CONVERSATION_DECISION','DEMO_CONSENT_CAPTURED') ORDER BY created_at DESC LIMIT 20`).bind(row.lead_id).all();
    await db.prepare(`UPDATE demo_jobs SET status='BUILDING',updated_at=? WHERE id=?`).bind(nowIso(), row.id).run();
    await recordEvent(db, { eventId: newId("evt"), leadId: row.lead_id, eventType: "DEMO_BUILD_STARTED", eventData: { demoJobId: row.id, runnerId, attempt: nextAttempt }, source: "DEMO", actor: "RUNNER" });
    const [settings2, usage] = await Promise.all([
      demoSettings(db),
      db.prepare(`SELECT COALESCE(provider,'CLAUDE') AS provider,COUNT(*) AS jobs FROM demo_jobs WHERE status='READY' GROUP BY COALESCE(provider,'CLAUDE')`).all()
    ]);
    return { job: { ...row, status: "BUILDING", attempt_count: nextAttempt }, lead, research: research ?? null, recentContext: sources.results, settings: settings2, providerUsage: usage.results };
  }
  return null;
}
__name(claimDemoJob, "claimDemoJob");
function bannedHtmlReason(html) {
  const checks = [
    [/<script\b/i, "script tags are not allowed"],
    [/<iframe\b/i, "iframes are not allowed"],
    [/<object\b|<embed\b/i, "embedded objects are not allowed"],
    [/<form\b/i, "forms are not allowed in concept previews"],
    [/javascript\s*:/i, "javascript URLs are not allowed"],
    [/on[a-z]+\s*=/i, "inline event handlers are not allowed"],
    [/<meta[^>]+http-equiv\s*=\s*["']?refresh/i, "meta refresh is not allowed"],
    [/\b(src|href)\s*=\s*["']https?:\/\//i, "external assets/links are not allowed in generated HTML"]
  ];
  for (const [re, reason] of checks) if (re.test(html)) return reason;
  return null;
}
__name(bannedHtmlReason, "bannedHtmlReason");
function injectDemoUrls(html, slug) {
  const cta = `/demo/${encodeURIComponent(slug)}/cta`;
  const quote = `/demo/${encodeURIComponent(slug)}/quote`;
  const withQuote = html.replaceAll("{{QUOTE_URL}}", quote);
  return withQuote.replaceAll("{{CTA_URL}}", cta);
}
__name(injectDemoUrls, "injectDemoUrls");
async function tryDeliverDemoEmail(env, site, lead) {
  const blocked = await demoLeadBlockReason(env.DB, lead, "DELIVER");
  if (blocked) return { sent: false, reason: blocked };
  if (!lead.email) return { sent: false, reason: "Lead has no email." };
  const settings2 = await demoSettings(env.DB);
  if (!settings2.autoDeliverEmail) return { sent: false, reason: "Auto-deliver email disabled." };
  const url = `${env.PUBLIC_BASE_URL}/demo/${site.slug}`;
  try {
    await notifyConnor(env, {
      subject: `Demo ready: ${lead.business_name}`,
      text: `${lead.business_name} (${lead.email}) has a QA-passed demo ready:

${url}

Send it to them from Smartlead -- nothing here sends on your behalf.`,
      leadId: lead.id,
      failureEventType: "DEMO_NOTIFICATION_FAILED"
    });
    const ts = nowIso();
    await env.DB.prepare(`UPDATE demo_sites SET status='PUBLISHED',published_at=COALESCE(published_at,?),updated_at=? WHERE id=?`).bind(ts, ts, site.id).run();
    await env.DB.prepare(`INSERT INTO demo_events(id,demo_site_id,lead_id,event_type,metadata_json,created_at) VALUES(?,?,?,'DEMO_SENT',?,?)`).bind(newId("de"), site.id, lead.id, JSON.stringify({ email: lead.email }), ts).run();
    await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "DEMO_SENT", eventData: { demoSiteId: site.id, url, email: lead.email }, source: "DEMO", actor: "SYSTEM" });
    if (lead.current_state === "DEMO_READY") await tryTransition2(env.DB, lead.id, "DEMO_SENT", "QA-passed demo ready; Connor notified to deliver via Smartlead.");
    return { sent: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "DEMO_DELIVERY_DEFERRED", eventData: { demoSiteId: site.id, reason: reason.slice(0, 700) }, source: "DEMO", actor: "SYSTEM" });
    return { sent: false, reason };
  }
}
__name(tryDeliverDemoEmail, "tryDeliverDemoEmail");
async function completeDemoJob(env, jobId, input) {
  const job = await env.DB.prepare("SELECT * FROM demo_jobs WHERE id=?").bind(jobId).first();
  if (!job) throw new HttpError(404, "DEMO_JOB_NOT_FOUND", "Demo job not found.");
  if (!["CLAIMED", "BUILDING", "QA"].includes(job.status)) throw new HttpError(409, "DEMO_JOB_NOT_ACTIVE", "Demo job is not active.");
  const lead = await getLead(env.DB, job.lead_id);
  if (!lead) throw new Error("Demo lead missing.");
  const blocked = await demoLeadBlockReason(env.DB, lead, "COMPLETE");
  if (blocked) {
    await cancelDemoJob(env.DB, job.id, lead.id, blocked, "RUNNER");
    throw new HttpError(409, "DEMO_LEAD_INELIGIBLE", blocked);
  }
  let html = String(input.html || "").trim();
  if (html.length < 3e3) throw new HttpError(422, "DEMO_HTML_TOO_SMALL", "Generated demo HTML is too small.");
  const banned = bannedHtmlReason(html);
  if (banned) throw new HttpError(422, "DEMO_HTML_UNSAFE", banned);
  if (!html.includes("{{CTA_URL}}")) throw new HttpError(422, "DEMO_CTA_MISSING", "Generated demo must include {{CTA_URL}}.");
  const settings2 = await demoSettings(env.DB);
  if (Number(input.qaScore) < settings2.qualityMinScore) throw new HttpError(422, "DEMO_QA_SCORE_LOW", `Demo QA score must be at least ${settings2.qualityMinScore}.`);
  const slug = await uniqueSlug(env.DB, lead.business_name);
  const siteId = newId("site");
  const ts = nowIso();
  html = injectDemoUrls(html, slug);
  await env.DB.prepare(`UPDATE demo_sites SET status='ARCHIVED',updated_at=? WHERE lead_id=? AND status IN ('READY','PUBLISHED')`).bind(ts, lead.id).run();
  await env.DB.batch([
    env.DB.prepare(`UPDATE demo_jobs SET status='READY',provider=?,model=?,completed_at=?,updated_at=?,last_error=NULL WHERE id=?`).bind(input.provider ?? "CLAUDE", input.model ?? job.model ?? "sonnet", ts, ts, jobId),
    env.DB.prepare(`INSERT INTO demo_sites(id,lead_id,demo_job_id,slug,status,html,version,qa_score,qa_report_json,provider,model,published_at,created_at,updated_at) VALUES(?,?,?,?,'READY',?,1,?,?,?,?,?,NULL,?,?)`).bind(siteId, lead.id, jobId, slug, html, Math.max(0, Math.min(100, Math.round(Number(input.qaScore) || 0))), JSON.stringify(input.qaReport ?? {}), input.provider ?? "CLAUDE", input.model ?? job.model ?? "sonnet", ts, ts),
    env.DB.prepare(`INSERT INTO demo_events(id,demo_site_id,lead_id,event_type,metadata_json,created_at) VALUES(?,?,?,'QA_PASSED',?,?)`).bind(newId("de"), siteId, lead.id, JSON.stringify({ qaScore: input.qaScore }), ts)
  ]);
  await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "DEMO_QA_PASSED", eventData: { demoJobId: jobId, demoSiteId: siteId, slug, qaScore: input.qaScore }, source: "DEMO", actor: "RUNNER" });
  if (lead.current_state === "DEMO_BUILDING") await tryTransition2(env.DB, lead.id, "DEMO_QA", "Demo build generated; QA passed by runner.");
  const refreshed = await getLead(env.DB, lead.id);
  if (refreshed?.current_state === "DEMO_QA") await tryTransition2(env.DB, lead.id, "DEMO_READY", "Demo QA passed and preview is published.");
  const site = await env.DB.prepare("SELECT * FROM demo_sites WHERE id=?").bind(siteId).first();
  if (!site) throw new Error("Demo site failed to persist.");
  const delivery = settings2.requireApproval ? { sent: false, reason: "Awaiting Command Center approval." } : await tryDeliverDemoEmail(env, site, await getLead(env.DB, lead.id) ?? lead);
  return { siteId, slug, url: `${env.PUBLIC_BASE_URL}/demo/${slug}`, qaScore: input.qaScore, delivery, approvalRequired: settings2.requireApproval };
}
__name(completeDemoJob, "completeDemoJob");
async function failDemoJob(db, jobId, error, retryable = true) {
  const job = await db.prepare("SELECT * FROM demo_jobs WHERE id=?").bind(jobId).first();
  if (!job) throw new HttpError(404, "DEMO_JOB_NOT_FOUND", "Demo job not found.");
  const attempt = Number(job.attempt_count || 0);
  const max = Number(job.max_attempts || 3);
  const canRetry = retryable && attempt < max;
  const ts = nowIso();
  const next = canRetry ? new Date(Date.now() + Math.min(30, Math.pow(2, attempt) * 3) * 6e4).toISOString() : null;
  await db.prepare(`UPDATE demo_jobs SET status=?,next_retry_at=?,last_error=?,updated_at=? WHERE id=?`).bind(canRetry ? "FAILED" : "FAILED", next, error.slice(0, 1800), ts, jobId).run();
  await recordEvent(db, { eventId: newId("evt"), leadId: job.lead_id, eventType: canRetry ? "DEMO_BUILD_RETRY_SCHEDULED" : "DEMO_BUILD_FAILED", eventData: { demoJobId: jobId, attempt, max, nextRetryAt: next, error: error.slice(0, 800) }, source: "DEMO", actor: "RUNNER" });
  if (!canRetry) {
    const lead = await getLead(db, job.lead_id);
    if (lead?.current_state === "DEMO_BUILDING" || lead?.current_state === "DEMO_QA") await tryTransition2(db, lead.id, "HUMAN_REVIEW", "Demo builder exhausted retries.");
  }
  return { status: canRetry ? "RETRY_SCHEDULED" : "FAILED", attempt, max, nextRetryAt: next };
}
__name(failDemoJob, "failDemoJob");
async function demoStatus(db, env) {
  const approved = await db.prepare(`SELECT * FROM leads WHERE current_state='DEMO_APPROVED' ORDER BY updated_at DESC LIMIT 200`).all();
  for (const lead of approved.results || []) await normalizeDemoApprovedFlags(db, lead, "DEMO_STATUS");
  const [settings2, jobs, sites, providerUsage2] = await Promise.all([
    demoSettings(db),
    db.prepare(`SELECT j.*,l.business_name,l.email,l.current_state AS lead_current_state FROM demo_jobs j JOIN leads l ON l.id=j.lead_id ORDER BY j.created_at DESC LIMIT 50`).all(),
    db.prepare(`SELECT s.id,s.lead_id,s.slug,s.status,s.qa_score,s.provider,s.model,s.published_at,s.last_viewed_at,s.view_count,s.cta_click_count,s.created_at,s.updated_at,l.business_name,l.email,l.current_state AS lead_current_state FROM demo_sites s JOIN leads l ON l.id=s.lead_id ORDER BY s.created_at DESC LIMIT 50`).all(),
    db.prepare(`SELECT COALESCE(provider,'CLAUDE') AS provider,COUNT(*) AS jobs FROM demo_jobs WHERE status='READY' GROUP BY COALESCE(provider,'CLAUDE')`).all()
  ]);
  const eligible = await db.prepare(`SELECT id,business_name,current_state FROM leads WHERE current_state='DEMO_APPROVED' AND automation_paused=0 AND human_required=0 ORDER BY updated_at DESC LIMIT 200`).all();
  const jobRows = (jobs.results || []).map((row) => ({ ...row, current_state: row.lead_current_state ?? row.current_state }));
  const siteRows = (sites.results || []).map((row) => ({ ...row, current_state: row.lead_current_state ?? row.current_state }));
  return { settings: settings2, jobs: jobRows, sites: siteRows, providerUsage: providerUsage2.results, eligibleLeads: eligible.results, publicBaseUrl: env.PUBLIC_BASE_URL };
}
__name(demoStatus, "demoStatus");
async function reconcileApprovedDemoJobs(db, limit = 100) {
  const settings2 = await demoSettings(db);
  if (!settings2.automationEnabled) return { checked: 0, queued: 0, requeued: 0, blocked: 0 };
  const rows = await db.prepare(`SELECT * FROM leads WHERE current_state='DEMO_APPROVED' ORDER BY updated_at ASC LIMIT ?`).bind(limit).all();
  let checked = 0, queued = 0, requeued = 0, blocked = 0;
  for (const initial of rows.results || []) {
    checked += 1;
    try {
      const result = await ensureDemoJob(db, initial.id, "DEMO_SELF_HEAL");
      if (result.requeued) requeued += 1;
      else if (result.created) queued += 1;
    } catch (error) {
      blocked += 1;
      await recordEvent(db, { eventId: newId("evt"), leadId: initial.id, eventType: "DEMO_APPROVED_SELF_HEAL_BLOCKED", eventData: { message: error instanceof Error ? error.message : String(error) }, source: "DEMO", actor: "SYSTEM" });
    }
  }
  return { checked, queued, requeued, blocked };
}
__name(reconcileApprovedDemoJobs, "reconcileApprovedDemoJobs");
async function deliverDemoSite(env, siteId) {
  const site = await env.DB.prepare("SELECT * FROM demo_sites WHERE id=?").bind(siteId).first();
  if (!site) throw new HttpError(404, "DEMO_SITE_NOT_FOUND", "Demo site not found.");
  const lead = await getLead(env.DB, site.lead_id);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  return await tryDeliverDemoEmail(env, site, lead);
}
__name(deliverDemoSite, "deliverDemoSite");
async function serveDemo(db, slug, request) {
  const site = await db.prepare(`SELECT * FROM demo_sites WHERE slug=? AND status IN ('READY','PUBLISHED')`).bind(slug).first();
  if (!site) return new Response("Demo not found.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const ts = nowIso();
  await db.batch([
    db.prepare(`UPDATE demo_sites SET view_count=view_count+1,last_viewed_at=?,updated_at=? WHERE id=?`).bind(ts, ts, site.id),
    db.prepare(`INSERT INTO demo_events(id,demo_site_id,lead_id,event_type,metadata_json,created_at) VALUES(?,?,?,'VIEW',?,?)`).bind(newId("de"), site.id, site.lead_id, JSON.stringify({ ua: request.headers.get("user-agent")?.slice(0, 300) || null }), ts)
  ]);
  const lead = await getLead(db, site.lead_id);
  if (lead?.current_state === "DEMO_SENT") await tryTransition2(db, lead.id, "DEMO_VIEWED", "Prospect opened live demo preview.");
  return new Response(site.html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; connect-src 'none'; script-src 'none'", "x-frame-options": "DENY", "referrer-policy": "no-referrer" } });
}
__name(serveDemo, "serveDemo");
async function handleDemoCta(db, slug) {
  const site = await db.prepare(`SELECT * FROM demo_sites WHERE slug=? AND status IN ('READY','PUBLISHED')`).bind(slug).first();
  if (!site) return new Response("Demo not found.", { status: 404 });
  const ts = nowIso();
  await db.batch([
    db.prepare(`UPDATE demo_sites SET cta_click_count=cta_click_count+1,updated_at=? WHERE id=?`).bind(ts, site.id),
    db.prepare(`INSERT INTO demo_events(id,demo_site_id,lead_id,event_type,metadata_json,created_at) VALUES(?,?,?,'CTA_CLICK','{}',?)`).bind(newId("de"), site.id, site.lead_id, ts)
  ]);
  const lead = await getLead(db, site.lead_id);
  if (lead && (lead.current_state === "DEMO_SENT" || lead.current_state === "DEMO_VIEWED")) await tryTransition2(db, lead.id, "PRICING_VIEWED", "Prospect clicked the demo conversion CTA.");
  await recordEvent(db, { eventId: newId("evt"), leadId: site.lead_id, eventType: "DEMO_CTA_CLICKED", eventData: { demoSiteId: site.id, slug }, source: "DEMO", actor: "PROSPECT" });
  const buyBase = `/demo/${encodeURIComponent(slug)}/checkout`;
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Next step</title><body style="margin:0;background:#0b0d10;color:#f6f7f8;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><main style="max-width:680px;padding:40px;text-align:center"><div style="font-size:12px;letter-spacing:.14em;color:#c9f24d">TRENCHES GROUP</div><h1 style="font-size:42px;margin:12px 0">Glad y\u2019all like it.</h1><p style="color:#aeb6c3;font-size:18px;line-height:1.6">$500 flat for the full website build, including up to 2 rounds of adjustments before launch. Do you also need help setting up and publishing a domain?</p><div style="display:grid;gap:10px;max-width:380px;margin:24px auto 0"><a href="${buyBase}?domain=yes" style="display:block;padding:16px;border-radius:10px;background:#c9f24d;color:#0b0d10;text-decoration:none;font-weight:800">Yes \u2014 add domain setup ($125)</a><a href="${buyBase}?domain=no" style="display:block;padding:16px;border-radius:10px;border:1px solid #394250;color:#fff;text-decoration:none;font-weight:800">No, I already have one</a></div><a href="/demo/${encodeURIComponent(slug)}" style="display:inline-block;margin-top:22px;color:#aeb6c3;font-size:13px">Back to preview</a></main></body>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "referrer-policy": "no-referrer" } });
}
__name(handleDemoCta, "handleDemoCta");
async function startCheckout(env, slug, domainAddon) {
  const site = await env.DB.prepare(`SELECT * FROM demo_sites WHERE slug=? AND status IN ('READY','PUBLISHED')`).bind(slug).first();
  if (!site) return new Response("Demo not found.", { status: 404 });
  const url = await createCheckoutSession(env, slug, site.lead_id, domainAddon);
  return new Response(null, { status: 302, headers: { location: url } });
}
__name(startCheckout, "startCheckout");
function serveCheckoutSuccess(slug) {
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment received</title><body style="margin:0;background:#0b0d10;color:#f6f7f8;font-family:system-ui;display:grid;place-items:center;min-height:100vh"><main style="max-width:640px;padding:40px;text-align:center"><div style="font-size:12px;letter-spacing:.14em;color:#c9f24d">TRENCHES GROUP</div><h1 style="font-size:36px;margin:12px 0">Payment received \u2014 thank you.</h1><p style="color:#aeb6c3;font-size:18px;line-height:1.6">We'll be in touch shortly to kick off the build. You'll get up to 2 rounds of adjustments before launch.</p><a href="/demo/${encodeURIComponent(slug)}" style="display:inline-block;margin-top:18px;color:#0b0d10;background:#c9f24d;padding:13px 18px;border-radius:8px;text-decoration:none;font-weight:800">Back to preview</a></main></body>`, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "referrer-policy": "no-referrer" } });
}
__name(serveCheckoutSuccess, "serveCheckoutSuccess");
async function createStaticDemoPreview(db, leadId, actor = "COMMAND_CENTER") {
  const lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  const existing = await db.prepare(`SELECT id FROM demo_sites WHERE lead_id=? AND status IN ('READY','PUBLISHED')`).bind(lead.id).first();
  if (existing) throw new HttpError(409, "DEMO_ALREADY_EXISTS", "This lead already has an active preview.");
  const slug = await uniqueSlug(db, lead.business_name), siteId = newId("site"), ts = nowIso();
  const name = lead.business_name.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const location = ([lead.city, lead.state].filter(Boolean).join(", ") || "your area").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const html = injectDemoUrls(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name} | Independent redesign concept</title><style>body{margin:0;font-family:Arial,sans-serif;color:#11233b;background:#fff}header{background:#0d2138;color:#fff;padding:20px 7%;display:flex;justify-content:space-between;align-items:center}.brand{font-weight:800;font-size:20px}.hero{padding:85px 7%;background:linear-gradient(130deg,#0d2138,#1d5d80);color:#fff}.hero h1{font-size:clamp(36px,6vw,64px);max-width:760px;margin:0 0 18px}.hero p{font-size:19px;max-width:600px;line-height:1.6}.btn{display:inline-block;margin-top:16px;background:#c8ef40;color:#102031;padding:15px 20px;border-radius:6px;text-decoration:none;font-weight:800}.content{padding:56px 7%;max-width:1200px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{border:1px solid #d7e0e7;padding:22px;border-radius:10px}.note{margin:36px 7%;padding:16px;background:#f0f5f7;border-left:4px solid #c8ef40;font-size:13px}@media(max-width:700px){.grid{grid-template-columns:1fr}header{display:block}.hero{padding:54px 7%}}</style></head><body><header><div class="brand">${name}</div><div>${location}</div></header><main><section class="hero"><div style="font-size:12px;letter-spacing:.12em;font-weight:800;color:#c8ef40">INDEPENDENT REDESIGN CONCEPT</div><h1>A faster, clearer way for customers to reach ${name}.</h1><p>This sample shows how a modern service-business website can guide visitors toward a quick request without adding extra work for the team.</p><a class="btn" href="{{QUOTE_URL}}">Start a Quick Request</a></section><section class="content"><h2>Built for the moment a customer needs help.</h2><div class="grid"><div class="card"><h3>Clear first impression</h3><p>Focused messaging and an obvious next step from the first screen.</p></div><div class="card"><h3>Quick request flow</h3><p>Visitors can describe what they need in a few guided steps.</p></div><div class="card"><h3>Ready for follow-up</h3><p>A future live version can route requests into the Command Center automatically.</p></div></div></section></main><div class="note">Independent redesign concept by Trenches Group. This preview is not affiliated with, endorsed by, or operated by ${name}; it does not submit real customer requests.</div></body></html>`, slug);
  await db.batch([
    db.prepare(`INSERT INTO demo_sites(id,lead_id,demo_job_id,slug,status,html,version,qa_score,qa_report_json,provider,model,published_at,created_at,updated_at) VALUES(?,?,NULL,?,'READY',?,1,100,?,'STATIC_TEMPLATE','no-ai',NULL,?,?)`).bind(siteId, lead.id, slug, html, JSON.stringify({ mode: "NO_COST_STATIC_TEMPLATE", checks: ["viewport", "two CTAs", "independent redesign disclosure", "no scripts"] }), ts, ts),
    db.prepare(`INSERT INTO demo_events(id,demo_site_id,lead_id,event_type,metadata_json,created_at) VALUES(?,?,?,'QA_PASSED',?,?)`).bind(newId("de"), siteId, lead.id, JSON.stringify({ mode: "NO_COST_STATIC_TEMPLATE", qaScore: 100 }), ts)
  ]);
  await recordEvent(db, { eventId: newId("evt"), leadId: lead.id, eventType: "STATIC_DEMO_PREVIEW_CREATED", eventData: { demoSiteId: siteId, slug, mode: "NO_COST_STATIC_TEMPLATE" }, source: "DEMO", actor });
  return { siteId, slug };
}
__name(createStaticDemoPreview, "createStaticDemoPreview");
async function serveDemoQuote(db, slug, request) {
  const site = await db.prepare(`SELECT * FROM demo_sites WHERE slug=? AND status IN ('READY','PUBLISHED')`).bind(slug).first();
  if (!site) return new Response("Demo not found.", { status: 404 });
  const lead = await getLead(db, site.lead_id);
  const business = lead?.business_name || "this business";
  const url = new URL(request.url), service = url.searchParams.get("service"), timing = url.searchParams.get("timing");
  const back = `/demo/${encodeURIComponent(slug)}`;
  const base = `/demo/${encodeURIComponent(slug)}/quote`;
  const choices = ["Request an estimate", "Schedule service", "Ask a question"];
  const serviceStep = !service ? `<h1>What can we help with?</h1><p>Choose an option to see how a customer can start their request in seconds.</p><div class="choices">${choices.map((x) => `<a href="${base}?service=${encodeURIComponent(x)}">${x}</a>`).join("")}</div>` : !timing ? `<h1>When do you need help?</h1><p>For: <b>${service}</b></p><div class="choices"><a href="${base}?service=${encodeURIComponent(service)}&timing=As+soon+as+possible">As soon as possible</a><a href="${base}?service=${encodeURIComponent(service)}&timing=This+week">This week</a><a href="${base}?service=${encodeURIComponent(service)}&timing=Just+planning">Just planning</a></div>` : `<h1>Request captured.</h1><p>A real site would send this request directly into ${business}'s Command Center\u2014without staff chasing down the basics.</p><div class="summary"><b>${service}</b><br>${timing}</div><a class="primary" href="${back}">Back to website</a>`;
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Fast Quote Preview</title><style>body{margin:0;background:#0b0d10;color:#f5f6f8;font:16px/1.55 system-ui;display:grid;place-items:center;min-height:100vh}.box{width:min(620px,92vw);padding:38px;border:1px solid #303744;border-radius:16px;background:#12161d}.tag{color:#d8ff3e;font-size:12px;font-weight:800;letter-spacing:.1em}h1{font-size:34px;line-height:1.12;margin:12px 0}.choices{display:grid;gap:10px;margin:24px 0}.choices a,.primary{display:block;padding:16px;border:1px solid #394250;border-radius:10px;color:#fff;text-decoration:none;background:#171c25}.choices a:hover,.primary{border-color:#d8ff3e}.primary{background:#d8ff3e;color:#0b0d10;text-align:center;font-weight:800;margin-top:22px}.summary{padding:16px;background:#171c25;border-radius:10px;margin-top:20px}</style><main class="box"><div class="tag">SPEED-TO-QUOTE PREVIEW</div>${serviceStep}<p style="color:#9ca5b4;font-size:12px;margin-top:24px">Interactive concept by Trenches Group. This does not submit a real customer request.</p></main>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "referrer-policy": "no-referrer" } });
}
__name(serveDemoQuote, "serveDemoQuote");

// src/gmail.ts
var GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
var GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
var GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
var SENDER_NAME = "Connor McKendry | Trenches Group";
function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(bytesToBase64Url, "bytesToBase64Url");
function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
__name(base64UrlToBytes, "base64UrlToBytes");
async function encryptionKey(env) {
  if (!env.CREDENTIAL_ENCRYPTION_KEY) throw new HttpError(503, "CREDENTIAL_KEY_MISSING", "CREDENTIAL_ENCRYPTION_KEY is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.CREDENTIAL_ENCRYPTION_KEY));
  return await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
__name(encryptionKey, "encryptionKey");
async function encryptSecret(env, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(env), new TextEncoder().encode(value)));
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(cipher)}`;
}
__name(encryptSecret, "encryptSecret");
async function decryptSecret(env, value) {
  const [iv, cipher] = value.split(".");
  if (!iv || !cipher) throw new HttpError(500, "CREDENTIAL_DECRYPT_FAILED", "Stored credential is invalid.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64UrlToBytes(iv) }, await encryptionKey(env), base64UrlToBytes(cipher));
  return new TextDecoder().decode(plain);
}
__name(decryptSecret, "decryptSecret");
var credentials = /* @__PURE__ */ __name((db) => db.prepare(`SELECT client_id, encrypted_client_secret FROM outreach_provider_credentials WHERE provider='GOOGLE_GMAIL'`).first(), "credentials");
var connection = /* @__PURE__ */ __name((db) => db.prepare(`SELECT email_address, encrypted_refresh_token, status, last_error, connected_at FROM gmail_connections WHERE id='primary'`).first(), "connection");
var callbackUrl = /* @__PURE__ */ __name((env) => `${env.PUBLIC_BASE_URL}/integrations/gmail/oauth/callback`, "callbackUrl");
async function accessToken(env) {
  const [creds, conn] = await Promise.all([credentials(env.DB), connection(env.DB)]);
  if (!creds?.client_id || !creds.encrypted_client_secret || !conn) throw new HttpError(409, "GMAIL_NOT_CONNECTED", 'Google Workspace is not connected. Click "Connect Google" in the Quotes panel.');
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: await decryptSecret(env, creds.encrypted_client_secret),
      refresh_token: await decryptSecret(env, conn.encrypted_refresh_token),
      grant_type: "refresh_token"
    }).toString()
  });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== "string") {
    const reason = String(data.error_description || data.error || "Token refresh failed").slice(0, 500);
    await env.DB.prepare(`UPDATE gmail_connections SET status='ERROR',last_error=?,updated_at=? WHERE id='primary'`).bind(reason, nowIso()).run();
    throw new HttpError(409, "GMAIL_RECONNECT_REQUIRED", `Google sign-in expired (${reason}). Click "Connect Google" in the Quotes panel to reconnect.`);
  }
  if (conn.status !== "CONNECTED") await env.DB.prepare(`UPDATE gmail_connections SET status='CONNECTED',last_error=NULL,updated_at=? WHERE id='primary'`).bind(nowIso()).run();
  return { token: data.access_token, email: conn.email_address };
}
__name(accessToken, "accessToken");
async function mailboxStatus(env) {
  const conn = await connection(env.DB);
  if (!conn) return { connected: false };
  try {
    const { email } = await accessToken(env);
    return { connected: true, email };
  } catch (error) {
    return { connected: false, email: conn.email_address, error: error instanceof Error ? error.message : String(error) };
  }
}
__name(mailboxStatus, "mailboxStatus");
async function startGmailConnect(env) {
  const creds = await credentials(env.DB);
  if (!creds?.client_id) throw new HttpError(409, "GOOGLE_OAUTH_NOT_CONFIGURED", "The Google OAuth client is not configured.");
  const state = crypto.randomUUID();
  const ts = nowIso();
  await env.DB.prepare(`INSERT INTO oauth_states(state,provider,expires_at,created_at) VALUES(?,'GOOGLE_GMAIL',?,?)`).bind(state, new Date(Date.now() + 10 * 6e4).toISOString(), ts).run();
  const params = new URLSearchParams({
    client_id: creds.client_id,
    redirect_uri: callbackUrl(env),
    response_type: "code",
    scope: `${GMAIL_SEND_SCOPE} openid email`,
    access_type: "offline",
    prompt: "consent",
    login_hint: "connor@trenchesgroup.com",
    state
  });
  return { authUrl: `${GOOGLE_AUTH_URL}?${params.toString()}` };
}
__name(startGmailConnect, "startGmailConnect");
function page(title, body, status = 200) {
  const esc2 = /* @__PURE__ */ __name((v) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), "esc");
  return new Response(`<!doctype html><meta charset="utf-8"><title>${esc2(title)}</title><body style="font-family:system-ui;padding:40px;max-width:560px"><h1>${esc2(title)}</h1><p>${esc2(body)}</p><p>You can close this tab and return to the Command Center.</p></body>`, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
__name(page, "page");
async function handleGmailConnectCallback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  if (url.searchParams.get("error")) return page("Google connection cancelled", `Google returned: ${url.searchParams.get("error")}`, 400);
  const stateRow = await env.DB.prepare(`SELECT expires_at FROM oauth_states WHERE state=? AND provider='GOOGLE_GMAIL'`).bind(state).first();
  if (!stateRow || Date.parse(stateRow.expires_at) < Date.now() || !code) return page("Connection link expired", "Start again from the Quotes panel.", 400);
  await env.DB.prepare(`DELETE FROM oauth_states WHERE state=?`).bind(state).run();
  const creds = await credentials(env.DB);
  if (!creds?.client_id || !creds.encrypted_client_secret) return page("Google is not configured", "The Google OAuth client is missing.", 500);
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: creds.client_id, client_secret: await decryptSecret(env, creds.encrypted_client_secret), redirect_uri: callbackUrl(env), grant_type: "authorization_code" }).toString()
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok || typeof token.access_token !== "string") return page("Google connection failed", String(token.error_description || token.error || "Token exchange failed."), 502);
  if (typeof token.refresh_token !== "string") return page("Google connection failed", "Google did not grant offline access. Try again and approve all requested access.", 502);
  const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token.access_token)}`).then((r) => r.json()).catch(() => ({}));
  if (typeof info.email !== "string") return page("Google connection failed", "Could not confirm which Google account signed in. Try again.", 502);
  const email = info.email.toLowerCase();
  const ts = nowIso();
  await env.DB.prepare(`
    INSERT INTO gmail_connections(id,email_address,encrypted_refresh_token,scopes,history_id,status,connected_at,last_sync_at,last_error,updated_at)
    VALUES('primary',?,?,?,NULL,'CONNECTED',?,NULL,NULL,?)
    ON CONFLICT(id) DO UPDATE SET email_address=excluded.email_address,encrypted_refresh_token=excluded.encrypted_refresh_token,scopes=excluded.scopes,status='CONNECTED',last_error=NULL,connected_at=excluded.connected_at,updated_at=excluded.updated_at
  `).bind(email, await encryptSecret(env, token.refresh_token), typeof token.scope === "string" ? token.scope : GMAIL_SEND_SCOPE, ts, ts).run();
  await recordEvent(env.DB, { eventId: newId("evt"), eventType: "GMAIL_CONNECTED", eventData: { email, purpose: "QUOTES" }, source: "GMAIL", actor: "ADMIN" });
  return page("Google Workspace connected", `Quotes will now be sent from ${email}.`);
}
__name(handleGmailConnectCallback, "handleGmailConnectCallback");
function encodeHeader(value) {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(clean)))}?=`;
}
__name(encodeHeader, "encodeHeader");
function address(name, email) {
  return name ? `${encodeHeader(`"${name.replace(/["\\]/g, "")}"`)} <${email}>` : email;
}
__name(address, "address");
function base64Lines(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary).replace(/.{1,76}/g, "$&\r\n");
}
__name(base64Lines, "base64Lines");
async function sendGmail(env, input) {
  const { token, email } = await accessToken(env);
  const boundary = `tg_${crypto.randomUUID()}`;
  const mime = [
    `From: ${address(SENDER_NAME, email)}`,
    `To: ${address(input.toName ?? null, input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(input.html),
    `--${boundary}--`,
    ""
  ].join("\r\n");
  const response = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: bytesToBase64Url(new TextEncoder().encode(mime)) })
  });
  const data = await response.json();
  if (!response.ok || typeof data.id !== "string") {
    const error = data.error;
    throw new HttpError(502, "GMAIL_SEND_FAILED", `Gmail rejected the email: ${error?.message || response.status}`);
  }
  return { messageId: data.id, from: email };
}
__name(sendGmail, "sendGmail");

// src/quotes.ts
var VIEW_ALERT_TO = "cmckendry.ai@gmail.com";
function text(value, field, max, required = false) {
  if (value === void 0 || value === null || value === "") {
    if (required) throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new HttpError(400, "VALIDATION_ERROR", `${field} must be text.`);
  const clean = value.trim();
  if (required && !clean) throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
  if (clean.length > max) throw new HttpError(400, "VALIDATION_ERROR", `${field} is too long (max ${max} characters).`);
  return clean || null;
}
__name(text, "text");
function parseLineItems(value) {
  if (!Array.isArray(value)) throw new HttpError(400, "VALIDATION_ERROR", "lineItems must be a list.");
  if (value.length > 50) throw new HttpError(400, "VALIDATION_ERROR", "A quote can have at most 50 line items.");
  return value.map((raw, i) => {
    if (!raw || typeof raw !== "object") throw new HttpError(400, "VALIDATION_ERROR", `Line ${i + 1} is invalid.`);
    const item = raw;
    const description = text(item.description, `Line ${i + 1} description`, 500, true);
    const quantity = Number(item.quantity ?? 1);
    const unitCents = Number(item.unitCents);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1e4) throw new HttpError(400, "VALIDATION_ERROR", `Line ${i + 1} quantity must be between 0 and 10,000.`);
    if (!Number.isInteger(unitCents) || unitCents < 0 || unitCents > 1e8) throw new HttpError(400, "VALIDATION_ERROR", `Line ${i + 1} price is invalid.`);
    const billing = item.billing === "MONTHLY" ? "MONTHLY" : "ONE_TIME";
    return { description, quantity, unitCents, billing };
  });
}
__name(parseLineItems, "parseLineItems");
function parseValidUntil(value) {
  const raw = text(value, "validUntil", 10);
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) throw new HttpError(400, "VALIDATION_ERROR", "validUntil must be a date (YYYY-MM-DD).");
  return raw;
}
__name(parseValidUntil, "parseValidUntil");
function parseQuoteInput(body) {
  return {
    leadId: text(body.leadId, "leadId", 120),
    businessName: text(body.businessName, "Business name", 180, true),
    contactName: text(body.contactName, "Contact name", 180),
    title: text(body.title, "Quote title", 200, true),
    message: text(body.message, "Message", 5e3),
    terms: text(body.terms, "Terms", 5e3),
    lineItems: parseLineItems(body.lineItems ?? []),
    validUntil: parseValidUntil(body.validUntil)
  };
}
__name(parseQuoteInput, "parseQuoteInput");
function totals(items) {
  let oneTime = 0;
  let monthly = 0;
  for (const item of items) {
    const amount = Math.round(item.quantity * item.unitCents);
    if (item.billing === "MONTHLY") monthly += amount;
    else oneTime += amount;
  }
  return { oneTime, monthly };
}
__name(totals, "totals");
async function nextQuoteNumber(db) {
  const row = await db.prepare(`SELECT MAX(CAST(substr(quote_number, 3) AS INTEGER)) AS n FROM quotes WHERE quote_number LIKE 'Q-%'`).first();
  return `Q-${Math.max(1e3, row?.n ?? 1e3) + 1}`;
}
__name(nextQuoteNumber, "nextQuoteNumber");
async function logQuoteEvent(db, input) {
  await db.prepare(`INSERT INTO quote_events(id,quote_id,send_token,event_type,source,email,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(newId("qevt"), input.quoteId, input.sendToken ?? null, input.eventType, input.source, input.email ?? null, JSON.stringify(input.detail ?? {}), nowIso()).run();
}
__name(logQuoteEvent, "logQuoteEvent");
async function requireQuote(db, id) {
  const quote = await db.prepare(`SELECT * FROM quotes WHERE id=?`).bind(id).first();
  if (!quote) throw new HttpError(404, "QUOTE_NOT_FOUND", "Quote not found.");
  return quote;
}
__name(requireQuote, "requireQuote");
async function createQuote(db, body, actor) {
  const input = parseQuoteInput(body);
  if (input.leadId && !await getLead(db, input.leadId)) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  const { oneTime, monthly } = totals(input.lineItems);
  const id = newId("quote");
  const ts = nowIso();
  for (let attempt = 0; ; attempt++) {
    const number = await nextQuoteNumber(db);
    try {
      await db.prepare(`INSERT INTO quotes(id,quote_number,lead_id,business_name,contact_name,title,message,terms,line_items_json,one_time_cents,monthly_cents,valid_until,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'DRAFT',?,?,?)`).bind(id, number, input.leadId, input.businessName, input.contactName, input.title, input.message, input.terms, JSON.stringify(input.lineItems), oneTime, monthly, input.validUntil, actor, ts, ts).run();
      break;
    } catch (error) {
      if (attempt >= 3 || !String(error).includes("UNIQUE")) throw error;
    }
  }
  await logQuoteEvent(db, { quoteId: id, eventType: "CREATED", source: "ADMIN", detail: { actor } });
  if (input.leadId) await recordEvent(db, { eventId: newId("evt"), leadId: input.leadId, eventType: "QUOTE_CREATED", eventData: { quoteId: id, title: input.title, oneTimeCents: oneTime, monthlyCents: monthly }, source: "QUOTES", actor });
  return await requireQuote(db, id);
}
__name(createQuote, "createQuote");
async function updateQuote(db, id, body, actor) {
  const existing = await requireQuote(db, id);
  if (existing.status === "VOID") throw new HttpError(409, "QUOTE_VOID", "This quote was voided. Create a new quote instead.");
  const input = parseQuoteInput(body);
  if (input.leadId && !await getLead(db, input.leadId)) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  const { oneTime, monthly } = totals(input.lineItems);
  await db.prepare(`UPDATE quotes SET lead_id=?,business_name=?,contact_name=?,title=?,message=?,terms=?,line_items_json=?,one_time_cents=?,monthly_cents=?,valid_until=?,updated_at=? WHERE id=?`).bind(input.leadId, input.businessName, input.contactName, input.title, input.message, input.terms, JSON.stringify(input.lineItems), oneTime, monthly, input.validUntil, nowIso(), id).run();
  await logQuoteEvent(db, { quoteId: id, eventType: "UPDATED", source: "ADMIN", detail: { actor } });
  return await requireQuote(db, id);
}
__name(updateQuote, "updateQuote");
async function setQuoteStatus(db, id, status, actor) {
  const quote = await requireQuote(db, id);
  if (typeof status !== "string" || !["ACCEPTED", "DECLINED", "VOID"].includes(status)) {
    throw new HttpError(400, "VALIDATION_ERROR", "status must be ACCEPTED, DECLINED, or VOID.");
  }
  await db.prepare(`UPDATE quotes SET status=?,updated_at=? WHERE id=?`).bind(status, nowIso(), id).run();
  await logQuoteEvent(db, { quoteId: id, eventType: `MARKED_${status}`, source: "ADMIN", detail: { actor, from: quote.status } });
  if (quote.lead_id) await recordEvent(db, { eventId: newId("evt"), leadId: quote.lead_id, eventType: `QUOTE_${status}`, eventData: { quoteId: id, quoteNumber: quote.quote_number }, source: "QUOTES", actor });
  return await requireQuote(db, id);
}
__name(setQuoteStatus, "setQuoteStatus");
async function listQuotes(db, leadId) {
  const where = leadId ? "WHERE q.lead_id=?" : "";
  const statement = db.prepare(`
    SELECT q.id,q.quote_number,q.lead_id,q.business_name,q.contact_name,q.title,q.one_time_cents,q.monthly_cents,q.valid_until,q.status,
      q.first_sent_at,q.last_sent_at,q.open_count,q.first_opened_at,q.last_opened_at,q.view_count,q.first_viewed_at,q.last_viewed_at,q.created_at,q.updated_at,
      (SELECT group_concat(email, ', ') FROM (SELECT DISTINCT s.email FROM quote_sends s WHERE s.quote_id=q.id AND s.status='SENT')) AS sent_to
    FROM quotes q ${where} ORDER BY q.updated_at DESC LIMIT 300
  `);
  const rows = await (leadId ? statement.bind(leadId) : statement).all();
  return rows.results;
}
__name(listQuotes, "listQuotes");
async function getQuoteDetail(env, id) {
  const quote = await requireQuote(env.DB, id);
  const [sends, events] = await Promise.all([
    env.DB.prepare(`SELECT token,email,recipient_name,included_invite,status,error,open_count,first_opened_at,last_opened_at,view_count,first_viewed_at,last_viewed_at,sent_by,sent_at FROM quote_sends WHERE quote_id=? ORDER BY sent_at DESC`).bind(id).all(),
    env.DB.prepare(`SELECT event_type,source,email,user_agent,detail_json,created_at FROM quote_events WHERE quote_id=? ORDER BY created_at DESC LIMIT 200`).bind(id).all()
  ]);
  const site = siteBase(env);
  return {
    quote: { ...quote, line_items: JSON.parse(quote.line_items_json) },
    sends: sends.results.map((s) => ({ ...s, view_url: `${site}/estimate/?t=${encodeURIComponent(String(s.token))}` })),
    events: events.results
  };
}
__name(getQuoteDetail, "getQuoteDetail");
function siteBase(env) {
  return String(env.SITE_BASE_URL || "https://trenchesgroup.com").replace(/\/+$/, "");
}
__name(siteBase, "siteBase");
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(randomToken, "randomToken");
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
__name(esc, "esc");
function money(cents) {
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
__name(money, "money");
function formatDate(isoDate) {
  return (/* @__PURE__ */ new Date(`${isoDate}T12:00:00Z`)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
__name(formatDate, "formatDate");
function totalLines(quote) {
  const lines = [];
  if (quote.one_time_cents > 0 || quote.monthly_cents === 0) lines.push(`One-time: ${money(quote.one_time_cents)}`);
  if (quote.monthly_cents > 0) lines.push(`Monthly: ${money(quote.monthly_cents)}/mo`);
  return lines;
}
__name(totalLines, "totalLines");
function buildQuoteEmail(quote, input) {
  const greetingName = input.recipientName || quote.contact_name;
  const greeting = greetingName ? `Hi ${greetingName.split(/\s+/)[0]},` : "Hi there,";
  const intro = quote.message || `Thanks for the conversation. Here's the estimate we discussed for ${quote.business_name}.`;
  const validity = quote.valid_until ? `Valid through ${formatDate(quote.valid_until)}` : "";
  const subject = `Your estimate from Trenches Group: ${quote.title} (${quote.quote_number})`;
  const portalText = input.inviteUrl ? `Your Trenches Group client portal is ready. It's already approved, so you'll see full pricing and every estimate we send you in one place:
${input.inviteUrl}` : `Every estimate we send you is saved in your client portal:
${input.portalUrl}`;
  const text2 = [
    greeting,
    "",
    intro,
    "",
    `${quote.title} (${quote.quote_number})`,
    ...totalLines(quote),
    validity,
    "",
    `View your estimate: ${input.viewUrl}`,
    "",
    portalText,
    "",
    "Questions? Just reply to this email.",
    "",
    "Connor McKendry",
    "Trenches Group"
  ].filter((line, i, all) => line !== "" || all[i - 1] !== "").join("\n");
  const totalsHtml = totalLines(quote).map((line) => {
    const [label, value] = line.split(": ");
    return `<tr><td style="padding:4px 0;color:#6D7782;font-size:14px">${esc(label)}</td><td style="padding:4px 0;text-align:right;font-size:18px;font-weight:700;color:#1B1F23">${esc(value)}</td></tr>`;
  }).join("");
  const button = /* @__PURE__ */ __name((href, label, bg) => `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding:14px 26px;border-radius:3px">${esc(label)}</a>`, "button");
  const portalHtml = input.inviteUrl ? `<div style="margin-top:28px;padding:20px;background:#F4F5F6;border-left:3px solid #375A7F;border-radius:3px">
         <div style="font-weight:700;font-size:15px;color:#1B1F23;margin-bottom:6px">Your client portal is ready</div>
         <div style="font-size:14px;line-height:1.6;color:#3d444b;margin-bottom:14px">We've already approved your account, so you'll see full pricing and every estimate we send you in one place.</div>
         ${button(input.inviteUrl, "Create my portal account", "#375A7F")}
       </div>` : `<p style="margin-top:24px;font-size:14px;line-height:1.6;color:#3d444b">Every estimate we send you is saved in your <a href="${esc(input.portalUrl)}" style="color:#C65C2E">client portal</a>.</p>`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F4F5F6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:4px;overflow:hidden;font-family:Montserrat,Segoe UI,Helvetica,Arial,sans-serif">
<tr><td style="background:#1B1F23;padding:18px 28px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Trenches Group</td></tr>
<tr><td style="padding:32px 28px 8px;color:#1B1F23">
  <p style="margin:0 0 14px;font-size:15px">${esc(greeting)}</p>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;white-space:pre-line">${esc(intro)}</p>
  <div style="border-top:3px solid #C65C2E;background:#FBFBFC;padding:18px 20px;border-radius:3px">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6D7782">Estimate ${esc(quote.quote_number)}</div>
    <div style="font-size:18px;font-weight:700;margin:4px 0 12px">${esc(quote.title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${totalsHtml}</table>
    ${validity ? `<div style="font-size:12px;color:#6D7782;margin-top:8px">${esc(validity)}</div>` : ""}
  </div>
  <div style="text-align:center;margin:28px 0 4px">${button(input.viewUrl, "View your estimate", "#C65C2E")}</div>
  ${portalHtml}
  <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#3d444b">Questions? Just reply to this email.</p>
  <p style="margin:14px 0 28px;font-size:14px;line-height:1.5">Connor McKendry<br><span style="color:#6D7782">Trenches Group</span></p>
</td></tr>
</table>
</td></tr></table>
<img src="${esc(input.pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">
</body></html>`;
  return { subject, text: text2, html };
}
__name(buildQuoteEmail, "buildQuoteEmail");
async function sendQuote(env, id, body, actor) {
  const quote = await requireQuote(env.DB, id);
  if (quote.status === "VOID") throw new HttpError(409, "QUOTE_VOID", "This quote was voided and cannot be sent.");
  const lineItems = JSON.parse(quote.line_items_json);
  if (!lineItems.length) throw new HttpError(409, "QUOTE_EMPTY", "Add at least one line item before sending.");
  const email = (text(body.email, "Email", 320, true) ?? "").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "INVALID_EMAIL", "Enter a valid email address.");
  const recipientName = text(body.name, "Recipient name", 180);
  const member = await env.DB.prepare(`SELECT id FROM members WHERE lower(email)=?`).bind(email).first();
  const token = randomToken();
  const site = siteBase(env);
  const viewUrl = `${site}/estimate/?t=${encodeURIComponent(token)}`;
  const inviteUrl = member ? null : `${site}/portal/?invite=${encodeURIComponent(token)}`;
  const message = buildQuoteEmail(quote, {
    recipientName,
    viewUrl,
    pixelUrl: `${site}/api/estimates/open/${encodeURIComponent(token)}.gif`,
    inviteUrl,
    portalUrl: `${site}/portal/`
  });
  const ts = nowIso();
  await env.DB.prepare(`INSERT INTO quote_sends(token,quote_id,email,recipient_name,included_invite,status,sent_by,sent_at) VALUES(?,?,?,?,?,'SENT',?,?)`).bind(token, id, email, recipientName, inviteUrl ? 1 : 0, actor, ts).run();
  try {
    const result = await sendGmail(env, { to: email, toName: recipientName, subject: message.subject, text: message.text, html: message.html });
    await env.DB.prepare(`UPDATE quote_sends SET provider_message_id=? WHERE token=?`).bind(result.messageId, token).run();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await env.DB.prepare(`UPDATE quote_sends SET status='FAILED',error=? WHERE token=?`).bind(reason.slice(0, 1e3), token).run();
    await logQuoteEvent(env.DB, { quoteId: id, eventType: "SEND_FAILED", source: "ADMIN", email, sendToken: token, detail: { actor, error: reason.slice(0, 500) } });
    throw new HttpError(error instanceof HttpError ? error.status : 502, "QUOTE_SEND_FAILED", `Email could not be sent: ${reason}`, { viewUrl });
  }
  await env.DB.prepare(`UPDATE quotes SET status=CASE WHEN status='DRAFT' THEN 'SENT' ELSE status END,first_sent_at=COALESCE(first_sent_at,?),last_sent_at=?,updated_at=? WHERE id=?`).bind(ts, ts, ts, id).run();
  await logQuoteEvent(env.DB, { quoteId: id, eventType: "SENT", source: "ADMIN", email, sendToken: token, detail: { actor, includedInvite: Boolean(inviteUrl) } });
  if (quote.lead_id) await recordEvent(env.DB, { eventId: newId("evt"), leadId: quote.lead_id, eventType: "QUOTE_SENT", eventData: { quoteId: id, quoteNumber: quote.quote_number, email, includedInvite: Boolean(inviteUrl) }, source: "QUOTES", actor });
  return { sent: true, email, viewUrl, includedInvite: Boolean(inviteUrl), quote: await requireQuote(env.DB, id) };
}
__name(sendQuote, "sendQuote");
async function sendFirstViewAlerts(env) {
  const due = await env.DB.prepare(`
    SELECT q.id, q.quote_number, q.title, q.business_name, q.first_viewed_at,
      (SELECT e.email FROM quote_events e WHERE e.quote_id=q.id AND e.event_type='VIEWED' ORDER BY e.created_at ASC LIMIT 1) AS viewer
    FROM quotes q WHERE q.first_viewed_at IS NOT NULL AND q.view_alert_sent_at IS NULL LIMIT 10
  `).all();
  let sent = 0;
  for (const q of due.results) {
    const claim = await env.DB.prepare(`UPDATE quotes SET view_alert_sent_at=? WHERE id=? AND view_alert_sent_at IS NULL`).bind(nowIso(), q.id).run();
    if ((claim.meta.changes ?? 0) !== 1) continue;
    const link = `${env.PUBLIC_BASE_URL}/admin`;
    const who = q.viewer || q.business_name;
    try {
      await sendGmail(env, {
        to: VIEW_ALERT_TO,
        subject: `${q.business_name} just opened estimate ${q.quote_number}`,
        text: `${who} opened "${q.title}" (${q.quote_number}) for the first time.

See every view in the Command Center: ${link}`,
        html: `<p><b>${esc(who)}</b> opened "${esc(q.title)}" (${esc(q.quote_number)}) for the first time.</p><p><a href="${esc(link)}">See every view in the Command Center</a></p>`
      });
      sent += 1;
    } catch (error) {
      await logQuoteEvent(env.DB, { quoteId: q.id, eventType: "VIEW_ALERT_FAILED", source: "SYSTEM", detail: { error: error instanceof Error ? error.message : String(error) } });
    }
  }
  return sent;
}
__name(sendFirstViewAlerts, "sendFirstViewAlerts");

// src/routes.ts
function actorFromRequest(request) {
  return request.headers.get("x-actor")?.slice(0, 120) || "ADMIN";
}
__name(actorFromRequest, "actorFromRequest");
var WEBSITE_FORM_ORIGINS = /* @__PURE__ */ new Set(["https://trenchesgroup.com", "https://www.trenchesgroup.com"]);
function websiteFormCors(request) {
  const origin = request.headers.get("origin") ?? "";
  return WEBSITE_FORM_ORIGINS.has(origin) ? { "access-control-allow-origin": origin, vary: "Origin" } : {};
}
__name(websiteFormCors, "websiteFormCors");
function websiteText(value, field, required = false, max = 5e3) {
  if (typeof value !== "string") {
    if (required) throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
    return void 0;
  }
  const clean = value.trim();
  if (required && !clean) throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
  if (clean.length > max) throw new HttpError(400, "VALIDATION_ERROR", `${field} is too long.`);
  return clean || void 0;
}
__name(websiteText, "websiteText");
async function acceptWebsiteForm(request, env) {
  const origin = request.headers.get("origin") ?? "";
  if (!WEBSITE_FORM_ORIGINS.has(origin)) throw new HttpError(403, "ORIGIN_NOT_ALLOWED", "Website form origin is not allowed.");
  const body = await readJsonObject(request);
  if (websiteText(body.website, "website") || websiteText(body._gotcha, "_gotcha")) {
    return json({ ok: true }, 202, websiteFormCors(request));
  }
  const formType = websiteText(body.formType, "formType", true, 40);
  if (formType !== "contact" && formType !== "intake") {
    throw new HttpError(400, "VALIDATION_ERROR", "formType must be contact or intake.");
  }
  const businessName2 = websiteText(body.businessName, "businessName", true, 180);
  const contactName = websiteText(body.contactName, "contactName", true, 180);
  const email = websiteText(body.email, "email", true, 320);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "VALIDATION_ERROR", "email must be valid.");
  const phone = websiteText(body.phone, "phone", false, 40);
  if (await isSuppressed(env.DB, phone, email)) {
    return json({ ok: true }, 202, websiteFormCors(request));
  }
  const { lead } = await createLead(env.DB, {
    businessName: businessName2,
    industry: "INBOUND WEBSITE LEAD",
    city: "Online",
    state: "Website",
    phone,
    email,
    website: websiteText(body.currentWebsite, "currentWebsite", false, 1500)
  }, "PUBLIC_WEBSITE");
  await setLeadPause(env.DB, lead.id, true, true, "PUBLIC_WEBSITE");
  await recordEvent(env.DB, {
    eventId: newId("evt"),
    leadId: lead.id,
    eventType: "WEBSITE_FORM_SUBMITTED",
    eventData: {
      formType,
      contactName,
      service: websiteText(body.service, "service", false, 300),
      message: websiteText(body.message, "message", false, 5e3),
      submittedAt: websiteText(body.submittedAt, "submittedAt", false, 80),
      sourceUrl: websiteText(body.sourceUrl, "sourceUrl", false, 1500),
      fields: body.fields && typeof body.fields === "object" && !Array.isArray(body.fields) ? body.fields : {}
    },
    source: "WEBSITE",
    actor: "PUBLIC_WEBSITE"
  });
  return json({ ok: true, leadId: lead.id }, 201, websiteFormCors(request));
}
__name(acceptWebsiteForm, "acceptWebsiteForm");
async function processProspectBatch(env, body, actor) {
  const parsed = parseProspectBatch(body);
  const results = parsed.invalid.map((e) => ({ index: e.index, status: "REJECTED", code: e.code, message: e.message }));
  let accepted = 0;
  let duplicates = 0;
  let rejected = parsed.invalid.length;
  for (const { index, prospect } of parsed.prospects) {
    try {
      const result = await ingestProspect(env.DB, prospect, parsed.source, actor);
      if (result.duplicateLead) duplicates += 1;
      else accepted += 1;
      if (result.eventInserted) await env.EVENTS_QUEUE.send(result.event);
      results.push({ index, leadId: result.lead.id, duplicate: result.duplicateLead, idempotentDuplicate: !result.eventInserted, status: "ACCEPTED" });
    } catch (error) {
      rejected += 1;
      const message = error instanceof Error ? error.message : String(error);
      const code = error instanceof HttpError ? error.code : "INGEST_ERROR";
      results.push({ index, status: "REJECTED", code, message });
    }
  }
  results.sort((a, b) => a.index - b.index);
  return { source: parsed.source, received: parsed.prospects.length + parsed.invalid.length, accepted, duplicates, rejected, results };
}
__name(processProspectBatch, "processProspectBatch");
async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (request.method === "GET" && path === "/admin") {
    return new Response(adminHtml(), { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "referrer-policy": "no-referrer" } });
  }
  if (request.method === "GET" && path === "/health") {
    const [counters, stuck, dlqAge, deferred] = await Promise.all([
      env.DB.prepare(`SELECT name, value, last_incremented_at FROM health_counters`).all(),
      env.DB.prepare(`SELECT COUNT(*) AS c FROM demo_jobs WHERE status IN ('CLAIMED','BUILDING','QA') AND COALESCE(lease_expires_at,claimed_at,updated_at) <= datetime('now','-30 minutes')`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS c FROM leads WHERE current_state='HUMAN_REVIEW' AND updated_at <= datetime('now','-48 hours')`).first(),
      env.DB.prepare(`SELECT COUNT(*) AS c FROM deferred_events WHERE status='DEFERRED'`).first()
    ]);
    const problems = [];
    if ((stuck?.c ?? 0) > 0) problems.push(`${stuck.c} demo jobs past lease`);
    if ((dlqAge?.c ?? 0) > 0) problems.push(`${dlqAge.c} leads in HUMAN_REVIEW over 48h`);
    if ((deferred?.c ?? 0) > 10) problems.push(`${deferred.c} deferred events backed up`);
    return json({
      status: problems.length ? "DEGRADED" : "OK",
      problems,
      counters: Object.fromEntries((counters.results ?? []).map((r) => [r.name, r.value])),
      checkedAt: (/* @__PURE__ */ new Date()).toISOString()
    }, problems.length ? 503 : 200);
  }
  if (path === "/integrations/website-leads" && request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...websiteFormCors(request), "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "access-control-max-age": "86400" } });
  }
  if (path === "/integrations/website-leads" && request.method === "POST") {
    return await acceptWebsiteForm(request, env);
  }
  if (request.method === "POST" && path === "/integrations/twilio/inbound") {
    return await handleTwilioInbound(request, env);
  }
  if (request.method === "POST" && path === "/integrations/twilio/status") {
    return await handleTwilioStatus(request, env);
  }
  if (request.method === "POST" && path === "/integrations/stripe/webhook") {
    return await handleStripeWebhook(env, request);
  }
  if (request.method === "GET" && path === "/integrations/gmail/oauth/callback") {
    return await handleGmailConnectCallback(request, env);
  }
  const smartleadWebhookMatch = path.match(/^\/integrations\/smartlead\/webhook\/([^/]+)$/);
  if (smartleadWebhookMatch && request.method === "POST") {
    const expected = await webhookSecret(env.DB);
    if (decodeURIComponent(smartleadWebhookMatch[1]) !== expected) throw new HttpError(404, "NOT_FOUND", "Not found.");
    const payload = await readJsonObject(request);
    return json(await processSmartleadWebhookEvent(env, payload));
  }
  const unsubscribeMatch = path.match(/^\/unsubscribe\/email\/([^/]+)$/);
  if (unsubscribeMatch && (request.method === "GET" || request.method === "POST")) {
    return await handleEmailUnsubscribe(env, decodeURIComponent(unsubscribeMatch[1]));
  }
  const demoCtaMatch = path.match(/^\/demo\/([^/]+)\/cta$/);
  if (demoCtaMatch && request.method === "GET") {
    return await handleDemoCta(env.DB, decodeURIComponent(demoCtaMatch[1]));
  }
  const demoQuoteMatch = path.match(/^\/demo\/([^/]+)\/quote$/);
  if (demoQuoteMatch && request.method === "GET") {
    return await serveDemoQuote(env.DB, decodeURIComponent(demoQuoteMatch[1]), request);
  }
  const demoCheckoutSuccessMatch = path.match(/^\/demo\/([^/]+)\/checkout\/success$/);
  if (demoCheckoutSuccessMatch && request.method === "GET") {
    return serveCheckoutSuccess(decodeURIComponent(demoCheckoutSuccessMatch[1]));
  }
  const demoCheckoutMatch = path.match(/^\/demo\/([^/]+)\/checkout$/);
  if (demoCheckoutMatch && request.method === "GET") {
    const domainAddon = url.searchParams.get("domain") === "yes";
    return await startCheckout(env, decodeURIComponent(demoCheckoutMatch[1]), domainAddon);
  }
  const publicDemoMatch = path.match(/^\/demo\/([^/]+)$/);
  if (publicDemoMatch && request.method === "GET") {
    return await serveDemo(env.DB, decodeURIComponent(publicDemoMatch[1]), request);
  }
  if (request.method === "POST" && path === "/integrations/prospects") {
    await requireProspectIngest(request, env);
    const result = await processProspectBatch(env, await readJsonObject(request), request.headers.get("x-actor")?.slice(0, 120) || "PROSPECTOR");
    return json(result, result.rejected === result.received ? 422 : 202);
  }
  if (path.startsWith("/integrations/runner/")) {
    await requireRunner(request, env);
    const runnerId = request.headers.get("x-runner-id")?.slice(0, 160) || "orgo-runner";
    if (request.method === "POST" && path === "/integrations/runner/heartbeat") {
      const heartbeat = parseRunnerHeartbeat(await readJsonObject(request));
      if (heartbeat.runnerId !== runnerId) throw new HttpError(400, "RUNNER_ID_MISMATCH", "Header and payload runner IDs must match.");
      await updateRunnerHeartbeat(env.DB, heartbeat);
      return json({ ok: true, serverTime: nowIso() });
    }
    if (request.method === "POST" && path === "/integrations/runner/claim") {
      const campaign = await claimCampaign(env.DB, runnerId);
      return json({ campaign });
    }
    const runnerCampaignMatch = path.match(/^\/integrations\/runner\/campaigns\/([^/]+)$/);
    if (runnerCampaignMatch && request.method === "GET") {
      const campaign = await getCampaignView(env.DB, decodeURIComponent(runnerCampaignMatch[1]));
      if (!campaign) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
      return json({ campaign });
    }
    if (request.method === "POST" && path === "/integrations/runner/provider-usage") {
      const body = await readJsonObject(request);
      const campaignId = typeof body.campaignId === "string" ? body.campaignId.trim() : "";
      const provider = typeof body.provider === "string" ? body.provider.toUpperCase() : "";
      const stage = typeof body.stage === "string" ? body.stage.toUpperCase() : "";
      const status = typeof body.status === "string" ? body.status.toUpperCase() : "";
      if (!campaignId || !["CLAUDE", "OPENAI", "HYPERAGENT"].includes(provider) || !["DISCOVERY", "ENRICHMENT"].includes(stage) || !["SUCCESS", "FAILED"].includes(status)) throw new HttpError(400, "VALIDATION_ERROR", "Valid campaignId/provider/stage/status are required.");
      await recordProviderUsage(env.DB, { campaignId, candidateId: typeof body.candidateId === "string" ? body.candidateId : void 0, provider, stage, status, model: typeof body.model === "string" ? body.model : void 0, inputUnits: typeof body.inputUnits === "number" ? body.inputUnits : void 0, outputUnits: typeof body.outputUnits === "number" ? body.outputUnits : void 0, estimatedCostUsd: typeof body.estimatedCostUsd === "number" ? body.estimatedCostUsd : void 0, error: typeof body.error === "string" ? body.error : void 0 });
      return json({ ok: true }, 201);
    }
    if (request.method === "POST" && path === "/integrations/runner/discovery") {
      const parsed = parseDiscoveryBatch(await readJsonObject(request));
      const result = await ingestDiscoveryCandidates(env.DB, parsed.campaignId, parsed.candidates.map((c) => c.candidate), runnerId, parsed.invalid);
      return json(result, 202);
    }
    if (request.method === "POST" && path === "/integrations/runner/enrichment/claim") {
      const body = await readJsonObject(request);
      const campaignId = typeof body.campaignId === "string" ? body.campaignId.trim() : "";
      if (!campaignId) throw new HttpError(400, "VALIDATION_ERROR", "campaignId is required.");
      const candidate = await claimEnrichmentCandidate(env.DB, campaignId, runnerId);
      return json({ candidate });
    }
    if (request.method === "POST" && path === "/integrations/runner/enrichment/complete") {
      const body = await readJsonObject(request);
      const campaignId = typeof body.campaignId === "string" ? body.campaignId.trim() : "";
      const candidateId = typeof body.candidateId === "string" ? body.candidateId.trim() : "";
      if (!campaignId || !candidateId) throw new HttpError(400, "VALIDATION_ERROR", "campaignId and candidateId are required.");
      if (!body.prospect || typeof body.prospect !== "object" || Array.isArray(body.prospect)) throw new HttpError(400, "VALIDATION_ERROR", "prospect object is required.");
      const prospect = parseProspectResearch(body.prospect);
      const result = await completeEnrichmentCandidate(env, campaignId, candidateId, prospect, runnerId);
      return json(result, 202);
    }
    if (request.method === "POST" && path === "/integrations/runner/enrichment/fail") {
      const body = await readJsonObject(request);
      const campaignId = typeof body.campaignId === "string" ? body.campaignId.trim() : "";
      const candidateId = typeof body.candidateId === "string" ? body.candidateId.trim() : "";
      const error = typeof body.error === "string" ? body.error : "Enrichment failed without details.";
      const retryable = body.retryable !== false;
      if (!campaignId || !candidateId) throw new HttpError(400, "VALIDATION_ERROR", "campaignId and candidateId are required.");
      return json(await failEnrichmentCandidate(env.DB, campaignId, candidateId, error, runnerId, retryable), 202);
    }
    if (request.method === "POST" && path === "/integrations/runner/prospects") {
      const body = await readJsonObject(request);
      if (typeof body.campaignId !== "string" || !body.campaignId.trim()) throw new HttpError(400, "VALIDATION_ERROR", "campaignId is required.");
      const parsed = parseProspectBatch(body);
      const result = await ingestCampaignProspects(env, body.campaignId.trim(), parsed.prospects, runnerId, parsed.invalid);
      return json(result, result.rejected === result.received ? 422 : 202);
    }
    if (request.method === "POST" && path === "/integrations/runner/complete") {
      const body = await readJsonObject(request);
      const campaignId = typeof body.campaignId === "string" ? body.campaignId.trim() : "";
      if (!campaignId) throw new HttpError(400, "VALIDATION_ERROR", "campaignId is required.");
      const campaign = await finishCampaign(env.DB, campaignId, runnerId);
      await updateRunnerHeartbeat(env.DB, { runnerId, currentCampaignId: void 0, status: "ONLINE" });
      return json({ campaign });
    }
    if (request.method === "POST" && path === "/integrations/runner/fail") {
      const body = await readJsonObject(request);
      const campaignId = typeof body.campaignId === "string" ? body.campaignId.trim() : "";
      const error = typeof body.error === "string" ? body.error.slice(0, 1e3) : "Runner failed without an error message.";
      if (!campaignId) throw new HttpError(400, "VALIDATION_ERROR", "campaignId is required.");
      const campaign = await finishCampaign(env.DB, campaignId, runnerId, error);
      await updateRunnerHeartbeat(env.DB, { runnerId, currentCampaignId: campaignId, status: "ERROR", lastError: error });
      return json({ campaign });
    }
    if (request.method === "POST" && path === "/integrations/runner/demo-jobs/claim") {
      return json({ job: await claimDemoJob(env.DB, runnerId) });
    }
    const demoCompleteMatch = path.match(/^\/integrations\/runner\/demo-jobs\/([^/]+)\/complete$/);
    if (demoCompleteMatch && request.method === "POST") {
      const body = await readJsonObject(request);
      const html = typeof body.html === "string" ? body.html : "";
      const qaScore = typeof body.qaScore === "number" ? body.qaScore : 0;
      const qaReport = body.qaReport && typeof body.qaReport === "object" && !Array.isArray(body.qaReport) ? body.qaReport : {};
      return json(await completeDemoJob(env, decodeURIComponent(demoCompleteMatch[1]), { html, qaScore, qaReport, provider: typeof body.provider === "string" ? body.provider : void 0, model: typeof body.model === "string" ? body.model : void 0 }), 202);
    }
    const demoFailMatch = path.match(/^\/integrations\/runner\/demo-jobs\/([^/]+)\/fail$/);
    if (demoFailMatch && request.method === "POST") {
      const body = await readJsonObject(request);
      return json(await failDemoJob(env.DB, decodeURIComponent(demoFailMatch[1]), typeof body.error === "string" ? body.error : "Demo build failed.", body.retryable !== false), 202);
    }
    throw new HttpError(404, "RUNNER_ROUTE_NOT_FOUND", "Runner route not found.");
  }
  await requireAdmin(request, env);
  const actor = actorFromRequest(request);
  if (request.method === "GET" && path === "/api/tracker/export.csv") {
    const result = await env.DB.prepare(`SELECT l.business_name,l.industry,l.city,l.state,l.google_rating,l.google_reviews,l.website,l.website_gap_status,l.website_gap_reason,l.qualification_reason,l.current_state,l.priority,l.updated_at,ds.slug
      FROM leads l LEFT JOIN demo_sites ds ON ds.lead_id=l.id AND ds.status IN ('READY','PUBLISHED')
      ORDER BY l.updated_at DESC`).all();
    const csvCell = /* @__PURE__ */ __name((value) => {
      let text2 = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
      if (/^[=+\-@]/.test(text2)) text2 = `'${text2}`;
      return `"${text2.replaceAll('"', '""')}"`;
    }, "csvCell");
    const headers = ["Name", "Category", "City", "State", "Rating", "Reviews", "Current-site URL", "Website gap", "Gap detail", "Pitch hook", "Concept link", "Stage", "Priority", "Last updated"];
    const origin = url.origin;
    const lines = [headers.map(csvCell).join(",")];
    for (const lead of result.results) {
      const slug = typeof lead.slug === "string" ? lead.slug : "";
      lines.push([
        lead.business_name,
        lead.industry,
        lead.city,
        lead.state,
        lead.google_rating,
        lead.google_reviews,
        lead.website,
        lead.website_gap_status,
        lead.website_gap_reason,
        lead.qualification_reason || lead.website_gap_reason || "Website opportunity identified",
        slug ? `${origin}/demo/${encodeURIComponent(slug)}` : "",
        lead.current_state,
        lead.priority,
        lead.updated_at
      ].map(csvCell).join(","));
    }
    return new Response(`\uFEFF${lines.join("\r\n")}\r
`, { headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="trenches-prospect-tracker.csv"',
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    } });
  }
  if (request.method === "GET" && path === "/api/quotes/mailbox") return json(await mailboxStatus(env));
  if (request.method === "POST" && path === "/api/quotes/mailbox/connect") return json(await startGmailConnect(env));
  if (path === "/api/quotes") {
    if (request.method === "GET") return json({ quotes: await listQuotes(env.DB, url.searchParams.get("leadId")) });
    if (request.method === "POST") return json({ quote: await createQuote(env.DB, await readJsonObject(request), actor) }, 201);
  }
  const quoteMatch = path.match(/^\/api\/quotes\/([^/]+)(?:\/(send|status))?$/);
  if (quoteMatch) {
    const quoteId = decodeURIComponent(quoteMatch[1]);
    const action = quoteMatch[2];
    if (!action && request.method === "GET") return json(await getQuoteDetail(env, quoteId));
    if (!action && request.method === "PATCH") return json({ quote: await updateQuote(env.DB, quoteId, await readJsonObject(request), actor) });
    if (action === "send" && request.method === "POST") return json(await sendQuote(env, quoteId, await readJsonObject(request), actor));
    if (action === "status" && request.method === "POST") return json({ quote: await setQuoteStatus(env.DB, quoteId, (await readJsonObject(request)).status, actor) });
  }
  if (request.method === "GET" && path === "/api/demos/status") {
    return json(await demoStatus(env.DB, env));
  }
  if (request.method === "POST" && path === "/api/demos/settings") {
    const body = await readJsonObject(request);
    await updateDemoSettings(env.DB, {
      automationEnabled: typeof body.automationEnabled === "boolean" ? body.automationEnabled : void 0,
      autoDeliverEmail: typeof body.autoDeliverEmail === "boolean" ? body.autoDeliverEmail : void 0,
      builderModel: typeof body.builderModel === "string" ? body.builderModel : void 0,
      builderProvider: typeof body.builderProvider === "string" ? body.builderProvider : void 0,
      fallbackEnabled: typeof body.fallbackEnabled === "boolean" ? body.fallbackEnabled : void 0,
      qualityMinScore: typeof body.qualityMinScore === "number" ? body.qualityMinScore : void 0,
      requireApproval: typeof body.requireApproval === "boolean" ? body.requireApproval : void 0
    }, actor);
    return json(await demoStatus(env.DB, env));
  }
  const demoQueueMatch = path.match(/^\/api\/demos\/leads\/([^/]+)\/queue$/);
  const staticDemoMatch = path.match(/^\/api\/demos\/leads\/([^/]+)\/static-preview$/);
  if (request.method === "POST" && staticDemoMatch) {
    return json(await createStaticDemoPreview(env.DB, decodeURIComponent(staticDemoMatch[1]), actor), 201);
  }
  if (demoQueueMatch && request.method === "POST") {
    const result = await ensureDemoJob(env.DB, decodeURIComponent(demoQueueMatch[1]), actor);
    try {
      await wakeOrgoProspector(env);
    } catch {
    }
    return json(result, 201);
  }
  const demoDeliverMatch = path.match(/^\/api\/demos\/([^/]+)\/deliver$/);
  if (demoDeliverMatch && request.method === "POST") {
    return json(await deliverDemoSite(env, decodeURIComponent(demoDeliverMatch[1])));
  }
  if (request.method === "GET" && path === "/api/outreach/email/status") {
    return json(await emailOutreachStatus(env.DB, env));
  }
  if (request.method === "GET" && path === "/api/outreach/concierge/status") {
    return json(await conciergeStatus(env.DB));
  }
  if (request.method === "POST" && path === "/api/outreach/email/settings") {
    const body = await readJsonObject(request);
    await updateEmailSettings(env.DB, {
      fromName: typeof body.fromName === "string" ? body.fromName : void 0,
      postalAddress: typeof body.postalAddress === "string" ? body.postalAddress : void 0,
      dailyCap: typeof body.dailyCap === "number" ? body.dailyCap : void 0,
      orchestratorEnabled: typeof body.orchestratorEnabled === "boolean" ? body.orchestratorEnabled : void 0,
      liveMode: typeof body.liveMode === "boolean" ? body.liveMode : void 0,
      autoReplyMode: typeof body.autoReplyMode === "string" ? body.autoReplyMode : void 0,
      websiteEnabled: typeof body.websiteEnabled === "boolean" ? body.websiteEnabled : void 0,
      conciergeEnabled: typeof body.conciergeEnabled === "boolean" ? body.conciergeEnabled : void 0,
      smartleadMailbox: typeof body.smartleadMailbox === "string" ? body.smartleadMailbox : void 0
    }, actor);
    return json(await emailOutreachStatus(env.DB, env));
  }
  if (request.method === "POST" && path === "/api/outreach/email/test-allowlist") {
    const body = await readJsonObject(request);
    const email = typeof body.email === "string" ? body.email : "";
    const label = typeof body.label === "string" ? body.label : void 0;
    await addEmailTestAddress(env.DB, email, label, actor);
    return json(await emailOutreachStatus(env.DB, env), 201);
  }
  const emailAllowlistDelete = path.match(/^\/api\/outreach\/email\/test-allowlist\/(.+)$/);
  if (emailAllowlistDelete && request.method === "DELETE") {
    await removeEmailTestAddress(env.DB, decodeURIComponent(emailAllowlistDelete[1]));
    return json(await emailOutreachStatus(env.DB, env));
  }
  if (request.method === "POST" && path === "/api/outreach/email/test-send") {
    const body = await readJsonObject(request);
    const email = typeof body.email === "string" ? body.email : "";
    const subject = typeof body.subject === "string" ? body.subject : "Trenches OS email test";
    const message = typeof body.message === "string" ? body.message : "Trenches email test.";
    const leadId = typeof body.leadId === "string" && body.leadId.trim() ? body.leadId.trim() : void 0;
    return json(await sendEmailTest(env, { email, subject, message, leadId }), 202);
  }
  if (request.method === "POST" && path === "/api/outreach/orchestrator/run") {
    return json(await runAutonomousOutreach(env));
  }
  const enrollEmailSequence = path.match(/^\/api\/outreach\/email\/leads\/([^/]+)\/enroll$/);
  if (enrollEmailSequence && request.method === "POST") {
    const leadId = decodeURIComponent(enrollEmailSequence[1]);
    const lead = await getLead(env.DB, leadId);
    if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
    const s = await getEmailOutreachSettings(env.DB);
    return json({ sequenceId: await enrollLeadInSmartlead(env, lead, "WEBSITE", s.postalAddress) }, 201);
  }
  if (request.method === "GET" && path === "/api/outreach/status") {
    return json(await outreachStatus(env.DB, env));
  }
  if (request.method === "GET" && path === "/api/outreach/conversation/status") {
    return json(await conversationStatus(env.DB));
  }
  if (request.method === "POST" && path === "/api/outreach/simulate") {
    const body = await readJsonObject(request);
    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!leadId || !message) throw new HttpError(400, "VALIDATION_ERROR", "leadId and message are required.");
    const intent = classifyInbound(message);
    return json({ intent, decision: await simulateInbound(env.DB, leadId, message, intent) }, 201);
  }
  const openerDraftMatch = path.match(/^\/api\/outreach\/leads\/([^/]+)\/opener-draft$/);
  if (openerDraftMatch && request.method === "POST") {
    const leadId = decodeURIComponent(openerDraftMatch[1]);
    const lead = await getLead(env.DB, leadId);
    if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
    const opener = await buildLeadOpener(env.DB, lead);
    return json(await createOpenerDraft(env.DB, leadId, opener), 201);
  }
  const followupLeadMatch = path.match(/^\/api\/outreach\/leads\/([^/]+)\/followups$/);
  if (followupLeadMatch && request.method === "POST") {
    const leadId = decodeURIComponent(followupLeadMatch[1]);
    await scheduleFollowupSequence(env.DB, leadId, actor);
    return json({ ok: true }, 201);
  }
  if (request.method === "POST" && path === "/api/outreach/followups/run") {
    const body = await readJsonObject(request);
    return json(await processDueFollowups(env.DB, body.force === true));
  }
  const escalationResolveMatch = path.match(/^\/api\/outreach\/escalations\/([^/]+)\/resolve$/);
  if (escalationResolveMatch && request.method === "POST") {
    await resolveEscalation(env.DB, decodeURIComponent(escalationResolveMatch[1]), actor);
    return json({ ok: true });
  }
  const draftActionMatch = path.match(/^\/api\/outreach\/drafts\/([^/]+)\/(approve|cancel)$/);
  if (draftActionMatch && request.method === "POST") {
    await setDraftStatus(env.DB, decodeURIComponent(draftActionMatch[1]), draftActionMatch[2] === "approve" ? "APPROVED" : "CANCELLED", actor);
    return json({ ok: true });
  }
  if (request.method === "POST" && path === "/api/outreach/test-allowlist") {
    const body = await readJsonObject(request);
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const label = typeof body.label === "string" ? body.label.trim() : void 0;
    if (!phone) throw new HttpError(400, "VALIDATION_ERROR", "phone is required.");
    await addTestNumber(env.DB, phone, label, actor);
    return json(await outreachStatus(env.DB, env), 201);
  }
  const allowlistDelete = path.match(/^\/api\/outreach\/test-allowlist\/(.+)$/);
  if (allowlistDelete && request.method === "DELETE") {
    await removeTestNumber(env.DB, decodeURIComponent(allowlistDelete[1]));
    return json({ ok: true });
  }
  if (request.method === "POST" && path === "/api/outreach/test-send") {
    const body = await readJsonObject(request);
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!phone || !message) throw new HttpError(400, "VALIDATION_ERROR", "phone and message are required.");
    return json(await sendTwilioSms(env, { to: phone, body: message, testOnly: true }), 202);
  }
  if (request.method === "POST" && path === "/api/prospects/import") {
    const result = await processProspectBatch(env, await readJsonObject(request), actor);
    return json(result, result.rejected === result.received ? 422 : 202);
  }
  if (request.method === "GET" && path === "/api/campaigns") {
    const offeringParam = url.searchParams.get("offering");
    const offering = offeringParam === "WEBSITE" || offeringParam === "CONCIERGE" ? offeringParam : void 0;
    return json({ campaigns: await listCampaigns(env.DB, 100, url.searchParams.get("archived") === "true", offering) });
  }
  if (request.method === "POST" && path === "/api/campaigns") {
    const input = parseCampaignCreate(await readJsonObject(request));
    const campaign = await createCampaign(env.DB, input, actor);
    let orgo = { attempted: false };
    try {
      orgo = await wakeOrgoProspector(env);
    } catch (error) {
      await env.DB.prepare("UPDATE prospecting_campaigns SET last_error = ?, updated_at = ? WHERE id = ?").bind(error instanceof Error ? error.message : String(error), nowIso(), campaign.id).run();
    }
    return json({ campaign: await getCampaignView(env.DB, campaign.id), orgo }, 201);
  }
  if (request.method === "GET" && path === "/api/runner/status") {
    return json(await getRunnerStatus(env.DB));
  }
  if (request.method === "GET" && path === "/api/prospector-jobs") {
    const offeringParam = url.searchParams.get("offering");
    const offering = offeringParam === "WEBSITE" || offeringParam === "CONCIERGE" ? offeringParam : void 0;
    return json({ jobs: await listProspectorJobs(env.DB, offering) });
  }
  if (request.method === "POST" && path === "/api/prospector-jobs") {
    const input = parseProspectorJobCreate(await readJsonObject(request));
    const job = await createProspectorJob(env.DB, input);
    return json({ job }, 201);
  }
  if (request.method === "POST" && path === "/api/prospector-jobs/run-due") {
    return json(await runDueProspectorJobs(env.DB, env));
  }
  const prospectorJobActionMatch = path.match(/^\/api\/prospector-jobs\/([^/]+)\/(pause|resume)$/);
  if (prospectorJobActionMatch && request.method === "POST") {
    const jobId = decodeURIComponent(prospectorJobActionMatch[1]);
    const job = await setProspectorJobActive(env.DB, jobId, prospectorJobActionMatch[2] === "resume");
    return json({ job });
  }
  const campaignMatch = path.match(/^\/api\/campaigns\/([^/]+)$/);
  if (campaignMatch && request.method === "GET") {
    const campaignId = decodeURIComponent(campaignMatch[1]);
    const campaign = await getCampaignView(env.DB, campaignId);
    if (!campaign) throw new HttpError(404, "CAMPAIGN_NOT_FOUND", "Campaign not found.");
    const [leads, candidates] = await Promise.all([campaignLeadRows(env.DB, campaignId), campaignCandidateRows(env.DB, campaignId)]);
    return json({ campaign, leads, candidates });
  }
  const campaignActionMatch = path.match(/^\/api\/campaigns\/([^/]+)\/(pause|resume)$/);
  if (campaignActionMatch && request.method === "POST") {
    const campaignId = decodeURIComponent(campaignActionMatch[1]);
    const action = campaignActionMatch[2];
    const campaign = await setCampaignStatus(env.DB, campaignId, action === "pause" ? "PAUSED" : "READY", actor);
    let orgo = { attempted: false };
    if (action === "resume") {
      try {
        orgo = await wakeOrgoProspector(env);
      } catch {
        orgo = { attempted: true, status: "wake-failed" };
      }
    }
    return json({ campaign, orgo });
  }
  const campaignArchiveMatch = path.match(/^\/api\/campaigns\/([^/]+)\/(archive|restore)$/);
  if (campaignArchiveMatch && request.method === "POST") {
    const campaignId = decodeURIComponent(campaignArchiveMatch[1]);
    const action = campaignArchiveMatch[2];
    const campaign = await archiveCampaign(env.DB, campaignId, actor, action === "restore");
    return json({ campaign });
  }
  if (request.method === "POST" && path === "/api/leads/requalify") {
    const body = await readJsonObject(request);
    const leadIds = Array.isArray(body.leadIds) ? body.leadIds.filter((id) => typeof id === "string") : void 0;
    return json(await requalifyStuckLeads(env.DB, env.EVENTS_QUEUE, {
      limit: typeof body.limit === "number" ? body.limit : void 0,
      dryRun: body.dryRun === true,
      leadIds,
      actor
    }), 202);
  }
  if (request.method === "POST" && path === "/api/leads/website-gap/re-audit") {
    return json(await reAuditExistingWebsiteGaps(env.DB, actor), 200);
  }
  if (request.method === "POST" && path === "/api/leads") {
    const input = parseCreateLead(await readJsonObject(request));
    if (await isSuppressed(env.DB, input.phone, input.email)) {
      throw new HttpError(409, "CONTACT_SUPPRESSED", "This contact is on the suppression list.");
    }
    const { lead } = await createLead(env.DB, input, actor);
    return json({ lead, awaitingResearch: true }, 201);
  }
  if (request.method === "GET" && path === "/api/leads") {
    const state = url.searchParams.get("state");
    const priority = url.searchParams.get("priority");
    const validation = url.searchParams.get("validation");
    const q = url.searchParams.get("q")?.trim();
    const limitRaw = Number(url.searchParams.get("limit") ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;
    const clauses = [];
    const bindings = [];
    if (state) {
      clauses.push("current_state = ?");
      bindings.push(state);
    }
    if (priority) {
      clauses.push("priority = ?");
      bindings.push(priority);
    }
    if (validation) {
      clauses.push("validation_status = ?");
      bindings.push(validation);
    }
    if (q) {
      clauses.push("(business_name LIKE ? OR city LIKE ? OR phone LIKE ? OR email LIKE ?)");
      const like = `%${q.slice(0, 120)}%`;
      bindings.push(like, like, like, like);
    }
    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const result = await env.DB.prepare(`SELECT * FROM leads${where} ORDER BY updated_at DESC LIMIT ?`).bind(...bindings, limit).all();
    return json({ leads: result.results });
  }
  if (request.method === "GET" && path === "/api/dashboard") {
    const [total, grouped, human, validation, priorities, campaignCounts] = await Promise.all([
      env.DB.prepare("SELECT COUNT(*) AS count FROM leads").first(),
      env.DB.prepare("SELECT current_state, COUNT(*) AS count FROM leads GROUP BY current_state").all(),
      env.DB.prepare("SELECT COUNT(*) AS count FROM leads WHERE human_required = 1").first(),
      env.DB.prepare("SELECT validation_status, COUNT(*) AS count FROM leads GROUP BY validation_status").all(),
      env.DB.prepare("SELECT priority, COUNT(*) AS count FROM leads GROUP BY priority").all(),
      env.DB.prepare("SELECT status, COUNT(*) AS count FROM prospecting_campaigns WHERE archived_at IS NULL GROUP BY status").all()
    ]);
    const counts = {};
    const validationCounts = {};
    const priorityCounts = {};
    const campaigns = {};
    for (const row of grouped.results) counts[row.current_state] = row.count;
    for (const row of validation.results) validationCounts[row.validation_status ?? "PENDING"] = row.count;
    for (const row of priorities.results) priorityCounts[row.priority ?? "UNSCORED"] = row.count;
    for (const row of campaignCounts.results) campaigns[row.status] = row.count;
    return json({ total: total?.count ?? 0, counts, validationCounts, priorityCounts, campaigns, humanRequired: human?.count ?? 0 });
  }
  if (request.method === "GET" && path === "/api/system/status") {
    const rows = await env.DB.prepare(`SELECT key, value, updated_at, updated_by FROM system_flags WHERE key IN ('GLOBAL_AUTOMATION_PAUSED','OUTREACH_ENABLED','NATIVE_PROSPECTOR_ENABLED','PROSPECTOR_V14_ENABLED','PROSPECTOR_V15_RADIUS_ENABLED','OUTREACH_TEST_MODE','OUTREACH_LIVE_MODE','OUTREACH_REPLY_MODE','OUTREACH_FOLLOWUP_MODE')`).all();
    const map = new Map(rows.results.map((r) => [r.key, r]));
    const globalRow = map.get("GLOBAL_AUTOMATION_PAUSED");
    const outreachRow = map.get("OUTREACH_ENABLED");
    const prospectorRow = map.get("NATIVE_PROSPECTOR_ENABLED");
    const v14Row = map.get("PROSPECTOR_V14_ENABLED");
    const v15RadiusRow = map.get("PROSPECTOR_V15_RADIUS_ENABLED");
    const outreachTestRow = map.get("OUTREACH_TEST_MODE");
    const outreachLiveRow = map.get("OUTREACH_LIVE_MODE");
    const outreachReplyRow = map.get("OUTREACH_REPLY_MODE");
    const outreachFollowupRow = map.get("OUTREACH_FOLLOWUP_MODE");
    return json({
      globalAutomationPaused: globalRow?.value === "true",
      outreachEnabled: outreachRow?.value === "true",
      nativeProspectorEnabled: prospectorRow?.value === "true",
      prospectorV14Enabled: v14Row?.value === "true",
      prospectorV15RadiusEnabled: v15RadiusRow?.value === "true",
      outreachTestMode: outreachTestRow?.value !== "false",
      outreachLiveMode: outreachLiveRow?.value === "true",
      outreachReplyMode: outreachReplyRow?.value ?? "DRAFT_ONLY",
      outreachFollowupMode: outreachFollowupRow?.value ?? "DRAFT_ONLY",
      updatedAt: globalRow?.updated_at ?? null,
      updatedBy: globalRow?.updated_by ?? null
    });
  }
  if (request.method === "POST" && path === "/api/events") {
    const parsed = parseExternalEvent(await readJsonObject(request));
    const event = { eventId: newId("evt"), ...parsed };
    const result = await recordEvent(env.DB, event);
    if (result.inserted) await env.EVENTS_QUEUE.send(event);
    return json({ accepted: result.inserted, duplicate: !result.inserted }, result.inserted ? 202 : 200);
  }
  if (request.method === "GET" && path === "/api/jobs") {
    const status = url.searchParams.get("status");
    const result = status ? await env.DB.prepare("SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC LIMIT 200").bind(status).all() : await env.DB.prepare("SELECT * FROM jobs ORDER BY created_at DESC LIMIT 200").all();
    return json({ jobs: result.results });
  }
  const leadOutreachMatch = path.match(/^\/api\/leads\/([^/]+)\/outreach\/(consent|send-opener)$/);
  if (leadOutreachMatch && request.method === "POST") {
    const leadId = decodeURIComponent(leadOutreachMatch[1]);
    const action = leadOutreachMatch[2];
    const lead = await getLead(env.DB, leadId);
    if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
    if (action === "consent") {
      const body = await readJsonObject(request);
      const status = typeof body.status === "string" ? body.status.toUpperCase() : "";
      const source = typeof body.source === "string" ? body.source.trim() : "";
      const evidence = typeof body.evidence === "string" ? body.evidence.trim() : void 0;
      if (!["OPTED_IN", "OPTED_OUT", "UNKNOWN"].includes(status) || !source) throw new HttpError(400, "VALIDATION_ERROR", "status and source are required.");
      await setSmsPermission(env.DB, leadId, status, source, evidence, actor);
      return json({ ok: true });
    }
    if (!lead.phone) throw new HttpError(409, "PHONE_REQUIRED", "Lead has no phone number.");
    const opener = await buildLeadOpener(env.DB, lead);
    return json({ opener, send: await sendTwilioSms(env, { to: lead.phone, body: opener, leadId, testOnly: true }) }, 202);
  }
  const leadMatch = path.match(/^\/api\/leads\/([^/]+)$/);
  if (leadMatch) {
    const leadId = decodeURIComponent(leadMatch[1]);
    if (request.method === "GET") {
      const lead = await getLead(env.DB, leadId);
      if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", `Lead ${leadId} was not found.`);
      return json({ lead, allowedTransitions: allowedTransitions(lead.current_state), manualStateOptions: MANUAL_STATE_OPTIONS });
    }
    if (request.method === "PATCH") {
      const existing = await getLead(env.DB, leadId);
      if (!existing) throw new HttpError(404, "LEAD_NOT_FOUND", `Lead ${leadId} was not found.`);
      const body = await readJsonObject(request);
      const allowed = /* @__PURE__ */ new Map([
        ["phone", "phone"],
        ["email", "email"],
        ["website", "website"],
        ["facebookUrl", "facebook_url"],
        ["instagramUrl", "instagram_url"],
        ["googleUrl", "google_url"],
        ["assignedTo", "assigned_to"],
        ["nextActionAt", "next_action_at"]
      ]);
      const fields = [];
      const values = [];
      const changes = {};
      for (const [apiField, dbField] of allowed) {
        if (Object.prototype.hasOwnProperty.call(body, apiField)) {
          const value = body[apiField];
          if (value !== null && typeof value !== "string") throw new HttpError(400, "VALIDATION_ERROR", `${apiField} must be a string or null.`);
          fields.push(`${dbField} = ?`);
          values.push(value);
          changes[apiField] = { from: existing[dbField], to: value };
        }
      }
      if (!fields.length) throw new HttpError(400, "NO_UPDATABLE_FIELDS", "No supported fields were provided.");
      const nextPhone = Object.prototype.hasOwnProperty.call(body, "phone") ? body.phone : existing.phone;
      const nextEmail = Object.prototype.hasOwnProperty.call(body, "email") ? body.email : existing.email;
      if (await isSuppressed(env.DB, nextPhone, nextEmail)) throw new HttpError(409, "CONTACT_SUPPRESSED", "The updated contact is on the suppression list.");
      const timestamp = nowIso();
      fields.push("updated_at = ?", "version = version + 1");
      values.push(timestamp, leadId);
      const result = await env.DB.prepare(`UPDATE leads SET ${fields.join(", ")} WHERE id = ?`).bind(...values).run();
      if ((result.meta.changes ?? 0) !== 1) throw new HttpError(404, "LEAD_NOT_FOUND", `Lead ${leadId} was not found.`);
      await recordEvent(env.DB, { eventId: newId("evt"), leadId, eventType: "LEAD_UPDATED", eventData: { changes }, source: "API", actor });
      return json({ lead: await getLead(env.DB, leadId) });
    }
  }
  const manualStateMatch = path.match(/^\/api\/leads\/([^/]+)\/manual-state$/);
  if (request.method === "POST" && manualStateMatch) {
    const leadId = decodeURIComponent(manualStateMatch[1]);
    const body = await readJsonObject(request);
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!to || !reason) throw new HttpError(400, "VALIDATION_ERROR", "to and reason are required.");
    return json({ lead: await manualOverrideLeadState(env.DB, leadId, to, actor, reason) });
  }
  const restoreLeadMatch = path.match(/^\/api\/leads\/([^/]+)\/restore$/);
  if (request.method === "POST" && restoreLeadMatch) {
    const leadId = decodeURIComponent(restoreLeadMatch[1]);
    const body = await readJsonObject(request);
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : "Restored from disqualification for human review.";
    return json({ lead: await restoreDisqualifiedLead(env.DB, leadId, actor, reason) });
  }
  const researchMatch = path.match(/^\/api\/leads\/([^/]+)\/research$/);
  if (researchMatch && request.method === "GET") {
    const leadId = decodeURIComponent(researchMatch[1]);
    const lead = await getLead(env.DB, leadId);
    if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", `Lead ${leadId} was not found.`);
    const research = await env.DB.prepare("SELECT * FROM lead_research WHERE lead_id = ? LIMIT 1").bind(leadId).first();
    let scoreBreakdown = null;
    try {
      scoreBreakdown = lead.score_breakdown_json ? JSON.parse(lead.score_breakdown_json) : null;
    } catch {
      scoreBreakdown = null;
    }
    return json({ research, scoreBreakdown, qualificationReason: lead.qualification_reason });
  }
  if (researchMatch && request.method === "POST") {
    const leadId = decodeURIComponent(researchMatch[1]);
    const existing = await getLead(env.DB, leadId);
    if (!existing) throw new HttpError(404, "LEAD_NOT_FOUND", `Lead ${leadId} was not found.`);
    const parsed = parseProspectResearch(await readJsonObject(request));
    const forced = {
      ...parsed,
      businessName: existing.business_name,
      industry: parsed.industry || existing.industry,
      city: existing.city,
      state: existing.state,
      externalId: parsed.externalId ?? `manual:${leadId}:${Date.now()}`
    };
    const result = await ingestProspect(env.DB, forced, "ADMIN_RESEARCH", actor);
    if (result.eventInserted) await env.EVENTS_QUEUE.send(result.event);
    return json({ lead: result.lead, researchAccepted: result.eventInserted, idempotentDuplicate: !result.eventInserted }, 202);
  }
  const transitionMatch = path.match(/^\/api\/leads\/([^/]+)\/transition$/);
  if (request.method === "POST" && transitionMatch) {
    const leadId = decodeURIComponent(transitionMatch[1]);
    const { to, reason } = parseTransition(await readJsonObject(request));
    const lead = await transitionLead(env.DB, leadId, to, "HUMAN", reason, "API");
    return json({ lead, allowedTransitions: allowedTransitions(lead.current_state) });
  }
  const eventsMatch = path.match(/^\/api\/leads\/([^/]+)\/events$/);
  if (request.method === "GET" && eventsMatch) {
    const leadId = decodeURIComponent(eventsMatch[1]);
    const result = await env.DB.prepare("SELECT * FROM events WHERE lead_id = ? ORDER BY created_at ASC").bind(leadId).all();
    return json({ events: result.results });
  }
  const pauseMatch = path.match(/^\/api\/leads\/([^/]+)\/(pause|resume|human-takeover)$/);
  if (request.method === "POST" && pauseMatch) {
    const leadId = decodeURIComponent(pauseMatch[1]);
    const action = pauseMatch[2];
    return json({ lead: await setLeadPause(env.DB, leadId, action !== "resume", action === "human-takeover", actor) });
  }
  const optOutMatch = path.match(/^\/api\/leads\/([^/]+)\/opt-out$/);
  if (request.method === "POST" && optOutMatch) {
    const leadId = decodeURIComponent(optOutMatch[1]);
    const lead = await getLead(env.DB, leadId);
    if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", `Lead ${leadId} was not found.`);
    await addSuppression(env.DB, { leadId, phone: lead.phone ?? void 0, email: lead.email ?? void 0, reason: "OPT_OUT", source: "ADMIN" });
    let updated = lead;
    if (lead.current_state !== "OPTED_OUT") {
      try {
        updated = await transitionLead(env.DB, leadId, "OPTED_OUT", "HUMAN", "Manual opt-out", "API");
      } catch (error) {
        if (!(error instanceof HttpError) || error.code !== "INVALID_STATE_TRANSITION") throw error;
        updated = await setLeadPause(env.DB, leadId, true, false, actor);
      }
    }
    return json({ lead: updated, suppressed: true });
  }
  const retryMatch = path.match(/^\/api\/jobs\/([^/]+)\/retry$/);
  if (request.method === "POST" && retryMatch) {
    const jobId = decodeURIComponent(retryMatch[1]);
    const job = await env.DB.prepare("SELECT * FROM jobs WHERE id = ?").bind(jobId).first();
    if (!job) throw new HttpError(404, "JOB_NOT_FOUND", `Job ${jobId} was not found.`);
    await env.DB.prepare(`UPDATE jobs SET status = 'PENDING', error_message = NULL, updated_at = ? WHERE id = ?`).bind(nowIso(), jobId).run();
    const event = { eventId: newId("evt"), eventType: "JOB_RETRY_REQUESTED", eventData: { jobId }, source: "API", actor };
    await recordEvent(env.DB, event);
    await env.EVENTS_QUEUE.send(event);
    return json({ retried: true, jobId }, 202);
  }
  if (request.method === "POST" && path === "/api/system/pause") {
    const timestamp = nowIso();
    await env.DB.prepare(`UPDATE system_flags SET value = 'true', updated_at = ?, updated_by = ? WHERE key = 'GLOBAL_AUTOMATION_PAUSED'`).bind(timestamp, actor).run();
    await recordEvent(env.DB, { eventId: newId("evt"), eventType: "SYSTEM_AUTOMATION_PAUSED", eventData: {}, source: "API", actor });
    return json({ globalAutomationPaused: true });
  }
  if (request.method === "POST" && path === "/api/system/resume") {
    const timestamp = nowIso();
    await env.DB.prepare(`UPDATE system_flags SET value = 'false', updated_at = ?, updated_by = ? WHERE key = 'GLOBAL_AUTOMATION_PAUSED'`).bind(timestamp, actor).run();
    await recordEvent(env.DB, { eventId: newId("evt"), eventType: "SYSTEM_AUTOMATION_RESUMED", eventData: {}, source: "API", actor });
    return json({ globalAutomationPaused: false });
  }
  throw new HttpError(404, "NOT_FOUND", "Route not found.");
}
__name(handleRequest, "handleRequest");

// src/workflow.ts
import { WorkflowEntrypoint } from "cloudflare:workers";
var LeadLifecycleWorkflow = class extends WorkflowEntrypoint {
  static {
    __name(this, "LeadLifecycleWorkflow");
  }
  async run(event, step) {
    const { leadId } = event.payload;
    await step.do("guard automation enabled", async () => {
      if (await globalAutomationPaused(this.env.DB)) throw new Error("Global automation is paused.");
      const lead = await getLead(this.env.DB, leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found.`);
      if (lead.automation_paused) throw new Error(`Automation paused for lead ${leadId}.`);
      return { state: lead.current_state };
    });
    const researchJson = await step.do("load verified research", async () => {
      const input = await loadResearchInput(this.env.DB, leadId);
      if (!input) throw new Error(`No research payload exists for lead ${leadId}.`);
      return JSON.stringify(input);
    });
    const research = JSON.parse(researchJson);
    const start = await step.do("start real research processing", async () => {
      const lead = await getLead(this.env.DB, leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found.`);
      if (lead.current_state !== "NEW" && lead.current_state !== "HUMAN_REVIEW") {
        await recordEvent(this.env.DB, {
          eventId: newId("evt"),
          leadId,
          eventType: "RESEARCH_REFRESHED_NO_STATE_RESET",
          eventData: { currentState: lead.current_state },
          source: "WORKFLOW",
          actor: "SYSTEM"
        });
        return { proceed: false, state: lead.current_state };
      }
      await transitionLead(this.env.DB, leadId, "RESEARCHING", "WORKFLOW", lead.current_state === "HUMAN_REVIEW" ? "Updated research received after human review" : "Verified prospect research received", "WORKFLOW");
      return { proceed: true, state: "RESEARCHING" };
    });
    if (!start.proceed) return { leadId, state: start.state, refreshed: true };
    await step.do("complete research", async () => {
      const lead = await getLead(this.env.DB, leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found.`);
      if (lead.current_state === "RESEARCHING") {
        await transitionLead(this.env.DB, leadId, "RESEARCHED", "WORKFLOW", `Research stored with ${research.sources.length} source(s)`, "WORKFLOW");
      }
      return { state: (await getLead(this.env.DB, leadId))?.current_state };
    });
    await step.do("start deterministic qualification", async () => {
      const lead = await getLead(this.env.DB, leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found.`);
      if (lead.current_state === "RESEARCHED") {
        await transitionLead(this.env.DB, leadId, "QUALIFYING", "WORKFLOW", "Validation and viability scoring started", "WORKFLOW");
      }
      return { state: (await getLead(this.env.DB, leadId))?.current_state };
    });
    const qualification = await step.do("validate and score prospect", async () => {
      const result = await applyQualification(this.env.DB, leadId, research);
      await recordEvent(this.env.DB, {
        eventId: newId("evt"),
        leadId,
        eventType: "PROSPECT_SCORED",
        eventData: {
          validationStatus: result.validation.status,
          validationReasons: result.validation.reasons,
          score: result.score.total,
          priority: result.priority,
          websiteGap: result.websiteGap,
          breakdown: result.score
        },
        source: "WORKFLOW",
        actor: "SYSTEM"
      });
      return result;
    });
    await step.do("apply qualification outcome", async () => {
      const lead = await getLead(this.env.DB, leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found.`);
      if (lead.current_state !== "QUALIFYING") return { state: lead.current_state };
      if (qualification.websiteGap.status === "INELIGIBLE") {
        await transitionLead(this.env.DB, leadId, "DISQUALIFIED", "WORKFLOW", qualification.websiteGap.reason, "WEBSITE_GAP_GATE");
      } else if (qualification.websiteGap.status === "REVIEW") {
        await transitionLead(this.env.DB, leadId, "HUMAN_REVIEW", "WORKFLOW", qualification.websiteGap.reason, "WEBSITE_GAP_GATE");
      } else if (qualification.validation.status === "INVALID") {
        await transitionLead(this.env.DB, leadId, "DISQUALIFIED", "WORKFLOW", qualification.validation.reasons.join(" "), "WORKFLOW");
      } else if (qualification.validation.status === "NEEDS_RESEARCH" || qualification.validation.status === "HUMAN_REVIEW") {
        await transitionLead(this.env.DB, leadId, "HUMAN_REVIEW", "WORKFLOW", qualification.validation.reasons.join(" "), "WORKFLOW");
      } else if (qualification.score.total >= 65) {
        await transitionLead(this.env.DB, leadId, "QUALIFIED", "WORKFLOW", `Verified website gap + deterministic viability score ${qualification.score.total}`, "WORKFLOW");
      } else if (qualification.score.total >= 50) {
        await transitionLead(this.env.DB, leadId, "HUMAN_REVIEW", "WORKFLOW", `Verified website gap, but Priority C viability score ${qualification.score.total}; hold for nurture/manual review`, "WORKFLOW");
      } else {
        await transitionLead(this.env.DB, leadId, "DISQUALIFIED", "WORKFLOW", `Verified website gap, but viability score ${qualification.score.total} is below the 50-point minimum`, "WORKFLOW");
      }
      return { state: (await getLead(this.env.DB, leadId))?.current_state };
    });
    return {
      leadId,
      state: (await getLead(this.env.DB, leadId))?.current_state ?? "MISSING",
      score: qualification.score.total,
      priority: qualification.priority,
      validationStatus: qualification.validation.status,
      websiteGapStatus: qualification.websiteGap.status,
      outreachEnabled: false
    };
  }
};

// src/index.ts
function log(level, event, data = {}) {
  console[level](JSON.stringify({ level, event, ...data, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
}
__name(log, "log");
async function consumeEvent(message, env) {
  const event = message.body;
  log("info", "QUEUE_EVENT_RECEIVED", { eventId: event.eventId, eventType: event.eventType, leadId: event.leadId });
  if (event.eventType === "PROSPECT_RESEARCH_RECEIVED" && event.leadId) {
    const lead = await getLead(env.DB, event.leadId);
    if (!lead) {
      log("error", "QUEUE_LEAD_MISSING", { eventId: event.eventId, leadId: event.leadId });
      return;
    }
    if (lead.automation_paused) {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO deferred_events(id, lead_id, event_json, reason, status, created_at, updated_at)
        VALUES(?, ?, ?, 'AUTOMATION_PAUSED', 'DEFERRED', ?, ?)
      `).bind(newId("defer"), event.leadId, JSON.stringify(event), (/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString()).run();
      log("info", "QUEUE_EVENT_DEFERRED", { eventId: event.eventId, leadId: event.leadId });
      return;
    }
    const workflowId = `lead-qualify-${event.leadId}-${event.eventId}`.slice(0, 100);
    const instances = await env.LEAD_WORKFLOW.createBatch([
      { id: workflowId, params: { leadId: event.leadId, triggerEventId: event.eventId } }
    ]);
    await recordEvent(env.DB, {
      eventId: newId("evt"),
      leadId: event.leadId,
      eventType: "QUALIFICATION_WORKFLOW_REQUESTED",
      eventData: { workflowId, created: instances.length === 1 },
      source: "QUEUE",
      actor: "SYSTEM",
      idempotencyKey: `workflow-requested:${workflowId}`
    });
  }
  if (event.eventType === "JOB_RETRY_REQUESTED") {
    log("info", "JOB_RETRY_QUEUED", { eventId: event.eventId, jobId: event.eventData?.jobId });
  }
}
__name(consumeEvent, "consumeEvent");
async function keepRunnerAlive(env) {
  const [campaigns, demos] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS count FROM prospecting_campaigns WHERE status IN ('READY','RUNNING') AND archived_at IS NULL`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM demo_jobs WHERE status IN ('PENDING','CLAIMED','BUILDING','QA') OR (status='FAILED' AND attempt_count<max_attempts)`).first()
  ]);
  const activeCampaigns = campaigns?.count ?? 0, activeDemos = demos?.count ?? 0;
  if (activeCampaigns + activeDemos < 1) return;
  const result = await wakeOrgoProspector(env);
  log("info", "RUNNER_SELF_HEAL", { activeCampaigns, activeDemos, ...result });
}
__name(keepRunnerAlive, "keepRunnerAlive");
var index_default = {
  async fetch(request, env) {
    const requestId = crypto.randomUUID();
    const started = Date.now();
    try {
      const response = await handleRequest(request, env);
      log("info", "HTTP_REQUEST", { requestId, method: request.method, path: new URL(request.url).pathname, status: response.status, durationMs: Date.now() - started });
      return response;
    } catch (error) {
      if (error instanceof HttpError) {
        log("info", "HTTP_ERROR", { requestId, code: error.code, status: error.status, durationMs: Date.now() - started });
        return errorResponse(error.code, error.message, error.status, error.details);
      }
      const message = error instanceof Error ? error.message : String(error);
      log("error", "UNHANDLED_ERROR", { requestId, message, durationMs: Date.now() - started });
      return errorResponse("INTERNAL_ERROR", "Unexpected server error.", 500);
    }
  },
  async scheduled(controller, env, _ctx) {
    try {
      const outcome = await withLease(env.DB, "scheduled-main", 110, async () => {
        const reaped = await reapStaleDemoJobs(env.DB);
        const deferred = await replayDeferredEvents(env.DB, async (evt) => {
          await env.EVENTS_QUEUE.send(evt);
        });
        const prospectorJobs = await runDueProspectorJobs(env.DB, env);
        await keepRunnerAlive(env);
        const [followups, outreach, demoConsentRepair, demoApprovedRepair, quoteViewAlerts] = await Promise.all([
          processDueFollowups(env.DB, false),
          runAutonomousOutreach(env),
          repairDemoConsentHandoffs(env.DB),
          reconcileApprovedDemoJobs(env.DB),
          sendFirstViewAlerts(env)
        ]);
        return { reaped, deferred, prospectorJobs, followups, outreach, demoConsentRepair, demoApprovedRepair, quoteViewAlerts };
      });
      const repaired = outcome?.demoApprovedRepair?.requeued ?? 0;
      const reclaimed = outcome?.reaped?.reclaimed ?? 0;
      if (repaired > 0 || reclaimed > 0) {
        log("error", "SELF_HEAL_REPAIRED_SOMETHING", { cron: controller.cron, repaired, reclaimed });
      }
      log("info", "SCHEDULED_SELF_HEAL_COMPLETE", { cron: controller.cron, scheduledTime: controller.scheduledTime, ...outcome });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("error", "SCHEDULED_SELF_HEAL_FAILED", { cron: controller.cron, error: message });
      throw error;
    }
  },
  // The DLQ was configured and nothing consumed it. Now failures are visible.
  async queue(batch, env) {
    if (batch.queue.endsWith("-dlq")) {
      for (const message of batch.messages) {
        log("error", "DLQ_MESSAGE", { queueMessageId: message.id, body: message.body });
        await bumpCounter(env.DB, "dlq_messages");
        message.ack();
      }
      return;
    }
    for (const message of batch.messages) {
      try {
        await consumeEvent(message, env);
        message.ack();
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        log("error", "QUEUE_EVENT_FAILED", { queueMessageId: message.id, error: messageText });
        await bumpCounter(env.DB, "queue_event_failed");
        message.retry();
      }
    }
  }
};
export {
  LeadLifecycleWorkflow,
  index_default as default
};
