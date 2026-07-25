// frontend/src/services/deliveryFeeService.js
import api from './api';

/**
 * Get current delivery fee configuration
 */
export const getDeliveryFeeConfig = async () => {
  try {
    const response = await api.get('/delivery-fee/config');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch delivery fee config:', error);
    throw error;
  }
};

/**
 * Update delivery fee configuration
 */
export const updateDeliveryFeeConfig = async (config) => {
  try {
    const response = await api.post('/delivery-fee/config', config);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to update delivery fee config:', error);
    throw error;
  }
};

/**
 * Calculate delivery fee for an address
 */
export const calculateDeliveryFee = async (address, orderTotal = 0) => {
  try {
    const response = await api.post('/delivery-fee/calculate', { address, orderTotal });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to calculate delivery fee:', error);
    throw error;
  }
};