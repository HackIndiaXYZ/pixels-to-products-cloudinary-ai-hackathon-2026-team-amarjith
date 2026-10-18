// Regression tests for the replica-test deep round (Oct 2026). Each bug has a test that failed before the fix.
const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
let proc, base;
const port = 3600 + Math.floor(Math.random() * 300);
const tinyImg = 'data:image/png;base64,iVBORw0KGgoAAAANFig' + 'dummy'; // upload is mocked in demo mode; content irrelevant
let ipN = 0;
const ip = () => '10.99.' + Math.floor(ipN / 250) + '.' + (ipN++ % 250 + 1);
const post = (p, b, ipOverride) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ipOverride || ip() }, body: JSON.stringify(b) });

test.before(async () => {
  const dataFile = path.join(os.tmpdir(), 'bn-fixes-' + port + '.json');
  fs.rmSync(dataFile, { force: true });
  const env = { ...process.env, PORT: String(port), DATA_FILE: dataFile, GNANI_API_KEY: 'fake-key', NODE_OPTIONS: '--require ' + path.join(__dirname, 'test-upload-delay.js') };
  for (const k of ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'RESEND_API_KEY', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) delete env[k];
  proc = spawn('node', ['server.js'], { env, stdio: 'ignore' });
  base = 'http://localhost:' + port;
  for (let i = 0; i < 60; i++) { try { await fetch(base + '/api/config'); return; } catch { await new Promise((r) => setTimeout(r, 150)); } }
  throw new Error('server did not start');
});
test.after(() => proc && proc.kill());

test('BUG-001: impossible calendar dates are rejected for lastDonation', async () => {
  for (const bad of ['2026-02-30', '2026-02-31', '2025-04-31', '2026-13-01']) {
    const r = await post('/api/donors', { name: 'Date Test', phone: '941000' + String(1000 + ipN).slice(0, 4), bloodGroup: 'O+', area: 'Uppal', lastDonation: bad });
    assert.strictEqual(r.status, 201);
    assert.strictEqual((await r.json()).lastDonation, null, bad + ' must not be stored');
  }
  const ok = await post('/api/donors', { name: 'Date Ok', phone: '9410009999', bloodGroup: 'O+', area: 'Uppal', lastDonation: '2026-02-27' });
  assert.strictEqual((await ok.json()).lastDonation, '2026-02-27');
});

test('BUG-002: parallel donor registration with ID image cannot create duplicate phones', async () => {
  const body = { name: 'Race', phone: '9420000001', bloodGroup: 'A+', area: 'Madhapur', idImage: tinyImg };
  const [a, b] = await Promise.all([post('/api/donors', body), post('/api/donors', { ...body, name: 'Race 2' })]);
  assert.strictEqual(a.status === 201 !== (b.status === 201), true, 'exactly one must win, got ' + a.status + ',' + b.status);
  assert.strictEqual(a.status === 409 ? a.status : b.status, 409);
  const donors = await (await fetch(base + '/api/donors')).json();
  assert.strictEqual(JSON.stringify(donors).match(/9420000001/g), null); // phones never public; check count via register attempt
  const again = await post('/api/donors', { name: 'Race 3', phone: '9420000001', bloodGroup: 'A+', area: 'Madhapur' });
  assert.strictEqual(again.status, 409);
});

test('BUG-003: parallel identical requests with report image - the duplicate is flagged', async () => {
  const body = { patient: 'Race Pat', phone: '9430000001', bloodGroup: 'AB+', area: 'Uppal', reportImage: tinyImg };
  const [a, b] = await Promise.all([post('/api/requests', body), post('/api/requests', body)]);
  const [qa, qb] = [await a.json(), await b.json()];
  assert.ok(qa.status === 'Flagged' || qb.status === 'Flagged', 'one must be flagged, got ' + qa.status + ',' + qb.status);
  const flagged = qa.status === 'Flagged' ? qa : qb;
  assert.ok(flagged.flags.some((f) => /duplicate/.test(f)));
});

test('BUG-004: escalation alerts real directory blood banks, not the hardcoded demo list', async () => {
  const r = await post('/api/requests', { patient: 'Esc Real', phone: '9440000001', bloodGroup: 'O+', area: 'LB Nagar', urgency: 'urgent' });
  const q = await r.json();
  const e = await post('/api/requests/' + q.id + '/escalate', {});
  const qe = await e.json();
  assert.ok(qe.bankAlerts.length > 0, 'some bank alerted');
  const directory = new Set(require('./data/telangana-blood-banks.json').map((b) => b.name));
  for (const name of qe.bankAlerts) assert.ok(directory.has(name), name + ' is not in the real directory');
});

test('BUG-006/007: landing page has no unused session-recorder and escapes chat input', () => {
  const html = fs.readFileSync(path.join(__dirname, 'landing.html'), 'utf8');
  assert.ok(!/rrweb/.test(html), 'rrweb must not be loaded');
  assert.ok(!html.includes('chat-me">${v}</div>'), 'chat message text must be escaped before insertAdjacentHTML');
  const csp = require('./security').HEADERS['Content-Security-Policy'];
  assert.ok(!/jsdelivr/.test(csp), 'no unused CDN left in CSP script-src');
});


test('BUG-009: govt directory data carries no raw HTML entities', () => {
  const raw = fs.readFileSync(path.join(__dirname, 'data', 'telangana-blood-banks.json'), 'utf8');
  assert.ok(!/&(amp|lt|gt|quot|#39);/.test(raw), 'decode entities before shipping the data');
});

test('BUG-008: helpline conversion/response failures return useful errors, not bare 500', async () => {
  const garbage = Buffer.from('not audio '.repeat(100)).toString('base64');
  let r = await post('/api/voice/helpline', { audioBase64: garbage, mimeType: 'audio/webm' });
  assert.strictEqual(r.status, 400);
  assert.match((await r.json()).error, /convert/);
  r = await post('/api/voice/helpline', { audioBase64: garbage, mimeType: 'audio/wav' });
  assert.strictEqual(r.status, 502); // reaches STT with the fake key and reports a clean upstream error
  assert.match((await r.json()).error, /transcription failed/);
});
