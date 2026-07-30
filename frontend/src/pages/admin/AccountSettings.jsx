import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Key,
  Save,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Shield,
  Clock,
  AlertCircle,
  ChevronRight,
  Send,
  RefreshCw,
  Camera,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../supabaseClient';

// Validation helpers
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

const validatePassword = (password) => {
  if (password.length < 6) return 'Password must be at least 6 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'Password must contain at least one special character';
  return null;
};

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Active section state
  const [activeSection, setActiveSection] = useState('profile');
  
  // Profile state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [profileCurrentPassword, setProfileCurrentPassword] = useState('');

  // Profile image state
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState({ type: '', text: '' });
  const fileInputRef = useRef(null);
  
  // Email change state
  const [newEmail, setNewEmail] = useState('');
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [emailChangeStatus, setEmailChangeStatus] = useState(null);
  const [pendingNewEmail, setPendingNewEmail] = useState('');
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Delete account state
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  
  // UI state
  const [loading, setLoading] = useState({
    profile: false,
    email: false,
    password: false,
    delete: false,
    resetPassword: false
  });
  const [messages, setMessages] = useState({
    profile: { type: '', text: '' },
    email: { type: '', text: '' },
    password: { type: '', text: '' },
    delete: { type: '', text: '' },
    resetPassword: { type: '', text: '' }
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Validation state
  const [validation, setValidation] = useState({
    email: { isValid: true, message: '' },
    phone: { isValid: true, message: '' },
    newEmail: { isValid: true, message: '' },
    newPassword: { isValid: true, message: '' },
    confirmPassword: { isValid: true, message: '' }
  });
  
  const [hasPassword, setHasPassword] = useState(true);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [showResetPasswordForm, setShowResetPasswordForm] = useState(false);
 const [sendingResetLink, setSendingResetLink] = useState(false);
  // Check user type on mount
  useEffect(() => {
    const checkUserType = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        if (data.success) {
          setHasPassword(data.user.hasPassword || false);
          setIsGoogleUser(data.user.provider === 'google');
          setEmail(data.user.email || '');
          setFullName(data.user.fullName || '');
          setPhone(data.user.phone || '');
          setAddress(data.user.address || '');
          setProfileImage(data.user.profileImage || null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    checkUserType();
  }, []);

  // Check email confirmation status periodically
  useEffect(() => {
    const checkConfirmation = async () => {
      if (emailChangeStatus === 'pending') {
        try {
          await refreshUser();
          
          const token = localStorage.getItem('token');
          const response = await fetch('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();
          
          if (data.success && data.user) {
            const currentEmail = data.user.email;
            
            // Check if email was updated
            if (currentEmail !== email && currentEmail === pendingNewEmail) {
              setEmail(currentEmail);
              setEmailChangeStatus('confirmed');
              setMessages(prev => ({
                ...prev,
                email: { 
                  type: 'success', 
                  text: `Email confirmed and updated to ${currentEmail}!` 
                }
              }));
              setPendingNewEmail('');
            }
          }
        } catch (error) {
          console.error('Error checking email confirmation:', error);
        }
      }
    };

    const interval = setInterval(checkConfirmation, 5000);
    return () => clearInterval(interval);
  }, [emailChangeStatus, email, pendingNewEmail, refreshUser]);

  // Handle resend from verification page
  useEffect(() => {
    if (location.state?.resendVerification) {
      setActiveSection('email');
      setTimeout(() => {
        handleResendVerification();
      }, 500);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Email validation
  const validateEmailField = (value) => {
    if (!value) {
      setValidation(prev => ({ ...prev, email: { isValid: false, message: 'Email is required' } }));
      return false;
    }
    if (!validateEmail(value)) {
      setValidation(prev => ({ ...prev, email: { isValid: false, message: 'Please enter a valid email address' } }));
      return false;
    }
    setValidation(prev => ({ ...prev, email: { isValid: true, message: '' } }));
    return true;
  };

  // Phone validation
  const validatePhoneField = (value) => {
    if (value && !validatePhone(value)) {
      setValidation(prev => ({ ...prev, phone: { isValid: false, message: 'Please enter a valid phone number' } }));
      return false;
    }
    setValidation(prev => ({ ...prev, phone: { isValid: true, message: '' } }));
    return true;
  };

  // New email validation
  const validateNewEmail = (value) => {
    if (!value) {
      setValidation(prev => ({ ...prev, newEmail: { isValid: false, message: 'New email is required' } }));
      return false;
    }
    if (!validateEmail(value)) {
      setValidation(prev => ({ ...prev, newEmail: { isValid: false, message: 'Please enter a valid email address' } }));
      return false;
    }
    if (value === email) {
      setValidation(prev => ({ ...prev, newEmail: { isValid: false, message: 'New email must be different from current email' } }));
      return false;
    }
    setValidation(prev => ({ ...prev, newEmail: { isValid: true, message: '' } }));
    return true;
  };

  // Password validation
  const validateNewPasswordField = (value) => {
    const error = validatePassword(value);
    if (error) {
      setValidation(prev => ({ ...prev, newPassword: { isValid: false, message: error } }));
      return false;
    }
    setValidation(prev => ({ ...prev, newPassword: { isValid: true, message: '' } }));
    return true;
  };

  const validateConfirmPassword = (value) => {
    if (value !== newPassword) {
      setValidation(prev => ({ ...prev, confirmPassword: { isValid: false, message: 'Passwords do not match' } }));
      return false;
    }
    setValidation(prev => ({ ...prev, confirmPassword: { isValid: true, message: '' } }));
    return true;
  };

  // ---------- UPLOAD PROFILE IMAGE ----------
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageMessage({ type: 'error', text: 'Please select a valid image file.' });
      setTimeout(() => setImageMessage({ type: '', text: '' }), 4000);
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setImageMessage({ type: 'error', text: 'Image must be smaller than 5MB.' });
      setTimeout(() => setImageMessage({ type: '', text: '' }), 4000);
      return;
    }

    setUploadingImage(true);
    setImageMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('profileImage', file);

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/profile-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
          // NOTE: Do NOT set Content-Type manually here -
          // the browser sets the correct multipart boundary automatically.
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload profile photo');
      }

      setProfileImage(data.profileImage);
      await refreshUser();

      setImageMessage({ type: 'success', text: 'Profile photo updated!' });
      setTimeout(() => setImageMessage({ type: '', text: '' }), 4000);
    } catch (error) {
      setImageMessage({ type: 'error', text: error.message });
      setTimeout(() => setImageMessage({ type: '', text: '' }), 4000);
    } finally {
      setUploadingImage(false);
      // reset input so selecting the same file again still fires onChange
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ---------- REMOVE PROFILE IMAGE ----------
  const handleRemoveImage = async () => {
    setUploadingImage(true);
    setImageMessage({ type: '', text: '' });
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/profile-image', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to remove profile photo');
      }

      setProfileImage(null);
      await refreshUser();
      setImageMessage({ type: 'success', text: 'Profile photo removed.' });
      setTimeout(() => setImageMessage({ type: '', text: '' }), 4000);
    } catch (error) {
      setImageMessage({ type: 'error', text: error.message });
      setTimeout(() => setImageMessage({ type: '', text: '' }), 4000);
    } finally {
      setUploadingImage(false);
    }
  };

  // ---------- RESEND VERIFICATION ----------
  const handleResendVerification = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/resend-email-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend verification');
      }
      
      setMessages(prev => ({
        ...prev,
        email: { type: 'success', text: 'Verification email resent successfully. Please check your inbox.' }
      }));
      
      setTimeout(() => {
        setMessages(prev => ({ ...prev, email: { type: '', text: '' } }));
      }, 5000);
      
    } catch (error) {
      setMessages(prev => ({
        ...prev,
        email: { type: 'error', text: error.message }
      }));
    }
  };

  // ---------- UPDATE PROFILE ----------
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    
    if (!validateEmailField(email)) return;
    if (!validatePhoneField(phone)) return;
    
    if (!hasPassword && !isGoogleUser) {
      setMessages(prev => ({
        ...prev,
        profile: { type: 'error', text: 'Please set a password first using the password section below.' }
      }));
      return;
    }
    
    if (hasPassword && !profileCurrentPassword) {
      setMessages(prev => ({
        ...prev,
        profile: { type: 'error', text: 'Current password is required to update your profile.' }
      }));
      return;
    }
    
    setLoading(prev => ({ ...prev, profile: true }));
    setMessages(prev => ({ ...prev, profile: { type: '', text: '' } }));
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        fullName: fullName.trim(),
        phone: phone.trim(),
        address: address.trim()
      };
      
      if (hasPassword) {
        payload.currentPassword = profileCurrentPassword;
      }
      
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }
      
      setMessages(prev => ({
        ...prev,
        profile: { type: 'success', text: 'Profile updated successfully!' }
      }));
      setProfileCurrentPassword('');
      
      await refreshUser();
      
      setTimeout(() => {
        setMessages(prev => ({ ...prev, profile: { type: '', text: '' } }));
      }, 5000);
      
    } catch (error) {
      setMessages(prev => ({
        ...prev,
        profile: { type: 'error', text: error.message }
      }));
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  };

  // ---------- CHANGE EMAIL ----------
  const handleEmailChange = async (e) => {
    e.preventDefault();
    
    if (!validateNewEmail(newEmail)) return;
    
    // Always require password verification for email change
    if (!emailChangePassword) {
      setMessages(prev => ({
        ...prev,
        email: { type: 'error', text: 'Current password is required to change your email.' }
      }));
      return;
    }
    
    setLoading(prev => ({ ...prev, email: true }));
    setMessages(prev => ({ ...prev, email: { type: '', text: '' } }));
    setEmailChangeStatus(null);
    
    try {
      const token = localStorage.getItem('token');
      const payload = {
        newEmail: newEmail.trim(),
        currentPassword: emailChangePassword
      };
      
      const response = await fetch('http://localhost:5000/api/auth/change-email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to change email');
      }
      
      setEmailChangeStatus('pending');
      setPendingNewEmail(newEmail.trim());
      
      setMessages(prev => ({
        ...prev,
        email: { 
          type: 'info', 
          text: `Verification email sent to ${newEmail}. Please check your inbox and click the confirmation link.` 
        }
      }));
      setNewEmail('');
      setEmailChangePassword('');
      
      setTimeout(() => {
        setMessages(prev => ({ ...prev, email: { type: '', text: '' } }));
      }, 10000);
      
    } catch (error) {
      setEmailChangeStatus('error');
      setMessages(prev => ({
        ...prev,
        email: { type: 'error', text: error.message }
      }));
    } finally {
      setLoading(prev => ({ ...prev, email: false }));
    }
  };

  // ---------- SEND PASSWORD RESET LINK ----------
  const handleSendResetLink = async () => {
    setSendingResetLink(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessages(prev => ({
        ...prev,
        resetPassword: { type: 'success', text: 'Password reset link sent to your email!' }
      }));
    } catch (err) {
      setMessages(prev => ({
        ...prev,
        resetPassword: { type: 'error', text: err.message || 'Failed to send reset link' }
      }));
    } finally {
      setSendingResetLink(false);
    }
  };

  // ---------- CHANGE PASSWORD ----------
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (!validateNewPasswordField(newPassword)) return;
    if (!validateConfirmPassword(confirmPassword)) return;
    
    if (!currentPassword) {
      setMessages(prev => ({
        ...prev,
        password: { type: 'error', text: 'Current password is required.' }
      }));
      return;
    }
    
    setLoading(prev => ({ ...prev, password: true }));
    setMessages(prev => ({ ...prev, password: { type: '', text: '' } }));
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/auth/update-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update password');
      }
      
      setMessages(prev => ({
        ...prev,
        password: { type: 'success', text: 'Password changed successfully!' }
      }));
      
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setMessages(prev => ({ ...prev, password: { type: '', text: '' } }));
      }, 5000);
      
    } catch (error) {
      setMessages(prev => ({
        ...prev,
        password: { type: 'error', text: error.message }
      }));
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

  // ---------- SET PASSWORD FOR GOOGLE USER ----------
  const handleSetPassword = async (e) => {
    e.preventDefault();
    
    if (!validateNewPasswordField(newPassword)) return;
    if (!validateConfirmPassword(confirmPassword)) return;
    
    setLoading(prev => ({ ...prev, password: true }));
    setMessages(prev => ({ ...prev, password: { type: '', text: '' } }));
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          newPassword,
          confirmPassword
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to set password');
      }
      
      setMessages(prev => ({
        ...prev,
        password: { type: 'success', text: 'Password set successfully! You can now log in with email and password.' }
      }));
      
      setHasPassword(true);
      setNewPassword('');
      setConfirmPassword('');
      
      setTimeout(() => {
        setMessages(prev => ({ ...prev, password: { type: '', text: '' } }));
      }, 5000);
      
    } catch (error) {
      setMessages(prev => ({
        ...prev,
        password: { type: 'error', text: error.message }
      }));
    } finally {
      setLoading(prev => ({ ...prev, password: false }));
    }
  };

