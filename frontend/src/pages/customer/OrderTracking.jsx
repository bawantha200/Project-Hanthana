// frontend/src/pages/customer/OrderTracking.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, MapPin, Phone, Clock, User, CheckCircle2, Navigation, Package, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import DeliveryTracker from '../../components/DeliveryTracker';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency } from '../../utils/helpers';
import { getUserOrders } from '../../services/ordersService';
import { useAuth } from '../../context/AuthContext';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const liveStatusConfig = {
  PENDING: { color: 'text-amber-600', bg: 'bg-amber-50', pulse: 'bg-amber-400', icon: Clock, label: 'Pending' },
  PROCESSING: { color: 'text-blue-600', bg: 'bg-blue-50', pulse: 'bg-blue-400', icon: Clock, label: 'Processing' },
  DELIVERED: { color: 'text-emerald-600', bg: 'bg-emerald-50', pulse: 'bg-emerald-400', icon: CheckCircle2, label: 'Delivered' },
  COMPLETED: { color: 'text-emerald-600', bg: 'bg-emerald-50', pulse: 'bg-emerald-400', icon: CheckCircle2, label: 'Completed' },
  CANCELLED: { color: 'text-red-600', bg: 'bg-red-50', pulse: 'bg-red-400', icon: CheckCircle2, label: 'Cancelled' },
};

