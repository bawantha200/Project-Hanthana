import api from './api';

export const getSalesManagerDashboard = async () => {
  const response = await api.get('/sales/dashboard');
  return response.data;
};