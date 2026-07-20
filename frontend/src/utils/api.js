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

// Add delivery-specific API calls
export const deliveryApi = {
  // Admin
  getAll: (params) => api.get('/deliveries', { params }),
  getById: (id) => api.get(`/deliveries/${id}`),
  assignRider: (id, riderId) => api.put(`/deliveries/${id}/assign`, { riderId }),
  
  // Rider
  getMyDeliveries: (status) => api.get('/deliveries/my-deliveries', { params: { status } }),
  getMyStats: () => api.get('/deliveries/my-stats'),
  updateStatus: (id, status, emptyBottles = 0) => 
    api.put(`/deliveries/${id}/status`, { status, emptyBottles })
};