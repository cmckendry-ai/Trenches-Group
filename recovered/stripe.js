var STRIPE_API = "https://api.stripe.com/v1";
function envSecret(env, key) {
  const value = env[key];
  if (!value) throw new HttpError(503, "STRIPE_NOT_CONFIGURED", `${key} is not configured.`);
  return value;
}
__name(envSecret, "envSecret");
async function priceCents(db, key, fallbackCents) {
  const row = await db.prepare("SELECT value FROM system_flags WHERE key=?").bind(key).first();
  const parsed = row ? Number(row.value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallbackCents;
}
__name(priceCents, "priceCents");
async function stripeFetch(env, path, params) {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${envSecret(env, "STRIPE_SECRET_KEY")}`, "content-type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });
  const data = await response.json();
  if (!response.ok) {
    const err = data.error;
    throw new HttpError(502, "STRIPE_REQUEST_FAILED", String(err?.message || "Stripe request failed."));
  }
  return data;
}
__name(stripeFetch, "stripeFetch");
async function tryTransition(db, leadId, to, reason) {
  try {
    await transitionLead(db, leadId, to, "SYSTEM", reason, "STRIPE");
  } catch (error) {
    await bumpCounter(db, "transition_refused_stripe");
    await recordEvent(db, {
      eventId: newId("evt"),
      leadId,
      eventType: "STATE_TRANSITION_REFUSED",
      eventData: { to, reason, message: error instanceof Error ? error.message : String(error) },
      source: "STRIPE",
      actor: "SYSTEM"
    });
  }
}
__name(tryTransition, "tryTransition");
var CHECKOUT_ELIGIBLE_STATES = ["DEMO_SENT", "DEMO_VIEWED", "PRICING_VIEWED", "CHECKOUT_STARTED"];
async function createCheckoutSession(env, slug, leadId, domainAddon) {
  const lead = await getLead(env.DB, leadId);
  if (!lead) throw new HttpError(404, "LEAD_NOT_FOUND", "Lead not found.");
  if (!CHECKOUT_ELIGIBLE_STATES.includes(lead.current_state)) {
    throw new HttpError(409, "CHECKOUT_NOT_AVAILABLE", `Checkout is not available from state ${lead.current_state}.`);
  }
  if (lead.current_state === "DEMO_SENT" || lead.current_state === "DEMO_VIEWED") {
    await tryTransition(env.DB, lead.id, "PRICING_VIEWED", "Prospect reached checkout.");
  }
  const basePriceCents = await priceCents(env.DB, "STRIPE_BASE_PRICE_CENTS", 5e4);
  const domainPriceCents = await priceCents(env.DB, "STRIPE_DOMAIN_PRICE_CENTS", 12500);
  const totalCents = basePriceCents + (domainAddon ? domainPriceCents : 0);
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("managed_payments[enabled]", "false");
  params.set("client_reference_id", lead.id);
  params.set("success_url", `${env.PUBLIC_BASE_URL}/demo/${encodeURIComponent(slug)}/checkout/success`);
  params.set("cancel_url", `${env.PUBLIC_BASE_URL}/demo/${encodeURIComponent(slug)}`);
  if (lead.email) params.set("customer_email", lead.email);
  params.set("metadata[leadId]", lead.id);
  params.set("metadata[businessName]", lead.business_name.slice(0, 480));
  params.set("metadata[domainAddon]", domainAddon ? "true" : "false");
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(basePriceCents));
  params.set("line_items[0][price_data][product_data][name]", `${lead.business_name} \u2014 Website Build`);
  params.set("line_items[0][price_data][product_data][description]", "Full HTML website build. Includes up to 2 rounds of adjustments before launch.");
  if (domainAddon) {
    params.set("line_items[1][quantity]", "1");
    params.set("line_items[1][price_data][currency]", "usd");
    params.set("line_items[1][price_data][unit_amount]", String(domainPriceCents));
    params.set("line_items[1][price_data][product_data][name]", "Domain setup & publishing");
    params.set("line_items[1][price_data][product_data][description]", "One-time domain registration/connection and publishing.");
  }
  const session = await stripeFetch(env, "/checkout/sessions", params);
  const sessionId = String(session.id);
  const url = session.url;
  if (typeof url !== "string") throw new HttpError(502, "STRIPE_SESSION_URL_MISSING", "Stripe did not return a checkout URL.");
  const ts = nowIso();
  await env.DB.prepare(`
    INSERT INTO client_orders (id, lead_id, domain_addon, amount_total_cents, currency, status, stripe_checkout_session_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'usd', 'PENDING', ?, ?, ?)
  `).bind(newId("order"), lead.id, domainAddon ? 1 : 0, totalCents, sessionId, ts, ts).run();
  await recordEvent(env.DB, {
    eventId: newId("evt"),
    leadId: lead.id,
    eventType: "CHECKOUT_SESSION_CREATED",
    eventData: { sessionId, domainAddon, amountCents: totalCents },
    source: "STRIPE",
    actor: "SYSTEM"
  });
  await tryTransition(env.DB, lead.id, "CHECKOUT_STARTED", "Prospect started Stripe checkout.");
  return url;
}
__name(createCheckoutSession, "createCheckoutSession");
function timingSafeEqualHex(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
__name(timingSafeEqualHex, "timingSafeEqualHex");
async function verifyStripeSignature(env, rawBody, signatureHeader) {
  if (!signatureHeader) throw new HttpError(400, "STRIPE_SIGNATURE_MISSING", "Missing Stripe-Signature header.");
  const parts = {};
  for (const piece of signatureHeader.split(",")) {
    const [key2, value] = piece.split("=");
    if (key2 && value) parts[key2] = value;
  }
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) throw new HttpError(400, "STRIPE_SIGNATURE_INVALID", "Malformed Stripe-Signature header.");
  const ageSeconds = Math.abs(Date.now() / 1e3 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) throw new HttpError(400, "STRIPE_SIGNATURE_STALE", "Stripe webhook timestamp is too old.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(envSecret(env, "STRIPE_WEBHOOK_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const expectedHex = Array.from(new Uint8Array(signatureBytes), (b) => b.toString(16).padStart(2, "0")).join("");
  if (!timingSafeEqualHex(expectedHex, v1)) throw new HttpError(400, "STRIPE_SIGNATURE_MISMATCH", "Stripe signature verification failed.");
  return JSON.parse(rawBody);
}
__name(verifyStripeSignature, "verifyStripeSignature");
async function handleStripeWebhook(env, request) {
  const rawBody = await request.text();
  const event = await verifyStripeSignature(env, rawBody, request.headers.get("stripe-signature"));
  const eventId = String(event.id || "");
  if (!eventId) throw new HttpError(400, "STRIPE_EVENT_ID_MISSING", "Stripe event is missing an id.");
  const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO stripe_webhook_events (id, event_type, received_at) VALUES (?, ?, ?)`).bind(eventId, String(event.type || "unknown"), nowIso()).run();
  if ((inserted.meta.changes ?? 0) === 0) return new Response("ok", { status: 200 });
  if (event.type === "checkout.session.completed") {
    const data = event.data;
    const session = data?.object || {};
    const sessionId = String(session.id || "");
    const metadata = session.metadata;
    const leadId = String(session.client_reference_id || metadata?.leadId || "");
    const order = await env.DB.prepare(`SELECT * FROM client_orders WHERE stripe_checkout_session_id = ?`).bind(sessionId).first();
    if (order && leadId) {
      const ts = nowIso();
      const customerDetails = session.customer_details;
      await env.DB.prepare(`
        UPDATE client_orders SET status='PAID', stripe_payment_intent_id=?, stripe_customer_id=?, stripe_customer_email=?, paid_at=?, updated_at=? WHERE id=?
      `).bind(String(session.payment_intent || ""), String(session.customer || ""), String(customerDetails?.email || ""), ts, ts, order.id).run();
      await tryTransition(env.DB, leadId, "WON", "Stripe checkout completed.");
      await tryTransition(env.DB, leadId, "ONBOARDING", "Payment confirmed; onboarding started.");
      const domainAddon = Number(order.domain_addon) === 1;
      await env.DB.prepare(`
        INSERT INTO client_projects (lead_id, order_id, domain_addon, retainer_status, created_at, updated_at)
        VALUES (?, ?, ?, 'NONE', ?, ?)
        ON CONFLICT(lead_id) DO UPDATE SET order_id=excluded.order_id, domain_addon=excluded.domain_addon, updated_at=excluded.updated_at
      `).bind(leadId, order.id, domainAddon ? 1 : 0, ts, ts).run();
      await recordEvent(env.DB, {
        eventId: newId("evt"),
        leadId,
        eventType: "PAYMENT_RECEIVED",
        eventData: { sessionId, amountCents: order.amount_total_cents, domainAddon },
        source: "STRIPE",
        actor: "PROSPECT"
      });
    }
  }
  await env.DB.prepare(`UPDATE stripe_webhook_events SET processed_at=? WHERE id=?`).bind(nowIso(), eventId).run();
  return new Response("ok", { status: 200 });
}
__name(handleStripeWebhook, "handleStripeWebhook");

