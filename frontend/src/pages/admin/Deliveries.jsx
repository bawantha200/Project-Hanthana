// frontend/src/pages/admin/Deliveries.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, MapPin, Navigation, User, Clock, CheckCircle2, 
  Search, Filter, Eye, UserCheck, Calendar, DollarSign,
  RefreshCw, XCircle, Package, Phone, Mail, Bike,
  X, ChevronRight, ClipboardList, MessageSquare, Star,
  TrendingUp, TrendingDown, Minus, AlertCircle,
  ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

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

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700', icon: Clock, badgeColor: 'bg-gray-500' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700', icon: UserCheck, badgeColor: 'bg-blue-500' },
  PICKED_UP: { label: 'Picked Up', color: 'bg-cyan-100 text-cyan-700', icon: Navigation, badgeColor: 'bg-cyan-500' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, badgeColor: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle, badgeColor: 'bg-red-500' }
};

const filterTabs = [
  { key: 'All', label: 'All', icon: Filter },
  { key: 'PENDING', label: 'Pending', icon: Clock },
  { key: 'ASSIGNED', label: 'Assigned', icon: UserCheck },
  { key: 'PICKED_UP', label: 'Picked Up', icon: Navigation },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2 },
];

// Pagination constants
const PAGE_SIZE = 10;

