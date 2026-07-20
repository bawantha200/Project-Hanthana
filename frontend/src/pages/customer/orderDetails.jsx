// frontend/src/customer/OrderDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, MapPin, CreditCard, Calendar, User, Phone, Mail } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import api from '../../services/api';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const OrderDetail = () => {
  const { id } = useParams(); // numeric order ID from URL
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.get(`/orders/${id}`);
        if (response.data.success) {
          setOrder(response.data.order);
        } else {
          throw new Error(response.data.message || 'Failed to fetch order');
        }
      } catch (err) {
        setError(err.message);
        console.error('Fetch order error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-8">
        <p>Error: {error}</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center p-8">
        <p>Order not found</p>
        <button
          onClick={() => navigate('/orders')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Back to Orders
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate('/orders')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Orders</span>
        </motion.button>

        {/* Order Header */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Order {order.id}</h1>
              <p className="text-sm text-gray-500 mt-1">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
              order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
              order.status === 'Preparing' ? 'bg-blue-100 text-blue-700 border-blue-300' :
              order.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-300' :
              'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              {order.status}
            </span>
          </div>
        </motion.div>

        {/* Order Info Grid */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6"
        >
          {/* Customer Info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <User size={16} />
              Customer Details
            </h2>
            <div className="mt-4 space-y-3">
              <p className="text-gray-900 font-medium">{order.customer?.name || 'N/A'}</p>
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <Mail size={14} />
                {order.customer?.email || 'N/A'}
              </p>
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <Phone size={14} />
                {order.customer?.phone || 'N/A'}
              </p>
              <p className="text-gray-600 text-sm flex items-start gap-2">
                <MapPin size={14} className="mt-0.5" />
                {order.customer?.address || order.deliveryLocation || 'N/A'}
              </p>
            </div>
          </div>

          {/* Payment & Delivery */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={16} />
              Payment & Delivery
            </h2>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-medium text-gray-900">{order.paymentMethod || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Status</span>
                <span className="font-medium text-gray-900">{order.paymentStatus || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Order Type</span>
                <span className="font-medium text-gray-900">{order.orderType?.replace('_', ' ') || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-t border-gray-100 pt-3 mt-3">
                <span className="text-gray-700 font-medium">Total Amount</span>
                <span className="text-xl font-bold text-blue-600">{formatCurrency(order.totalAmount)}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Order Items */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Package size={16} />
              Order Items ({order.items?.length || 0})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sub Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items?.map((item, index) => (
                  <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.productName} className="w-10 h-10 rounded-lg object-cover" />
                        )}
                        <span className="font-medium text-gray-900">{item.productName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatCurrency(item.unitPrice)}</td>
                    <td className="px-6 py-4 text-gray-600">{item.quantity}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{formatCurrency(item.subTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-right font-semibold text-gray-900">Total</td>
                  <td className="px-6 py-4 font-bold text-blue-600">{formatCurrency(order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default OrderDetail;