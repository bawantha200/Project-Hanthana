// backend/src/controllers/ordersController.js
const {
  getAllOrders,
  getAllUsers,
  getAllProducts,
  createOrder,
  completeOrder,
  failOrder,
  getOrdersByUserId,
  getOrderById,
  updateOrderStatus,
  assignDeliveryPerson,
  getDeliveryPersonnel,
  getOrderWithDetails,
  getOrderStatusHistory,
  updateDeliveryStatus,
  getOrderItems
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

    // Staff + customer notifications — only for cash orders (already paid instantly).
    // Online orders get notified from paymentNotify webhook once payment actually completes.
    if (newOrder.isCash) {
      await notifyOrderEvent({
        settingsKey: 'orderAlerts',
        type: 'order',
        message: `New order #${newOrder.id} placed (Pickup/Cash - Paid)`,
        relatedOrderId: newOrder.id,
        targetRole: 'CASHIER,ADMIN',
      });

      await notifyOrderEvent({
        settingsKey: 'orderAlerts',
        type: 'order',
        message: `Your order #${newOrder.id} has been placed and payment confirmed!`,
        relatedOrderId: newOrder.id,
        userId: customerId,
        customerPhone: newOrder.customerPhone,
        customerEmail: newOrder.customerEmail,
      });
    }

    res.status(201).json({ success: true, order: newOrder });
  } catch (err) {
    console.error('[postOrder] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== COMPLETE ORDER (After Payment) ==========
const completeOrderPayment = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const userId = req.user.id;

    console.log('[completeOrderPayment] Completing order:', orderId);

    // Verify user has access to this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id, payment_status, users ( email, phone )') 
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('[completeOrderPayment] Order not found:', orderError);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check authorization
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

    if (order.customer_id !== userId && !isAdmin) {
      console.warn('[completeOrderPayment] Unauthorized access attempt by user:', userId);
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.payment_status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Order already completed' });
    }

    // Get order items
    const orderItems = await getOrderItems(orderId);

    // Complete order and deduct inventory
    const completedOrder = await completeOrder(orderId, orderItems);

    // Notification
    await notifyOrderEvent({
      settingsKey: 'orderAlerts',
      type: 'order',
      message: `Your order #${orderId} has been placed and payment completed!`,
      relatedOrderId: orderId,
      userId: order.customer_id,
      customerPhone: order.users?.phone,
      customerEmail: order.users?.email,
    });

    res.json({ success: true, order: completedOrder });
  } catch (err) {
    console.error('[completeOrderPayment] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== FAIL ORDER PAYMENT ==========
const failOrderPayment = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const userId = req.user.id;

    console.log('[failOrderPayment] Marking payment failed for order:', orderId);

    // Verify user has access to this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('[failOrderPayment] Order not found:', orderError);
      return res.status(404).json({ success: false, message: 'Order not found' });
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

    if (order.customer_id !== userId && !isAdmin) {
      console.warn('[failOrderPayment] Unauthorized access attempt by user:', userId);
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.payment_status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Order already completed, cannot mark as failed' });
    }

    const failedOrder = await failOrder(orderId);

    // Staff notification
    await notifyOrderEvent({
      settingsKey: 'orderAlerts',
      type: 'order',
      message: `Order #${orderId} payment failed`,
      relatedOrderId: orderId,
      targetRole: 'CASHIER,ADMIN',
    });

    // Customer notification — payment failed
    await notifyOrderEvent({
      settingsKey: 'orderAlerts',
      type: 'order',
      message: `Your order #${orderId} payment failed. Please try again.`,
      relatedOrderId: orderId,
      userId: failedOrder.customer_id,
      customerPhone: failedOrder.users?.phone,
      customerEmail: failedOrder.users?.email,
    });

    res.json({ success: true, order: failedOrder });
  } catch (err) {
    console.error('[failOrderPayment] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET ORDERS (Admin or Customer) ==========
const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('[getOrders] Profile error:', profileError.message);
      const orders = await getOrdersByUserId(userId);
      return res.json({ success: true, orders });
    }

    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('role_name')
      .eq('id', profile.role_id)
      .single();

    if (roleError) {
      console.error('[getOrders] Role error:', roleError.message);
      const orders = await getOrdersByUserId(userId);
      return res.json({ success: true, orders });
    }

    const isAdmin = role?.role_name === 'ADMIN';

    let orders;
    if (isAdmin) {
      orders = await getAllOrders();
    } else {
      orders = await getOrdersByUserId(userId);
    }

    res.json({ success: true, orders });
  } catch (err) {
    console.error('[getOrders] Error:', err);
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
    console.error('[getOrder] Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

// ========== GET USERS ==========
const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({ success: true, users });
  } catch (err) {
    console.error('[getUsers] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET PRODUCTS ==========
const getProducts = async (req, res) => {
  try {
    const products = await getAllProducts();
    res.json({ success: true, products });
  } catch (err) {
    console.error('[getProducts] Error:', err);
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
    console.error('[updateStatus] Error:', err);
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
    console.error('[assignDelivery] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET DELIVERY PERSONNEL ==========
const getDeliveryPersonnelList = async (req, res) => {
  try {
    const personnel = await getDeliveryPersonnel();
    res.json({ success: true, personnel });
  } catch (err) {
    console.error('[getDeliveryPersonnelList] Error:', err);
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
    console.error('[getOrderDetails] Error:', err);
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
    console.error('[updateDelivery] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getOrders,
  getOrder,
  getUsers,
  getProducts,
  postOrder,
  completeOrderPayment,
  failOrderPayment,
  updateStatus,
  assignDelivery,
  getDeliveryPersonnelList,
  getOrderDetails,
  updateDelivery
};