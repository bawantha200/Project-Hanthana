// frontend/src/services/api.js
import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem('supabase.auth.token') ||
      sessionStorage.getItem('supabase.auth.token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can handle 401, 403, etc. here
    if (error.response?.status === 401) {
      // Optionally logout or redirect
    }
    return Promise.reject(error);
  }
);

export default api;