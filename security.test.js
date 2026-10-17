const test = require('node:test');
const assert = require('node:assert');
const sec = require('./security');

test('rate limit allows up to the limit then blocks, and resets after the window', () => {
  const t = 1000;
  for (let i = 0; i < 3; i++) assert.ok(sec.rateLimit('t', '1.1.1.1', 3, 1000, t).ok);
  const blocked = sec.rateLimit('t', '1.1.1.1', 3, 1000, t);
  assert.ok(!blocked.ok);
  assert.ok(blocked.retryAfterSec >= 1);
  assert.ok(sec.rateLimit('t', '2.2.2.2', 3, 1000, t).ok, 'other IPs are separate');
  assert.ok(sec.rateLimit('t', '1.1.1.1', 3, 1000, t + 1001).ok, 'window reset');
});
test('clamp trims, strips control characters and caps length', () => {
  assert.strictEqual(sec.clamp('  hi\u0000there  ', 20), 'hi there');
  assert.strictEqual(sec.clamp('x'.repeat(500), 10).length, 10);
  assert.strictEqual(sec.clamp(null, 10), '');
});
test('security headers include CSP, nosniff and frame protection', () => {
  assert.match(sec.HEADERS['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.strictEqual(sec.HEADERS['X-Content-Type-Options'], 'nosniff');
  assert.strictEqual(sec.HEADERS['X-Frame-Options'], 'DENY');
});

test('clientIp prefers Cloudflare headers over spoofable x-forwarded-for', () => {
  const { clientIp } = require('./security');
  const mk = (h) => ({ headers: h, socket: { remoteAddress: '9.9.9.9' } });
  assert.strictEqual(clientIp(mk({ 'true-client-ip': '1.2.3.4', 'x-forwarded-for': '6.6.6.6, 1.2.3.4' })), '1.2.3.4');
  assert.strictEqual(clientIp(mk({ 'cf-connecting-ip': '5.5.5.5', 'x-forwarded-for': '6.6.6.6' })), '5.5.5.5');
  assert.strictEqual(clientIp(mk({ 'x-forwarded-for': '7.7.7.7, 8.8.8.8' })), '7.7.7.7');
  assert.strictEqual(clientIp(mk({})), '9.9.9.9');
});
