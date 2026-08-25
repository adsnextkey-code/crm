const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const store = require('../store');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const OUTBOX_FILE = path.join(DATA_DIR, 'outbox.json');
const PROVIDER = (process.env.MAIL_PROVIDER || 'outbox').toLowerCase();
const FROM_EMAIL = process.env.MAIL_FROM || 'Agency CRM <crm@agency.com>';

// Linux hosting (cPanel/Hostinger etc.) ships a sendmail binary — the same
// thing PHP's mail() uses under the hood. No credentials required.
const SENDMAIL_PATHS = ['/usr/sbin/sendmail', '/usr/lib/sendmail', '/usr/bin/sendmail'];

const findSendmail = () => {
  for (const p of SENDMAIL_PATHS) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {}
  }
  return null;
};

const readOutbox = () => {
  try {
    return JSON.parse(fs.readFileSync(OUTBOX_FILE, 'utf8'));
  } catch {
    return [];
  }
};

const persistOutbox = (entries) => {
  fs.mkdirSync(path.dirname(OUTBOX_FILE), { recursive: true });
  const tmp = `${OUTBOX_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(entries, null, 2));
  fs.renameSync(tmp, OUTBOX_FILE);
};

const renderTemplate = (title, lines, actionText, appUrl) => `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1f2937">
  <div style="border-bottom:2px solid #4f46e5;padding-bottom:12px;margin-bottom:16px">
    <span style="font-size:18px;font-weight:700;color:#4f46e5">Agency CRM</span>
  </div>
  <h2 style="font-size:17px;margin:0 0 12px">${title}</h2>
  ${lines.map((l) => `<p style="font-size:14px;line-height:1.6;margin:6px 0"><strong>${l[0]}:</strong> ${l[1]}</p>`).join('')}
  ${
    appUrl
      ? `<p style="margin-top:20px"><a href="${appUrl}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600">${actionText || 'Open CRM'}</a></p>`
      : ''
  }
  <p style="font-size:11px;color:#9ca3af;margin-top:24px">This is an automated notification from Agency CRM.</p>
</div>`;

const sendViaResend = async (mail) => {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY missing for MAIL_PROVIDER=resend');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: mail.from,
      to: [mail.to],
      reply_to: mail.replyTo || undefined,
      subject: mail.subject,
      html: mail.html
    })
  });
  if (!res.ok) throw new Error(`Resend failed (${res.status})`);
  return res.json();
};

// PHP mail() equivalent — pipes a raw MIME message to the server's sendmail.
const sendViaSendmail = (mail) => {
  const bin = findSendmail();
  if (!bin) {
    throw new Error('sendmail binary not found on this server (works on Linux hosting, like PHP mail())');
  }
  const message = [
    `From: ${mail.from}`,
    `To: ${mail.to}`,
    mail.replyTo ? `Reply-To: ${mail.replyTo}` : null,
    `Subject: ${mail.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'X-Mailer: Agency-CRM-Contact-Handler',
    '',
    mail.html
  ]
    .filter(Boolean)
    .join('\r\n');
  const result = spawnSync(bin, ['-t', '-i'], { input: message, encoding: 'utf8', timeout: 15000 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || 'sendmail exited with an error');
};

/**
 * Contact handler: routes every notification email. No SMTP credentials needed.
 * - MAIL_PROVIDER=outbox (default): stores emails in data/outbox.json only.
 * - MAIL_PROVIDER=sendmail: delivers via the server's sendmail binary
 *   (same mechanism as PHP's mail() on cPanel/Linux hosting).
 * - MAIL_PROVIDER=resend: delivers via Resend API (needs RESEND_API_KEY).
 * Every entry is always logged to the outbox so managers keep an audit trail.
 */
const sendMail = async ({ to, actorEmail, actorName, subject, title, lines, actionText }) => {
  if (!to) return null;
  const fromAddress = FROM_EMAIL.match(/<(.+)>/)?.[1] || FROM_EMAIL;
  const from = actorName ? `Agency CRM — ${actorName} <${fromAddress}>` : FROM_EMAIL;
  const mail = {
    _id: crypto.randomUUID(),
    to,
    from,
    replyTo: actorEmail || undefined,
    subject,
    title,
    html: renderTemplate(title, lines, actionText, process.env.APP_URL),
    provider: PROVIDER,
    status: 'logged',
    createdAt: new Date().toISOString()
  };
  try {
    if (PROVIDER === 'resend') {
      await sendViaResend(mail);
      mail.status = 'sent';
    } else if (PROVIDER === 'sendmail') {
      sendViaSendmail(mail);
      mail.status = 'sent';
    }
  } catch (err) {
    mail.status = PROVIDER === 'outbox' ? 'logged' : 'failed';
    mail.error = err.message;
  }
  const outbox = readOutbox();
  outbox.unshift(mail);
  persistOutbox(outbox.slice(0, 500));
  return mail;
};

const userEmail = (userId) => {
  const user = store.findById('users', userId);
  return user ? user.email : null;
};

module.exports = { sendMail, userEmail, readOutbox };
