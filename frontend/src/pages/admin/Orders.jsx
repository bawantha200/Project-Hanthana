import { useState,useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Clock, Package, CheckCircle, Search, Filter, Computer, HandGrab, Hand, HandHelping } from 'lucide-react';
import OrderTable from '../../components/OrderTable';
import { recentOrders } from '../../data/mockData';
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

const filterTabsMain = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'Online', label: 'Online', icon: Computer },
  { key: 'Physical', label: 'Physical', icon: HandHelping },

];

const filterTabs = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'Pending', label: 'Pending', icon: Clock },
  { key: 'Preparing', label: 'Preparing', icon: Package },
  { key: 'Delivered', label: 'Delivered', icon: CheckCircle },
];

const summaryCards = [
  {
    key: 'total',
    label: 'Total Orders',
    icon: ShoppingCart,
    color: 'blue',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
  },
  {
    key: 'pending',
    label: 'Pending',
    icon: Clock,
    color: 'amber',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-600',
  },
  {
    key: 'preparing',
    label: 'Preparing',
    icon: Package,
    color: 'cyan',
    bgClass: 'bg-cyan-50',
    textClass: 'text-cyan-600',
  },
  {
    key: 'delivered',
    label: 'Delivered',
    icon: CheckCircle,
    color: 'emerald',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-600',
  },
];

export default function Orders() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const totalOrders = recentOrders.length;
  const pendingOrders = recentOrders.filter((o) => o.status === 'Pending').length;
  const preparingOrders = recentOrders.filter((o) => o.status === 'Preparing').length;
  const deliveredOrders = recentOrders.filter((o) => o.status === 'Delivered').length;
  const [fromDate, setFromDate] = useState('');
  
    // Set today's date when component loads
    useEffect(() => {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      setFromDate(today);
    }, []);

  const summaryValues = {
    total: totalOrders,
    pending: pendingOrders,
    preparing: preparingOrders,
    delivered: deliveredOrders,
  };

  const filteredOrders = recentOrders.filter((order) => {
    const matchesStatus = activeFilter === 'All' || order.status === activeFilter;
    const matchesSearch =
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch;
  });

  const totalRevenue = recentOrders.reduce((sum, o) => sum + o.amount, 0);

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
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage all customer orders
          </p>
        </div>
        <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowCreateForm(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                  {/* <UserPlus size={16} /> */}
                  Customer Order
        </motion.button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {summaryCards.map((card, index) => {
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
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {filterTabsMain.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
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
        
      </motion.div>

      {/* Filter Tabs & Search */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
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
            placeholder="Search orders..."
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
              <h2 className="text-base font-semibold text-gray-900">Customer Order</h2>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Qty</label>
              <input
                type="number"
                placeholder="Enter quantity"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              />
            </div>
            <div >
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
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-sm"
            >
              Clear
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Place Order
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Orders Table */}
      <motion.div
        variants={itemVariants}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {activeFilter === 'All' ? 'All Orders' : `${activeFilter} Orders`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
              {activeFilter !== 'All' && ` in ${activeFilter.toLowerCase()} status`}
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Total Revenue: <span className="font-semibold text-gray-900">{formatCurrency(totalRevenue)}</span>
          </div>
        </div>
        <OrderTable orders={filteredOrders} />
        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400">
            <ShoppingCart size={36} className="mb-3 text-gray-300" />
            <p className="font-medium">No orders found</p>
            <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
