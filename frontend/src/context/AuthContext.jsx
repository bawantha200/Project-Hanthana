import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Derived state to check if current user has ADMIN role
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  // Refs to manage inactivity timeout timers
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const sessionTimeoutMinutesRef = useRef(30); // Default timeout in minutes

  /**
   * Standardizes database variations of user objects into consistent camelCase/snake_case fields
   */
const formatUserData = useCallback((data) => {
  if (!data) return null;

  const { isGoogleUser, hasPassword } = detectUserType(data);

  const finalFullName = data.fullName || data.full_name || 'User Profile';
  const finalRole = data.role || data.role_name || 'CUSTOMER';
  const finalPhone = data.phone || data.phone_number || '';
  const finalAddress = data.address || '';

  return {
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
    roleColor: getRoleColorClass(finalRole)
  };
}, []);

  /**
   * Retrieves active Supabase session token and verifies user authentication with Express backend
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      // 1. Fetch latest active session directly from Supabase to handle token refreshes properly
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || localStorage.getItem('token'); 
      
      if (!token) {
        setUser(null);
        setPermissions([]);
        setLoading(false);
        return;
      }

      // Sync active token to localStorage for backend requests
      localStorage.setItem('token', token);

      // 2. Validate token against backend endpoint
      const response = await fetch('http://localhost:5000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setUser(formatUserData(result.user)); 
        setPermissions(result.permissions || []); 
      } else {
        // Clear stored token and state if token validation fails
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

    // Listen to auth state changes (e.g., token refreshes, sign in, sign out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        localStorage.setItem('token', session.access_token);
        
        // Re-verify auth status on explicit login or token refresh events
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          checkAuthStatus();
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
    const token = typeof sessionOrToken === 'object' && sessionOrToken !== null
      ? sessionOrToken.access_token 
      : sessionOrToken;

    if (token) {
      localStorage.setItem('token', token);
      setUser(formatUserData(userData));
      setPermissions(dynamicPermissions || []);
    } else {
      console.error("Login execution failed: Access token missing or malformed");
    }
  }, [formatUserData]);

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
      sessionTimeoutMinutesRef.current = 30; // Fallback default
    }
  }, []);

  /**
   * Handles automatic logout upon user inactivity
   */
  const handleIdleLogout = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warningTimerRef.current);
    logout();
    window.location.href = '/login';
  }, [logout]);

  /**
   * Resets inactivity timers whenever user interaction is detected
   */
  const resetIdleTimer = useCallback(() => {
    clearTimeout(idleTimerRef.current);
    clearTimeout(warningTimerRef.current);

    const timeoutMs = sessionTimeoutMinutesRef.current * 60 * 1000;
    const warningMs = Math.max(timeoutMs - 60000, timeoutMs * 0.9); // Warning 1 min before logout

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
      throw err;
    }
  }, []);

  // Add this function inside AuthContext.jsx
// ============ FILE: AuthContext.jsx ============
// LOCATION: Add this function inside your AuthContext component

// Add this function to detect user type
const detectUserType = (user) => {
  if (!user) return { isGoogleUser: false, hasPassword: false };
  
  // Check if user is from Google
  const isGoogleUser = user?.provider === 'google' || 
                       user?.authProvider === 'google' ||
                       user?.identities?.some?.(id => id.provider === 'google') ||
                       user?.app_metadata?.provider === 'google';
  
  // Check if user has a password
  const hasPassword = user?.hasPassword || false;
  
  return { isGoogleUser, hasPassword };
};

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isAdmin,
      login, 
      logout, 
      updateUser,
      hasPermission, 
      checkAuthStatus,
      loginWithGoogle
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