// frontend/src/pages/admin/Orders.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
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
  BarChart3,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrders, fetchUsers, fetchProducts, createOrder } from '../../services/ordersService';
import { formatCurrency } from '../../utils/helpers';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';


// ─── Query Keys ───
const QUERY_KEYS = {
  ORDERS: ['orders'],
  USERS: ['users'],
  PRODUCTS: ['products'],
};

// ─── Animation Variants ───
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

// ─── Filter Tabs ───
const filterTabs = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'PLACED', label: 'Pending', icon: Clock },
  { key: 'PROCESSING', label: 'Processing', icon: Package },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
];

const filterTabsMain = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'HOME_DELIVERY', label: 'Online', icon: Computer },
  { key: 'PICKUP', label: 'Physical', icon: HandHelping },
];

const PAGE_SIZE = 10;

export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isCEO = user?.role?.toUpperCase() === 'CEO';
  

  // ─── State ───
  const [activeStatusFilter, setActiveStatusFilter] = useState('All');
  const [activeTypeFilter, setActiveTypeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterApplied, setDateFilterApplied] = useState(false);

  // ─── Form State ───
  const [formData, setFormData] = useState({
    customerId: '',
    orderType: 'HOME_DELIVERY',
    paymentMethod: 'CASH',
    deliveryLocation: '',
    items: [],
  });

  // ─── React Query: Fetch Orders ───
  const {
    data: ordersData = [],
    isLoading: ordersLoading,
    isFetching: ordersFetching,
    error: ordersError,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: QUERY_KEYS.ORDERS,
    queryFn: fetchOrders,
    staleTime: 30000, // 30 seconds
    gcTime: 300000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 60000, // Refetch every 60 seconds
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Users ───
  const {
    data: usersData = [],
    isLoading: usersLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.USERS,
    queryFn: fetchUsers,
    staleTime: 120000, // 2 minutes
    gcTime: 600000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // ─── React Query: Fetch Products ───
  const {
    data: productsData = [],
    isLoading: productsLoading,
  } = useQuery({
    queryKey: QUERY_KEYS.PRODUCTS,
    queryFn: fetchProducts,
    staleTime: 120000, // 2 minutes
    gcTime: 600000, // 10 minutes
    refetchOnWindowFocus: false,
  });

  // ─── Create Order Mutation ───
  const createOrderMutation = useMutation({
    mutationFn: (orderData) => createOrder(orderData),
    onSuccess: () => {
      // Invalidate orders cache to refresh the list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDERS });
      toast.success('Order created successfully');
      setShowCreateForm(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Failed to create order:', error);
      toast.error(error.response?.data?.message || 'Error creating order. Please try again.');
    },
  });

  // ─── Memoized Data ───
  const orders = useMemo(() => ordersData || [], [ordersData]);
  const users = useMemo(() => usersData || [], [usersData]);
  const products = useMemo(() => productsData || [], [productsData]);

  // ─── Computed Summary (Memoized) ───
  const summary = useMemo(() => {
    const totalOrders = orders.length;
    const placedOrders = orders.filter((o) => o.order_status === 'PLACED').length;
    const processingOrders = orders.filter((o) => o.order_status === 'PROCESSING').length;
    const completedOrders = orders.filter((o) => o.order_status === 'DELIVERED' || o.order_status === 'COMPLETED').length;
    const cancelledOrders = orders.filter((o) => o.order_status === 'CANCELLED').length;
    const homeDeliveryOrders = orders.filter((o) => o.order_type === 'HOME_DELIVERY').length;
    const pickupOrders = orders.filter((o) => o.order_type === 'PICKUP').length;

    return {
      totalOrders,
      placedOrders,
      processingOrders,
      completedOrders,
      cancelledOrders,
      homeDeliveryOrders,
      pickupOrders,
    };
  }, [orders]);

  // ─── Monthly Summary (Memoized) ───
  const monthlySummary = useMemo(() => {
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
        };
      }
      
      monthlyData[monthKey].total += 1;
      
      if (order.order_status === 'PLACED') monthlyData[monthKey].pending += 1;
      else if (order.order_status === 'PROCESSING') monthlyData[monthKey].processing += 1;
      else if (order.order_status === 'DELIVERED' || order.order_status === 'COMPLETED') monthlyData[monthKey].completed += 1;
      else if (order.order_status === 'CANCELLED') monthlyData[monthKey].cancelled += 1;
      
      if (order.order_type === 'HOME_DELIVERY') monthlyData[monthKey].homeDelivery += 1;
      else if (order.order_type === 'PICKUP') monthlyData[monthKey].pickup += 1;
    });
    
    return Object.values(monthlyData).sort((a, b) => b.key.localeCompare(a.key));
  }, [orders]);

  const currentMonthSummary = monthlySummary[0] || null;

  // ─── Filtering (Memoized) ───
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = activeStatusFilter === 'All' || order.order_status === activeStatusFilter;
      const matchesType = activeTypeFilter === 'All' || order.order_type === activeTypeFilter;
      const matchesSearch =
        order.id.toString().includes(searchQuery) ||
        (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (order.items?.some((item) =>
          item.product_name?.toLowerCase().includes(searchQuery.toLowerCase())
        ) ?? false);

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
  }, [orders, activeStatusFilter, activeTypeFilter, searchQuery, dateFilterApplied, startDate, endDate]);

  // ─── Pagination (Memoized) ───
  const pagination = useMemo(() => {
    const totalPages = Math.ceil(filteredOrders.length / PAGE_SIZE);
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);
    return { totalPages, startIndex, paginatedOrders };
  }, [filteredOrders, currentPage]);

  // ─── Reset to first page when filters change ───
  useEffect(() => {
    setCurrentPage(1);
  }, [activeStatusFilter, activeTypeFilter, searchQuery, dateFilterApplied]);

  // ─── Form Handlers ───
  const resetForm = () => {
    setFormData({
      customerId: '',
      orderType: 'HOME_DELIVERY',
      paymentMethod: 'CASH',
      deliveryLocation: '',
      items: [],
    });
  };

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerId || formData.items.length === 0) {
      toast.error('Please select a customer and add at least one product.');
      return;
    }
    createOrderMutation.mutate({
      customerId: formData.customerId,
      orderType: formData.orderType,
      paymentMethod: formData.paymentMethod,
      deliveryLocation: formData.deliveryLocation,
      items: formData.items,
    });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
      document.querySelector('.orders-table-container')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStatusFilterChange = (filterKey) => {
    setActiveStatusFilter(filterKey);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (filterKey) => {
    setActiveTypeFilter(filterKey);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

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

  const calculateTotalWithDelivery = (order) => {
    const totalAmount = parseFloat(order.total_amount) || 0;
    const deliveryFee = parseFloat(order.delivery_fee) || 0;
    return totalAmount + deliveryFee;
  };

  const isLoading = ordersLoading || usersLoading || productsLoading;

  // ─── Render ───
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-500">Loading orders...</p>
      </div>
    );
  }

  if (ordersError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">
          <XCircle size={48} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Failed to load orders</h3>
        <p className="text-sm text-gray-500 mt-1">{ordersError.message}</p>
        <button
          onClick={() => refetchOrders()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
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
      {/* ─── Page Header ─── */}
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage all customer orders</p>
        </div>
        <div className="flex items-center gap-3">
  {/* Refresh Button */}
  <button
    onClick={() => refetchOrders()}
    disabled={ordersFetching}
    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
  >
    <RefreshCw size={16} className={ordersFetching ? 'animate-spin' : ''} />
    Refresh
  </button>
  {/* Create Order Button */}
  {!isCEO && (
    <button
      onClick={() => setShowCreateForm(true)}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
    >
      <Plus size={16} />
      New Order
    </button>
  )}
</div>
      </motion.div>

      {/* ─── Overview Summary Cards ─── */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4"
      >
        <SummaryCard
          icon={ShoppingCart}
          label="Total Orders"
          value={summary.totalOrders}
          color="blue"
        />
        <SummaryCard
          icon={Clock}
          label="Pending"
          value={summary.placedOrders}
          color="amber"
        />
        <SummaryCard
          icon={Package}
          label="Processing"
          value={summary.processingOrders}
          color="cyan"
        />
        <SummaryCard
          icon={CheckCircle}
          label="Completed"
          value={summary.completedOrders}
          color="emerald"
        />
        <SummaryCard
          icon={XCircle}
          label="Cancelled"
          value={summary.cancelledOrders}
          color="red"
        />
        <SummaryCard
          icon={Computer}
          label="Home Delivery"
          value={summary.homeDeliveryOrders}
          color="indigo"
        />
        <SummaryCard
          icon={HandHelping}
          label="Pickup"
          value={summary.pickupOrders}
          color="purple"
        />
      </motion.div>

      {/* ─── Monthly Summary ─── */}
      {currentMonthSummary && (
        <MonthlySummary 
          summary={currentMonthSummary} 
          monthlySummary={monthlySummary} 
        />
      )}

      {/* ─── Filters ─── */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
            {filterTabsMain.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTypeFilterChange(tab.key)}
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

          <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleStatusFilterChange(tab.key)}
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

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-56 bg-white"
            />
          </div>
        </div>

        {/* Date Filter */}
        <DateFilter
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          onApply={applyDateFilter}
          onClear={clearDateFilter}
          isApplied={dateFilterApplied}
        />
      </motion.div>

      {/* ─── Orders Table ─── */}
      <motion.div
        variants={itemVariants}
        className="orders-table-container bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {activeStatusFilter === 'All' ? 'All Orders' : `${activeStatusFilter} Orders`}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
              {ordersFetching && ' (updating...)'}
              {dateFilterApplied && ' (filtered by date)'}
            </p>
          </div>
          <div className="text-xs text-gray-500">
            Page {currentPage} of {pagination.totalPages || 1}
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
                {!isCEO && <th className="px-6 py-3">Actions</th>}

              </tr>
            </thead>
            <tbody>
              {pagination.paginatedOrders.map((order) => (
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
                          : order.order_status === 'DELIVERED' || order.order_status === 'COMPLETED'
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
                  <td className="px-6 py-3 font-semibold">
                    {formatCurrency(calculateTotalWithDelivery(order))}
                  </td>
                  <td className="px-6 py-3 text-gray-600 max-w-xs truncate">
                    {order.items?.map((item) => `${item.quantity}x ${item.product_name}`).join(', ')}
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  {!isCEO && (
  <td className="px-6 py-3">
    <button
      onClick={() => navigate(`/app/orders/${order.id}`)}
      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
    >
      <Eye size={14} />
      View Details
    </button>
  </td>
)}
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

        {/* Pagination */}
        {filteredOrders.length > 0 && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            startIndex={pagination.startIndex}
            totalItems={filteredOrders.length}
            onPageChange={handlePageChange}
          />
        )}
      </motion.div>

      {/* ─── Create Order Modal ─── */}
      {showCreateForm && (
        <CreateOrderModal
          formData={formData}
          setFormData={setFormData}
          users={users}
          products={products}
          onAddItem={handleAddItem}
          onRemoveItem={handleRemoveItem}
          onItemChange={handleItemChange}
          onSubmit={handleSubmit}
          onClose={() => setShowCreateForm(false)}
          isLoading={createOrderMutation.isPending}
        />
      )}
    </motion.div>
  );
}

// ─── Sub-components ───

function SummaryCard({ icon: Icon, label, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-xl ${colorClasses[color].split(' ')[0]} flex items-center justify-center`}>
          <Icon size={16} className={colorClasses[color].split(' ')[1]} />
        </div>
        <div>
          <p className="text-xs text-gray-400 font-medium">{label}</p>
          <p className={`text-lg font-bold ${colorClasses[color].split(' ')[1]}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}

function MonthlySummary({ summary, monthlySummary }) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-blue-600" />
          <h3 className="text-sm font-semibold text-gray-700">Monthly Summary</h3>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs text-gray-500">{summary.month}</span>
        </div>
      </div>
      
      <div className="p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <MonthlyStat label="Total" value={summary.total} color="blue" icon={ShoppingCart} />
          <MonthlyStat label="Pending" value={summary.pending} color="amber" icon={Clock} />
          <MonthlyStat label="Processing" value={summary.processing} color="cyan" icon={Package} />
          <MonthlyStat label="Completed" value={summary.completed} color="emerald" icon={CheckCircle} />
          <MonthlyStat label="Cancelled" value={summary.cancelled} color="red" icon={XCircle} />
          <MonthlyStat label="Home Delivery" value={summary.homeDelivery} color="indigo" icon={Computer} />
          <MonthlyStat label="Pickup" value={summary.pickup} color="purple" icon={HandHelping} />
        </div>
        
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
  );
}

function MonthlyStat({ label, value, color, icon: Icon }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    cyan: 'bg-cyan-50 border-cyan-100 text-cyan-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
  };

  const iconColors = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    cyan: 'text-cyan-600',
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    indigo: 'text-indigo-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={`${colors[color]} rounded-xl p-3 border`}>
      <div className="flex items-center gap-2">
        <Icon size={14} className={iconColors[color]} />
        <p className="text-xs font-medium">{label}</p>
      </div>
      <p className={`text-xl font-bold ${iconColors[color]}`}>{value}</p>
    </div>
  );
}

