// HRMDashboard.jsx - Complete Professional HRM Dashboard
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Clock, DollarSign, Search, TrendingUp, Award, Loader,
  Plus, X, Calendar, User, Edit, Trash2, CheckCircle, AlertCircle,
  FileText, Smartphone, Mail, Building, Home, Heart, CreditCard,
  Briefcase, Save, RefreshCw, Filter, ChevronDown, BarChart,
  PieChart, Activity, UserCheck, UserX, UserPlusIcon,
  CalendarDays, Coins, Wallet, Receipt, Settings, Bell,
  Shield, Crown, Headphones, Truck, Bike, Package
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency } from '../../utils/helpers';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const EMPLOYEES_API = `${API_BASE_URL}/employees`;
const ATTENDANCE_API = `${API_BASE_URL}/attendance`;
const SALARIES_API = `${API_BASE_URL}/salaries`;

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

// REMOVED: tabs array - only keeping Overview
const tabs = [
  { key: 'overview', label: 'Overview', icon: BarChart },
];

const statsCards = [
  { key: 'totalStaff', label: 'Total Staff', icon: Users, color: 'blue' },
  { key: 'presentToday', label: 'Present Today', icon: UserCheck, color: 'emerald' },
  { key: 'absentToday', label: 'Absent Today', icon: UserX, color: 'red' },
  { key: 'monthlyPayout', label: 'Monthly Payout', icon: Wallet, color: 'purple' },
];

