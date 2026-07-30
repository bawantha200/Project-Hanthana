import { useEffect, useMemo, useState,useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  DollarSign, Package, Truck, ShoppingCart, TrendingUp, ArrowUpRight,
  Wallet, Receipt, Gauge, AlertTriangle, Filter, RefreshCw, Sparkles,
} from 'lucide-react';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import api, { inventoryAPI } from '../../services/api';
import { fetchOrders } from '../../services/ordersService';
import {
  getInvoiceReport,
  getMonthlyRevenueHistory,
  getPendingPayments,
} from '../../services/reportService';
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

const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

const ORDER_STATUS_FILTERS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Threshold below which sealed-bottle stock triggers a low-stock warning banner.
// Adjust to match real operational thresholds once available from the backend.
const LOW_STOCK_THRESHOLD = 50;
const FORECAST_MONTHS = 2;

const toISODate = (date) => date.toISOString().slice(0, 10);

const getDashboardRange = (period, customFrom, customTo) => {
  const now = new Date();
  const dateTo = toISODate(now);

  if (period === 'today') {
    return { dateFrom: dateTo, dateTo };
  }

  if (period === 'week') {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { dateFrom: toISODate(start), dateTo };
  }

  if (period === 'custom' && customFrom && customTo) {
    return { dateFrom: customFrom, dateTo: customTo };
  }

  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { dateFrom: toISODate(from), dateTo };
};

// Simple least-squares linear regression used to project the next few
// months of order volume from the historical monthly order counts.
const buildOrderForecast = (growthData, months = FORECAST_MONTHS) => {
  if (!Array.isArray(growthData) || growthData.length < 2) {
    return (growthData || []).map((d) => ({ ...d, predicted: null }));
  }

  const n = growthData.length;
  const xs = growthData.map((_, i) => i);
  const ys = growthData.map((d) => d.orders || 0);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - xMean) * (ys[i] - yMean);
    den += (x - xMean) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  const withActual = growthData.map((d, i) => ({
    ...d,
    predicted: i === n - 1 ? d.orders : null,
  }));

  const lastDate = growthData[n - 1].dateObj
    ? new Date(growthData[n - 1].dateObj)
    : new Date();

  const forecastPoints = Array.from({ length: months }, (_, i) => {
    const futureIndex = n + i;
    const projected = Math.max(0, Math.round(intercept + slope * futureIndex));
    const futureDate = new Date(lastDate);
    futureDate.setMonth(futureDate.getMonth() + i + 1);
    return {
      month: futureDate.toLocaleString('en-US', { month: 'short' }),
      orders: null,
      delivered: null,
      predicted: projected,
      isForecast: true,
    };
  });

  return [...withActual, ...forecastPoints];
};

const CustomTooltip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload
        .filter((entry) => entry.value !== null && entry.value !== undefined)
        .map((entry, idx) => (
          <p key={idx} style={{ color: entry.color }} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            {entry.name}: {formatter ? formatter(entry.value) : entry.value.toLocaleString('en-IN')}
          </p>
        ))}
    </div>
  );
};

const EXPENSE_COLORS = ['#2563eb', '#f59e0b'];

