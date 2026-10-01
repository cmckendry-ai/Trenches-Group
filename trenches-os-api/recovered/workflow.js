import { WorkflowEntrypoint } from "cloudflare:workers";
var LeadLifecycleWorkflow = class extends WorkflowEntrypoint {
  static {
    __name(this, "LeadLifecycleWorkflow");
  }
  async run(event, step) {
    const { leadId } = event.payload;
    await step.do("guard automation enabled", async () => {
      if (await globalAutomationPaused(this.env.DB)) throw new Error("Global automation is paused.");
      const lead = await getLead(this.env.DB, leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found.`);
      if (lead.automation_paused) throw new Error(`Automation paused for lead ${leadId}.`);
      return { state: lead.current_state };
    });
    const researchJson = await step.do("load verified research", async () => {
      const input = await loadResearchInput(this.env.DB, leadId);
      if (!input) throw new Error(`No research payload exists for lead ${leadId}.`);
      return JSON.stringify(input);
    });
    const research = JSON.parse(researchJson);
    const start = await step.do("start real research processing", async () => {
      const lead = await getLead(this.env.DB, leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found.`);
      if (lead.current_state !== "NEW" && lead.current_state !== "HUMAN_REVIEW") {
        await recordEvent(this.env.DB, {
          eventId: newId("evt"),
          leadId,
          eventType: "RESEARCH_REFRESHED_NO_STATE_RESET",
          eventData: { currentState: lead.current_state },
          source: "WORKFLOW",
          actor: "SYSTEM"
        });
        return { proceed: false, state: lead.current_state };
      }
      await transitionLead(this.env.DB, leadId, "RESEARCHING", "WORKFLOW", lead.current_state === "HUMAN_REVIEW" ? "Updated research received after human review" : "Verified prospect research received", "WORKFLOW");
      return { proceed: true, state: "RESEARCHING" };
    });
    if (!start.proceed) return { leadId, state: start.state, refreshed: true };
    await step.do("complete research", async () => {
      const lead = await getLead(this.env.DB, leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found.`);
      if (lead.current_state === "RESEARCHING") {
        await transitionLead(this.env.DB, leadId, "RESEARCHED", "WORKFLOW", `Research stored with ${research.sources.length} source(s)`, "WORKFLOW");
      }
      return { state: (await getLead(this.env.DB, leadId))?.current_state };
    });
    await step.do("start deterministic qualification", async () => {
      const lead = await getLead(this.env.DB, leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found.`);
      if (lead.current_state === "RESEARCHED") {
        await transitionLead(this.env.DB, leadId, "QUALIFYING", "WORKFLOW", "Validation and viability scoring started", "WORKFLOW");
      }
      return { state: (await getLead(this.env.DB, leadId))?.current_state };
    });
    const qualification = await step.do("validate and score prospect", async () => {
      const result = await applyQualification(this.env.DB, leadId, research);
      await recordEvent(this.env.DB, {
        eventId: newId("evt"),
        leadId,
        eventType: "PROSPECT_SCORED",
        eventData: {
          validationStatus: result.validation.status,
          validationReasons: result.validation.reasons,
          score: result.score.total,
          priority: result.priority,
          websiteGap: result.websiteGap,
          breakdown: result.score
        },
        source: "WORKFLOW",
        actor: "SYSTEM"
      });
      return result;
    });
    await step.do("apply qualification outcome", async () => {
      const lead = await getLead(this.env.DB, leadId);
      if (!lead) throw new Error(`Lead ${leadId} not found.`);
      if (lead.current_state !== "QUALIFYING") return { state: lead.current_state };
      if (qualification.websiteGap.status === "INELIGIBLE") {
        await transitionLead(this.env.DB, leadId, "DISQUALIFIED", "WORKFLOW", qualification.websiteGap.reason, "WEBSITE_GAP_GATE");
      } else if (qualification.websiteGap.status === "REVIEW") {
        await transitionLead(this.env.DB, leadId, "HUMAN_REVIEW", "WORKFLOW", qualification.websiteGap.reason, "WEBSITE_GAP_GATE");
      } else if (qualification.validation.status === "INVALID") {
        await transitionLead(this.env.DB, leadId, "DISQUALIFIED", "WORKFLOW", qualification.validation.reasons.join(" "), "WORKFLOW");
      } else if (qualification.validation.status === "NEEDS_RESEARCH" || qualification.validation.status === "HUMAN_REVIEW") {
        await transitionLead(this.env.DB, leadId, "HUMAN_REVIEW", "WORKFLOW", qualification.validation.reasons.join(" "), "WORKFLOW");
      } else if (qualification.score.total >= 65) {
        await transitionLead(this.env.DB, leadId, "QUALIFIED", "WORKFLOW", `Verified website gap + deterministic viability score ${qualification.score.total}`, "WORKFLOW");
      } else if (qualification.score.total >= 50) {
        await transitionLead(this.env.DB, leadId, "HUMAN_REVIEW", "WORKFLOW", `Verified website gap, but Priority C viability score ${qualification.score.total}; hold for nurture/manual review`, "WORKFLOW");
      } else {
        await transitionLead(this.env.DB, leadId, "DISQUALIFIED", "WORKFLOW", `Verified website gap, but viability score ${qualification.score.total} is below the 50-point minimum`, "WORKFLOW");
      }
      return { state: (await getLead(this.env.DB, leadId))?.current_state };
    });
    return {
      leadId,
      state: (await getLead(this.env.DB, leadId))?.current_state ?? "MISSING",
      score: qualification.score.total,
      priority: qualification.priority,
      validationStatus: qualification.validation.status,
      websiteGapStatus: qualification.websiteGap.status,
      outreachEnabled: false
    };
  }
};

