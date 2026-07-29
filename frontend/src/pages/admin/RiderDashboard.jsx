// frontend/src/pages/rider/RiderDashboard.jsx
import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Truck, MapPin, Navigation, User, Clock, CheckCircle2,
  Package, RefreshCw, Check, Bike, Search, X,
  ChevronLeft, ChevronRight, Filter, Sparkles,
  Coffee, Sun, Moon, Eye, CircleDashed, Award,
  TrendingUp, Calendar, Zap, Map, Phone, Mail,
  Loader2, Target, Compass, Star, Users, Home,
  MapIcon, Layers
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import MapView from '../../components/MapView';
import DeliveryMap from '../../components/DeliveryMap';

// ─── Query Keys ───
const QUERY_KEYS = {
  RIDER_DELIVERIES: ['rider', 'deliveries'],
  RIDER_STATS: ['rider', 'stats'],
};

// ─── Constants ───
const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400', icon: Clock },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: Compass },
  PICKED_UP: { label: 'Picked Up', color: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500', icon: Package },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: CheckCircle2 },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', dot: 'bg-red-500', icon: X }
};

const statusSteps = ['ASSIGNED', 'PICKED_UP', 'DELIVERED'];
const itemsPerPage = 5;

// ─── Helper Functions ───
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

export default function RiderDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ─── State ───
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showDeliveryMap, setShowDeliveryMap] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [mapLocation, setMapLocation] = useState({ lat: null, lng: null });
  const [userLocation, setUserLocation] = useState(null);

  // ─── Get User Location ───
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.warn('Could not get user location:', err);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // ─── React Query: Fetch Rider Deliveries ───
  const {
    data: deliveriesData = [],
    isLoading: deliveriesLoading,
    isFetching: deliveriesFetching,
    error: deliveriesError,
    refetch: refetchDeliveries,
  } = useQuery({
    queryKey: QUERY_KEYS.RIDER_DELIVERIES,
    queryFn: async () => {
      const response = await api.get('/deliveries/my-deliveries');
      if (response.data.success) {
        return response.data.deliveries || [];
      }
      return [];
    },
    staleTime: 30000,
    gcTime: 120000,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Rider Stats ───
  const {
    data: statsData = {},
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: QUERY_KEYS.RIDER_STATS,
    queryFn: async () => {
      const response = await api.get('/deliveries/my-deliveries');
      return response.data.stats || {};
    },
    staleTime: 60000,
    gcTime: 180000,
    refetchOnWindowFocus: false,
    refetchInterval: 120000,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Update Delivery Status Mutation ───
  const updateDeliveryMutation = useMutation({
    mutationFn: async ({ deliveryId, status }) => {
      const response = await api.put(`/deliveries/${deliveryId}/status`, { status });
      return response.data;
    },
    onSuccess: (data, variables) => {
      const status = variables.status;
      const message = status === 'DELIVERED' ? '🎉 Delivery Completed!' : '✅ Delivery Updated!';
      toast.success(message);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RIDER_DELIVERIES });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RIDER_STATS });
      
      setShowCompleteModal(false);
      setShowDetailModal(false);
      setSelectedDelivery(null);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update delivery status');
    },
  });

  // ─── Memoized Computations ───
  const activeDeliveries = useMemo(() => {
    return deliveriesData.filter(d => 
      d.status === 'ASSIGNED' || d.status === 'PICKED_UP'
    ).length;
  }, [deliveriesData]);

  const completionRate = useMemo(() => {
    const total = statsData.total || 0;
    const delivered = statsData.delivered || 0;
    return total > 0 ? Math.round((delivered / total) * 100) : 0;
  }, [statsData]);

  const filteredDeliveries = useMemo(() => {
    return deliveriesData.filter(delivery => {
      if (activeFilter !== 'All' && delivery.status !== activeFilter) return false;
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return delivery.id.toLowerCase().includes(query) ||
          delivery.orderId?.toString().includes(query) ||
          (delivery.order?.customer?.name || '').toLowerCase().includes(query) ||
          (delivery.order?.customer?.phone || '').includes(query);
      }
      return true;
    });
  }, [deliveriesData, activeFilter, searchQuery]);

  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
  const paginatedDeliveries = useMemo(() => {
    return filteredDeliveries.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );
  }, [filteredDeliveries, currentPage]);

  // ─── Reset page on filter change ───
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  // ─── Handlers ───
  const handleRefresh = useCallback(() => {
    refetchDeliveries();
    refetchStats();
    toast.success('Deliveries refreshed');
  }, [refetchDeliveries, refetchStats]);

  const handleRowClick = useCallback((delivery) => {
    setSelectedDelivery(delivery);
    setShowDetailModal(true);
  }, []);

  const handleCompleteDelivery = useCallback((delivery) => {
    setSelectedDelivery(delivery);
    setShowCompleteModal(true);
  }, []);

  const handleOpenMap = useCallback((delivery) => {
    setSelectedDelivery(delivery);
    const location = delivery.location || {};
    setMapLocation({
      lat: location.latitude || null,
      lng: location.longitude || null
    });
    setShowMapModal(true);
  }, []);

  const closeModals = useCallback(() => {
    setShowDetailModal(false);
    setShowCompleteModal(false);
    setShowMapModal(false);
    setShowDeliveryMap(false);
    setTimeout(() => setSelectedDelivery(null), 300);
  }, []);

  const updateDeliveryStatus = useCallback((deliveryId, status) => {
    updateDeliveryMutation.mutate({ deliveryId, status });
  }, [updateDeliveryMutation]);

  const GreetingIcon = getGreetingIcon();

  // ─── Loading State ───
  if (deliveriesLoading || statsLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        <p className="mt-4 text-sm text-gray-500">Loading deliveries...</p>
      </div>
    );
  }

  // ─── Error State ───
  if (deliveriesError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50 p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 max-w-md text-center">
          <h3 className="font-semibold text-lg mb-2">Failed to Load Deliveries</h3>
          <p className="text-sm">{deliveriesError.message || 'Please try again'}</p>
          <button
            onClick={handleRefresh}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isRefreshing = deliveriesFetching;
  const isUpdating = updateDeliveryMutation.isPending;

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* ─── Header ─── */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-200">
              <Bike size={24} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <GreetingIcon size={12} className="text-blue-500" />
                <span className="text-xs text-gray-500">{getGreeting()}</span>
              </div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-1">
                Hi, {user?.name?.split(' ')[0] || 'Rider'}
                <Sparkles size={14} className="text-blue-400" />
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeliveryMap(true)}
              className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
              title="View All Deliveries on Map"
            >
              <MapIcon size={18} />
              Map
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={`text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Stats Cards ─── */}
      <div className="px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Total Deliveries</p>
                  <p className="text-2xl font-bold text-gray-900 mt-0.5">{statsData.total || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Truck size={20} className="text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Active</p>
                  <p className="text-2xl font-bold text-amber-600 mt-0.5">{activeDeliveries}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Navigation size={20} className="text-amber-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-0.5">{statsData.delivered || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Empty Bottles</p>
                  <p className="text-2xl font-bold text-purple-600 mt-0.5">{statsData.totalBottlesCollected || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <Package size={20} className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>

          {/* ─── Completion Rate ─── */}
          <div className="mt-3 bg-white rounded-xl shadow-sm border border-gray-100 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Completion Rate</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900">{completionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search ─── */}
      <div className="px-4 pb-3">
        <div className="max-w-7xl mx-auto">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ID, customer, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* ─── Delivery List ─── */}
      <div className="px-4 pb-3">
        <div className="max-w-7xl mx-auto space-y-3">
          {paginatedDeliveries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-gray-100">
              <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <Truck size={32} className="text-gray-300" />
              </div>
              <p className="text-gray-500 font-medium">No deliveries found</p>
              <p className="text-sm text-gray-400 mt-1">
                {searchQuery ? 'Try adjusting your search' : "You're all caught up! 🎉"}
              </p>
            </div>
          ) : (
            paginatedDeliveries.map((delivery, index) => {
              const canStart = delivery.status === 'ASSIGNED';
              const canComplete = delivery.status === 'PICKED_UP';
              const isDelivered = delivery.status === 'DELIVERED';
              const hasAddress = delivery.order?.deliveryLocation;
              
              return (
                <motion.div
                  key={delivery.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleRowClick(delivery)}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 active:bg-gray-50/80 transition-all cursor-pointer hover:shadow-md hover:border-blue-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Status Badge */}
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1.5 ${statusConfig[delivery.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig[delivery.status]?.dot || 'bg-gray-400'}`}></span>
                          {statusConfig[delivery.status]?.label || delivery.status}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">{delivery.id}</span>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <User size={14} className="text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {delivery.order?.customer?.name || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">Order #{delivery.orderId}</p>
                        </div>
                      </div>
                      
                      {/* Address */}
                      <div className="flex items-start gap-1.5 mt-2 ml-10">
                        <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-600 line-clamp-1">
                          {delivery.order?.deliveryLocation || 'No address'}
                        </span>
                      </div>

                      {/* Items Info */}
                      <div className="flex items-center gap-3 ml-10 mt-1.5 flex-wrap">
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
                            <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                              <Package size={10} />
                              {delivery.refillCount}×19L
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {hasAddress && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenMap(delivery);
                          }}
                          className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                        >
                          <Map size={14} />
                          Map
                        </button>
                      )}
                      
                      {canStart && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateDeliveryStatus(delivery.deliveryId, 'PICKED_UP');
                          }}
                          disabled={isUpdating}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50"
                        >
                          <Check size={14} />
                          Start
                        </button>
                      )}
                      {canComplete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteDelivery(delivery);
                          }}
                          className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 transition-colors"
                        >
                          <CheckCircle2 size={14} />
                          Complete
                        </button>
                      )}
                      {isDelivered && (
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                          <CheckCircle2 size={14} />
                          <span className="text-xs font-medium">Done</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* ─── Pagination ─── */}
        {filteredDeliveries.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-4 max-w-7xl mx-auto">
            <span className="text-xs text-gray-400">{filteredDeliveries.length} deliveries</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white"
              >
                <ChevronLeft size={16} className="text-gray-600" />
              </button>
              <span className="text-xs font-medium text-gray-700 min-w-[32px] text-center">
                {currentPage}/{totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white"
              >
                <ChevronRight size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Filter Buttons - Bottom ─── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-20 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide">
          <Filter size={16} className="text-gray-400 flex-shrink-0" />
          {['All', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all duration-200 whitespace-nowrap ${
                activeFilter === filter
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {filter === 'All' ? 'All' : statusConfig[filter]?.label || filter}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Detail Modal ─── */}
      <AnimatePresence>
        {showDetailModal && selectedDelivery && (
          <DeliveryDetailModal
            delivery={selectedDelivery}
            onClose={closeModals}
            onComplete={handleCompleteDelivery}
            onUpdateStatus={updateDeliveryStatus}
            onOpenMap={handleOpenMap}
            isUpdating={isUpdating}
          />
        )}
      </AnimatePresence>

      {/* ─── Complete Modal ─── */}
      <AnimatePresence>
        {showCompleteModal && selectedDelivery && (
          <CompleteDeliveryModal
            delivery={selectedDelivery}
            onClose={closeModals}
            onConfirm={updateDeliveryStatus}
            isUpdating={isUpdating}
          />
        )}
      </AnimatePresence>

      {/* ─── Individual Map Modal ─── */}
      <MapView
        isOpen={showMapModal}
        onClose={closeModals}
        address={selectedDelivery?.order?.deliveryLocation}
        latitude={mapLocation.lat}
        longitude={mapLocation.lng}
        customerName={selectedDelivery?.order?.customer?.name}
        customerPhone={selectedDelivery?.order?.customer?.phone}
        deliveryId={selectedDelivery?.id}
        orderItems={selectedDelivery?.order?.items}
        onLocationSelect={(location) => {
          setMapLocation(location);
        }}
      />

      {/* ─── Delivery Map - All Deliveries ─── */}
      <DeliveryMap
        isOpen={showDeliveryMap}
        onClose={closeModals}
        deliveries={deliveriesData}
        userLocation={userLocation}
        onDeliverySelect={(delivery) => {
          setSelectedDelivery(delivery);
          setShowDeliveryMap(false);
          handleRowClick(delivery);
        }}
      />
    </div>
  );
}

// ─── Delivery Detail Modal ───
function DeliveryDetailModal({ delivery, onClose, onComplete, onUpdateStatus, onOpenMap, isUpdating }) {
  const statusIndex = statusSteps.indexOf(delivery.status);
  const progressPercent = statusIndex >= 0 ? (statusIndex / (statusSteps.length - 1)) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="font-bold text-gray-900">{delivery.id}</h3>
            <p className="text-xs text-gray-500">Order #{delivery.orderId}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[delivery.status]?.color || 'bg-gray-100 text-gray-700'}`}>
              {statusConfig[delivery.status]?.label || delivery.status}
            </span>
            {delivery.hasRefill19LBottles && (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium flex items-center gap-1.5">
                <Package size={12} />
                {delivery.refillCount} × 19L REFILL
              </span>
            )}
          </div>

          {/* Progress */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              {statusSteps.map((step, idx) => {
                const isActive = idx <= statusIndex;
                const stepLabel = statusConfig[step]?.label || step;
                return (
                  <div key={step} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isActive ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}
                    </div>
                    <p className={`text-[10px] mt-1.5 font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                      {stepLabel}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="relative mt-3">
              <div className="h-1 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Customer Details</p>
            <p className="font-semibold text-gray-900 flex items-center gap-2">
              <User size={14} className="text-blue-600" />
              {delivery.order?.customer?.name || 'N/A'}
            </p>
            <p className="text-xs text-gray-600 flex items-center gap-2">
              <Phone size={14} className="text-gray-400" />
              {delivery.order?.customer?.phone || 'N/A'}
            </p>
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <span>{delivery.order?.deliveryLocation || 'No address'}</span>
            </div>
            
            {delivery.order?.deliveryLocation && (
              <button
                onClick={() => {
                  onClose();
                  onOpenMap(delivery);
                }}
                className="mt-2 w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
              >
                <Map size={14} />
                View on Map
              </button>
            )}
          </div>

          {/* Items */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-2">Order Items</p>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {delivery.order?.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate flex-1">{item.product?.name || 'Item'}</span>
                  <span className="text-xs text-gray-500 ml-2">×{item.quantity}</span>
                  <span className="text-xs font-medium text-gray-900 ml-2">
                    {formatCurrency(item.subTotal || item.price * item.quantity || 0)}
                  </span>
                </div>
              ))}
              {(!delivery.order?.items || delivery.order.items.length === 0) && (
                <p className="text-xs text-gray-400 text-center">No items</p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between">
              <span className="text-sm font-semibold text-gray-700">Total</span>
              <span className="text-sm font-bold text-gray-900">
                {formatCurrency(delivery.order?.totalAmount || 0)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            {delivery.status === 'ASSIGNED' && (
              <button
                onClick={() => onUpdateStatus(delivery.deliveryId, 'PICKED_UP')}
                disabled={isUpdating}
                className="w-full py-3 bg-cyan-600 text-white rounded-xl text-sm font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Navigation size={16} />
                Start Delivery
              </button>
            )}
            {delivery.status === 'PICKED_UP' && (
              <button
                onClick={() => {
                  onClose();
                  onComplete(delivery);
                }}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} />
                Complete Delivery
              </button>
            )}
            {delivery.status === 'DELIVERED' && (
              <div className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
                <CheckCircle2 size={16} />
                Delivered Successfully
              </div>
            )}
            <button onClick={onClose} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Complete Delivery Modal ───
function CompleteDeliveryModal({ delivery, onClose, onConfirm, isUpdating }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-white rounded-2xl max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Complete Delivery</h3>
            <p className="text-sm text-gray-500 mt-1">Order #{delivery.orderId}</p>
          </div>

          <div className="mt-4 bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Customer</span>
              <span className="font-medium text-gray-900">{delivery.order?.customer?.name}</span>
            </div>
            {delivery.hasRefill19LBottles ? (
              <div className="flex justify-between items-center bg-amber-50 rounded-lg p-3">
                <span className="text-sm text-amber-700 flex items-center gap-2">
                  <Package size={16} />
                  Empty Bottles to Collect
                </span>
                <span className="font-bold text-amber-700 text-lg">{delivery.refillCount} × 19L</span>
              </div>
            ) : (
              <div className="flex justify-center items-center bg-blue-50 rounded-lg p-3 text-sm text-blue-600 gap-2">
                <CheckCircle2 size={16} />
                No bottles to collect
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => onConfirm(delivery.deliveryId, 'DELIVERED')}
              disabled={isUpdating}
              className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  Confirm
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}