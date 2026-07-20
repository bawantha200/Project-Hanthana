import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

  /**
   * Standardizes database variations of user objects into camelCase fields used by components
   */
  const formatUserData = useCallback((data) => {
    if (!data) return null;

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
      roleColor: getRoleColorClass(finalRole)
    };
  }, []);

  /**
   * Checks local storage for tokens and synchronizes session state with the Express backend
   */
  const checkAuthStatus = useCallback(async () => {
    const token = localStorage.getItem('token'); 
    
    if (!token) {
      setUser(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
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
        localStorage.removeItem('token');
        setUser(null);
        setPermissions([]);
      }
    } catch (error) {
      console.error("Auth state checking error:", error);
      localStorage.removeItem('token');
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [formatUserData]);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  /**
   * Sets up local session and authenticates context following email or OAuth workflows
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
   * Destroys active tokens and clears memory state wrappers
   */
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setPermissions([]);
  }, []);

  /**
   * Sends updated profile changes to the database and refreshes local application state
   */
  const updateUser = useCallback(async (updatedProfileData) => {
    try {
      const token = localStorage.getItem('token');
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

  const hasPermission = useCallback((permissionName) => {
    return permissions.includes(permissionName);
  }, [permissions]);

  /**
   * Directs users outward to high-level Google integration pipelines
   */
/**
   * Directs users outward to high-level Google integration pipelines
   */
  const loginWithGoogle = useCallback(async () => {
    try {
      console.log("[AUTH CONTEXT] Initializing Supabase signInWithOAuth for Google...");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:5173/auth/callback',
          // Ensures the provider returns the URL cleanly if auto-redirect behaves sluggishly
          skipBrowserRedirect: false, 
        },
      });
      
      if (error) throw error;

      // 🌟 CRITICAL FIX: If Supabase generated the authentication URL but didn't 
      // automatically trigger the browser redirection, force the window to navigate there now!
      if (data?.url) {
        console.log("[AUTH CONTEXT] Redirecting window location to Supabase OAuth destination:", data.url);
        window.location.href = data.url;
      } else {
        console.warn("[AUTH CONTEXT] OAuth initiated, but no redirect URL was returned in the data payload.");
      }

      return data;
    } catch (err) {
      console.error("OAuth distribution interface error:", err);
      throw err;
    }
  }, []);

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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth hooks lifecycle runtime context access validation error');
  return context;
}