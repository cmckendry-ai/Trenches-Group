var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/estimates.js
var json = /* @__PURE__ */ __name((x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" } }), "json");
var now = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
var PIXEL = Uint8Array.from(atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"), (c) => c.charCodeAt(0));
async function liveSend(env, token2) {
  if (!token2 || token2.length > 100) return null;
  return env.CLIENTS.prepare(
    `SELECT s.token, s.email, s.recipient_name, s.sent_at, q.*
     FROM quote_sends s JOIN quotes q ON q.id = s.quote_id
     WHERE s.token = ? AND s.status = 'SENT' AND q.status <> 'VOID'`
  ).bind(token2).first();
}
__name(liveSend, "liveSend");
async function logEvent(env, send, type, source, req) {
  await env.CLIENTS.prepare("INSERT INTO quote_events(id,quote_id,send_token,event_type,source,email,user_agent,created_at) VALUES(?,?,?,?,?,?,?,?)").bind("qevt_" + crypto.randomUUID(), send.id, send.token, type, source, send.email, (req.headers.get("user-agent") || "").slice(0, 300), now()).run();
}
__name(logEvent, "logEvent");
async function verifyMember(env, memberId) {
  const ts = now();
  await env.CLIENTS.prepare("UPDATE members SET email_verified_at = COALESCE(email_verified_at, ?), pricing_unlocked = 1, pricing_unlocked_at = COALESCE(pricing_unlocked_at, ?), updated_at = ? WHERE id = ?").bind(ts, ts, ts, memberId).run();
}
__name(verifyMember, "verifyMember");
async function trackOpen(req, env, token2) {
  const send = await liveSend(env, token2);
  if (send) {
    const ts = now();
    await env.CLIENTS.batch([
      env.CLIENTS.prepare("UPDATE quote_sends SET open_count = open_count + 1, first_opened_at = COALESCE(first_opened_at, ?), last_opened_at = ? WHERE token = ?").bind(ts, ts, send.token),
      env.CLIENTS.prepare("UPDATE quotes SET open_count = open_count + 1, first_opened_at = COALESCE(first_opened_at, ?), last_opened_at = ? WHERE id = ?").bind(ts, ts, send.id)
    ]);
    await logEvent(env, send, "EMAIL_OPENED", "PIXEL", req);
  }
  return new Response(PIXEL, { headers: { "content-type": "image/gif", "cache-control": "no-store, no-cache, must-revalidate, max-age=0", "x-robots-tag": "noindex" } });
}
__name(trackOpen, "trackOpen");
async function viewEstimate(req, env, url, token2) {
  const send = await liveSend(env, token2);
  if (!send) return json({ error: "This estimate link is no longer available. Contact Trenches Group for an updated copy." }, 404);
  const member = await currentMember(req, env);
  const adminPreview = !!member?.impersonatedBy;
  const loggedIn = !!member && member.email === send.email;
  if (loggedIn && !adminPreview && (!member.email_verified_at || !member.pricing_unlocked)) await verifyMember(env, member.id);
  const accountExists = loggedIn || !!await env.CLIENTS.prepare("SELECT id FROM members WHERE email = ?").bind(send.email).first();
  if (!adminPreview) {
    const ts = now();
    await env.CLIENTS.batch([
      env.CLIENTS.prepare("UPDATE quote_sends SET view_count = view_count + 1, first_viewed_at = COALESCE(first_viewed_at, ?), last_viewed_at = ? WHERE token = ?").bind(ts, ts, send.token),
      env.CLIENTS.prepare("UPDATE quotes SET view_count = view_count + 1, first_viewed_at = COALESCE(first_viewed_at, ?), last_viewed_at = ?, status = CASE WHEN status = 'SENT' THEN 'VIEWED' ELSE status END WHERE id = ?").bind(ts, ts, send.id)
    ]);
    await logEvent(env, send, "VIEWED", url.searchParams.get("src") === "portal" ? "PORTAL" : "EMAIL_LINK", req);
  }
  if (!send.view_count && !adminPreview) {
    try {
      await sendMail(env, {
        to: env.PORTAL_ADMIN_EMAIL,
        subject: `${send.business_name} just opened estimate ${send.quote_number}`,
        text: `${send.email} opened "${send.title}" (${send.quote_number}) for the first time.

See all views in the Command Center: https://trenches-os-api.cmckendry-ai.workers.dev/admin`,
        bodyHtml: `<p><strong>${escapeHtml(send.email)}</strong> opened "${escapeHtml(send.title)}" (${escapeHtml(send.quote_number)}) for the first time.</p><p><a href="https://trenches-os-api.cmckendry-ai.workers.dev/admin">See all views in the Command Center</a></p>`
      });
    } catch (e) {
    }
  }
  return json({
    estimate: {
      number: send.quote_number,
      title: send.title,
      businessName: send.business_name,
      contactName: send.recipient_name || send.contact_name,
      message: send.message,
      terms: send.terms,
      lineItems: JSON.parse(send.line_items_json || "[]"),
      oneTimeCents: send.one_time_cents,
      monthlyCents: send.monthly_cents,
      validUntil: send.valid_until,
      status: send.status === "SENT" ? "VIEWED" : send.status,
      sentAt: send.sent_at
    },
    account: { exists: accountExists, loggedIn, email: send.email }
  });
}
__name(viewEstimate, "viewEstimate");
function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
__name(escapeHtml, "escapeHtml");
async function inviteInfo(env, token2) {
  const send = await liveSend(env, token2);
  if (!send) return json({ error: "This invite link is no longer valid. Contact Trenches Group for a new one." }, 404);
  const existing = await env.CLIENTS.prepare("SELECT id FROM members WHERE email = ?").bind(send.email).first();
  return json({ email: send.email, businessName: send.business_name, contactName: send.recipient_name || send.contact_name || "", accountExists: !!existing });
}
__name(inviteInfo, "inviteInfo");
async function inviteForSignup(env, token2) {
  const send = await liveSend(env, token2);
  return send ? { email: send.email, quoteId: send.id, token: send.token, businessName: send.business_name } : null;
}
__name(inviteForSignup, "inviteForSignup");
async function recordPortalSignup(env, invite, req) {
  await logEvent(env, { id: invite.quoteId, token: invite.token, email: invite.email }, "PORTAL_SIGNUP", "PORTAL", req);
}
__name(recordPortalSignup, "recordPortalSignup");
async function listMemberEstimates(req, env) {
  const member = await currentMember(req, env);
  if (!member) return json({ error: "Not logged in." }, 401);
  if (!member.email_verified_at) return json({ verified: false, items: [] });
  const { results } = await env.CLIENTS.prepare(
    `SELECT q.quote_number, q.title, q.one_time_cents, q.monthly_cents, q.valid_until, q.status, q.first_viewed_at, q.updated_at,
       json_array_length(q.line_items_json) AS item_count,
       (SELECT s.token FROM quote_sends s WHERE s.quote_id = q.id AND s.email = ?1 AND s.status = 'SENT' ORDER BY s.sent_at DESC LIMIT 1) AS token,
       (SELECT MAX(s.sent_at) FROM quote_sends s WHERE s.quote_id = q.id AND s.email = ?1 AND s.status = 'SENT') AS sent_at
     FROM quotes q
     WHERE q.status <> 'VOID' AND EXISTS (SELECT 1 FROM quote_sends s WHERE s.quote_id = q.id AND s.email = ?1 AND s.status = 'SENT')
     ORDER BY sent_at DESC`
  ).bind(member.email).all();
  return json({
    verified: true,
    items: results.map((r) => ({
      number: r.quote_number,
      title: r.title,
      oneTimeCents: r.one_time_cents,
      monthlyCents: r.monthly_cents,
      validUntil: r.valid_until,
      status: r.status === "SENT" ? "NEW" : r.status,
      sentAt: r.sent_at,
      viewedAt: r.first_viewed_at,
      updatedAt: r.updated_at,
      itemCount: r.item_count,
      url: `/estimate/?t=${encodeURIComponent(r.token)}&src=portal`
    }))
  });
}
__name(listMemberEstimates, "listMemberEstimates");

// src/account.js
var json2 = /* @__PURE__ */ __name((x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } }), "json");
var get = /* @__PURE__ */ __name((env, path, params) => stripe(env, path, params, "GET"), "get");
var iso = /* @__PURE__ */ __name((unix) => unix ? new Date(unix * 1e3).toISOString() : null, "iso");
var idOf = /* @__PURE__ */ __name((x) => (x && typeof x === "object" ? x.id : x) || null, "idOf");
var SESSION_EXPAND = [["expand[]", "data.line_items"], ["expand[]", "data.payment_intent.latest_charge"]];
var ORDER_KINDS = {
  deposit: "Website Build Deposit",
  social_order: "Social Media Management",
  outreach_order: "Automated Outreach",
  addon_subscription: "Add-On Subscription"
};
var cardOf = /* @__PURE__ */ __name((pm) => {
  if (pm?.card) return { brand: pm.card.brand, last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year };
  if (pm?.us_bank_account) return { brand: "bank", last4: pm.us_bank_account.last4 };
  return null;
}, "cardOf");
async function findCustomers(env, member) {
  const email = member.email.toLowerCase();
  const expand = ["expand[]", "data.invoice_settings.default_payment_method"];
  const quoted = email.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const [listed, searched, own] = await Promise.all([
    get(env, "customers", [["email", email], ["limit", "20"], expand]),
    // Search is case-insensitive (list is exact-match) but isn't available everywhere — optional.
    get(env, "customers/search", [["query", `email:'${quoted}'`], ["limit", "20"], expand]).catch(() => ({ data: [] })),
    member.stripe_customer_id ? get(env, "customers/" + member.stripe_customer_id, [["expand[]", "invoice_settings.default_payment_method"]]).catch(() => null) : null
  ]);
  const byId = /* @__PURE__ */ new Map();
  for (const c of [...listed.data, ...searched.data]) if ((c.email || "").toLowerCase() === email) byId.set(c.id, c);
  if (own && !own.deleted) byId.set(own.id, own);
  return [...byId.values()].slice(0, 5);
}
__name(findCustomers, "findCustomers");
function subscriptionOut(s, products, customer) {
  const items = s.items?.data || [];
  const nameOf = /* @__PURE__ */ __name((i) => i.price?.nickname || products.get(idOf(i.price?.product))?.name || "Subscription", "nameOf");
  const recurring = items[0]?.price?.recurring || {};
  return {
    id: s.id,
    name: items.map(nameOf).join(" + ") || "Subscription",
    status: s.status,
    amountCents: items.reduce((t, i) => t + (i.price?.unit_amount || 0) * (i.quantity || 1), 0),
    currency: s.currency,
    interval: recurring.interval || "month",
    intervalCount: recurring.interval_count || 1,
    startedAt: iso(s.start_date),
    // Newer Stripe API versions moved the billing period onto each item.
    currentPeriodStart: iso(s.current_period_start ?? items[0]?.current_period_start),
    currentPeriodEnd: iso(s.current_period_end ?? items[0]?.current_period_end),
    cancelAtPeriodEnd: !!s.cancel_at_period_end,
    cancelAt: iso(s.cancel_at),
    canceledAt: iso(s.canceled_at),
    endedAt: iso(s.ended_at),
    trialEnd: iso(s.trial_end),
    paymentMethod: cardOf(s.default_payment_method) || cardOf(customer?.invoice_settings?.default_payment_method),
    items: items.map((i) => ({ name: nameOf(i), quantity: i.quantity || 1, amountCents: (i.price?.unit_amount || 0) * (i.quantity || 1) }))
  };
}
__name(subscriptionOut, "subscriptionOut");
var invoiceOut = /* @__PURE__ */ __name((i) => ({
  id: i.id,
  number: i.number,
  status: i.status,
  createdAt: iso(i.created),
  dueDate: iso(i.due_date),
  paidAt: iso(i.status_transitions?.paid_at),
  totalCents: i.total,
  amountPaidCents: i.amount_paid,
  amountDueCents: i.amount_remaining ?? i.amount_due,
  currency: i.currency,
  hostedUrl: i.hosted_invoice_url,
  pdfUrl: i.invoice_pdf,
  description: (i.lines?.data || []).map((l) => l.description).filter(Boolean).slice(0, 3).join(" \xB7 ") || i.description || "Invoice"
}), "invoiceOut");
async function fulfillmentFor(env, meta) {
  const stage = meta?.payment_stage;
  const look = /* @__PURE__ */ __name(async (table, col, token2) => token2 ? env.CLIENTS.prepare(`SELECT status FROM ${table} WHERE ${col} = ?`).bind(token2).first() : null, "look");
  if (stage === "deposit") {
    const p = await look("client_proposals", "token", meta.proposal_token);
    if (p?.status === "DEPOSIT_PAID") return { label: "Onboarding form needed", actionLabel: "Finish onboarding", actionUrl: "/onboarding/?token=" + encodeURIComponent(meta.proposal_token) };
    if (p?.status === "ONBOARDING_SUBMITTED") return { label: "Onboarding received \u2014 build in progress" };
  }
  if (stage === "social_order" || stage === "outreach_order") {
    const table = stage === "social_order" ? "social_orders" : "outreach_orders";
    const page = stage === "social_order" ? "/social-media/intake/" : "/outreach-agents/intake/";
    const o = await look(table, "token", meta.order_token);
    if (o?.status === "PAID") return { label: "Intake form needed", actionLabel: "Complete intake", actionUrl: page + "?token=" + encodeURIComponent(meta.order_token) };
    if (o?.status === "INTAKE_SUBMITTED") return { label: "Intake received \u2014 setup in progress" };
  }
  return null;
}
__name(fulfillmentFor, "fulfillmentFor");
async function orderOut(env, s, invoicesById) {
  const charge = s.payment_intent?.latest_charge;
  const invoiceId = idOf(s.invoice);
  return {
    id: s.id,
    kind: ORDER_KINDS[s.metadata?.payment_stage] || "Order",
    mode: s.mode,
    createdAt: iso(s.created),
    totalCents: s.amount_total,
    currency: s.currency,
    paymentStatus: s.payment_status,
    invoiceId,
    items: (s.line_items?.data || []).map((li) => ({ description: li.description, quantity: li.quantity, amountCents: li.amount_total })),
    receiptUrl: charge?.receipt_url || invoicesById.get(invoiceId)?.hostedUrl || null,
    paymentMethod: cardOf(charge?.payment_method_details),
    fulfillment: s.payment_status === "paid" ? await fulfillmentFor(env, s.metadata) : null
  };
}
__name(orderOut, "orderOut");
var monthlyCents = /* @__PURE__ */ __name((s) => {
  const per = s.amountCents / s.intervalCount;
  return Math.round(s.interval === "year" ? per / 12 : s.interval === "week" ? per * 52 / 12 : s.interval === "day" ? per * 365 / 12 : per);
}, "monthlyCents");
async function stripeAccountFor(env, member) {
  const customers = await findCustomers(env, member);
  const [perCustomer, guestSessions] = await Promise.all([
    Promise.all(customers.map((c) => Promise.all([
      get(env, "subscriptions", [["customer", c.id], ["status", "all"], ["limit", "100"], ["expand[]", "data.default_payment_method"]]),
      get(env, "invoices", [["customer", c.id], ["limit", "100"]]),
      get(env, "checkout/sessions", [["customer", c.id], ["limit", "100"], ...SESSION_EXPAND])
    ]))),
    // One-time Checkout payments don't always create a Customer — catch those by email.
    get(env, "checkout/sessions", [["customer_details[email]", member.email.toLowerCase()], ["limit", "100"], ...SESSION_EXPAND]).catch(() => ({ data: [] }))
  ]);
  const customerById = new Map(customers.map((c) => [c.id, c]));
  const rawSubs = perCustomer.flatMap(([subs]) => subs.data).filter((s) => s.status !== "incomplete_expired");
  const productIds = [...new Set(rawSubs.flatMap((s) => (s.items?.data || []).map((i) => idOf(i.price?.product))).filter(Boolean))];
  const products = /* @__PURE__ */ new Map();
  for (let i = 0; i < productIds.length; i += 100) {
    const page = await get(env, "products", [["limit", "100"], ...productIds.slice(i, i + 100).map((id) => ["ids[]", id])]).catch(() => ({ data: [] }));
    for (const p of page.data) products.set(p.id, p);
  }
  const subscriptions = rawSubs.map((s) => subscriptionOut(s, products, customerById.get(idOf(s.customer))));
  const invoices = perCustomer.flatMap(([, inv]) => inv.data).filter((i) => i.status !== "draft").map(invoiceOut);
  const invoicesById = new Map(invoices.map((i) => [i.id, i]));
  const sessions = /* @__PURE__ */ new Map();
  for (const s of [...perCustomer.flatMap(([, , ses]) => ses.data), ...guestSessions.data]) if (s.status === "complete") sessions.set(s.id, s);
  const orders = await Promise.all([...sessions.values()].map((s) => orderOut(env, s, invoicesById)));
  const LIVE = ["active", "trialing", "past_due"];
  const live = subscriptions.filter((s) => LIVE.includes(s.status));
  const next = live.filter((s) => !s.cancelAtPeriodEnd && s.currentPeriodEnd).sort((a, b) => a.currentPeriodEnd.localeCompare(b.currentPeriodEnd))[0];
  const paidInvoices = invoices.filter((i) => i.status === "paid").reduce((t, i) => t + (i.amountPaidCents || 0), 0);
  const paidOneTime = orders.filter((o) => o.mode === "payment" && o.paymentStatus === "paid" && !o.invoiceId).reduce((t, o) => t + (o.totalCents || 0), 0);
  const byNewest = /* @__PURE__ */ __name((k) => (a, b) => (b[k] || "").localeCompare(a[k] || ""), "byNewest");
  subscriptions.sort((a, b) => LIVE.includes(b.status) - LIVE.includes(a.status) || byNewest("startedAt")(a, b));
  return {
    customerSince: customers.length ? iso(Math.min(...customers.map((c) => c.created))) : null,
    totals: {
      activeCount: live.length,
      monthlyCents: live.reduce((t, s) => t + monthlyCents(s), 0),
      lifetimePaidCents: paidInvoices + paidOneTime,
      openInvoiceCents: invoices.filter((i) => i.status === "open").reduce((t, i) => t + (i.amountDueCents || 0), 0),
      nextPayment: next ? { date: next.currentPeriodEnd, amountCents: next.amountCents, name: next.name } : null
    },
    subscriptions,
    orders: orders.sort(byNewest("createdAt")),
    invoices: invoices.sort(byNewest("createdAt"))
  };
}
__name(stripeAccountFor, "stripeAccountFor");
async function myAccount(req, env) {
  const member = await currentMember(req, env);
  if (!member) return json2({ error: "Not logged in." }, 401);
  if (!member.email_verified_at) return json2({ verified: false });
  try {
    return json2({ verified: true, ...await stripeAccountFor(env, member) });
  } catch (e) {
    return json2({ verified: true, unavailable: true });
  }
}
__name(myAccount, "myAccount");

// src/portal.js
var SITE = "https://trenchesgroup.com";
var SESSION_COOKIE = "portal_session";
var SESSION_DAYS = 30;
var json3 = /* @__PURE__ */ __name((x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } }), "json");
var now2 = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
var uid = /* @__PURE__ */ __name(() => crypto.randomUUID(), "uid");
var clean = /* @__PURE__ */ __name((x, n = 300) => typeof x === "string" ? x.trim().slice(0, n) : "", "clean");
var isEmail = /* @__PURE__ */ __name((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x), "isEmail");
var addDays = /* @__PURE__ */ __name((d) => new Date(Date.now() + d * 864e5).toISOString(), "addDays");
var toCents = /* @__PURE__ */ __name((dollars) => Math.max(0, Math.round(Number(dollars) * 100)) || 0, "toCents");
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(constantTimeEqual, "constantTimeEqual");
async function hashPassword(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 1e5, hash: "SHA-256" }, keyMaterial, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(hashPassword, "hashPassword");
function getCookie(req, name) {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}
__name(getCookie, "getCookie");
var setSessionCookie = /* @__PURE__ */ __name((token2) => `${SESSION_COOKIE}=${token2}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`, "setSessionCookie");
var clearSessionCookie = /* @__PURE__ */ __name(() => `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`, "clearSessionCookie");
async function stripe(env, path, params, method = "POST") {
  if (!env.STRIPE_SECRET_KEY) throw new Error("Stripe is not configured yet.");
  const opts = { method, headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY } };
  if (method !== "GET" && method !== "DELETE") {
    opts.headers["content-type"] = "application/x-www-form-urlencoded";
    opts.body = new URLSearchParams(params);
  }
  const qs = method === "GET" && params ? "?" + new URLSearchParams(params) : "";
  const r = await fetch("https://api.stripe.com/v1/" + path + qs, opts);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "Stripe request failed.");
  return j;
}
__name(stripe, "stripe");
async function verifyStripeSignature(req, env, raw, secret) {
  const h = req.headers.get("stripe-signature") || "";
  const t = h.match(/(?:^|,)t=(\d+)/)?.[1];
  const s = h.match(/(?:^|,)v1=([a-f0-9]+)/)?.[1];
  if (!t || !s || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(t + "." + raw)));
  const expected = [...sig].map((x) => x.toString(16).padStart(2, "0")).join("");
  return constantTimeEqual(expected, s);
}
__name(verifyStripeSignature, "verifyStripeSignature");
async function sendMail(env, { to, subject, text, bodyHtml }) {
  if (!env.EMAIL) throw new Error("Email sending is not configured yet.");
  await env.EMAIL.send({
    to,
    from: { email: env.PORTAL_FROM_EMAIL || "portal@trenchesgroup.com", name: "Trenches Group Portal" },
    subject,
    text,
    html: bodyHtml
  });
}
__name(sendMail, "sendMail");
async function signup(req, env) {
  const b = await req.json().catch(() => ({}));
  const invite = b.inviteToken ? await inviteForSignup(env, clean(b.inviteToken, 100)) : null;
  if (b.inviteToken && !invite) return json3({ error: "This invite link is no longer valid. Contact Trenches Group for a new one." }, 400);
  const businessName = clean(b.businessName, 160);
  const contactName = clean(b.contactName, 160);
  const email = invite ? invite.email : clean(b.email, 320).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  if (!businessName || !contactName || !isEmail(email)) return json3({ error: "Enter your business name, contact name, and a valid email." }, 400);
  if (password.length < 8) return json3({ error: "Password must be at least 8 characters." }, 400);
  const existing = await env.CLIENTS.prepare("SELECT id FROM members WHERE email = ?").bind(email).first();
  if (existing) return json3({ error: "An account with that email already exists. Try logging in instead." }, 409);
  const id = "mem_" + uid();
  const salt = uid();
  const passwordHash = await hashPassword(password, salt);
  const ts = now2();
  const approved = invite ? 1 : 0;
  await env.CLIENTS.prepare(
    "INSERT INTO members(id,business_name,contact_name,email,password_hash,password_salt,role,status,pricing_unlocked,pricing_unlocked_at,email_verified_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)"
  ).bind(id, businessName, contactName, email, passwordHash, salt, "member", "active", approved, invite ? ts : null, invite ? ts : null, ts, ts).run();
  if (invite) await recordPortalSignup(env, invite, req);
  const token2 = uid();
  await env.CLIENTS.prepare("INSERT INTO member_sessions(token,member_id,expires_at,created_at) VALUES(?,?,?,?)").bind(token2, id, addDays(SESSION_DAYS), ts).run();
  try {
    await sendMail(env, {
      to: env.PORTAL_ADMIN_EMAIL,
      subject: `New member signup: ${businessName}`,
      text: invite ? `${businessName} (${contactName}, ${email}) created a portal account from an estimate you sent. Pricing is already unlocked.` : `${businessName} (${contactName}, ${email}) created a portal account. Unlock their pricing from the admin panel: ${SITE}/portal/admin.html`,
      bodyHtml: invite ? `<p><strong>${businessName}</strong> (${contactName}, ${email}) created a portal account from an estimate you sent. Pricing is already unlocked.</p>` : `<p><strong>${businessName}</strong> (${contactName}, ${email}) created a portal account.</p><p><a href="${SITE}/portal/admin.html">Open the admin panel</a> to unlock their pricing.</p>`
    });
  } catch (e) {
  }
  return new Response(
    JSON.stringify({ ok: true, member: { businessName, contactName, email, status: "active", pricingUnlocked: !!approved } }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": setSessionCookie(token2) } }
  );
}
__name(signup, "signup");
async function login(req, env) {
  const b = await req.json().catch(() => ({}));
  const email = clean(b.email, 320).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  if (!isEmail(email) || !password) return json3({ error: "Enter your email and password." }, 400);
  const member = await env.CLIENTS.prepare("SELECT * FROM members WHERE email = ?").bind(email).first();
  const genericError = /* @__PURE__ */ __name(() => json3({ error: "Incorrect email or password." }, 401), "genericError");
  if (!member) return genericError();
  const candidateHash = await hashPassword(password, member.password_salt);
  if (!constantTimeEqual(candidateHash, member.password_hash)) return genericError();
  if (member.status !== "active") {
    return json3({ error: "This account has been suspended. Contact Trenches Group for help.", status: member.status }, 403);
  }
  const token2 = uid();
  await env.CLIENTS.prepare("INSERT INTO member_sessions(token,member_id,expires_at,created_at) VALUES(?,?,?,?)").bind(token2, member.id, addDays(SESSION_DAYS), now2()).run();
  return new Response(
    JSON.stringify({ ok: true, member: { businessName: member.business_name, contactName: member.contact_name, email: member.email, status: member.status, pricingUnlocked: !!member.pricing_unlocked } }),
    { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": setSessionCookie(token2) } }
  );
}
__name(login, "login");
async function currentMember(req, env) {
  const admin = await adminSession(req, env);
  if (admin?.impersonate_member_id) {
    const viewed = await env.CLIENTS.prepare("SELECT * FROM members WHERE id = ?").bind(admin.impersonate_member_id).first();
    if (viewed) return { ...viewed, impersonatedBy: admin.email };
  }
  const token2 = getCookie(req, SESSION_COOKIE);
  if (!token2) return null;
  const session = await env.CLIENTS.prepare("SELECT * FROM member_sessions WHERE token = ?").bind(token2).first();
  if (!session || new Date(session.expires_at).getTime() < Date.now()) return null;
  const member = await env.CLIENTS.prepare("SELECT * FROM members WHERE id = ?").bind(session.member_id).first();
  return member || null;
}
__name(currentMember, "currentMember");
async function me(req, env) {
  const member = await currentMember(req, env);
  if (!member) return json3({ error: "Not logged in." }, 401);
  return json3({ member: { businessName: member.business_name, contactName: member.contact_name, email: member.email, status: member.status, role: member.role, pricingUnlocked: !!member.pricing_unlocked, emailVerified: !!member.email_verified_at, createdAt: member.created_at, impersonating: !!member.impersonatedBy } });
}
__name(me, "me");
var lookOnly = /* @__PURE__ */ __name(() => json3({ error: "You're viewing this account as an admin \u2014 look only." }, 403), "lookOnly");
async function logout(req, env) {
  const token2 = getCookie(req, SESSION_COOKIE);
  if (token2) await env.CLIENTS.prepare("DELETE FROM member_sessions WHERE token = ?").bind(token2).run();
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() } });
}
__name(logout, "logout");
async function catalogFor(req, env, table) {
  const member = await currentMember(req, env);
  if (!member) return json3({ error: "Not logged in." }, 401);
  const { results } = await env.CLIENTS.prepare(`SELECT id,name,description,price_cents,is_custom_quote FROM ${table} WHERE is_active = 1 ORDER BY name`).all();
  const unlocked = !!member.pricing_unlocked;
  let subscribedIds = /* @__PURE__ */ new Set();
  if (table === "addons") {
    const { results: subs } = await env.CLIENTS.prepare("SELECT addon_id FROM member_addons WHERE member_id = ? AND status = 'active'").bind(member.id).all();
    subscribedIds = new Set(subs.map((s) => s.addon_id));
  }
  return json3({
    pricingUnlocked: unlocked,
    items: results.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      customQuote: !!r.is_custom_quote,
      priceCents: !r.is_custom_quote && unlocked ? r.price_cents : null,
      ...table === "addons" ? { subscribed: subscribedIds.has(r.id) } : {}
    }))
  });
}
__name(catalogFor, "catalogFor");
async function ensureStripeCustomer(env, member) {
  if (member.stripe_customer_id) return member.stripe_customer_id;
  const customer = await stripe(env, "customers", { email: member.email, name: member.business_name, "metadata[member_id]": member.id });
  await env.CLIENTS.prepare("UPDATE members SET stripe_customer_id = ? WHERE id = ?").bind(customer.id, member.id).run();
  return customer.id;
}
__name(ensureStripeCustomer, "ensureStripeCustomer");
async function ensureStripePrice(env, addon) {
  if (addon.stripe_price_id) return addon.stripe_price_id;
  const product = await stripe(env, "products", { name: addon.name, "metadata[addon_id]": addon.id });
  const price = await stripe(env, "prices", { product: product.id, unit_amount: String(addon.price_cents), currency: "usd", "recurring[interval]": "month" });
  await env.CLIENTS.prepare("UPDATE addons SET stripe_price_id = ? WHERE id = ?").bind(price.id, addon.id).run();
  return price.id;
}
__name(ensureStripePrice, "ensureStripePrice");
async function subscribeToAddon(req, env, addonId) {
  const member = await currentMember(req, env);
  if (!member) return json3({ error: "Not logged in." }, 401);
  if (member.impersonatedBy) return lookOnly();
  if (!member.pricing_unlocked) return json3({ error: "Your account needs pricing approved before you can subscribe to add-ons." }, 403);
  const addon = await env.CLIENTS.prepare("SELECT * FROM addons WHERE id = ? AND is_active = 1").bind(addonId).first();
  if (!addon) return json3({ error: "Add-on not found." }, 404);
  if (addon.is_custom_quote) return json3({ error: "This add-on is custom-quoted \u2014 contact Trenches Group directly." }, 400);
  const existing = await env.CLIENTS.prepare("SELECT id FROM member_addons WHERE member_id = ? AND addon_id = ? AND status = 'active'").bind(member.id, addonId).first();
  if (existing) return json3({ error: "You are already subscribed to this add-on." }, 409);
  try {
    const customerId = await ensureStripeCustomer(env, member);
    const priceId = await ensureStripePrice(env, addon);
    const session = await stripe(env, "checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${SITE}/portal/dashboard.html?addon_success=1`,
      cancel_url: `${SITE}/portal/dashboard.html`,
      "metadata[payment_stage]": "addon_subscription",
      "metadata[member_id]": member.id,
      "metadata[addon_id]": addonId
    });
    return json3({ checkoutUrl: session.url });
  } catch (e) {
    return json3({ error: e.message || "Unable to start checkout." }, 503);
  }
}
__name(subscribeToAddon, "subscribeToAddon");
async function cancelAddonSubscription(req, env, addonId) {
  const member = await currentMember(req, env);
  if (!member) return json3({ error: "Not logged in." }, 401);
  if (member.impersonatedBy) return lookOnly();
  const row = await env.CLIENTS.prepare("SELECT * FROM member_addons WHERE member_id = ? AND addon_id = ? AND status = 'active'").bind(member.id, addonId).first();
  if (!row) return json3({ error: "No active subscription found for this add-on." }, 404);
  try {
    if (row.stripe_subscription_id) await stripe(env, "subscriptions/" + row.stripe_subscription_id, null, "DELETE");
  } catch (e) {
    return json3({ error: e.message || "Unable to cancel with Stripe." }, 503);
  }
  await env.CLIENTS.prepare("UPDATE member_addons SET status = 'cancelled', canceled_at = ? WHERE id = ?").bind(now2(), row.id).run();
  return json3({ ok: true });
}
__name(cancelAddonSubscription, "cancelAddonSubscription");
async function upsertMemberAddon(env, memberId, addonId, subscriptionId) {
  const existing = await env.CLIENTS.prepare("SELECT id FROM member_addons WHERE member_id = ? AND addon_id = ?").bind(memberId, addonId).first();
  if (existing) {
    await env.CLIENTS.prepare("UPDATE member_addons SET status='active', stripe_subscription_id=?, canceled_at=NULL, added_at=? WHERE id=?").bind(subscriptionId, now2(), existing.id).run();
  } else {
    await env.CLIENTS.prepare("INSERT INTO member_addons(id,member_id,addon_id,status,stripe_subscription_id,added_at) VALUES(?,?,?,?,?,?)").bind("ma_" + uid(), memberId, addonId, "active", subscriptionId, now2()).run();
  }
}
__name(upsertMemberAddon, "upsertMemberAddon");
async function stripeWebhook(req, env) {
  const raw = await req.text();
  if (!await verifyStripeSignature(req, env, raw, env.PORTAL_STRIPE_WEBHOOK_SECRET)) return json3({ error: "Invalid signature." }, 400);
  const event = JSON.parse(raw);
  const seen = await env.CLIENTS.prepare("SELECT id FROM stripe_webhook_events WHERE id = ?").bind(event.id).first();
  if (seen) return json3({ received: true });
  await env.CLIENTS.prepare("INSERT INTO stripe_webhook_events(id,event_type,received_at) VALUES(?,?,?)").bind(event.id, event.type, now2()).run();
  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    if (session?.metadata?.payment_stage === "addon_subscription" && session.subscription) {
      await upsertMemberAddon(env, session.metadata.member_id, session.metadata.addon_id, session.subscription);
    }
  }
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data?.object;
    await env.CLIENTS.prepare("UPDATE member_addons SET status='cancelled', canceled_at=? WHERE stripe_subscription_id=? AND status='active'").bind(now2(), sub.id).run();
  }
  return json3({ received: true });
}
__name(stripeWebhook, "stripeWebhook");
async function adminStripeSetup(env) {
  const webhookUrl = `${SITE}/api/portal/stripe-webhook`;
  try {
    const existing = await stripe(env, "webhook_endpoints", { limit: "100" }, "GET");
    const match = (existing.data || []).find((w) => w.url === webhookUrl);
    if (match) return json3({ ok: true, alreadyExists: true, id: match.id, note: "A webhook endpoint for this URL already exists. Its secret was only shown at creation \u2014 if PORTAL_STRIPE_WEBHOOK_SECRET is missing, delete this endpoint in the Stripe Dashboard and call this again." });
    const created = await stripe(env, "webhook_endpoints", {
      url: webhookUrl,
      "enabled_events[0]": "checkout.session.completed",
      "enabled_events[1]": "customer.subscription.deleted"
    });
    const keyMode = (env.STRIPE_SECRET_KEY || "").startsWith("sk_live_") ? "live" : "test";
    return json3({ ok: true, id: created.id, webhookSecret: created.secret, keyMode });
  } catch (e) {
    return json3({ error: e.message || "Could not reach Stripe." }, 503);
  }
}
__name(adminStripeSetup, "adminStripeSetup");
var ADMIN_COOKIE = "admin_session";
var ADMIN_SESSION_HOURS = 12;
var ADMIN_MAX_FAILS = 8;
var ADMIN_LOCK_MINUTES = 15;
var setAdminCookie = /* @__PURE__ */ __name((token2) => `${ADMIN_COOKIE}=${token2}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ADMIN_SESSION_HOURS * 3600}`, "setAdminCookie");
var clearAdminCookie = /* @__PURE__ */ __name(() => `${ADMIN_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`, "clearAdminCookie");
var adminEmail = /* @__PURE__ */ __name((env) => (env.PORTAL_ADMIN_EMAIL || "").trim().toLowerCase(), "adminEmail");
var adminDenied = /* @__PURE__ */ __name(() => json3({ error: "Please sign in." }, 401), "adminDenied");
var withCookie = /* @__PURE__ */ __name((body, cookie) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": cookie } }), "withCookie");
var sameOrigin = /* @__PURE__ */ __name((req, url) => {
  const o = req.headers.get("origin");
  return !o || o === url.origin;
}, "sameOrigin");
async function sha256Hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(sha256Hex, "sha256Hex");
var B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(bytes) {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = value << 8 | b;
    bits += 8;
    while (bits >= 5) {
      out += B32[value >>> bits - 5 & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[value << 5 - bits & 31];
  return out;
}
__name(base32Encode, "base32Encode");
function base32Decode(s) {
  let bits = 0, value = 0;
  const out = [];
  for (const c of s.toUpperCase()) {
    const i = B32.indexOf(c);
    if (i < 0) continue;
    value = value << 5 | i;
    bits += 5;
    if (bits >= 8) {
      out.push(value >>> bits - 8 & 255);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}
__name(base32Decode, "base32Decode");
async function totpCode(secret, step) {
  const key = await crypto.subtle.importKey("raw", base32Decode(secret), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const msg = new ArrayBuffer(8);
  new DataView(msg).setUint32(4, step);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const o = h[19] & 15;
  const n = ((h[o] & 127) << 24 | h[o + 1] << 16 | h[o + 2] << 8 | h[o + 3]) % 1e6;
  return String(n).padStart(6, "0");
}
__name(totpCode, "totpCode");
async function matchTotp(secret, code, lastStep) {
  if (!/^\d{6}$/.test(code)) return 0;
  const cur = Math.floor(Date.now() / 3e4);
  for (const step of [cur - 1, cur, cur + 1]) {
    if (step > lastStep && constantTimeEqual(await totpCode(secret, step), code)) return step;
  }
  return 0;
}
__name(matchTotp, "matchTotp");
async function adminSession(req, env) {
  const token2 = getCookie(req, ADMIN_COOKIE);
  if (!token2) return null;
  const s = await env.CLIENTS.prepare("SELECT * FROM admin_sessions WHERE token_hash = ?").bind(await sha256Hex(token2)).first();
  if (!s || new Date(s.expires_at).getTime() < Date.now()) return null;
  return s;
}
__name(adminSession, "adminSession");
async function startAdminSession(env, email) {
  const token2 = uid() + uid();
  await env.CLIENTS.prepare("INSERT INTO admin_sessions(token_hash,email,expires_at,created_at) VALUES(?,?,?,?)").bind(await sha256Hex(token2), email, new Date(Date.now() + ADMIN_SESSION_HOURS * 36e5).toISOString(), now2()).run();
  return token2;
}
__name(startAdminSession, "startAdminSession");
var enrolledAdmin = /* @__PURE__ */ __name((env) => env.CLIENTS.prepare("SELECT * FROM admin_users WHERE totp_enabled_at IS NOT NULL").first(), "enrolledAdmin");
var setupKeyOk = /* @__PURE__ */ __name((env, key) => !!env.PORTAL_ADMIN_KEY && typeof key === "string" && constantTimeEqual(key, env.PORTAL_ADMIN_KEY), "setupKeyOk");
async function adminAuthStatus(req, env) {
  const enrolled = await enrolledAdmin(env);
  const s = enrolled ? await adminSession(req, env) : null;
  const viewing = s?.impersonate_member_id ? await env.CLIENTS.prepare("SELECT id, business_name FROM members WHERE id = ?").bind(s.impersonate_member_id).first() : null;
  return json3({ setupNeeded: !enrolled, loggedIn: !!s, email: s?.email || null, viewingAs: viewing ? { id: viewing.id, businessName: viewing.business_name } : null });
}
__name(adminAuthStatus, "adminAuthStatus");
async function adminSetup(req, env) {
  const b = await req.json().catch(() => ({}));
  const email = adminEmail(env);
  if (!email) return json3({ error: "PORTAL_ADMIN_EMAIL is not configured." }, 500);
  if (await enrolledAdmin(env)) return json3({ error: "Admin sign-in is already set up." }, 409);
  if (!setupKeyOk(env, b.setupKey)) return json3({ error: "That setup key is not correct." }, 401);
  const password = typeof b.password === "string" ? b.password : "";
  if (password.length < 12) return json3({ error: "Use a password of at least 12 characters." }, 400);
  const salt = uid();
  const secret = base32Encode(crypto.getRandomValues(new Uint8Array(20)));
  await env.CLIENTS.prepare("INSERT OR REPLACE INTO admin_users(email,password_hash,password_salt,totp_secret,created_at) VALUES(?,?,?,?,?)").bind(email, await hashPassword(password, salt), salt, secret, now2()).run();
  const issuer = encodeURIComponent("Trenches Group Portal");
  return json3({ email, secret, otpauthUri: `otpauth://totp/${issuer}:${encodeURIComponent(email)}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30` });
}
__name(adminSetup, "adminSetup");
async function adminSetupConfirm(req, env) {
  const b = await req.json().catch(() => ({}));
  if (!setupKeyOk(env, b.setupKey)) return json3({ error: "That setup key is not correct." }, 401);
  const user = await env.CLIENTS.prepare("SELECT * FROM admin_users WHERE email = ?").bind(adminEmail(env)).first();
  if (!user || user.totp_enabled_at) return json3({ error: "Start setup again." }, 409);
  const step = await matchTotp(user.totp_secret, clean(b.code, 10), 0);
  if (!step) return json3({ error: "That code didn't match. Use the newest code in the app." }, 400);
  await env.CLIENTS.prepare("UPDATE admin_users SET totp_enabled_at = ?, totp_last_step = ?, last_login_at = ? WHERE email = ?").bind(now2(), step, now2(), user.email).run();
  return withCookie({ ok: true }, setAdminCookie(await startAdminSession(env, user.email)));
}
__name(adminSetupConfirm, "adminSetupConfirm");
async function adminLogin(req, env) {
  const b = await req.json().catch(() => ({}));
  const fail = /* @__PURE__ */ __name(() => json3({ error: "Email, password, or code is incorrect." }, 401), "fail");
  const email = clean(b.email, 320).toLowerCase();
  if (!email || email !== adminEmail(env)) return fail();
  const user = await env.CLIENTS.prepare("SELECT * FROM admin_users WHERE email = ? AND totp_enabled_at IS NOT NULL").bind(email).first();
  if (!user) return fail();
  const lockedMs = user.locked_until ? new Date(user.locked_until).getTime() - Date.now() : 0;
  if (lockedMs > 0) return json3({ error: `Too many attempts. Try again in ${Math.ceil(lockedMs / 6e4)} minutes.` }, 429);
  const password = typeof b.password === "string" ? b.password : "";
  const passwordOk = constantTimeEqual(await hashPassword(password, user.password_salt), user.password_hash);
  const step = passwordOk ? await matchTotp(user.totp_secret, clean(b.code, 10), user.totp_last_step) : 0;
  if (!step) {
    const fails = user.failed_attempts + 1;
    const lock = fails >= ADMIN_MAX_FAILS ? new Date(Date.now() + ADMIN_LOCK_MINUTES * 6e4).toISOString() : null;
    await env.CLIENTS.prepare("UPDATE admin_users SET failed_attempts = ?, locked_until = ? WHERE email = ?").bind(lock ? 0 : fails, lock, email).run();
    return fail();
  }
  await env.CLIENTS.prepare("UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, totp_last_step = ?, last_login_at = ? WHERE email = ?").bind(step, now2(), email).run();
  return withCookie({ ok: true }, setAdminCookie(await startAdminSession(env, email)));
}
__name(adminLogin, "adminLogin");
async function adminLogout(req, env) {
  const token2 = getCookie(req, ADMIN_COOKIE);
  if (token2) await env.CLIENTS.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(await sha256Hex(token2)).run();
  return withCookie({ ok: true }, clearAdminCookie());
}
__name(adminLogout, "adminLogout");
async function adminImpersonate(req, env, session) {
  const b = await req.json().catch(() => ({}));
  let memberId = null;
  if (b.memberId) {
    const m = await env.CLIENTS.prepare("SELECT id FROM members WHERE id = ?").bind(clean(b.memberId, 100)).first();
    if (!m) return json3({ error: "Member not found." }, 404);
    memberId = m.id;
  }
  await env.CLIENTS.prepare("UPDATE admin_sessions SET impersonate_member_id = ? WHERE token_hash = ?").bind(memberId, session.token_hash).run();
  return json3({ ok: true });
}
__name(adminImpersonate, "adminImpersonate");
async function adminListMembers(req, env, url) {
  const pendingOnly = url.searchParams.get("pending") === "1";
  const cols = `id,business_name,contact_name,email,status,pricing_unlocked,email_verified_at,stripe_customer_id,created_at,
    EXISTS(SELECT 1 FROM approval_tokens t WHERE t.member_id = members.id AND t.action = 'set_password' AND t.used_at IS NULL AND t.expires_at > ?) AS invite_pending`;
  const sql = pendingOnly ? `SELECT ${cols} FROM members WHERE pricing_unlocked = 0 ORDER BY created_at DESC` : `SELECT ${cols} FROM members ORDER BY created_at DESC`;
  const { results } = await env.CLIENTS.prepare(sql).bind(now2()).all();
  return json3({ members: results.map((m) => ({ id: m.id, businessName: m.business_name, contactName: m.contact_name, email: m.email, status: m.status, pricingUnlocked: !!m.pricing_unlocked, emailVerified: !!m.email_verified_at, stripeLinked: !!m.stripe_customer_id, invitePending: !!m.invite_pending, createdAt: m.created_at })) });
}
__name(adminListMembers, "adminListMembers");
async function adminSetVerified(env, memberId, verified) {
  const r = await env.CLIENTS.prepare("UPDATE members SET email_verified_at = ?, updated_at = ? WHERE id = ?").bind(verified ? now2() : null, now2(), memberId).run();
  return r.meta.changes ? json3({ ok: true }) : json3({ error: "Member not found." }, 404);
}
__name(adminSetVerified, "adminSetVerified");
var SETUP_LINK_DAYS = 14;
async function issueSetupLink(env, memberId) {
  const token2 = uid().replaceAll("-", "") + uid().replaceAll("-", "");
  const ts = now2();
  await env.CLIENTS.batch([
    env.CLIENTS.prepare("UPDATE approval_tokens SET used_at = ? WHERE member_id = ? AND action = 'set_password' AND used_at IS NULL").bind(ts, memberId),
    env.CLIENTS.prepare("INSERT INTO approval_tokens(token,member_id,action,expires_at,created_at) VALUES(?,?,'set_password',?,?)").bind(await sha256Hex(token2), memberId, addDays(SETUP_LINK_DAYS), ts)
  ]);
  return `${SITE}/portal/?setup=${token2}`;
}
__name(issueSetupLink, "issueSetupLink");
async function findStripeCustomerId(env, email) {
  try {
    const quoted = email.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const found = await stripe(env, "customers/search", [["query", `email:'${quoted}'`], ["limit", "1"]], "GET");
    return found.data[0] ? { id: found.data[0].id, name: found.data[0].name } : null;
  } catch {
    return null;
  }
}
__name(findStripeCustomerId, "findStripeCustomerId");
async function adminCreateMember(req, env) {
  const b = await req.json().catch(() => ({}));
  const businessName = clean(b.businessName, 160);
  const contactName = clean(b.contactName, 160);
  const email = clean(b.email, 320).toLowerCase();
  if (!businessName || !contactName || !isEmail(email)) return json3({ error: "Enter the business name, contact name, and a valid email." }, 400);
  if (await env.CLIENTS.prepare("SELECT id FROM members WHERE email = ?").bind(email).first()) {
    return json3({ error: "That email already has a portal account \u2014 use its Setup Link button in the list below." }, 409);
  }
  const id = "mem_" + uid();
  const salt = uid();
  const ts = now2();
  const customer = await findStripeCustomerId(env, email);
  await env.CLIENTS.prepare("INSERT INTO members(id,business_name,contact_name,email,password_hash,password_salt,role,status,pricing_unlocked,pricing_unlocked_at,email_verified_at,stripe_customer_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id, businessName, contactName, email, await hashPassword(uid() + uid(), salt), salt, "member", "active", 1, ts, ts, customer?.id || null, ts, ts).run();
  return json3({ ok: true, memberId: id, stripeCustomer: customer?.name || (customer ? customer.id : null), setupUrl: await issueSetupLink(env, id) });
}
__name(adminCreateMember, "adminCreateMember");
async function adminSetupLink(env, memberId) {
  const m = await env.CLIENTS.prepare("SELECT id, business_name FROM members WHERE id = ?").bind(memberId).first();
  if (!m) return json3({ error: "Member not found." }, 404);
  return json3({ ok: true, businessName: m.business_name, setupUrl: await issueSetupLink(env, m.id) });
}
__name(adminSetupLink, "adminSetupLink");
async function liveSetupToken(env, token2) {
  if (!token2 || token2.length > 100) return null;
  const row = await env.CLIENTS.prepare(
    `SELECT t.token, t.member_id, t.expires_at, m.email, m.business_name, m.contact_name
     FROM approval_tokens t JOIN members m ON m.id = t.member_id
     WHERE t.token = ? AND t.action = 'set_password' AND t.used_at IS NULL`
  ).bind(await sha256Hex(token2)).first();
  return row && new Date(row.expires_at).getTime() > Date.now() ? row : null;
}
__name(liveSetupToken, "liveSetupToken");
var deadSetupLink = /* @__PURE__ */ __name(() => json3({ error: "This link has expired or was already used. Ask Trenches Group for a new one." }, 404), "deadSetupLink");
async function setupLinkInfo(env, token2) {
  const r = await liveSetupToken(env, token2);
  return r ? json3({ email: r.email, businessName: r.business_name, contactName: r.contact_name }) : deadSetupLink();
}
__name(setupLinkInfo, "setupLinkInfo");
async function completeSetup(req, env) {
  const b = await req.json().catch(() => ({}));
  const r = await liveSetupToken(env, clean(b.token, 100));
  if (!r) return deadSetupLink();
  const password = typeof b.password === "string" ? b.password : "";
  if (password.length < 8) return json3({ error: "Password must be at least 8 characters." }, 400);
  const ts = now2();
  const claim = await env.CLIENTS.prepare("UPDATE approval_tokens SET used_at = ? WHERE token = ? AND used_at IS NULL").bind(ts, r.token).run();
  if (!claim.meta.changes) return deadSetupLink();
  const salt = uid();
  await env.CLIENTS.prepare("UPDATE members SET password_hash = ?, password_salt = ?, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?").bind(await hashPassword(password, salt), salt, ts, ts, r.member_id).run();
  const session = uid();
  await env.CLIENTS.prepare("INSERT INTO member_sessions(token,member_id,expires_at,created_at) VALUES(?,?,?,?)").bind(session, r.member_id, addDays(SESSION_DAYS), ts).run();
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store", "set-cookie": setSessionCookie(session) } });
}
__name(completeSetup, "completeSetup");
async function adminSetPricing(req, env, memberId, unlocked) {
  const member = await env.CLIENTS.prepare("SELECT id FROM members WHERE id = ?").bind(memberId).first();
  if (!member) return json3({ error: "Member not found." }, 404);
  await env.CLIENTS.prepare("UPDATE members SET pricing_unlocked = ?, pricing_unlocked_at = ?, updated_at = ? WHERE id = ?").bind(unlocked ? 1 : 0, unlocked ? now2() : null, now2(), memberId).run();
  return json3({ ok: true });
}
__name(adminSetPricing, "adminSetPricing");
var changeRequestOut = /* @__PURE__ */ __name((r) => ({
  id: r.id,
  title: r.title,
  description: r.description,
  status: r.status,
  requestedAt: r.requested_at,
  actionizedAt: r.actionized_at,
  adminNotes: r.admin_notes
}), "changeRequestOut");
async function listMyChangeRequests(req, env) {
  const member = await currentMember(req, env);
  if (!member) return json3({ error: "Not logged in." }, 401);
  const { results } = await env.CLIENTS.prepare("SELECT * FROM change_requests WHERE member_id = ? ORDER BY requested_at DESC").bind(member.id).all();
  return json3({ items: results.map(changeRequestOut) });
}
__name(listMyChangeRequests, "listMyChangeRequests");
async function createChangeRequest(req, env) {
  const member = await currentMember(req, env);
  if (!member) return json3({ error: "Not logged in." }, 401);
  if (member.impersonatedBy) return lookOnly();
  const b = await req.json().catch(() => ({}));
  const title = clean(b.title, 200);
  const description = clean(b.description, 4e3);
  if (!title) return json3({ error: "Enter a title for your request." }, 400);
  const id = "chg_" + uid();
  await env.CLIENTS.prepare("INSERT INTO change_requests(id,member_id,title,description,status,requested_at) VALUES(?,?,?,?,?,?)").bind(id, member.id, title, description, "requested", now2()).run();
  try {
    await sendMail(env, {
      to: env.PORTAL_ADMIN_EMAIL,
      subject: `New change request: ${member.business_name}`,
      text: `${member.business_name} submitted a change request: "${title}"

${description || ""}

View in the admin panel: ${SITE}/portal/admin.html`,
      bodyHtml: `<p><strong>${member.business_name}</strong> submitted a change request: "${title}"</p><p>${description || ""}</p><p><a href="${SITE}/portal/admin.html">Open the admin panel</a></p>`
    });
  } catch (e) {
  }
  return json3({ ok: true, id });
}
__name(createChangeRequest, "createChangeRequest");
async function adminListChangeRequests(env) {
  const { results } = await env.CLIENTS.prepare(
    "SELECT cr.*, m.business_name FROM change_requests cr JOIN members m ON m.id = cr.member_id ORDER BY cr.requested_at DESC"
  ).all();
  return json3({ items: results.map((r) => ({ ...changeRequestOut(r), businessName: r.business_name })) });
}
__name(adminListChangeRequests, "adminListChangeRequests");
async function adminUpdateChangeRequest(req, env, id) {
  const b = await req.json().catch(() => ({}));
  const existing = await env.CLIENTS.prepare("SELECT * FROM change_requests WHERE id = ?").bind(id).first();
  if (!existing) return json3({ error: "Not found." }, 404);
  const status = b.status !== void 0 ? clean(b.status, 40) || existing.status : existing.status;
  const adminNotes = b.adminNotes !== void 0 ? clean(b.adminNotes, 4e3) : existing.admin_notes;
  const actionizedAt = status === "actionized" && !existing.actionized_at ? now2() : existing.actionized_at;
  await env.CLIENTS.prepare("UPDATE change_requests SET status=?,admin_notes=?,actionized_at=? WHERE id=?").bind(status, adminNotes, actionizedAt, id).run();
  return json3({ ok: true });
}
__name(adminUpdateChangeRequest, "adminUpdateChangeRequest");
async function adminListCatalog(env, table) {
  const { results } = await env.CLIENTS.prepare(`SELECT id,name,description,price_cents,is_active,is_custom_quote FROM ${table} ORDER BY name`).all();
  return json3({ items: results.map((r) => ({ id: r.id, name: r.name, description: r.description, priceCents: r.price_cents, isActive: !!r.is_active, customQuote: !!r.is_custom_quote })) });
}
__name(adminListCatalog, "adminListCatalog");
async function adminCreateCatalogItem(req, env, table) {
  const b = await req.json().catch(() => ({}));
  const name = clean(b.name, 160);
  const description = clean(b.description, 2e3);
  const customQuote = b.customQuote ? 1 : 0;
  if (!name) return json3({ error: "Name is required." }, 400);
  const id = table.slice(0, 3) + "_" + uid();
  await env.CLIENTS.prepare(`INSERT INTO ${table}(id,name,description,price_cents,is_active,is_custom_quote${table === "services" ? ",created_at" : ""}) VALUES(?,?,?,?,1,?${table === "services" ? ",?" : ""})`).bind(...table === "services" ? [id, name, description, toCents(b.price), customQuote, now2()] : [id, name, description, toCents(b.price), customQuote]).run();
  return json3({ ok: true, id });
}
__name(adminCreateCatalogItem, "adminCreateCatalogItem");
async function adminUpdateCatalogItem(req, env, table, id) {
  const b = await req.json().catch(() => ({}));
  const existing = await env.CLIENTS.prepare(`SELECT * FROM ${table} WHERE id = ?`).bind(id).first();
  if (!existing) return json3({ error: "Not found." }, 404);
  const name = b.name !== void 0 ? clean(b.name, 160) || existing.name : existing.name;
  const description = b.description !== void 0 ? clean(b.description, 2e3) : existing.description;
  const priceCents = b.price !== void 0 ? toCents(b.price) : existing.price_cents;
  const isActive = b.isActive !== void 0 ? b.isActive ? 1 : 0 : existing.is_active;
  const customQuote = b.customQuote !== void 0 ? b.customQuote ? 1 : 0 : existing.is_custom_quote;
  await env.CLIENTS.prepare(`UPDATE ${table} SET name=?,description=?,price_cents=?,is_active=?,is_custom_quote=? WHERE id=?`).bind(name, description, priceCents, isActive, customQuote, id).run();
  return json3({ ok: true });
}
__name(adminUpdateCatalogItem, "adminUpdateCatalogItem");
var PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
var isBlank = /* @__PURE__ */ __name((x) => String(x ?? "").trim() === "", "isBlank");
var toInt = /* @__PURE__ */ __name((x) => {
  const n = Number(String(x ?? "").replace(/[,\s]/g, ""));
  return isBlank(x) || !Number.isFinite(n) ? null : Math.max(0, Math.round(n));
}, "toInt");
var toPct = /* @__PURE__ */ __name((x) => {
  const n = Number(String(x ?? "").replace(/[%\s]/g, ""));
  return isBlank(x) || !Number.isFinite(n) ? null : Math.min(100, Math.max(0, Math.round(n * 10) / 10));
}, "toPct");
function toSeconds(x) {
  const s = String(x ?? "").trim().toLowerCase();
  if (!s) return null;
  const colon = s.match(/^(\d+):(\d{1,2})$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  const m = s.match(/(\d+)\s*m/), sec = s.match(/(\d+)\s*s/);
  if (m || sec) return (m ? Number(m[1]) * 60 : 0) + (sec ? Number(sec[1]) : 0);
  return toInt(s);
}
__name(toSeconds, "toSeconds");
function toTopList(x) {
  return String(x ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 10).map((line) => {
    const m = line.match(/^(.*?)(?:\s*[,|\t—–:]\s*|\s+-\s+|\s+)([\d,]+)$/);
    const label = m ? m[1].replace(/[\s,|:;—–\-�]+$/, "") : "";
    return label ? { label: label.slice(0, 200), value: toInt(m[2]) } : { label: line.slice(0, 200), value: null };
  });
}
__name(toTopList, "toTopList");
var parseList = /* @__PURE__ */ __name((s) => {
  try {
    const v = JSON.parse(s || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}, "parseList");
var analyticsOut = /* @__PURE__ */ __name((r) => ({
  id: r.id,
  period: r.period,
  visitors: r.visitors,
  sessions: r.sessions,
  pageviews: r.pageviews,
  avgEngagementSec: r.avg_engagement_sec,
  leads: r.leads,
  scrollDepthPct: r.scroll_depth_pct,
  rageClickPct: r.rage_click_pct,
  deadClickPct: r.dead_click_pct,
  quickBackPct: r.quick_back_pct,
  topPages: parseList(r.top_pages_json),
  topSources: parseList(r.top_sources_json),
  notes: r.notes,
  updatedAt: r.updated_at
}), "analyticsOut");
async function listMyAnalytics(req, env) {
  const member = await currentMember(req, env);
  if (!member) return json3({ error: "Not logged in." }, 401);
  const { results } = await env.CLIENTS.prepare("SELECT * FROM analytics_reports WHERE member_id = ? ORDER BY period DESC LIMIT 24").bind(member.id).all();
  return json3({ reports: results.reverse().map(analyticsOut) });
}
__name(listMyAnalytics, "listMyAnalytics");
async function adminListAnalytics(env, memberId) {
  const { results } = await env.CLIENTS.prepare("SELECT * FROM analytics_reports WHERE member_id = ? ORDER BY period DESC").bind(memberId).all();
  return json3({ reports: results.map(analyticsOut) });
}
__name(adminListAnalytics, "adminListAnalytics");
async function adminSaveAnalytics(req, env) {
  const b = await req.json().catch(() => ({}));
  const memberId = clean(b.memberId, 100);
  const period = clean(b.period, 7);
  if (!PERIOD_RE.test(period)) return json3({ error: "Pick the month this report covers." }, 400);
  const member = await env.CLIENTS.prepare("SELECT id FROM members WHERE id = ?").bind(memberId).first();
  if (!member) return json3({ error: "Pick a member." }, 404);
  const ts = now2();
  await env.CLIENTS.prepare(
    `INSERT INTO analytics_reports(id,member_id,period,visitors,sessions,pageviews,avg_engagement_sec,leads,scroll_depth_pct,rage_click_pct,dead_click_pct,quick_back_pct,top_pages_json,top_sources_json,notes,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(member_id,period) DO UPDATE SET visitors=excluded.visitors,sessions=excluded.sessions,pageviews=excluded.pageviews,
       avg_engagement_sec=excluded.avg_engagement_sec,leads=excluded.leads,scroll_depth_pct=excluded.scroll_depth_pct,
       rage_click_pct=excluded.rage_click_pct,dead_click_pct=excluded.dead_click_pct,quick_back_pct=excluded.quick_back_pct,
       top_pages_json=excluded.top_pages_json,top_sources_json=excluded.top_sources_json,notes=excluded.notes,updated_at=excluded.updated_at`
  ).bind(
    "ar_" + uid(),
    memberId,
    period,
    toInt(b.visitors),
    toInt(b.sessions),
    toInt(b.pageviews),
    toSeconds(b.avgEngagement),
    toInt(b.leads),
    toPct(b.scrollDepthPct),
    toPct(b.rageClickPct),
    toPct(b.deadClickPct),
    toPct(b.quickBackPct),
    JSON.stringify(toTopList(b.topPages)),
    JSON.stringify(toTopList(b.topSources)),
    clean(b.notes, 4e3),
    ts,
    ts
  ).run();
  return json3({ ok: true });
}
__name(adminSaveAnalytics, "adminSaveAnalytics");
async function adminDeleteAnalytics(env, id) {
  await env.CLIENTS.prepare("DELETE FROM analytics_reports WHERE id = ?").bind(id).run();
  return json3({ ok: true });
}
__name(adminDeleteAnalytics, "adminDeleteAnalytics");
async function portal(req, env, url) {
  const path = url.pathname;
  const parts = path.split("/").filter(Boolean);
  if (req.method === "POST" && path === "/api/portal/signup") return signup(req, env);
  if (req.method === "POST" && path === "/api/portal/login") return login(req, env);
  if (req.method === "POST" && path === "/api/portal/logout") return logout(req, env);
  if (req.method === "GET" && path === "/api/portal/me") return me(req, env);
  if (req.method === "GET" && path === "/api/portal/services") return catalogFor(req, env, "services");
  if (req.method === "GET" && path === "/api/portal/addons") return catalogFor(req, env, "addons");
  if (req.method === "POST" && parts[2] === "addons" && parts[4] === "subscribe") return subscribeToAddon(req, env, parts[3]);
  if (req.method === "POST" && parts[2] === "addons" && parts[4] === "cancel") return cancelAddonSubscription(req, env, parts[3]);
  if (req.method === "POST" && path === "/api/portal/stripe-webhook") return stripeWebhook(req, env);
  if (req.method === "GET" && path === "/api/portal/change-requests") return listMyChangeRequests(req, env);
  if (req.method === "POST" && path === "/api/portal/change-requests") return createChangeRequest(req, env);
  if (req.method === "GET" && path === "/api/portal/analytics") return listMyAnalytics(req, env);
  if (req.method === "GET" && path === "/api/portal/account") return myAccount(req, env);
  if (req.method === "GET" && parts[2] === "setup" && parts.length === 4) return setupLinkInfo(env, parts[3]);
  if (req.method === "POST" && path === "/api/portal/setup") return completeSetup(req, env);
  if (parts[2] === "admin-auth") {
    if (req.method !== "GET" && !sameOrigin(req, url)) return json3({ error: "Bad origin." }, 403);
    if (req.method === "GET" && path === "/api/portal/admin-auth/status") return adminAuthStatus(req, env);
    if (req.method === "POST" && path === "/api/portal/admin-auth/setup") return adminSetup(req, env);
    if (req.method === "POST" && path === "/api/portal/admin-auth/setup/confirm") return adminSetupConfirm(req, env);
    if (req.method === "POST" && path === "/api/portal/admin-auth/login") return adminLogin(req, env);
    if (req.method === "POST" && path === "/api/portal/admin-auth/logout") return adminLogout(req, env);
    return json3({ error: "Not found." }, 404);
  }
  if (parts[2] === "admin") {
    const session = await adminSession(req, env);
    if (!session) return adminDenied();
    if (req.method !== "GET" && !sameOrigin(req, url)) return json3({ error: "Bad origin." }, 403);
    const rest = parts.slice(3);
    if (req.method === "POST" && rest[0] === "impersonate" && rest.length === 1) return adminImpersonate(req, env, session);
    if (req.method === "GET" && rest[0] === "members" && rest.length === 1) return adminListMembers(req, env, url);
    if (req.method === "POST" && rest[0] === "members" && rest.length === 1) return adminCreateMember(req, env);
    if (req.method === "POST" && rest[0] === "members" && rest[2] === "setup-link") return adminSetupLink(env, rest[1]);
    if (req.method === "POST" && rest[0] === "members" && rest[2] === "verify") {
      const b = await req.json().catch(() => ({}));
      return adminSetVerified(env, rest[1], b.verified !== false);
    }
    if (req.method === "POST" && rest[0] === "members" && rest[2] === "pricing") {
      const b = await req.json().catch(() => ({}));
      return adminSetPricing(req, env, rest[1], b.unlocked !== false);
    }
    if (req.method === "POST" && rest[0] === "stripe-setup") return adminStripeSetup(env);
    if (req.method === "GET" && rest[0] === "change-requests" && rest.length === 1) return adminListChangeRequests(env);
    if (req.method === "POST" && rest[0] === "change-requests" && rest.length === 2) return adminUpdateChangeRequest(req, env, rest[1]);
    if (rest[0] === "analytics") {
      if (req.method === "GET" && rest.length === 1) return adminListAnalytics(env, url.searchParams.get("member") || "");
      if (req.method === "POST" && rest.length === 1) return adminSaveAnalytics(req, env);
      if (req.method === "DELETE" && rest.length === 2) return adminDeleteAnalytics(env, rest[1]);
    }
    if ((rest[0] === "services" || rest[0] === "addons") && rest.length === 1) {
      if (req.method === "GET") return adminListCatalog(env, rest[0]);
      if (req.method === "POST") return adminCreateCatalogItem(req, env, rest[0]);
    }
    if ((rest[0] === "services" || rest[0] === "addons") && rest.length === 2 && req.method === "POST") {
      return adminUpdateCatalogItem(req, env, rest[0], rest[1]);
    }
    return json3({ error: "Not found." }, 404);
  }
  return json3({ error: "Not found." }, 404);
}
__name(portal, "portal");

// src/proposals.js
var PROPOSAL_ACCESS = {
  "pretty-medium": ["ambernorwood@yahoo.com"]
};
var PRIVATE_HEADERS = { "x-robots-tag": "noindex, nofollow, noarchive", "cache-control": "private, no-store" };
function notice(status, title, body) {
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title} | Trenches Group</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@600;700&family=Montserrat:wght@400;500&display=swap" rel="stylesheet">
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#1B1F23;font-family:'Montserrat',sans-serif;color:#E6E8EA;padding:24px;box-sizing:border-box}
.card{max-width:440px;background:#22272C;border-top:3px solid #C65C2E;padding:32px 28px;text-align:center}
h1{font-family:'Oswald',sans-serif;font-size:1.4rem;margin:0 0 10px;color:#fff}p{color:#AEB5BC;line-height:1.6;font-size:.92rem;margin:0 0 22px}
a{display:inline-block;background:#C65C2E;color:#fff;text-decoration:none;font-family:'Oswald',sans-serif;font-weight:700;font-size:.78rem;letter-spacing:.08em;text-transform:uppercase;padding:12px 20px;border-radius:3px}</style></head>
<body><div class="card"><h1>${title}</h1><p>${body}</p><a href="/portal/dashboard.html">Go to my portal</a></div></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", ...PRIVATE_HEADERS } });
}
__name(notice, "notice");
async function proposalPage(req, env, url) {
  const m = url.pathname.match(/^\/portal\/proposals\/([a-z0-9-]+)\/?(?:index\.html)?$/);
  const slug = m?.[1];
  if (!slug || !PROPOSAL_ACCESS[slug]) return notice(404, "Page not found", "We couldn't find that page.");
  const canonical = `/portal/proposals/${slug}/`;
  const admin = await adminSession(req, env);
  const member = await currentMember(req, env);
  if (!admin && !member) return new Response(null, { status: 302, headers: { location: "/portal/?next=" + encodeURIComponent(canonical), ...PRIVATE_HEADERS } });
  if (!admin) {
    const onList = PROPOSAL_ACCESS[slug].includes((member.email || "").toLowerCase());
    if (!onList) return notice(403, "This page isn't on your account", "This proposal was prepared for a different client. If you think that's a mistake, contact Trenches Group.");
    if (!member.email_verified_at) return notice(403, "Confirm your email first", "Open the estimate link Trenches Group emailed you while logged in to confirm this email address, then come back to this page.");
  }
  if (url.pathname !== canonical) return new Response(null, { status: 302, headers: { location: canonical + url.search, ...PRIVATE_HEADERS } });
  const asset = await env.ASSETS.fetch(new Request(new URL(canonical, url), { headers: req.headers }));
  const res = new Response(asset.body, asset);
  for (const [k, v] of Object.entries(PRIVATE_HEADERS)) res.headers.set(k, v);
  return res;
}
__name(proposalPage, "proposalPage");

// src/worker.js
var R2_PUBLIC_URL = "https://pub-c3f61584f4554fd699fb3d5dea486710.r2.dev";
var SITE2 = "https://trenchesgroup.com";
var SETUP_FEE_CENTS = 45e3;
var SOCIAL_PLANS = { core: { name: "Core Presence", monthlyCents: 59900, onboardingCents: 5e4 }, growth: { name: "Growth Engine", monthlyCents: 99900, onboardingCents: 75e3 }, local: { name: "Local Authority", monthlyCents: 159900, onboardingCents: 1e5 } };
var OUTREACH_PLANS = { starter: { name: "Starter Response", monthlyCents: 49700, onboardingCents: 5e4 }, full: { name: "Full Follow-Up", monthlyCents: 89700, onboardingCents: 75e3 }, priority: { name: "Priority Pipeline", monthlyCents: 149700, onboardingCents: 1e5 } };
var FEE_RATES = { card: 0.0375, ach: 0.015 };
var FEE_LABELS = { card: "Card processing fee (3.75%)", ach: "ACH processing fee (1.5%)" };
var FEE_PM_TYPES = { card: "card", ach: "us_bank_account" };
var paymentMethodOf = /* @__PURE__ */ __name((b) => ["card", "ach"].includes(b.paymentMethod) ? b.paymentMethod : "card", "paymentMethodOf");
var feeCents = /* @__PURE__ */ __name((amountCents, pm) => Math.round(amountCents * FEE_RATES[pm]), "feeCents");
var json4 = /* @__PURE__ */ __name((x, s = 200) => new Response(JSON.stringify(x), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store" } }), "json");
var clean2 = /* @__PURE__ */ __name((x, n = 300) => typeof x === "string" ? x.trim().slice(0, n) : "", "clean");
var now3 = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "now");
var token = /* @__PURE__ */ __name(() => crypto.randomUUID().replaceAll("-", ""), "token");
var options = /* @__PURE__ */ __name((b) => ({ domainHosting: b.domainHosting === true, carePlan: b.carePlan === true, emailSeats: Math.max(0, Math.min(25, Math.floor(Number(b.emailSeats) || 0))) }), "options");
async function stripe2(env, path, params) {
  if (!env.STRIPE_SECRET_KEY) throw Error("Stripe is not configured yet.");
  const r = await fetch("https://api.stripe.com/v1/" + path, { method: "POST", headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY, "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(params) }), j = await r.json();
  if (!r.ok) throw Error(j?.error?.message || "Stripe request failed.");
  return j;
}
__name(stripe2, "stripe");
async function verify(req, env, raw) {
  const h = req.headers.get("stripe-signature") || "", t = h.match(/(?:^|,)t=(\d+)/)?.[1], s = h.match(/(?:^|,)v1=([a-f0-9]+)/)?.[1];
  if (!t || !s || !env.STRIPE_WEBHOOK_SECRET) return false;
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), a = new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(t + "." + raw))), e = [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
  return e.length === s.length && [...e].every((c, i) => c === s[i]);
}
__name(verify, "verify");
async function proposal(req, env, url) {
  const bits = url.pathname.split("/").filter(Boolean), pt = bits[2];
  if (req.method === "POST" && url.pathname === "/api/proposals") {
    const b = await req.json(), business = clean2(b.businessName, 160), contact = clean2(b.contactName, 160), email = clean2(b.email, 320).toLowerCase(), pm = paymentMethodOf(b);
    if (!business || !contact || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || b.acceptTerms !== true) return json4({ error: "Enter business, contact, email, and accept the proposal terms." }, 400);
    const p2 = { id: "pr_" + token(), token: token(), business_name: business, contact_name: contact, email, options_json: JSON.stringify(options(b)) };
    await env.CLIENTS.prepare("INSERT INTO client_proposals(id,token,business_name,contact_name,email,options_json,payment_method,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'DRAFT',?,?)").bind(p2.id, p2.token, p2.business_name, p2.contact_name, p2.email, p2.options_json, pm, now3(), now3()).run();
    try {
      const o = JSON.parse(p2.options_json), subtotal = 25e3 + (o.domainHosting ? 9900 : 0), fee = feeCents(subtotal, pm), q = { mode: "payment", "managed_payments[enabled]": "false", "payment_method_types[0]": FEE_PM_TYPES[pm], success_url: SITE2 + "/proposal/success/?token=" + p2.token + "&session_id={CHECKOUT_SESSION_ID}", cancel_url: SITE2 + "/proposal/?token=" + p2.token, customer_email: p2.email, "line_items[0][price_data][currency]": "usd", "line_items[0][price_data][product_data][name]": "Website build deposit", "line_items[0][price_data][unit_amount]": "25000", "line_items[0][quantity]": "1", "metadata[proposal_token]": p2.token, "metadata[payment_stage]": "deposit" };
      let i = 1;
      if (o.domainHosting) {
        q["line_items[" + i + "][price_data][currency]"] = "usd";
        q["line_items[" + i + "][price_data][product_data][name]"] = "Domain and hosting setup";
        q["line_items[" + i + "][price_data][unit_amount]"] = "9900";
        q["line_items[" + i + "][quantity]"] = "1";
        i++;
      }
      if (fee > 0) {
        q["line_items[" + i + "][price_data][currency]"] = "usd";
        q["line_items[" + i + "][price_data][product_data][name]"] = FEE_LABELS[pm];
        q["line_items[" + i + "][price_data][unit_amount]"] = String(fee);
        q["line_items[" + i + "][quantity]"] = "1";
      }
      const s = await stripe2(env, "checkout/sessions", q);
      await env.CLIENTS.prepare("UPDATE client_proposals SET status='DEPOSIT_PENDING',deposit_session_id=?,updated_at=? WHERE id=?").bind(s.id, now3(), p2.id).run();
      return json4({ checkoutUrl: s.url });
    } catch (e) {
      return json4({ error: e.message || "Unable to start payment." }, 503);
    }
  }
  if (!pt) return json4({ error: "Not found." }, 404);
  const p = await env.CLIENTS.prepare("SELECT * FROM client_proposals WHERE token=?").bind(pt).first();
  if (!p) return json4({ error: "Proposal not found." }, 404);
  if (req.method === "GET") return json4({ businessName: p.business_name, contactName: p.contact_name, status: p.status, options: JSON.parse(p.options_json), paymentMethod: p.payment_method });
  return json4({ error: "Not found." }, 404);
}
__name(proposal, "proposal");
var COMMITMENT_MONTHS = 6;
var MIN_AD_FEE_CENTS = 35e3;
var AD_FEE_RATE = 0.15;
var MAX_AD_SPEND_CENTS = 5e7;
async function socialOrders(req, env, url) {
  const bits = url.pathname.split("/").filter(Boolean), ot = bits[2];
  if (req.method === "POST" && url.pathname === "/api/social-orders") {
    const b = await req.json(), setup = b.setup === true, planKey = ["core", "growth", "local"].includes(b.plan) ? b.plan : "none";
    if (planKey === "none" && !setup) return json4({ error: "Select account setup, a package, or both." }, 400);
    const plan = planKey !== "none" ? SOCIAL_PLANS[planKey] : null;
    if (plan && b.agreeTerms !== true) return json4({ error: "You must agree to the minimum " + COMMITMENT_MONTHS + "-month commitment to start an ongoing package." }, 400);
    const paidAds = b.paidAds === true;
    if (paidAds && !plan) return json4({ error: "Paid ads management requires an ongoing package." }, 400);
    const adSpendDollars = Number(b.adSpend);
    if (paidAds && (!Number.isFinite(adSpendDollars) || adSpendDollars < 0)) return json4({ error: "Enter a valid monthly ad spend amount." }, 400);
    const adSpendCents = paidAds ? Math.min(Math.round(adSpendDollars * 100), MAX_AD_SPEND_CENTS) : 0, adFeeCents = paidAds ? Math.max(MIN_AD_FEE_CENTS, Math.round(adSpendCents * AD_FEE_RATE)) : 0;
    const pm = paymentMethodOf(b), mode = plan ? "subscription" : "payment", planCents = plan ? plan.monthlyCents : 0, monthlyBaseCents = planCents + adFeeCents, dueTodayCents = plan ? Math.max(plan.onboardingCents - (setup ? SETUP_FEE_CENTS : 0), 0) : SETUP_FEE_CENTS, monthlyFeeCents = plan ? feeCents(monthlyBaseCents, pm) : 0, dueTodayFeeCents = feeCents(dueTodayCents, pm), commitmentMonths = plan ? COMMITMENT_MONTHS : 0, termsAcceptedAt = plan ? now3() : null, o2 = { id: "so_" + token(), token: token(), plan_key: planKey, plan_name: plan ? plan.name : null, setup_included: setup ? 1 : 0, monthly_price_cents: monthlyBaseCents + monthlyFeeCents, due_today_cents: dueTodayCents + dueTodayFeeCents };
    await env.CLIENTS.prepare("INSERT INTO social_orders(id,token,plan_key,plan_name,setup_included,monthly_price_cents,due_today_cents,payment_method,commitment_months,terms_accepted_at,ad_spend_cents,ad_management_fee_cents,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(o2.id, o2.token, o2.plan_key, o2.plan_name, o2.setup_included, o2.monthly_price_cents, o2.due_today_cents, pm, commitmentMonths, termsAcceptedAt, adSpendCents, adFeeCents, "DRAFT", now3(), now3()).run();
    try {
      const q = { mode, "managed_payments[enabled]": "false", "payment_method_types[0]": FEE_PM_TYPES[pm], success_url: SITE2 + "/social-media/success/?token=" + o2.token + "&session_id={CHECKOUT_SESSION_ID}", cancel_url: SITE2 + "/social-media/?cancelled=1", "metadata[order_token]": o2.token, "metadata[payment_stage]": "social_order" };
      const item = /* @__PURE__ */ __name((i2, name, cents, recurring) => {
        q["line_items[" + i2 + "][price_data][currency]"] = "usd";
        q["line_items[" + i2 + "][price_data][product_data][name]"] = name;
        q["line_items[" + i2 + "][price_data][unit_amount]"] = String(cents);
        q["line_items[" + i2 + "][quantity]"] = "1";
        if (recurring) q["line_items[" + i2 + "][price_data][recurring][interval]"] = "month";
      }, "item");
      let i = 0;
      if (mode === "subscription") {
        item(i++, plan.name + " \u2014 Ongoing Social Media Management", planCents, true);
        if (adFeeCents > 0) item(i++, "Paid Ads Management Fee (client funds ad spend separately)", adFeeCents, true);
        if (monthlyFeeCents > 0) item(i++, FEE_LABELS[pm] + " (monthly)", monthlyFeeCents, true);
        if (dueTodayCents > 0) item(i++, setup ? "Account Setup + Onboarding" : "Onboarding Fee", dueTodayCents, false);
        if (dueTodayFeeCents > 0) item(i++, FEE_LABELS[pm], dueTodayFeeCents, false);
      } else {
        item(i++, "Social Media Account Setup", dueTodayCents, false);
        if (dueTodayFeeCents > 0) item(i++, FEE_LABELS[pm], dueTodayFeeCents, false);
      }
      const s = await stripe2(env, "checkout/sessions", q);
      await env.CLIENTS.prepare("UPDATE social_orders SET status='CHECKOUT_PENDING',checkout_session_id=?,updated_at=? WHERE id=?").bind(s.id, now3(), o2.id).run();
      return json4({ checkoutUrl: s.url });
    } catch (e) {
      return json4({ error: e.message || "Unable to start payment." }, 503);
    }
  }
  if (!ot) return json4({ error: "Not found." }, 404);
  const o = await env.CLIENTS.prepare("SELECT * FROM social_orders WHERE token=?").bind(ot).first();
  if (!o) return json4({ error: "Order not found." }, 404);
  if (req.method === "GET") return json4({ token: o.token, planName: o.plan_name, setupIncluded: !!o.setup_included, monthlyPriceCents: o.monthly_price_cents, dueTodayCents: o.due_today_cents, paymentMethod: o.payment_method, commitmentMonths: o.commitment_months, adSpendCents: o.ad_spend_cents, adManagementFeeCents: o.ad_management_fee_cents, status: o.status });
  return json4({ error: "Not found." }, 404);
}
__name(socialOrders, "socialOrders");
async function socialIntake(req, env, url) {
  const ot = url.pathname.split("/").filter(Boolean)[2];
  if (!ot) return json4({ error: "Not found." }, 404);
  const o = await env.CLIENTS.prepare("SELECT id,status,plan_name FROM social_orders WHERE token=?").bind(ot).first();
  if (!o) return json4({ error: "Not found." }, 404);
  if (req.method === "GET") return json4({ status: o.status, planName: o.plan_name });
  if (req.method !== "POST" || !["PAID", "INTAKE_SUBMITTED"].includes(o.status)) return json4({ error: "Intake unlocks after payment is received." }, 409);
  const b = await req.json(), d = { businessName: clean2(b.businessName, 160), contactName: clean2(b.contactName, 160), email: clean2(b.email, 320).toLowerCase(), phone: clean2(b.phone, 40), businessAddress: clean2(b.businessAddress, 300), website: clean2(b.website, 300), services: clean2(b.services, 1800), serviceArea: clean2(b.serviceArea, 500), existingHandles: clean2(b.existingHandles, 1e3), brandNotes: clean2(b.brandNotes, 1500), accessNotes: clean2(b.accessNotes, 1500), goals: clean2(b.goals, 1500), logoUrl: clean2(b.logoUrl, 500), notes: clean2(b.notes, 3e3) };
  if (!d.businessName || !d.contactName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return json4({ error: "Enter business name, contact name, and a valid email." }, 400);
  await env.CLIENTS.prepare("INSERT INTO social_intake(order_id,details_json,submitted_at,updated_at) VALUES(?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET details_json=excluded.details_json,updated_at=excluded.updated_at").bind(o.id, JSON.stringify(d), now3(), now3()).run();
  await env.CLIENTS.prepare("UPDATE social_orders SET status='INTAKE_SUBMITTED',updated_at=? WHERE id=?").bind(now3(), o.id).run();
  return json4({ ok: true });
}
__name(socialIntake, "socialIntake");
async function outreachOrders(req, env, url) {
  const bits = url.pathname.split("/").filter(Boolean), ot = bits[2];
  if (req.method === "POST" && url.pathname === "/api/outreach-orders") {
    const b = await req.json(), planKey = ["starter", "full", "priority"].includes(b.plan) ? b.plan : null;
    if (!planKey) return json4({ error: "Select a plan." }, 400);
    const plan = OUTREACH_PLANS[planKey];
    if (b.agreeTerms !== true) return json4({ error: "You must agree to the minimum " + COMMITMENT_MONTHS + "-month commitment to start." }, 400);
    const pm = paymentMethodOf(b), monthlyFeeCents = feeCents(plan.monthlyCents, pm), dueTodayFeeCents = feeCents(plan.onboardingCents, pm), monthlyPriceCents = plan.monthlyCents + monthlyFeeCents, dueTodayCents = plan.onboardingCents + dueTodayFeeCents, o2 = { id: "oo_" + token(), token: token() };
    await env.CLIENTS.prepare("INSERT INTO outreach_orders(id,token,plan_key,plan_name,monthly_price_cents,due_today_cents,payment_method,commitment_months,terms_accepted_at,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)").bind(o2.id, o2.token, planKey, plan.name, monthlyPriceCents, dueTodayCents, pm, COMMITMENT_MONTHS, now3(), "DRAFT", now3(), now3()).run();
    try {
      const q = { mode: "subscription", "managed_payments[enabled]": "false", "payment_method_types[0]": FEE_PM_TYPES[pm], success_url: SITE2 + "/outreach-agents/success/?token=" + o2.token + "&session_id={CHECKOUT_SESSION_ID}", cancel_url: SITE2 + "/outreach-agents/?cancelled=1", "metadata[order_token]": o2.token, "metadata[payment_stage]": "outreach_order" };
      const item = /* @__PURE__ */ __name((i2, name, cents, recurring) => {
        q["line_items[" + i2 + "][price_data][currency]"] = "usd";
        q["line_items[" + i2 + "][price_data][product_data][name]"] = name;
        q["line_items[" + i2 + "][price_data][unit_amount]"] = String(cents);
        q["line_items[" + i2 + "][quantity]"] = "1";
        if (recurring) q["line_items[" + i2 + "][price_data][recurring][interval]"] = "month";
      }, "item");
      let i = 0;
      item(i++, plan.name + " \u2014 Ongoing Automated Outreach", plan.monthlyCents, true);
      if (monthlyFeeCents > 0) item(i++, FEE_LABELS[pm] + " (monthly)", monthlyFeeCents, true);
      item(i++, "Onboarding & Setup", plan.onboardingCents, false);
      if (dueTodayFeeCents > 0) item(i++, FEE_LABELS[pm], dueTodayFeeCents, false);
      const s = await stripe2(env, "checkout/sessions", q);
      await env.CLIENTS.prepare("UPDATE outreach_orders SET status='CHECKOUT_PENDING',checkout_session_id=?,updated_at=? WHERE id=?").bind(s.id, now3(), o2.id).run();
      return json4({ checkoutUrl: s.url });
    } catch (e) {
      return json4({ error: e.message || "Unable to start payment." }, 503);
    }
  }
  if (!ot) return json4({ error: "Not found." }, 404);
  const o = await env.CLIENTS.prepare("SELECT * FROM outreach_orders WHERE token=?").bind(ot).first();
  if (!o) return json4({ error: "Order not found." }, 404);
  if (req.method === "GET") return json4({ token: o.token, planName: o.plan_name, monthlyPriceCents: o.monthly_price_cents, dueTodayCents: o.due_today_cents, paymentMethod: o.payment_method, commitmentMonths: o.commitment_months, status: o.status });
  return json4({ error: "Not found." }, 404);
}
__name(outreachOrders, "outreachOrders");
async function outreachIntake(req, env, url) {
  const ot = url.pathname.split("/").filter(Boolean)[2];
  if (!ot) return json4({ error: "Not found." }, 404);
  const o = await env.CLIENTS.prepare("SELECT id,status,plan_name FROM outreach_orders WHERE token=?").bind(ot).first();
  if (!o) return json4({ error: "Not found." }, 404);
  if (req.method === "GET") return json4({ status: o.status, planName: o.plan_name });
  if (req.method !== "POST" || !["PAID", "INTAKE_SUBMITTED"].includes(o.status)) return json4({ error: "Intake unlocks after payment is received." }, 409);
  const b = await req.json(), d = { businessName: clean2(b.businessName, 160), contactName: clean2(b.contactName, 160), email: clean2(b.email, 320).toLowerCase(), phone: clean2(b.phone, 40), businessAddress: clean2(b.businessAddress, 300), website: clean2(b.website, 300), services: clean2(b.services, 1800), serviceArea: clean2(b.serviceArea, 500), leadSources: clean2(b.leadSources, 1e3), hours: clean2(b.hours, 300), escalationNotes: clean2(b.escalationNotes, 1500), neverSay: clean2(b.neverSay, 1500), notes: clean2(b.notes, 3e3) };
  if (!d.businessName || !d.contactName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return json4({ error: "Enter business name, contact name, and a valid email." }, 400);
  await env.CLIENTS.prepare("INSERT INTO outreach_intake(order_id,details_json,submitted_at,updated_at) VALUES(?,?,?,?) ON CONFLICT(order_id) DO UPDATE SET details_json=excluded.details_json,updated_at=excluded.updated_at").bind(o.id, JSON.stringify(d), now3(), now3()).run();
  await env.CLIENTS.prepare("UPDATE outreach_orders SET status='INTAKE_SUBMITTED',updated_at=? WHERE id=?").bind(now3(), o.id).run();
  return json4({ ok: true });
}
__name(outreachIntake, "outreachIntake");
async function onboarding(req, env, url) {
  const pt = url.pathname.split("/").filter(Boolean)[2];
  if (!pt) return json4({ error: "Not found." }, 404);
  const p = await env.CLIENTS.prepare("SELECT id,status FROM client_proposals WHERE token=?").bind(pt).first();
  if (!p) return json4({ error: "Not found." }, 404);
  if (req.method === "GET") return json4({ status: p.status });
  if (req.method !== "POST" || !["DEPOSIT_PAID", "ONBOARDING_SUBMITTED"].includes(p.status)) return json4({ error: "Onboarding unlocks after the deposit is paid." }, 409);
  const b = await req.json(), d = { businessPhone: clean2(b.businessPhone, 40), businessAddress: clean2(b.businessAddress, 300), services: clean2(b.services, 1800), serviceArea: clean2(b.serviceArea, 500), domainStatus: clean2(b.domainStatus, 80), domainProvider: clean2(b.domainProvider, 120), accountEmail: clean2(b.accountEmail, 320), notes: clean2(b.notes, 3e3), carePlan: b.carePlan === true, emailSeats: Math.max(0, Math.min(25, Math.floor(Number(b.emailSeats) || 0))) };
  await env.CLIENTS.prepare("INSERT INTO client_onboarding(proposal_id,details_json,submitted_at,updated_at) VALUES(?,?,?,?) ON CONFLICT(proposal_id) DO UPDATE SET details_json=excluded.details_json,updated_at=excluded.updated_at").bind(p.id, JSON.stringify(d), now3(), now3()).run();
  await env.CLIENTS.prepare("UPDATE client_proposals SET status='ONBOARDING_SUBMITTED',updated_at=? WHERE id=?").bind(now3(), p.id).run();
  return json4({ ok: true });
}
__name(onboarding, "onboarding");
async function hook(req, env) {
  const raw = await req.text();
  if (!await verify(req, env, raw)) return json4({ error: "Invalid Stripe signature." }, 400);
  const e = JSON.parse(raw), x = await env.CLIENTS.prepare("SELECT id FROM stripe_webhook_events WHERE id=?").bind(e.id).first();
  if (x) return json4({ received: true });
  await env.CLIENTS.prepare("INSERT INTO stripe_webhook_events(id,event_type,received_at) VALUES(?,?,?)").bind(e.id, e.type, now3()).run();
  if (e.type === "checkout.session.completed" && e.data?.object?.payment_status === "paid" && e.data.object.metadata?.payment_stage === "deposit") await env.CLIENTS.prepare("UPDATE client_proposals SET status='DEPOSIT_PAID',deposit_session_id=?,updated_at=? WHERE token=?").bind(e.data.object.id, now3(), e.data.object.metadata.proposal_token).run();
  if (e.type === "checkout.session.completed" && e.data?.object?.payment_status === "paid" && e.data.object.metadata?.payment_stage === "social_order") await env.CLIENTS.prepare("UPDATE social_orders SET status='PAID',checkout_session_id=?,updated_at=? WHERE token=?").bind(e.data.object.id, now3(), e.data.object.metadata.order_token).run();
  if (e.type === "checkout.session.completed" && e.data?.object?.payment_status === "paid" && e.data.object.metadata?.payment_stage === "outreach_order") await env.CLIENTS.prepare("UPDATE outreach_orders SET status='PAID',checkout_session_id=?,updated_at=? WHERE token=?").bind(e.data.object.id, now3(), e.data.object.metadata.order_token).run();
  return json4({ received: true });
}
__name(hook, "hook");
var worker_default = { async fetch(req, env) {
  const url = new URL(req.url), path = url.pathname;
  if (path.startsWith("/portal/proposals/")) return proposalPage(req, env, url);
  if (req.method === "GET") {
    const open = path.match(/^\/api\/estimates\/open\/([^/]+)\.gif$/);
    if (open) return trackOpen(req, env, decodeURIComponent(open[1]));
    const view = path.match(/^\/api\/estimates\/view\/([^/]+)$/);
    if (view) return viewEstimate(req, env, url, decodeURIComponent(view[1]));
    const invite = path.match(/^\/api\/portal\/invite\/([^/]+)$/);
    if (invite) return inviteInfo(env, decodeURIComponent(invite[1]));
    if (path === "/api/portal/estimates") return listMemberEstimates(req, env);
  }
  if (path.startsWith("/api/portal/")) return portal(req, env, url);
  if (req.method === "POST" && path === "/api/stripe/webhook") return hook(req, env);
  if (path === "/api/proposals" || path.startsWith("/api/proposals/")) return proposal(req, env, url);
  if (path.startsWith("/api/onboarding/")) return onboarding(req, env, url);
  if (path === "/api/social-orders" || path.startsWith("/api/social-orders/")) return socialOrders(req, env, url);
  if (path.startsWith("/api/social-intake/")) return socialIntake(req, env, url);
  if (path === "/api/outreach-orders" || path.startsWith("/api/outreach-orders/")) return outreachOrders(req, env, url);
  if (path.startsWith("/api/outreach-intake/")) return outreachIntake(req, env, url);
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type" } });
  if (req.method === "POST" && path === "/upload") {
    try {
      const f = await req.formData(), file = f.get("file"), id = f.get("id") || "sub-" + Date.now(), name = String(f.get("name") || file?.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_"), key = "uploads/" + id + "/" + name;
      await env.UPLOADS.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
      return json4({ success: true, url: R2_PUBLIC_URL + "/" + key });
    } catch (e) {
      return json4({ success: false, error: e.message }, 500);
    }
  }
  return env.ASSETS.fetch(req);
} };
export {
  worker_default as default
};
