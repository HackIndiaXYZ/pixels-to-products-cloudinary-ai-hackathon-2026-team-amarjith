// Optional persistent storage for the whole app state, using Upstash Redis (free tier, REST API).
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable. Without them the server keeps
// using the local data.json file (which Render's free disk wipes on every restart/redeploy).
const KEY = process.env.STORAGE_KEY || 'blood-network:db';
const base = () => (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const token = () => process.env.UPSTASH_REDIS_REST_TOKEN || '';
const enabled = () => Boolean(base() && token());

async function cmd(args) {
  const r = await fetch(base(), {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(8000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Upstash: ' + (j.error || 'HTTP ' + r.status));
  return j.result;
}

async function load() {
  if (!enabled()) return null;
  const raw = await cmd(['GET', KEY]);
  return raw ? JSON.parse(raw) : null;
}

// Saves are coalesced: many save() calls in a burst become one write of the latest state.
let timer = null, pending = null, inFlight = Promise.resolve();
function save(state, delayMs = 400) {
  if (!enabled()) return;
  pending = state;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const snap = JSON.stringify(pending);
    inFlight = inFlight.then(() => cmd(['SET', KEY, snap])).catch((e) => console.error('Persist failed:', e.message));
  }, delayMs);
  timer.unref();
}
const flush = () => inFlight;

module.exports = { enabled, load, save, flush };
