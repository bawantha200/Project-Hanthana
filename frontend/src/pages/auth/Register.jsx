import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Phone, AlertCircle, CheckCircle, Eye, EyeOff, AlertTriangle, X, LogIn, Shield, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  // Form input states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ 
    fullName: false, 
    email: false, 
    phone: false, 
    password: false,
    confirmPassword: false
  });
  const [registrationError, setRegistrationError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  // Password strength states
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0, // 0-4
    label: 'Weak',
    color: 'red',
    criteria: {
      length: false,
      uppercase: false,
      lowercase: false,
      number: false,
      special: false
    }
  });

  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();
  const timeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle field blur to mark as touched
  const handleFieldBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
    validateField(fieldName);
  };

  // Validate individual field
  const validateField = (fieldName) => {
    let error = '';
    
    switch(fieldName) {
      case 'fullName':
        if (!fullName.trim()) {
          error = 'Full name is required';
        } else if (fullName.trim().length < 2) {
          error = 'Name must be at least 2 characters';
        }
        break;
      case 'email':
        if (!email.trim()) {
          error = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          error = 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (!phone.trim()) {
          error = 'Phone number is required';
        } else if (phone.length < 10) {
          error = 'Phone number must be at least 10 digits';
        } else if (phone.length > 15) {
          error = 'Phone number is too long';
        }
        break;
      case 'password':
        if (!password.trim()) {
          error = 'Password is required';
        } else if (password.length < 8) {
          error = 'Password must be at least 8 characters';
        } else if (!/[A-Z]/.test(password)) {
          error = 'Password must contain at least one uppercase letter';
        } else if (!/[a-z]/.test(password)) {
          error = 'Password must contain at least one lowercase letter';
        } else if (!/[0-9]/.test(password)) {
          error = 'Password must contain at least one number';
        } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
          error = 'Password must contain at least one special character (!@#$%^&* etc.)';
        }
        break;
      case 'confirmPassword':
        if (!confirmPassword.trim()) {
          error = 'Please confirm your password';
        } else if (confirmPassword !== password) {
          error = 'Passwords do not match';
        }
        break;
      default:
        break;
    }
    
    setFieldErrors(prev => ({ ...prev, [fieldName]: error }));
    return error === '';
  };

  // Validate all fields
  const validateAllFields = () => {
    const fields = ['fullName', 'email', 'phone', 'password', 'confirmPassword'];
    let isValid = true;
    
    fields.forEach(field => {
      const isFieldValid = validateField(field);
      if (!isFieldValid) isValid = false;
    });
    
    return isValid;
  };

  // Check password strength
  const checkPasswordStrength = (pwd) => {
    const criteria = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
    };

    // Count met criteria
    const metCount = Object.values(criteria).filter(Boolean).length;

    // Calculate score (0-4)
    let score = 0;
    let label = 'Weak';
    let color = 'red';

    if (pwd.length === 0) {
      score = 0;
      label = 'Weak';
      color = 'red';
    } else if (metCount <= 2) {
      score = 1;
      label = 'Weak';
      color = 'red';
    } else if (metCount === 3) {
      score = 2;
      label = 'Fair';
      color = 'orange';
    } else if (metCount === 4) {
      score = 3;
      label = 'Good';
      color = 'blue';
    } else if (metCount === 5) {
      score = 4;
      label = 'Strong';
      color = 'green';
    }

    setPasswordStrength({ score, label, color, criteria });
  };

  // Handle phone number input - only allow numbers
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const numericValue = value.replace(/\D/g, '');
    setPhone(numericValue);
    if (touchedFields.phone) {
      validateField('phone');
    }
  };

  // Handle input changes with validation
  const handleInputChange = (field, value) => {
    const setters = {
      fullName: setFullName,
      email: setEmail,
      password: setPassword,
      confirmPassword: setConfirmPassword
    };
    
    if (setters[field]) {
      setters[field](value);
      
      // Check password strength when password changes
      if (field === 'password') {
        checkPasswordStrength(value);
        // Also re-validate confirm password if it has a value
        if (confirmPassword && touchedFields.confirmPassword) {
          validateField('confirmPassword');
        }
      }
      
      if (touchedFields[field]) {
        validateField(field);
      }
    }
  };

  // Validate form on submit
  const validateForm = () => {
    setTouchedFields({ 
      fullName: true, 
      email: true, 
      phone: true, 
      password: true,
      confirmPassword: true
    });
    
    // Check password strength before submission
    checkPasswordStrength(password);
    
    const isValid = validateAllFields();
    
    if (!isValid) {
      setRegistrationError('Please fix all errors before continuing');
      return false;
    }
    
    // Require at least "Good" password strength (score >= 3)
    if (passwordStrength.score < 3) {
      setRegistrationError('Please use a stronger password (at least "Good" strength)');
      return false;
    }
    
    return true;
  };

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    setRegistrationError('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed');
      }

      // Show success modal
      setShowSuccessModal(true);
      setIsRedirecting(true);
      
      // Set timeout for navigation - wait 2.5 seconds
      timeoutRef.current = setTimeout(() => {
        setShowSuccessModal(false);
        setIsRedirecting(false);
        navigate('/login');
      }, 2500);

    } catch (error) {
      setFailureMessage(error.message || 'Registration failed. Please try again.');
      setShowFailureModal(true);
    } finally {
      setLoading(false);
    }
  }, [email, password, fullName, phone, navigate, passwordStrength]);

  const handleGoogleSignIn = async () => {
    console.log("Initiating Google Sign-In via Context Wrapper Layer...");
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Google Authentication sequence error intercept:", error);
      setFailureMessage('Google Sign-In failed. Please try again.');
      setShowFailureModal(true);
    }
  };

  // Get field error state
  const getFieldErrorState = (field) => {
    if (!touchedFields[field]) return { hasError: false, message: '' };
    return {
      hasError: !!fieldErrors[field],
      message: fieldErrors[field]
    };
  };

  // Get password strength icon
  const getStrengthIcon = () => {
    const { score, color } = passwordStrength;
    const iconClass = `w-5 h-5`;
    
    if (score === 0) return <Shield className={`${iconClass} text-gray-300`} />;
    if (score === 1) return <ShieldAlert className={`${iconClass} text-red-500`} />;
    if (score === 2) return <ShieldAlert className={`${iconClass} text-orange-500`} />;
    if (score === 3) return <ShieldCheck className={`${iconClass} text-blue-500`} />;
    if (score === 4) return <ShieldCheck className={`${iconClass} text-green-500`} />;
    return <Shield className={`${iconClass} text-gray-300`} />;
  };

  return (
    <div className="min-h-screen bg-blue-50/30 flex flex-col justify-center py-12 px-6 relative overflow-hidden">
      
      {/* Video Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover opacity-30"
        >
          <source 
            src="/videos/bg_video.mp4" 
            type="video/mp4" 
          />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Background Bubbles */}
      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 5, repeat: Infinity }}
        className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200 rounded-full blur-3xl opacity-50"
      />
      <motion.div
        animate={{ y: [0, 20, 0] }}
        transition={{ duration: 7, repeat: Infinity, delay: 1 }}
        className="absolute -bottom-24 -right-24 w-96 h-96 bg-cyan-100 rounded-full blur-3xl opacity-50"
      />

      {/* Main Registration Form Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white/70 py-8 px-10 shadow-2xl rounded-3xl border border-white backdrop-blur-sm">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-500 text-sm mt-2">Join Hanthana Water Delivery today</p>
          </div>

          {/* Registration Error Display */}
          {registrationError && !showFailureModal && !showSuccessModal && (
            <div className="flex items-start gap-3 rounded-xl p-3 mb-5 border bg-red-50 border-red-200">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Registration Failed</p>
                <p className="text-xs text-red-600 mt-0.5">{registrationError}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleRegister} className="space-y-5" noValidate>
            {/* Full Name Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Full Name
                </label>
                {getFieldErrorState('fullName').hasError && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </div>
              <div className={`relative transition-all duration-200 ${
                getFieldErrorState('fullName').hasError
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl' 
                  : touchedFields.fullName && !getFieldErrorState('fullName').hasError
                  ? 'ring-2 ring-green-500 ring-offset-2 rounded-xl'
                  : ''
              }`}>
                <User className={`absolute left-3 top-3.5 h-5 w-5 ${
                  getFieldErrorState('fullName').hasError ? 'text-red-500' : 'text-gray-400'
                }`} />
                <input 
                  type="text"
                  value={fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  onBlur={() => handleFieldBlur('fullName')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    getFieldErrorState('fullName').hasError
                      ? 'border-red-500 bg-red-50' 
                      : touchedFields.fullName && !getFieldErrorState('fullName').hasError
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                  placeholder="Enter your full name"
                />
                {getFieldErrorState('fullName').hasError && (
                  <div className="absolute right-3 top-3.5">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                )}
                {touchedFields.fullName && !getFieldErrorState('fullName').hasError && fullName.trim() && (
                  <div className="absolute right-3 top-3.5">
                    <CheckCircle size={18} className="text-green-500" />
                  </div>
                )}
              </div>
              {getFieldErrorState('fullName').hasError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fieldErrors.fullName}
                </p>
              )}
            </div>

            {/* Email Address Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                {getFieldErrorState('email').hasError && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </div>
              <div className={`relative transition-all duration-200 ${
                getFieldErrorState('email').hasError
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl' 
                  : touchedFields.email && !getFieldErrorState('email').hasError
                  ? 'ring-2 ring-green-500 ring-offset-2 rounded-xl'
                  : ''
              }`}>
                <Mail className={`absolute left-3 top-3.5 h-5 w-5 ${
                  getFieldErrorState('email').hasError ? 'text-red-500' : 'text-gray-400'
                }`} />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleFieldBlur('email')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    getFieldErrorState('email').hasError
                      ? 'border-red-500 bg-red-50' 
                      : touchedFields.email && !getFieldErrorState('email').hasError
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                  placeholder="name@example.com"
                />
                {getFieldErrorState('email').hasError && (
                  <div className="absolute right-3 top-3.5">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                )}
                {touchedFields.email && !getFieldErrorState('email').hasError && email.trim() && (
                  <div className="absolute right-3 top-3.5">
                    <CheckCircle size={18} className="text-green-500" />
                  </div>
                )}
              </div>
              {getFieldErrorState('email').hasError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Phone Number Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                {getFieldErrorState('phone').hasError && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </div>
              <div className={`relative transition-all duration-200 ${
                getFieldErrorState('phone').hasError
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl' 
                  : touchedFields.phone && !getFieldErrorState('phone').hasError
                  ? 'ring-2 ring-green-500 ring-offset-2 rounded-xl'
                  : ''
              }`}>
                <Phone className={`absolute left-3 top-3.5 h-5 w-5 ${
                  getFieldErrorState('phone').hasError ? 'text-red-500' : 'text-gray-400'
                }`} />
                <input 
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => handleFieldBlur('phone')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    getFieldErrorState('phone').hasError
                      ? 'border-red-500 bg-red-50' 
                      : touchedFields.phone && !getFieldErrorState('phone').hasError
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                  placeholder="0771234567"
                  maxLength={15}
                />
                {getFieldErrorState('phone').hasError && (
                  <div className="absolute right-3 top-3.5">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                )}
                {touchedFields.phone && !getFieldErrorState('phone').hasError && phone.trim() && (
                  <div className="absolute right-3 top-3.5">
                    <CheckCircle size={18} className="text-green-500" />
                  </div>
                )}
              </div>
              {getFieldErrorState('phone').hasError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fieldErrors.phone}
                </p>
              )}
              {touchedFields.phone && !getFieldErrorState('phone').hasError && phone.trim() && (
                <p className="text-xs text-green-500 mt-1.5 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Valid phone number
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
                {getFieldErrorState('password').hasError && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </div>
              <div className={`relative transition-all duration-200 ${
                getFieldErrorState('password').hasError
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl' 
                  : touchedFields.password && !getFieldErrorState('password').hasError
                  ? 'ring-2 ring-green-500 ring-offset-2 rounded-xl'
                  : ''
              }`}>
                <Lock className={`absolute left-3 top-3.5 h-5 w-5 ${
                  getFieldErrorState('password').hasError ? 'text-red-500' : 'text-gray-400'
                }`} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  onBlur={() => handleFieldBlur('password')}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    getFieldErrorState('password').hasError
                      ? 'border-red-500 bg-red-50' 
                      : touchedFields.password && !getFieldErrorState('password').hasError
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                {getFieldErrorState('password').hasError && (
                  <div className="absolute right-12 top-3.5">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                )}
                {touchedFields.password && !getFieldErrorState('password').hasError && password.trim() && (
                  <div className="absolute right-12 top-3.5">
                    <CheckCircle size={18} className="text-green-500" />
                  </div>
                )}
              </div>

              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2 space-y-1.5">
                  {/* Strength bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                        transition={{ duration: 0.3 }}
                        className={`h-full rounded-full transition-all duration-300 ${
                          passwordStrength.score === 0 ? 'bg-gray-300' :
                          passwordStrength.score === 1 ? 'bg-red-500' :
                          passwordStrength.score === 2 ? 'bg-orange-500' :
                          passwordStrength.score === 3 ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-[70px]">
                      {getStrengthIcon()}
                      <span className={`text-xs font-medium ${
                        passwordStrength.score === 0 ? 'text-gray-400' :
                        passwordStrength.score === 1 ? 'text-red-500' :
                        passwordStrength.score === 2 ? 'text-orange-500' :
                        passwordStrength.score === 3 ? 'text-blue-500' :
                        'text-green-500'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                  </div>

                  {/* Password criteria checklist */}
                  <div className="grid grid-cols-2 gap-1 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      {passwordStrength.criteria.length ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <AlertCircle size={12} className="text-gray-400" />
                      )}
                      <span className={`text-xs ${passwordStrength.criteria.length ? 'text-green-600' : 'text-gray-500'}`}>
                        ≥ 8 characters
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordStrength.criteria.uppercase ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <AlertCircle size={12} className="text-gray-400" />
                      )}
                      <span className={`text-xs ${passwordStrength.criteria.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                        Uppercase
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordStrength.criteria.lowercase ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <AlertCircle size={12} className="text-gray-400" />
                      )}
                      <span className={`text-xs ${passwordStrength.criteria.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                        Lowercase
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordStrength.criteria.number ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <AlertCircle size={12} className="text-gray-400" />
                      )}
                      <span className={`text-xs ${passwordStrength.criteria.number ? 'text-green-600' : 'text-gray-500'}`}>
                        Number
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      {passwordStrength.criteria.special ? (
                        <CheckCircle size={12} className="text-green-500" />
                      ) : (
                        <AlertCircle size={12} className="text-gray-400" />
                      )}
                      <span className={`text-xs ${passwordStrength.criteria.special ? 'text-green-600' : 'text-gray-500'}`}>
                        Special character (!@#$%^&* etc.)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {getFieldErrorState('password').hasError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                {getFieldErrorState('confirmPassword').hasError && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </div>
              <div className={`relative transition-all duration-200 ${
                getFieldErrorState('confirmPassword').hasError
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl' 
                  : touchedFields.confirmPassword && !getFieldErrorState('confirmPassword').hasError
                  ? 'ring-2 ring-green-500 ring-offset-2 rounded-xl'
                  : ''
              }`}>
                <Lock className={`absolute left-3 top-3.5 h-5 w-5 ${
                  getFieldErrorState('confirmPassword').hasError ? 'text-red-500' : 'text-gray-400'
                }`} />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  onBlur={() => handleFieldBlur('confirmPassword')}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    getFieldErrorState('confirmPassword').hasError
                      ? 'border-red-500 bg-red-50' 
                      : touchedFields.confirmPassword && !getFieldErrorState('confirmPassword').hasError
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                {getFieldErrorState('confirmPassword').hasError && (
                  <div className="absolute right-12 top-3.5">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                )}
                {touchedFields.confirmPassword && !getFieldErrorState('confirmPassword').hasError && confirmPassword.trim() && (
                  <div className="absolute right-12 top-3.5">
                    <CheckCircle size={18} className="text-green-500" />
                  </div>
                )}
              </div>
              {getFieldErrorState('confirmPassword').hasError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fieldErrors.confirmPassword}
                </p>
              )}
              {touchedFields.confirmPassword && !getFieldErrorState('confirmPassword').hasError && confirmPassword.trim() && (
                <p className="text-xs text-green-500 mt-1.5 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Passwords match
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                  Creating Account...
                </>
              ) : (
                <>
                  <User className="w-5 h-5 mr-2" />
                  Create Account
                </>
              )}
            </button>
          </form>

          {/* Social Divider */}
          <div className="mt-6">
            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-gray-400"></div>
              <span className="flex-shrink mx-4 text-gray-600 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-400"></div>
            </div>

            {/* Google Authentication Trigger */}
            <button 
              type="button"
              onClick={handleGoogleSignIn} 
              className="w-full mt-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-all flex justify-center items-center cursor-pointer relative z-30 gap-3"
            >
              <img 
                src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/google/google-original.svg" 
                className="w-5 h-5" 
                alt="Google" 
              />
              Continue with Google
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>

      {/* ── REGISTRATION SUCCESS MODAL ── */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!isRedirecting) {
                setShowSuccessModal(false);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-3xl shadow-2xl p-8 text-center border border-green-100">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Registration Successful!</h3>
                <p className="text-gray-500 mt-2">
                  Your account has been created successfully.
                </p>
                <p className="text-sm text-green-600 mt-1 font-medium">
                  {isRedirecting ? 'Redirecting to login...' : 'Click anywhere to continue'}
                </p>
                {isRedirecting && (
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      className="h-full bg-green-600 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "linear" }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── REGISTRATION FAILURE MODAL ── */}
      <AnimatePresence>
        {showFailureModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowFailureModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-3xl shadow-2xl p-8 text-center border border-red-100">
                <button
                  onClick={() => setShowFailureModal(false)}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Registration Failed</h3>
                <p className="text-gray-500 mt-2">
                  {failureMessage || 'Something went wrong. Please try again.'}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowFailureModal(false);
                      setRegistrationError('');
                    }}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    <LogIn size={18} />
                    Try Again
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Register;