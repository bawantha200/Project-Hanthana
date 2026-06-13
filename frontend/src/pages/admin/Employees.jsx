import { useState,useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, Filter, Phone, Mail,Plus, MapPin, Award, Briefcase, Calendar } from 'lucide-react';
import StatusBadge from '../../components/StatusBadge';
import RoleBadge from '../../components/RoleBadge';
import { employeeData } from '../../data/mockData';
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

const filterTabs = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'Driver', label: 'Drivers', icon: Briefcase },
  { key: 'Warehouse Staff', label: 'Warehouse', icon: Briefcase },
  { key: 'Delivery Staff', label: 'Delivery', icon: Briefcase },
  { key: 'Branch Manager', label: 'Managers', icon: Award },
  { key: 'Operations Manager', label: 'Ops Managers', icon: Award },
  { key: 'Customer Support', label: 'Support', icon: Briefcase },
];

const summaryCards = [
  {
    key: 'total',
    label: 'Total Staff',
    icon: Users,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
  },
  {
    key: 'active',
    label: 'Active',
    icon: Users,
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-600',
  },
  {
    key: 'onLeave',
    label: 'On Leave',
    icon: Calendar,
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-600',
  },
  {
    key: 'managers',
    label: 'Managers',
    icon: Award,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
  },
];

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