export default function Deliveries() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Date filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilterApplied, setDateFilterApplied] = useState(false);
  
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    pickedUp: 0,
    delivered: 0
  });

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const params = {};

      const response = await api.get('/deliveries', { params });
      if (response.data.success) {
        const deliveriesData = response.data.deliveries || [];
        setAllDeliveries(deliveriesData);
        setDeliveries(deliveriesData);
        calculateStats(deliveriesData);
        setCurrentPage(1);
      } else {
        setAllDeliveries([]);
        setDeliveries([]);
        calculateStats([]);
      }
    } catch (error) {
      console.error('Failed to load deliveries:', error);
      toast.error('Failed to load deliveries');
      setAllDeliveries([]);
      setDeliveries([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (deliveriesData) => {
    const data = Array.isArray(deliveriesData) ? deliveriesData : [];
    
    setStats({
      total: data.length,
      pending: data.filter(d => d.status === 'PENDING').length,
      assigned: data.filter(d => d.status === 'ASSIGNED').length,
      pickedUp: data.filter(d => d.status === 'PICKED_UP').length,
      delivered: data.filter(d => d.status === 'DELIVERED').length
    });
  };

  const handleViewDelivery = (delivery) => {
    // Fetch full delivery details including order items
    fetchDeliveryDetails(delivery.id);
  };

  const fetchDeliveryDetails = async (deliveryId) => {
    try {
      const response = await api.get(`/deliveries/${deliveryId}`);
      if (response.data.success) {
        setSelectedDelivery(response.data.delivery);
        setShowModal(true);
      } else {
        toast.error('Failed to load delivery details');
      }
    } catch (error) {
      console.error('Failed to load delivery details:', error);
      toast.error('Failed to load delivery details');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedDelivery(null), 300);
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterKey) => {
    setActiveFilter(filterKey);
    setCurrentPage(1);
  };

  // Filter deliveries for display
  const filteredDeliveries = deliveries.filter((delivery) => {
    if (!delivery) return false;
    
    if (activeFilter !== 'All' && delivery.status !== activeFilter) {
      return false;
    }
    
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      (delivery.id || '').toLowerCase().includes(searchLower) ||
      (delivery.orderId || '').toString().includes(searchLower) ||
      (delivery.order?.customer?.name || '').toLowerCase().includes(searchLower) ||
      (delivery.deliveryPerson?.name || '').toLowerCase().includes(searchLower);

    let matchesDate = true;
    if (dateFilterApplied) {
      const deliveryDate = new Date(delivery.createdAt || delivery.updatedAt || delivery.deliveryStartTime);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) {
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && deliveryDate >= start;
      }
      if (end) {
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && deliveryDate <= end;
      }
    }
    
    return matchesSearch && matchesDate;
  });

  // ---------- Pagination ----------
  const totalPages = Math.ceil(filteredDeliveries.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const paginatedDeliveries = filteredDeliveries.slice(startIndex, startIndex + PAGE_SIZE);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      document.querySelector('.deliveries-table-container')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderStatusIcon = (status, size = 12) => {
    const config = statusConfig[status];
    if (config?.icon) {
      const Icon = config.icon;
      return <Icon size={size} />;
    }
    return <Clock size={size} />;
  };

  // Helper function to safely get order items
  const getOrderItems = (delivery) => {
    if (!delivery) return [];
    
    // Check if items are in the delivery object directly
    if (delivery.items && Array.isArray(delivery.items)) {
      return delivery.items;
    }
    
    // Check if items are in the order object
    if (delivery.order?.items && Array.isArray(delivery.order.items)) {
      return delivery.order.items;
    }
    
    // Check if items are in order_items
    if (delivery.order_items && Array.isArray(delivery.order_items)) {
      return delivery.order_items;
    }
    
    return [];
  };

  // Helper function to get item display name
  const getItemName = (item) => {
    if (!item) return 'Item';
    return item.product_name || item.product?.name || item.name || 'Item';
  };

  // Helper function to get item price
  const getItemPrice = (item) => {
    if (!item) return 0;
    return item.unit_price || item.product?.unit_price || item.price || 0;
  };

  // Helper function to get item quantity
  const getItemQuantity = (item) => {
    if (!item) return 0;
    return item.quantity || 0;
  };

  // Helper function to get item subtotal
  const getItemSubtotal = (item) => {
    if (!item) return 0;
    return item.sub_total || item.subTotal || (getItemPrice(item) * getItemQuantity(item));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4 sm:space-y-6"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Deliveries Management</h1>
            <p className="text-sm text-gray-500 mt-1 hidden sm:block">
              Track delivery routes, assign riders, and monitor shipment status
            </p>
          </div>
          <button
            onClick={() => loadDeliveries()}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <RefreshCw size={16} />
            <span>Refresh</span>
          </button>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {[
            { key: 'total', label: 'Total Deliveries', icon: Truck, color: 'blue' },
            { key: 'pending', label: 'Pending', icon: Clock, color: 'gray' },
            { key: 'assigned', label: 'Assigned', icon: UserCheck, color: 'blue' },
            { key: 'pickedUp', label: 'Picked Up', icon: Navigation, color: 'cyan' },
            { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'emerald' }
          ].map((card) => {
            const Icon = card.icon;
            const value = stats[card.key] || 0;
            const colorMap = {
              blue: 'bg-blue-50 text-blue-600',
              gray: 'bg-gray-50 text-gray-600',
              cyan: 'bg-cyan-50 text-cyan-600',
              emerald: 'bg-emerald-50 text-emerald-600'
            };
            const bgColor = colorMap[card.color] || 'bg-blue-50 text-blue-600';
            
            return (
              <motion.div
                key={card.key}
                variants={itemVariants}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${bgColor.split(' ')[0]}`}>
                    <Icon size={16} className={bgColor.split(' ')[1] || 'text-blue-600'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-xs text-gray-400 font-medium truncate">{card.label}</p>
                    <p className="text-base sm:text-xl font-bold text-gray-900">{value}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Filter Tabs & Search */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4"
        >
          <div className="flex items-center gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 overflow-x-auto w-full md:w-auto">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleFilterChange(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeFilter === tab.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative flex-1 w-full md:w-auto">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search deliveries..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-white"
            />
          </div>
        </motion.div>

        {/* Date Filter Row */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 bg-white rounded-2xl px-3 sm:px-4 py-3 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Date Range:</span>
          </div>
          <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 flex-1">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50 min-w-[120px]"
            />
            <span className="text-gray-400 text-sm text-center hidden xs:block">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all bg-gray-50 min-w-[120px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={applyDateFilter}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
            >
              Apply
            </button>
            {(dateFilterApplied || startDate || endDate) && (
              <button
                onClick={clearDateFilter}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
              >
                Clear
              </button>
            )}
            {dateFilterApplied && (
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full hidden sm:inline">
                Filtered
              </span>
            )}
          </div>
        </motion.div>

        {/* Deliveries Table */}
        <motion.div
          variants={itemVariants}
          className="deliveries-table-container bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {activeFilter === 'All' ? 'All Deliveries' : `${activeFilter} Deliveries`}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {filteredDeliveries.length} delivery{filteredDeliveries.length !== 1 ? 'ies' : ''} found
                {dateFilterApplied && ' (filtered by date)'}
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Page {currentPage} of {totalPages || 1}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Delivery ID</th>
                  <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Order</th>
                  <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Customer</th>
                  <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap hidden md:table-cell">Rider</th>
                  <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Status</th>
                  <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap hidden lg:table-cell">Location</th>
                  <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap hidden sm:table-cell">Bottles</th>
                  <th className="text-left px-3 sm:px-4 py-2 sm:py-3 text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedDeliveries.map((delivery, index) => {
                  const StatusIcon = statusConfig[delivery?.status]?.icon || Clock;
                  return (
                    <motion.tr
                      key={delivery?.id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => delivery && handleViewDelivery(delivery)}
                    >
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold text-blue-600 whitespace-nowrap">{delivery?.id || 'N/A'}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">#{delivery?.orderId || 'N/A'}</td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-700 truncate max-w-[80px] sm:max-w-[120px]">
                            {delivery?.order?.customer?.name || 'N/A'}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-400 flex items-center gap-1">
                            <Phone size={10} className="hidden sm:inline" /> 
                            {delivery?.order?.customer?.phone || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 hidden md:table-cell">
                        {delivery?.deliveryPerson ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <User size={12} className="text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm text-gray-700 truncate max-w-[80px]">{delivery.deliveryPerson.name}</p>
                              <p className="text-[10px] sm:text-xs text-gray-400">{delivery.deliveryPerson.phone}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <span className={`inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${statusConfig[delivery?.status]?.color || 'bg-gray-100 text-gray-700'} whitespace-nowrap`}>
                          <StatusIcon size={10} />
                          {statusConfig[delivery?.status]?.label || delivery?.status || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[100px]">
                            {delivery?.order?.deliveryLocation || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-center font-medium hidden sm:table-cell">
                        {delivery?.collectingEmptyBottles || 0}
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (delivery) handleViewDelivery(delivery);
                          }}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                        >
                          <Eye size={12} />
                          <span className="hidden xs:inline">View</span>
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredDeliveries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-sm text-gray-400">
              <Truck size={32} className="mb-2 text-gray-300" />
              <p className="font-medium">No deliveries found</p>
              <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
            </div>
          )}

          {filteredDeliveries.length > 0 && (
            <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-500 text-center sm:text-left">
                Showing {startIndex + 1} - {Math.min(startIndex + PAGE_SIZE, filteredDeliveries.length)} of {filteredDeliveries.length} deliveries
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`p-1.5 sm:p-2 rounded-lg text-sm transition-colors ${
                    currentPage === 1
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="flex items-center gap-0.5 sm:gap-1">
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
                        className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
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
                      <span className="text-gray-400 text-xs sm:text-sm">...</span>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}
                </div>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`p-1.5 sm:p-2 rounded-lg text-sm transition-colors ${
                    currentPage === totalPages
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* View Delivery Modal */}
      <AnimatePresence>
        {showModal && selectedDelivery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10 rounded-t-2xl">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Truck size={16} className="text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{selectedDelivery.id}</h2>
                    <p className="text-[10px] sm:text-xs text-gray-500">Delivery Details</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${statusConfig[selectedDelivery.status]?.color || 'bg-gray-100 text-gray-700'} w-fit`}>
                    {renderStatusIcon(selectedDelivery.status, 14)}
                    {statusConfig[selectedDelivery.status]?.label || selectedDelivery.status}
                  </div>
                  <span className="text-xs text-gray-400">
                    Updated: {new Date(selectedDelivery.updatedAt).toLocaleString()}
                  </span>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Order ID</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">#{selectedDelivery.orderId}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Delivery Fee</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">{formatCurrency(selectedDelivery.deliveryFee || 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Empty Bottles</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">{selectedDelivery.collectingEmptyBottles || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                    <p className="text-[10px] sm:text-xs text-gray-400 font-medium">Total Amount</p>
                    <p className="text-sm sm:text-base font-semibold text-gray-900">{formatCurrency(selectedDelivery.order?.totalAmount || 0)}</p>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Customer Information */}
                  <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                      <User size={14} className="text-blue-600" />
                      Customer Information
                    </h3>
                    <div className="space-y-1.5 sm:space-y-2">
                      <p className="text-sm sm:text-base font-medium text-gray-900">
                        {selectedDelivery.order?.customer?.name || 'N/A'}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                        <Mail size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate">{selectedDelivery.order?.customer?.email || 'N/A'}</span>
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                        <Phone size={12} className="text-gray-400 flex-shrink-0" />
                        {selectedDelivery.order?.customer?.phone || 'N/A'}
                      </p>
                      {selectedDelivery.order?.customer?.address && (
                        <p className="text-xs sm:text-sm text-gray-600 flex items-start gap-2">
                          <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <span className="break-words">{selectedDelivery.order.customer.address}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rider Information */}
                  <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                      <Bike size={14} className="text-blue-600" />
                      Rider Information
                    </h3>
                    {selectedDelivery.deliveryPerson ? (
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm sm:text-base font-medium text-gray-900">
                              {selectedDelivery.deliveryPerson.name}
                            </p>
                            <p className="text-xs text-gray-500">Rider</p>
                          </div>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                          <Phone size={12} className="text-gray-400 flex-shrink-0" />
                          {selectedDelivery.deliveryPerson.phone || 'N/A'}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-600 flex items-center gap-2">
                          <Mail size={12} className="text-gray-400 flex-shrink-0" />
                          <span className="truncate">{selectedDelivery.deliveryPerson.email || 'N/A'}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No rider assigned</p>
                    )}
                  </div>
                </div>

                {/* Delivery Timeline */}
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                    <Clock size={14} className="text-blue-600" />
                    Delivery Timeline
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {selectedDelivery.deliveryStartTime && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                        <div>
                          <p className="text-xs text-gray-400">Started</p>
                          <p className="text-xs sm:text-sm text-gray-700">
                            {new Date(selectedDelivery.deliveryStartTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedDelivery.deliveryEndTime && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
                        <div>
                          <p className="text-xs text-gray-400">Completed</p>
                          <p className="text-xs sm:text-sm text-gray-700">
                            {new Date(selectedDelivery.deliveryEndTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {!selectedDelivery.deliveryStartTime && (
                      <p className="text-sm text-gray-400">Delivery not started yet</p>
                    )}
                  </div>
                </div>

                {/* Order Items - Fixed */}
                {(() => {
                  const items = getOrderItems(selectedDelivery);
                  if (items && items.length > 0) {
                    return (
                      <div className="bg-gray-50 rounded-xl p-3 sm:p-4">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 flex items-center gap-2">
                          <Package size={14} className="text-blue-600" />
                          Order Items
                        </h3>
                        <div className="space-y-1.5 sm:space-y-2">
                          {items.slice(0, 5).map((item, index) => {
                            const itemName = getItemName(item);
                            const quantity = getItemQuantity(item);
                            const price = getItemPrice(item);
                            const subtotal = getItemSubtotal(item);
                            
                            return (
                              <div key={index} className="flex items-center justify-between text-xs sm:text-sm">
                                <span className="text-gray-600 truncate mr-2">{itemName}</span>
                                <span className="text-gray-900 font-medium whitespace-nowrap">
                                  {quantity} × {formatCurrency(price)}
                                  {subtotal > 0 && (
                                    <span className="text-gray-400 text-[10px] ml-1">
                                      = {formatCurrency(subtotal)}
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                          {items.length > 5 && (
                            <p className="text-xs text-gray-400">+{items.length - 5} more items</p>
                          )}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      closeModal();
                      navigate(`/admin/orders/${selectedDelivery.orderId}`);
                    }}
                    className="w-full sm:flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                  >
                    View Order Details
                  </button>
                  <button
                    onClick={closeModal}
                    className="w-full sm:flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}