import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { DollarSign, Package, Truck, ShoppingCart, TrendingUp, ArrowUpRight } from 'lucide-react';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import { financialData, orderGrowth, waterUsagePrediction, recentOrders } from '../../data/mockData';
import { formatCurrency } from '../../utils/helpers';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const chartCardClass =
  'bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200';

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((entry, idx) => (
        <p key={idx} style={{ color: entry.color }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          {entry.name}: {formatter ? formatter(entry.value) : entry.value.toLocaleString('en-IN')}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          AquaFlow Water Management &mdash; Business overview and analytics
        </p>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(390000)}
          subtitle="vs last month"
          icon={DollarSign}
          trend="up"
          trendValue="+7.1%"
          color="blue"
          delay={0}
        />
        <StatCard
          title="Predicted Stock Needed"
          value="1,980 units"
          subtitle="next period forecast"
          icon={Package}
          trend="up"
          trendValue="+12% increase"
          color="amber"
          delay={0.08}
        />
        <StatCard
          title="Active Deliveries"
          value="4"
          subtitle="currently in progress"
          icon={Truck}
          color="cyan"
          delay={0.16}
        />
        <StatCard
          title="Total Orders"
          value="290"
          subtitle="vs last month"
          icon={ShoppingCart}
          trend="up"
          trendValue="+9.4%"
          color="emerald"
          delay={0.24}
        />
      </motion.div>

      {/* Charts Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Income vs Expenses */}
        <div className={chartCardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Monthly Income vs Expenses</h2>
              <p className="text-xs text-gray-400 mt-0.5">Revenue and cost breakdown</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-blue-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={financialData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              />
              <Bar dataKey="income" name="Income" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={20} />
              <Bar dataKey="expenses" name="Expenses" fill="#93c5fd" radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Growth */}
        <div className={chartCardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Order Growth</h2>
              <p className="text-xs text-gray-400 mt-0.5">Orders placed vs delivered</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingCart size={18} className="text-blue-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={orderGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              />
              <Line
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="delivered"
                name="Delivered"
                stroke="#93c5fd"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#93c5fd', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#93c5fd', stroke: '#fff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
         {/* Water Usage Prediction */}
        <div className={chartCardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Water Usage Prediction</h2>
              <p className="text-xs text-gray-400 mt-0.5">Actual vs predicted demand</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package size={18} className="text-blue-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={waterUsagePrediction}>
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="predictedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
              />
              <Area
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#actualGrad)"
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="predicted"
                name="Predicted"
                stroke="#06b6d4"
                strokeWidth={2.5}
                strokeDasharray="6 3"
                fill="url(#predictedGrad)"
                dot={{ r: 4, fill: '#06b6d4', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#06b6d4', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Orders Table */}
      <motion.div variants={itemVariants} className={chartCardClass}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
            <p className="text-xs text-gray-400 mt-0.5">Latest orders across island</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            View all <ArrowUpRight size={14} />
          </motion.button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-3 px-4 font-medium text-blue-600">{order.id}</td>
                  <td className="py-3 px-4 text-gray-700">{order.customer}</td>
                  <td className="py-3 px-4 text-right text-gray-700 font-medium">
                    {formatCurrency(order.amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
