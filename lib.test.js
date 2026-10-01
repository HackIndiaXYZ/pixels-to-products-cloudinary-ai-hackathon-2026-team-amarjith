const test = require('node:test');
const assert = require('node:assert');
const lib = require('./lib');
const cl = require('./cloudinary');

test('O- is the universal donor, AB+ the universal receiver', () => {
  lib.GROUPS.forEach((g) => assert.ok(lib.compatible('O-', g)));
  lib.GROUPS.forEach((g) => assert.ok(lib.compatible(g, 'AB+')));
  assert.ok(!lib.compatible('A+', 'O-'));
  assert.ok(!lib.compatible('B+', 'A+'));
});
test('donors inside 90 days are ineligible', () => {
  const now = Date.parse('2026-10-01');
  assert.ok(!lib.isEligible({ lastDonation: '2026-08-15' }, now));
  assert.ok(lib.isEligible({ lastDonation: '2026-03-01' }, now));
  assert.ok(lib.isEligible({ lastDonation: null }, now));
});
test('matching ranks nearer exact-group verified donors first and drops far ones', () => {
  const now = Date.parse('2026-10-01');
  const req = { bloodGroup: 'B+', urgency: 'normal', coords: lib.AREAS['Gachibowli'] };
  const mk = (id, g, area, v) => ({ id, bloodGroup: g, coords: lib.AREAS[area], verified: v, lastDonation: '2026-01-01', available: true });
  const m = lib.matchDonors(req, [mk('far', 'B+', 'LB Nagar', true), mk('near', 'B+', 'Madhapur', true), mk('wrong', 'A+', 'Madhapur', true), mk('o', 'O-', 'Madhapur', false)], now);
  assert.deepStrictEqual(m.map((x) => x.donor.id), ['near', 'o']);
});
test('Cloudinary emergency card URL carries text overlays', () => {
  const u = cl.requestCardUrl({ id: 'R-1', bloodGroup: 'B+', urgency: 'critical', units: 2, area: 'Uppal', patient: 'Rahul' });
  assert.match(u, /res\.cloudinary\.com\/.+\/l_text:Arial_90_bold:B%2B/);
  assert.match(u, /BLOOD%20NEEDED/);
});

test('plasma: AB donors are universal, platelets/whole blood follow red-cell rules', () => {
  assert.ok(lib.compatible('AB-', 'O+', 'Plasma'));
  assert.ok(lib.compatible('A+', 'O-', 'Plasma'));
  assert.ok(!lib.compatible('A+', 'B+', 'Plasma'));
  assert.ok(!lib.compatible('A+', 'O+', 'Whole blood'));
});
test('cooldown differs by donation type', () => {
  const now = Date.parse('2026-10-01');
  const d = { lastDonation: '2026-09-10' }; // 21 days ago
  assert.ok(!lib.isEligible(d, now, 'Whole blood'));
  assert.ok(lib.isEligible(d, now, 'Platelets'));
  assert.ok(!lib.isEligible(d, now, 'Plasma'));
  assert.strictEqual(lib.cooldownLeft(d, now, 'Whole blood'), 69);
});
test('escalation triggers only after the wait with no accepted donor', () => {
  const r = { status: 'Donor Found', createdAt: '2026-10-01T10:00:00Z', stage: 0, accepted: [] };
  assert.ok(!lib.needsEscalation(r, Date.parse('2026-10-01T10:05:00Z')));
  assert.ok(lib.needsEscalation(r, Date.parse('2026-10-01T10:11:00Z')));
  assert.ok(!lib.needsEscalation({ ...r, accepted: ['D-1'] }, Date.parse('2026-10-01T11:00:00Z')));
  assert.strictEqual(lib.radiusFor('critical', 1), 50);
});
test('fraud: duplicate requests and money demands are flagged', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  const old = [{ phone: '9876543210', patient: 'Rahul', bloodGroup: 'B+', area: 'Uppal', createdAt: '2026-10-01T10:00:00Z' }];
  const dup = { phone: '9876543210', patient: 'rahul', bloodGroup: 'B+', area: 'Uppal', hospital: '', note: '' };
  assert.ok(lib.fraudFlags(dup, old, now).some((f) => /duplicate/.test(f)));
  assert.ok(lib.fraudFlags({ ...dup, phone: '1', note: 'send Rs 5000 on paytm first' }, [], now).some((f) => /money/.test(f)));
  assert.deepStrictEqual(lib.fraudFlags({ ...dup, phone: '2', patient: 'Zed' }, old, now), []);
});
