// Blood Network - zero-dependency Node server (Node >= 18). Run: node server.js
const demoEmail = require('./demo-email');
const http = require('http');
const fs = require('fs');
const path = require('path');
const lib = require('./lib');
const cl = require('./cloudinary');
const gnani = require('./gnani');
const vp = require('./voice-parse');
const sec = require('./security');
const storage = require('./storage');
const { spawnSync } = require('child_process');

// Browsers record mic audio as webm/opus, which Gnani STT does not accept -
// transcode those containers to wav (24kHz mono) with ffmpeg before upload.
const GNANI_AUDIO = /^audio\/(wav|x-wav|mpeg|mp3|ogg|flac|aac|m4a)(;.*)?$/;
function toWavIfNeeded(buf, mime) {
  if (GNANI_AUDIO.test(mime)) return { buf, mime };
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'wav', '-ar', '24000', '-ac', '1', 'pipe:1'], { input: buf, maxBuffer: 32e6 });
  if (r.status !== 0 || !r.stdout.length) { const e = new Error('Could not convert ' + mime + ' audio - please use wav/mp3/ogg'); e.status = 400; throw e; }
  return { buf: r.stdout, mime: 'audio/wav' };
}

const PORT = process.env.PORT || 3000;
const DB_FILE = process.env.DATA_FILE || path.join(__dirname, 'data.json');
// Static, read-only government directory (data.gov.in, GODL-India). Directory only - never stock.
let BANKS = [];
try { BANKS = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'telangana-blood-banks.json'), 'utf8')); } catch (e) { console.error('Blood bank directory not loaded:', e.message); }
let db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : seed();
// Always write the local file too; also write to Upstash Redis when it is configured (survives Render restarts).
const save = () => {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); } catch (e) { if (!storage.enabled()) throw e; }
  storage.save(db);
};
const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

function seed() {
  const names = ['Rahul', 'Sneha', 'Imran', 'Priya', 'Kiran', 'Anjali', 'Faisal', 'Divya', 'Rohit', 'Meena', 'Arjun', 'Zoya', 'Vikram', 'Lakshmi'];
  const areas = Object.keys(lib.AREAS);
  const donors = names.map((n, i) => ({
    id: 'D-' + (100 + i), name: n, phone: '98480' + (10000 + i * 137),
    bloodGroup: lib.GROUPS[i % 8], area: areas[i % areas.length], coords: lib.AREAS[areas[i % areas.length]],
    lastDonation: i % 5 === 0 ? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10) : '2026-03-0' + (1 + (i % 8)),
    available: true, verified: false, flagged: false, reports: 0, idPublicId: null, idUrl: null, alerts: [],
  }));
  return { donors, requests: [] };
}

