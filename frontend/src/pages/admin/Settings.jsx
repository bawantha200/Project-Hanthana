import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Bell, Shield, Globe, Save, Loader, Home, Package, Plus, Trash2, Users, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';
 

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
  { key: 'general', label: 'Home', icon: Home },
  { key: 'services', label: 'Services', icon: Package },
  { key: 'aboutus', label: 'About Us', icon: Users },
  { key: 'contactus', label: 'Contact Us', icon: Phone },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
  { key: 'system', label: 'System', icon: Globe },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('notifications');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();

  const role = (user?.role || '').toString().trim().toUpperCase();

  const visibleTabs = tabs.filter(tab => {
    if (role === 'CEO') {
      return tab.key === 'general' || tab.key === 'services' || tab.key === 'aboutus' || tab.key === 'contactus';
    }
    if (role === 'ADMIN') {
      return tab.key !== 'general' && tab.key !== 'services' && tab.key !== 'aboutus' && tab.key !== 'contactus';
      // 👆 aboutus, contactus දෙකම ADMIN branch එකෙන් exclude කළා
    }
    return false;
  });

  const canManageUsers = role === 'ADMIN';

  // Settings state
  const [generalSettings, setGeneralSettings] = useState({
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    address: '',
    language: 'en',
    heroImageUrl: '',
    stats: [
      { label: 'Happy Customers', value: '5000+' },
      { label: 'Years of Service', value: '6+' },
      { label: 'Deliveries Completed', value: '20000+' },
      { label: 'Cities Covered', value: '15+' },
    ],
  });

  const [servicesSettings, setServicesSettings] = useState([
    {
      id: 1,
      name: 'Bottled Water Delivery',
      description: 'Sealed, purified bottled water delivered to your doorstep.',
      icon: 'Package',
      features: ['Free delivery', 'Flexible scheduling', 'Bulk discounts'],
    },
  ]);

  const [teamMembers, setTeamMembers] = useState([
    {
      id: 1,
      name: '',
      role: '',
      description: '',
      photoUrl: '',
    },
  ]);

  const [uploadingMemberId, setUploadingMemberId] = useState(null);

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

  const handleStatChange = (index, field, newValue) => {
    const updatedStats = [...generalSettings.stats];
    updatedStats[index] = { ...updatedStats[index], [field]: newValue };
    setGeneralSettings({ ...generalSettings, stats: updatedStats });
  };

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
        if (settings.general) {
          setGeneralSettings(prev => ({
            ...prev,
            ...settings.general,
            stats: settings.general?.stats || prev.stats,
          }));
        }
        if (settings.services) setServicesSettings(settings.services);
        if (settings.team) setTeamMembers(settings.team);
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
    if (!user) return;
    const currentRole = user?.role?.toString().trim().toUpperCase();
    if (currentRole === 'CEO') {
      setActiveTab('general');
    } else if (currentRole === 'ADMIN') {
      setActiveTab('notifications');
    }
  }, [user]);

  useEffect(() => {
    fetchSettings();
  }, []);

  // ===== SAVE SETTINGS =====
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');

      // 🆕 Role අනුව payload එක filter කරනවා - CEO ට access නැති sections backend එකට යවන්නෙම නෑ
      const payload = {};
      if (role === 'CEO') {
        payload.general = generalSettings;
        payload.services = servicesSettings;
        payload.team = teamMembers;
      } else if (canManageUsers) {
        payload.notifications = notificationSettings;
        payload.security = securitySettings;
        payload.system = systemSettings;
      }

      const response = await fetch('http://localhost:5000/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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

  const handleHeroImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-bg-${Date.now()}.${fileExt}`;
      const filePath = `hero/${fileName}`;

      // Upload to bucket
      const { error: uploadError } = await supabase.storage
        .from('Home-img')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('Home-img')
        .getPublicUrl(filePath);

      // Save URL into your settings state (and DB if you're persisting settings)
      setGeneralSettings({ ...generalSettings, heroImageUrl: data.publicUrl });

    } catch (err) {
      console.error('Upload failed:', err);
      alert('Image upload වුනේ නැහැ, ආයෙත් try කරන්න');
    } finally {
      setUploading(false);
    }
  };

  const availableIcons = ['Package', 'Droplets', 'Building', 'Truck', 'Siren'];

  const handleAddService = () => {
    const newService = {
      id: Date.now(),
      name: '',
      description: '',
      icon: 'Package',
      features: [''],
    };
    setServicesSettings([...servicesSettings, newService]);
  };

  const handleRemoveService = (id) => {
    setServicesSettings(servicesSettings.filter((s) => s.id !== id));
  };

  const handleServiceChange = (id, field, value) => {
    setServicesSettings(
      servicesSettings.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleAddFeature = (serviceId) => {
    setServicesSettings(
      servicesSettings.map((s) =>
        s.id === serviceId ? { ...s, features: [...s.features, ''] } : s
      )
    );
  };

  const handleAddMember = () => {
    const newMember = {
      id: Date.now(),
      name: '',
      role: '',
      description: '',
      photoUrl: '',
    };
    setTeamMembers([...teamMembers, newMember]);
  };

  const handleRemoveMember = (id) => {
    setTeamMembers(teamMembers.filter((m) => m.id !== id));
  };

  const handleMemberChange = (id, field, value) => {
    setTeamMembers(
      teamMembers.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  // Hero image upload එකේ pattern එකම follow කරනවා
  const handleMemberPhotoUpload = async (id, e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingMemberId(id);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `team-${id}-${Date.now()}.${fileExt}`;
      const filePath = `team/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('team-photos') // existing bucket එකම reuse කරනවා
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('team-photos')
        .getPublicUrl(filePath);

      handleMemberChange(id, 'photoUrl', data.publicUrl);
    } catch (err) {
      console.error('Team photo upload failed:', err);
      alert('Photo not uploaded ,Try again');
    } finally {
      setUploadingMemberId(null);
    }
  };

  const handleRemoveFeature = (serviceId, featureIndex) => {
    setServicesSettings(
      servicesSettings.map((s) =>
        s.id === serviceId
          ? { ...s, features: s.features.filter((_, i) => i !== featureIndex) }
          : s
      )
    );
  };

  const handleFeatureChange = (serviceId, featureIndex, value) => {
    setServicesSettings(
      servicesSettings.map((s) =>
        s.id === serviceId
          ? {
              ...s,
              features: s.features.map((f, i) => (i === featureIndex ? value : f)),
            }
          : s
      )
    );
  };

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
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit overflow-x-auto"
      >
        {visibleTabs.map((tab) => {
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
              <h2 className="text-base font-semibold text-gray-900">Home Settings</h2>
              <p className="text-xs text-gray-400 mt-0.5">Manage Company information shown on the Home page</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Hero Background Image</label>
              <div className="flex items-center gap-4">
                {generalSettings.heroImageUrl && (
                  <img
                    src={generalSettings.heroImageUrl}
                    alt="Hero preview"
                    className="w-24 h-16 object-cover rounded-lg border border-gray-200"
                  />
                )}
                <label className="cursor-pointer px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                  {uploading ? 'Uploading...' : 'Change Image'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-3">
                "Hanthana in Numbers" Stats
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {generalSettings.stats?.map((stat, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-3 space-y-2"
                  >
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">
                        Value (e.g. 5000+)
                      </label>
                      <input
                        type="text"
                        value={stat.value}
                        onChange={(e) => handleStatChange(index, 'value', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-1">
                        Label
                      </label>
                      <input
                        type="text"
                        value={stat.label}
                        onChange={(e) => handleStatChange(index, 'label', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </motion.div>
      )}

      {/* ===== SERVICES SETTINGS ===== */}
      {activeTab === 'services' && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Package size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Services</h2>
                <p className="text-xs text-gray-400 mt-0.5">Manage services shown on the Services page</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAddService}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Service
            </motion.button>
          </div>

          <div className="space-y-5">
            {servicesSettings.map((service) => (
              <div
                key={service.id}
                className="border border-gray-200 rounded-xl p-5 relative"
              >
                {/* Remove service button */}
                <button
                  onClick={() => handleRemoveService(service.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove service"
                >
                  <Trash2 size={16} />
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pr-8">
                  {/* Name */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Service Name
                    </label>
                    <input
                      type="text"
                      value={service.name}
                      onChange={(e) => handleServiceChange(service.id, 'name', e.target.value)}
                      placeholder="e.g. Bottled Water Delivery"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                    />
                  </div>

                  {/* Icon selector */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Icon
                    </label>
                    <select
                      value={service.icon}
                      onChange={(e) => handleServiceChange(service.id, 'icon', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                    >
                      {availableIcons.map((iconName) => (
                        <option key={iconName} value={iconName}>
                          {iconName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Description */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={service.description}
                      onChange={(e) => handleServiceChange(service.id, 'description', e.target.value)}
                      rows={2}
                      placeholder="Short description of this service"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
                    />
                  </div>

                  {/* Features list */}
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-medium text-gray-600">
                        Features
                      </label>
                      <button
                        onClick={() => handleAddFeature(service.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                      >
                        <Plus size={12} />
                        Add Feature
                      </button>
                    </div>

                    <div className="space-y-2">
                      {service.features.map((feature, fIndex) => (
                        <div key={fIndex} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={feature}
                            onChange={(e) =>
                              handleFeatureChange(service.id, fIndex, e.target.value)
                            }
                            placeholder="e.g. Free delivery"
                            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                          />
                          <button
                            onClick={() => handleRemoveFeature(service.id, fIndex)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                            title="Remove feature"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {servicesSettings.length === 0 && (
              <div className="text-center py-10 text-sm text-gray-400">
                No services added yet. Click "Add Service" to create one.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== ABOUT US / TEAM SETTINGS ===== */}
      {activeTab === 'aboutus' && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Users size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">About Us / Team</h2>
                <p className="text-xs text-gray-400 mt-0.5">Manage team members shown on the About Us page</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAddMember}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Member
            </motion.button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="border border-gray-200 rounded-xl p-5 relative"
              >
                {/* Remove button */}
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove member"
                >
                  <Trash2 size={16} />
                </button>

                {/* Photo upload */}
                <div className="flex items-center gap-4 mb-4">
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt={member.name || 'Team member'}
                      className="w-16 h-16 rounded-full object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-lg font-bold">
                      {member.name
                        ? member.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                        : '?'}
                    </div>
                  )}
                  <label className="cursor-pointer px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                    {uploadingMemberId === member.id ? 'Uploading...' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleMemberPhotoUpload(member.id, e)}
                      disabled={uploadingMemberId === member.id}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Name */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Name
                  </label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => handleMemberChange(member.id, 'name', e.target.value)}
                    placeholder="e.g. Nimal Perera"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>

                {/* Role */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Role / Position
                  </label>
                  <input
                    type="text"
                    value={member.role}
                    onChange={(e) => handleMemberChange(member.id, 'role', e.target.value)}
                    placeholder="e.g. Operations Manager"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={member.description}
                    onChange={(e) => handleMemberChange(member.id, 'description', e.target.value)}
                    rows={3}
                    placeholder="Short bio or role description"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none"
                  />
                </div>
              </div>
            ))}

            {teamMembers.length === 0 && (
              <div className="sm:col-span-2 text-center py-10 text-sm text-gray-400">
                No team members added yet. Click "Add Member" to create one.
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ===== CONTACT US SETTINGS ===== */}
      {activeTab === 'contactus' && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
        >

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
            {/* <div>
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
            </div> */}
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
      {activeTab === 'notifications' && canManageUsers && (
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
      {activeTab === 'security' && canManageUsers && (
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
      {activeTab === 'system' && canManageUsers && (
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
  onToggle={async () => {
    const newValue = !systemSettings.autoBackup;
    setSystemSettings({ ...systemSettings, autoBackup: newValue });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/settings/system', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...systemSettings, autoBackup: newValue }),
      });
      const result = await response.json();
      if (!result.success) {
        setSystemSettings({ ...systemSettings, autoBackup: !newValue });
        alert('Failed to update auto backup: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      setSystemSettings({ ...systemSettings, autoBackup: !newValue });
      console.error('Auto backup toggle failed:', err);
    }
  }}
/>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <div>
                <p className="text-sm font-medium text-gray-800">Maintenance Mode</p>
                <p className="text-xs text-gray-400 mt-0.5">Temporarily disable system access for maintenance</p>
              </div>
              <Toggle
  enabled={systemSettings.maintenanceMode}
  onToggle={async () => {
    const newValue = !systemSettings.maintenanceMode;
    setSystemSettings({ ...systemSettings, maintenanceMode: newValue });

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/maintenance/mode', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          enabled: newValue,
          message: newValue ? 'Scheduled maintenance in progress. We will be back shortly.' : '',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        setSystemSettings({ ...systemSettings, maintenanceMode: !newValue });
        alert('Failed to update maintenance mode: ' + (result.message || 'Unknown error'));
      }
    } catch (err) {
      setSystemSettings({ ...systemSettings, maintenanceMode: !newValue });
      console.error('Maintenance mode toggle failed:', err);
    }
  }}
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