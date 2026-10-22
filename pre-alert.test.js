const test = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');
const pa = require('./pre-alert');
const lib = require('./lib');
const clamp = require('./security').clamp;

const banks = [
  { name: 'Far Bank', district: 'X', city: 'X', address: 'a', components: true, service: '24x7', lat: 18.9, lng: 79.4 },
  { name: 'Near Day Bank', district: 'Hyderabad', city: 'Hyderabad', address: 'b', components: false, service: '9am-5pm', lat: 17.45, lng: 78.35 },
  { name: 'Near 24x7 Components', district: 'Hyderabad', city: 'Hyderabad', address: 'c', components: true, service: '24x7', lat: 17.46, lng: 78.36 },
  { name: 'No coords', district: 'Hyderabad', city: 'Hyderabad', address: 'd', components: true, service: '24x7', lat: null, lng: null },
];
const req = (o) => ({ coords: lib.AREAS.Gachibowli, area: 'Gachibowli', component: 'Whole blood', urgency: 'normal', ...o });

test('picks the nearest facility and skips banks without coordinates', () => {
  const { best, alternatives } = pa.pickFacilities(req(), banks);
  assert.strictEqual(best.name, 'Near Day Bank');
  assert.ok(![best, ...alternatives].some((b) => b.name === 'No coords'));
  assert.ok(best.km < 3);
});
test('critical need prefers a 24x7 bank, platelets prefer component separation', () => {
  assert.strictEqual(pa.pickFacilities(req({ urgency: 'critical' }), banks).best.name, 'Near 24x7 Components');
  assert.strictEqual(pa.pickFacilities(req({ component: 'Platelets' }), banks).best.name, 'Near 24x7 Components');
});
test('no usable banks gives no facility, never a crash', () => {
  assert.strictEqual(pa.pickFacilities(req(), []).best, null);
  assert.strictEqual(pa.publicSummary(req(), null).facility, null);
});
test('profile needs consent, is clamped and drops unknown conditions', () => {
  assert.strictEqual(pa.cleanProfile({ condition: 'Other', consent: false }, clamp), null);
  assert.strictEqual(pa.cleanProfile({ consent: true }, clamp), null);
  const p = pa.cleanProfile({ condition: 'made up', allergies: 'x'.repeat(500), consent: true }, clamp);
  assert.strictEqual(p.condition, null);
  assert.strictEqual(p.allergies.length, 120);
});
test('public summary is labelled simulated and holds no medical fields', () => {
  const s = pa.publicSummary(req({ medical: { allergies: 'penicillin' } }), banks);
  assert.strictEqual(s.simulated, true);
  assert.ok(/no facility was actually notified/i.test(s.note));
  assert.ok(!JSON.stringify(s).includes('penicillin'));
});

let proc, base;
const port = 3700 + Math.floor(Math.random() * 300);
test.before(async () => {
  const dataFile = path.join(os.tmpdir(), 'bn-pa-' + port + '.json');
  const d = { id: 'D-100', name: 'Rahul', phone: '9848010001', bloodGroup: 'O-', area: 'Gachibowli', coords: [17.4401, 78.3489], lastDonation: null, available: true, verified: false, flagged: false, reports: 0, idPublicId: null, idUrl: null, alerts: [] };
  fs.writeFileSync(dataFile, JSON.stringify({ donors: [d], requests: [] }));
  const env = { ...process.env, PORT: String(port), DATA_FILE: dataFile };
  delete env.UPSTASH_REDIS_REST_URL; delete env.UPSTASH_REDIS_REST_TOKEN; delete env.RESEND_API_KEY;
  proc = spawn('node', ['server.js'], { env, stdio: 'ignore' });
  base = 'http://localhost:' + port;
  for (let i = 0; i < 50; i++) { try { await fetch(base + '/api/donors'); return; } catch { await new Promise((r) => setTimeout(r, 100)); } }
  throw new Error('server did not start');
});
test.after(() => proc && proc.kill());
const post = (p, b) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const sos = { patient: 'Demo Patient', phone: '9000000001', bloodGroup: 'O-', area: 'Gachibowli', urgency: 'critical', hospital: 'Demo Hospital' };

test('SOS without patient profile is unchanged (no pre-alert fields)', async () => {
  const r = await (await post('/api/requests', { ...sos, phone: '9000000002' })).json();
  assert.strictEqual(r.preAlert, undefined);
  assert.strictEqual(r.hasPreAlert, false);
  assert.strictEqual(r.preAlertToken, undefined);
});
test('profile without consent is ignored', async () => {
  const r = await (await post('/api/requests', { ...sos, phone: '9000000003', patientProfile: { condition: 'Other', allergies: 'dust', consent: false } })).json();
  assert.strictEqual(r.hasPreAlert, false);
  assert.ok(!JSON.stringify(r).includes('dust'));
});
test('with consent: simulated pre-alert, medical details only behind the token', async () => {
  const r = await (await post('/api/requests', { ...sos, phone: '9000000004', patientProfile: { condition: 'Accident / trauma', allergies: 'penicillin', medications: 'aspirin', consent: true } })).json();
  assert.strictEqual(r.hasPreAlert, true);
  assert.ok(r.preAlertToken);
  assert.strictEqual(r.preAlert.simulated, true);
  assert.ok(r.preAlert.facility && r.preAlert.facility.name);
  assert.ok(r.timeline.some((t) => /Simulated pre-alert/.test(t.text) && /nobody was notified/.test(t.text)));
  assert.ok(!JSON.stringify({ ...r, preAlertToken: 0 }).match(/penicillin|aspirin/));
  const list = JSON.stringify(await (await fetch(base + '/api/requests')).json());
  assert.ok(!list.match(/penicillin|aspirin|preAlertToken/), 'public list must not leak medical details or token');
  assert.strictEqual((await fetch(base + '/api/requests/' + r.id + '/pre-alert')).status, 404);
  assert.strictEqual((await fetch(base + '/api/requests/' + r.id + '/pre-alert', { headers: { 'x-pre-alert-token': 'wrong' } })).status, 404);
  const ok = await fetch(base + '/api/requests/' + r.id + '/pre-alert', { headers: { 'x-pre-alert-token': r.preAlertToken } });
  assert.strictEqual(ok.status, 200);
  const card = await ok.json();
  assert.strictEqual(card.medical.allergies, 'penicillin');
  assert.strictEqual(card.simulated, true);
});
test('UI has the optional pre-alert section and simulated wording', async () => {
  const html = await (await fetch(base + '/')).text();
  assert.ok(html.includes('id="paBox"') && /simulated/i.test(html));
});
test('facility views carry coordinates for directions and stay within the 3 option cap', () => {
  const { best, alternatives } = pa.pickFacilities(req(), banks);
  assert.ok(typeof best.lat === 'number' && typeof best.lng === 'number');
  assert.ok(alternatives.length <= 2);
});
