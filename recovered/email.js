function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(bytesToBase64Url, "bytesToBase64Url");
function cleanHeader(value) {
  return value.replace(/[\r\n]+/g, " ").trim();
}
__name(cleanHeader, "cleanHeader");
import { EmailMessage } from "cloudflare:email";
var LIVE_REPLY_FROM_ADDRESS = "connor.trenches@discovertrenchesgroup.com";
function buildMime(input) {
  const headers = [
    `From: ${cleanHeader(input.fromName)} <${cleanHeader(input.fromEmail)}>`,
    `To: ${cleanHeader(input.to)}`,
    `Subject: ${cleanHeader(input.subject)}`,
    `Date: ${(/* @__PURE__ */ new Date()).toUTCString()}`,
    `Message-ID: ${cleanHeader(input.rfcMessageId)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit"
  ];
  if (input.unsubscribeUrl) {
    headers.push(`List-Unsubscribe: <${cleanHeader(input.unsubscribeUrl)}>`);
    headers.push("List-Unsubscribe-Post: List-Unsubscribe=One-Click");
  }
  return `${headers.join("\r\n")}\r
\r
${input.body.replace(/\r?\n/g, "\r\n")}`;
}
__name(buildMime, "buildMime");
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
  const text = body.trim().toLowerCase();
  if (/\b(unsubscribe|remove me|take me off|stop emailing|do not email|don't email|no more emails|opt ?out)\b/i.test(text)) return "OPT_OUT";
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
async function emailSuppressed(db, email) {
  const row = await db.prepare(`SELECT id FROM suppressions WHERE lower(email)=? LIMIT 1`).bind(normalizedEmail(email)).first();
  return Boolean(row);
}
__name(emailSuppressed, "emailSuppressed");
async function ensureUnsubscribeToken(db, leadId, email) {
  const existing = await db.prepare(`SELECT token FROM outreach_unsubscribe_tokens WHERE lead_id=? AND lower(email)=? AND used_at IS NULL ORDER BY created_at DESC LIMIT 1`).bind(leadId, normalizedEmail(email)).first();
  if (existing?.token) return existing.token;
  const token = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  await db.prepare(`INSERT INTO outreach_unsubscribe_tokens(token,lead_id,email,created_at) VALUES(?,?,?,?)`).bind(token, leadId, normalizedEmail(email), nowIso()).run();
  return token;
}
__name(ensureUnsubscribeToken, "ensureUnsubscribeToken");
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
async function sendLiveReply(env, input) {
  if (await globalAutomationPaused(env.DB)) throw new HttpError(409, "GLOBAL_AUTOMATION_PAUSED", "Global automation is paused.");
  if (!env.SEND_EMAIL) throw new HttpError(409, "LIVE_REPLY_MAILBOX_NOT_CONNECTED", "The live-reply send_email binding is not configured.");
  const mailbox = LIVE_REPLY_FROM_ADDRESS;
  const to = normalizedEmail(input.to);
  const s = await settings(env.DB);
  const testOnly = input.testOnly !== false;
  const allowlisted = await emailTestAllowed(env.DB, to);
  if (await emailSuppressed(env.DB, to)) throw new HttpError(409, "CONTACT_SUPPRESSED", "This email address is suppressed.");
  if (testOnly && !allowlisted) throw new HttpError(409, "EMAIL_TEST_MODE_LOCK", "Test email can only be sent to the email test allowlist.");
  if (!testOnly) {
    if (!s.emailLiveMode) throw new HttpError(409, "EMAIL_LIVE_MODE_LOCK", "Live autonomous email is not enabled.");
    if (!s.postalAddress.trim()) throw new HttpError(409, "POSTAL_ADDRESS_REQUIRED", "Business postal address is required for live email.");
  }
  let lead = null;
  if (input.leadId) {
    lead = await getLead(env.DB, input.leadId);
    if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  }
  let firstName;
  if (lead) {
    const research = await env.DB.prepare(`SELECT owner_name FROM lead_research WHERE lead_id=? LIMIT 1`).bind(lead.id).first();
    firstName = firstNameFromOwnerName(research?.owner_name);
  }
  let body = formatEmailCorrespondence(input.body, firstName);
  let unsubscribeUrl;
  if (lead?.email && !testOnly) {
    const token = await ensureUnsubscribeToken(env.DB, lead.id, to);
    unsubscribeUrl = `${env.PUBLIC_BASE_URL}/unsubscribe/email/${encodeURIComponent(token)}`;
    body += `

Trenches Group
${s.postalAddress}
Unsubscribe: ${unsubscribeUrl}`;
  }
  const rfcMessageId = `<${crypto.randomUUID()}@discovertrenchesgroup.com>`;
  const mime = buildMime({ fromName: s.fromName, fromEmail: mailbox, to, subject: input.subject, body, rfcMessageId, unsubscribeUrl });
  try {
    await env.SEND_EMAIL.send(new EmailMessage(mailbox, to, mime));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const id2 = await storeEmailMessage(env.DB, { leadId: lead?.id, direction: "OUTBOUND", from: mailbox, to, subject: input.subject, body, status: "FAILED", intent: input.intent, isTest: testOnly, errorMessage: msg });
    throw new HttpError(502, "LIVE_REPLY_SEND_FAILED", "Live reply send failed.", { messageId: id2, message: msg });
  }
  const id = await storeEmailMessage(env.DB, { leadId: lead?.id, direction: "OUTBOUND", rfcMessageId, from: mailbox, to, subject: input.subject, body, status: "SENT", intent: input.intent, isTest: testOnly });
  if (lead) await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: testOnly ? "EMAIL_TEST_SENT" : "EMAIL_SENT", eventData: { emailMessageId: id, to }, source: "LIVE_REPLY", actor: "SYSTEM" });
  return { id, test: testOnly };
}
__name(sendLiveReply, "sendLiveReply");
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
async function maybeAutoReply(env, lead, decision, subject, isTest, replyToEmail) {
  const s = await settings(env.DB);
  if (s.autoReplyMode !== "AUTO") return;
  if (!decision.draft) return;
  if (decision.action === "STOP" && decision.intent === "OPT_OUT") return;
  if (decision.action === "ESCALATE" && !decision.draft) return;
  const replySubject = /^re:/i.test(subject) ? subject : `Re: ${subject}`;
  const sent = await sendLiveReply(env, { to: replyToEmail, subject: replySubject, body: decision.draft, leadId: lead.id, testOnly: isTest, intent: decision.intent });
  if (decision.draftId) await env.DB.prepare(`UPDATE outreach_reply_drafts SET status='SENT',channel='EMAIL',updated_at=? WHERE id=?`).bind(nowIso(), decision.draftId).run();
}
__name(maybeAutoReply, "maybeAutoReply");
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
  const intent = classifyEmailInbound(body);
  const isTest = await emailTestAllowed(env.DB, fromEmail);
  await storeEmailMessage(env.DB, { leadId: lead?.id, direction: "INBOUND", from: fromEmail, to: await smartleadMailboxEmail(env.DB) || "", subject, body, status: "RECEIVED", intent, isTest, raw: { campaignId: payload.campaign_id, leadId: payload.lead_id } });
  if (!lead) return { handled: true };
  await cancelSequencesForLead(env.DB, lead.id, `Inbound email reply: ${intent}`);
  if (intent === "OPT_OUT") await optOutLead(env.DB, { leadId: lead.id, email: fromEmail, phone: lead.phone, source: "SMARTLEAD", evidence: body.slice(0, 500) });
  await safeLeadTransitionForEmail(env.DB, lead, intent);
  await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "EMAIL_INBOUND_RECEIVED", eventData: { intent, isTest, campaignId: payload.campaign_id }, source: "SMARTLEAD", actor: "SYSTEM" });
  if (lead.current_state === "DISQUALIFIED" && intent !== "OPT_OUT") {
    await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "CONCIERGE_REPLY_RECEIVED", eventData: { intent, isTest }, source: "SMARTLEAD", actor: "SYSTEM" });
    return { handled: true };
  }
  const decision = await processConversationInbound(env.DB, lead, intent, body, null);
  const conversationOutcome = decision.action === "TRIGGER_DEMO" ? "DEMO_APPROVED" : decision.action;
  await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "CONVERSATION_OUTCOME", eventData: { conversationOutcome }, source: "SMARTLEAD", actor: "SYSTEM" });
  await maybeAutoReply(env, lead, decision, subject, isTest, fromEmail);
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
    liveReplyConnected: Boolean(env.SEND_EMAIL),
    liveReplyEmail: LIVE_REPLY_FROM_ADDRESS,
    liveReplyStatus: env.SEND_EMAIL ? "CONNECTED" : "DISCONNECTED",
    liveReplyError: env.SEND_EMAIL ? null : "send_email binding is not configured on this Worker.",
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
  return await sendLiveReply(env, { to: input.email, subject: input.subject || "Trenches OS email test", body: input.message || "Trenches email test.", leadId: input.leadId, testOnly: true, intent: "TEST" });
}
__name(sendEmailTest, "sendEmailTest");

