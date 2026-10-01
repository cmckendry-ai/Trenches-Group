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

