import { HttpError } from './http';
import { createLead, getLead, isSuppressed, newId, nowIso, recordEvent } from './db';
import type {
  DomainEvent,
  Lead,
  PhoneType,
  Priority,
  ProspectResearchInput,
  ProspectValidationResult,
  ScoreBreakdown,
  ValidationStatus,
  WebsiteQuality,
  WebsiteStatus
} from './types';

const HIGH_TICKET_TERMS = [
  'tree', 'roof', 'hvac', 'heating', 'air conditioning', 'plumb', 'electric', 'concrete',
  'foundation', 'garage door', 'remodel', 'restoration', 'septic', 'excavat', 'landscap',
  'pest', 'fence', 'floor', 'painting', 'pressure wash', 'solar', 'pool'
];

export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.length === 10 ? digits : value.trim().slice(0, 40);
}

function normalizedText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function prospectFingerprint(input: ProspectResearchInput): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(input));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest.slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}

function isHighTicketIndustry(industry: string): boolean {
  const n = normalizedText(industry);
  return HIGH_TICKET_TERMS.some((term) => n.includes(term));
}

function isRecentIso(dateString?: string): boolean {
  if (!dateString) return false;
  const time = Date.parse(dateString);
  if (!Number.isFinite(time)) return false;
  const ageMs = Date.now() - time;
  return ageMs >= 0 && ageMs <= 180 * 24 * 60 * 60 * 1000;
}

// A business with no site, a dead site, a parked domain or a Facebook-only
// presence is exactly the target, so it earns the gap points whether or not
// enrichment managed to grade a website's quality. Before 2026-10 only the
// quality grade counted, so a no-website lead with quality UNKNOWN scored 0 of
// 40 and landed in HUMAN_REVIEW (361 leads by 2026-10-22).
function digitalPoints(quality: WebsiteQuality, status?: WebsiteStatus): number {
  const byStatus = (() => {
    switch (status) {
      case 'NONE': return 40;
      case 'BROKEN': return 35;
      case 'PARKED': return 35;
      case 'PLACEHOLDER': return 35;
      case 'SOCIAL_ONLY': return 30;
      default: return 0;
    }
  })();
  const byQuality = (() => {
    switch (quality) {
      case 'NONE': return 40;
      case 'POOR': return 30;
      case 'OUTDATED': return 20;
      case 'AVERAGE': return 5;
      default: return 0;
    }
  })();
  return Math.max(byStatus, byQuality);
}


export type WebsiteGapDecision = {
  status: 'ELIGIBLE' | 'INELIGIBLE' | 'REVIEW';
  reason: string;
};

export function websiteGapDecision(input: Pick<ProspectResearchInput, 'websiteUrl'|'websiteQuality'|'websiteStatus'>): WebsiteGapDecision {
  const quality = input.websiteQuality ?? 'UNKNOWN';
  const status = input.websiteStatus ?? (quality === 'NONE' ? 'NONE' : 'UNKNOWN');
  const hasUrl = Boolean(input.websiteUrl?.trim());

  // Contradictory website facts must be reviewed, never guessed through.
  if ((status === 'NONE' || quality === 'NONE') && hasUrl) {
    return { status: 'REVIEW', reason: 'Website research is contradictory: marked as no website but a website URL is present.' };
  }
  if (status === 'ACTIVE' && !hasUrl) {
    return { status: 'REVIEW', reason: 'Website research is contradictory: status is ACTIVE but no website URL is present.' };
  }

  // These are explicit digital-gap states and are always eligible for the Trenches offer.
  if (['NONE','BROKEN','PARKED','SOCIAL_ONLY','PLACEHOLDER'].includes(status)) {
    return { status: 'ELIGIBLE', reason: `Verified digital gap: website status is ${status}.` };
  }
  if (quality === 'POOR' || quality === 'OUTDATED') {
    return { status: 'ELIGIBLE', reason: `Verified digital gap: website quality is ${quality}.` };
  }

  // A modern active site is outside the business model. Average is not a strong enough
  // gap to justify automated outreach; a human may manually override it if desired.
  if (hasUrl && quality === 'MODERN') {
    return { status: 'INELIGIBLE', reason: 'Modern website found; no meaningful website-refresh opportunity.' };
  }
  if (hasUrl && quality === 'AVERAGE') {
    return { status: 'INELIGIBLE', reason: 'Average functional website found; digital gap is not strong enough for automated prospecting.' };
  }

  return { status: 'REVIEW', reason: 'Website gap could not be verified as no-site, broken, parked, social-only, placeholder, poor, or outdated.' };
}

