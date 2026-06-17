import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Plus, Shield, UserPlus, Filter, ToggleLeft, ToggleRight } from 'lucide-react';
import RoleBadge from '../../components/RoleBadge';
import StatusBadge from '../../components/StatusBadge';
import UserCard from '../../components/UserCard';
// import { users } from '../../data/mockData';
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

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);

  const [users, setUsers] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

  const [newUserForm, setNewUserForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
    password: "",
    confirmPassword: "",
    roleId: "",          // role id store කරන්න
    departmentId: "",
    positionId: "",
    jobType: "",
    hireDate: "",
    status: "active",
  });

  const [userStatuses, setUserStatuses] = useState(
    () => Object.fromEntries(users.map((u) => [u.id, u.status]))
  );

  const [userRoles, setUserRoles] = useState(
    () => Object.fromEntries(users.map((u) => [u.id, u.role]))
  );

  const fetchUsers = async () => {
  try {
    const token = localStorage.getItem("token");

    const response = await fetch(
      "http://localhost:5000/api/users",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    console.log("GET USERS:", data);

    if (data.success) {
      setUsers(data.data);
    }
  } catch (error) {
    console.error("Fetch Users Error:", error);
  }
  };

  // Departments
  const fetchDepartments = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/departments"
      );

      const data = await response.json();

      console.log(data);

      if (data.success) {
        setDepartments(data.data);
      }
    } catch (err) {
      console.error("Departments Error:", err);
    }
  };

  // Positions
  const fetchPositions = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/api/positions"
      );

      const data = await response.json();

      if (data.success) {
        setPositions(data.data);
      }
    } catch (err) {
      console.error("Positions Error:", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchPositions();
    fetchUsers();
  }, []);

  // Admin check
  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-rose-500" />
          </div>

          <h2 className="text-xl font-bold text-gray-900">
            Access Denied
          </h2>

          <p className="text-sm text-gray-500 mt-1">
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }
  



 
  const filteredUsers = users.filter((user) => {
  const matchesSearch =
    user.full_name
      ?.toLowerCase()
      .includes(search.toLowerCase()) ||
    user.email
      ?.toLowerCase()
      .includes(search.toLowerCase());

  const matchesRole =
    roleFilter === "ALL" ||
    user.roles?.role_name?.toUpperCase() === roleFilter;

  return matchesSearch && matchesRole;
  });

