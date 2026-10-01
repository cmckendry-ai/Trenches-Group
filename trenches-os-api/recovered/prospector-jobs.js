async function getFlagInt(db, key, fallback) {
  const row = await db.prepare("SELECT value FROM system_flags WHERE key = ?").bind(key).first();
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}
__name(getFlagInt, "getFlagInt");
async function listProspectorJobs(db, offering) {
  const rows = await db.prepare(`SELECT * FROM prospector_jobs ${offering ? "WHERE offering = ?" : ""} ORDER BY active DESC, city ASC, category ASC`).bind(...offering ? [offering] : []).all();
  return rows.results;
}
__name(listProspectorJobs, "listProspectorJobs");
async function createProspectorJob(db, input) {
  const id = newId("pjob");
  const now = nowIso();
  try {
    await db.prepare(`
      INSERT INTO prospector_jobs (id, city, state, category, radius_miles, target_count, cadence_days, active, created_at, updated_at, offering)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.city.trim(),
      input.state.trim(),
      input.category.trim(),
      input.radiusMiles ?? 15,
      input.targetCount ?? 20,
      input.cadenceDays ?? 21,
      input.active === false ? 0 : 1,
      now,
      now,
      input.offering ?? "WEBSITE"
    ).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("UNIQUE")) throw new HttpError(409, "PROSPECTOR_JOB_EXISTS", "A job for this city/state/category already exists.");
    throw error;
  }
  const row = await db.prepare("SELECT * FROM prospector_jobs WHERE id = ?").bind(id).first();
  if (!row) throw new Error("Prospector job was not persisted.");
  return row;
}
__name(createProspectorJob, "createProspectorJob");
async function setProspectorJobActive(db, id, active) {
  const existing = await db.prepare("SELECT * FROM prospector_jobs WHERE id = ?").bind(id).first();
  if (!existing) throw new HttpError(404, "PROSPECTOR_JOB_NOT_FOUND", `Prospector job ${id} was not found.`);
  await db.prepare("UPDATE prospector_jobs SET active = ?, updated_at = ? WHERE id = ?").bind(active ? 1 : 0, nowIso(), id).run();
  const row = await db.prepare("SELECT * FROM prospector_jobs WHERE id = ?").bind(id).first();
  if (!row) throw new Error("Prospector job disappeared after update.");
  return row;
}
__name(setProspectorJobActive, "setProspectorJobActive");
var OFFERING_FLAG_KEYS = {
  WEBSITE: { dailyCap: "PROSPECTOR_JOBS_PER_DAY", maxBacklog: "PROSPECTOR_JOBS_MAX_BACKLOG" },
  CONCIERGE: { dailyCap: "PROSPECTOR_JOBS_PER_DAY_CONCIERGE", maxBacklog: "PROSPECTOR_JOBS_MAX_BACKLOG_CONCIERGE" }
};
async function runDueProspectorJobsForOffering(db, offering) {
  const flagKeys = OFFERING_FLAG_KEYS[offering];
  const [dailyCap, maxBacklog] = await Promise.all([
    getFlagInt(db, flagKeys.dailyCap, 6),
    getFlagInt(db, flagKeys.maxBacklog, 20)
  ]);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
  const [runToday, backlog] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS count FROM prospector_jobs WHERE offering = ? AND last_run_at >= ?").bind(offering, since).first(),
    db.prepare(`SELECT COUNT(*) AS count FROM prospecting_campaigns WHERE offering = ? AND status IN ('READY','RUNNING') AND archived_at IS NULL`).bind(offering).first()
  ]);
  const runTodayCount = runToday?.count ?? 0;
  const backlogCount = backlog?.count ?? 0;
  const remainingToday = dailyCap - runTodayCount;
  if (remainingToday <= 0) return { ran: false, reason: "DAILY_CAP_REACHED", created: [] };
  if (backlogCount >= maxBacklog) return { ran: false, reason: "BACKLOG_FULL", created: [] };
  const slots = Math.max(0, Math.min(remainingToday, maxBacklog - backlogCount));
  if (slots === 0) return { ran: false, reason: "BACKLOG_FULL", created: [] };
  const due = await db.prepare(`
    SELECT * FROM prospector_jobs
    WHERE offering = ? AND active = 1 AND (last_run_at IS NULL OR last_run_at <= datetime('now', '-' || cadence_days || ' days'))
    ORDER BY (last_run_at IS NOT NULL), last_run_at ASC
    LIMIT ?
  `).bind(offering, slots).all();
  const created = [];
  for (const job of due.results) {
    let campaign;
    try {
      campaign = await createCampaign(db, {
        industry: job.category,
        centerLocation: `${job.city}, ${job.state}`,
        radiusMiles: job.radius_miles,
        targetCount: job.target_count,
        notes: `Auto-created by prospector orchestrator (job ${job.id}, ${offering}).`,
        offering
      }, "PROSPECTOR_ORCHESTRATOR");
    } catch (error) {
      await db.prepare("UPDATE prospector_jobs SET updated_at = ? WHERE id = ?").bind(nowIso(), job.id).run();
      continue;
    }
    await db.prepare("UPDATE prospector_jobs SET last_run_at = ?, last_campaign_id = ?, updated_at = ? WHERE id = ?").bind(nowIso(), campaign.id, nowIso(), job.id).run();
    created.push({ jobId: job.id, city: job.city, state: job.state, category: job.category, campaignId: campaign.id });
  }
  if (created.length === 0) return { ran: false, reason: "NO_DUE_JOBS", created: [] };
  return { ran: true, created };
}
__name(runDueProspectorJobsForOffering, "runDueProspectorJobsForOffering");
async function runDueProspectorJobs(db, env) {
  void env;
  const enabledRow = await db.prepare(`SELECT value FROM system_flags WHERE key = 'PROSPECTOR_ORCHESTRATOR_ENABLED'`).first();
  if (enabledRow && enabledRow.value === "false") {
    const disabled = { ran: false, reason: "DISABLED", created: [] };
    return { website: disabled, concierge: disabled };
  }
  const [website, concierge] = await Promise.all([
    runDueProspectorJobsForOffering(db, "WEBSITE"),
    runDueProspectorJobsForOffering(db, "CONCIERGE")
  ]);
  return { website, concierge };
}
__name(runDueProspectorJobs, "runDueProspectorJobs");

