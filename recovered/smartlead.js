var SMARTLEAD_BASE = "https://server.smartlead.ai/api/v1";
function apiKey(env) {
  const key = env.SMARTLEAD_API_KEY;
  if (!key) throw new HttpError(503, "SMARTLEAD_NOT_CONFIGURED", "SMARTLEAD_API_KEY is not configured.");
  return key;
}
__name(apiKey, "apiKey");
async function smartleadRequest(env, path, init = {}) {
  const url = `${SMARTLEAD_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(apiKey(env))}`;
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init.headers || {} } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(502, "SMARTLEAD_REQUEST_FAILED", `Smartlead ${path} failed (${response.status}).`, data);
  return data;
}
__name(smartleadRequest, "smartleadRequest");
async function flag(db, key) {
  const row = await db.prepare(`SELECT value FROM system_flags WHERE key=?`).bind(key).first();
  return row?.value ?? null;
}
__name(flag, "flag");
async function setFlag(db, key, value) {
  const ts = nowIso();
  await db.prepare(`INSERT INTO system_flags(key,value,updated_at,updated_by) VALUES(?,?,?,'SYSTEM') ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at`).bind(key, value, ts).run();
}
__name(setFlag, "setFlag");
async function smartleadMailboxEmail(db) {
  return await flag(db, "SMARTLEAD_MAILBOX_EMAIL");
}
__name(smartleadMailboxEmail, "smartleadMailboxEmail");
async function setSmartleadMailboxEmail(db, email) {
  await setFlag(db, "SMARTLEAD_MAILBOX_EMAIL", email.trim().toLowerCase());
}
__name(setSmartleadMailboxEmail, "setSmartleadMailboxEmail");
async function webhookSecret(db) {
  const existing = await flag(db, "SMARTLEAD_WEBHOOK_SECRET");
  if (existing) return existing;
  const generated = crypto.randomUUID();
  await setFlag(db, "SMARTLEAD_WEBHOOK_SECRET", generated);
  return generated;
}
__name(webhookSecret, "webhookSecret");
async function findEmailAccountId(env, email) {
  const accounts = await smartleadRequest(env, "/email-accounts");
  const match = accounts.find((a) => (a.from_email || "").toLowerCase() === email.toLowerCase());
  if (!match) throw new HttpError(409, "SMARTLEAD_EMAIL_ACCOUNT_NOT_FOUND", `No Smartlead email account found for ${email}. Connect that mailbox in Smartlead first.`);
  return match.id;
}
__name(findEmailAccountId, "findEmailAccountId");
var WEBSITE_SEQUENCE = [
  { seqNumber: 1, delayDays: 0, subject: "quick question about {{company_name}}", body: `Hey \u2014 came across {{company_name}} while looking at local {{industry}} companies around {{city}}. I build free live website previews for local businesses -- no charge to see it, and if you already have a site you can compare it side by side with what you've got. Want me to put one together for {{company_name}}?

-Connor` },
  { seqNumber: 2, delayDays: 2, subject: "Re: quick question about {{company_name}}", body: `Hey \u2014 just circling back on this. I'm still happy to put together the live preview for {{company_name}} completely free so y'all can see the idea first. Want me to make one?

-Connor` },
  { seqNumber: 3, delayDays: 5, subject: "Re: quick question about {{company_name}}", body: `Quick follow-up \u2014 I'd rather show y'all what I mean than try to sell you over email. I can build the preview for {{company_name}} free and send the live link over. Want me to put it together?

-Connor` },
  { seqNumber: 4, delayDays: 9, subject: "Re: quick question about {{company_name}}", body: `Last note from me \u2014 if y'all ever want me to put together that free live preview for {{company_name}}, just holler.

-Connor` }
];
var CONCIERGE_CAL_URL = "https://cal.com/trenchesgroup/ai-discovery-call";
var CONCIERGE_SEQUENCE = [
  { seqNumber: 1, delayDays: 0, subject: `a systems guy who's been where you are \u2014 quick note for {{company_name}}`, body: `Hey \u2014 I spent 15 years running garage door repair for both commercial and residential accounts, then owned my own permanent/landscape lighting company for 4 years. I know exactly where the slop lives in a business like {{company_name}}'s: missed callbacks, quotes that go cold, scheduling that eats your whole morning -- the stuff that has nothing to do with the actual work and everything to do with why the day feels longer than it should.

I built systems to fix that in my own company. Now I'm doing it faster and cheaper using AI -- what used to take me months to build by hand, I can stand up in days. I do a free 30-minute diagnostic call where I look at your actual workflow and tell you exactly what I'd fix first. No pitch, no obligation -- just someone who's actually run one of these businesses telling you what he sees.

Want to grab a slot? ${CONCIERGE_CAL_URL}

-Connor` },
  { seqNumber: 2, delayDays: 3, subject: `Re: a systems guy who's been where you are \u2014 quick note for {{company_name}}`, body: `Hey \u2014 just circling back. I spent 15+ years in home services (garage doors, then owned a lighting company) before I started building efficiency systems full time. Happy to do a free 30-minute look at where {{company_name}}'s workflow is losing time -- no pitch: ${CONCIERGE_CAL_URL}

-Connor` },
  { seqNumber: 3, delayDays: 7, subject: `Re: a systems guy who's been where you are \u2014 quick note for {{company_name}}`, body: `Last note from me -- if you ever want a free diagnostic on your workflow from someone who's actually run one of these businesses, not just consulted on one, the offer's open: ${CONCIERGE_CAL_URL}

-Connor` }
];
async function ensureCampaign(env, flagKey, name, sequence, postalAddress) {
  const existing = await flag(env.DB, flagKey);
  if (existing) return Number(existing);
  const mailbox = await smartleadMailboxEmail(env.DB);
  if (!mailbox) throw new HttpError(409, "SMARTLEAD_MAILBOX_NOT_CONFIGURED", "Set the Smartlead sending mailbox in outreach settings first.");
  const emailAccountId = await findEmailAccountId(env, mailbox);
  const created = await smartleadRequest(env, "/campaigns/new", { method: "POST", body: JSON.stringify({ name }) });
  const campaignId = created.id;
  const footer = postalAddress.trim() ? `

Trenches Group
${postalAddress.trim()}` : "";
  await smartleadRequest(env, `/campaigns/${campaignId}/sequences`, {
    method: "POST",
    body: JSON.stringify({ sequences: sequence.map((s) => ({ seq_number: s.seqNumber, subject: s.subject, email_body: (s.body + footer).replace(/\n/g, "<br/>"), seq_delay_details: { delay_in_days: s.delayDays } })) })
  });
  await smartleadRequest(env, `/campaigns/${campaignId}/email-accounts`, { method: "POST", body: JSON.stringify({ email_account_ids: [emailAccountId] }) });
  const secret = await webhookSecret(env.DB);
  await smartleadRequest(env, "/webhook/create", {
    method: "POST",
    body: JSON.stringify({
      name: `Trenches OS ${flagKey}`,
      webhook_url: `${env.PUBLIC_BASE_URL}/integrations/smartlead/webhook/${secret}`,
      email_campaign_id: campaignId,
      association_type: 3,
      event_type_map: { EMAIL_REPLIED: true, EMAIL_BOUNCED: true, EMAIL_UNSUBSCRIBED: true }
    })
  });
  await setFlag(env.DB, flagKey, String(campaignId));
  return campaignId;
}
__name(ensureCampaign, "ensureCampaign");
async function ensureWebsiteCampaign(env, postalAddress) {
  return await ensureCampaign(env, "SMARTLEAD_WEBSITE_CAMPAIGN_ID", "Trenches -- Website Offer", WEBSITE_SEQUENCE, postalAddress);
}
__name(ensureWebsiteCampaign, "ensureWebsiteCampaign");
async function ensureConciergeCampaign(env, postalAddress) {
  return await ensureCampaign(env, "SMARTLEAD_CONCIERGE_CAMPAIGN_ID", "Trenches -- AI Concierge", CONCIERGE_SEQUENCE, postalAddress);
}
__name(ensureConciergeCampaign, "ensureConciergeCampaign");
async function campaignStatus(db) {
  const [website, concierge, mailbox] = await Promise.all([
    flag(db, "SMARTLEAD_WEBSITE_CAMPAIGN_ID"),
    flag(db, "SMARTLEAD_CONCIERGE_CAMPAIGN_ID"),
    smartleadMailboxEmail(db)
  ]);
  return { websiteCampaignId: website, conciergeCampaignId: concierge, mailboxEmail: mailbox };
}
__name(campaignStatus, "campaignStatus");
async function addLeadToCampaign(env, campaignId, lead) {
  await smartleadRequest(env, `/campaigns/${campaignId}/leads`, {
    method: "POST",
    body: JSON.stringify({
      lead_list: [{ email: lead.email, company_name: lead.businessName, custom_fields: { business_name: lead.businessName, industry: lead.industry, city: lead.city } }],
      settings: { ignore_global_block_list: false, ignore_unsubscribe_list: false, ignore_duplicate_leads_in_other_campaign: true }
    })
  });
}
__name(addLeadToCampaign, "addLeadToCampaign");
async function enrollLeadInSmartlead(env, lead, track, postalAddress) {
  if (!lead.email) throw new HttpError(409, "EMAIL_REQUIRED", "Lead has no email address.");
  const existing = await env.DB.prepare(`SELECT id FROM outreach_sequences WHERE lead_id=? AND status IN ('ACTIVE','PAUSED')`).bind(lead.id).first();
  if (existing?.id) return existing.id;
  const campaignId = track === "WEBSITE" ? await ensureWebsiteCampaign(env, postalAddress) : await ensureConciergeCampaign(env, postalAddress);
  await addLeadToCampaign(env, campaignId, { email: lead.email, businessName: lead.business_name, industry: lead.industry, city: lead.city });
  const id = newId("seq");
  const ts = nowIso();
  await env.DB.prepare(`INSERT INTO outreach_sequences(id,lead_id,strategy,status,current_step,started_at,next_action_at,created_at,updated_at) VALUES(?,?,?,'ACTIVE',1,?,NULL,?,?)`).bind(id, lead.id, track === "WEBSITE" ? "SMARTLEAD_WEBSITE" : "SMARTLEAD_CONCIERGE", ts, ts, ts).run();
  await recordEvent(env.DB, { eventId: newId("evt"), leadId: lead.id, eventType: "SMARTLEAD_CAMPAIGN_ENROLLED", eventData: { sequenceId: id, campaignId, track }, source: "SMARTLEAD", actor: "SYSTEM" });
  return id;
}
__name(enrollLeadInSmartlead, "enrollLeadInSmartlead");