export function validateProspect(input: ProspectResearchInput): ProspectValidationResult {
  const reasons: string[] = [];
  let status: ValidationStatus = 'VALID';

  if (input.isOperating === false) return { status: 'INVALID', reasons: ['Business is not currently operating.'] };
  if (input.isSupplier === true) return { status: 'INVALID', reasons: ['Business is a supplier/equipment dealer rather than the target local operator.'] };
  if (input.isFranchiseHq === true) return { status: 'INVALID', reasons: ['Business is a franchise headquarters rather than the target local operator.'] };

  if (input.isOperating !== true) {
    status = 'NEEDS_RESEARCH';
    reasons.push('Operating status is not positively verified.');
  }

  // A Google Maps/Business URL is not reliably retrievable by an LLM doing web
  // search, and runner.py tells the researcher to omit unverifiable fields.
  // Requiring it here blocked 43 of 44 leads. Accept equivalent proof that a
  // real listing exists.
  const hasListingEvidence = Boolean(input.googleUrl)
    || (input.googleRating !== undefined && (input.googleReviewCount ?? 0) > 0)
    || (Boolean(input.phone) && input.sources.length > 0);

  if (!hasListingEvidence) {
    status = status === 'VALID' ? 'NEEDS_RESEARCH' : status;
    reasons.push('No listing evidence: needs a Google profile URL, a rating with review count, or a verified phone with a source URL.');
  }

  if (!input.sources.length) {
    status = status === 'VALID' ? 'NEEDS_RESEARCH' : status;
    reasons.push('No research sources were supplied.');
  }

  if (!input.phone && !input.email) {
    status = status === 'VALID' ? 'NEEDS_RESEARCH' : status;
    reasons.push('No contact method was verified.');
  }

  if (input.researchConfidence !== undefined && input.researchConfidence < 0.7) {
    status = status === 'VALID' ? 'NEEDS_RESEARCH' : status;
    reasons.push('Research confidence is below 0.70.');
  }

  if (input.websiteQuality === 'NONE' && input.websiteUrl) {
    return { status: 'HUMAN_REVIEW', reasons: ['Website quality says NONE but a website URL was supplied.'] };
  }

  if (input.websiteQuality !== 'NONE' && input.websiteQuality !== 'UNKNOWN' && !input.websiteUrl) {
    status = 'HUMAN_REVIEW';
    reasons.push('Website was classified but no website URL was supplied.');
  }

  if (input.websiteStatus === 'NONE' && input.websiteUrl) {
    status = 'HUMAN_REVIEW';
    reasons.push('Website status says NONE but a website URL was supplied.');
  }

  if ((input.contradictionFlags ?? []).length) {
    status = 'HUMAN_REVIEW';
    reasons.push(...(input.contradictionFlags ?? []).map((flag) => `Research contradiction: ${flag}`));
  }

  if (input.googleRating !== undefined && (input.googleRating < 0 || input.googleRating > 5)) {
    return { status: 'HUMAN_REVIEW', reasons: ['Google rating is outside the 0-5 range.'] };
  }

  if (!reasons.length) reasons.push('Required verification checks passed.');
  return { status, reasons };
}

