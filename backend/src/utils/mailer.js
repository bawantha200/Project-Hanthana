// backend/src/utils/mailer.js
const nodemailer = require('nodemailer');
const supabase = require('../config/db');

/**
 * SMTP transporter — configured entirely from environment variables so no
 * credentials live in source control.
 *
 * Required .env keys:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_SECURE=false          // true for port 465, false for 587/25
 *   SMTP_USER=your@email.com
 *   SMTP_PASS=your-app-password
 *   SMTP_FROM_EMAIL=no-reply@hanthana.com
 *   SMTP_FROM_NAME=Hanthana Water
 *
 * If Gmail: use an App Password (not your normal password) —
 * https://myaccount.google.com/apppasswords
 */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    console.warn(
      '⚠️ [mailer] SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS not fully set in .env — email sending disabled.'
    );
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for others
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

/**
 * Wraps a plain message (with \n line breaks already converted to <br>)
 * in a simple branded HTML shell: logo header, divider, message body.
 * Set EMAIL_LOGO_URL in .env to a public image URL (e.g. a Supabase
 * Storage public bucket link) to show your logo at the top of every email.
 */
function buildBrandedHtml(bodyHtml) {
  const logoUrl = process.env.EMAIL_LOGO_URL;
  const brandName = process.env.SMTP_FROM_NAME || 'Hanthana Water';

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${brandName}" width="48" height="48" style="display:block; width:48px; height:48px; object-fit:contain;" />`
    : `<span style="font-size: 18px; font-weight: bold; color: #1d4ed8;">${brandName}</span>`;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding: 24px 24px 16px 24px;">
        <tr>
          <td style="width: 48px; vertical-align: middle;">
            ${logoBlock}
          </td>
          <td style="vertical-align: middle; padding-left: 10px; font-size: 15px; font-weight: 600; color: #1f2937;">
            ${brandName}
          </td>
        </tr>
      </table>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 0;" />
      <div style="padding: 24px; line-height: 1.6;">
        ${bodyHtml}
      </div>
    </div>
  `;
}

/**
 * Resolves a comma-separated targetRole string (e.g. "CASHIER,ADMIN", "DELIVERY",
 * or "ALL") into a list of staff email addresses from the `profiles`/`roles`
 * tables. Customers (in the `users` table) are intentionally excluded — this
 * is for staff-facing operational alerts only.
 */
async function resolveRecipientEmails(targetRole) {
  let query = supabase
    .from('profiles')
    .select('email, roles ( role_name )')
    .not('email', 'is', null);

  if (targetRole && targetRole !== 'ALL') {
    const roleNames = targetRole.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean);
    if (roleNames.length > 0) {
      query = query.in('roles.role_name', roleNames);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('❌ [mailer] Failed to resolve recipient emails:', error.message);
    return [];
  }

  // Supabase's .in() on a joined table can still return rows where the join
  // didn't match the filter (depending on join type), so filter defensively
  // in JS as well.
  const roleNames = targetRole && targetRole !== 'ALL'
    ? targetRole.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean)
    : null;

  const emails = (data || [])
    .filter((row) => {
      if (!roleNames) return true; // targetRole === 'ALL'
      return roleNames.includes((row.roles?.role_name || '').toUpperCase());
    })
    .map((row) => row.email)
    .filter(Boolean);

  // De-duplicate in case someone holds multiple matching roles.
  return [...new Set(emails)];
}

/**
 * Sends a notification email to every staff member matching targetRole.
 * Silently no-ops (with a console warning) if SMTP isn't configured, or if
 * no matching recipients are found — callers should treat this as
 * best-effort and never let it block the main request flow.
 */
async function sendNotificationEmails({ targetRole = 'ALL', subject, message }) {
  const activeTransporter = getTransporter();
  if (!activeTransporter) return;

  const recipients = await resolveRecipientEmails(targetRole);
  if (recipients.length === 0) {
    console.warn(`⚠️ [mailer] No recipient emails found for targetRole="${targetRole}" — skipping send.`);
    return;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Hanthana Water';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  try {
    await activeTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: recipients.join(','),
      subject: subject || 'Hanthana Notification',
      text: message,
      html: buildBrandedHtml(`<p>${message.replace(/\n/g, '<br>')}</p>`),
    });
    console.log(`📧 [mailer] Sent notification email to ${recipients.length} recipient(s).`);
  } catch (err) {
    console.error('❌ [mailer] Failed to send notification email:', err.message);
  }
}


async function sendOrderConfirmationEmail({ customerEmail, subject, message }) {
  const activeTransporter = getTransporter();
  if (!activeTransporter || !customerEmail) return;

  const fromName = process.env.SMTP_FROM_NAME || 'Hanthana Water';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  try {
    await activeTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: customerEmail,
      subject: subject || 'Order Confirmation',
      text: message,
      html: buildBrandedHtml(`<p>${message.replace(/\n/g, '<br>')}</p>`),
    });
    console.log(`📧 [mailer] Sent order confirmation to ${customerEmail}`);
  } catch (err) {
    console.error('❌ [mailer] Failed to send confirmation email:', err.message);
  }
}

async function sendBroadcastEmailToCustomers({ subject, message }) {
  const activeTransporter = getTransporter();
  if (!activeTransporter) return;

  const { data: customers, error } = await supabase
    .from('users')
    .select('email')
    .not('email', 'is', null);

  if (error) {
    console.error('❌ [mailer] Failed to fetch customer emails:', error.message);
    return;
  }

  const recipients = [...new Set((customers || []).map((c) => c.email).filter(Boolean))];

  if (recipients.length === 0) {
    console.warn('⚠️ [mailer] No customer emails found — skipping broadcast.');
    return;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Hanthana Water';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  try {
    await activeTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: fromEmail,
      bcc: recipients.join(','),
      subject: subject || 'Hanthana Water Notice',
      text: message,
      html: buildBrandedHtml(`<p>${message.replace(/\n/g, '<br>')}</p>`),
    });
    console.log(`📧 [mailer] Sent broadcast email to ${recipients.length} customer(s).`);
  } catch (err) {
    console.error('❌ [mailer] Failed to send broadcast email:', err.message);
  }
}

module.exports = {
  sendNotificationEmails,
  sendOrderConfirmationEmail,
  sendBroadcastEmailToCustomers,
};
