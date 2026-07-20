// backend/src/utils/maintenanceNotify.js
const supabase = require('../config/db');
const { sendNotificationEmails, sendBroadcastEmailToCustomers } = require('./mailer');

async function broadcastMaintenanceNotice({ subject, message }) {
  try {
    const { data: notifSetting, error: settingsError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'notifications')
      .maybeSingle();

    if (settingsError) {
      console.error('❌ [maintenanceNotify] Settings fetch error:', settingsError.message);
      return;
    }

    const settings = notifSetting?.value || {};

    if (settings.systemMaintenance === false) {
      console.log('📭 [maintenanceNotify] systemMaintenance toggle is OFF — skipping.');
      return;
    }

    const notificationMessage = `${subject}: ${message}`;
    const { error: insertError } = await supabase.from('notifications').insert({
      target_role: 'ALL',
      type: 'maintenance',
      message: notificationMessage,
      related_order_id: null,
      read: false,
      user_id: null,
    });

    if (insertError) {
      console.error('❌ [maintenanceNotify] Notification insert error:', insertError.message);
    }

    if (settings.emailNotifications === false) {
      console.log('📭 [maintenanceNotify] emailNotifications toggle is OFF — skipping emails.');
      return;
    }

    await sendNotificationEmails({ targetRole: 'CASHIER,ADMIN', subject, message: notificationMessage });
    await sendBroadcastEmailToCustomers({ subject, message: notificationMessage });
  } catch (err) {
    console.error('💥 [maintenanceNotify] Unexpected error:', err);
  }
}

module.exports = { broadcastMaintenanceNotice };