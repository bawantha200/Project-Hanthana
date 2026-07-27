// src/utils/roleRouting.js
//
// Single source of truth for "where should this logged-in user land".
// Used by both Login.jsx (right after a successful login) and
// GuestRoute in router.jsx (when an already-logged-in user hits /login
// or /register directly). Keeping this in one place means the two can
// never drift out of sync again.

import { NAV_ITEMS } from '../config/navItems';

// Guaranteed landing page for the fixed system roles — these always win,
// regardless of what order their permissions happen to be granted in.
// CUSTOMER intentionally goes to '/' (Home) — every other role here is
// intentionally kept OUT of '/'.
export const FIXED_ROLE_ROUTES = {
  ADMIN: '/admin/user-management',
  CEO: '/admin/dashboard',
  MANAGER: '/admin/dashboard',
  EMPLOYEE: '/admin/dashboard',
  CUSTOMER: '/',
};

/**
 * Decide where a logged-in user should land.
 *
 * @param {string} role - user.role or user.role_name, any case.
 * @param {string[] | ((id: string) => boolean)} permissionsOrChecker -
 *   either the raw permissions array (e.g. from a fresh login response),
 *   or a hasPermission(id)-style checker function (e.g. from useAuth()).
 * @returns {string} route path to navigate to.
 */
export function getTargetRoute(role, permissionsOrChecker) {
  const upperRole = role?.toUpperCase();

  // Known system role — always lands here, never falls through to Home.
  if (upperRole && FIXED_ROLE_ROUTES[upperRole]) {
    return FIXED_ROLE_ROUTES[upperRole];
  }

  const hasAccess = typeof permissionsOrChecker === 'function'
    ? permissionsOrChecker
    : (id) => (permissionsOrChecker || []).includes(id);

  // Custom role — land on the first page (in NAV_ITEMS order) they
  // actually have permission for.
  const firstAccessible = NAV_ITEMS.find((item) => hasAccess(item.id));

  // Only a custom role with literally zero admin permissions falls back
  // to Home — everyone else lands inside /admin/*.
  return firstAccessible ? firstAccessible.path : '/';
}