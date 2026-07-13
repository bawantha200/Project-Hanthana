import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Clock, DollarSign, Search, TrendingUp, Award, Loader, 
  Plus, X, Calendar, User, Edit, Trash2, CheckCircle, AlertCircle,
  FileText, Smartphone, Mail, Building, Home, Heart, CreditCard,
  Briefcase, Save, RefreshCw
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

  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [showSalaryForm, setShowSalaryForm] = useState(false);

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

  // ========== FETCH FUNCTIONS ==========
  
  const fetchEmployees = async () => {
    try {
      const response = await axios.get(EMPLOYEES_API);
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchAttendance = async () => {
    try {
      const response = await axios.get(ATTENDANCE_API);
      if (response.data.success) {
        setAttendanceData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const fetchSalaries = async () => {
    try {
      const response = await axios.get(SALARIES_API);
      if (response.data.success) {
        setSalaryData(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching salaries:', err);
    }
  };

  // ========== LOAD DATA ==========
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchEmployees(),
        fetchAttendance(),
        fetchSalaries()
      ]);
      setLoading(false);
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
    // If no check-in and no check-out -> Absent
    if (!checkIn && !checkOut) {
      return 'absent';
    }
    
    // If only check-in, no check-out -> Present (default)
    if (checkIn && !checkOut) {
      return 'present';
    }
    
    const checkInTime = checkIn || '00:00';
    const checkOutTime = checkOut || '00:00';
    
    // Full day - 8:00 AM to 5:00 PM -> Present
    if (checkInTime === '08:00' && checkOutTime === '17:00') {
      return 'present';
    }
    
    // Check-in at 8:00 AM, Check-out before 5:00 PM -> Half Day
    if (checkInTime === '08:00' && checkOutTime < '17:00') {
      return 'half_day';
    }
    
    // Check-in after 8:00 AM, Check-out at 5:00 PM -> Half Day
    if (checkInTime > '08:00' && checkOutTime === '17:00') {
      return 'half_day';
    }
    
    // Check-in after 8:00 AM, Check-out before 5:00 PM -> Half Day
    if (checkInTime > '08:00' && checkOutTime < '17:00') {
      return 'half_day';
    }
    
    // 8:00 AM to after 5:00 PM -> Present (with OT)
    if (checkInTime === '08:00' && checkOutTime > '17:00') {
      return 'present';
    }
    
    // Before 8:00 AM to 5:00 PM -> Present
    if (checkInTime < '08:00' && checkOutTime === '17:00') {
      return 'present';
    }
    
    // Before 8:00 AM to before 5:00 PM -> Half Day
    if (checkInTime < '08:00' && checkOutTime < '17:00') {
      return 'half_day';
    }
    
    // Before 8:00 AM to after 5:00 PM -> Present
    if (checkInTime < '08:00' && checkOutTime > '17:00') {
      return 'present';
    }
    
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

      const response = await axios.post(ATTENDANCE_API, data);
      
      if (response.data.success) {
        await fetchAttendance();
        setShowAttendanceForm(false);
        resetAttendanceForm();
        showSuccessNotification(`Attendance added! Status: ${status}`);
      }
    } catch (err) {
      console.error('Error:', err);
      if (err.response?.status === 409) {
        setError('Attendance already recorded for this date.');
      } else {
        setError(err.response?.data?.message || 'Failed to add attendance.');
      }
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

      const response = await axios.post(SALARIES_API, data);
      
      if (response.data.success) {
        await fetchSalaries();
        setShowSalaryForm(false);
        resetSalaryForm();
        showSuccessNotification('Salary added successfully!');
      }
    } catch (err) {
      console.error('Error:', err);
      if (err.response?.status === 409) {
        setError('Salary already recorded for this month.');
      } else {
        setError(err.response?.data?.message || 'Failed to add salary.');
      }
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

  // ========== SUMMARY ==========

  const totalStaff = employees.length;
  const totalOTHours = salaryData.reduce((sum, s) => sum + (s.ot_hours || s.otHours || 0), 0);
  const monthlyPayout = salaryData.reduce((sum, s) => sum + (s.total_salary || s.total || 0), 0);

  const summaryCards = [
    { key: 'staff', label: 'Total Staff', value: totalStaff, icon: Users, bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
    { key: 'ot', label: 'Total OT Hours', value: `${totalOTHours}h`, icon: Clock, bgClass: 'bg-amber-50', textClass: 'text-amber-600' },
    { key: 'payout', label: 'Monthly Payout', value: formatCurrency(monthlyPayout), icon: DollarSign, bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
  ];

  const filteredAttendance = attendanceData.filter((rec) =>
    (rec.employee_name || rec.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSalary = salaryData.filter((rec) =>
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
        <h1 className="text-2xl font-bold text-gray-900">HRM</h1>
        <p className="text-sm text-gray-500 mt-1">
          Human Resource Management — Attendance, salaries, and employee performance
        </p>
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
              Update Attendance
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
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-56 bg-white"
            />
          </div>
        </div>
      </motion.div>

      {/* ============================================ */}
      {/* ATTENDANCE TAB */}
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
                  <h2 className="text-base font-semibold text-gray-900">Attendance Log</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Daily check-in and check-out records 
                    <span className="ml-2 text-blue-600 font-medium">{attendanceData.length} records</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchAttendance}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh attendance"
                  >
                    <RefreshCw size={16} className="text-gray-400 hover:text-blue-600 transition-colors" />
                  </button>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Clock size={18} className="text-blue-600" />
                  </div>
                </div>
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
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-10 text-gray-500">
                        <Clock size={36} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No attendance records found</p>
                        <p className="text-xs mt-1">Try adjusting your search criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============================================ */}
      {/* SALARIES TAB - Status column removed */}
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
                  <h2 className="text-base font-semibold text-gray-900">Monthly Salary Summary</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Complete breakdown for {salaryData[0]?.month || 'Current Month'}
                    <span className="ml-2 text-emerald-600 font-medium">{salaryData.length} records</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchSalaries}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Refresh salaries"
                  >
                    <RefreshCw size={16} className="text-gray-400 hover:text-emerald-600 transition-colors" />
                  </button>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <DollarSign size={18} className="text-emerald-600" />
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">OT Hours</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">OT Amount</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Bonus</th>
                    <th className="text-right py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Final Salary</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalary.length > 0 ? (
                    filteredSalary.map((salary) => (
                      <tr key={salary.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6 font-medium text-gray-900">{salary.employee_name || salary.name}</td>
                        <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(salary.base_salary || salary.base || 0)}</td>
                        <td className="py-3 px-6 text-right text-gray-600">{salary.ot_hours || salary.otHours || 0}h</td>
                        <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(salary.ot_amount || salary.otAmount || 0)}</td>
                        <td className="py-3 px-6 text-right text-gray-600">{formatCurrency(salary.bonus || 0)}</td>
                        <td className="py-3 px-6 text-right font-semibold text-gray-900">{formatCurrency(salary.total_salary || salary.total || 0)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-10 text-gray-500">
                        <DollarSign size={36} className="mx-auto mb-3 text-gray-300" />
                        <p className="font-medium">No salary records found</p>
                        <p className="text-xs mt-1">Try adjusting your search criteria</p>
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredSalary.length > 0 && (
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-gray-50/50">
                      <td className="py-3 px-6 font-semibold text-gray-900">Total</td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(filteredSalary.reduce((s, r) => s + (r.base_salary || r.base || 0), 0))}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {filteredSalary.reduce((s, r) => s + (r.ot_hours || r.otHours || 0), 0)}h
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(filteredSalary.reduce((s, r) => s + (r.ot_amount || r.otAmount || 0), 0))}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(filteredSalary.reduce((s, r) => s + (r.bonus || 0), 0))}
                      </td>
                      <td className="py-3 px-6 text-right font-semibold text-gray-900">
                        {formatCurrency(filteredSalary.reduce((s, r) => s + (r.total_salary || r.total || 0), 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* ============================================ */}
      {/* ATTENDANCE UPDATE MODAL */}
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
                        <User size={14} className="inline mr-1" /> Employee Name *
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
                            {attendanceForm.status === 'half_day' && '⚠️ Half day (Not full day)'}
                            {attendanceForm.status === 'absent' && '❌ No check-in/out recorded'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Status auto-calculated based on check-in and check-out times
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <Edit size={14} className="inline mr-1" /> Status Override (Optional)
                      </label>
                      <select
                        value={attendanceForm.status}
                        onChange={(e) => setAttendanceForm({ ...attendanceForm, status: e.target.value })}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
                        disabled={submitting}
                      >
                        <option value="present">Present</option>
                        <option value="half_day">Half Day</option>
                        <option value="absent">Absent</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Auto-generated based on times, but you can manually override</p>
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
      {/* SALARY UPDATE MODAL */}
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
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <DollarSign size={20} className="text-blue-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">Add Salary & OT</h2>
                </div>

                <form onSubmit={handleSalarySubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        <User size={14} className="inline mr-1" /> Employee Name *
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
                        <DollarSign size={14} className="inline mr-1" /> Base Salary (LKR) *
                      </label>
                      <input
                        type="number"
                        value={salaryForm.baseSalary}
                        onChange={(e) => setSalaryForm({ ...salaryForm, baseSalary: e.target.value })}
                        placeholder="Enter base salary"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
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
    </motion.div>
  );
}