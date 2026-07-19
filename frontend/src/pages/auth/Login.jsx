// src/pages/auth/Login.jsx

import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Login = ({ onSuccess, isModal = false }) => {
  const { login, loginWithGoogle } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const navigate = useNavigate();

  /**
   * Handles traditional Email/Password authentication
   */
  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsLocked(false);
    console.log("[LOGIN] Attempting email/password sign-in for:", email);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      console.log("LOGIN RESPONSE:", data);

      if (!response.ok || !data.success) {

        console.log("🟡 Entered failure block. Full data:", data);
        console.log("🟡 requireTwoFactorSetup value:", data.requireTwoFactorSetup);

        if (data.locked) {
          setIsLocked(true);
        }

        // Password හරි, ඒත් 2FA setup වෙලා නෑ — QR scan page එකට යවනවා
        if (data.requireTwoFactorSetup) {
          console.log("🔵 2FA Setup branch reached!");
          navigate('/2fa-setup', { state: { tempToken: data.tempToken } });
          setLoading(false);
          return;
        }

        // Password හරි, 2FA already enabled — code එක type කරන්න
        if (data.requireTwoFactor) {
          navigate('/2fa-verify', { state: { tempToken: data.tempToken } });
          setLoading(false);
          return;
        }

        setError(data.message || 'Login execution failed');
        setLoading(false);
        return;
      }

      login(data.user, data.session.access_token, data.permissions || []);

      if (isModal && onSuccess) {
        onSuccess();
      } else {
        const targetRole = data.user.role?.toUpperCase();
        if (targetRole === 'ADMIN' || targetRole === 'STAFF') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/customer/dashboard', { replace: true });
        }
      }

    } catch (error) {
      console.error("[LOGIN ERROR]", error);
      setError('Something went wrong. Please try again.');
    } finally {
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

    console.log("🔥 [CLICK TRIGGERED] The Google Button was physically clicked!");

    try {
      console.log("[CONTEXT CALL] Dispatching to loginWithGoogle()...");
      await loginWithGoogle();
      // OAuth redirects away, so no onSuccess call needed here.
      console.log("[CONTEXT CALL] Supabase OAuth redirect dispatched successfully.");
    } catch (error) {
      console.error("❌ [OAUTH CRASH] Error inside Google login sequence:", error);
      alert("Something went wrong with Google Sign-In.");
    }
  }, [loginWithGoogle]);

  // Conditional styling: if modal, remove full-page background and centering
  const containerClasses = isModal
    ? "w-full max-w-md mx-auto"
    : "min-h-screen bg-blue-50/30 flex flex-col justify-center py-12 px-6 relative overflow-hidden";

  const innerCardClasses = "bg-white/70 py-8 px-10 shadow-2xl rounded-3xl border border-white";

  return (
    <div className={containerClasses}>
      {/* Background bubbles - only show for standalone page, not modal */}
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
      {!isModal && (
        <>
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

          {error && (
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
              <label className="block text-sm font-medium text-gray-700 ml-1">Email</label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 ml-1">Password</label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
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
    </div>
  );
};

export default Login;