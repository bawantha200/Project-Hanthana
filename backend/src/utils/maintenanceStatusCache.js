// backend/src/utils/maintenanceStatusCache.js
const supabase = require('../config/db');

const CACHE_TTL_MS = 5000; // 5 seconds — request rate එකට reasonable balance එකක්

let cachedStatus = { maintenanceMode: false, maintenanceMessage: '' };
let cachedAt = 0;

async function getMaintenanceStatus() {
  const now = Date.now();
  if (now - cachedAt < CACHE_TTL_MS) {
    return cachedStatus;
  }

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'system')
      .maybeSingle();

    if (error) {
      console.error('❌ [maintenanceStatusCache] Fetch error:', error.message);
      return cachedStatus; // stale cache එකම return කරනවා, request block වෙන්න එපා
    }

    cachedStatus = {
      maintenanceMode: data?.value?.maintenanceMode === true,
      maintenanceMessage: data?.value?.maintenanceMessage || '',
    };
    cachedAt = now;
  } catch (err) {
    console.error('💥 [maintenanceStatusCache] Unexpected error:', err);
  }

  return cachedStatus;
}

/** Toggle කරද්දී, ඊළඟ request එකේම අලුත් value එක පේන්න cache එක invalidate කරනවා */
function invalidateCache() {
  cachedAt = 0;
}

module.exports = { getMaintenanceStatus, invalidateCache };