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
  const smartleadWebhookMatch = path.match(/^\/integrations\/smartlead\/webhook\/([^/]+)$/);
  if (smartleadWebhookMatch && request.method === "POST") {
    const expected = await webhookSecret(env.DB);
    if (decodeURIComponent(smartleadWebhookMatch[1]) !== expected) throw new HttpError(404, "NOT_FOUND", "Not found.");
    const payload = await readJsonObject(request);
    return json(await processSmartleadWebhookEvent(env, payload));
  }
  if (request.method === "GET" && path === "/integrations/gmail/oauth/callback") {
    return await handleLiveReplyOAuthCallback(request, env);
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
      let text = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
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
  if (request.method === "POST" && path === "/api/outreach/email/live-reply/oauth/start") {
    return json(await startLiveReplyOAuth(env.DB, env));
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
    return json({ campaigns: await listCampaigns(env.DB, 100, url.searchParams.get("archived") === "true") });
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
    return json({ jobs: await listProspectorJobs(env.DB) });
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

