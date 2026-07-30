import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff, AlertTriangle, X, LogIn, Shield, ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  // Form input states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  
  // Individual error states
  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  
  // Touch states
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  
  // Password strength states
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
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
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');

  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth();

  // Validate full name
  const validateFullName = (value) => {
    if (!value.trim()) {
      setFullNameError('Full name is required');
      return false;
    } else if (value.trim().length < 2) {
      setFullNameError('Name must be at least 2 characters');
      return false;
    }
    setFullNameError('');
    return true;
  };

  // Validate email
  const validateEmail = (value) => {
    if (!value.trim()) {
      setEmailError('Email address is required');
      return false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  // Validate password
  const validatePassword = (value) => {
    if (!value.trim()) {
      setPasswordError('Password is required');
      return false;
    } else if (value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    } else if (!/[A-Z]/.test(value)) {
      setPasswordError('Password must contain at least one uppercase letter');
      return false;
    } else if (!/[a-z]/.test(value)) {
      setPasswordError('Password must contain at least one lowercase letter');
      return false;
    } else if (!/[0-9]/.test(value)) {
      setPasswordError('Password must contain at least one number');
      return false;
    } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) {
      setPasswordError('Password must contain at least one special character');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // Validate confirm password
  const validateConfirmPassword = (value) => {
    console.log('validateConfirmPassword called with:', value, 'password is:', password);
    
    // If confirm password is empty
    if (!value || !value.trim()) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    }
    
    // If confirm password doesn't match password
    if (value !== password) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    }
    
    // All valid
    setConfirmPasswordError('');
    return true;
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

    const metCount = Object.values(criteria).filter(Boolean).length;

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

  // Handle input changes
  const handleFullNameChange = (e) => {
    const value = e.target.value;
    setFullName(value);
    if (fullNameTouched) {
      validateFullName(value);
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (emailTouched) {
      validateEmail(value);
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    checkPasswordStrength(value);
    if (passwordTouched) {
      validatePassword(value);
    }
    // If confirm password has content, re-validate it
    if (confirmPassword && confirmPassword.trim()) {
      validateConfirmPassword(confirmPassword);
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    // Always validate confirm password when typing
    if (value !== undefined) {
      validateConfirmPassword(value);
    }
  };

  // Handle blur events
  const handleFullNameBlur = () => {
    setFullNameTouched(true);
    validateFullName(fullName);
  };

  const handleEmailBlur = () => {
    setEmailTouched(true);
    validateEmail(email);
  };

  const handlePasswordBlur = () => {
    setPasswordTouched(true);
    validatePassword(password);
  };

  const handleConfirmPasswordBlur = () => {
    setConfirmPasswordTouched(true);
    validateConfirmPassword(confirmPassword);
  };

  // Validate all fields - use the CURRENT state values
  const validateAllFields = () => {
    console.log('Validating all fields');
    console.log('Current confirmPassword value:', confirmPassword);
    console.log('Current password value:', password);
    
    // Get current values directly from state
    const currentFullName = fullName;
    const currentEmail = email;
    const currentPassword = password;
    const currentConfirmPassword = confirmPassword;
    
    const isFullNameValid = validateFullName(currentFullName);
    const isEmailValid = validateEmail(currentEmail);
    const isPasswordValid = validatePassword(currentPassword);
    const isConfirmPasswordValid = validateConfirmPassword(currentConfirmPassword);
    
    console.log('Validation results:', {
      isFullNameValid,
      isEmailValid,
      isPasswordValid,
      isConfirmPasswordValid,
      confirmPasswordValue: currentConfirmPassword
    });
    
    // Mark all as touched
    setFullNameTouched(true);
    setEmailTouched(true);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);
    
    return isFullNameValid && isEmailValid && isPasswordValid && isConfirmPasswordValid;
  };

  // Handle registration
  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    setRegistrationError('');
    
    // Log current state before validation
    console.log('Before validation - confirmPassword:', confirmPassword);
    console.log('Before validation - password:', password);
    
    if (!validateAllFields()) {
      setRegistrationError('Please fix all errors before continuing');
      return;
    }
    
    if (passwordStrength.score < 3) {
      setRegistrationError('Please use a stronger password (at least "Good" strength)');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/register/phase1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
          fullName: fullName.trim()
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        let errorMessage;
        try {
          const data = JSON.parse(text);
          errorMessage = data.message || `Server error: ${response.status}`;
        } catch {
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Registration phase 1 failed');
      }

      const registrationData = {
        fullName: fullName.trim(),
        email: email.trim(),
      };
      localStorage.setItem('registrationData', JSON.stringify(registrationData));
      
      if (data.tempToken) {
        localStorage.setItem('registrationTempToken', data.tempToken);
      }

      navigate('/complete-profile');
      
    } catch (error) {
      console.error('Registration error:', error);
      setFailureMessage(error.message || 'Registration failed. Please try again.');
      setShowFailureModal(true);
    } finally {
      setLoading(false);
    }
  }, [email, password, fullName, confirmPassword, navigate, passwordStrength.score]);

  const handleGoogleSignIn = async () => {
    try {
      localStorage.setItem('googleSignInPending', 'true');
      await loginWithGoogle();
    } catch (error) {
      console.error("Google Authentication error:", error);
      setFailureMessage('Google Sign-In failed. Please try again.');
      setShowFailureModal(true);
    }
  };

  const getStrengthIcon = () => {
    const { score } = passwordStrength;
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <video autoPlay loop muted playsInline className="w-full h-full object-cover opacity-30">
          <source src="/videos/bg_video.mp4" type="video/mp4" />
        </video>
      </div>

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

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white/70 py-8 px-10 shadow-2xl rounded-3xl border border-white backdrop-blur-sm">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-500 text-sm mt-2">Join Hanthana Water Delivery today</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <span className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                Basic Info
              </span>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <span className="flex items-center gap-2 text-sm font-medium text-gray-400">
                <span className="w-6 h-6 bg-gray-300 text-white rounded-full flex items-center justify-center text-xs">2</span>
                Details
              </span>
            </div>
          </div>

          {registrationError && !showFailureModal && (
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
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                {fullNameTouched && fullNameError && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </div>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input 
                  type="text"
                  value={fullName}
                  onChange={handleFullNameChange}
                  onBlur={handleFullNameBlur}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    fullNameTouched && fullNameError
                      ? 'border-red-500 bg-red-50' 
                      : fullNameTouched && !fullNameError && fullName.trim()
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {fullNameTouched && fullNameError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {fullNameError}
                </p>
              )}
              {fullNameTouched && !fullNameError && fullName.trim() && (
                <p className="text-xs text-green-500 mt-1.5 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Valid name
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">Email Address</label>
                {emailTouched && emailError && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input 
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    emailTouched && emailError
                      ? 'border-red-500 bg-red-50' 
                      : emailTouched && !emailError && email.trim()
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200'
                  }`}
                  placeholder="name@example.com"
                />
              </div>
              {emailTouched && emailError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {emailError}
                </p>
              )}
              {emailTouched && !emailError && email.trim() && (
                <p className="text-xs text-green-500 mt-1.5 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Valid email
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                {passwordTouched && passwordError && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={handlePasswordBlur}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    passwordTouched && passwordError
                      ? 'border-red-500 bg-red-50' 
                      : passwordTouched && !passwordError && password.trim()
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
              </div>

              {password && (
                <div className="mt-2 space-y-1.5">
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
                  <div className="grid grid-cols-2 gap-1 mt-1.5">
                    <div className="flex items-center gap-1.5">
                      {passwordStrength.criteria.length ? <CheckCircle size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-gray-400" />}
                      <span className={`text-xs ${passwordStrength.criteria.length ? 'text-green-600' : 'text-gray-500'}`}>≥ 8 characters</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordStrength.criteria.uppercase ? <CheckCircle size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-gray-400" />}
                      <span className={`text-xs ${passwordStrength.criteria.uppercase ? 'text-green-600' : 'text-gray-500'}`}>Uppercase</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordStrength.criteria.lowercase ? <CheckCircle size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-gray-400" />}
                      <span className={`text-xs ${passwordStrength.criteria.lowercase ? 'text-green-600' : 'text-gray-500'}`}>Lowercase</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {passwordStrength.criteria.number ? <CheckCircle size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-gray-400" />}
                      <span className={`text-xs ${passwordStrength.criteria.number ? 'text-green-600' : 'text-gray-500'}`}>Number</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      {passwordStrength.criteria.special ? <CheckCircle size={12} className="text-green-500" /> : <AlertCircle size={12} className="text-gray-400" />}
                      <span className={`text-xs ${passwordStrength.criteria.special ? 'text-green-600' : 'text-gray-500'}`}>Special character</span>
                    </div>
                  </div>
                </div>
              )}

              {passwordTouched && passwordError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {passwordError}
                </p>
              )}
            </div>

            {/* Confirm Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                {confirmPasswordTouched && confirmPasswordError && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onBlur={handleConfirmPasswordBlur}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    confirmPasswordTouched && confirmPasswordError
                      ? 'border-red-500 bg-red-50' 
                      : confirmPasswordTouched && !confirmPasswordError && confirmPassword.trim() && confirmPassword === password
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
              </div>
              {confirmPasswordTouched && confirmPasswordError && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {confirmPasswordError}
                </p>
              )}
              {confirmPasswordTouched && !confirmPasswordError && confirmPassword.trim() && confirmPassword === password && (
                <p className="text-xs text-green-500 mt-1.5 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Passwords match
                </p>
              )}
            </div>

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
                  <span>Continue</span>
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-gray-400"></div>
              <span className="flex-shrink mx-4 text-gray-600 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-400"></div>
            </div>

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
                <p className="text-gray-500 mt-2">{failureMessage || 'Something went wrong. Please try again.'}</p>
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