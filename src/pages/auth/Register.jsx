import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const Register = () => {
  // Form input states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Handle standard Email and Password registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Call Supabase auth signUp and store extra fields inside user_metadata (options.data)
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          full_name: fullName,
          phone_number: phone,
        },
      },
    });

    setLoading(false);

    if (error) {
      alert("Registration Error: " + error.message);
    } else {
      alert("Registration Successful! Please check your email for confirmation.");
      console.log("User Created:", data.user);
      navigate('/dashboard'); // Redirect to login page on success
    }
  };

  // Handle Google OAuth Sign-In
  const handleGoogleSignIn = async () => {
    console.log("Initiating Google Sign-In...");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin, // Dynamic redirect back to the app home root
      }
    });

    if (error) console.error("Google Auth Error:", error.message);
  };

  return (
    <div className="min-h-screen bg-blue-50/30 flex flex-col justify-center py-12 px-6 relative overflow-hidden">
      {/* Dynamic Background Animated Blobs */}
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
      
      {/* Main Registration Form Container with Entrance Animation */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-lg py-8 px-10 shadow-2xl rounded-3xl border border-white">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-500 text-center mb-8 text-sm">Join Hanthana Water Delivery today</p>
          
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name Input Field */}
            <div className="relative">
              <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Full Name" 
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            {/* Email Address Input Field */}
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input 
                type="email" 
                placeholder="Email Address" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            {/* Phone Number Input Field */}
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Phone Number" 
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            {/* Password Input Field */}
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input 
                type="password" 
                placeholder="Password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            {/* Submit Button with Loading State Guard */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:bg-blue-400"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          {/* Social Divider UI */}
          <div className="mt-6">
            <div className="relative flex py-3 items-center">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* Google OAuth Trigger Button */}
            <button 
              onClick={handleGoogleSignIn} 
              className="w-full mt-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-all flex justify-center items-center"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="w-5 h-5 mr-3" alt="Google" />
              Continue with Google
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;