async function requalifyStuckLeads(db, queue, options) {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const dryRun = options.dryRun ?? false;
  let query = `
    SELECT l.id, l.business_name, l.qualification_reason, l.updated_at
      FROM leads l
      JOIN lead_research r ON r.lead_id = l.id
     WHERE l.current_state = 'HUMAN_REVIEW'
       AND l.automation_paused = 0
  `;
  const binds = [];
  if (options.leadIds?.length) {
    query += ` AND l.id IN (${options.leadIds.map(() => "?").join(",")})`;
    binds.push(...options.leadIds);
  }
  query += ` ORDER BY l.updated_at ASC LIMIT ?`;
  binds.push(limit);
  const rows = await db.prepare(query).bind(...binds).all();
  const candidates = rows.results ?? [];
  const skipped = [];
  const leads = [];
  let queued = 0;
  const batchStamp = nowIso();
  for (const lead of candidates) {
    leads.push({
      leadId: lead.id,
      businessName: lead.business_name,
      previousReason: lead.qualification_reason
    });
    if (dryRun) continue;
    const event = {
      eventId: newId("evt"),
      leadId: lead.id,
      eventType: "PROSPECT_RESEARCH_RECEIVED",
      eventData: {
        requalify: true,
        previousReason: lead.qualification_reason,
        stuckSince: lead.updated_at
      },
      source: "ADMIN_REQUALIFY",
      actor: options.actor,
      idempotencyKey: `requalify:${lead.id}:${batchStamp}`
    };
    const recorded = await recordEvent(db, event);
    if (!recorded.inserted) {
      skipped.push({ leadId: lead.id, reason: "Duplicate event; already queued in this batch." });
      continue;
    }
    try {
      await queue.send(event);
      queued += 1;
    } catch (error) {
      skipped.push({
        leadId: lead.id,
        reason: `Queue send failed: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  return { scanned: candidates.length, queued, skipped, dryRun, leads };
}
__name(requalifyStuckLeads, "requalifyStuckLeads");

