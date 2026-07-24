// frontend/src/pages/admin/Orders.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Clock,
  Package,
  CheckCircle,
  Search,
  Filter,
  Computer,
  HandHelping,
  Plus,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  BarChart3,
  PieChart,
  XCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchOrders, fetchUsers, fetchProducts, createOrder } from '../../services/ordersService';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

// Animation variants
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

// Filter tabs for order status (matches DB enum)
const filterTabs = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'PLACED', label: 'Pending', icon: Clock },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

// Filter tabs for order type
const filterTabsMain = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'HOME_DELIVERY', label: 'Online', icon: Computer },
  { key: 'PICKUP', label: 'Physical', icon: HandHelping },
];

// Pagination constants
const PAGE_SIZE = 10;

export default function Orders() {
  const navigate = useNavigate();
  // ---------- State ----------
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [activeTypeFilter, setActiveTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Date filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterApplied, setDateFilterApplied] = useState(false);

  // Form state
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    customerId: '',
    orderType: 'HOME_DELIVERY',
    paymentMethod: 'CASH',
    deliveryLocation: '',
    items: [],
  });
  const [formLoading, setFormLoading] = useState(false);

  // ---------- Data fetching ----------
  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, usersData, productsData] = await Promise.all([
        fetchOrders(),
        fetchUsers(),
        fetchProducts(),
      ]);
      console.log('📦 Raw ordersData:', ordersData);
      console.log('📦 Number of orders:', ordersData?.length);
      if (ordersData && ordersData.length > 0) {
        console.log('📦 First order keys:', Object.keys(ordersData[0]));
        console.log('📦 First order sample:', ordersData[0]);
      } else {
        console.warn('⚠️ No orders returned or ordersData is null/undefined');
      }
      setOrders(ordersData || []);
      setUsers(usersData || []);
      setProducts(productsData || []);
      setCurrentPage(1); // Reset to first page when data loads
    } catch (err) {
      console.error('Failed to load data:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ---------- Computed summary ----------
  const totalOrders = orders.length;
  const placedOrders = orders.filter((o) => o.order_status === 'PLACED').length;
  const processingOrders = orders.filter((o) => o.order_status === 'PROCESSING').length;
  const completedOrders = orders.filter((o) => o.order_status === 'DELIVERED' || o.order_status === 'COMPLETED').length;
  const cancelledOrders = orders.filter((o) => o.order_status === 'CANCELLED').length;
  const homeDeliveryOrders = orders.filter((o) => o.order_type === 'HOME_DELIVERY').length;
  const pickupOrders = orders.filter((o) => o.order_type === 'PICKUP').length;

  // ---------- Monthly Summary ----------
  const getMonthlySummary = () => {
    const monthlyData = {};
    
    orders.forEach((order) => {
      const date = new Date(order.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthName,
          key: monthKey,
          total: 0,
          pending: 0,
          processing: 0,
          completed: 0,
          cancelled: 0,
          homeDelivery: 0,
          pickup: 0,
          statuses: {
            PLACED: 0,
            PROCESSING: 0,
            DELIVERED: 0,
            COMPLETED: 0,
            CANCELLED: 0
          }
        };
      }
      
      monthlyData[monthKey].total += 1;
      
      // Count by status
      if (order.order_status === 'PLACED') {
        monthlyData[monthKey].pending += 1;
      } else if (order.order_status === 'PROCESSING') {
        monthlyData[monthKey].processing += 1;
      } else if (order.order_status === 'DELIVERED' || order.order_status === 'COMPLETED') {
        monthlyData[monthKey].completed += 1;
      } else if (order.order_status === 'CANCELLED') {
        monthlyData[monthKey].cancelled += 1;
      }
      
      // Count by type
      if (order.order_type === 'HOME_DELIVERY') {
        monthlyData[monthKey].homeDelivery += 1;
      } else if (order.order_type === 'PICKUP') {
        monthlyData[monthKey].pickup += 1;
      }
      
      if (monthlyData[monthKey].statuses[order.order_status] !== undefined) {
        monthlyData[monthKey].statuses[order.order_status] += 1;
      }
    });
    
    // Sort by month (newest first)
    return Object.values(monthlyData).sort((a, b) => b.key.localeCompare(a.key));
  };

  const monthlySummary = getMonthlySummary();
  const currentMonthSummary = monthlySummary[0] || null;

  // ---------- Filtering ----------
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = activeStatusFilter === 'All' || order.order_status === activeStatusFilter;
    const matchesType = activeTypeFilter === 'All' || order.order_type === activeTypeFilter;
    const matchesSearch =
      order.id.toString().includes(searchQuery) ||
      (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.items?.some((item) =>
        item.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
      ) ?? false);

    // Date filtering
    let matchesDate = true;
    if (dateFilterApplied) {
      const orderDate = new Date(order.created_at);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) {
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && orderDate >= start;
      }
      if (end) {
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && orderDate <= end;
      }
    }

    return matchesStatus && matchesType && matchesSearch && matchesDate;
  });

  // ---------- Pagination ----------
  const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      // Scroll to top of table when changing pages
      document.querySelector('.orders-table-container')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // ---------- Date filter handlers ----------
  const applyDateFilter = () => {
    setDateFilterApplied(true);
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setDateFilterApplied(false);
    setCurrentPage(1);
  };

  // ---------- Form handlers ----------
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { productId: products[0]?.id || 0, quantity: 1 }],
    }));
  };

  const handleRemoveItem = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index, field, value) => {
    setFormData((prev) => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.customerId || formData.items.length === 0) {
      toast.error('Please select a customer and add at least one product.');
      return;
    }
    try {
      setFormLoading(true);
      await createOrder({
        customerId: formData.customerId,
        orderType: formData.orderType,
        paymentMethod: formData.paymentMethod,
        deliveryLocation: formData.deliveryLocation,
        items: formData.items,
      });
      toast.success('Order created successfully');
      await loadData(); // refresh orders
      setShowCreateForm(false);
      setFormData({
        customerId: '',
        orderType: 'HOME_DELIVERY',
        paymentMethod: 'CASH',
        deliveryLocation: '',
        items: [],
      });
    } catch (err) {
      console.error('Failed to create order:', err);
      toast.error('Error creating order. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  // ---------- Render ----------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage all customer orders</p>
        </div>
        
      </motion.div>

      {/* Overview Summary Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4"
      >
        {/* Total Orders */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <ShoppingCart size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Orders</p>
              <p className="text-lg font-bold text-gray-900">{totalOrders}</p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={16} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Pending</p>
              <p className="text-lg font-bold text-amber-600">{placedOrders}</p>
            </div>
          </div>
        </div>

        {/* Processing */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-50 flex items-center justify-center">
              <Package size={16} className="text-cyan-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Processing</p>
              <p className="text-lg font-bold text-cyan-600">{processingOrders}</p>
            </div>
          </div>
        </div>

        {/* Completed (DELIVERED + COMPLETED) */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Completed</p>
              <p className="text-lg font-bold text-emerald-600">{completedOrders}</p>
            </div>
          </div>
        </div>

        {/* Cancelled */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle size={16} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Cancelled</p>
              <p className="text-lg font-bold text-red-600">{cancelledOrders}</p>
            </div>
          </div>
        </div>

        {/* Home Delivery */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Computer size={16} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Home Delivery</p>
              <p className="text-lg font-bold text-indigo-600">{homeDeliveryOrders}</p>
            </div>
          </div>
        </div>

        {/* Pickup */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
              <HandHelping size={16} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Pickup</p>
              <p className="text-lg font-bold text-purple-600">{pickupOrders}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Monthly Summary Section */}
      {monthlySummary.length > 0 && currentMonthSummary && (
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-700">Monthly Summary</h3>
              <span className="text-xs text-gray-400">|</span>
              <span className="text-xs text-gray-500">{currentMonthSummary.month}</span>
            </div>
          </div>
          
          <div className="p-5">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Total Orders */}
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={14} className="text-blue-600" />
                  <p className="text-xs text-blue-600 font-medium">Total</p>
                </div>
                <p className="text-xl font-bold text-blue-700">{currentMonthSummary.total}</p>
              </div>
              
              {/* Pending */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-amber-600" />
                  <p className="text-xs text-amber-600 font-medium">Pending</p>
                </div>
                <p className="text-xl font-bold text-amber-700">{currentMonthSummary.pending}</p>
              </div>
              
              {/* Processing */}
              <div className="bg-cyan-50 rounded-xl p-3 border border-cyan-100">
                <div className="flex items-center gap-2">
                  <Package size={14} className="text-cyan-600" />
                  <p className="text-xs text-cyan-600 font-medium">Processing</p>
                </div>
                <p className="text-xl font-bold text-cyan-700">{currentMonthSummary.processing}</p>
              </div>
              
              {/* Completed */}
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600" />
                  <p className="text-xs text-emerald-600 font-medium">Completed</p>
                </div>
                <p className="text-xl font-bold text-emerald-700">{currentMonthSummary.completed}</p>
              </div>
              
              {/* Cancelled */}
              <div className="bg-red-50 rounded-xl p-3 border border-red-100">
                <div className="flex items-center gap-2">
                  <XCircle size={14} className="text-red-600" />
                  <p className="text-xs text-red-600 font-medium">Cancelled</p>
                </div>
                <p className="text-xl font-bold text-red-700">{currentMonthSummary.cancelled}</p>
              </div>
              
              {/* Home Delivery */}
              <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
                <div className="flex items-center gap-2">
                  <Computer size={14} className="text-indigo-600" />
                  <p className="text-xs text-indigo-600 font-medium">Home Delivery</p>
                </div>
                <p className="text-xl font-bold text-indigo-700">{currentMonthSummary.homeDelivery}</p>
              </div>
              
              {/* Pickup */}
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                <div className="flex items-center gap-2">
                  <HandHelping size={14} className="text-purple-600" />
                  <p className="text-xs text-purple-600 font-medium">Pickup</p>
                </div>
                <p className="text-xl font-bold text-purple-700">{currentMonthSummary.pickup}</p>
              </div>
            </div>
            
            {/* Previous Months Quick View */}
            {monthlySummary.length > 1 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-400 font-medium">Previous Months:</span>
                  {monthlySummary.slice(1, 4).map((month) => (
                    <span key={month.key} className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                      {month.month}: {month.total} orders
                    </span>
                  ))}
                  {monthlySummary.length > 4 && (
                    <span className="text-xs text-gray-400">+{monthlySummary.length - 4} more</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Filter Tabs & Search */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4"
      >
        {/* Type and Status filters row */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Type filters */}
          <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
            {filterTabsMain.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTypeFilter(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeTypeFilter === tab.key
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

          {/* Status filters */}
          <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveStatusFilter(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    activeStatusFilter === tab.key
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

          {/* Search */}
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
        </div>

        {/* Date Filter Row */}
        <div className="flex items-center gap-3 flex-wrap bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Date Range:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50"
            />
          </div>
          <button
            onClick={applyDateFilter}
            className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Apply
          </button>
          {(dateFilterApplied || startDate || endDate) && (
            <button
              onClick={clearDateFilter}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>
          )}
          {dateFilterApplied && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              Filtered
            </span>
          )}
        </div>
      </motion.div>

      {/* Orders Table */}
      <motion.div
        variants={itemVariants}
        className="orders-table-container bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {activeStatusFilter === 'All' ? 'All Orders' : `${activeStatusFilter} Orders`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
              {dateFilterApplied && ' (filtered by date)'}
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Page {currentPage} of {totalPages || 1}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Total</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => (
                <tr key={order.id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-gray-900">#{order.id}</td>
                  <td className="px-6 py-3">
                    <div className="font-medium text-gray-800">{order.customer_name || 'N/A'}</div>
                    <div className="text-xs text-gray-400">{order.customer_phone || ''}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        order.order_type === 'HOME_DELIVERY'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {order.order_type === 'HOME_DELIVERY' ? 'Online' : 'Pickup'}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        order.order_status === 'PLACED'
                          ? 'bg-amber-100 text-amber-700'
                          : order.order_status === 'PROCESSING'
                          ? 'bg-cyan-100 text-cyan-700'
                          : order.order_status === 'DELIVERED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : order.order_status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {order.order_status === 'PLACED'
                        ? 'Pending'
                        : order.order_status === 'PROCESSING'
                        ? 'Processing'
                        : order.order_status === 'DELIVERED'
                        ? 'Delivered'
                        : order.order_status === 'COMPLETED'
                        ? 'Completed'
                        : 'Cancelled'}
                    </span>
                  </td>
                  <td className="px-6 py-3 font-semibold">{formatCurrency(order.total_amount)}</td>
                  <td className="px-6 py-3 text-gray-600">
                    {order.items?.map((item) => `${item.quantity}x ${item.product_name}`).join(', ')}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Eye size={14} />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400">
            <ShoppingCart size={36} className="mb-3 text-gray-300" />
            <p className="font-medium">No orders found</p>
            <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredOrders.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-gray-500">
              Showing {startIndex + 1} - {Math.min(startIndex + PAGE_SIZE, filteredOrders.length)} of {filteredOrders.length} orders
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 rounded-lg text-sm transition-colors ${
                  currentPage === 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                      onClick={() => handlePageChange(pageNum)}
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
                  <>
                    <span className="text-gray-400">...</span>
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      className="w-8 h-8 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg text-sm transition-colors ${
                  currentPage === totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}