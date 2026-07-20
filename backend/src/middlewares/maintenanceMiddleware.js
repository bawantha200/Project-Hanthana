// backend/src/middlewares/maintenanceMiddleware.js
const supabase = require('../config/db');
const { getMaintenanceStatus } = require('../utils/maintenanceStatusCache');

// මේ path prefixes වලට maintenance mode එකෙන් කිසිම බලපෑමක් නෑ —
// admin ට login කරන්න, settings/maintenance toggle කරන්න, health check
// පවරගන්න පුළුවන් වෙන්න ඕන maintenance mode ON වෙලා තිබ්බත්.
const EXEMPT_PREFIXES = [
  '/api/auth',
  '/api/settings',
  '/api/maintenance',
];

async function maintenanceMiddleware(req, res, next) {
  // Health check / root
  if (req.path === '/') return next();

  // Exempt routes
  if (EXEMPT_PREFIXES.some((prefix) => req.path.startsWith(prefix))) {
    return next();
  }

  const status = await getMaintenanceStatus();
  if (!status.maintenanceMode) return next();

  // Maintenance mode ON — admin/staff bypass කරන්නද කියලා check කරනවා
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role_id ( role_name )')
          .eq('id', data.user.id)
          .maybeSingle();

        const role = profile?.role_id?.role_name;
        if (role === 'ADMIN') {
          return next(); // Admin — maintenance mode එකෙන් bypass
        }
      }
    } catch (err) {
      console.error('💥 [maintenanceMiddleware] Bypass check error:', err);
      // Error වුණොත්, safest option: maintenance block එකම apply කරනවා (fail-closed)
    }
  }

  return res.status(503).json({
    success: false,
    maintenanceMode: true,
    message: status.maintenanceMessage || 'The system is currently under maintenance. Please try again later.',
  });
}

module.exports = { maintenanceMiddleware };