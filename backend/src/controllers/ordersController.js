// src/controllers/ordersController.js
const {
  getAllOrders,
  getAllUsers,
  getAllProducts,
  createOrder,
  getOrdersByUserId,
  getOrderById
} = require('../services/ordersService');

/**
 * GET /api/orders
 * Fetch orders – if user is admin, return all; otherwise return user's own orders
 */
const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    // If user is admin (you can adjust this condition)
    const isAdmin = req.user.role === 'admin'; // or however you store admin flag

    let orders;
    if (isAdmin) {
      orders = await getAllOrders();           // all orders for admin
    } else {
      orders = await getOrdersByUserId(userId); // user's own orders
    }

    res.json({ success: true, orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/orders/:id
 * Fetch a single order by ID (with user validation)
 */
const getOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    let idParam = req.params.id;
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

/**
 * GET /api/users
 * Fetch all users (for dropdown – admin only)
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

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ✅ Single export – include ALL functions
module.exports = {
  getOrders,
  getOrder,
  getUsers,
  getProducts,
  postOrder,
};