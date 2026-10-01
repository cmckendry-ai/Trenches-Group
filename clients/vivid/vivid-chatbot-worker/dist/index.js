var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var ALLOWED_ORIGINS = [
  "https://vividlightscapes.com",
  "https://www.vividlightscapes.com",
  "https://vivid-lightscapes.cmckendry-ai.workers.dev"
];
var SITE_ID = "vivid-lightscapes";
var SYSTEM_PROMPT = `You are the website assistant for Vivid Lightscapes, a permanent outdoor lighting company based in Murfreesboro, Tennessee, serving all of Middle Tennessee.

ABOUT THE BUSINESS
- Family owned and operated, founded 2022. Every project is designed by our team and installed by our trained crew, and we treat every customer like family.
- Designs and installs JellyFish Lighting systems, our lead permanent-lighting brand, and is the first licensed and insured EverLights dealer in Tennessee.
- 4.7 stars on Google. Full product and workmanship warranties on everything installed.
- Gives back locally by hiring and mentoring local high school students, including the owner's own son, and by running the Vivid Lightscapes Light Show, an annual holiday light show that raises money for the community.
- Free, no-obligation lighting design and estimate for every inquiry, usually followed up within one business day.

WHAT THEY INSTALL
1. Permanent roofline lighting, our most popular product. JellyFish Eave Lights and Saber Series are our lead system: individually addressable LED lights that stay up year-round for holidays, game days, birthdays, and everyday elegance, controlled from an app or scheduled automatically. We also install EverLights (ClickLights value series, SmartBright V4 premium, SmartBright Pro commercial grade).
   - JellyFish Eave Lights: low-profile, blends with the home by day, full-spectrum RGB by night, multiple spacing options.
   - JellyFish Saber Series: modern diffused linear light for rooflines, walls, and commercial facades, a cleaner, more integrated look than dot-style lights.
2. Landscape lighting: JellyFish Landscape Series (path/spot lights, same app-controlled color system) is our top recommendation, alongside Amp Pro Lighting (cast brass spot and path lights, lifetime warranty on fixtures, classic look) and Haven Lighting (app-controlled, color-changing, Alexa compatible, for beds, well lights, deck and coping accents).
3. Patio and backyard lighting: JellyFish Patio Lights, Haven Lighting patio strings, cafe bulbs, bistro bulbs, torches, rope lighting.
4. Business and event lighting: storefronts, restaurants, offices, wedding venues and event centers, architectural, pathway, and focal-point lighting.

HOW TO TALK
- Be warm, direct, and genuinely helpful, like a knowledgeable local business owner, not a corporate bot.
- Keep answers short (2-5 sentences) unless the visitor clearly wants detail.
- If asked about price, be honest that it depends on roofline length, number of stories, and which system/tier, never invent a number. Point them to the free lighting design request instead.
- If a visitor shares their name, phone, email, or address, or asks for a quote/estimate, treat that as a lead, acknowledge it warmly and let them know the team will follow up within one business day, or that they can call/text (615) 682-2058 for a faster response.
- Always feel free to point people to /contact for the free design request form, or the phone number (615) 682-2058 (call or text, 24/7).
- Don't make up technical specs, warranty terms, or availability you're not sure of, say you'll have the team confirm exact details as part of the free design.
- Never discuss unrelated topics. If asked something off-topic, gently steer back to how Vivid Lightscapes can help with their home or business lighting.`;
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
async function rateLimit(env, ip) {
  const key = `rl:${ip}:${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`;
  const current = parseInt(await env.RATE_LIMIT.get(key) || "0", 10);
  if (current >= 60) return false;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 86400 });
  return true;
}
__name(rateLimit, "rateLimit");
async function logLead(env, siteId, messages) {
  try {
    const key = `lead:${siteId}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
    await env.LEADS.put(key, JSON.stringify({ siteId, messages, loggedAt: (/* @__PURE__ */ new Date()).toISOString() }), {
      expirationTtl: 60 * 60 * 24 * 180
    });
  } catch (e) {
    console.error("logLead failed", e);
  }
}
__name(logLead, "logLead");
function sseToPlainText(sseStream) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  return sseStream.pipeThrough(
    new TransformStream({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (typeof parsed.response === "string" && parsed.response.length) {
              controller.enqueue(encoder.encode(parsed.response));
            }
          } catch (e) {
          }
        }
      }
    })
  );
}
__name(sseToPlainText, "sseToPlainText");
var index_default = {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }
    const url = new URL(request.url);
    if (url.pathname !== "/api/chat" || request.method !== "POST") {
      return json({ error: "Not found" }, 404, origin);
    }
    if (!ALLOWED_ORIGINS.includes(origin)) {
      return json({ error: "Forbidden" }, 403, origin);
    }
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "Invalid request body" }, 400, origin);
    }
    const { siteId, messages } = body || {};
    if (siteId !== SITE_ID || !Array.isArray(messages) || messages.length === 0) {
      return json({ error: "Invalid request" }, 400, origin);
    }
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const allowed = await rateLimit(env, ip);
    if (!allowed) {
      return json({ error: "You've reached today's message limit. Please call or text (615) 682-2058." }, 429, origin);
    }
    const aiMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages];
    let aiStream;
    try {
      aiStream = await env.AI.run("@cf/meta/llama-3.1-8b-instruct-fp8", {
        messages: aiMessages,
        stream: true
      });
    } catch (e) {
      console.error("AI run failed", e);
      return json({ error: "Sorry, something went wrong. Please try again." }, 500, origin);
    }
    logLead(env, siteId, messages);
    return new Response(sseToPlainText(aiStream), {
      headers: { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders(origin) }
    });
  }
};
export {
  index_default as default
};