export function scoreProspect(input: ProspectResearchInput): ScoreBreakdown {
  const reasons: string[] = [];
  const digitalOpportunity = digitalPoints(input.websiteQuality, input.websiteStatus);
  if (digitalOpportunity) reasons.push(`Digital gap +${digitalOpportunity} (quality ${input.websiteQuality.toLowerCase()}, status ${(input.websiteStatus ?? 'UNKNOWN').toLowerCase()}).`);

  let reputation = 0;
  if ((input.googleRating ?? 0) >= 4.7) { reputation += 10; reasons.push('Reputation +10 (4.7+ Google rating).'); }
  if ((input.googleReviewCount ?? 0) >= 100) { reputation += 10; reasons.push('Reputation +10 (100+ Google reviews).'); }
  if (isRecentIso(input.lastReviewAt)) { reputation += 5; reasons.push('Reputation +5 (recent review activity).'); }

  let businessEconomics = 0;
  if (input.isLocalIndependent === true) { businessEconomics += 5; reasons.push('Economics +5 (local independent operator).'); }
  if (isHighTicketIndustry(input.industry)) { businessEconomics += 5; reasons.push('Economics +5 (high-value service category).'); }
  if ((input.yearsInBusiness ?? 0) >= 3 || (input.googleReviewCount ?? 0) >= 50) {
    businessEconomics += 5;
    reasons.push('Economics +5 (established operating signal).');
  }
  if ((input.googleReviewCount ?? 0) >= 100) { businessEconomics += 5; reasons.push('Economics +5 (strong demonstrated demand).'); }

  let contactability = 0;
  if (input.phone && input.phoneType === 'MOBILE') { contactability += 10; reasons.push('Contactability +10 (verified mobile).'); }
  if (input.email) { contactability += 5; reasons.push('Contactability +5 (email available).'); }

  const total = Math.min(100, digitalOpportunity + reputation + businessEconomics + contactability);
  return { digitalOpportunity, reputation, businessEconomics, contactability, total, reasons };
}

export function priorityForScore(score: number): Priority {
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  return 'PASS';
}

export async function findDuplicate(db: D1Database, input: ProspectResearchInput): Promise<Lead | null> {
  const phone = normalizePhone(input.phone);
  if (phone) {
    const byPhone = await db.prepare(`SELECT * FROM leads WHERE phone = ? OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, '-', ''), ' ', ''), '(', ''), ')', ''), '+1', '') = ? LIMIT 1`).bind(phone, phone).first<Lead>();
    if (byPhone) return byPhone;
  }
  if (input.email) {
    const byEmail = await db.prepare('SELECT * FROM leads WHERE lower(email) = lower(?) LIMIT 1').bind(input.email).first<Lead>();
    if (byEmail) return byEmail;
  }
  return await db.prepare(`
    SELECT * FROM leads
    WHERE lower(business_name) = lower(?) AND lower(city) = lower(?) AND lower(state) = lower(?)
    LIMIT 1
  `).bind(input.businessName, input.city, input.state).first<Lead>();
}

async function upsertResearch(db: D1Database, leadId: string, input: ProspectResearchInput): Promise<void> {
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
    newId('research'), leadId,
    JSON.stringify(input.services ?? []),
    JSON.stringify(input.serviceArea ?? []),
    JSON.stringify(input.businessHours ?? {}),
    input.ownerName ?? null,
    input.yearsInBusiness ?? null,
    JSON.stringify(input.brandColors ?? []),
    input.logoUrl ?? null,
    input.researchConfidence ?? null,
    JSON.stringify({ sources: input.sources, externalId: input.externalId ?? null }),
    timestamp, timestamp, timestamp,
    input.isOperating === undefined ? null : (input.isOperating ? 1 : 0),
    input.isLocalIndependent === undefined ? null : (input.isLocalIndependent ? 1 : 0),
    input.isSupplier === undefined ? null : (input.isSupplier ? 1 : 0),
    input.isFranchiseHq === undefined ? null : (input.isFranchiseHq ? 1 : 0),
    input.lastReviewAt ?? null,
    input.primaryService ?? null,
    input.socialActivity ?? 'UNKNOWN',
    input.sources.length,
    JSON.stringify(input.websiteEvidence ?? []),
    JSON.stringify(input.contradictionFlags ?? [])
  ).run();
}

