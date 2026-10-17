const test = require('node:test');
const assert = require('node:assert');
const d = require('./demo-email');
test('disabled without env', () => { delete process.env.RESEND_API_KEY; delete process.env.DEMO_ALERT_EMAIL; assert.strictEqual(d.enabled(), false); });
test('payload goes only to owner, labelled demo, no phone', async () => {
  process.env.DEMO_ALERT_EMAIL = 'me@example.com';
  const m = d.build({ urgency: 'critical', component: 'Whole blood', bloodGroup: 'O+', area: 'Gachibowli', phone: '9999999999', patient: 'X' }, 3);
  assert.deepStrictEqual(m.to, ['me@example.com']);
  assert.match(m.subject, /^\[DEMO\]/);
  assert.ok(!JSON.stringify(m).includes('9999999999') && !JSON.stringify(m).includes('"X"'));
  delete process.env.DEMO_ALERT_EMAIL;
  assert.strictEqual(await d.sendDemo({}, 1), false);
});
