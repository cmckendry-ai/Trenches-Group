async function flagNumber(db, key, fallback) {
  const row = await db.prepare(`SELECT value FROM system_flags WHERE key = ?`).bind(key).first();
  const n = Number(row?.value);
  return Number.isFinite(n) ? n : fallback;
}
__name(flagNumber, "flagNumber");
async function reapStaleDemoJobs(db) {
  const leaseMinutes = await flagNumber(db, "DEMO_JOB_LEASE_MINUTES", 20);
  const maxReclaims = await flagNumber(db, "DEMO_JOB_MAX_RECLAIMS", 2);
  const cutoff = new Date(Date.now() - leaseMinutes * 6e4).toISOString();
  const ts = nowIso();
  const stale = await db.prepare(`
    SELECT id, lead_id, status, claimed_by, reclaim_count
      FROM demo_jobs
     WHERE status IN ('CLAIMED','BUILDING','QA')
       AND COALESCE(lease_expires_at, claimed_at, updated_at) <= ?
     ORDER BY updated_at ASC
     LIMIT 50
  `).bind(cutoff).all();
  let reclaimed = 0;
  let escalated = 0;
  for (const job of stale.results ?? []) {
    const nextReclaim = Number(job.reclaim_count ?? 0) + 1;
    if (nextReclaim > maxReclaims) {
      const result2 = await db.prepare(`
        UPDATE demo_jobs
           SET status='FAILED', last_error=?, reclaim_count=?, lease_expires_at=NULL, updated_at=?
         WHERE id=? AND status=?
      `).bind(
        `Abandoned by runner ${job.claimed_by ?? "unknown"} after ${nextReclaim} reclaim attempts.`,
        nextReclaim,
        ts,
        job.id,
        job.status
      ).run();
      if ((result2.meta.changes ?? 0) === 1) {
        escalated += 1;
        await db.prepare(`UPDATE leads SET human_required=1, updated_at=? WHERE id=?`).bind(ts, job.lead_id).run();
        await bumpCounter(db, "demo_job_escalated");
        await recordEvent(db, {
          eventId: newId("evt"),
          leadId: job.lead_id,
          eventType: "DEMO_JOB_ABANDONED_ESCALATED",
          eventData: { demoJobId: job.id, previousStatus: job.status, reclaimCount: nextReclaim },
          source: "DEMO",
          actor: "REAPER"
        });
      }
      continue;
    }
    const result = await db.prepare(`
      UPDATE demo_jobs
         SET status='PENDING', claimed_by=NULL, claimed_at=NULL, lease_expires_at=NULL,
             reclaim_count=?, last_error=?, updated_at=?
       WHERE id=? AND status=?
    `).bind(
      nextReclaim,
      `Reclaimed after ${leaseMinutes}m lease expiry (was ${job.status}).`,
      ts,
      job.id,
      job.status
    ).run();
    if ((result.meta.changes ?? 0) === 1) {
      reclaimed += 1;
      await bumpCounter(db, "demo_job_reclaimed");
      await recordEvent(db, {
        eventId: newId("evt"),
        leadId: job.lead_id,
        eventType: "DEMO_JOB_LEASE_RECLAIMED",
        eventData: { demoJobId: job.id, previousStatus: job.status, reclaimCount: nextReclaim, deadRunner: job.claimed_by },
        source: "DEMO",
        actor: "REAPER"
      });
    }
  }
  return { reclaimed, escalated };
}
__name(reapStaleDemoJobs, "reapStaleDemoJobs");
async function replayDeferredEvents(db, send) {
  const ts = nowIso();
  const rows = await db.prepare(`
    SELECT d.id, d.lead_id, d.event_json, d.attempts
      FROM deferred_events d
      JOIN leads l ON l.id = d.lead_id
     WHERE d.status = 'DEFERRED'
       AND l.automation_paused = 0
     ORDER BY d.created_at ASC
     LIMIT 25
  `).all();
  let replayed = 0;
  for (const row of rows.results ?? []) {
    try {
      await send(JSON.parse(row.event_json));
      await db.prepare(`UPDATE deferred_events SET status='REPLAYED', updated_at=? WHERE id=? AND status='DEFERRED'`).bind(ts, row.id).run();
      replayed += 1;
    } catch {
      const attempts = Number(row.attempts ?? 0) + 1;
      const status = attempts >= 5 ? "ABANDONED" : "DEFERRED";
      await db.prepare(`UPDATE deferred_events SET attempts=?, status=?, updated_at=? WHERE id=?`).bind(attempts, status, ts, row.id).run();
      if (status === "ABANDONED") await bumpCounter(db, "deferred_event_abandoned");
    }
  }
  const remaining = await db.prepare(`SELECT COUNT(*) AS c FROM deferred_events WHERE status='DEFERRED'`).first();
  return { replayed, stillDeferred: remaining?.c ?? 0 };
}
__name(replayDeferredEvents, "replayDeferredEvents");
async function localDayStartIso(db, at = /* @__PURE__ */ new Date()) {
  const row = await db.prepare(`SELECT value FROM system_flags WHERE key='OUTREACH_TIMEZONE'`).first();
  const tz = row?.value || "America/Chicago";
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const localNow = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  const offsetMs = localNow - Math.floor(at.getTime() / 1e3) * 1e3;
  const localMidnightUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)) - offsetMs;
  return new Date(localMidnightUtc).toISOString();
}
__name(localDayStartIso, "localDayStartIso");

