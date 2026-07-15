// frontend/src/pages/admin/OrderDetails.jsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
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
  Printer
} from 'lucide-react';
import api from '../../services/api';
import { formatCurrency } from '../../utils/helpers';
import toast from 'react-hot-toast';

const statusConfig = {
  PLACED: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle }
};

const deliveryStatusConfig = {
  PENDING: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  ASSIGNED: { label: 'Assigned', color: 'bg-blue-100 text-blue-700' },
  PICKED_UP: { label: 'Picked Up', color: 'bg-cyan-100 text-cyan-700' },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' }
};

const statusSteps = ['PLACED', 'PROCESSING', 'DELIVERED'];

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [deliveryPersonnel, setDeliveryPersonnel] = useState([]);
  const [selectedDeliveryPerson, setSelectedDeliveryPerson] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');

  useEffect(() => {
    loadOrderDetails();
    loadDeliveryPersonnel();
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}/details`);
      if (response.data.success) {
        setOrder(response.data.order);
        setHistory(response.data.history || []);
      } else {
        toast.error('Failed to load order details');
      }
    } catch (error) {
      console.error('Failed to load order details:', error);
      if (error.response?.status === 404) {
        toast.error('Order not found');
      } else {
        toast.error('Failed to load order details');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryPersonnel = async () => {
    try {
      const response = await api.get('/orders/delivery/personnel');
      if (response.data.success) {
        setDeliveryPersonnel(response.data.personnel || []);
      }
    } catch (error) {
      console.error('Failed to load delivery personnel:', error);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    try {
      setUpdating(true);
      const response = await api.put(`/orders/${id}/status`, { status: newStatus });
      if (response.data.success) {
        toast.success(`Order status updated to ${statusConfig[newStatus].label}`);
        await loadOrderDetails();
        setShowStatusModal(false);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const assignDeliveryPerson = async () => {
    if (!selectedDeliveryPerson) {
      toast.error('Please select a delivery person');
      return;
    }
    try {
      setUpdating(true);
      const response = await api.put(`/orders/${id}/assign`, {
        deliveryPersonId: selectedDeliveryPerson
      });
      if (response.data.success) {
        toast.success('Delivery person assigned successfully');
        setShowAssignModal(false);
        setSelectedDeliveryPerson('');
        await loadOrderDetails();
      }
    } catch (error) {
      console.error('Failed to assign delivery person:', error);
      toast.error('Failed to assign delivery person');
    } finally {
      setUpdating(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    const stepIndex = statusSteps.indexOf(order.order_status);
    return stepIndex >= 0 ? stepIndex : 0;
  };

  const getStatusIcon = (status) => {
    const config = statusConfig[status];
    if (config?.icon) {
      const Icon = config.icon;
      return <Icon size={16} />;
    }
    return <Clock size={16} />;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-sm text-gray-500">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Order not found</p>
        <button
          onClick={() => navigate('/admin/orders')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/orders')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order #{order.id}</h1>
            <p className="text-sm text-gray-500">
              Placed on {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig[order.order_status]?.color || 'bg-gray-100 text-gray-700'}`}>
            {statusConfig[order.order_status]?.label || order.order_status}
          </span>
          {order.delivery && (
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

      {/* Status Progress */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Order Progress</h3>
        <div className="relative">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= getCurrentStepIndex();
              const isCurrent = index === getCurrentStepIndex();
              const StatusIcon = statusConfig[step]?.icon || Clock;
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
                    {statusConfig[step]?.label || step}
                  </p>
                </div>
              );
            })}
          </div>
          {/* Progress bar */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 -z-10">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${(getCurrentStepIndex() / (statusSteps.length - 1)) * 100}%`
              }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Order Info */}
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

          {/* Delivery Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Truck size={18} className="text-blue-600" /> Delivery Information
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-medium">Order Type</p>
                <p className="font-medium mt-1">
                  {order.order_type === 'HOME_DELIVERY' ? '🏠 Home Delivery' : '📦 Pickup'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Payment Method</p>
                <p className="font-medium mt-1">{order.payment_method}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium">Payment Status</p>
                <p className={`font-medium mt-1 ${order.payment_status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {order.payment_status}
                </p>
              </div>
              {order.delivery_location && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 font-medium">Delivery Location</p>
                  <p className="font-medium mt-1">{order.delivery_location}</p>
                </div>
              )}
              {order.delivery && (
                <>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Delivery Status</p>
                    <p className={`font-medium mt-1 ${deliveryStatusConfig[order.delivery.status]?.color || 'text-gray-600'}`}>
                      {deliveryStatusConfig[order.delivery.status]?.label || order.delivery.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Delivery Fee</p>
                    <p className="font-medium mt-1">{formatCurrency(order.delivery.delivery_fee || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Empty Bottles</p>
                    <p className="font-medium mt-1">{order.delivery.collecting_empty_bottles || 0}</p>
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
              {order.items?.map((item, index) => (
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
                      <p className="font-medium text-gray-900">{item.product?.name || 'Product'}</p>
                      <p className="text-sm text-gray-500">
                        {item.quantity} x {formatCurrency(item.product?.unit_price || 0)}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">{formatCurrency(item.subTotal || 0)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <p className="font-semibold text-gray-900">Total Amount</p>
              <p className="font-bold text-xl text-blue-600">{formatCurrency(order.total_amount || 0)}</p>
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

        {/* Right Column - Actions */}
        <div className="space-y-6">
          {/* Actions Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-blue-600" /> Actions
            </h3>

            {/* Delivery Person Assignment */}
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
                  >
                    Change
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="w-full px-4 py-3 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors border-2 border-dashed border-blue-200"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Bike size={16} />
                    Assign Delivery Person
                  </div>
                </button>
              )}
            </div>

            {/* Status Update */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600">Update Order Status</p>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusConfig).map(([key, config]) => {
                  const isDisabled = 
                    updating || 
                    key === order.order_status || 
                    (key === 'CANCELLED' && order.order_status === 'DELIVERED') ||
                    (key === 'DELIVERED' && order.order_status === 'CANCELLED');
                  
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
                  <span className="text-gray-500">Order Total</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(order.total_amount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Items Count</span>
                  <span className="font-semibold text-gray-900">{order.items?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Created Date</span>
                  <span className="font-semibold text-gray-900 text-xs">
                    {new Date(order.created_at).toLocaleDateString()}
                  </span>
                </div>
                {order.delivery?.delivery_start_time && (
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
                onClick={() => navigate(`/admin/deliveries?order=${order.id}`)}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium text-center"
              >
                View in Deliveries
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Assign Delivery Person Modal */}
      {showAssignModal && (
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
              >
                <option value="">Select delivery person...</option>
                {deliveryPersonnel.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} {person.phone ? `(${person.phone})` : ''}
                  </option>
                ))}
              </select>

              {deliveryPersonnel.length === 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                  No delivery personnel available. Please add delivery staff first.
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={assignDeliveryPerson}
                  disabled={updating || !selectedDeliveryPerson}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Assigning...' : 'Assign'}
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