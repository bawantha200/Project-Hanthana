// frontend/src/services/ordersService.js
import api from './api';

// Fetch all orders (admin)
export const fetchOrders = async () => {
  try {
    const response = await api.get('/orders');
    console.log('📦 [fetchOrders] Response status:', response.status);
    console.log('📦 [fetchOrders] Response data:', response.data);
    
    if (response.data && response.data.success === true) {
      return response.data.orders || [];
    }
    
    if (Array.isArray(response.data)) {
      return response.data;
    }
    
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

// ✅ Changed from POST to PUT to match backend route
export const completeOrder = async (orderId, items) => {
  try {
    // ✅ Make sure items are sent in the correct format
    const response = await api.put(`/orders/${orderId}/complete`, { 
      items: items 
    });
    console.log('✅ [completeOrder] Response:', response.data);
    return response.data.order;
  } catch (error) {
    console.error('❌ [completeOrder] Error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
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


// ========== WATER PRICING ==========
export const getWaterPrice = async () => {
  try {
    console.log('📤 GET /orders/water-price');
    const response = await api.get('/orders/water-price');
    console.log('📥 /orders/water-price ->', response.status);
    console.log('📦 Response data:', response.data);
    
    // Handle different response formats
    if (response.data && response.data.success === true) {
      return response.data.price || 50.00;
    }
    
    if (response.data && typeof response.data.price === 'number') {
      return response.data.price;
    }
    
    console.warn('⚠️ Unexpected response format:', response.data);
    return 50.00;
  } catch (error) {
    console.error('❌ [getWaterPrice] Error:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return 20.00; // Default fallback
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