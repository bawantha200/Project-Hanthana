// frontend/src/hooks/useAuthData.js
import { useCurrentUser, useProfile, usePermissions, useRoles, usePasswordStatus } from './useAuth';

export const useAuthData = (userId) => {
  const userQuery = useCurrentUser();
  const profileQuery = useProfile(userId);
  const permissionsQuery = usePermissions(userId);
  const rolesQuery = useRoles();
  const passwordStatusQuery = usePasswordStatus(userId);

  const isLoading = userQuery.isLoading || profileQuery.isLoading;
  const isError = userQuery.isError || profileQuery.isError;

  return {
    // User data
    user: userQuery.data?.user || null,
    isAuthenticated: !!userQuery.data?.user,
    isLoading,
    isError,
    error: userQuery.error || profileQuery.error,

    // Profile
    profile: profileQuery.data || null,
    profileLoading: profileQuery.isLoading,

    // Permissions
    permissions: permissionsQuery.data || [],
    permissionsLoading: permissionsQuery.isLoading,

    // Roles
    roles: rolesQuery.data || [],
    rolesLoading: rolesQuery.isLoading,

    // Password status
    hasPassword: passwordStatusQuery.data || false,
    passwordStatusLoading: passwordStatusQuery.isLoading,

    // Refetch functions
    refetch: () => {
      userQuery.refetch();
      profileQuery.refetch();
      permissionsQuery.refetch();
      rolesQuery.refetch();
      passwordStatusQuery.refetch();
    },

    // Query statuses
    isFetching: userQuery.isFetching || profileQuery.isFetching,
    isStale: userQuery.isStale || profileQuery.isStale,

    // Individual query objects for advanced usage
    queries: {
      user: userQuery,
      profile: profileQuery,
      permissions: permissionsQuery,
      roles: rolesQuery,
      passwordStatus: passwordStatusQuery,
    },
  };
};