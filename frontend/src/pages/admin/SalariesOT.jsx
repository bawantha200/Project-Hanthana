import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, Search, Plus, X, User, Calendar, Edit, Trash2, 
  CheckCircle, AlertCircle, Loader, RefreshCw, History,
  ChevronDown, ChevronUp, Save, Briefcase, Clock, Award,
  TrendingUp, Users
} from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
const EMPLOYEES_API = `${API_BASE_URL}/employees`;
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
  
  // First try to find in designations list
  if (designations && designations.length > 0) {
    const found = designations.find(d => 
      d.designation && designation.toLowerCase().includes(d.designation.toLowerCase())
    );
    if (found && found.ot_rate) {
      return parseFloat(found.ot_rate);
    }
  }
  
  // Fallback: if designation object has ot_rate
  if (designation.ot_rate) {
    return parseFloat(designation.ot_rate);
  }
  
  // Default fallback
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

export default function SalariesOT() {
  // ========== STATE ==========
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [salaryData, setSalaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ========== PREVIOUS MONTHS STATE ==========
  const [showPreviousSalaries, setShowPreviousSalaries] = useState(false);
  const [previousSalaryData, setPreviousSalaryData] = useState([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  // ========== FORM STATES ==========
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [isEditingSalary, setIsEditingSalary] = useState(false);
  const [editingSalaryId, setEditingSalaryId] = useState(null);

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
    otRate: 500
  });

  // ========== FETCH FUNCTIONS ==========
  
  const fetchDesignations = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/designations', getAuthHeaders());
      if (response.data.success) {
        setDesignations(response.data.data);
        console.log('✅ Designations loaded:', response.data.data.length);
      }
    } catch (err) {
      console.error('❌ Error fetching designations:', err);
    }
  };

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

  // ========== LOAD DATA ==========
  useEffect(() => {
    const loadData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to access salary data');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchEmployees(),
          fetchDesignations(),
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

  // ========== AUTO-CALCULATE FUNCTIONS ==========
  
  // Auto-calculate final salary with OT rate based on designation
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

  // Update OT rate when designation changes
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
    // Get designation from record or from employee data
    let designation = record.designation || '';
    if (!designation) {
      const employee = employees.find(emp => emp.id === record.employee_id || emp.id === record.employeeId);
      if (employee) {
        // Get designation name from employee.designation object or string
        designation = employee.designation?.designation || employee.designation || '';
      }
    }
    const otRate = record.ot_rate || getOTRate(designation, designations) || 500;
    
    setSalaryForm({
      employeeId: record.employee_id || record.employeeId || '',
      employeeName: record.employee_name || record.name || '',
      designation: designation,
      baseSalary: record.base_salary || record.base || '',
      otHours: record.ot_hours || record.otHours || '',
      bonus: record.bonus || '',
      finalSalary: record.total_salary || record.total || '',
      otRate: otRate
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

  const openSalaryForm = (employee = null) => {
    if (employee) {
      // Get designation name from employee.designation object or string
      let designation = '';
      if (employee.designation && typeof employee.designation === 'object') {
        designation = employee.designation.designation || '';
      } else {
        designation = employee.designation || '';
      }
      
      const otRate = getOTRate(designation, designations);
      setSalaryForm({
        employeeId: employee.id,
        employeeName: employee.name,
        designation: designation,
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

  const filteredPreviousSalary = previousSalaryData.filter((rec) =>
    (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      label: 'Total Staff', 
      value: totalStaff, 
      icon: Users,
      bgClass: 'bg-blue-50', 
      textClass: 'text-blue-600' 
    },
    { 
      key: 'ot_hours', 
      label: 'Total OT Hours', 
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
      label: 'Total Bonus', 
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
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await fetchSalaries();
                  showSuccessNotification('Salaries refreshed successfully!');
                } catch (err) {
                  setError('Failed to refresh salary data.');
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

      {/* ========== SEARCH ========== */}
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
        <div className="text-sm text-gray-400">
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
          
          {filteredSalary.length > 0 ? (
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
                  {filteredSalary.map((salary) => {
                    // Get designation from salary record or from employee data
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
                      {formatCurrency(filteredSalary.reduce((s, r) => s + (r.base_salary || r.base || 0), 0))}
                    </td>
                    <td className="py-3 px-6 text-right font-semibold text-gray-900">
                      {filteredSalary.reduce((s, r) => s + (r.ot_hours || r.otHours || 0), 0)}h
                    </td>
                    <td className="py-3 px-6"></td>
                    <td className="py-3 px-6 text-right font-semibold text-gray-900">
                      {formatCurrency(filteredSalary.reduce((s, r) => {
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
                      {formatCurrency(filteredSalary.reduce((s, r) => s + (r.bonus || 0), 0))}
                    </td>
                    <td className="py-3 px-6 text-right font-semibold text-blue-700">
                      {formatCurrency(filteredSalary.reduce((s, r) => s + (r.total_salary || r.total || 0), 0))}
                    </td>
                    <td className="py-3 px-6"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
                  
                  {loadingPrevious ? (
                    <div className="text-center py-8">
                      <Loader size={24} className="animate-spin text-blue-600 mx-auto" />
                      <p className="text-xs text-gray-400 mt-2">Loading previous records...</p>
                    </div>
                  ) : filteredPreviousSalary.length > 0 ? (
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
                          {filteredPreviousSalary.map((salary) => {
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
                              Total: {filteredPreviousSalary.length} records
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
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
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <DollarSign size={20} className="text-blue-600" />
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
                            // Get designation name from employee.designation object or string
                            let designation = '';
                            if (emp.designation && typeof emp.designation === 'object') {
                              designation = emp.designation.designation || '';
                            } else {
                              designation = emp.designation || '';
                            }
                            
                            const otRate = getOTRate(designation, designations);
                            setSalaryForm({
                              ...salaryForm,
                              employeeId: e.target.value,
                              employeeName: emp.name,
                              designation: designation,
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
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        required
                        disabled={submitting || isEditingSalary}
                      >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => {
                          const des = emp.designation?.designation || emp.designation || '';
                          return (
                            <option key={emp.id} value={emp.id}>
                              {emp.name} {des ? `- ${des}` : ''}
                            </option>
                          );
                        })}
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
                        disabled={submitting}
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
                      className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                      onClick={handleDeleteSalary}
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