const toggleUserStatus = (userId) => {
  setUserStatuses((prev) => ({
    ...prev,
    [userId]:
      prev[userId] === "active"
        ? "inactive"
        : "active",
  }));
};

  const assignRole = (userId, newRole) => {
    setUserRoles((prev) => ({
      ...prev,
      [userId]: newRole,
    }));
  };

  // const handleCreateUser = async () => {
  //   if (!newUserForm.fullName.trim() || !newUserForm.email.trim()) {
  //     alert('Full Name and Email are required.');
  //     return;
  //   }

  //   const token = localStorage.getItem('token');
  //   if (!token) {
  //     alert('Please login again to create a user.');
  //     return;
  //   }

  //   try {
  //     const response = await fetch('http://localhost:5000/api/users/add', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         Authorization: `Bearer ${token}`,
  //       },
  //       body: JSON.stringify({
  //         fullName: newUserForm.fullName,
  //         email: newUserForm.email,
  //         role: newUserForm.role,
  //       }),
  //     });

  //     const data = await response.json();
  //     if (!response.ok || !data.success) {
  //       throw new Error(data.message || 'Failed to create user.');
  //     }

  //     alert('User created successfully.');
  //     setShowCreateForm(false);
  //     setNewUserForm({
  //       fullName: '',
  //       email: '',
  //       role: 'EMPLOYEE',
  //     });
  //   } catch (error) {
  //     console.error('Create user failed:', error);
  //     alert(error.message || 'Unable to create user at this time.');
  //   }
  // };

  const handleCreateUser = async () => {
  console.log("Form Data:", newUserForm);

  

 if (
  !newUserForm.fullName.trim() ||
  !newUserForm.email.trim() ||
  !newUserForm.password.trim() ||
  !newUserForm.roleId ||
  !newUserForm.jobType.trim() ||
  !newUserForm.hireDate
) {
  alert("Please fill all required fields.");
  return;
}

  const token = localStorage.getItem("token");

  if (!token) {
    alert("Please login again.");
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/users",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
       body: JSON.stringify({
  fullName: newUserForm.fullName,
  email: newUserForm.email,
  phone: newUserForm.phoneNumber,
  address: newUserForm.address,
  password: newUserForm.password,
  role: Number(newUserForm.roleId),
  departmentId: newUserForm.departmentId
  ? Number(newUserForm.departmentId)
  : null,

positionId: newUserForm.positionId
  ? Number(newUserForm.positionId)
  : null,
  jobType: newUserForm.jobType,
  hireDate: newUserForm.hireDate,
  status: "active",
}),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message);
    }

    alert("User created successfully.");

  // fetchUsers();
  await fetchUsers();

  setShowCreateForm(false);

  setNewUserForm({
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
    password: "",
    confirmPassword: "",
    roleId: "",
    departmentId: "",
    positionId: "",
    jobType: "",
    hireDate: "",
    status: "active",
  });
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
  };

  const userCounts = {
  total: users.length,
  admins: users.filter(
    (u) => u.roles?.role_name === "ADMIN"
  ).length,
  managers: users.filter(
    (u) => u.roles?.role_name === "MANAGER"
  ).length,
  employees: users.filter(
    (u) => u.roles?.role_name === "EMPLOYEE"
  ).length,
  customers: users.filter(
    (u) => u.roles?.role_name === "CUSTOMER"
  ).length,
  };

  const handleRoleChange = async (userId, roleId) => {
  const token = localStorage.getItem("token");

  await fetch(
    `http://localhost:5000/api/users/${userId}/role`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        roleId,
      }),
    }
  );

  fetchUsers();
};
const handleEdit = (user) => {
  setEditingUser(user);

  setNewUserForm({
    fullName: user.full_name || "",
    email: user.email || "",
    phoneNumber: user.phone_number || "",
    address: user.address || "",
    password: "",
    confirmPassword: "",
    roleId: user.roles?.id || "",
    departmentId:
      user.employees?.[0]?.department_id || "",
    positionId:
      user.employees?.[0]?.position_id || "",
    jobType:
      user.employees?.[0]?.job_type || "",
    hireDate:
      user.employees?.[0]?.hire_date || "",
    status:
      user.employees?.[0]?.status || "active",
  });

  setShowCreateForm(true);
};

