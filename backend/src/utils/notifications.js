// backend/utils/notifications.js
const nodemailer = require('nodemailer');
const supabase  = require("../config/db");

let transporter = null;
const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false, // TLS (port 587) - true නම් port 465 ඕන
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
};

/**
 * @param {'orderAlerts'|'deliveryUpdates'} settingsKey - notificationSettings table එකේ toggle key එක
 * @param {'order'|'delivery'} type - notification type
 * @param {string} message - display message එක
 * @param {string|null} relatedOrderId
 * @param {string} targetRole - 'ADMIN' | 'STAFF' | 'ALL'
 */
async function notifyOrderEvent({ settingsKey, type, message, relatedOrderId = null, targetRole = 'ALL' }) {
  try {
    // 1️⃣ Settings check කරන්න - toggle එක off නම් කිසිම එකක් යවන්නෙ නෑ
    const { data: notifSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'notifications')
      .maybeSingle();

    const settings = notifSetting?.value || {};
    const alertEnabled = settings[settingsKey] !== false; // default true
    if (!alertEnabled) return;

    const { error: insertError } = await supabase.from('notifications').insert({
  target_role: targetRole,
  type,
  message,
  related_order_id: relatedOrderId,
});

if (insertError) {
  console.error('Notification insert error:', insertError);
}

    // 3️⃣ Email channel toggle එකත් on නම් විතරක් email යවනවා
    if (settings.emailNotifications !== false) {
      await sendNotificationEmails({ targetRole, subject: message, message });
    }
  } catch (err) {
    // Notification fail වුනාට order creation එකම fail වෙන්න එපා - log කරලා swallow කරනවා
    console.error('notifyOrderEvent error:', err);
  }
}

/**
 * targetRole ට match වෙන profiles ටික email ලබන්න
 */
async function sendNotificationEmails({ targetRole, subject, message }) {
  try {
    let query = supabase
      .from('profiles')
      .select('email, role_id ( role_name )');

    const { data: profiles, error } = await query;
    if (error || !profiles) return;

    const recipients = profiles
      .filter((p) => {
        const roleName = p.role_id?.role_name?.toUpperCase();
        return targetRole === 'ALL' || roleName === targetRole;
      })
      .map((p) => p.email)
      .filter(Boolean);

    if (recipients.length === 0) return;

    const mailer = getTransporter();
    await mailer.sendMail({
      from: process.env.SMTP_FROM,
      to: recipients.join(','),
      subject: `Hanthana Water - ${subject}`,
      text: message,
      html: `<p>${message}</p>`,
    });
  } catch (err) {
    console.error('sendNotificationEmails error:', err);
  }
}

module.exports = { notifyOrderEvent };