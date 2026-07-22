// frontend/src/pages/rider/RiderDashboard.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Truck, MapPin, Navigation, User, Clock, CheckCircle2,
  Package, RefreshCw, Check, Bike, Search, X,
  ChevronLeft, ChevronRight, Filter, Sparkles,
  Coffee, Sun, Moon, Eye, CircleDashed
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  PICKED_UP: { label: 'Picked Up', color: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' }
};

const statusSteps = ['ASSIGNED', 'PICKED_UP', 'DELIVERED'];

export default function RiderDashboard() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadDeliveries();
  }, []);

  const loadDeliveries = async () => {
    try {
      setLoading(true);
      const response = await api.get('/deliveries/my-deliveries');
      if (response.data.success) {
        setDeliveries(response.data.deliveries || []);
        setStats(response.data.stats || {});
      }
    } catch (error) {
      console.error('Failed to load deliveries:', error);
      toast.error('Failed to load your deliveries');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDeliveries();
    toast.success('Deliveries refreshed');
  };

  const updateDeliveryStatus = async (deliveryId, status) => {
    try {
      setUpdating(true);
      const response = await api.put(`/deliveries/${deliveryId}/status`, { status });
      
      if (response.data.success) {
        toast.success(status === 'DELIVERED' ? 'Delivery Completed!' : 'Delivery Updated!');
        setShowCompleteModal(false);
        setShowDetailModal(false);
        setSelectedDelivery(null);
        await loadDeliveries();
      }
    } catch (error) {
      console.error('Failed to update delivery:', error);
      toast.error('Failed to update delivery status');
    } finally {
      setUpdating(false);
    }
  };

  const handleRowClick = (delivery) => {
    setSelectedDelivery(delivery);
    setShowDetailModal(true);
  };

  const handleCompleteDelivery = (delivery) => {
    setSelectedDelivery(delivery);
    setShowCompleteModal(true);
  };

  const closeModals = () => {
    setShowDetailModal(false);
    setShowCompleteModal(false);
    setTimeout(() => setSelectedDelivery(null), 300);
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    if (activeFilter !== 'All' && delivery.status !== activeFilter) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return delivery.id.toLowerCase().includes(query) ||
        delivery.orderId.toString().includes(query) ||
        (delivery.order?.customer?.name || '').toLowerCase().includes(query) ||
        (delivery.order?.customer?.phone || '').includes(query);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
  const paginatedDeliveries = filteredDeliveries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  const activeDeliveries = deliveries.filter(d => 
    d.status === 'ASSIGNED' || d.status === 'PICKED_UP'
  ).length;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return Coffee;
    if (hour < 17) return Sun;
    return Moon;
  };

  const GreetingIcon = getGreetingIcon();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        <p className="mt-4 text-sm text-gray-500">Loading deliveries...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Bike size={24} className="text-blue-600" />
            <div>
              <div className="flex items-center gap-1.5">
                <GreetingIcon size={12} className="text-blue-500" />
                <span className="text-xs text-gray-500">{getGreeting()}</span>
              </div>
              <h1 className="text-base font-bold text-gray-900 flex items-center gap-1">
                Hi, {user?.name?.split(' ')[0] || 'Rider'}
                <Sparkles size={14} className="text-blue-400" />
              </h1>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <RefreshCw size={18} className={`text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'total', label: 'Total', icon: Truck, value: stats.total || 0 },
              { key: 'active', label: 'Active', icon: Navigation, value: activeDeliveries },
              { key: 'delivered', label: 'Done', icon: CheckCircle2, value: stats.delivered || 0 },
              { key: 'bottles', label: 'Bottles', icon: Package, value: stats.totalBottlesCollected || 0 }
            ].map((card) => (
              <div key={card.key} className="text-center">
                <card.icon size={16} className="text-blue-600 mx-auto mb-0.5" />
                <p className="text-lg font-bold text-gray-900">{card.value}</p>
                <p className="text-[8px] text-gray-400 font-medium uppercase">{card.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white border-b border-gray-100 px-4 py-2.5">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, customer, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm"
            />
          </div>
        </div>
      </div>

      {/* Delivery List */}
      <div className="px-4 py-3">
        <div className="max-w-7xl mx-auto space-y-2">
          {paginatedDeliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Truck size={36} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No deliveries found</p>
              <p className="text-sm text-gray-400">
                {searchQuery ? 'Try adjusting your search' : "You're all caught up!"}
              </p>
            </div>
          ) : (
            paginatedDeliveries.map((delivery) => {
              const canStart = delivery.status === 'ASSIGNED';
              const canComplete = delivery.status === 'PICKED_UP';
              const isDelivered = delivery.status === 'DELIVERED';
              
              return (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => handleRowClick(delivery)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 active:bg-gray-50/80 transition-all cursor-pointer hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {delivery.order?.customer?.name || 'N/A'}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span className="font-mono">{delivery.id}</span>
                            <span>•</span>
                            <span>#{delivery.orderId}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 ml-9 mt-1">
                        <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                        <span className="text-xs text-gray-600 truncate">
                          {delivery.order?.deliveryLocation || 'No address'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 ml-9 mt-1.5">
                        <div className="flex items-center gap-1">
                          <Package size={12} className="text-gray-400" />
                          <span className="text-xs text-gray-600">{delivery.refillCount || 0}</span>
                        </div>
                        <div className="w-px h-3 bg-gray-200"></div>
                        <span className="text-xs font-medium text-gray-700">
                          {formatCurrency(delivery.order?.totalAmount || 0)}
                        </span>
                        {delivery.hasRefill19LBottles && (
                          <>
                            <div className="w-px h-3 bg-gray-200"></div>
                            <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                              <Package size={10} />
                              {delivery.refillCount}×19L
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-1 ${statusConfig[delivery.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                        <span className={`w-1 h-1 rounded-full ${statusConfig[delivery.status]?.dot || 'bg-gray-400'}`}></span>
                        {statusConfig[delivery.status]?.label || delivery.status}
                      </span>
                      
                      {canStart && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateDeliveryStatus(delivery.deliveryId, 'PICKED_UP');
                          }}
                          disabled={updating}
                          className="px-3 py-0.5 bg-cyan-600 text-white rounded-lg text-[10px] font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50"
                        >
                          Start
                        </button>
                      )}
                      {canComplete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteDelivery(delivery);
                          }}
                          className="px-3 py-0.5 bg-emerald-600 text-white rounded-lg text-[10px] font-medium hover:bg-emerald-700 transition-colors"
                        >
                          Complete
                        </button>
                      )}
                      {isDelivered && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 size={12} />
                          <span className="text-[9px] font-medium">Done</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {filteredDeliveries.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-3 max-w-7xl mx-auto px-2">
            <span className="text-xs text-gray-400">{filteredDeliveries.length} deliveries</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white"
              >
                <ChevronLeft size={14} className="text-gray-600" />
              </button>
              <span className="text-xs font-medium text-gray-700 min-w-[32px] text-center">
                {currentPage}/{totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white"
              >
                <ChevronRight size={14} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Buttons - Bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-3 py-2 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-1.5 overflow-x-auto scrollbar-hide">
          <Filter size={16} className="text-gray-400 flex-shrink-0" />
          {['All', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                activeFilter === filter
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter === 'All' ? 'All' : statusConfig[filter]?.label || filter}
            </button>
          ))}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedDelivery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h3 className="font-bold text-gray-900">{selectedDelivery.id}</h3>
                  <p className="text-xs text-gray-500">Order #{selectedDelivery.orderId}</p>
                </div>
                <button onClick={closeModals} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Status */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[selectedDelivery.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                    {statusConfig[selectedDelivery.status]?.label || selectedDelivery.status}
                  </span>
                  {selectedDelivery.hasRefill19LBottles && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1.5">
                      <Package size={12} />
                      {selectedDelivery.refillCount} × 19L REFILL
                    </span>
                  )}
                </div>

                {/* Progress */}
                <div className="flex items-center justify-between">
                  {statusSteps.map((step, idx) => {
                    const isActive = idx <= statusSteps.indexOf(selectedDelivery.status);
                    return (
                      <div key={step} className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                          {isActive ? <CheckCircle2 size={14} /> : <CircleDashed size={14} />}
                        </div>
                        <p className={`text-[8px] mt-1 ${isActive ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                          {statusConfig[step]?.label?.substring(0, 4) || step}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Customer */}
                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                  <p className="text-[10px] text-gray-400 font-medium uppercase">Customer</p>
                  <p className="font-semibold text-gray-900">{selectedDelivery.order?.customer?.name || 'N/A'}</p>
                  <p className="text-xs text-gray-600">{selectedDelivery.order?.customer?.phone || 'N/A'}</p>
                  <div className="flex items-start gap-1.5 text-xs text-gray-600">
                    <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{selectedDelivery.order?.deliveryLocation || 'No address'}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[10px] text-gray-400 font-medium uppercase mb-2">Order Items</p>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {selectedDelivery.order?.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate flex-1">{item.product?.name || 'Item'}</span>
                        <span className="text-xs text-gray-500 ml-2">×{item.quantity}</span>
                        <span className="text-xs font-medium text-gray-900 ml-2">
                          {formatCurrency(item.subTotal || item.price * item.quantity || 0)}
                        </span>
                      </div>
                    ))}
                    {(!selectedDelivery.order?.items || selectedDelivery.order.items.length === 0) && (
                      <p className="text-xs text-gray-400 text-center">No items</p>
                    )}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between">
                    <span className="text-sm font-semibold text-gray-700">Total</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(selectedDelivery.order?.totalAmount || 0)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {selectedDelivery.status === 'ASSIGNED' && (
                    <button
                      onClick={() => updateDeliveryStatus(selectedDelivery.deliveryId, 'PICKED_UP')}
                      disabled={updating}
                      className="flex-1 py-2.5 bg-cyan-600 text-white rounded-xl text-sm font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Navigation size={16} />
                      Start
                    </button>
                  )}
                  {selectedDelivery.status === 'PICKED_UP' && (
                    <button
                      onClick={() => {
                        setShowDetailModal(false);
                        handleCompleteDelivery(selectedDelivery);
                      }}
                      className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check size={16} />
                      Complete
                    </button>
                  )}
                  {selectedDelivery.status === 'DELIVERED' && (
                    <div className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                      <CheckCircle2 size={16} />
                      Delivered
                    </div>
                  )}
                  <button onClick={closeModals} className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Complete Modal */}
      <AnimatePresence>
        {showCompleteModal && selectedDelivery && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                    <Package size={28} className="text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Complete Delivery</h3>
                  <p className="text-sm text-gray-500">Order #{selectedDelivery.orderId}</p>
                </div>

                <div className="mt-4 bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Customer</span>
                    <span className="font-medium">{selectedDelivery.order?.customer?.name}</span>
                  </div>
                  {selectedDelivery.hasRefill19LBottles ? (
                    <div className="flex justify-between items-center bg-amber-50 rounded-lg p-2 -mx-1">
                      <span className="text-sm text-amber-700 flex items-center gap-1.5">
                        <Package size={14} />
                        Empty Bottles
                      </span>
                      <span className="font-bold text-amber-700">{selectedDelivery.refillCount} × 19L</span>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-blue-600 py-1 flex items-center justify-center gap-2">
                      <CheckCircle2 size={14} />
                      No bottles to collect
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-5">
                  <button onClick={closeModals} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => updateDeliveryStatus(selectedDelivery.deliveryId, 'DELIVERED')}
                    disabled={updating}
                    className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                  >
                    {updating ? 'Processing...' : 'Confirm'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}