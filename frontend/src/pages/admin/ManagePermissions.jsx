import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  UserCog,
  Plus,
  Loader,
  Pencil,
  Trash2,
  Check,
  X,
  Save,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

// Hidden entirely from this list — not managed here at all.
const HIDDEN_ROLES = ['MANAGER', 'EMPLOYEE', 'CUSTOMER'];

// Shown in the list (so their permissions can still be toggled),
// but rename/delete are locked — these are core system roles.
const PROTECTED_ROLES = ['ADMIN', 'CEO','HR_MANAGER','SALES_MANAGER','INVENTORY_MANAGER','ACCOUNTANT','CASHIER','RIDER'];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ---------------------------------------------------------------------
// Toast notification system (replaces plain error text / no feedback)
// ---------------------------------------------------------------------
let toastIdCounter = 0;

function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, x: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`flex items-start gap-3 p-3.5 rounded-xl shadow-lg border backdrop-blur-sm ${
              toast.type === 'success'
                ? 'bg-green-50/95 border-green-200'
                : 'bg-rose-50/95 border-rose-200'
            }`}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' ? (
                <CheckCircle2 size={18} className="text-green-600" />
              ) : (
                <XCircle size={18} className="text-rose-600" />
              )}
            </div>
            <p
              className={`text-sm font-medium flex-1 ${
                toast.type === 'success' ? 'text-green-800' : 'text-rose-800'
              }`}
            >
              {toast.message}
            </p>
            <button
              onClick={() => onDismiss(toast.id)}
              className={`shrink-0 p-0.5 rounded-md transition-colors ${
                toast.type === 'success'
                  ? 'text-green-500 hover:bg-green-100'
                  : 'text-rose-500 hover:bg-rose-100'
              }`}
            >
              <X size={14} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------
