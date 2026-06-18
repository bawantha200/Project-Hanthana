import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Package,
  CheckCircle,
  Zap,
  Clock,
  X,
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
import api from '../services/api';

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

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-sm">
        <p className="font-medium text-gray-900">{data.day}'s Orders</p>
        <p className="mt-1 text-indigo-600 font-bold">{data.units} units</p>
        {data.units > 60 && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Peak Day
          </span>
        )}
        <p className="mt-1 text-xs text-gray-400">Click bar to see product breakdown</p>
      </div>
    );
  }
  return null;
};

export default function JITDashboard({ products = [] }) {
  const [currentDay, setCurrentDay] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [productDeficits, setProductDeficits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // For drill-down
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDayProducts, setSelectedDayProducts] = useState([]);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [productDailyData, setProductDailyData] = useState({});

  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const capacity = 1000;
  const storageEfficiency = Math.max(0, Math.min(100, ((capacity - totalStock) / capacity) * 100));

  useEffect(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    setCurrentDay(days[today]);

    const loadForecasts = async () => {
      try {
        setLoading(true);
        if (!products.length) {
          setWeeklySchedule([]);
          setProductDeficits([]);
          setProductDailyData({});
          setError(null);
          return;
        }

        const forecastPromises = products.map(p =>
          api.get(`/forecast/next-week/${p.id}`)
            .then(res => res.data.forecast)
            .catch(err => {
              console.error(`❌ Failed to fetch forecast for product ${p.id}:`, err);
              return null;
            })
        );

        const results = await Promise.all(forecastPromises);

        // Build per‑product daily data
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const perProductData = {};
        const dailyTotals = {};

        results.forEach((forecast, idx) => {
          if (!forecast) return;
          const product = products[idx];
          forecast.forEach(day => {
            const dayName = day.day;
            if (!perProductData[dayName]) perProductData[dayName] = [];
            perProductData[dayName].push({
              productName: product.name,
              forecast: day.overall || 0,
              productId: product.id,
            });
            dailyTotals[dayName] = (dailyTotals[dayName] || 0) + (day.overall || 0);
          });
        });

        setProductDailyData(perProductData);

        // Build weekly schedule
        const schedule = dayNames.map(day => ({
          day,
          units: dailyTotals[day] || 0,
        }));
        setWeeklySchedule(schedule);

        // Compute per‑product deficit (tomorrow's forecast - stock)
        const productWithForecast = products.map((p, idx) => {
          const forecast = results[idx];
          let tomorrowForecast = 0;
          if (forecast && forecast.length > 0) {
            tomorrowForecast = forecast[0].overall || 0;
          }
          if (tomorrowForecast === 0 && forecast && forecast.length > 0) {
            const total = forecast.reduce((sum, d) => sum + (d.overall || 0), 0);
            tomorrowForecast = Math.round(total / forecast.length);
          }
          return { ...p, forecast: tomorrowForecast };
        });

        const deficits = productWithForecast.map(p => ({
          ...p,
          deficit: (p.forecast || 0) - (p.stock || 0),
        }));
        setProductDeficits(deficits);

        setError(null);
      } catch (err) {
        setError(err.message || 'Failed to load forecast data');
        console.error('Error loading forecasts:', err);
      } finally {
        setLoading(false);
      }
    };

    loadForecasts();
  }, [products]);

  // --- Rotate schedule so today is first (for chart) ---
  const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentIdx = weeklySchedule.findIndex(item => item.day === currentDay);
  let rotatedSchedule = [...weeklySchedule];
  if (currentIdx > 0) {
    rotatedSchedule = [
      ...weeklySchedule.slice(currentIdx),
      ...weeklySchedule.slice(0, currentIdx)
    ];
  } else if (currentIdx === -1 && weeklySchedule.length > 0) {
    rotatedSchedule = [...weeklySchedule];
  }

  const chartData = rotatedSchedule.map(item => ({
    ...item,
    isPeak: item.units > 60,
    label: item.day.slice(0, 3),
  }));

  const allZero = chartData.length > 0 && chartData.every(item => item.units === 0);

  // --- Scheduled Production = tomorrow's forecast ---
  const todayIndex = dayOrder.indexOf(currentDay);
  const tomorrowDayName = dayOrder[(todayIndex + 1) % 7];
  const tomorrowSchedule = weeklySchedule.find(s => s.day === tomorrowDayName);
  const tomorrowUnits = tomorrowSchedule ? tomorrowSchedule.units : 0;

  // Compute weekly product totals (for quick summary)
  const weeklyProductTotals = Object.keys(productDailyData).reduce((acc, day) => {
    productDailyData[day].forEach(p => {
      if (!acc[p.productId]) {
        acc[p.productId] = { name: p.productName, total: 0 };
      }
      acc[p.productId].total += p.forecast;
    });
    return acc;
  }, {});

  const weeklyTotalsArray = Object.values(weeklyProductTotals).sort((a, b) => b.total - a.total);

  // Build product-day matrix for detailed weekly view
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const productDayMatrix = {};
  const productNames = {};

  Object.keys(productDailyData).forEach(day => {
    productDailyData[day].forEach(item => {
      const pid = item.productId;
      if (!productDayMatrix[pid]) {
        productDayMatrix[pid] = {};
        productNames[pid] = item.productName;
      }
      productDayMatrix[pid][day] = item.forecast;
    });
  });

  // For each product, compute total across all days
  const productDayTotals = Object.keys(productDayMatrix).map(pid => {
    const days = productDayMatrix[pid];
    const total = Object.values(days).reduce((sum, v) => sum + v, 0);
    return { productId: pid, productName: productNames[pid], days, total };
  });

  // Sort by total descending
  productDayTotals.sort((a, b) => b.total - a.total);

  // Rotate day names for the weekly modal (starting from today)
  const rotatedDayNames = [];
  for (let i = 0; i < 7; i++) {
    rotatedDayNames.push(dayOrder[(todayIndex + i) % 7]);
  }

  // Handle bar click for daily breakdown
  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length) {
      const day = data.activePayload[0].payload.day;
      const productsForDay = productDailyData[day] || [];
      setSelectedDay(day);
      setSelectedDayProducts(productsForDay);
      setShowDailyModal(true);
    }
  };

  // Open weekly modal
  const openWeeklyModal = () => {
    setShowWeeklyModal(true);
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Loading production dashboard...</div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">Error: {error}</div>;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">JIT Production & Demand Forecasting</h1>
          <p className="text-sm text-gray-500 mt-1">
            Data-driven scheduling based on historic 30‑day day‑of‑week trends.
          </p>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
          <Clock size={16} className="text-blue-500" />
          <span>Today: <strong className="text-gray-900">{currentDay}</strong></span>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-3 gap-5"
      >
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

        {/* Scheduled Production Card – clickable -> shows tomorrow's production */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer"
          onClick={openWeeklyModal}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Package size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Scheduled Production</p>
              <p className="text-xl font-bold text-gray-900">{tomorrowUnits} units</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
            <span>Batches: {Math.ceil(tomorrowUnits / 12)}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <span>Production target for tonight</span>
          </div>
          <div className="mt-2 text-xs text-indigo-600 flex items-center gap-1">
            <span>Click for weekly breakdown</span>
          </div>
        </div>

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
            <CheckCircle size={12} className="text-emerald-500" /> JIT eliminates overproduction
          </p>
        </div>
      </motion.div>

      {/* Action Plan */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">Today's Production Action Plan</h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
            {productDeficits.filter(p => p.deficit > 0).length} products need action
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {productDeficits.slice(0, 4).map((product) => {
            const deficit = product.deficit;
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
                    <span className="font-medium text-gray-900">{product.stock || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tomorrow's Forecast</span>
                    <span className="font-medium text-blue-600">{product.forecast || 0}</span>
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
                      Produce {deficit} Units Today
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

      {/* Chart */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Weekly Production Scheduler</h2>
            <p className="text-xs text-gray-400 mt-0.5">Click any bar to see product breakdown</p>
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

        {chartData.length > 0 ? (
          allZero ? (
            <div className="text-center py-8 text-gray-400">
              No sales data available for forecasting. Start making sales to see predictions.
            </div>
          ) : (
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
                <Bar
                  dataKey="units"
                  name="Units to Produce"
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isPeak ? '#f97316' : '#6366f1'}
                      fillOpacity={entry.day === currentDay ? 1 : 0.85}
                      stroke={entry.day === currentDay ? '#2563eb' : 'transparent'}
                      strokeWidth={entry.day === currentDay ? 2 : 0}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          <div className="text-center py-8 text-gray-400">No forecast data available</div>
        )}

        <div className="mt-3 text-xs text-gray-400 flex items-center justify-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500" />
          <span>Highlighted bar = Today's scheduled production</span>
        </div>
      </motion.div>

      {/* Daily Breakdown Modal */}
      <AnimatePresence>
        {showDailyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowDailyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">{selectedDay}'s Production Breakdown</h3>
                <button
                  onClick={() => setShowDailyModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              {selectedDayProducts.length > 0 ? (
                <div className="space-y-3">
                  {selectedDayProducts.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-800">{item.productName}</span>
                      <span className="text-sm font-semibold text-indigo-600">{item.forecast} units</span>
                    </div>
                  ))}
                  <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between font-bold">
                    <span>Total</span>
                    <span className="text-indigo-700">
                      {selectedDayProducts.reduce((sum, p) => sum + p.forecast, 0)} units
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No products needed on this day.</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weekly Summary Modal with day-by-day breakdown (rotated from today) */}
      <AnimatePresence>
        {showWeeklyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowWeeklyModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Weekly Production Plan (Starting {currentDay})</h3>
                <button
                  onClick={() => setShowWeeklyModal(false)}
                  className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {productDayTotals.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-2 px-3 font-semibold text-gray-600 sticky left-0 bg-gray-50">Product</th>
                        {rotatedDayNames.map(day => (
                          <th
                            key={day}
                            className={`text-center py-2 px-3 font-semibold ${
                              day === currentDay ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
                            }`}
                          >
                            {day.slice(0, 3)}
                          </th>
                        ))}
                        <th className="text-center py-2 px-3 font-semibold text-indigo-700 bg-indigo-50">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productDayTotals.map((row) => (
                        <tr key={row.productId} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                          <td className="py-2 px-3 font-medium text-gray-800 sticky left-0 bg-white">{row.productName}</td>
                          {rotatedDayNames.map(day => (
                            <td key={day} className="text-center py-2 px-3 text-gray-700">
                              {row.days[day] || 0}
                            </td>
                          ))}
                          <td className="text-center py-2 px-3 font-bold text-indigo-700 bg-indigo-50/50">
                            {row.total}
                          </td>
                        </tr>
                      ))}
                      {/* Grand total row */}
                      <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                        <td className="py-2 px-3 font-bold text-gray-800 sticky left-0 bg-gray-50">Grand Total</td>
                        {rotatedDayNames.map(day => {
                          const total = productDayTotals.reduce((sum, row) => sum + (row.days[day] || 0), 0);
                          return (
                            <td key={day} className="text-center py-2 px-3 font-bold text-gray-800">
                              {total}
                            </td>
                          );
                        })}
                        <td className="text-center py-2 px-3 font-bold text-indigo-800 bg-indigo-50">
                          {productDayTotals.reduce((sum, row) => sum + row.total, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No products needed this week.</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}