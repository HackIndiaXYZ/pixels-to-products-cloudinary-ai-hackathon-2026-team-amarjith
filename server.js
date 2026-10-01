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
    available: true, verified: i % 3 !== 0, idPublicId: null, idUrl: null, alerts: [],
  }));
  return { donors, requests: [] };
}

async function body(req) {
  let s = '';
  for await (const c of req) { s += c; if (s.length > 12e6) throw new Error('Payload too large'); }
  return s ? JSON.parse(s) : {};
}
const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const pub = (d) => ({ ...d, phone: d.phone.slice(0, 3) + '*****' + d.phone.slice(-2), idUrl: d.idPublicId ? cl.thumbUrl(d.idPublicId, { blurFaces: true }) : d.idUrl });

const STATUS = ['Searching', 'Donor Found', 'Contacted', 'Donation Coordinated', 'Completed'];

async function api(req, res, url) {
  const m = req.method, p = url.pathname;
  if (m === 'GET' && p === '/api/config') return send(res, 200, { cloud: cl.CLOUD, live: cl.LIVE, areas: Object.keys(lib.AREAS), groups: lib.GROUPS, statuses: STATUS });
  if (m === 'GET' && p === '/api/donors') return send(res, 200, db.donors.map(pub));
  if (m === 'POST' && p === '/api/donors') {
    const b = await body(req);
    if (!b.name || !/^\d{10}$/.test(b.phone || '') || !lib.GROUPS.includes(b.bloodGroup) || !lib.AREAS[b.area]) return send(res, 400, { error: 'Name, 10-digit phone, blood group and area are required' });
    const d = { id: uid('D'), name: b.name, phone: b.phone, bloodGroup: b.bloodGroup, area: b.area, coords: lib.AREAS[b.area],
      lastDonation: b.lastDonation || null, available: true, verified: false, idPublicId: null, idUrl: null, alerts: [] };
    if (b.idImage) { const u = await cl.upload(b.idImage, 'blood-network/donor-ids'); d.idPublicId = u.public_id; d.idUrl = u.demo ? u.secure_url : null; d.verified = true; }
    db.donors.push(d); save();
    return send(res, 201, pub(d));
  }
  if (m === 'GET' && p === '/api/requests') return send(res, 200, db.requests.slice().reverse().map(withMatches));
  if (m === 'POST' && p === '/api/requests') {
    const b = await body(req);
    if (!lib.GROUPS.includes(b.bloodGroup) || !lib.AREAS[b.area] || !b.patient || !/^\d{10}$/.test(b.phone || '')) return send(res, 400, { error: 'Patient, 10-digit contact, blood group and area are required' });
    const r = { id: uid('R'), patient: b.patient, phone: b.phone, bloodGroup: b.bloodGroup, units: Math.max(1, +b.units || 1),
      urgency: ['critical', 'urgent', 'normal'].includes(b.urgency) ? b.urgency : 'urgent', area: b.area, coords: lib.AREAS[b.area],
      hospital: b.hospital || '', status: 'Searching', createdAt: new Date().toISOString(), alerted: [], reportPublicId: null, reportUrl: null };
    if (b.reportImage) { const u = await cl.upload(b.reportImage, 'blood-network/medical-reports'); r.reportPublicId = u.public_id; r.reportUrl = u.demo ? u.secure_url : null; }
    const matches = lib.matchDonors(r, db.donors);
    // Instant alerts: top matches (2 per unit needed, minimum 3) get a notification
    matches.slice(0, Math.max(3, r.units * 2)).forEach((x) => {
      const d = db.donors.find((y) => y.id === x.donor.id);
      d.alerts.push({ requestId: r.id, at: r.createdAt, text: `${r.urgency.toUpperCase()}: ${r.bloodGroup} needed in ${r.area}, ${x.km} km away` });
      r.alerted.push(d.id);
    });
    if (r.alerted.length) r.status = 'Donor Found';
    db.requests.push(r); save();
    return send(res, 201, withMatches(r));
  }
  let mm;
  if (m === 'POST' && (mm = p.match(/^\/api\/requests\/([\w-]+)\/status$/))) {
    const r = db.requests.find((x) => x.id === mm[1]); const b = await body(req);
    if (!r || !STATUS.includes(b.status)) return send(res, 400, { error: 'Bad request id or status' });
    r.status = b.status; save(); return send(res, 200, withMatches(r));
  }
  if (m === 'GET' && p === '/api/alerts') {
    const d = db.donors.find((x) => x.id === url.searchParams.get('donor'));
    return send(res, d ? 200 : 404, d ? d.alerts : { error: 'No such donor' });
  }
  return send(res, 404, { error: 'Not found' });
}
function withMatches(r) {
  const matches = lib.matchDonors(r, db.donors).slice(0, 6).map((x) => ({ ...pub(x.donor), km: x.km, score: x.score, alerted: r.alerted.includes(x.donor.id) }));
  return { ...r, matches, cardUrl: cl.requestCardUrl(r), reportUrl: r.reportPublicId ? cl.thumbUrl(r.reportPublicId) : r.reportUrl };
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
