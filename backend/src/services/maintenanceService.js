// backend/src/services/maintenanceService.js
const supabase = require('../config/db');
const { broadcastMaintenanceNotice } = require('../utils/maintenanceNotify');

async function createMaintenanceWindow({ scheduledStart, scheduledEnd, message, createdBy }) {
  const { data, error } = await supabase
    .from('maintenance_windows')
    .insert({
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      message,
      created_by: createdBy || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create maintenance window: ${error.message}`);

  const formattedStart = new Date(scheduledStart).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' });
  const formattedEnd = new Date(scheduledEnd).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' });

  await broadcastMaintenanceNotice({
    subject: 'Upcoming System Maintenance',
    message: `${message} Scheduled maintenance window: ${formattedStart} to ${formattedEnd}. The system may be temporarily unavailable during this time.`,
  });

  return data;
}

async function getUpcomingMaintenanceWindows() {
  const { data, error } = await supabase
    .from('maintenance_windows')
    .select('*')
    .gte('scheduled_end', new Date().toISOString())
    .order('scheduled_start', { ascending: true });

  if (error) throw new Error(`Failed to fetch maintenance windows: ${error.message}`);
  return data || [];
}

async function checkAndSendMaintenanceReminders() {
  const now = Date.now();
  const oneHourFromNow = new Date(now + 60 * 60 * 1000).toISOString();
  const nowIso = new Date(now).toISOString();

  const { data: dueWindows, error } = await supabase
    .from('maintenance_windows')
    .select('*')
    .is('reminder_sent_at', null)
    .gte('scheduled_start', nowIso)
    .lte('scheduled_start', oneHourFromNow);

  if (error) {
    console.error('❌ [maintenanceService] Reminder query error:', error.message);
    return;
  }

  if (!dueWindows || dueWindows.length === 0) {
    console.log('✅ [maintenanceService] No maintenance windows due for a reminder.');
    return;
  }

  for (const window of dueWindows) {
    const formattedStart = new Date(window.scheduled_start).toLocaleString('en-LK', { timeZone: 'Asia/Colombo' });

    await broadcastMaintenanceNotice({
      subject: 'Reminder: System Maintenance Starting Soon',
      message: `Reminder: ${window.message} Maintenance starts at ${formattedStart} (within the next hour). The system may be temporarily unavailable.`,
    });

    const { error: updateError } = await supabase
      .from('maintenance_windows')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', window.id);

    if (updateError) {
      console.error(`❌ [maintenanceService] Failed to update reminder_sent_at for window #${window.id}:`, updateError.message);
    } else {
      console.log(`📧 [maintenanceService] Reminder sent for maintenance window #${window.id}.`);
    }
  }
}

module.exports = {
  createMaintenanceWindow,
  getUpcomingMaintenanceWindows,
  checkAndSendMaintenanceReminders,
};