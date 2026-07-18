// src/controllers/orders.controller.js
const {
  getAllOrders,
  getAllUsers,
  getAllProducts,
  createOrder,
} = require('.././services/ordersService');
// src/controllers/ordersController.js
const { getOrdersByUserId, getOrderById } = require('../services/ordersService');
const { notifyOrderEvent } = require('../utils/notifications'); // 🆕

/**
 * GET /api/orders
 * Fetch all orders (admin only – add auth middleware)
 */
const getOrders = async (req, res) => {
  try {
    const orders = await getAllOrders();
    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/users
 * Fetch all users (for dropdown)
 */
const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/products
 * Fetch all products (for dropdown)
 */
const getProducts = async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ success: true, products });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/orders
 * Create a new order
 */
const postOrder = async (req, res) => {
  try {
    const { customerId, orderType, paymentMethod, deliveryLocation, items } = req.body;

    // Basic validation
    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID and at least one item are required.',
      });
    }

    const newOrder = await createOrder({
      customerId,
      orderType,
      paymentMethod,
      deliveryLocation,
      items,
    });

    // 🆕 Order එක save උනාට පස්සේ - admin/staff ට notification එකක් යවනවා
    // (fire-and-forget - notification fail උනත් order creation response එකට බලපාන්නෙ නෑ,
    // notifyOrderEvent function එක ඇතුලෙන්ම try/catch කරලා swallow කරනවා)
    notifyOrderEvent({
      settingsKey: 'orderAlerts',
      type: 'order',
      message: `New order #${newOrder.id} placed (${orderType === 'HOME_DELIVERY' ? 'Home Delivery' : 'Pickup'})`,
      relatedOrderId: newOrder.id,
      targetRole: 'CASHIER,ADMIN', // ADMIN + STAFF දෙකටම පේනවා
    });

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ success: false, message: err.message });
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

module.exports = {
  getOrders,
  getOrder,
  getUsers,
  getProducts,
  postOrder,
};