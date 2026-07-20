import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, Clock, Package, CheckCircle, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/helpers';
import { useNavigate } from "react-router-dom";
import api from '../../services/api';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const statusStyle = {
  Pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  Preparing: 'bg-blue-100 text-blue-700 border-blue-300',
  Dispatched: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  Delivered: 'bg-emerald-100 text-emerald-700 border-emerald-300',
};

const statusDot = {
  Pending: 'bg-yellow-400',
  Preparing: 'bg-blue-500',
  Dispatched: 'bg-cyan-500',
  Delivered: 'bg-emerald-500',
};

const Orders = () => {
  const [filter, setFilter] = useState('All');
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get('/orders');
        if (response.data.success) {
          setOrders(response.data.orders);
        } else {
          throw new Error(response.data.message || 'Failed to fetch orders');
        }
      } catch (err) {
        // Handle 401 specifically
        if (err.response && err.response.status === 401) {
          setFetchError('You are not logged in. Please log in to view your orders.');
          // Optional: redirect after 3 seconds
          setTimeout(() => navigate('/login'), 3000);
        } else {
          setFetchError(err.message || 'Something went wrong');
        }
        console.error('Fetch orders error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [navigate]);

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + o.amount, 0);
  const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing').length;
  const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;

  const summaryCards = [
    { label: 'Total Orders', value: totalOrders, icon: ShoppingBag, color: 'from-blue-600 to-blue-700', bg: 'bg-blue-50' },
    { label: 'Total Spent', value: formatCurrency(totalSpent), icon: DollarSign, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Orders', value: pendingOrders, icon: Clock, color: 'from-yellow-500 to-amber-500', bg: 'bg-yellow-50' },
    { label: 'Delivered Orders', value: deliveredOrders, icon: CheckCircle, color: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50' },
  ];

  const filteredOrders = filter === 'All'
    ? orders
    : orders.filter(o => o.status === filter);

  const filters = ['All', 'Preparing', 'Dispatched', 'Delivered'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-red-600 text-xl mb-4">⚠️ {fetchError}</div>
        {fetchError.includes('log in') && (
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track and manage your water orders
            </p>
          </div>
          {/* <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/tracking")}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            Order Tracking
          </motion.button> */}
        </motion.div>

        {/* Summary Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8"
        >
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                key={card.label}
                variants={fadeInUp}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Order History Table */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8"
        >
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Order History</h2>
                <p className="text-sm text-gray-500">{orders.length} orders found</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    filter === f
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="hover:bg-blue-50/30 transition-colors duration-150 cursor-pointer"
                    onClick={() => {
                    console.log('orderId being sent:', order.orderId);
                    navigate(`/order/${order.orderId}`);
        }}
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-blue-600">ORD - {order.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-gray-900">{formatCurrency(order.amount)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyle[order.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot[order.status] || 'bg-gray-400'}`} />
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">{order.date}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No orders found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filter</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Orders;