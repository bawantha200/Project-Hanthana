// frontend/src/services/ordersService.js
import api from './api';

// Fetch all orders (admin)
export const fetchOrders = async () => {
  try {
    // Add a timestamp to prevent caching issues
    const response = await api.get('/orders');
    console.log('📦 [fetchOrders] Response status:', response.status);
    console.log('📦 [fetchOrders] Response data:', response.data);
    
    // Handle different response formats
    if (response.data && response.data.success === true) {
      return response.data.orders || [];
    }
    
    // If the response is directly an array
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
    // If response has orders property but no success flag
    if (response.data && response.data.orders) {
      return response.data.orders;
    }
    
    console.warn('⚠️ [fetchOrders] Unexpected response format:', response.data);
    return [];
  } catch (error) {
    console.error('❌ [fetchOrders] Error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

// Fetch users (for admin dropdown)
export const fetchUsers = async () => {
  try {
    const response = await api.get('/orders/users');
    console.log('📦 [fetchUsers] Response:', response.data);
    return response.data.users || [];
  } catch (error) {
    console.error('❌ [fetchUsers] Error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

// Fetch products (for admin dropdown)
export const fetchProducts = async () => {
  try {
    const response = await api.get('/orders/products');
    console.log('📦 [fetchProducts] Response:', response.data);
    return response.data.products || [];
  } catch (error) {
    console.error('❌ [fetchProducts] Error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

// Create order (admin)
export const createOrder = async (orderData) => {
  try {
    const response = await api.post('/orders', orderData);
    return response.data.order;
  } catch (error) {
    console.error('❌ [createOrder] Error:', error);
    throw error;
  }
};

// Get user's orders (customer)
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