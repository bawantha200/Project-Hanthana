// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  // If you use Vite:
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  // If you use Create React App:
  // baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;