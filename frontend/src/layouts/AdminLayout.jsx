import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Users,
  UserCog,
  Briefcase,
  DollarSign,
  Store,
  BarChart3,
  Shield,
  Settings,
  Bell,
  ChevronDown,
  Menu,
  X,
  Droplets,
  LogOut,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { notifications } from '../data/mockData';
import { supabase } from '../supabaseClient'; // Ensure your supabaseClient path is correct

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { id: 'inventory', label: 'Inventory', icon: Package, path: '/admin/inventory' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/admin/orders' },
  { id: 'deliveries', label: 'Deliveries', icon: Truck, path: '/admin/deliveries' },
  { id: 'customers', label: 'Customers', icon: Users, path: '/admin' },
  { id: 'employees', label: 'Employees', icon: UserCog, path: '/admin/employees' },
  { id: 'hrm', label: 'HRM', icon: Briefcase, path: '/admin/hrm' },
  { id: 'finance', label: 'Finance', icon: DollarSign, path: '/admin' },
  { id: 'vendors', label: 'Vendors', icon: Store, path: '/admin/' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/admin/reports' },
  { id: 'user-management', label: 'User Management', icon: Shield, path: '/admin/user-management' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/admin/settings' },
];

const ROLE_LABELS = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  CUSTOMER: 'Customer',
};

const ROLE_COLORS = {
  ADMIN: 'bg-red-100 text-red-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  CUSTOMER: 'bg-amber-100 text-amber-700',
};

const NOTIFICATION_ICONS = {
  order: ShoppingCart,
  delivery: Truck,
  inventory: Package,
  payment: DollarSign,
  system: Settings,
};

function SidebarItem({ item, isActive, onClick, collapsed }) {
  const Icon = item.icon;

  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
          : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
      }`}
    >
      {isActive && (
        <motion.div
          layoutId="sidebar-active"
          className="absolute inset-0 bg-blue-600 rounded-xl"
          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
        />
      )}
      <span className={`relative z-10 flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`}>
        <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
      </span>
      {!collapsed && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 whitespace-nowrap"
        >
          {item.label}
        </motion.span>
      )}
      {isActive && !collapsed && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-white"
        />
      )}
    </button>
  );
}

function NotificationPanel({ isOpen, onClose }) {
  const panelRef = useRef(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl shadow-slate-200/50 overflow-hidden"
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
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.map((notification) => {
                const NotifIcon = NOTIFICATION_ICONS[notification.type] || Bell;
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 ${
                      !notification.read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 mt-0.5 p-1.5 rounded-lg ${
                        !notification.read
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-snug ${
                          !notification.read ? 'text-slate-800 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">{notification.time}</p>
                    </div>
                    {!notification.read && (
                      <div className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <button className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors">
                Mark all as read
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// 🔐 SIGN OUT LOGIC INTEGRATED HERE
function ProfileDropdown({ isOpen, onClose, user }) {
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    console.log("Signing out user...");
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      alert("Sign Out Error: " + error.message);
    } else {
      onClose();
      // Redirect back to standard login screen
      navigate('/login');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl shadow-slate-200/50 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-slate-50/80">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-blue-600/20">
                {user.avatar}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
          <div className="py-1.5">
            <div className="px-3 py-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${ROLE_COLORS[user.role]}`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <div className="px-3 py-2">
              <p className="text-xs text-slate-400">
                Branch: <span className="text-slate-600 font-medium">{user.branch}</span>
              </p>
            </div>
          </div>
          <div className="border-t border-slate-100 py-1.5">
            <button className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
              <Settings size={16} />
              Account Settings
            </button>
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RoleSwitcher({ isOpen, onClose }) {
  const { user, switchRole, ROLES } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const roleOptions = [
    { key: 'admin', label: 'Admin', role: ROLES.ADMIN, color: ROLE_COLORS[ROLES.ADMIN] },
    { key: 'manager', label: 'Manager', role: ROLES.MANAGER, color: ROLE_COLORS[ROLES.MANAGER] },
    { key: 'customer', label: 'Customer', role: ROLES.CUSTOMER, color: ROLE_COLORS[ROLES.CUSTOMER] },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute left-0 top-full mt-2 z-50 w-56 rounded-2xl border border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xl shadow-slate-200/50 overflow-hidden"
        >
          <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/50">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Switch Demo Role
            </p>
          </div>
          <div className="py-1.5">
            {roleOptions.map((option) => {
              const isActive = user.role === option.role;
              return (
                <button
                  key={option.key}
                  onClick={() => {
                    switchRole(option.key);
                    onClose();
                  }}
                  className={`flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${option.color}`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {option.label}
                    </span>
                  </div>
                  {isActive && <Check size={16} className="text-blue-600" />}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function AdminLayout() {
  const { user, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);

  const filteredNavItems = NAV_ITEMS.filter((item) => hasPermission(item.id));
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isActive = (item) => location.pathname === item.path;

  const handleNavClick = (item) => {
    navigate(item.path);
    setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-white border-r border-slate-200/80 shadow-sm transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo area */}
        <div className="flex-shrink-0 flex items-center justify-between h-16 px-5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md shadow-blue-600/25">
              <Droplets size={20} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-800 tracking-tight leading-none">
                Hanthana
              </span>
              <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none mt-0.5">
                ERP System
              </span>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
          {filteredNavItems.map((item) => (
            <SidebarItem
              key={item.id}
              item={item}
              isActive={isActive(item)}
              onClick={() => handleNavClick(item)}
              collapsed={false}
            />
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="flex-shrink-0 p-3 border-t border-slate-100">
          <div className="rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100/60 p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <Droplets size={14} className="text-blue-600" />
              <span className="text-xs font-semibold text-blue-800">Hanthana</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Water Management ERP v2.0
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] text-emerald-600 font-medium">System Online</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top navbar */}
        <header className="flex-shrink-0 sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            {/* Left section */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Menu size={22} />
              </button>

              {/* Role switcher */}
              <div className="relative">
                <button
                  onClick={() => {
                    setRoleSwitcherOpen(!roleSwitcherOpen);
                    setNotificationsOpen(false);
                    setProfileOpen(false);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white/60 hover:bg-slate-50 transition-all duration-200 shadow-sm"
                >
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      ROLE_COLORS[user.role]
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {ROLE_LABELS[user.role]}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${
                      roleSwitcherOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <RoleSwitcher
                  isOpen={roleSwitcherOpen}
                  onClose={() => setRoleSwitcherOpen(false)}
                />
              </div>

              {/* Breadcrumb / page title */}
              <div className="hidden md:flex items-center">
                <div className="h-5 w-px bg-slate-200 mx-2" />
                <p className="text-sm text-slate-400">
                  {filteredNavItems.find((item) => isActive(item))?.label || 'Dashboard'}
                </p>
              </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setProfileOpen(false);
                    setRoleSwitcherOpen(false);
                  }}
                  className="relative p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm shadow-red-500/30"
                    >
                      {unreadCount}
                    </motion.span>
                  )}
                </button>
                <NotificationPanel
                  isOpen={notificationsOpen}
                  onClose={() => setNotificationsOpen(false)}
                />
              </div>

              {/* Separator */}
              <div className="hidden sm:block h-8 w-px bg-slate-200" />

              {/* User profile */}
              <div className="relative">
                <button
                  onClick={() => {
                    setProfileOpen(!profileOpen);
                    setNotificationsOpen(false);
                    setRoleSwitcherOpen(false);
                  }}
                  className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-xs font-bold text-white shadow-md shadow-blue-600/20">
                    {user.avatar}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-semibold text-slate-700 leading-tight">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-tight">{user.branch}</p>
                  </div>
                  <ChevronDown
                    size={14}
                    className={`hidden sm:block text-slate-400 transition-transform duration-200 ${
                      profileOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <ProfileDropdown
                  isOpen={profileOpen}
                  onClose={() => setProfileOpen(false)}
                  user={user}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}