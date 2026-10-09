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