function DateFilter({ startDate, endDate, onStartDateChange, onEndDateChange, onApply, onClear, isApplied }) {
  return (
    <div className="flex items-center gap-3 flex-wrap bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
      <div className="flex items-center gap-2">
        <Calendar size={16} className="text-gray-400" />
        <span className="text-sm font-medium text-gray-600">Date Range:</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50"
        />
        <span className="text-gray-400 text-sm">to</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50"
        />
      </div>
      <button
        onClick={onApply}
        className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
      >
        Apply
      </button>
      {(isApplied || startDate || endDate) && (
        <button
          onClick={onClear}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Clear
        </button>
      )}
      {isApplied && (
        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Filtered</span>
      )}
    </div>
  );
}

function PaginationControls({ currentPage, totalPages, startIndex, totalItems, onPageChange }) {
  return (
    <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
      <div className="text-xs text-gray-500">
        Showing {startIndex + 1} - {Math.min(startIndex + PAGE_SIZE, totalItems)} of {totalItems} orders
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
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
                onClick={() => onPageChange(pageNum)}
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
                onClick={() => onPageChange(totalPages)}
                className="w-8 h-8 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>
        <button
          onClick={() => onPageChange(currentPage + 1)}
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
  );
}

// ─── Create Order Modal ───
function CreateOrderModal({ 
  formData, 
  setFormData, 
  users, 
  products, 
  onAddItem, 
  onRemoveItem, 
  onItemChange, 
  onSubmit, 
  onClose, 
  isLoading 
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Create New Order</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XCircle size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              required
            >
              <option value="">Select a customer</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Order Type
            </label>
            <select
              value={formData.orderType}
              onChange={(e) => setFormData({ ...formData, orderType: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="HOME_DELIVERY">Home Delivery</option>
              <option value="PICKUP">Pickup</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          {/* Delivery Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Location
            </label>
            <input
              type="text"
              value={formData.deliveryLocation}
              onChange={(e) => setFormData({ ...formData, deliveryLocation: e.target.value })}
              placeholder="Enter delivery address"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Order Items
              </label>
              <button
                type="button"
                onClick={onAddItem}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <Plus size={14} />
                Add Item
              </button>
            </div>

            <div className="space-y-2">
              {formData.items.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={item.productId}
                    onChange={(e) => onItemChange(index, 'productId', parseInt(e.target.value))}
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  >
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveItem(index)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            {formData.items.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">No items added yet</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Order'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}