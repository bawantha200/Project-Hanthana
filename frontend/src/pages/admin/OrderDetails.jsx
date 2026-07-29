// frontend/src/pages/admin/OrderDetails.jsx
import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  User,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  Truck,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCheck,
  RefreshCw,
  Bike,
  PackageCheck,
  MapPinned,
  CreditCard,
  Building2,
  FileText,
  Printer,
  HandHelping,
  Store,
  RotateCcw
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

// ─── Query Keys ───
const QUERY_KEYS = {
  ORDER_DETAILS: (id) => ['order', id, 'details'],
  ORDER_HISTORY: (id) => ['order', id, 'history'],
  DELIVERY_PERSONNEL: ['delivery', 'personnel'],
};

// ─── Constants ───
const statusConfig = {
  PLACED: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle }
};

const deliveryStatusConfig = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
  PICKED_UP: { label: 'Picked Up', color: 'bg-cyan-100 text-cyan-700' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
};

const deliveryStatusSteps = ['PLACED', 'PROCESSING', 'DELIVERED'];
const pickupStatusSteps = ['PLACED', 'PROCESSING', 'COMPLETED'];

// ─── Helper Functions ───
const isRefillItem = (item) => {
  const productName = item.product?.name?.toLowerCase() || item.product_name?.toLowerCase() || '';
  const productType = item.product?.type?.toLowerCase() || item.type?.toLowerCase() || '';
  const productSize = item.product?.size || item.size || '';
  const productCategory = item.product?.category?.toLowerCase() || item.category?.toLowerCase() || '';
  
  const isRefillType = 
    productType === 'refill' || 
    productType === 'REFILL' ||
    productCategory === 'refill' ||
    productCategory === 'REFILL';
  
  const isRefillName = 
    productName.includes('refill') && 
    !productName.includes('sealed');
  
  const is19L = 
    productSize === '19L' || 
    productSize === '19 L' ||
    productName.includes('19l') || 
    productName.includes('19 l') ||
    productName.includes('19-liter') ||
    productName.includes('19 litre');
  
  return (isRefillType || isRefillName) && is19L;
};

const countEmptyBottles = (items) => {
  if (!items || !Array.isArray(items)) return 0;
  return items.reduce((count, item) => {
    if (isRefillItem(item)) {
      return count + (item.quantity || 0);
    }
    return count;
  }, 0);
};

const calculateTotalWithDelivery = (order) => {
  const totalAmount = parseFloat(order?.total_amount) || 0;
  const deliveryFee = parseFloat(order?.delivery_fee) || 0;
  return totalAmount + deliveryFee;
};

