// frontend/src/hooks/useAuth.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import authService from '../services/authService';
import toast from 'react-hot-toast';

// ─── Query Keys ───
export const AUTH_QUERY_KEYS = {
  USER: ['auth', 'user'],
  PROFILE: (userId) => ['auth', 'profile', userId],
  PERMISSIONS: (userId) => ['auth', 'permissions', userId],
  ROLES: ['auth', 'roles'],
  PASSWORD_STATUS: (userId) => ['auth', 'passwordStatus', userId],
};

// ─── Get Current User ───
export const useCurrentUser = (options = {}) => {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.USER,
    queryFn: async () => {
      const result = await authService.getCurrentUser();
      return result;
    },
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: 2,
    ...options,
  });
};

// ─── Get User Profile ───
export const useProfile = (userId, options = {}) => {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.PROFILE(userId),
    queryFn: async () => {
      const result = await authService.getProfile(userId);
      return result;
    },
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
    enabled: !!userId,
    refetchOnWindowFocus: false,
    ...options,
  });
};

// ─── Get User Permissions ───
export const usePermissions = (userId, options = {}) => {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.PERMISSIONS(userId),
    queryFn: async () => {
      const result = await authService.getPermissions(userId);
      return result.permissions;
    },
    staleTime: 600000, // 10 minutes
    gcTime: 900000, // 15 minutes
    enabled: !!userId,
    refetchOnWindowFocus: false,
    ...options,
  });
};

// ─── Get All Roles ───
export const useRoles = (options = {}) => {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.ROLES,
    queryFn: async () => {
      const result = await authService.getAllRoles();
      return result.roles;
    },
    staleTime: 600000, // 10 minutes
    gcTime: 900000, // 15 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
};

// ─── Check Password Status ───
export const usePasswordStatus = (userId, options = {}) => {
  return useQuery({
    queryKey: AUTH_QUERY_KEYS.PASSWORD_STATUS(userId),
    queryFn: async () => {
      const result = await authService.checkPasswordStatus(userId);
      return result.hasPassword;
    },
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
    enabled: !!userId,
    refetchOnWindowFocus: false,
    ...options,
  });
};

// ─── Mutations ───

// ─── Login Mutation ───
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }) => authService.login(email, password),
    onSuccess: (data) => {
      // Invalidate all auth queries
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.USER });
      toast.success('Login successful!');
    },
    onError: (error) => {
      toast.error(error.message || 'Login failed. Please try again.');
    },
  });
};

// ─── Logout Mutation ───
export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      // Clear all auth queries from cache
      queryClient.removeQueries({ queryKey: AUTH_QUERY_KEYS.USER });
      queryClient.removeQueries({ queryKey: ['auth'] });
      toast.success('Logged out successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Logout failed. Please try again.');
    },
  });
};

// ─── Register Mutation ───
export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phase, data }) => {
      if (phase === 1) return authService.registerPhase1(data);
      return authService.registerPhase2(data);
    },
    onSuccess: (data, variables) => {
      if (variables.phase === 2) {
        // Invalidate user queries after successful registration
        queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.USER });
        toast.success('Registration successful!');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.');
    },
  });
};

// ─── Update Profile Mutation ───
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: (data, variables) => {
      // Invalidate profile and user queries
      queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEYS.USER });
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile.');
    },
  });
};

// ─── Update Password Mutation ───
export const useUpdatePassword = () => {
  return useMutation({
    mutationFn: authService.updatePassword,
    onSuccess: () => {
      toast.success('Password updated successfully!');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update password.');
    },
  });
};

// ─── Delete Account Mutation ───
export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authService.deleteAccount,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['auth'] });
      toast.success('Account deleted successfully.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete account.');
    },
  });
};