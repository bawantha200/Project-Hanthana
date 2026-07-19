// backend/src/utils/auditLogger.js
const supabase = require('../config/db');

const logAction = async (userId, action, details = {}, req = null) => {
  try {
    const { data: setting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'security')
      .maybeSingle();

    const isAuditEnabled = setting?.value?.auditLogging ?? false;
    if (!isAuditEnabled) return;

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      details,
      ip_address: req?.ip || req?.headers['x-forwarded-for'] || null,
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
};

module.exports = { logAction };