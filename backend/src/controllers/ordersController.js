// src/controllers/orders.controller.js
const { getOrdersByUserId } = require('../services/ordersService');

const getOrders = async (req, res) => {
  try {
    const userId = req.user.id; // from JWT (UUID)
    const orders = await getOrdersByUserId(userId);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

module.exports = { getOrders };