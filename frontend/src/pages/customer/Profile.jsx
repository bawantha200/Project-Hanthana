import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, MapPin, Settings, Edit2, Save, X, Lock, Eye, EyeOff,
  Trash2, Phone, Mail, Globe, Key, CheckCircle,
  RefreshCw, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { supabase } from '../../supabaseClient';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const match = dateStr.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : '';
};

const Profile = () => {
  const { user: authUser, logout } = useAuth();
  const token = localStorage.getItem('token');

  // Determine auth provider
  const isGoogleUser = authUser?.provider === 'google' || 
                       authUser?.authProvider === 'google' ||
                       authUser?.identities?.some?.(id => id.provider === 'google') ||
                       authUser?.app_metadata?.provider === 'google';

  // Profile state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [memberSince, setMemberSince] = useState('');
  const [avatar, setAvatar] = useState('U');

  // Modal states
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [editAddressModal, setEditAddressModal] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Form states
  const [editProfileForm, setEditProfileForm] = useState({ fullName: '', phone: '', currentPassword: '' });
  const [editAddressForm, setEditAddressForm] = useState({ address: '', currentPassword: '' });
  const [deletePassword, setDeletePassword] = useState('');

  // UI states
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileSuccess, setEditProfileSuccess] = useState('');
  const [editAddressError, setEditAddressError] = useState('');
  const [editAddressSuccess, setEditAddressSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showProfilePwd, setShowProfilePwd] = useState(false);
  const [showAddressPwd, setShowAddressPwd] = useState(false);
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sendingResetLink, setSendingResetLink] = useState(false);

  // Fetch profile
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
        setFullName(authUser?.fullName || authUser?.user_metadata?.full_name || '');
        setEmail(authUser?.email || '');
        setPhone(authUser?.phone || authUser?.user_metadata?.phone || '');
        setAddress(authUser?.address || authUser?.user_metadata?.address || '');
        setMemberSince('');
        setAvatar((authUser?.fullName?.[0] || authUser?.email?.[0] || 'U').toUpperCase());
      }
    };

    fetchProfile();
  }, [authUser, token]);

  // ========== Send Password Reset Link ==========
  const handleSendResetLink = async () => {
    setSendingResetLink(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      toast.success('Password reset link sent to your email!');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset link');
    } finally {
      setSendingResetLink(false);
    }
  };

  // ========== Edit Profile ==========
  const openEditProfile = () => {
    setEditProfileForm({ fullName, phone, currentPassword: '' });
    setEditProfileError('');
    setEditProfileSuccess('');
    setEditProfileModal(true);
  };

  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    
    // REQUIRED: Password verification for all users
    if (!editProfileForm.currentPassword) {
      setEditProfileError('Password is required to update profile');
      toast.error('Password is required');
      return;
    }

    setUpdating(true);
    setEditProfileError('');
    setEditProfileSuccess('');
    try {
      const requestBody = {
        fullName: editProfileForm.fullName,
        phone: editProfileForm.phone,
        currentPassword: editProfileForm.currentPassword,
      };
      
      const res = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      
      setFullName(editProfileForm.fullName);
      setPhone(editProfileForm.phone);
      setAvatar((editProfileForm.fullName?.[0] || email[0]).toUpperCase());
      setEditProfileSuccess('✅ Profile updated successfully');
      toast.success('Profile updated successfully');
      setTimeout(() => {
        setEditProfileModal(false);
        setEditProfileSuccess('');
      }, 1500);
    } catch (err) {
      setEditProfileError(err.message);
      toast.error(err.message);
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
    
    // REQUIRED: Password verification for all users
    if (!editAddressForm.currentPassword) {
      setEditAddressError('Password is required to update address');
      toast.error('Password is required');
      return;
    }

    setUpdating(true);
    setEditAddressError('');
    setEditAddressSuccess('');
    try {
      const requestBody = {
        address: editAddressForm.address,
        currentPassword: editAddressForm.currentPassword,
      };
      
      const res = await fetch('http://localhost:5000/api/auth/address', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');
      setAddress(editAddressForm.address);
      setEditAddressSuccess('✅ Address updated successfully');
      toast.success('Address updated successfully');
      setTimeout(() => {
        setEditAddressModal(false);
        setEditAddressSuccess('');
      }, 1500);
    } catch (err) {
      setEditAddressError(err.message);
      toast.error(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // ========== Delete Account ==========
  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setDeleteError('Please enter your password');
      toast.error('Please enter your password');
      return;
    }

    setUpdating(true);
    setDeleteError('');
    try {
      const requestBody = {
        password: deletePassword,
      };
      
      const res = await fetch('http://localhost:5000/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Deletion failed');
      toast.success('Account deleted successfully');
      await logout();
      window.location.href = '/login';
    } catch (err) {
      setDeleteError(err.message);
      toast.error(err.message);
      setUpdating(false);
    }
  };

  // Get auth provider badge
  const getAuthBadge = () => {
    if (isGoogleUser) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-full border border-blue-200 shadow-sm">
          <Globe className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-medium text-blue-700">Logged in via Google</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-full border border-emerald-200 shadow-sm">
          <Mail className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">Logged in via Email</span>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                My Profile
              </h1>
              <p className="mt-1 text-gray-500">Manage your account settings and preferences</p>
            </div>
            <div className="flex items-center gap-2">
              {getAuthBadge()}
            </div>
          </div>
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
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                </div>
                <button
                  onClick={openEditProfile}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-all duration-200 hover:scale-105"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-200">
                  <span className="text-3xl font-bold text-white">{avatar}</span>
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Full Name</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{fullName || 'Not provided'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Email</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{email}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{phone || 'Not provided'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Member Since</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{memberSince || 'Not available'}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Saved Addresses Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-600 to-cyan-700 flex items-center justify-center shadow-lg shadow-cyan-200">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Saved Addresses</h2>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 transition-all duration-200 hover:shadow-md">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-r from-blue-600 to-cyan-600 shadow-md">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">Primary Address</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white shadow-sm">
                        Primary
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{address || 'No address added'}</p>
                  </div>
                  <button
                    onClick={openEditAddress}
                    className="p-2 rounded-lg hover:bg-white/60 transition-colors duration-200"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Security & Password Section */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Security & Password</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>Email:</strong> {email}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {isGoogleUser 
                      ? 'You are using Google authentication. You can still set a password using the reset link below.'
                      : 'You are using email/password authentication.'}
                  </p>
                </div>

                <button
                  onClick={handleSendResetLink}
                  disabled={sendingResetLink}
                  className="w-full py-3 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {sendingResetLink ? (
                    <>
                      <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 inline mr-2" />
                      Send Password Reset Link to Email
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-500 text-center">
                  A password reset link will be sent to your email address.
                </p>
              </div>
            </motion.div>

            {/* Account Settings */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-gray-800 to-gray-700 flex items-center justify-center shadow-lg shadow-gray-200">
                  <Settings className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setDeleteModalOpen(true)}
                  className="w-full py-3 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-all duration-200 hover:shadow-md transform hover:scale-[1.02]"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ========== EDIT PROFILE MODAL ========== */}
      {editProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Edit Profile
              </h2>
              <button onClick={() => setEditProfileModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditProfileSubmit} className="p-6 space-y-4">
              {editProfileError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
                  {editProfileError}
                </div>
              )}
              {editProfileSuccess && (
                <div className="p-3 text-sm text-green-600 bg-green-50 rounded-xl border border-green-200">
                  {editProfileSuccess}
                </div>
              )}
              
              <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700">
                  <span className="font-semibold">Password Required:</span> Enter your password to update your profile.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={editProfileForm.fullName} 
                    onChange={(e) => setEditProfileForm({...editProfileForm, fullName: e.target.value})} 
                    className="w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    required 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="tel" 
                    value={editProfileForm.phone} 
                    onChange={(e) => setEditProfileForm({...editProfileForm, phone: e.target.value})} 
                    className="w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type={showProfilePwd ? 'text' : 'password'} 
                    value={editProfileForm.currentPassword} 
                    onChange={(e) => setEditProfileForm({...editProfileForm, currentPassword: e.target.value})} 
                    className="w-full pl-9 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    required
                    placeholder="Enter your password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowProfilePwd(!showProfilePwd)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showProfilePwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Required to confirm your identity</p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setEditProfileModal(false);
                    setEditProfileError('');
                    setEditProfileSuccess('');
                  }} 
                  className="flex-1 px-4 py-2.5 border rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={updating} 
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-2.5 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                >
                  {updating ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Save size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========== EDIT ADDRESS MODAL ========== */}
      {editAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-600" />
                Edit Address
              </h2>
              <button onClick={() => setEditAddressModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditAddressSubmit} className="p-6 space-y-4">
              {editAddressError && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200">
                  {editAddressError}
                </div>
              )}
              {editAddressSuccess && (
                <div className="p-3 text-sm text-green-600 bg-green-50 rounded-xl border border-green-200">
                  {editAddressSuccess}
                </div>
              )}
              
              <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700">
                  <span className="font-semibold">Password Required:</span> Enter your password to update your address.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea 
                    value={editAddressForm.address} 
                    onChange={(e) => setEditAddressForm({...editAddressForm, address: e.target.value})} 
                    rows={3} 
                    className="w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    required 
                    placeholder="Enter your full address"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type={showAddressPwd ? 'text' : 'password'} 
                    value={editAddressForm.currentPassword} 
                    onChange={(e) => setEditAddressForm({...editAddressForm, currentPassword: e.target.value})} 
                    className="w-full pl-9 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                    required
                    placeholder="Enter your password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowAddressPwd(!showAddressPwd)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showAddressPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Required to confirm your identity</p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setEditAddressModal(false);
                    setEditAddressError('');
                    setEditAddressSuccess('');
                  }} 
                  className="flex-1 px-4 py-2.5 border rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={updating} 
                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white py-2.5 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                >
                  {updating ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Save size={16} />
                      Save Address
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ========== DELETE ACCOUNT MODAL ========== */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center px-6 py-4 border-b border-red-100">
              <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </h2>
              <button onClick={() => setDeleteModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl text-red-700 border border-red-200">
                <AlertCircle size={20} className="flex-shrink-0" />
                <p className="text-sm font-medium">This action is irreversible. All your data will be permanently removed.</p>
              </div>
              
              <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-700">Please enter your <strong>password</strong> to confirm account deletion.</p>
              </div>

              <p className="text-sm text-slate-600">Please enter your password to confirm:</p>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input 
                  type={showDeletePwd ? 'text' : 'password'} 
                  value={deletePassword} 
                  onChange={(e) => setDeletePassword(e.target.value)} 
                  className="w-full pl-9 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                  placeholder="Enter your password" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowDeletePwd(!showDeletePwd)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showDeletePwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteError('');
                    setDeletePassword('');
                  }} 
                  className="flex-1 px-4 py-2.5 border rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAccount} 
                  disabled={updating} 
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-2.5 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-70"
                >
                  {updating ? (
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Permanently
                    </>
                  )}
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