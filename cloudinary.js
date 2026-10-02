// Cloudinary helpers: signed uploads (server side) + delivery-URL transformations.
const crypto = require('crypto');
const CLOUD = process.env.CLOUDINARY_CLOUD_NAME || 'demo';
const KEY = process.env.CLOUDINARY_API_KEY;
const SECRET = process.env.CLOUDINARY_API_SECRET;
const LIVE = Boolean(process.env.CLOUDINARY_CLOUD_NAME && KEY && SECRET);

function sign(params) {
  const s = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(s + SECRET).digest('hex');
}

// Signed upload of a base64 data-URI. Returns { public_id, secure_url }.
async function upload(dataUri, folder, extra = {}) {
  if (!LIVE) return { demo: true, public_id: null, secure_url: dataUri };
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp, type: 'authenticated', ...extra }; // private: originals are not publicly fetchable
  const form = new FormData();
  form.append('file', dataUri);
  form.append('api_key', KEY);
  form.append('signature', sign(params));
  Object.entries(params).forEach(([k, v]) => form.append(k, v));
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error && json.error.message || 'Cloudinary upload failed');
  return { public_id: json.public_id, secure_url: json.secure_url };
}

const enc = (t) => encodeURIComponent(encodeURIComponent(t)).replace(/%2520/g, '%20');
const esc = (t) => encodeURIComponent(String(t).replace(/[,\/]/g, ' ')).replace(/%20/g, '%20');

// Auto-generated emergency request card: base image + text overlays, all in the URL.
function requestCardUrl(r) {
  const base = process.env.CARD_BASE_ID || 'sample'; // swap for a branded template in your own cloud
  const layers = [
    'w_900,h_520,c_fill,e_colorize:85,co_rgb:8b0000,q_auto,f_auto',
    `l_text:Arial_90_bold:${esc(r.bloodGroup)},co_white,g_west,x_60,y_-60`,
    `l_text:Arial_36_bold:${esc((r.component || 'Whole blood').toUpperCase())},co_white,g_west,x_300,y_-60`,
    `l_text:Arial_44_bold:BLOOD%20NEEDED%20-%20${esc(r.urgency.toUpperCase())},co_white,g_north_west,x_60,y_40`,
    `l_text:Arial_34:${esc(r.units + ' units | ' + r.area)},co_white,g_west,x_60,y_60`,
    `l_text:Arial_28:${esc('Patient: ' + r.patient + ' | ' + (r.hospital || 'Authorized blood bank'))},co_white,g_south_west,x_60,y_90`,
    `l_text:Arial_24:${esc('Contact via Blood Network - ID ' + r.id)},co_white,g_south_west,x_60,y_40`,
  ];
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${layers.join('/')}/${base}.jpg`;
}
// Medical report / ID thumbnails with automatic format + quality, faces blurred for privacy
function thumbUrl(publicId, { blurFaces = false } = {}) {
  if (!publicId) return null;
  const t = ['w_400,h_300,c_fill,q_auto,f_auto'];
  if (blurFaces) t.unshift('e_blur_faces:1200');
  // Private (type=authenticated) asset: delivery URL carries a signature, the raw original has no public URL.
  const path = `${t.join('/')}/${publicId}`;
  const sig = crypto.createHash('sha1').update(path + SECRET).digest('base64').replace(/\+/g, '-').replace(/\//g, '_').slice(0, 8);
  return `https://res.cloudinary.com/${CLOUD}/image/authenticated/s--${sig}--/${path}`;
}
module.exports = { CLOUD, LIVE, upload, requestCardUrl, thumbUrl };
