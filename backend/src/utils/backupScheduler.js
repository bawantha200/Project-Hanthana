// backend/src/utils/backupScheduler.js
const cron = require('node-cron');
const supabase = require('../config/db');
const { runBackup } = require('../services/backupService');

let currentTask = null;

const FREQUENCY_TO_CRON = {
  hourly: '0 * * * *',      // hæම hour ekakama
  daily: '0 2 * * *',       // hæම dawasakama 2 AM
  weekly: '0 2 * * 0',      // hæම irida 2 AM
};

async function initBackupScheduler() {
  const { data } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'system')
    .maybeSingle();

  const settings = data?.value || {};
  scheduleBackup(settings.autoBackup, settings.backupFrequency || 'daily');
}

function scheduleBackup(enabled, frequency) {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }

  if (!enabled) {
    console.log('🗄️ [backupScheduler] Auto backup disabled.');
    return;
  }

  const cronExpr = FREQUENCY_TO_CRON[frequency] || FREQUENCY_TO_CRON.daily;
  currentTask = cron.schedule(cronExpr, () => {
    runBackup().catch((err) => console.error('❌ [backupScheduler] Backup failed:', err.message));
  });

  console.log(`🗄️ [backupScheduler] Scheduled auto backup: ${frequency} (${cronExpr})`);
}

module.exports = { initBackupScheduler, scheduleBackup };