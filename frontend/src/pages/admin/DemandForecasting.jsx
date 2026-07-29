import { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Droplets,
  Waves,
  Activity,
  TrendingUp,
  AlertTriangle,
  PackageCheck,
  Play,
  UploadCloud,
  X,
  Loader2,
  Package,
  Cog,
  Calendar,
  ChevronDown,
  Filter,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import {
  fetchProducts,
  calculateAndSaveDailyForecast,
  get7DayFutureDemandAllProducts,
  getHistoricalVsPredicted,
  seedHistoricalForecastsFromCSV,
  parseCsv,
  getProductStock,
  getStockLevels,
} from '../../lib/forecastService';

// ─── Query Keys ───
const QUERY_KEYS = {
  PRODUCTS: ['forecast', 'products'],
  FUTURE_DEMAND: ['forecast', 'futureDemand'],
  CHART_DATA: (productId) => ['forecast', 'chart', productId],
  STOCK_DATA: ['forecast', 'stock'],
};

// ─── Constants ───
const TYPE_STYLES = {
  SEALED: {
    label: 'Sealed',
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-500',
  },
  REFILL: {
    label: 'Refill',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
};

// ─── Helper Functions ───
function fmtDate(d) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function recommendedBatch(predicted) {
  if (predicted <= 0) return 0;
  if (predicted <= 20) return Math.ceil(predicted * 1.2);
  if (predicted <= 50) return Math.ceil(predicted * 1.15);
  return Math.ceil(predicted * 1.1);
}

// ─── KPI Card Component ───
function KpiCard({ icon, label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-md transition">
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 rounded-xl bg-gradient-to-br ${accent} text-white shadow`}
        >
          {icon}
        </div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </span>
      </div>
      <div className="text-xl font-bold text-slate-800 truncate">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

// ─── Main Component ───
export default function DemandForecasting() {
  const queryClient = useQueryClient();

  // ─── State ───
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [productionFilter, setProductionFilter] = useState('ALL');
  const [productionTypeFilter, setProductionTypeFilter] = useState('ALL');
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvStatus, setCsvStatus] = useState(null);

  // ─── React Query: Fetch Products ───
  const {
    data: products = [],
    isLoading: productsLoading,
    isFetching: productsFetching,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: QUERY_KEYS.PRODUCTS,
    queryFn: () => fetchProducts(typeFilter),
    staleTime: 120000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchInterval: 300000,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Future Demand ───
  const {
    data: futureDemand = [],
    isLoading: futureLoading,
    isFetching: futureFetching,
    error: futureError,
    refetch: refetchFuture,
  } = useQuery({
    queryKey: QUERY_KEYS.FUTURE_DEMAND,
    queryFn: get7DayFutureDemandAllProducts,
    staleTime: 60000,
    gcTime: 180000,
    refetchOnWindowFocus: false,
    refetchInterval: 120000,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Chart Data ───
  const {
    data: chartData = [],
    isLoading: chartLoading,
    error: chartError,
    refetch: refetchChart,
  } = useQuery({
    queryKey: QUERY_KEYS.CHART_DATA(selectedProductId),
    queryFn: () => getHistoricalVsPredicted(selectedProductId, 30),
    enabled: !!selectedProductId,
    staleTime: 60000,
    gcTime: 180000,
    refetchOnWindowFocus: false,
    refetchInterval: 120000,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Stock Data ───
  const {
    data: stockData = [],
    isLoading: stockLoading,
    isFetching: stockFetching,
    error: stockError,
    refetch: refetchStock,
  } = useQuery({
    queryKey: QUERY_KEYS.STOCK_DATA,
    queryFn: getProductStock,
    staleTime: 60000,
    gcTime: 180000,
    refetchOnWindowFocus: false,
    refetchInterval: 120000,
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Run Prediction Mutation ───
  const runPredictionMutation = useMutation({
    mutationFn: calculateAndSaveDailyForecast,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FUTURE_DEMAND });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHART_DATA(selectedProductId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.STOCK_DATA });
      toast.success('Prediction completed successfully!');
    },
    onError: (error) => {
      toast.error(error.message || 'Prediction failed');
    },
  });

  // ─── React Query: CSV Upload Mutation ───
  const csvUploadMutation = useMutation({
    mutationFn: async (csvText) => {
      const rows = parseCsv(csvText);
      if (!rows.length) throw new Error('No rows found in CSV');
      return await seedHistoricalForecastsFromCSV(rows);
    },
    onSuccess: (count) => {
      setCsvStatus({ state: 'success', message: `Uploaded ${count} rows successfully.` });
      setCsvText('');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PRODUCTS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.FUTURE_DEMAND });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CHART_DATA(selectedProductId) });
      toast.success(`${count} rows uploaded successfully!`);
    },
    onError: (error) => {
      setCsvStatus({ state: 'error', message: error.message || 'Upload failed' });
      toast.error(error.message || 'Upload failed');
    },
  });

  // ─── Handlers ───
  const handleTypeFilter = useCallback(async (filter) => {
    setTypeFilter(filter);
    setSelectedProductId(null);
    await refetchProducts();
    if (products.length) {
      setSelectedProductId(products[0]?.id);
    }
  }, [refetchProducts, products]);

  const handleSelectProduct = useCallback((id) => {
    setSelectedProductId(id);
    if (id) {
      refetchChart();
    }
  }, [refetchChart]);

  const handleRunPrediction = useCallback(() => {
    runPredictionMutation.mutate();
  }, [runPredictionMutation]);

  const handleRefreshAll = useCallback(() => {
    refetchProducts();
    refetchFuture();
    refetchStock();
    if (selectedProductId) {
      refetchChart();
    }
  }, [refetchProducts, refetchFuture, refetchStock, refetchChart, selectedProductId]);

  const handleCsvUpload = useCallback(() => {
    setCsvStatus({ state: 'working', message: 'Parsing and uploading...' });
    csvUploadMutation.mutate(csvText);
  }, [csvText, csvUploadMutation]);

  // ─── Memoized Computations ───
  const kpis = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayRows = futureDemand.filter((f) => f.forecast_date === todayStr);
    const total7 = futureDemand.reduce((sum, f) => sum + (f.predicted_demand || 0), 0);
    const todayPredicted = todayRows.reduce((s, f) => s + (f.predicted_demand || 0), 0);
    const todayActual = todayRows.reduce((s, f) => s + (f.actual_sales || 0), 0);

    const perProduct = new Map();
    futureDemand.forEach((f) => {
      const productData = f.product || f.products;
      const cur = perProduct.get(f.product_id) || { 
        id: f.product_id, 
        name: productData?.name, 
        total: 0 
      };
      cur.total += f.predicted_demand || 0;
      perProduct.set(f.product_id, cur);
    });
    const top = [...perProduct.values()].sort((a, b) => b.total - a.total)[0] || null;

    const totalStockValue = stockData.reduce((sum, item) => sum + (item.current_stock || 0), 0);
    const stockAlertStatus = stockData.some(item => 
      item.current_stock <= item.reorder_level
    );

    return { 
      total7, 
      todayPredicted, 
      todayActual, 
      top, 
      stockAlert: stockAlertStatus, 
      assumedStock: totalStockValue || 500
    };
  }, [futureDemand, stockData]);

  const productionRows = useMemo(() => {
    return futureDemand
      .filter((f) => {
        const hasProduct = f.product || f.products;
        if (!hasProduct) {
          console.warn('⚠️ Missing product for forecast:', f);
          return false;
        }
        return true;
      })
      .map((f) => {
        const productData = f.product || f.products;
        return {
          id: `${f.product_id}-${f.forecast_date}`,
          productId: f.product_id,
          name: productData?.name || 'Unknown Product',
          type: productData?.type || 'SEALED',
          date: f.forecast_date,
          predicted: f.predicted_demand || 0,
          batch: recommendedBatch(f.predicted_demand || 0),
        };
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.name.localeCompare(b.name)));
  }, [futureDemand]);

  const filteredProductionRows = useMemo(() => {
    let filtered = productionRows;
    
    if (productionFilter !== 'ALL') {
      filtered = filtered.filter(row => row.productId === parseInt(productionFilter));
    }
    
    if (productionTypeFilter !== 'ALL') {
      filtered = filtered.filter(row => row.type === productionTypeFilter);
    }
    
    return filtered;
  }, [productionRows, productionFilter, productionTypeFilter]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || null;

  const isLoading = productsLoading || futureLoading || stockLoading;
  const isRefreshing = productsFetching || futureFetching || stockFetching;
  const isRunning = runPredictionMutation.isPending;
  const isUploading = csvUploadMutation.isPending;

  // ─── Loading State ───
  if (isLoading && products.length === 0 && futureDemand.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading forecasting data...</p>
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (productsError || futureError || stockError) {
    const error = productsError || futureError || stockError;
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700 max-w-2xl mx-auto">
          <h3 className="font-semibold text-lg mb-2">Error Loading Data</h3>
          <p>{error.message || 'Failed to load data'}</p>
          <button
            onClick={handleRefreshAll}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 text-slate-800">
      {/* ─── Header ─── */}
      <header className="relative overflow-hidden bg-gradient-to-r from-cyan-700 via-blue-700 to-slate-800 text-white">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <Waves className="absolute -top-10 -right-10 w-72 h-72 text-cyan-200" />
          <Droplets className="absolute bottom-0 left-1/3 w-40 h-40 text-white" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur">
                <Droplets className="w-7 h-7 text-cyan-100" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Water Demand Forecasting &amp; Stock Planning
              </h1>
            </div>
            <p className="text-cyan-100 text-sm sm:text-base max-w-2xl">
              Predictive Analytics for Bottled &amp; Refill Water Production
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRefreshAll}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/20 text-white font-semibold border border-white/30 hover:bg-white/30 transition disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={handleRunPrediction}
              disabled={isRunning}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-blue-700 font-semibold shadow-lg hover:bg-cyan-50 transition disabled:opacity-60"
            >
              {isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Run Prediction Now
            </button>
            <button
              onClick={() => {
                setShowCsvModal(true);
                setCsvStatus(null);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 text-white font-semibold border border-cyan-200/40 hover:bg-cyan-500/30 transition"
            >
              <UploadCloud className="w-4 h-4" />
              Upload CSV Past Data
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ─── Error Display ─── */}
        {productsError && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{productsError.message}</span>
            <button 
              onClick={() => refetchProducts()} 
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── KPI Cards ─── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Next 7 Days Total Demand"
            value={`${kpis.total7} units`}
            accent="from-cyan-500 to-blue-500"
            sub="Across all water products"
          />
          <KpiCard
            icon={<Activity className="w-5 h-5" />}
            label="Today: Predicted vs Actual"
            value={`${kpis.todayActual} / ${kpis.todayPredicted}`}
            accent="from-teal-500 to-cyan-500"
            sub={`Variance: ${kpis.todayPredicted - kpis.todayActual} units`}
          />
          <KpiCard
            icon={<PackageCheck className="w-5 h-5" />}
            label="Top Selling Water Product"
            value={kpis.top ? kpis.top.name : '—'}
            accent="from-blue-500 to-indigo-500"
            sub={kpis.top ? `${kpis.top.total} units predicted (7d)` : 'No data yet'}
          />
          <KpiCard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Stock Alert Status"
            value={kpis.stockAlert ? 'Low Stock' : 'Sufficient'}
            accent={kpis.stockAlert ? 'from-amber-500 to-red-500' : 'from-emerald-500 to-teal-500'}
            sub={`Current stock: ${kpis.assumedStock} units`}
          />
        </section>

        {/* ─── Filters ─── */}
        <section className="flex flex-col md:flex-row md:items-end gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              <Filter className="w-3.5 h-3.5 inline mr-1" />
              Water Type
            </label>
            <div className="inline-flex rounded-xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              {['ALL', 'SEALED', 'REFILL'].map((t) => (
                <button
                  key={t}
                  onClick={() => handleTypeFilter(t)}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    typeFilter === t
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t === 'ALL' ? 'All' : t === 'SEALED' ? 'Sealed' : 'Refill'}
                </button>
              ))}
            </div>
          </div>
          <div className="md:ml-auto md:w-80">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              <Package className="w-3.5 h-3.5 inline mr-1" />
              Product for Chart Analysis
            </label>
            <div className="relative">
              <select
                value={selectedProductId || ''}
                onChange={(e) => handleSelectProduct(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-10 text-sm font-medium text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {products.length === 0 && <option value="">No products</option>}
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* ─── Chart ─── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-600" />
                Predicted Demand vs Actual Sales
              </h2>
              <p className="text-sm text-slate-500">
                {selectedProduct ? selectedProduct.name : 'Select a product'} · last 30 days
                {chartLoading && ' (loading...)'}
              </p>
            </div>
          </div>
          <div className="h-80 w-full">
            {chartLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No forecast data available for this product.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDate}
                    stroke="#64748b"
                    fontSize={12}
                    tickMargin={8}
                  />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(l) => fmtDate(l)}
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid #e2e8f0',
                      fontSize: 13,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 13 }} />
                  <Line
                    type="monotone"
                    dataKey="predicted"
                    name="Predicted Demand"
                    stroke="#0004ff"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#fcfcfc' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Actual Sales"
                    stroke="#14b8a6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#fcfcfc' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ─── Production Plan Table ─── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cog className="w-5 h-5 text-cyan-600" />
              <h2 className="text-lg font-semibold text-slate-800">7-Day Future Production Plan</h2>
              {futureFetching && (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={productionFilter}
                onChange={(e) => setProductionFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="ALL">All Products</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              
              <select
                value={productionTypeFilter}
                onChange={(e) => setProductionTypeFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="ALL">All Types</option>
                <option value="SEALED">Sealed</option>
                <option value="REFILL">Refill</option>
              </select>
              
              {(productionFilter !== 'ALL' || productionTypeFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setProductionFilter('ALL');
                    setProductionTypeFilter('ALL');
                  }}
                  className="text-xs text-cyan-600 hover:text-cyan-800 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold">Product Name</th>
                  <th className="px-5 py-3 text-left font-semibold">Water Type</th>
                  <th className="px-5 py-3 text-left font-semibold">Date</th>
                  <th className="px-5 py-3 text-right font-semibold">Predicted Quantity</th>
                  <th className="px-5 py-3 text-right font-semibold">Recommended Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProductionRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-slate-400">
                      {futureDemand.length > 0 
                        ? 'No data matching the selected filters.' 
                        : 'No upcoming demand data. Run a prediction to populate the plan.'}
                    </td>
                  </tr>
                )}
                {filteredProductionRows.map((row) => {
                  const style = TYPE_STYLES[row.type] || TYPE_STYLES.SEALED;
                  return (
                    <tr key={row.id} className="hover:bg-cyan-50/40 transition">
                      <td className="px-5 py-3 font-medium text-slate-700">{row.name}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badge}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {fmtDate(row.date)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-800">
                        {row.predicted}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-cyan-700">
                        {row.batch}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ─── CSV Modal ─── */}
      {showCsvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-cyan-600" />
                Upload CSV Past Data
              </h3>
              <button
                onClick={() => setShowCsvModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-slate-500">
                Paste CSV rows with columns:{' '}
                <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                  product_id, forecast_date, predicted_demand, actual_sales, algorithm_used
                </code>
              </p>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                rows={8}
                placeholder="product_id,forecast_date,predicted_demand,actual_sales,algorithm_used
2,2026-06-01,120,118,SMA_3M_DAILY"
                className="w-full rounded-xl border border-slate-200 p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {csvStatus && (
                <div
                  className={`text-sm px-3 py-2 rounded-lg ${
                    csvStatus.state === 'success'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : csvStatus.state === 'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                  }`}
                >
                  {csvStatus.state === 'working' && (
                    <Loader2 className="w-4 h-4 inline animate-spin mr-2" />
                  )}
                  {csvStatus.message}
                </div>
              )}
            </div>
            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCsvModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCsvUpload}
                disabled={!csvText.trim() || isUploading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm font-semibold hover:bg-cyan-700 disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UploadCloud className="w-4 h-4" />
                )}
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}