export default function Employees() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [fromDate, setFromDate] = useState('');
    
      // Set today's date when component loads
      useEffect(() => {
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        setFromDate(today);
      }, []);

  const totalStaff = employeeData.length;
  const activeStaff = employeeData.filter((e) => e.status === 'active').length;
  const onLeaveStaff = employeeData.filter((e) => e.status === 'on_leave').length;
  const managers = employeeData.filter((e) => e.role === 'MANAGER').length;

  const summaryValues = {
    total: totalStaff,
    active: activeStaff,
    onLeave: onLeaveStaff,
    managers,
  };

  const filteredEmployees = employeeData.filter((employee) => {
    const matchesPosition = activeFilter === 'All' || employee.position === activeFilter;
    const matchesSearch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.branch.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPosition && matchesSearch;
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage staff, track performance, and monitor employee activity
          </p>
        </div>
        <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Plus size={14} />
                  Add Employee
        </motion.button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
                  <p className="text-xl font-bold text-gray-900">{summaryValues[card.key]}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Filter Tabs & Search */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 overflow-x-auto">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  activeFilter === tab.key
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

      {/* Create Order Modal Placeholder */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-white rounded-2xl shadow-sm border border-blue-200 p-6 ring-2 ring-blue-100"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {/* <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <UserPlus size={18} className="text-blue-600" />
              </div> */}
              <h2 className="text-base font-semibold text-gray-900">Add Employee</h2>
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
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telephone Number</label>
              <input
                type="tel"
                placeholder="Enter telephone number"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Job Type</label>
              <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                <option value="EMPLOYEE">Order Manager </option>
                <option value="MANAGER">Delivery Manager</option>
                <option value="MANAGER">HRM Manager</option>
                <option value="MANAGER">Finance Manager</option>
                <option value="ADMIN">Inventory Manager</option>
                <option value="CUSTOMER">Supply Manager</option>
                <option value="EMPLOYEE">Driver</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="Enter email"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div >
              <label className="block text-xs font-medium text-gray-600 mb-1">Hired Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            
          </div>
          <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
            {/* <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-orange-100 rounded-lg hover:bg-orange-200 transition-colors"
            >
              Clear
            </button> */}

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-400 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
            >
              Clear
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Place Job
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Employee Cards Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredEmployees.map((employee) => {
          const perfScore = getPerformanceScore(employee);
          const perf = getPerformanceLabel(perfScore);
          const isSelected = selectedEmployee?.id === employee.id;

          return (
            <motion.div
              key={employee.id}
              variants={itemVariants}
              whileHover={{ y: -2 }}
              onClick={() => setSelectedEmployee(isSelected ? null : employee)}
              className={`bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md transition-all duration-200 cursor-pointer ${
                isSelected ? 'border-blue-300 shadow-md' : 'border-gray-100'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                    {employee.avatar}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{employee.name}</h3>
                    <p className="text-xs text-gray-500">{employee.position}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <RoleBadge role={employee.role} />
                  <StatusBadge status={employee.status} />
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 mb-4">
                {/* <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={14} className="text-gray-400" />
                  <span>{employee.branch}</span>
                </div> */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone size={14} className="text-gray-400" />
                  <span>{employee.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Mail size={14} className="text-gray-400" />
                  <span>{employee.email}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={14} className="text-gray-400" />
                  <span>Hired: {employee.hireDate}</span>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-400 font-medium">Performance</span>
                  <span className={`text-xs font-semibold ${perf.color}`}>{perf.label}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      perfScore >= 85 ? 'bg-emerald-500' : perfScore >= 70 ? 'bg-blue-500' : perfScore >= 55 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${perfScore}%` }}
                  />
                </div>
              </div>

              <div className="mt-4">
                <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowCreateForm(false)}
                    className="px-2 py-1 text-sm font-medium text-white bg-orange-400 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                  >
                    Edit
                </motion.button>
                &nbsp;
                <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowCreateForm(false)}
                    className="px-2 py-1 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                  >
                    Delete
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {filteredEmployees.length === 0 && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
        >
          <Users size={36} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-400 text-sm">No employees found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
        </motion.div>
      )}

      {/* Employee Performance Detail Card */}
      {selectedEmployee && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600">
                {selectedEmployee.avatar}
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">{selectedEmployee.name}</h3>
                <p className="text-sm text-gray-500">{selectedEmployee.position}</p>
                <div className="flex items-center gap-2 mt-1">
                  <RoleBadge role={selectedEmployee.role} />
                  <StatusBadge status={selectedEmployee.status} />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone size={16} className="text-gray-400" />
                <span>{selectedEmployee.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail size={16} className="text-gray-400" />
                <span>{selectedEmployee.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin size={16} className="text-gray-400" />
                <span>{selectedEmployee.branch}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Calendar size={16} className="text-gray-400" />
                <span>Hired on {selectedEmployee.hireDate}</span>
              </div>
            </div>
          </motion.div>

          {/* Compensation Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <h3 className="text-base font-semibold text-gray-900 mb-5">Compensation</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">Base Salary</p>
                <p className="text-lg font-bold text-blue-700 mt-1">{formatCurrency(selectedEmployee.baseSalary)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">OT Rate (per hour)</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(selectedEmployee.otRate)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">Estimated Monthly OT</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{formatCurrency(selectedEmployee.otRate * 12)}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 font-medium">Estimated Monthly Total</p>
                <p className="text-sm font-semibold text-emerald-700 mt-1">
                  {formatCurrency(selectedEmployee.baseSalary + selectedEmployee.otRate * 12)}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Performance Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <h3 className="text-base font-semibold text-gray-900 mb-5">Performance</h3>
            {(() => {
              const score = getPerformanceScore(selectedEmployee);
              const perf = getPerformanceLabel(score);
              const tenureYears = ((new Date() - new Date(selectedEmployee.hireDate)) / (1000 * 60 * 60 * 24 * 365)).toFixed(1);
              return (
                <div className="space-y-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-24 h-24 rounded-full ${perf.bg} flex items-center justify-center mb-3`}>
                      <span className={`text-2xl font-bold ${perf.color}`}>{score}</span>
                    </div>
                    <span className={`text-sm font-semibold ${perf.color}`}>{perf.label}</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Briefcase size={14} className="text-gray-400" />
                        Position
                      </span>
                      <span className="font-medium text-gray-900">{selectedEmployee.position}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Award size={14} className="text-gray-400" />
                        Role
                      </span>
                      <RoleBadge role={selectedEmployee.role} />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        Tenure
                      </span>
                      <span className="font-medium text-gray-900">{tenureYears} years</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
