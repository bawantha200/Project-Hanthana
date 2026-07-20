import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

function ManagePermissions() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const handleAddRole = async () => {
  if (!newRoleName.trim()) return;
  
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

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Manage Role Permissions</h2>
      
      <select 
        className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg mb-6"
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

      {loading && <p>Loading permissions...</p>}

      {selectedRole && !loading && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="font-medium mb-3">{selectedRole.role_name} Permissions</h3>
          {permissions.map(perm => (
            <label key={perm.id} className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={rolePermissions.includes(perm.id)}
                onChange={(e) => togglePermission(perm.id, e.target.checked)}
              />
              {perm.permission_name}
            </label>
          ))}
        </div>
      )}
      <div className="flex gap-2 mb-6">
  <input
    type="text"
    placeholder="New role name"
    value={newRoleName}
    onChange={(e) => setNewRoleName(e.target.value)}
    className="px-3 py-2 border border-gray-200 rounded-lg"
  />
  <button onClick={handleAddRole} className="px-4 py-2 bg-blue-500 text-white rounded-lg">
    Add Role
  </button>
</div>
    </div>

    
  );
}

export default ManagePermissions;