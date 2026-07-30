import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, Search, Plus, X, User, Calendar, Edit, Trash2, 
  CheckCircle, AlertCircle, Loader, RefreshCw, History,
  ChevronDown, ChevronUp, Save, Filter, ChevronLeft, ChevronRight,
  CalendarDays, Users as UsersIcon
} from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const EMPLOYEES_API = `${API_BASE_URL}/employees`;
const ATTENDANCE_API = `${API_BASE_URL}/attendance`;

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

// ========== HELPER FUNCTION FOR AUTH ==========
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

// ========== ATTENDANCE STATUS CALCULATION ==========
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

// ========== GET DESIGNATION NAME ==========
const getDesignationName = (employee) => {
  if (!employee) return '';
  if (employee.designation && typeof employee.designation === 'object') {
    return employee.designation.designation || '';
  }
  if (employee.designation && typeof employee.designation === 'string') {
    return employee.designation;
  }
  return '';
};

export default function Attendance() {
  // ========== STATE ==========
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ========== FILTER STATE ==========
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  // ========== PAGINATION STATE ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ========== PREVIOUS MONTHS STATE ==========
  const [showPreviousAttendance, setShowPreviousAttendance] = useState(false);
  const [previousAttendanceData, setPreviousAttendanceData] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // ========== FORM STATES ==========
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [isEditingAttendance, setIsEditingAttendance] = useState(false);
  const [editingAttendanceId, setEditingAttendanceId] = useState(null);

  // ========== EMPLOYEE SEARCH STATE FOR FORM ==========
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeSearchRef = useRef(null);

  // ========== DELETE CONFIRMATION ==========
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');

  // ========== ATTENDANCE FORM DATA ==========
  const [attendanceForm, setAttendanceForm] = useState({
    employeeId: '',
    employeeName: '',
    date: '',
    checkIn: '',
    checkOut: '',
    status: 'present'
  });

  // ========== FETCH FUNCTIONS ==========
  
  const fetchEmployees = async () => {
    try {
      const response = await axios.get(EMPLOYEES_API, getAuthHeaders());
      if (response.data.success) {
        setEmployees(response.data.data);
        console.log('✅ Employees loaded:', response.data.data.length);
      }
    } catch (err) {
      console.error('❌ Error fetching employees:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
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
      if (err.response?.status === 401 || err.response?.status === 403) {
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

  // ========== LOAD DATA ==========
  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to access attendance data');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchEmployees(),
          fetchAttendance()
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

  // ========== AUTO-CALCULATE STATUS ==========
  useEffect(() => {
    if (attendanceForm.checkIn || attendanceForm.checkOut) {
      const status = calculateAttendanceStatus(attendanceForm.checkIn, attendanceForm.checkOut);
      setAttendanceForm(prev => ({ ...prev, status }));
    }
  }, [attendanceForm.checkIn, attendanceForm.checkOut]);

  // ========== FILTER EMPLOYEES BY SEARCH ==========
  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(employeeSearchQuery.toLowerCase())
  );

  // ========== SELECT EMPLOYEE ==========
  const selectEmployee = (employee) => {
    setAttendanceForm({
      ...attendanceForm,
      employeeId: employee.id,
      employeeName: employee.name
    });
    setEmployeeSearchQuery(employee.name);
    setIsEmployeeDropdownOpen(false);
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
      if (err.response?.status === 401 || err.response?.status === 403) {
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
      if (err.response?.status === 401 || err.response?.status === 403) {
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
    setEmployeeSearchQuery(record.employee_name || record.name || '');
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
    setEmployeeSearchQuery('');
    setIsEditingAttendance(false);
    setEditingAttendanceId(null);
    setIsEmployeeDropdownOpen(false);
  };

  const showSuccessNotification = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  };

  // ========== OPEN FORM FUNCTIONS ==========

  const openAttendanceForm = (employee = null) => {
    if (employee) {
      setEmployeeSearchQuery(employee.name);
      setAttendanceForm({
        employeeId: employee.id,
        employeeName: employee.name,
        date: new Date().toISOString().split('T')[0],
        checkIn: '',
        checkOut: '',
        status: 'present'
      });
    } else {
      setEmployeeSearchQuery('');
      setAttendanceForm({
        employeeId: '',
        employeeName: '',
        date: new Date().toISOString().split('T')[0],
        checkIn: '',
        checkOut: '',
        status: 'present'
      });
    }
    setShowAttendanceForm(true);
  };

  // ========== DELETE CONFIRMATION ==========

  const confirmDelete = (id, name) => {
    setDeleteId(id);
    setDeleteName(name);
    setShowDeleteConfirm(true);
  };

  // ========== TOGGLE PREVIOUS MONTHS ==========

  const togglePreviousAttendance = () => {
    const newState = !showPreviousAttendance;
    setShowPreviousAttendance(newState);
    if (newState) {
      fetchPreviousAttendance();
    }
  };

  // ========== FILTER DATA ==========

  const getCurrentMonthData = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return attendanceData.filter(record => {
      if (record.date) {
        const recordDate = new Date(record.date);
        return recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      }
      return true;
    });
  };

  // ========== APPLY FILTERS ==========
  const applyFilters = (data) => {
    let filtered = [...data];

    // Filter by Employee
    if (filterEmployeeId) {
      filtered = filtered.filter(rec => 
        (rec.employee_id || rec.employeeId) === parseInt(filterEmployeeId)
      );
    }

    // Filter by Day
    if (filterDay) {
      filtered = filtered.filter(rec => {
        const date = new Date(rec.date);
        return date.getDate() === parseInt(filterDay);
      });
    }

    // Filter by Month
    if (filterMonth) {
      filtered = filtered.filter(rec => {
        const date = new Date(rec.date);
        return date.getMonth() === parseInt(filterMonth);
      });
    }

    // Filter by Year
    if (filterYear) {
      filtered = filtered.filter(rec => {
        const date = new Date(rec.date);
        return date.getFullYear() === parseInt(filterYear);
      });
    }

    // Search by employee name
    if (searchQuery) {
      filtered = filtered.filter(rec =>
        (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const currentMonthAttendance = getCurrentMonthData();
  const filteredAttendance = applyFilters(currentMonthAttendance);
  const filteredPreviousAttendance = applyFilters(previousAttendanceData);

  // ========== PAGINATION ==========
  const totalItems = filteredAttendance.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredAttendance.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterEmployeeId, filterDay, filterMonth, filterYear, searchQuery]);

  // ========== SUMMARY STATISTICS ==========
  const totalAttendance = filteredAttendance.length;
  const presentCount = filteredAttendance.filter(rec => rec.status === 'present').length;
  const absentCount = filteredAttendance.filter(rec => rec.status === 'absent').length;
  const halfDayCount = filteredAttendance.filter(rec => rec.status === 'half_day').length;

  const summaryCards = [
    { 
      key: 'total', 
      label: 'Total Records', 
      value: totalAttendance, 
      bgClass: 'bg-blue-50', 
      textClass: 'text-blue-600' 
    },
    { 
      key: 'present', 
      label: 'Present', 
      value: presentCount, 
      bgClass: 'bg-emerald-50', 
      textClass: 'text-emerald-600' 
    },
    { 
      key: 'half_day', 
      label: 'Half Day', 
      value: halfDayCount, 
      bgClass: 'bg-amber-50', 
      textClass: 'text-amber-600' 
    },
    { 
      key: 'absent', 
      label: 'Absent', 
      value: absentCount, 
      bgClass: 'bg-red-50', 
      textClass: 'text-red-600' 
    },
  ];

  // ========== LOADING ==========

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader size={48} className="text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading attendance data...</p>
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
      {/* ========== SUCCESS NOTIFICATION ========== */}
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

      {/* ========== ERROR MESSAGE ========== */}
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

      {/* ========== HEADER ========== */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendance Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track employee check-ins, check-outs, and attendance status
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await fetchAttendance();
                  showSuccessNotification('Attendance refreshed successfully!');
                } catch (err) {
                  setError('Failed to refresh attendance data.');
                } finally {
                  setLoading(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={() => {
                if (employees.length > 0) {
                  openAttendanceForm(employees[0]);
                } else {
                  setError('No employees available. Please add employees first.');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Attendance
            </button>
          </div>
        </div>
      </motion.div>

      {/* ========== SUMMARY CARDS ========== */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          return (
            <motion.div
              key={card.key}
              variants={itemVariants}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bgClass} flex items-center justify-center`}>
                  <span className={`text-lg font-bold ${card.textClass}`}>
                    {card.value}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {card.key === 'total' ? `${card.value} records` : 
                     card.key === 'present' ? `${card.value} (${totalAttendance > 0 ? Math.round((card.value/totalAttendance)*100) : 0}%)` :
                     card.key === 'half_day' ? `${card.value} (${totalAttendance > 0 ? Math.round((card.value/totalAttendance)*100) : 0}%)` :
                     card.value}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ========== FILTERS SECTION ========== */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
            />
          </div>

          {/* Employee Filter */}
          <select
            value={filterEmployeeId}
            onChange={(e) => setFilterEmployeeId(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => {
              const desName = getDesignationName(emp);
              return (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {desName ? `- ${desName}` : ''}
                </option>
              );
            })}
          </select>

          {/* Day Filter */}
          <select
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
          >
            <option value="">All Days</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                Day {i + 1}
              </option>
            ))}
          </select>

          {/* Month Filter */}
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
          >
            <option value="">All Months</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>
                {new Date(2000, i, 1).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
          >
            <option value="">All Years</option>
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - i;
              return (
                <option key={year} value={year}>{year}</option>
              );
            })}
          </select>
        </div>
        <div className="mt-3 text-xs text-gray-400 flex items-center justify-between flex-wrap gap-2">
          <span>{filteredAttendance.length} records found</span>
          {(filterEmployeeId || filterDay || filterMonth || filterYear || searchQuery) && (
            <button
              onClick={() => {
                setFilterEmployeeId('');
                setFilterDay('');
                setFilterMonth('');
                setFilterYear('');
                setSearchQuery('');
              }}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <X size={14} />
              Clear All Filters
            </button>
          )}
        </div>
      </motion.div>

      {/* ========== ATTENDANCE TABLE ========== */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Attendance Records
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {filterEmployeeId || filterDay || filterMonth || filterYear ? 'Filtered' : 'All Records'}
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {filteredAttendance.length} records found
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
          
          {paginatedData.length > 0 ? (
            <>
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
                    {paginatedData.map((record) => (
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
                              onClick={() => confirmDelete(record.id, record.employee_name || record.name)}
                              className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ========== PAGINATION ========== */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="text-sm text-gray-500">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> results
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg border transition-colors ${
                        currentPage === 1
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {totalPages > 5 && currentPage < totalPages - 2 && (
                      <span className="text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg border transition-colors ${
                        currentPage === totalPages
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Clock size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">No attendance records found</p>
              <p className="text-sm text-gray-400 mt-1">
                {filterEmployeeId || filterDay || filterMonth || filterYear || searchQuery
                  ? 'Try adjusting your filters'
                  : 'Add attendance records to get started'}
              </p>
              <button
                onClick={() => openAttendanceForm()}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} />
                Add First Record
              </button>
            </div>
          )}
        </div>

        {/* ========== PREVIOUS MONTHS SECTION ========== */}
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
                  
                  {loadingPrevious ? (
                    <div className="text-center py-8">
                      <Loader size={24} className="animate-spin text-purple-600 mx-auto" />
                      <p className="text-xs text-gray-400 mt-2">Loading previous records...</p>
                    </div>
                  ) : filteredPreviousAttendance.length > 0 ? (
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
                          {filteredPreviousAttendance.slice(0, 50).map((record) => (
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
                                    onClick={() => confirmDelete(record.id, record.employee_name || record.name)}
                                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-purple-50/50">
                          <tr>
                            <td colSpan="6" className="py-2 px-4 text-xs text-purple-600 font-medium">
                              Total: {filteredPreviousAttendance.length} records (showing first 50)
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Clock size={28} className="mx-auto mb-2 text-gray-300" />
                      <p className="font-medium">No previous attendance records</p>
                      <p className="text-xs mt-1">Records from previous months will appear here</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* ========== ATTENDANCE FORM MODAL ========== */}
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
                    {/* ========== EMPLOYEE SELECT WITH SEARCH ========== */}
                    <div className="relative" ref={employeeSearchRef}>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <User size={14} className="inline mr-1" /> Employee *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search employee..."
                          value={employeeSearchQuery}
                          onChange={(e) => {
                            setEmployeeSearchQuery(e.target.value);
                            setIsEmployeeDropdownOpen(true);
                            if (e.target.value === '') {
                              setAttendanceForm({ ...attendanceForm, employeeId: '', employeeName: '' });
                            }
                          }}
                          onFocus={() => setIsEmployeeDropdownOpen(true)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white pr-8"
                          disabled={submitting || isEditingAttendance}
                        />
                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      
                      {isEditingAttendance && (
                        <p className="text-xs text-gray-400 mt-1">Employee cannot be changed while editing</p>
                      )}

                      {/* ========== DROPDOWN ========== */}
                      {isEmployeeDropdownOpen && !isEditingAttendance && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((emp) => {
                              const desName = getDesignationName(emp);
                              return (
                                <button
                                  key={emp.id}
                                  type="button"
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 transition-colors flex items-center gap-2 border-b border-gray-50 last:border-0"
                                  onClick={() => selectEmployee(emp)}
                                >
                                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600 flex-shrink-0">
                                    {emp.name?.charAt(0).toUpperCase() || 'U'}
                                  </div>
                                  <span className="text-gray-700">{emp.name}</span>
                                  {desName && (
                                    <span className="text-xs text-gray-400 ml-auto">{desName}</span>
                                  )}
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                              {employeeSearchQuery ? 'No employees found' : 'Type to search employees'}
                            </div>
                          )}
                        </div>
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

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
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
                    Delete Attendance Record
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete this attendance record for{' '}
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
                      onClick={handleDeleteAttendance}
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