// ─── Main Component ───
export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── State ───
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);

  // ─── React Query: Fetch Order Details ───
  const {
    data: order = null,
    isLoading: orderLoading,
    isFetching: orderFetching,
    error: orderError,
    refetch: refetchOrder,
  } = useQuery({
    queryKey: QUERY_KEYS.ORDER_DETAILS(id),
    queryFn: async () => {
      const response = await api.get(`/orders/${id}/details`);
      if (response.data.success) {
        return response.data.order;
      }
      throw new Error(response.data.message || 'Failed to load order details');
    },
    staleTime: 60000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
    placeholderData: (previousData) => previousData,
    retry: 2,
  });

  // ─── React Query: Fetch Order History ───
  const {
    data: history = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: QUERY_KEYS.ORDER_HISTORY(id),
    queryFn: async () => {
      const response = await api.get(`/orders/${id}/details`);
      return response.data.history || [];
    },
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Delivery Personnel ───
  const {
    data: deliveryPersonnel = [],
    isLoading: personnelLoading,
    refetch: refetchPersonnel,
  } = useQuery({
    queryKey: QUERY_KEYS.DELIVERY_PERSONNEL,
    queryFn: async () => {
      const response = await api.get('/deliveries/personnel');
      if (response.data.success) {
        return response.data.personnel || [];
      }
      return [];
    },
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Update Order Status Mutation ───
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      const response = await api.put(`/orders/${orderId}/status`, { status });
      return response.data;
    },
    onSuccess: (data, variables) => {
      toast.success(`Order status updated to ${statusConfig[variables.status].label}`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER_DETAILS(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER_HISTORY(id) });
      refetchOrder();
      refetchHistory();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update status');
    },
  });

  // ─── React Query: Assign Delivery Person Mutation ───
  const assignDeliveryMutation = useMutation({
    mutationFn: async ({ orderId, deliveryPersonId }) => {
      const response = await api.put(`/orders/${orderId}/assign`, {
        deliveryPersonId
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Delivery person assigned successfully');
      setShowAssignModal(false);
      setSelectedDeliveryPerson('');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER_DETAILS(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DELIVERY_PERSONNEL });
      refetchOrder();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign delivery person');
    },
  });

  // ─── Memoized Computations ───
  const isHomeDelivery = useMemo(() => order?.order_type === 'HOME_DELIVERY', [order]);
  const isPickup = useMemo(() => order?.order_type === 'PICKUP', [order]);
  const emptyBottlesCount = useMemo(() => countEmptyBottles(order?.items), [order?.items]);
  const totalWithDelivery = useMemo(() => calculateTotalWithDelivery(order), [order]);
  const deliveryFee = useMemo(() => parseFloat(order?.delivery_fee) || 0, [order]);

  const statusSteps = useMemo(() => {
    if (isHomeDelivery) return deliveryStatusSteps;
    if (isPickup) return pickupStatusSteps;
    return deliveryStatusSteps;
  }, [isHomeDelivery, isPickup]);

  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    const stepIndex = statusSteps.indexOf(order.order_status);
    return stepIndex >= 0 ? stepIndex : 0;
  }, [order, statusSteps]);

  // ─── Handlers ───
  const updateOrderStatus = useCallback((newStatus) => {
    updateStatusMutation.mutate({ orderId: id, status: newStatus });
  }, [id, updateStatusMutation]);

  const assignDeliveryPerson = useCallback(() => {
    if (!selectedDeliveryPerson) {
      toast.error('Please select a delivery person');
      return;
    }
    assignDeliveryMutation.mutate({ 
      orderId: id, 
      deliveryPersonId: selectedDeliveryPerson 
    });
  }, [id, selectedDeliveryPerson, assignDeliveryMutation]);

  const handleRefresh = useCallback(() => {
    refetchOrder();
    refetchHistory();
    refetchPersonnel();
    toast.success('Refreshing order details...');
  }, [refetchOrder, refetchHistory, refetchPersonnel]);

  const getStatusIcon = useCallback((status) => {
    const config = statusConfig[status];
    if (config?.icon) {
      const Icon = config.icon;
      return <Icon size={16} />;
    }
    return <Clock size={16} />;
  }, []);

  // ─── Loading State ───
  if (orderLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-500">Loading order details...</p>
      </div>
    );
  }

  // ─── Error State ───
  if (orderError || !order) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">
          {orderError?.response?.status === 404 ? 'Order not found' : 'Failed to load order'}
        </p>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => navigate('/app/orders')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Orders
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isUpdating = updateStatusMutation.isPending || assignDeliveryMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/orders')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Order #{order.id}
              {isPickup && (
                <span className="ml-3 text-sm font-medium text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
                  <HandHelping size={14} className="inline mr-1" />
                  Pickup
                </span>
              )}
              {isHomeDelivery && (
                <span className="ml-3 text-sm font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
                  <Truck size={14} className="inline mr-1" />
                  Home Delivery
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">
              Placed on {new Date(order.created_at).toLocaleString()}
              {orderFetching && ' (updating...)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={orderFetching}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={orderFetching ? 'animate-spin' : ''} />
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[order.order_status]?.color || 'bg-gray-100 text-gray-700'}`}>
            {statusConfig[order.order_status]?.label || order.order_status}
          </span>
          {order.delivery && isHomeDelivery && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${deliveryStatusConfig[order.delivery.status]?.color || 'bg-gray-100 text-gray-700'}`}>
              🚚 {deliveryStatusConfig[order.delivery.status]?.label || order.delivery.status}
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Printer size={18} />
          </button>
        </div>
      </div>

      {/* ─── Status Progress ─── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" /> 
            Order Progress
            {isPickup && (
              <span className="text-xs text-gray-400 font-normal">
                (Pickup Order - No Delivery Required)
              </span>
            )}
            {isHomeDelivery && (
              <span className="text-xs text-gray-400 font-normal">
                (Home Delivery)
              </span>
            )}
          </h3>
          {isHomeDelivery && order.delivery?.delivery_person && (
            <span className="text-xs text-green-600 bg-green-50 px-3 py-1 rounded-full flex items-center gap-1">
              <Bike size={14} />
              {order.delivery.delivery_person.full_name}
            </span>
          )}
        </div>
        <div className="relative">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const StatusIcon = statusConfig[step]?.icon || Clock;
              const stepLabel = isPickup && step === 'DELIVERED' ? 'Completed' : statusConfig[step]?.label || step;
              
              return (
                <div key={step} className="flex flex-col items-center flex-1">
                  <div className="relative">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                          : 'bg-gray-200 text-gray-400'
                      } ${isCurrent ? 'ring-4 ring-blue-200 scale-110' : ''}`}
                    >
                      {isCompleted ? (
                        <CheckCircle size={20} />
                      ) : (
                        <StatusIcon size={20} />
                      )}
                    </div>
                    {isCurrent && (
                      <div className="absolute -top-1 -right-1">
                        <div className="animate-ping h-3 w-3 rounded-full bg-blue-400"></div>
                      </div>
                    )}
                  </div>
                  <p className={`text-xs mt-2 font-medium ${isCompleted ? 'text-blue-600' : 'text-gray-400'}`}>
                    {stepLabel}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${(currentStepIndex / (statusSteps.length - 1)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left Column - Order Info ─── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <User size={18} className="text-blue-600" /> Customer Information
            </h3>
            {order.customer ? (
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900">{order.customer.name}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" /> {order.customer.email}
                  </p>
                  <p className="text-sm text-gray-600 flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" /> {order.customer.phone || 'N/A'}
                  </p>
                </div>
                {order.customer.address && (
                  <p className="text-sm text-gray-600 flex items-start gap-2">
                    <MapPin size={14} className="text-gray-400 mt-0.5" /> {order.customer.address}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">Customer information not available</p>
            )}
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" /> Order Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-medium">Order Type</p>
                <p className="font-medium mt-1 flex items-center gap-1.5">
                  {isHomeDelivery ? (
                    <>
                      <Truck size={14} className="text-blue-500" />
                      Home Delivery
                    </>
                  ) : (
                    <>
                      <Store size={14} className="text-purple-500" />
                      Pickup
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Payment Method</p>
                <p className="font-medium mt-1">{order.payment_method}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Payment Status</p>
                <p className={`font-medium mt-1 ${order.payment_status === 'PAID' || order.payment_status === 'COMPLETED' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {order.payment_status}
                </p>
              </div>
              {isHomeDelivery && order.delivery_location && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 font-medium">Delivery Location</p>
                  <p className="font-medium mt-1">{order.delivery_location}</p>
                </div>
              )}
              {isPickup && (
                <div className="col-span-2 bg-purple-50 rounded-lg p-3 border border-purple-100">
                  <p className="text-xs text-purple-600 font-medium flex items-center gap-1.5">
                    <HandHelping size={14} />
                    This is a pickup order - Customer will collect from store
                  </p>
                </div>
              )}
              {isHomeDelivery && order.delivery && (
                <>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Delivery Status</p>
                    <p className={`font-medium mt-1 ${deliveryStatusConfig[order.delivery.status]?.color || 'text-gray-600'}`}>
                      {deliveryStatusConfig[order.delivery.status]?.label || order.delivery.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Delivery Fee</p>
                    <p className="font-medium mt-1">{formatCurrency(deliveryFee)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Empty Bottles</p>
                    <p className="font-medium mt-1 flex items-center gap-1.5">
                      <RotateCcw size={14} className="text-emerald-600" />
                      <span className="font-bold text-emerald-600">{emptyBottlesCount}</span>
                      <span className="text-xs text-gray-400">bottle{emptyBottlesCount !== 1 ? 's' : ''}</span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Package size={18} className="text-blue-600" /> Order Items
            </h3>
            <div className="space-y-3">
              {order.items?.map((item, index) => {
                const productName = item.product?.name || item.product_name || 'Product';
                const isRefill = isRefillItem(item);
                const isSealed = productName.toLowerCase().includes('sealed');
                
                return (
                  <div key={index} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 flex-1">
                      {item.product?.image_url && (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-gray-900">{productName}</p>
                          {isRefill && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <RotateCcw size={12} />
                              Refill
                            </span>
                          )}
                          {isSealed && (
                            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                              <PackageCheck size={12} />
                              Sealed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {item.quantity} x {formatCurrency(item.product?.unit_price || item.unit_price || 0)}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-900">{formatCurrency(item.subTotal || 0)}</p>
                  </div>
                );
              })}
            </div>
            
            {emptyBottlesCount > 0 && (
              <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <RotateCcw size={16} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-800">
                      Empty Bottles to Collect
                    </p>
                    <p className="text-xs text-emerald-600">
                      Customer is returning <span className="font-bold">{emptyBottlesCount}</span> empty 19L bottle{emptyBottlesCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
              <p className="text-sm text-gray-600">Subtotal</p>
              <p className="font-semibold text-gray-900">{formatCurrency(order.total_amount || 0)}</p>
            </div>
            
            {isHomeDelivery && deliveryFee > 0 && (
              <div className="mt-1 flex justify-between items-center">
                <p className="text-sm text-gray-600">Delivery Fee</p>
                <p className="font-semibold text-gray-900">+{formatCurrency(deliveryFee)}</p>
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
              <p className="font-semibold text-gray-900">Total Amount</p>
              <p className="font-bold text-xl text-blue-600">
                {formatCurrency(totalWithDelivery)}
                {isHomeDelivery && deliveryFee > 0 && (
                  <span className="text-xs text-gray-400 font-normal block text-right">
                    (includes delivery fee)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Status History */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" /> Status History
              </h3>
              <div className="space-y-4">
                {history.map((entry, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="mt-1">
                      {index === 0 ? (
                        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-gray-300 mt-1.5"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${statusConfig[entry.status]?.color?.replace('bg-', 'text-').replace('100', '600') || 'text-gray-600'}`}>
                          {statusConfig[entry.status]?.label || entry.status}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(entry.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        by {entry.users?.name || 'System'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Right Column - Actions ─── */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-blue-600" /> Actions
            </h3>

            {/* Delivery Person Assignment */}
            {isHomeDelivery && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Delivery Person
                </label>
                {order.delivery?.delivery_person ? (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
                      <Bike size={16} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{order.delivery.delivery_person.full_name}</p>
                      <p className="text-xs text-gray-500">{order.delivery.delivery_person.phone_number}</p>
                    </div>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      disabled={isUpdating}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="w-full px-4 py-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border-2 border-dashed border-blue-200"
                    disabled={isUpdating}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Bike size={16} />
                      Assign Delivery Person
                    </div>
                  </button>
                )}
              </div>
            )}

            {isPickup && (
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <HandHelping size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-800">Pickup Order</p>
                    <p className="text-xs text-purple-600">No delivery assignment needed</p>
                  </div>
                </div>
                <div className="mt-2 text-xs text-purple-600 bg-purple-100/50 p-2 rounded-lg">
                  Customer will collect from store at their convenience
                </div>
              </div>
            )}

            {/* Status Update */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Update Order Status</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusConfig).map(([key, config]) => {
                  if (isPickup && key === 'DELIVERED') return null;
                  if (isHomeDelivery && key === 'COMPLETED') return null;
                  
                  const isDisabled = 
                    isUpdating || 
                    key === order.order_status || 
                    (key === 'CANCELLED' && order.order_status === 'DELIVERED') ||
                    (key === 'DELIVERED' && order.order_status === 'CANCELLED') ||
                    (key === 'COMPLETED' && order.order_status === 'CANCELLED') ||
                    (key === 'CANCELLED' && order.order_status === 'COMPLETED');
                  
                  return (
                    <button
                      key={key}
                      onClick={() => updateOrderStatus(key)}
                      disabled={isDisabled}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                        key === order.order_status
                          ? `${config.color} cursor-default ring-2 ring-offset-1`
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {getStatusIcon(key)}
                        {config.label}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(order.total_amount || 0)}</span>
                </div>
                {isHomeDelivery && deliveryFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Delivery Fee</span>
                    <span className="font-semibold text-gray-900">+{formatCurrency(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-1 border-t border-gray-100">
                  <span className="font-semibold text-gray-700">Total</span>
                  <span className="font-bold text-blue-600">{formatCurrency(totalWithDelivery)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Items Count</span>
                  <span className="font-semibold text-gray-900">{order.items?.length || 0}</span>
                </div>
                {emptyBottlesCount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <RotateCcw size={14} className="text-emerald-600" />
                      Empty Bottles
                    </span>
                    <span className="font-semibold text-emerald-600">{emptyBottlesCount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Created Date</span>
                  <span className="font-semibold text-gray-900 text-xs">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                {isHomeDelivery && order.delivery?.delivery_start_time && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Assigned Date</span>
                    <span className="font-semibold text-gray-900 text-xs">
                      {new Date(order.delivery.delivery_start_time).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={() => navigate(`/app/deliveries?order=${order.id}`)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium text-center"
              >
                {isHomeDelivery ? 'View in Deliveries' : 'View Order Details'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Assign Delivery Person Modal ─── */}
      {showAssignModal && isHomeDelivery && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Bike size={20} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Assign Delivery Person</h3>
                <p className="text-sm text-gray-500">Select a delivery person for order #{order.id}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <select
                value={selectedDeliveryPerson}
                onChange={(e) => setSelectedDeliveryPerson(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                disabled={isUpdating}
              >
                <option value="">Select delivery person...</option>
                {deliveryPersonnel.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} {person.phone ? `(${person.phone})` : ''}
                  </option>
                ))}
              </select>

              {personnelLoading && (
                <p className="text-sm text-gray-500 text-center">Loading delivery personnel...</p>
              )}

              {deliveryPersonnel.length === 0 && !personnelLoading && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  No delivery personnel available. Please add delivery staff first.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={assignDeliveryPerson}
                  disabled={isUpdating || !selectedDeliveryPerson}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Assigning...' : 'Assign'}
                </button>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedDeliveryPerson('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}