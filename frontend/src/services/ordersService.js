// frontend/src/services/ordersService.js
import api from './api';

// Fetch all orders (admin)
export const fetchOrders = async () => {
  try {
    const response = await api.get('/orders');
    if (response.data && response.data.success === true) {
      return response.data.orders || [];
    }
    if (Array.isArray(response.data)) {
      return response.data;
    }
    if (response.data && response.data.orders) {
      return response.data.orders;
    }
    return [];
  } catch (error) {
    console.error('❌ [fetchOrders] Error:', error);
    throw error;
  }
};

// Fetch users
export const fetchUsers = async () => {
  try {
    const response = await api.get('/orders/users');
    return response.data.users || [];
  } catch (error) {
    console.error('❌ [fetchUsers] Error:', error);
    throw error;
  }
};

// Fetch products
export const fetchProducts = async () => {
  try {
    const response = await api.get('/orders/products');
    return response.data.products || [];
  } catch (error) {
    console.error('❌ [fetchProducts] Error:', error);
    throw error;
  }
};

// Create order - accepts deliveryAddress
export const createOrder = async (orderData) => {
  try {
    const response = await api.post('/orders', orderData);
    return response.data.order;
  } catch (error) {
    console.error('❌ [createOrder] Error:', error);
    throw error;
  }
};

// Complete order
export const completeOrder = async (orderId, items) => {
  try {
    const response = await api.put(`/orders/${orderId}/complete`, { items });
    return response.data.order;
  } catch (error) {
    console.error('❌ [completeOrder] Error:', error);
    throw error;
  }
};

// Get user's orders
export const getUserOrders = async () => {
  try {
    const response = await api.get('/orders');
    if (response.data && response.data.success === true) {
      return response.data.orders || [];
    }
    return [];
  } catch (error) {
    console.error('❌ [getUserOrders] Error:', error);
    throw error;
  }
};

// ========== DELIVERY FEE ==========
export const getDeliveryFeeConfig = async () => {
  try {
    const response = await api.get('/delivery-fee/config');
    return response.data;
  } catch (error) {
    console.error('❌ [getDeliveryFeeConfig] Error:', error);
    throw error;
  }
};

export const updateDeliveryFeeConfig = async (config) => {
  try {
    const response = await api.post('/delivery-fee/config', config);
    return response.data;
  } catch (error) {
    console.error('❌ [updateDeliveryFeeConfig] Error:', error);
    throw error;
  }
};

export const calculateDeliveryFee = async (address, orderTotal = 0) => {
  try {
    const response = await api.post('/delivery-fee/calculate', { address, orderTotal });
    return response.data;
  } catch (error) {
    console.error('❌ [calculateDeliveryFee] Error:', error);
    throw error;
  }
};

// ========== WATER PRICING ==========
export const getWaterPrice = async () => {
  try {
    const response = await api.get('/orders/water-price');
    if (response.data && response.data.success === true) {
      return response.data.price || 50.00;
    }
    if (response.data && typeof response.data.price === 'number') {
      return response.data.price;
    }
    return 50.00;
  } catch (error) {
    console.error('❌ [getWaterPrice] Error:', error);
    return 20.00;
  }
};

export const updateWaterPrice = async (price) => {
  try {
    const response = await api.put('/orders/water-price', { price });
    return response.data.data;
  } catch (error) {
    console.error('❌ [updateWaterPrice] Error:', error);
    throw error;
  }
};

// ========== BULK WATER ORDER ==========
export const createBulkWaterOrder = async (orderData) => {
  try {
    const response = await api.post('/orders/bulk-water', orderData);
    return response.data.order;
  } catch (error) {
    console.error('❌ [createBulkWaterOrder] Error:', error);
    throw error;
  }
};

export const getBulkWaterOrders = async () => {
  try {
    const response = await api.get('/orders/bulk-water');
    return response.data.orders || [];
  } catch (error) {
    console.error('❌ [getBulkWaterOrders] Error:', error);
    return [];
  }
};