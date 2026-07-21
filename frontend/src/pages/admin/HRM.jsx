import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Clock, DollarSign, Search, TrendingUp, Award, Loader, 
  Plus, X, Calendar, User, Edit, Trash2, CheckCircle, AlertCircle,
  FileText, Smartphone, Mail, Building, Home, Heart, CreditCard,
  Briefcase, Save, RefreshCw, MoreVertical, ChevronDown, ChevronUp,
  History
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

const tabs = [
  { key: 'attendance', label: 'Attendance', icon: Clock },
  { key: 'salaries', label: 'Salaries & OT', icon: DollarSign },
];

// ========== OT RATES BASED ON DESIGNATION ==========
const OT_RATES = {
  'HR Manager': 750,
  'Sales Manager': 800,
  'Inventory Manager': 700,
  'Accountant': 600,
  'Cashier': 500,
  'Delivery Manager': 650,
  'Driver': 550,
  // Default rate if designation not found
  'default': 500
};

// ========== HELPER FUNCTION FOR AUTH ==========
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export default function HRM() {
  const [activeTab, setActiveTab] = useState('attendance');
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ========== NEW STATE FOR PREVIOUS MONTHS ==========
  const [showPreviousAttendance, setShowPreviousAttendance] = useState(false);
  const [showPreviousSalaries, setShowPreviousSalaries] = useState(false);
  const [previousAttendanceData, setPreviousAttendanceData] = useState([]);
  const [previousSalaryData, setPreviousSalaryData] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // Attendance Form States
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [isEditingAttendance, setIsEditingAttendance] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);

  // Salary Form States
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [editingSalaryId, setEditingSalaryId] = useState(null);

  // Delete Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState(''); // 'attendance' or 'salary'
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');

  // Attendance Form Data
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    employeeName: '',
    date: '',
    checkIn: '',
    checkOut: '',
    status: 'present'
  });

  // Salary Form Data
  const [salaryForm, setSalaryForm] = useState({
    employeeId: '',
    employeeName: '',
    designation: '',
    baseSalary: '',
    otHours: '',
    bonus: '',
    finalSalary: '',
    otRate: 500 // Default OT rate
  });

  // ========== FETCH FUNCTIONS WITH AUTH ==========
  
  const fetchEmployees = async () => {
    try {
      const response = await axios.get(EMPLOYEES_API, getAuthHeaders());
      if (response.data.success) {
        setEmployees(response.data.data);
        console.log('✅ Employees loaded:', response.data.data.length);
      }
    } catch (err) {
      console.error('❌ Error fetching employees:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      }
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(ATTENDANCE_API, getAuthHeaders());
      if (response.data.success) {
        setAttendanceData(response.data.data);
        console.log('✅ Attendance loaded:', response.data.data.length);
      }
    } catch (err) {
      console.error('❌ Error fetching attendance:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      }
    }
  };

  const fetchSalaries = async () => {
    try {
      const response = await axios.get(SALARIES_API, getAuthHeaders());
      if (response.data.success) {
        setSalaryData(response.data.data);
        console.log('✅ Salaries loaded:', response.data.data.length);
      }
    } catch (err) {
      console.error('❌ Error fetching salaries:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      }
    }
  };

  // ========== FETCH PREVIOUS MONTHS DATA ==========
  const fetchPreviousAttendance = async () => {
    setLoadingPrevious(true);
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const response = await axios.get(ATTENDANCE_API, getAuthHeaders());
      if (response.data.success) {
        const allData = response.data.data;
        const previousMonths = allData.filter(record => {
          const recordDate = new Date(record.date);
          return recordDate.getMonth() !== currentMonth || recordDate.getFullYear() !== currentYear;
        });
        setPreviousAttendanceData(previousMonths);
        console.log('✅ Previous attendance loaded:', previousMonths.length);
      }
    } catch (err) {
      console.error('❌ Error fetching previous attendance:', err);
      setError('Failed to load previous attendance data.');
    } finally {
      setLoadingPrevious(false);
    }
  };

  const fetchPreviousSalaries = async () => {
    setLoadingPrevious(true);
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const response = await axios.get(SALARIES_API, getAuthHeaders());
      if (response.data.success) {
        const allData = response.data.data;
        const previousMonths = allData.filter(record => {
          if (record.date) {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() !== currentMonth || recordDate.getFullYear() !== currentYear;
          }
          if (record.month) {
            const monthYear = record.month.split(' ');
            const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December']
              .indexOf(monthYear[0]);
            const year = parseInt(monthYear[1]);
            return monthIndex !== currentMonth || year !== currentYear;
          }
          return true;
        });
        setPreviousSalaryData(previousMonths);
        console.log('✅ Previous salaries loaded:', previousMonths.length);
      }
    } catch (err) {
      console.error('❌ Error fetching previous salaries:', err);
      setError('Failed to load previous salary data.');
    } finally {
      setLoadingPrevious(false);
    }
  };

  // ========== GET OT RATE BY DESIGNATION ==========
  const getOTRate = (designation) => {
    if (!designation) return OT_RATES.default;
    // Check if designation exists in OT_RATES
    const matchedKey = Object.keys(OT_RATES).find(key => 
      designation.toLowerCase().includes(key.toLowerCase())
    );
    return matchedKey ? OT_RATES[matchedKey] : OT_RATES.default;
  };

  // ========== LOAD DATA ==========
  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to access HRM data');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchEmployees(),
          fetchAttendance(),
          fetchSalaries()
        ]);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Failed to load data. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // ========== STATUS CALCULATION ==========
  
  const calculateAttendanceStatus = (checkIn, checkOut) => {
    if (!checkIn && !checkOut) {
      return 'absent';
    }
    
    if (checkIn && !checkOut) {
      return 'present';
    }
    
    const checkInTime = checkIn || '00:00';
    const checkOutTime = checkOut || '00:00';
    
    if (checkInTime === '08:00' && checkOutTime === '17:00') {
      return 'present';
    }
    
    if (checkInTime === '08:00' && checkOutTime < '17:00') {
      return 'half_day';
    }
    
    if (checkInTime > '08:00' && checkOutTime === '17:00') {
      return 'half_day';
    }
    
    if (checkInTime > '08:00' && checkOutTime < '17:00') {
      return 'half_day';
    }
    
    if (checkInTime === '08:00' && checkOutTime > '17:00') {
      return 'present';
    }
    
    if (checkInTime < '08:00' && checkOutTime === '17:00') {
      return 'present';
    }
    
    if (checkInTime < '08:00' && checkOutTime < '17:00') {
      return 'half_day';
    }
    
    if (checkInTime < '08:00' && checkOutTime > '17:00') {
      return 'present';
    }
    
    return 'present';
  };

  const calculateFinalSalary = (base, otHours, bonus, otRate) => {
    const baseNum = parseFloat(base) || 0;
    const otNum = parseFloat(otHours) || 0;
    const bonusNum = parseFloat(bonus) || 0;
    const rate = parseFloat(otRate) || 500;
    return baseNum + (otNum * rate) + bonusNum;
  };

  // ========== ATTENDANCE CRUD OPERATIONS ==========

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

      let response;
      if (isEditingAttendance && editingAttendanceId) {
        response = await axios.put(`${ATTENDANCE_API}/${editingAttendanceId}`, data, getAuthHeaders());
        if (response.data.success) {
          await fetchAttendance();
          setShowAttendanceForm(false);
          resetAttendanceForm();
          showSuccessNotification('Attendance updated successfully!');
        }
      } else {
        response = await axios.post(ATTENDANCE_API, data, getAuthHeaders());
        if (response.data.success) {
          await fetchAttendance();
          setShowAttendanceForm(false);
          resetAttendanceForm();
          showSuccessNotification(`Attendance added! Status: ${status}`);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 409) {
        setError('Attendance already recorded for this date.');
      } else {
        setError(err.response?.data?.message || 'Failed to save attendance.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAttendance = async () => {
    if (!deleteId) return;
    
    try {
      setSubmitting(true);
      await axios.delete(`${ATTENDANCE_API}/${deleteId}`, getAuthHeaders());
      await fetchAttendance();
      setShowDeleteConfirm(false);
      setDeleteId(null);
      showSuccessNotification('Attendance record deleted successfully!');
    } catch (err) {
      console.error('Error deleting attendance:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError('Failed to delete attendance record.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const editAttendance = (record) => {
    setIsEditingAttendance(true);
    setEditingAttendanceId(record.id);
    setAttendanceForm({
      employeeId: record.employee_id || record.employeeId || '',
      employeeName: record.employee_name || record.name || '',
      date: record.date || '',
      checkIn: record.check_in || record.checkIn || '',
      checkOut: record.check_out || record.checkOut || '',
      status: record.status || 'present'
    });
    setShowAttendanceForm(true);
  };

  // ========== SALARY CRUD OPERATIONS ==========

  const handleSalarySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Get OT rate based on designation
      const otRate = getOTRate(salaryForm.designation);
      
      const data = {
        employeeId: parseInt(salaryForm.employeeId),
        employeeName: salaryForm.employeeName,
        designation: salaryForm.designation,
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
        baseSalary: parseFloat(salaryForm.baseSalary) || 0,
        otHours: parseFloat(salaryForm.otHours) || 0,
        otRate: otRate,
        bonus: parseFloat(salaryForm.bonus) || 0,
        totalSalary: parseFloat(salaryForm.finalSalary) || 0
      };

      let response;
      if (isEditingSalary && editingSalaryId) {
        response = await axios.put(`${SALARIES_API}/${editingSalaryId}`, data, getAuthHeaders());
        if (response.data.success) {
          await fetchSalaries();
          setShowSalaryForm(false);
          resetSalaryForm();
          showSuccessNotification('Salary updated successfully!');
        }
      } else {
        response = await axios.post(SALARIES_API, data, getAuthHeaders());
        if (response.data.success) {
          await fetchSalaries();
          setShowSalaryForm(false);
          resetSalaryForm();
          showSuccessNotification('Salary added successfully!');
        }
      }
    } catch (err) {
      console.error('Error:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else if (err.response?.status === 409) {
        setError('Salary already recorded for this month.');
      } else {
        setError(err.response?.data?.message || 'Failed to save salary.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSalary = async () => {
    if (!deleteId) return;
    
    try {
      setSubmitting(true);
      await axios.delete(`${SALARIES_API}/${deleteId}`, getAuthHeaders());
      await fetchSalaries();
      setShowDeleteConfirm(false);
      setDeleteId(null);
      showSuccessNotification('Salary record deleted successfully!');
    } catch (err) {
      console.error('Error deleting salary:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please login again.');
      } else {
        setError('Failed to delete salary record.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const editSalary = (record) => {
    setIsEditingSalary(true);
    setEditingSalaryId(record.id);
    setSalaryForm({
      employeeId: record.employee_id || record.employeeId || '',
      employeeName: record.employee_name || record.name || '',
      designation: record.designation || '',
      baseSalary: record.base_salary || record.base || '',
      otHours: record.ot_hours || record.otHours || '',
      bonus: record.bonus || '',
      finalSalary: record.total_salary || record.total || '',
      otRate: record.ot_rate || getOTRate(record.designation) || 500
    });
    setShowSalaryForm(true);
  };

  // ========== FORM RESET FUNCTIONS ==========

  const resetAttendanceForm = () => {
    setAttendanceForm({
      employeeId: '',
      employeeName: '',
      date: '',
      checkIn: '',
      checkOut: '',
      status: 'present'
    });
    setIsEditingAttendance(false);
    setEditingAttendanceId(null);
  };

  const resetSalaryForm = () => {
    setSalaryForm({
      employeeId: '',
      employeeName: '',
      designation: '',
      baseSalary: '',
      otHours: '',
      bonus: '',
      finalSalary: '',
      otRate: 500
    });
    setIsEditingSalary(false);
    setEditingSalaryId(null);
  };

  const showSuccessNotification = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  };

  // ========== OPEN FORM FUNCTIONS ==========

  const openAttendanceForm = (employee = null) => {
    if (employee) {
      setAttendanceForm({
        employeeId: employee.id,
        employeeName: employee.name,
        date: new Date().toISOString().split('T')[0],
        checkIn: '',
        checkOut: '',
        status: 'present'
      });
    }
    setShowAttendanceForm(true);
  };

  const openSalaryForm = (employee = null) => {
    if (employee) {
      const otRate = getOTRate(employee.designation);
      setSalaryForm({
        employeeId: employee.id,
        employeeName: employee.name,
        designation: employee.designation || '',
        baseSalary: employee.base_salary || employee.baseSalary || '',
        otHours: '',
        bonus: employee.bonus || '',
        finalSalary: '',
        otRate: otRate
      });
    } else {
      setSalaryForm({
        employeeId: '',
        employeeName: '',
        designation: '',
        baseSalary: '',
        otHours: '',
        bonus: '',
        finalSalary: '',
        otRate: 500
      });
    }
    setShowSalaryForm(true);
  };

  // ========== DELETE CONFIRMATION ==========

  const confirmDelete = (type, id, name) => {
    setDeleteType(type);
    setDeleteId(id);
    setDeleteName(name);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (deleteType === 'attendance') {
      handleDeleteAttendance();
    } else if (deleteType === 'salary') {
      handleDeleteSalary();
    }
  };

  // ========== TOGGLE PREVIOUS MONTHS ==========

  const togglePreviousAttendance = () => {
    const newState = !showPreviousAttendance;
    setShowPreviousAttendance(newState);
    if (newState) {
      fetchPreviousAttendance();
    }
  };

  const togglePreviousSalaries = () => {
    const newState = !showPreviousSalaries;
    setShowPreviousSalaries(newState);
    if (newState) {
      fetchPreviousSalaries();
    }
  };

  // ========== AUTO-CALCULATE FUNCTIONS ==========

  useEffect(() => {
    if (attendanceForm.checkIn || attendanceForm.checkOut) {
      const status = calculateAttendanceStatus(attendanceForm.checkIn, attendanceForm.checkOut);
      setAttendanceForm(prev => ({ ...prev, status }));
    }
  }, [attendanceForm.checkIn, attendanceForm.checkOut]);

  // Auto-calculate final salary with OT rate based on designation
  useEffect(() => {
    if (salaryForm.baseSalary || salaryForm.otHours || salaryForm.bonus) {
      const otRate = getOTRate(salaryForm.designation);
      const final = calculateFinalSalary(
        salaryForm.baseSalary,
        salaryForm.otHours,
        salaryForm.bonus,
        otRate
      );
      setSalaryForm(prev => ({ 
        ...prev, 
        finalSalary: final.toFixed(2),
        otRate: otRate 
      }));
    }
  }, [salaryForm.baseSalary, salaryForm.otHours, salaryForm.bonus, salaryForm.designation]);

  // Update OT rate when designation changes
  useEffect(() => {
    if (salaryForm.designation) {
      const otRate = getOTRate(salaryForm.designation);
      setSalaryForm(prev => ({ ...prev, otRate: otRate }));
    }
  }, [salaryForm.designation]);

  // ========== SUMMARY ==========

  const totalStaff = employees.length;
  const totalOTHours = salaryData.reduce((sum, s) => sum + (s.ot_hours || s.otHours || 0), 0);
  const monthlyPayout = salaryData.reduce((sum, s) => sum + (s.total_salary || s.total || 0), 0);

  const summaryCards = [
    { key: 'staff', label: 'Total Staff', value: totalStaff, icon: Users, bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
    { key: 'ot', label: 'Total OT Hours', value: `${totalOTHours}h`, icon: Clock, bgClass: 'bg-amber-50', textClass: 'text-amber-600' },
    { key: 'payout', label: 'Monthly Payout', value: formatCurrency(monthlyPayout), icon: DollarSign, bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
  ];

  // ========== FILTER DATA FOR CURRENT MONTH ==========
  const getCurrentMonthData = (data, dateField = 'date') => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return data.filter(record => {
      if (record[dateField]) {
        const recordDate = new Date(record[dateField]);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      }
      if (record.month) {
        const monthYear = record.month.split(' ');
        const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December']
          .indexOf(monthYear[0]);
        const year = parseInt(monthYear[1]);
        return monthIndex === currentMonth && year === currentYear;
      }
      return true;
    });
  };

  const currentMonthAttendance = getCurrentMonthData(attendanceData);
  const currentMonthSalaries = getCurrentMonthData(salaryData, 'month');

  const filteredAttendance = currentMonthAttendance.filter((rec) =>
    (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSalary = currentMonthSalaries.filter((rec) =>
    (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPreviousAttendance = previousAttendanceData.filter((rec) =>
    (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPreviousSalary = previousSalaryData.filter((rec) =>
    (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ========== LOADING ==========

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader size={48} className="text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading HRM data...</p>
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

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">HRM</h1>
            <p className="text-sm text-gray-500 mt-1">
              Human Resource Management — Attendance, salaries, and employee performance
            </p>
          </div>
          <button
            onClick={async () => {
              setLoading(true);
              setError(null);
              try {
                await Promise.all([
                  fetchEmployees(),
                  fetchAttendance(),
                  fetchSalaries()
                ]);
                showSuccessNotification('Data refreshed successfully!');
              } catch (err) {
                setError('Failed to refresh data.');
              } finally {
                setLoading(false);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              variants={itemVariants}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bgClass} flex items-center justify-center`}>
                  <Icon size={18} className={card.textClass} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{card.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

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
        <div className="flex items-center gap-3">
          {activeTab === 'attendance' && (
            <button
              onClick={() => {
                if (employees.length > 0) {
                  openAttendanceForm(employees[0]);
                } else {
                  alert('No employees available. Please add employees first.');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Attendance
            </button>
          )}
          {activeTab === 'salaries' && (
            <button
              onClick={() => {
                if (employees.length > 0) {
                  openSalaryForm(employees[0]);
                } else {
                  alert('No employees available. Please add employees first.');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Salary & OT
            </button>
          )}
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
        </div>
      </motion.div>

      {/* ============================================ */}
      {/* ATTENDANCE TAB WITH PREVIOUS MONTHS TOGGLE */}
      {/* ============================================ */}
      {activeTab === 'attendance' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Current Month Attendance
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Daily check-in and check-out records for this month
                    <span className="ml-2 text-blue-600 font-medium">{filteredAttendance.length} records</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    fetchAttendance();
                    showSuccessNotification('Attendance refreshed!');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh attendance"
                >
                  <RefreshCw size={16} className="text-gray-400 hover:text-blue-600 transition-colors" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Check In</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map((record) => (
                      <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6 font-medium text-gray-900">{record.employee_name || record.name}</td>
                        <td className="py-3 px-6 text-gray-600">{record.date}</td>
                        <td className="py-3 px-6 text-gray-600">{record.check_in || record.checkIn || '--'}</td>
                        <td className="py-3 px-6 text-gray-600">{record.check_out || record.checkOut || '--'}</td>
                        <td className="py-3 px-6">
                          <StatusBadge status={record.status} />
                        </td>
                        <td className="py-3 px-6">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => editAttendance(record)}
                              className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => confirmDelete('attendance', record.id, record.employee_name || record.name)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-500">
                        <Clock size={36} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No attendance records for current month</p>
                        <p className="text-xs mt-1">Add attendance records to get started</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={togglePreviousAttendance}
              className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 hover:border-purple-200 rounded-2xl transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <History size={20} className="text-purple-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">Previous Months Attendance</p>
                  <p className="text-xs text-gray-500">
                    {showPreviousAttendance ? 'Hide' : 'View'} historical attendance records
                    {previousAttendanceData.length > 0 && !showPreviousAttendance && (
                      <span className="ml-2 text-purple-600 font-medium">
                        ({previousAttendanceData.length} records)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loadingPrevious && (
                  <Loader size={16} className="animate-spin text-purple-600" />
                )}
                {showPreviousAttendance ? (
                  <ChevronUp size={20} className="text-purple-600" />
                ) : (
                  <ChevronDown size={20} className="text-purple-600" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {showPreviousAttendance && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden">
                    <div className="p-4 border-b border-purple-50 bg-purple-50/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">
                            <History size={16} className="inline mr-2 text-purple-600" />
                            Previous Months Records
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            All attendance records from previous months
                          </p>
                        </div>
                        <button
                          onClick={fetchPreviousAttendance}
                          className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw size={14} className="text-purple-500" />
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-purple-50">
                          <tr>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-purple-700 uppercase tracking-wider">Employee</th>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-purple-700 uppercase tracking-wider">Date</th>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-purple-700 uppercase tracking-wider">Check In</th>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-purple-700 uppercase tracking-wider">Check Out</th>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-purple-700 uppercase tracking-wider">Status</th>
                            <th className="text-center py-2.5 px-4 text-xs font-medium text-purple-700 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingPrevious ? (
                            <tr>
                              <td colSpan="6" className="text-center py-8">
                                <Loader size={24} className="animate-spin text-purple-600 mx-auto" />
                                <p className="text-xs text-gray-400 mt-2">Loading previous records...</p>
                              </td>
                            </tr>
                          ) : filteredPreviousAttendance.length > 0 ? (
                            filteredPreviousAttendance.map((record) => (
                              <tr key={record.id} className="border-b border-purple-50 hover:bg-purple-50/30 transition-colors">
                                <td className="py-2.5 px-4 font-medium text-gray-800">{record.employee_name || record.name}</td>
                                <td className="py-2.5 px-4 text-gray-600">{record.date}</td>
                                <td className="py-2.5 px-4 text-gray-600">{record.check_in || record.checkIn || '--'}</td>
                                <td className="py-2.5 px-4 text-gray-600">{record.check_out || record.checkOut || '--'}</td>
                                <td className="py-2.5 px-4">
                                  <StatusBadge status={record.status} />
                                </td>
                                <td className="py-2.5 px-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => editAttendance(record)}
                                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      onClick={() => confirmDelete('attendance', record.id, record.employee_name || record.name)}
                                      className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="6" className="text-center py-8 text-gray-500">
                                <Clock size={28} className="mx-auto mb-2 text-gray-300" />
                                <p className="font-medium">No previous attendance records</p>
                                <p className="text-xs mt-1">Records from previous months will appear here</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {filteredPreviousAttendance.length > 0 && (
                          <tfoot className="bg-purple-50/50">
                            <tr>
                              <td colSpan="6" className="py-2 px-4 text-xs text-purple-600 font-medium">
                                Total: {filteredPreviousAttendance.length} records
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      {/* ============================================ */}
      {/* SALARIES TAB WITH PREVIOUS MONTHS TOGGLE - FIXED DESIGNATION DISPLAY */}
      {/* ============================================ */}
      {activeTab === 'salaries' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    Current Month Salary Summary
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Complete breakdown for current month
                    <span className="ml-2 text-emerald-600 font-medium">{filteredSalary.length} records</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    fetchSalaries();
                    showSuccessNotification('Salaries refreshed!');
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh salaries"
                >
                  <RefreshCw size={16} className="text-gray-400 hover:text-emerald-600 transition-colors" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">OT Hours</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">OT Rate</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">OT Amount</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Bonus</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Final Salary</th>
                    <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalary.length > 0 ? (
                    filteredSalary.map((salary) => {
                      // Get designation from salary record or from employee data
                      let designation = salary.designation || 'N/A';
                      
                      // If designation is not set in salary, try to find it from employees
                      if (!salary.designation) {
                        const employee = employees.find(emp => emp.id === salary.employee_id || emp.id === salary.employeeId);
                        if (employee) {
                          designation = employee.designation || 'N/A';
                        }
                      }
                      
                      const otRate = salary.ot_rate || getOTRate(designation) || 500;
                      const otAmount = (salary.ot_hours || salary.otHours || 0) * otRate;
                      return (
                        <tr key={salary.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-6 font-medium text-gray-900">{salary.employee_name || salary.name}</td>
                          <td className="py-3 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {designation}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(salary.base_salary || salary.base || 0)}</td>
                          <td className="py-3 px-6 text-right text-gray-600">{salary.ot_hours || salary.otHours || 0}h</td>
                          <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(otRate)}/hr</td>
                          <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(otAmount)}</td>
                          <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(salary.bonus || 0)}</td>
                          <td className="py-3 px-6 text-right font-semibold text-gray-900">{formatCurrency(salary.total_salary || salary.total || 0)}</td>
                          <td className="py-3 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => editSalary(salary)}
                                className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit size={15} />
                              </button>
                              <button
                                onClick={() => confirmDelete('salary', salary.id, salary.employee_name || salary.name)}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="9" className="text-center py-10 text-gray-500">
                        <DollarSign size={36} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No salary records for current month</p>
                        <p className="text-xs mt-1">Add salary records to get started</p>
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredSalary.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50/50">
                      <td className="py-3 px-6 font-semibold text-gray-900">Total</td>
                      <td className="py-3 px-6"></td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(filteredSalary.reduce((s, r) => s + (r.base_salary || r.base || 0), 0))}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {filteredSalary.reduce((s, r) => s + (r.ot_hours || r.otHours || 0), 0)}h
                      </td>
                      <td className="py-3 px-6"></td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(filteredSalary.reduce((s, r) => {
                          const designation = r.designation || employees.find(emp => emp.id === r.employee_id || emp.id === r.employeeId)?.designation || '';
                          const rate = r.ot_rate || getOTRate(designation) || 500;
                          return s + ((r.ot_hours || r.otHours || 0) * rate);
                        }, 0))}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(filteredSalary.reduce((s, r) => s + (r.bonus || 0), 0))}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(filteredSalary.reduce((s, r) => s + (r.total_salary || r.total || 0), 0))}
                      </td>
                      <td className="py-3 px-6"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <button
              onClick={togglePreviousSalaries}
              className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 hover:border-emerald-200 rounded-2xl transition-all duration-300 group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <History size={20} className="text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-800">Previous Months Salaries</p>
                  <p className="text-xs text-gray-500">
                    {showPreviousSalaries ? 'Hide' : 'View'} historical salary records
                    {previousSalaryData.length > 0 && !showPreviousSalaries && (
                      <span className="ml-2 text-emerald-600 font-medium">
                        ({previousSalaryData.length} records)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {loadingPrevious && (
                  <Loader size={16} className="animate-spin text-emerald-600" />
                )}
                {showPreviousSalaries ? (
                  <ChevronUp size={20} className="text-emerald-600" />
                ) : (
                  <ChevronDown size={20} className="text-emerald-600" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {showPreviousSalaries && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
                    <div className="p-4 border-b border-emerald-50 bg-emerald-50/30">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-800">
                            <History size={16} className="inline mr-2 text-emerald-600" />
                            Previous Months Salary Records
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            All salary records from previous months
                          </p>
                        </div>
                        <button
                          onClick={fetchPreviousSalaries}
                          className="p-1.5 hover:bg-emerald-100 rounded-lg transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw size={14} className="text-emerald-500" />
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-emerald-50">
                          <tr>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-emerald-700 uppercase tracking-wider">Employee</th>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-emerald-700 uppercase tracking-wider">Designation</th>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-emerald-700 uppercase tracking-wider">Month</th>
                            <th className="text-right py-2.5 px-4 text-xs font-medium text-emerald-700 uppercase tracking-wider">Base Salary</th>
                            <th className="text-right py-2.5 px-4 text-xs font-medium text-emerald-700 uppercase tracking-wider">OT Hours</th>
                            <th className="text-right py-2.5 px-4 text-xs font-medium text-emerald-700 uppercase tracking-wider">OT Rate</th>
                            <th className="text-right py-2.5 px-4 text-xs font-medium text-emerald-700 uppercase tracking-wider">OT Amount</th>
                            <th className="text-right py-2.5 px-4 text-xs font-medium text-emerald-700 uppercase tracking-wider">Bonus</th>
                            <th className="text-right py-2.5 px-4 text-xs font-medium text-emerald-700 uppercase tracking-wider">Final Salary</th>
                            <th className="text-center py-2.5 px-4 text-xs font-medium text-emerald-700 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingPrevious ? (
                            <tr>
                              <td colSpan="10" className="text-center py-8">
                                <Loader size={24} className="animate-spin text-emerald-600 mx-auto" />
                                <p className="text-xs text-gray-400 mt-2">Loading previous records...</p>
                              </td>
                            </tr>
                          ) : filteredPreviousSalary.length > 0 ? (
                            filteredPreviousSalary.map((salary) => {
                              // Get designation from salary record or from employee data
                              let designation = salary.designation || 'N/A';
                              
                              // If designation is not set in salary, try to find it from employees
                              if (!salary.designation) {
                                const employee = employees.find(emp => emp.id === salary.employee_id || emp.id === salary.employeeId);
                                if (employee) {
                                  designation = employee.designation || 'N/A';
                                }
                              }
                              
                              const otRate = salary.ot_rate || getOTRate(designation) || 500;
                              const otAmount = (salary.ot_hours || salary.otHours || 0) * otRate;
                              return (
                                <tr key={salary.id} className="border-b border-emerald-50 hover:bg-emerald-50/30 transition-colors">
                                  <td className="py-2.5 px-4 font-medium text-gray-800">{salary.employee_name || salary.name}</td>
                                  <td className="py-2.5 px-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                      {designation}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-gray-600">{salary.month || 'N/A'}</td>
                                  <td className="py-2.5 px-4 text-right text-gray-600">{formatCurrency(salary.base_salary || salary.base || 0)}</td>
                                  <td className="py-2.5 px-4 text-right text-gray-600">{salary.ot_hours || salary.otHours || 0}h</td>
                                  <td className="py-2.5 px-4 text-right text-gray-600">{formatCurrency(otRate)}/hr</td>
                                  <td className="py-2.5 px-4 text-right text-gray-600">{formatCurrency(otAmount)}</td>
                                  <td className="py-2.5 px-4 text-right text-gray-600">{formatCurrency(salary.bonus || 0)}</td>
                                  <td className="py-2.5 px-4 text-right font-semibold text-gray-900">{formatCurrency(salary.total_salary || salary.total || 0)}</td>
                                  <td className="py-2.5 px-4">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => editSalary(salary)}
                                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Edit"
                                      >
                                        <Edit size={14} />
                                      </button>
                                      <button
                                        onClick={() => confirmDelete('salary', salary.id, salary.employee_name || salary.name)}
                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan="10" className="text-center py-8 text-gray-500">
                                <DollarSign size={28} className="mx-auto mb-2 text-gray-300" />
                                <p className="font-medium">No previous salary records</p>
                                <p className="text-xs mt-1">Records from previous months will appear here</p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                        {filteredPreviousSalary.length > 0 && (
                          <tfoot className="bg-emerald-50/50">
                            <tr>
                              <td colSpan="10" className="py-2 px-4 text-xs text-emerald-600 font-medium">
                                Total: {filteredPreviousSalary.length} records
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}

      {/* ============================================ */}
      {/* ATTENDANCE FORM MODAL (Create & Update) */}
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
                  <h2 className="text-xl font-semibold text-gray-900">
                    {isEditingAttendance ? 'Edit Attendance' : 'Add Attendance'}
                  </h2>
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
                        disabled={submitting || isEditingAttendance}
                      >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                      {isEditingAttendance && (
                        <p className="text-xs text-gray-400 mt-1">Employee cannot be changed while editing</p>
                      )}
                      {employees.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">⚠️ No employees found. Please add employees first.</p>
                      )}
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
                        <Clock size={14} className="inline mr-1" /> Check In Time
                      </label>
                      <input
                        type="time"
                        value={attendanceForm.checkIn}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, checkIn: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        disabled={submitting}
                      />
                      <p className="text-xs text-gray-400 mt-1">Default: 8:00 AM</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Clock size={14} className="inline mr-1" /> Check Out Time
                      </label>
                      <input
                        type="time"
                        value={attendanceForm.checkOut}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, checkOut: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        disabled={submitting}
                      />
                      <p className="text-xs text-gray-400 mt-1">Default: 5:00 PM</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <AlertCircle size={14} className="inline mr-1" /> Status (Auto-generated)
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
                          {isEditingAttendance ? 'Updating...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {isEditingAttendance ? 'Update Attendance' : 'Save Attendance'}
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
      {/* SALARY FORM MODAL (Create & Update) - WITH AUTO-FILL & OT RATE BY DESIGNATION */}
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
                  <h2 className="text-xl font-semibold text-gray-900">
                    {isEditingSalary ? 'Edit Salary & OT' : 'Add Salary & OT'}
                  </h2>
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
                          if (emp) {
                            const otRate = getOTRate(emp.designation);
                            setSalaryForm({
                              ...salaryForm,
                              employeeId: e.target.value,
                              employeeName: emp.name,
                              designation: emp.designation || '',
                              baseSalary: emp.base_salary || emp.baseSalary || '',
                              bonus: emp.bonus || '',
                              otRate: otRate
                            });
                          } else {
                            setSalaryForm({
                              ...salaryForm,
                              employeeId: e.target.value,
                              employeeName: '',
                              designation: '',
                              baseSalary: '',
                              bonus: '',
                              otRate: 500
                            });
                          }
                        }}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all bg-white"
                        required
                        disabled={submitting || isEditingSalary}
                      >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {emp.designation ? `- ${emp.designation}` : ''}
                          </option>
                        ))}
                      </select>
                      {isEditingSalary && (
                        <p className="text-xs text-gray-400 mt-1">Employee cannot be changed while editing</p>
                      )}
                      {employees.length === 0 && (
                        <p className="text-xs text-amber-600 mt-1">⚠️ No employees found. Please add employees first.</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Briefcase size={14} className="inline mr-1" /> Designation
                      </label>
                      <input
                        type="text"
                        value={salaryForm.designation}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                        disabled
                      />
                      <p className="text-xs text-gray-400 mt-1">Auto-filled from employee profile</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <DollarSign size={14} className="inline mr-1" /> Base Salary (LKR) *
                      </label>
                      <input
                        type="number"
                        value={salaryForm.baseSalary}
                        onChange={(e) => setSalaryForm({ ...salaryForm, baseSalary: e.target.value })}
                        placeholder="Auto-filled from employee"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all bg-gray-50 cursor-not-allowed"
                        required
                        disabled={true}
                      />
                      <p className="text-xs text-emerald-600 mt-1">✓ Auto-filled from employee profile</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Award size={14} className="inline mr-1" /> Bonus (LKR)
                      </label>
                      <input
                        type="number"
                        value={salaryForm.bonus}
                        onChange={(e) => setSalaryForm({ ...salaryForm, bonus: e.target.value })}
                        placeholder="Auto-filled from employee"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all bg-gray-50 cursor-not-allowed"
                        disabled={true}
                      />
                      <p className="text-xs text-emerald-600 mt-1">✓ Auto-filled from employee profile</p>
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
                      <p className="text-xs text-gray-400 mt-1">
                        OT Rate: {formatCurrency(salaryForm.otRate || 500)}/hr (based on designation)
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Clock size={14} className="inline mr-1" /> OT Rate (LKR/hr)
                      </label>
                      <input
                        type="text"
                        value={formatCurrency(salaryForm.otRate || 500)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                        disabled
                      />
                      <p className="text-xs text-purple-600 mt-1">
                        ✓ Auto-set based on designation
                      </p>
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
                          Base Salary + (OT Hours × {formatCurrency(salaryForm.otRate || 500)}/hr) + Bonus
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          OT Rate: {formatCurrency(salaryForm.otRate || 500)}/hr based on designation
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
                          {isEditingSalary ? 'Updating...' : 'Saving...'}
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {isEditingSalary ? 'Update Salary' : 'Save Salary'}
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
      {/* DELETE CONFIRMATION MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showDeleteConfirm && deleteId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
              onClick={() => {
                if (!submitting) {
                  setShowDeleteConfirm(false);
                  setDeleteId(null);
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
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Delete {deleteType === 'attendance' ? 'Attendance Record' : 'Salary Record'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete this {deleteType} record for{' '}
                    <span className="font-semibold text-gray-900">{deleteName}</span>? 
                    This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        if (!submitting) {
                          setShowDeleteConfirm(false);
                          setDeleteId(null);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmDelete}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        'Delete Record'
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