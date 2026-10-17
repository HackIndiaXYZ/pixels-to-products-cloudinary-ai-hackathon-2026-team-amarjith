const test = require('node:test');
const assert = require('node:assert');
const http = require('http');

// Minimal fake of Upstash's REST API: POST / with ["GET", key] or ["SET", key, value].
function fakeUpstash() {
  const kv = new Map();
  const srv = http.createServer((req, res) => {
    let s = ''; req.on('data', (c) => (s += c)); req.on('end', () => {
      if (req.headers.authorization !== 'Bearer tok') { res.writeHead(401, { 'Content-Type': 'application/json' }); return res.end('{"error":"unauthorized"}'); }
      const [op, k, v] = JSON.parse(s);
      let result = null;
      if (op === 'SET') { kv.set(k, v); result = 'OK'; } else if (op === 'GET') result = kv.get(k) ?? null;
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ result }));
    });
  });
  return new Promise((r) => srv.listen(0, () => r({ srv, kv, url: 'http://127.0.0.1:' + srv.address().port })));
}

test('storage is disabled without env vars', () => {
  delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const storage = require('./storage');
  assert.strictEqual(storage.enabled(), false);
});

test('state saved to Upstash can be loaded back, and bursts are coalesced', async () => {
  const f = await fakeUpstash();
  process.env.UPSTASH_REDIS_REST_URL = f.url; process.env.UPSTASH_REDIS_REST_TOKEN = 'tok';
  delete require.cache[require.resolve('./storage')];
  const storage = require('./storage');
  assert.ok(storage.enabled());
  assert.strictEqual(await storage.load(), null, 'empty at first');
  storage.save({ donors: [{ id: 'D-1' }], requests: [] }, 10);
  storage.save({ donors: [{ id: 'D-1' }, { id: 'D-2' }], requests: [] }, 10);
  await new Promise((r) => setTimeout(r, 60));
  await storage.flush();
  const back = await storage.load();
  assert.deepStrictEqual(back.donors.map((d) => d.id), ['D-1', 'D-2']);
  f.srv.close();
});

test('a wrong token surfaces an error instead of silently losing data', async () => {
  const f = await fakeUpstash();
  process.env.UPSTASH_REDIS_REST_URL = f.url; process.env.UPSTASH_REDIS_REST_TOKEN = 'bad';
  delete require.cache[require.resolve('./storage')];
  const storage = require('./storage');
  await assert.rejects(() => storage.load(), /Upstash/);
  f.srv.close();
});
