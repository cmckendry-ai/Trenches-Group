async function acquireLease(db, name, holder, ttlSeconds) {
  const now = nowIso();
  const expires = new Date(Date.now() + ttlSeconds * 1e3).toISOString();
  const result = await db.prepare(`
    INSERT INTO cron_leases(name, holder, expires_at, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE
      SET holder = excluded.holder,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
    WHERE cron_leases.expires_at <= ?
  `).bind(name, holder, expires, now, now).run();
  return (result.meta.changes ?? 0) === 1;
}
__name(acquireLease, "acquireLease");
async function releaseLease(db, name, holder) {
  await db.prepare(
    `UPDATE cron_leases SET expires_at = ?, updated_at = ? WHERE name = ? AND holder = ?`
  ).bind(nowIso(), nowIso(), name, holder).run();
}
__name(releaseLease, "releaseLease");
async function withLease(db, name, ttlSeconds, fn) {
  const holder = crypto.randomUUID();
  if (!await acquireLease(db, name, holder, ttlSeconds)) {
    return { skipped: true, reason: `lease ${name} held by another invocation` };
  }
  try {
    return await fn();
  } finally {
    await releaseLease(db, name, holder);
  }
}
__name(withLease, "withLease");
async function bumpCounter(db, name, by = 1) {
  await db.prepare(`
    INSERT INTO health_counters(name, value, last_incremented_at)
    VALUES(?, ?, ?)
    ON CONFLICT(name) DO UPDATE
      SET value = health_counters.value + excluded.value,
          last_incremented_at = excluded.last_incremented_at
  `).bind(name, by, nowIso()).run();
}
__name(bumpCounter, "bumpCounter");

