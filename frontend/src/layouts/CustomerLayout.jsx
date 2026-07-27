import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
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
  Bell,
  LogIn,
  ShoppingCart,   
  Truck,         
  Package,        
  DollarSign,
  AlertCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import FloatingOrderButton from "../components/FloatingOrderButton";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";

// ─── Notification Panel (Customer) ──────────────────────────────
const NOTIFICATION_ICONS = {
  order: ShoppingCart,
  delivery: Truck,
  inventory: Package,
  payment: DollarSign,
  system: Settings,
  maintenance: Settings,
};

const timeAgo = (dateString) => {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
};

function NotificationPanel({ isOpen, onClose, onMarkedRead }) {
  const panelRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchNotifications();
  }, [isOpen, fetchNotifications]);

  const handleMarkAsRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    onMarkedRead?.();
    try {
      const token = localStorage.getItem("token");
      await fetch(`http://localhost:5000/api/notifications/${id}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    onMarkedRead?.();
    try {
      const token = localStorage.getItem("token");
      await fetch("http://localhost:5000/api/notifications/read-all", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) onClose();
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-blue-600 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllAsRead} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">
                    Mark all read
                  </button>
                )}
                <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                </div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Bell size={22} className="text-slate-300 mb-2" />
                  <p className="text-xs text-slate-400">No notifications yet</p>
                </div>
              )}
              {!loading &&
                notifications.map((n) => {
                  const Icon = NOTIFICATION_ICONS[n.type] || Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => !n.read && handleMarkAsRead(n.id)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                        !n.read ? "bg-blue-50/40 hover:bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className={`p-1.5 rounded-lg ${!n.read ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
                        <Icon size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!n.read ? "font-medium text-slate-800" : "text-slate-500"}`}>{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.read && <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />}
                    </button>
                  );
                })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Constants ────────────────────────────────────────────────
const baseNavLinks = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "About Us", path: "/about" },
  { name: "Contact Us", path: "/contact" },
];

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

const quickLinks = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
  { name: "Orders", path: "/orders" },
];

// ─── Navbar Component ──────────────────────────────────────────
function Navbar({ showLoginModal, setShowLoginModal,maintenanceActive }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [touchedFields, setTouchedFields] = useState({ email: false, password: false });
  const [loginError, setLoginError] = useState("");
  
  // Modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, login, loginWithGoogle } = useAuth();

  // Handle field blur to mark as touched
  const handleFieldBlur = (fieldName) => {
    setTouchedFields(prev => ({ ...prev, [fieldName]: true }));
  };

  // ── Fetch settings ──
  useEffect(() => {
    const fetchSettings = async () => {
  try {
    const token = localStorage.getItem("token");
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch("http://localhost:5000/api/settings/public", {
      headers,
    });
    const data = await response.json();

    if (data.success && data.data.general) {
      const general = data.data.general;
      setSettings({
        companyName: general.companyName || defaultSettings.companyName,
        contactPhone:
          general.contactPhone ||
          general.companyPhone ||
          defaultSettings.contactPhone,
        contactEmail:
          general.contactEmail ||
          general.companyEmail ||
          defaultSettings.contactEmail,
        address: general.address || defaultSettings.address,
        services: general.services || defaultSettings.services,
      });
    }
  } catch (error) {
    console.error("Fetch settings error:", error);
  } finally {
    setSettingsLoading(false);
  }
  };

    fetchSettings();
  }, []);

  // ── Fetch user role ──
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
          .from("profiles")
          .select("role_id")
          .eq("id", user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        if (profile?.role_id) {
          const { data: role, error: roleError } = await supabase
            .from("roles")
            .select("role_name")
            .eq("id", profile.role_id)
            .single();
          if (roleError) throw roleError;
          setIsCustomer(role?.role_name === "CUSTOMER");
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

  // ── Scroll listener ──
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── Close mobile menu on location change ──
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // ── Prevent body scroll when mobile menu is open ──
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
  if (user && user.role_name === 'CUSTOMER') {
    links.push({ name: "My Orders", path: "/orders" });
  }
  return links;
};

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/notifications/unread-count', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) setUnreadCount(data.count || 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  useEffect(() => {
  if (!user) {
    setUnreadCount(0);
    return;
  }
  fetchUnreadCount();
  const interval = setInterval(fetchUnreadCount, 30000);
  return () => clearInterval(interval);
  }, [user]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) fetchUnreadCount();
  };

  const handleSignOut = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Sign Out Error:", error);
      alert("Sign Out Error: " + (error.message || "Something went wrong"));
    }
  };

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      
      // Mark both fields as touched for validation
      setTouchedFields({ email: true, password: true });
      
      // Validate required fields
      if (!email.trim()) {
        setLoginError('Email address is required');
        return;
      }
      if (!password.trim()) {
        setLoginError('Password is required');
        return;
      }

      setLoading(true);
      setLoginError('');
      
      try {
        const response = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
          if (data.locked) {
            setLoginError('Account locked. Please try again later.');
            setLoading(false);
            return;
          }
          if (data.requireTwoFactorSetup) {
            setShowLoginModal(false);
            navigate("/admin/2fa-setup", {
              state: { tempToken: data.tempToken },
            });
            setLoading(false);
            return;
          }
          if (data.requireTwoFactor) {
            setShowLoginModal(false);
            navigate("/admin/2fa-verify", {
              state: { tempToken: data.tempToken },
            });
            setLoading(false);
            return;
          }
          // Show failure modal
          setFailureMessage(data.message || "Login failed. Please check your credentials and try again.");
          setShowFailureModal(true);
          setLoading(false);
          return;
        }

        login(data.user, data.session.access_token, data.permissions || []);
        setShowLoginModal(false);
        
        // Show success modal
        setShowSuccessModal(true);
        setIsRedirecting(true);
        
        const targetRole = data.user.role?.toUpperCase();
        
        // Set timeout for navigation - wait 2.5 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          setIsRedirecting(false);
          
          if (targetRole === 'ADMIN') {
            navigate('/app/dashboard', { replace: true });
          } else if (targetRole === 'RIDER'){
            navigate('/app/rider-dashboard', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        }, 2500);

        setLoading(false);
      } catch (error) {
        console.error("Login error:", error);
        setFailureMessage('Network error. Please check your connection and try again.');
        setShowFailureModal(true);
        setLoading(false);
      }
    },
    [email, password, login, navigate, setShowLoginModal]
  );

  const handleGoogleLogin = useCallback(
    async (e) => {
      e?.preventDefault();
      try {
        await loginWithGoogle();
      } catch (error) {
        setFailureMessage('Google Sign-In failed. Please try again.');
        setShowFailureModal(true);
      }
    },
    [loginWithGoogle]
  );

  return (
    <>
      <nav
  className={`relative left-0 right-0 z-[60] transition-all duration-300 ${
    isScrolled
      ? "bg-white/80 backdrop-blur-lg shadow-lg border-b border-blue-100/50"
      : "bg-white shadow-sm"
  }`}
>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-18">
            {/* Logo */}
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

            {/* Desktop Navigation */}
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

            {/* Desktop CTA */}
            <div className="hidden lg:flex items-center gap-3">
              {user && (
                <div className="relative">
                  <button
                    onClick={handleToggle}
                    className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <NotificationPanel
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    onMarkedRead={fetchUnreadCount}
                  />
                </div>
              )}
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
                          {user.full_name ||
                            user.user_metadata?.full_name ||
                            "User"}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-14 right-0 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] overflow-hidden">
                    {!loadingRole && !isCustomer && (
                      <Link
                        to="/app/dashboard"
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

            {/* Mobile Hamburger */}
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

        {/* Mobile Menu Overlay */}
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

                  {/* Mobile Auth Section */}
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
                              {user.full_name ||
                                user.user_metadata?.full_name ||
                                "User"}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {user.email}
                            </p>
                          </div>
                        </div>
                        {!loadingRole && !isCustomer && (
                          <Link
                            to="/app/dashboard"
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

      {/* ── Login Modal ── */}
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
                  <h2 className="text-3xl font-bold text-gray-900">
                    Welcome Back
                  </h2>
                  <p className="text-gray-500 text-sm mt-2">
                    Sign in to manage your water deliveries
                  </p>
                </div>

                {/* Login Error Display */}
                {loginError && !showFailureModal && !showSuccessModal && (
                  <div className="flex items-start gap-3 rounded-xl p-3 mb-5 border bg-red-50 border-red-200">
                    <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700">Login Failed</p>
                      <p className="text-xs text-red-600 mt-0.5">{loginError}</p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  {/* Email Field */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-sm font-medium text-gray-700">
                        Email
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

                  {/* Password Field */}
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
                        placeholder="••••••••"
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex justify-center items-center disabled:bg-blue-400 disabled:cursor-not-allowed"
                  >
                    <LogIn className="w-5 h-5 mr-2" />{" "}
                    {loading ? "Signing In..." : "Sign In"}
                  </button>
                </form>

                <div className="mt-6">
                  <div className="relative flex py-3 items-center">
                    <div className="flex-grow border-t border-gray-400"></div>
                    <span className="flex-shrink mx-4 text-gray-600 text-sm">
                      OR
                    </span>
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
                      setLoginError('');
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
    </>
  );
}

// ─── Footer Component ──────────────────────────────────────────
function Footer() {
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsLoading, setSettingsLoading] = useState(true);

  useEffect(() => {
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch("http://localhost:5000/api/settings/public", {
        headers,
      });
      const data = await response.json();

      if (data.success && data.data.general) {
        const general = data.data.general;
        setSettings({
          companyName: general.companyName || defaultSettings.companyName,
          contactPhone:
            general.contactPhone ||
            general.companyPhone ||
            defaultSettings.contactPhone,
          contactEmail:
            general.contactEmail ||
            general.companyEmail ||
            defaultSettings.contactEmail,
          address: general.address || defaultSettings.address,
          services: general.services || defaultSettings.services,
        });
      }
    } catch (error) {
      console.error("Fetch settings error:", error);
    } finally {
      setSettingsLoading(false);
    }
  };

    fetchSettings();
  }, []);

  const contactInfo = [
    { icon: Phone, text: settings.contactPhone },
    { icon: Mail, text: settings.contactEmail },
    { icon: MapPin, text: settings.address },
  ];

  const servicesList = settings.services || defaultSettings.services;

  return (
    <footer className="bg-[#1E3A8A] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 group mb-4">
              <Droplets className="w-7 h-7 text-[#DBEAFE] group-hover:text-white transition-colors duration-300" />
              <span className="text-xl font-bold text-white">
                {settings.companyName}
              </span>
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

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#DBEAFE] mb-4">
              Quick Links
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.path}
                    className="text-blue-200 text-sm hover:text-white transition-colors duration-300 flex items-center gap-2 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-blue-400 group-hover:bg-white group-hover:w-1.5 transition-all duration-300" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#DBEAFE] mb-4">
              Services
            </h3>
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

          {/* Contact Info */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#DBEAFE] mb-4">
              Contact Info
            </h3>
            <ul className="space-y-3">
              {contactInfo.map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-[#DBEAFE]" />
                  </div>
                  <span className="text-blue-200 text-sm leading-relaxed">
                    {item.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-blue-300 text-sm">
              &copy; 2026 {settings.companyName}. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-blue-300 text-sm">
              <Link
                to="#"
                className="hover:text-white transition-colors duration-300"
              >
                Privacy Policy
              </Link>
              <span className="w-1 h-1 rounded-full bg-blue-500" />
              <Link
                to="#"
                className="hover:text-white transition-colors duration-300"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── CustomerLayout ────────────────────────────────────────────
export default function CustomerLayout() {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [maintenanceBanner, setMaintenanceBanner] = useState(null);
  const [upcomingNotice, setUpcomingNotice] = useState(null);
  const [headerHeight, setHeaderHeight] = useState(64);
  const headerRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

 useEffect(() => {
  const fetchUpcomingWindows = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/maintenance');
      const data = await response.json();
      console.log('🔍 Maintenance windows response:', data); // ✅ temporary debug line
      if (data.success && data.windows?.length > 0) {
        setUpcomingNotice(data.windows[0]);
      } else {
        setUpcomingNotice(null);
      }
    } catch (err) {
      console.error('Failed to fetch upcoming maintenance:', err);
    }
  };
  fetchUpcomingWindows();
  const interval = setInterval(fetchUpcomingWindows, 60000);
  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/maintenance/mode');
        const data = await response.json();
        if (data.success && data.enabled) {
          setMaintenanceBanner({ message: data.message || 'System is under maintenance.' });
        } else {
          setMaintenanceBanner(null);
        }
      } catch (err) {
        console.error('Failed to fetch maintenance status:', err);
      }
    };
    fetchMaintenanceStatus();
    const interval = setInterval(fetchMaintenanceStatus, 60000);
    return () => clearInterval(interval);
  }, []);


  // ✅ Navbar + Banner ekema actual height eka measure karanawa (guess pixel values nemei)
  useLayoutEffect(() => {
    if (!headerRef.current) return;

    const updateHeight = () => {
      setHeaderHeight(headerRef.current.offsetHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(headerRef.current);

    return () => resizeObserver.disconnect();
  }, [maintenanceBanner]);

  const handleOrderClick = useCallback(() => {
    if (user) {
      navigate("/orders");
    } else {
      setShowAuthPrompt(true);
    }
  }, [user, navigate]);

  return (
    
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">

    {/* ✅ Navbar + Banner dekama height measure karanna ref ekaka athule */}
    <div ref={headerRef} className="fixed top-0 left-0 right-0 z-[60]">
      {maintenanceBanner ? (
    <div className="bg-amber-500 text-white text-sm font-medium px-4 py-2 text-center">
      🛠️ {maintenanceBanner.message}
    </div>
  ) : upcomingNotice ? (
    <div className="bg-blue-600 text-white text-sm font-medium px-4 py-2 text-center">
      📅 {upcomingNotice.message} — Starting {new Date(upcomingNotice.scheduled_start).toLocaleString()}
    </div>
  ) : null}
      <Navbar
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
      />
    </div>

    {/* ✅ main eke padding eka, actual measured height eka use karanawa */}
    <main
  className="flex-1"
  style={{ paddingTop: `${headerHeight}px`, marginTop: '-1px' }}
>
      <Outlet />
      </main>
      <Footer />
      <FloatingOrderButton
  onLoginRequired={handleOrderClick}
  hasMaintenanceBanner={!!maintenanceBanner || !!upcomingNotice}
/>

      {/* Auth Prompt Modal */}
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
                <h3 className="text-2xl font-bold text-gray-900">
                  Ready to Order?
                </h3>
                <p className="text-gray-500 mt-2">
                  Please login or create an account to place your water order.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowAuthPrompt(false);
                      setShowLoginModal(true);
                    }}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-200"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      setShowAuthPrompt(false);
                      navigate("/register");
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