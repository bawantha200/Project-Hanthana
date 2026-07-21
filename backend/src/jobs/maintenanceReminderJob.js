// backend/src/jobs/maintenanceReminderJob.js
const cron = require('node-cron');
const { checkAndSendMaintenanceReminders } = require('../services/maintenanceService');

function startMaintenanceReminderJob() {
  cron.schedule('*/15 * * * *', checkAndSendMaintenanceReminders);
  console.log('⏰ [maintenanceReminderJob] Scheduled (runs every 15 minutes).');
}

module.exports = { startMaintenanceReminderJob };