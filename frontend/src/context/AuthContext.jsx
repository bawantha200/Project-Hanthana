// ===== AuthContext.jsx =====
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';
import {
  LayoutDashboard, Package, ShoppingCart, Truck, Users, UserCog, Briefcase,
  DollarSign, Store, BarChart3, Settings, Bike, Inbox, FileText, Clipboard,
  Warehouse, ClipboardCheck, Sliders, CalendarDays, FileCheck, Factory, UsersRound
} from 'lucide-react';

const AuthContext = createContext(null);

// ── NAV_ITEMS (unique ids, correct paths) ──
// ===== AuthContext.jsx =====
export const NAV_ITEMS = [
  // Specific Modules First (Accountant/Finance/HRM specific routes)
  { id: 'finance', label: 'Finance', icon: DollarSign, path: '/app/finance' },
  { id: 'invoice', label: 'Invoice', icon: FileText, path: '/app/finance/invoicing-reports' },
  { id: 'profit', label: 'Profit', icon: FileText, path: '/app/finance/profit-reports' },
  { id: 'expenses', label: 'Expenses', icon: BarChart3, path: '/app/finance/expenses' },
  
  // Dashboard routes
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard' },
  { id: 'sales-dashboard', label: 'Sales Dashboard', icon: LayoutDashboard, path: '/app/sales-dashboard' },
  { id: 'sales-analytics', label: 'Sales Analytics', icon: BarChart3, path: '/app/sales-analytics' },
  { id: 'inventory-dashboard', label: 'Inventory Dashboard', icon: LayoutDashboard, path: '/app/inventory-dashboard' },
  { id: 'demandforecast-dashboard', label: 'Demand Forecast', icon: LayoutDashboard, path: '/app/demandforecast-dashboard' },
  { id: 'jit-dashboard', label: 'JIT Dashboard', icon: Factory, path: '/app/jit-dashboard' },
  { id: 'hrm-dashboard', label: 'HRM Dashboard', icon: Briefcase, path: '/app/hrm-dashboard' },

  // Operational Modules
  { id: 'products', label: 'Products', icon: Package, path: '/app/products' },
  { id: 'inventory', label: 'Inventory', icon: Warehouse, path: '/app/inventory' },
  { id: 'orders', label: 'Orders', icon: ShoppingCart, path: '/app/orders' },
  { id: 'pos', label: 'POS', icon: Clipboard, path: '/app/pos' },
  { id: 'deliveries', label: 'Deliveries', icon: Truck, path: '/app/deliveries' },
  { id: 'deliveryconfig', label: 'Delivery Configuration', icon: Truck, path: '/app/delivery/config' },
  { id: 'messages', label: 'Messages', icon: Inbox, path: '/app/messages' },
  { id: 'rider-dashboard', label: 'Rider Dashboard', icon: Bike, path: '/app/rider-dashboard' },
  { id: 'customers', label: 'Customers', icon: Users, path: '/app/customers' },
  { id: 'attendance', label: 'Attendance', icon: ClipboardCheck, path: '/app/attendance' },
  { id: 'leave', label: 'Leave', icon: CalendarDays, path: '/app/leave' },
  { id: 'salaries-ot', label: 'Salaries & OT', icon: DollarSign, path: '/app/salaries-ot' },
  { id: 'employees', label: 'Employees', icon: UserCog, path: '/app/employees' },
  { id: 'hrm', label: 'HRM', icon: Briefcase, path: '/app/hrm' },
  { id: 'vendors', label: 'Vendors', icon: Store, path: '/app/vendors' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/app/reports' },
  { id: 'user-management', label: 'User Management', icon: UsersRound, path: '/app/user-management' },
  { id: 'settings-request', label: 'Settings Requests', icon: FileCheck, path: '/app/settings-requests' },
  { id: 'manage-permission', label: 'Manage Permission', icon: Sliders, path: '/app/manage-permission' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/app/settings' },
];

const FALLBACK_ROUTE = '/app/dashboard';

/**
 * Returns the first route (in NAV_ITEMS priority order) that the given permissions grant access to.
 */
export function getLandingRouteForPermissions(permissions = []) {
  // Always prefer the main dashboard if the user has access to it
  if (permissions.includes('dashboard')) {
    return '/app/dashboard';
  }

  const match = NAV_ITEMS.find((item) => permissions.includes(item.id));
  return match ? match.path : FALLBACK_ROUTE;
}

// The rest of AuthContext.jsx remains exactly as you have it.
// (formatUserData, useAuth, AuthProvider, etc.) — no changes needed.

// ...rest of the file stays exactly the same (getRoleColorClass, AuthProvider, etc.)

/**
 * Generates a consistent Tailwind CSS color scheme based on the role name string hashing
 * @param {string} roleName - The designation role of the authenticated user
 * @returns {string} Tailwind utility classes for background, text, and borders
 */
const getRoleColorClass = (roleName) => {
  if (!roleName) return 'bg-slate-100 text-slate-700 border-slate-200';
  
  const colors = [
    'bg-blue-50 text-blue-700 border-blue-200',
    'bg-purple-50 text-purple-700 border-purple-200',
    'bg-amber-50 text-amber-700 border-amber-200',
    'bg-emerald-50 text-emerald-700 border-emerald-200',
    'bg-rose-50 text-rose-700 border-rose-200',
    'bg-indigo-50 text-indigo-700 border-indigo-200',
    'bg-cyan-50 text-cyan-700 border-cyan-200'
  ];
  
  let hash = 0;
  const upperRole = roleName.toUpperCase();
  for (let i = 0; i < upperRole.length; i++) {
    hash = upperRole.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return `${colors[index]} border`;
};

/**
 * Detects user type from various possible sources
 */
const detectUserType = (user) => {
  if (!user) return { isGoogleUser: false, hasPassword: false };
  
  // Check if user is from Google - multiple possible sources
  const isGoogleUser = 
    user?.provider === 'google' || 
    user?.authProvider === 'google' ||
    user?.identities?.some?.(id => id.provider === 'google') ||
    user?.app_metadata?.provider === 'google' ||
    user?.user_metadata?.provider === 'google';
  
  // 🔥 FIXED: Better password detection
  // Check multiple sources for password existence
  const hasPassword = 
    user?.hasPassword === true || 
    user?.has_password === true ||
    user?.user_metadata?.has_password === true ||
    user?.identities?.some?.(id => id.provider === 'email') ||
    // Check if encrypted_password exists (if coming from backend)
    (user?.encrypted_password && user.encrypted_password !== '') ||
    // Check if password exists in any other form
    (user?.password && user.password !== '');
  
  console.log('🔍 detectUserType:', {
    isGoogleUser,
    hasPassword,
    provider: user?.provider,
    identities: user?.identities,
    hasPasswordField: user?.hasPassword,
    hasPasswordInMetadata: user?.user_metadata?.has_password,
    hasEncryptedPassword: !!(user?.encrypted_password)
  });
  
  return { isGoogleUser, hasPassword };
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Derived state to check if current user has ADMIN role
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Refs to manage inactivity timeout timers
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const sessionTimeoutMinutesRef = useRef(30);

  /**
   * Standardizes database variations of user objects into consistent camelCase/snake_case fields
   */
  const formatUserData = useCallback((data) => {
    if (!data) return null;

    const { isGoogleUser, hasPassword } = detectUserType(data);

    const finalFullName = data.fullName || data.full_name || data.user_metadata?.full_name || 'User Profile';
    const finalRole = data.role || data.role_name || 'CUSTOMER';
    const finalPhone = data.phone || data.phone_number || data.user_metadata?.phone_number || '';
    const finalAddress = data.address || data.user_metadata?.address || '';

    // Check if email is confirmed
    const emailConfirmed = data.email_confirmed_at || data.emailConfirmed || false;

    const formattedUser = {
      ...data,
      id: data.id,
      email: data.email || '',
      fullName: finalFullName, 
      full_name: finalFullName, 
      role: finalRole.toUpperCase(),
      role_name: finalRole.toUpperCase(), 
      phone: finalPhone,
      phone_number: finalPhone,
      address: finalAddress,
      hasPassword: hasPassword || data.hasPassword || false,
      provider: isGoogleUser ? 'google' : 'email',
      roleColor: getRoleColorClass(finalRole),
      emailConfirmed: emailConfirmed,
      email_confirmed_at: emailConfirmed,
      // Ensure identities are preserved if they exist
      identities: data.identities || []
    };

    console.log('📊 Formatted user:', {
      hasPassword: formattedUser.hasPassword,
      provider: formattedUser.provider,
      identities: formattedUser.identities
    });

    return formattedUser;
  }, []);

  /**
   * Retrieves active Supabase session token and verifies user authentication with Express backend
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      // 1. Get token from localStorage first (most reliable)
      let token = localStorage.getItem('token');
      
      // 2. If no token in localStorage, try Supabase session
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token;
        if (token) {
          localStorage.setItem('token', token);
        }
      }
      
      console.log('checkAuthStatus - Token found:', !!token);
      
      if (!token) {
        console.log('No token found, setting user to null');
        setUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      // 3. Validate token against backend endpoint
      console.log('Validating token with backend...');
      const response = await fetch('http://localhost:5000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Auth check response status:', response.status);

      if (response.status === 401) {
        console.log('Token invalid, clearing session');
        localStorage.removeItem('token');
        await supabase.auth.signOut();
        setUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('Auth check successful, user:', result.user);
        
        // 🔥 FIXED: Also get the Supabase session to check identities
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUser = session?.user;
        
        // Merge user data with Supabase user data to get identities
        const mergedUserData = {
          ...result.user,
          identities: supabaseUser?.identities || result.user?.identities || [],
          encrypted_password: supabaseUser?.encrypted_password || result.user?.encrypted_password,
          user_metadata: { ...result.user?.user_metadata, ...supabaseUser?.user_metadata }
        };
        
        const userData = {
          ...mergedUserData,
          email_confirmed_at: result.user?.email_confirmed_at || false
        };
        
        const formattedUser = formatUserData(userData);
        console.log('✅ Formatted user with password status:', {
          hasPassword: formattedUser.hasPassword,
          provider: formattedUser.provider
        });
        
        setUser(formattedUser); 
        setPermissions(result.permissions || []); 
      } else {
        console.log('Auth check failed:', result);
        localStorage.removeItem('token');
        setUser(null);
        setPermissions([]);
      }
    } catch (error) {
      console.error("Auth state checking error:", error);
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [formatUserData]);

  /**
   * Initial authentication check and Supabase Auth State listener lifecycle
   */
  useEffect(() => {
    checkAuthStatus();

    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, session?.user?.email);
      
      if (session) {
        localStorage.setItem('token', session.access_token);
        
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          // 🔥 Force refresh user data
          await checkAuthStatus();
        }
        
        // Handle email confirmation events
        if (event === 'USER_UPDATED' && session.user?.email_confirmed_at) {
          await checkAuthStatus();
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('token');
        setUser(null);
        setPermissions([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAuthStatus]);

  /**
   * Manual login handler to persist token and update application state
   */
  const login = useCallback((userData, sessionOrToken, dynamicPermissions) => {
    console.log('Login called with:', { userData, sessionOrToken, dynamicPermissions });
    
    const token = typeof sessionOrToken === 'object' && sessionOrToken !== null
      ? sessionOrToken.access_token || sessionOrToken.token
      : sessionOrToken;

    console.log('Extracted token:', token);

    if (token) {
      localStorage.setItem('token', token);
      const formattedUser = formatUserData(userData);
      console.log('Formatted user:', formattedUser);
      setUser(formattedUser);
      setPermissions(dynamicPermissions || []);
      
      // Immediately check auth status to verify token works
      setTimeout(() => {
        checkAuthStatus();
      }, 100);
    } else {
      console.error("Login execution failed: Access token missing or malformed");
    }
  }, [formatUserData, checkAuthStatus]);

  /**
   * Destroys active Supabase session and clears local application state
   */
  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error("Supabase signout error:", e);
    }
    localStorage.removeItem('token');
    setUser(null);
    setPermissions([]);
    // Use window.location instead of navigate
    window.location.href = '/login';
  }, []);

  /**
   * Fetches configurable session timeout settings from backend
   */
  const fetchSessionTimeout = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/settings/security', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      const minutes = parseInt(result?.settings?.sessionTimeout || '30', 10);
      sessionTimeoutMinutesRef.current = minutes;
    } catch (error) {
      console.error('Failed to fetch session timeout setting:', error);
      sessionTimeoutMinutesRef.current = 30;
    }
  }, []);

  /**
   * Handles automatic logout upon user inactivity
   */
  const handleIdleLogout = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warningTimerRef.current);
    logout();
  }, [logout]);

  /**
   * Resets inactivity timers whenever user interaction is detected
   */
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warningTimerRef.current);

    const timeoutMs = sessionTimeoutMinutesRef.current * 60 * 1000;
    const warningMs = Math.max(timeoutMs - 60000, timeoutMs * 0.9);

    warningTimerRef.current = setTimeout(() => {
      console.warn('Session will expire in 1 minute due to inactivity.');
    }, warningMs);

    idleTimerRef.current = setTimeout(() => {
      handleIdleLogout();
    }, timeoutMs);
  }, [handleIdleLogout]);

  /**
   * Sets up global event listeners for tracking user interactions
   */
  useEffect(() => {
    if (!user) return;

    fetchSessionTimeout().then(() => {
      resetIdleTimer();
    });

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => resetIdleTimer();

    events.forEach(evt => window.addEventListener(evt, handleActivity));

    return () => {
      events.forEach(evt => window.removeEventListener(evt, handleActivity));
      clearTimeout(idleTimerRef.current);
      clearTimeout(warningTimerRef.current);
    };
  }, [user, fetchSessionTimeout, resetIdleTimer]);

  /**
   * Sends profile mutation updates to Express API and updates local user state
   */
  const updateUser = useCallback(async (updatedProfileData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('token');

      const response = await fetch('http://localhost:5000/api/auth/profile', { 
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProfileData) 
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUser(prev => formatUserData({ ...prev, ...updatedProfileData }));
        return true;
      } else {
        throw new Error(result.message || "Profile synchronization failure");
      }
    } catch (error) {
      console.error("Failed handling profile mutations update:", error);
      throw error;
    }
  }, [formatUserData]);

  /**
   * Checks if current user possesses a specific permission privilege
   */
  const hasPermission = useCallback((permissionName) => {
    return permissions.includes(permissionName);
  }, [permissions]);

  /**
   * Initiates Google OAuth authentication flow through Supabase Client
   */
  const loginWithGoogle = useCallback(async () => {
    try {
      // Store that user is coming from Google sign-in
      localStorage.setItem('googleSignInPending', 'true');
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:5173/auth/callback',
          skipBrowserRedirect: false,
        },
      });
      
      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }

      return data;
    } catch (err) {
      console.error("OAuth distribution interface error:", err);
      localStorage.removeItem('googleSignInPending');
      throw err;
    }
  }, []);

  /**
   * Check if user's email is confirmed
   */
  const isEmailConfirmed = useCallback(() => {
    return user?.email_confirmed_at !== null && user?.email_confirmed_at !== undefined;
  }, [user]);

  /**
   * Refresh user data from backend
   */
  const refreshUser = useCallback(async () => {
    await checkAuthStatus();
  }, [checkAuthStatus]);

  return (
    <AuthContext.Provider value={{ 
      user,
      permissions, 
      loading, 
      isAdmin,
      login, 
      logout, 
      updateUser,
      hasPermission, 
      checkAuthStatus,
      loginWithGoogle,
      isEmailConfirmed,
      refreshUser
    }}>
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : children}
    </AuthContext.Provider>
  );
}

/**
 * Custom hook to easily consume AuthContext in child components
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth hooks lifecycle runtime context access validation error');
  return context;
}