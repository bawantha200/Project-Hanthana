import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, Truck, MessageSquare, UserCheck, ArrowUpRight, Clock,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import { getSalesManagerDashboard } from '../../services/salesService';
import { formatCurrency } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const cardClass = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const result = await getSalesManagerDashboard();
      if (result.success) setData(result);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { orderStats, deliveryStats, riderWorkload, messageStats, recentOrders, recentMessages } = data;

  const orderChartData = [
    { status: 'Pending', count: orderStats.pending },
    { status: 'Processing', count: orderStats.processing },
    { status: 'Delivered', count: orderStats.delivered },
    { status: 'Cancelled', count: orderStats.cancelled },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Sales Manager Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Orders, deliveries, and customer support overview</p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pending Orders"
          value={orderStats.pending}
          subtitle="need processing"
          icon={ShoppingCart}
          color="amber"
          delay={0}
        />
        <StatCard
          title="Active Deliveries"
          value={deliveryStats.active}
          subtitle="in progress"
          icon={Truck}
          color="cyan"
          delay={0.08}
        />
        <StatCard
          title="Unassigned Deliveries"
          value={deliveryStats.unassigned}
          subtitle="awaiting rider"
          icon={UserCheck}
          color="blue"
          delay={0.16}
        />
        <StatCard
          title="Unreplied Messages"
          value={messageStats.unreplied}
          subtitle="from customers"
          icon={MessageSquare}
          color="emerald"
          delay={0.24}
        />
      </motion.div>

      {/* Order status chart + Delivery/rider table */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={cardClass}>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Order Status Breakdown</h2>
          <p className="text-xs text-gray-400 mb-5">Current order pipeline</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={orderChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={cardClass}>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Rider Workload</h2>
          <p className="text-xs text-gray-400 mb-5">Active deliveries per rider</p>
          {riderWorkload.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No active rider assignments</p>
          ) : (
            <div className="space-y-3">
              {riderWorkload.map((rider) => (
                <div key={rider.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm font-medium text-gray-700">{rider.name}</span>
                  <span className="text-sm font-semibold text-blue-600">{rider.activeDeliveries} active</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Recent messages + recent orders */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Recent Messages</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest customer inquiries</p>
            </div>
            <button
              onClick={() => navigate('/admin/messages')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {recentMessages.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No messages yet</p>
            )}
            {recentMessages.map((msg) => (
              <div key={msg.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-700">{msg.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{msg.preview}...</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${
                  msg.status === 'Replied' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {msg.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
              <p className="text-xs text-gray-400 mt-0.5">Latest orders placed</p>
            </div>
            <button
              onClick={() => navigate('/admin/orders')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 px-2 font-medium text-blue-600">{order.id}</td>
                    <td className="py-2 px-2 text-gray-700">{order.customer}</td>
                    <td className="py-2 px-2 text-right text-gray-700 font-medium">{formatCurrency(order.amount)}</td>
                    <td className="py-2 px-2 text-center text-xs">{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}