import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  Package,
  CheckCircle,
  Zap,
  Clock,
  X,
  Calendar,
  Sun,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowLeft,
  RefreshCw,
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
import { inventoryAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

// ─── Query Keys ───
const QUERY_KEYS = {
  PRODUCTS: ['products'],
  FORECAST: (productId) => ['forecast', productId],
  ALL_FORECASTS: ['forecasts'],
};

// ─── Animation Variants ───
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

// ─── Helper Functions ───
const getDateForDayOffset = (offset) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date;
};

const formatDate = (date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ─── Custom Tooltip ───
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

export default function JIT() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ─── State ───
  const [viewOffset, setViewOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedDayProducts, setSelectedDayProducts] = useState([]);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [productDailyData, setProductDailyData] = useState({});

  // ─── React Query: Fetch Products ───
  const {
    data: productsData = [],
    isLoading: productsLoading,
    isFetching: productsFetching,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: QUERY_KEYS.PRODUCTS,
    queryFn: async () => {
      const response = await inventoryAPI.getProductsWithStock();
      return response.data?.products || [];
    },
    staleTime: 120000, // 2 minutes
    gcTime: 600000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 300000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  // ─── React Query: Fetch Forecasts for All Products ───
  const fetchAllForecasts = useCallback(async (products) => {
    if (!products || products.length === 0) return [];

    const forecastPromises = products.map(async (p) => {
      try {
        const response = await fetch(`/api/forecast/next-week/${p.id}`);
        if (!response.ok) throw new Error(`Failed to fetch forecast for product ${p.id}`);
        const data = await response.json();
        return {
          ...data,
          productId: p.id,
          productName: p.name,
        };
      } catch (err) {
        console.error(`Failed to fetch forecast for product ${p.id}:`, err);
        return null;
      }
    });

    const results = await Promise.all(forecastPromises);
    return results.filter(r => r !== null);
  }, []);

  const {
    data: forecastsData = [],
    isLoading: forecastsLoading,
    isFetching: forecastsFetching,
    error: forecastsError,
    refetch: refetchForecasts,
  } = useQuery({
    queryKey: QUERY_KEYS.ALL_FORECASTS,
    queryFn: () => fetchAllForecasts(productsData),
    enabled: productsData.length > 0,
    staleTime: 300000, // 5 minutes
    gcTime: 600000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchInterval: 300000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });

  // ─── Process Forecast Data (Memoized) ───
  const processedData = useMemo(() => {
    if (!productsData.length || !forecastsData.length) {
      return {
        weeklySchedule: [],
        productDeficits: [],
        productDailyData: {},
        weeklyTotalsArray: [],
        productDayTotals: [],
        rotatedDayNames: [],
        productsNeedingAction: 0,
        tomorrowUnits: 0,
        storageEfficiency: 0,
        totalStock: 0,
        chartData: [],
        currentDay: dayNames[new Date().getDay()],
        viewDayName: dayNames[getDateForDayOffset(viewOffset).getDay()],
        isViewToday: viewOffset === 0,
        viewDate: getDateForDayOffset(viewOffset),
        allZero: true,
      };
    }

    const currentDay = dayNames[new Date().getDay()];
    const viewDayName = dayNames[getDateForDayOffset(viewOffset).getDay()];
    const isViewToday = viewOffset === 0;
    const viewDate = getDateForDayOffset(viewOffset);

    // Build per-product daily data
    const perProductData = {};
    const dailyTotals = {};
    const productForecastData = {};

    forecastsData.forEach((result) => {
      if (!result || !result.forecast) return;
      const product = productsData.find(p => p.id === result.productId);
      if (!product) return;

      productForecastData[result.productId] = {
        reorderLevel: result.reorder_level || 0,
        todayForecast: result.forecast[0]?.overall || 0,
        tomorrowForecast: result.forecast[1]?.overall || 0,
        forecast: result.forecast
      };

      result.forecast.forEach(day => {
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

    // Build weekly schedule
    const schedule = dayNames.map(day => ({
      day,
      units: dailyTotals[day] || 0,
    }));

    // Compute product deficits for current view
    const deficits = productsData.map(p => {
      const data = productForecastData[p.id] || {};
      const forecast = data.forecast || [];
      const viewIndex = Math.min(viewOffset, forecast.length - 1);
      const viewForecast = forecast[viewIndex]?.overall || 0;
      const tomorrowIndex = viewOffset + 1 > 6 ? 0 : Math.min(viewOffset + 1, forecast.length - 1);
      const tomorrowForecast = forecast[tomorrowIndex]?.overall || 0;
      const currentStock = p.stock || 0;
      const needsAction = currentStock < viewForecast;

      return {
        ...p,
        reorderLevel: viewForecast,
        todayForecast: forecast[0]?.overall || 0,
        tomorrowForecast: tomorrowForecast,
        viewForecast: viewForecast,
        deficit: viewForecast - currentStock,
        needsAction: needsAction,
        shouldReorder: needsAction,
        fullForecast: forecast
      };
    });

    // Compute weekly product totals
    const weeklyTotals = Object.keys(perProductData).reduce((acc, day) => {
      perProductData[day].forEach(p => {
        if (!acc[p.productId]) {
          acc[p.productId] = { name: p.productName, total: 0 };
        }
        acc[p.productId].total += p.forecast;
      });
      return acc;
    }, {});
    const weeklyTotalsArray = Object.values(weeklyTotals).sort((a, b) => b.total - a.total);

    // Build product-day matrix
    const productDayMatrix = {};
    const productNames = {};
    Object.keys(perProductData).forEach(day => {
      perProductData[day].forEach(item => {
        const pid = item.productId;
        if (!productDayMatrix[pid]) {
          productDayMatrix[pid] = {};
          productNames[pid] = item.productName;
        }
        productDayMatrix[pid][day] = item.forecast;
      });
    });

    const productDayTotals = Object.keys(productDayMatrix).map(pid => {
      const days = productDayMatrix[pid];
      const total = Object.values(days).reduce((sum, v) => sum + v, 0);
      return { productId: pid, productName: productNames[pid], days, total };
    }).sort((a, b) => b.total - a.total);

    // Rotate day names
    const todayIndex = dayNames.indexOf(currentDay);
    const rotatedDayNames = [];
    for (let i = 0; i < 7; i++) {
      rotatedDayNames.push(dayNames[(todayIndex + i) % 7]);
    }

    // Rotate schedule for chart
    const currentIdx = schedule.findIndex(item => item.day === currentDay);
    let rotatedSchedule = [...schedule];
    if (currentIdx > 0) {
      rotatedSchedule = [
        ...schedule.slice(currentIdx),
        ...schedule.slice(0, currentIdx)
      ];
    }

    const chartData = rotatedSchedule.map(item => ({
      ...item,
      isPeak: item.units > 60,
      label: item.day.slice(0, 3),
    }));

    const allZero = chartData.length > 0 && chartData.every(item => item.units === 0);

    // Tomorrow's units
    const tomorrowScheduleIndex = 1;
    const wrappedTomorrowIndex = tomorrowScheduleIndex > 6 ? 0 : tomorrowScheduleIndex;
    const tomorrowSchedule = rotatedSchedule[wrappedTomorrowIndex] || rotatedSchedule[0];
    const tomorrowUnits = tomorrowSchedule ? tomorrowSchedule.units : 0;

    // Storage efficiency
    const totalStock = productsData.reduce((sum, p) => sum + (p.stock || 0), 0);
    const capacity = 1000;
    const storageEfficiency = Math.max(0, Math.min(100, ((capacity - totalStock) / capacity) * 100));

    const productsNeedingAction = deficits.filter(p => p.needsAction).length;

    return {
      weeklySchedule: schedule,
      productDeficits: deficits,
      productDailyData: perProductData,
      weeklyTotalsArray,
      productDayTotals,
      rotatedDayNames,
      productsNeedingAction,
      tomorrowUnits,
      storageEfficiency,
      totalStock,
      chartData,
      currentDay,
      viewDayName,
      isViewToday,
      viewDate,
      allZero,
    };
  }, [productsData, forecastsData, viewOffset]);

  // ─── Save Production Plan Mutation ───
  const saveProductionPlanMutation = useMutation({
    mutationFn: async (planData) => {
      const response = await fetch('/api/forecast/save-production-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });
      if (!response.ok) throw new Error('Failed to save production plan');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALL_FORECASTS });
      toast.success('Production plan saved successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save production plan');
    },
  });

  // ─── Update Reorder Levels Mutation ───
  const updateReorderLevelsMutation = useMutation({
    mutationFn: async (productId) => {
      const url = productId 
        ? `/api/forecast/update-reorder-levels/${productId}`
        : '/api/forecast/update-reorder-levels';
      const response = await fetch(url, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to update reorder levels');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ALL_FORECASTS });
      toast.success('Reorder levels updated successfully');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update reorder levels');
    },
  });

  // ─── Handlers ───
  const navigateDay = (direction) => {
    const newOffset = viewOffset + direction;
    if (newOffset < 0 || newOffset > 6) return;
    setViewOffset(newOffset);
    setSelectedDate(getDateForDayOffset(newOffset));
  };

  const goToToday = () => {
    setViewOffset(0);
    setSelectedDate(new Date());
  };

  const handleBarClick = (data) => {
    if (data && data.activePayload && data.activePayload.length) {
      const day = data.activePayload[0].payload.day;
      const productsForDay = processedData.productDailyData[day] || [];
      setSelectedDay(day);
      setSelectedDayProducts(productsForDay);
      setShowDailyModal(true);
    }
  };

  const openWeeklyModal = () => setShowWeeklyModal(true);

  const handleRefresh = () => {
    refetchProducts();
    refetchForecasts();
    toast.success('Refreshing data...');
  };

  const handleUpdateReorderLevels = () => {
    updateReorderLevelsMutation.mutate();
  };

  // ─── Loading State ───
  if (productsLoading || (forecastsLoading && forecastsData.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-500">Loading production dashboard...</div>
      </div>
    );
  }

  // ─── Error State ───
  if (productsError || forecastsError) {
    const error = productsError || forecastsError;
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <h3 className="font-semibold text-lg mb-2">Error Loading Data</h3>
        <p>{error.message || 'Failed to load data'}</p>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    chartData,
    productDeficits,
    productDayTotals,
    rotatedDayNames,
    productsNeedingAction,
    tomorrowUnits,
    storageEfficiency,
    totalStock,
    currentDay,
    viewDayName,
    isViewToday,
    viewDate,
    allZero,
  } = processedData;

  const isUpdating = updateReorderLevelsMutation.isPending;
  const isRefreshing = productsFetching || forecastsFetching;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ─── Header ─── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">JIT Production & Demand Forecasting</h1>
            <p className="text-sm text-gray-500 mt-1">
              Data-driven scheduling based on historic 30-day day-of-week trends.
            </p>
          </div>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={handleUpdateReorderLevels}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <TrendingUp size={14} className={isUpdating ? 'animate-spin' : ''} />
            Update Reorder Levels
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-500 bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm">
            <Clock size={16} className="text-blue-500" />
            <span>Today: <strong className="text-gray-900">{currentDay}</strong></span>
          </div>
        </div>
      </motion.div>

      {/* ─── Date Navigation ─── */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigateDay(-1)}
              disabled={viewOffset === 0}
              className={`p-2 rounded-lg transition-colors ${
                viewOffset === 0 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft size={20} />
            </button>
            
            <div className="text-center">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-indigo-500" />
                <span className="font-semibold text-gray-900">
                  {formatDate(viewDate)}
                </span>
                {isViewToday && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                    Today
                  </span>
                )}
                {viewOffset === 1 && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                    Tomorrow
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                Viewing {viewDayName}'s forecast
              </div>
            </div>

            <button
              onClick={() => navigateDay(1)}
              disabled={viewOffset === 6}
              className={`p-2 rounded-lg transition-colors ${
                viewOffset === 6 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-2">
              {dayNames.map((day, index) => {
                const date = getDateForDayOffset(index);
                const isToday = index === 0;
                const isSelected = viewOffset === index;
                return (
                  <button
                    key={day}
                    onClick={() => {
                      setViewOffset(index);
                      setSelectedDate(date);
                    }}
                    className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : isToday
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : index === 1
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    title={day}
                  >
                    {day.slice(0, 3)}
                  </button>
                );
              })}
            </div>

            {!isViewToday && (
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                Go to Today
              </button>
            )}
            <button
              onClick={openWeeklyModal}
              className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
            >
              <Eye size={16} />
              Full Week
            </button>
          </div>
        </div>

        <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
          <div 
            className="h-1.5 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300"
            style={{ width: `${((viewOffset + 1) / 7) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{dayNames[0] || 'Today'}</span>
          <span>Day {viewOffset + 1} of 7</span>
          <span>{dayNames[6] || 'Last Day'}</span>
        </div>
      </motion.div>

      {/* ─── Metrics Cards ─── */}
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
              <p className="text-xs text-gray-400 font-medium">Products Needing Action</p>
              <p className="text-xl font-bold text-amber-600">{productsNeedingAction}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <Package size={12} className="text-amber-500" /> Based on {viewDayName}'s forecast
          </p>
        </div>
      </motion.div>

      {/* ─── Action Plan ─── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-gray-900">
            Production Action Plan for {viewDayName}
          </h2>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
            {productsNeedingAction} products need action
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {productDeficits.slice(0, 6).map((product) => {
            const needsAction = product.needsAction;
            const deficit = product.deficit > 0 ? product.deficit : 0;
            const currentStock = product.stock || 0;
            const viewForecast = product.viewForecast || 0;
            const tomorrowForecast = product.tomorrowForecast || 0;
            const isLastDay = viewOffset === 6;

            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -2 }}
                className={`relative bg-white rounded-2xl border p-5 shadow-sm transition-shadow duration-200 ${
                  needsAction
                    ? 'border-amber-200 ring-1 ring-amber-200/50'
                    : 'border-gray-100'
                }`}
              >
                {needsAction && (
                  <div className="absolute -top-1 -right-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                      <Zap size={12} className="text-amber-600" />
                      Action Needed
                    </span>
                  </div>
                )}
                <h3 className="text-sm font-medium text-gray-800">{product.name}</h3>
                
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Current Stock</span>
                    <span className={`font-bold ${needsAction ? 'text-red-600' : 'text-emerald-600'}`}>
                      {currentStock}
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-lg p-2">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Sun size={12} className="text-blue-500" />
                        <span>{viewDayName}</span>
                      </div>
                      <div className="text-sm font-bold text-blue-600 mt-1">
                        {viewForecast} units
                      </div>
                    </div>
                    <div className={`rounded-lg p-2 ${isLastDay ? 'bg-green-50' : 'bg-indigo-50'}`}>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Calendar size={12} className={isLastDay ? 'text-green-500' : 'text-indigo-500'} />
                        <span>Tomorrow {isLastDay && '(Next Week)'}</span>
                      </div>
                      <div className={`text-sm font-bold mt-1 ${isLastDay ? 'text-green-600' : 'text-indigo-600'}`}>
                        {tomorrowForecast} units
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  {needsAction ? (
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

      {/* ─── Chart ─── */}
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
                  {chartData.map((entry, index) => {
                    const isViewDay = entry.day === viewDayName;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.isPeak ? '#f97316' : '#6366f1'}
                        fillOpacity={isViewDay ? 1 : 0.7}
                        stroke={isViewDay ? '#2563eb' : 'transparent'}
                        strokeWidth={isViewDay ? 3 : 0}
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )
        ) : (
          <div className="text-center py-8 text-gray-400">No forecast data available</div>
        )}

        <div className="mt-3 text-xs text-gray-400 flex items-center justify-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-blue-500" />
          <span>Highlighted bar = Currently viewing</span>
        </div>
      </motion.div>

      {/* ─── Daily Breakdown Modal ─── */}
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

      {/* ─── Weekly Summary Modal ─── */}
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
                              day === viewDayName ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
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
                            <td 
                              key={day} 
                              className={`text-center py-2 px-3 ${
                                day === viewDayName ? 'font-bold text-blue-600 bg-blue-50/30' : 'text-gray-700'
                              }`}
                            >
                              {row.days[day] || 0}
                            </td>
                          ))}
                          <td className="text-center py-2 px-3 font-bold text-indigo-700 bg-indigo-50/50">
                            {row.total}
                          </td>
                        </tr>
                      ))}
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