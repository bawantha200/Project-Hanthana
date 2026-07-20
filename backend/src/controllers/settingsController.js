const  supabase  = require('../config/db');

/**
 * @desc    Get all settings
 * @route   GET /api/settings
 */
const getSettings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key, value');

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: ' + error.message
      });
    }

    // Convert array to object with key-value pairs
    const settings = {};
    data.forEach(item => {
      settings[item.key] = item.value;
    });

    return res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Get specific settings by key
 * @route   GET /api/settings/:key
 */
const getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: ' + error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Setting not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: data.value
    });
  } catch (error) {
    console.error('Get setting by key error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update settings (General, Notifications, Security, System)
 * @route   PUT /api/settings
 */
const updateSettings = async (req, res) => {
  try {
    const { general, notifications, security, system } = req.body;
    const userId = req.user?.id;

    // Build updates array
    const updates = [];

    if (general) {
      updates.push({
        key: 'general',
        value: general,
        updated_by: userId
      });
    }

    if (notifications) {
      updates.push({
        key: 'notifications',
        value: notifications,
        updated_by: userId
      });
    }

    if (security) {
      updates.push({
        key: 'security',
        value: security,
        updated_by: userId
      });
    }

    if (system) {
      updates.push({
        key: 'system',
        value: system,
        updated_by: userId
      });
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No settings provided to update'
      });
    }

    // Upsert each setting
    for (const item of updates) {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: item.key,
          value: item.value,
          updated_by: item.updated_by
        }, {
          onConflict: 'key'
        });

      if (error) {
        console.error('Upsert error for key:', item.key, error);
        throw new Error(`Failed to update ${item.key}: ${error.message}`);
      }
    }

    // Fetch updated settings
    const { data, error: fetchError } = await supabase
      .from('settings')
      .select('key, value');

    if (fetchError) {
      console.error('Fetch updated settings error:', fetchError);
      throw new Error('Failed to fetch updated settings');
    }

    const settings = {};
    data.forEach(item => {
      settings[item.key] = item.value;
    });

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Update single setting by key
 * @route   PUT /api/settings/:key
 */
const updateSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const userId = req.user?.id;

    if (!value) {
      return res.status(400).json({
        success: false,
        message: 'Value is required'
      });
    }

    const { error } = await supabase
      .from('settings')
      .upsert({
        key: key,
        value: value,
        updated_by: userId
      }, {
        onConflict: 'key'
      });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Database error: ' + error.message
      });
    }

    return res.status(200).json({
      success: true,
      message: `Setting "${key}" updated successfully`
    });
  } catch (error) {
    console.error('Update setting by key error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Reset settings to default
 * @route   POST /api/settings/reset
 */
const resetSettings = async (req, res) => {
  try {
    const userId = req.user?.id;

    const defaultSettings = {
      general: {
        companyName: "Hanthana Water",
        companyEmail: "info@hanthana.com",
        companyPhone: "+94 76 835 6860",
        address: "Colombo, Sri Lanka",
        language: "en",
        contactPhone: "+94 76 835 6860",
        contactEmail: "support@hanthana.com",
        ordersEmail: "orders@hanthana.com",
        emergencyPhone: "+94 76 835 6860",
        businessHours: {
          mondaySaturday: "7:00 AM - 9:00 PM",
          sunday: "8:00 AM - 6:00 PM",
          emergency: "24/7 Available"
        }
      },
      notifications: {
        orderAlerts: true,
        deliveryUpdates: true,
        lowStockAlerts: true,
        paymentReminders: true,
        systemMaintenance: false,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true
      },
      security: {
        twoFactorAuth: false,
        sessionTimeout: "30",
        passwordExpiry: "90",
        ipWhitelist: "",
        loginAttempts: "5",
        auditLogging: true
      },
      system: {
        autoBackup: true,
        backupFrequency: "daily",
        dataRetention: "365",
        maintenanceMode: false,
        apiRateLimit: "1000",
        debugMode: false
      }
    };

    const updates = Object.entries(defaultSettings).map(([key, value]) => ({
      key,
      value,
      updated_by: userId
    }));

    for (const item of updates) {
      const { error } = await supabase
        .from('settings')
        .upsert({
          key: item.key,
          value: item.value,
          updated_by: item.updated_by
        }, {
          onConflict: 'key'
        });

      if (error) throw error;
    }

    return res.status(200).json({
      success: true,
      message: 'Settings reset to default successfully'
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }

  
};

const getPublicSettings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'general')
      .maybeSingle();

    if (error) {
      console.error('Get public settings error:', error);
      return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
    }

    const general = data?.value || {};

    return res.status(200).json({
      success: true,
      data: {
        general: {
          heroImageUrl: general.heroImageUrl || null,
          companyName: general.companyName || null,
          contactPhone: general.contactPhone || null,
          contactEmail: general.contactEmail || null,
          businessHours: general.businessHours || null,
        }
      }
    });
  } catch (error) {
    console.error('Get public settings error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


module.exports = {
  getPublicSettings,
  getSettings,
  getSettingByKey,
  updateSettings,
  updateSettingByKey,
  resetSettings
};