const handleUpdateUser = async () => {
  try {
    const token =
      localStorage.getItem("token");

    const response = await fetch(
      `http://localhost:5000/api/users/${editingUser.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: newUserForm.fullName,
          email: newUserForm.email,
          phone: newUserForm.phoneNumber,
          address: newUserForm.address,
          role: Number(
            newUserForm.roleId
          ),
          departmentId:
            newUserForm.departmentId
              ? Number(
                  newUserForm.departmentId
                )
              : null,
          positionId:
            newUserForm.positionId
              ? Number(
                  newUserForm.positionId
                )
              : null,
          jobType:
            newUserForm.jobType,
          hireDate:
            newUserForm.hireDate,
          status:
            newUserForm.status,
        }),
      }
    );

    const data =
      await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    alert("User updated!");

    await fetchUsers();

    setEditingUser(null);
    setShowCreateForm(false);

    setNewUserForm({
      fullName: "",
      email: "",
      phoneNumber: "",
      address: "",
      password: "",
      confirmPassword: "",
      roleId: "",
      departmentId: "",
      positionId: "",
      jobType: "",
      hireDate: "",
      status: "active",
    });
  } catch (error) {
    alert(error.message);
  }
};

const handleDeleteUser = async (id) => {
  if (!window.confirm("Delete this user?")) return;

  const token = localStorage.getItem("token");

  try {
    const response = await fetch(
      `http://localhost:5000/api/users/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message);
    }

    alert("User deleted successfully");

    setUsers((prev) =>
      prev.filter((user) => user.id !== id)
    );
  } catch (error) {
    alert(error.message);
  }
  const toggleUserStatus = (userId) => {
  setUserStatuses((prev) => ({
    ...prev,
    [userId]:
      (prev[userId] || "active") === "active"
        ? "inactive"
        : "active",
  }));
};
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
              <h2>
                {editingUser
                  ? "Edit User"
                  : "Create New User"}
              </h2>
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
                value={newUserForm.fullName}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="Enter email address"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
              <select
                value={newUserForm.roleId}
                onChange={(e) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    roleId: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
              >
                <option value="">Select Role</option>
                <option value="1">ADMIN</option>
                <option value="2">MANAGER</option>
                <option value="3">EMPLOYEE</option>
                <option value="4">CUSTOMER</option>
              </select>
            </div>

            {/* Phone Number & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  placeholder="Enter phone number"
                  value={newUserForm.phoneNumber}
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                <input
                  type="text"
                  name="address"
                  placeholder="Enter address"
                  value={newUserForm.address}
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Department & Position */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Department
              </label>

              <select
                value={newUserForm.departmentId}
                onChange={(e) =>
                  setNewUserForm((prev) => ({
                    ...prev,
                    departmentId: e.target.value,
                    positionId: "", // department change වුනාම position reset කරන්න
                  }))
                }
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              >
                <option value="">Select Department</option>

                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.department_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Position
                  </label>

                <select
                  value={newUserForm.positionId}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      positionId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                >
                  <option value="">Select Position</option>

                      {positions
                    .filter(
                      (position) =>
                        position.department_id ===
                        Number(newUserForm.departmentId)
                    )
                    .map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.position_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Job Type & Hire Date */}    
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Job Type
                </label>

                <select
                  value={newUserForm.jobType}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({
                      ...prev,
                      jobType: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                >
                  <option value="">Select Job Type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                  
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Hire Date</label>
                <input
                  type="date"
                  name="hireDate"
                  value={newUserForm.hireDate}
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, hireDate: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={newUserForm.confirmPassword}
                  onChange={(e) => setNewUserForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                />
              </div>
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
              onClick={
                editingUser
                  ? handleUpdateUser
                  : handleCreateUser
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              {editingUser
              ? "Save Changes"
              : "Create User"}
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
                const currentStatus =
                  userStatuses[user.id] ||
                  user.employees?.status ||
                  "active";
                const currentRole =
                  userRoles[user.id] ||
                  user.roles?.role_name ||
                  "EMPLOYEE";
                const isActive = currentStatus === 'active';
                return (
                  <tr
                    key={user.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold">
                            {user.full_name
                              ?.split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>

                          <span className="font-medium text-gray-900">
                            {user.full_name}
                          </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{user.email}</td>
                    <td className="py-3 px-4">
                      <RoleBadge role={user.roles?.role_name} />
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={currentStatus === 'on_leave' ? 'on_leave' : currentStatus} />
                    </td>
                    {/* <td className="py-3 px-4 text-gray-600 text-xs">{user.branch}</td> */}
                    <td className="py-3 px-4 text-gray-500 text-xs">{user.created_at
                      ? new Date(user.created_at)
                          .toLocaleDateString()
                      : "-"}</td>
                     

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
                        title={isActive ? 'Deactivate account' : 'Activate account'}
                      >
                        {isActive ? (
                        <ToggleRight className="text-green-600" size={24} />
                      ) : (
                        <ToggleLeft className="text-gray-500" size={24} />
                      )}
                      </button>
                    </td>
                    <td>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleEdit(user)}
                        className="px-2 py-1 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors shadow-sm"
                      >
                        Edit
                      </motion.button>
                    </td>
                    <td>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleDeleteUser(user.id)}
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
              <UserCard
                user={{
                  ...user,
                  name: user.full_name,
                  role:
                    userRoles[user.id] ||
                    user.roles?.role_name,
                  status:
                    userStatuses[user.id] ||
                    user.employees?.status,
                }}
              />

              
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
