// Hospital Pre-Alert (SIMULATED): pick the best-fit facility from the static Telangana directory
// and build a "pre-arrival card". Nothing is sent to any facility. Directory only - never live stock.
const lib = require('./lib');

const CONDITIONS = ['Accident / trauma', 'Surgery planned', 'Delivery / pregnancy', 'Anaemia / thalassemia', 'Cancer treatment', 'Dengue / low platelets', 'Other'];
const MAX_ALTERNATIVES = 2;

// Rank facilities: nearest first. For platelets/plasma only banks with component separation qualify first;
// 24x7 banks beat others when the request is critical or urgent. Banks without coordinates are skipped.
function pickFacilities(r, banks) {
  const needsComponents = r.component && r.component !== 'Whole blood';
  const urgent = r.urgency === 'critical' || r.urgency === 'urgent';
  const rows = (banks || []).filter((b) => b.lat != null && b.lng != null).map((b) => {
    const km = Math.round(lib.haversineKm(r.coords, [b.lat, b.lng]) * 10) / 10;
    const reasons = [km + ' km from ' + r.area];
    let rank = km;
    if (needsComponents) { if (b.components) reasons.push('has component separation'); else rank += 15; }
    if (urgent) { if (/24/.test(String(b.service || ''))) { reasons.push('24x7 service listed'); rank -= 2; } else rank += 3; }
    return { b, km, rank, reasons };
  }).sort((x, y) => x.rank - y.rank || x.b.name.localeCompare(y.b.name));
  const view = (x) => ({ name: x.b.name, category: x.b.category || null, district: x.b.district, city: x.b.city, address: x.b.address, phone: x.b.phone || null, km: x.km, lat: x.b.lat, lng: x.b.lng, reasons: x.reasons });
  return { best: rows[0] ? view(rows[0]) : null, alternatives: rows.slice(1, 1 + MAX_ALTERNATIVES).map(view) };
}

// Public part (safe to list): no medical details at all.
function publicSummary(r, banks) {
  const { best, alternatives } = pickFacilities(r, banks);
  return { simulated: true, facility: best, alternatives, note: 'Simulated pre-alert. No facility was actually notified. Directory data only, stock not known.' };
}

function cleanProfile(p, clamp) {
  if (!p || typeof p !== 'object' || p.consent !== true) return null;
  const condition = CONDITIONS.includes(p.condition) ? p.condition : null;
  const allergies = clamp(p.allergies, 120), medications = clamp(p.medications, 120), notes = clamp(p.notes, 200);
  if (!condition && !allergies && !medications && !notes) return null;
  return { condition, allergies, medications, notes, consent: true };
}

// Private card: only returned with the requester's token.
function privateCard(r, banks) {
  return { ...publicSummary(r, banks), patient: r.patient, bloodGroup: r.bloodGroup, component: r.component, units: r.units, urgency: r.urgency, area: r.area, hospital: r.hospital || null, medical: r.medical };
}

module.exports = { CONDITIONS, pickFacilities, publicSummary, cleanProfile, privateCard };
