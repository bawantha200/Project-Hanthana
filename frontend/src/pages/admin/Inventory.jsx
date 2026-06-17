import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  Truck,
  Plus,
  UserPlus,
  Search,
  Filter,
  Factory, // new icon for production
} from 'lucide-react';
import InventoryTable from '../../components/InventoryTable';
import VendorTable from '../../components/VendorTable';
import { inventoryData, emptyBottleData, vendorData } from '../../data/mockData';
import { waterUsagePrediction } from '../../data/mockData';
import JITDashboard from '../../components/JITDashboard'; // <-- import the new dashboard

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
  { key: 'stock', label: 'Stock Levels', icon: Package },
  { key: 'empty', label: 'Empty Bottles', icon: AlertTriangle },
  { key: 'vendors', label: 'Vendors', icon: Truck },
  { key: 'production', label: 'Production', icon: Factory }, // new tab
];

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('production'); // default to production
  const [searchVendor, setSearchVendor] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const totalStock = inventoryData.reduce((sum, item) => sum + item.stock, 0);
  const totalPredicted = inventoryData.reduce((sum, item) => sum + item.predicted, 0);
  const lowStockItems = inventoryData.filter((item) => item.status === 'low').length;
  const [fromDate, setFromDate] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFromDate(today);
  }, []);

  const filteredVendors = vendorData.filter(
    (v) =>
      v.name.toLowerCase().includes(searchVendor.toLowerCase()) ||
      v.contact.toLowerCase().includes(searchVendor.toLowerCase()) ||
      v.supplyType.toLowerCase().includes(searchVendor.toLowerCase())
  );

  const refillData = inventoryData.filter((item) => item.type === 'refill');
  const lowStockAlerts = inventoryData.filter((item) => item.status === 'low');

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track stock levels, empty bottles, vendor relationships, and JIT production
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        variants={itemVariants}
        className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit flex-wrap"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
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
      </motion.div>

      {/* ===== RENDER PRODUCTION DASHBOARD ===== */}
      {activeTab === 'production' && <JITDashboard />}

      {/* ===== EXISTING TABS (unchanged) ===== */}
      {activeTab !== 'production' && (
        <>
          {/* Summary Cards - only for stock/empty/vendors */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Package size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Total Stock</p>
                  <p className="text-xl font-bold text-gray-900">{totalStock.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Predicted Needed</p>
                  <p className="text-xl font-bold text-gray-900">{totalPredicted.toLocaleString()}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-rose-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Low Stock Items</p>
                  <p className="text-xl font-bold text-gray-900">{lowStockItems}</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stock Levels Tab */}
          {activeTab === 'stock' && (
            <div className="space-y-6">
              <motion.div
                variants={itemVariants}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Bottle Stock Levels</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Current inventory</p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setShowCreateForm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    <Plus size={14} />
                    Add Stock
                  </motion.button>
                </div>
                {showCreateForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-white rounded-2xl shadow-sm border border-blue-200 p-6 ring-2 ring-blue-100"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                          <UserPlus size={18} className="text-blue-600" />
                        </div>
                        <h2 className="text-base font-semibold text-gray-900">Add Stock</h2>
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
                        <label className="block text-xs font-medium text-gray-600 mb-1">Volume</label>
                        <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white">
                          <option value="EMPLOYEE">500ml</option>
                          <option value="MANAGER">1L</option>
                          <option value="MANAGER">1.5L</option>
                          <option value="ADMIN">5L</option>
                          <option value="CUSTOMER">19L</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Quantity</label>
                        <input
                          type="number"
                          placeholder="Enter quantity"
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                        <input
                          type="date"
                          value={fromDate}
                          onChange={(e) => setFromDate(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
                      >
                        Clear
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors shadow-sm"
                      >
                        Edit Stock
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setShowCreateForm(false)}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        Add Stock
                      </motion.button>
                    </div>
                  </motion.div>
                )}
                <InventoryTable data={inventoryData} showPredicted={true} />
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Usage Prediction Analytics</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Actual vs predicted demand over time</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-blue-600" />
                  </div>
                </div>
                <div className="space-y-3">
                  {waterUsagePrediction.map((row) => {
                    const maxVal = Math.max(
                      ...waterUsagePrediction.map((r) => Math.max(r.actual, r.predicted))
                    );
                    const actualPct = row.actual > 0 ? (row.actual / maxVal) * 100 : 0;
                    const predictedPct = (row.predicted / maxVal) * 100;
                    return (
                      <div key={row.month} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-gray-700 w-10">{row.month}</span>
                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-gray-500">
                              Actual:{' '}
                              <span className="font-semibold text-gray-700">
                                {row.actual.toLocaleString()}
                              </span>
                            </span>
                            <span className="text-gray-500">
                              Predicted:{' '}
                              <span className="font-semibold text-blue-600">
                                {row.predicted.toLocaleString()}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 h-3">
                          <div className="flex-1 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${actualPct}%` }}
                              transition={{ duration: 0.6, delay: 0.1 }}
                              className="h-full bg-blue-600 rounded-full"
                            />
                          </div>
                          <div className="flex-1 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${predictedPct}%` }}
                              transition={{ duration: 0.6, delay: 0.2 }}
                              className="h-full bg-cyan-400 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-5 mt-4 pt-4 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                    <span className="text-gray-500">Actual</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                    <span className="text-gray-500">Predicted</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                variants={itemVariants}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                    <AlertTriangle size={16} className="text-rose-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">Low Stock Alerts</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {lowStockAlerts.length} items require restocking
                    </p>
                  </div>
                </div>
                <InventoryTable data={lowStockAlerts} showPredicted={true} />
              </motion.div>
            </div>
          )}

          {/* Empty Bottles Tab */}
          {activeTab === 'empty' && (
            <div className="space-y-6">
              <motion.div
                variants={itemVariants}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
              >
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-base font-semibold text-gray-900">Empty Bottle Tracking</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Returned empty bottles awaiting refill across branches
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Stock
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {emptyBottleData.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-gray-900">{item.product}</td>
                          <td className="py-3 px-4 text-gray-700 font-medium">
                            {item.stock.toLocaleString()}
                          </td>
                          <td className="py-3 px-4">
                            {item.status === 'low' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700">
                                <AlertTriangle size={10} />
                                Low
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700">
                                Sufficient
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          )}

          {/* Vendors Tab */}
          {activeTab === 'vendors' && (
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Vendor Management</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Manage suppliers and delivery partners</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search vendors..."
                      value={searchVendor}
                      onChange={(e) => setSearchVendor(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-48"
                    />
                  </div>
                </div>
              </div>
              <VendorTable vendors={filteredVendors} />
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}