const supabase = require('../config/db');

// GET /api/audit-logs?page=1&limit=10&action=LOGIN_SUCCESS
const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const action = req.query.action || null;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('audit_logs')
      .select(
        `id, user_id, action, details, ip_address, created_at,
         profiles:user_id ( id, full_name )`,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (action) {
      query = query.eq('action', action);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (err) {
    console.error('Get Audit Logs Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load audit logs',
    });
  }
};

// GET /api/audit-logs/actions — distinct action values, for the filter dropdown
const getAuditLogActions = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('action');

    if (error) throw error;

    const uniqueActions = [...new Set((data || []).map((r) => r.action))].sort();

    return res.status(200).json({
      success: true,
      data: uniqueActions,
    });
  } catch (err) {
    console.error('Get Audit Log Actions Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to load audit log actions',
    });
  }
};

module.exports = {
  getAuditLogs,
  getAuditLogActions,
};