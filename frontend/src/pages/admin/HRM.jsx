import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, DollarSign, Search, TrendingUp, Award } from 'lucide-react';
import AttendanceLog from '../../components/AttendanceLog';
import StatusBadge from '../../components/StatusBadge';
import { attendanceData, salaryData, employeeData } from '../../data/mockData';
import { formatCurrency } from '../../utils/helpers';

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

  const totalStaff = employeeData.length;
  const totalOTHours = salaryData.reduce((sum, s) => sum + s.otHours, 0);
  const monthlyPayout = salaryData.reduce((sum, s) => sum + s.total, 0);

  const summaryCards = [
    { key: 'staff', label: 'Total Staff', value: totalStaff, icon: Users, bgClass: 'bg-blue-50', textClass: 'text-blue-600' },
    { key: 'ot', label: 'Total OT Hours', value: `${totalOTHours}h`, icon: Clock, bgClass: 'bg-amber-50', textClass: 'text-amber-600' },
    { key: 'payout', label: 'Monthly Payout', value: formatCurrency(monthlyPayout), icon: DollarSign, bgClass: 'bg-emerald-50', textClass: 'text-emerald-600' },
  ];

  const filteredAttendance = attendanceData.filter((rec) =>
    rec.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSalary = salaryData.filter((rec) =>
    rec.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEmployees = employeeData.filter((emp) =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function getPerformanceScore(employee) {
    let score = 50;
    if (employee.status === 'active') score += 15;
    if (employee.role === 'MANAGER') score += 15;
    if (employee.baseSalary >= 30000) score += 10;
    else if (employee.baseSalary >= 15000) score += 5;
    const tenureYears = (new Date() - new Date(employee.hireDate)) / (1000 * 60 * 60 * 24 * 365);
    if (tenureYears >= 2) score += 10;
    return Math.min(score, 100);
  }

  function getPerformanceLabel(score) {
    if (score >= 85) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (score >= 70) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' };
    if (score >= 55) return { label: 'Average', color: 'text-amber-600', bg: 'bg-amber-50' };
    return { label: 'Needs Improvement', color: 'text-rose-600', bg: 'bg-rose-50' };
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">HRM</h1>
        <p className="text-sm text-gray-500 mt-1">
          Human Resource Management — Attendance, salaries, and employee performance
        </p>
      </motion.div>

      {/* Summary Cards */}
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

      {/* Tab Navigation & Search */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
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
      </motion.div>

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Attendance Log Table */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Attendance Log</h2>
                <p className="text-xs text-gray-400 mt-0.5">Daily check-in and check-out records</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock size={18} className="text-blue-600" />
              </div>
            </div>
            <AttendanceLog records={filteredAttendance} />
          </motion.div>

          {/* Employee Performance Cards */}
          <motion.div variants={itemVariants}>
            <h2 className="text-base font-semibold text-gray-900 mb-4">Employee Performance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {filteredEmployees.map((employee) => {
                const score = getPerformanceScore(employee);
                const perf = getPerformanceLabel(score);
                return (
                  <motion.div
                    key={employee.id}
                    variants={itemVariants}
                    whileHover={{ y: -2 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                        {employee.avatar}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{employee.name}</h3>
                        <p className="text-xs text-gray-500">{employee.position}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400 font-medium">Performance</span>
                      <span className={`text-xs font-semibold ${perf.color}`}>{perf.label}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${
                          score >= 85 ? 'bg-emerald-500' : score >= 70 ? 'bg-blue-500' : score >= 55 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-500">Score: {score}/100</span>
                      </div>
                      <StatusBadge status={employee.status} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Salaries & OT Tab */}
      {activeTab === 'salaries' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Salary Cards for Each Employee */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredSalary.map((salary) => {
              const employee = employeeData.find((e) => e.id === salary.employeeId);
              return (
                <motion.div
                  key={salary.employeeId}
                  variants={itemVariants}
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200"
                >
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                      {employee?.avatar || '??'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{salary.name}</h3>
                      <p className="text-xs text-gray-500">{salary.month}</p>
                    </div>
                    <StatusBadge status={salary.paid ? 'Delivered' : 'Pending'} />
                  </div>

                  {/* Salary Breakdown */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 font-medium flex items-center gap-2">
                        <DollarSign size={14} className="text-gray-400" />
                        Base Salary
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(salary.base)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-amber-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 font-medium flex items-center gap-2">
                        <Clock size={14} className="text-amber-500" />
                        OT Amount ({salary.otHours}h)
                      </span>
                      <span className="text-sm font-semibold text-amber-700">{formatCurrency(salary.otAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-blue-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 font-medium flex items-center gap-2">
                        <Award size={14} className="text-blue-500" />
                        Bonus
                      </span>
                      <span className="text-sm font-semibold text-blue-700">{formatCurrency(salary.bonus)}</span>
                    </div>
                    <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-3">
                      <span className="text-xs text-gray-400 font-medium flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-500" />
                        Final Salary
                      </span>
                      <span className="text-sm font-bold text-emerald-700">{formatCurrency(salary.total)}</span>
                    </div>
                  </div>

                  {/* OT Calculation Display */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 font-medium mb-2">OT Calculation</p>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <span>{salary.otHours} hours</span>
                      <span className="text-gray-300">x</span>
                      <span>{employee ? formatCurrency(employee.otRate) : '--'}/hr</span>
                      <span className="text-gray-300">=</span>
                      <span className="font-semibold text-gray-900">{formatCurrency(salary.otAmount)}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Salary Summary Table */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Monthly Salary Summary</h2>
                <p className="text-xs text-gray-400 mt-0.5">Complete breakdown for {salaryData[0]?.month}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <DollarSign size={18} className="text-blue-600" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Base Salary</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">OT Hours</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">OT Amount</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Bonus</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Final Salary</th>
                    <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalary.map((salary) => (
                    <tr key={salary.employeeId} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{salary.name}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(salary.base)}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{salary.otHours}h</td>
                      <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(salary.otAmount)}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(salary.bonus)}</td>
                      <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(salary.total)}</td>
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={salary.paid ? 'Delivered' : 'Pending'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 bg-gray-50/50">
                    <td className="py-3 px-4 font-semibold text-gray-900">Total</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(salaryData.reduce((s, r) => s + r.base, 0))}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{totalOTHours}h</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(salaryData.reduce((s, r) => s + r.otAmount, 0))}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(salaryData.reduce((s, r) => s + r.bonus, 0))}</td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">{formatCurrency(monthlyPayout)}</td>
                    <td className="py-3 px-4"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
