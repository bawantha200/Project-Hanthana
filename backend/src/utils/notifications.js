const supabase = require('../config/db');
const { sendNotificationEmails, sendOrderConfirmationEmail } = require('./mailer'); // ✅ sendOrderConfirmationEmail add කරන්න
const { sendSMS } = require('./smsService');

async function notifyOrderEvent({
  settingsKey,
  type,
  message,
  relatedOrderId = null,
  targetRole = null,
  userId = null,
  customerPhone = null,
  customerEmail = null,   // ✅ 1. NEW param
}) {
  console.log('🔔 notifyOrderEvent called:', { type, message, targetRole, userId, customerPhone, customerEmail });
  try {
    const { data: notifSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'notifications')
      .maybeSingle();

    const settings = notifSetting?.value || {};
    const alertEnabled = settings[settingsKey] !== false;
    if (!alertEnabled) return;

    const normalizedTargetRole = userId ? null : (targetRole || 'ALL');

    const { error: insertError } = await supabase.from('notifications').insert({
      target_role: normalizedTargetRole,
      user_id: userId,
      type,
      message,
      related_order_id: relatedOrderId,
      read: false,
    });

    if (insertError) {
      console.error('Notification insert error:', insertError);
    }

    // Staff email (targetRole matched, e.g CASHIER/ADMIN)
    if (normalizedTargetRole && settings.emailNotifications !== false) {
      try {
        await sendNotificationEmails({ targetRole: normalizedTargetRole, subject: message, message });
      } catch (mailErr) {
        console.warn('Email notification skipped:', mailErr.message);
      }
    }

    // ✅ 2. Customer email — direct customerEmail eken send karanawa, targetRole eken NEMEI
    if (userId && customerEmail && settings.emailNotifications !== false) {
      try {
        await sendOrderConfirmationEmail({
          customerEmail,
          subject: message,
          message,
        });
      } catch (mailErr) {
        console.warn('Customer email notification skipped:', mailErr.message);
      }
    }

    // Customer SMS
    if (userId && customerPhone && settings.smsNotifications !== false) {
      try {
        await sendSMS({ toPhone: customerPhone, message });
      } catch (smsErr) {
        console.warn('SMS notification skipped:', smsErr.message);
      }
    }
  } catch (err) {
    console.error('notifyOrderEvent error:', err);
  }
}

module.exports = { notifyOrderEvent };