// Core matching logic (pure functions, unit tested)
const CAN_DONATE_TO = {
  'O-': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
  'O+': ['O+', 'A+', 'B+', 'AB+'],
  'A-': ['A-', 'A+', 'AB-', 'AB+'],
  'A+': ['A+', 'AB+'],
  'B-': ['B-', 'B+', 'AB-', 'AB+'],
  'B+': ['B+', 'AB+'],
  'AB-': ['AB-', 'AB+'],
  'AB+': ['AB+'],
};
const GROUPS = Object.keys(CAN_DONATE_TO);

// Hyderabad areas (lat, lon) so the demo works without GPS
const AREAS = {
  'Gachibowli': [17.4401, 78.3489], 'Madhapur': [17.4483, 78.3915],
  'Kukatpally': [17.4948, 78.3996], 'Secunderabad': [17.4399, 78.4983],
  'Ameerpet': [17.4375, 78.4482], 'Dilsukhnagar': [17.3688, 78.5247],
  'Uppal': [17.4058, 78.5591], 'Charminar': [17.3616, 78.4747],
  'Banjara Hills': [17.4126, 78.4482], 'LB Nagar': [17.3457, 78.5522],
  'Miyapur': [17.4968, 78.3614], 'Mehdipatnam': [17.3950, 78.4410],
};
const URGENCY_WEIGHT = { critical: 3, urgent: 2, normal: 1 };
const MIN_GAP_DAYS = 90; // typical minimum gap between whole-blood donations

function compatible(donorGroup, patientGroup) {
  return (CAN_DONATE_TO[donorGroup] || []).includes(patientGroup);
}
function haversineKm(a, b) {
  const R = 6371, rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function daysSince(dateStr, now = Date.now()) {
  if (!dateStr) return Infinity;
  return Math.floor((now - new Date(dateStr).getTime()) / 86400000);
}
function isEligible(donor, now = Date.now()) {
  return donor.available !== false && daysSince(donor.lastDonation, now) >= MIN_GAP_DAYS;
}
// Score 0-100: exact group, distance, verification, urgency radius
function matchDonors(request, donors, now = Date.now()) {
  const origin = request.coords;
  const radius = { critical: 25, urgent: 15, normal: 8 }[request.urgency] || 10;
  return donors
    .filter((d) => compatible(d.bloodGroup, request.bloodGroup) && isEligible(d, now))
    .map((d) => {
      const km = haversineKm(origin, d.coords);
      let score = 0;
      score += d.bloodGroup === request.bloodGroup ? 40 : 25;
      score += Math.max(0, 40 * (1 - km / radius));
      score += d.verified ? 15 : 0;
      score += Math.min(5, daysSince(d.lastDonation, now) / 180 * 5);
      return { donor: d, km: Math.round(km * 10) / 10, score: Math.round(score) };
    })
    .filter((m) => m.km <= radius)
    .sort((a, b) => b.score - a.score);
}
module.exports = { CAN_DONATE_TO, GROUPS, AREAS, URGENCY_WEIGHT, MIN_GAP_DAYS, compatible, haversineKm, daysSince, isEligible, matchDonors };
