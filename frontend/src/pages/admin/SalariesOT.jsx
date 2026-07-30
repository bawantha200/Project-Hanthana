import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Search, Plus, X, User, Calendar, Edit, Trash2, 
  CheckCircle, AlertCircle, Loader, RefreshCw, History,
  ChevronDown, ChevronUp, Save, Briefcase, Clock, Award,
  TrendingUp, Users, ChevronLeft, ChevronRight, CalendarDays,
  Filter
} from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import axios from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE_URL = 'http://localhost:5000/api';
const EMPLOYEES_API = `${API_BASE_URL}/employees`;
const SALARIES_API = `${API_BASE_URL}/salaries`;
const DESIGNATIONS_API = `${API_BASE_URL}/designations`;

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

// ========== GET OT RATE BY DESIGNATION ==========
const getOTRate = (designation, designations = []) => {
  if (!designation) return 500;
  
  if (designations && designations.length > 0) {
    const found = designations.find(d => 
      d.designation && designation.toLowerCase().includes(d.designation.toLowerCase())
    );
    if (found && found.ot_rate) {
      return parseFloat(found.ot_rate);
    }
  }
  
  if (designation.ot_rate) {
    return parseFloat(designation.ot_rate);
  }
  
  return 500;
};

// ========== CALCULATE FINAL SALARY ==========
const calculateFinalSalary = (base, otHours, bonus, otRate) => {
  const baseNum = parseFloat(base) || 0;
  const otNum = parseFloat(otHours) || 0;
  const bonusNum = parseFloat(bonus) || 0;
  const rate = parseFloat(otRate) || 500;
  return baseNum + (otNum * rate) + bonusNum;
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

const fetchDesignations = async () => {
  const response = await axios.get(DESIGNATIONS_API, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to fetch designations');
  return response.data.data || [];
};

const fetchSalaries = async () => {
  const response = await axios.get(SALARIES_API, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to fetch salaries');
  return response.data.data || [];
};

const createSalary = async (salaryData) => {
  const response = await axios.post(SALARIES_API, salaryData, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to create salary');
  return response.data.data;
};

const updateSalary = async ({ id, data }) => {
  const response = await axios.put(`${SALARIES_API}/${id}`, data, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to update salary');
  return response.data.data;
};

const deleteSalary = async (id) => {
  const response = await axios.delete(`${SALARIES_API}/${id}`, getAuthHeaders());
  if (!response.data.success) throw new Error(response.data.message || 'Failed to delete salary');
  return response.data;
};

export default function SalariesOT() {
  const queryClient = useQueryClient();

  // ========== STATE ==========
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ========== PAGINATION STATE ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ========== PREVIOUS MONTHS STATE ==========
  const [showPreviousSalaries, setShowPreviousSalaries] = useState(false);
  const [previousSalaryData, setPreviousSalaryData] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  
  // ========== PREVIOUS MONTHS FILTERS ==========
  const [prevSearchQuery, setPrevSearchQuery] = useState('');
  const [prevFilterEmployeeId, setPrevFilterEmployeeId] = useState('');
  const [prevFilterMonth, setPrevFilterMonth] = useState('');
  const [prevFilterYear, setPrevFilterYear] = useState('');
  
  // ========== PREVIOUS MONTHS PAGINATION ==========
  const [prevCurrentPage, setPrevCurrentPage] = useState(1);
  const [prevItemsPerPage, setPrevItemsPerPage] = useState(10);

  // ========== FORM STATES ==========
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [editingSalaryId, setEditingSalaryId] = useState(null);

  // ========== EMPLOYEE SEARCH STATE FOR FORM ==========
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeSearchRef = useRef(null);

  // ========== DELETE CONFIRMATION ==========
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState('');

  // ========== SALARY FORM DATA ==========
  const [salaryForm, setSalaryForm] = useState({
    employeeId: '',
    employeeName: '',
    designation: '',
    baseSalary: '',
    otHours: '',
    bonus: '',
    finalSalary: '',
    otRate: 500,
    month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  });

  // ===== REACT QUERY HOOKS =====

  // 1. Employees Query (cached 5 minutes)
  const {
    data: employees = [],
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees,
  } = useQuery({
    queryKey: ['salary-employees'],
    queryFn: fetchEmployees,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // 2. Designations Query (cached 10 minutes)
  const {
    data: designations = [],
    isLoading: designationsLoading,
    error: designationsError,
    refetch: refetchDesignations,
  } = useQuery({
    queryKey: ['salary-designations'],
    queryFn: fetchDesignations,
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // 3. Salaries Query (poll every 10 seconds)
  const {
    data: salaryData = [],
    isLoading: salariesLoading,
    error: salariesError,
    refetch: refetchSalaries,
    isFetching: isSalariesFetching,
    dataUpdatedAt: salariesUpdatedAt,
  } = useQuery({
    queryKey: ['salary-records'],
    queryFn: fetchSalaries,
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const loading = employeesLoading || designationsLoading || salariesLoading;
  const anyError = employeesError || designationsError || salariesError;

  // ===== MUTATIONS =====

  // Create Salary
  const createSalaryMutation = useMutation({
    mutationFn: createSalary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      showSuccessNotification('Salary added successfully!');
      setShowSalaryForm(false);
      resetSalaryForm();
    },
    onError: (err) => {
      if (err.response?.status === 409) {
        setError('Salary already recorded for this month.');
      } else {
        setError(err.response?.data?.message || 'Failed to save salary.');
      }
    },
    onSettled: () => setSubmitting(false),
  });

  // Update Salary
  const updateSalaryMutation = useMutation({
    mutationFn: updateSalary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      showSuccessNotification('Salary updated successfully!');
      setShowSalaryForm(false);
      resetSalaryForm();
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to update salary.');
    },
    onSettled: () => setSubmitting(false),
  });

  // Delete Salary
  const deleteSalaryMutation = useMutation({
    mutationFn: deleteSalary,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      showSuccessNotification('Salary record deleted successfully!');
      setShowDeleteConfirm(false);
      setDeleteId(null);
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to delete salary record.');
    },
    onSettled: () => setSubmitting(false),
  });

  // ========== FILTER EMPLOYEES BY SEARCH ==========
  const filteredEmployees = employees.filter(emp => 
    emp.name?.toLowerCase().includes(employeeSearchQuery.toLowerCase())
  );

  // ========== SELECT EMPLOYEE ==========
  const selectEmployee = (employee) => {
    let designation = '';
    if (employee.designation && typeof employee.designation === 'object') {
      designation = employee.designation.designation || '';
    } else {
      designation = employee.designation || '';
    }
    
    const otRate = getOTRate(designation, designations);
    setSalaryForm({
      ...salaryForm,
      employeeId: employee.id,
      employeeName: employee.name,
      designation: designation,
      baseSalary: employee.base_salary || employee.baseSalary || '',
      bonus: employee.bonus || '',
      otRate: otRate
    });
    setEmployeeSearchQuery(employee.name);
    setIsEmployeeDropdownOpen(false);
  };

  // ========== FETCH PREVIOUS MONTHS DATA ==========
  const fetchPreviousSalaries = async () => {
    setLoadingPrevious(true);
    try {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const allData = salaryData;
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
    } catch (err) {
      console.error('Error fetching previous salaries:', err);
      setError('Failed to load previous salary data.');
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

  // ========== AUTO-CALCULATE FUNCTIONS ==========
  
  useEffect(() => {
    if (salaryForm.baseSalary || salaryForm.otHours || salaryForm.bonus) {
      const otRate = getOTRate(salaryForm.designation, designations);
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
  }, [salaryForm.baseSalary, salaryForm.otHours, salaryForm.bonus, salaryForm.designation, designations]);

  useEffect(() => {
    if (salaryForm.designation) {
      const otRate = getOTRate(salaryForm.designation, designations);
      setSalaryForm(prev => ({ ...prev, otRate: otRate }));
    }
  }, [salaryForm.designation, designations]);

  // ========== SALARY CRUD OPERATIONS ==========

  const handleSalarySubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      const otRate = getOTRate(salaryForm.designation, designations);
      
      const data = {
        employeeId: parseInt(salaryForm.employeeId),
        employeeName: salaryForm.employeeName,
        designation: salaryForm.designation,
        month: salaryForm.month,
        baseSalary: parseFloat(salaryForm.baseSalary) || 0,
        otHours: parseFloat(salaryForm.otHours) || 0,
        otRate: otRate,
        bonus: parseFloat(salaryForm.bonus) || 0,
        totalSalary: parseFloat(salaryForm.finalSalary) || 0
      };

      if (isEditingSalary && editingSalaryId) {
        updateSalaryMutation.mutate({ id: editingSalaryId, data });
      } else {
        createSalaryMutation.mutate(data);
      }
    } catch (err) {
      console.error('Error:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Session expired. Please login again.');
      } else {
        setError(err.response?.data?.message || 'Failed to save salary.');
      }
      setSubmitting(false);
    }
  };

  const handleDeleteSalary = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    deleteSalaryMutation.mutate(deleteId);
  };

  const editSalary = (record) => {
    setIsEditingSalary(true);
    setEditingSalaryId(record.id);
    let designation = record.designation || '';
    if (!designation) {
      const employee = employees.find(emp => emp.id === record.employee_id || emp.id === record.employeeId);
      if (employee) {
        designation = employee.designation?.designation || employee.designation || '';
      }
    }
    const otRate = record.ot_rate || getOTRate(designation, designations) || 500;
    
    setEmployeeSearchQuery(record.employee_name || record.name || '');
    setSalaryForm({
      employeeId: record.employee_id || record.employeeId || '',
      employeeName: record.employee_name || record.name || '',
      designation: designation,
      baseSalary: record.base_salary || record.base || '',
      otHours: record.ot_hours || record.otHours || '',
      bonus: record.bonus || '',
      finalSalary: record.total_salary || record.total || '',
      otRate: otRate,
      month: record.month || new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
    });
    setShowSalaryForm(true);
  };

  // ========== FORM RESET FUNCTIONS ==========

  const resetSalaryForm = () => {
    setSalaryForm({
      employeeId: '',
      employeeName: '',
      designation: '',
      baseSalary: '',
      otHours: '',
      bonus: '',
      finalSalary: '',
      otRate: 500,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
    });
    setEmployeeSearchQuery('');
    setIsEditingSalary(false);
    setEditingSalaryId(null);
    setIsEmployeeDropdownOpen(false);
  };

  const showSuccessNotification = (message) => {
    setSuccessMessage(message);
    setShowSuccess(true);
  };

  // ========== OPEN FORM FUNCTIONS ==========

  const openSalaryForm = (employee = null) => {
    if (employee) {
      let designation = '';
      if (employee.designation && typeof employee.designation === 'object') {
        designation = employee.designation.designation || '';
      } else {
        designation = employee.designation || '';
      }
      
      const otRate = getOTRate(designation, designations);
      setEmployeeSearchQuery(employee.name);
      setSalaryForm({
        employeeId: employee.id,
        employeeName: employee.name,
        designation: designation,
        baseSalary: employee.base_salary || employee.baseSalary || '',
        otHours: '',
        bonus: employee.bonus || '',
        finalSalary: '',
        otRate: otRate,
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      });
    } else {
      setEmployeeSearchQuery('');
      setSalaryForm({
        employeeId: '',
        employeeName: '',
        designation: '',
        baseSalary: '',
        otHours: '',
        bonus: '',
        finalSalary: '',
        otRate: 500,
        month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
      });
    }
    setShowSalaryForm(true);
  };

  // ========== DELETE CONFIRMATION ==========

  const confirmDelete = (id, name) => {
    setDeleteId(id);
    setDeleteName(name);
    setShowDeleteConfirm(true);
  };

  // ========== TOGGLE PREVIOUS MONTHS ==========

  const togglePreviousSalaries = () => {
    const newState = !showPreviousSalaries;
    setShowPreviousSalaries(newState);
    if (newState) {
      fetchPreviousSalaries();
      setPrevCurrentPage(1);
    }
  };

  // ========== FILTER DATA ==========

  const getCurrentMonthData = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return salaryData.filter(record => {
      if (record.date) {
        const recordDate = new Date(record.date);
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

  const currentMonthSalaries = getCurrentMonthData();

  const filteredSalary = currentMonthSalaries.filter((rec) =>
    (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ========== FILTER PREVIOUS MONTHS DATA ==========
  const applyPrevFilters = (data) => {
    let filtered = [...data];

    if (prevSearchQuery) {
      filtered = filtered.filter(rec =>
        (rec.employee_name || rec.name || '').toLowerCase().includes(prevSearchQuery.toLowerCase())
      );
    }

    if (prevFilterEmployeeId) {
      filtered = filtered.filter(rec => 
        (rec.employee_id || rec.employeeId) === parseInt(prevFilterEmployeeId)
      );
    }

    if (prevFilterMonth) {
      filtered = filtered.filter(rec => {
        const monthYear = rec.month ? rec.month.split(' ') : [];
        const monthIndex = ['January','February','March','April','May','June','July','August','September','October','November','December']
          .indexOf(monthYear[0]);
        return monthIndex === parseInt(prevFilterMonth);
      });
    }

    if (prevFilterYear) {
      filtered = filtered.filter(rec => {
        const monthYear = rec.month ? rec.month.split(' ') : [];
        const year = parseInt(monthYear[1]);
        return year === parseInt(prevFilterYear);
      });
    }

    return filtered;
  };

  const filteredPreviousSalary = applyPrevFilters(previousSalaryData);

  // ========== PREVIOUS MONTHS PAGINATION ==========
  const prevTotalItems = filteredPreviousSalary.length;
  const prevTotalPages = Math.ceil(prevTotalItems / prevItemsPerPage);
  const prevStartIndex = (prevCurrentPage - 1) * prevItemsPerPage;
  const prevEndIndex = prevStartIndex + prevItemsPerPage;
  const paginatedPrevData = filteredPreviousSalary.slice(prevStartIndex, prevEndIndex);

  useEffect(() => {
    setPrevCurrentPage(1);
  }, [prevSearchQuery, prevFilterEmployeeId, prevFilterMonth, prevFilterYear, prevItemsPerPage]);

  // ========== PREVIOUS PAGINATION FUNCTIONS ==========
  const getPrevPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (prevTotalPages <= maxPagesToShow) {
      for (let i = 1; i <= prevTotalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let startPage = Math.max(2, prevCurrentPage - 1);
      let endPage = Math.min(prevTotalPages - 1, prevCurrentPage + 1);
      
      if (prevCurrentPage <= 3) {
        startPage = 2;
        endPage = 4;
      }
      
      if (prevCurrentPage >= prevTotalPages - 2) {
        startPage = prevTotalPages - 3;
        endPage = prevTotalPages - 1;
      }
      
      if (startPage > 2) {
        pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < prevTotalPages - 1) {
        pages.push('...');
      }
      
      pages.push(prevTotalPages);
    }
    
    return pages;
  };

  // ========== PAGINATION ==========
  const totalItems = filteredSalary.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredSalary.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      let startPage = Math.max(2, currentPage - 1);
      let endPage = Math.min(totalPages - 1, currentPage + 1);
      
      if (currentPage <= 3) {
        startPage = 2;
        endPage = 4;
      }
      
      if (currentPage >= totalPages - 2) {
        startPage = totalPages - 3;
        endPage = totalPages - 1;
      }
      
      if (startPage > 2) {
        pages.push('...');
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  // ========== SUMMARY STATISTICS ==========

  const totalStaff = employees.length;
  const totalOTHours = currentMonthSalaries.reduce((sum, s) => sum + (s.ot_hours || s.otHours || 0), 0);
  const totalBaseSalary = currentMonthSalaries.reduce((sum, s) => sum + (s.base_salary || s.base || 0), 0);
  const totalBonus = currentMonthSalaries.reduce((sum, s) => sum + (s.bonus || 0), 0);
  const totalPayout = currentMonthSalaries.reduce((sum, s) => sum + (s.total_salary || s.total || 0), 0);
  const totalOTAmount = currentMonthSalaries.reduce((sum, s) => {
    let designation = s.designation || '';
    if (!designation) {
      const employee = employees.find(emp => emp.id === s.employee_id || emp.id === s.employeeId);
      if (employee) {
        designation = employee.designation?.designation || employee.designation || '';
      }
    }
    const rate = s.ot_rate || getOTRate(designation, designations) || 500;
    return sum + ((s.ot_hours || s.otHours || 0) * rate);
  }, 0);

  const summaryCards = [
    { 
      key: 'staff', 
      label: 'Staff', 
      value: totalStaff, 
      icon: Users,
      bgClass: 'bg-blue-50', 
      textClass: 'text-blue-600' 
    },
    { 
      key: 'ot_hours', 
      label: 'OT Hours', 
      value: `${totalOTHours}h`, 
      icon: Clock,
      bgClass: 'bg-blue-50', 
      textClass: 'text-blue-600' 
    },
    { 
      key: 'base_salary', 
      label: 'Base Salary', 
      value: formatCurrency(totalBaseSalary), 
      icon: DollarSign,
      bgClass: 'bg-blue-50', 
      textClass: 'text-blue-600' 
    },
    { 
      key: 'ot_amount', 
      label: 'OT Amount', 
      value: formatCurrency(totalOTAmount), 
      icon: TrendingUp,
      bgClass: 'bg-blue-50', 
      textClass: 'text-blue-600' 
    },
    { 
      key: 'bonus', 
      label: 'Bonus', 
      value: formatCurrency(totalBonus), 
      icon: Award,
      bgClass: 'bg-blue-50', 
      textClass: 'text-blue-600' 
    },
    { 
      key: 'payout', 
      label: 'Monthly Payout', 
      value: formatCurrency(totalPayout), 
      icon: DollarSign,
      bgClass: 'bg-blue-50', 
      textClass: 'text-blue-600' 
    },
  ];

  // ========== GET LAST UPDATED TIME ==========
  const lastUpdated = salariesUpdatedAt ? new Date(salariesUpdatedAt).toLocaleTimeString() : 'Never';

  // ========== LOADING ==========

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader size={48} className="text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-500">Loading salary data...</p>
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
            queryClient.invalidateQueries({ queryKey: ['salary-records'] });
            queryClient.invalidateQueries({ queryKey: ['salary-employees'] });
            queryClient.invalidateQueries({ queryKey: ['salary-designations'] });
          }}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
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
            className="fixed top-20 right-4 z-50 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
          >
            <CheckCircle size={20} className="text-blue-500" />
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
            <h1 className="text-2xl font-bold text-gray-900">Salaries & OT</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage employee salaries, overtime calculations, and bonus payments
            </p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${isSalariesFetching ? 'bg-yellow-400' : 'bg-emerald-400'}`} />
                <span className="text-xs text-gray-400">{isSalariesFetching ? 'Updating...' : 'Live'}</span>
              </div>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs text-gray-400">Last updated: {lastUpdated}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSalariesFetching && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Loader size={12} className="animate-spin" />
                Syncing...
              </span>
            )}
            <button
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['salary-records'] });
                queryClient.invalidateQueries({ queryKey: ['salary-employees'] });
                queryClient.invalidateQueries({ queryKey: ['salary-designations'] });
                showSuccessNotification('Salaries refreshed successfully!');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
            >
              <RefreshCw size={16} className={isSalariesFetching ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => {
                if (employees.length > 0) {
                  openSalaryForm(employees[0]);
                } else {
                  setError('No employees available. Please add employees first.');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={16} />
              Add Salary
            </button>
          </div>
        </div>
      </motion.div>

      {/* ========== SUMMARY CARDS ========== */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              variants={itemVariants}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${card.bgClass} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={card.textClass} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-medium truncate">{card.label}</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{card.value}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ========== SEARCH & ITEMS PER PAGE ========== */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-4 flex-wrap"
      >
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
          />
        </div>
        <div className="flex items-center gap-3">
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
        <div className="text-sm text-gray-400 ml-auto">
          {filteredSalary.length} records found
        </div>
      </motion.div>

      {/* ========== SALARY TABLE ========== */}
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
                </p>
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
                      <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                      <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
                      <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">OT Hours</th>
                      <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">OT Rate</th>
                      <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">OT Amount</th>
                      <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Bonus</th>
                      <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Total Salary</th>
                      <th className="text-center py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((salary) => {
                      let designation = salary.designation || 'N/A';
                      let otRate = salary.ot_rate || 500;
                      
                      if (!salary.designation) {
                        const employee = employees.find(emp => emp.id === salary.employee_id || emp.id === salary.employeeId);
                        if (employee) {
                          designation = employee.designation?.designation || employee.designation || 'N/A';
                          otRate = getOTRate(designation, designations);
                        }
                      }
                      
                      const otAmount = (salary.ot_hours || salary.otHours || 0) * otRate;
                      const totalSalary = salary.total_salary || salary.total || 0;
                      
                      return (
                        <tr key={salary.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-6 font-medium text-gray-900">{salary.employee_name || salary.name}</td>
                          <td className="py-3 px-6">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                              {designation}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-right font-medium text-gray-700">{formatCurrency(salary.base_salary || salary.base || 0)}</td>
                          <td className="py-3 px-6 text-right text-gray-600">{salary.ot_hours || salary.otHours || 0}h</td>
                          <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(otRate)}/hr</td>
                          <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(otAmount)}</td>
                          <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(salary.bonus || 0)}</td>
                          <td className="py-3 px-6 text-right font-semibold text-blue-700">{formatCurrency(totalSalary)}</td>
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
                                onClick={() => confirmDelete(salary.id, salary.employee_name || salary.name)}
                                className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50/50">
                      <td className="py-3 px-6 font-semibold text-gray-900">Total</td>
                      <td className="py-3 px-6"></td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(paginatedData.reduce((s, r) => s + (r.base_salary || r.base || 0), 0))}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {paginatedData.reduce((s, r) => s + (r.ot_hours || r.otHours || 0), 0)}h
                      </td>
                      <td className="py-3 px-6"></td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(paginatedData.reduce((s, r) => {
                          let designation = r.designation || '';
                          if (!designation) {
                            const employee = employees.find(emp => emp.id === r.employee_id || emp.id === r.employeeId);
                            if (employee) {
                              designation = employee.designation?.designation || employee.designation || '';
                            }
                          }
                          const rate = r.ot_rate || getOTRate(designation, designations) || 500;
                          return s + ((r.ot_hours || r.otHours || 0) * rate);
                        }, 0))}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(paginatedData.reduce((s, r) => s + (r.bonus || 0), 0))}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-blue-700">
                        {formatCurrency(paginatedData.reduce((s, r) => s + (r.total_salary || r.total || 0), 0))}
                      </td>
                      <td className="py-3 px-6"></td>
                    </tr>
                  </tfoot>
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
                    {getPageNumbers().map((page, index) => (
                      typeof page === 'number' ? (
                        <button
                          key={index}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            currentPage === page
                              ? 'bg-blue-600 text-white shadow-sm'
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
              <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">No salary records for current month</p>
              <p className="text-sm text-gray-400 mt-1">Add salary records to get started</p>
              <button
                onClick={() => openSalaryForm()}
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
            onClick={togglePreviousSalaries}
            className="w-full flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-200 rounded-2xl transition-all duration-300 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <History size={20} className="text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-800">Previous Months Salaries</p>
                <p className="text-xs text-gray-500">
                  {showPreviousSalaries ? 'Hide' : 'View'} historical salary records
                  {previousSalaryData.length > 0 && !showPreviousSalaries && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({previousSalaryData.length} records)
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loadingPrevious && (
                <Loader size={16} className="animate-spin text-blue-600" />
              )}
              {showPreviousSalaries ? (
                <ChevronUp size={20} className="text-blue-600" />
              ) : (
                <ChevronDown size={20} className="text-blue-600" />
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
                <div className="mt-4 bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden">
                  <div className="p-4 border-b border-blue-50 bg-blue-50/30">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-800">
                          <History size={16} className="inline mr-2 text-blue-600" />
                          Previous Months Salary Records
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          All salary records from previous months
                        </p>
                      </div>
                      <button
                        onClick={fetchPreviousSalaries}
                        className="p-1.5 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw size={14} className="text-blue-500" />
                      </button>
                    </div>
                  </div>
                  
                  {/* ========== PREVIOUS MONTHS FILTERS ========== */}
                  <div className="p-4 border-b border-blue-50 bg-blue-50/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Filter size={14} className="text-blue-500" />
                      <span className="text-xs font-medium text-gray-600">Filters</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Search */}
                      <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search employee..."
                          value={prevSearchQuery}
                          onChange={(e) => setPrevSearchQuery(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        />
                      </div>

                      {/* Employee Filter */}
                      <select
                        value={prevFilterEmployeeId}
                        onChange={(e) => setPrevFilterEmployeeId(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
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

                      {/* Month Filter */}
                      <select
                        value={prevFilterMonth}
                        onChange={(e) => setPrevFilterMonth(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
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
                        value={prevFilterYear}
                        onChange={(e) => setPrevFilterYear(e.target.value)}
                        className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                      >
                        <option value="">All Years</option>
                        {Array.from({ length: 6 }, (_, i) => {
                          const year = new Date().getFullYear() - i;
                          return (
                            <option key={year} value={year}>{year}</option>
                          );
                        })}
                      </select>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-400">{filteredPreviousSalary.length} records found</span>
                      {(prevSearchQuery || prevFilterEmployeeId || prevFilterMonth || prevFilterYear) && (
                        <button
                          onClick={() => {
                            setPrevSearchQuery('');
                            setPrevFilterEmployeeId('');
                            setPrevFilterMonth('');
                            setPrevFilterYear('');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <X size={12} />
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {loadingPrevious ? (
                    <div className="text-center py-8">
                      <Loader size={24} className="animate-spin text-blue-600 mx-auto" />
                      <p className="text-xs text-gray-400 mt-2">Loading previous records...</p>
                    </div>
                  ) : paginatedPrevData.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-blue-50">
                            <tr>
                              <th className="text-left py-2.5 px-4 text-xs font-medium text-blue-700 uppercase tracking-wider">Employee</th>
                              <th className="text-left py-2.5 px-4 text-xs font-medium text-blue-700 uppercase tracking-wider">Designation</th>
                              <th className="text-left py-2.5 px-4 text-xs font-medium text-blue-700 uppercase tracking-wider">Month</th>
                              <th className="text-right py-2.5 px-4 text-xs font-medium text-blue-700 uppercase tracking-wider">Base Salary</th>
                              <th className="text-right py-2.5 px-4 text-xs font-medium text-blue-700 uppercase tracking-wider">OT Hours</th>
                              <th className="text-right py-2.5 px-4 text-xs font-medium text-blue-700 uppercase tracking-wider">OT Rate</th>
                              <th className="text-right py-2.5 px-4 text-xs font-medium text-blue-700 uppercase tracking-wider">OT Amount</th>
                              <th className="text-right py-2.5 px-4 text-xs font-medium text-blue-700 uppercase tracking-wider">Bonus</th>
                              <th className="text-right py-2.5 px-4 text-xs font-medium text-blue-700 uppercase tracking-wider">Total Salary</th>
                              <th className="text-center py-2.5 px-4 text-xs font-medium text-blue-700 uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedPrevData.map((salary) => {
                              let designation = salary.designation || 'N/A';
                              let otRate = salary.ot_rate || 500;
                              
                              if (!salary.designation) {
                                const employee = employees.find(emp => emp.id === salary.employee_id || emp.id === salary.employeeId);
                                if (employee) {
                                  designation = employee.designation?.designation || employee.designation || 'N/A';
                                  otRate = getOTRate(designation, designations);
                                }
                              }
                              
                              const otAmount = (salary.ot_hours || salary.otHours || 0) * otRate;
                              
                              return (
                                <tr key={salary.id} className="border-b border-blue-50 hover:bg-blue-50/30 transition-colors">
                                  <td className="py-2.5 px-4 font-medium text-gray-800">{salary.employee_name || salary.name}</td>
                                  <td className="py-2.5 px-4">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                      {designation}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4 text-gray-600">{salary.month || 'N/A'}</td>
                                  <td className="py-2.5 px-4 text-right font-medium text-gray-700">{formatCurrency(salary.base_salary || salary.base || 0)}</td>
                                  <td className="py-2.5 px-4 text-right text-gray-600">{salary.ot_hours || salary.otHours || 0}h</td>
                                  <td className="py-2.5 px-4 text-right text-gray-600">{formatCurrency(otRate)}/hr</td>
                                  <td className="py-2.5 px-4 text-right text-gray-600">{formatCurrency(otAmount)}</td>
                                  <td className="py-2.5 px-4 text-right text-gray-600">{formatCurrency(salary.bonus || 0)}</td>
                                  <td className="py-2.5 px-4 text-right font-semibold text-blue-700">{formatCurrency(salary.total_salary || salary.total || 0)}</td>
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
                                        onClick={() => confirmDelete(salary.id, salary.employee_name || salary.name)}
                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-blue-50/50">
                            <tr>
                              <td colSpan="10" className="py-2 px-4 text-xs text-blue-600 font-medium">
                                Total: {paginatedPrevData.length} records
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>

                      {/* ========== PREVIOUS MONTHS PAGINATION ========== */}
                      {prevTotalPages > 1 && (
                        <div className="px-4 py-3 border-t border-blue-100 flex items-center justify-between flex-wrap gap-2">
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
                            {getPrevPageNumbers().map((page, index) => (
                              typeof page === 'number' ? (
                                <button
                                  key={index}
                                  onClick={() => setPrevCurrentPage(page)}
                                  className={`w-7 h-7 text-xs font-medium rounded-lg transition-colors ${
                                    prevCurrentPage === page
                                      ? 'bg-blue-600 text-white shadow-sm'
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
                      <DollarSign size={28} className="mx-auto mb-2 text-gray-300" />
                      <p className="font-medium">No previous salary records</p>
                      <p className="text-xs mt-1">Records from previous months will appear here</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* ========== SALARY FORM MODAL ========== */}
      <AnimatePresence>
        {showSalaryForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-md z-50"
              onClick={() => {
                if (!submitting && !createSalaryMutation.isPending && !updateSalaryMutation.isPending) {
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
                    if (!submitting && !createSalaryMutation.isPending && !updateSalaryMutation.isPending) {
                      setShowSalaryForm(false);
                      resetSalaryForm();
                    }
                  }}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
                  disabled={submitting || createSalaryMutation.isPending || updateSalaryMutation.isPending}
                >
                  <X size={24} className="text-gray-400" />
                </button>

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <DollarSign size={20} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {isEditingSalary ? 'Edit Salary & OT' : 'Add Salary & OT'}
                  </h2>
                </div>

                <form onSubmit={handleSalarySubmit}>
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
                              setSalaryForm({ ...salaryForm, employeeId: '', employeeName: '' });
                            }
                          }}
                          onFocus={() => setIsEmployeeDropdownOpen(true)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white pr-8"
                          disabled={submitting || isEditingSalary || createSalaryMutation.isPending || updateSalaryMutation.isPending}
                        />
                        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      
                      {isEditingSalary && (
                        <p className="text-xs text-gray-400 mt-1">Employee cannot be changed while editing</p>
                      )}

                      {/* ========== DROPDOWN ========== */}
                      {isEmployeeDropdownOpen && !isEditingSalary && (
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
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                        disabled
                      />
                      <p className="text-xs text-blue-600 mt-1">✓ Auto-filled from employee profile</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Award size={14} className="inline mr-1" /> Bonus (LKR)
                      </label>
                      <input
                        type="number"
                        value={salaryForm.bonus}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                        disabled
                      />
                      <p className="text-xs text-blue-600 mt-1">✓ Auto-filled from employee profile</p>
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
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        disabled={submitting || createSalaryMutation.isPending || updateSalaryMutation.isPending}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        OT Rate: {formatCurrency(salaryForm.otRate || 500)}/hr (from designation)
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
                      <p className="text-xs text-purple-600 mt-1">✓ Auto-set from designation OT rate</p>
                    </div>

                    {/* ========== MONTH SELECTION ========== */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <CalendarDays size={14} className="inline mr-1" /> Month *
                      </label>
                      <select
                        value={salaryForm.month}
                        onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        required
                        disabled={submitting || createSalaryMutation.isPending || updateSalaryMutation.isPending}
                      >
                        {Array.from({ length: 12 }, (_, i) => {
                          const month = new Date(2000, i, 1).toLocaleString('default', { month: 'long' });
                          const year = new Date().getFullYear();
                          const value = `${month} ${year}`;
                          return (
                            <option key={i} value={value}>
                              {month} {year}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Select the month for this salary record</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <TrendingUp size={14} className="inline mr-1" /> Final Salary (Auto-calculated)
                      </label>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                        <p className="text-2xl font-bold text-blue-700">
                          {salaryForm.finalSalary ? formatCurrency(parseFloat(salaryForm.finalSalary)) : '0.00 LKR'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Base Salary + (OT Hours × {formatCurrency(salaryForm.otRate || 500)}/hr) + Bonus
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          OT Rate: {formatCurrency(salaryForm.otRate || 500)}/hr from designation
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => {
                        if (!submitting && !createSalaryMutation.isPending && !updateSalaryMutation.isPending) {
                          setShowSalaryForm(false);
                          resetSalaryForm();
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={submitting || createSalaryMutation.isPending || updateSalaryMutation.isPending}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={submitting || createSalaryMutation.isPending || updateSalaryMutation.isPending}
                    >
                      {submitting || createSalaryMutation.isPending || updateSalaryMutation.isPending ? (
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
                if (!submitting && !deleteSalaryMutation.isPending) {
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
                    Delete Salary Record
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    Are you sure you want to delete this salary record for{' '}
                    <span className="font-semibold text-gray-900">{deleteName}</span>? 
                    This action cannot be undone.
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => {
                        if (!submitting && !deleteSalaryMutation.isPending) {
                          setShowDeleteConfirm(false);
                          setDeleteId(null);
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      disabled={submitting || deleteSalaryMutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteSalary}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      disabled={submitting || deleteSalaryMutation.isPending}
                    >
                      {submitting || deleteSalaryMutation.isPending ? (
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