import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ShoppingCart, Truck, MessageSquare, UserCheck, ArrowUpRight, Clock, RefreshCw, Loader2,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import { getSalesManagerDashboard } from '../../services/salesService';
import { formatCurrency } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const cardClass = 'bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200';

// ===== API FUNCTION =====
const fetchDashboardData = async () => {
  const result = await getSalesManagerDashboard();
  if (!result.success) throw new Error(result.message || 'Failed to fetch dashboard data');
  return result;
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);

  // ===== REACT QUERY: Fetch Dashboard with Caching & Polling =====
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ['sales-dashboard', refreshKey],
    queryFn: fetchDashboardData,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60000, // Poll every 60 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  // ===== HANDLERS =====
  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
    toast.success('Refreshing dashboard...');
  };

  // Get last updated time
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : 'Never';

  // ===== LOADING STATE =====
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        {/* <p className="mt-4 text-sm text-gray-500">Loading dashboard...</p> */}
      </div>
    );
  }

  // ===== ERROR STATE =====
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-500 text-sm mb-2">Failed to load dashboard</div>
        <p className="text-xs text-gray-400 mb-4">{error.message || 'Something went wrong'}</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ===== SAFETY CHECK =====
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-sm text-gray-500">No data available</p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
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
      {/* Header with Refresh */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Manager Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Orders, deliveries, and customer support overview</p>
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {lastUpdated} • Auto-refresh every 60s
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isFetching && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Updating...
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
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
                <div key={rider.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
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
              onClick={() => navigate('/app/messages')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {recentMessages.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No messages yet</p>
            )}
            {recentMessages.map((msg) => (
              <div key={msg.id} className="flex items-start justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700">{msg.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{msg.preview}...</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
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
              onClick={() => navigate('/app/orders')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
            >
              View all <ArrowUpRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="text-left py-2 px-2 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-right py-2 px-2 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-center py-2 px-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-2 px-2 font-medium text-blue-600">{order.id}</td>
                    <td className="py-2 px-2 text-gray-700">{order.customer}</td>
                    <td className="py-2 px-2 text-right text-gray-700 font-medium">{formatCurrency(order.amount)}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                        order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-sm text-gray-400">No recent orders</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>

      {/* Footer Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-400 bg-white rounded-xl border border-gray-100 p-4">
        <div>
          <span className="font-medium text-gray-600">Total Orders:</span> {orderStats.pending + orderStats.processing + orderStats.delivered + orderStats.cancelled}
        </div>
        <div>
          <span className="font-medium text-gray-600">Delivery Rate:</span> {orderStats.delivered > 0 ? Math.round((orderStats.delivered / (orderStats.pending + orderStats.processing + orderStats.delivered + orderStats.cancelled)) * 100) : 0}%
        </div>
        <div>
          <span className="font-medium text-gray-600">Auto-refresh:</span> Every 60 seconds
        </div>
      </motion.div>
    </motion.div>
  );
}