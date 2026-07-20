// backend/src/controllers/ordersController.js
const {
  getAllOrders,
  getAllUsers,
  getAllProducts,
  createOrder,
  getOrdersByUserId,
  getOrderById,
  updateOrderStatus,
  assignDeliveryPerson,
  getDeliveryPersonnel,
  getOrderWithDetails,
  getOrderStatusHistory,
  updateDeliveryStatus
} = require('../services/ordersService');

const { notifyOrderEvent } = require('../utils/notifications');   // ✅ ADD THIS

const supabase = require('../config/db');

const { sendSMS } = require('../utils/smsService');

// ========== CREATE ORDER ==========
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

    // Staff notification
    await notifyOrderEvent({
      settingsKey: 'orderAlerts',
      type: 'order',
      message: `New order #${newOrder.id} placed (${orderType === 'HOME_DELIVERY' ? 'Home Delivery' : 'Pickup'})`,
      relatedOrderId: newOrder.id,
      targetRole: 'CASHIER,ADMIN',
    });

    // Customer notification — FIXED
    await notifyOrderEvent({
      settingsKey: 'orderAlerts',
      type: 'order',
      message: newOrder.isCash
        ? `Your order #${newOrder.id} has been placed and payment confirmed!`
        : `Your order #${newOrder.id} has been placed successfully!`,
      relatedOrderId: newOrder.id,
      userId: customerId,
      customerPhone: newOrder.customerPhone,
      customerEmail: newOrder.customerEmail,
    });

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    console.error(`💥 [postOrder]`, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET ORDERS (Admin or Customer) ==========
const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`🔍 [getOrders] User ID: ${userId}`);

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

// ========== GET SINGLE ORDER ==========
const getOrder = async (req, res) => {
  try {
    const userId = req.user.id;
    let idParam = req.params.id;
    if (idParam.startsWith('ORD-')) idParam = idParam.replace('ORD-', '');
    const orderId = parseInt(idParam, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

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

// ========== GET USERS ==========
const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    console.error(`💥 [getUsers]`, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET PRODUCTS ==========
const getProducts = async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ success: true, products });
  } catch (err) {
    console.error(`💥 [getProducts]`, err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== UPDATE ORDER STATUS ==========
const updateStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    let idParam = req.params.id;
    if (idParam.startsWith('ORD-')) idParam = idParam.replace('ORD-', '');
    const orderId = parseInt(idParam, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const order = await updateOrderStatus(orderId, status, userId);

    if (status === 'DELIVERED') {
      await updateDeliveryStatus(orderId, 'DELIVERED', userId);
    }

    // Staff notification
    await notifyOrderEvent({
      settingsKey: 'orderAlerts',
      type: 'order',
      message: `Order #${orderId} status changed to ${status}`,
      relatedOrderId: orderId,
      targetRole: 'CASHIER,ADMIN',
    });

    // ⚠️ ADD THIS — Customer ta status update notify karanna
    await notifyOrderEvent({
      settingsKey: 'orderAlerts',
      type: 'order',
      message: `Your order #${orderId} is now ${status}`,
      relatedOrderId: orderId,
      userId: order.customer_id,
      targetRole: 'CUSTOMER',
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error('💥 [updateStatus]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== ASSIGN DELIVERY PERSON ==========
const assignDelivery = async (req, res) => {
  try {
    const userId = req.user.id;
    let idParam = req.params.id;
    if (idParam.startsWith('ORD-')) idParam = idParam.replace('ORD-', '');
    const orderId = parseInt(idParam, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const { deliveryPersonId } = req.body;
    if (!deliveryPersonId) {
      return res.status(400).json({ success: false, message: 'Delivery person ID is required' });
    }

    const result = await assignDeliveryPerson(orderId, deliveryPersonId, userId);

    await notifyOrderEvent({
      settingsKey: 'deliveryUpdates',
      type: 'delivery',
      message: `New delivery assigned for order #${orderId}`,
      relatedOrderId: orderId,
      targetRole: 'RIDER,ADMIN,SALES_MANAGER',
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('💥 [assignDelivery]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET DELIVERY PERSONNEL ==========
const getDeliveryPersonnelList = async (req, res) => {
  try {
    const personnel = await getDeliveryPersonnel();
    res.json({ success: true, personnel });
  } catch (err) {
    console.error('💥 [getDeliveryPersonnelList]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET ORDER WITH DETAILS ==========
const getOrderDetails = async (req, res) => {
  try {
    let idParam = req.params.id;
    if (idParam.startsWith('ORD-')) idParam = idParam.replace('ORD-', '');
    const orderId = parseInt(idParam, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await getOrderWithDetails(orderId);
    const history = await getOrderStatusHistory(orderId);

    res.json({ success: true, order, history });
  } catch (err) {
    console.error('💥 [getOrderDetails]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== UPDATE DELIVERY STATUS ==========
const updateDelivery = async (req, res) => {
  try {
    const userId = req.user.id;
    let idParam = req.params.id;
    if (idParam.startsWith('ORD-')) idParam = idParam.replace('ORD-', '');
    const orderId = parseInt(idParam, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const delivery = await updateDeliveryStatus(orderId, status, userId);
    res.json({ success: true, delivery });
  } catch (err) {
    console.error('💥 [updateDelivery]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getOrders,
  getOrder,
  getUsers,
  getProducts,
  postOrder,
  updateStatus,
  assignDelivery,
  getDeliveryPersonnelList,
  getOrderDetails,
  updateDelivery
};