var STOP_STATES = /* @__PURE__ */ new Set(["DISQUALIFIED", "OPTED_OUT", "NOT_INTERESTED", "BAD_NUMBER", "DUPLICATE", "LOST"]);
var EARLY_REAUDIT_STATES = /* @__PURE__ */ new Set(["NEW", "RESEARCHING", "RESEARCHED", "QUALIFYING", "QUALIFIED", "HUMAN_REVIEW"]);
var MANUAL_STATE_OPTIONS = LEAD_STATES;
async function cancelLeadAutomation(db, leadId, reason) {
  const timestamp = nowIso();
  await db.batch([
    db.prepare(`UPDATE outreach_sequences SET status='CANCELLED', stop_reason=?, updated_at=? WHERE lead_id=? AND status IN ('ACTIVE','PAUSED')`).bind(reason, timestamp, leadId),
    db.prepare(`UPDATE outreach_sequence_steps SET status='CANCELLED', last_error=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','RUNNING')`).bind(reason, timestamp, leadId),
    db.prepare(`UPDATE outreach_followups SET status='CANCELLED', reason=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','DRAFTED')`).bind(reason, timestamp, leadId),
    db.prepare(`UPDATE outreach_reply_drafts SET status='CANCELLED', reason=?, updated_at=? WHERE lead_id=? AND status='DRAFT'`).bind(reason, timestamp, leadId),
    db.prepare(`UPDATE demo_jobs SET status='CANCELLED', last_error=?, updated_at=? WHERE lead_id=? AND status IN ('PENDING','CLAIMED','BUILDING','QA','READY')`).bind(reason, timestamp, leadId)
  ]);
}
__name(cancelLeadAutomation, "cancelLeadAutomation");
async function directSetState(db, lead, to, actor, reason, manual) {
  const timestamp = nowIso();
  const stop = STOP_STATES.has(to);
  const human = to === "HUMAN_REVIEW";
  const previous = to === "DISQUALIFIED" && lead.current_state !== "DISQUALIFIED" ? lead.current_state : lead.previous_state_before_disqualification;
  const result = await db.prepare(`
    UPDATE leads SET
      current_state = ?,
      automation_paused = ?,
      human_required = ?,
      outreach_eligible = 0,
      previous_state_before_disqualification = ?,
      manual_state_reason = CASE WHEN ? THEN ? ELSE manual_state_reason END,
      manual_state_updated_at = CASE WHEN ? THEN ? ELSE manual_state_updated_at END,
      manual_state_updated_by = CASE WHEN ? THEN ? ELSE manual_state_updated_by END,
      updated_at = ?, last_action_at = ?, version = version + 1
    WHERE id = ?
  `).bind(
    to,
    stop || human ? 1 : 0,
    human ? 1 : 0,
    previous ?? null,
    manual ? 1 : 0,
    manual ? reason : null,
    manual ? 1 : 0,
    manual ? timestamp : null,
    manual ? 1 : 0,
    manual ? actor : null,
    timestamp,
    timestamp,
    lead.id
  ).run();
  if ((result.meta.changes ?? 0) !== 1) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead was not found.");
  await recordEvent(db, {
    eventId: newId("evt"),
    leadId: lead.id,
    eventType: manual ? "MANUAL_STATE_OVERRIDE" : "WEBSITE_GAP_REAUDIT_STATE_CHANGED",
    eventData: { from: lead.current_state, to, reason },
    source: manual ? "COMMAND_CENTER" : "WEBSITE_GAP_GATE",
    actor
  });
  if (stop || human) await cancelLeadAutomation(db, lead.id, reason);
  const updated = await getLead(db, lead.id);
  if (!updated) throw new Error("Lead disappeared after state update.");
  return updated;
}
__name(directSetState, "directSetState");
async function manualOverrideLeadState(db, leadId, to, actor, reason) {
  if (!LEAD_STATES.includes(to)) throw new HttpError(400, "INVALID_STATE", `Unknown lead state ${to}.`);
  if (!reason.trim()) throw new HttpError(400, "REASON_REQUIRED", "A reason is required for manual status changes.");
  const lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  if (to === "OPTED_OUT") {
    await addSuppression(db, { leadId, phone: lead.phone ?? void 0, email: lead.email ?? void 0, reason: "OPT_OUT", source: "COMMAND_CENTER" });
  }
  if (["QUALIFIED", "OUTREACH_READY", "OUTREACH_SENT", "AWAITING_REPLY", "REPLIED", "INTERESTED", "DEMO_APPROVED", "DEMO_BUILDING", "DEMO_QA", "DEMO_READY", "DEMO_SENT", "DEMO_VIEWED", "PRICING_VIEWED", "CHECKOUT_STARTED"].includes(to)) {
    if (lead.website_gap_status !== "ELIGIBLE") {
      await db.prepare(`UPDATE leads SET website_gap_status='MANUAL_OVERRIDE', website_gap_reason=?, updated_at=?, version=version+1 WHERE id=?`).bind(`Human override: ${reason}`, nowIso(), leadId).run();
    }
  }
  return await directSetState(db, await getLead(db, leadId) ?? lead, to, actor, reason, true);
}
__name(manualOverrideLeadState, "manualOverrideLeadState");
async function restoreDisqualifiedLead(db, leadId, actor, reason) {
  const lead = await getLead(db, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  if (lead.current_state !== "DISQUALIFIED") throw new HttpError(409, "NOT_DISQUALIFIED", "Only disqualified leads can be restored with this action.");
  return await directSetState(db, lead, "HUMAN_REVIEW", actor, reason || "Restored from disqualification for human review.", true);
}
__name(restoreDisqualifiedLead, "restoreDisqualifiedLead");
async function reAuditExistingWebsiteGaps(db, actor) {
  const rows = await db.prepare(`SELECT * FROM leads ORDER BY updated_at DESC LIMIT 2000`).all();
  let scanned = 0, eligible = 0, disqualified = 0, review = 0, unchanged = 0;
  for (const initial of rows.results) {
    if (!EARLY_REAUDIT_STATES.has(initial.current_state)) {
      unchanged++;
      continue;
    }
    if (initial.manual_state_updated_by) {
      unchanged++;
      continue;
    }
    const research = await loadResearchInput(db, initial.id);
    if (!research) {
      unchanged++;
      continue;
    }
    scanned++;
    const gap = websiteGapDecision(research);
    await db.prepare(`UPDATE leads SET website_gap_status=?, website_gap_reason=?, updated_at=?, version=version+1 WHERE id=?`).bind(gap.status, gap.reason, nowIso(), initial.id).run();
    const lead = await getLead(db, initial.id);
    if (!lead) continue;
    if (gap.status === "INELIGIBLE") {
      if (lead.current_state !== "DISQUALIFIED") await directSetState(db, lead, "DISQUALIFIED", actor, gap.reason, false);
      disqualified++;
    } else if (gap.status === "REVIEW") {
      if (lead.current_state !== "HUMAN_REVIEW") await directSetState(db, lead, "HUMAN_REVIEW", actor, gap.reason, false);
      review++;
    } else {
      eligible++;
      const refreshed = await getLead(db, initial.id);
      if (refreshed?.current_state === "HUMAN_REVIEW" && refreshed.validation_status === "VALID" && (refreshed.opportunity_score ?? 0) >= 65) {
        await directSetState(db, refreshed, "QUALIFIED", actor, `Website gap re-audit verified eligibility. ${gap.reason}`, false);
      }
    }
  }
  await recordEvent(db, { eventId: newId("evt"), eventType: "WEBSITE_GAP_REAUDIT_COMPLETED", eventData: { scanned, eligible, disqualified, review, unchanged }, source: "COMMAND_CENTER", actor });
  return { scanned, eligible, disqualified, review, unchanged };
}
__name(reAuditExistingWebsiteGaps, "reAuditExistingWebsiteGaps");

