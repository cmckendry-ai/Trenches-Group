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

