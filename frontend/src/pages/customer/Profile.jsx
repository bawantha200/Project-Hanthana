import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, MapPin, Settings, Shield, Edit2, Lock, Eye, EyeOff, Save, X, AlertCircle, Trash2, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Safe formatter for Supabase timestamp "2026-05-17 06:09:51.882458+00"
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const match = dateStr.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
};

const Profile = () => {
  const { user: authUser, logout } = useAuth();
  const token = localStorage.getItem('token');

  // Profile state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [avatar, setAvatar] = useState('U');

  // Orders state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState(false);

  // Modal states
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editAddressModal, setEditAddressModal] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Form states
  const [editProfileForm, setEditProfileForm] = useState({ fullName: '', phone: '', currentPassword: '' });
  const [editAddressForm, setEditAddressForm] = useState({ address: '', currentPassword: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [deletePassword, setDeletePassword] = useState('');

  // UI states
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileSuccess, setEditProfileSuccess] = useState('');
  const [editAddressError, setEditAddressError] = useState('');
  const [editAddressSuccess, setEditAddressSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Fetch profile (including created_at)
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const res = await fetch('http://localhost:5000/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success) {
          const p = data.profile;
          setFullName(p.full_name || '');
          setEmail(p.email || authUser?.email || '');
          setPhone(p.phone_number || '');
          setAddress(p.address || '');
          setMemberSince(formatDate(p.created_at));
          setAvatar((p.full_name?.[0] || authUser?.email?.[0] || 'U').toUpperCase());
        }
      } catch (err) {
        console.warn('Profile fetch error, using auth fallback:', err);
        // Fallback to authUser
        setFullName(authUser?.fullName || authUser?.user_metadata?.full_name || '');
        setEmail(authUser?.email || '');
        setPhone(authUser?.phone || authUser?.user_metadata?.phone || '');
        setAddress(authUser?.address || authUser?.user_metadata?.address || '');
        setMemberSince('');
        setAvatar((authUser?.fullName?.[0] || authUser?.email?.[0] || 'U').toUpperCase());
      }
    };

    const fetchOrders = async () => {
      if (!token) {
        setLoadingOrders(false);
        return;
      }
      try {
        const res = await fetch('http://localhost:5000/api/orders', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.warn('Orders endpoint not available:', err);
        setOrdersError(true);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchProfile();
    fetchOrders();
  }, [authUser, token]);

  // Order stats
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.amount || 0), 0);
  const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
  const pendingOrders = orders.filter(o => o.status !== 'Delivered').length;
  const recentOrders = orders.slice(0, 3);

  // ========== Edit Profile (name + phone) ==========
  const openEditProfile = () => {
    setEditProfileForm({ fullName, phone, currentPassword: '' });
    setEditProfileError('');
    setEditProfileSuccess('');
    setEditProfileModal(true);
  };

  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    if (!editProfileForm.currentPassword) {
      setEditProfileError('Current password is required');
      return;
    }
    setUpdating(true);
    setEditProfileError('');
    setEditProfileSuccess('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: editProfileForm.fullName,
          phone: editProfileForm.phone,
          currentPassword: editProfileForm.currentPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setFullName(editProfileForm.fullName);
      setPhone(editProfileForm.phone);
      setAvatar((editProfileForm.fullName?.[0] || email[0]).toUpperCase());
      setEditProfileSuccess('Profile updated');
      setTimeout(() => setEditProfileModal(false), 1500);
    } catch (err) {
      setEditProfileError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // ========== Edit Address ==========
  const openEditAddress = () => {
    setEditAddressForm({ address, currentPassword: '' });
    setEditAddressError('');
    setEditAddressSuccess('');
    setEditAddressModal(true);
  };

  const handleEditAddressSubmit = async (e) => {
    e.preventDefault();
    if (!editAddressForm.currentPassword) {
      setEditAddressError('Current password is required');
      return;
    }
    setUpdating(true);
    setEditAddressError('');
    setEditAddressSuccess('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/address', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          address: editAddressForm.address,
          currentPassword: editAddressForm.currentPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setAddress(editAddressForm.address);
      setEditAddressSuccess('Address updated');
      setTimeout(() => setEditAddressModal(false), 1500);
    } catch (err) {
      setEditAddressError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // ========== Change Password ==========
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }
    setUpdating(true);
    setPasswordError('');
    setPasswordSuccess('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/update-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password update failed');
      setPasswordSuccess('Password changed');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordModalOpen(false), 1500);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // ========== Delete Account ==========
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Please enter your password');
      return;
    }
    setUpdating(true);
    setDeleteError('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Deletion failed');
      await logout();
      window.location.href = '/login';
    } catch (err) {
      setDeleteError(err.message);
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="mt-1 text-gray-500">Manage your account settings and preferences</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                </div>
                <button
                  onClick={openEditProfile}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                  <span className="text-2xl font-bold text-white">{avatar}</span>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Full Name</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{fullName || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Member Since</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{memberSince || 'Not available'}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Saved Addresses Section (only one address) */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Saved Addresses</h2>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl border bg-blue-50 border-blue-200 transition-all duration-200 hover:shadow-sm">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-600">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">Primary Address</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                        Primary
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{address || 'No address added'}</p>
                  </div>
                  <button
                    onClick={openEditAddress}
                    className="p-1.5 rounded-lg hover:bg-white/60 transition-colors duration-200"
                  >
                    <Edit2 className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Order Summary */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
              </div>

              {loadingOrders ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : ordersError ? (
                <p className="text-sm text-gray-500 text-center py-4">Orders endpoint not available</p>
              ) : totalOrders === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No orders yet</p>
              ) : (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <span className="text-sm text-gray-600">Total Orders</span>
                      <span className="text-sm font-bold text-blue-700">{totalOrders}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="text-sm text-gray-600">Delivered</span>
                      <span className="text-sm font-bold text-emerald-700">{deliveredOrders}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 border border-yellow-100">
                      <span className="text-sm text-gray-600">Pending</span>
                      <span className="text-sm font-bold text-yellow-700">{pendingOrders}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100">
                      <span className="text-sm text-gray-600">Total Spent</span>
                      <span className="text-sm font-bold text-blue-700">LKR {totalSpent.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  {recentOrders.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Orders</p>
                      <div className="space-y-2">
                        {recentOrders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{order.product_name || order.product || 'Product'}</p>
                              <p className="text-xs text-gray-400">{order.id} · {order.date}</p>
                            </div>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                              order.status === 'Preparing' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>

            {/* Account Settings */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
              </div>
              <div className="mt-5 space-y-3">
                <button
                  onClick={() => setPasswordModalOpen(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
                >
                  Change Password
                </button>
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors duration-200"
                >
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {editProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Edit Profile</h2>
              <button onClick={() => setEditProfileModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditProfileSubmit} className="p-6 space-y-4">
              {editProfileError && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">{editProfileError}</div>}
              {editProfileSuccess && <div className="p-3 text-sm text-green-600 bg-green-50 rounded-xl">{editProfileSuccess}</div>}
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="text" value={editProfileForm.fullName} onChange={(e) => setEditProfileForm({...editProfileForm, fullName: e.target.value})} className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="tel" value={editProfileForm.phone} onChange={(e) => setEditProfileForm({...editProfileForm, phone: e.target.value})} className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type={showCurrentPwd ? 'text' : 'password'} value={editProfileForm.currentPassword} onChange={(e) => setEditProfileForm({...editProfileForm, currentPassword: e.target.value})} className="w-full pl-9 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" required />
                  <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditProfileModal(false)} className="flex-1 px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={updating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl shadow-md flex items-center justify-center gap-2">
                  {updating ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={16} />}
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Address Modal */}
      {editAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Edit Address</h2>
              <button onClick={() => setEditAddressModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditAddressSubmit} className="p-6 space-y-4">
              {editAddressError && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">{editAddressError}</div>}
              {editAddressSuccess && <div className="p-3 text-sm text-green-600 bg-green-50 rounded-xl">{editAddressSuccess}</div>}
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea value={editAddressForm.address} onChange={(e) => setEditAddressForm({...editAddressForm, address: e.target.value})} rows={3} className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="password" value={editAddressForm.currentPassword} onChange={(e) => setEditAddressForm({...editAddressForm, currentPassword: e.target.value})} className="w-full pl-9 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" required />
                  <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditAddressModal(false)} className="flex-1 px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={updating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl shadow-md flex items-center justify-center gap-2">
                  {updating ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={16} />}
                  Save
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Change Password</h2>
              <button onClick={() => setPasswordModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              {passwordError && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">{passwordError}</div>}
              {passwordSuccess && <div className="p-3 text-sm text-green-600 bg-green-50 rounded-xl">{passwordSuccess}</div>}
              <div>
                <label className="block text-sm font-medium mb-1">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})} className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type={showNewPwd ? 'text' : 'password'} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} className="w-full pl-9 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" required />
                  <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} className="w-full pl-9 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500" required />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPasswordModalOpen(false)} className="flex-1 px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={updating} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl shadow-md flex items-center justify-center gap-2">
                  {updating ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Save size={16} />}
                  Update
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-red-100">
              <h2 className="text-lg font-semibold text-red-600">Delete Account</h2>
              <button onClick={() => setDeleteModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl text-red-700">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">This action is irreversible. All your data will be permanently removed.</p>
              </div>
              <p className="text-sm text-slate-600">Please enter your password to confirm:</p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input type={showDeletePwd ? 'text' : 'password'} value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="w-full pl-9 pr-10 py-2 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none" placeholder="Your password" />
                <button type="button" onClick={() => setShowDeletePwd(!showDeletePwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showDeletePwd ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDeleteModalOpen(false)} className="flex-1 px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50">Cancel</button>
                <button onClick={handleDeleteAccount} disabled={updating} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl shadow-md flex items-center justify-center gap-2">
                  {updating ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Trash2 size={16} />}
                  Delete Permanently
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Profile;