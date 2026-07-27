import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Lock, Phone, AlertCircle, CheckCircle, Eye, EyeOff, AlertTriangle, X, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Register = () => {
  // Form input states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ 
    fullName: false, 
    email: false, 
    phone: false, 
    password: false 
  });
  const [registrationError, setRegistrationError] = useState('');
  
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
  };

  // ✅ Handle phone number input - only allow numbers
  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Only allow digits
    const numericValue = value.replace(/\D/g, '');
    setPhone(numericValue);
  };

  // Validate form fields
  const validateForm = () => {
    setTouchedFields({ 
      fullName: true, 
      email: true, 
      phone: true, 
      password: true 
    });

    if (!fullName.trim()) {
      setRegistrationError('Full name is required');
      return false;
    }
    if (!email.trim()) {
      setRegistrationError('Email address is required');
      return false;
    }
    if (!phone.trim()) {
      setRegistrationError('Phone number is required');
      return false;
    }
    if (phone.length < 10) {
      setRegistrationError('Phone number must be at least 10 digits');
      return false;
    }
    if (!password.trim()) {
      setRegistrationError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setRegistrationError('Password must be at least 6 characters');
      return false;
    }
    return true;
  };

  /**
   * Dispatches form fields down to base backend endpoints for credentials initialization
   */
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
  }, [email, password, fullName, phone, navigate]);

  /**
   * Invokes centralized OAuth workflow pipelines managed by structural context instances
   */
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
          
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Full Name Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Full Name
                </label>
              </div>
              <div className={`relative transition-all duration-200 ${
                touchedFields.fullName && !fullName.trim() 
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl' 
                  : ''
              }`}>
                <User className={`absolute left-3 top-3.5 h-5 w-5 ${
                  touchedFields.fullName && !fullName.trim() ? 'text-red-500' : 'text-gray-400'
                }`} />
                <input 
                  type="text" 
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onBlur={() => handleFieldBlur('fullName')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    touchedFields.fullName && !fullName.trim() 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  placeholder="Enter your full name"
                />
                {touchedFields.fullName && !fullName.trim() && (
                  <div className="absolute right-3 top-3.5">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                )}
              </div>
              {touchedFields.fullName && !fullName.trim() && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Full name is required
                </p>
              )}
            </div>

            {/* Email Address Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
              </div>
              <div className={`relative transition-all duration-200 ${
                touchedFields.email && !email.trim() 
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl' 
                  : ''
              }`}>
                <Mail className={`absolute left-3 top-3.5 h-5 w-5 ${
                  touchedFields.email && !email.trim() ? 'text-red-500' : 'text-gray-400'
                }`} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => handleFieldBlur('email')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    touchedFields.email && !email.trim() 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  placeholder="name@example.com"
                />
                {touchedFields.email && !email.trim() && (
                  <div className="absolute right-3 top-3.5">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                )}
              </div>
              {touchedFields.email && !email.trim() && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Email address is required
                </p>
              )}
            </div>

            {/* Phone Number Field - Only Numbers */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Phone Number
                </label>
              </div>
              <div className={`relative transition-all duration-200 ${
                touchedFields.phone && (!phone.trim() || phone.length < 10)
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl' 
                  : ''
              }`}>
                <Phone className={`absolute left-3 top-3.5 h-5 w-5 ${
                  touchedFields.phone && (!phone.trim() || phone.length < 10) ? 'text-red-500' : 'text-gray-400'
                }`} />
                <input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  onBlur={() => handleFieldBlur('phone')}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    touchedFields.phone && (!phone.trim() || phone.length < 10)
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  placeholder="0771234567"
                  maxLength={15}
                />
                {touchedFields.phone && (!phone.trim() || phone.length < 10) && (
                  <div className="absolute right-3 top-3.5">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                )}
              </div>
              {touchedFields.phone && !phone.trim() && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Phone number is required
                </p>
              )}
              {touchedFields.phone && phone.trim() && phone.length < 10 && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Phone number must be at least 10 digits
                </p>
              )}
              {touchedFields.phone && phone.trim() && phone.length >= 10 && (
                <p className="text-xs text-green-500 mt-1.5 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Valid phone number
                </p>
              )}
            </div>

            {/* Password Field with Eye Toggle */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>
              </div>
              <div className={`relative transition-all duration-200 ${
                touchedFields.password && !password.trim() 
                  ? 'ring-2 ring-red-500 ring-offset-2 rounded-xl' 
                  : ''
              }`}>
                <Lock className={`absolute left-3 top-3.5 h-5 w-5 ${
                  touchedFields.password && !password.trim() ? 'text-red-500' : 'text-gray-400'
                }`} />
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleFieldBlur('password')}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all ${
                    touchedFields.password && !password.trim() 
                      ? 'border-red-500 bg-red-50' 
                      : 'border-gray-200'
                  }`}
                  placeholder="Min 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                {touchedFields.password && !password.trim() && (
                  <div className="absolute right-12 top-3.5">
                    <AlertTriangle size={18} className="text-red-500" />
                  </div>
                )}
              </div>
              {touchedFields.password && !password.trim() && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Password is required
                </p>
              )}
              {touchedFields.password && password.trim() && password.length < 6 && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <AlertCircle size={12} />
                  Password must be at least 6 characters
                </p>
              )}
              {touchedFields.password && password.trim() && password.length >= 6 && (
                <p className="text-xs text-green-500 mt-1.5 flex items-center gap-1">
                  <CheckCircle size={12} />
                  Password strength: Good
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