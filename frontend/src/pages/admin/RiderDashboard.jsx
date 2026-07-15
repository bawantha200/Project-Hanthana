// frontend/src/pages/rider/RiderDashboard.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Truck, MapPin, Navigation, User, Clock, CheckCircle2,
  DollarSign, Package, Phone, Mail, RefreshCw, 
  Check, XCircle, AlertCircle, Plus, Minus, Bike
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const statusConfig = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
  PICKED_UP: { label: 'Picked Up', color: 'bg-cyan-100 text-cyan-700' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
};

const statusSteps = ['PENDING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'];

export default function RiderDashboard() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [emptyBottles, setEmptyBottles] = useState(0);
  const [updating, setUpdating] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

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
    }
  };

  const updateDeliveryStatus = async (deliveryId, status, bottles = 0) => {
    try {
      setUpdating(true);
      const response = await api.put(`/deliveries/${deliveryId}/status`, {
        status,
        emptyBottles: bottles
      });
      
      if (response.data.success) {
        toast.success(`Delivery ${status === 'DELIVERED' ? 'completed' : 'updated'} successfully!`);
        setShowCompleteModal(false);
        setSelectedDelivery(null);
        setEmptyBottles(0);
        await loadDeliveries();
      }
    } catch (error) {
      console.error('Failed to update delivery:', error);
      toast.error('Failed to update delivery status');
    } finally {
      setUpdating(false);
    }
  };

  const getCurrentStepIndex = (delivery) => {
    if (!delivery) return 0;
    const index = statusSteps.indexOf(delivery.status);
    return index >= 0 ? index : 0;
  };

  const filteredDeliveries = deliveries.filter(delivery => {
    if (activeFilter === 'All') return true;
    return delivery.status === activeFilter;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-500">Loading your deliveries...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bike className="text-blue-600" size={28} />
            Rider Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {user?.name || 'Rider'}! Track and manage your deliveries
          </p>
        </div>
        <button
          onClick={loadDeliveries}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { key: 'total', label: 'Total', icon: Truck, color: 'blue' },
          { key: 'assigned', label: 'Assigned', icon: User, color: 'indigo' },
          { key: 'pickedUp', label: 'Picked Up', icon: Navigation, color: 'cyan' },
          { key: 'delivered', label: 'Delivered', icon: CheckCircle2, color: 'emerald' },
          { key: 'totalEarnings', label: 'Earnings', icon: DollarSign, color: 'green' },
          { key: 'totalBottlesCollected', label: 'Bottles', icon: Package, color: 'amber' }
        ].map((card) => (
          <div key={card.key} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-${card.color}-50 flex items-center justify-center`}>
                <card.icon size={16} className={`text-${card.color}-600`} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium uppercase">{card.label}</p>
                <p className="text-lg font-bold text-gray-900">
                  {card.key === 'totalEarnings' 
                    ? formatCurrency(stats[card.key] || 0)
                    : stats[card.key] || 0}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 overflow-x-auto">
        {['All', 'ASSIGNED', 'PICKED_UP', 'DELIVERED'].map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              activeFilter === filter
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {filter === 'All' ? 'All Deliveries' : statusConfig[filter]?.label || filter}
          </button>
        ))}
      </div>

      {/* Deliveries Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredDeliveries.map((delivery) => {
          const currentStep = getCurrentStepIndex(delivery);
          const isComplete = delivery.status === 'DELIVERED';
          
          return (
            <motion.div
              key={delivery.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className={`px-4 py-3 flex items-center justify-between border-b ${
                isComplete ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-blue-100'
              }`}>
                <div className="flex items-center gap-2">
                  <Truck size={16} className={isComplete ? 'text-emerald-600' : 'text-blue-600'} />
                  <span className="text-sm font-semibold">{delivery.id}</span>
                  <span className="text-xs text-gray-400">| Order #{delivery.orderId}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[delivery.status]?.color || 'bg-gray-100 text-gray-700'}`}>
                  {statusConfig[delivery.status]?.label || delivery.status}
                </span>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Customer Info */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {delivery.order?.customer?.name || 'N/A'}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {delivery.order?.customer?.phone || 'N/A'}
                      </span>
                      {delivery.order?.customer?.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={12} /> {delivery.order.customer.email}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                      <MapPin size={12} />
                      <span className="truncate">{delivery.order?.deliveryLocation || 'No address'}</span>
                    </div>
                  </div>
                </div>

                {/* Delivery Details */}
                <div className="grid grid-cols-2 gap-2 text-sm bg-gray-50 rounded-lg p-3">
                  <div>
                    <p className="text-xs text-gray-400">Total Amount</p>
                    <p className="font-semibold">{formatCurrency(delivery.order?.totalAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Delivery Fee</p>
                    <p className="font-semibold">{formatCurrency(delivery.deliveryFee || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Bottles Collected</p>
                    <p className="font-semibold">{delivery.collectingEmptyBottles || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Order Type</p>
                    <p className="font-semibold text-xs">
                      {delivery.order?.orderType === 'HOME_DELIVERY' ? '🚚 Home' : '📦 Pickup'}
                    </p>
                  </div>
                </div>

                {/* Status Progress */}
                <div className="relative pt-2">
                  <div className="flex items-center justify-between">
                    {statusSteps.map((step, index) => {
                      const isActive = index <= currentStep;
                      const Icon = index === 0 ? Clock : 
                                  index === 1 ? User :
                                  index === 2 ? Navigation : CheckCircle2;
                      return (
                        <div key={step} className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isActive ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
                          } ${isActive && index === currentStep ? 'ring-2 ring-blue-200' : ''}`}>
                            <Icon size={14} />
                          </div>
                          <p className={`text-[10px] mt-1 ${
                            isActive ? 'text-blue-600 font-medium' : 'text-gray-400'
                          }`}>
                            {statusConfig[step]?.label || step}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 -z-10">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${(currentStep / (statusSteps.length - 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {delivery.status === 'ASSIGNED' && (
                    <button
                      onClick={() => updateDeliveryStatus(delivery.deliveryId, 'PICKED_UP')}
                      disabled={updating}
                      className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Navigation size={16} />
                        Start Delivery
                      </div>
                    </button>
                  )}

                  {delivery.status === 'PICKED_UP' && (
                    <button
                      onClick={() => {
                        setSelectedDelivery(delivery);
                        setEmptyBottles(0);
                        setShowCompleteModal(true);
                      }}
                      className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Check size={16} />
                        Complete Delivery
                      </div>
                    </button>
                  )}

                  {delivery.status === 'DELIVERED' && (
                    <div className="flex-1 text-center px-4 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-sm font-medium">
                      ✅ Delivered
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {filteredDeliveries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12">
          <Truck size={48} className="text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No deliveries found</p>
          <p className="text-sm text-gray-400">You have no {activeFilter !== 'All' ? activeFilter.toLowerCase() : ''} deliveries</p>
        </div>
      )}

      {/* Complete Delivery Modal */}
      {showCompleteModal && selectedDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Package size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Complete Delivery</h3>
              <p className="text-sm text-gray-500 mb-4">
                Order #{selectedDelivery.orderId} - {selectedDelivery.order?.customer?.name}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empty Bottles Collected (19L)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEmptyBottles(Math.max(0, emptyBottles - 1))}
                    className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="text-2xl font-bold text-gray-900 w-16 text-center">{emptyBottles}</span>
                  <button
                    onClick={() => setEmptyBottles(emptyBottles + 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Only 19L bottles can be collected
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Delivery Fee:</strong> {formatCurrency(selectedDelivery.deliveryFee || 0)}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Bottles Collected:</strong> {emptyBottles} × 19L
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCompleteModal(false);
                    setSelectedDelivery(null);
                    setEmptyBottles(0);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateDeliveryStatus(
                    selectedDelivery.deliveryId,
                    'DELIVERED',
                    emptyBottles
                  )}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {updating ? 'Processing...' : 'Confirm Delivery'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}