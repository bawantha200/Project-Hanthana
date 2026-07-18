// frontend/src/services/paymentService.js
import api from './api';

export const initiatePayment = async (orderId, paymentMethod = 'ONLINE') => {
  try {
    const response = await api.post('/payments/initiate', {
      orderId,
      paymentMethod
    });
    
    if (response.data.success) {
      return response.data.paymentData;
    }
    throw new Error(response.data.message || 'Failed to initiate payment');
  } catch (error) {
    console.error('❌ [initiatePayment] Error:', error);
    throw error;
  }
};

export const getPaymentStatus = async (orderId) => {
  try {
    const response = await api.get(`/payments/status/${orderId}`);
    if (response.data.success) {
      return response.data.payment;
    }
    throw new Error(response.data.message || 'Failed to get payment status');
  } catch (error) {
    console.error('❌ [getPaymentStatus] Error:', error);
    throw error;
  }
};

export const getPaymentHistory = async () => {
  try {
    const response = await api.get('/payments/history');
    if (response.data.success) {
      return response.data.history;
    }
    throw new Error(response.data.message || 'Failed to get payment history');
  } catch (error) {
    console.error('❌ [getPaymentHistory] Error:', error);
    throw error;
  }
};