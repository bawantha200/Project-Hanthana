import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Shield, UserCog, Plus, Loader } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

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

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;

    setAddingRole(true);
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

  const Toggle = ({ enabled, onToggle }) => (
    <button
      onClick={onToggle}
      className={`relative inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${
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
          Assign permissions to user roles and create new roles
        </p>
      </motion.div>

      {/* Add Role Card */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
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
            onChange={(e) => setNewRoleName(e.target.value)}
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
      </motion.div>

      {/* Role Permissions Card */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
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
          {roles.map(role => (
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
                  className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-800">{perm.permission_name}</p>
                  <Toggle
                    enabled={rolePermissions.includes(perm.id)}
                    onToggle={() => togglePermission(perm.id, !rolePermissions.includes(perm.id))}
                  />
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