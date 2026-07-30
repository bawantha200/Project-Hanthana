// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Simple In-Memory Cache ───
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.defaultTTL = 60000; // 60 seconds default
  }

  // Generate cache key from request config
  getKey(config) {
    const { url, method, params, data } = config;
    const paramsStr = params ? JSON.stringify(params) : '';
    const dataStr = data && method === 'get' ? JSON.stringify(data) : '';
    return `${method}:${url}:${paramsStr}:${dataStr}`;
  }

  // Get cached response
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if expired
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  // Set cache entry
  set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  // Delete specific cache entry
  delete(key) {
    this.cache.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
  }

  // Delete cache entries matching a pattern
  deletePattern(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Get cache stats
  getStats() {
    const total = this.cache.size;
    const active = Array.from(this.cache.values()).filter(
      entry => Date.now() < entry.expiry
    ).length;
    return { total, active, expired: total - active };
  }
}

// Create cache instance
const cache = new ApiCache();

// ─── Custom Cache TTLs for different endpoints ───
const CACHE_TTL = {
  DEFAULT: 60000,           // 60 seconds
  INVENTORY: 30000,         // 30 seconds
  VENDORS: 120000,          // 2 minutes
  STOCK_SUMMARY: 60000,     // 60 seconds
  ANALYTICS: 300000,        // 5 minutes
  EMPTY_BOTTLES: 60000,     // 60 seconds
  VENDOR_ORDERS: 30000,     // 30 seconds
  PRODUCTS: 120000,         // 2 minutes
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ─── Request Interceptor: attach JWT token ───
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`📤 ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor: caching and error handling ───
api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.config.url} -> ${response.status}`);
    console.log('📦 Response data:', response.data);
    
    // Cache GET requests only
    if (response.config.method === 'get' && response.status === 200) {
      const cacheKey = cache.getKey(response.config);
      // Determine TTL based on URL pattern
      let ttl = CACHE_TTL.DEFAULT;
      
      if (response.config.url.includes('/inventory')) {
        ttl = CACHE_TTL.INVENTORY;
      } else if (response.config.url.includes('/vendors')) {
        ttl = CACHE_TTL.VENDORS;
      } else if (response.config.url.includes('/stock/summary')) {
        ttl = CACHE_TTL.STOCK_SUMMARY;
      } else if (response.config.url.includes('/analytics')) {
        ttl = CACHE_TTL.ANALYTICS;
      } else if (response.config.url.includes('/empty-bottles')) {
        ttl = CACHE_TTL.EMPTY_BOTTLES;
      } else if (response.config.url.includes('/vendor-orders')) {
        ttl = CACHE_TTL.VENDOR_ORDERS;
      } else if (response.config.url.includes('/products')) {
        ttl = CACHE_TTL.PRODUCTS;
      }
      
      cache.set(cacheKey, response.data, ttl);
    }
    
    return response;
  },
  (error) => {
    console.error(`❌ Response error from ${error.config?.url || 'unknown'}:`, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);

      // Optional: redirect to login on 401 Unauthorized
      if (error.response.status === 401) {
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    console.error('❌ API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ─── Cache-Aware API Wrapper ───
const cachedApi = {
  // Get with cache check
  get: async (url, config = {}) => {
    const fullConfig = { ...config, url, method: 'get' };
    const cacheKey = cache.getKey(fullConfig);
    
    // Check cache
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`📦 Cache hit for ${url}`);
      return { data: cachedData, fromCache: true };
    }
    
    console.log(`📦 Cache miss for ${url}, fetching...`);
    const response = await api.get(url, config);
    return { data: response.data, fromCache: false };
  },

  // Post with cache invalidation
  post: async (url, data, config = {}) => {
    const response = await api.post(url, data, config);
    // Invalidate caches for related GET endpoints
    invalidateRelatedCaches(url);
    return response;
  },

  // Put with cache invalidation
  put: async (url, data, config = {}) => {
    const response = await api.put(url, data, config);
    invalidateRelatedCaches(url);
    return response;
  },

  // Delete with cache invalidation
  delete: async (url, config = {}) => {
    const response = await api.delete(url, config);
    invalidateRelatedCaches(url);
    return response;
  },

  // Patch with cache invalidation
  patch: async (url, data, config = {}) => {
    const response = await api.patch(url, data, config);
    invalidateRelatedCaches(url);
    return response;
  }
};

// ─── Cache Invalidation Helpers ───
function invalidateRelatedCaches(url) {
  // Extract resource type from URL
  const resourceMatch = url.match(/\/([a-z-]+)(?:\/|$)/);
  if (resourceMatch) {
    const resource = resourceMatch[1];
    console.log(`🔄 Invalidating cache for: ${resource}`);
    
    // Invalidate specific resource caches
    switch(resource) {
      case 'vendors':
        cache.deletePattern('vendors');
        cache.deletePattern('vendor-orders');
        break;
      case 'vendor-orders':
        cache.deletePattern('vendor-orders');
        cache.deletePattern('stock');
        break;
      case 'stock':
        cache.deletePattern('stock');
        cache.deletePattern('inventory');
        break;
      case 'empty-bottles':
        cache.deletePattern('empty-bottles');
        break;
      case 'inventory':
        cache.deletePattern('inventory');
        cache.deletePattern('stock');
        break;
      case 'analytics':
        cache.deletePattern('analytics');
        break;
      default:
        // For other resources, invalidate all caches containing the resource name
        cache.deletePattern(resource);
    }
  }
}

// ─── Enhanced API Services with Caching ───

// ============ VENDORS API ============
export const vendorsAPI = {
  getAll: () => cachedApi.get('/vendors'),
  getById: (id) => cachedApi.get(`/vendors/${id}`),
  create: (data) => cachedApi.post('/vendors', data),
  update: (id, data) => cachedApi.put(`/vendors/${id}`, data),
  delete: (id) => cachedApi.delete(`/vendors/${id}`),
};

// ============ STOCK API ============
export const stockAPI = {
  getProducts: () => cachedApi.get('/stock/products'),
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
};

// ============ EMPTY BOTTLES API ============
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

// ============ VENDOR ORDERS API ============
export const vendorOrdersAPI = {
  createOrder: (data) => cachedApi.post('/vendor-orders', data),
  updateOrder: (orderId, data) => cachedApi.put(`/vendor-orders/${orderId}`, data),
  getOrders: (params = {}) => cachedApi.get('/vendor-orders', { params }),
  getSummary: () => cachedApi.get('/vendor-orders/summary'),
};

// ============ ANALYTICS API ============
export const analyticsAPI = {
  getMonthlySales: () => cachedApi.get('/analytics/monthly-sales'),
  getVendors: () => cachedApi.get('/analytics/vendors'),
};

// ============ INVENTORY API ============
export const inventoryAPI = {
  // Stock
  getProductsWithStock: stockAPI.getProducts,
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
  
  // Vendors
  getVendors: vendorsAPI.getAll,
  getVendor: vendorsAPI.getById,
  createVendor: vendorsAPI.create,
  updateVendor: vendorsAPI.update,
  deleteVendor: vendorsAPI.delete,
  
  // Empty Bottles
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
  
  // Vendor Orders
  createVendorOrder: vendorOrdersAPI.createOrder,
  updateVendorOrder: vendorOrdersAPI.updateOrder,
  getVendorOrders: vendorOrdersAPI.getOrders,
  getVendorPurchaseSummary: vendorOrdersAPI.getSummary,
  
  // Analytics
  getMonthlySales: analyticsAPI.getMonthlySales,
};

// ============ Cache Management Utilities ============
export const cacheUtils = {
  // Clear all cache
  clearAll: () => cache.clear(),
  
  // Clear specific resource cache
  clearResource: (resource) => cache.deletePattern(resource),
  
  // Get cache statistics
  getStats: () => cache.getStats(),
  
  // Force refresh a specific endpoint
  refresh: async (url, config = {}) => {
    const fullConfig = { ...config, url, method: 'get' };
    const cacheKey = cache.getKey(fullConfig);
    cache.delete(cacheKey);
    return cachedApi.get(url, config);
  }
};

// Export original api for backward compatibility
export default api;