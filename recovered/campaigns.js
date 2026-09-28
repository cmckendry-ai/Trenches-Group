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
function treeTargetMatch(text) {
  const exact = ["tree service", "tree removal", "tree trimming", "tree care", "arborist", "stump grinding", "stump removal", "tree surgery"];
  const adjacent = ["landscap", "land clearing", "brush clearing", "forestry", "lot clearing", "outdoor"];
  if (exact.some((term) => text.includes(term))) return "MATCH";
  if (adjacent.some((term) => text.includes(term))) return "ADJACENT";
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
async function listCampaigns(db, limit = 100, archived = false) {
  const rows = await db.prepare(`
    SELECT * FROM prospecting_campaigns
    WHERE ${archived ? "archived_at IS NOT NULL" : "archived_at IS NULL"}
    ORDER BY created_at DESC LIMIT ?
  `).bind(limit).all();
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
      qualified_count, notes, created_at, updated_at, min_rating, min_reviews, model, updated_by, last_stage
    ) VALUES (?, ?, ?, ?, ?, ?, 'PROVIDER_ROUTER_V19', ?, ?, ?, 'READY', ?, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, 'DISCOVERY')
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
    actor
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

