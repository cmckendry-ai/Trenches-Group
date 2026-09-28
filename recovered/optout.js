function toE164Safe(value) {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15 && String(value).trim().startsWith("+")) return `+${digits}`;
  return null;
}
__name(toE164Safe, "toE164Safe");
function normalizeEmail(value) {
  if (!value) return null;
  const email = String(value).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
__name(normalizeEmail, "normalizeEmail");
async function optOutLead(db, input) {
  const ts = nowIso();
  const actor = input.actor ?? "SYSTEM";
  let lead = null;
  if (input.leadId) lead = await getLead(db, input.leadId);
  const phones = /* @__PURE__ */ new Set();
  const emails = /* @__PURE__ */ new Set();
  for (const p of [input.phone, lead?.phone, lead?.phone_e164]) {
    const e164 = toE164Safe(p);
    if (e164) phones.add(e164);
  }
  for (const e of [input.email, lead?.email]) {
    const norm = normalizeEmail(e);
    if (norm) emails.add(norm);
  }
  const statements = [];
  for (const phone of phones) {
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO suppressions(id, lead_id, phone, phone_e164, email, reason, source, created_at)
      VALUES(?, ?, ?, ?, NULL, 'OPT_OUT', ?, ?)
    `).bind(newId("sup"), lead?.id ?? input.leadId ?? null, phone, phone, input.source, ts));
  }
  for (const email of emails) {
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO suppressions(id, lead_id, phone, phone_e164, email, reason, source, created_at)
      VALUES(?, ?, NULL, NULL, ?, 'OPT_OUT', ?, ?)
    `).bind(newId("sup"), lead?.id ?? input.leadId ?? null, email, input.source, ts));
  }
  if (statements.length) await db.batch(statements);
  let sequencesCancelled = false;
  if (lead) {
    await db.batch([
      db.prepare(`UPDATE outreach_sequences SET status='CANCELLED', stop_reason=?, updated_at=? WHERE lead_id=? AND status IN ('ACTIVE','PAUSED')`).bind(`Opt-out via ${input.source}`, ts, lead.id),
      db.prepare(`UPDATE outreach_sequence_steps SET status='CANCELLED', last_error=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','RUNNING')`).bind(`Opt-out via ${input.source}`, ts, lead.id),
      db.prepare(`UPDATE demo_jobs SET status='CANCELLED', last_error=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','CLAIMED','BUILDING','QA')`).bind(`Opt-out via ${input.source}`, ts, lead.id)
    ]);
    sequencesCancelled = true;
    await db.prepare(`
      INSERT INTO outreach_permissions(lead_id,sms_status,consent_source,consent_evidence,consent_at,revoked_at,updated_at,updated_by)
      VALUES(?,'OPTED_OUT',?,?,NULL,?,?,?)
      ON CONFLICT(lead_id) DO UPDATE SET
        sms_status='OPTED_OUT', consent_source=excluded.consent_source,
        consent_evidence=excluded.consent_evidence, revoked_at=excluded.revoked_at,
        updated_at=excluded.updated_at, updated_by=excluded.updated_by
    `).bind(lead.id, input.source, input.evidence?.slice(0, 2e3) ?? null, ts, ts, actor).run();
  }
  let transitioned = false;
  if (lead) {
    const terminal = ["OPTED_OUT", "DISQUALIFIED", "DUPLICATE", "LOST"];
    if (!terminal.includes(lead.current_state)) {
      try {
        await transitionLead(db, lead.id, "OPTED_OUT", "HUMAN", `Opt-out received via ${input.source}.`, input.source);
        transitioned = true;
      } catch (error) {
        await bumpCounter(db, "optout_transition_failed");
        await recordEvent(db, {
          eventId: newId("evt"),
          leadId: lead.id,
          eventType: "OPT_OUT_TRANSITION_FAILED",
          eventData: { from: lead.current_state, message: error instanceof Error ? error.message : String(error) },
          source: input.source,
          actor
        });
      }
    }
    await recordEvent(db, {
      eventId: newId("evt"),
      leadId: lead.id,
      eventType: "OPT_OUT_PROCESSED",
      eventData: { source: input.source, phones: [...phones].length, emails: [...emails].length, transitioned },
      source: input.source,
      actor
    });
  }
  return { suppressed: statements.length, sequencesCancelled, transitioned };
}
__name(optOutLead, "optOutLead");

