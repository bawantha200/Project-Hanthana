// backend/src/controllers/ordersController.js
const {
  getAllOrders,
  getAllUsers,
  getAllProducts,
  createOrder,
  getOrdersByUserId,
  getOrderById,
} = require('../services/ordersService');

const supabase = require('../config/db');

const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`🔍 [getOrders] User ID: ${userId}`);

    // Get role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error(`❌ [getOrders] Profile error:`, profileError.message);
      const orders = await getOrdersByUserId(userId);
      return res.json({ success: true, orders });
    }

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('role_name')
      .eq('id', profile.role_id)
      .single();

    if (roleError) {
      console.error(`❌ [getOrders] Role error:`, roleError.message);
      const orders = await getOrdersByUserId(userId);
      return res.json({ success: true, orders });
    }

    const isAdmin = role?.role_name === 'ADMIN';
    console.log(`👤 [getOrders] Role: ${role.role_name}, isAdmin: ${isAdmin}`);

    let orders;
    if (isAdmin) {
      orders = await getAllOrders();
    } else {
      orders = await getOrdersByUserId(userId);
    }

    res.json({ success: true, orders });
  } catch (err) {
    console.error(`💥 [getOrders]`, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    let idParam = req.params.id;
    if (idParam.startsWith('ORD-')) idParam = idParam.replace('ORD-', '');
    const orderId = parseInt(idParam, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    // Check admin status for bypass
    const { data: profile } = await supabase
      .from('profiles')
      .select('role_id')
      .eq('id', userId)
      .single();

    let isAdmin = false;
    if (profile) {
      const { data: role } = await supabase
        .from('roles')
        .select('role_name')
        .eq('id', profile.role_id)
        .single();
      isAdmin = role?.role_name === 'ADMIN';
    }

    const order = await getOrderById(orderId, userId, isAdmin);
    res.json({ success: true, order });
  } catch (err) {
    console.error(`💥 [getOrder]`, err);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    console.error(`💥 [getUsers]`, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

const getProducts = async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ success: true, products });
  } catch (err) {
    console.error(`💥 [getProducts]`, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

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
    console.error(`💥 [postOrder]`, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getOrders,
  getOrder,
  getUsers,
  getProducts,
  postOrder,
};