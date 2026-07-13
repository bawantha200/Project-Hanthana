import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Globe,
  Settings,
  LogOut,
  ShoppingBag,
  LayoutDashboard,
  Lock,
  LogIn,
} from "lucide-react";
import FloatingOrderButton from "../components/FloatingOrderButton";
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const baseNavLinks = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "About Us", path: "/about" },
  { name: "Contact Us", path: "/contact" },
];

// 🆕 Default values (will be replaced by settings)
const defaultSettings = {
  companyName: "Hanthana",
  contactPhone: "+94 76 835 6860",
  contactEmail: "support@hanthana.com",
  address: "No 01, Ja Ela, Sri Lanka",
  services: [
    "Sealed Bottle Delivery",
    "Water Refill",
    "Office Supply",
    "Bulk Distribution",
  ],
};

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);

  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 🆕 Settings State
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, login, loginWithGoogle } = useAuth();

  // 🆕 Fetch Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (data.success && data.data.general) {
          const general = data.data.general;
          setSettings({
            companyName: general.companyName || defaultSettings.companyName,
            contactPhone: general.contactPhone || general.companyPhone || defaultSettings.contactPhone,
            contactEmail: general.contactEmail || general.companyEmail || defaultSettings.contactEmail,
            address: general.address || defaultSettings.address,
            services: general.services || defaultSettings.services,
          });
        }
      } catch (error) {
        console.error('Fetch settings error:', error);
        // Keep default settings
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // Fetch user role (unchanged)
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setIsCustomer(false);
        setLoadingRole(false);
        return;
      }
      setLoadingRole(true);
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role_id')
          .eq('id', user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (profile?.role_id) {
          const { data: role, error: roleError } = await supabase
            .from('roles')
            .select('role_name')
            .eq('id', profile.role_id)
            .single();
          if (roleError) throw roleError;
          setIsCustomer(role?.role_name === 'CUSTOMER');
        } else {
          setIsCustomer(false);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setIsCustomer(false);
      } finally {
        setLoadingRole(false);
      }
    };
    fetchUserRole();
  }, [user]);

  const handleSignOut = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Sign Out Error:", error);
      alert("Sign Out Error: " + (error.message || "Something went wrong"));
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const isActive = (path) => location.pathname === path;

  const getNavLinks = () => {
    const links = [...baseNavLinks];
    if (user) {
      links.push({ name: "My Orders", path: "/orders" });
    }
    return links;
  };

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Login failed');
      }
      login(data.user, data.session.access_token, data.permissions || []);
      setShowLoginModal(false);
      const targetRole = data.user.role?.toUpperCase();
      if (targetRole === 'ADMIN' || targetRole === 'STAFF') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        navigate('/customer/dashboard', { replace: true });
      }
    } catch (error) {
      alert("Login Failure: " + error.message);
    } finally {
      setLoading(false);
    }
  }, [email, password, login, navigate, setShowLoginModal]);

  const handleGoogleLogin = useCallback(async (e) => {
    e?.preventDefault();
    try {
      await loginWithGoogle();
    } catch (error) {
      alert("Google Sign-In error: " + error.message);
    }
  }, [loginWithGoogle]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/80 backdrop-blur-lg shadow-lg border-b border-blue-100/50"
            : "bg-white shadow-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo - 🆕 Company Name Dynamic */}
            <Link
              to="/"
              className="flex items-center gap-2 group"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="relative">
                <img 
                    src="/images/logo.png" 
                    alt="Hanthana Logo" 
                    className="w-8 h-8 rounded-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                <div className="absolute -inset-1 bg-[#DBEAFE] rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-10" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] bg-clip-text text-transparent">
                {settings.companyName}
              </span>
            </Link>

            {/* Desktop Navigation - No changes */}
            <div className="hidden lg:flex items-center gap-1">
              {getNavLinks().map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    isActive(link.path)
                      ? "text-[#2563EB]"
                      : "text-gray-600 hover:text-[#2563EB] hover:bg-[#DBEAFE]/50"
                  }`}
                >
                  {link.name}
                  {isActive(link.path) && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-[#2563EB] rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Desktop CTA - No changes */}
            <div className="hidden lg:flex items-center gap-3">
              {!user ? (
                <>
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-5 py-2.5 text-sm font-semibold text-[#2563EB] border border-[#2563EB] rounded-xl hover:bg-blue-50 transition-all duration-300"
                  >
                    Login
                  </button>
                  <Link
                    to="/register"
                    className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1E3A8A] transition-all duration-300 shadow-md shadow-blue-200"
                  >
                    Sign Up
                  </Link>
                </>
              ) : (
                <div className="relative group">
                  <div className="px-4 py-2 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-blue-600/20">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">
                          {user.full_name || user.user_metadata?.full_name || "User"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-14 right-0 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden">
                    {!loadingRole && !isCustomer && (
                      <Link
                        to="/admin/dashboard"
                        className="w-full flex items-center gap-2 text-left px-5 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-[#2563EB] transition"
                      >
                        <LayoutDashboard size={16} />
                        Dashboard
                      </Link>
                    )}
                    {!loadingRole && isCustomer && (
                      <Link
                        to="/profile"
                        className="w-full flex items-center gap-2 text-left px-5 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-[#2563EB] transition"
                      >
                        <Settings size={16} />
                        Profile
                      </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 text-left px-5 py-3 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger - No changes */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden relative p-2 rounded-xl text-gray-600 hover:text-[#2563EB] hover:bg-[#DBEAFE]/50 transition-all duration-300"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <AnimatePresence mode="wait" initial={false}>
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mobile Menu Overlay - No changes */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 top-16 z-40 lg:hidden"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                onClick={() => setIsMobileMenuOpen(false)}
              />
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="relative bg-white/95 backdrop-blur-lg shadow-2xl border-t border-blue-100/50"
              >
                <div className="max-w-7xl mx-auto px-4 py-6">
                  <nav className="flex flex-col gap-1">
                    {getNavLinks().map((link, index) => (
                      <motion.div
                        key={link.name}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                      >
                        <Link
                          to={link.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-base font-medium transition-all duration-300 ${
                            isActive(link.path)
                              ? "bg-[#2563EB] text-white shadow-md shadow-blue-200"
                              : "text-gray-700 hover:bg-[#DBEAFE]/50 hover:text-[#2563EB]"
                          }`}
                        >
                          {link.name}
                          {isActive(link.path) && (
                            <div className="ml-auto w-2 h-2 rounded-full bg-white" />
                          )}
                        </Link>
                      </motion.div>
                    ))}
                  </nav>

                  {/* Mobile Auth Section - New */}
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.35, duration: 0.3 }}
                    className="mt-6 pt-6 border-t border-gray-200"
                  >
                    {!user ? (
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setShowLoginModal(true);
                          }}
                          className="w-full px-5 py-3 text-center text-sm font-semibold text-[#2563EB] border border-[#2563EB] rounded-xl hover:bg-blue-50 transition-all duration-300"
                        >
                          Login
                        </button>
                        <Link
                          to="/register"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="w-full px-5 py-3 text-center bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1E3A8A] transition-all duration-300 shadow-md shadow-blue-200"
                        >
                          Sign Up
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-gray-50">
                          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-blue-600/20">
                            {user.email?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {user.full_name || user.user_metadata?.full_name || "User"}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        {!loadingRole && !isCustomer && (
                          <Link
                            to="/admin/dashboard"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-xl transition"
                          >
                            <LayoutDashboard size={16} />
                            Dashboard
                          </Link>
                        )}
                        {!loadingRole && isCustomer && (
                          <Link
                            to="/profile"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-[#2563EB] rounded-xl transition"
                          >
                            <Settings size={16} />
                            Profile
                          </Link>
                        )}
                        <button
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            handleSignOut();
                          }}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition w-full"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ========== BUILT-IN LOGIN MODAL ========== */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-10"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div className="bg-white backdrop-blur-sm py-8 px-10 shadow-2xl rounded-3xl border border-white">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
                  <p className="text-gray-500 text-sm mt-2">Sign in to manage your water deliveries</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center disabled:bg-blue-400"
                  >
                    <LogIn className="w-5 h-5 mr-2" /> {loading ? "Signing In..." : "Sign In"}
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
                    onClick={handleGoogleLogin}
                    className="w-full mt-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition-all flex justify-center items-center gap-3"
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
                  Don't have an account?{" "}
                  <Link
                    to="/register"
                    className="text-blue-600 font-bold hover:underline"
                    onClick={() => setShowLoginModal(false)}
                  >
                    Register Now
                  </Link>
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Footer() {
  // 🆕 Settings State for Footer
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // 🆕 Fetch Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/settings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();

        if (data.success && data.data.general) {
          const general = data.data.general;
          setSettings({
            companyName: general.companyName || defaultSettings.companyName,
            contactPhone: general.contactPhone || general.companyPhone || defaultSettings.contactPhone,
            contactEmail: general.contactEmail || general.companyEmail || defaultSettings.contactEmail,
            address: general.address || defaultSettings.address,
            services: general.services || defaultSettings.services,
          });
        }
      } catch (error) {
        console.error('Fetch settings error:', error);
      } finally {
        setSettingsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // 🆕 Build contact info from settings
  const contactInfo = [
    { icon: Phone, text: settings.contactPhone },
    { icon: Mail, text: settings.contactEmail },
    { icon: MapPin, text: settings.address },
  ];

  // 🆕 Build services from settings
  const servicesList = settings.services || defaultSettings.services;

  return (
    <footer className="bg-[#1E3A8A] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: Brand Info - 🆕 Company Name Dynamic */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 group mb-4">
              <Droplets className="w-7 h-7 text-[#DBEAFE] group-hover:text-white transition-colors duration-300" />
              <span className="text-xl font-bold text-white">{settings.companyName}</span>
            </Link>
            <p className="text-blue-200 text-sm leading-relaxed mb-6 max-w-xs">
              Your trusted partner in water management solutions. Delivering
              pure, refreshing water to homes and businesses with reliability
              and care since 2010.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Website"
                className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-[#2563EB] hover:scale-110 transition-all duration-300"
              >
                <Globe className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links - No changes */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#DBEAFE] mb-4">Quick Links</h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-blue-200 text-sm hover:text-white transition-colors duration-300 flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-400 group-hover:bg-white group-hover:w-1.5 transition-all duration-300" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Services - 🆕 Dynamic from Settings */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#DBEAFE] mb-4">Services</h3>
            <ul className="space-y-2.5">
              {servicesList.map((service) => (
                <li key={service}>
                  <span className="text-blue-200 text-sm flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-400 group-hover:w-1.5 transition-all duration-300" />
                    {service}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Contact Info - 🆕 Dynamic from Settings */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#DBEAFE] mb-4">Contact Info</h3>
            <ul className="space-y-3">
              {contactInfo.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-[#DBEAFE]" />
                  </div>
                  <span className="text-blue-200 text-sm leading-relaxed">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bottom - No changes */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-blue-300 text-sm">&copy; 2026 {settings.companyName}. All rights reserved.</p>
            <div className="flex items-center gap-4 text-blue-300 text-sm">
              <Link to="#" className="hover:text-white transition-colors duration-300">Privacy Policy</Link>
              <span className="w-1 h-1 rounded-full bg-blue-500" />
              <Link to="#" className="hover:text-white transition-colors duration-300">Terms of Service</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function CustomerLayout() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleOrderClick = useCallback(() => {
    if (user) {
      navigate('/orders');
    } else {
      setShowAuthPrompt(true);
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
      />
      <main className="flex-1 pt-16 lg:pt-18">
        <Outlet />
      </main>
      <Footer />
      <FloatingOrderButton onLoginRequired={handleOrderClick} />

      <AnimatePresence>
        {showAuthPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAuthPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowAuthPrompt(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Ready to Order?</h3>
                <p className="text-gray-500 mt-2">
                  Please login or create an account to place your water order.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowAuthPrompt(false);
                      navigate('/login');
                    }}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setShowAuthPrompt(false);
                      navigate('/register');
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-800 font-semibold rounded-xl hover:bg-gray-200 transition"
                  >
                    Sign Up
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// 🆕 Quick Links (used in Footer) - moved outside
const quickLinks = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
  { name: "Orders", path: "/orders" },
];