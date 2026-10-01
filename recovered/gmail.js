var GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
var GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
var GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
var SENDER_NAME = "Connor McKendry | Trenches Group";
function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(bytesToBase64Url, "bytesToBase64Url");
function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
__name(base64UrlToBytes, "base64UrlToBytes");
async function encryptionKey(env) {
  if (!env.CREDENTIAL_ENCRYPTION_KEY) throw new HttpError(503, "CREDENTIAL_KEY_MISSING", "CREDENTIAL_ENCRYPTION_KEY is not configured.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(env.CREDENTIAL_ENCRYPTION_KEY));
  return await crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}
__name(encryptionKey, "encryptionKey");
async function encryptSecret(env, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(env), new TextEncoder().encode(value)));
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(cipher)}`;
}
__name(encryptSecret, "encryptSecret");
async function decryptSecret(env, value) {
  const [iv, cipher] = value.split(".");
  if (!iv || !cipher) throw new HttpError(500, "CREDENTIAL_DECRYPT_FAILED", "Stored credential is invalid.");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64UrlToBytes(iv) }, await encryptionKey(env), base64UrlToBytes(cipher));
  return new TextDecoder().decode(plain);
}
__name(decryptSecret, "decryptSecret");
var credentials = /* @__PURE__ */ __name((db) => db.prepare(`SELECT client_id, encrypted_client_secret FROM outreach_provider_credentials WHERE provider='GOOGLE_GMAIL'`).first(), "credentials");
var connection = /* @__PURE__ */ __name((db) => db.prepare(`SELECT email_address, encrypted_refresh_token, status, last_error, connected_at FROM gmail_connections WHERE id='primary'`).first(), "connection");
var callbackUrl = /* @__PURE__ */ __name((env) => `${env.PUBLIC_BASE_URL}/integrations/gmail/oauth/callback`, "callbackUrl");
async function accessToken(env) {
  const [creds, conn] = await Promise.all([credentials(env.DB), connection(env.DB)]);
  if (!creds?.client_id || !creds.encrypted_client_secret || !conn) throw new HttpError(409, "GMAIL_NOT_CONNECTED", 'Google Workspace is not connected. Click "Connect Google" in the Quotes panel.');
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: creds.client_id,
      client_secret: await decryptSecret(env, creds.encrypted_client_secret),
      refresh_token: await decryptSecret(env, conn.encrypted_refresh_token),
      grant_type: "refresh_token"
    }).toString()
  });
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== "string") {
    const reason = String(data.error_description || data.error || "Token refresh failed").slice(0, 500);
    await env.DB.prepare(`UPDATE gmail_connections SET status='ERROR',last_error=?,updated_at=? WHERE id='primary'`).bind(reason, nowIso()).run();
    throw new HttpError(409, "GMAIL_RECONNECT_REQUIRED", `Google sign-in expired (${reason}). Click "Connect Google" in the Quotes panel to reconnect.`);
  }
  if (conn.status !== "CONNECTED") await env.DB.prepare(`UPDATE gmail_connections SET status='CONNECTED',last_error=NULL,updated_at=? WHERE id='primary'`).bind(nowIso()).run();
  return { token: data.access_token, email: conn.email_address };
}
__name(accessToken, "accessToken");
async function mailboxStatus(env) {
  const conn = await connection(env.DB);
  if (!conn) return { connected: false };
  try {
    const { email } = await accessToken(env);
    return { connected: true, email };
  } catch (error) {
    return { connected: false, email: conn.email_address, error: error instanceof Error ? error.message : String(error) };
  }
}
__name(mailboxStatus, "mailboxStatus");
async function startGmailConnect(env) {
  const creds = await credentials(env.DB);
  if (!creds?.client_id) throw new HttpError(409, "GOOGLE_OAUTH_NOT_CONFIGURED", "The Google OAuth client is not configured.");
  const state = crypto.randomUUID();
  const ts = nowIso();
  await env.DB.prepare(`INSERT INTO oauth_states(state,provider,expires_at,created_at) VALUES(?,'GOOGLE_GMAIL',?,?)`).bind(state, new Date(Date.now() + 10 * 6e4).toISOString(), ts).run();
  const params = new URLSearchParams({
    client_id: creds.client_id,
    redirect_uri: callbackUrl(env),
    response_type: "code",
    scope: `${GMAIL_SEND_SCOPE} openid email`,
    access_type: "offline",
    prompt: "consent",
    login_hint: "connor@trenchesgroup.com",
    state
  });
  return { authUrl: `${GOOGLE_AUTH_URL}?${params.toString()}` };
}
__name(startGmailConnect, "startGmailConnect");
function page(title, body, status = 200) {
  const esc2 = /* @__PURE__ */ __name((v) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), "esc");
  return new Response(`<!doctype html><meta charset="utf-8"><title>${esc2(title)}</title><body style="font-family:system-ui;padding:40px;max-width:560px"><h1>${esc2(title)}</h1><p>${esc2(body)}</p><p>You can close this tab and return to the Command Center.</p></body>`, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}
__name(page, "page");
async function handleGmailConnectCallback(request, env) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  if (url.searchParams.get("error")) return page("Google connection cancelled", `Google returned: ${url.searchParams.get("error")}`, 400);
  const stateRow = await env.DB.prepare(`SELECT expires_at FROM oauth_states WHERE state=? AND provider='GOOGLE_GMAIL'`).bind(state).first();
  if (!stateRow || Date.parse(stateRow.expires_at) < Date.now() || !code) return page("Connection link expired", "Start again from the Quotes panel.", 400);
  await env.DB.prepare(`DELETE FROM oauth_states WHERE state=?`).bind(state).run();
  const creds = await credentials(env.DB);
  if (!creds?.client_id || !creds.encrypted_client_secret) return page("Google is not configured", "The Google OAuth client is missing.", 500);
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: creds.client_id, client_secret: await decryptSecret(env, creds.encrypted_client_secret), redirect_uri: callbackUrl(env), grant_type: "authorization_code" }).toString()
  });
  const token = await tokenResponse.json();
  if (!tokenResponse.ok || typeof token.access_token !== "string") return page("Google connection failed", String(token.error_description || token.error || "Token exchange failed."), 502);
  if (typeof token.refresh_token !== "string") return page("Google connection failed", "Google did not grant offline access. Try again and approve all requested access.", 502);
  const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(token.access_token)}`).then((r) => r.json()).catch(() => ({}));
  if (typeof info.email !== "string") return page("Google connection failed", "Could not confirm which Google account signed in. Try again.", 502);
  const email = info.email.toLowerCase();
  const ts = nowIso();
  await env.DB.prepare(`
    INSERT INTO gmail_connections(id,email_address,encrypted_refresh_token,scopes,history_id,status,connected_at,last_sync_at,last_error,updated_at)
    VALUES('primary',?,?,?,NULL,'CONNECTED',?,NULL,NULL,?)
    ON CONFLICT(id) DO UPDATE SET email_address=excluded.email_address,encrypted_refresh_token=excluded.encrypted_refresh_token,scopes=excluded.scopes,status='CONNECTED',last_error=NULL,connected_at=excluded.connected_at,updated_at=excluded.updated_at
  `).bind(email, await encryptSecret(env, token.refresh_token), typeof token.scope === "string" ? token.scope : GMAIL_SEND_SCOPE, ts, ts).run();
  await recordEvent(env.DB, { eventId: newId("evt"), eventType: "GMAIL_CONNECTED", eventData: { email, purpose: "QUOTES" }, source: "GMAIL", actor: "ADMIN" });
  return page("Google Workspace connected", `Quotes will now be sent from ${email}.`);
}
__name(handleGmailConnectCallback, "handleGmailConnectCallback");
function encodeHeader(value) {
  const clean = value.replace(/[\r\n]+/g, " ").trim();
  return /^[\x20-\x7e]*$/.test(clean) ? clean : `=?UTF-8?B?${btoa(String.fromCharCode(...new TextEncoder().encode(clean)))}?=`;
}
__name(encodeHeader, "encodeHeader");
function address(name, email) {
  return name ? `${encodeHeader(`"${name.replace(/["\\]/g, "")}"`)} <${email}>` : email;
}
__name(address, "address");
function base64Lines(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return btoa(binary).replace(/.{1,76}/g, "$&\r\n");
}
__name(base64Lines, "base64Lines");
async function sendGmail(env, input) {
  const { token, email } = await accessToken(env);
  const boundary = `tg_${crypto.randomUUID()}`;
  const mime = [
    `From: ${address(SENDER_NAME, email)}`,
    `To: ${address(input.toName ?? null, input.to)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(input.text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(input.html),
    `--${boundary}--`,
    ""
  ].join("\r\n");
  const response = await fetch(`${GMAIL_API}/messages/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: bytesToBase64Url(new TextEncoder().encode(mime)) })
  });
  const data = await response.json();
  if (!response.ok || typeof data.id !== "string") {
    const error = data.error;
    throw new HttpError(502, "GMAIL_SEND_FAILED", `Gmail rejected the email: ${error?.message || response.status}`);
  }
  return { messageId: data.id, from: email };
}
__name(sendGmail, "sendGmail");

