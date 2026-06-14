import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const navLinks = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "About Us", path: "/about" },
  { name: "Contact Us", path: "/contact" },
];

const quickLinks = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "About", path: "/about" },
  { name: "Contact", path: "/contact" },
  { name: "Orders", path: "/orders" },
];

const services = [
  "Sealed Bottle Delivery",
  "Water Refill",
  "Office Supply",
  "Bulk Distribution",
];

const contactInfo = [
  { icon: Phone, text: "+94 76 835 6860" },
  { icon: Mail, text: "support@hanthana.com" },
  { icon: MapPin, text: "No 01, Ja Ela, Sri Lanka" },
];

const socialLinks = [
  { icon: Globe, href: "#", label: "Website" },
];

function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCustomer, setIsCustomer] = useState(false);
  const [loadingRole, setLoadingRole] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  const { user, logout } = useAuth();

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
    console.log("Signing out user via AuthContext...");
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

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
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
              <Droplets className="w-8 h-8 text-[#2563EB] group-hover:text-[#1E3A8A] transition-colors duration-300" />
              <div className="absolute -inset-1 bg-[#DBEAFE] rounded-full opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-10" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-[#2563EB] to-[#1E3A8A] bg-clip-text text-transparent">
              Hanthana
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
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
            {!user ? (
              <>
                <Link
                  to="/login"
                  className="px-5 py-2.5 text-sm font-semibold text-[#2563EB] border border-[#2563EB] rounded-xl hover:bg-blue-50 transition-all duration-300"
                >
                  Login
                </Link>

                <Link
                  to="/register"
                  className="px-5 py-2.5 bg-[#2563EB] text-white text-sm font-semibold rounded-xl hover:bg-[#1E3A8A] transition-all duration-300 shadow-md shadow-blue-200"
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <div className="relative group">
                {/* User Button */}
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

                {/* Dropdown */}
                <div className="absolute top-14 right-0 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 overflow-hidden">
                  {/* Dashboard - visible to all logged-in users EXCEPT customers */}
                  {!loadingRole && !isCustomer && (
                    <Link
                      to="/admin/dashboard"
                      className="w-full flex items-center gap-2 text-left px-5 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-[#2563EB] transition"
                    >
                      <LayoutDashboard size={16} />
                      Dashboard
                    </Link>
                  )}

                  {/* Orders & Profile - only for customers */}
                  {!loadingRole && isCustomer && (
                    <>
                      <Link
                        to="/orders"
                        className="w-full flex items-center gap-2 text-left px-5 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-[#2563EB] transition"
                      >
                        <ShoppingBag size={16} />
                        Orders
                      </Link>

                      <Link
                        to="/profile"
                        className="w-full flex items-center gap-2 text-left px-5 py-3 text-sm text-gray-600 hover:bg-blue-50 hover:text-[#2563EB] transition"
                      >
                        <Settings size={16} />
                        Profile
                      </Link>
                    </>
                  )}

                  {/* Sign Out - visible to all logged-in users */}
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
                  {navLinks.map((link, index) => (
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

                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  className="mt-6 pt-6 border-t border-gray-100"
                >
                  {/* "My Orders" button shown only to customers */}
                  {!loadingRole && isCustomer && (
                    <Link
                      to="/orders"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full text-center px-5 py-3 bg-[#2563EB] text-white font-semibold rounded-2xl hover:bg-[#1E3A8A] transition-all duration-300 shadow-md shadow-blue-200"
                    >
                      My Orders
                    </Link>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-[#1E3A8A] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 group mb-4">
              <Droplets className="w-7 h-7 text-[#DBEAFE] group-hover:text-white transition-colors duration-300" />
              <span className="text-xl font-bold text-white">Hanthana</span>
            </Link>
            <p className="text-blue-200 text-sm leading-relaxed mb-6 max-w-xs">
              Your trusted partner in water management solutions. Delivering
              pure, refreshing water to homes and businesses with reliability
              and care since 2010.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center hover:bg-[#2563EB] hover:scale-110 transition-all duration-300"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

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

          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-[#DBEAFE] mb-4">Services</h3>
            <ul className="space-y-2.5">
              {services.map((service) => (
                <li key={service}>
                  <span className="text-blue-200 text-sm flex items-center gap-2 group">
                    <span className="w-1 h-1 rounded-full bg-blue-400 group-hover:w-1.5 transition-all duration-300" />
                    {service}
                  </span>
                </li>
              ))}
            </ul>
          </div>

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

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-blue-300 text-sm">&copy; 2026 Hanthana. All rights reserved.</p>
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
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <main className="flex-1 pt-16 lg:pt-18">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}