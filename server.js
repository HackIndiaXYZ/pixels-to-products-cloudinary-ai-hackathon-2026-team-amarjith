// Blood Network - zero-dependency Node server (Node >= 18). Run: node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');
const lib = require('./lib');
const cl = require('./cloudinary');

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'data.json');
const db = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : seed();
const save = () => fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
const uid = (p) => p + '-' + Math.random().toString(36).slice(2, 7).toUpperCase();

function seed() {
  const names = ['Rahul', 'Sneha', 'Imran', 'Priya', 'Kiran', 'Anjali', 'Faisal', 'Divya', 'Rohit', 'Meena', 'Arjun', 'Zoya', 'Vikram', 'Lakshmi'];
  const areas = Object.keys(lib.AREAS);
  const donors = names.map((n, i) => ({
    id: 'D-' + (100 + i), name: n, phone: '98480' + (10000 + i * 137),
    bloodGroup: lib.GROUPS[i % 8], area: areas[i % areas.length], coords: lib.AREAS[areas[i % areas.length]],
    lastDonation: i % 5 === 0 ? new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10) : '2026-03-0' + (1 + (i % 8)),
    available: true, verified: i % 3 !== 0, flagged: false, reports: 0, idPublicId: null, idUrl: null, alerts: [],
  }));
  return { donors, requests: [] };
}

async function body(req) {
  let s = '';
  for await (const c of req) { s += c; if (s.length > 12e6) throw new Error('Payload too large'); }
  return s ? JSON.parse(s) : {};
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const pub = (d) => ({ ...d, phone: undefined, contact: 'via Blood Network relay', cooldownDays: lib.cooldownLeft(d), idUrl: d.idPublicId ? cl.thumbUrl(d.idPublicId, { blurFaces: true }) : d.idUrl });

const STATUS = ['Searching', 'Donor Found', 'Contacted', 'Donation Coordinated', 'Completed'];
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
  const banks = lib.BANKS.filter((b) => lib.haversineKm(r.coords, lib.AREAS[b.area]) <= km);
  banks.forEach((b) => { if (!r.bankAlerts.includes(b.name)) { r.bankAlerts.push(b.name); log(r, `Blood bank alerted: ${b.name}`); } });
  save();
}
setInterval(() => { db.requests.forEach((r) => { if (lib.needsEscalation(r)) escalate(r); }); }, 15000).unref();

async function api(req, res, url) {
  const m = req.method, p = url.pathname;
  if (m === 'GET' && p === '/api/config') return send(res, 200, { cloud: cl.CLOUD, live: cl.LIVE, areas: Object.keys(lib.AREAS), groups: lib.GROUPS, components: lib.COMPONENTS, gaps: lib.GAP_DAYS, statuses: STATUS, escalationMinutes: lib.ESCALATION_MS / 60000 });
  if (m === 'GET' && p === '/api/donors') return send(res, 200, db.donors.map(pub));
  if (m === 'POST' && p === '/api/donors') {
    const b = await body(req);
    if (!b.name || !/^\d{10}$/.test(b.phone || '') || !lib.GROUPS.includes(b.bloodGroup) || !lib.AREAS[b.area]) return send(res, 400, { error: 'Name, 10-digit phone, blood group and area are required' });
    const d = { id: uid('D'), name: b.name, phone: b.phone, bloodGroup: b.bloodGroup, area: b.area, coords: lib.AREAS[b.area],
      lastDonation: b.lastDonation || null, available: true, verified: false, flagged: false, reports: 0, idPublicId: null, idUrl: null, alerts: [] };
    if (b.idImage) { const u = await cl.upload(b.idImage, 'blood-network/donor-ids'); d.idPublicId = u.public_id; d.idUrl = u.demo ? u.secure_url : null; d.verified = true; }
    db.donors.push(d); save();
    return send(res, 201, pub(d));
  }
  if (m === 'GET' && p === '/api/requests') return send(res, 200, db.requests.slice().reverse().map(withMatches));
  if (m === 'POST' && p === '/api/requests') {
    const b = await body(req);
    if (!lib.GROUPS.includes(b.bloodGroup) || !lib.AREAS[b.area] || !b.patient || !/^\d{10}$/.test(b.phone || '')) return send(res, 400, { error: 'Patient, 10-digit contact, blood group and area are required' });
    const r = { id: uid('R'), patient: b.patient, phone: b.phone, bloodGroup: b.bloodGroup, component: lib.COMPONENTS.includes(b.component) ? b.component : 'Whole blood',
      units: Math.max(1, +b.units || 1), urgency: ['critical', 'urgent', 'normal'].includes(b.urgency) ? b.urgency : 'urgent', area: b.area, coords: lib.AREAS[b.area],
      hospital: b.hospital || '', note: b.note || '', status: 'Searching', createdAt: new Date().toISOString(), stage: 0, lastEscalationAt: null,
      alerted: [], accepted: [], bankAlerts: [], messages: [], timeline: [], flags: [], reports: 0, reportPublicId: null, reportUrl: null };
    r.flags = lib.fraudFlags(r, db.requests);
    if (b.reportImage) { const u = await cl.upload(b.reportImage, 'blood-network/medical-reports'); r.reportPublicId = u.public_id; r.reportUrl = u.demo ? u.secure_url : null; }
    if (r.flags.length) { r.status = 'Flagged'; log(r, 'Held for review, no alerts sent: ' + r.flags.join('; ')); }
    else {
      const n = alertDonors(r, Math.max(3, r.units * 2));
      if (n) { r.status = 'Donor Found'; log(r, `${n} compatible donors alerted.`); } else log(r, 'No compatible donor in range yet. Escalation will widen the search.');
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
  const { phone, ...safe } = r; // requester phone never leaves the server
  return { ...safe, radiusKm: lib.radiusFor(r.urgency, r.stage), matches, cardUrl: cl.requestCardUrl(r), reportUrl: r.reportPublicId ? cl.thumbUrl(r.reportPublicId) : r.reportUrl };
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
const STATIC = { '/': 'index.html', '/index.html': 'index.html', '/app.js': 'app.js' }; // only the UI files are public
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    const name = STATIC[url.pathname];
    if (!name) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(name)] }); fs.createReadStream(path.join(__dirname, name)).pipe(res);
  } catch (e) { send(res, 500, { error: e.message }); }
}).listen(PORT, () => console.log(`Blood Network running on http://localhost:${PORT} (Cloudinary: ${cl.LIVE ? 'live uploads' : 'demo mode - set CLOUDINARY_* env vars for uploads'})`));
