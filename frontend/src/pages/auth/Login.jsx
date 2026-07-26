// src/pages/auth/Login.jsx

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle, CheckCircle, Eye, EyeOff, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Login = ({ onSuccess, isModal = false }) => {
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ email: false, password: false });
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  /**
   * Handles traditional Email/Password authentication
   */
  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    
    // Mark both fields as touched for validation
    setTouchedFields({ email: true, password: true });
    
    // Validate required fields
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    setLoading(true);
    setError('');
    setIsLocked(false);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {

        if (data.locked) {
          setIsLocked(true);
        }

        // Password is correct, but 2FA not setup — redirect to QR scan page
        if (data.requireTwoFactorSetup) {
          navigate('/2fa-setup', { state: { tempToken: data.tempToken } });
          setLoading(false);
          return;
        }

        // Password is correct, 2FA already enabled — redirect to code entry
        if (data.requireTwoFactor) {
          navigate('/2fa-verify', { state: { tempToken: data.tempToken } });
          setLoading(false);
          return;
        }

        // Show failure modal with the error message
        setFailureMessage(data.message || 'Login failed. Please check your credentials and try again.');
        setShowFailureModal(true);
        setLoading(false);
        return;
      }

      // Login successful
      login(data.user, data.session.access_token, data.permissions || []);

      // ✅ CRITICAL: Show success modal FIRST
      setShowSuccessModal(true);
      setIsRedirecting(true);
      
      const targetRole = data.user.role?.toUpperCase();
      
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Set timeout for navigation - wait 2.5 seconds
      timeoutRef.current = setTimeout(() => {
        setShowSuccessModal(false);
        setIsRedirecting(false);
        
        if (isModal && onSuccess) {
          onSuccess();
        } else {
          if (targetRole === 'ADMIN' || targetRole === 'STAFF') {
            navigate('/admin/dashboard', { replace: true });
          } else {
            navigate('/customer/dashboard', { replace: true });
          }
        }
        timeoutRef.current = null;
      }, 2500);

      setLoading(false);

    } catch (error) {
      console.error("[LOGIN ERROR]", error);
      setFailureMessage('Network error. Please check your connection and try again.');
      setShowFailureModal(true);
      setLoading(false);
    }
  }, [email, password, login, navigate, isModal, onSuccess]);

  /**
   * Handles Google OAuth Authentication
   */
  const handleGoogleLoginClick = useCallback(async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("[OAUTH CRASH] Error inside Google login sequence:", error);
      setFailureMessage('Google Sign-In failed. Please try again.');
      setShowFailureModal(true);
    }
  }, [loginWithGoogle]);

  // Handle field blur to mark as touched
  const handleFieldBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Conditional styling: if modal, remove full-page background and centering
  const containerClasses = isModal
    ? "w-full max-w-md mx-auto"
    : "min-h-screen bg-blue-50/30 flex flex-col justify-center py-12 px-6 relative overflow-hidden";

  const innerCardClasses = "bg-white/70 py-8 px-10 shadow-2xl rounded-3xl border border-white";

  return (
    <div className={containerClasses}>
      {/* Background bubbles - only show for standalone page, not modal */}
      {!isModal && (
        <>
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
        </>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={isModal ? "" : "sm:mx-auto sm:w-full sm:max-w-md relative z-10"}
      >
        <div className={innerCardClasses}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-500 text-sm mt-2">Sign in to manage your water deliveries</p>
          </div>

          {error && !showFailureModal && !showSuccessModal && (
            <div className={`flex items-start gap-3 rounded-xl p-3 mb-5 border ${
              isLocked ? 'bg-red-50 border-red-200' : 'bg-red-50 border-red-200'
            }`}>
              {isLocked ? (
                <Lock size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-sm font-medium text-red-700">
                  {isLocked ? 'Account Locked' : 'Login Failed'}
                </p>
                <p className="text-xs text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Field */}
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
                  placeholder="Enter your email address"
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
                  placeholder="Enter your password"
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5 mr-2" />
              {isLocked ? "Account Locked" : loading ? "Signing In..." : "Sign In"}
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
              onClick={handleGoogleLoginClick}
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
            Don't have an account? <Link to="/register" className="text-blue-600 font-bold hover:underline">Register Now</Link>
          </p>
        </div>
      </motion.div>

      {/* ── LOGIN SUCCESS MODAL ── */}
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
                <h3 className="text-2xl font-bold text-gray-900">Welcome Back!</h3>
                <p className="text-gray-500 mt-2">
                  You have successfully logged in to your account.
                </p>
                <p className="text-sm text-green-600 mt-1 font-medium">
                  {isRedirecting ? 'Redirecting to dashboard...' : 'Click anywhere to continue'}
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

      {/* ── LOGIN FAILURE MODAL ── */}
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
                <h3 className="text-2xl font-bold text-gray-900">Login Failed</h3>
                <p className="text-gray-500 mt-2">
                  {failureMessage || 'Invalid email or password. Please try again.'}
                </p>
                <div className="mt-6 flex flex-col gap-3">
                  <button
                    onClick={() => {
                      setShowFailureModal(false);
                      setError('');
                    }}
                    className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                  >
                    <LogIn size={18} />
                    Try Again
                  </button>
                  <Link
                    to="/forgot-password"
                    onClick={() => setShowFailureModal(false)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;