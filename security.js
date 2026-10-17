// Small zero-dependency security helpers: response headers, in-memory rate limit, input clamps.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'microphone=(self), camera=(), geolocation=(self)',
};
const applyHeaders = (res) => { for (const [k, v] of Object.entries(HEADERS)) res.setHeader(k, v); };

// Fixed-window counter per (bucket, ip). In memory only: resets on restart, fine for a single free instance.
const hits = new Map();
function rateLimit(bucket, ip, limit, windowMs, now = Date.now()) {
  const key = bucket + '|' + ip;
  let h = hits.get(key);
  if (!h || now >= h.reset) { h = { n: 0, reset: now + windowMs }; hits.set(key, h); }
  h.n += 1;
  return { ok: h.n <= limit, retryAfterSec: Math.max(1, Math.ceil((h.reset - now) / 1000)) };
}
setInterval(() => { const now = Date.now(); for (const [k, h] of hits) if (now >= h.reset) hits.delete(k); }, 60000).unref();

// Render/Cloudflare put the real client first in X-Forwarded-For.
// Behind Render, Cloudflare sets true-client-ip / cf-connecting-ip itself (a client cannot forge them),
// while x-forwarded-for can carry a client-supplied first value. Prefer the Cloudflare headers.
const clientIp = (req) => String(req.headers['true-client-ip'] || req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
const clamp = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

module.exports = { applyHeaders, rateLimit, clientIp, clamp, HEADERS };