// Default 64 KB; endpoints that accept images or audio pass a bigger cap.
async function body(req, max = 64e3) {
  let s = '';
  for await (const c of req) { s += c; if (s.length > max) { const e = new Error('Payload too large'); e.status = 413; throw e; } }
  try { return s ? JSON.parse(s) : {}; } catch { const e = new Error('Invalid JSON'); e.status = 400; throw e; }
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const pub = (d) => ({ ...d, reporters: undefined, phone: undefined, idPublicId: undefined, verified: undefined, idUploaded: Boolean(d.idPublicId), contact: 'via Blood Network relay', cooldownDays: lib.cooldownLeft(d), idUrl: d.idPublicId ? cl.thumbUrl(d.idPublicId, { blurFaces: true }) : null });

const STATUS = ['Searching', 'Donor Found', 'Contacted', 'Donation Coordinated', 'Completed'];
// Accept only a real past/today YYYY-MM-DD date; anything else counts as 'never donated'.
const validDate = (v) => { const s = String(v || ''); const t = Date.parse(s); return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(t) && t <= Date.now() && new Date(t).toISOString().slice(0, 10) === s ? s : null; }; // round-trip check: V8 silently normalizes impossible dates like 2026-02-30
const today = () => new Date().toISOString().slice(0, 10);
const find = (arr, id) => arr.find((x) => x.id === id);
const log = (r, text) => r.timeline.push({ at: new Date().toISOString(), text });

// Alert the best not-yet-alerted matches. Donors only ever see the request, never the requester's phone.
function alertDonors(r, count) {
  const fresh = lib.matchDonors(r, db.donors).filter((x) => !r.alerted.includes(x.donor.id)).slice(0, count);
  fresh.forEach((x) => {
    const d = find(db.donors, x.donor.id);
    d.alerts.push({ requestId: r.id, at: new Date().toISOString(), text: `${r.urgency.toUpperCase()}: ${r.component} ${r.bloodGroup} needed in ${r.area}, ${x.km} km away` });
    r.alerted.push(d.id);
  });
  return fresh.length;
}
// Escalation engine: nobody accepted within ESCALATION_MS -> widen radius + alert blood banks
function escalate(r) {
  r.stage = (r.stage || 0) + 1; r.lastEscalationAt = new Date().toISOString();
  const km = lib.radiusFor(r.urgency, r.stage);
  const n = alertDonors(r, Math.max(3, r.units * 3));
  log(r, `No donor accepted in time: search widened to ${km} km, ${n} more donors alerted.`);
  // Real govt directory (149 banks with coordinates); the 4 hardcoded demo banks are only a fallback when the directory failed to load.
  const banks = BANKS.length
    ? BANKS.filter((b) => b.lat != null && b.lng != null && lib.haversineKm(r.coords, [b.lat, b.lng]) <= km)
    : lib.BANKS.filter((b) => lib.haversineKm(r.coords, lib.AREAS[b.area]) <= km);
  banks.forEach((b) => { if (!r.bankAlerts.includes(b.name)) { r.bankAlerts.push(b.name); log(r, `Blood bank alerted: ${b.name}`); } });
  save();
}
setInterval(() => { db.requests.forEach((r) => { if (lib.needsEscalation(r)) escalate(r); }); }, 15000).unref();

// Shared by the voice helpline and the typed fallback: parse the sentence, match demo donors only.
function understand(text) {
  const intent = vp.parseVoiceIntent(text);
  let matches = [];
  if (intent.bloodGroup && intent.area) {
    const req0 = { bloodGroup: intent.bloodGroup, component: intent.component, urgency: intent.urgency, area: intent.area, coords: lib.AREAS[intent.area], stage: 0 };
    matches = lib.matchDonors(req0, db.donors).slice(0, 5);
  }
  return { intent, matches };
}

async function api(req, res, url) {
  const m = req.method, p = url.pathname;
  // Voice helpline: caller speaks Hinglish ("O positive chahiye Dilsukhnagar me"), Gnani Prisma transcribes,
  // we match donors from the (synthetic demo) donor list, and Gnani Timbre speaks the answer back.
  if (m === 'GET' && p === '/api/voice/status') return send(res, 200, { live: gnani.configured(), sttLang: gnani.STT_LANG, ttsLang: gnani.TTS_LANG, voice: gnani.TTS_VOICE, demo: true });
  // Typed fallback for when the mic is blocked or unavailable: same parser, no audio.
  if (m === 'POST' && p === '/api/voice/text') {
    const b = await body(req);
    const text = String(b.text || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 300);
    if (!text) return send(res, 400, { error: 'Type a request first' });
    const { intent, matches } = understand(text);
    return send(res, 200, {
      transcript: text, intent, replyText: vp.buildReply(intent, matches),
      matches: matches.map((x) => ({ name: x.donor.name, bloodGroup: x.donor.bloodGroup, area: x.donor.area, km: x.km, score: x.score })),
      demo: true,
    });
  }
  if (m === 'POST' && p === '/api/voice/helpline') {
    if (!gnani.configured()) return send(res, 503, { error: 'Voice helpline not configured - set GNANI_API_KEY on the server' });
    const b = await body(req, 12e6);
    const audio = Buffer.from(String(b.audioBase64 || ''), 'base64');
    if (!audio.length) return send(res, 400, { error: 'audioBase64 is required' });
    if (audio.length > 8e6) return send(res, 400, { error: 'Audio too large (max ~6 MB)' });
    const mime = /^audio\/(wav|x-wav|mpeg|mp3|ogg|flac|aac|m4a|mp4|webm)(;.*)?$/.test(b.mimeType || '') ? b.mimeType : 'audio/wav';
    const conv = toWavIfNeeded(audio, mime);
    let transcript;
    try { transcript = await gnani.stt(conv.buf, conv.mime, b.language || undefined); }
    catch (e) { console.error('Gnani STT:', e.message); return send(res, 502, { error: 'Voice transcription failed - please try again or type your request' }); }
    const { intent, matches } = understand(transcript);
    const replyText = vp.buildReply(intent, matches);
    let wav;
    try { wav = await gnani.tts(replyText, b.language || undefined); }
    catch (e) { console.error('Gnani TTS:', e.message); return send(res, 502, { error: 'Voice reply failed - please try again or type your request' }); }
    return send(res, 200, {
      transcript, intent, replyText,
      matches: matches.map((x) => ({ name: x.donor.name, bloodGroup: x.donor.bloodGroup, area: x.donor.area, km: x.km, score: x.score })),
      replyAudioBase64: wav.toString('base64'),
      demo: true, // all donors shown here are synthetic demo records
    });
  }
  if (m === 'GET' && p === '/api/config') return send(res, 200, { cloud: cl.CLOUD, live: cl.LIVE, areas: Object.keys(lib.AREAS), groups: lib.GROUPS, components: lib.COMPONENTS, gaps: lib.GAP_DAYS, statuses: STATUS, banks: lib.BANKS, escalationMinutes: lib.ESCALATION_MS / 60000 });
  if (m === 'GET' && p === '/api/blood-banks') {
    const district = String(url.searchParams.get('district') || '').toLowerCase().slice(0, 40);
    const q = String(url.searchParams.get('q') || '').toLowerCase().slice(0, 60);
    const list = BANKS.filter((b) => (!district || b.district.toLowerCase() === district) && (!q || (b.name + ' ' + b.city + ' ' + b.address + ' ' + (b.pincode || '')).toLowerCase().includes(q)));
    return send(res, 200, {
      source: 'Government of India Blood Bank Directory (data.gov.in, GODL-India). Directory only, not live stock. Call to confirm.',
      districts: [...new Set(BANKS.map((b) => b.district))].sort(), total: list.length, banks: list.slice(0, 50),
    });
  }
  if (m === 'GET' && p === '/api/donors') return send(res, 200, db.donors.map(pub));
  if (m === 'POST' && p === '/api/admin/cleanup-probe-donors') {
    const expected = process.env.ADMIN_DELETE_SECRET;
    if (!expected) return send(res, 503, { error: 'Admin cleanup is not configured' });
    const supplied = String(req.headers['x-admin-secret'] || '');
    const a = Buffer.from(supplied);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !require('crypto').timingSafeEqual(a, b)) return send(res, 401, { error: 'Unauthorized' });
    const targetIds = new Set(['D-D2EE6', 'D-I7G25', 'D-F0KUQ', 'D-IVW9P']);
    const before = db.donors.length;
    db.donors = db.donors.filter((d) => !(targetIds.has(d.id) && d.name === 'Probe' && d.bloodGroup === 'A+' && d.area === 'Gachibowli' && d.phone === '9848010000'));
    const deletedCount = before - db.donors.length;
    if (deletedCount) save();
    return send(res, 200, { deletedCount, remainingDonors: db.donors.length });
  }
  if (m === 'POST' && p === '/api/donors') {
    const b = await body(req, 12e6);
    if (!sec.clamp(b.name, 60) || !/^\d{10}$/.test(b.phone || '') || !lib.GROUPS.includes(b.bloodGroup) || !lib.AREAS[b.area]) return send(res, 400, { error: 'Name, 10-digit phone, blood group and area are required' });
    if (db.donors.some((x) => x.phone === b.phone)) return send(res, 409, { error: 'This phone number is already registered as a donor' });
    const d = { id: uid('D'), name: sec.clamp(b.name, 60), phone: b.phone, bloodGroup: b.bloodGroup, area: b.area, coords: lib.AREAS[b.area],
      lastDonation: validDate(b.lastDonation), available: true, verified: false, flagged: false, reports: 0, idPublicId: null, idUrl: null, alerts: [] };
    if (b.idImage) { const u = await cl.upload(b.idImage, 'blood-network/donor-ids'); d.idPublicId = u.public_id; d.idUrl = null; d.verified = Boolean(u.public_id); }
    if (db.donors.some((x) => x.phone === b.phone)) return send(res, 409, { error: 'This phone number is already registered as a donor' }); // re-check after the async upload (race)
    db.donors.push(d); save();
    return send(res, 201, pub(d));
  }
  if (m === 'GET' && p === '/api/requests') return send(res, 200, db.requests.slice().reverse().map(withMatches));
  if (m === 'POST' && p === '/api/requests') {
    const b = await body(req, 12e6);
    if (!lib.GROUPS.includes(b.bloodGroup) || !lib.AREAS[b.area] || !sec.clamp(b.patient, 60) || !/^\d{10}$/.test(b.phone || '')) return send(res, 400, { error: 'Patient, 10-digit contact, blood group and area are required' });
    const r = { id: uid('R'), patient: sec.clamp(b.patient, 60), phone: b.phone, bloodGroup: b.bloodGroup, component: lib.COMPONENTS.includes(b.component) ? b.component : 'Whole blood',
      units: Math.min(10, Math.max(1, Math.floor(+b.units) || 1)), urgency: ['critical', 'urgent', 'normal'].includes(b.urgency) ? b.urgency : 'urgent', area: b.area, coords: lib.AREAS[b.area],
      hospital: sec.clamp(b.hospital, 100), note: sec.clamp(b.note, 300), status: 'Searching', createdAt: new Date().toISOString(), stage: 0, lastEscalationAt: null,
      alerted: [], accepted: [], bankAlerts: [], messages: [], timeline: [], flags: [], reports: 0, reportPublicId: null, reportUrl: null };
    if (b.reportImage) { const u = await cl.upload(b.reportImage, 'blood-network/medical-reports'); r.reportPublicId = u.public_id; r.reportUrl = null; }
    r.flags = lib.fraudFlags(r, db.requests); // after the async upload, so a parallel duplicate request is visible (race)
    if (r.flags.length) { r.status = 'Flagged'; log(r, 'Held for review, no alerts sent: ' + r.flags.join('; ')); }
    else {
      const n = alertDonors(r, Math.max(3, r.units * 2));
      if (n) { r.status = 'Donor Found'; log(r, `${n} compatible donors alerted.`); demoEmail.sendDemo(r, n).then((ok) => { if (ok) log(r, 'Demo email alert sent to the project owner only.'); }); } else log(r, 'No compatible donor in range yet. Escalation will widen the search.');
    }
    db.requests.push(r); save();
    return send(res, 201, withMatches(r));
  }
  let mm;
  if (m === 'POST' && (mm = p.match(/^\/api\/requests\/([\w-]+)\/(status|accept|escalate|clear|message)$/))) {
    const r = find(db.requests, mm[1]); const b = await body(req);
    if (!r) return send(res, 404, { error: 'No such request' });
    const act = mm[2];
    if (act !== 'clear' && r.status === 'Flagged') return send(res, 400, { error: 'Request is held for review' });
    if (act === 'status') {
      if (!STATUS.includes(b.status)) return send(res, 400, { error: 'Bad status' });
      r.status = b.status; log(r, 'Status: ' + b.status);
      if (b.status === 'Completed') r.accepted.forEach((id) => { const d = find(db.donors, id); if (d) { d.lastDonation = today(); log(r, `${d.name} enters ${''}cooldown after donating.`); } });
    }
    if (act === 'accept') {
      const d = find(db.donors, b.donorId);
      if (!d || !r.alerted.includes(d.id)) return send(res, 400, { error: 'Donor was not alerted for this request' });
      if (!r.accepted.includes(d.id)) { r.accepted.push(d.id); r.status = 'Contacted'; log(r, `${d.name} accepted. Chat via the platform relay (numbers stay hidden).`); }
    }
    if (act === 'escalate') escalate(r); // demo: "fast-forward 10 minutes"
    if (act === 'clear') { r.status = r.accepted.length ? 'Contacted' : 'Searching'; r.flags = []; log(r, 'Reviewed and cleared.'); alertDonors(r, Math.max(3, r.units * 2)); }
    if (act === 'message') {
      const text = String(b.text || '').slice(0, 300); if (!text) return send(res, 400, { error: 'Empty message' });
      const money = lib.fraudFlags({ ...r, hospital: text, note: '', createdAt: 0, phone: '0' }, []).length > 0;
      r.messages.push({ at: new Date().toISOString(), from: b.from === 'donor' ? 'donor' : 'requester', donorId: b.donorId || null, text, warn: money });
      if (money) log(r, 'Safety warning: a message mentions money. Blood donation is never paid.');
    }
    save(); return send(res, 200, withMatches(r));
  }
  if (m === 'POST' && p === '/api/reports') {
    const b = await body(req);
    const t = b.kind === 'donor' ? find(db.donors, b.id) : find(db.requests, b.id);
    if (!t) return send(res, 404, { error: 'Nothing to report' });
    // One report per client per target: a single person cannot hit the 2-report auto-flag alone.
    const who = require('crypto').createHash('sha256').update(sec.clientIp(req)).digest('hex').slice(0, 16);
    t.reporters = t.reporters || [];
    if (t.reporters.includes(who)) return send(res, 200, { ok: true, already: true, reports: t.reports || 0, flagged: Boolean(t.flagged || t.status === 'Flagged') });
    t.reporters.push(who);
    t.reports = (t.reports || 0) + 1; // 2 reports (e.g. someone asking for money) auto-flag
    if (t.reports >= 2) { if (b.kind === 'donor') t.flagged = true; else { t.status = 'Flagged'; log(t, 'Reported by users: ' + (b.reason || 'money demand')); } }
    save(); return send(res, 200, { ok: true, reports: t.reports, flagged: Boolean(t.flagged || t.status === 'Flagged') });
  }
  if (m === 'GET' && p === '/api/alerts') {
    const d = find(db.donors, url.searchParams.get('donor'));
    if (!d) return send(res, 404, { error: 'No such donor' });
    return send(res, 200, d.alerts.map((a) => { const r = find(db.requests, a.requestId); return { ...a, accepted: Boolean(r && r.accepted.includes(d.id)), status: r && r.status }; }));
  }
  return send(res, 404, { error: 'Not found' });
}
function withMatches(r) {
  const matches = lib.matchDonors(r, db.donors).slice(0, 6).map((x) => ({ ...pub(x.donor), km: x.km, score: x.score, alerted: r.alerted.includes(x.donor.id), accepted: r.accepted.includes(x.donor.id) }));
  const { phone, reportPublicId, reportUrl, reporters, ...safe } = r; // requester phone and private medical report never leave the server
  return { ...safe, hasReport: Boolean(reportPublicId), radiusKm: lib.radiusFor(r.urgency, r.stage), matches, cardUrl: cl.requestCardUrl(r) };
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.css': 'text/css' };
const STATIC = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js', '/i18n.js': 'i18n.js', '/landing': 'landing.html', '/landing.html': 'landing.html', '/voice': 'voice.html', '/voice.html': 'voice.html', '/manifest.webmanifest': 'manifest.webmanifest', '/sw.js': 'sw.js', '/icon.svg': 'icon.svg', '/tw.css': 'tw.css' }; // only the UI files are public
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  sec.applyHeaders(res);
  try {
    if (url.pathname.startsWith('/api/')) {
      if (req.method === 'POST') {
        const ip = sec.clientIp(req);
        const tight = /^\/api\/(donors|requests|voice\/helpline)$/.test(url.pathname);
        const rl = tight ? sec.rateLimit('create', ip, 10, 10 * 60e3) : sec.rateLimit('post', ip, 60, 60e3);
        if (!rl.ok) { res.setHeader('Retry-After', String(rl.retryAfterSec)); return send(res, 429, { error: 'Too many requests. Please wait a bit and try again.' }); }
      }
      return await api(req, res, url);
    }
    const name = STATIC[url.pathname];
    if (!name) { res.writeHead(404, { 'Content-Type': 'text/html' }); return fs.createReadStream(path.join(__dirname, '404.html')).pipe(res); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(name)] }); fs.createReadStream(path.join(__dirname, name)).pipe(res);
  } catch (e) { send(res, e.status || 500, { error: e.status ? e.message : 'Server error' }); if (!e.status) console.error(e); }
});
(async () => {
  if (storage.enabled()) {
    try { const remote = await storage.load(); if (remote && remote.donors) db = remote; else storage.save(db, 0); console.log('Storage: Upstash Redis (persistent)'); }
    catch (e) { console.error('Storage load failed, using local data:', e.message); }
  } else console.log('Storage: local data.json only (set UPSTASH_REDIS_REST_URL/TOKEN for persistence)');
  server.listen(PORT, () => console.log(`Blood Network running on http://localhost:${PORT} (Cloudinary: ${cl.LIVE ? 'live uploads' : 'demo mode - set CLOUDINARY_* env vars for uploads'})`));
})();
