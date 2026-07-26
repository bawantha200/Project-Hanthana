import { useState, useRef, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  UserCog,
  Briefcase,
  DollarSign,
  Store,
  BarChart3,
  Shield,
  Settings,
  Bell,
  ChevronDown,
  Menu,
  X,
  Droplets,
  LogOut,
  Check,
  User,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Save,
  Trash2,
  AlertCircle,
  Bike,
  Inbox,
  FileText,
  Receipt,
  Clipboard, 
  Warehouse,
  Unlock,
  Key, 
  Sliders,
  FileCheck,
  Factory
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';


// ---------- Navigation Items (each has a permission id) ----------
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { id: 'sales-dashboard', label: 'Sales Dashboard', icon: BarChart3, path: '/admin/sales-dashboard' },
  { id: 'sales-analytics', label: 'Sales Analytics', icon: BarChart3, path: '/admin/sales-analytics' },
  { id: 'inventory-dashboard', label: 'Inventory Dashboard', icon: LayoutDashboard, path: '/admin/demandforecast-dashboard' },
  { id: 'jit-dashboard', label: 'JIT Dashboard', icon: Factory, path: '/admin/jit-dashboard' },
  { id: 'products', label: 'Products', icon: Package, path: '/admin/products' },


  { id: 'inventory', label: 'Inventory', icon: Warehouse, path: '/admin/inventory' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/admin/orders' },
  { id: 'pos', label: 'POS', icon: Clipboard, path: '/admin/pos' },
  { id: 'deliveries', label: 'Deliveries', icon: Truck, path: '/admin/deliveries' },
  { id: 'deliveryconfig', label: 'Delivery Configuration', icon: Truck, path: '/admin/delivery/config' },
  { id: 'messages', label: 'Messages', icon: Inbox, path: '/admin/messages' },

  { id: 'rider-dashboard', label: 'Rider Dashboard', icon: Bike, path: '/admin/rider-dashboard' },

  { id: 'customers', label: 'Customers', icon: Users, path: '/admin/customers' },
 
  { id: 'hrm-dashboard', label: 'HRM Dashboard', icon: Briefcase, path: '/admin/hrm-dashboard' },
  { id: 'employees', label: 'Employees', icon: UserCog, path: '/admin/employees' },
  { id: 'hrm', label: 'HRM', icon: Briefcase, path: '/admin/hrm' },

  { id: 'finance', label: 'Finance', icon: DollarSign, path: '/admin/finance' },
  { id: 'invoice', label: 'Invoice', icon: FileText, path: '/admin/finance/invoicing-reports' },
  { id: 'expenses', label: 'Expenses', icon: FileText, path: '/admin/finance/expenses' },

  { id: 'vendors', label: 'Vendors', icon: Store, path: '/admin/vendors' },

  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  { id: 'user-management', label: 'User Management', icon: Shield, path: '/admin/user-management' },
  { id: 'settings-request', label: 'Settings Requests', icon: FileCheck, path: '/admin/settings-requests' },
  { id: 'manage-permission', label: 'Manage Permission', icon: Sliders, path: '/admin/manage-permission' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },

];



// Helper: get initials
const getInitials = (name, email) => {
  if (name?.trim()) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return email ? email[0].toUpperCase() : 'U';
};

// Random pastel color for role badge
const getRandomRoleColor = (roleName) => {
  const colors = [
    'bg-red-100 text-red-700',
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-yellow-100 text-yellow-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-indigo-100 text-indigo-700',
    'bg-orange-100 text-orange-700',
  ];
  let hash = 0;
  for (let i = 0; i < roleName.length; i++) {
    hash = roleName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// ---------- Sidebar Item ----------
function SidebarItem({ item, isActive, onClick }) {
  const Icon = item.icon;
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
          : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 bg-blue-600 rounded-xl"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
        />
      )}
      <span className="relative z-10">
        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
      </span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative z-10 whitespace-nowrap"
      >
        {item.label}
      </motion.span>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-white"
        />
      )}
    </button>
  );
}

// ---------- Notification Panel (mock) ----------
// Replaces mockNotifications block + NotificationPanel component in AdminLayout.jsx

const NOTIFICATION_ICONS = {
  order: ShoppingCart,
  delivery: Truck,
  inventory: Package,
  payment: DollarSign,
  system: Settings,
  maintenance: Settings,
  settings_request: Settings,
};

