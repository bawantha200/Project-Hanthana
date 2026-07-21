// backend/src/controllers/maintenanceController.js
const {
  createMaintenanceWindow,
  getUpcomingMaintenanceWindows,
} = require('../services/maintenanceService');
const supabase = require('../config/db');
const { broadcastMaintenanceNotice } = require('../utils/maintenanceNotify');
const { invalidateCache } = require('../utils/maintenanceStatusCache');

// ========== TOGGLE MAINTENANCE MODE (Admin) ==========
const toggleMaintenanceMode = async (req, res) => {
  try {
    const { enabled, message } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: '`enabled` (boolean) is required.' });
    }

    const { data: existing } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'system')
      .maybeSingle();

    const newValue = {
      ...(existing?.value || {}),
      maintenanceMode: enabled,
      maintenanceMessage: message || '',
    };

    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'system', value: newValue }, { onConflict: 'key' });

    if (error) {
      return res.status(500).json({ success: false, message: error.message });
    }

    invalidateCache(); // ඊළඟ request එකේම අලුත් value එකම පේන්න ඕන

    // Broadcast notice — ON/OFF දෙකටම වෙනස් message එකක්
    if (enabled) {
      await broadcastMaintenanceNotice({
        subject: 'System Maintenance In Progress',
        message: message || 'The system is currently under maintenance. Some features may be temporarily unavailable.',
      });
    } else {
      await broadcastMaintenanceNotice({
        subject: 'System Back Online',
        message: 'Maintenance is complete — the system is back online. Thank you for your patience.',
      });
    }

    res.json({ success: true, maintenanceMode: enabled });
  } catch (err) {
    console.error('💥 [toggleMaintenanceMode]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== SCHEDULE MAINTENANCE WINDOW (Admin) ==========
const postMaintenanceWindow = async (req, res) => {
  try {
    const { scheduledStart, scheduledEnd, message } = req.body;

    if (!scheduledStart || !scheduledEnd || !message) {
      return res.status(400).json({
        success: false,
        message: 'scheduledStart, scheduledEnd and message are all required.',
      });
    }

    if (new Date(scheduledEnd) <= new Date(scheduledStart)) {
      return res.status(400).json({
        success: false,
        message: 'scheduledEnd must be after scheduledStart.',
      });
    }

    const createdBy = req.user?.id || null;

    const maintenanceWindow = await createMaintenanceWindow({
      scheduledStart,
      scheduledEnd,
      message,
      createdBy,
    });

    res.status(201).json({ success: true, maintenanceWindow });
  } catch (err) {
    console.error('💥 [postMaintenanceWindow]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET UPCOMING MAINTENANCE WINDOWS ==========
const getMaintenanceWindows = async (req, res) => {
  try {
    const windows = await getUpcomingMaintenanceWindows();
    res.json({ success: true, windows });
  } catch (err) {
    console.error('💥 [getMaintenanceWindows]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { postMaintenanceWindow, getMaintenanceWindows, toggleMaintenanceMode };