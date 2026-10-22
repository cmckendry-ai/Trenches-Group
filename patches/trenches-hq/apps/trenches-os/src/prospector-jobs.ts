import { HttpError } from './http';
import { newId, nowIso } from './db';
import { createCampaign, type CampaignView } from './campaigns';

export type Offering = 'WEBSITE' | 'CONCIERGE';

export type ProspectorJob = {
  id: string;
  city: string;
  state: string;
  category: string;
  radius_miles: number;
  target_count: number;
  cadence_days: number;
  active: number;
  last_run_at: string | null;
  last_campaign_id: string | null;
  created_at: string;
  updated_at: string;
  offering: Offering;
};

async function getFlagInt(db: D1Database, key: string, fallback: number): Promise<number> {
  const row = await db.prepare('SELECT value FROM system_flags WHERE key = ?').bind(key).first<{ value: string }>();
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function listProspectorJobs(db: D1Database, offering?: Offering): Promise<ProspectorJob[]> {
  const rows = await db.prepare(`SELECT * FROM prospector_jobs ${offering ? 'WHERE offering = ?' : ''} ORDER BY active DESC, city ASC, category ASC`)
    .bind(...(offering ? [offering] : [])).all<ProspectorJob>();
  return rows.results;
}

export async function createProspectorJob(
  db: D1Database,
  input: { city: string; state: string; category: string; radiusMiles?: number; targetCount?: number; cadenceDays?: number; active?: boolean; offering?: Offering }
): Promise<ProspectorJob> {
  const id = newId('pjob');
  const now = nowIso();
  try {
    await db.prepare(`
      INSERT INTO prospector_jobs (id, city, state, category, radius_miles, target_count, cadence_days, active, created_at, updated_at, offering)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, input.city.trim(), input.state.trim(), input.category.trim(),
      input.radiusMiles ?? 15, input.targetCount ?? 20, input.cadenceDays ?? 21,
      input.active === false ? 0 : 1, now, now, input.offering ?? 'WEBSITE'
    ).run();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNIQUE')) throw new HttpError(409, 'PROSPECTOR_JOB_EXISTS', 'A job for this city/state/category already exists.');
    throw error;
  }
  const row = await db.prepare('SELECT * FROM prospector_jobs WHERE id = ?').bind(id).first<ProspectorJob>();
  if (!row) throw new Error('Prospector job was not persisted.');
  return row;
}

export async function setProspectorJobActive(db: D1Database, id: string, active: boolean): Promise<ProspectorJob> {
  const existing = await db.prepare('SELECT * FROM prospector_jobs WHERE id = ?').bind(id).first<ProspectorJob>();
  if (!existing) throw new HttpError(404, 'PROSPECTOR_JOB_NOT_FOUND', `Prospector job ${id} was not found.`);
  await db.prepare('UPDATE prospector_jobs SET active = ?, updated_at = ? WHERE id = ?').bind(active ? 1 : 0, nowIso(), id).run();
  const row = await db.prepare('SELECT * FROM prospector_jobs WHERE id = ?').bind(id).first<ProspectorJob>();
  if (!row) throw new Error('Prospector job disappeared after update.');
  return row;
}

export type ProspectorOrchestrationResult = {
  ran: boolean;
  reason?: 'DISABLED' | 'DAILY_CAP_REACHED' | 'BACKLOG_FULL' | 'NO_DUE_JOBS' | 'NO_RUNNER_ONLINE';
  created: Array<{ jobId: string; city: string; state: string; category: string; campaignId: string }>;
};

const OFFERING_FLAG_KEYS: Record<Offering, { dailyCap: string; maxBacklog: string }> = {
  WEBSITE: { dailyCap: 'PROSPECTOR_JOBS_PER_DAY', maxBacklog: 'PROSPECTOR_JOBS_MAX_BACKLOG' },
  CONCIERGE: { dailyCap: 'PROSPECTOR_JOBS_PER_DAY_CONCIERGE', maxBacklog: 'PROSPECTOR_JOBS_MAX_BACKLOG_CONCIERGE' }
};

// Tops up the campaign queue from the rotating job table, independently per
// offering (website vs concierge each get their own daily cap and backlog
// ceiling, so one business line ramping up doesn't starve or flood the
// other). Deliberately conservative: caps how many new campaigns get created
// per tick and how deep the READY/RUNNING backlog is allowed to get, so a
// stalled runner doesn't cause the job table to dump its whole rotation in.
async function runDueProspectorJobsForOffering(db: D1Database, offering: Offering): Promise<ProspectorOrchestrationResult> {
  const flagKeys = OFFERING_FLAG_KEYS[offering];
  const [dailyCap, maxBacklog] = await Promise.all([
    getFlagInt(db, flagKeys.dailyCap, 6),
    getFlagInt(db, flagKeys.maxBacklog, 20)
  ]);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [runToday, backlog] = await Promise.all([
    db.prepare('SELECT COUNT(*) AS count FROM prospector_jobs WHERE offering = ? AND last_run_at >= ?').bind(offering, since).first<{ count: number }>(),
    db.prepare(`SELECT COUNT(*) AS count FROM prospecting_campaigns WHERE offering = ? AND status IN ('READY','RUNNING') AND archived_at IS NULL`).bind(offering).first<{ count: number }>()
  ]);
  const runTodayCount = runToday?.count ?? 0;
  const backlogCount = backlog?.count ?? 0;

  const remainingToday = dailyCap - runTodayCount;
  if (remainingToday <= 0) return { ran: false, reason: 'DAILY_CAP_REACHED', created: [] };
  if (backlogCount >= maxBacklog) return { ran: false, reason: 'BACKLOG_FULL', created: [] };

  const slots = Math.max(0, Math.min(remainingToday, maxBacklog - backlogCount));
  if (slots === 0) return { ran: false, reason: 'BACKLOG_FULL', created: [] };

  const due = await db.prepare(`
    SELECT * FROM prospector_jobs
    WHERE offering = ? AND active = 1 AND (last_run_at IS NULL OR last_run_at <= datetime('now', '-' || cadence_days || ' days'))
    ORDER BY (last_run_at IS NOT NULL), last_run_at ASC
    LIMIT ?
  `).bind(offering, slots).all<ProspectorJob>();

  const created: ProspectorOrchestrationResult['created'] = [];
  for (const job of due.results) {
    let campaign: CampaignView;
    try {
      campaign = await createCampaign(db, {
        industry: job.category,
        centerLocation: `${job.city}, ${job.state}`,
        radiusMiles: job.radius_miles,
        targetCount: job.target_count,
        notes: `Auto-created by prospector orchestrator (job ${job.id}, ${offering}).`,
        offering
      }, 'PROSPECTOR_ORCHESTRATOR');
    } catch (error) {
      // One bad job (e.g. transient DB error) shouldn't block the rest of this tick's due jobs.
      await db.prepare('UPDATE prospector_jobs SET updated_at = ? WHERE id = ?').bind(nowIso(), job.id).run();
      continue;
    }
    await db.prepare('UPDATE prospector_jobs SET last_run_at = ?, last_campaign_id = ?, updated_at = ? WHERE id = ?')
      .bind(nowIso(), campaign.id, nowIso(), job.id).run();
    created.push({ jobId: job.id, city: job.city, state: job.state, category: job.category, campaignId: campaign.id });
  }

  if (created.length === 0) return { ran: false, reason: 'NO_DUE_JOBS', created: [] };
  return { ran: true, created };
}

// A campaign only turns into leads when a runner claims it. Between 2026-09-21
// and 2026-10-13 the cron created 240 campaigns that no runner ever picked up
// (Orgo OAuth expired, then the Windows runner went offline), which filled the
// backlog and silently stopped prospecting. Creating campaigns while nobody can
// run them only hides that. Default 15 minutes; override with the
// PROSPECTOR_RUNNER_STALE_MINUTES flag.
async function runnerSeenRecently(db: D1Database): Promise<boolean> {
  const staleMinutes = await getFlagInt(db, 'PROSPECTOR_RUNNER_STALE_MINUTES', 15);
  const since = new Date(Date.now() - staleMinutes * 60 * 1000).toISOString();
  const row = await db.prepare(`SELECT COUNT(*) AS count FROM runner_status WHERE last_seen_at >= ? AND status <> 'ERROR'`).bind(since).first<{ count: number }>();
  return (row?.count ?? 0) > 0;
}

export async function runDueProspectorJobs(db: D1Database, env: Env): Promise<{ website: ProspectorOrchestrationResult; concierge: ProspectorOrchestrationResult }> {
  void env;
  const enabledRow = await db.prepare(`SELECT value FROM system_flags WHERE key = 'PROSPECTOR_ORCHESTRATOR_ENABLED'`).first<{ value: string }>();
  if (enabledRow && enabledRow.value === 'false') {
    const disabled: ProspectorOrchestrationResult = { ran: false, reason: 'DISABLED', created: [] };
    return { website: disabled, concierge: disabled };
  }
  if (!(await runnerSeenRecently(db))) {
    const offline: ProspectorOrchestrationResult = { ran: false, reason: 'NO_RUNNER_ONLINE', created: [] };
    return { website: offline, concierge: offline };
  }
  const [website, concierge] = await Promise.all([
    runDueProspectorJobsForOffering(db, 'WEBSITE'),
    runDueProspectorJobsForOffering(db, 'CONCIERGE')
  ]);
  return { website, concierge };
}
