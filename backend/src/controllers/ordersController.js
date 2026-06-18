// src/controllers/ordersController.js
const { getOrdersByUserId, getOrderById } = require('../services/ordersService');

const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    const orders = await getOrdersByUserId(userId);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

const getOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    let idParam = req.params.id;
    // If it starts with 'ORD-', strip it
    if (idParam.startsWith('ORD-')) {
      idParam = idParam.replace('ORD-', '');
    }
    const orderId = parseInt(idParam, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }
    const order = await getOrderById(orderId, userId);
    res.json({ success: true, order });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

module.exports = { getOrders, getOrder };