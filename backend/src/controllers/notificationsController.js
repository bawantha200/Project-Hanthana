// backend/controllers/notificationsController.js
const supabase  = require("../config/db");

// GET /api/notifications - current user ගේ role එකට match වෙන notifications ටික
const getNotifications = async (req, res) => {
  try {
    const userRole = (req.user?.role?.role_name || req.user?.role || '').toString().trim().toUpperCase();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .or(`target_role.ilike.%${userRole}%,target_role.eq.ALL`)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    return res.status(200).json({ success: true, notifications: data || [] });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const userRole = (req.user?.role?.role_name || req.user?.role || '').toString().trim().toUpperCase();

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .or(`target_role.eq.${userRole},target_role.eq.ALL`)
      .eq('read', false);

    if (error) throw error;

    return res.status(200).json({ success: true, count: count || 0 });
  } catch (error) {
    console.error('Unread count error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load unread count.' });
  }
};

// PUT /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

// PUT /api/notifications/read-all
const markAllAsRead = async (req, res) => {
  try {
    const userRole = (req.user?.role?.role_name || req.user?.role || '').toString().trim().toUpperCase();
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .or(`target_role.eq.${userRole},target_role.eq.ALL`)
      .eq('read', false);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark all as read error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };