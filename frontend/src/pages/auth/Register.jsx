import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext'; // Imported the custom hook to pull context mechanisms

const Register = () => {
  // Form input states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { loginWithGoogle } = useAuth(); // Extracted global Google authentication trigger

  /**
   * Dispatches form fields down to base backend endpoints for credentials initialization
   * @param {Event} e - Form submission synthetics handler interface 
   */
  const handleRegister = React.useCallback(async (e) => {
    e.preventDefault();
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

      alert("Registration Successful!");
      navigate('/login'); 
    } catch (error) {
      alert("Registration Error: " + error.message);
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
      // Trigger the optimized context abstraction layer instead of managing direct fetch assignments here
      await loginWithGoogle();
    } catch (error) {
      console.error("Google Authentication sequence error intercept:", error);
      alert("Something went wrong with Google Sign-In.");
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


      
      {/* Main Registration Form Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white/70 py-8 px-10 shadow-2xl rounded-3xl border border-white">
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

            {/* Submit Button */}
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
              <div className="flex-grow border-t border-gray-400"></div>
              <span className="flex-shrink mx-4 text-gray-600 text-sm">OR</span>
              <div className="flex-grow border-t border-gray-400"></div>
            </div>

            {/* Google OAuth Trigger Button */}
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

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;