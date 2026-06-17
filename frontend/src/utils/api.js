const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const customerAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    const response = await fetch(`${API_BASE_URL}/customers?${params}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
  
  getStatistics: async () => {
    const response = await fetch(`${API_BASE_URL}/customers/statistics`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
  
  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`);
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
  
  create: async (customerData) => {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
  
  update: async (id, customerData) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData)
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data.data;
  },
  
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.message);
    return data;
  }
};