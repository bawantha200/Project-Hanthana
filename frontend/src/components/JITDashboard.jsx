import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Package,
  Calendar,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Zap,
  Clock,
  BarChart3,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// --------------------------------------------
// MOCK DATA (replace with real API calls)
// --------------------------------------------

// Products and their stock/forecast for "Tonight's Action Plan"
const products = [
  { id: 1, name: 'Sealed 5L Bottle', stock: 120, forecast: 162 },
  { id: 2, name: 'Sealed 1L Bottle', stock: 300, forecast: 280 },
  { id: 3, name: 'Sealed 500ml Bottle', stock: 80, forecast: 95 },
  { id: 4, name: 'Refill 19L', stock: 45, forecast: 60 },
];

// Weekly production schedule (Night → Day → Units)
const weeklySchedule = [
  { night: 'Sunday', day: 'Monday', units: 48 },
  { night: 'Monday', day: 'Tuesday', units: 42 },
  { night: 'Tuesday', day: 'Wednesday', units: 65 },
  { night: 'Wednesday', day: 'Thursday', units: 35 },
  { night: 'Thursday', day: 'Friday', units: 72 },
  { night: 'Friday', day: 'Saturday', units: 50 },
  { night: 'Saturday', day: 'Sunday', units: 25 },
];

// Compute metrics
const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
const capacity = 1000;
const storageEfficiency = Math.max(0, Math.min(100, ((capacity - totalStock) / capacity) * 100));

// --------------------------------------------
// Dashboard Component
// --------------------------------------------

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

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-sm">
        <p className="font-medium text-gray-900">{data.night} Night</p>
        <p className="text-gray-500 text-xs">→ {data.day}'s Orders</p>
        <p className="mt-1 text-indigo-600 font-bold">{data.units} units</p>
        {data.units > 60 && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Peak Night
          </span>
        )}
      </div>
    );
  }
  return null;
};

export default function JITDashboard() {
  const [currentDay, setCurrentDay] = useState('');

  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    setCurrentDay(days[today]);
  }, []);

  const tonightSchedule = weeklySchedule.find((s) => s.night === currentDay);
  const tonightUnits = tonightSchedule ? tonightSchedule.units : 0;

  // Prepare data for the column chart – add a "peak" flag for coloring
  const chartData = weeklySchedule.map((item) => ({
    ...item,
    isPeak: item.units > 60,
    label: `${item.night.slice(0, 3)} → ${item.day.slice(0, 3)}`, // e.g., "Sun → Mon"
  }));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ===== HEADER ===== */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">JIT Production & Demand Forecasting</h1>
          <p className="text-sm text-gray-500 mt-1">
            Data-driven night scheduling based on historic 30-day day-of-week trends.
          </p>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
          <Clock size={16} className="text-blue-500" />
          <span>Tonight: <strong className="text-gray-900">{currentDay}</strong></span>
        </div>
      </motion.div>

      {/* ===== TOP METRICS ROW ===== */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
        {/* Card 1: Storage Efficiency */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Warehouse Space Saved</p>
              <p className="text-xl font-bold text-gray-900">{Math.round(storageEfficiency)}%</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${storageEfficiency}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-indigo-400 to-blue-500 rounded-full"
            />
          </div>
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
            <TrendingUp size={12} /> +12% vs last week
          </p>
        </div>

        {/* Card 2: Tonight's Setup */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Package size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Tonight's Setup</p>
              <p className="text-xl font-bold text-gray-900">{tonightUnits} units</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span>Batches: {Math.ceil(tonightUnits / 12)}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Forecasted demand for tomorrow</span>
          </div>
        </div>

        {/* Card 3: Predicted Waste Risk */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Predicted Waste Risk</p>
              <p className="text-xl font-bold text-emerald-600">0%</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <CheckCircle size={12} className="text-emerald-500" /> JIT scheduling eliminates overproduction
          </p>
        </div>
      </motion.div>

      {/* ===== TONIGHT'S PRODUCTION ACTION PLAN ===== */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Tonight's Production Action Plan</h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
            {products.filter((p) => p.forecast > p.stock).length} products need action
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {products.map((product) => {
            const deficit = product.forecast - product.stock;
            const isLow = deficit > 0;
            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -2 }}
                className={`relative bg-white rounded-2xl border p-5 shadow-sm transition-shadow duration-200 ${
                  isLow
                    ? 'border-amber-200 ring-1 ring-amber-200/50'
                    : 'border-gray-100'
                }`}
              >
                {isLow && (
                  <div className="absolute -top-1 -right-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                      <Zap size={12} className="text-amber-600" />
                      Action Needed
                    </span>
                  </div>
                )}
                <h3 className="text-sm font-medium text-gray-800">{product.name}</h3>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Stock</span>
                    <span className="font-medium text-gray-900">{product.stock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tomorrow's Forecast</span>
                    <span className="font-medium text-blue-600">{product.forecast}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  {isLow ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-medium border border-amber-200/50"
                    >
                      <Package size={14} />
                      Produce {deficit} Units Tonight
                    </motion.div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 text-xs font-medium">
                      <CheckCircle size={14} />
                      Sufficient Stock ✅
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ===== WEEKLY JIT PRODUCTION SCHEDULER (COLUMN CHART) ===== */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Weekly JIT Production Scheduler</h2>
            <p className="text-xs text-gray-400 mt-0.5">Nightly production targets based on next-day demand</p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-indigo-500" />
              Normal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-orange-500" />
              Peak (&gt;60 units)
            </span>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              domain={[0, 'dataMax + 10']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
            />
            <Bar dataKey="units" name="Units to Produce" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.isPeak ? '#f97316' : '#6366f1'}
                  fillOpacity={entry.night === currentDay ? 1 : 0.85}
                  stroke={entry.night === currentDay ? '#2563eb' : 'transparent'}
                  strokeWidth={entry.night === currentDay ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Optional: small note about tonight's bar */}
        <div className="mt-3 text-xs text-gray-400 flex items-center justify-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500" />
          <span>Highlighted bar = Tonight's production</span>
        </div>
      </motion.div>

      {/* ===== QUICK INSIGHTS / AI RECOMMENDATION ===== */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100/50 p-5 flex items-start gap-4"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
          <Sparkles size={18} className="text-indigo-700" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800">AI Recommendation</h3>
          <p className="text-sm text-gray-600 mt-0.5">
            <strong>Thursday night</strong> requires the highest production capacity to fulfill Friday's peak demand. Ensure raw materials / empty bottles are staged by Thursday afternoon.
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs text-indigo-700">
            <BarChart3 size={14} />
            <span>Forecast accuracy: 94% based on 30-day trend</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}