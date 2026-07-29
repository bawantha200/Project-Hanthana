import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, Shield, UserCheck, Clock, ArrowUpRight,
  ShieldCheck, Activity, ToggleRight, ToggleLeft,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import StatCard from '../../components/StatCard';
import RoleBadge from '../../components/RoleBadge';

const API_BASE = 'http://localhost:5000/api';

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
});

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const cardClass =
  'bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200';

const ROLE_COLORS = ['#2563eb', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981'];

// How many audit log rows to show in the dashboard preview card
const ACTIVITY_PREVIEW_LIMIT = 5;

export default function AdminDashboard() {
  const navigate = useNavigate();

  // ===== STATE (copied from UserManagement.jsx data-fetching logic) =====
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);

  // ===== Audit log preview (same source as SystemActivity.jsx) =====
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  // ===== FETCH USERS =====
  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/users`, {
        headers: getAuthHeaders(),
      });
      if (data.success) setUsers(data.data || []);
    } catch (err) {
      console.error('Fetch Users Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  // ===== FETCH EMPLOYEES =====
  const fetchEmployees = useCallback(async () => {
    setEmployeesLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/employees`, {
        headers: getAuthHeaders(),
      });
      if (data.success) setEmployees(data.data || []);
    } catch (err) {
      console.error('Fetch Employees Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setEmployeesLoading(false);
    }
  }, []);

  // ===== FETCH RECENT AUDIT LOGS (preview — same backend as SystemActivity.jsx) =====
  const fetchRecentActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/audit-logs`, {
        headers: getAuthHeaders(),
        params: { page: 1, limit: ACTIVITY_PREVIEW_LIMIT },
      });
      if (data.success) setActivityLogs(data.data || []);
    } catch (err) {
      console.error('Fetch Recent Audit Logs Error:', err);
      toast.error(err.response?.data?.message || 'Failed to load recent activity');
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
    fetchRecentActivity();
  }, [fetchUsers, fetchEmployees, fetchRecentActivity]);

  const loading = usersLoading || employeesLoading;

  // ===== COUNTS =====
  const userCounts = {
    total: users.length,
    admins: users.filter((u) => u.roles?.role_name === 'ADMIN').length,
    managers: users.filter((u) => u.roles?.role_name === 'MANAGER').length,
    employees: users.filter((u) => u.roles?.role_name === 'EMPLOYEE').length,
    customers: users.filter((u) => u.roles?.role_name === 'CUSTOMER').length,
  };

  const employeeCounts = {
    total: employees.length,
    pending: employees.filter((e) => e.status === 'pending').length,
    active: employees.filter((e) => e.status === 'active').length,
  };

  // Role distribution (excluding CUSTOMER, tracked separately)
  const roleDistribution = useMemo(() => {
    const counts = {};
    users
      .filter((u) => u.roles?.role_name && u.roles.role_name !== 'CUSTOMER')
      .forEach((u) => {
        const name = u.roles.role_name;
        counts[name] = (counts[name] || 0) + 1;
      });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  // Most recently registered users
  const recentUsers = useMemo(() => {
    return [...users]
      .filter((u) => u.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 6);
  }, [users]);

  const activeUserCount = users.filter((u) => u.status === 'active').length;
  const inactiveUserCount = users.filter((u) => u.status === 'inactive').length;

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            System overview — users, roles &amp; account activity
          </p>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={loading ? '...' : userCounts.total}
          subtitle="registered accounts"
          icon={Users}
          color="blue"
          delay={0}
        />
        <StatCard
          title="Admins"
          value={loading ? '...' : userCounts.admins}
          subtitle="with full access"
          icon={Shield}
          color="amber"
          delay={0.06}
        />
        <StatCard
          title="Active Accounts"
          value={loading ? '...' : activeUserCount}
          subtitle={`${loading ? '...' : inactiveUserCount} inactive`}
          icon={UserCheck}
          color="emerald"
          delay={0.12}
        />
        <StatCard
          title="Pending Employees"
          value={loading ? '...' : employeeCounts.pending}
          subtitle="need account setup"
          icon={Clock}
          color="cyan"
          delay={0.18}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Role distribution */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Role Distribution</h2>
              <p className="text-xs text-gray-400 mt-0.5">Staff accounts by role</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <ShieldCheck size={18} className="text-purple-600" />
            </div>
          </div>
          {roleDistribution.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No role data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {roleDistribution.map((entry, index) => (
                    <Cell key={entry.name} fill={ROLE_COLORS[index % ROLE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* System activity feed — now sourced from the real audit_logs table,
            same backend endpoint that the SystemActivity.jsx page uses */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">System Activity</h2>
              <p className="text-xs text-gray-400 mt-0.5">Recent audit log events</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/app/system-activity')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight size={14} />
            </motion.button>
          </div>
          {activityLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : activityLogs.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">No recent activity</p>
          ) : (
            <ul className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {activityLogs.map((log) => (
                <li key={log.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-cyan-600 bg-cyan-50">
                    <Activity size={14} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">
                        {log.profiles?.full_name || log.details?.email || 'Unknown user'}
                      </span>{' '}
                      performed <span className="font-medium">{log.action}</span>
                      {log.ip_address ? (
                        <span className="text-gray-400"> from {log.ip_address}</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>

      {/* Recently registered users */}
      <motion.div variants={itemVariants} className={cardClass}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Recently Registered</h2>
            <p className="text-xs text-gray-400 mt-0.5">Newest accounts across all roles</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/app/recently-registered')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            View all <ArrowUpRight size={14} />
          </motion.button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">Loading...</td>
                </tr>
              ) : recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">No users yet</td>
                </tr>
              ) : (
                recentUsers.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{u.full_name}</td>
                    <td className="py-3 px-4 text-gray-600">{u.email}</td>
                    <td className="py-3 px-4"><RoleBadge role={u.roles?.role_name} /></td>
                    <td className="py-3 px-4">
                      {u.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <ToggleRight size={14} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium">
                          <ToggleLeft size={14} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}