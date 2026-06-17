import React, { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Login = () => {
  const { login, loginWithGoogle } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  /**
   * Handles traditional Email/Password authentication
   */
  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
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
      console.log("ACCESS TOKEN:", data.session?.access_token);

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login execution failed');
      }

      login(data.user, data.session.access_token, data.permissions || []);

      const targetRole = data.user.role?.toUpperCase();
      if (targetRole === 'ADMIN' || targetRole === 'STAFF') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/customer/dashboard', { replace: true });
      }

    } catch (error) {
      console.error("[LOGIN ERROR]", error);
      alert("Login Failure: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigate]);

  /**
   * Handles Google OAuth Authentication
   */
  const handleGoogleLoginClick = useCallback(async (e) => {
    // Prevent any accidental form submissions or parent bubbles
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("🔥 [CLICK TRIGGERED] The Google Button was physically clicked!");

    try {
      console.log("[CONTEXT CALL] Dispatching to loginWithGoogle()...");
      await loginWithGoogle();
      console.log("[CONTEXT CALL] Supabase OAuth redirect dispatched successfully.");
    } catch (error) {
      console.error("❌ [OAUTH CRASH] Error inside Google login sequence:", error);
      alert("Something went wrong with Google Sign-In.");
    }
  }, [loginWithGoogle]);

  return (
    <div className="min-h-screen bg-blue-50/30 flex flex-col justify-center py-12 px-6 relative overflow-hidden">
      {/* Background Water Bubbles Animations */}
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
        <div className="bg-white/80 backdrop-blur-lg py-8 px-10 shadow-2xl rounded-3xl border border-white">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
            <p className="text-gray-500 text-sm mt-2">Sign in to manage your water deliveries</p>
          </div>
          
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
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center disabled:bg-blue-400"
            >
              <LogIn className="w-5 h-5 mr-2" /> {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          {/* Social Divider */}
          <div className="mt-6">
            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Google Authentication Trigger */}
            <button 
              type="button"
              onClick={handleGoogleLoginClick} 
              className="w-full mt-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-all flex justify-center items-center cursor-pointer relative z-30"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="w-5 h-5 mr-3" alt="Google" />
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