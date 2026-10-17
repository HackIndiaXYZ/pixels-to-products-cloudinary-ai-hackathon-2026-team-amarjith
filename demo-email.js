// Optional DEMO email alert via Resend (free tier). Off unless RESEND_API_KEY and DEMO_ALERT_EMAIL are set.
// It only ever emails DEMO_ALERT_EMAIL (the owner's own address). No donor or requester contact data is sent.
const enabled = () => Boolean(process.env.RESEND_API_KEY && process.env.DEMO_ALERT_EMAIL);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function build(r, count) {
  const line = `${r.urgency.toUpperCase()}: ${r.component} ${r.bloodGroup} needed in ${r.area}, ${count} donor(s) matched`;
  return {
    from: process.env.DEMO_ALERT_FROM || 'Blood Network Demo <onboarding@resend.dev>',
    to: [process.env.DEMO_ALERT_EMAIL],
    subject: '[DEMO] ' + line,
    html: `<p><b>DEMO alert, not a real emergency.</b></p><p>${esc(line)}</p><p>Sent only to the project owner to show how email alerts would work. No donor was contacted.</p>`,
  };
}

async function sendDemo(r, count) {
  if (!enabled()) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(build(r, count)),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch { return false; }
}
module.exports = { enabled, build, sendDemo };
