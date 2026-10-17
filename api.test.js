// End-to-end API tests: start the real server on a random port with a temp data file.
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
let proc, base;
const port = 3100 + Math.floor(Math.random() * 500);

test.before(async () => {
  const env = { ...process.env, PORT: String(port), DATA_FILE: path.join(os.tmpdir(), 'bn-test-' + port + '.json') };
  delete env.UPSTASH_REDIS_REST_URL; delete env.UPSTASH_REDIS_REST_TOKEN; delete env.RESEND_API_KEY;
  proc = spawn('node', ['server.js'], { env, stdio: 'ignore' });
  base = 'http://localhost:' + port;
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/donors'); return; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  throw new Error('server did not start');
});
test.after(() => proc && proc.kill());

const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });

test('home and 404', async () => {
  assert.strictEqual((await fetch(base + '/')).status, 200);
  assert.strictEqual((await fetch(base + '/nope')).status, 404);
});
test('security headers present', async () => {
  const r = await fetch(base + '/');
  assert.ok(r.headers.get('content-security-policy'));
  assert.strictEqual(r.headers.get('x-content-type-options'), 'nosniff');
});
test('donors list does not leak phone', async () => {
  const d = await (await fetch(base + '/api/donors')).json();
  assert.ok(d.length > 0);
  assert.ok(!JSON.stringify(d).match(/"phone"/));
});
test('request validation rejects bad input', async () => {
  const r = await post('/api/requests', { patient: '', phone: '123', bloodGroup: 'Z+', area: 'x' });
  assert.strictEqual(r.status, 400);
});
test('voice text fallback responds', async () => {
  const r = await post('/api/voice/text', { text: 'need O positive blood urgently' });
  assert.ok(r.status < 500);
});

test('donor lastDonation must be a real past date; units are capped', async () => {
  const base1 = { name: 'T', phone: '9999999999', bloodGroup: 'O+', area: 'Gachibowli' };
  for (const bad of ['banana', '2099-01-01']) {
    const d = await (await post('/api/donors', { ...base1, lastDonation: bad })).json();
    assert.strictEqual(d.lastDonation, null);
  }
  const ok = await (await post('/api/donors', { ...base1, lastDonation: '2026-01-05' })).json();
  assert.strictEqual(ok.lastDonation, '2026-01-05');
  const r = await (await post('/api/requests', { patient: 'X', phone: '9999999998', bloodGroup: 'O+', area: 'Gachibowli', units: 99999999 })).json();
  assert.strictEqual(r.units, 10);
});

test('tailwind CSS is self-hosted and pages do not need external CDNs', async () => {
  const css = await fetch(base + '/tw.css');
  assert.strictEqual(css.status, 200);
  assert.match(css.headers.get('content-type'), /text\/css/);
  for (const p of ['/', '/voice', '/landing']) {
    const html = await (await fetch(base + p)).text();
    assert.ok(!/cdn\.tailwindcss\.com|fonts\.googleapis\.com/.test(html), p + ' still uses an external CDN');
  }
});