// ---------- DELETE ACCOUNT ----------
const handleDeleteAccount = async () => {
  if (!profileCurrentPassword) {
    setMessages(prev => ({
      ...prev,
      delete: { type: 'error', text: 'Current password is required to delete your account.' }
    }));
    setShowDeleteModal(false);
    return;
  }
  
  setLoading(prev => ({ ...prev, delete: true }));
  setMessages(prev => ({ ...prev, delete: { type: '', text: '' } }));
  
  try {
    const token = localStorage.getItem('token');
    const payload = {
      password: profileCurrentPassword
    };
    
    const response = await fetch('http://localhost:5000/api/auth/account', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete account');
    }
    
    await supabase.auth.signOut();
    localStorage.removeItem('token');
    navigate('/login', { 
      state: { message: 'Your account has been deleted successfully.' } 
    });
    
  } catch (error) {
    setMessages(prev => ({
      ...prev,
      delete: { type: 'error', text: error.message }
    }));
    setLoading(prev => ({ ...prev, delete: false }));
    setShowDeleteModal(false);
  }
};

  // Section navigation items
  const sections = [
    { id: 'profile', label: 'Profile Information', icon: User },
    { id: 'email', label: 'Email Settings', icon: Mail },
    { id: 'password', label: 'Password & Security', icon: Lock },
    { id: 'delete', label: 'Delete Account', icon: Trash2 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200/60 px-6 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your profile, security preferences, and account settings</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden sticky top-8">
              <div className="p-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="relative group flex-shrink-0">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg shadow-md overflow-hidden">
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center disabled:cursor-wait"
                      title="Change profile photo"
                    >
                      {uploadingImage ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera size={16} className="text-white" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {user?.fullName || user?.email}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      user?.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                      user?.role === 'CEO' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {user?.role || 'User'}
                    </span>
                  </div>
                </div>
                {imageMessage.type && (
                  <div className={`mt-3 px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${
                    imageMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {imageMessage.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                    <span className="truncate">{imageMessage.text}</span>
                  </div>
                )}
                {profileImage && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={uploadingImage}
                    className="mt-2 text-xs text-red-500 hover:text-red-600 disabled:opacity-50"
                  >
                    Remove photo
                  </button>
                )}
              </div>
              <nav className="p-2 space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                      <span className="flex-1 text-left">{section.label}</span>
                      {isActive && (
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      )}
                    </button>
                  );
                })}
              </nav>
              <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                <button
                  onClick={() => navigate('/app/dashboard')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-800 rounded-xl hover:bg-white transition-colors"
                >
                  <ChevronRight size={16} className="rotate-180" />
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {activeSection === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800">Profile Information</h2>
                    <p className="text-sm text-slate-500 mt-1">Update your personal information and contact details</p>
                  </div>

                  {/* Profile Photo Section */}
                  <div className="p-6 border-b border-slate-100">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-5">
                      <div className="relative group">
                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-bold text-2xl shadow-md overflow-hidden">
                          {profileImage ? (
                            <img
                              src={profileImage}
                              alt="Profile"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            user?.fullName ? user.fullName.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        {uploadingImage && (
                          <div className="absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center">
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingImage}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50"
                          >
                            <Camera size={16} />
                            {profileImage ? 'Change Photo' : 'Upload Photo'}
                          </button>
                          {profileImage && (
                            <button
                              type="button"
                              onClick={handleRemoveImage}
                              disabled={uploadingImage}
                              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={16} />
                              Remove
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">JPG, PNG or GIF. Max size 5MB.</p>
                        {imageMessage.type && (
                          <span className={`text-xs flex items-center gap-1.5 ${
                            imageMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {imageMessage.type === 'success' ? <CheckCircle size={14} /> : <XCircle size={14} />}
                            {imageMessage.text}
                          </span>
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                  
                  <form onSubmit={handleProfileUpdate} className="p-6 space-y-5">
                    {messages.profile.type && (
                      <div className={`p-4 rounded-xl flex items-start gap-3 ${
                        messages.profile.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                        messages.profile.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {messages.profile.type === 'success' && <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />}
                        {messages.profile.type === 'error' && <XCircle size={20} className="flex-shrink-0 mt-0.5" />}
                        {messages.profile.type === 'info' && <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />}
                        <span className="text-sm">{messages.profile.text}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Full Name
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                            placeholder="Enter your full name"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              validateEmailField(e.target.value);
                            }}
                            className={`w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow ${
                              validation.email.isValid ? 'border-slate-300' : 'border-red-300 bg-red-50'
                            }`}
                            placeholder="Enter your email address"
                            disabled={isGoogleUser}
                          />
                          {isGoogleUser && (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              Google
                            </span>
                          )}
                        </div>
                        {!validation.email.isValid && (
                          <p className="mt-1.5 text-sm text-red-600">{validation.email.message}</p>
                        )}
                        {isGoogleUser && (
                          <p className="mt-1.5 text-sm text-amber-600 flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            Email managed by Google. Change it through your Google account.
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            validatePhoneField(e.target.value);
                          }}
                          className={`w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow ${
                            validation.phone.isValid ? 'border-slate-300' : 'border-red-300 bg-red-50'
                          }`}
                          placeholder="Enter your phone number"
                        />
                      </div>
                      {!validation.phone.isValid && (
                        <p className="mt-1.5 text-sm text-red-600">{validation.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          rows={3}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow resize-none"
                          placeholder="Enter your address"
                        />
                      </div>
                    </div>

                    {hasPassword && (
                      <div className="border-t border-slate-100 pt-5">
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Current Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type="password"
                            value={profileCurrentPassword}
                            onChange={(e) => setProfileCurrentPassword(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                            placeholder="Enter your current password to save changes"
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                          Your current password is required to verify your identity before making changes.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loading.profile}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading.profile ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save size={18} />
                        )}
                        Save Profile Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFullName(user?.fullName || '');
                          setEmail(user?.email || '');
                          setPhone(user?.phone || '');
                          setAddress(user?.address || '');
                          setProfileCurrentPassword('');
                          setMessages(prev => ({ ...prev, profile: { type: '', text: '' } }));
                        }}
                        className="px-6 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeSection === 'email' && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800">Email Settings</h2>
                    <p className="text-sm text-slate-500 mt-1">Change your email address and manage verification</p>
                  </div>

                  <form onSubmit={handleEmailChange} className="p-6 space-y-5">
                    {messages.email.type && (
                      <div className={`p-4 rounded-xl flex items-start gap-3 ${
                        messages.email.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                        messages.email.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {messages.email.type === 'success' && <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />}
                        {messages.email.type === 'error' && <XCircle size={20} className="flex-shrink-0 mt-0.5" />}
                        {messages.email.type === 'info' && <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />}
                        <span className="text-sm whitespace-pre-line">{messages.email.text}</span>
                      </div>
                    )}

                    {emailChangeStatus === 'pending' && (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                        <Shield size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-700 font-medium">Verification Pending</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            You need to confirm the new email address by clicking the link sent to {pendingNewEmail || 'your new email'}.
                          </p>
                          <button
                            type="button"
                            onClick={handleResendVerification}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Resend Verification Email
                          </button>
                        </div>
                      </div>
                    )}

                    {emailChangeStatus === 'confirmed' && (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                        <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-green-700 font-medium">Email Verified Successfully!</p>
                          <p className="text-xs text-green-600 mt-0.5">
                            Your email has been changed to {email}.
                          </p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Current Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          disabled
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-600 cursor-not-allowed"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Your current email address. A verification email will be sent to the new address.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        New Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          value={newEmail}
                          onChange={(e) => {
                            setNewEmail(e.target.value);
                            validateNewEmail(e.target.value);
                          }}
                          className={`w-full pl-9 pr-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow ${
                            validation.newEmail.isValid ? 'border-slate-300' : 'border-red-300 bg-red-50'
                          }`}
                          placeholder="Enter your new email address"
                          disabled={emailChangeStatus === 'pending'}
                        />
                      </div>
                      {!validation.newEmail.isValid && (
                        <p className="mt-1.5 text-sm text-red-600">{validation.newEmail.message}</p>
                      )}
                    </div>

                    {/* Always show password field for email change */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          value={emailChangePassword}
                          onChange={(e) => setEmailChangePassword(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                          placeholder="Enter your current password"
                          disabled={emailChangeStatus === 'pending'}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Your current password is required to verify your identity.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loading.email || emailChangeStatus === 'pending'}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading.email ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Mail size={18} />
                        )}
                        Change Email
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewEmail('');
                          setEmailChangePassword('');
                          setMessages(prev => ({ ...prev, email: { type: '', text: '' } }));
                        }}
                        className="px-6 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-start gap-3">
                        <Clock size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-slate-600 font-medium">What happens next?</p>
                          <ul className="mt-1.5 space-y-1 text-xs text-slate-500">
                            <li>• A verification email will be sent to your new address</li>
                            <li>• You must click the confirmation link within 24 hours</li>
                            <li>• Your email will only change after verification</li>
                            <li>• A notification will be sent to your current email</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </form>
                </motion.div>
              )}

              {activeSection === 'password' && (
                <motion.div
                  key="password"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-800">Password & Security</h2>
                    <p className="text-sm text-slate-500 mt-1">
                      {hasPassword ? 'Change your password or manage security settings' : 'Set a password for your account'}
                    </p>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Password Reset Link Section */}
                    <div className="border-b border-slate-100 pb-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-sm font-medium text-slate-700">Reset Password</h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Send a password reset link to your email address
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowResetPasswordForm(!showResetPasswordForm)}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                        >
                          {showResetPasswordForm ? 'Hide' : 'Send Reset Link'}
                        </button>
                      </div>

                      {messages.resetPassword.type && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 ${
                          messages.resetPassword.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                          messages.resetPassword.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {messages.resetPassword.type === 'success' && <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />}
                          {messages.resetPassword.type === 'error' && <XCircle size={20} className="flex-shrink-0 mt-0.5" />}
                          {messages.resetPassword.type === 'info' && <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />}
                          <span className="text-sm whitespace-pre-line">{messages.resetPassword.text}</span>
                        </div>
                      )}

                      {showResetPasswordForm && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-sm text-slate-600 mb-3">
                            A password reset link will be sent to: <span className="font-medium">{email}</span>
                          </p>
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
                        </div>
                      )}
                    </div>

                    {/* Password Change/Set Section */}
                    <form onSubmit={hasPassword ? handlePasswordChange : handleSetPassword} className="space-y-5">
                      {messages.password.type && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 ${
                          messages.password.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                          messages.password.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {messages.password.type === 'success' && <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />}
                          {messages.password.type === 'error' && <XCircle size={20} className="flex-shrink-0 mt-0.5" />}
                          {messages.password.type === 'info' && <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />}
                          <span className="text-sm whitespace-pre-line">{messages.password.text}</span>
                        </div>
                      )}

                      {!hasPassword && (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                          <AlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-amber-700 font-medium">No Password Set</p>
                            <p className="text-xs text-amber-600 mt-0.5">
                              Your account is currently using Google authentication. Set a password to enable email login.
                            </p>
                          </div>
                        </div>
                      )}

                      {hasPassword && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1.5">
                            Current Password
                          </label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full pl-9 pr-12 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow"
                              placeholder="Enter your current password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          {hasPassword ? 'New Password' : 'Set Password'}
                        </label>
                        <div className="relative">
                          <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value);
                              validateNewPasswordField(e.target.value);
                              if (confirmPassword) validateConfirmPassword(confirmPassword);
                            }}
                            className={`w-full pl-9 pr-12 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow ${
                              validation.newPassword.isValid ? 'border-slate-300' : 'border-red-300 bg-red-50'
                            }`}
                            placeholder={hasPassword ? 'Enter your new password' : 'Create a new password'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {!validation.newPassword.isValid && (
                          <p className="mt-1.5 text-sm text-red-600">{validation.newPassword.message}</p>
                        )}
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-slate-500">Password requirements:</p>
                          <ul className="text-xs text-slate-400 space-y-0.5">
                            <li className={newPassword.length >= 6 ? 'text-green-600' : ''}>
                              • Minimum 6 characters {newPassword.length >= 6 && '✓'}
                            </li>
                            <li className={/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}>
                              • At least one uppercase letter {/[A-Z]/.test(newPassword) && '✓'}
                            </li>
                            <li className={/[a-z]/.test(newPassword) ? 'text-green-600' : ''}>
                              • At least one lowercase letter {/[a-z]/.test(newPassword) && '✓'}
                            </li>
                            <li className={/[0-9]/.test(newPassword) ? 'text-green-600' : ''}>
                              • At least one number {/[0-9]/.test(newPassword) && '✓'}
                            </li>
                            <li className={/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) ? 'text-green-600' : ''}>
                              • At least one special character {/[!@#$%^&*(),.?":{}|<>]/.test(newPassword) && '✓'}
                            </li>
                          </ul>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => {
                              setConfirmPassword(e.target.value);
                              validateConfirmPassword(e.target.value);
                            }}
                            className={`w-full pl-9 pr-12 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-shadow ${
                              validation.confirmPassword.isValid ? 'border-slate-300' : 'border-red-300 bg-red-50'
                            }`}
                            placeholder="Confirm your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        {!validation.confirmPassword.isValid && (
                          <p className="mt-1.5 text-sm text-red-600">{validation.confirmPassword.message}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={loading.password}
                          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-md shadow-blue-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading.password ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Save size={18} />
                          )}
                          {hasPassword ? 'Change Password' : 'Set Password'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                            setMessages(prev => ({ ...prev, password: { type: '', text: '' } }));
                          }}
                          className="px-6 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                          Clear
                        </button>
                      </div>

                      {hasPassword && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
                          <Shield size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm text-blue-700 font-medium">Security Tip</p>
                            <p className="text-xs text-blue-600 mt-0.5">
                              Use a strong, unique password that you don't use for other accounts. 
                              Consider using a password manager.
                            </p>
                          </div>
                        </div>
                      )}
                    </form>
                  </div>
                </motion.div>
              )}

              {activeSection === 'delete' && (
                <motion.div
                  key="delete"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden"
                >
                  <div className="p-6 border-b border-slate-100 bg-red-50/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-100 rounded-xl">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-red-700">Delete Account</h2>
                        <p className="text-sm text-red-600/80 mt-0.5">This action is permanent and cannot be undone</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {messages.delete.type && (
                      <div className={`p-4 rounded-xl flex items-start gap-3 ${
                        messages.delete.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                        messages.delete.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {messages.delete.type === 'success' && <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />}
                        {messages.delete.type === 'error' && <XCircle size={20} className="flex-shrink-0 mt-0.5" />}
                        {messages.delete.type === 'info' && <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />}
                        <span className="text-sm whitespace-pre-line">{messages.delete.text}</span>
                      </div>
                    )}

                    {/* Warning Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <span className="font-semibold text-red-700 text-sm">What will be deleted</span>
                        </div>
                        <ul className="space-y-1.5 text-sm text-red-600/80">
                          <li>• Your profile information</li>
                          <li>• All your activity data</li>
                          <li>• Any associated records</li>
                        </ul>
                      </div>
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="h-5 w-5 text-amber-600" />
                          <span className="font-semibold text-amber-700 text-sm">What will be preserved</span>
                        </div>
                        <ul className="space-y-1.5 text-sm text-amber-600/80">
                          <li>• Audit logs (for compliance)</li>
                          <li>• Historical records</li>
                          <li>• System integrity data</li>
                        </ul>
                      </div>
                    </div>

                    {/* Always show password field for delete account */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="password"
                          value={profileCurrentPassword}
                          onChange={(e) => setProfileCurrentPassword(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-shadow"
                          placeholder="Enter your password to verify identity"
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-slate-500">
                        Your password is required to confirm this action.
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteModal(true);
                        }}
                        disabled={loading.delete}
                        className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl shadow-md shadow-red-600/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading.delete ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={18} />
                        )}
                        Permanently Delete Account
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirmation('');
                          setMessages(prev => ({ ...prev, delete: { type: '', text: '' } }));
                        }}
                        className="px-6 py-2.5 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Delete Confirmation Modal */}
                  <AnimatePresence>
                    {showDeleteModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6"
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-xl">
                              <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-slate-800">Confirm Deletion</h3>
                              <p className="text-sm text-slate-500">This action cannot be undone</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                              <p className="text-sm text-red-700">
                                Are you sure you want to permanently delete your account? All your data will be lost.
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <button
                                onClick={handleDeleteAccount}
                                disabled={loading.delete}
                                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
                              >
                                {loading.delete ? (
                                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                                ) : (
                                  'Yes, Delete My Account'
                                )}
                              </button>
                              <button
                                onClick={() => setShowDeleteModal(false)}
                                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}