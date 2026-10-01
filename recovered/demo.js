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

