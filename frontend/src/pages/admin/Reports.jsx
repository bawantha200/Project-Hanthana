import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Download, Calendar, BarChart3, Package, Users, DollarSign, Truck } from 'lucide-react';
import { financialData, inventoryData, deliveryData } from '../../data/mockData';

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

const reportTypes = [
  {
    key: 'financial',
    label: 'Financial Report',
    description: 'Revenue, expenses, profit margins, and cost breakdowns',
    icon: DollarSign,
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    key: 'inventory',
    label: 'Inventory Report',
    description: 'Stock levels, predictions, low stock alerts, and bottle tracking',
    icon: Package,
    color: 'amber',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    key: 'delivery',
    label: 'Delivery Report',
    description: 'Delivery status, routes, driver performance, and ETAs',
    icon: Truck,
    color: 'cyan',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
  },
  {
    key: 'hr',
    label: 'HR Report',
    description: 'Employee attendance, salary disbursement, and workforce analytics',
    icon: Users,
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
];

const generatedReports = [
  { id: 'RPT-001', name: 'Q1 Financial Summary', type: 'financial', date: '2026-04-01', size: '2.4 MB' },
  { id: 'RPT-002', name: 'April Inventory Audit', type: 'inventory', date: '2026-05-01', size: '1.8 MB' },
  { id: 'RPT-003', name: 'Monthly Delivery Performance', type: 'delivery', date: '2026-05-05', size: '1.2 MB' },
  { id: 'RPT-004', name: 'Employee Attendance Report', type: 'hr', date: '2026-05-03', size: '980 KB' },
  { id: 'RPT-005', name: 'Revenue by Branch', type: 'financial', date: '2026-05-07', size: '1.5 MB' },
  { id: 'RPT-006', name: 'Stock Prediction Analysis', type: 'inventory', date: '2026-05-08', size: '2.1 MB' },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [dateFrom, setDateFrom] = useState('2026-04-01');
  const [dateTo, setDateTo] = useState('2026-05-09');

  const getReportTypeColor = (type) => {
    const colors = {
      financial: 'bg-blue-50 text-blue-700',
      inventory: 'bg-amber-50 text-amber-700',
      delivery: 'bg-cyan-50 text-cyan-700',
      hr: 'bg-emerald-50 text-emerald-700',
    };
    return colors[type] || 'bg-gray-50 text-gray-700';
  };

  const getReportTypeLabel = (type) => {
    const labels = {
      financial: 'Financial',
      inventory: 'Inventory',
      delivery: 'Delivery',
      hr: 'HR',
    };
    return labels[type] || type;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate, view, and export business reports across all departments
        </p>
      </motion.div>

      {/* Report Type Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <motion.div
              key={report.key}
              whileHover={{ y: -2 }}
              onClick={() => setSelectedReport(report.key)}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 cursor-pointer hover:shadow-md transition-all duration-200 ${
                selectedReport === report.key ? 'ring-2 ring-blue-500 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${report.bgColor} flex items-center justify-center`}>
                  <Icon size={18} className={report.textColor} />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{report.label}</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{report.description}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Date Range Selector */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Calendar size={18} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Date Range</h2>
            <p className="text-xs text-gray-400 mt-0.5">Select the reporting period</p>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <BarChart3 size={16} />
            Generate Report
          </motion.button>
        </div>
      </motion.div>

      {/* Generated Reports List */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Generated Reports</h2>
            <p className="text-xs text-gray-400 mt-0.5">Previously generated reports ready for download</p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-medium hover:bg-rose-100 transition-colors"
            >
              <Download size={14} />
              PDF
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              <Download size={14} />
              Excel
            </motion.button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Report ID</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Report Name</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {generatedReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-blue-600">{report.id}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">{report.name}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getReportTypeColor(report.type)}`}>
                      {getReportTypeLabel(report.type)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-500">{report.date}</td>
                  <td className="py-3 px-4 text-gray-500">{report.size}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
                      >
                        <Download size={12} />
                        PDF
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        <Download size={12} />
                        Excel
                      </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Quick Stats Summary */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <DollarSign size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Income</p>
              <p className="text-xl font-bold text-gray-900">
                {'LKR '}{financialData.reduce((sum, d) => sum + d.income, 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Package size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Stock Items</p>
              <p className="text-xl font-bold text-gray-900">{inventoryData.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
              <Truck size={18} className="text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Active Deliveries</p>
              <p className="text-xl font-bold text-gray-900">
                {deliveryData.filter((d) => d.status !== 'Delivered').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FileText size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Reports Generated</p>
              <p className="text-xl font-bold text-gray-900">{generatedReports.length}</p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
