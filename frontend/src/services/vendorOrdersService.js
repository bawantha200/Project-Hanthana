// frontend/src/services/vendorOrderService.js
import api from './api';

export async function getVendorOrders(filters = {}) {
  const params = {};
  if (filters.vendorId) params.vendorId = filters.vendorId;
  if (filters.productId) params.productId = filters.productId;
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;

  try {
    const response = await api.get('/vendor-orders', { params });
    return response.data.orders || response.data || [];
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    throw error;
  }
}

export async function getVendorOrderById(id) {
  try {
    const response = await api.get(`/vendor-orders/${id}`);
    return response.data.order || response.data;
  } catch (error) {
    console.error(`Error fetching vendor order ${id}:`, error);
    throw error;
  }
}

export async function createVendorOrder(orderData) {
  try {
    const response = await api.post('/vendor-orders', orderData);
    return response.data.order || response.data;
  } catch (error) {
    console.error('Error creating vendor order:', error);
    throw error;
  }
}

export async function updateVendorOrder(id, orderData) {
  try {
    const response = await api.put(`/vendor-orders/${id}`, orderData);
    return response.data.order || response.data;
  } catch (error) {
    console.error(`Error updating vendor order ${id}:`, error);
    throw error;
  }
}

export async function updateVendorOrderStatus(id, status) {
  try {
    const response = await api.patch(`/vendor-orders/${id}/status`, { status });
    return response.data.order || response.data;
  } catch (error) {
    console.error(`Error updating order ${id} status:`, error);
    throw error;
  }
}

export async function deleteVendorOrder(id) {
  try {
    const response = await api.delete(`/vendor-orders/${id}`);
    return response.data;
  } catch (error) {
    console.error(`Error deleting vendor order ${id}:`, error);
    throw error;
  }
}

export async function getVendorPurchaseSummary() {
  try {
    const response = await api.get('/vendor-orders/summary');
    return response.data.summary || response.data;
  } catch (error) {
    console.error('Error fetching vendor purchase summary:', error);
    throw error;
  }
}