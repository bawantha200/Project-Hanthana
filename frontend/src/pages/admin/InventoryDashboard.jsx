import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package,
  FlaskConical,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  DollarSign,
  BarChart3,
  Clock,
  Zap,
  Truck,
  TrendingUp as DemandIcon,
  ChevronDown,
  ChevronUp,
  Filter,
  Calendar,
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
  AreaChart,
  Area,
  LineChart,
  Line,
} from 'recharts';
import { inventoryAPI } from '../../services/api';
import toast from 'react-hot-toast';

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

const COLORS = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#6366f1'];

// Custom Tooltip for Demand Forecasting
const DemandTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-3 text-sm min-w-[200px]">
      <p className="font-semibold text-gray-900 mb-2">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 py-1 border-b border-gray-50 last:border-0">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-600">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-900">{entry.value} units</span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
        Total: {payload.reduce((sum, entry) => sum + (entry.value || 0), 0)} units
      </div>
    </div>
  );
};

export default function InventoryDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Data states
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [emptyBottleData, setEmptyBottleData] = useState(null);
  const [aggregateData, setAggregateData] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showProductFilter, setShowProductFilter] = useState(false);
  
  // Date filter states
  const [dateRange, setDateRange] = useState('7'); // Default 7 days
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [forecastDays, setForecastDays] = useState(7);

  const fetchAllData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      else setRefreshing(true);
      setError(null);

      console.log('🔄 Fetching dashboard data...');

      const [
        productsRes,
        ordersRes,
        transactionsRes,
        emptyRes,
        aggregateRes,
      ] = await Promise.all([
        inventoryAPI.getProductsWithStock().catch(() => ({ data: { products: [] } })),
        inventoryAPI.getVendorOrders({ limit: 500 }).catch(() => ({ data: { orders: [] } })),
        inventoryAPI.getTransactions({ limit: 200 }).catch(() => ({ data: { transactions: [] } })),
        inventoryAPI.getEmptyBottles().catch(() => ({ data: { emptyBottles: null } })),
        inventoryAPI.getEmptyBottleDailyAggregate(30).catch(() => ({ data: { aggregate: [] } })),
      ]);

      const newProducts = productsRes.data?.products || [];
      setProducts(newProducts);
      setOrders(ordersRes.data?.orders || []);
      setTransactions(transactionsRes.data?.transactions || []);
      setEmptyBottleData(emptyRes.data?.emptyBottles || null);
      setAggregateData(aggregateRes.data?.aggregate || []);

      // Select ALL products by default
      const allProductIds = newProducts.map(p => p.id);
      setSelectedProducts(allProductIds);

      setLastUpdated(new Date());
      console.log('✅ Dashboard data loaded');
    } catch (err) {
      console.error('❌ Failed to load data:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Generate forecast data for products with date range
  const generateProductForecast = (productsData, ordersData, selectedIds, days) => {
    const forecastMap = {};
    const currentDate = new Date();
    
    // Initialize forecast for selected products
    selectedIds.forEach(id => {
      const product = productsData.find(p => p.id === id);
      if (product) {
        forecastMap[id] = {
          name: product.name || 'Unknown',
          color: COLORS[selectedIds.indexOf(id) % COLORS.length],
          data: [],
        };
      }
    });

    // Generate daily data
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const label = `${month}/${day}`;
      
      // For each selected product
      selectedIds.forEach(id => {
        if (!forecastMap[id]) return;
        
        // Get actual orders for this product on this day
        const dayOrders = ordersData.filter(o => {
          if (!o.order_date && !o.created_at) return false;
          const d = new Date(o.order_date || o.created_at);
          return d.getDate() === day && 
                 d.getMonth() + 1 === month && 
                 d.getFullYear() === year &&
                 o.product_id === id;
        });
        
        const actual = dayOrders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
        
        // Calculate predicted value (using moving average of last 7 days)
        let predicted = 0;
        if (i < days - 7) {
          const last7Days = [];
          for (let j = 1; j <= 7; j++) {
            const pastDate = new Date(date);
            pastDate.setDate(pastDate.getDate() - j);
            const pastDay = pastDate.getDate();
            const pastMonth = pastDate.getMonth() + 1;
            const pastYear = pastDate.getFullYear();
            
            const pastOrders = ordersData.filter(o => {
              if (!o.order_date && !o.created_at) return false;
              const d = new Date(o.order_date || o.created_at);
              return d.getDate() === pastDay && 
                     d.getMonth() + 1 === pastMonth && 
                     d.getFullYear() === pastYear &&
                     o.product_id === id;
            });
            const pastTotal = pastOrders.reduce((sum, o) => sum + (parseInt(o.quantity) || 0), 0);
            last7Days.push(pastTotal);
          }
          const avg = last7Days.reduce((a, b) => a + b, 0) / 7;
          predicted = Math.round(avg * (1 + Math.sin(i / 30) * 0.1));
        }
        
        forecastMap[id].data.push({
          date: dateStr,
          label: label,
          actual: actual,
          predicted: predicted,
          day: day,
          month: month,
          year: year,
        });
      });
    }

    return forecastMap;
  };

  useEffect(() => {
    fetchAllData(true);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchAllData(false);
  }, [fetchAllData]);

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const selectAllProducts = () => {
    setSelectedProducts(products.map(p => p.id));
  };

  const deselectAllProducts = () => {
    setSelectedProducts([]);
  };

  // Handle date range change
  const handleDateRangeChange = (value) => {
    setDateRange(value);
    setShowCustomDate(value === 'custom');
    if (value === '7') setForecastDays(7);
    else if (value === '30') setForecastDays(30);
    else if (value === '60') setForecastDays(60);
    else if (value === '90') setForecastDays(90);
    else if (value === '180') setForecastDays(180);
    else if (value === '365') setForecastDays(365);
  };

  // Handle custom date apply
  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setForecastDays(diffDays);
      toast.success(`Showing ${diffDays} days of data`);
    } else {
      toast.error('Please select both start and end dates');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <h3 className="font-semibold text-lg mb-2">Error Loading Dashboard</h3>
        <p>{error}</p>
        <button
          onClick={handleRefresh}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Calculate metrics
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);
  const totalEmpty = products.reduce((sum, p) => sum + (parseInt(p.empty_bottle_stock) || 0), 0);
  const lowStockItems = products.filter(p => 
    (parseInt(p.stock) || 0) < (parseInt(p.reorder_level) || 5)
  ).length;
  
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'ordered').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;
  
  const totalTransactions = transactions.length;

  // Generate forecast data with selected date range
  const forecastData = generateProductForecast(products, orders, selectedProducts, forecastDays);
  const selectedProductNames = selectedProducts.map(id => {
    const p = products.find(prod => prod.id === id);
    return p ? p.name : 'Unknown';
  });

  // Prepare chart data for the line chart
  const combinedChartData = [];
  if (selectedProducts.length > 0) {
    const firstProductData = forecastData[selectedProducts[0]]?.data || [];
    firstProductData.forEach((day, index) => {
      const entry = {
        date: day.label,
        fullDate: day.date,
        day: day.day,
        month: day.month,
        year: day.year,
      };
      selectedProducts.forEach(id => {
        const product = forecastData[id];
        if (product && product.data[index]) {
          entry[`${product.name}_actual`] = product.data[index].actual || 0;
          entry[`${product.name}_predicted`] = product.data[index].predicted || 0;
        }
      });
      combinedChartData.push(entry);
    });
  }

  // Get interval for X-axis ticks based on days
  const getTickInterval = () => {
    if (forecastDays <= 7) return 1;
    if (forecastDays <= 30) return 7;
    if (forecastDays <= 60) return 14;
    if (forecastDays <= 90) return 21;
    if (forecastDays <= 180) return 30;
    return 45;
  };

  // Stock Distribution
  const stockDistribution = products
    .map(p => ({
      name: p.name || 'Unknown',
      stock: parseInt(p.stock) || 0,
    }))
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 8);

  // Vendor Orders - Stock
  const vendorOrdersStock = orders
    .filter(o => o.vendor_id)
    .reduce((acc, o) => {
      const vendorName = o.vendors?.vendor_name || o.vendors?.name || 'Unknown';
      if (!acc[vendorName]) {
        acc[vendorName] = { name: vendorName, orders: 0, quantity: 0 };
      }
      acc[vendorName].orders += 1;
      acc[vendorName].quantity += parseInt(o.quantity) || 0;
      return acc;
    }, {});

  const vendorOrderData = Object.values(vendorOrdersStock)
    .sort((a, b) => b.orders - a.orders)
    .slice(0, 6);

  const collectionData = aggregateData.slice(-14).map(d => ({
    date: d.period || d.date || 'N/A',
    collected: parseInt(d.bottles_collected) || 0,
  }));

  // Check if we have data
  const hasData = products.length > 0 || orders.length > 0;

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <Package size={48} className="mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Start adding products and placing orders to see analytics.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => navigate('/inventory?tab=stock')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Add Products
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw size={16} className="inline mr-2" />
            Refresh
          </button>
        </div>
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
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Key inventory metrics and insights</p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </div>
        <div className="mt-3 sm:mt-0 flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            Manage Inventory
          </button>
        </div>
      </motion.div>
      {/* Quick Actions */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-3">
        <button
          onClick={() => navigate('/inventory?tab=stock')}
          className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md text-center group"
        >
          <Package size={20} className="mx-auto text-blue-600 mb-1" />
          <p className="text-xs font-medium text-gray-700">Stock</p>
        </button>

        <button
          onClick={() => navigate('/inventory?tab=empty')}
          className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md text-center group"
        >
          <FlaskConical size={20} className="mx-auto text-amber-600 mb-1" />
          <p className="text-xs font-medium text-gray-700">Empty</p>
        </button>

        <button
          onClick={() => navigate('/inventory?tab=orders')}
          className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md text-center group"
        >
          <ShoppingCart size={20} className="mx-auto text-purple-600 mb-1" />
          <p className="text-xs font-medium text-gray-700">Orders</p>
        </button>

        <button
          onClick={() => navigate('/jit')}
          className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md text-center group"
        >
          <Zap size={20} className="mx-auto text-emerald-600 mb-1" />
          <p className="text-xs font-medium text-gray-700">JIT</p>
        </button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Package size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Products</p>
              <p className="text-xl font-bold text-gray-900">{totalProducts}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {lowStockItems > 0 ? (
              <span className="text-amber-600">⚠️ {lowStockItems} low stock</span>
            ) : (
              <span className="text-emerald-600">✓ All stocked</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <FlaskConical size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Empty Bottles</p>
              <p className="text-xl font-bold text-gray-900">{totalEmpty}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {emptyBottleData?.status === 'low' ? (
              <span className="text-red-600">⚠️ Low supply</span>
            ) : (
              <span className="text-emerald-600">✓ Sufficient</span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <ShoppingCart size={18} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Orders</p>
              <p className="text-xl font-bold text-gray-900">{totalOrders}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex gap-2">
            <span className="text-amber-600">{pendingOrders} pending</span>
            <span className="text-emerald-600">{deliveredOrders} delivered</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Truck size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Vendors</p>
              <p className="text-xl font-bold text-gray-900">{vendorOrderData.length}</p>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {totalTransactions} transactions
          </div>
        </div>
      </motion.div>

      {/* Demand Forecasting - Full Width with Date Filter */}
      <motion.div variants={itemVariants}>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Demand Forecasting</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {selectedProducts.length} of {products.length} products selected • {forecastDays} days
                {selectedProducts.length > 0 && selectedProducts.length <= 3 && (
                  <span className="ml-1">• {selectedProductNames.join(', ')}</span>
                )}
                {selectedProducts.length > 3 && (
                  <span className="ml-1">• {selectedProductNames.slice(0, 3).join(', ')} +{selectedProducts.length - 3} more</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Date Range Filter */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => handleDateRangeChange('7')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    dateRange === '7' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  1W
                </button>
                <button
                  onClick={() => handleDateRangeChange('30')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    dateRange === '30' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  1M
                </button>
                <button
                  onClick={() => handleDateRangeChange('60')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    dateRange === '60' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  2M
                </button>
                <button
                  onClick={() => handleDateRangeChange('90')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    dateRange === '90' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  3M
                </button>
                <button
                  onClick={() => handleDateRangeChange('180')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    dateRange === '180' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  6M
                </button>
                <button
                  onClick={() => handleDateRangeChange('365')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    dateRange === '365' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  1Y
                </button>
                <button
                  onClick={() => handleDateRangeChange('custom')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1 ${
                    dateRange === 'custom' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Calendar size={12} />
                  Custom
                </button>
              </div>

              <button
                onClick={() => setShowProductFilter(!showProductFilter)}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  showProductFilter ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Filter size={14} />
                Products ({selectedProducts.length})
                {showProductFilter ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Custom Date Range */}
          {showCustomDate && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                </div>
                <button
                  onClick={handleCustomDateApply}
                  className="mt-4 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Apply Range
                </button>
                <span className="text-xs text-gray-400 mt-4">
                  {customStartDate && customEndDate ? 
                    `${Math.ceil((new Date(customEndDate) - new Date(customStartDate)) / (1000 * 60 * 60 * 24)) + 1} days selected` : 
                    'Select dates'
                  }
                </span>
              </div>
            </div>
          )}

          {/* Product Filter Dropdown - Improved with Select/Deselect All */}
          {showProductFilter && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Products</span>
                  <span className="text-xs text-gray-400">({selectedProducts.length} selected)</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAllProducts}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllProducts}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1">
                {products.map(product => {
                  const isSelected = selectedProducts.includes(product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => toggleProductSelection(product.id)}
                      className={`px-3 py-1.5 text-xs rounded-full transition-all duration-200 flex items-center gap-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {product.name}
                      {isSelected && <CheckCircle size={12} className="text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Demand Forecasting Chart */}
          {selectedProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={combinedChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 9, fill: '#94a3b8' }} 
                  axisLine={false} 
                  tickLine={false}
                  interval={getTickInterval()}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#94a3b8' }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <Tooltip content={<DemandTooltip />} />
                <Legend 
                  iconType="circle" 
                  iconSize={8} 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                />
                {/* Actual Demand Lines */}
                {selectedProducts.map((id, index) => {
                  const product = products.find(p => p.id === id);
                  if (!product) return null;
                  const color = COLORS[index % COLORS.length];
                  return (
                    <Line
                      key={`actual-${id}`}
                      type="monotone"
                      dataKey={`${product.name}_actual`}
                      name={`${product.name} (Actual)`}
                      stroke={color}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                    />
                  );
                })}
                {/* Predicted Demand Lines */}
                {selectedProducts.map((id, index) => {
                  const product = products.find(p => p.id === id);
                  if (!product) return null;
                  const color = COLORS[index % COLORS.length];
                  return (
                    <Line
                      key={`predicted-${id}`}
                      type="monotone"
                      dataKey={`${product.name}_predicted`}
                      name={`${product.name} (Predicted)`}
                      stroke={color}
                      strokeWidth={1.5}
                      strokeDasharray="5 5"
                      dot={false}
                      opacity={0.6}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[400px] text-gray-400">
              <div className="text-center">
                <DemandIcon size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-gray-500">No products selected</p>
                <button
                  onClick={selectAllProducts}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Select All Products
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-2 text-xs text-gray-400 text-center flex items-center justify-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-blue-600 inline-block"></span>
              Actual demand
            </span>
            <span className="flex items-center gap-1">
              <span className="w-4 h-0.5 bg-blue-400 border-t-2 border-dashed inline-block"></span>
              Predicted demand
            </span>
            <span>{forecastDays} days of data</span>
            <span>Every {getTickInterval()} days shown</span>
          </div>
        </div>
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Stock Distribution */}
        {stockDistribution.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Stock Distribution</h3>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <BarChart3 size={16} className="text-blue-600" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stockDistribution} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                <Tooltip content={DemandTooltip} />
                <Bar dataKey="stock" name="Stock" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Vendor Orders - Stock */}
        {vendorOrderData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Vendor Orders - Stock</h3>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                <Truck size={16} className="text-purple-600" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={vendorOrderData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={DemandTooltip} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="orders" name="Orders" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quantity" name="Quantity" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Empty Bottle Collection */}
      <motion.div variants={itemVariants}>
        {collectionData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Empty Bottle Collection (14 Days)</h3>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <FlaskConical size={16} className="text-amber-600" />
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={collectionData}>
                <defs>
                  <linearGradient id="collectionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={40} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip content={DemandTooltip} />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#collectionGrad)"
                  dot={{ r: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <motion.div variants={itemVariants} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <Clock size={16} className="text-gray-600" />
            </div>
          </div>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {transactions.slice(0, 8).map((t, idx) => (
              <div key={t.id || idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    t.type === 'add' || t.type === 'stock_add' ? 'bg-green-100' :
                    t.type === 'reduce' || t.type === 'stock_reduce' ? 'bg-red-100' :
                    'bg-gray-100'
                  }`}>
                    {t.type === 'add' || t.type === 'stock_add' ? 
                      <TrendingUp size={12} className="text-green-600" /> :
                      t.type === 'reduce' || t.type === 'stock_reduce' ? 
                      <TrendingDown size={12} className="text-red-600" /> :
                      <Package size={12} className="text-gray-600" />
                    }
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {t.products?.name || t.product_name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.type?.replace(/_/g, ' ') || 'Unknown'} • {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {t.created_at ? new Date(t.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      

      {/* Footer */}
      <motion.div variants={itemVariants} className="text-center text-xs text-gray-400 py-2">
        {totalProducts} products • {totalOrders} orders • {totalTransactions} transactions • {forecastDays} days forecast
      </motion.div>
    </motion.div>
  );
}