import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Shield, Globe, Save, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const tabs = [
  { key: 'general', label: 'General', icon: SettingsIcon },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'system', label: 'System', icon: Globe },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [generalSettings, setGeneralSettings] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    address: '',
    language: 'en',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    orderAlerts: true,
    deliveryUpdates: true,
    lowStockAlerts: true,
    paymentReminders: true,
    systemMaintenance: false,
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    passwordExpiry: '90',
    ipWhitelist: '',
    loginAttempts: '5',
    auditLogging: true,
  });

  const [systemSettings, setSystemSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    dataRetention: '365',
    maintenanceMode: false,
    apiRateLimit: '1000',
    debugMode: false,
  });

  // ===== FETCH SETTINGS =====
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.success) {
        const settings = data.data;
        if (settings.general) setGeneralSettings(settings.general);
        if (settings.notifications) setNotificationSettings(settings.notifications);
        if (settings.security) setSecuritySettings(settings.security);
        if (settings.system) setSystemSettings(settings.system);
      }
    } catch (error) {
      console.error('Fetch settings error:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // ===== SAVE SETTINGS =====
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          general: generalSettings,
          notifications: notificationSettings,
          security: securitySettings,
          system: systemSettings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Settings saved successfully!');
      } else {
        throw new Error(data.message || 'Failed to save');
      }
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ enabled, onToggle }) => (
    <button
      onClick={onToggle}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure system preferences and company settings
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-70"
        >
          {saving ? (
            <>
              <Loader size={16} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={16} />
              Save Changes
            </>
          )}
        </motion.button>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div variants={itemVariants} className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* ===== GENERAL SETTINGS ===== */}
      {activeTab === 'general' && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <SettingsIcon size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">General Settings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Company information and basic preferences</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Name</label>
              <input
                type="text"
                value={generalSettings.companyName}
                onChange={(e) => setGeneralSettings({ ...generalSettings, companyName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Email</label>
              <input
                type="email"
                value={generalSettings.companyEmail}
                onChange={(e) => setGeneralSettings({ ...generalSettings, companyEmail: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Company Phone</label>
              <input
                type="tel"
                value={generalSettings.companyPhone}
                onChange={(e) => setGeneralSettings({ ...generalSettings, companyPhone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Address</label>
              <input
                type="text"
                value={generalSettings.address}
                onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Language</label>
              <select
                value={generalSettings.language}
                onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              >
                <option value="en">English</option>
                <option value="si">Sinhala</option>
                <option value="ta">Tamil</option>
              </select>
            </div>
            {/* General Settings Form එකට මේවා එකතු කරන්න */}

<div>
  <label className="block text-xs font-medium text-gray-600 mb-1.5">Contact Phone (Hotline)</label>
  <input
    type="tel"
    value={generalSettings.contactPhone || ''}
    onChange={(e) => setGeneralSettings({ ...generalSettings, contactPhone: e.target.value })}
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
  />
</div>

<div>
  <label className="block text-xs font-medium text-gray-600 mb-1.5">Support Email</label>
  <input
    type="email"
    value={generalSettings.contactEmail || ''}
    onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
  />
</div>

<div>
  <label className="block text-xs font-medium text-gray-600 mb-1.5">Orders Email</label>
  <input
    type="email"
    value={generalSettings.ordersEmail || ''}
    onChange={(e) => setGeneralSettings({ ...generalSettings, ordersEmail: e.target.value })}
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
  />
</div>

<div>
  <label className="block text-xs font-medium text-gray-600 mb-1.5">Emergency Phone</label>
  <input
    type="tel"
    value={generalSettings.emergencyPhone || ''}
    onChange={(e) => setGeneralSettings({ ...generalSettings, emergencyPhone: e.target.value })}
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
  />
</div>

<div>
  <label className="block text-xs font-medium text-gray-600 mb-1.5">Business Hours (Mon-Sat)</label>
  <input
    type="text"
    value={generalSettings.businessHours?.mondaySaturday || ''}
    onChange={(e) => setGeneralSettings({
      ...generalSettings,
      businessHours: {
        ...generalSettings.businessHours,
        mondaySaturday: e.target.value
      }
    })}
    placeholder="7:00 AM - 9:00 PM"
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
  />
</div>

<div>
  <label className="block text-xs font-medium text-gray-600 mb-1.5">Business Hours (Sunday)</label>
  <input
    type="text"
    value={generalSettings.businessHours?.sunday || ''}
    onChange={(e) => setGeneralSettings({
      ...generalSettings,
      businessHours: {
        ...generalSettings.businessHours,
        sunday: e.target.value
      }
    })}
    placeholder="8:00 AM - 6:00 PM"
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
  />
</div>

<div>
  <label className="block text-xs font-medium text-gray-600 mb-1.5">Emergency Hours</label>
  <input
    type="text"
    value={generalSettings.businessHours?.emergency || ''}
    onChange={(e) => setGeneralSettings({
      ...generalSettings,
      businessHours: {
        ...generalSettings.businessHours,
        emergency: e.target.value
      }
    })}
    placeholder="24/7 Available"
    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
  />
</div>
          </div>
        </motion.div>
      )}

      {/* ===== NOTIFICATION SETTINGS ===== */}
      {activeTab === 'notifications' && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Bell size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Notification Settings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Configure which notifications you receive</p>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Alert Types</h3>
            {[
              { key: 'orderAlerts', label: 'Order Alerts', description: 'Receive notifications for new orders and order status changes' },
              { key: 'deliveryUpdates', label: 'Delivery Updates', description: 'Track delivery progress and completion notifications' },
              { key: 'lowStockAlerts', label: 'Low Stock Alerts', description: 'Get notified when inventory falls below threshold levels' },
              { key: 'paymentReminders', label: 'Payment Reminders', description: 'Receive alerts for pending and overdue payments' },
              { key: 'systemMaintenance', label: 'System Maintenance', description: 'Notifications about scheduled maintenance windows' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                </div>
                <Toggle
                  enabled={notificationSettings[item.key]}
                  onToggle={() =>
                    setNotificationSettings({ ...notificationSettings, [item.key]: !notificationSettings[item.key] })
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-1 mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Delivery Channels</h3>
            {[
              { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
              { key: 'smsNotifications', label: 'SMS Notifications', description: 'Receive notifications via SMS' },
              { key: 'pushNotifications', label: 'Push Notifications', description: 'Browser and mobile push notifications' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                </div>
                <Toggle
                  enabled={notificationSettings[item.key]}
                  onToggle={() =>
                    setNotificationSettings({ ...notificationSettings, [item.key]: !notificationSettings[item.key] })
                  }
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ===== SECURITY SETTINGS ===== */}
      {activeTab === 'security' && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Shield size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Security Settings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Authentication, access control, and audit settings</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">Two-Factor Authentication</p>
                <p className="text-xs text-gray-400 mt-0.5">Require 2FA for all admin and manager accounts</p>
              </div>
              <Toggle
                enabled={securitySettings.twoFactorAuth}
                onToggle={() =>
                  setSecuritySettings({ ...securitySettings, twoFactorAuth: !securitySettings.twoFactorAuth })
                }
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">Audit Logging</p>
                <p className="text-xs text-gray-400 mt-0.5">Log all user actions for security auditing</p>
              </div>
              <Toggle
                enabled={securitySettings.auditLogging}
                onToggle={() =>
                  setSecuritySettings({ ...securitySettings, auditLogging: !securitySettings.auditLogging })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Session Timeout (minutes)</label>
              <select
                value={securitySettings.sessionTimeout}
                onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
                <option value="120">120 minutes</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Password Expiry (days)</label>
              <select
                value={securitySettings.passwordExpiry}
                onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiry: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="never">Never</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Login Attempts</label>
              <select
                value={securitySettings.loginAttempts}
                onChange={(e) => setSecuritySettings({ ...securitySettings, loginAttempts: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              >
                <option value="3">3 attempts</option>
                <option value="5">5 attempts</option>
                <option value="10">10 attempts</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">IP Whitelist (comma separated)</label>
              <input
                type="text"
                value={securitySettings.ipWhitelist}
                onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
                placeholder="e.g., 192.168.1.1, 10.0.0.1"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* ===== SYSTEM SETTINGS ===== */}
      {activeTab === 'system' && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Globe size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">System Preferences</h2>
              <p className="text-xs text-gray-400 mt-0.5">Backup, data retention, and system configuration</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">Auto Backup</p>
                <p className="text-xs text-gray-400 mt-0.5">Automatically backup data at scheduled intervals</p>
              </div>
              <Toggle
                enabled={systemSettings.autoBackup}
                onToggle={() =>
                  setSystemSettings({ ...systemSettings, autoBackup: !systemSettings.autoBackup })
                }
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">Maintenance Mode</p>
                <p className="text-xs text-gray-400 mt-0.5">Temporarily disable system access for maintenance</p>
              </div>
              <Toggle
                enabled={systemSettings.maintenanceMode}
                onToggle={() =>
                  setSystemSettings({ ...systemSettings, maintenanceMode: !systemSettings.maintenanceMode })
                }
              />
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">Debug Mode</p>
                <p className="text-xs text-gray-400 mt-0.5">Enable detailed error logging and diagnostic output</p>
              </div>
              <Toggle
                enabled={systemSettings.debugMode}
                onToggle={() =>
                  setSystemSettings({ ...systemSettings, debugMode: !systemSettings.debugMode })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6 pt-4 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Backup Frequency</label>
              <select
                value={systemSettings.backupFrequency}
                onChange={(e) => setSystemSettings({ ...systemSettings, backupFrequency: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Data Retention (days)</label>
              <select
                value={systemSettings.dataRetention}
                onChange={(e) => setSystemSettings({ ...systemSettings, dataRetention: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              >
                <option value="90">90 days</option>
                <option value="180">180 days</option>
                <option value="365">365 days</option>
                <option value="730">730 days</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">API Rate Limit (req/min)</label>
              <select
                value={systemSettings.apiRateLimit}
                onChange={(e) => setSystemSettings({ ...systemSettings, apiRateLimit: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              >
                <option value="100">100</option>
                <option value="500">500</option>
                <option value="1000">1000</option>
                <option value="5000">5000</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}