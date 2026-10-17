const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

// Load the dictionary without a browser: run i18n.js with a stub document and read BNI18N.dict.
function dict() {
  const ctx = { window: {}, document: { readyState: 'complete', addEventListener() {}, getElementById: () => null, documentElement: {}, body: {} },
    NodeFilter: {}, MutationObserver: function () { this.observe = () => {}; }, localStorage: { getItem: () => 'en', setItem() {} }, location: { search: '' }, URLSearchParams };
  ctx.window = ctx; vm.createContext(ctx);
  try { vm.runInContext(fs.readFileSync(__dirname + '/i18n.js', 'utf8'), ctx); } catch (e) { /* init touches DOM stubs */ }
  return ctx.BNI18N.dict;
}
test('every dictionary entry has a Hindi and a Telugu string with the right script', () => {
  const d = dict();
  assert.ok(Object.keys(d).length > 60);
  for (const [k, v] of Object.entries(d)) {
    assert.strictEqual(v.length, 2, k);
    assert.ok(v[0] && v[1], k);
    if (!/^(SOS)$/.test(k)) {
      assert.ok(/[\u0900-\u097F]/.test(v[0]), 'Hindi script: ' + k);
      assert.ok(/[\u0C00-\u0C7F]/.test(v[1]), 'Telugu script: ' + k);
    }
  }
});
test('dictionary keys exist in the English UI (index.html or app.js)', () => {
  const src = fs.readFileSync(__dirname + '/index.html', 'utf8') + fs.readFileSync(__dirname + '/app.js', 'utf8');
  const missing = Object.keys(dict()).filter((k) => !src.includes(k.replace(/&/g, '&')) && !src.includes(k.replace(/&/g, '&amp;')));
  assert.deepStrictEqual(missing, []);
});
