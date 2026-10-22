/* Blood Network - mobile-first UI wired to the real /api backend.
   Visual design from the user's mockup; all data comes from the server.
   Treat names, chat messages and timeline text as data, never as HTML. */
const $ = (id) => document.getElementById(id);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const esc = escapeHtml;
const safeImageUrl = (value) => {
  try { const u = new URL(value); return u.protocol === 'https:' ? escapeHtml(u.href) : ''; }
  catch { return ''; }
};
const api = (p, o) => fetch('/api' + p, typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? { signal: AbortSignal.timeout(10000), ...o } : o).then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Error'); return j; }).catch((e) => { throw (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) ? new Error('Server is slow or offline. Please try again.') : e; });
const post = (p, b) => api(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const fileToUri = (f) => new Promise((ok) => { if (!f) return ok(null); const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); });

let cfg;
let donors = [];
let requests = [];
let activeTab = 'home';
let activeRequestId = null;
let selBlood = 'B+', selNeed = 'Whole blood', selUrg = 'critical', units = 2, regBlood = 'O+';
let repReason = 'asked for money', rmReason = 'asked for money', rmCtx = { type: 'donor', id: '', name: '' };
let chatCtx = { requestId: null, donorId: null, as: 'requester' };
let dirFilter = 'All', dirSearch = '';
let welcomed = false;

const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
};
let myDonorId = store.get('bn_myDonor') || null;

// Decorative images delivered through Cloudinary fetch (same cloud as the API).
// The shared 'demo' Cloudinary cloud rejects fetch URLs (401), so use the image directly unless a real cloud is configured.
const cl = (remoteUrl, w = 600) => (cfg && cfg.cloud && cfg.cloud !== 'demo')
  ? `https://res.cloudinary.com/${cfg.cloud}/image/fetch/w_${w},q_auto,f_auto,c_fill/${remoteUrl}`
  : `${remoteUrl}?w=${w}&q=70&auto=format&fit=crop`;
const U = {
  hero: 'https://images.unsplash.com/photo-1615461066841-6116e61058f4',
  doc: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d',
};

