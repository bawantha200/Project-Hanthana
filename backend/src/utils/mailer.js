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

  const roleNames = targetRole && targetRole !== 'ALL'
    ? targetRole.split(',').map((r) => r.trim().toUpperCase()).filter(Boolean)
    : null;

  // ✅ Handle both shapes Supabase can return for the `roles` embed:
  //    - object:  { role_name: 'ADMIN' }
  //    - array:   [{ role_name: 'ADMIN' }]
  const getRoleName = (roles) => {
    if (!roles) return '';
    if (Array.isArray(roles)) return (roles[0]?.role_name || '').toUpperCase();
    return (roles.role_name || '').toUpperCase();
  };

  const emails = (data || [])
    .filter((row) => {
      if (!roleNames) return true; // targetRole === 'ALL'
      return roleNames.includes(getRoleName(row.roles));
    })
    .map((row) => row.email)
    .filter(Boolean);

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

/**
 * Send email change verification email to the new email address
 */
async function sendEmailChangeVerification({ 
  to, 
  newEmail, 
  oldEmail, 
  userName, 
  verificationLink,
  token 
}) {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    console.warn('⚠️ [mailer] SMTP not configured, cannot send verification email.');
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Hanthana Water';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  const htmlContent = `
    <h2 style="color: #1e3a8a; margin-top: 0;">Verify Your Email Change</h2>
    <p>Hello${userName ? ' ' + userName : ''},</p>
    <p>You requested to change the email address associated with your Hanthana Water account.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8fafc; border-radius: 8px;">
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #475569;">Current Email</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; color: #1e293b;">${oldEmail}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-weight: 600; color: #475569;">New Email</td>
        <td style="padding: 12px 16px; color: #1e293b; font-weight: 600; color: #2563eb;">${newEmail}</td>
      </tr>
    </table>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationLink}" 
         style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; 
                text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;
                box-shadow: 0 2px 4px rgba(37, 99, 235, 0.3);">
        Confirm Email Change
      </a>
    </div>
    
    <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <strong style="color: #92400e;">⏰ Important:</strong>
      <span style="color: #78350f;">This verification link will expire in <strong>24 hours</strong>.</span>
    </div>
    
    <div style="background: #dbeafe; padding: 16px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
      <strong style="color: #1e40af;">🔒 Security Notice:</strong>
      <span style="color: #1e3a8a;">If you did not request this change, please ignore this email and contact support.</span>
    </div>
    
    <p style="margin-top: 24px; color: #64748b; font-size: 14px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="word-break: break-all; color: #2563eb;">${verificationLink}</span>
    </p>
  `;

  try {
    await activeTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: 'Confirm Your Email Change - Hanthana Water',
      text: `Please confirm your email change by visiting: ${verificationLink}`,
      html: buildBrandedHtml(htmlContent),
    });
    console.log(`📧 [mailer] Sent email change verification to ${to}`);
    return true;
  } catch (err) {
    console.error('❌ [mailer] Failed to send verification email:', err.message);
    return false;
  }
}

/**
 * Send email change confirmation email (after successful verification)
 */
async function sendEmailChangeConfirmation({ to, newEmail, userName }) {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    console.warn('⚠️ [mailer] SMTP not configured, cannot send confirmation email.');
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Hanthana Water';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  const htmlContent = `
    <h2 style="color: #16a34a; margin-top: 0;">✅ Email Changed Successfully</h2>
    <p>Hello${userName ? ' ' + userName : ''},</p>
    <p>Your email address has been successfully changed.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f0fdf4; border-radius: 8px;">
      <tr>
        <td style="padding: 12px 16px; font-weight: 600; color: #166534;">New Email Address</td>
        <td style="padding: 12px 16px; color: #15803d; font-weight: 600;">${newEmail}</td>
      </tr>
    </table>
    
    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444; margin: 20px 0;">
      <strong style="color: #991b1b;">🔒 Important:</strong>
      <span style="color: #7f1d1d;">If you did not make this change, please contact support immediately.</span>
    </div>
    
    <p style="margin-top: 24px; color: #64748b; font-size: 14px;">
      You can now log in to your account using your new email address.
    </p>
  `;

  try {
    await activeTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: 'Email Changed Successfully - Hanthana Water',
      text: `Your email has been successfully changed to ${newEmail}`,
      html: buildBrandedHtml(htmlContent),
    });
    console.log(`📧 [mailer] Sent email change confirmation to ${to}`);
    return true;
  } catch (err) {
    console.error('❌ [mailer] Failed to send confirmation email:', err.message);
    return false;
  }
}

/**
 * Send notification to old email address when a change is requested
 */
async function sendOldEmailNotification({ to, newEmail, userName }) {
  const activeTransporter = getTransporter();
  if (!activeTransporter) {
    console.warn('⚠️ [mailer] SMTP not configured, cannot send notification email.');
    return false;
  }

  const fromName = process.env.SMTP_FROM_NAME || 'Hanthana Water';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;

  const htmlContent = `
    <h2 style="color: #d97706; margin-top: 0;">📧 Email Change Requested</h2>
    <p>Hello${userName ? ' ' + userName : ''},</p>
    <p>We received a request to change the email address associated with your account.</p>
    
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #fffbeb; border-radius: 8px;">
      <tr>
        <td style="padding: 12px 16px; font-weight: 600; color: #92400e;">New Email Requested</td>
        <td style="padding: 12px 16px; color: #d97706; font-weight: 600;">${newEmail}</td>
      </tr>
    </table>
    
    <div style="background: #fef3c7; padding: 16px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <strong style="color: #92400e;">⚠️ Did you request this?</strong>
      <span style="color: #78350f;">If not, please contact our support team immediately.</span>
    </div>
    
    <p style="margin-top: 24px; color: #64748b; font-size: 14px;">
      This is a notification email. No action is required on your part unless you did not make this request.
    </p>
  `;

  try {
    await activeTransporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: 'Email Change Requested - Hanthana Water',
      text: `A request was made to change your email to ${newEmail}`,
      html: buildBrandedHtml(htmlContent),
    });
    console.log(`📧 [mailer] Sent notification to old email ${to}`);
    return true;
  } catch (err) {
    console.error('❌ [mailer] Failed to send notification email:', err.message);
    return false;
  }
}


module.exports = {
  sendNotificationEmails,
  sendOrderConfirmationEmail,
  sendBroadcastEmailToCustomers,
  sendEmailChangeVerification,
  sendEmailChangeConfirmation,
  sendOldEmailNotification
};