const OrderTracking = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch user orders
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const userOrders = await getUserOrders();
        setOrders(userOrders);
        
        // Select the most recent order by default
        if (userOrders.length > 0) {
          const sortedOrders = [...userOrders].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
          );
          setSelectedOrderId(sortedOrders[0].id);
          setSelectedOrder(sortedOrders[0]);
        }
      } catch (error) {
        console.error('Failed to fetch orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  // Update selected order when ID changes
  useEffect(() => {
    if (selectedOrderId && orders.length > 0) {
      const order = orders.find(o => o.id === selectedOrderId);
      setSelectedOrder(order || null);
    }
  }, [selectedOrderId, orders]);

  const getDeliveryStatus = (order) => {
    if (!order) return 'PENDING';
    // Map order status to delivery status
    const statusMap = {
      'PENDING': 'PENDING',
      'PROCESSING': 'PROCESSING',
      'DELIVERED': 'DELIVERED',
      'COMPLETED': 'COMPLETED',
      'CANCELLED': 'CANCELLED'
    };
    return statusMap[order.order_status] || order.order_status || 'PENDING';
  };

  const getDeliveryEta = (order) => {
    if (!order) return 'Calculating...';
    if (order.order_status === 'DELIVERED' || order.order_status === 'COMPLETED') {
      return 'Delivered';
    }
    if (order.order_status === 'CANCELLED') {
      return 'Cancelled';
    }
    // Mock ETA - you can enhance this with actual logic
    return '30-45 minutes';
  };

  const getDriverName = (order) => {
    // Check if there's delivery info in the order
    if (order.delivery && order.delivery.delivery_person) {
      return order.delivery.delivery_person.full_name || 'Driver assigned';
    }
    // Check if there's a delivery person assigned
    if (order.deliveries && order.deliveries.length > 0) {
      const delivery = order.deliveries[0];
      if (delivery.profiles) {
        return delivery.profiles.full_name || 'Driver assigned';
      }
    }
    return 'Assigning driver...';
  };

  const getVehicleInfo = (order) => {
    // Mock vehicle info - you can enhance this
    return 'Delivery Vehicle';
  };

  const getDeliveryLocation = (order) => {
    if (order.delivery_location) {
      return order.delivery_location;
    }
    if (order.deliveryLocation) {
      return order.deliveryLocation;
    }
    return 'Location updating...';
  };

  // Format order status for display
  const formatStatus = (status) => {
    if (!status) return 'Pending';
    const formatted = status.replace(/_/g, ' ');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1).toLowerCase();
  };

  // Get the display status for the badge
  const getBadgeStatus = (order) => {
    if (!order) return 'pending';
    const statusMap = {
      'PENDING': 'pending',
      'PROCESSING': 'processing',
      'DELIVERED': 'delivered',
      'COMPLETED': 'delivered',
      'CANCELLED': 'cancelled'
    };
    return statusMap[order.order_status] || 'pending';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-500">Loading your orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
          >
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No Orders Found</h3>
            <p className="text-sm text-gray-500 mt-1">You haven't placed any orders yet</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Start Shopping
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  const deliveryStatus = getDeliveryStatus(selectedOrder);
  const statusConfig = liveStatusConfig[deliveryStatus] || liveStatusConfig.PENDING;
  const LiveIcon = statusConfig.icon;
  const isDelivered = deliveryStatus === 'DELIVERED' || deliveryStatus === 'COMPLETED';
  const isCancelled = deliveryStatus === 'CANCELLED';

  // Get order items for display
  const getOrderItems = (order) => {
    if (!order) return [];
    if (order.items && order.items.length > 0) {
      return order.items;
    }
    if (order.order_items && order.order_items.length > 0) {
      return order.order_items;
    }
    return [];
  };

  const orderItems = getOrderItems(selectedOrder);
  const productName = orderItems.length > 0 
    ? orderItems[0].product_name || orderItems[0].product?.name || 'Product'
    : 'No product';
  const totalQuantity = orderItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  // Get delivery progress stages based on status
  const getDeliveryStages = () => {
    if (isCancelled) {
      return ['PENDING', 'CANCELLED'];
    }
    return ['PENDING', 'PROCESSING', 'DELIVERED'];
  };

  const deliveryStages = getDeliveryStages();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Order Tracking</h1>
          <p className="mt-1 text-gray-500">Track your delivery in real time</p>
        </motion.div>

        {/* Order Selector */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Order to Track</label>
          <div className="flex flex-wrap gap-3">
            {orders.map((order) => {
              const orderId = order.id;
              const displayId = `ORD-${String(orderId).padStart(4, '0')}`;
              const orderStatus = getBadgeStatus(order);
              return (
                <button
                  key={orderId}
                  onClick={() => setSelectedOrderId(orderId)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                    selectedOrderId === orderId
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>{displayId}</span>
                  <span className={`hidden sm:inline text-xs px-1.5 py-0.5 rounded-full ${
                    selectedOrderId === orderId
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {formatStatus(order.order_status)}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Main Content */}
        {selectedOrder ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Delivery Progress & Map */}
            <div className="lg:col-span-2 space-y-6">
              {/* Delivery Progress Tracker */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Delivery Progress</h2>
                    <p className="text-sm text-gray-500">
                      Order {selectedOrder.id ? `ORD-${String(selectedOrder.id).padStart(4, '0')}` : ''}
                    </p>
                  </div>
                </div>

                <DeliveryTracker currentStatus={isCancelled ? 'CANCELLED' : (deliveryStatus || 'PENDING')} />

                {/* Estimated Time */}
                {!isCancelled && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-6 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100"
                  >
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">
                      {isDelivered
                        ? 'Delivery completed successfully'
                        : `Estimated arrival: ${getDeliveryEta(selectedOrder)}`}
                    </span>
                  </motion.div>
                )}
              </motion.div>

              {/* Live Delivery Status */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
                    <Navigation className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Live Delivery Status</h2>
                    <p className="text-sm text-gray-500">Real-time delivery updates</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <div className={`relative w-12 h-12 rounded-xl ${statusConfig.bg} flex items-center justify-center`}>
                    <LiveIcon className={`w-6 h-6 ${statusConfig.color}`} />
                    {!isDelivered && !isCancelled && (
                      <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${statusConfig.pulse} animate-pulse`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-base font-semibold ${statusConfig.color}`}>
                        {formatStatus(deliveryStatus)}
                      </h3>
                      {!isDelivered && !isCancelled && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {getDeliveryLocation(selectedOrder)}
                    </p>
                  </div>
                  <StatusBadge status={getBadgeStatus(selectedOrder)} />
                </div>

                {/* Delivery Timeline */}
                {!isCancelled && (
                  <div className="mt-5 space-y-0">
                    {deliveryStages.map((stage, i) => {
                      const currentIdx = deliveryStages.indexOf(deliveryStatus);
                      const isCompleted = i <= currentIdx;
                      const isCurrent = i === currentIdx;

                      const stageIcons = [Clock, Clock, CheckCircle2];
                      const StageIcon = stageIcons[i];
                      const stageLabels = ['Pending', 'Processing', 'Delivered'];

                      return (
                        <div key={stage} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                              isCompleted
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-400'
                            } ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}>
                              <StageIcon className="w-4 h-4" />
                            </div>
                            {i < deliveryStages.length - 1 && (
                              <div className={`w-0.5 h-8 ${isCompleted ? 'bg-blue-600' : 'bg-gray-200'}`} />
                            )}
                          </div>
                          <div className="pb-6">
                            <p className={`text-sm font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                              {stageLabels[i]}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {isCompleted
                                ? isCurrent
                                  ? 'Current status'
                                  : 'Completed'
                                : 'Pending'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Map / Location Placeholder */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-600 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Delivery Location</h2>
                    <p className="text-sm text-gray-500">{getDeliveryLocation(selectedOrder)}</p>
                  </div>
                </div>
                <div className="relative h-64 sm:h-80 bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
                  {/* Decorative map placeholder */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 left-8 w-32 h-1 bg-blue-600 rounded" />
                    <div className="absolute top-12 left-4 w-48 h-1 bg-blue-600 rounded" />
                    <div className="absolute top-20 left-12 w-40 h-1 bg-blue-600 rounded" />
                    <div className="absolute top-28 left-6 w-56 h-1 bg-blue-600 rounded" />
                    <div className="absolute top-8 left-2 w-1 h-24 bg-blue-600 rounded" />
                    <div className="absolute top-4 left-20 w-1 h-32 bg-blue-600 rounded" />
                    <div className="absolute top-8 left-40 w-1 h-28 bg-blue-600 rounded" />
                    <div className="absolute top-16 left-56 w-1 h-20 bg-blue-600 rounded" />
                    <div className="absolute top-36 left-4 w-36 h-1 bg-blue-600 rounded" />
                    <div className="absolute top-44 left-12 w-44 h-1 bg-blue-600 rounded" />
                    <div className="absolute top-52 left-2 w-60 h-1 bg-blue-600 rounded" />
                    <div className="absolute top-36 left-2 w-1 h-20 bg-blue-600 rounded" />
                    <div className="absolute top-40 left-36 w-1 h-16 bg-blue-600 rounded" />
                  </div>

                  {/* Pulsing location marker */}
                  <div className="relative flex flex-col items-center">
                    <div className="relative">
                      <div className={`w-16 h-16 rounded-full ${isDelivered ? 'bg-emerald-100' : isCancelled ? 'bg-red-100' : 'bg-blue-100'} flex items-center justify-center`}>
                        <MapPin className={`w-8 h-8 ${isDelivered ? 'text-emerald-600' : isCancelled ? 'text-red-600' : 'text-blue-600'}`} />
                      </div>
                      {!isDelivered && !isCancelled && (
                        <div className="absolute inset-0 w-16 h-16 rounded-full bg-blue-200 animate-ping opacity-30" />
                      )}
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-700">
                      {isDelivered ? 'Delivered to customer' : isCancelled ? 'Order Cancelled' : 'Driver is on the way'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getDeliveryLocation(selectedOrder)}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Right Column - Driver & Order Info */}
            <div className="space-y-6">
              {/* Driver Information Card */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Driver Information</h2>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-gray-900 truncate">{getDriverName(selectedOrder)}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Truck className="w-3.5 h-3.5 text-gray-500" />
                      <span className="text-sm text-gray-600 truncate">{getVehicleInfo(selectedOrder)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <Phone className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="text-sm font-medium text-gray-900">+94-712345678</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <Truck className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Vehicle</p>
                      <p className="text-sm font-medium text-gray-900">{getVehicleInfo(selectedOrder)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Estimated Arrival</p>
                      <p className="text-sm font-medium text-gray-900">{getDeliveryEta(selectedOrder)}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Order Summary */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
              >
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Order ID</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {selectedOrder.id ? `ORD-${String(selectedOrder.id).padStart(4, '0')}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Product</span>
                    <span className="text-sm font-medium text-gray-900">{productName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Quantity</span>
                    <span className="text-sm font-medium text-gray-900">{totalQuantity}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Amount</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(selectedOrder.total_amount || selectedOrder.total || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Date</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedOrder.created_at 
                        ? new Date(selectedOrder.created_at).toLocaleDateString() 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Status</span>
                    <StatusBadge status={getBadgeStatus(selectedOrder)} />
                  </div>
                </div>
              </motion.div>

              {/* Delivery Confirmation Status */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: 0.35 }}
                className={`rounded-2xl shadow-sm border p-6 ${
                  isDelivered
                    ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
                    : isCancelled
                    ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                    : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isDelivered ? 'bg-emerald-600' : isCancelled ? 'bg-red-600' : 'bg-blue-600'
                  }`}>
                    {isCancelled ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className={`text-base font-semibold ${isDelivered ? 'text-emerald-800' : isCancelled ? 'text-red-800' : 'text-blue-800'}`}>
                      {isDelivered ? 'Delivery Confirmed' : isCancelled ? 'Order Cancelled' : 'Delivery In Progress'}
                    </h3>
                    <p className={`text-sm mt-0.5 ${isDelivered ? 'text-emerald-600' : isCancelled ? 'text-red-600' : 'text-blue-600'}`}>
                      {isDelivered
                        ? 'Your order has been delivered successfully'
                        : isCancelled
                        ? 'This order has been cancelled'
                        : 'Your order is being processed'}
                    </p>
                  </div>
                </div>
                {isDelivered && (
                  <div className="mt-4 p-3 rounded-xl bg-white/60 border border-white/80">
                    <p className="text-xs text-gray-500">Delivered on</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedOrder.created_at 
                        ? new Date(selectedOrder.created_at).toLocaleDateString() 
                        : 'N/A'}
                    </p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"
          >
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No Order Selected</h3>
            <p className="text-sm text-gray-500 mt-1">Select an order above to start tracking</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;