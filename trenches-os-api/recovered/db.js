function nowIso() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
__name(nowIso, "nowIso");
function newId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}
__name(newId, "newId");
async function getLead(db, leadId) {
  return await db.prepare("SELECT * FROM leads WHERE id = ?").bind(leadId).first();
}
__name(getLead, "getLead");
async function createLead(db, input, actor) {
  const id = newId("lead");
  const timestamp = nowIso();
  const eventId = newId("evt");
  const event = {
    eventId,
    leadId: id,
    eventType: "LEAD_CREATED",
    eventData: { businessName: input.businessName, industry: input.industry },
    source: "API",
    actor
  };
  const statements = [
    db.prepare(`
      INSERT INTO leads (
        id, business_name, industry, city, state, phone, email, website,
        current_state, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'NEW', ?, ?)
    `).bind(
      id,
      input.businessName,
      input.industry,
      input.city,
      input.state,
      input.phone ?? null,
      input.email ?? null,
      input.website ?? null,
      timestamp,
      timestamp
    ),
    db.prepare(`
      INSERT INTO events (
        id, lead_id, event_type, event_data_json, source, actor, new_state, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'NEW', ?)
    `).bind(eventId, id, event.eventType, JSON.stringify(event.eventData), event.source, actor, timestamp)
  ];
  await db.batch(statements);
  const lead = await getLead(db, id);
  if (!lead) throw new Error("Lead creation did not persist.");
  return { lead, event };
}
__name(createLead, "createLead");
async function transitionLead(db, leadId, to, actor, reason, source = "SYSTEM") {
  const lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", `Lead ${leadId} was not found.`);
  if (lead.current_state === to) return lead;
  if (!canTransition(lead.current_state, to)) {
    throw new HttpError(409, "INVALID_STATE_TRANSITION", `Cannot transition ${lead.current_state} \u2192 ${to}.`, {
      from: lead.current_state,
      to
    });
  }
  if (actor !== "HUMAN") {
    if (lead.automation_paused) {
      throw new HttpError(409, "AUTOMATION_PAUSED", "Automation is paused for this lead.");
    }
    if (await globalAutomationPaused(db)) {
      throw new HttpError(409, "GLOBAL_AUTOMATION_PAUSED", "Global automation is paused.");
    }
  }
  const timestamp = nowIso();
  const eventId = newId("evt");
  const nextVersion = lead.version + 1;
  const update = db.prepare(`
    UPDATE leads
       SET current_state = ?, updated_at = ?, last_action_at = ?, version = ?,
           human_required = CASE
             WHEN ? = 'HUMAN_REVIEW' THEN 1
             WHEN current_state = 'HUMAN_REVIEW' THEN 0
             ELSE human_required
           END
     WHERE id = ? AND current_state = ? AND version = ?
  `).bind(to, timestamp, timestamp, nextVersion, to, leadId, lead.current_state, lead.version);
  const event = db.prepare(`
    INSERT INTO events (
      id, lead_id, event_type, event_data_json, source, actor, old_state, new_state, created_at
    )
    SELECT ?, id, 'STATE_CHANGED', ?, ?, ?, ?, ?, ?
      FROM leads
     WHERE id = ? AND current_state = ? AND version = ? AND updated_at = ?
  `).bind(
    eventId,
    JSON.stringify({ reason }),
    source,
    actor,
    lead.current_state,
    to,
    timestamp,
    leadId,
    to,
    nextVersion,
    timestamp
  );
  const results = await db.batch([update, event]);
  if ((results[0]?.meta.changes ?? 0) !== 1 || (results[1]?.meta.changes ?? 0) !== 1) {
    throw new HttpError(409, "CONCURRENT_MODIFICATION", "Lead changed while this transition was being processed. Retry the request.");
  }
  const updated = await getLead(db, leadId);
  if (!updated) throw new Error("Lead disappeared after transition.");
  return updated;
}
__name(transitionLead, "transitionLead");
async function recordEvent(db, event) {
  const timestamp = nowIso();
  const result = await db.prepare(`
    INSERT OR IGNORE INTO events (
      id, lead_id, event_type, event_data_json, source, actor, idempotency_key, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    event.eventId,
    event.leadId ?? null,
    event.eventType,
    JSON.stringify(event.eventData ?? {}),
    event.source,
    event.actor ?? null,
    event.idempotencyKey ?? null,
    timestamp
  ).run();
  return { inserted: (result.meta.changes ?? 0) === 1 };
}
__name(recordEvent, "recordEvent");
async function isSuppressed(db, phone, email) {
  if (!phone && !email) return false;
  const digits = phone ? String(phone).replace(/\D/g, "") : "";
  const e164 = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : phone ?? null;
  const mail = email ? String(email).trim().toLowerCase() : null;
  const row = await db.prepare(`
    SELECT id FROM suppressions
     WHERE (? IS NOT NULL AND (phone_e164 = ? OR phone = ?))
        OR (? IS NOT NULL AND lower(email) = ?)
     LIMIT 1
  `).bind(e164, e164, phone ?? null, mail, mail).first();
  return Boolean(row);
}
__name(isSuppressed, "isSuppressed");
async function addSuppression(db, input) {
  if (!input.phone && !input.email) {
    throw new HttpError(400, "SUPPRESSION_CONTACT_REQUIRED", "A suppression requires a phone or email.");
  }
  const timestamp = nowIso();
  const statements = [];
  if (input.phone) {
    const digits = String(input.phone).replace(/\D/g, "");
    const e164 = digits.length === 10 ? `+1${digits}` : digits.length === 11 && digits.startsWith("1") ? `+${digits}` : null;
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO suppressions (id, lead_id, phone, phone_e164, email, reason, source, created_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?, ?)
    `).bind(newId("sup"), input.leadId ?? null, input.phone, e164, input.reason, input.source, timestamp));
  }
  if (input.email) {
    statements.push(db.prepare(`
      INSERT OR IGNORE INTO suppressions (id, lead_id, phone, email, reason, source, created_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?)
    `).bind(newId("sup"), input.leadId ?? null, input.email, input.reason, input.source, timestamp));
  }
  await db.batch(statements);
}
__name(addSuppression, "addSuppression");
async function setLeadPause(db, leadId, paused, humanRequired, actor) {
  const timestamp = nowIso();
  let result = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const current = await getLead(db, leadId);
    if (!current) throw new HttpError(404, "LEAD_NOT_FOUND", `Lead ${leadId} was not found.`);
    result = await db.prepare(`
      UPDATE leads
         SET automation_paused = ?, human_required = ?, updated_at = ?, version = ?
       WHERE id = ? AND version = ?
    `).bind(paused ? 1 : 0, humanRequired ? 1 : 0, timestamp, current.version + 1, leadId, current.version).run();
    if ((result.meta.changes ?? 0) === 1) break;
    result = null;
  }
  if (!result) throw new HttpError(409, "CONCURRENT_MODIFICATION", "Lead changed while pausing. Retry the request.");
  await db.prepare(`
    INSERT INTO events (id, lead_id, event_type, event_data_json, source, actor, created_at)
    VALUES (?, ?, ?, ?, 'API', ?, ?)
  `).bind(newId("evt"), leadId, paused ? "AUTOMATION_PAUSED" : "AUTOMATION_RESUMED", JSON.stringify({ humanRequired }), actor, timestamp).run();
  const lead = await getLead(db, leadId);
  if (!lead) throw new Error("Lead disappeared after pause update.");
  return lead;
}
__name(setLeadPause, "setLeadPause");
async function globalAutomationPaused(db) {
  const row = await db.prepare(`SELECT value FROM system_flags WHERE key = 'GLOBAL_AUTOMATION_PAUSED'`).first();
  return row?.value === "true";
}
__name(globalAutomationPaused, "globalAutomationPaused");