// Relative time helper - "2 min ago", "1 hour ago" ආදිය
const timeAgo = (dateString) => {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

function NotificationPanel({ isOpen, onClose }) {
  const panelRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;


  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    // Optimistic UI update - request එක fail උනත් user ට instant feedback
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) onClose();
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                </div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell size={22} className="text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">No notifications yet</p>
                </div>
              )}
              {!loading &&
                notifications.map((n) => {
                  const Icon = NOTIFICATION_ICONS[n.type] || Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => !n.read && handleMarkAsRead(n.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                        !n.read ? 'bg-blue-50/40 hover:bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${!n.read ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? 'font-medium text-slate-800' : 'text-slate-500'}`}>{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ---------- COMBINED ACCOUNT SETTINGS MODAL (Edit Profile + Change Password + Delete Account) ----------
function AccountSettingsModal({ isOpen, onClose, user, onUpdate }) {
  // Profile edit state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // Delete account state
  const [confirmText, setConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const navigate = useNavigate();

  // Reset all states when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset profile edit
      setFullName(user?.fullName || '');
      setPhone(user?.phone || '');
      setAddress(user?.address || '');
      setProfileCurrentPassword('');
      setProfileError('');
      setProfileSuccess('');
      // Reset password change
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setPasswordSuccess('');
      // Reset delete account
      setConfirmText('');
      setDeleteError('');
    }
  }, [isOpen, user]);

  // ---------- Update Profile ----------
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!profileCurrentPassword) {
      setProfileError('Current password is required to update profile');
      return;
    }
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fullName, phone, address, currentPassword: profileCurrentPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Update failed');
      setProfileSuccess('Profile updated successfully');
      if (onUpdate) onUpdate({ ...user, fullName, phone, address });
      setTimeout(() => {
        setProfileSuccess('');
        onClose();
      }, 1500);
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setProfileLoading(false);
    }
  };

  // ---------- Change Password ----------
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setPasswordLoading(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      // Verify current password
      const loginRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, password: currentPassword }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok || !loginData.success) throw new Error('Current password is incorrect');

      // Update password
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/auth/update-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password update failed');
      setPasswordSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setPasswordSuccess('');
        onClose();
      }, 1500);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  // ---------- Delete Account ----------
  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm');
      return;
    }
    setDeleteLoading(true);
    setDeleteError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Deletion failed');
      localStorage.removeItem('token');
      navigate('/login');
    } catch (err) {
      setDeleteError(err.message);
      setDeleteLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Account Settings</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* ========== EDIT PROFILE SECTION ========== */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <User size={18} className="text-blue-600" />
              <h3 className="text-md font-semibold text-gray-800">Edit Profile</h3>
            </div>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              {profileError && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">{profileError}</div>}
              {profileSuccess && <div className="p-3 text-sm text-green-600 bg-green-50 rounded-xl">{profileSuccess}</div>}
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={profileCurrentPassword}
                    onChange={(e) => setProfileCurrentPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={profileLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                {profileLoading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={16} />}
                Save Profile Changes
              </button>
            </form>
          </div>

          <div className="border-t border-gray-200" />

          {/* ========== CHANGE PASSWORD SECTION ========== */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Lock size={18} className="text-blue-600" />
              <h3 className="text-md font-semibold text-gray-800">Change Password</h3>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordError && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">{passwordError}</div>}
              {passwordSuccess && <div className="p-3 text-sm text-green-600 bg-green-50 rounded-xl">{passwordSuccess}</div>}
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={passwordLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                {passwordLoading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={16} />}
                Update Password
              </button>
            </form>
          </div>

          <div className="border-t border-gray-200" />

          {/* ========== DELETE ACCOUNT SECTION ========== */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trash2 size={18} className="text-red-600" />
              <h3 className="text-md font-semibold text-red-600">Delete Account</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl text-red-700">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">This action is irreversible. All your data will be permanently removed.</p>
              </div>
              <p className="text-sm text-slate-600">Type <span className="font-mono font-bold">DELETE</span> to confirm:</p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
              />
              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl shadow-md flex items-center justify-center gap-2"
              >
                {deleteLoading ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Trash2 size={16} />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ---------- Role Switcher (only for ADMIN, roles from database) ----------
function RoleSwitcher({ isOpen, onClose, onSelectRole, currentRole, availableRoles }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) onClose();
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);


  const hiddenRoles = ['CUSTOMER', 'MANAGER', 'EMPLOYEE', 'DELIVERY_PERSON'];
  const visibleRoles = availableRoles.filter(
    (role) => !hiddenRoles.includes(role.role_name?.toString().trim().toUpperCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute left-0 top-full mt-2 z-50 w-56 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden"
        >
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Switch Role</p>
          </div>
          <div className="py-1.5">
            {visibleRoles.map((role) => (
              <button
                key={role.id}
                onClick={() => {
                  onSelectRole(role.role_name);
                  onClose();
                }}
                className={`flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors ${
                  currentRole === role.role_name
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${getRandomRoleColor(role.role_name)}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {role.role_name}
                </span>
                {currentRole === role.role_name && <Check size={16} className="text-blue-600" />}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------- Profile Dropdown (with settings and delete) ----------
function ProfileDropdown({ isOpen, onClose, user, onOpenSettings }) {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) onClose();
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    onClose();
    navigate('/login');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                {getInitials(user.fullName, user.email)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.fullName || user.email}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="py-1.5">
            <div className="px-3 py-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${getRandomRoleColor(user.role)}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {user.role}
              </span>
            </div>
          </div>
          <div className="border-t border-slate-100 py-1.5">
            <button onClick={() => { onOpenSettings(); onClose(); }} className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
              <User size={16} /> Account Settings
            </button>
            <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const defaultSettings = {
  companyName: "Hanthana",
  contactPhone: "+94 76 835 6860",
  contactEmail: "support@hanthana.com",
  address: "No 01, Ja Ela, Sri Lanka",
  services: [
    "Sealed Bottle Delivery",
    "Water Refill",
    "Office Supply",
    "Bulk Distribution",
  ],
};

// ---------- Main AdminLayout Component ----------
export default function AdminLayout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false); 
  const [hasPendingSettingsRequest, setHasPendingSettingsRequest] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [pendingSettingsCount, setPendingSettingsCount] = useState(0);
  const [maintenanceBanner, setMaintenanceBanner] = useState(null);

  // Permissions & roles
  const [permissions, setPermissions] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [viewRole, setViewRole] = useState(null);
  const [effectivePermissions, setEffectivePermissions] = useState([]);

  const isAdmin = user?.role === 'ADMIN';

    // ── Fetch settings ──
    useEffect(() => {
      const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
  
      const response = await fetch("http://localhost:5000/api/settings/public", {
        headers,
      });
      const data = await response.json();
  
      if (data.success && data.data.general) {
        const general = data.data.general;
        setSettings({
          companyName: general.companyName || defaultSettings.companyName,
          contactPhone:
            general.contactPhone ||
            general.companyPhone ||
            defaultSettings.contactPhone,
          contactEmail:
            general.contactEmail ||
            general.companyEmail ||
            defaultSettings.contactEmail,
          address: general.address || defaultSettings.address,
          services: general.services || defaultSettings.services,
        });
      }
    } catch (error) {
      console.error("Fetch settings error:", error);
    } finally {
      setSettingsLoading(false);
    }
  };
  
      fetchSettings();
    }, []);

  // Fetch current user's permissions
  const fetchPermissions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/auth/permissions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setPermissions(data.permissions || []);
    } catch (err) {
      console.error('Failed to fetch permissions', err);
    }
  }, []);

  const fetchPendingSettingsCount = useCallback(async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('http://localhost:5000/api/settings/requests/pending-count', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    if (data.success) setPendingSettingsCount(data.count);
  } catch (err) {
    console.error('Failed to fetch pending settings count:', err);
  }
}, []);


const fetchMaintenanceStatus = useCallback(async () => {
  try {
    const response = await fetch('http://localhost:5000/api/maintenance/mode');
    const data = await response.json();
    if (data.success && data.enabled) {
      setMaintenanceBanner({ message: data.message || 'System is under maintenance.' });
    } else {
      setMaintenanceBanner(null);
    }
  } catch (err) {
    console.error('Failed to fetch maintenance status:', err);
  }
}, []);

useEffect(() => {
  fetchMaintenanceStatus();
  const interval = setInterval(fetchMaintenanceStatus, 60000);
  return () => clearInterval(interval);
}, [fetchMaintenanceStatus]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setUnreadCount(data.count);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  const fetchPendingSettingsRequest = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/settings/requests/pending-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setHasPendingSettingsRequest((data.count || 0) > 0);
    } catch (err) {
      console.error('Failed to fetch pending settings request:', err);
    }
  }, []);


  useEffect(() => {
  if (!user) return;
  // CEO ta pending count, Admin ta rejected(unseen) count — dekама methanin fetch karanawa
  fetchPendingSettingsRequest();
  const interval = setInterval(fetchPendingSettingsRequest, 30000);
  return () => clearInterval(interval);
}, [user, fetchPendingSettingsRequest]);

  // Fetch all roles (for admin switcher)
  const fetchAllRoles = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/auth/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setAllRoles(data.roles || []);
    } catch (err) {
      console.error('Failed to fetch roles', err);
    }
  }, []);

  // Fetch permissions for a specific role (when admin switches)
  const fetchPermissionsForRole = useCallback(async (roleName) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/auth/permissions/${roleName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) return data.permissions || [];
      return [];
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (user) {
      fetchPermissions();
      if (isAdmin) fetchAllRoles();
    }
  }, [user, isAdmin, fetchPermissions, fetchAllRoles]);

  // When admin switches viewRole, fetch permissions for that role
  useEffect(() => {
    if (isAdmin && viewRole && viewRole !== user.role) {
      fetchPermissionsForRole(viewRole).then(setEffectivePermissions);
    } else {
      setEffectivePermissions([]);
    }
  }, [isAdmin, viewRole, user?.role, fetchPermissionsForRole]);


  useEffect(() => {
  if (!user || user.role?.toUpperCase() !== 'CEO') return;
  fetchPendingSettingsCount();
  const interval = setInterval(fetchPendingSettingsCount, 30000);
  return () => clearInterval(interval);
  }, [user, fetchPendingSettingsCount]);

  useEffect(() => {
    if (!user) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user, fetchUnreadCount]);

  const handleNotificationsToggle = () => {
    setNotificationsOpen((prev) => {
      if (prev) fetchUnreadCount();
      return !prev;
    });
  };

  

  // Determine which nav items to show
  const filteredNavItems = NAV_ITEMS.filter((item) => {
    if (isAdmin && viewRole && viewRole !== user.role) {
      // Admin viewing as another role
      return effectivePermissions.includes(item.id);
    } else {
      // Normal user (or admin not switching)
      return permissions.includes(item.id);
    }
  });

  const isActive = (item) => location.pathname === item.path;
  const handleNavClick = (item) => {
    navigate(item.path);
    setSidebarOpen(false);
  };

  const handleUpdateUser = (updatedData) => {
    // Optionally refresh user data from backend, or just reload
    window.location.reload();
  };

  const handleClick = () => navigate('/');

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] overflow-hidden">


    {/* ✅ Maintenance Banner — full width, okkomatama uda */}
    {maintenanceBanner && (
      <div className="flex-shrink-0 bg-amber-500 text-white text-sm font-medium px-4 py-2 text-center">
        🛠️ {maintenanceBanner.message}
      </div>
    )}
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white border-r border-slate-200/80 shadow-sm transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-md">
              <Droplets size={20} className="text-white cursor-pointer transition-transform hover:scale-110" onClick={handleClick} />
            </div>
            <div>
              <span className="text-base font-bold text-slate-800">{settings.companyName}</span>
              <p className="text-[10px] font-medium text-slate-400 uppercase">ERP System</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-lg text-slate-400">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredNavItems.map((item) => (
            <div key={item.id} className="relative">
              <SidebarItem item={item} isActive={isActive(item)} onClick={() => handleNavClick(item)} />
              {item.id === 'settings-request' && hasPendingSettingsRequest && (
                <span className="absolute top-1 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
              )}
            </div>
          ))}
        </nav>

        <div className="flex-shrink-0 p-3 border-t border-slate-100">
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100/60 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Droplets size={14} className="text-blue-600" />
              <span className="text-xs font-semibold text-blue-800">{settings.companyName}</span>
            </div>
            <p className="text-[11px] text-slate-500">Water Management ERP v1.0</p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-600 font-medium">System Online</span>
            </div>
          </div>
        </div>
      </aside>

    

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top navbar */}
        <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100">
                <Menu size={22} />
              </button>

              {/* Role Switcher (only for ADMIN) */}
              {isAdmin && allRoles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => {
                      setRoleSwitcherOpen(!roleSwitcherOpen);
                      setNotificationsOpen(false);
                      setProfileOpen(false);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white/60 hover:bg-slate-50 shadow-sm"
                  >
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${getRandomRoleColor(viewRole || user.role)}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {viewRole || user.role}
                    </span>
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${roleSwitcherOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <RoleSwitcher
                    isOpen={roleSwitcherOpen}
                    onClose={() => setRoleSwitcherOpen(false)}
                    onSelectRole={(role) => setViewRole(role === user.role ? null : role)}
                    currentRole={viewRole || user.role}
                    availableRoles={allRoles}
                  />
                </div>
              )}

              <div className="hidden md:flex items-center">
                <div className="h-5 w-px bg-slate-200 mx-2" />
                <p className="text-sm text-slate-400">{filteredNavItems.find((item) => isActive(item))?.label || 'Dashboard'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <div className="relative">
                <button onClick={handleNotificationsToggle} className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100">
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <NotificationPanel isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
              </div>
              
              <div className="h-8 w-px bg-slate-200" />
              {/* Profile */}
              <div className="relative">
                <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-xs font-bold text-white shadow-md">
                    {getInitials(user.fullName, user.email)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-slate-700">{user.fullName || user.email}</p>
                  </div>
                  <ChevronDown size={14} className="hidden sm:block text-slate-400" />
                </button>
                <ProfileDropdown
                  isOpen={profileOpen}
                  onClose={() => setProfileOpen(false)}
                  user={user}
                  onOpenSettings={() => setSettingsModalOpen(true)}
                />
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Single Combined Account Settings Modal */}
      <AccountSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        user={user}
        onUpdate={handleUpdateUser}
      />
    </div>

    </div>
  );
}