const NEED_TYPES = [
  { n: 'Whole blood', d: 'RBC match', icon: '<path d="M12 2C12 2 5 10.2 5 15a7 7 0 0 0 14 0C19 10.2 12 2 12 2Z"/>' },
  { n: 'Platelets', d: 'Like RBC', icon: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>' },
  { n: 'Plasma', d: 'Reverse ABO', icon: '<path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11Z"/>' },
];
const URGENCIES = [
  { n: 'Critical', v: 'critical', d: '< 2 hrs', bg: 'bg-red-50 border-red-200 text-red-700', dot: 'bg-red-600' },
  { n: 'Urgent', v: 'urgent', d: '< 6 hrs', bg: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-500' },
  { n: 'Scheduled', v: 'normal', d: '24 hrs+', bg: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-600' },
];
const REASONS = ['asked for money', 'fake profile', 'spam', 'wrong blood group'];
const HOSPITALS = ['Apollo Hospitals, Jubilee Hills', 'KIMS Hospitals, Secunderabad', 'Yashoda Hospitals, Malakpet', 'NIMS, Begumpet', 'Care Hospitals, Banjara Hills', 'Gandhi Hospital, Secunderabad'];
const urgStyle = (v) => URGENCIES.find((u) => u.v === v) || URGENCIES[1];
const urgLabel = (v) => urgStyle(v).n;

const fmtTime = (t) => new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const timeAgo = (t) => { const s = Math.floor((Date.now() - new Date(t).getTime()) / 1000); if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return Math.floor(s / 86400) + 'd ago'; };
const initials = (name) => String(name || '?').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

function toast(msg, type = 'ok') {
  const w = $('toastWrap'); if (!w) return;
  const d = document.createElement('div');
  const bg = type === 'ok' ? 'bg-gray-900 text-white' : type === 'warn' ? 'bg-amber-500 text-white' : type === 'err' ? 'bg-primary text-white' : 'bg-green-600 text-white';
  d.className = `toast-in pointer-events-auto ${bg} rounded-2xl px-4 py-3 text-[13px] font-bold shadow-pop flex items-center gap-2`;
  d.innerHTML = (type === 'err' ? '<span>⛔</span>' : type === 'warn' ? '<span>⚠️</span>' : type === 'good' ? '<span>✅</span>' : '<span>🔔</span>') + `<span>${esc(msg)}</span>`;
  w.appendChild(d);
  setTimeout(() => { d.style.opacity = '0'; d.style.transform = 'translateY(8px)'; d.style.transition = '.3s'; setTimeout(() => d.remove(), 320); }, 3200);
}

// Timeline icons picked from the server's plain-text log lines.
function tlIcon(text) {
  const t = String(text || '').toLowerCase();
  if (t.includes('widened') || t.includes('escalat')) return ['expand', 'red'];
  if (t.includes('blood bank')) return ['bank', 'blue'];
  if (t.includes('accept')) return ['heart', 'green'];
  if (t.includes('held') || t.includes('review') || t.includes('report')) return ['shield', 'amber'];
  if (t.includes('money')) return ['warn', 'amber'];
  if (t.includes('alert')) return ['bell', 'green'];
  if (t.includes('cooldown') || t.includes('coordinat') || t.includes('complet') || t.includes('cleared') || t.includes('status')) return ['check', 'green'];
  return ['radar', 'blue'];
}
function toneIcon(icon, tone) {
  const cols = { red: 'bg-red-100 text-primary', green: 'bg-green-100 text-green-600', blue: 'bg-blue-100 text-blue-600', amber: 'bg-amber-100 text-amber-600', gray: 'bg-gray-100 text-gray-500' };
  const paths = { radar: '<path d="M12 12m-2 0a2 2 0 1 0 4 0a2 2 0 1 0-4 0M12 4a8 8 0 0 1 8 8h-3a5 5 0 0 0-5-5V4ZM4 12h3a5 5 0 0 1 5 5v3a8 8 0 0 1-8-8Z" fill="currentColor"/>', bell: '<path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"/>', check: '<path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5"/>', heart: '<path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0 1 7.5 5c1.7 0 3.3.9 4.5 2.5C13.2 5.9 14.8 5 16.5 5A4.5 4.5 0 0 1 21 9.5c0 4-4 7.5-9 11.5Z" fill="currentColor"/>', warn: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008Zm0-12a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z"/>', expand: '<path stroke-linecap="round" stroke-linejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M3.75 20.25h4.5m-4.5 0v-4.5m0 4.5L9 15"/>', bank: '<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453 0 2.101-.699M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75A.75.75 0 0 1 1.5 5.25V4.5h1.5Zm16.5 0v.75a.75.75 0 0 1-.75.75H21a.75.75 0 0 1-.75-.75V4.5h1.5ZM3.75 6.75v11.25c0 .414.336.75.75.75h15c.414 0 .75-.336.75-.75V6.75L12 3 3.75 6.75ZM6 9.75h.008v.008H6v-.008Zm3 0h.008v.008H9v-.008Zm3 0h.008v.008h-.008v-.008Zm3 0h.008v.008h-.008v-.008Zm3 0h.008v.008h-.008v-.008ZM6 13.5h.008v.008H6v-.008Zm3 0h.008v.008H9v-.008Zm3 0h.008v.008h-.008v-.008Zm3 0h.008v.008h-.008v-.008Zm3 0h.008v.008h-.008v-.008Z"/>', shield: '<path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4Z" fill="currentColor"/>', chat: '<path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm3.75 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 0-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"/>' };
  return `<span class="w-8 h-8 rounded-xl ${cols[tone] || cols.gray} flex items-center justify-center shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">${paths[icon] || paths.bell}</svg></span>`;
}
const avatarDiv = (d, cls) => `<div class="${cls} bg-gradient-to-br from-primary to-primaryDark text-white flex items-center justify-center font-black shrink-0">${esc(initials(d.name))}</div>`;
// No identity check is performed; an uploaded ID is only stored privately.
const idPill = (d, sm) => d.idUploaded
  ? `<span class="inline-flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 ${sm ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5'} font-extrabold rounded-full">ID uploaded (not verified)</span>`
  : `<span class="text-[10px] font-bold text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">No ID</span>`;
function waLink(r) {
  const txt = `🩸 EMERGENCY BLOOD NEEDED — ${r.id}\nPatient: ${r.patient}\nBlood: ${r.bloodGroup} • ${r.component} • ${r.units} units\nArea: ${r.area}\nHospital: ${r.hospital || 'Authorized blood bank'}\nUrgency: ${urgLabel(r.urgency)}\n\nDonors near Hyderabad please respond via Blood Network. Donation only at authorized blood banks. Matches are potential matches only.`;
  return 'https://wa.me/?text=' + encodeURIComponent(txt);
}

/* ================= HOME ================= */
function renderHome() {
  const steps = [
    { n: 1, t: 'Send SOS', d: 'Patient, blood group (8 types), need, units, area, urgency & hospital.', c: 'bg-primary' },
    { n: 2, t: 'Smart matching', d: 'ABO check (plasma = reverse ABO) + distance + ID-on-file + cooldown → ranked score.', c: 'bg-gray-900' },
    { n: 3, t: 'Chat securely', d: 'Numbers masked. Contact via platform only. Coordinate the bank.', c: 'bg-blue-600' },
    { n: 4, t: 'Donate at bank', d: 'Meet only at Red Cross / Chiranjeevi / Govt / Charminar centres.', c: 'bg-green-600' },
  ];
  $('howSteps').innerHTML = steps.map((s) => `<div class="flex gap-3 items-start bg-gray-50/70 border border-gray-100 rounded-2xl p-3"><div class="w-9 h-9 rounded-xl ${s.c} text-white font-black flex items-center justify-center shrink-0 shadow">${s.n}</div><div><div class="font-extrabold text-[13.5px]">${s.t}</div><div class="text-[12px] text-gray-500 font-medium leading-snug">${s.d}</div></div></div>`).join('');
  const banks = (cfg && cfg.banks) || [];
  $('homeBanks').innerHTML = banks.map((b) => `<div class="flex gap-3 items-center bg-gray-50 border border-gray-100 rounded-2xl p-2.5"><img src="${cl(U.doc, 200)}" onerror="this.onerror=null;this.src='${U.doc}?w=200&q=60&auto=format&fit=crop'" class="w-12 h-12 rounded-xl object-cover" alt=""><div class="flex-1 min-w-0"><div class="font-extrabold text-[13px] truncate">${esc(b.name)}</div><div class="text-[11px] text-gray-500 font-medium truncate">${esc(b.area)}</div></div><span class="text-[10px] font-black bg-green-100 text-green-700 px-2 py-1 rounded-full shrink-0">${esc(b.area.split(' ')[0].toUpperCase())}</span></div>`).join('');
  const feat = donors.slice(-8).reverse();
  $('homeDonors').innerHTML = feat.map((d) => `<div class="min-w-[150px] bg-white border ${d.idUploaded ? 'border-red-100' : 'border-gray-100'} rounded-[20px] p-3 shadow-card shrink-0">
<div class="relative">${avatarDiv(d, 'w-full h-20 rounded-2xl text-[24px]')}<span class="absolute top-1.5 left-1.5 bg-primary text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow">${esc(d.bloodGroup)}</span></div>
<div class="mt-2 font-extrabold text-[12.5px] truncate">${esc(d.name)}</div>
<div class="text-[11px] text-gray-500 font-semibold truncate">${esc(d.area)}</div>
<div class="mt-1.5 flex items-center justify-between">${idPill(d, true)}<span class="text-[10px] font-black ${d.cooldownDays ? 'text-amber-600' : 'text-green-600'}">${d.cooldownDays ? 'Cooldown ' + d.cooldownDays + 'd' : 'Ready'}</span></div>
</div>`).join('') || '<p class="text-[12px] text-gray-500 font-semibold px-1">No donors registered yet.</p>';
  const setT = (id, v) => { const e = $(id); if (e) e.textContent = v; };
  setT('heroDonorCount', donors.length); setT('deskDonorCount', donors.length);
  setT('heroBankCount', banks.length); setT('deskBankCount', banks.length);
  if (cfg) setT('heroEscMin', cfg.escalationMinutes);
}
/* ================= SOS FORM ================= */
function renderSosForm() {
  const groups = (cfg && cfg.groups) || [];
  $('bloodGrid').innerHTML = groups.map((g) => `<button data-bg="${g}" class="bgBtn py-2.5 rounded-xl font-black text-[14px] border-2 transition ${g === selBlood ? 'bg-primary text-white border-primary shadow-red' : 'bg-white text-gray-700 border-gray-100 hover:border-red-200'}">${g}</button>`).join('');
  $('needGrid').innerHTML = NEED_TYPES.map((n) => `<button data-need="${n.n}" class="needBtn rounded-2xl border-2 p-2.5 text-center transition ${n.n === selNeed ? 'bg-primary text-white border-primary shadow-red' : 'bg-white border-gray-100 hover:border-red-200'}"><svg class="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 24 24">${n.icon}</svg><div class="text-[12px] font-extrabold mt-1 leading-none">${n.n}</div><div class="text-[10px] font-bold mt-1 ${n.n === selNeed ? 'text-white/70' : 'text-gray-500'}">${n.d}</div></button>`).join('');
  const hints = { 'Whole blood': 'Whole blood: standard ABO match. Donor RBC must be compatible with patient.', 'Platelets': 'Platelets: matched like whole blood (ABO + Rh) for best compatibility.', 'Plasma': 'Plasma: REVERSE ABO. AB plasma = universal donor. Patient must be RBC-compatible with donor.' };
  $('needHint').textContent = hints[selNeed];
  $('urgGrid').innerHTML = URGENCIES.map((u) => `<button data-urg="${u.v}" class="urgBtn rounded-2xl border-2 p-2.5 text-center transition ${u.v === selUrg ? 'border-current shadow ' + u.bg : 'bg-white border-gray-100'}"><span class="w-2.5 h-2.5 rounded-full ${u.dot} mx-auto block"></span><div class="text-[12.5px] font-extrabold mt-1 ${u.v === selUrg ? '' : 'text-gray-800'}">${u.n}</div><div class="text-[10.5px] font-bold ${u.v === selUrg ? 'opacity-70' : 'text-gray-500'}">${u.d}</div></button>`).join('');
  $('unitsVal').textContent = units;
  const areas = ((cfg && cfg.areas) || []).map((a) => `<option>${esc(a)}</option>`).join('');
  if (!$('f_area').options.length) { $('f_area').innerHTML = areas; $('r_area').innerHTML = areas; }
  if ($('pa_condition') && $('pa_condition').options.length < 2) $('pa_condition').innerHTML += PA_CONDITIONS.map((c) => `<option>${esc(c)}</option>`).join('');
  $('hospList').innerHTML = HOSPITALS.map((h) => `<option value="${esc(h)}">`).join('');
  $('regBlood').innerHTML = groups.map((g) => `<button data-rbg="${g}" class="rbgBtn py-2 rounded-xl font-black text-[12px] border-2 ${g === regBlood ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-100 text-gray-700'}">${g}</button>`).join('');
}

async function submitSOS() {
  const patient = $('f_patient').value.trim(), phone = $('f_phone').value.trim(), hospital = $('f_hospital').value.trim(), note = $('f_notes').value.trim();
  if (!patient) { toast('Enter patient name', 'err'); $('f_patient').focus(); return; }
  if (!/^\d{10}$/.test(phone)) { toast('Enter a 10-digit contact number', 'err'); $('f_phone').focus(); return; }
  const btn = $('sosSubmit'); btn.disabled = true;
  try {
    const pa = { condition: $('pa_condition').value, allergies: $('pa_allergies').value, medications: $('pa_meds').value, consent: $('pa_consent').checked };
    const wantsPA = pa.consent && (pa.condition || pa.allergies.trim() || pa.medications.trim());
    if (!pa.consent && (pa.condition || pa.allergies.trim() || pa.medications.trim())) { toast('Tick the consent box to prepare the pre-arrival card, or clear those fields', 'err'); return void (btn.disabled = false); }
    const r = await post('/requests', { patient, phone, bloodGroup: selBlood, component: selNeed, units, area: $('f_area').value, urgency: selUrg, hospital, note, reportImage: await fileToUri($('f_file').files[0]), ...(wantsPA ? { patientProfile: pa } : {}) });
    if (r.preAlertToken) { try { localStorage.setItem('bn_pa_' + r.id, r.preAlertToken); } catch {} }
    activeRequestId = r.id;
    await refreshRequests();
    renderAll();
    if (r.status === 'Flagged') toast('Held for review - fraud check triggered', 'warn');
    else toast('SOS saved - ' + r.alerted.length + ' demo donors alerted in-app (no SMS or WhatsApp sent)', 'good');
    setTimeout(() => { const el = $('activeRequestWrap'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150);
  } catch (e) { toast(e.message, 'err'); }
  btn.disabled = false;
}

/* ================= HOSPITAL PRE-ALERT (simulated) ================= */
const PA_CONDITIONS = ['Accident / trauma', 'Surgery planned', 'Delivery / pregnancy', 'Anaemia / thalassemia', 'Cancer treatment', 'Dengue / low platelets', 'Other'];
const paSel = {}; // chosen facility index per request (client-side only)
const PA_BRING = ['Patient ID or Aadhaar copy', "Doctor's slip / blood requisition form", 'Previous blood group report, if any', 'Attender phone number', 'Replacement donor details, if the bank asks'];
function paFacilities(r) { const p = r.preAlert; return p && p.facility ? [p.facility, ...(p.alternatives || [])] : []; }
function preAlertCard(r) {
  const list = paFacilities(r); if (!list.length) return '';
  const sel = Math.min(paSel[r.id] || 0, list.length - 1), f = list[sel];
  const tabs = list.map((x, i) => `<button data-action="pa-pick" data-req="${esc(r.id)}" data-i="${i}" class="text-left rounded-xl border-2 px-3 py-2 ${i === sel ? 'border-primary bg-primaryLight' : 'border-gray-100 bg-white'}"><div class="text-[12px] font-extrabold leading-tight">${i === 0 ? '★ Best match: ' : 'Option ' + (i + 1) + ': '}${esc(x.name)}</div><div class="text-[11px] text-gray-600 font-semibold">${esc(x.city || x.district)} • ${x.km} km</div></button>`).join('');
  const dir = f.lat != null ? `<a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(f.lat + ',' + f.lng)}" target="_blank" rel="noopener" class="bg-gray-900 text-white font-extrabold text-[12.5px] py-2.5 rounded-xl text-center">Directions</a>` : '';
  const call = f.phone ? `<a href="tel:${esc(f.phone.replace(/[^0-9+]/g, ''))}" class="bg-primary text-white font-extrabold text-[12.5px] py-2.5 rounded-xl text-center">Call ${esc(f.phone)}</a>` : '<span class="bg-gray-100 text-gray-500 font-extrabold text-[12px] py-2.5 rounded-xl text-center">No number listed</span>';
  const shareTxt = `Blood needed: ${r.bloodGroup} ${r.component}, ${r.units} unit(s), ${r.urgency}.\nSuggested blood bank: ${f.name}, ${[f.address, f.city].filter(Boolean).join(', ')}${f.phone ? '\nPhone: ' + f.phone : ''}\n(Blood Network demo suggestion. Please confirm with the bank directly.)`;
  return `<div id="preAlertBox" data-req="${esc(r.id)}" class="bg-white border border-gray-100 rounded-[22px] p-4 shadow-card"><div class="flex items-center justify-between"><h3 class="font-extrabold text-[15px]">Hospital pre-alert</h3><span class="text-[10px] font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">SIMULATED</span></div>
<div class="mt-2 bg-primaryLight border border-red-100 rounded-2xl p-3 text-[12px] text-red-900 font-semibold leading-snug"><b>What is this?</b> Where should the patient go so the right place is ready?<br>1. We pick the nearest suitable blood bank.<br>2. We prepare a pre-arrival card with the patient details you gave.<br>3. You call or navigate there yourself. <b>No message is sent to the bank by this app.</b></div>
<div class="mt-3 text-[11px] font-black text-gray-500 uppercase tracking-wide">Choose where to go</div>
<div class="mt-1.5 grid gap-2">${tabs}</div>
<div class="mt-3 rounded-2xl border border-gray-100 p-3"><div class="text-[13px] font-extrabold">${esc(f.name)}</div><div class="text-[11.5px] text-gray-600 font-medium">${esc([f.address, f.city, f.district].filter(Boolean).join(', '))}</div>
<div class="mt-1.5 flex flex-wrap gap-1.5 text-[11px] font-bold">${(f.reasons || []).map((x) => `<span class="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">${esc(x)}</span>`).join('')}</div>
<div class="mt-2.5 grid grid-cols-2 gap-2">${call}${dir}</div>
<a href="https://wa.me/?text=${encodeURIComponent(shareTxt)}" target="_blank" rel="noopener" class="mt-2 block bg-[#25D366] text-white font-extrabold text-[12.5px] py-2.5 rounded-xl text-center">Share this suggestion on WhatsApp</a>
<div class="mt-1 text-[10.5px] text-gray-500 font-medium">The share text has no medical details.</div></div>
<details class="mt-3"><summary class="text-[12px] font-extrabold text-gray-700 cursor-pointer">What to carry (checklist)</summary><ul class="mt-1.5 text-[12px] text-gray-700 font-medium space-y-1">${PA_BRING.map((x) => `<li>☐ ${esc(x)}</li>`).join('')}</ul><p class="mt-1 text-[10.5px] text-gray-500 font-medium">General suggestions only. Ask the blood bank what it needs.</p></details>
<div id="preAlertPrivate" class="mt-3"></div>
<p class="mt-2 text-[11px] text-gray-500 font-medium">${esc(r.preAlert.note)} Ranking uses distance and listed service hours only.</p></div>`;
}
async function loadPreAlertPrivate(r) {
  const box = document.getElementById('preAlertPrivate'); if (!box || !r.hasPreAlert) return;
  let tok = null; try { tok = localStorage.getItem('bn_pa_' + r.id); } catch {}
  if (!tok) { box.innerHTML = '<div class="text-[11px] text-gray-500 font-medium">Patient details are private to the device that created this SOS.</div>'; return; }
  try {
    const c = await api('/requests/' + encodeURIComponent(r.id) + '/pre-alert', { headers: { 'x-pre-alert-token': tok } });
    const m = c.medical || {};
    const line = (k, v) => v ? `<div><b>${k}:</b> ${esc(v)}</div>` : '';
    box.innerHTML = `<div class="bg-gray-50 border border-gray-100 rounded-2xl p-3 text-[12px] font-semibold text-gray-800"><div class="font-extrabold text-[12px] mb-1">Pre-arrival card - what a facility would see (private to you)</div>${line('Patient', c.patient)}${line('Need', c.bloodGroup + ' ' + c.component + ', ' + c.units + ' unit(s), ' + c.urgency)}${line('Condition', m.condition)}${line('Allergies', m.allergies)}${line('Medicines', m.medications)}${line('Area', c.area)}</div>`;
  } catch { box.innerHTML = ''; }
}

/* ================= ACTIVE REQUEST ================= */
function reqCard(r) {
  const u = urgStyle(r.urgency);
  const flagged = r.status === 'Flagged';
  const statuses = (cfg && cfg.statuses) || [];
  const si = Math.max(0, statuses.indexOf(r.status));
  const pct = statuses.length > 1 ? (si / (statuses.length - 1)) * 100 : 0;
  const cardImg = `<div class="bg-white border border-gray-100 rounded-[22px] p-4 shadow-card"><h3 class="font-extrabold text-[15px]">Emergency card <span class="text-gray-500 font-bold text-[12px]">(Cloudinary)</span></h3><img class="mt-2 w-full rounded-2xl" src="${safeImageUrl(r.cardUrl)}" alt="Emergency request card generated by Cloudinary"><p class="mt-2 text-[11px] text-gray-500 font-medium">Auto-generated shareable card - long-press to save and forward on WhatsApp.</p>${r.hasReport ? '<p class="mt-1 text-[11px] text-gray-500 font-medium">📎 Medical report attached (stored privately, not shown publicly).</p>' : ''}</div>`;
  if (flagged) {
    return `<div class="rounded-[22px] bg-gradient-to-br from-amber-500 to-orange-600 text-white p-5 shadow-pop relative overflow-hidden">
<div class="absolute inset-0 hero-dots opacity-40"></div>
<div class="relative">
<div class="flex items-center gap-2"><span class="bg-black/25 text-[11px] font-black px-3 py-1 rounded-full">HELD FOR REVIEW</span><span class="bg-white text-orange-700 text-[11px] font-black px-2.5 py-1 rounded-full font-mono">${esc(r.id)}</span></div>
<h3 class="mt-3 font-extrabold text-[20px] leading-tight">Request paused by<br>fraud protection</h3>
<p class="mt-2 text-[13px] text-white/85 font-medium">No alerts sent. ${(r.flags || []).map(escapeHtml).join('; ') || 'Reported by users.'}</p>
<div class="mt-3 bg-white/15 border border-white/20 rounded-2xl p-3 text-[12px] font-semibold">Patient: ${esc(r.patient)} • ${esc(r.bloodGroup)} • ${esc(r.component)}<br>Hospital: ${esc(r.hospital || 'Authorized blood bank')}</div>
<p class="mt-3 text-[12px] font-semibold text-white/70">A reviewer can clear this from the Safety tab.</p>
<button data-action="new-sos" class="mt-2 w-full bg-black/20 border border-white/20 text-white font-bold py-2.5 rounded-2xl text-[13px]">Start new SOS</button>
</div></div>${cardImg}`;
  }
  const stepsHTML = statuses.map((s, i) => `${i ? `<div class="step-line ${i <= si ? 'fill' : ''}"></div>` : ''}<div class="flex-1 flex flex-col items-center gap-1.5 min-w-0">
<div class="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-black ${i <= si ? 'bg-primary text-white shadow-red' : 'bg-gray-100 text-gray-500'}">${i < si ? '✓' : i + 1}</div>
<div class="text-[8.5px] font-extrabold text-center leading-tight ${i <= si ? 'text-primary' : 'text-gray-500'}">${esc(s)}</div></div>`).join('');
  const tlHTML = [...(r.timeline || [])].reverse().map((e) => { const [ic, tn] = tlIcon(e.text); return `<div class="timeline-item flex gap-2.5 items-start py-2">${toneIcon(ic, tn)}<div class="flex-1 min-w-0"><div class="font-extrabold text-[13px] leading-tight">${esc(e.text)}</div><div class="text-[10.5px] text-gray-500 font-bold mt-0.5">${fmtTime(e.at)} • ${timeAgo(e.at)}</div></div></div>`; }).join('');
  const msgs = r.messages || [];
  const chatHTML = msgs.length ? `<div class="bg-white border border-gray-100 rounded-[22px] p-4 shadow-card"><h3 class="font-extrabold text-[15px]">Platform chat <span class="text-gray-500 font-bold text-[12px]">(numbers hidden)</span></h3><div class="mt-2 space-y-2">${msgs.map((m) => `<div class="flex ${m.from === 'donor' ? 'justify-start' : 'justify-end'}"><div class="${m.from === 'donor' ? 'chat-bubble-them' : 'chat-bubble-me'} max-w-[85%] px-3.5 py-2.5 text-[13px] font-semibold leading-snug">${esc(m.text)}${m.warn ? ' <span class="block mt-1 text-[10px] font-black text-amber-200">⚠ money mentioned - donation is never paid</span>' : ''}</div></div>`).join('')}</div></div>` : '';
  const acc = (r.matches || []).filter((m) => m.accepted);
  const chatBtns = acc.map((m) => `<button data-action="contact" data-req="${esc(r.id)}" data-donor="${esc(m.id)}" class="bg-gray-900 hover:bg-black text-white font-extrabold text-[12.5px] py-2.5 rounded-xl transition">💬 Chat with ${esc(m.name)} (relay)</button>`).join('');
  const matchHTML = !(r.matches || []).length
    ? `<div class="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-5 text-center"><div class="text-3xl">🔍</div><div class="font-extrabold text-[14px] mt-2">No compatible donors in ${r.radiusKm} km</div><p class="text-[12px] text-gray-500 font-medium mt-1">Escalation will widen the search and alert blood banks.</p></div>`
    : r.matches.map((m, idx) => `<div class="bg-white border ${idx === 0 ? 'border-red-200 shadow-red' : 'border-gray-100 shadow-card'} rounded-[20px] p-3">
<div class="flex gap-3">
<div class="relative shrink-0">${avatarDiv(m, 'w-12 h-12 rounded-2xl text-[15px]')}<span class="absolute -top-1.5 -left-1.5 w-6 h-6 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-gray-900'} text-white text-[11px] font-black flex items-center justify-center border-2 border-white">#${idx + 1}</span></div>
<div class="flex-1 min-w-0">
<div class="flex items-center gap-1.5 flex-wrap"><span class="font-extrabold text-[13.5px] truncate">${esc(m.name)}</span>${idPill(m, true)}</div>
<div class="flex items-center gap-1.5 mt-1 flex-wrap">
<span class="bg-primary text-white text-[11px] font-black px-2 py-0.5 rounded-full">${esc(m.bloodGroup)}</span>
${m.km != null ? `<span class="bg-gray-100 text-gray-700 text-[11px] font-bold px-2 py-0.5 rounded-full">📍 ${m.km} km</span>` : ''}
${m.score != null ? `<span class="bg-green-50 text-green-700 border border-green-200 text-[11px] font-black px-2 py-0.5 rounded-full">★ ${m.score}</span>` : ''}
${m.accepted ? '<span class="bg-green-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">✓ CAN DONATE</span>' : m.alerted ? '<span class="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">🔔 ALERTED</span>' : ''}
</div>
${m.score != null ? `<div class="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div class="score-fill h-full bg-gradient-to-r from-primary to-orange-500 rounded-full" style="width:${m.score}%"></div></div>` : ''}
<div class="text-[10.5px] font-bold text-gray-500 mt-1">${esc(m.area)}${m.cooldownDays ? ' • cooldown ' + m.cooldownDays + 'd' : ' • ready'} • 🔒 contact via platform</div>
</div></div>
<div class="mt-2.5 grid grid-cols-[1fr_auto] gap-2">
${m.accepted ? `<button data-action="contact" data-req="${esc(r.id)}" data-donor="${esc(m.id)}" class="bg-gray-900 hover:bg-black text-white font-extrabold text-[12.5px] py-2.5 rounded-xl transition">💬 Contact via platform</button>` : `<span class="bg-gray-50 border border-gray-100 text-gray-500 font-extrabold text-[12px] py-2.5 rounded-xl text-center">Waiting for reply</span>`}
<button data-action="report" data-type="donor" data-id="${esc(m.id)}" data-name="${esc(m.name)}" class="bg-red-50 text-primary border border-red-100 font-extrabold text-[12px] px-3 rounded-xl">Report</button>
</div></div>`).join('');
  return `
<div class="rounded-[24px] overflow-hidden shadow-red border border-red-200">
<div class="bg-gradient-to-br from-[#b3001b] via-[#8a0014] to-[#4d000c] text-white p-5 relative overflow-hidden">
<div class="absolute inset-0 hero-dots opacity-50"></div>
<div class="absolute right-4 top-4 text-right"><div class="text-[10px] font-black tracking-widest text-white/60">BLOOD GROUP</div><div class="blood-glow font-black leading-none" style="font-size:64px">${esc(r.bloodGroup)}</div></div>
<div class="relative">
<div class="flex items-center gap-1.5 flex-wrap">
<span class="bg-white text-primary text-[11px] font-black px-2.5 py-1 rounded-full font-mono">${esc(r.id)}</span>
<span class="${u.bg} border text-[11px] font-black px-2.5 py-1 rounded-full">● ${esc(urgLabel(r.urgency))}</span>
</div>
<h3 class="mt-3 font-extrabold text-[19px] leading-tight">${esc(r.patient)}</h3>
<p class="text-[12.5px] text-white/75 font-semibold">${esc(r.hospital || 'Authorized blood bank')}</p>
<div class="mt-3 grid grid-cols-3 gap-2">
<div class="rounded-2xl p-2.5 text-center border border-white/20" style="background:rgba(255,255,255,.12)"><div class="text-[10px] font-black text-white/60 uppercase">Need</div><div class="font-extrabold text-[13px]">${esc(r.component)}</div></div>
<div class="rounded-2xl p-2.5 text-center border border-white/20" style="background:rgba(255,255,255,.12)"><div class="text-[10px] font-black text-white/60 uppercase">Units</div><div class="font-extrabold text-[18px]">${r.units || 1}</div></div>
<div class="rounded-2xl p-2.5 text-center border border-white/20" style="background:rgba(255,255,255,.12)"><div class="text-[10px] font-black text-white/60 uppercase">Area</div><div class="font-extrabold text-[12px]">${esc(r.area)}</div></div>
</div>
<div class="mt-2.5 flex items-center gap-2 text-[11px] font-bold text-white/70"><span>📡 Radius ${r.radiusKm} km</span><span>•</span><span>${timeAgo(r.createdAt)}</span><span>•</span><span>${r.alerted.length} alerted in-app</span></div>
<div role="note" class="mt-2 text-[11px] font-semibold text-white bg-black/25 rounded-xl px-3 py-2">Demo mode: alerts show only in this app's Alerts inbox. No SMS, call or WhatsApp is sent to donors or blood banks. Not for real emergencies. Use the WhatsApp button below to share the request yourself.</div>
<a href="${waLink(r)}" target="_blank" rel="noopener" class="mt-3 w-full bg-[#25D366] hover:bg-[#1fb857] text-white font-extrabold py-3.5 rounded-2xl flex items-center justify-center gap-2 text-[14px] transition active:scale-[.98]">
<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.2c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.4-.7-2.9-1.2-4.7-4.1-4.9-4.3-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5l-.4.5c-.2.2-.3.4-.1.7.2.3.9 1.5 2 2.4 1.4 1.2 2.5 1.6 2.9 1.8.3.2.5.1.7-.1l1-1.2c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.6.3 0 .1 0 .7-.2 1.3Z"/></svg>
Share on WhatsApp</a>
<div class="mt-2 grid grid-cols-2 gap-2">
<button data-action="copy-id" data-id="${esc(r.id)}" class="bg-white/15 border border-white/20 text-white font-bold py-2.5 rounded-xl text-[12px]">Copy ID</button>
<button data-action="report" data-type="request" data-id="${esc(r.id)}" data-name="${esc(r.patient)}" class="bg-white/15 border border-white/20 text-white font-bold py-2.5 rounded-xl text-[12px]">Report SOS</button>
</div>
</div></div>
<div class="bg-amber-50 border-t border-amber-200 px-4 py-2.5 text-[11px] font-bold text-amber-800 text-center">Donations only at authorized blood banks • Matches are potential matches only</div>
</div>
${cardImg}
${preAlertCard(r)}
<div class="bg-white border border-gray-100 rounded-[22px] p-4 shadow-card">
<div class="flex items-center justify-between"><h3 class="font-extrabold text-[15px]">Live tracker</h3><span class="text-[11px] font-black text-primary bg-primaryLight px-2.5 py-1 rounded-full">${esc(r.status).toUpperCase()}</span></div>
<div class="mt-3 flex items-start">${stepsHTML}</div>
<div class="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden"><div class="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full transition-all duration-700" style="width:${pct}%"></div></div>
${si < statuses.length - 1 ? `<div class="mt-3 grid grid-cols-2 gap-2">
<button data-action="status" data-id="${esc(r.id)}" data-to="${esc(statuses[si + 1])}" class="bg-primary text-white font-extrabold py-2.5 rounded-xl text-[12.5px] shadow-red">Mark: ${esc(statuses[si + 1])} →</button>
<button data-action="escalate" data-id="${esc(r.id)}" class="bg-gray-900 text-white font-extrabold py-2.5 rounded-xl text-[12px]">⏩ Simulate ${(cfg && cfg.escalationMinutes) || 10} min<br class="sm:hidden"> <span class="font-bold opacity-80">no reply</span></button>
</div>` : `<div class="mt-3 bg-green-50 border border-green-200 rounded-2xl p-3 text-center text-[13px] font-extrabold text-green-700">🎉 Donation completed. Thank you, Hyderabad heroes!</div>`}
</div>
<div class="bg-white border border-gray-100 rounded-[22px] p-4 shadow-card">
<h3 class="font-extrabold text-[15px]">Timeline <span class="text-gray-500 font-bold text-[12px]">(${(r.timeline || []).length})</span></h3>
<div class="mt-2">${tlHTML}</div>
</div>
${r.bankAlerts && r.bankAlerts.length ? `<div class="bg-amber-50 border border-amber-200 rounded-[22px] p-4"><div class="font-extrabold text-[13px] text-amber-900">🏥 Blood banks alerted (simulated - timeline record only)</div><div class="mt-1 text-[12px] font-semibold text-amber-800">${r.bankAlerts.map(escapeHtml).join(', ')}</div></div>` : ''}
${chatHTML}
${chatBtns ? `<div class="space-y-2">${chatBtns}</div>` : ''}
<div>
<div class="flex items-center justify-between px-1"><h3 class="font-extrabold text-[15px]">Ranked donors <span class="text-gray-500 font-bold">(${(r.matches || []).length})</span></h3><span class="text-[10.5px] font-bold text-gray-500">ABO • km • score</span></div>
<div class="mt-2 space-y-2.5">${matchHTML}</div>
</div>`;
}
function renderSOS() {
  const active = activeRequestId ? requests.find((q) => q.id === activeRequestId) : null;
  $('sosFormCard').classList.toggle('hidden', !!active);
  $('newSosBtn').classList.toggle('hidden', !active);
  const wrap = $('activeRequestWrap');
  if (!active) { wrap.classList.add('hidden'); wrap.innerHTML = ''; }
  else { wrap.classList.remove('hidden'); wrap.innerHTML = reqCard(active); loadPreAlertPrivate(active); }
  const past = requests.filter((q) => q.id !== activeRequestId).slice(0, 5);
  $('pastWrap').classList.toggle('hidden', past.length === 0 && !active);
  $('pastList').innerHTML = past.map((q) => { const u2 = urgStyle(q.urgency); return `<button data-action="view-req" data-id="${esc(q.id)}" class="w-full text-left bg-white border border-gray-100 rounded-2xl p-3 shadow-card flex items-center gap-3 hover:border-red-200 transition">
<span class="w-11 h-11 rounded-2xl bg-primary text-white font-black flex items-center justify-center text-[13px] shrink-0">${esc(q.bloodGroup)}</span>
<div class="flex-1 min-w-0"><div class="font-extrabold text-[13px] truncate">${esc(q.patient)} <span class="font-mono text-[11px] text-gray-500">${esc(q.id)}</span></div><div class="text-[11.5px] text-gray-500 font-semibold truncate">${esc(q.component)} • ${q.units}u • ${esc(q.area)} • ${timeAgo(q.createdAt)}</div></div>
<span class="text-[10px] font-black px-2 py-1 rounded-full ${q.status === 'Flagged' ? 'bg-amber-100 text-amber-700' : q.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-primaryLight text-primary'}">${q.status === 'Flagged' ? 'HELD' : esc(q.status).toUpperCase()}</span>
</button>`; }).join('');
  const live = requests.filter((q) => q.status !== 'Flagged' && q.status !== 'Completed').length;
  $('sosBadge').classList.toggle('hidden', !live);
  if (live) $('sosBadge').textContent = live;
}

/* ================= DONORS ================= */
function donorCard(d) {
  const flagged = d.flagged;
  return `<div class="bg-white border ${d.km != null && d.score != null ? 'border-red-100' : 'border-gray-100'} rounded-[20px] p-3 shadow-card ${flagged ? 'opacity-60' : ''}">
<div class="flex gap-3 items-center">
${avatarDiv(d, 'w-11 h-11 rounded-2xl text-[14px]')}
<div class="flex-1 min-w-0"><div class="flex items-center gap-1.5"><span class="font-extrabold text-[13.5px] truncate">${esc(d.name)}</span>${myDonorId === d.id ? '<span class="text-[10px] font-black bg-primary text-white px-1.5 py-0.5 rounded-full">YOU</span>' : ''}</div><div class="text-[11.5px] text-gray-500 font-semibold">${esc(d.area)}${d.km != null ? ' • ' + d.km + ' km away' : ''} • 🔒 via platform</div></div>
<span class="bg-primary text-white text-[12px] font-black px-2.5 py-1 rounded-full shrink-0">${esc(d.bloodGroup)}</span>
</div>
<div class="mt-2 flex items-center gap-1.5 flex-wrap">
${idPill(d, true)}
<span class="text-[10px] font-black px-2 py-0.5 rounded-full ${flagged ? 'bg-red-100 text-red-700' : d.cooldownDays ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}">${flagged ? 'FLAGGED' : d.cooldownDays ? 'Cooldown ' + d.cooldownDays + 'd' : 'Ready'}</span>
${d.alerted ? '<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">🔔 alerted</span>' : ''}${d.accepted ? '<span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-green-600 text-white">✓ accepted</span>' : ''}
<button data-action="report" data-type="donor" data-id="${esc(d.id)}" data-name="${esc(d.name)}" class="ml-auto text-[11px] font-extrabold text-primary bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">Report</button>
</div>${d.idUrl ? `<img src="${safeImageUrl(d.idUrl)}" class="mt-2 w-28 rounded-xl" alt="ID thumbnail (faces blurred)">` : ''}</div>`;
}

function renderDonors() {
  const my = myDonorId ? donors.find((d) => d.id === myDonorId) : null;
  const mw = $('myDonorWrap');
  if (!my) {
    mw.innerHTML = `<div class="rounded-[22px] bg-gradient-to-br from-primary to-primaryDark text-white p-5 shadow-red relative overflow-hidden"><div class="absolute inset-0 hero-dots opacity-40"></div><div class="relative"><h3 class="font-extrabold text-[17px]">You're not registered yet</h3><p class="text-[13px] text-white/80 font-medium mt-1">Register below to get SOS alerts and track cooldown.</p><div class="mt-3 flex items-center gap-2 text-[12px] font-bold"><span class="bg-white/15 border border-white/20 px-3 py-1.5 rounded-full">✓ Masked phone</span><span class="bg-white/15 border border-white/20 px-3 py-1.5 rounded-full">✓ Bank-only</span></div></div></div>`;
  } else {
    mw.innerHTML = `<div class="bg-white border-2 border-green-200 rounded-[22px] p-4 shadow-card">
<div class="flex gap-3 items-center">
${avatarDiv(my, 'w-14 h-14 rounded-2xl text-[18px]')}
<div class="flex-1 min-w-0"><div class="flex items-center gap-1.5"><span class="font-extrabold text-[15px] truncate">${esc(my.name)}</span>${idPill(my, true)}</div><div class="text-[12px] text-gray-500 font-semibold">${esc(my.bloodGroup)} • ${esc(my.area)} • number masked</div></div>
</div>
<div class="mt-3 bg-gray-50 rounded-2xl p-3">
<div class="flex justify-between items-center"><span class="text-[12px] font-extrabold">${my.cooldownDays ? 'In cooldown: ' + my.cooldownDays + 'd left (whole blood)' : 'Eligible to donate now'}</span><span class="text-[11px] font-black ${my.cooldownDays ? 'text-amber-600' : 'text-green-600'}">${my.cooldownDays ? '⏳ COOLDOWN' : '✓ ELIGIBLE'}</span></div>
<div class="mt-1.5 text-[11px] text-gray-500 font-semibold">Last donation: ${esc(my.lastDonation || 'never')} • Alerts arrive in the inbox below.</div>
</div></div>`;
  }
  // Donor picker for the alerts inbox (demo: view alerts as any registered donor)
  const sel = $('i-donor');
  const cur = sel.value;
  sel.innerHTML = donors.map((d) => `<option value="${esc(d.id)}">${esc(d.name)} (${esc(d.bloodGroup)}, ${esc(d.area)})</option>`).join('');
  if (my && donors.some((d) => d.id === myDonorId)) sel.value = myDonorId;
  else if (donors.some((d) => d.id === cur)) sel.value = cur;
  // Directory
  const groups = (cfg && cfg.groups) || [];
  const filters = ['All', ...groups];
  $('dirFilters').innerHTML = filters.map((f) => `<button data-action="dir-filter" data-f="${f}" class="shrink-0 px-3.5 py-2 rounded-full text-[12px] font-black border-2 transition ${dirFilter === f ? 'bg-primary text-white border-primary shadow-red' : 'bg-white border-gray-100 text-gray-600'}">${f}</button>`).join('');
  let list = [...donors].reverse();
  if (dirFilter !== 'All') list = list.filter((d) => d.bloodGroup === dirFilter);
  if (dirSearch) { const q = dirSearch.toLowerCase(); list = list.filter((d) => d.name.toLowerCase().includes(q) || d.area.toLowerCase().includes(q)); }
  $('dirCount').textContent = list.length + ' shown';
  $('dirList').innerHTML = list.map(donorCard).join('') || '<div class="text-center text-[13px] text-gray-500 font-semibold py-6">No donors match filters.</div>';
}
async function loadAlerts() {
  const id = $('i-donor').value; if (!id) return;
  const [a, rs] = await Promise.all([api('/alerts?donor=' + id), api('/requests')]);
  const unanswered = a.filter((x) => !x.accepted && x.status !== 'Flagged').length;
  $('inboxCount').textContent = a.length;
  $('inboxBadge').classList.toggle('hidden', !unanswered);
  if (unanswered) $('inboxBadge').textContent = unanswered;
  $('i-out').innerHTML = a.length ? a.map((x) => {
    const r = rs.find((q) => q.id === x.requestId);
    const msgs = r ? r.messages.filter((m) => !m.donorId || m.donorId === id) : [];
    const u2 = r ? urgStyle(r.urgency) : URGENCIES[1];
    return `<div class="bg-white border ${x.accepted ? 'border-gray-100' : 'border-red-200 shadow-red'} rounded-[20px] p-3">
<div class="flex gap-3 items-center">
<span class="w-12 h-12 rounded-2xl bg-primary text-white font-black flex items-center justify-center text-[14px] shrink-0">${r ? esc(r.bloodGroup) : '🩸'}</span>
<div class="flex-1 min-w-0"><div class="font-extrabold text-[13.5px] truncate">🔔 ${esc(x.text)}</div><div class="text-[11.5px] text-gray-500 font-semibold truncate">${new Date(x.at).toLocaleString()} · ${esc(x.requestId)} · requester contact hidden</div></div>
<span class="text-[10px] font-black px-2 py-1 rounded-full ${u2.bg} border shrink-0">${esc(u2.n).toUpperCase()}</span>
</div>
${msgs.map((m) => `<div class="mt-1.5 flex ${m.from === 'donor' ? 'justify-end' : 'justify-start'}"><div class="${m.from === 'donor' ? 'chat-bubble-me' : 'chat-bubble-them'} max-w-[85%] px-3 py-2 text-[12px] font-semibold">${esc(m.text)}${m.warn ? ' <span class="block text-[10px] font-black text-amber-200">⚠ money mentioned - donation is never paid</span>' : ''}</div></div>`).join('')}
${x.accepted
  ? `<div class="mt-2 grid grid-cols-[1fr_auto] gap-2"><button data-action="contact" data-req="${esc(x.requestId)}" data-donor="${esc(id)}" data-as="donor" class="bg-gray-900 hover:bg-black text-white font-extrabold py-2.5 rounded-xl text-[13px] transition">💬 Reply via platform</button><button data-action="report" data-type="request" data-id="${esc(x.requestId)}" data-name="${esc(x.requestId)}" class="bg-red-50 text-primary border border-red-100 font-extrabold text-[12px] px-3 rounded-xl">Report</button></div><div class="mt-1.5 text-center text-[12px] font-extrabold text-green-600">✓ You accepted</div>`
  : x.status === 'Flagged' ? '<div class="mt-2 text-center text-[12px] font-extrabold text-amber-600">Held for review</div>'
  : `<div class="mt-2.5 grid grid-cols-[1fr_auto] gap-2"><button data-action="inbox-accept" data-id="${esc(x.requestId)}" data-donor="${esc(id)}" class="bg-green-600 hover:bg-green-700 text-white font-extrabold py-2.5 rounded-xl text-[13px] transition">I can donate</button><button data-action="report" data-type="request" data-id="${esc(x.requestId)}" data-name="${esc(x.requestId)}" class="bg-red-50 text-primary border border-red-100 font-extrabold text-[12px] px-3 rounded-xl">Report</button></div>`}
</div>`;
  }).join('') : '<div class="bg-green-50 border border-green-200 rounded-2xl p-4 text-center"><div class="font-extrabold text-[13px] text-green-800">All clear - no alerts for this donor yet</div><div class="text-[12px] text-green-700 font-medium">Compatible SOS alerts will appear here.</div></div>';
}

/* ================= SAFETY ================= */
function renderSafety() {
  const flagged = requests.filter((q) => q.status === 'Flagged');
  $('statChecks').textContent = requests.filter((q) => q.status !== 'Flagged' && q.status !== 'Completed').length;
  $('statHeld').textContent = flagged.length;
  $('statPending').textContent = donors.length;
  $('safeBadge').classList.toggle('hidden', !flagged.length);
  if (flagged.length) $('safeBadge').textContent = flagged.length;
  $('repReasons').innerHTML = REASONS.map((r) => `<button data-rreason="${r}" class="rreasonBtn text-[11.5px] font-extrabold px-2 py-2.5 rounded-xl border-2 transition ${repReason === r ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100 text-gray-600'}">${r}</button>`).join('');
  fillReportTargets();
  const q = $('adminQueue');
  q.innerHTML = flagged.length ? flagged.map((r) => `<div class="bg-white border border-amber-200 rounded-[20px] p-3 shadow-card">
<div class="flex items-center gap-2"><span class="text-[10px] font-black bg-gray-900 text-white px-2 py-1 rounded-full font-mono">${esc(r.id)}</span><span class="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-full">HELD</span><span class="ml-auto text-[10.5px] text-gray-500 font-bold">${timeAgo(r.createdAt)}</span></div>
<div class="mt-1.5 font-extrabold text-[13.5px]">${esc(r.patient)} <span class="text-primary">• ${esc(r.bloodGroup)} ${esc(r.component)}</span></div>
<div class="text-[12px] text-gray-500 font-medium leading-snug">${(r.flags || []).map(escapeHtml).join('; ') || 'Reported by users.'}</div>
<div class="mt-2.5"><button data-action="clear-req" data-id="${esc(r.id)}" class="w-full bg-green-600 text-white font-extrabold py-2.5 rounded-xl text-[13px]">✓ Reviewer: clear request</button></div>
</div>`).join('') : '<div class="bg-green-50 border border-green-200 rounded-2xl p-4 text-center text-[13px] font-bold text-green-700">✓ Queue clear. No held requests.</div>';
}
function fillReportTargets() {
  const t = $('rep_type').value; const sel = $('rep_target');
  if (t === 'donor') sel.innerHTML = donors.map((d) => `<option value="${esc(d.id)}">${esc(d.name)} • ${esc(d.bloodGroup)}</option>`).join('');
  else sel.innerHTML = requests.length ? requests.map((r) => `<option value="${esc(r.id)}">${esc(r.patient)} • ${esc(r.id)}</option>`).join('') : '<option value="">No requests yet</option>';
}
/* ================= CHAT ================= */
function openChat(reqId, donorId, as) {
  const r = requests.find((q) => q.id === reqId);
  const d = donors.find((x) => x.id === donorId) || (r && r.matches.find((x) => x.id === donorId));
  if (!r || !d) return;
  chatCtx = { requestId: reqId, donorId, as: as === 'donor' ? 'donor' : 'requester' };
  $('chatAvatar').textContent = initials(d.name);
  $('chatName').textContent = `${d.name} • ${d.bloodGroup}`;
  $('chatReportBtn').onclick = () => { closeChat(); openReport('donor', d.id, d.name); };
  $('quickReplies').innerHTML = ['Are you available today?', 'Which blood bank suits you?', 'What time can you come?', 'Thank you! 🙏'].map((q) => `<button data-action="quick" data-q="${esc(q)}" class="shrink-0 text-[12px] font-bold bg-white border-2 border-gray-100 hover:border-red-200 px-3 py-2 rounded-full transition">${esc(q)}</button>`).join('');
  renderChat();
  $('chatModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function renderChat() {
  const r = requests.find((q) => q.id === chatCtx.requestId);
  const box = $('chatMsgs');
  const msgs = (r ? r.messages : []).filter((m) => !m.donorId || m.donorId === chatCtx.donorId);
  const sys = `<div class="text-center"><span class="inline-block bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold px-3 py-2 rounded-2xl leading-snug">Connected for ${esc(chatCtx.requestId)}. Numbers masked. Meet only at authorized banks.</span></div>`;
  box.innerHTML = sys + msgs.map((m) => m.from === chatCtx.as
    ? `<div class="flex justify-end"><div class="chat-bubble-me max-w-[80%] px-3.5 py-2.5 text-[13px] font-semibold leading-snug">${esc(m.text)}${m.warn ? ' <span class="block mt-1 text-[10px] font-black text-amber-200">⚠ money mentioned - donation is never paid</span>' : ''}<div class="text-[10px] opacity-70 font-bold mt-0.5 text-right">${fmtTime(m.at)}</div></div></div>`
    : `<div class="flex justify-start"><div class="chat-bubble-them max-w-[80%] px-3.5 py-2.5 text-[13px] font-semibold leading-snug">${esc(m.text)}${m.warn ? ' <span class="block mt-1 text-[10px] font-black text-amber-600">⚠ money mentioned - donation is never paid</span>' : ''}<div class="text-[10px] text-gray-500 font-bold mt-0.5">${fmtTime(m.at)}</div></div></div>`).join('');
  box.scrollTop = box.scrollHeight;
}
async function sendChat(text) {
  text = (text ?? $('chatInput').value).trim(); if (!text) return;
  try {
    await post(`/requests/${chatCtx.requestId}/message`, { text, donorId: chatCtx.donorId, from: chatCtx.as });
    $('chatInput').value = '';
    await refreshRequests();
    renderChat(); renderAll();
  } catch (e) { toast(e.message, 'err'); }
}
function closeChat() { $('chatModal').classList.add('hidden'); document.body.style.overflow = ''; }

/* ================= REPORT ================= */
function openReport(type, id, name) {
  rmCtx = { type, id, name }; rmReason = 'asked for money';
  $('rmTarget').textContent = name;
  $('rmDetails').value = '';
  $('rmReasons').innerHTML = REASONS.map((r) => `<button data-rmr="${r}" class="rmrBtn text-[12px] font-extrabold px-2 py-3 rounded-xl border-2 ${r === rmReason ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100 text-gray-600'}">${r}</button>`).join('');
  $('reportModal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
async function submitReport(kind, id, reason, details) {
  const r = await post('/reports', { kind, id, reason: details ? reason + ': ' + details.slice(0, 200) : reason });
  toast(r.flagged ? 'Thanks - this is now flagged and removed from matching.' : 'Thanks - reported. One more report auto-flags it.', 'good');
  await refreshAll();
  renderAll();
}
async function submitQuickReport() {
  $('reportModal').classList.add('hidden'); document.body.style.overflow = '';
  await submitReport(rmCtx.type, rmCtx.id, rmReason, $('rmDetails').value.trim());
}

/* ================= ACTIONS ================= */
async function doAction(fn) { try { await fn(); } catch (e) { toast(e.message, 'err'); } }
function bindActions() {
  document.addEventListener('click', (e) => {
    const bg = e.target.closest('[data-bg]'); if (bg) { selBlood = bg.dataset.bg; renderSosForm(); return; }
    const nd = e.target.closest('[data-need]'); if (nd) { selNeed = nd.dataset.need; renderSosForm(); return; }
    const ug = e.target.closest('[data-urg]'); if (ug) { selUrg = ug.dataset.urg; renderSosForm(); return; }
    const rb = e.target.closest('[data-rbg]'); if (rb) { regBlood = rb.dataset.rbg; renderSosForm(); return; }
    const rr = e.target.closest('[data-rreason]'); if (rr) { repReason = rr.dataset.rreason; renderSafety(); return; }
    const mr = e.target.closest('[data-rmr]'); if (mr) { rmReason = mr.dataset.rmr; $('rmReasons').querySelectorAll('.rmrBtn').forEach((b) => { const on = b.dataset.rmr === rmReason; b.className = `rmrBtn text-[12px] font-extrabold px-2 py-3 rounded-xl border-2 ${on ? 'bg-primary text-white border-primary' : 'bg-white border-gray-100 text-gray-600'}`; }); return; }
    const b = e.target.closest('[data-action]'); if (!b) return;
    const a = b.dataset.action;
    if (a === 'tab') switchTab(b.dataset.tab);
    else if (a === 'goto-sos') switchTab('sos');
    else if (a === 'goto-donors') switchTab('donors');
    else if (a === 'goto-safety') switchTab('safety');
    else if (a === 'contact') openChat(b.dataset.req, b.dataset.donor, b.dataset.as);
    else if (a === 'chat-close') closeChat();
    else if (a === 'chat-send') sendChat();
    else if (a === 'quick') sendChat(b.dataset.q);
    else if (a === 'report') openReport(b.dataset.type, b.dataset.id, b.dataset.name);
    else if (a === 'report-close') { $('reportModal').classList.add('hidden'); document.body.style.overflow = ''; }
    else if (a === 'report-submit') doAction(submitQuickReport);
    else if (a === 'escalate') doAction(async () => { await post(`/requests/${b.dataset.id}/escalate`, {}); await refreshRequests(); renderAll(); toast('Radius doubled - more demo donors alerted in-app (blood banks: simulated only)', 'good'); });
    else if (a === 'status') doAction(async () => { await post(`/requests/${b.dataset.id}/status`, { status: b.dataset.to }); await refreshRequests(); renderAll(); toast('Tracker updated: ' + b.dataset.to, 'good'); });
    else if (a === 'clear-req') doAction(async () => { await post(`/requests/${b.dataset.id}/clear`, {}); await refreshRequests(); renderAll(); toast('Request cleared - matching resumed', 'good'); });
    else if (a === 'new-sos') { activeRequestId = null; renderAll(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (a === 'view-req') { activeRequestId = b.dataset.id; renderAll(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    else if (a === 'pa-pick') { paSel[b.dataset.req] = +b.dataset.i || 0; renderSOS(); }
    else if (a === 'copy-id') { if (navigator.clipboard) navigator.clipboard.writeText(b.dataset.id); toast('ID copied: ' + b.dataset.id); }
    else if (a === 'inbox-accept') doAction(async () => { await post(`/requests/${b.dataset.id}/accept`, { donorId: b.dataset.donor }); await refreshRequests(); await loadAlerts(); renderAll(); toast('Accepted - patient notified', 'good'); });
    else if (a === 'dir-filter') { dirFilter = b.dataset.f; renderDonors(); }
  });
}
/* ================= DATA + INIT ================= */
async function refreshRequests() { requests = await api('/requests'); }
async function refreshAll() {
  const [ds, rs] = await Promise.all([api('/donors'), api('/requests')]);
  donors = ds; requests = rs;
}
function switchTab(t) {
  activeTab = t; store.set('bn_tab', t);
  ['home', 'sos', 'donors', 'safety'].forEach((k) => $('panel-' + k).classList.toggle('hidden', k !== t));
  document.querySelectorAll('.navBtn').forEach((b) => b.classList.toggle('nav-active', b.dataset.tab === t));
  if (t === 'donors') loadAlerts().catch(() => {});
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderAll() {
  renderHome(); renderSosForm(); renderSOS(); renderDonors(); renderSafety();
  document.querySelectorAll('.navBtn').forEach((x) => x.classList.toggle('nav-active', x.dataset.tab === activeTab));
}

// Real govt blood bank directory (static data, directory only).
let bbDistricts = [];
async function loadBanks() {
  try {
    const d = $('bbDistrict').value, q = $('bbSearch').value.trim();
    const r = await api('/blood-banks?district=' + encodeURIComponent(d) + '&q=' + encodeURIComponent(q));
    if (!bbDistricts.length) {
      bbDistricts = r.districts;
      $('bbDistrict').innerHTML = '<option value="">All districts</option>' + r.districts.map((x) => '<option value="' + esc(x) + '"' + (x === 'Hyderabad' ? ' selected' : '') + '>' + esc(x) + '</option>').join('');
      return loadBanks();
    }
    $('bbCount').textContent = r.total + ' found' + (r.total > r.banks.length ? ' (showing ' + r.banks.length + ')' : '');
    $('bbList').innerHTML = r.banks.map((b) => '<div class="border border-gray-100 rounded-2xl p-3"><div class="font-extrabold text-[13px]">' + esc(b.name) + '</div><div class="text-[11.5px] text-gray-600 font-medium mt-0.5">' + esc([b.address, b.pincode].filter(Boolean).join(', ')) + '</div><div class="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">' + (b.category ? '<span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">' + esc(b.category) + '</span>' : '') + (b.service ? '<span class="bg-green-50 text-green-700 px-2 py-0.5 rounded-full">' + esc(b.service) + '</span>' : '') + (b.phone ? '<a class="text-primary underline" href="tel:' + esc(b.phone.replace(/[^0-9+]/g, '')) + '">' + esc(b.phone) + '</a>' : '<span class="text-gray-500">No number listed</span>') + '</div></div>').join('') || '<div class="text-center text-[13px] text-gray-500 font-semibold py-4">No blood banks match.</div>';
  } catch (e) { $('bbCount').textContent = ''; $('bbList').innerHTML = '<div class="text-[12px] text-gray-500 font-semibold">Directory could not load. Try again later.</div>'; }
}
async function init() {
  cfg = await api('/config');
  loadBanks();
  $('bbDistrict').onchange = loadBanks;
  let bbT; $('bbSearch').oninput = () => { clearTimeout(bbT); bbT = setTimeout(loadBanks, 250); };
  await refreshAll();
  if (myDonorId && !donors.some((d) => d.id === myDonorId)) { myDonorId = null; store.set('bn_myDonor', ''); }
  bindActions();
  $('unitsMinus').onclick = () => { units = Math.max(1, units - 1); $('unitsVal').textContent = units; };
  $('unitsPlus').onclick = () => { units = Math.min(10, units + 1); $('unitsVal').textContent = units; };
  $('sosSubmit').onclick = () => doAction(submitSOS);
  $('newSosBtn').onclick = () => { activeRequestId = null; renderAll(); };
  $('demoFillBtn').onclick = () => {
    activeRequestId = null;
    $('f_patient').value = 'Lakshmi Rao'; $('f_phone').value = '9848012345';
    selBlood = 'B+'; selNeed = 'Whole blood'; units = 2;
    $('f_area').value = (cfg.areas || [])[0] || ''; selUrg = 'critical';
    $('f_hospital').value = 'Apollo Hospitals, Jubilee Hills';
    $('f_notes').value = 'ICU, need attender coordination.';
    renderAll();
    toast('Demo case filled - tap Find donors', 'ok');
  };
  $('regSubmit').onclick = () => doAction(async () => {
    const name = $('r_name').value.trim();
    if (!name) { toast('Enter your name', 'err'); return; }
    const phone = $('r_phone').value.trim();
    if (!/^\d{10}$/.test(phone)) { toast('Enter a 10-digit mobile number', 'err'); return; }
    const d = await post('/donors', { name, phone, bloodGroup: regBlood, area: $('r_area').value, lastDonation: $('r_lastDate').value || null, idImage: await fileToUri($('r_file').files[0]) });
    myDonorId = d.id; store.set('bn_myDonor', d.id);
    $('r_name').value = ''; $('r_phone').value = ''; $('r_lastDate').value = ''; $('r_file').value = '';
    await refreshAll(); renderAll();
    toast('Welcome, ' + name.split(' ')[0] + '! Registered' + (d.idUploaded ? ' - ID stored privately (not verified).' : '.'), 'good');
  });
  $('dirSearch').addEventListener('input', (e) => { dirSearch = e.target.value; renderDonors(); });
  $('rep_type').onchange = fillReportTargets;
  $('repSubmit').onclick = () => doAction(async () => {
    const t = $('rep_type').value, id = $('rep_target').value;
    if (!id) { toast('No target to report', 'err'); return; }
    await submitReport(t, id, repReason, $('rep_details').value.trim());
    $('rep_details').value = '';
  });
  $('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
  $('i-donor').onchange = () => loadAlerts().catch(() => {});
  renderAll();
  switchTab(store.get('bn_tab') || 'home');
  loadAlerts().catch(() => {});
  setInterval(async () => { try { await refreshAll(); renderAll(); if (!$('chatModal').classList.contains('hidden')) renderChat(); if (activeTab === 'donors') loadAlerts().catch(() => {}); } catch (e) {} }, 15000);
  if (!welcomed) { welcomed = true; setTimeout(() => toast('Welcome to Blood Network Hyderabad', 'ok'), 600); }
}
const hideBoot = () => { const b = document.getElementById('bootLoader'); if (b) { b.style.opacity = '0'; setTimeout(() => b.remove(), 300); } };
init().then(() => { if (location.hash === '#sos') switchTab('sos'); }).catch((e) => toast((e && e.message) || 'Could not load. Please retry.', 'err')).finally(hideBoot);
setTimeout(hideBoot, 20000);