export default function Dashboard() {
  const [selectedRange, setSelectedRange] = useState('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [metrics, setMetrics] = useState({ revenue: 0, expenses: 0, netProfit: 0, invoiceCount: 0 });
  const [pendingPayments, setPendingPayments] = useState(0);
  const [stockSummary, setStockSummary] = useState({ sealed_bottles: 0, empty_bottles: 0, total: 0 });
  const [activeDeliveries, setActiveDeliveries] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [orderGrowth, setOrderGrowth] = useState([]);
  const TOTAL_FETCHES = 6; // matches the 6 promises in Promise.all below
  const [loadProgress, setLoadProgress] = useState(0);
  const loadRunIdRef = useRef(0);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
  const loadDashboardData = async () => {
    // Custom range needs both dates before we fetch anything.
    if (selectedRange === 'custom' && (!customFrom || !customTo)) {
      return;
    }

    // Mark this as a new run — any trackProgress() calls from a previous,
    // still-in-flight run will check this and bail out instead of
    // incrementing/overwriting state for THIS run.
    const runId = ++loadRunIdRef.current;

    setLoading(true);
    setLoadProgress(0);
    const range = getDashboardRange(selectedRange, customFrom, customTo);

    // Wraps a promise so we bump the progress counter the moment IT
    // resolves — not when the whole Promise.all resolves. This gives a
    // real (not fake/simulated) progress bar.
    const trackProgress = (promise) =>
      promise.then((result) => {
        if (loadRunIdRef.current === runId) {
          setLoadProgress((p) => p + 1);
        }
        return result;
      });

    try {
      const [reportRes, pendingRes, stockRes, orders, deliveriesRes, monthlyRevenueRes] = await Promise.all([
        trackProgress(getInvoiceReport(range.dateFrom, range.dateTo)),
        trackProgress(getPendingPayments()),
        trackProgress(inventoryAPI.getStockSummary()),
        trackProgress(fetchOrders()),
        trackProgress(api.get('/deliveries', { params: {} })),
        trackProgress(getMonthlyRevenueHistory()),
      ]);

      // A newer run already started while this one was still in flight —
      // discard these stale results entirely, don't let them overwrite
      // newer state.
      if (loadRunIdRef.current !== runId) {
        return;
      }

      const deliveries = deliveriesRes?.data?.deliveries || [];
      const activeDeliveryCount = deliveries.filter(
        (delivery) => !['DELIVERED', 'CANCELLED'].includes(String(delivery.status || '').toUpperCase())
      ).length;

      const rawOrders = Array.isArray(orders) ? orders : [];
      const normalizedOrders = rawOrders.map((order) => ({
        id: order.id,
        customer:
          order.customer_name ||
          order.customer ||
          order.users?.name ||
          order.customerName ||
          '',
        amount: Number(order.total_amount || order.amount || 0),
        status: order.order_status || order.status || '',
        created_at: order.created_at || order.createdAt || order.date || '',
      }));

      const growthMap = {};
      normalizedOrders.forEach((order) => {
        const createdAt = order.created_at;
        if (!createdAt) return;
        const date = new Date(createdAt);
        if (Number.isNaN(date.getTime())) return;
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const month = date.toLocaleString('en-US', { month: 'short' });
        if (!growthMap[monthKey]) {
          growthMap[monthKey] = {
            month,
            orders: 0,
            delivered: 0,
            dateObj: new Date(date.getFullYear(), date.getMonth(), 1),
          };
        }
        growthMap[monthKey].orders += 1;
        const orderStatus = String(order.status || '').toUpperCase();
        if (orderStatus === 'DELIVERED' || orderStatus === 'COMPLETED') {
          growthMap[monthKey].delivered += 1;
        }
      });

      setMetrics({
        revenue: reportRes.revenue || 0,
        expenses: reportRes.expenses || 0,
        netProfit: reportRes.netProfit || 0,
        invoiceCount: reportRes.invoiceCount || 0,
      });
      setPendingPayments(pendingRes.pendingPayments || 0);
      setStockSummary(stockRes.data?.summary || { sealed_bottles: 0, empty_bottles: 0, total: 0 });
      setActiveDeliveries(activeDeliveryCount);
      setRecentOrders(normalizedOrders.slice(0, 10));
      setMonthlyRevenue(Array.isArray(monthlyRevenueRes) ? monthlyRevenueRes : monthlyRevenueRes?.data || []);
      setOrderGrowth(
        Object.values(growthMap).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      );
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      if (loadRunIdRef.current === runId) {
        setLoading(false);
        setHasLoadedOnce(true);
      }
    }
  };

  loadDashboardData();
}, [selectedRange, customFrom, customTo, refreshKey]);

  const activeRangeLabel = PERIOD_OPTIONS.find((option) => option.value === selectedRange)?.label || 'This Month';
  const displayRevenue = loading ? '...' : formatCurrency(metrics.revenue);
  const displayExpenses = loading ? '...' : formatCurrency(metrics.expenses);
  const displayNetProfit = loading ? '...' : formatCurrency(metrics.netProfit);
  const displayPending = loading ? '...' : formatCurrency(pendingPayments);
  const displayOrders = loading ? '...' : metrics.invoiceCount;
  const displayStock = loading ? '...' : `${stockSummary.total || 0} units`;
  const displayDeliveries = loading ? '...' : activeDeliveries;
  const avgOrderValue = !loading && metrics.invoiceCount
    ? formatCurrency(metrics.revenue / metrics.invoiceCount)
    : loading ? '...' : formatCurrency(0);

  const isLowStock = !loading && (stockSummary.sealed_bottles ?? 0) < LOW_STOCK_THRESHOLD;

  const forecastData = useMemo(() => buildOrderForecast(orderGrowth), [orderGrowth]);
  const nextMonthForecast = useMemo(() => {
    const forecastOnly = forecastData.filter((d) => d.isForecast);
    return forecastOnly.length ? forecastOnly[0].predicted : null;
  }, [forecastData]);

  const revenueVsExpense = useMemo(
    () => [
      { name: 'Expenses', value: metrics.expenses || 0 },
      { name: 'Net Profit', value: Math.max(metrics.netProfit || 0, 0) },
    ],
    [metrics]
  );

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'all') return recentOrders;
    return recentOrders.filter(
      (order) => String(order.status || '').toLowerCase() === statusFilter
    );
  }, [recentOrders, statusFilter]);


  if (loading && !hasLoadedOnce) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-4">
      <p className="text-sm font-medium text-gray-600">Loading dashboard...</p>
      <div className="w-full max-w-xs h-2 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          className="h-full bg-blue-600 rounded-full"
          animate={{ width: `${(loadProgress / TOTAL_FETCHES) * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {Math.round((loadProgress / TOTAL_FETCHES) * 100)}%
      </p>
    </div>
  );
}

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            CEO view — live business metrics from the database
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setRefreshKey((k) => k + 1)}
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </motion.button>
      </motion.div>



{/* Loading progress bar — shown during initial load and every refresh */}
{loading && hasLoadedOnce && (
  <motion.div
    variants={itemVariants}
    className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-3"
  >
    <RefreshCw size={16} className="text-blue-600 animate-spin shrink-0" />
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs font-medium text-blue-700">Loading dashboard data...</p>
        <p className="text-xs text-blue-600 font-semibold">
          {Math.round((loadProgress / TOTAL_FETCHES) * 100)}%
        </p>
      </div>
      <div className="w-full h-1.5 rounded-full bg-blue-100 overflow-hidden">
        <motion.div
          className="h-full bg-blue-600 rounded-full"
          animate={{ width: `${(loadProgress / TOTAL_FETCHES) * 100}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>
    </div>
  </motion.div>
)}

      {/* Low stock warning */}
      {isLowStock && (
        <motion.div
          variants={itemVariants}
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-amber-800"
        >
          <AlertTriangle size={18} />
          <p className="text-sm">
            Sealed bottle stock is low ({stockSummary.sealed_bottles} units) — below the {LOW_STOCK_THRESHOLD}-unit alert threshold.
          </p>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={itemVariants} className={`${chartCardClass} !p-4`}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium pr-2">
            <Filter size={14} />
            Filters
          </div>

          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedRange(option.value)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedRange === option.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}

          {selectedRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
              />
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-500">Order status</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 bg-white"
            >
              {ORDER_STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Showing metrics for <strong>{activeRangeLabel}</strong>
          {selectedRange === 'custom' && customFrom && customTo ? ` (${customFrom} to ${customTo})` : ''}.
        </p>
      </motion.div>

      {/* Financial Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={displayRevenue}
          subtitle={`Sales ${activeRangeLabel}`}
          icon={DollarSign}
          trend="up"
          trendValue={loading ? '...' : activeRangeLabel}
          color="blue"
          delay={0}
        />
        <StatCard
          title="Expenses"
          value={displayExpenses}
          subtitle={`Costs ${activeRangeLabel.toLowerCase()}`}
          icon={Wallet}
          color="amber"
          delay={0.06}
        />
        <StatCard
          title="Net Profit"
          value={displayNetProfit}
          subtitle="revenue minus expenses"
          icon={TrendingUp}
          color="emerald"
          delay={0.12}
        />
        <StatCard
          title="Pending Payments"
          value={displayPending}
          subtitle="outstanding from customers"
          icon={Receipt}
          color="cyan"
          delay={0.18}
        />
      </motion.div>

      {/* Operational Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Available Stock"
          value={displayStock}
          subtitle="live inventory total"
          icon={Package}
          color="amber"
          delay={0}
        />
        <StatCard
          title="Active Deliveries"
          value={displayDeliveries}
          subtitle="in progress now"
          icon={Truck}
          color="cyan"
          delay={0.06}
        />
        <StatCard
          title="Total Orders"
          value={displayOrders}
          subtitle={`during ${activeRangeLabel.toLowerCase()}`}
          icon={ShoppingCart}
          color="emerald"
          delay={0.12}
        />
        <StatCard
          title="Avg. Order Value"
          value={avgOrderValue}
          subtitle="revenue / orders"
          icon={Gauge}
          color="blue"
          delay={0.18}
        />
      </motion.div>

      {/* Charts Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Monthly Revenue */}
        <div className={chartCardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Monthly Revenue</h2>
              <p className="text-xs text-gray-400 mt-0.5">Actual revenue from invoices</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-blue-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyRevenue} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              <Bar dataKey="income" name="Revenue" fill="#2563eb" radius={[6, 6, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Order Growth + Prediction */}
        <div className={chartCardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Order Growth &amp; Forecast</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Orders placed vs delivered, with a {FORECAST_MONTHS}-month projection
              </p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Sparkles size={18} className="text-blue-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={forecastData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              <Line
                type="monotone"
                dataKey="orders"
                name="Orders"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="delivered"
                name="Delivered"
                stroke="#93c5fd"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#93c5fd', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#93c5fd', stroke: '#fff', strokeWidth: 2 }}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="predicted"
                name="Predicted orders"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="6 3"
                dot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
          {nextMonthForecast !== null && (
            <p className="text-xs text-gray-400 mt-3">
              Next month is projected at <strong>{nextMonthForecast}</strong> orders based on the recent trend.
            </p>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Revenue Trend */}
        <div className={chartCardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Revenue Trend</h2>
              <p className="text-xs text-gray-400 mt-0.5">Actual revenue by month</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package size={18} className="text-blue-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={monthlyRevenue.map((item) => ({
                month: item.month,
                income: Number(item.income || item.value || 0),
              }))}
            >
              <defs>
                <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
              <Area
                type="monotone"
                dataKey="income"
                name="Revenue"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#actualGrad)"
                dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                activeDot={{ r: 6, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue vs Expense breakdown */}
        <div className={chartCardClass}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Profit Breakdown</h2>
              <p className="text-xs text-gray-400 mt-0.5">Expenses vs net profit, {activeRangeLabel.toLowerCase()}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Wallet size={18} className="text-blue-600" />
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={revenueVsExpense}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={3}
              >
                {revenueVsExpense.map((entry, index) => (
                  <Cell key={entry.name} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip formatter={(v) => formatCurrency(v)} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Recent Orders Table */}
      <motion.div variants={itemVariants} className={chartCardClass}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Recent Orders</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Latest orders across island {statusFilter !== 'all' ? `— filtered by ${statusFilter}` : ''}
            </p>
          </div>
          <motion.button
  whileHover={{ scale: 1.04 }}
  whileTap={{ scale: 0.97 }}
  onClick={() => navigate('/app/orders')}
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
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400 text-sm">
                    No orders match this filter.
                  </td>
                </tr>
              )}
              {filteredOrders.map((order) => (
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