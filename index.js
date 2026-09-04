const DAILY_LIMIT = 3;
const COOKIE_NAME = "iasp_vid";
const MAX_AGE = 60 * 60 * 24 * 365;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function cookieValue(request, name) {
  const raw = request.headers.get("cookie") || "";
  for (const item of raw.split(";")) {
    const [k, ...rest] = item.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

function cookieHeader(value) {
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Max-Age=${MAX_AGE}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

async function hashText(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function identity(request) {
  let vid = cookieValue(request, COOKIE_NAME);
  let setCookie = null;
  if (!vid || vid.length > 100) {
    vid = crypto.randomUUID();
    setCookie = cookieHeader(vid);
  }
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  return { anon: await hashText(`${vid}|${ip}`), setCookie };
}

async function getUsage(env, key) {
  if (!env.DAILY_USAGE) return null;
  const raw = await env.DAILY_USAGE.get(key);
  const n = Number(raw || 0);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

async function quota(request, env) {
  const { anon, setCookie } = await identity(request);
  const key = `usage:${todayUTC()}:${anon}`;
  const headers = setCookie ? { "set-cookie": setCookie } : {};

  if (!env.DAILY_USAGE) {
    return json({ configured: false, remaining: DAILY_LIMIT, limit: DAILY_LIMIT }, 200, headers);
  }

  if (request.method === "GET") {
    const used = await getUsage(env, key);
    return json({ configured: true, remaining: Math.max(0, DAILY_LIMIT - used), limit: DAILY_LIMIT }, 200, headers);
  }

  if (request.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405, { ...headers, allow: "GET, POST" });
  }

  const used = await getUsage(env, key);
  if (used >= DAILY_LIMIT) {
    return json({ configured: true, allowed: false, remaining: 0, limit: DAILY_LIMIT }, 429, headers);
  }

  const next = used + 1;
  await env.DAILY_USAGE.put(key, String(next), { expirationTtl: 60 * 60 * 48 });
  return json({ configured: true, allowed: true, remaining: Math.max(0, DAILY_LIMIT - next), limit: DAILY_LIMIT }, 200, headers);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/quota") return quota(request, env);
    return env.ASSETS.fetch(request);
  },
};
