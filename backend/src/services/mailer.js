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

const sendViaGmail = async (mail) => {
  const user = String(process.env.GMAIL_USER || process.env.MAIL_USER || 'qasim.nextkeytechnologies@gmail.com').trim();
  const pass = String(process.env.GMAIL_PASS || process.env.MAIL_PASS || '').replace(/\s+/g, '');
  if (!pass) {
    throw new Error('GMAIL_PASS (16-char Google App Password) missing in environment variables');
  }
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass }
  });
  console.log(`[Mailer] Dispatching email to: ${mail.to} via Gmail (${user})`);
  const info = await transporter.sendMail({
    from: `"Agency CRM" <${user}>`,
    to: mail.to,
    replyTo: mail.replyTo,
    subject: mail.subject,
    html: mail.html
  });
  console.log(`[Mailer] Email sent successfully! MessageId: ${info.messageId}`);
  return info;
};

/**
 * Contact handler: routes every notification email.
 * - MAIL_PROVIDER=gmail (or when GMAIL_PASS is set): delivers directly via your Gmail (e.g. qasim.nextkeytechnologies@gmail.com).
 * - MAIL_PROVIDER=sendmail: delivers via the server's sendmail binary (PHP mail() style).
 * - MAIL_PROVIDER=resend: delivers via Resend API (needs RESEND_API_KEY).
 * - MAIL_PROVIDER=outbox (default fallback): stores emails in data/outbox.json audit trail.
 */
const sendMail = async ({ to, actorEmail, actorName, subject, title, lines, actionText }) => {
  if (!to) return null;
  const userFrom = String(process.env.GMAIL_USER || 'qasim.nextkeytechnologies@gmail.com').trim();
  const fromAddress = FROM_EMAIL.match(/<(.+)>/)?.[1] || userFrom;
  const from = actorName ? `Agency CRM — ${actorName} <${fromAddress}>` : `"Agency CRM" <${fromAddress}>`;
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
    if (process.env.GMAIL_PASS || PROVIDER === 'gmail') {
      await sendViaGmail(mail);
      mail.status = 'sent';
      mail.provider = 'gmail';
    } else if (PROVIDER === 'resend') {
      await sendViaResend(mail);
      mail.status = 'sent';
    } else if (PROVIDER === 'sendmail') {
      sendViaSendmail(mail);
      mail.status = 'sent';
    }
  } catch (err) {
    console.error('[Mailer Error]:', err.message);
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
