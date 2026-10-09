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

