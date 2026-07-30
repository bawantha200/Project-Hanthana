// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Simple In-Memory Cache ───
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 60000; // 60 seconds default
  }

  // Generate deterministic cache key from URL & query parameters
  getKey(url, params = {}) {
    // Sort query params so { a:1, b:2 } and { b:2, a:1 } hit the exact same key
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    return `get:${url}:${JSON.stringify(sortedParams)}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  deletePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const total = this.cache.size;
    const active = Array.from(this.cache.values()).filter(
      (entry) => Date.now() < entry.expiry
    ).length;
    return { total, active, expired: total - active };
  }
}

const cache = new ApiCache();

// ─── Custom Cache TTLs ───
const CACHE_TTL = {
  DEFAULT: 60000,
  INVENTORY: 30000,
  VENDORS: 120000,
  STOCK_SUMMARY: 60000,
  ANALYTICS: 300000,
  EMPTY_BOTTLES: 60000,
  VENDOR_ORDERS: 30000,
  PRODUCTS: 120000,
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ─── Request Interceptor ───
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Helper to determine TTL from URL
function getTTLForUrl(url) {
  if (url.includes('/inventory')) return CACHE_TTL.INVENTORY;
  if (url.includes('/vendors')) return CACHE_TTL.VENDORS;
  if (url.includes('/stock/summary')) return CACHE_TTL.STOCK_SUMMARY;
  if (url.includes('/analytics')) return CACHE_TTL.ANALYTICS;
  if (url.includes('/empty-bottles')) return CACHE_TTL.EMPTY_BOTTLES;
  if (url.includes('/vendor-orders')) return CACHE_TTL.VENDOR_ORDERS;
  if (url.includes('/products')) return CACHE_TTL.PRODUCTS;
  return CACHE_TTL.DEFAULT;
}

// ─── Response Interceptor ───
api.interceptors.response.use(
  (response) => {
    // Automatically cache 200 OK GET responses
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = cache.getKey(response.config.url, response.config.params);
      const ttl = getTTLForUrl(response.config.url);
      cache.set(cacheKey, response.data, ttl);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Cache Invalidation Helper ───
function invalidateRelatedCaches(url) {
  const resourceMatch = url.match(/\/([a-z-]+)(?:\/|$)/);
  if (!resourceMatch) return;

  const resource = resourceMatch[1];

  switch (resource) {
    case 'vendors':
      cache.deletePattern('vendors');
      cache.deletePattern('vendor-orders');
      cache.deletePattern('analytics');
      break;
    case 'vendor-orders':
      cache.deletePattern('vendor-orders');
      cache.deletePattern('stock');
      cache.deletePattern('inventory');
      cache.deletePattern('analytics');
      break;
    case 'stock':
    case 'inventory':
      cache.deletePattern('stock');
      cache.deletePattern('inventory');
      cache.deletePattern('analytics');
      break;
    case 'empty-bottles':
      cache.deletePattern('empty-bottles');
      cache.deletePattern('stock');
      break;
    default:
      cache.deletePattern(resource);
  }
}

// ─── Cache-Aware API Wrapper ───
const cachedApi = {
  get: async (url, config = {}) => {
    const cacheKey = cache.getKey(url, config.params);
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return { data: cachedData, fromCache: true };
    }

    // Response interceptor handles storing it into cache upon success
    const response = await api.get(url, config);
    return { data: response.data, fromCache: false };
  },

  post: async (url, data, config = {}) => {
    const response = await api.post(url, data, config);
    invalidateRelatedCaches(url);
    return response;
  },

  put: async (url, data, config = {}) => {
    const response = await api.put(url, data, config);
    invalidateRelatedCaches(url);
    return response;
  },

  patch: async (url, data, config = {}) => {
    const response = await api.patch(url, data, config);
    invalidateRelatedCaches(url);
    return response;
  },

  delete: async (url, config = {}) => {
    const response = await api.delete(url, config);
    invalidateRelatedCaches(url);
    return response;
  },
};

// ============ EXPORTS ============

export const vendorsAPI = {
  getAll: () => cachedApi.get('/vendors'),
  getById: (id) => cachedApi.get(`/vendors/${id}`),
  create: (data) => cachedApi.post('/vendors', data),
  update: (id, data) => cachedApi.put(`/vendors/${id}`, data),
  delete: (id) => cachedApi.delete(`/vendors/${id}`),
};

export const stockAPI = {
  getProducts: (params = {}) => cachedApi.get('/stock/products', { params }),
  getProduct: (id) => cachedApi.get(`/stock/products/${id}`),
  getStock: (productId) => cachedApi.get(`/stock/${productId}`),
  getTransactions: (params = {}) => cachedApi.get('/stock/transactions', { params }),
  getSummary: () => cachedApi.get('/stock/summary'),
  addStock: (data) => cachedApi.post('/stock/add', data),
  reduceStock: (data) => cachedApi.post('/stock/reduce', data),
  updateStock: (productId, data) => cachedApi.put(`/stock/${productId}`, data),
  deleteStock: (productId) => cachedApi.delete(`/stock/${productId}`),
  processVendorOrder: (orderId) => cachedApi.post(`/stock/process-vendor-order/${orderId}`),
  syncEmptyStock: () => cachedApi.post('/stock/sync-empty-stock'),
  convertStock: (data) => cachedApi.post('/stock/convert', data),
  toggleProductActive: (id, isActive) => cachedApi.patch(`/stock/stocks/${id}/status`, { is_active: isActive }),
};

export const emptyBottlesAPI = {
  getStock: () => cachedApi.get('/empty-bottles/stock'),
  getReturns: (params = {}) => cachedApi.get('/empty-bottles/returns', { params }),
  getDailyAggregate: (days = 30) => cachedApi.get('/empty-bottles/daily-aggregate', { params: { days } }),
  getWithDeliveries: () => cachedApi.get('/empty-bottles/with-deliveries'),
  getDeliveries: () => cachedApi.get('/empty-bottles/deliveries'),
  recordFromDelivery: (data) => cachedApi.post('/empty-bottles/record-from-delivery', data),
  recordManual: (data) => cachedApi.post('/empty-bottles/record-manual', data),
  useBottles: (data) => cachedApi.post('/empty-bottles/use', data),
  deleteReturn: (id) => cachedApi.delete(`/empty-bottles/${id}`),
};

export const vendorOrdersAPI = {
  createOrder: (data) => cachedApi.post('/vendor-orders', data),
  updateOrder: (orderId, data) => cachedApi.put(`/vendor-orders/${orderId}`, data),
  getOrders: (params = {}) => cachedApi.get('/vendor-orders', { params }),
  getSummary: () => cachedApi.get('/vendor-orders/summary'),
};

export const analyticsAPI = {
  getMonthlySales: () => cachedApi.get('/analytics/monthly-sales'),
  getVendors: () => cachedApi.get('/analytics/vendors'),
};

export const inventoryAPI = {
  getProductsWithStock: (params = {}) => stockAPI.getProducts(params),
  getProduct: stockAPI.getProduct,
  getStock: stockAPI.getStock,
  getTransactions: stockAPI.getTransactions,
  getStockSummary: stockAPI.getSummary,
  addStock: stockAPI.addStock,
  reduceStock: stockAPI.reduceStock,
  updateStock: stockAPI.updateStock,
  deleteStock: stockAPI.deleteStock,
  processVendorOrder: stockAPI.processVendorOrder,
  syncEmptyStock: stockAPI.syncEmptyStock,
  convertStock: stockAPI.convertStock,
  toggleProductActive: stockAPI.toggleProductActive,

  getVendors: vendorsAPI.getAll,
  getVendor: vendorsAPI.getById,
  createVendor: vendorsAPI.create,
  updateVendor: vendorsAPI.update,
  deleteVendor: vendorsAPI.delete,

  getEmptyBottles: emptyBottlesAPI.getStock,
  getEmptyBottleHistory: emptyBottlesAPI.getReturns,
  getEmptyBottleCollectionAggregate: emptyBottlesAPI.getReturns,
  getEmptyBottleDailyAggregate: emptyBottlesAPI.getDailyAggregate,
  getEmptyBottleReturnsWithDeliveries: emptyBottlesAPI.getWithDeliveries,
  getCompletedDeliveries: emptyBottlesAPI.getDeliveries,
  recordEmptyBottleReturn: emptyBottlesAPI.recordFromDelivery,
  recordManualEmptyBottleReturn: emptyBottlesAPI.recordManual,
  useEmptyBottles: emptyBottlesAPI.useBottles,
  deleteEmptyBottleReturn: emptyBottlesAPI.deleteReturn,

  createVendorOrder: vendorOrdersAPI.createOrder,
  updateVendorOrder: vendorOrdersAPI.updateOrder,
  getVendorOrders: vendorOrdersAPI.getOrders,
  getVendorPurchaseSummary: vendorOrdersAPI.getSummary,

  getMonthlySales: analyticsAPI.getMonthlySales,
};

export const cacheUtils = {
  clearAll: () => cache.clear(),
  clearResource: (resource) => cache.deletePattern(resource),
  getStats: () => cache.getStats(),
  refresh: async (url, config = {}) => {
    const cacheKey = cache.getKey(url, config.params);
    cache.delete(cacheKey);
    return cachedApi.get(url, config);
  },
};

export default api;