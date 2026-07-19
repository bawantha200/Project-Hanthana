// backend/src/jobs/paymentReminderJob.js
const cron = require('node-cron');
const supabase = require('../config/db');
const { sendOrderConfirmationEmail } = require('../utils/mailer');

// Reminder යැවීමට කලින් pending payment එකක් අවම වශයෙන් කොච්චර වේලාවක් ඉන්න ඕනද
const REMINDER_THRESHOLD_HOURS = 24;

// එකම order එකකට reminder emails දෙකක් අතර අවම gap එක (spam වළක්වන්න)
const REMINDER_COOLDOWN_HOURS = 24;

/**
 * PENDING payment status එකේ, threshold එකට වඩා පරණ, සහ
 * (reminder කලින් යවලා නැත්නම් හෝ cooldown එක ඉක්මවලා නම්) orders සොයාගෙන
 * customer ලාට reminder email එකක් යවනවා.
 */
async function checkAndSendPaymentReminders() {
  console.log('⏰ [paymentReminderJob] Running scheduled check...');

  try {
    // 1️⃣ Global settings toggles check කරනවා
    const { data: notifSetting, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'notifications')
      .maybeSingle();

    if (settingsError) {
      console.error('❌ [paymentReminderJob] Settings fetch error:', settingsError.message);
      return;
    }

    const settings = notifSetting?.value || {};

    if (settings.paymentReminders === false) {
      console.log('📭 [paymentReminderJob] paymentReminders toggle is OFF — skipping.');
      return;
    }
    if (settings.emailNotifications === false) {
      console.log('📭 [paymentReminderJob] emailNotifications toggle is OFF — skipping.');
      return;
    }

    // 2️⃣ Threshold එකට වඩා පරණ pending-payment orders සොයාගන්නවා
    const createdCutoff = new Date(
      Date.now() - REMINDER_THRESHOLD_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: pendingOrders, error: queryError } = await supabase
      .from('orders')
      .select('id, total_amount, created_at, last_reminder_sent_at, users ( email, name )')
      .eq('payment_status', 'PENDING')
      .neq('order_status', 'CANCELLED')
      .lt('created_at', createdCutoff);

    if (queryError) {
      console.error('❌ [paymentReminderJob] Query error:', queryError.message);
      return;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('✅ [paymentReminderJob] No pending payments older than threshold.');
      return;
    }

    // 3️⃣ Cooldown එක ඉක්මවපු orders විතරක් filter කරනවා
    const cooldownCutoff = Date.now() - REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000;

    const dueForReminder = pendingOrders.filter((order) => {
      if (!order.last_reminder_sent_at) return true; // කලින් reminder එකක් යැව්වේම නෑ
      return new Date(order.last_reminder_sent_at).getTime() < cooldownCutoff;
    });

    if (dueForReminder.length === 0) {
      console.log('✅ [paymentReminderJob] All pending orders are within cooldown — nothing to send.');
      return;
    }

    console.log(`📋 [paymentReminderJob] ${dueForReminder.length} order(s) due for a reminder.`);

    // 4️⃣ එක එක order එකට reminder email එකක් යවනවා, සහ last_reminder_sent_at update කරනවා
    for (const order of dueForReminder) {
      if (!order.users?.email) {
        console.warn(`⚠️ [paymentReminderJob] Order #${order.id} has no customer email — skipping.`);
        continue;
      }

      try {
        await sendOrderConfirmationEmail({
          customerEmail: order.users.email,
          subject: `Reminder: Payment Pending for Order #${order.id}`,
          message: `Hi ${order.users.name || 'Customer'}, your payment for Order #${order.id} (Rs. ${order.total_amount}) is still pending. Please complete your payment so we can process your order.`,
        });

        const { error: updateError } = await supabase
          .from('orders')
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq('id', order.id);

        if (updateError) {
          console.error(`❌ [paymentReminderJob] Failed to update last_reminder_sent_at for order #${order.id}:`, updateError.message);
        } else {
          console.log(`📧 [paymentReminderJob] Reminder sent + timestamp updated for order #${order.id}`);
        }
      } catch (mailErr) {
        // එක order එකක email fail වුණාට, ඉතුරු orders වලට reminder යැවීම නවත්තන්න එපා
        console.error(`❌ [paymentReminderJob] Failed to send reminder for order #${order.id}:`, mailErr.message);
      }
    }

    console.log('✅ [paymentReminderJob] Run complete.');
  } catch (err) {
    console.error('💥 [paymentReminderJob] Unexpected error:', err);
  }
}

/**
 * Cron schedule එක start කරනවා — default: හැම පැයකටම වරක් ('0 * * * *').
 * Testing එකට ඉක්මනින් trigger කරන්න ඕන නම්, schedule string එක
 * temporarily වෙනස් කරන්න (node-cron docs බලන්න).
 */
function startPaymentReminderJob() {
  cron.schedule('0 * * * *', checkAndSendPaymentReminders);
  console.log('⏰ [paymentReminderJob] Scheduled (runs hourly).');
}

module.exports = { startPaymentReminderJob, checkAndSendPaymentReminders };