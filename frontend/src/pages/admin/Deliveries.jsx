// frontend/src/pages/admin/Deliveries.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, MapPin, Navigation, User, Clock, CheckCircle2, 
  Search, Filter, Eye, UserCheck, Calendar, DollarSign,
  RefreshCw, XCircle, Package, Phone, Mail, Bike,
  X, ChevronRight, ClipboardList, MessageSquare, Star,
  TrendingUp, TrendingDown, Minus, AlertCircle
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

export default function Deliveries() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    assigned: 0,
    pickedUp: 0,
    delivered: 0
  });

  useEffect(() => {
    loadDeliveries();
  }, [activeFilter]);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const params = {};
      if (activeFilter !== 'All') {
        params.status = activeFilter;
      }

      const response = await api.get('/deliveries', { params });
      if (response.data.success) {
        setDeliveries(response.data.deliveries || []);
        calculateStats(response.data.deliveries || []);
      }
    } catch (error) {
      console.error('Failed to load deliveries:', error);
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (deliveriesData) => {
    setStats({
      total: deliveriesData.length,
      pending: deliveriesData.filter(d => d.status === 'PENDING').length,
      assigned: deliveriesData.filter(d => d.status === 'ASSIGNED').length,
      pickedUp: deliveriesData.filter(d => d.status === 'PICKED_UP').length,
      delivered: deliveriesData.filter(d => d.status === 'DELIVERED').length
    });
  };

  const handleViewDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimeout(() => setSelectedDelivery(null), 300);
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    const matchesSearch =
      delivery.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      delivery.orderId.toString().includes(searchQuery) ||
      (delivery.order?.customer?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (delivery.deliveryPerson?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Helper function to render status icon
  const renderStatusIcon = (status, size = 12) => {
    const config = statusConfig[status];
    if (config?.icon) {
      const Icon = config.icon;
      return <Icon size={size} />;
    }
    return <Clock size={size} />;
  };

  // Helper function to render status badge
  const renderStatusBadge = (status) => {
    const config = statusConfig[status];
    if (!config) return null;
    
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon size={12} />
        {config.label}
      </span>
    );
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
        className="space-y-6"
      >
        {/* Page Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deliveries Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track delivery routes, assign riders, and monitor shipment status
            </p>
          </div>
          <button
            onClick={() => loadDeliveries()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </motion.div>

        {/* Summary Cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { key: 'total', label: 'Total Deliveries', icon: Truck, color: 'blue' },
            { key: 'pending', label: 'Pending', icon: Clock, color: 'gray' },
            { key: 'assigned', label: 'Assigned', icon: UserCheck, color: 'blue' },
            { key: 'pickedUp', label: 'Picked Up', icon: Navigation, color: 'cyan' },
            { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'emerald' }
          ].map((card) => (
            <motion.div
              key={card.key}
              variants={itemVariants}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-${card.color}-50 flex items-center justify-center`}>
                  <card.icon size={18} className={`text-${card.color}-600`} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                  <p className="text-xl font-bold text-gray-900">{stats[card.key]}</p>
                </div>
              </div>
            </motion.div>
          ))}
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
              placeholder="Search deliveries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all w-56 bg-white"
            />
          </div>
        </motion.div>

        {/* Deliveries Table */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {activeFilter === 'All' ? 'All Deliveries' : `${activeFilter} Deliveries`}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {filteredDeliveries.length} delivery{filteredDeliveries.length !== 1 ? 'ies' : ''} found
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Delivery ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Order</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rider</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Location</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Empty Bottles</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDeliveries.map((delivery, index) => {
                  const StatusIcon = statusConfig[delivery.status]?.icon || Clock;
                  return (
                    <motion.tr
                      key={delivery.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                      onClick={() => handleViewDelivery(delivery)}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-blue-600">{delivery.id}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">#{delivery.orderId}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {delivery.order?.customer?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <Phone size={10} /> {delivery.order?.customer?.phone || 'N/A'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {delivery.deliveryPerson ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                              <User size={14} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm text-gray-700">{delivery.deliveryPerson.name}</p>
                              <p className="text-xs text-gray-400">{delivery.deliveryPerson.phone}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[delivery.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                          <StatusIcon size={12} />
                          {statusConfig[delivery.status]?.label || delivery.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-600 truncate max-w-[140px]">
                            {delivery.order?.deliveryLocation || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-center font-medium">
                        {delivery.collectingEmptyBottles || 0}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewDelivery(delivery);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredDeliveries.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-400">
              <Truck size={36} className="mb-3 text-gray-300" />
              <p className="font-medium">No deliveries found</p>
              <p className="text-xs mt-1">Try adjusting your search or filter criteria</p>
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Truck size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{selectedDelivery.id}</h2>
                    <p className="text-xs text-gray-500">Delivery Details</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center gap-3">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${statusConfig[selectedDelivery.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {renderStatusIcon(selectedDelivery.status, 16)}
                    {statusConfig[selectedDelivery.status]?.label || selectedDelivery.status}
                  </div>
                  <span className="text-xs text-gray-400">
                    Updated: {new Date(selectedDelivery.updatedAt).toLocaleString()}
                  </span>
                </div>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-medium">Order ID</p>
                    <p className="text-sm font-semibold text-gray-900">#{selectedDelivery.orderId}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-medium">Delivery Fee</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(selectedDelivery.deliveryFee || 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-medium">Empty Bottles</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedDelivery.collectingEmptyBottles || 0}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-400 font-medium">Total Amount</p>
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(selectedDelivery.order?.totalAmount || 0)}</p>
                  </div>
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Information */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <User size={16} className="text-blue-600" />
                      Customer Information
                    </h3>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">
                        {selectedDelivery.order?.customer?.name || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Mail size={14} className="text-gray-400" />
                        {selectedDelivery.order?.customer?.email || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <Phone size={14} className="text-gray-400" />
                        {selectedDelivery.order?.customer?.phone || 'N/A'}
                      </p>
                      {selectedDelivery.order?.customer?.address && (
                        <p className="text-sm text-gray-600 flex items-start gap-2">
                          <MapPin size={14} className="text-gray-400 mt-0.5" />
                          {selectedDelivery.order.customer.address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Rider Information */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Bike size={16} className="text-blue-600" />
                      Rider Information
                    </h3>
                    {selectedDelivery.deliveryPerson ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <User size={18} className="text-blue-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {selectedDelivery.deliveryPerson.name}
                            </p>
                            <p className="text-xs text-gray-500">Rider</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Phone size={14} className="text-gray-400" />
                          {selectedDelivery.deliveryPerson.phone || 'N/A'}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <Mail size={14} className="text-gray-400" />
                          {selectedDelivery.deliveryPerson.email || 'N/A'}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No rider assigned</p>
                    )}
                  </div>
                </div>

                {/* Delivery Timeline */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Clock size={16} className="text-blue-600" />
                    Delivery Timeline
                  </h3>
                  <div className="space-y-3">
                    {selectedDelivery.deliveryStartTime && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div>
                          <p className="text-xs text-gray-400">Started</p>
                          <p className="text-sm text-gray-700">
                            {new Date(selectedDelivery.deliveryStartTime).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}
                    {selectedDelivery.deliveryEndTime && (
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <div>
                          <p className="text-xs text-gray-400">Completed</p>
                          <p className="text-sm text-gray-700">
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

                {/* Order Items Preview */}
                {selectedDelivery.order?.items && selectedDelivery.order.items.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Package size={16} className="text-blue-600" />
                      Order Items
                    </h3>
                    <div className="space-y-2">
                      {selectedDelivery.order.items.slice(0, 5).map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{item.name || 'Item'}</span>
                          <span className="text-gray-900 font-medium">
                            {item.quantity} × {formatCurrency(item.price || 0)}
                          </span>
                        </div>
                      ))}
                      {selectedDelivery.order.items.length > 5 && (
                        <p className="text-xs text-gray-400">+{selectedDelivery.order.items.length - 5} more items</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      closeModal();
                      navigate(`/admin/orders/${selectedDelivery.orderId}`);
                    }}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    View Order Details
                  </button>
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
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