// backend/src/jobs/inventoryReminderJob.js
const cron = require('node-cron');
const { checkAllLowStock } = require('../utils/lowStockAlert');

/**
 * Daily safety-net scan — event-driven alerts (checkAndAlertLowStock, called
 * from inventoryService.updateInventoryStock) handle the common case, but
 * this catches anything that slipped through (e.g. stock edited directly in
 * the DB without going through the service layer).
 */
function startInventoryReminderJob() {
  // හැම දිනකම උදේ 8:00ට run වෙනවා
  cron.schedule('0 8 * * *', checkAllLowStock);
  console.log('⏰ [inventoryReminderJob] Scheduled (runs daily at 8:00 AM).');
}

module.exports = { startInventoryReminderJob };