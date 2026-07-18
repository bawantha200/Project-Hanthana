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
    const { general, services,team,notifications, security, system } = req.body;
    const userId = req.user?.id;

    const userRole = (req.user?.role?.role_name || req.user?.role || '').toString().trim().toUpperCase();


    if (security && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can update security settings.'
      });
    }


    if (security) {
      const allowedAttempts = ['3', '5', '10'];
      const allowedTimeout = ['15', '30', '60', '120'];
      const allowedExpiry = ['30', '60', '90', '180', 'never'];

      if (security.loginAttempts !== undefined && !allowedAttempts.includes(String(security.loginAttempts))) {
        return res.status(400).json({ success: false, message: 'Invalid loginAttempts value.' });
      }
      if (security.sessionTimeout !== undefined && !allowedTimeout.includes(String(security.sessionTimeout))) {
        return res.status(400).json({ success: false, message: 'Invalid sessionTimeout value.' });
      }
      if (security.passwordExpiry !== undefined && !allowedExpiry.includes(String(security.passwordExpiry))) {
        return res.status(400).json({ success: false, message: 'Invalid passwordExpiry value.' });
      }
    }

    // Build updates array
    const updates = [];

    if (general) {
      updates.push({
        key: 'general',
        value: general,
        updated_by: userId
      });
    }

    if (services) {
      updates.push({
        key: 'services',
        value: services,
        updated_by: userId
      });
    }

    if (team) {
      updates.push({
        key: 'team',
        value: team,
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

const getSecuritySettings = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'security')
      .maybeSingle();

    if (error) throw error;

    // Defaults if no row exists yet
    const defaults = {
      twoFactorAuth: false,
      auditLogging: false,
      sessionTimeout: '30',
      passwordExpiry: '90',
      loginAttempts: '5',
      ipWhitelist: '',
    };

    return res.status(200).json({
      success: true,
      settings: { ...defaults, ...(data?.value || {}) },
    });
  } catch (error) {
    console.error('Get security settings error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};

const updateSecuritySettings = async (req, res) => {
  try {
    const {
      twoFactorAuth,
      auditLogging,
      sessionTimeout,
      passwordExpiry,
      loginAttempts,
      ipWhitelist,
    } = req.body;

    // ✅ Basic validation - loginAttempts eka valid number ekak da balanna
    const allowedAttempts = ['3', '5', '10'];
    const allowedTimeout = ['15', '30', '60', '120'];
    const allowedExpiry = ['30', '60', '90', '180', 'never'];

    if (loginAttempts !== undefined && !allowedAttempts.includes(String(loginAttempts))) {
      return res.status(400).json({ success: false, message: 'Invalid loginAttempts value.' });
    }
    if (sessionTimeout !== undefined && !allowedTimeout.includes(String(sessionTimeout))) {
      return res.status(400).json({ success: false, message: 'Invalid sessionTimeout value.' });
    }
    if (passwordExpiry !== undefined && !allowedExpiry.includes(String(passwordExpiry))) {
      return res.status(400).json({ success: false, message: 'Invalid passwordExpiry value.' });
    }

    const newValue = {
      twoFactorAuth: !!twoFactorAuth,
      auditLogging: !!auditLogging,
      sessionTimeout: String(sessionTimeout ?? '30'),
      passwordExpiry: String(passwordExpiry ?? '90'),
      loginAttempts: String(loginAttempts ?? '5'),
      ipWhitelist: (ipWhitelist || '').trim(),
    };

    // upsert - row eka thiyenawa nam update, na nam insert
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'security', value: newValue }, { onConflict: 'key' });

    if (error) throw error;

    return res.status(200).json({ success: true, message: 'Security settings updated.', settings: newValue });
  } catch (error) {
    console.error('Update security settings error:', error);
    return res.status(500).json({ success: false, message: 'Internal Server Error.' });
  }
};



const getPublicSettings = async (req, res) => {
  try {
    // General settings fetch කරන්න
    const { data: generalData, error: generalError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'general')
      .maybeSingle();

    if (generalError) {
      console.error('Get public settings error:', generalError);
      return res.status(500).json({ success: false, message: 'Database error: ' + generalError.message });
    }

    // 👇 services key එකත් fetch කරන්න
    const { data: servicesData, error: servicesError } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'services')
      .maybeSingle();

    if (servicesError) {
      console.error('Get public services error:', servicesError);
      return res.status(500).json({ success: false, message: 'Database error: ' + servicesError.message });
    }


    const { data: teamData, error: teamError } = await supabase
  .from('settings')
  .select('value')
  .eq('key', 'team')
  .maybeSingle();

if (teamError) {
  console.error('Get public team error:', teamError);
  return res.status(500).json({ success: false, message: 'Database error: ' + teamError.message });
}

    const general = generalData?.value || {};
    const services = servicesData?.value || [];
    const team = teamData?.value || [];

    console.log("GENERAL SETTINGS FROM DB:");
    console.log(general);
    console.log("SERVICES FROM DB:");
    console.log(services);

    return res.status(200).json({
      success: true,
      data: {
        general: {
          heroImageUrl: general.heroImageUrl || null,
          companyName: general.companyName || null,
          companyEmail: general.companyEmail || null,
          companyPhone: general.companyPhone || null,
          address: general.address || null,

          contactPhone: general.contactPhone || null,
          contactEmail: general.contactEmail || null,
          ordersEmail: general.ordersEmail || null,
          emergencyPhone: general.emergencyPhone || null,

          businessHours: general.businessHours || {},

          stats: general.stats || []
        },
        services: services, // 👈 මේකයි response එකට එකතු කළේ
        team: team
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
  resetSettings,
  getSecuritySettings, updateSecuritySettings
};