async function updateLeadFromResearch(db: D1Database, leadId: string, input: ProspectResearchInput): Promise<void> {
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
    input.industry, input.city, input.state, phone, input.phoneType, input.email ?? null,
    input.websiteUrl ?? null, input.facebookUrl ?? null, input.instagramUrl ?? null, input.googleUrl ?? null,
    input.googleRating ?? null, input.googleReviewCount ?? null, input.websiteQuality,
    input.streetAddress ?? null, input.postalCode ?? null, input.websiteStatus ?? (input.websiteQuality === 'NONE' ? 'NONE' : 'UNKNOWN'),
    input.phoneVerified ? 1 : 0, input.emailVerified ? 1 : 0,
    input.sources.length, timestamp, timestamp, leadId
  ).run();
}

export async function ingestProspect(
  db: D1Database,
  input: ProspectResearchInput,
  source: string,
  actor: string
): Promise<{ lead: Lead; event: DomainEvent; duplicateLead: boolean; eventInserted: boolean }> {
  const normalizedPhone = normalizePhone(input.phone);
  if (await isSuppressed(db, normalizedPhone, input.email ?? null)) {
    throw new HttpError(409, 'CONTACT_SUPPRESSED', 'This prospect matches the suppression list.');
  }

  let lead = await findDuplicate(db, { ...input, phone: normalizedPhone ?? undefined });
  let duplicate = Boolean(lead);
  if (!lead) {
    const created = await createLead(db, {
      businessName: input.businessName,
      industry: input.industry,
      city: input.city,
      state: input.state,
      phone: normalizedPhone ?? undefined,
      email: input.email,
      website: input.websiteUrl
    }, actor);
    lead = created.lead;
    duplicate = false;
  }

  await updateLeadFromResearch(db, lead.id, { ...input, phone: normalizedPhone ?? undefined });
  await upsertResearch(db, lead.id, input);

  const fingerprint = await prospectFingerprint(input);
  const event: DomainEvent = {
    eventId: newId('evt'),
    leadId: lead.id,
    eventType: 'PROSPECT_RESEARCH_RECEIVED',
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
  if (!refreshed) throw new Error('Lead disappeared after prospect ingestion.');
  return { lead: refreshed, event, duplicateLead: duplicate, eventInserted: inserted.inserted };
}

export async function applyQualification(
  db: D1Database,
  leadId: string,
  input: ProspectResearchInput
): Promise<{ validation: ProspectValidationResult; score: ScoreBreakdown; priority: Priority; websiteGap: WebsiteGapDecision }> {
  const validation = validateProspect(input);
  const websiteGap = websiteGapDecision(input);
  const score = scoreProspect(input);
  const priority = priorityForScore(score.total);
  const timestamp = nowIso();
  const reason = websiteGap.status === 'INELIGIBLE'
    ? websiteGap.reason
    : websiteGap.status === 'REVIEW'
      ? websiteGap.reason
      : validation.status === 'VALID'
        ? (score.total >= 65
            ? `Website gap verified. Qualified with score ${score.total}.`
            : score.total >= 50
              ? `Website gap verified. Priority C score ${score.total}; hold for nurture/manual review.`
              : `Website gap verified, but score ${score.total} is below the 50-point minimum.`)
        : validation.reasons.join(' ');
  await db.prepare(`
    UPDATE leads SET
      validation_status = ?, opportunity_score = ?, priority = ?, qualification_reason = ?,
      score_breakdown_json = ?, outreach_eligible = 0, website_gap_status = ?, website_gap_reason = ?,
      updated_at = ?, version = version + 1
    WHERE id = ?
  `).bind(validation.status, score.total, priority, reason, JSON.stringify(score), websiteGap.status, websiteGap.reason, timestamp, leadId).run();
  return { validation, score, priority, websiteGap };
}

export async function loadResearchInput(db: D1Database, leadId: string): Promise<ProspectResearchInput | null> {
  const lead = await getLead(db, leadId);
  if (!lead) return null;
  const r = await db.prepare('SELECT * FROM lead_research WHERE lead_id = ? LIMIT 1').bind(leadId).first<Record<string, unknown>>();
  if (!r) return null;
  let sourceData: { sources?: Array<{ url: string; type?: string; label?: string }>; externalId?: string | null } = {};
  try { sourceData = JSON.parse(String(r.source_data_json ?? '{}')) as typeof sourceData; } catch { sourceData = {}; }
  const parseStringArray = (raw: unknown): string[] => {
    try { const v = JSON.parse(String(raw ?? '[]')); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []; } catch { return []; }
  };
  const parseObject = (raw: unknown): Record<string, unknown> => {
    try { const v = JSON.parse(String(raw ?? '{}')); return v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {}; } catch { return {}; }
  };
  return {
    externalId: sourceData.externalId ?? undefined,
    businessName: lead.business_name,
    industry: lead.industry,
    city: lead.city,
    state: lead.state,
    phone: lead.phone ?? undefined,
    phoneType: lead.phone_type,
    email: lead.email ?? undefined,
    websiteUrl: lead.website ?? undefined,
    websiteQuality: lead.website_quality ?? 'UNKNOWN',
    streetAddress: lead.street_address ?? undefined,
    postalCode: lead.postal_code ?? undefined,
    websiteStatus: lead.website_status ?? undefined,
    phoneVerified: lead.phone_verified === 1,
    emailVerified: lead.email_verified === 1,
    websiteEvidence: (() => { try { const v = JSON.parse(String(r.website_evidence_json ?? '[]')); return Array.isArray(v) ? v : []; } catch { return []; } })(),
    contradictionFlags: parseStringArray(r.contradiction_flags_json),
    facebookUrl: lead.facebook_url ?? undefined,
    instagramUrl: lead.instagram_url ?? undefined,
    googleUrl: lead.google_url ?? undefined,
    googleRating: lead.google_rating ?? undefined,
    googleReviewCount: lead.google_reviews ?? undefined,
    isOperating: r.is_operating === null || r.is_operating === undefined ? undefined : Number(r.is_operating) === 1,
    isLocalIndependent: r.is_local_independent === null || r.is_local_independent === undefined ? undefined : Number(r.is_local_independent) === 1,
    isSupplier: r.is_supplier === null || r.is_supplier === undefined ? undefined : Number(r.is_supplier) === 1,
    isFranchiseHq: r.is_franchise_hq === null || r.is_franchise_hq === undefined ? undefined : Number(r.is_franchise_hq) === 1,
    yearsInBusiness: r.years_in_business === null || r.years_in_business === undefined ? undefined : Number(r.years_in_business),
    lastReviewAt: r.last_review_at ? String(r.last_review_at) : undefined,
    primaryService: r.primary_service ? String(r.primary_service) : undefined,
    services: parseStringArray(r.services_json),
    serviceArea: parseStringArray(r.service_area_json),
    businessHours: parseObject(r.business_hours_json),
    ownerName: r.owner_name ? String(r.owner_name) : undefined,
    brandColors: parseStringArray(r.brand_colors_json),
    logoUrl: r.logo_url ? String(r.logo_url) : undefined,
    socialActivity: (r.social_activity ? String(r.social_activity) : 'UNKNOWN') as ProspectResearchInput['socialActivity'],
    sources: Array.isArray(sourceData.sources) ? sourceData.sources : [],
    researchConfidence: r.research_confidence === null || r.research_confidence === undefined ? undefined : Number(r.research_confidence)
  };
}