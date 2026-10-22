var VIEW_ALERT_TO = "cmckendry.ai@gmail.com";
function text(value, field, max, required = false) {
  if (value === void 0 || value === null || value === "") {
    if (required) throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new HttpError(400, "VALIDATION_ERROR", `${field} must be text.`);
  const clean = value.trim();
  if (required && !clean) throw new HttpError(400, "VALIDATION_ERROR", `${field} is required.`);
  if (clean.length > max) throw new HttpError(400, "VALIDATION_ERROR", `${field} is too long (max ${max} characters).`);
  return clean || null;
}
__name(text, "text");
function parseLineItems(value) {
  if (!Array.isArray(value)) throw new HttpError(400, "VALIDATION_ERROR", "lineItems must be a list.");
  if (value.length > 50) throw new HttpError(400, "VALIDATION_ERROR", "A quote can have at most 50 line items.");
  const items = value.map((raw, i) => {
    if (!raw || typeof raw !== "object") throw new HttpError(400, "VALIDATION_ERROR", `Line ${i + 1} is invalid.`);
    const item = raw;
    const description = text(item.description, `Line ${i + 1} description`, 500, true);
    const quantity = Number(item.quantity ?? 1);
    const unitCents = Number(item.unitCents);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1e4) throw new HttpError(400, "VALIDATION_ERROR", `Line ${i + 1} quantity must be between 0 and 10,000.`);
    if (!Number.isInteger(unitCents) || unitCents < -1e8 || unitCents > 1e8) throw new HttpError(400, "VALIDATION_ERROR", `Line ${i + 1} price is invalid.`);
    const billing = item.billing === "MONTHLY" ? "MONTHLY" : "ONE_TIME";
    const optional = item.optional === true;
    if (optional && unitCents < 0) throw new HttpError(400, "VALIDATION_ERROR", `Line ${i + 1}: a discount can't be optional.`);
    if (!optional) return { description, quantity, unitCents, billing };
    const group = text(item.group, `Line ${i + 1} option name`, 80);
    const details = (Array.isArray(item.details) ? item.details : []).map((d) => typeof d === "string" ? d.trim().slice(0, 160) : "").filter(Boolean).slice(0, 10);
    return { description, quantity, unitCents, billing, optional, ...group ? { group } : {}, ...details.length ? { details } : {} };
  });
  const t = totals(items);
  if (t.oneTime < 0) throw new HttpError(400, "VALIDATION_ERROR", "One-time discounts are larger than the one-time charges.");
  if (t.monthly < 0) throw new HttpError(400, "VALIDATION_ERROR", "Monthly discounts are larger than the monthly charges.");
  return items;
}
__name(parseLineItems, "parseLineItems");
function parseValidUntil(value) {
  const raw = text(value, "validUntil", 10);
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(raw))) throw new HttpError(400, "VALIDATION_ERROR", "validUntil must be a date (YYYY-MM-DD).");
  return raw;
}
__name(parseValidUntil, "parseValidUntil");
function parseQuoteInput(body) {
  return {
    leadId: text(body.leadId, "leadId", 120),
    businessName: text(body.businessName, "Business name", 180, true),
    contactName: text(body.contactName, "Contact name", 180),
    title: text(body.title, "Quote title", 200, true),
    message: text(body.message, "Message", 5e3),
    terms: text(body.terms, "Terms", 5e3),
    lineItems: parseLineItems(body.lineItems ?? []),
    validUntil: parseValidUntil(body.validUntil)
  };
}
__name(parseQuoteInput, "parseQuoteInput");
function totals(items) {
  let oneTime = 0;
  let monthly = 0;
  for (const item of items) {
    if (item.optional) continue;
    const amount = Math.round(item.quantity * item.unitCents);
    if (item.billing === "MONTHLY") monthly += amount;
    else oneTime += amount;
  }
  return { oneTime, monthly };
}
__name(totals, "totals");
async function nextQuoteNumber(db) {
  const row = await db.prepare(`SELECT MAX(CAST(substr(quote_number, 3) AS INTEGER)) AS n FROM quotes WHERE quote_number LIKE 'Q-%'`).first();
  return `Q-${Math.max(1e3, row?.n ?? 1e3) + 1}`;
}
__name(nextQuoteNumber, "nextQuoteNumber");
async function logQuoteEvent(db, input) {
  await db.prepare(`INSERT INTO quote_events(id,quote_id,send_token,event_type,source,email,detail_json,created_at) VALUES(?,?,?,?,?,?,?,?)`).bind(newId("qevt"), input.quoteId, input.sendToken ?? null, input.eventType, input.source, input.email ?? null, JSON.stringify(input.detail ?? {}), nowIso()).run();
}
__name(logQuoteEvent, "logQuoteEvent");
async function requireQuote(db, id) {
  const quote = await db.prepare(`SELECT * FROM quotes WHERE id=?`).bind(id).first();
  if (!quote) throw new HttpError(404, "QUOTE_NOT_FOUND", "Quote not found.");
  return quote;
}
__name(requireQuote, "requireQuote");
async function createQuote(db, body, actor) {
  const input = parseQuoteInput(body);
  if (input.leadId && !await getLead(db, input.leadId)) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  const { oneTime, monthly } = totals(input.lineItems);
  const id = newId("quote");
  const ts = nowIso();
  for (let attempt = 0; ; attempt++) {
    const number = await nextQuoteNumber(db);
    try {
      await db.prepare(`INSERT INTO quotes(id,quote_number,lead_id,business_name,contact_name,title,message,terms,line_items_json,one_time_cents,monthly_cents,valid_until,status,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,'DRAFT',?,?,?)`).bind(id, number, input.leadId, input.businessName, input.contactName, input.title, input.message, input.terms, JSON.stringify(input.lineItems), oneTime, monthly, input.validUntil, actor, ts, ts).run();
      break;
    } catch (error) {
      if (attempt >= 3 || !String(error).includes("UNIQUE")) throw error;
    }
  }
  await logQuoteEvent(db, { quoteId: id, eventType: "CREATED", source: "ADMIN", detail: { actor } });
  if (input.leadId) await recordEvent(db, { eventId: newId("evt"), leadId: input.leadId, eventType: "QUOTE_CREATED", eventData: { quoteId: id, title: input.title, oneTimeCents: oneTime, monthlyCents: monthly }, source: "QUOTES", actor });
  return await requireQuote(db, id);
}
__name(createQuote, "createQuote");
async function updateQuote(db, id, body, actor) {
  const existing = await requireQuote(db, id);
  if (existing.status === "VOID") throw new HttpError(409, "QUOTE_VOID", "This quote was voided. Create a new quote instead.");
  const input = parseQuoteInput(body);
  if (input.leadId && !await getLead(db, input.leadId)) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  const { oneTime, monthly } = totals(input.lineItems);
  await db.prepare(`UPDATE quotes SET lead_id=?,business_name=?,contact_name=?,title=?,message=?,terms=?,line_items_json=?,one_time_cents=?,monthly_cents=?,valid_until=?,updated_at=? WHERE id=?`).bind(input.leadId, input.businessName, input.contactName, input.title, input.message, input.terms, JSON.stringify(input.lineItems), oneTime, monthly, input.validUntil, nowIso(), id).run();
  await logQuoteEvent(db, { quoteId: id, eventType: "UPDATED", source: "ADMIN", detail: { actor } });
  return await requireQuote(db, id);
}
__name(updateQuote, "updateQuote");
async function setQuoteStatus(db, id, status, actor) {
  const quote = await requireQuote(db, id);
  if (typeof status !== "string" || !["ACCEPTED", "DECLINED", "VOID"].includes(status)) {
    throw new HttpError(400, "VALIDATION_ERROR", "status must be ACCEPTED, DECLINED, or VOID.");
  }
  await db.prepare(`UPDATE quotes SET status=?,updated_at=? WHERE id=?`).bind(status, nowIso(), id).run();
  await logQuoteEvent(db, { quoteId: id, eventType: `MARKED_${status}`, source: "ADMIN", detail: { actor, from: quote.status } });
  if (quote.lead_id) await recordEvent(db, { eventId: newId("evt"), leadId: quote.lead_id, eventType: `QUOTE_${status}`, eventData: { quoteId: id, quoteNumber: quote.quote_number }, source: "QUOTES", actor });
  return await requireQuote(db, id);
}
__name(setQuoteStatus, "setQuoteStatus");
async function listQuotes(db, leadId) {
  const where = leadId ? "WHERE q.lead_id=?" : "";
  const statement = db.prepare(`
    SELECT q.id,q.quote_number,q.lead_id,q.business_name,q.contact_name,q.title,q.one_time_cents,q.monthly_cents,q.valid_until,q.status,
      q.first_sent_at,q.last_sent_at,q.open_count,q.first_opened_at,q.last_opened_at,q.view_count,q.first_viewed_at,q.last_viewed_at,q.created_at,q.updated_at,
      (SELECT group_concat(email, ', ') FROM (SELECT DISTINCT s.email FROM quote_sends s WHERE s.quote_id=q.id AND s.status='SENT')) AS sent_to
    FROM quotes q ${where} ORDER BY q.updated_at DESC LIMIT 300
  `);
  const rows = await (leadId ? statement.bind(leadId) : statement).all();
  return rows.results;
}
__name(listQuotes, "listQuotes");
async function getQuoteDetail(env, id) {
  const quote = await requireQuote(env.DB, id);
  const [sends, events] = await Promise.all([
    env.DB.prepare(`SELECT token,email,recipient_name,included_invite,status,error,open_count,first_opened_at,last_opened_at,view_count,first_viewed_at,last_viewed_at,sent_by,sent_at FROM quote_sends WHERE quote_id=? ORDER BY sent_at DESC`).bind(id).all(),
    env.DB.prepare(`SELECT event_type,source,email,user_agent,detail_json,created_at FROM quote_events WHERE quote_id=? ORDER BY created_at DESC LIMIT 200`).bind(id).all()
  ]);
  const site = siteBase(env);
  return {
    quote: { ...quote, line_items: JSON.parse(quote.line_items_json) },
    sends: sends.results.map((s) => ({ ...s, view_url: `${site}/estimate/?t=${encodeURIComponent(String(s.token))}` })),
    events: events.results
  };
}
__name(getQuoteDetail, "getQuoteDetail");
function siteBase(env) {
  return String(env.SITE_BASE_URL || "https://trenchesgroup.com").replace(/\/+$/, "");
}
__name(siteBase, "siteBase");
function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(randomToken, "randomToken");
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
__name(esc, "esc");
function money(cents) {
  return (cents < 0 ? "-$" : "$") + (Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
__name(money, "money");
function formatDate(isoDate) {
  return (/* @__PURE__ */ new Date(`${isoDate}T12:00:00Z`)).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}
__name(formatDate, "formatDate");
function totalLines(quote) {
  const lines = [];
  if (quote.one_time_cents > 0 || quote.monthly_cents === 0) lines.push(`One-time: ${money(quote.one_time_cents)}`);
  if (quote.monthly_cents > 0) lines.push(`Monthly: ${money(quote.monthly_cents)}/mo`);
  return lines;
}
__name(totalLines, "totalLines");
function optionLines(quote) {
  let items = [];
  try {
    items = JSON.parse(quote.line_items_json);
  } catch {
    return [];
  }
  const price = /* @__PURE__ */ __name((i) => `${money(Math.round(i.quantity * i.unitCents))}${i.billing === "MONTHLY" ? "/mo" : ""}`, "price");
  const out = [];
  const groups = /* @__PURE__ */ new Map();
  for (const i of items.filter((x) => x.optional)) {
    if (!i.group) {
      out.push(`${i.description}: ${price(i)}`);
      continue;
    }
    if (!groups.has(i.group)) {
      groups.set(i.group, []);
      out.push(`\0${i.group}`);
    }
    groups.get(i.group).push(i);
  }
  return out.map((line) => {
    if (!line.startsWith("\0")) return line;
    const name = line.slice(1);
    const lines = groups.get(name);
    const one = lines.filter((x) => x.billing !== "MONTHLY").map(price);
    const mo = lines.filter((x) => x.billing === "MONTHLY").map(price);
    return `${name}: ${[...one.map((p) => `${p} setup`), ...mo].join(" + ")}`;
  });
}
__name(optionLines, "optionLines");
var CLIENT_BENEFITS = [
  { title: "Your own client portal", body: "Request changes, track every update, and see your estimates, invoices and subscriptions in one place." },
  { title: "Website analytics you can actually read", body: "See how many people visit, where they come from and what they do on your site, right in your portal." },
  { title: "A site that stays fresh", body: "With the Website Care Plan we make updates every month, so your site never feels stale." }
];
function buildQuoteEmail(quote, input) {
  const greetingName = input.recipientName || quote.contact_name;
  const greeting = greetingName ? `Hi ${greetingName.split(/\s+/)[0]},` : "Hi there,";
  const intro = quote.message || `Thanks for the conversation. Here's the estimate we discussed for ${quote.business_name}.`;
  const validity = quote.valid_until ? `Valid through ${formatDate(quote.valid_until)}` : "";
  const subject = `Your estimate from Trenches Group: ${quote.title} (${quote.quote_number})`;
  const options = optionLines(quote);
  const onlyOptions = options.length > 0 && !quote.one_time_cents && !quote.monthly_cents;
  const totalsList = onlyOptions ? [] : totalLines(quote);
  const viewLabel = options.length ? "Compare options and view your estimate" : "View your estimate";
  const optionsTitle = onlyOptions ? "Your options (pick the one that fits)" : "Options you can add (not included above)";
  const portalText = input.inviteUrl ? `Your Trenches Group client portal is ready. It's already approved, so you'll see full pricing and every estimate we send you in one place:
${input.inviteUrl}` : `Every estimate we send you is saved in your client portal:
${input.portalUrl}`;
  const text2 = [
    greeting,
    "",
    intro,
    "",
    `${quote.title} (${quote.quote_number})`,
    ...totalsList,
    ...options.length ? ["", `${optionsTitle}:`, ...options.map((o) => `- ${o}`)] : [],
    validity,
    "",
    `${viewLabel}: ${input.viewUrl}`,
    "",
    "Every Trenches Group client gets:",
    ...CLIENT_BENEFITS.map((b) => `- ${b.title}: ${b.body}`),
    "",
    portalText,
    "",
    "Questions? Just reply to this email.",
    "",
    "Connor McKendry",
    "Trenches Group"
  ].filter((line, i, all) => line !== "" || all[i - 1] !== "").join("\n");
  const totalsHtml = totalsList.map((line) => {
    const [label, value] = line.split(": ");
    return `<tr><td style="padding:4px 0;color:#6D7782;font-size:14px">${esc(label)}</td><td style="padding:4px 0;text-align:right;font-size:18px;font-weight:700;color:#1B1F23">${esc(value)}</td></tr>`;
  }).join("");
  const button = /* @__PURE__ */ __name((href, label, bg) => `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding:14px 26px;border-radius:3px">${esc(label)}</a>`, "button");
  const portalHtml = input.inviteUrl ? `<div style="margin-top:28px;padding:20px;background:#F4F5F6;border-left:3px solid #375A7F;border-radius:3px">
         <div style="font-weight:700;font-size:15px;color:#1B1F23;margin-bottom:6px">Your client portal is ready</div>
         <div style="font-size:14px;line-height:1.6;color:#3d444b;margin-bottom:14px">We've already approved your account, so you'll see full pricing and every estimate we send you in one place.</div>
         ${button(input.inviteUrl, "Create my portal account", "#375A7F")}
       </div>` : `<p style="margin-top:24px;font-size:14px;line-height:1.6;color:#3d444b">Every estimate we send you is saved in your <a href="${esc(input.portalUrl)}" style="color:#C65C2E">client portal</a>.</p>`;
  const html = `<!doctype html><html><body style="margin:0;padding:0;background:#F4F5F6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:4px;overflow:hidden;font-family:Montserrat,Segoe UI,Helvetica,Arial,sans-serif">
<tr><td style="background:#1B1F23;padding:18px 28px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Trenches Group</td></tr>
<tr><td style="padding:32px 28px 8px;color:#1B1F23">
  <p style="margin:0 0 14px;font-size:15px">${esc(greeting)}</p>
  <p style="margin:0 0 24px;font-size:15px;line-height:1.6;white-space:pre-line">${esc(intro)}</p>
  <div style="border-top:3px solid #C65C2E;background:#FBFBFC;padding:18px 20px;border-radius:3px">
    <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6D7782">Estimate ${esc(quote.quote_number)}</div>
    <div style="font-size:18px;font-weight:700;margin:4px 0 12px">${esc(quote.title)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${totalsHtml}</table>
    ${options.length ? `<div style="margin-top:12px;padding-top:10px;border-top:1px solid #E3E6E9"><div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6D7782;margin-bottom:4px">${esc(optionsTitle)}</div>${options.map((o) => `<div style="font-size:14px;line-height:1.6;color:#3d444b">${esc(o)}</div>`).join("")}</div>` : ""}
    ${validity ? `<div style="font-size:12px;color:#6D7782;margin-top:8px">${esc(validity)}</div>` : ""}
  </div>
  <div style="text-align:center;margin:28px 0 4px">${button(input.viewUrl, viewLabel, "#C65C2E")}</div>
  <div style="margin-top:28px">
    <div style="font-weight:700;font-size:15px;color:#1B1F23;margin-bottom:10px">Every Trenches Group client gets</div>
    ${CLIENT_BENEFITS.map((b) => `<div style="padding:10px 0 10px 14px;border-left:3px solid #C65C2E;margin-bottom:8px"><div style="font-weight:700;font-size:14px;color:#1B1F23">${esc(b.title)}</div><div style="font-size:14px;line-height:1.55;color:#3d444b">${esc(b.body)}</div></div>`).join("")}
  </div>
  ${portalHtml}
  <p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#3d444b">Questions? Just reply to this email.</p>
  <p style="margin:14px 0 28px;font-size:14px;line-height:1.5">Connor McKendry<br><span style="color:#6D7782">Trenches Group</span></p>
</td></tr>
</table>
</td></tr></table>
<img src="${esc(input.pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">
</body></html>`;
  return { subject, text: text2, html };
}
__name(buildQuoteEmail, "buildQuoteEmail");
async function sendQuote(env, id, body, actor) {
  const quote = await requireQuote(env.DB, id);
  if (quote.status === "VOID") throw new HttpError(409, "QUOTE_VOID", "This quote was voided and cannot be sent.");
  const lineItems = JSON.parse(quote.line_items_json);
  return sendQuoteRow(env, id, quote, lineItems, body, actor);
}
__name(sendQuote, "sendQuote");
async function previewQuote(env, body) {
  const input = parseQuoteInput(body);
  const email = (text(body.email, "Email", 320) ?? "").toLowerCase();
  const recipientName = text(body.name, "Recipient name", 180);
  const t = totals(input.lineItems);
  const quote = {
    id: "preview",
    quote_number: text(body.quoteNumber, "Quote number", 20) || "Q-PREVIEW",
    lead_id: null,
    business_name: input.businessName,
    contact_name: input.contactName,
    title: input.title,
    message: input.message,
    terms: input.terms,
    line_items_json: JSON.stringify(input.lineItems),
    one_time_cents: t.oneTime,
    monthly_cents: t.monthly,
    valid_until: input.validUntil
  };
  const member = email ? await env.DB.prepare(`SELECT id FROM members WHERE lower(email)=?`).bind(email).first() : null;
  const site = siteBase(env);
  const message = buildQuoteEmail(quote, {
    recipientName,
    viewUrl: `${site}/estimate/?t=preview`,
    pixelUrl: "",
    inviteUrl: member ? null : `${site}/portal/?invite=preview`,
    portalUrl: `${site}/portal/`
  });
  return {
    subject: message.subject,
    html: message.html,
    text: message.text,
    includesPortalInvite: !member,
    estimate: {
      number: quote.quote_number,
      title: input.title,
      businessName: input.businessName,
      contactName: recipientName || input.contactName,
      message: input.message,
      terms: input.terms,
      lineItems: input.lineItems,
      oneTimeCents: t.oneTime,
      monthlyCents: t.monthly,
      validUntil: input.validUntil,
      status: "SENT",
      sentAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    account: { exists: !!member, loggedIn: false, email }
  };
}
__name(previewQuote, "previewQuote");
async function sendQuoteRow(env, id, quote, lineItems, body, actor) {
  if (!lineItems.length) throw new HttpError(409, "QUOTE_EMPTY", "Add at least one line item before sending.");
  const email = (text(body.email, "Email", 320, true) ?? "").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "INVALID_EMAIL", "Enter a valid email address.");
  const recipientName = text(body.name, "Recipient name", 180);
  const member = await env.DB.prepare(`SELECT id FROM members WHERE lower(email)=?`).bind(email).first();
  const token = randomToken();
  const site = siteBase(env);
  const viewUrl = `${site}/estimate/?t=${encodeURIComponent(token)}`;
  const inviteUrl = member ? null : `${site}/portal/?invite=${encodeURIComponent(token)}`;
  const message = buildQuoteEmail(quote, {
    recipientName,
    viewUrl,
    pixelUrl: `${site}/api/estimates/open/${encodeURIComponent(token)}.gif`,
    inviteUrl,
    portalUrl: `${site}/portal/`
  });
  const ts = nowIso();
  await env.DB.prepare(`INSERT INTO quote_sends(token,quote_id,email,recipient_name,included_invite,status,sent_by,sent_at) VALUES(?,?,?,?,?,'SENT',?,?)`).bind(token, id, email, recipientName, inviteUrl ? 1 : 0, actor, ts).run();
  try {
    const result = await sendGmail(env, { to: email, toName: recipientName, subject: message.subject, text: message.text, html: message.html });
    await env.DB.prepare(`UPDATE quote_sends SET provider_message_id=? WHERE token=?`).bind(result.messageId, token).run();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await env.DB.prepare(`UPDATE quote_sends SET status='FAILED',error=? WHERE token=?`).bind(reason.slice(0, 1e3), token).run();
    await logQuoteEvent(env.DB, { quoteId: id, eventType: "SEND_FAILED", source: "ADMIN", email, sendToken: token, detail: { actor, error: reason.slice(0, 500) } });
    throw new HttpError(error instanceof HttpError ? error.status : 502, "QUOTE_SEND_FAILED", `Email could not be sent: ${reason}`, { viewUrl });
  }
  await env.DB.prepare(`UPDATE quotes SET status=CASE WHEN status='DRAFT' THEN 'SENT' ELSE status END,first_sent_at=COALESCE(first_sent_at,?),last_sent_at=?,updated_at=? WHERE id=?`).bind(ts, ts, ts, id).run();
  await logQuoteEvent(env.DB, { quoteId: id, eventType: "SENT", source: "ADMIN", email, sendToken: token, detail: { actor, includedInvite: Boolean(inviteUrl) } });
  if (quote.lead_id) await recordEvent(env.DB, { eventId: newId("evt"), leadId: quote.lead_id, eventType: "QUOTE_SENT", eventData: { quoteId: id, quoteNumber: quote.quote_number, email, includedInvite: Boolean(inviteUrl) }, source: "QUOTES", actor });
  return { sent: true, email, viewUrl, includedInvite: Boolean(inviteUrl), quote: await requireQuote(env.DB, id) };
}
__name(sendQuoteRow, "sendQuoteRow");
async function sendFirstViewAlerts(env) {
  const due = await env.DB.prepare(`
    SELECT q.id, q.quote_number, q.title, q.business_name, q.first_viewed_at,
      (SELECT e.email FROM quote_events e WHERE e.quote_id=q.id AND e.event_type='VIEWED' ORDER BY e.created_at ASC LIMIT 1) AS viewer
    FROM quotes q WHERE q.first_viewed_at IS NOT NULL AND q.view_alert_sent_at IS NULL LIMIT 10
  `).all();
  let sent = 0;
  for (const q of due.results) {
    const claim = await env.DB.prepare(`UPDATE quotes SET view_alert_sent_at=? WHERE id=? AND view_alert_sent_at IS NULL`).bind(nowIso(), q.id).run();
    if ((claim.meta.changes ?? 0) !== 1) continue;
    const link = `${env.PUBLIC_BASE_URL}/admin`;
    const who = q.viewer || q.business_name;
    try {
      await sendGmail(env, {
        to: VIEW_ALERT_TO,
        subject: `${q.business_name} just opened estimate ${q.quote_number}`,
        text: `${who} opened "${q.title}" (${q.quote_number}) for the first time.

See every view in the Command Center: ${link}`,
        html: `<p><b>${esc(who)}</b> opened "${esc(q.title)}" (${esc(q.quote_number)}) for the first time.</p><p><a href="${esc(link)}">See every view in the Command Center</a></p>`
      });
      sent += 1;
    } catch (error) {
      await logQuoteEvent(env.DB, { quoteId: q.id, eventType: "VIEW_ALERT_FAILED", source: "SYSTEM", detail: { error: error instanceof Error ? error.message : String(error) } });
    }
  }
  return sent;
}
__name(sendFirstViewAlerts, "sendFirstViewAlerts");

