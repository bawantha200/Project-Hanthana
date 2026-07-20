// backend/src/services/backupService.js
const supabase = require('../config/db');
const fs = require('fs');
const path = require('path');

const TABLES_TO_BACKUP = ['orders', 'order_items', 'users', 'products', 'payments', 'notifications'];

async function runBackup() {
  console.log('🗄️ [backupService] Starting backup...');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupData = {};

  for (const table of TABLES_TO_BACKUP) {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`❌ [backupService] Failed to backup ${table}:`, error.message);
      continue;
    }
    backupData[table] = data;
  }

  const fileName = `backup-${timestamp}.json`;
  const filePath = path.join(__dirname, '../../backups', fileName);

  // backups folder eka nathnam create karanna
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2));

  console.log(`✅ [backupService] Backup saved: ${fileName}`);

  // Optional: Supabase Storage bucket ekata upload karanna (production ekata recommend)
  // await uploadToStorage(fileName, backupData);

  return fileName;
}

module.exports = { runBackup };