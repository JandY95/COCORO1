import crypto from "node:crypto";

export function commonSecurityHeaders({ noStore = true } = {}) {
  const headers = new Headers();
  if (noStore) headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return headers;
}

export function json(data, status = 200, options = {}) {
  const headers = commonSecurityHeaders(options);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { status, headers });
}

export function getRequestHost(request) {
  return String(
    request.headers.get("x-forwarded-host") || request.headers.get("host") || ""
  )
    .split(",")[0]
    .trim()
    .toLowerCase();
}

export function isAllowedSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host.toLowerCase() === getRequestHost(request);
  } catch {
    return false;
  }
}

export function denyIfCrossOrigin(request) {
  if (!isAllowedSameOrigin(request)) {
    return json({ error: "Forbidden" }, 403);
  }
  return null;
}

export function getClientIp(request) {
  const xfwd = String(request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return xfwd || request.headers.get("cf-connecting-ip") || "unknown";
}

export function createLimiterStore() {
  return new Map();
}

export function isRateLimited(store, key, limit, windowMs) {
  const now = Date.now();
  const prev = store.get(key);
  const entry = !prev || now > prev.resetAt ? { count: 0, resetAt: now + windowMs } : prev;

  entry.count += 1;
  store.set(key, entry);

  return entry.count > limit;
}

export function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function normalizeText(v, max = 200) {
  return String(v || "").trim().replace(/\s+/g, " ").slice(0, max);
}

export function digitsOnly(v) {
  return String(v || "").replace(/\D/g, "");
}

export function isValidKoreanPhone(v) {
  const d = digitsOnly(v);
  if (!d.startsWith("0")) return false;
  if (d.length < 9 || d.length > 11) return false;
  if (d.startsWith("02")) return d.length === 9 || d.length === 10;
  if (/^01[016789]/.test(d)) return d.length === 10 || d.length === 11;
  if (/^0\d{2}/.test(d)) return d.length === 10 || d.length === 11;
  return false;
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
