function log(level, event, data = {}) {
  console[level](JSON.stringify({ level, event, ...data, timestamp: (/* @__PURE__ */ new Date()).toISOString() }));
}
__name(log, "log");
async function consumeEvent(message, env) {
  const event = message.body;
  log("info", "QUEUE_EVENT_RECEIVED", { eventId: event.eventId, eventType: event.eventType, leadId: event.leadId });
  if (event.eventType === "PROSPECT_RESEARCH_RECEIVED" && event.leadId) {
    const lead = await getLead(env.DB, event.leadId);
    if (!lead) {
      log("error", "QUEUE_LEAD_MISSING", { eventId: event.eventId, leadId: event.leadId });
      return;
    }
    if (lead.automation_paused) {
      await env.DB.prepare(`
        INSERT OR IGNORE INTO deferred_events(id, lead_id, event_json, reason, status, created_at, updated_at)
        VALUES(?, ?, ?, 'AUTOMATION_PAUSED', 'DEFERRED', ?, ?)
      `).bind(newId("defer"), event.leadId, JSON.stringify(event), (/* @__PURE__ */ new Date()).toISOString(), (/* @__PURE__ */ new Date()).toISOString()).run();
      log("info", "QUEUE_EVENT_DEFERRED", { eventId: event.eventId, leadId: event.leadId });
      return;
    }
    const workflowId = `lead-qualify-${event.leadId}-${event.eventId}`.slice(0, 100);
    const instances = await env.LEAD_WORKFLOW.createBatch([
      { id: workflowId, params: { leadId: event.leadId, triggerEventId: event.eventId } }
    ]);
    await recordEvent(env.DB, {
      eventId: newId("evt"),
      leadId: event.leadId,
      eventType: "QUALIFICATION_WORKFLOW_REQUESTED",
      eventData: { workflowId, created: instances.length === 1 },
      source: "QUEUE",
      actor: "SYSTEM",
      idempotencyKey: `workflow-requested:${workflowId}`
    });
  }
  if (event.eventType === "JOB_RETRY_REQUESTED") {
    log("info", "JOB_RETRY_QUEUED", { eventId: event.eventId, jobId: event.eventData?.jobId });
  }
}
__name(consumeEvent, "consumeEvent");
async function keepRunnerAlive(env) {
  const [campaigns, demos] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS count FROM prospecting_campaigns WHERE status IN ('READY','RUNNING') AND archived_at IS NULL`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS count FROM demo_jobs WHERE status IN ('PENDING','CLAIMED','BUILDING','QA') OR (status='FAILED' AND attempt_count<max_attempts)`).first()
  ]);
  const activeCampaigns = campaigns?.count ?? 0, activeDemos = demos?.count ?? 0;
  if (activeCampaigns + activeDemos < 1) return;
  const result = await wakeOrgoProspector(env);
  log("info", "RUNNER_SELF_HEAL", { activeCampaigns, activeDemos, ...result });
}
__name(keepRunnerAlive, "keepRunnerAlive");
var index_default = {
  async fetch(request, env) {
    const requestId = crypto.randomUUID();
    const started = Date.now();
    try {
      const response = await handleRequest(request, env);
      log("info", "HTTP_REQUEST", { requestId, method: request.method, path: new URL(request.url).pathname, status: response.status, durationMs: Date.now() - started });
      return response;
    } catch (error) {
      if (error instanceof HttpError) {
        log("info", "HTTP_ERROR", { requestId, code: error.code, status: error.status, durationMs: Date.now() - started });
        return errorResponse(error.code, error.message, error.status, error.details);
      }
      const message = error instanceof Error ? error.message : String(error);
      log("error", "UNHANDLED_ERROR", { requestId, message, durationMs: Date.now() - started });
      return errorResponse("INTERNAL_ERROR", "Unexpected server error.", 500);
    }
  },
  async scheduled(controller, env, _ctx) {
    try {
      const outcome = await withLease(env.DB, "scheduled-main", 110, async () => {
        const reaped = await reapStaleDemoJobs(env.DB);
        const deferred = await replayDeferredEvents(env.DB, async (evt) => {
          await env.EVENTS_QUEUE.send(evt);
        });
        const prospectorJobs = await runDueProspectorJobs(env.DB, env);
        await keepRunnerAlive(env);
        const [followups, outreach, demoConsentRepair, demoApprovedRepair, quoteViewAlerts] = await Promise.all([
          processDueFollowups(env.DB, false),
          runAutonomousOutreach(env),
          repairDemoConsentHandoffs(env.DB),
          reconcileApprovedDemoJobs(env.DB),
          sendFirstViewAlerts(env)
        ]);
        return { reaped, deferred, prospectorJobs, followups, outreach, demoConsentRepair, demoApprovedRepair, quoteViewAlerts };
      });
      const repaired = outcome?.demoApprovedRepair?.requeued ?? 0;
      const reclaimed = outcome?.reaped?.reclaimed ?? 0;
      if (repaired > 0 || reclaimed > 0) {
        log("error", "SELF_HEAL_REPAIRED_SOMETHING", { cron: controller.cron, repaired, reclaimed });
      }
      log("info", "SCHEDULED_SELF_HEAL_COMPLETE", { cron: controller.cron, scheduledTime: controller.scheduledTime, ...outcome });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log("error", "SCHEDULED_SELF_HEAL_FAILED", { cron: controller.cron, error: message });
      throw error;
    }
  },
  // The DLQ was configured and nothing consumed it. Now failures are visible.
  async queue(batch, env) {
    if (batch.queue.endsWith("-dlq")) {
      for (const message of batch.messages) {
        log("error", "DLQ_MESSAGE", { queueMessageId: message.id, body: message.body });
        await bumpCounter(env.DB, "dlq_messages");
        message.ack();
      }
      return;
    }
    for (const message of batch.messages) {
      try {
        await consumeEvent(message, env);
        message.ack();
      } catch (error) {
        const messageText = error instanceof Error ? error.message : String(error);
        log("error", "QUEUE_EVENT_FAILED", { queueMessageId: message.id, error: messageText });
        await bumpCounter(env.DB, "queue_event_failed");
        message.retry();
      }
    }
  }
};
export {
  LeadLifecycleWorkflow,
  index_default as default
};
