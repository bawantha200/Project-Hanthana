import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Search, Plus, X, User, Edit, Trash2, 
  CheckCircle, AlertCircle, Loader, RefreshCw, History,
  ChevronDown, ChevronUp, Save, FileText, Clock,
  Filter, Eye, Check, X as XIcon, MessageSquare,
  Users, PieChart, TrendingUp, Briefcase, Info,
  AlertTriangle, ChevronLeft, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = 'http://localhost:5000/api';
const EMPLOYEES_API = `${API_BASE_URL}/employees`;
const LEAVE_API = `${API_BASE_URL}/leaves`;
const LEAVE_BALANCE_API = `${API_BASE_URL}/leaves/balance`;

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

// ========== LEAVE TYPES WITH ICONS ==========
const LEAVE_TYPES = {
  'Annual Leave': { color: 'blue', maxDays: 14 },
  'Sick Leave': { color: 'red', maxDays: 7 },
  'Casual Leave': { color: 'green', maxDays: 5 },
  'Maternity Leave': { color: 'pink', maxDays: 84 },
  'Paternity Leave': { color: 'purple', maxDays: 3 },
  'Bereavement Leave': { color: 'gray', maxDays: 3 },
  'Public Holiday': { color: 'orange', maxDays: 5 },
  'Other': { color: 'gray', maxDays: 10 },
};

