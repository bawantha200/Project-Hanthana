// frontend/src/services/orderService.js
import axios from 'axios';

// If your Express backend runs on port 5000, set a proxy in vite.config.js
const API_URL = '/api/orders';

export const fetchOrders = async () => {
  const { data } = await axios.get(API_URL);
  return data.orders;
};

export const fetchUsers = async () => {
  const { data } = await axios.get(`${API_URL}/users`);
  return data.users;
};

export const fetchProducts = async () => {
  const { data } = await axios.get(`${API_URL}/products`);
  return data.products;
};

export const createOrder = async (orderData) => {
  const { data } = await axios.post(API_URL, orderData);
  return data.order;
};