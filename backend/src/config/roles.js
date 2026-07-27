// backend/src/config/roles.js
//
// Single source of truth for role-group checks used across controllers.
// If a new role should ever get admin-level access (e.g. a future
// SUPPORT_LEAD role), add it here ONCE instead of hunting through every
// controller that currently hardcodes `role_name === 'ADMIN'`.

// Roles that should be treated as "admin-level" — i.e. can see all
// records (all orders, all deliveries, etc.) rather than just their own.
const ADMIN_LEVEL_ROLES = ['ADMIN', 'CEO'];

// Roles that ship with the system and can't be renamed/deleted from the
// roles-management UI. Keep this in sync with PROTECTED_ROLES in
// controllers/roles.js and the frontend's PROTECTED_ROLES constant.
const PROTECTED_ROLES = ['ADMIN', 'CEO', 'CUSTOMER', 'MANAGER', 'EMPLOYEE'];

/**
 * @param {string} roleName - e.g. req.user.role, or role?.role_name from a
 *   `roles` table lookup. Case-sensitive — role names are stored uppercase.
 * @returns {boolean} true if this role should get admin-level (see-all) access.
 */
const isAdminLevel = (roleName) => ADMIN_LEVEL_ROLES.includes(roleName);

module.exports = {
  ADMIN_LEVEL_ROLES,
  PROTECTED_ROLES,
  isAdminLevel,
};