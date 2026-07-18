// frontend/src/services/api.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

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

api.interceptors.response.use(
  (response) => {
    console.log(`📥 ${response.config.url} -> ${response.status}`);
    console.log('📦 Response data:', response.data);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ============ VENDORS API ============
export const vendorsAPI = {
  getAll: () => api.get('/vendors'),
  getById: (id) => api.get(`/vendors/${id}`),
  create: (data) => api.post('/vendors', data),
  update: (id, data) => api.put(`/vendors/${id}`, data),
  delete: (id) => api.delete(`/vendors/${id}`),
};

// ============ STOCK API ============
export const stockAPI = {
  getProducts: () => api.get('/stock/products'),
  getProduct: (id) => api.get(`/stock/products/${id}`),
  getStock: (productId) => api.get(`/stock/${productId}`),
  getTransactions: (params = {}) => api.get('/stock/transactions', { params }),
  getSummary: () => api.get('/stock/summary'),
  addStock: (data) => api.post('/stock/add', data),
  reduceStock: (data) => api.post('/stock/reduce', data),
  updateStock: (productId, data) => api.put(`/stock/${productId}`, data),
  deleteStock: (productId) => api.delete(`/stock/${productId}`),
  processVendorOrder: (orderId) => api.post(`/stock/process-vendor-order/${orderId}`),
  syncEmptyStock: () => api.post('/stock/sync-empty-stock'),
};

// ============ EMPTY BOTTLES API ============
export const emptyBottlesAPI = {
  getStock: () => api.get('/empty-bottles/stock'),
  getReturns: (params = {}) => api.get('/empty-bottles/returns', { params }),
  getDailyAggregate: (days = 30) => api.get('/empty-bottles/daily-aggregate', { params: { days } }),
  getWithDeliveries: () => api.get('/empty-bottles/with-deliveries'),
  getDeliveries: () => api.get('/empty-bottles/deliveries'),
  recordFromDelivery: (data) => api.post('/empty-bottles/record-from-delivery', data),
  recordManual: (data) => api.post('/empty-bottles/record-manual', data),
  useBottles: (data) => api.post('/empty-bottles/use', data),
  deleteReturn: (id) => api.delete(`/empty-bottles/${id}`),
};

// ============ VENDOR ORDERS API ============
export const vendorOrdersAPI = {
  createOrder: (data) => api.post('/vendor-orders', data),
  updateOrder: (orderId, data) => api.put(`/vendor-orders/${orderId}`, data),
  getOrders: (params = {}) => api.get('/vendor-orders', { params }),
  getSummary: () => api.get('/vendor-orders/summary'),
};

// ============ ANALYTICS API ============
export const analyticsAPI = {
  getMonthlySales: () => api.get('/analytics/monthly-sales'),
  getVendors: () => api.get('/analytics/vendors'),
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

export default api;