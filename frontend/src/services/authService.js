// frontend/src/services/authService.js
import axios from 'axios';
import { supabase } from '../lib/supabase';

// ─── Cache Configuration ───
const CACHE_TTL = {
  USER: 300000,        // 5 minutes
  PROFILE: 300000,     // 5 minutes
  PERMISSIONS: 600000, // 10 minutes
  ROLES: 600000,       // 10 minutes
  PASSWORD_STATUS: 300000, // 5 minutes
};

// ─── In-Memory Cache ───
class AuthCache {
  constructor() {
    this.cache = new Map();
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key, value, ttl = CACHE_TTL.USER) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  deletePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

const cache = new AuthCache();

// ─── Auth API Service ───
export const authService = {
  // ─── Get Current User (with caching) ───
  getCurrentUser: async (forceRefresh = false) => {
    const cacheKey = 'current_user';
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('📦 [Auth] Returning cached user');
        return { ...cached, fromCache: true };
      }
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;

      const response = {
        user,
        hasPassword: user?.identities?.some(id => id.provider === 'email') || false,
      };

      cache.set(cacheKey, response);
      return { ...response, fromCache: false };
    } catch (error) {
      console.error('[Auth] Get user error:', error);
      throw error;
    }
  },

  // ─── Get User Profile (with caching) ───
  getProfile: async (userId, forceRefresh = false) => {
    const cacheKey = `profile_${userId}`;
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('📦 [Auth] Returning cached profile');
        return { ...cached, fromCache: true };
      }
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone_number,
          address,
          role_id,
          status,
          created_at,
          role:role_id (
            id,
            role_name,
            description
          )
        `)
        .eq('id', userId)
        .single();

      if (error) throw error;

      cache.set(cacheKey, profile, CACHE_TTL.PROFILE);
      return { ...profile, fromCache: false };
    } catch (error) {
      console.error('[Auth] Get profile error:', error);
      throw error;
    }
  },

  // ─── Get User Permissions (with caching) ───
  getPermissions: async (userId, forceRefresh = false) => {
    const cacheKey = `permissions_${userId}`;
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('📦 [Auth] Returning cached permissions');
        return { permissions: cached, fromCache: true };
      }
    }

    try {
      const response = await axios.get('/api/auth/permissions');
      const permissions = response.data.permissions || [];

      cache.set(cacheKey, permissions, CACHE_TTL.PERMISSIONS);
      return { permissions, fromCache: false };
    } catch (error) {
      console.error('[Auth] Get permissions error:', error);
      return { permissions: [], fromCache: false };
    }
  },

  // ─── Get All Roles (with caching) ───
  getAllRoles: async (forceRefresh = false) => {
    const cacheKey = 'all_roles';
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('📦 [Auth] Returning cached roles');
        return { roles: cached, fromCache: true };
      }
    }

    try {
      const response = await axios.get('/api/auth/roles');
      const roles = response.data.roles || [];

      cache.set(cacheKey, roles, CACHE_TTL.ROLES);
      return { roles, fromCache: false };
    } catch (error) {
      console.error('[Auth] Get roles error:', error);
      return { roles: [], fromCache: false };
    }
  },

  // ─── Check Password Status (with caching) ───
  checkPasswordStatus: async (userId, forceRefresh = false) => {
    const cacheKey = `password_status_${userId}`;
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('📦 [Auth] Returning cached password status');
        return { hasPassword: cached, fromCache: true };
      }
    }

    try {
      const response = await axios.get('/api/auth/check-password');
      const hasPassword = response.data.hasPassword || false;

      cache.set(cacheKey, hasPassword, CACHE_TTL.PASSWORD_STATUS);
      return { hasPassword, fromCache: false };
    } catch (error) {
      console.error('[Auth] Check password error:', error);
      return { hasPassword: false, fromCache: false };
    }
  },

  // ─── Login (invalidates cache) ───
  login: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    // Clear auth caches on login
    cache.deletePattern('current_user');
    cache.deletePattern('profile_');
    cache.deletePattern('permissions_');
    cache.delete('all_roles');
    cache.deletePattern('password_status_');

    return data;
  },

  // ─── Logout (clears all auth cache) ───
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Clear all auth caches on logout
    cache.clear();

    return { success: true };
  },

  // ─── Register Phase 1 ───
  registerPhase1: async (data) => {
    const response = await axios.post('/api/auth/register/phase1', data);
    return response.data;
  },

  // ─── Register Phase 2 ───
  registerPhase2: async (data) => {
    const response = await axios.post('/api/auth/register/phase2', data);
    return response.data;
  },

  // ─── Google Sign-In Callback ───
  googleCallback: async (accessToken) => {
    const response = await axios.post('/api/auth/google/callback', { accessToken });
    return response.data;
  },

  // ─── Create Google Profile ───
  createGoogleProfile: async (data) => {
    const response = await axios.post('/api/auth/google/create-profile', data);
    return response.data;
  },

  // ─── Update Profile (invalidates cache) ───
  updateProfile: async (data) => {
    const response = await axios.put('/api/auth/profile', data);
    
    // Invalidate profile cache
    cache.deletePattern('profile_');
    cache.deletePattern('current_user');
    
    return response.data;
  },

  // ─── Update Password ───
  updatePassword: async (data) => {
    const response = await axios.put('/api/auth/update-password', data);
    
    // Invalidate password status cache
    cache.deletePattern('password_status_');
    
    return response.data;
  },

  // ─── Set Password for Google User ───
  setPassword: async (data) => {
    const response = await axios.post('/api/auth/set-password', data);
    
    // Invalidate password status cache
    cache.deletePattern('password_status_');
    
    return response.data;
  },

  // ─── Change Email ───
  changeEmail: async (data) => {
    const response = await axios.put('/api/auth/change-email', data);
    return response.data;
  },

  // ─── Delete Account ───
  deleteAccount: async (password) => {
    const response = await axios.delete('/api/auth/account', { data: { password } });
    
    // Clear all auth caches
    cache.clear();
    
    return response.data;
  },

  // ─── Cache Management ───
  clearCache: () => {
    cache.clear();
    console.log('🗑️ [Auth] Cache cleared');
  },

  getCacheStats: () => {
    const keys = cache.cache.keys();
    return {
      total: keys.length,
      keys: Array.from(keys),
    };
  },
};

export default authService;