// ========== LEAVE STATUS ==========
const LEAVE_STATUS = {
  'approved': { label: 'Approved', color: 'emerald', icon: '✅' },
  'pending': { label: 'Pending', color: 'amber', icon: '⏳' },
  'rejected': { label: 'Rejected', color: 'red', icon: '❌' },
  'cancelled': { label: 'Cancelled', color: 'gray', icon: '🚫' },
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

// ===== API FUNCTIONS FOR REACT QUERY =====
const fetchEmployees = async () => {
  const response = await axios.get(EMPLOYEES_API, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to fetch employees');
  return response.data.data || [];
};

const fetchLeaves = async () => {
  const response = await axios.get(LEAVE_API, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to fetch leaves');
  return response.data.data || [];
};

const fetchLeaveBalance = async (employeeId) => {
  if (!employeeId) return null;
  const response = await axios.get(`${LEAVE_BALANCE_API}/${employeeId}`, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to fetch leave balance');
  return response.data.data;
};

const createLeave = async (leaveData) => {
  const response = await axios.post(LEAVE_API, leaveData, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to create leave request');
  return response.data.data;
};

const updateLeave = async ({ id, data }) => {
  const response = await axios.put(`${LEAVE_API}/${id}`, data, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to update leave request');
  return response.data.data;
};

const deleteLeave = async (id) => {
  const response = await axios.delete(`${LEAVE_API}/${id}`, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to delete leave request');
  return response.data;
};

const updateLeaveStatus = async ({ id, status }) => {
  const response = await axios.put(`${LEAVE_API}/${id}`, { status }, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to update leave status');
  return response.data.data;
};

export default function Leave() {
  const queryClient = useQueryClient();

  // ========== STATE ==========
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ========== PAGINATION STATE ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ========== PREVIOUS PAGINATION STATE ==========
  const [prevCurrentPage, setPrevCurrentPage] = useState(1);
  const [prevItemsPerPage, setPrevItemsPerPage] = useState(10);

  // ========== EMPLOYEE SEARCH STATE ==========
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeSearchRef = useRef(null);

  // ========== LEAVE BALANCE STATE ==========
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [balanceError, setBalanceError] = useState(null);

  // ========== PREVIOUS MONTHS STATE ==========
  const [showPreviousLeaves, setShowPreviousLeaves] = useState(false);
  const [previousLeaveData, setPreviousLeaveData] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // ========== FORM STATES ==========
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [isEditingLeave, setIsEditingLeave] = useState(false);
  const [editingLeaveId, setEditingLeaveId] = useState(null);

  // ========== VIEW DETAILS STATE ==========
  const [showLeaveDetails, setShowLeaveDetails] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  // ========== DELETE CONFIRMATION ==========
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');

  // ========== LEAVE FORM DATA ==========
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    employeeName: '',
    leaveType: 'Annual Leave',
    startDate: '',
    endDate: '',
    reason: '',
    status: 'approved',
    days: 1
  });

  // ===== REACT QUERY HOOKS =====

  // 1. Employees Query (cached 5 minutes)
  const {
    data: employees = [],
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees,
  } = useQuery({
    queryKey: ['leave-employees'],
    queryFn: fetchEmployees,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // 2. Leaves Query (poll every 10 seconds)
  const {
    data: leaveData = [],
    isLoading: leavesLoading,
    error: leavesError,
    refetch: refetchLeaves,
    isFetching: isLeavesFetching,
    dataUpdatedAt: leavesUpdatedAt,
  } = useQuery({
    queryKey: ['leave-records'],
    queryFn: fetchLeaves,
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const loading = employeesLoading || leavesLoading;
  const anyError = employeesError || leavesError;

  // ===== MUTATIONS =====

  // Create Leave
  const createLeaveMutation = useMutation({
    mutationFn: createLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-records'] });
      showSuccessNotification('Leave request approved successfully!');
      setShowLeaveForm(false);
      resetLeaveForm();
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        setError('This employee already has a leave request for these dates.');
      } else if (err.response?.status === 400) {
        setError('Missing required fields (Please select an Employee).');
      } else {
        setError(err.response?.data?.message || 'Failed to save leave request.');
      }
    },
    onSettled: () => setSubmitting(false),
  });

  // Update Leave
  const updateLeaveMutation = useMutation({
    mutationFn: updateLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-records'] });
      showSuccessNotification('Leave request updated successfully!');
      setShowLeaveForm(false);
      resetLeaveForm();
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to update leave request.');
    },
    onSettled: () => setSubmitting(false),
  });

  // Delete Leave
  const deleteLeaveMutation = useMutation({
    mutationFn: deleteLeave,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-records'] });
      showSuccessNotification('Leave request deleted successfully!');
      setShowDeleteConfirm(false);
      setDeleteId(null);
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to delete leave request.');
    },
    onSettled: () => setSubmitting(false),
  });

  // Update Leave Status
  const updateStatusMutation = useMutation({
    mutationFn: updateLeaveStatus,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['leave-records'] });
      showSuccessNotification(`Leave request ${variables.status}!`);
      setShowLeaveDetails(false);
      setSelectedLeave(null);
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to update leave status.');
    },
    onSettled: () => setSubmitting(false),
  });

  // ========== FETCH PREVIOUS MONTHS DATA ==========
  const fetchPreviousLeaves = async () => {
    setLoadingPrevious(true);
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const allData = leaveData;
      const previousMonths = allData.filter(record => {
        const recordDate = new Date(record.start_date || record.startDate);
        return recordDate.getMonth() !== currentMonth || recordDate.getFullYear() !== currentYear;
      });
      setPreviousLeaveData(previousMonths);
      setPrevCurrentPage(1);
    } catch (err) {
      console.error('Error fetching previous leaves:', err);
      setError('Failed to load previous leave data.');
    } finally {
      setLoadingPrevious(false);
    }
  };

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  // ========== CALCULATE LEAVE DAYS ==========
  useEffect(() => {
    if (leaveForm.startDate && leaveForm.endDate) {
      const start = new Date(leaveForm.startDate);
      const end = new Date(leaveForm.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setLeaveForm(prev => ({ ...prev, days: diffDays }));
    }
  }, [leaveForm.startDate, leaveForm.endDate]);

  // ========== FETCH BALANCE WHEN EMPLOYEE SELECTED ==========
  useEffect(() => {
    const loadBalance = async () => {
      if (!leaveForm.employeeId) {
        setLeaveBalance(null);
        setBalanceError(null);
        return;
      }
      
      setLoadingBalance(true);
      setBalanceError(null);
      
      try {
        const balance = await fetchLeaveBalance(leaveForm.employeeId);
        setLeaveBalance(balance);
      } catch (err) {
        console.error('Error fetching leave balance:', err);
        if (err.response?.status === 401) {
          setBalanceError('Session expired. Please login again.');
        } else if (err.response?.status === 404) {
          setBalanceError('Balance API not found. Please check server.');
        } else if (err.response?.status === 500) {
          setBalanceError('Server error. Please contact support.');
        } else if (err.response?.status === 403) {
          setBalanceError('Access denied. Please login again.');
        } else {
          setBalanceError(err.response?.data?.message || 'Could not load leave balance. Please try again.');
        }
        setLeaveBalance(null);
      } finally {
        setLoadingBalance(false);
      }
    };
    
    loadBalance();
  }, [leaveForm.employeeId]);

  // ========== CHECK IF DAYS EXCEED BALANCE ==========
  const getBalanceValidation = () => {
    if (!leaveBalance || !leaveForm.employeeId) return null;
    
    const selectedType = leaveForm.leaveType;
    const balance = leaveBalance[selectedType];
    
    if (!balance) return null;
    
    const requestedDays = leaveForm.days || 1;
    const availableDays = balance.remaining;
    
    if (requestedDays > availableDays) {
      return {
        isExceeded: true,
        message: `You have only ${availableDays} ${selectedType} day(s) remaining. You are requesting ${requestedDays} days.`,
        available: availableDays,
        requested: requestedDays
      };
    }
    
    if (availableDays === 0) {
      return {
        isExceeded: true,
        message: `No ${selectedType} days remaining. You have used all ${balance.max} days.`,
        available: 0,
        requested: requestedDays
      };
    }
    
    return null;
  };

  const balanceValidation = getBalanceValidation();

  // ========== FILTER EMPLOYEES BY SEARCH ==========
  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(employeeSearchQuery.toLowerCase())
  );

  // ========== SELECT EMPLOYEE ==========
  const selectEmployee = (employee) => {
    setLeaveForm({
      ...leaveForm,
      employeeId: employee.id,
      employeeName: employee.name
    });
    setEmployeeSearchQuery(employee.name);
    setIsEmployeeDropdownOpen(false);
  };

  // ========== LEAVE CRUD OPERATIONS ==========

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Balance check
      if (leaveBalance) {
        const selectedType = leaveForm.leaveType;
        const balance = leaveBalance[selectedType];
        
        if (balance) {
          if (leaveForm.days > balance.remaining) {
            setError(`Insufficient ${selectedType} balance! Available: ${balance.remaining} days, Requested: ${leaveForm.days} days.`);
            setSubmitting(false);
            return;
          }
          
          if (balance.remaining === 0) {
            setError(`No ${selectedType} days remaining. You have used all ${balance.max} days.`);
            setSubmitting(false);
            return;
          }
        }
      }

      const data = {
        employeeId: parseInt(leaveForm.employeeId),
        employeeName: leaveForm.employeeName,
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason,
        status: 'approved',
        days: leaveForm.days
      };

      if (isEditingLeave && editingLeaveId) {
        const { employeeId, ...updateData } = data;
        updateLeaveMutation.mutate({ id: editingLeaveId, data: updateData });
      } else {
        createLeaveMutation.mutate(data);
      }
    } catch (err) {
      console.error('Error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to save leave request.');
      }
      setSubmitting(false);
    }
  };

  const handleDeleteLeave = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    deleteLeaveMutation.mutate(deleteId);
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setSubmitting(true);
    updateStatusMutation.mutate({ id, status: newStatus });
  };

  const editLeave = (record) => {
    setIsEditingLeave(true);
    setEditingLeaveId(record.id);
    setEmployeeSearchQuery(record.employee_name || record.name || '');
    setLeaveForm({
      employeeId: record.employee_id || record.employeeId || '',
      employeeName: record.employee_name || record.name || '',
      leaveType: record.leave_type || record.leaveType || 'Annual Leave',
      startDate: record.start_date || record.startDate || '',
      endDate: record.end_date || record.endDate || '',
      reason: record.reason || '',
      status: 'approved',
      days: record.days || 1
    });
    setShowLeaveForm(true);
  };

  const viewLeaveDetails = (record) => {
    setSelectedLeave(record);
    setShowLeaveDetails(true);
  };

  // ========== FORM RESET FUNCTIONS ==========

  const resetLeaveForm = () => {
    setLeaveForm({
      employeeId: '',
      employeeName: '',
      leaveType: 'Annual Leave',
      startDate: '',
      endDate: '',
      reason: '',
      status: 'approved',
      days: 1
    });
    setEmployeeSearchQuery('');
    setLeaveBalance(null);
    setBalanceError(null);
    setIsEditingLeave(false);
    setEditingLeaveId(null);
    setIsEmployeeDropdownOpen(false);
  };

  const showSuccessNotification = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  };

  // ========== OPEN FORM FUNCTIONS ==========

  const openLeaveForm = (employee = null) => {
    if (employee) {
      setEmployeeSearchQuery(employee.name);
      setLeaveForm({
        employeeId: employee.id,
        employeeName: employee.name,
        leaveType: 'Annual Leave',
        startDate: '',
        endDate: '',
        reason: '',
        status: 'approved',
        days: 1
      });
    } else {
      setEmployeeSearchQuery('');
      setLeaveForm({
        employeeId: '',
        employeeName: '',
        leaveType: 'Annual Leave',
        startDate: '',
        endDate: '',
        reason: '',
        status: 'approved',
        days: 1
      });
    }
    setShowLeaveForm(true);
  };

  const confirmDelete = (id, name) => {
    setDeleteId(id);
    setDeleteName(name);
    setShowDeleteConfirm(true);
  };

  const togglePreviousLeaves = () => {
    const newState = !showPreviousLeaves;
    setShowPreviousLeaves(newState);
    if (newState) {
      fetchPreviousLeaves();
    }
  };

  // ========== FILTER DATA ==========

  const getCurrentMonthData = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return leaveData.filter(record => {
      if (!record.start_date && !record.startDate) return false;
      const date = new Date(record.start_date || record.startDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
  };

  const currentMonthLeaves = getCurrentMonthData();

  // ========== FILTER CURRENT MONTH ==========
  const filteredCurrentLeaves = currentMonthLeaves.filter((rec) => {
    const matchesSearch = (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
    const matchesType = typeFilter === 'all' || (rec.leave_type || rec.leaveType) === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // ========== FILTER PREVIOUS MONTHS ==========
  const filteredPreviousLeaves = previousLeaveData.filter((rec) => {
    const matchesSearch = (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || rec.status === statusFilter;
    const matchesType = typeFilter === 'all' || (rec.leave_type || rec.leaveType) === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // ========== PAGINATION FOR CURRENT MONTH ==========
  const totalItems = filteredCurrentLeaves.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredCurrentLeaves.slice(startIndex, endIndex);

  // ========== PAGINATION FOR PREVIOUS MONTHS ==========
  const prevTotalItems = filteredPreviousLeaves.length;
  const prevTotalPages = Math.ceil(prevTotalItems / prevItemsPerPage);
  const prevStartIndex = (prevCurrentPage - 1) * prevItemsPerPage;
  const prevEndIndex = prevStartIndex + prevItemsPerPage;
  const paginatedPrevData = filteredPreviousLeaves.slice(prevStartIndex, prevEndIndex);

  // Reset pages when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  useEffect(() => {
    setPrevCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter]);

  // ========== PAGE NUMBER FUNCTIONS ==========
  const getPageNumbers = (total, current) => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (total <= maxPagesToShow) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let startPage = Math.max(2, current - 1);
      let endPage = Math.min(total - 1, current + 1);
      
      if (current <= 3) {
        startPage = 2;
        endPage = 4;
      }
      
      if (current >= total - 2) {
        startPage = total - 3;
        endPage = total - 1;
      }
      
      if (startPage > 2) {
        pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < total - 1) {
        pages.push('...');
      }
      
      pages.push(total);
    }
    
    return pages;
  };

  // ========== SUMMARY STATISTICS ==========

  const totalLeaves = currentMonthLeaves.length;
  const pendingLeaves = currentMonthLeaves.filter(l => l.status === 'pending').length;
  const approvedLeaves = currentMonthLeaves.filter(l => l.status === 'approved').length;
  const rejectedLeaves = currentMonthLeaves.filter(l => l.status === 'rejected').length;
  const totalDays = currentMonthLeaves.reduce((sum, l) => sum + (l.days || 1), 0);

  const leaveTypeBreakdown = {};
  currentMonthLeaves.forEach(l => {
    const type = l.leave_type || l.leaveType || 'Other';
    leaveTypeBreakdown[type] = (leaveTypeBreakdown[type] || 0) + 1;
  });

  const summaryCards = [
    { key: 'total', label: 'All Requests', value: totalLeaves, icon: FileText, bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
    { key: 'pending', label: 'Pending', value: pendingLeaves, icon: Clock, bgClass: 'bg-amber-50', textClass: 'text-amber-600' },
    { key: 'approved', label: 'Approved', value: approvedLeaves, icon: CheckCircle, bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
    { key: 'rejected', label: 'Rejected', value: rejectedLeaves, icon: XIcon, bgClass: 'bg-red-50', textClass: 'text-red-600' },
  ];

  // ========== GET LAST UPDATED TIME ==========
  const lastUpdated = leavesUpdatedAt ? new Date(leavesUpdatedAt).toLocaleTimeString() : 'Never';

  // ========== LOADING ==========

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader size={48} className="text-indigo-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading leave data...</p>
        </div>
      </div>
    );
  }

  // ========== ERROR STATE ==========
  if (anyError) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle size={48} className="text-red-500" />
        <p className="text-gray-600">Failed to load data: {anyError.message}</p>
        <button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['leave-records'] });
            queryClient.invalidateQueries({ queryKey: ['leave-employees'] });
          }}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // ========== RENDER ==========

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      
      {/* ========== SUCCESS NOTIFICATION ========== */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="fixed top-20 right-4 z-50 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
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
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800"><X size={16} /></button>
        </div>
      )}

      {/* ========== HEADER ========== */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage employee leave requests, approvals, and tracking</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${isLeavesFetching ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                <span className="text-xs text-gray-400">{isLeavesFetching ? 'Updating...' : 'Live'}</span>
              </div>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-400">Last updated: {lastUpdated}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLeavesFetching && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Loader size={12} className="animate-spin" />
                Syncing...
              </span>
            )}
            <button onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['leave-records'] });
              queryClient.invalidateQueries({ queryKey: ['leave-employees'] });
              showSuccessNotification('Leaves refreshed successfully!');
            }} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
              <RefreshCw size={16} className={isLeavesFetching ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => { if (employees.length > 0) { openLeaveForm(employees[0]); } else { setError('No employees available. Please add employees first.'); } }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
              <Plus size={16} /> New Leave Request
            </button>
          </div>
        </div>
      </motion.div>

      {/* ========== SUMMARY CARDS ========== */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.key} variants={itemVariants} className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bgClass} flex items-center justify-center flex-shrink-0`}><Icon size={18} className={card.textClass} /></div>
                <div className="min-w-0"><p className="text-xs text-gray-400 font-medium truncate">{card.label}</p><p className="text-sm font-bold text-gray-900 truncate">{card.value}</p></div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ========== LEAVE TYPE BREAKDOWN ========== */}
      {Object.keys(leaveTypeBreakdown).length > 0 && (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2"><PieChart size={16} className="text-indigo-600" /> Leave Type Breakdown</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(leaveTypeBreakdown).map(([type, count]) => {
              const leaveInfo = LEAVE_TYPES[type] || LEAVE_TYPES['Other'];
              return (<span key={type} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-medium"><span>{leaveInfo.icon}</span><span>{type}</span><span className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">{count}</span></span>);
            })}
          </div>
        </motion.div>
      )}

      {/* ========== FILTERS ========== */}
      <motion.div variants={itemVariants} className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by employee name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white" />
        </div>
        <div className="flex items-center gap-2"><Filter size={14} className="text-gray-400" /><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select></div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white"><option value="all">All Types</option>{Object.keys(LEAVE_TYPES).map((type) => (<option key={type} value={type}>{type}</option>))}</select>
        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-gray-400">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </motion.div>

      {/* ========== CURRENT MONTH LEAVE RECORDS ========== */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Current Month Leave Records
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </span>
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">{filteredCurrentLeaves.length} records found</p>
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
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                      <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                      <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((record) => {
                      const leaveTypeInfo = LEAVE_TYPES[record.leave_type || record.leaveType] || LEAVE_TYPES['Other'];
                      return (
                        <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-6 font-medium text-gray-900">{record.employee_name || record.name}</td>
                          <td className="py-3 px-6"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"><span>{leaveTypeInfo.icon}</span>{record.leave_type || record.leaveType}</span></td>
                          <td className="py-3 px-6 text-gray-600">{record.start_date || record.startDate}</td>
                          <td className="py-3 px-6 text-gray-600">{record.end_date || record.endDate}</td>
                          <td className="py-3 px-6 text-center font-medium text-gray-700">{record.days || 1}</td>
                          <td className="py-3 px-6"><div className="flex items-center justify-center gap-1.5">
                              <button onClick={() => viewLeaveDetails(record)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="View Details"><Eye size={15} /></button>
                              <button onClick={() => editLeave(record)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit size={15} /></button>
                              <button onClick={() => confirmDelete(record.id, record.employee_name || record.name)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={15} /></button>
                          </div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot><tr className="border-t border-gray-200 bg-gray-50/50"><td className="py-3 px-6 font-semibold text-gray-900">Total</td><td className="py-3 px-6"></td><td className="py-3 px-6"></td><td className="py-3 px-6"></td><td className="py-3 px-6 text-center font-semibold text-gray-900">{paginatedData.reduce((sum, l) => sum + (l.days || 1), 0)} days</td><td className="py-3 px-6 text-center text-sm text-gray-400">{paginatedData.length} requests</td></tr></tfoot>
                </table>
              </div>

              {/* ========== CURRENT MONTH PAGINATION ========== */}
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
                    {getPageNumbers(totalPages, currentPage).map((page, index) => (
                      typeof page === 'number' ? (
                        <button
                          key={index}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white shadow-sm'
                              : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ) : (
                        <span key={index} className="px-1 text-gray-400">…</span>
                      )
                    ))}
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
              <Calendar size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">No leave requests for current month</p>
              <p className="text-sm text-gray-400 mt-1">Submit a leave request to get started</p>
              <button onClick={() => openLeaveForm()} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"><Plus size={16} /> New Leave Request</button>
            </div>
          )}
        </div>
      </motion.div>

      {/* ========== PREVIOUS MONTHS LEAVE RECORDS ========== */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <button onClick={togglePreviousLeaves} className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 hover:border-indigo-200 rounded-2xl transition-all duration-300 group">
          <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors"><History size={20} className="text-indigo-600" /></div><div className="text-left"><p className="font-medium text-gray-800">Previous Months Leave Records</p><p className="text-xs text-gray-500">{showPreviousLeaves ? 'Hide' : 'View'} historical leave records{previousLeaveData.length > 0 && !showPreviousLeaves && (<span className="ml-2 text-indigo-600 font-medium">({previousLeaveData.length} records)</span>)}</p></div></div>
          <div className="flex items-center gap-2">{loadingPrevious && (<Loader size={16} className="animate-spin text-indigo-600" />)}{showPreviousLeaves ? (<ChevronUp size={20} className="text-indigo-600" />) : (<ChevronDown size={20} className="text-indigo-600" />)}</div>
        </button>

        <AnimatePresence>
          {showPreviousLeaves && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
              <div className="mt-4 bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
                <div className="p-4 border-b border-indigo-50 bg-indigo-50/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">
                        <History size={16} className="inline mr-2 text-indigo-600" />
                        Previous Months Leave Records
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">{filteredPreviousLeaves.length} records found</p>
                    </div>
                    <button onClick={fetchPreviousLeaves} className="p-1.5 hover:bg-indigo-100 rounded-lg transition-colors" title="Refresh"><RefreshCw size={14} className="text-indigo-500" /></button>
                  </div>
                </div>
                
                {loadingPrevious ? (
                  <div className="text-center py-8"><Loader size={24} className="animate-spin text-indigo-600 mx-auto" /><p className="text-xs text-gray-400 mt-2">Loading previous records...</p></div>
                ) : paginatedPrevData.length > 0 ? (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-indigo-50">
                          <tr>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-indigo-700 uppercase tracking-wider">Employee</th>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-indigo-700 uppercase tracking-wider">Leave Type</th>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-indigo-700 uppercase tracking-wider">Start Date</th>
                            <th className="text-left py-2.5 px-4 text-xs font-medium text-indigo-700 uppercase tracking-wider">End Date</th>
                            <th className="text-center py-2.5 px-4 text-xs font-medium text-indigo-700 uppercase tracking-wider">Days</th>
                            <th className="text-center py-2.5 px-4 text-xs font-medium text-indigo-700 uppercase tracking-wider">Status</th>
                            <th className="text-center py-2.5 px-4 text-xs font-medium text-indigo-700 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPrevData.map((record) => {
                            const leaveTypeInfo = LEAVE_TYPES[record.leave_type || record.leaveType] || LEAVE_TYPES['Other'];
                            const statusInfo = LEAVE_STATUS[record.status] || { label: record.status, color: 'gray', icon: '📋' };
                            const statusColor = statusInfo.color === 'emerald' ? 'bg-emerald-50 text-emerald-700' : statusInfo.color === 'amber' ? 'bg-amber-50 text-amber-700' : statusInfo.color === 'red' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700';
                            return (<tr key={record.id} className="border-b border-indigo-50 hover:bg-indigo-50/30 transition-colors">
                              <td className="py-2.5 px-4 font-medium text-gray-800">{record.employee_name || record.name}</td>
                              <td className="py-2.5 px-4"><span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"><span>{leaveTypeInfo.icon}</span>{record.leave_type || record.leaveType}</span></td>
                              <td className="py-2.5 px-4 text-gray-600">{record.start_date || record.startDate}</td>
                              <td className="py-2.5 px-4 text-gray-600">{record.end_date || record.endDate}</td>
                              <td className="py-2.5 px-4 text-center font-medium text-gray-700">{record.days || 1}</td>
                              <td className="py-2.5 px-4 text-center"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor}`}><span>{statusInfo.icon}</span>{statusInfo.label}</span></td>
                              <td className="py-2.5 px-4"><div className="flex items-center justify-center gap-1.5"><button onClick={() => viewLeaveDetails(record)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="View Details"><Eye size={14} /></button><button onClick={() => editLeave(record)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors" title="Edit"><Edit size={14} /></button><button onClick={() => confirmDelete(record.id, record.employee_name || record.name)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 size={14} /></button></div></td>
                            </tr>);
                          })}
                        </tbody>
                        <tfoot className="bg-indigo-50/50"><tr><td colSpan="7" className="py-2 px-4 text-xs text-indigo-600 font-medium">Total: {paginatedPrevData.length} records</td></tr></tfoot>
                      </table>
                    </div>

                    {/* ========== PREVIOUS MONTHS PAGINATION ========== */}
                    {prevTotalPages > 1 && (
                      <div className="px-4 py-3 border-t border-indigo-100 flex items-center justify-between flex-wrap gap-2">
                        <div className="text-xs text-gray-500">
                          Showing <span className="font-medium">{prevStartIndex + 1}</span> to{' '}
                          <span className="font-medium">{Math.min(prevEndIndex, prevTotalItems)}</span> of{' '}
                          <span className="font-medium">{prevTotalItems}</span> results
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPrevCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={prevCurrentPage === 1}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              prevCurrentPage === 1
                                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            <ChevronLeft size={14} />
                          </button>
                          {getPageNumbers(prevTotalPages, prevCurrentPage).map((page, index) => (
                            typeof page === 'number' ? (
                              <button
                                key={index}
                                onClick={() => setPrevCurrentPage(page)}
                                className={`w-7 h-7 text-xs font-medium rounded-lg transition-colors ${
                                  prevCurrentPage === page
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'border border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                              >
                                {page}
                              </button>
                            ) : (
                              <span key={index} className="px-1 text-gray-400 text-xs">…</span>
                            )
                          ))}
                          <button
                            onClick={() => setPrevCurrentPage(prev => Math.min(prevTotalPages, prev + 1))}
                            disabled={prevCurrentPage === prevTotalPages}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              prevCurrentPage === prevTotalPages
                                ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                                : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                            }`}
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar size={28} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">No previous leave records</p>
                    <p className="text-xs mt-1">Records from previous months will appear here</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ========== LEAVE FORM MODAL ========== */}
      <AnimatePresence>
        {showLeaveForm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" onClick={() => { if (!submitting && !createLeaveMutation.isPending && !updateLeaveMutation.isPending) { setShowLeaveForm(false); resetLeaveForm(); } }} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="fixed inset-4 md:inset-10 lg:inset-20 xl:inset-28 bg-white rounded-3xl shadow-2xl z-50 overflow-y-auto">
              <div className="relative p-6 md:p-8">
                <button onClick={() => { if (!submitting && !createLeaveMutation.isPending && !updateLeaveMutation.isPending) { setShowLeaveForm(false); resetLeaveForm(); } }} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10" disabled={submitting || createLeaveMutation.isPending || updateLeaveMutation.isPending}><X size={24} className="text-gray-400" /></button>
                <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Calendar size={20} className="text-blue-600" /></div><h2 className="text-xl font-semibold text-gray-900">{isEditingLeave ? 'Edit Leave Request' : 'New Leave Request'}</h2></div>

                <form onSubmit={handleLeaveSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ========== EMPLOYEE SELECT WITH SEARCH ========== */}
                    <div className="relative" ref={employeeSearchRef}>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5"><User size={14} className="inline mr-1" /> Employee *</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search employee..."
                          value={employeeSearchQuery}
                          onChange={(e) => {
                            setEmployeeSearchQuery(e.target.value);
                            setIsEmployeeDropdownOpen(true);
                            if (e.target.value === '') {
                              setLeaveForm({ ...leaveForm, employeeId: '', employeeName: '' });
                            }
                          }}
                          onFocus={() => setIsEmployeeDropdownOpen(true)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white pr-8"
                          disabled={submitting || isEditingLeave || createLeaveMutation.isPending || updateLeaveMutation.isPending}
                        />
                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      
                      {isEditingLeave && (
                        <p className="text-xs text-gray-400 mt-1">Employee cannot be changed while editing</p>
                      )}

                      {/* ========== DROPDOWN ========== */}
                      {isEmployeeDropdownOpen && !isEditingLeave && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredEmployees.length > 0 ? (
                            filteredEmployees.map((emp) => {
                              const desName = getDesignationName(emp);
                              return (
                                <button
                                  key={emp.id}
                                  type="button"
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-indigo-50 transition-colors flex items-center gap-2 border-b border-gray-50 last:border-0"
                                  onClick={() => selectEmployee(emp)}
                                >
                                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-medium text-indigo-600 flex-shrink-0">
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

                    {/* ========== LEAVE TYPE ========== */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5"><Briefcase size={14} className="inline mr-1" /> Leave Type *</label>
                      <select 
                        value={leaveForm.leaveType} 
                        onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })} 
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all bg-white" 
                        required 
                        disabled={submitting || createLeaveMutation.isPending || updateLeaveMutation.isPending}
                      >
                        {Object.keys(LEAVE_TYPES).map((type) => {
                          const info = LEAVE_TYPES[type];
                          const balance = leaveBalance ? leaveBalance[type] : null;
                          const remaining = balance ? balance.remaining : info.maxDays;
                          const isExhausted = balance ? balance.isExhausted : false;
                          return (
                            <option key={type} value={type} disabled={isExhausted}>
                              {info.icon} {type} (Available: {remaining} / {info.maxDays} days)
                            </option>
                          );
                        })}
                      </select>
                      {loadingBalance && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Loader size={12} className="animate-spin" /> Loading balance...
                        </p>
                      )}
                      {balanceError && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} /> {balanceError}
                        </p>
                      )}
                    </div>

                    {/* ========== START DATE ========== */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5"><Calendar size={14} className="inline mr-1" /> Start Date *</label>
                      <input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" required disabled={submitting || createLeaveMutation.isPending || updateLeaveMutation.isPending} />
                    </div>

                    {/* ========== END DATE ========== */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5"><Calendar size={14} className="inline mr-1" /> End Date *</label>
                      <input type="date" value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all" required disabled={submitting || createLeaveMutation.isPending || updateLeaveMutation.isPending} />
                    </div>

                    {/* ========== TOTAL DAYS ========== */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5"><Clock size={14} className="inline mr-1" /> Total Days (Auto-calculated)</label>
                      <div className={`px-4 py-2.5 border rounded-lg text-sm font-medium ${
                        balanceValidation?.isExceeded 
                          ? 'bg-red-50 border-red-300 text-red-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-700'
                      }`}>
                        {leaveForm.days} day{leaveForm.days > 1 ? 's' : ''}
                        {balanceValidation?.isExceeded && (
                          <span className="ml-2 text-xs text-red-600 font-normal">
                            (Exceeds available: {balanceValidation.available} days)
                          </span>
                        )}
                      </div>
                      {balanceValidation?.isExceeded && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          {balanceValidation.message}
                        </p>
                      )}
                    </div>

                    {/* ========== STATUS - ONLY APPROVED ========== */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5"><CheckCircle size={14} className="inline mr-1" /> Status</label>
                      <div className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium text-emerald-700 flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-600" />
                        Approved
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Leave requests are automatically approved</p>
                    </div>

                    {/* ========== REASON ========== */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5"><FileText size={14} className="inline mr-1" /> Reason / Description</label>
                      <textarea value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} rows="3" placeholder="Please provide reason for leave request..." className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-none" disabled={submitting || createLeaveMutation.isPending || updateLeaveMutation.isPending} />
                    </div>
                  </div>

                  {/* ========== LEAVE BALANCE DISPLAY ========== */}
                  {loadingBalance && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2">
                        <Loader size={16} className="animate-spin text-blue-500" />
                        <span className="text-sm text-blue-700">Loading leave balance...</span>
                      </div>
                    </div>
                  )}

                  {balanceError && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-700">Error Loading Balance</p>
                          <p className="text-xs text-red-600">{balanceError}</p>
                          <button 
                            onClick={() => {
                              if (leaveForm.employeeId) {
                                setLoadingBalance(true);
                                fetchLeaveBalance(leaveForm.employeeId)
                                  .then(setLeaveBalance)
                                  .catch(err => setBalanceError(err.message))
                                  .finally(() => setLoadingBalance(false));
                              }
                            }}
                            className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {leaveBalance && !loadingBalance && !balanceError && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <Info size={16} className="text-blue-500" />
                        Leave Balance Summary
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {Object.entries(leaveBalance).map(([type, data]) => {
                          const info = LEAVE_TYPES[type] || LEAVE_TYPES['Other'];
                          const isLow = data.remaining <= 2 && data.remaining > 0;
                          const isExhausted = data.remaining === 0;
                          return (
                            <div key={type} className={`px-3 py-2 rounded-lg text-xs ${isExhausted ? 'bg-red-50 border border-red-200' : isLow ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-gray-200'}`}>
                              <div className="flex items-center gap-1">
                                <span>{info.icon}</span>
                                <span className="font-medium text-gray-700">{type}</span>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={`font-bold ${isExhausted ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'}`}>
                                  {data.remaining}
                                </span>
                                <span className="text-gray-400">/ {data.max}</span>
                                <span className="text-[10px] text-gray-400">used: {data.used}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ========== BALANCE WARNING ========== */}
                  {balanceValidation?.isExceeded && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-700">Insufficient Leave Balance</p>
                        <p className="text-xs text-red-600">{balanceValidation.message}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button type="button" onClick={() => { if (!submitting && !createLeaveMutation.isPending && !updateLeaveMutation.isPending) { setShowLeaveForm(false); resetLeaveForm(); } }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" disabled={submitting || createLeaveMutation.isPending || updateLeaveMutation.isPending}>Cancel</button>
                    <motion.button 
                      whileHover={{ scale: 1.04 }} 
                      whileTap={{ scale: 0.97 }} 
                      type="submit" 
                      className={`flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                        balanceValidation?.isExceeded 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`} 
                      disabled={submitting || balanceValidation?.isExceeded || createLeaveMutation.isPending || updateLeaveMutation.isPending}
                    >
                      {submitting || createLeaveMutation.isPending || updateLeaveMutation.isPending ? (
                        <><Loader size={16} className="animate-spin" />{isEditingLeave ? 'Updating...' : 'Saving...'}</>
                      ) : (
                        <><Save size={16} />{isEditingLeave ? 'Update Leave' : 'Submit Leave'}</>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========== LEAVE DETAILS MODAL ========== */}
      <AnimatePresence>
        {showLeaveDetails && selectedLeave && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" onClick={() => { setShowLeaveDetails(false); setSelectedLeave(null); }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-4 md:inset-10 lg:inset-20 xl:inset-28 bg-white rounded-3xl shadow-2xl z-50 overflow-y-auto">
              <div className="relative p-6 md:p-8">
                <button onClick={() => { setShowLeaveDetails(false); setSelectedLeave(null); }} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"><X size={24} className="text-gray-400" /></button>
                <div className="flex items-center gap-3 mb-6"><div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center"><FileText size={20} className="text-indigo-600" /></div><h2 className="text-xl font-semibold text-gray-900">Leave Request Details</h2></div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4"><div><p className="text-xs text-gray-400 font-medium">Employee</p><p className="text-sm font-medium text-gray-900">{selectedLeave.employee_name || selectedLeave.name}</p></div><div><p className="text-xs text-gray-400 font-medium">Leave Type</p><p className="text-sm font-medium text-gray-900">{selectedLeave.leave_type || selectedLeave.leaveType}</p></div><div><p className="text-xs text-gray-400 font-medium">Status</p><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${selectedLeave.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : selectedLeave.status === 'pending' ? 'bg-amber-50 text-amber-700' : selectedLeave.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'}`}>{selectedLeave.status === 'approved' && '✅ Approved'}{selectedLeave.status === 'pending' && '⏳ Pending'}{selectedLeave.status === 'rejected' && '❌ Rejected'}{selectedLeave.status === 'cancelled' && '🚫 Cancelled'}</span></div></div>
                  <div className="space-y-4"><div><p className="text-xs text-gray-400 font-medium">Start Date</p><p className="text-sm font-medium text-gray-900">{selectedLeave.start_date || selectedLeave.startDate}</p></div><div><p className="text-xs text-gray-400 font-medium">End Date</p><p className="text-sm font-medium text-gray-900">{selectedLeave.end_date || selectedLeave.endDate}</p></div><div><p className="text-xs text-gray-400 font-medium">Total Days</p><p className="text-sm font-medium text-gray-900">{selectedLeave.days || 1} day{(selectedLeave.days || 1) > 1 ? 's' : ''}</p></div></div>
                  <div className="md:col-span-2"><p className="text-xs text-gray-400 font-medium">Reason</p><div className="mt-1 p-4 bg-gray-50 rounded-lg border border-gray-200"><p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedLeave.reason || 'No reason provided.'}</p></div></div>
                  {selectedLeave.status === 'pending' && (<div className="md:col-span-2 flex items-center justify-end gap-3 pt-4 border-t border-gray-100"><button onClick={() => { handleStatusUpdate(selectedLeave.id, 'rejected'); }} className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors" disabled={submitting || updateStatusMutation.isPending}>Reject</button><button onClick={() => { handleStatusUpdate(selectedLeave.id, 'approved'); }} className="px-4 py-2 text-sm font-medium text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors" disabled={submitting || updateStatusMutation.isPending}>Approve</button></div>)}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      <AnimatePresence>
        {showDeleteConfirm && deleteId && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-md z-50" onClick={() => { if (!submitting && !deleteLeaveMutation.isPending) { setShowDeleteConfirm(false); setDeleteId(null); } }} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="fixed inset-0 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="text-center"><div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"><Trash2 size={32} className="text-red-500" /></div><h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Leave Request</h3><p className="text-sm text-gray-500 mb-6">Are you sure you want to delete this leave request for <span className="font-semibold text-gray-900">{deleteName}</span>? This action cannot be undone.</p><div className="flex items-center justify-center gap-3"><button onClick={() => { if (!submitting && !deleteLeaveMutation.isPending) { setShowDeleteConfirm(false); setDeleteId(null); } }} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" disabled={submitting || deleteLeaveMutation.isPending}>Cancel</button><button onClick={handleDeleteLeave} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50" disabled={submitting || deleteLeaveMutation.isPending}>{submitting || deleteLeaveMutation.isPending ? (<><Loader size={16} className="animate-spin" />Deleting...</>) : ('Delete Record')}</button></div></div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
