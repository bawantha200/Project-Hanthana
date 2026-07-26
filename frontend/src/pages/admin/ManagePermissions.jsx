import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Shield, UserCog, Plus, Loader, Pencil, Trash2, Check, X } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

// Core system roles — cannot be renamed or deleted from this UI
const PROTECTED_ROLES = ['ADMIN', 'CEO', 'CUSTOMER', 'MANAGER', 'EMPLOYEE'];

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

function ManagePermissions() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [addingRole, setAddingRole] = useState(false);

  // ✅ CRUD state for roles list
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [deletingRoleId, setDeletingRoleId] = useState(null);
  const [roleError, setRoleError] = useState('');

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
        setNewRoleName('');
      }
    } catch (err) {
      console.error('Error adding role:', err);
      setRoleError(err.response?.data?.message || 'Failed to add role');
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

  const fetchRolePermissions = async (roleId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/roles/${roleId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRolePermissions(res.data.data.map(p => p.permission_id));
      }
    } catch (err) {
      console.error('Error fetching role permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = async (permissionId, isChecked) => {
    try {
      const token = localStorage.getItem('token');
      if (isChecked) {
        await axios.post(`${API_URL}/role-permissions`,
          { roleId: selectedRole.id, permissionId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.delete(`${API_URL}/role-permissions`, {
          data: { roleId: selectedRole.id, permissionId },
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      fetchRolePermissions(selectedRole.id);
    } catch (err) {
      console.error('Error toggling permission:', err);
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
        if (selectedRole?.id === roleId) {
          setSelectedRole({ ...selectedRole, role_name: formatted });
        }
        setEditingRoleId(null);
        setEditRoleName('');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      setRoleError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setSavingRoleId(null);
    }
  };

  // ✅ Delete a role
  const handleDeleteRole = async (role) => {
    if (!window.confirm(`Delete the role "${role.role_name}"? This cannot be undone.`)) return;

    setDeletingRoleId(role.id);
    setRoleError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${API_URL}/roles/${role.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRoles(roles.filter(r => r.id !== role.id));
        if (selectedRole?.id === role.id) {
          setSelectedRole(null);
          setRolePermissions([]);
        }
      }
    } catch (err) {
      console.error('Error deleting role:', err);
      setRoleError(err.response?.data?.message || 'Failed to delete role. It may still be assigned to users.');
    } finally {
      setDeletingRoleId(null);
    }
  };

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

  const editableRoles = roles.filter((role) => !PROTECTED_ROLES.includes(role.role_name));

  return (
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

        {/* ✅ Roles list — rename / delete */}
        {editableRoles.length > 0 && (
          <div className="mt-5 pt-4 border-t border-gray-100 space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Custom Roles
            </h3>
            {editableRoles.map((role) => (
              <div
                key={role.id}
                className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg border border-gray-200"
              >
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
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEditRole(role)}
                        title="Rename role"
                        className="p-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role)}
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
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Role Permissions Card */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-blue-50 flex items-center justify-center">
            <Shield size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Role Permissions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select a role to view and edit its permissions</p>
          </div>
        </div>

        <select
  className="w-full sm:max-w-md px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white mb-5"
  value={selectedRole?.id || ''}
  onChange={(e) => {
    const role = roles.find(r => r.id === parseInt(e.target.value));
    setSelectedRole(role);
    if (role) fetchRolePermissions(role.id);
  }}
>
  <option value="">Select Role</option>
  {roles
    .filter((role) => !['CUSTOMER', 'MANAGER', 'EMPLOYEE'].includes(role.role_name))
    .map((role) => (
      <option key={role.id} value={role.id}>{role.role_name}</option>
    ))}
</select>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6">
            <Loader size={16} className="animate-spin" />
            Loading permissions...
          </div>
        )}

        {selectedRole && !loading && (
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {selectedRole.role_name} Permissions
            </h3>
            <div className="space-y-1">
  {permissions.map(perm => (
    <div
      key={perm.id}
      className="flex items-center justify-between gap-3 py-3 px-3 rounded-lg border border-gray-200 hover:bg-gray-50/70 transition-colors"
    >
      <p className="text-sm font-medium text-gray-800 flex-1 min-w-0 break-words">
        {perm.permission_name}
      </p>
      <div className="flex-shrink-0">
        <Toggle
          enabled={rolePermissions.includes(perm.id)}
          onToggle={() => togglePermission(perm.id, !rolePermissions.includes(perm.id))}
        />
      </div>
    </div>
  ))}
</div>
          </div>
        )}

        {!selectedRole && !loading && (
          <div className="text-center py-10 text-sm text-gray-400 border-t border-gray-100">
            Select a role above to manage its permissions
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default ManagePermissions;