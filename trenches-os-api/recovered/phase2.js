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

