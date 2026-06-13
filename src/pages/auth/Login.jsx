import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn } from 'lucide-react';
import { supabase } from '../../supabaseClient'; // Adjusted path assuming it is in src/

const Login = () => {
  // Form and component states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Handle standard Email/Password Sign-In
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Call Supabase auth sign-in method
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    setLoading(false);

    if (error) {
      alert("Login Error: " + error.message);
    } else {
      console.log("Login Successful, User Session:", data.session);
      // Redirect user directly to the dashboard page
      navigate('/dashboard');
    }
  };

  // Integrated Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    console.log("Initiating Google Sign-In...");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirect directly to dashboard upon successful external authentication
        redirectTo: `${window.location.origin}/dashboard`,
      }
    });

    if (error) console.error("Google Auth Error:", error.message);
  };

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

            {/* Submit Button with Loading Guard */}
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
              onClick={handleGoogleSignIn} 
              className="w-full mt-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-all flex justify-center items-center"
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