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