// Confirm modal (replaces window.confirm for delete)
// ---------------------------------------------------------------------
function ConfirmDeleteModal({ open, roleName, loading, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 12 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-5"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-rose-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-gray-900">Delete role?</h3>
                <p className="text-sm text-gray-500 mt-1 break-words">
                  Are you sure you want to delete{' '}
                  <span className="font-medium text-gray-700">"{roleName}"</span>? This
                  action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Delete
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ManagePermissions() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [newRoleName, setNewRoleName] = useState('');
  const [addingRole, setAddingRole] = useState(false);

  // ✅ CRUD state for roles list
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [deletingRoleId, setDeletingRoleId] = useState(null);
  const [roleError, setRoleError] = useState('');

  // ✅ Inline "Permission" panel state (per-role expandable section)
  const [permissionsRoleId, setPermissionsRoleId] = useState(null); // which role's panel is open
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [originalPermissionIds, setOriginalPermissionIds] = useState([]); // as last saved
  const [draftPermissionIds, setDraftPermissionIds] = useState([]); // local edits, not yet saved
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [permissionsError, setPermissionsError] = useState('');

  // ✅ Toast notifications
  const [toasts, setToasts] = useState([]);

  // ✅ Delete confirmation modal
  const [roleToDelete, setRoleToDelete] = useState(null); // the role object pending deletion

  const showToast = useCallback((message, type = 'success') => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;

    setAddingRole(true);
    setRoleError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/roles`,
        { role_name: newRoleName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setRoles([...roles, res.data.data]);
        showToast(`Role "${res.data.data.role_name}" created`, 'success');
        setNewRoleName('');
      }
    } catch (err) {
      console.error('Error adding role:', err);
      const msg = err.response?.data?.message || 'Failed to add role';
      setRoleError(msg);
      showToast(msg, 'error');
    } finally {
      setAddingRole(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/roles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRoles(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPermissions(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  // ✅ Start editing a role name
  const startEditRole = (role) => {
    setRoleError('');
    setEditingRoleId(role.id);
    setEditRoleName(role.role_name);
  };

  const cancelEditRole = () => {
    setEditingRoleId(null);
    setEditRoleName('');
  };

  // ✅ Update (rename) a role
  const handleUpdateRole = async (roleId) => {
    const formatted = editRoleName
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');

    if (!formatted.trim()) {
      setRoleError('Role name cannot be empty');
      showToast('Role name cannot be empty', 'error');
      return;
    }

    setSavingRoleId(roleId);
    setRoleError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/roles/${roleId}`,
        { role_name: formatted },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        setRoles(roles.map(r => (r.id === roleId ? { ...r, role_name: formatted } : r)));
        setEditingRoleId(null);
        setEditRoleName('');
        showToast(`Role renamed to "${formatted}"`, 'success');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      const msg = err.response?.data?.message || 'Failed to update role';
      setRoleError(msg);
      showToast(msg, 'error');
    } finally {
      setSavingRoleId(null);
    }
  };

  // ✅ Open the custom confirm modal instead of window.confirm
  const requestDeleteRole = (role) => {
    setRoleError('');
    setRoleToDelete(role);
  };

  const cancelDeleteRole = () => {
    if (deletingRoleId) return; // don't allow closing mid-request
    setRoleToDelete(null);
  };

  // ✅ Delete a role (called after confirming in the modal)
  const confirmDeleteRole = async () => {
    if (!roleToDelete) return;
    const role = roleToDelete;

    setDeletingRoleId(role.id);
    setRoleError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${API_URL}/roles/${role.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRoles(roles.filter(r => r.id !== role.id));
        if (permissionsRoleId === role.id) {
          setPermissionsRoleId(null);
        }
        showToast(`Role "${role.role_name}" deleted`, 'success');
        setRoleToDelete(null);
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      const msg = err.response?.data?.message || 'Failed to delete role. It may still be assigned to users.';
      setRoleError(msg);
      showToast(msg, 'error');
      setRoleToDelete(null);
    } finally {
      setDeletingRoleId(null);
    }
  };

  // ✅ Toggle the inline Permission panel open/closed for a given role
  const togglePermissionsPanel = async (role) => {
    setPermissionsError('');

    // Clicking the same role again collapses the panel
    if (permissionsRoleId === role.id) {
      setPermissionsRoleId(null);
      return;
    }

    setPermissionsRoleId(role.id);
    setPermissionsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/roles/${role.id}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const ids = res.data.data.map(p => p.permission_id);
        setOriginalPermissionIds(ids);
        setDraftPermissionIds(ids); // start the draft as a copy of what's saved
      }
    } catch (err) {
      console.error('Error fetching role permissions:', err);
      const msg = 'Failed to load permissions for this role';
      setPermissionsError(msg);
      showToast(msg, 'error');
    } finally {
      setPermissionsLoading(false);
    }
  };

  // ✅ Local-only toggle — does NOT call the API. Save button below commits it.
  const toggleDraftPermission = (permissionId) => {
    setDraftPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  // ✅ Commit the draft: diff against what was last saved, only send the changes
  const handleSavePermissions = async () => {
    if (permissionsRoleId == null) return;

    const toAdd = draftPermissionIds.filter((id) => !originalPermissionIds.includes(id));
    const toRemove = originalPermissionIds.filter((id) => !draftPermissionIds.includes(id));

    if (toAdd.length === 0 && toRemove.length === 0) {
      return; // nothing changed
    }

    setSavingPermissions(true);
    setPermissionsError('');
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      await Promise.all([
        ...toAdd.map((permissionId) =>
          axios.post(`${API_URL}/role-permissions`,
            { roleId: permissionsRoleId, permissionId },
            { headers }
          )
        ),
        ...toRemove.map((permissionId) =>
          axios.delete(`${API_URL}/role-permissions`, {
            data: { roleId: permissionsRoleId, permissionId },
            headers,
          })
        ),
      ]);

      setOriginalPermissionIds(draftPermissionIds);
      showToast('Permissions saved', 'success');
    } catch (err) {
      console.error('Error saving permissions:', err);
      const msg = 'Failed to save permission changes';
      setPermissionsError(msg);
      showToast(msg, 'error');
    } finally {
      setSavingPermissions(false);
    }
  };

  const hasUnsavedPermissionChanges =
    draftPermissionIds.length !== originalPermissionIds.length ||
    draftPermissionIds.some((id) => !originalPermissionIds.includes(id));

  const Toggle = ({ enabled, onToggle }) => (
    <button
      onClick={onToggle}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
        enabled ? 'bg-blue-600' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );

  // Roles visible in this list — hide MANAGER/EMPLOYEE/CUSTOMER entirely.
  const editableRoles = roles.filter((role) => !HIDDEN_ROLES.includes(role.role_name));

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <ConfirmDeleteModal
        open={!!roleToDelete}
        roleName={roleToDelete?.role_name || ''}
        loading={!!deletingRoleId}
        onCancel={cancelDeleteRole}
        onConfirm={confirmDeleteRole}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-gray-900">Manage Permissions</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create, rename, or remove roles, and assign permissions to them
          </p>
        </motion.div>

        {/* Add Role Card */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 flex items-center justify-center">
              <UserCog size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Create New Role</h2>
              <p className="text-xs text-gray-400 mt-0.5">Add a new role to assign permissions to</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="e.g. Warehouse Manager"
              value={newRoleName}
              onChange={(e) => {
                const formatted = e.target.value
                  .toUpperCase()
                  .replace(/\s+/g, '_')       // spaces -> underscore
                  .replace(/[^A-Z0-9_]/g, ''); // allow only A-Z, 0-9, underscore
                setNewRoleName(formatted);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleAddRole}
              disabled={addingRole || !newRoleName.trim()}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addingRole ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Role
                </>
              )}
            </motion.button>
          </div>

          {roleError && (
            <p className="text-xs text-rose-600 mt-3">{roleError}</p>
          )}

          {/* ✅ Roles list — rename / delete / manage permissions */}
          {editableRoles.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                All Roles
              </h3>
              {editableRoles.map((role) => (
                <div key={role.id} className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 py-2.5 px-3">
                    {editingRoleId === role.id ? (
                      <>
                        <input
                          type="text"
                          value={editRoleName}
                          onChange={(e) => {
                            const formatted = e.target.value
                              .toUpperCase()
                              .replace(/\s+/g, '_')
                              .replace(/[^A-Z0-9_]/g, '');
                            setEditRoleName(formatted);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleUpdateRole(role.id);
                            if (e.key === 'Escape') cancelEditRole();
                          }}
                          autoFocus
                          className="flex-1 min-w-0 px-3 py-1.5 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleUpdateRole(role.id)}
                            disabled={savingRoleId === role.id}
                            title="Save"
                            className="p-1.5 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            {savingRoleId === role.id ? (
                              <Loader size={14} className="animate-spin" />
                            ) : (
                              <Check size={14} />
                            )}
                          </button>
                          <button
                            onClick={cancelEditRole}
                            title="Cancel"
                            className="p-1.5 text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-800 flex-1 min-w-0 break-words">
                          {role.role_name}
                          {PROTECTED_ROLES.includes(role.role_name) && (
                            <span className="ml-2 text-[10px] font-semibold text-gray-400 uppercase">
                              System Role
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => togglePermissionsPanel(role)}
                            title="Manage permissions"
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              permissionsRoleId === role.id
                                ? 'bg-blue-600 text-white'
                                : 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                            }`}
                          >
                            <Shield size={14} />
                            Permission
                          </button>
                          {!PROTECTED_ROLES.includes(role.role_name) && (
                            <>
                              <button
                                onClick={() => startEditRole(role)}
                                title="Rename role"
                                className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => requestDeleteRole(role)}
                                disabled={deletingRoleId === role.id}
                                title="Delete role"
                                className="p-1.5 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                              >
                                {deletingRoleId === role.id ? (
                                  <Loader size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* ✅ Inline expandable Permission panel */}
                  <AnimatePresence>
                    {permissionsRoleId === role.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-100 bg-gray-50/60 overflow-hidden"
                      >
                        <div className="p-3 sm:p-4">
                          {permissionsLoading ? (
                            <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                              <Loader size={16} className="animate-spin" />
                              Loading permissions...
                            </div>
                          ) : (
                            <>
                              <div className="space-y-1">
                                {permissions.map((perm, index) => (
                                  <div
                                    key={perm.id}
                                    className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50/70 transition-colors"
                                  >
                                    <p className="text-sm font-medium text-gray-800 flex-1 min-w-0 break-words">
                                      <span className="text-gray-400 mr-2">{index + 1}.</span>
                                      {perm.permission_name}
                                    </p>
                                    <div className="flex-shrink-0">
                                      <Toggle
                                        enabled={draftPermissionIds.includes(perm.id)}
                                        onToggle={() => toggleDraftPermission(perm.id)}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {permissionsError && (
                                <p className="text-xs text-rose-600 mt-3">{permissionsError}</p>
                              )}

                              <div className="flex items-center justify-end gap-3 mt-4">
                                {hasUnsavedPermissionChanges && (
                                  <span className="text-xs text-amber-600 font-medium">
                                    Unsaved changes
                                  </span>
                                )}
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={() => setPermissionsRoleId(null)}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                >
                                  <X size={14} />
                                  Close
                                </motion.button>
                                <motion.button
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.97 }}
                                  onClick={handleSavePermissions}
                                  disabled={savingPermissions || !hasUnsavedPermissionChanges}
                                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {savingPermissions ? (
                                    <>
                                      <Loader size={14} className="animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Save size={14} />
                                      Save
                                    </>
                                  )}
                                </motion.button>
                              </div>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </>
  );
}

export default ManagePermissions;