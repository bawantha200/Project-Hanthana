import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ChevronDown,
  BarChart3,
  History,
  Zap,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ErrorBar,
} from 'recharts';
import api, { stockAPI } from '../../services/api';

// Normalizes whatever shape the products endpoint returns (raw array,
// { data: [...] }, or { products: [...] }) into a plain array.
function normalizeProductsResponse(res) {
  const payload = res?.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.products)) return payload.products;
  console.warn('[DemandForecastDashboard] Unexpected products response shape:', payload);
  return [];
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function formatShortDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function ForecastTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-sm">
        <p className="font-medium text-gray-900">{data.weekday}</p>
        <p className="text-xs text-gray-400">{data.dateLabel}</p>
        <p className="mt-1 text-indigo-600 font-bold">{data.predictedDemand} units predicted</p>
        {(data.low !== undefined && data.high !== undefined) && (
          <p className="text-xs text-gray-400 mt-0.5">Range: {data.low}–{data.high} units</p>
        )}
        {data.isWeekend && (
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            Weekend pattern
          </span>
        )}
        {data.source === 'generated' && (
          <span className="inline-block mt-1 ml-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            Freshly calculated
          </span>
        )}
      </div>
    );
  }
  return null;
}

function HistoryTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-xl shadow-lg border border-gray-100 text-sm">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="mt-0.5" style={{ color: entry.color }}>
            {entry.name}: <span className="font-semibold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function DemandForecastDashboard({ products: productsProp = null }) {
  const [products, setProducts] = useState(productsProp || []);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [historyData, setHistoryData] = useState(null);

  const [loadingProducts, setLoadingProducts] = useState(!productsProp);
  const [loadingForecast, setLoadingForecast] = useState(false);
  const [manualTriggerLoading, setManualTriggerLoading] = useState(false);
  const [triggerMessage, setTriggerMessage] = useState(null);
  const [error, setError] = useState(null);

  // Load products list if not provided as a prop
  useEffect(() => {
    if (Array.isArray(productsProp) && productsProp.length) {
      setProducts(productsProp);
      setLoadingProducts(false);
      return;
    }

    const loadProducts = async () => {
      try {
        setLoadingProducts(true);
        console.log('[DemandForecastDashboard] Fetching product list from /stock/products...');
        const res = await stockAPI.getProducts();
        const list = normalizeProductsResponse(res);
        setProducts(list);
        console.log(`[DemandForecastDashboard] Loaded ${list.length} product(s)`);
      } catch (err) {
        console.error('[DemandForecastDashboard] Failed to load products:', err);
        setError('Failed to load products');
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [productsProp]);

  // Default to the first product once the list is available
  useEffect(() => {
    if (!selectedProductId && Array.isArray(products) && products.length) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  const loadForecastAndHistory = useCallback(async (productId) => {
    if (!productId) return;

    try {
      setLoadingForecast(true);
      setError(null);
      console.log(`[DemandForecastDashboard] Loading forecast + history for product ${productId}`);

      const [forecastRes, historyRes] = await Promise.all([
        api.get(`/forecast/7-day/${productId}`),
        api.get(`/forecast/history/${productId}`, { params: { days: 30 } }),
      ]);

      setForecastData(forecastRes.data?.data || null);
      setHistoryData(historyRes.data?.data || null);
    } catch (err) {
      console.error('[DemandForecastDashboard] Failed to load forecast/history:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load forecast data');
      setForecastData(null);
      setHistoryData(null);
    } finally {
      setLoadingForecast(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadForecastAndHistory(selectedProductId);
    }
  }, [selectedProductId, loadForecastAndHistory]);

  const handleManualTrigger = async () => {
    try {
      setManualTriggerLoading(true);
      setTriggerMessage(null);
      console.log('[DemandForecastDashboard] Triggering manual forecast run...');

      const res = await api.post('/forecast/trigger');
      const summary = res.data?.summary;

      setTriggerMessage({
        type: 'success',
        text: res.data?.message || 'Forecast run completed',
        successCount: summary?.success?.length ?? 0,
        failedCount: summary?.failed?.length ?? 0,
      });

      console.log('[DemandForecastDashboard] Manual forecast run complete:', summary);

      // Refresh the currently selected product's data to reflect the new run
      if (selectedProductId) {
        await loadForecastAndHistory(selectedProductId);
      }
    } catch (err) {
      console.error('[DemandForecastDashboard] Manual trigger failed:', err);
      setTriggerMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Failed to trigger forecast run',
      });
    } finally {
      setManualTriggerLoading(false);
    }
  };

  const selectedProduct = Array.isArray(products)
    ? products.find((p) => p.id === selectedProductId)
    : undefined;
  const currentStock = selectedProduct?.stock ?? 0;

  const totalPredicted = forecastData?.totalPredicted ?? 0;
  const dailyAverage = forecastData?.dailyAverage ?? 0;
  const needsReorder = currentStock < totalPredicted;

  const chartData = (forecastData?.forecast || []).map((day, idx) => {
    const isWeekend = day.weekday === 'Saturday' || day.weekday === 'Sunday';
    const low = day.low ?? day.predictedDemand;
    const high = day.high ?? day.predictedDemand;
    return {
      dayLabel: day.weekday ? day.weekday.slice(0, 3) : `Day ${idx + 1}`,
      weekday: day.weekday || `Day ${idx + 1}`,
      dateLabel: formatShortDate(day.date),
      predictedDemand: day.predictedDemand,
      low,
      high,
      // Recharts ErrorBar expects [lowerDelta, upperDelta] relative to the bar value
      range: [day.predictedDemand - low, high - day.predictedDemand],
      isWeekend,
      isTomorrow: idx === 0,
      source: day.source,
    };
  });

  const historyChartData = (historyData?.history || []).map((row) => ({
    dateLabel: formatShortDate(row.date),
    predictedDemand: row.predictedDemand,
    actualSales: row.actualSales,
  }));

  if (loadingProducts) {
    return <div className="text-center py-8 text-gray-500">Loading demand forecast dashboard...</div>;
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demand Forecast Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Day-of-week aware forecasting (separate Mon–Sun averages), recalculated every midnight.
          </p>
        </div>

        <button
          onClick={handleManualTrigger}
          disabled={manualTriggerLoading}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-sm transition-colors ${
            manualTriggerLoading
              ? 'bg-indigo-300 text-white cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <RefreshCw size={16} className={manualTriggerLoading ? 'animate-spin' : ''} />
          {manualTriggerLoading ? 'Running Forecast...' : 'Run Manual Forecast Now'}
        </button>
      </motion.div>

      {/* Trigger result banner */}
      <AnimatePresence>
        {triggerMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-xl border p-3 text-sm flex items-center gap-2 ${
              triggerMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {triggerMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>
              {triggerMessage.text}
              {triggerMessage.type === 'success' &&
                ` (${triggerMessage.successCount} succeeded, ${triggerMessage.failedCount} failed)`}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Selector */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <label className="text-xs font-medium text-gray-500 mb-2 block">Select Product</label>
        <div className="relative max-w-sm">
          <select
            value={selectedProductId || ''}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full appearance-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {Array.isArray(products) &&
              products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">Error: {error}</div>
      )}

      {loadingForecast ? (
        <div className="text-center py-8 text-gray-500">Loading forecast for {selectedProduct?.name || 'product'}...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <TrendingUp size={18} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Predicted Demand (Next 7 Days)</p>
                  <p className="text-xl font-bold text-gray-900">{totalPredicted} units</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Algorithm: SMA_3M_DOW (day-of-week aware)</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <BarChart3 size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Daily Average Demand</p>
                  <p className="text-xl font-bold text-gray-900">{dailyAverage} units/day</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Based on last 92 days of completed sales</p>
            </div>

            <div
              className={`rounded-2xl shadow-sm border p-5 hover:shadow-md transition-shadow duration-200 ${
                needsReorder ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    needsReorder ? 'bg-amber-100' : 'bg-emerald-50'
                  }`}
                >
                  <Package size={18} className={needsReorder ? 'text-amber-600' : 'text-emerald-600'} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Current Inventory Stock</p>
                  <p className="text-xl font-bold text-gray-900">{currentStock} units</p>
                </div>
              </div>
              <div className="mt-3">
                {needsReorder ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                    <Zap size={12} /> Reorder Recommended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                    <CheckCircle size={12} /> Stock Sufficient
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* 7-Day Forecast Chart */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">7-Day Future Forecast</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Predicted units to sell, starting tomorrow — each day uses its own weekday average, not a flat daily figure
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-indigo-500" />
                  Weekday
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-amber-500" />
                  Weekend
                </span>
              </div>
            </div>

            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="dayLabel" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ForecastTooltip />} />
                  <Bar dataKey="predictedDemand" name="Predicted Demand" radius={[4, 4, 0, 0]}>
                    <ErrorBar dataKey="range" width={4} strokeWidth={1.5} stroke="#64748b" />
                    {chartData.map((entry, index) => {
                      let fill = '#6366f1';
                      if (entry.isWeekend) fill = '#f59e0b';
                      if (entry.isTomorrow) fill = '#2563eb';
                      return <Cell key={`cell-${index}`} fill={fill} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-400">No forecast data available for this product</div>
            )}

            <div className="mt-3 text-xs text-gray-400 flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-gray-400" />
              <span>Gray bracket = expected range (±20% of weekday average)</span>
            </div>

            {/* Tabular view */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-3 font-semibold text-gray-500">Day</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-500">Date</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-500">Expected Range</th>
                    <th className="text-right py-2 px-3 font-semibold text-gray-500">Predicted Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((row, idx) => (
                    <tr
                      key={row.dateLabel}
                      className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${
                        row.isWeekend ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-2 px-3 text-gray-700">
                        <span className="font-medium">{idx === 0 ? 'Tomorrow' : row.weekday}</span>
                        {idx === 0 && <span className="text-gray-400 font-normal"> · {row.weekday}</span>}
                        {row.isWeekend && (
                          <span className="ml-2 inline-block px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium align-middle">
                            Weekend
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-gray-500">{row.dateLabel}</td>
                      <td className="py-2 px-3 text-right text-gray-500">
                        {row.low}–{row.high} units
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-indigo-600">
                        {row.predictedDemand} units
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Historical Accuracy Chart */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center gap-2 mb-5">
              <History size={16} className="text-gray-400" />
              <div>
                <h2 className="text-base font-semibold text-gray-900">Predicted vs Actual (Last 30 Days)</h2>
                <p className="text-xs text-gray-400 mt-0.5">Forecast accuracy over time</p>
              </div>
            </div>

            {historyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={historyChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<HistoryTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                  <Line
                    type="monotone"
                    dataKey="predictedDemand"
                    name="Predicted"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualSales"
                    name="Actual"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-gray-400">No historical data available yet</div>
            )}
          </motion.div>
        </>
      )}
    </motion.div>
  );
}