export default function HRMDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    employeeName: '',
    date: '',
    checkIn: '',
    checkOut: '',
    status: 'present'
  });

  const [salaryForm, setSalaryForm] = useState({
    employeeId: '',
    employeeName: '',
    baseSalary: '',
    otHours: '',
    bonus: '',
    finalSalary: ''
  });

  const [employeeForm, setEmployeeForm] = useState({
    fullName: '',
    birthday: '',
    email: '',
    gender: '',
    nic: '',
    phoneNo: '',
    role: '',
    address: '',
    marriageStatus: '',
    hiredDate: '',
    jobType: '',
    profileImage: null
  });

  const filterTabs = [
    { key: 'All', label: 'All Positions', icon: Users },
    { key: 'HR_MANAGER', label: 'HR Managers', icon: Shield },
    { key: 'SALES_MANAGER', label: 'Sales Managers', icon: BarChart },
    { key: 'INVENTORY_MANAGER', label: 'Inventory Managers', icon: Package },
    { key: 'ACCOUNTANT', label: 'Accountants', icon: Receipt },
    { key: 'CASHIER', label: 'Cashiers', icon: Coins },
    { key: 'DELIVERY_PERSON', label: 'Delivery Staff', icon: Truck },
    { key: 'RIDER', label: 'Riders', icon: Bike },
    { key: 'Customer Services', label: 'Customer Support', icon: Headphones },
    { key: 'CEO', label: 'CEO', icon: Crown },
  ];

  // ========== FETCH FUNCTIONS ==========

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [employeesRes, attendanceRes, salariesRes] = await Promise.all([
        axios.get(EMPLOYEES_API, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(ATTENDANCE_API, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(SALARIES_API, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (employeesRes.data.success) setEmployees(employeesRes.data.data);
      if (attendanceRes.data.success) setAttendanceData(attendanceRes.data.data);
      if (salariesRes.data.success) setSalaryData(salariesRes.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    setRolesLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/roles', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const filteredRoles = data.data.filter(role => role.id !== 1 && role.id !== 4);
        setRoles(filteredRoles);
      }
    } catch (error) {
      console.error('Fetch roles error:', error);
    } finally {
      setRolesLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    fetchRoles();
  }, []);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // ========== STATUS CALCULATION ==========

  const calculateAttendanceStatus = (checkIn, checkOut) => {
    if (!checkIn && !checkOut) return 'absent';
    if (checkIn && !checkOut) return 'present';

    const inTime = checkIn || '00:00';
    const outTime = checkOut || '00:00';

    if (inTime === '08:00' && outTime === '17:00') return 'present';
    if (inTime === '08:00' && outTime < '17:00') return 'half_day';
    if (inTime > '08:00' && outTime === '17:00') return 'half_day';
    if (inTime > '08:00' && outTime < '17:00') return 'half_day';
    if (inTime === '08:00' && outTime > '17:00') return 'present';
    if (inTime < '08:00' && outTime === '17:00') return 'present';
    if (inTime < '08:00' && outTime < '17:00') return 'half_day';
    if (inTime < '08:00' && outTime > '17:00') return 'present';

    return 'present';
  };

  const calculateFinalSalary = (base, otHours, bonus) => {
    const baseNum = parseFloat(base) || 0;
    const otNum = parseFloat(otHours) || 0;
    const bonusNum = parseFloat(bonus) || 0;
    const otRate = 500;
    return baseNum + (otNum * otRate) + bonusNum;
  };

  // ========== CRUD OPERATIONS ==========

  const handleAttendanceSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const status = calculateAttendanceStatus(attendanceForm.checkIn, attendanceForm.checkOut);
      const data = {
        employeeId: parseInt(attendanceForm.employeeId),
        employeeName: attendanceForm.employeeName,
        date: attendanceForm.date,
        checkIn: attendanceForm.checkIn || null,
        checkOut: attendanceForm.checkOut || null,
        status: status
      };

      const token = localStorage.getItem('token');
      const response = await axios.post(ATTENDANCE_API, data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        await fetchAllData();
        setShowAttendanceForm(false);
        resetAttendanceForm();
        showSuccessNotification(`Attendance added! Status: ${status}`);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.message || 'Failed to add attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSalarySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const data = {
        employeeId: parseInt(salaryForm.employeeId),
        employeeName: salaryForm.employeeName,
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        baseSalary: parseFloat(salaryForm.baseSalary) || 0,
        otHours: parseFloat(salaryForm.otHours) || 0,
        bonus: parseFloat(salaryForm.bonus) || 0
      };

      const token = localStorage.getItem('token');
      const response = await axios.post(SALARIES_API, data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        await fetchAllData();
        setShowSalaryForm(false);
        resetSalaryForm();
        showSuccessNotification('Salary added successfully!');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.message || 'Failed to add salary.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const requiredFields = ['fullName', 'email', 'phoneNo', 'role', 'address', 'hiredDate'];
    for (let field of requiredFields) {
      if (!employeeForm[field]) {
        alert(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field`);
        setSubmitting(false);
        return;
      }
    }

    try {
      const employeeData = {
        name: employeeForm.fullName,
        position: employeeForm.role,
        phone: employeeForm.phoneNo,
        email: employeeForm.email,
        hireDate: employeeForm.hiredDate,
        birthday: employeeForm.birthday || null,
        gender: employeeForm.gender || null,
        nic: employeeForm.nic || null,
        address: employeeForm.address,
        marriageStatus: employeeForm.marriageStatus || null,
        jobType: employeeForm.jobType || null,
        profileImage: employeeForm.profileImage || null
      };

      const token = localStorage.getItem('token');
      let response;

      if (editingEmployee) {
        response = await axios.put(`${EMPLOYEES_API}/${editingEmployee.id}`, employeeData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          showSuccessNotification('Employee updated successfully!');
        }
      } else {
        response = await axios.post(EMPLOYEES_API, employeeData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          showSuccessNotification('Employee added successfully!');
        }
      }

      await fetchAllData();
      setShowEmployeeForm(false);
      resetEmployeeForm();
    } catch (err) {
      console.error('Error:', err);
      if (err.response?.status === 409) {
        setError('An employee with this email already exists.');
      } else {
        setError(err.response?.data?.message || 'Failed to save employee.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      await axios.delete(`${EMPLOYEES_API}/${employeeToDelete.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchAllData();
      setShowDeleteConfirm(false);
      setEmployeeToDelete(null);
      setShowDetailModal(false);
      setSelectedEmployee(null);
      showSuccessNotification('Employee deleted successfully!');
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError('Failed to delete employee. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAttendanceForm = () => {
    setAttendanceForm({
      employeeId: '',
      employeeName: '',
      date: '',
      checkIn: '',
      checkOut: '',
      status: 'present'
    });
  };

  const resetSalaryForm = () => {
    setSalaryForm({
      employeeId: '',
      employeeName: '',
      baseSalary: '',
      otHours: '',
      bonus: '',
      finalSalary: ''
    });
  };

  const resetEmployeeForm = () => {
    setEmployeeForm({
      fullName: '',
      birthday: '',
      email: '',
      gender: '',
      nic: '',
      phoneNo: '',
      role: '',
      address: '',
      marriageStatus: '',
      hiredDate: new Date().toISOString().split('T')[0],
      jobType: '',
      profileImage: null
    });
    setEditingEmployee(null);
    setError(null);
  };

  const showSuccessNotification = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  };

  const openAttendanceForm = (employee) => {
    setAttendanceForm({
      employeeId: employee.id,
      employeeName: employee.name,
      date: new Date().toISOString().split('T')[0],
      checkIn: '',
      checkOut: '',
      status: 'present'
    });
    setShowAttendanceForm(true);
  };

  const openSalaryForm = (employee) => {
    setSalaryForm({
      employeeId: employee.id,
      employeeName: employee.name,
      baseSalary: '',
      otHours: '',
      bonus: '',
      finalSalary: ''
    });
    setShowSalaryForm(true);
  };

  const openEmployeeForm = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        fullName: employee.name || '',
        birthday: employee.birthday || '',
        email: employee.email || '',
        gender: employee.gender || '',
        nic: employee.nic || '',
        phoneNo: employee.phone || '',
        role: employee.position || '',
        address: employee.address || '',
        marriageStatus: employee.marriage_status || '',
        hiredDate: employee.hire_date || new Date().toISOString().split('T')[0],
        jobType: employee.job_type || '',
        profileImage: employee.profile_image || null
      });
    } else {
      resetEmployeeForm();
    }
    setShowEmployeeForm(true);
  };

  const openDetailModal = (employee) => {
    setSelectedEmployee(employee);
    setShowDetailModal(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEmployeeForm({ ...employeeForm, profileImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // ========== SUMMARY CALCULATIONS ==========

  const totalStaff = employees.length;
  const presentToday = attendanceData.filter(a => a.status === 'present').length;
  const absentToday = attendanceData.filter(a => a.status === 'absent').length;
  const monthlyPayout = salaryData.reduce((sum, s) => sum + (s.total_salary || s.total || 0), 0);
  const totalOTHours = salaryData.reduce((sum, s) => sum + (s.ot_hours || s.otHours || 0), 0);

  const statsValues = {
    totalStaff,
    presentToday,
    absentToday,
    monthlyPayout
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesPosition = activeFilter === 'All' || employee.position === activeFilter;
    const matchesSearch =
      employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  const filteredAttendance = attendanceData.filter((rec) =>
    (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSalary = salaryData.filter((rec) =>
    (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (attendanceForm.checkIn || attendanceForm.checkOut) {
      const status = calculateAttendanceStatus(attendanceForm.checkIn, attendanceForm.checkOut);
      setAttendanceForm(prev => ({ ...prev, status }));
    }
  }, [attendanceForm.checkIn, attendanceForm.checkOut]);

  useEffect(() => {
    if (salaryForm.baseSalary || salaryForm.otHours || salaryForm.bonus) {
      const final = calculateFinalSalary(
        salaryForm.baseSalary,
        salaryForm.otHours,
        salaryForm.bonus
      );
      setSalaryForm(prev => ({ ...prev, finalSalary: final.toFixed(2) }));
    }
  }, [salaryForm.baseSalary, salaryForm.otHours, salaryForm.bonus]);

  // ========== LOADING ==========

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader size={48} className="text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading HRM dashboard...</p>
        </div>
      </div>
    );
  }

  // ========== RENDER ==========

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 right-4 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
          >
            <CheckCircle size={20} className="text-emerald-500" />
            <span className="text-sm font-medium">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Notification */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HRM Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Comprehensive human resource management — Employees, attendance, and salaries
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAllData()}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            {/* REMOVED: Add Employee button */}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsCards.map((card) => {
          const Icon = card.icon;
          const colorMap = {
            blue: 'bg-blue-50 text-blue-600',
            emerald: 'bg-emerald-50 text-emerald-600',
            red: 'bg-red-50 text-red-600',
            purple: 'bg-purple-50 text-purple-600',
          };
          const value = statsValues[card.key];
          const formattedValue = card.key === 'monthlyPayout' ? formatCurrency(value) : value;

          return (
            <motion.div
              key={card.key}
              variants={itemVariants}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${colorMap[card.color]} flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{formattedValue}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Tabs - Only Overview remains */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-48 bg-white"
          />
        </div>
      </motion.div>

      {/* ============================================ */}
      {/* OVERVIEW TAB */}
      {/* ============================================ */}
      {activeTab === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Total Employees</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalStaff}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Users size={24} className="text-blue-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{presentToday} Present</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span>{absentToday} Absent</span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Monthly Payout</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(monthlyPayout)}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Wallet size={24} className="text-emerald-600" />
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Total OT Hours: <span className="font-semibold text-gray-700">{totalOTHours}h</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Attendance Rate</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {totalStaff > 0 ? Math.round((presentToday / totalStaff) * 100) : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <Activity size={24} className="text-purple-600" />
                </div>
              </div>
              <div className="mt-3 w-full bg-purple-200 rounded-full h-1.5">
                <div
                  className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${totalStaff > 0 ? (presentToday / totalStaff) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" />
                  Recent Attendance
                </h3>
                <span className="text-xs text-gray-400">{attendanceData.length} records</span>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {attendanceData.slice(0, 5).map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{record.employee_name || record.name}</p>
                      <p className="text-xs text-gray-400">{record.date}</p>
                    </div>
                    <StatusBadge status={record.status} />
                  </div>
                ))}
                {attendanceData.length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">No attendance records</p>
                )}
              </div>
            </div>

            {/* REMOVED: Top Earners card */}
          </div>
        </motion.div>
      )}

      {/* ============================================ */}
      {/* ATTENDANCE MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showAttendanceForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
              onClick={() => {
                if (!submitting) {
                  setShowAttendanceForm(false);
                  resetAttendanceForm();
                }
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-10 lg:inset-20 xl:inset-28 bg-white rounded-3xl shadow-2xl z-50 overflow-y-auto"
            >
              <div className="relative p-6 md:p-8">
                <button
                  onClick={() => {
                    if (!submitting) {
                      setShowAttendanceForm(false);
                      resetAttendanceForm();
                    }
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                  disabled={submitting}
                >
                  <X size={24} className="text-gray-400" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Clock size={20} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Update Attendance</h2>
                </div>

                <form onSubmit={handleAttendanceSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <User size={14} className="inline mr-1" /> Employee *
                      </label>
                      <select
                        value={attendanceForm.employeeId}
                        onChange={(e) => {
                          const emp = employees.find(emp => emp.id === parseInt(e.target.value));
                          setAttendanceForm({
                            ...attendanceForm,
                            employeeId: e.target.value,
                            employeeName: emp ? emp.name : ''
                          });
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        required
                        disabled={submitting}
                      >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Calendar size={14} className="inline mr-1" /> Date *
                      </label>
                      <input
                        type="date"
                        value={attendanceForm.date}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, date: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Clock size={14} className="inline mr-1" /> Check In
                      </label>
                      <input
                        type="time"
                        value={attendanceForm.checkIn}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, checkIn: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Clock size={14} className="inline mr-1" /> Check Out
                      </label>
                      <input
                        type="time"
                        value={attendanceForm.checkOut}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, checkOut: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        disabled={submitting}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Status (Auto-generated)
                      </label>
                      <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                        attendanceForm.status === 'present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        attendanceForm.status === 'half_day' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        attendanceForm.status === 'absent' ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-gray-50 text-gray-700 border border-gray-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={attendanceForm.status} />
                          <span className="text-xs text-gray-500 ml-2">
                            {attendanceForm.status === 'present' && '✓ Full day present'}
                            {attendanceForm.status === 'half_day' && '⚠️ Half day'}
                            {attendanceForm.status === 'absent' && '❌ No check-in/out recorded'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (!submitting) {
                          setShowAttendanceForm(false);
                          resetAttendanceForm();
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Attendance
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* SALARY MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showSalaryForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
              onClick={() => {
                if (!submitting) {
                  setShowSalaryForm(false);
                  resetSalaryForm();
                }
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-10 lg:inset-20 xl:inset-28 bg-white rounded-3xl shadow-2xl z-50 overflow-y-auto"
            >
              <div className="relative p-6 md:p-8">
                <button
                  onClick={() => {
                    if (!submitting) {
                      setShowSalaryForm(false);
                      resetSalaryForm();
                    }
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                  disabled={submitting}
                >
                  <X size={24} className="text-gray-400" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <DollarSign size={20} className="text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Add Salary & OT</h2>
                </div>

                <form onSubmit={handleSalarySubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <User size={14} className="inline mr-1" /> Employee *
                      </label>
                      <select
                        value={salaryForm.employeeId}
                        onChange={(e) => {
                          const emp = employees.find(emp => emp.id === parseInt(e.target.value));
                          setSalaryForm({
                            ...salaryForm,
                            employeeId: e.target.value,
                            employeeName: emp ? emp.name : ''
                          });
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all bg-white"
                        required
                        disabled={submitting}
                      >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <DollarSign size={14} className="inline mr-1" /> Base Salary (LKR) *
                      </label>
                      <input
                        type="number"
                        value={salaryForm.baseSalary}
                        onChange={(e) => setSalaryForm({ ...salaryForm, baseSalary: e.target.value })}
                        placeholder="Enter base salary"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Clock size={14} className="inline mr-1" /> OT Hours
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={salaryForm.otHours}
                        onChange={(e) => setSalaryForm({ ...salaryForm, otHours: e.target.value })}
                        placeholder="Enter OT hours"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                        disabled={submitting}
                      />
                      <p className="text-xs text-gray-400 mt-1">OT Rate: 500 LKR/hr</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Award size={14} className="inline mr-1" /> Bonus (LKR)
                      </label>
                      <input
                        type="number"
                        value={salaryForm.bonus}
                        onChange={(e) => setSalaryForm({ ...salaryForm, bonus: e.target.value })}
                        placeholder="Enter bonus amount"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
                        disabled={submitting}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <TrendingUp size={14} className="inline mr-1" /> Final Salary (Auto-calculated)
                      </label>
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border-2 border-emerald-200">
                        <p className="text-2xl font-bold text-emerald-700">
                          {salaryForm.finalSalary ? formatCurrency(parseFloat(salaryForm.finalSalary)) : '0.00 LKR'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Base Salary + (OT Hours × 500) + Bonus
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (!submitting) {
                          setShowSalaryForm(false);
                          resetSalaryForm();
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Save Salary
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* EMPLOYEE FORM MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showEmployeeForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
              onClick={() => {
                if (!submitting) {
                  setShowEmployeeForm(false);
                  resetEmployeeForm();
                }
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-10 lg:inset-20 xl:inset-28 bg-white rounded-3xl shadow-2xl z-50 overflow-y-auto"
            >
              <div className="relative p-6 md:p-8">
                <button
                  onClick={() => {
                    if (!submitting) {
                      setShowEmployeeForm(false);
                      resetEmployeeForm();
                    }
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                  disabled={submitting}
                >
                  <X size={24} className="text-gray-400" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <UserPlusIcon size={20} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingEmployee ? 'Edit Employee' : 'Add New Employee'}
                  </h2>
                </div>

                <form onSubmit={handleEmployeeSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <User size={14} className="inline mr-1" /> Full Name *
                      </label>
                      <input
                        type="text"
                        value={employeeForm.fullName}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, fullName: e.target.value })}
                        placeholder="Enter full name"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Calendar size={14} className="inline mr-1" /> Birthday
                      </label>
                      <input
                        type="date"
                        value={employeeForm.birthday}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, birthday: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Mail size={14} className="inline mr-1" /> Email *
                      </label>
                      <input
                        type="email"
                        value={employeeForm.email}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                        placeholder="Enter email"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Users size={14} className="inline mr-1" /> Gender
                      </label>
                      <select
                        value={employeeForm.gender}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, gender: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        disabled={submitting}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <CreditCard size={14} className="inline mr-1" /> NIC
                      </label>
                      <input
                        type="text"
                        value={employeeForm.nic}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, nic: e.target.value })}
                        placeholder="Enter NIC number"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Smartphone size={14} className="inline mr-1" /> Phone No *
                      </label>
                      <input
                        type="tel"
                        value={employeeForm.phoneNo}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, phoneNo: e.target.value })}
                        placeholder="Enter phone number"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Briefcase size={14} className="inline mr-1" /> Role *
                      </label>
                      <select
                        value={employeeForm.role}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        required
                        disabled={submitting}
                      >
                        <option value="">Select Role</option>
                        {rolesLoading ? (
                          <option disabled>Loading roles...</option>
                        ) : (
                          roles.map((role) => (
                            <option key={role.id} value={role.role_name}>
                              {role.role_name.replace(/_/g, ' ')}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Home size={14} className="inline mr-1" /> Address *
                      </label>
                      <input
                        type="text"
                        value={employeeForm.address}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                        placeholder="Enter address"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Heart size={14} className="inline mr-1" /> Marriage Status
                      </label>
                      <select
                        value={employeeForm.marriageStatus}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, marriageStatus: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        disabled={submitting}
                      >
                        <option value="">Select Status</option>
                        <option value="Married">Married</option>
                        <option value="Unmarried">Unmarried</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <CalendarDays size={14} className="inline mr-1" /> Hired Date *
                      </label>
                      <input
                        type="date"
                        value={employeeForm.hiredDate}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, hiredDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        required
                        disabled={submitting}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <FileText size={14} className="inline mr-1" /> Job Type
                      </label>
                      <select
                        value={employeeForm.jobType}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, jobType: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        disabled={submitting}
                      >
                        <option value="">Select Job Type</option>
                        <option value="Full Time">Full Time</option>
                        <option value="Part Time">Part Time</option>
                        <option value="Contract">Contract</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <FileText size={14} className="inline mr-1" /> Profile Image
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="profileImage"
                          disabled={submitting}
                        />
                        <label
                          htmlFor="profileImage"
                          className={`flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <FileText size={16} className="text-gray-400" />
                          Upload Image
                        </label>
                        {employeeForm.profileImage && (
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500">
                            <img
                              src={employeeForm.profileImage}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (!submitting) {
                          setShowEmployeeForm(false);
                          resetEmployeeForm();
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          {editingEmployee ? 'Updating...' : 'Adding...'}
                        </>
                      ) : (
                        editingEmployee ? 'Update Employee' : 'Add Employee'
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* EMPLOYEE DETAIL MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showDetailModal && selectedEmployee && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-50"
              onClick={() => setShowDetailModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-4 md:inset-10 lg:inset-20 xl:inset-28 bg-white rounded-3xl shadow-2xl z-50 overflow-y-auto"
            >
              <div className="relative p-6 md:p-8">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                >
                  <X size={24} className="text-gray-400" />
                </button>

                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 mb-8 text-white">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-lg flex-shrink-0">
                      {selectedEmployee.profile_image ? (
                        <img
                          src={selectedEmployee.profile_image}
                          alt={selectedEmployee.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-white/20 flex items-center justify-center text-4xl font-bold text-white">
                          {selectedEmployee.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{selectedEmployee.name}</h2>
                      <p className="text-blue-100 mt-1">{selectedEmployee.position}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <StatusBadge status={selectedEmployee.status} />
                      </div>
                    </div>
                    <div className="ml-auto flex gap-3">
                      <button
                        onClick={() => {
                          setShowDetailModal(false);
                          openEmployeeForm(selectedEmployee);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors text-sm backdrop-blur-sm"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setEmployeeToDelete(selectedEmployee);
                          setShowDeleteConfirm(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/80 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
                        Work Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium">Position</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{selectedEmployee.position}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium">Job Type</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">
                            {selectedEmployee.job_type || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium">Hired Date</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{selectedEmployee.hire_date}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium">Email</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1 break-all">{selectedEmployee.email}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium">Phone</p>
                          <p className="text-sm font-semibold text-gray-900 mt-1">{selectedEmployee.phone}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs text-gray-400 font-medium">Status</p>
                          <div className="mt-1">
                            <StatusBadge status={selectedEmployee.status} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm sticky top-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <div className="w-1 h-6 bg-purple-500 rounded-full"></div>
                        Personal Information
                      </h3>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 text-sm p-3 bg-purple-50 rounded-xl">
                          <Calendar size={16} className="text-purple-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-400">Birthday</p>
                            <p className="font-medium text-gray-900">{selectedEmployee.birthday || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm p-3 bg-blue-50 rounded-xl">
                          <Users size={16} className="text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-400">Gender</p>
                            <p className="font-medium text-gray-900">{selectedEmployee.gender || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm p-3 bg-emerald-50 rounded-xl">
                          <CreditCard size={16} className="text-emerald-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-400">NIC</p>
                            <p className="font-medium text-gray-900">{selectedEmployee.nic || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm p-3 bg-rose-50 rounded-xl">
                          <Heart size={16} className="text-rose-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-400">Marriage Status</p>
                            <p className="font-medium text-gray-900">{selectedEmployee.marriage_status || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm p-3 bg-amber-50 rounded-xl">
                          <Home size={16} className="text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-400">Address</p>
                            <p className="font-medium text-gray-900 break-words">{selectedEmployee.address || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============================================ */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showDeleteConfirm && employeeToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
              onClick={() => {
                if (!submitting) {
                  setShowDeleteConfirm(false);
                  setEmployeeToDelete(null);
                }
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <Trash2 size={32} className="text-red-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Employee</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete <span className="font-semibold text-gray-900">{employeeToDelete.name}</span>? This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        if (!submitting) {
                          setShowDeleteConfirm(false);
                          setEmployeeToDelete(null);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteEmployee}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Employee'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}