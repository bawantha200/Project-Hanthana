import axios from 'axios';

// Use environment variable or fallback to local backend
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create Axios instance with base URL and default headers
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach Supabase JWT token ───
api.interceptors.request.use(
  (config) => {
    // Retrieve token from storage (matches your previous code)
    const token =
      localStorage.getItem('supabase.auth.token') ||
      sessionStorage.getItem('supabase.auth.token');

    // If token exists, add Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config; // Always return the config
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: handle 401 (unauthorized) globally ───
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: clear expired token and redirect to login
      // localStorage.removeItem('supabase.auth.token');
      // sessionStorage.removeItem('supabase.auth.token');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;