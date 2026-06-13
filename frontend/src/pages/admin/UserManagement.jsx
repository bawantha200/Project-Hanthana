import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Plus, Shield, UserPlus, Filter, ToggleLeft, ToggleRight } from 'lucide-react';
import RoleBadge from '../../components/RoleBadge';
import StatusBadge from '../../components/StatusBadge';
import UserCard from '../../components/UserCard';
import { users } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

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

const roleFilters = ['ALL', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'CUSTOMER'];

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userStatuses, setUserStatuses] = useState(
    () => Object.fromEntries(users.map((u) => [u.id, u.status]))
  );
  const [userRoles, setUserRoles] = useState(
    () => Object.fromEntries(users.map((u) => [u.id, u.role]))
  );

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-1">You need admin privileges to access this page.</p>
        </div>
      </div>
    );
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      user.branch.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const toggleUserStatus = (userId) => {
    setUserStatuses((prev) => ({
      ...prev,
      [userId]: prev[userId] === 'active' ? 'inactive' : 'active',
    }));
  };

  const assignRole = (userId, newRole) => {
    setUserRoles((prev) => ({
      ...prev,
      [userId]: newRole,
    }));
  };

  const userCounts = {
    total: users.length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
    managers: users.filter((u) => u.role === 'MANAGER').length,
    employees: users.filter((u) => u.role === 'EMPLOYEE').length,
    customers: users.filter((u) => u.role === 'CUSTOMER').length,
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage accounts, roles, and branch assignments
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          Create User
        </motion.button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total</p>
              <p className="text-lg font-bold text-gray-900">{userCounts.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <Shield size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Admins</p>
              <p className="text-lg font-bold text-gray-900">{userCounts.admins}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Managers</p>
              <p className="text-lg font-bold text-gray-900">{userCounts.managers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
              <Users size={16} className="text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Employees</p>
              <p className="text-lg font-bold text-gray-900">{userCounts.employees}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Users size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Customers</p>
              <p className="text-lg font-bold text-gray-900">{userCounts.customers}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Search and Role Filter */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, or branch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">Role:</span>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
            {roleFilters.map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  roleFilter === role
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {role === 'ALL' ? 'All' : role}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Create User Modal Placeholder */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white rounded-2xl shadow-sm border border-blue-200 p-6 ring-2 ring-blue-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <UserPlus size={18} className="text-blue-600" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">Create New User</h2>
            </div>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Enter full name"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="Enter email address"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
                <option value="CUSTOMER">Customer</option>
              
              </select>
            </div>
            {/* <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                <option value="Mumbai Central">Mumbai Central</option>
                <option value="Pune West">Pune West</option>
                <option value="Delhi North">Delhi North</option>
                <option value="Bangalore East">Bangalore East</option>
                <option value="Hyderabad South">Hyderabad South</option>
                <option value="All Branches">All Branches</option>
              </select>
            </div> */}
          </div>
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Create User
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Users Table */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">All Users</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                {/* <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Branch</th> */}
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const currentStatus = userStatuses[user.id] || user.status;
                const currentRole = userRoles[user.id] || user.role;
                const isActive = currentStatus === 'active';
                return (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <span className="font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <select
                        value={currentRole}
                        onChange={(e) => assignRole(user.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                      >
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                        <option value="EMPLOYEE">EMPLOYEE</option>
                        <option value="CUSTOMER">CUSTOMER</option>
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={currentStatus === 'on_leave' ? 'on_leave' : currentStatus} />
                    </td>
                    {/* <td className="py-3 px-4 text-gray-600 text-xs">{user.branch}</td> */}
                    <td className="py-3 px-4 text-gray-500 text-xs">{user.lastLogin}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
                        title={isActive ? 'Deactivate account' : 'Activate account'}
                      >
                        {isActive ? (
                          <span className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
                            <ToggleRight size={18} />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400 hover:text-gray-600">
                            <ToggleLeft size={18} />
                            Inactive
                          </span>
                        )}
                      </button>
                    </td>
                    <td>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowCreateForm(false)}
                        className="px-2 py-1 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors shadow-sm"
                      >
                        Edit
                      </motion.button>
                    </td>
                    <td>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowCreateForm(false)}
                        className="px-2 py-1 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                      >
                        Delete
                      </motion.button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* User Cards View */}
      <motion.div variants={itemVariants}>
        <h2 className="text-base font-semibold text-gray-900 mb-4">User Cards</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUsers.map((user) => (
            <motion.div
              key={user.id}
              variants={itemVariants}
              whileHover={{ y: -2 }}
            >
              <UserCard user={{ ...user, role: userRoles[user.id] || user.role, status: userStatuses[user.id] || user.status }} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
