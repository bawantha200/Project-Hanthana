import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Plus, Shield, UserPlus, Filter, ToggleLeft, ToggleRight,
  Edit, Trash2, X, AlertTriangle, Mail, Phone, MapPin, Briefcase, Calendar,
  User, CreditCard, Heart, Camera, Image, Home, Smartphone, FileText, Circle, Clock, Lock
} from 'lucide-react';
import RoleBadge from '../../components/RoleBadge';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

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
const employeeStatusFilters = ['ALL', 'PENDING', 'ACTIVE'];

export default function UserManagement() {
  const { isAdmin } = useAuth();
  const { user } = useAuth();
  
  

  // ===== STATE =====
  const [users, setUsers] = useState([]);               // from profiles
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const [employees, setEmployees] = useState([]);       // from employees
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  // ===== MODAL STATES =====
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [profileModal, setProfileModal] = useState(null);

  // ===== ACCOUNT CREATION MODAL =====
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // ===== FORM STATE FOR CREATE/EDIT USER =====
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
    password: "",
    confirmPassword: "",
    roleId: "",
    status: "active",
    jobType: "",
    hireDate: "",
    birthday: "",
    gender: "",
    nic: "",
    marriageStatus: "",
    profileImage: null,
  });


  const employeeRecordsRef = useRef(null);

  const hasAccess = ['ADMIN', 'CEO'].includes(
  user?.role?.toUpperCase()
  );

  const canManageUsers = user?.role?.toUpperCase() === 'ADMIN';


  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  // ===== FETCH USERS (profiles) =====
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/users`, {
        headers: getAuthHeaders(),
      });
      if (data.success) {
        setUsers(data.data || []);
        console.log(`[UI] ✅ Users loaded: ${data.data?.length || 0}`);
      }
    } catch (err) {
      console.error("Fetch Users Error:", err);
      toast.error(err.response?.data?.message || "Failed to load users");
    } finally {
      setUsersLoading(false);
    }
  };

  // ===== FETCH EMPLOYEES (all) =====
  const fetchEmployees = async () => {
    setEmployeesLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/employees`, {
        headers: getAuthHeaders(),
      });
      if (data.success) {
        setEmployees(data.data || []);
        console.log(`[UI] ✅ Employees loaded: ${data.data?.length || 0}`);
      }
    } catch (err) {
      console.error("Fetch Employees Error:", err);
      toast.error(err.response?.data?.message || "Failed to load employees");
    } finally {
      setEmployeesLoading(false);
    }
  };

  // ===== FETCH ROLES =====
  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/roles`, {
        headers: getAuthHeaders(),
      });
      if (data.success) {
        const filtered = data.data.filter(role => role.id !== 4);
        setRoles(filtered);
      }
    } catch (err) {
      console.error('Fetch roles error:', err);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
    fetchRoles();
  }, []);

  // ===== CREATE ACCOUNT FROM PENDING EMPLOYEE =====
  const handleCreateAccount = async () => {
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setCreating(true);
    try {
      await axios.post(
        `${API_BASE}/users/from-employee`,
        { employeeId: selectedEmployee.id, password },
        { headers: getAuthHeaders() }
      );
      toast.success(`Account created for ${selectedEmployee.name}`);
      setShowCreateModal(false);
      setSelectedEmployee(null);
      setPassword('');
      setConfirmPassword('');
      await fetchUsers();
      await fetchEmployees();
    } catch (err) {
      console.error("Create account error:", err);
      toast.error(err.response?.data?.message || "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  // ===== TOGGLE USER STATUS (dummy – profiles don't have status) =====
  const toggleUserStatus = async (userId, currentStatus, e) => {
    e?.stopPropagation();
    toast.info("User status toggle is not applicable for profiles. Use employee status instead.");
  };

  // ===== MODAL FUNCTIONS (for profiles) =====
  const openModal = (user = null, e) => {
    e?.stopPropagation();
    if (user) {
      setEditingUser(user);
      setFormData({
        fullName: user.full_name || "",
        email: user.email || "",
        phoneNumber: user.phone_number || "",
        address: user.address || "",
        password: "",
        confirmPassword: "",
        roleId: user.roles?.id || "",
        status: "active",
        jobType: "",
        hireDate: "",
        birthday: "",
        gender: "",
        nic: "",
        marriageStatus: "",
        profileImage: null,
      });
    } else {
      setEditingUser(null);
      setFormData({
        fullName: "",
        email: "",
        phoneNumber: "",
        address: "",
        password: "",
        confirmPassword: "",
        roleId: "",
        status: "active",
        jobType: "",
        hireDate: "",
        birthday: "",
        gender: "",
        nic: "",
        marriageStatus: "",
        profileImage: null,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      fullName: "",
      email: "",
      phoneNumber: "",
      address: "",
      password: "",
      confirmPassword: "",
      roleId: "",
      status: "active",
      jobType: "",
      hireDate: "",
      birthday: "",
      gender: "",
      nic: "",
      marriageStatus: "",
      profileImage: null,
    });
  };

  const openProfileModal = (user) => setProfileModal(user);
  const closeProfileModal = () => setProfileModal(null);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profileImage') {
      setFormData((prev) => ({ ...prev, profileImage: files[0] || null }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // ===== CREATE / UPDATE USER (for profiles) =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      toast.error("Full Name is required");
      return;
    }
    if (!formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!editingUser && !formData.password.trim()) {
      toast.error("Password is required for new users");
      return;
    }
    if (!editingUser && formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!formData.roleId) {
      toast.error("Role is required");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login again");
      return;
    }

    const payload = {
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phoneNumber,
      address: formData.address,
      role: Number(formData.roleId),
      status: formData.status || "active",
      jobType: formData.jobType || null,
      hireDate: formData.hireDate || null,
      birthday: formData.birthday || null,
      gender: formData.gender || null,
      nic: formData.nic || null,
      marriageStatus: formData.marriageStatus || null,
      profileImage: formData.profileImage || null,
    };

    if (!editingUser) payload.password = formData.password;

    try {
      if (editingUser) {
        await axios.put(`${API_BASE}/users/${editingUser.id}`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("User updated successfully");
      } else {
        await axios.post(`${API_BASE}/users`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("User created successfully");
      }
      closeModal();
      await fetchUsers();
    } catch (err) {
      console.error("Save user error:", err);
      toast.error(err.response?.data?.message || "Failed to save user");
    }
  };

  // ===== DELETE USER =====
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await axios.delete(`${API_BASE}/users/${deleteConfirm.id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("User deleted successfully");
      setDeleteConfirm(null);
      await fetchUsers();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error(err.response?.data?.message || "Failed to delete user");
    }
  };

  // ===== FILTERS =====
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole =
      roleFilter === "ALL" ||
      user.roles?.role_name?.toUpperCase() === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.email?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
      emp.position?.toLowerCase().includes(employeeSearch.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "PENDING" && emp.status === "pending") ||
      (statusFilter === "ACTIVE" && emp.status === "active");
    return matchesSearch && matchesStatus;
  });

  // ===== COUNTS =====
  const userCounts = {
    total: users.length,
    admins: users.filter((u) => u.roles?.role_name === "ADMIN").length,
    managers: users.filter((u) => u.roles?.role_name === "MANAGER").length,
    employees: users.filter((u) => u.roles?.role_name === "EMPLOYEE").length,
    customers: users.filter((u) => u.roles?.role_name === "CUSTOMER").length,
  };

  const employeeCounts = {
    total: employees.length,
    pending: employees.filter((e) => e.status === "pending").length,
    active: employees.filter((e) => e.status === "active").length,
  };

  const showEmployeeFields = formData.roleId && formData.roleId !== '1';

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Access Denied</h2>
          <p className="text-sm text-gray-500 mt-1">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* PAGE HEADER */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage user accounts and employee records
          </p>
        </div>
        {user?.role?.toUpperCase() === 'ADMIN' && (
  <motion.button
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.97 }}
    onClick={() => openModal()}
    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
  >
    <UserPlus size={16} />
    Create User
  </motion.button>
)}
      </motion.div>

      {/* ===== SUMMARY CARDS ===== */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Users size={16} className="text-blue-600" /></div>
            <div><p className="text-xs text-gray-400 font-medium">Total Users</p><p className="text-lg font-bold text-gray-900">{userCounts.total}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center"><Shield size={16} className="text-purple-600" /></div>
            <div><p className="text-xs text-gray-400 font-medium">Admins</p><p className="text-lg font-bold text-gray-900">{userCounts.admins}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center"><Users size={16} className="text-blue-600" /></div>
            <div><p className="text-xs text-gray-400 font-medium">Managers</p><p className="text-lg font-bold text-gray-900">{userCounts.managers}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center"><Users size={16} className="text-cyan-600" /></div>
            <div><p className="text-xs text-gray-400 font-medium">Employees</p><p className="text-lg font-bold text-gray-900">{userCounts.employees}</p></div>
          </div>
        </div>
        <div
  onClick={() => {
    setStatusFilter('PENDING');

    employeeRecordsRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }}
  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
>
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 rounded-xl bg-yellow-50 flex items-center justify-center">
      <Clock size={16} className="text-yellow-600" />
    </div>

    <div>
      <p className="text-xs text-gray-400 font-medium">Pending</p>
      <p className="text-lg font-bold text-yellow-600">
        {employeeCounts.pending}
      </p>
    </div>
  </div>
</div>
      </motion.div>

      {/* ============================================================ */}
      {/* ===== TABLE 1: ALL USERS (profiles) ===== */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Registered Users</h2>
          <span className="text-xs text-gray-400">{filteredUsers.length} users</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
          <div className="overflow-x-auto">
            {usersLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No users found</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    {canManageUsers && (
                        <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => openProfileModal(user)}
                      className="border-b border-gray-50 last:border-0 hover:bg-blue-50/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
                            {user.full_name?.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <span className="font-medium text-gray-900">{user.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{user.email}</td>
                      <td className="py-3 px-4"><RoleBadge role={user.roles?.role_name} /></td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManageUsers && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openModal(user, e);
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <Edit size={16} />
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirm(user);
                                }}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/* ===== TABLE 2: EMPLOYEES (with filters) ===== */}
      
      <motion.div
          ref={employeeRecordsRef}
          variants={itemVariants}
          className="space-y-4 mt-8"
        >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Employee Records</h2>
          <span className="text-xs text-gray-400">{filteredEmployees.length} employees</span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">Status:</span>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1">
            {employeeStatusFilters.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  statusFilter === status
                    ? status === 'PENDING'
                      ? 'bg-yellow-500 text-white shadow-sm'
                      : status === 'ACTIVE'
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status === 'ALL' ? 'All' : status}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">
          <div className="overflow-x-auto">
            {employeesLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No employees found</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    {canManageUsers && (
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((emp) => {
                    const isPending = emp.status === 'pending';
                    return (
                      <tr
                        key={emp.id}
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${
                          isPending ? 'bg-yellow-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-4 font-medium text-gray-900">{emp.name}</td>
                        <td className="py-3 px-4 text-gray-600">{emp.email}</td>
                        <td className="py-3 px-4 text-gray-600">{emp.position}</td>
                        <td className="py-3 px-4 text-gray-600">{emp.phone}</td>
                        <td className="py-3 px-4">
                          <StatusBadge status={emp.status} />
                        </td>
                        {canManageUsers && (
                        <td className="py-3 px-4 text-right">
                          {isPending ? (
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setShowCreateModal(true);
                              }}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
                            >
                              Create Account
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Active</span>
                          )}
                        </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </motion.div>

      {/* ===== ACCOUNT CREATION MODAL (Register style) ===== */}
      <AnimatePresence>
        {showCreateModal && selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Create Account</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Employee Info (read-only) */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User size={16} className="text-gray-400" />
                    <span className="font-medium">{selectedEmployee.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-gray-600">{selectedEmployee.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={16} className="text-gray-400" />
                    <span className="text-gray-600">{selectedEmployee.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase size={16} className="text-gray-400" />
                    <span className="text-gray-600">{selectedEmployee.position}</span>
                  </div>
                </div>

                {/* Password fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Confirm password"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAccount}
                    disabled={creating}
                    className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 ${
                      creating ? 'cursor-not-allowed' : ''
                    }`}
                  >
                    {creating ? 'Creating...' : 'Create Account'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== USER PROFILE MODAL ===== */}
      {profileModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && closeProfileModal()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-lg font-bold shadow-md">
                  {profileModal.full_name?.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{profileModal.full_name}</h2>
                  <p className="text-xs text-gray-500">{profileModal.email}</p>
                </div>
              </div>
              <button onClick={closeProfileModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Role</p>
                  <RoleBadge role={profileModal.roles?.role_name} />
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-medium text-gray-400 uppercase">Joined</p>
                  <p className="text-sm text-gray-700">{profileModal.created_at ? new Date(profileModal.created_at).toLocaleDateString() : '-'}</p>
                </div>
              </div>
              <div className="space-y-2">
                {profileModal.phone_number && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <Phone size={16} className="text-gray-400" />
                    <div><p className="text-[10px] font-medium text-gray-400 uppercase">Phone</p><p className="text-sm text-gray-700">{profileModal.phone_number}</p></div>
                  </div>
                )}
                {profileModal.address && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <MapPin size={16} className="text-gray-400" />
                    <div><p className="text-[10px] font-medium text-gray-400 uppercase">Address</p><p className="text-sm text-gray-700">{profileModal.address}</p></div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
              <button onClick={closeProfileModal} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Close</button>
              <button onClick={(e) => { closeProfileModal(); openModal(profileModal, e); }} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Edit User</button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ===== CREATE/EDIT USER MODAL ===== */}
      {showModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><UserPlus size={18} className="text-blue-600" /></div>
                <h2 className="text-lg font-semibold text-gray-900">{editingUser ? 'Edit User' : 'Create New User'}</h2>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Form Fields – same as before */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                  <input type="tel" name="phoneNumber" placeholder="Enter phone number" value={formData.phoneNumber} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                  <input type="text" name="address" placeholder="Enter address" value={formData.address} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
                  <select
                    name="roleId"
                    value={formData.roleId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        roleId: val,
                        ...(val === '1' ? {
                          jobType: '',
                          hireDate: '',
                          birthday: '',
                          gender: '',
                          nic: '',
                          marriageStatus: ''
                        } : {})
                      }));
                    }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                  >
                    <option value="">Select Role</option>
                    {rolesLoading ? <option disabled>Loading roles...</option> : roles.filter((role) => !['CUSTOMER', 'MANAGER'].includes(role.role_name)).map((role) => <option key={role.id} value={role.id}>{role.role_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Job Type</label>
                  <select name="jobType" value={formData.jobType} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white" disabled={!showEmployeeFields}>
                    <option value="">Select Job Type</option>
                    <option value="Full-time">Full-time</option>
                    <option value="Part-time">Part-time</option>
                    <option value="Contract">Contract</option>
                  </select>
                </div>
              </div>
              {showEmployeeFields && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Hire Date</label>
                      <input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Birthday</label>
                      <input type="date" name="birthday" value={formData.birthday} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                      <select name="gender" value={formData.gender} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">NIC</label>
                      <input type="text" name="nic" value={formData.nic} onChange={handleChange} placeholder="Enter NIC number" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Marriage Status</label>
                      <select name="marriageStatus" value={formData.marriageStatus} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                        <option value="">Select Status</option>
                        <option value="Married">Married</option>
                        <option value="Unmarried">Unmarried</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Profile Image</label>
                    <div className="flex items-center gap-3">
                      <input type="file" name="profileImage" accept="image/*" onChange={handleChange} className="w-full text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                      {formData.profileImage && typeof formData.profileImage === 'string' && (
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500 flex-shrink-0">
                          <img src={formData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{editingUser ? 'New Password (optional)' : 'Password *'}</label>
                  <input type="password" name="password" placeholder={editingUser ? 'Leave blank to keep current' : 'Enter password'} value={formData.password} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{editingUser ? 'Confirm Password' : 'Confirm Password *'}</label>
                  <input type="password" name="confirmPassword" placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">{editingUser ? 'Save Changes' : 'Create User'}</motion.button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* ===== DELETE CONFIRMATION MODAL ===== */}
      {deleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><AlertTriangle size={20} /></div>
              <h2 className="text-lg font-semibold text-gray-900">Delete User</h2>
              <button onClick={() => setDeleteConfirm(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to delete <strong>{deleteConfirm.full_name}</strong>? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-white bg-rose-600 rounded-lg hover:bg-rose-700 transition-colors shadow-sm">Delete</motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}