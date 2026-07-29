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

// Validation functions
const validateFullName = (name) => {
  if (!name || name.trim().length === 0) {
    return 'Full name is required';
  }
  if (name.trim().length < 2) {
    return 'Full name must be at least 2 characters';
  }
  if (name.trim().length > 50) {
    return 'Full name must be less than 50 characters';
  }
  if (!/^[a-zA-Z\s\-']+$/.test(name.trim())) {
    return 'Full name can only contain letters, spaces, hyphens, and apostrophes';
  }
  return '';
};

const validatePhone = (phone) => {
  if (!phone || phone.trim().length === 0) {
    return ''; // Phone is optional
  }
  
  // Check if phone contains only digits
  if (!/^\d+$/.test(phone.trim())) {
    return 'Phone number can only contain digits';
  }
  
  if (phone.trim().length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }
  
  return '';
};

const validatePassword = (password) => {
  if (!password || password.length === 0) {
    return 'Password is required to update your profile';
  }
  if (password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  return '';
};

const validateAddress = (address) => {
  if (!address || address.trim().length === 0) {
    return 'Address is required';
  }
  if (address.trim().length < 5) {
    return 'Address must be at least 5 characters';
  }
  if (address.trim().length > 200) {
    return 'Address must be less than 200 characters';
  }
  return '';
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
  const [editAddressForm, setEditAddressForm] = useState({ address: '' });
  const [deletePassword, setDeletePassword] = useState('');
  const [userHasPassword, setUserHasPassword] = useState(false);

  // Validation error states
  const [validationErrors, setValidationErrors] = useState({
    fullName: '',
    phone: '',
    currentPassword: '',
  });
  const [addressValidationErrors, setAddressValidationErrors] = useState({
    address: '',
  });
  const [deleteValidationError, setDeleteValidationError] = useState('');

  // UI states
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileSuccess, setEditProfileSuccess] = useState('');
  const [editAddressError, setEditAddressError] = useState('');
  const [editAddressSuccess, setEditAddressSuccess] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [showProfilePwd, setShowProfilePwd] = useState(false);
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [sendingResetLink, setSendingResetLink] = useState(false);
  const [touched, setTouched] = useState({
    fullName: false,
    phone: false,
    currentPassword: false,
  });
  const [addressTouched, setAddressTouched] = useState({
    address: false,
  });

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
          
          // ✅ Check password status from backend
          await checkUserHasPassword();
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

  // ========== Validation Handlers ==========
  const validateProfileForm = () => {
    const errors = {
      fullName: validateFullName(editProfileForm.fullName),
      phone: validatePhone(editProfileForm.phone),
      currentPassword: validatePassword(editProfileForm.currentPassword),
    };
    
    setValidationErrors(errors);
    
    // Return true if no errors
    return !Object.values(errors).some(error => error !== '');
  };

  const validateAddressForm = () => {
    const errors = {
      address: validateAddress(editAddressForm.address),
    };
    
    setAddressValidationErrors(errors);
    
    // Return true if no errors
    return !Object.values(errors).some(error => error !== '');
  };

  const validateDeleteForm = () => {
    const error = validatePassword(deletePassword);
    setDeleteValidationError(error);
    return error === '';
  };

  // ========== Field Change Handlers with Real-time Validation ==========
  const handleProfileFieldChange = (field, value) => {
    setEditProfileForm(prev => ({ ...prev, [field]: value }));
    setTouched(prev => ({ ...prev, [field]: true }));
    
    // Real-time validation
    let error = '';
    switch(field) {
      case 'fullName':
        error = validateFullName(value);
        break;
      case 'phone':
        error = validatePhone(value);
        break;
      case 'currentPassword':
        error = validatePassword(value);
        break;
      default:
        break;
    }
    setValidationErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleAddressFieldChange = (field, value) => {
    setEditAddressForm(prev => ({ ...prev, [field]: value }));
    setAddressTouched(prev => ({ ...prev, [field]: true }));
    
    // Real-time validation
    let error = '';
    switch(field) {
      case 'address':
        error = validateAddress(value);
        break;
      default:
        break;
    }
    setAddressValidationErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleDeletePasswordChange = (value) => {
    setDeletePassword(value);
    const error = validatePassword(value);
    setDeleteValidationError(error);
  };

  // ========== Send Password Reset Link ==========
// ========== Send Password Reset Link ==========
const handleSendResetLink = async () => {
  setSendingResetLink(true);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;

    toast.success('Password reset link sent to your email!');
    
    // ✅ Store flag that user is setting a password
    localStorage.setItem('settingPassword', 'true');
  } catch (err) {
    toast.error(err.message || 'Failed to send reset link');
  } finally {
    setSendingResetLink(false);
  }
};

// Add this useEffect to check if user just set a password
useEffect(() => {
  const checkIfPasswordSet = async () => {
    const settingPassword = localStorage.getItem('settingPassword');
    if (settingPassword === 'true') {
      // User just set a password, check status
      await checkUserHasPassword();
      localStorage.removeItem('settingPassword');
    }
  };
  
  checkIfPasswordSet();
}, []);

  // ========== Edit Profile ==========
  const openEditProfile = () => {
    setEditProfileForm({ fullName, phone, currentPassword: '' });
    setValidationErrors({ fullName: '', phone: '', currentPassword: '' });
    setTouched({ fullName: false, phone: false, currentPassword: false });
    setEditProfileError('');
    setEditProfileSuccess('');
    setEditProfileModal(true);
  };

  const handleEditProfileSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      fullName: true,
      phone: true,
      currentPassword: true,
    });
    
    // Validate all fields
    if (!validateProfileForm()) {
      toast.error('Please fix all validation errors');
      return;
    }

    setUpdating(true);
    setEditProfileError('');
    setEditProfileSuccess('');
    try {
      const requestBody = {
        fullName: editProfileForm.fullName.trim(),
        phone: editProfileForm.phone.trim(),
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
      
      setFullName(editProfileForm.fullName.trim());
      setPhone(editProfileForm.phone.trim());
      setAvatar((editProfileForm.fullName.trim()?.[0] || email[0]).toUpperCase());
      setEditProfileSuccess('Profile updated successfully');
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
    setEditAddressForm({ address });
    setAddressValidationErrors({ address: '' });
    setAddressTouched({ address: false });
    setEditAddressError('');
    setEditAddressSuccess('');
    setEditAddressModal(true);
  };

  const handleEditAddressSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setAddressTouched({
      address: true,
    });
    
    // Validate all fields
    if (!validateAddressForm()) {
      toast.error('Please fix all validation errors');
      return;
    }

    setUpdating(true);
    setEditAddressError('');
    setEditAddressSuccess('');
    try {
      const requestBody = {
        address: editAddressForm.address.trim(),
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
      setAddress(editAddressForm.address.trim());
      setEditAddressSuccess('Address updated successfully');
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
// ========== Delete Account ==========
const handleDeleteAccount = async () => {
  // Check if user has entered anything in the password field
  if (!deletePassword || deletePassword.trim() === '') {
    setDeleteValidationError('Please enter your password to confirm deletion');
    toast.error('Please enter your password to confirm deletion');
    return;
  }

  // If user has password, validate format (minimum length)
  if (userHasPassword) {
    if (deletePassword.length < 6) {
      setDeleteValidationError('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }
  }

  setUpdating(true);
  setDeleteError('');
  setDeleteValidationError('');
  
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
    
    if (!res.ok) {
      const errorMessage = data.message || data.error || 'Deletion failed';
      
      // Check if it's a password-related error
      if (errorMessage.toLowerCase().includes('invalid password') || 
          errorMessage.toLowerCase().includes('invalid login') ||
          errorMessage.toLowerCase().includes('incorrect password')) {
        setDeleteError('Incorrect password. Please try again.');
        toast.error('Incorrect password. Please try again.');
      } else if (errorMessage.toLowerCase().includes('password is required')) {
        setDeleteError('Password is required to delete your account.');
        toast.error('Password is required to delete your account.');
      } else {
        setDeleteError(errorMessage);
        toast.error(errorMessage);
      }
      setUpdating(false);
      return;
    }
    
    toast.success('Account deleted successfully');
    await logout();
    window.location.href = '/login';
  } catch (err) {
    console.error('Delete error:', err);
    setDeleteError(err.message || 'An error occurred');
    toast.error(err.message || 'An error occurred');
    setUpdating(false);
  }
};

// Add this function after your state declarations
const checkUserHasPassword = async () => {
  try {
    if (!token) return false;
    
    const res = await fetch('http://localhost:5000/api/auth/check-password', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (res.ok) {
      const data = await res.json();
      setUserHasPassword(data.hasPassword || false);
      return data.hasPassword || false;
    }
    return false;
  } catch (error) {
    console.error('Error checking password status:', error);
    return false;
  }
};

  // Get auth provider badge
  const getAuthBadge = () => {
    if (userHasPassword) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-full border border-emerald-200 shadow-sm">
          <Key className="w-4 h-4 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">Password Protected</span>
        </div>
      );
    } else if (isGoogleUser) {
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
  onClick={async () => {
    await checkUserHasPassword(); // ✅ Check password status before opening
    setDeleteModalOpen(true);
  }}
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Edit Profile
              </h2>
              <button onClick={() => setEditProfileModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditProfileSubmit} noValidate className="p-6 space-y-4">
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
                           
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={editProfileForm.fullName} 
                    onChange={(e) => handleProfileFieldChange('fullName', e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, fullName: true }))}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                      touched.fullName && validationErrors.fullName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                  />
                </div>
                {touched.fullName && validationErrors.fullName && (
                  <div className="mt-1 flex items-start gap-1.5 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{validationErrors.fullName}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1.5">2-50 characters, letters only</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="tel" 
                    value={editProfileForm.phone} 
                    onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                      touched.phone && validationErrors.phone ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your phone number"
                  />
                </div>
                {touched.phone && validationErrors.phone && (
                  <div className="mt-1 flex items-start gap-1.5 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{validationErrors.phone}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1.5">Optional. 10-15 digits</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type={showProfilePwd ? 'text' : 'password'} 
                    value={editProfileForm.currentPassword} 
                    onChange={(e) => handleProfileFieldChange('currentPassword', e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, currentPassword: true }))}
                    className={`w-full pl-9 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                      touched.currentPassword && validationErrors.currentPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your current password"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowProfilePwd(!showProfilePwd)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showProfilePwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {touched.currentPassword && validationErrors.currentPassword && (
                  <div className="mt-1 flex items-start gap-1.5 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{validationErrors.currentPassword}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1.5">Required to confirm your identity</p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setEditProfileModal(false);
                    setEditProfileError('');
                    setEditProfileSuccess('');
                    setValidationErrors({ fullName: '', phone: '', currentPassword: '' });
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center px-6 py-4 border-b sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-600" />
                Edit Address
              </h2>
              <button onClick={() => setEditAddressModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleEditAddressSubmit} noValidate className="p-6 space-y-4">
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
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea 
                    value={editAddressForm.address} 
                    onChange={(e) => handleAddressFieldChange('address', e.target.value)}
                    onBlur={() => setAddressTouched(prev => ({ ...prev, address: true }))}
                    rows={3} 
                    className={`w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                      addressTouched.address && addressValidationErrors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full address"
                  />
                </div>
                {addressTouched.address && addressValidationErrors.address && (
                  <div className="mt-1 flex items-start gap-1.5 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{addressValidationErrors.address}</span>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1.5">5-200 characters</p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setEditAddressModal(false);
                    setEditAddressError('');
                    setEditAddressSuccess('');
                    setAddressValidationErrors({ address: '' });
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
      {/* ========== DELETE ACCOUNT MODAL ========== */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4"
          >
            <div className="flex justify-between items-center px-6 py-4 border-b border-red-100">
              <h2 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </h2>
              <button 
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeleteError('');
                  setDeletePassword('');
                  setDeleteValidationError('');
                }} 
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={(e) => e.preventDefault()} noValidate className="p-6 space-y-4">
              {/* Warning Message */}
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl text-red-700 border border-red-200">
                <AlertCircle size={20} className="flex-shrink-0" />
                <p className="text-sm font-medium">This action is irreversible. All your data will be permanently removed.</p>
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Enter your password to confirm
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type={showDeletePwd ? 'text' : 'password'} 
                    value={deletePassword} 
                    onChange={(e) => {
                      setDeletePassword(e.target.value);
                      if (deleteError) setDeleteError('');
                      if (deleteValidationError) setDeleteValidationError('');
                    }}
                    onBlur={() => {
                      if (deletePassword && deletePassword.length < 6) {
                        setDeleteValidationError('Password must be at least 6 characters');
                      } else {
                        setDeleteValidationError('');
                      }
                    }}
                    className={`w-full pl-10 pr-10 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all ${
                      deleteValidationError || deleteError ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Enter your password" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowDeletePwd(!showDeletePwd)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showDeletePwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                
                {/* Validation Error */}
                {deleteValidationError && !deleteError && (
                  <div className="flex items-start gap-1.5 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{deleteValidationError}</span>
                  </div>
                )}
                
                {/* Server Error */}
                {deleteError && (
                  <div className="flex items-start gap-1.5 text-red-500">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    <span className="text-xs">{deleteError}</span>
                  </div>
                )}
                
                <p className="text-xs text-gray-400">
                  {userHasPassword 
                    ? 'Enter your current password to delete your account' 
                    : 'Enter your password to confirm deletion (Google users need to set a password first)'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteError('');
                    setDeletePassword('');
                    setDeleteValidationError('');
                  }} 
                  className="flex-1 px-4 py-2.5 border rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="button"
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
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Profile;