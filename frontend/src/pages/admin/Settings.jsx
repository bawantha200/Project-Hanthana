import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Shield, Building2, Globe, Save } from 'lucide-react';
import { branchLocations } from '../../data/mockData';

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
  // { key: 'branches', label: 'Branches', icon: Building2 },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const [generalSettings, setGeneralSettings] = useState({
    companyName: 'AquaFlow Water Management',
    companyEmail: 'info@aquaflow.com',
    companyPhone: '+91-22-12345678',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
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

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
            Configure system preferences, security, and branch settings
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Save size={16} />
          {saved ? 'Saved!' : 'Save Changes'}
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

      {/* General Settings */}
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
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Timezone</label>
              <select
                value={generalSettings.timezone}
                onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Currency</label>
              <select
                value={generalSettings.currency}
                onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              >
                <option value="INR">INR (Indian Rupee)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Language</label>
              <select
                value={generalSettings.language}
                onChange={(e) => setGeneralSettings({ ...generalSettings, language: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
              >
                <option value="en">English</option>
                <option value="hi">Hindi</option>
                <option value="mr">Marathi</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}

      {/* Notification Settings */}
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

      {/* Security Settings */}
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

      {/* System Preferences */}
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

      {/* Branch Settings */}
      {/* {activeTab === 'branches' && (
        <motion.div
          variants={itemVariants}
          className="space-y-5"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Branch Locations</h2>
                <p className="text-xs text-gray-400 mt-0.5">Manage operational branches across regions</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {branchLocations.map((branch) => (
                <motion.div
                  key={branch.name}
                  whileHover={{ y: -2 }}
                  className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Building2 size={14} className="text-blue-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm">{branch.name}</h3>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <p className="text-gray-500">{branch.address}</p>
                    <p className="text-gray-500">{branch.phone}</p>
                    <p className="text-gray-400">{branch.hours}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Building2 size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Add New Branch</h2>
                <p className="text-xs text-gray-400 mt-0.5">Register a new operational branch</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Branch Name</label>
                <input
                  type="text"
                  placeholder="e.g., Chennai South"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Address</label>
                <input
                  type="text"
                  placeholder="Full address"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone</label>
                <input
                  type="tel"
                  placeholder="+91-XX-XXXXXXX"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Operating Hours</label>
                <input
                  type="text"
                  placeholder="e.g., Mon-Sat: 7AM-9PM"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus size={16} />
                Add Branch
              </motion.button>
            </div>
          </div>
        </motion.div>
      )} */}
    </motion.div>
  );
}
