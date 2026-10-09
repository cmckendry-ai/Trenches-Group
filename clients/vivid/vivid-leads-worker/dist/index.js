var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/worker-mailer/dist/index.mjs
import { connect as U } from "cloudflare:sockets";
var u = class {
  static {
    __name(this, "u");
  }
  values = [];
  resolvers = [];
  enqueue(e) {
    this.resolvers.length || this.addWrapper(), this.resolvers.shift()(e);
  }
  async dequeue() {
    return this.values.length || this.addWrapper(), this.values.shift();
  }
  get length() {
    return this.values.length;
  }
  clear() {
    this.values = [], this.resolvers = [];
  }
  addWrapper() {
    this.values.push(new Promise((e) => {
      this.resolvers.push(e);
    }));
  }
};
async function T(a3, e, t) {
  return Promise.race([a3, new Promise((r, n) => setTimeout(() => n(t), e))]);
}
__name(T, "T");
var E = new TextEncoder();
function d(a3) {
  return E.encode(a3);
}
__name(d, "d");
var A = new TextDecoder("utf-8");
function v(a3) {
  return A.decode(a3);
}
__name(v, "v");
function w(a3, e = 76) {
  let t = d(a3), r = "", n = 0, i = 0;
  for (; i < t.length; ) {
    let o = t[i], s;
    if (o === 10) {
      r += `\r
`, n = 0, i++;
      continue;
    } else if (o === 13) if (i + 1 < t.length && t[i + 1] === 10) {
      r += `\r
`, n = 0, i += 2;
      continue;
    } else s = "=0D";
    if (s === void 0) {
      let l = o === 32 || o === 9, h = i + 1 >= t.length || t[i + 1] === 10 || t[i + 1] === 13;
      o < 32 && !l || o > 126 || o === 61 || l && h ? s = `=${o.toString(16).toUpperCase().padStart(2, "0")}` : s = String.fromCharCode(o);
    }
    n + s.length > e - 3 && (r += `=\r
`, n = 0), r += s, n += s.length, i++;
  }
  return r;
}
__name(w, "w");
function c(a3) {
  if (!/[^\x00-\x7F]/.test(a3)) return a3;
  let e = d(a3), t = "";
  for (let r of e) r >= 33 && r <= 126 && r !== 63 && r !== 61 && r !== 95 ? t += String.fromCharCode(r) : r === 32 ? t += "_" : t += `=${r.toString(16).toUpperCase().padStart(2, "0")}`;
  return `=?UTF-8?Q?${t}?=`;
}
__name(c, "c");
var f = class a {
  static {
    __name(this, "a");
  }
  from;
  to;
  reply;
  cc;
  bcc;
  subject;
  text;
  html;
  dsnOverride;
  attachments;
  headers;
  setSent;
  setSentError;
  sent = new Promise((e, t) => {
    this.setSent = e, this.setSentError = t;
  });
  constructor(e) {
    if (!e.text && !e.html) throw new Error("At least one of text or html must be provided");
    typeof e.from == "string" ? this.from = { email: e.from } : this.from = e.from, typeof e.reply == "string" ? this.reply = { email: e.reply } : this.reply = e.reply, this.to = a.toUsers(e.to), this.cc = a.toUsers(e.cc), this.bcc = a.toUsers(e.bcc), this.subject = e.subject, this.text = e.text, this.html = e.html, this.attachments = e.attachments, this.dsnOverride = e.dsnOverride, this.headers = e.headers || {};
  }
  static toUsers(e) {
    if (e) return typeof e == "string" ? [{ email: e }] : Array.isArray(e) ? e.map((t) => typeof t == "string" ? { email: t } : t) : [e];
  }
  getEmailData() {
    this.resolveHeader();
    let e = ["MIME-Version: 1.0"];
    for (let [s, l] of Object.entries(this.headers)) e.push(`${s}: ${l}`);
    let t = this.generateSafeBoundary("mixed_"), r = this.generateSafeBoundary("alternative_");
    e.push(`Content-Type: multipart/mixed; boundary="${t}"`);
    let i = `${e.join(`\r
`)}\r
\r
`;
    if (i += `--${t}\r
`, i += `Content-Type: multipart/alternative; boundary="${r}"\r
\r
`, this.text) {
      i += `--${r}\r
`, i += `Content-Type: text/plain; charset="UTF-8"\r
`, i += `Content-Transfer-Encoding: quoted-printable\r
\r
`;
      let s = w(this.text);
      i += `${s}\r
\r
`;
    }
    if (this.html) {
      i += `--${r}\r
`, i += `Content-Type: text/html; charset="UTF-8"\r
`, i += `Content-Transfer-Encoding: quoted-printable\r
\r
`;
      let s = w(this.html);
      i += `${s}\r
\r
`;
    }
    if (i += `--${r}--\r
`, this.attachments) for (let s of this.attachments) {
      let l = s.mimeType || this.getMimeType(s.filename);
      i += `--${t}\r
`, i += `Content-Type: ${l}; name="${s.filename}"\r
`, i += `Content-Description: ${s.filename}\r
`, i += `Content-Disposition: attachment; filename="${s.filename}";\r
`, i += `    creation-date="${(/* @__PURE__ */ new Date()).toUTCString()}";\r
`, i += `Content-Transfer-Encoding: base64\r
\r
`;
      let h = s.content.match(/.{1,72}/g);
      h ? i += `${h.join(`\r
`)}` : i += `${s.content}`, i += `\r
\r
`;
    }
    return i += `--${t}--\r
`, `${this.applyDotStuffing(i)}\r
.\r
`;
  }
  applyDotStuffing(e) {
    let t = e.replace(/\r\n\./g, `\r
..`);
    return t.startsWith(".") && (t = `.${t}`), t;
  }
  generateSafeBoundary(e) {
    let t = new Uint8Array(28);
    crypto.getRandomValues(t);
    let r = Array.from(t).map((i) => i.toString(16).padStart(2, "0")).join(""), n = e + r;
    return n = n.replace(/[<>@,;:\\/[\]?=" ]/g, "_"), n;
  }
  getMimeType(e) {
    let t = e.split(".").pop()?.toLowerCase();
    return { txt: "text/plain", html: "text/html", csv: "text/csv", pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", zip: "application/zip" }[t || "txt"] || "application/octet-stream";
  }
  resolveHeader() {
    this.resolveFrom(), this.resolveTo(), this.resolveReply(), this.resolveCC(), this.resolveBCC(), this.resolveSubject(), this.headers.Date = this.headers.Date ?? (/* @__PURE__ */ new Date()).toUTCString(), this.headers["Message-ID"] = this.headers["Message-ID"] ?? `<${crypto.randomUUID()}@${this.from.email.split("@").pop()}>`;
  }
  resolveFrom() {
    if (this.headers.From) return;
    let e = this.from.email;
    this.from.name && (e = `"${c(this.from.name)}" <${e}>`), this.headers.From = e;
  }
  resolveTo() {
    if (this.headers.To) return;
    let e = this.to.map((t) => t.name ? `"${c(t.name)}" <${t.email}>` : t.email);
    this.headers.To = e.join(", ");
  }
  resolveSubject() {
    this.headers.Subject || this.subject && (this.headers.Subject = c(this.subject));
  }
  resolveReply() {
    if (!this.headers["Reply-To"] && this.reply) {
      let e = this.reply.email;
      this.reply.name && (e = `"${c(this.reply.name)}" <${e}>`), this.headers["Reply-To"] = e;
    }
  }
  resolveCC() {
    if (!this.headers.CC && this.cc) {
      let e = this.cc.map((t) => t.name ? `"${c(t.name)}" <${t.email}>` : t.email);
      this.headers.CC = e.join(", ");
    }
  }
  resolveBCC() {
    if (!this.headers.BCC && this.bcc) {
      let e = this.bcc.map((t) => t.name ? `"${c(t.name)}" <${t.email}>` : t.email);
      this.headers.BCC = e.join(", ");
    }
  }
};
var S = ((i) => (i[i.DEBUG = 0] = "DEBUG", i[i.INFO = 1] = "INFO", i[i.WARN = 2] = "WARN", i[i.ERROR = 3] = "ERROR", i[i.NONE = 4] = "NONE", i))(S || {});
var p = class {
  static {
    __name(this, "p");
  }
  constructor(e = 1, t) {
    this.level = e;
    this.prefix = t;
  }
  prefix;
  debug(e, ...t) {
    this.level <= 0 && console.debug(this.prefix + e, ...t);
  }
  info(e, ...t) {
    this.level <= 1 && console.info(this.prefix + e, ...t);
  }
  warn(e, ...t) {
    this.level <= 2 && console.warn(this.prefix + e, ...t);
  }
  error(e, ...t) {
    this.level <= 3 && console.error(this.prefix + e, ...t);
  }
};
var b = class a2 {
  static {
    __name(this, "a");
  }
  socket;
  host;
  port;
  secure;
  startTls;
  authType;
  credentials;
  socketTimeoutMs;
  responseTimeoutMs;
  reader;
  writer;
  logger;
  dsn;
  sendNotificationsTo;
  active = false;
  emailSending = null;
  emailToBeSent = new u();
  supportsDSN = false;
  allowAuth = false;
  authTypeSupported = [];
  supportsStartTls = false;
  constructor(e) {
    this.port = e.port, this.host = e.host, this.secure = !!e.secure, Array.isArray(e.authType) ? this.authType = e.authType : typeof e.authType == "string" ? this.authType = [e.authType] : this.authType = [], this.startTls = e.startTls === void 0 ? true : e.startTls, this.credentials = e.credentials, this.dsn = e.dsn || {}, this.socketTimeoutMs = e.socketTimeoutMs || 6e4, this.responseTimeoutMs = e.socketTimeoutMs || 3e4, this.socket = U({ hostname: this.host, port: this.port }, { secureTransport: this.secure ? "on" : this.startTls ? "starttls" : "off", allowHalfOpen: false }), this.reader = this.socket.readable.getReader(), this.writer = this.socket.writable.getWriter(), this.logger = new p(e.logLevel, `[WorkerMailer:${this.host}:${this.port}]`);
  }
  static async connect(e) {
    let t = new a2(e);
    return await t.initializeSmtpSession(), t.start().catch(console.error), t;
  }
  send(e) {
    let t = new f(e);
    return this.emailToBeSent.enqueue(t), t.sent;
  }
  static async send(e, t) {
    let r = await a2.connect(e);
    await r.send(t), await r.close();
  }
  async readTimeout() {
    return T(this.read(), this.responseTimeoutMs, new Error("Timeout while waiting for smtp server response"));
  }
  async read() {
    let e = "";
    for (; ; ) {
      let { value: t } = await this.reader.read();
      if (!t) continue;
      let r = v(t).toString();
      if (this.logger.debug(`SMTP server response:
` + r), e = e + r, !e.endsWith(`
`)) continue;
      let n = e.split(/\r?\n/), i = n[n.length - 2];
      if (!/^\d+-/.test(i)) return e;
    }
  }
  async writeLine(e) {
    await this.write(`${e}\r
`);
  }
  async write(e) {
    this.logger.debug(`Write to socket:
` + e), await this.writer.write(d(e));
  }
  async initializeSmtpSession() {
    await this.waitForSocketConnected(), await this.greet(), await this.ehlo(), this.startTls && !this.secure && this.supportsStartTls && (await this.tls(), await this.ehlo()), await this.auth(), this.active = true;
  }
  async start() {
    for (; this.active; ) {
      this.emailSending = await this.emailToBeSent.dequeue();
      try {
        await this.mail(), await this.rcpt(), await this.data(), await this.body(), this.emailSending.setSent();
      } catch (e) {
        if (this.logger.error("Failed to send email: " + e.message), !this.active) return;
        this.emailSending.setSentError(e);
        try {
          await this.rset();
        } catch (t) {
          await this.close(t);
        }
      }
      this.emailSending = null;
    }
  }
  async close(e) {
    for (this.active = false, this.logger.info("WorkerMailer is closed", e?.message || ""), this.emailSending?.setSentError?.(e || new Error("WorkerMailer is shutting down")); this.emailToBeSent.length; ) (await this.emailToBeSent.dequeue()).setSentError(e || new Error("WorkerMailer is shutting down"));
    try {
      await this.writeLine("QUIT"), await this.readTimeout(), this.socket.close().catch(() => this.logger.error("Failed to close socket"));
    } catch {
    }
  }
  async waitForSocketConnected() {
    this.logger.info("Connecting to SMTP server"), await T(this.socket.opened, this.socketTimeoutMs, new Error("Socket timeout!")), this.logger.info("SMTP server connected");
  }
  async greet() {
    let e = await this.readTimeout();
    if (!e.startsWith("220")) throw new Error("Failed to connect to SMTP server: " + e);
  }
  async ehlo() {
    await this.writeLine("EHLO 127.0.0.1");
    let e = await this.readTimeout();
    if (e.startsWith("421")) throw new Error(`Failed to EHLO. ${e}`);
    if (!e.startsWith("2")) {
      await this.helo();
      return;
    }
    this.parseCapabilities(e);
  }
  async helo() {
    await this.writeLine("HELO 127.0.0.1");
    let e = await this.readTimeout();
    if (!e.startsWith("2")) throw new Error(`Failed to HELO. ${e}`);
  }
  async tls() {
    await this.writeLine("STARTTLS");
    let e = await this.readTimeout();
    if (!e.startsWith("220")) throw new Error("Failed to start TLS: " + e);
    this.reader.releaseLock(), this.writer.releaseLock(), this.socket = this.socket.startTls(), this.reader = this.socket.readable.getReader(), this.writer = this.socket.writable.getWriter();
  }
  parseCapabilities(e) {
    /[ -]AUTH\b/i.test(e) && (this.allowAuth = true), /[ -]AUTH(?:(\s+|=)[^\n]*\s+|\s+|=)PLAIN/i.test(e) && this.authTypeSupported.push("plain"), /[ -]AUTH(?:(\s+|=)[^\n]*\s+|\s+|=)LOGIN/i.test(e) && this.authTypeSupported.push("login"), /[ -]AUTH(?:(\s+|=)[^\n]*\s+|\s+|=)CRAM-MD5/i.test(e) && this.authTypeSupported.push("cram-md5"), /[ -]STARTTLS\b/i.test(e) && (this.supportsStartTls = true), /[ -]DSN\b/i.test(e) && (this.supportsDSN = true);
  }
  async auth() {
    if (this.allowAuth) {
      if (!this.credentials) throw new Error("smtp server requires authentication, but no credentials found");
      if (this.authTypeSupported.includes("plain") && this.authType.includes("plain")) await this.authWithPlain();
      else if (this.authTypeSupported.includes("login") && this.authType.includes("login")) await this.authWithLogin();
      else if (this.authTypeSupported.includes("cram-md5") && this.authType.includes("cram-md5")) await this.authWithCramMD5();
      else throw new Error("No supported auth method found.");
    }
  }
  async authWithPlain() {
    let e = btoa(`\0${this.credentials.username}\0${this.credentials.password}`);
    await this.writeLine(`AUTH PLAIN ${e}`);
    let t = await this.readTimeout();
    if (!t.startsWith("2")) throw new Error(`Failed to plain authentication: ${t}`);
  }
  async authWithLogin() {
    await this.writeLine("AUTH LOGIN");
    let e = await this.readTimeout();
    if (!e.startsWith("3")) throw new Error("Invalid login: " + e);
    let t = btoa(this.credentials.username);
    await this.writeLine(t);
    let r = await this.readTimeout();
    if (!r.startsWith("3")) throw new Error("Failed to login authentication: " + r);
    let n = btoa(this.credentials.password);
    await this.writeLine(n);
    let i = await this.readTimeout();
    if (!i.startsWith("2")) throw new Error("Failed to login authentication: " + i);
  }
  async authWithCramMD5() {
    await this.writeLine("AUTH CRAM-MD5");
    let e = await this.readTimeout(), t = e.match(/^334\s+(.+)$/)?.pop();
    if (!t) throw new Error("Invalid CRAM-MD5 challenge: " + e);
    let r = atob(t), n = d(this.credentials.password), i = await crypto.subtle.importKey("raw", n, { name: "HMAC", hash: "MD5" }, false, ["sign"]), o = d(r), s = await crypto.subtle.sign("HMAC", i, o), l = Array.from(new Uint8Array(s)).map((y) => y.toString(16).padStart(2, "0")).join("");
    await this.writeLine(btoa(`${this.credentials.username} ${l}`));
    let h = await this.readTimeout();
    if (!h.startsWith("2")) throw new Error("Failed to cram-md5 authentication: " + h);
  }
  async mail() {
    let e = `MAIL FROM: <${this.emailSending.from.email}>`;
    this.supportsDSN && (e += ` ${this.retBuilder()}`, this.emailSending?.dsnOverride?.envelopeId && (e += ` ENVID=${this.emailSending?.dsnOverride?.envelopeId}`)), await this.writeLine(e);
    let t = await this.readTimeout();
    if (!t.startsWith("2")) throw new Error(`Invalid ${e} ${t}`);
  }
  async rcpt() {
    let e = [...this.emailSending.to, ...this.emailSending.cc || [], ...this.emailSending.bcc || []];
    for (let t of e) {
      let r = `RCPT TO: <${t.email}>`;
      this.supportsDSN && (r += this.notificationBuilder()), await this.writeLine(r);
      let n = await this.readTimeout();
      if (!n.startsWith("2")) throw new Error(`Invalid ${r} ${n}`);
    }
  }
  async data() {
    await this.writeLine("DATA");
    let e = await this.readTimeout();
    if (!e.startsWith("3")) throw new Error(`Failed to send DATA: ${e}`);
  }
  async body() {
    await this.write(this.emailSending.getEmailData());
    let e = await this.readTimeout();
    if (!e.startsWith("2")) throw new Error("Failed send email body: " + e);
  }
  async rset() {
    await this.writeLine("RSET");
    let e = await this.readTimeout();
    if (!e.startsWith("2")) throw new Error(`Failed to reset: ${e}`);
  }
  notificationBuilder() {
    let e = [];
    return (this.emailSending?.dsnOverride?.NOTIFY && this.emailSending?.dsnOverride?.NOTIFY?.SUCCESS || !this.emailSending?.dsnOverride?.NOTIFY && this.dsn?.NOTIFY?.SUCCESS) && e.push("SUCCESS"), (this.emailSending?.dsnOverride?.NOTIFY && this.emailSending?.dsnOverride?.NOTIFY?.FAILURE || !this.emailSending?.dsnOverride?.NOTIFY && this.dsn?.NOTIFY?.FAILURE) && e.push("FAILURE"), (this.emailSending?.dsnOverride?.NOTIFY && this.emailSending?.dsnOverride?.NOTIFY?.DELAY || !this.emailSending?.dsnOverride?.NOTIFY && this.dsn?.NOTIFY?.DELAY) && e.push("DELAY"), e.length > 0 ? ` NOTIFY=${e.join(",")}` : " NOTIFY=NEVER";
  }
  retBuilder() {
    let e = [];
    return (this.emailSending?.dsnOverride?.RET && this.emailSending?.dsnOverride?.RET?.HEADERS || !this.emailSending?.dsnOverride?.RET && this.dsn?.RET?.HEADERS) && e.push("HDRS"), (this.emailSending?.dsnOverride?.RET && this.emailSending?.dsnOverride?.RET?.FULL || !this.emailSending?.dsnOverride?.RET && this.dsn?.RET?.FULL) && e.push("FULL"), e.length > 0 ? `RET=${e.join(",")}` : "";
  }
};

// src/index.js
var ALLOWED_ORIGINS = [
  "https://vividlightscapes.com",
  "https://www.vividlightscapes.com",
  "https://vivid-lightscapes.cmckendry-ai.workers.dev"
];
var NOTIFY_TO = ["connor@vividlightscapes.com", "mail@vividlightscapes.com"];
var PHONE_DISPLAY = "(615) 682-2058";
var MAX_PHOTO_BYTES = 10 * 1024 * 1024;
var BRAND = { beam: "#F5F94D", night: "#101214", stone: "#E9E7DF", ink: "#1b1c1d", secondary: "#5c6266" };
function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
__name(corsHeaders, "corsHeaders");
function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(origin) }
  });
}
__name(json, "json");
function esc(v2) {
  return String(v2 || "").replace(/[<>&]/g, (c2) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c2]);
}
__name(esc, "esc");
async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
__name(fileToBase64, "fileToBase64");
function emailShell(bodyHtml) {
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f2f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f1ec;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(16,18,20,.08);">
        <tr>
          <td style="background:${BRAND.night};padding:26px 32px;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-weight:700;font-size:20px;letter-spacing:.02em;color:#ffffff;text-transform:uppercase;">Vivid Lightscapes</span>
            <div style="height:3px;width:44px;background:${BRAND.beam};border-radius:2px;margin-top:10px;"></div>
          </td>
        </tr>
        <tr><td style="padding:32px;">${bodyHtml}</td></tr>
        <tr>
          <td style="background:${BRAND.stone};padding:22px 32px;">
            <p style="margin:0;font-size:12.5px;color:${BRAND.secondary};line-height:1.6;">
              Vivid Lightscapes &middot; Murfreesboro, TN &middot; Serving all of Middle Tennessee<br>
              <a href="tel:+16156822058" style="color:${BRAND.ink};font-weight:700;text-decoration:none;">${PHONE_DISPLAY}</a> &middot;
              <a href="mailto:mail@vividlightscapes.com" style="color:${BRAND.ink};font-weight:700;text-decoration:none;">mail@vividlightscapes.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
__name(emailShell, "emailShell");
function detailRow(label, value) {
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #ececea;font-size:13px;color:${BRAND.secondary};font-weight:600;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
    <td style="padding:9px 0 9px 16px;border-bottom:1px solid #ececea;font-size:13.5px;color:${BRAND.ink};font-weight:600;text-align:right;">${esc(value)}</td>
  </tr>`;
}
__name(detailRow, "detailRow");
var index_default = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    const url = new URL(request.url);
    if (url.pathname !== "/api/lead" || request.method !== "POST") {
      return json({ error: "Not found" }, 404, origin);
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Forbidden" }, 403, origin);
    }
    let form;
    try {
      form = await request.formData();
    } catch (e) {
      return json({ error: "Invalid form submission" }, 400, origin);
    }
    const get = /* @__PURE__ */ __name((k) => (form.get(k) || "").toString().trim(), "get");
    const firstName = get("firstName");
    const lastName = get("lastName");
    const phone = get("phone");
    const email = get("email");
    const product = get("product");
    const address = get("address");
    const where = get("where") || "Not specified";
    const installDate = get("installDate") || "Flexible";
    const lightDir = get("lightDir") || "Not sure yet";
    const notes = get("notes") || "N/A";
    const newsletter = get("newsletter") === "yes" ? "Yes" : "No";
    if (!firstName || !lastName || !phone || !email || !product || !address) {
      return json({ error: "Missing required fields" }, 400, origin);
    }
    let photoFile = form.get("photo");
    let photoBase64 = null;
    let photoMime = null;
    let photoName = null;
    if (photoFile && typeof photoFile === "object" && photoFile.size > 0) {
      if (photoFile.size > MAX_PHOTO_BYTES) {
        return json({ error: "Photo is too large (10MB max)" }, 400, origin);
      }
      photoMime = photoFile.type || "application/octet-stream";
      photoName = photoFile.name || "photo.jpg";
      photoBase64 = await fileToBase64(photoFile);
    }
    const now = /* @__PURE__ */ new Date();
    const leadId = `${now.toISOString().replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
    const leadRecord = {
      leadId,
      submittedAt: now.toISOString(),
      firstName,
      lastName,
      phone,
      email,
      product,
      address,
      where,
      installDate,
      lightDir,
      notes,
      newsletter,
      photo: photoBase64 ? { filename: photoName, mimeType: photoMime, base64: photoBase64 } : null
    };
    try {
      await env.LEADS.put(`lead:${leadId}`, JSON.stringify(leadRecord));
    } catch (e) {
      console.error("KV write failed", e);
      return json({ error: "Could not save your request. Please call or text (615) 682-2058." }, 500, origin);
    }
    const summaryLines = [
      `Name: ${firstName} ${lastName}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      `Product of Interest: ${product}`,
      `Installation Address: ${address}`,
      `Where do you want lights?: ${where}`,
      `Desired Installation Date: ${installDate}`,
      `Light Direction: ${lightDir}`,
      `Photo attached: ${photoBase64 ? photoName : "No"}`,
      `Notes: ${notes}`,
      `Subscribe to newsletter: ${newsletter}`,
      ``,
      `Lead ID: ${leadId}`
    ];
    const notifyDetailRows = [
      detailRow("Name", `${firstName} ${lastName}`),
      detailRow("Phone", phone),
      detailRow("Email", email),
      detailRow("Product of Interest", product),
      detailRow("Installation Address", address),
      detailRow("Where", where),
      detailRow("Desired Date", installDate),
      detailRow("Light Direction", lightDir),
      detailRow("Newsletter", newsletter),
      detailRow("Photo", photoBase64 ? photoName : "None")
    ].join("");
    const notifyHtml = emailShell(`
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a8d1f;">New Lead</p>
      <h1 style="margin:4px 0 18px;font-size:22px;font-family:Georgia,'Times New Roman',serif;color:${BRAND.ink};">${esc(firstName)} ${esc(lastName)} &mdash; ${esc(product)}</h1>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${notifyDetailRows}</table>
      ${notes && notes !== "N/A" ? `<p style="margin:18px 0 0;font-size:13.5px;color:${BRAND.ink};line-height:1.6;"><strong>Notes:</strong> ${esc(notes)}</p>` : ""}
      <p style="margin:22px 0 0;font-size:11.5px;color:${BRAND.secondary};">Lead ID: ${esc(leadId)}</p>
    `);
    const submitterDetailRows = [
      detailRow("Product of Interest", product),
      detailRow("Installation Address", address),
      detailRow("Where", where),
      detailRow("Desired Date", installDate)
    ].join("");
    const submitterHtml = emailShell(`
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a8d1f;">Request Received</p>
      <h1 style="margin:4px 0 14px;font-size:24px;font-family:Georgia,'Times New Roman',serif;color:${BRAND.ink};">Thanks, ${esc(firstName)}!</h1>
      <p style="margin:0 0 22px;font-size:14.5px;line-height:1.65;color:${BRAND.ink};">We received your free lighting design request and will follow up within one business day. Here's a copy of what you sent us:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${submitterDetailRows}</table>
      <p style="margin:24px 0 0;font-size:14.5px;line-height:1.65;color:${BRAND.ink};">Need something right away? Call or text <strong>${PHONE_DISPLAY}</strong> and we'll take it from there.</p>
      <p style="margin:22px 0 0;font-size:14px;color:${BRAND.ink};">&mdash; Vivid Lightscapes</p>
    `);
    try {
      const mailer = await b.connect({
        credentials: { username: env.GMAIL_USER, password: env.GMAIL_APP_PASSWORD },
        authType: "plain",
        host: "smtp.gmail.com",
        port: 465,
        secure: true
      });
      const notifyAttachments = photoBase64 ? [{ filename: photoName, content: photoBase64, mimeType: photoMime }] : [];
      await mailer.send({
        from: { name: "Vivid Lightscapes Website", email: env.GMAIL_USER },
        to: NOTIFY_TO.map((e) => ({ email: e })),
        reply: { name: `${firstName} ${lastName}`, email },
        subject: `New Lead — ${firstName} ${lastName} — ${product}`,
        text: summaryLines.join("\n"),
        html: notifyHtml,
        attachments: notifyAttachments
      });
      await mailer.send({
        from: { name: "Connor at Vivid Lightscapes", email: env.GMAIL_USER },
        to: { name: firstName, email },
        subject: "We got your request — Vivid Lightscapes",
        text: `Hi ${firstName},

Thanks for reaching out to Vivid Lightscapes! We received your free lighting design request for ${product} and will get back to you within one business day.

Here's what you sent us:
Product of Interest: ${product}
Installation Address: ${address}
Where: ${where}
Desired Installation Date: ${installDate}

Need something right away? Call or text ${PHONE_DISPLAY} and we'll take it from there.

— Vivid Lightscapes
${PHONE_DISPLAY}`,
        html: submitterHtml
      });
      await mailer.close();
    } catch (e) {
      console.error("Email send failed", e);
    }
    return json({ ok: true, leadId }, 200, origin);
  }
};
export {
  index_default as default
};
