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

const { notifyOrderEvent } = require('../utils/notifications');
const supabase = require('../config/db');

// Roles considered "admin-level" for authorization checks
const ADMIN_ROLES = ['ADMIN', 'SUPER_ADMIN', 'MANAGER']; // adjust to match your actual role_name values
const isAdminLevel = (roleName) => ADMIN_ROLES.includes(roleName);
// ========== CREATE ORDER ==========
const postOrder = async (req, res) => {
  try {
    const { customerId, orderType, paymentMethod, deliveryAddress, items } = req.body;
    
    console.log('[postOrder] ==========================================');
    console.log('[postOrder] Received order data:');
    console.log('[postOrder] customerId:', customerId);
    console.log('[postOrder] orderType:', orderType);
    console.log('[postOrder] paymentMethod:', paymentMethod);
    console.log('[postOrder] deliveryAddress:', deliveryAddress);
    console.log('[postOrder] itemsCount:', items?.length || 0);
    console.log('[postOrder] ==========================================');

    if (!customerId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID and at least one item are required.',
      });
    }

    // ✅ Pass deliveryAddress to createOrder
    const newOrder = await createOrder({
      customerId,
      orderType,
      paymentMethod,
      deliveryAddress,  // ✅ This is the key fix
      items,
    });

    console.log('[postOrder] ✅ Order created successfully:', {
      orderId: newOrder.id,
      total: newOrder.total,
      deliveryFee: newOrder.delivery_fee,
      isCash: newOrder.isCash
    });

    // Staff + customer notifications for cash orders
    if (newOrder.isCash) {
      await notifyOrderEvent({
        settingsKey: 'orderAlerts',
        type: 'order',
        message: `New order #${newOrder.id} placed (${orderType} - Cash)`,
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

    res.status(201).json({ 
      success: true, 
      order: {
        id: newOrder.id,
        total: newOrder.total,
        delivery_fee: newOrder.delivery_fee,
        isCash: newOrder.isCash
      } 
    });
  } catch (err) {
    console.error('[postOrder] ❌ Error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Failed to create order' 
    });
  }
};

// ========== COMPLETE ORDER PAYMENT ==========
const completeOrderPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    console.log('[completeOrderPayment] ==========================================');
    console.log('[completeOrderPayment] Completing order:', id);
    console.log('[completeOrderPayment] User:', userId);

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order ID is required' 
      });
    }

    const { items } = req.body;
    console.log('[completeOrderPayment] Items received:', JSON.stringify(items, null, 2));

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'At least one item is required' 
      });
    }

    // Verify user has access to this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id, payment_status')
      .eq('id', id)
      .single();

    if (orderError) {
      console.error('[completeOrderPayment] ❌ Order not found:', orderError);
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
      isAdmin = isAdminLevel(role?.role_name);
    }

    if (order.customer_id !== userId && !isAdmin) {
      console.warn('[completeOrderPayment] ⚠️ Unauthorized access attempt by user:', userId);
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.payment_status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Order already completed' });
    }

    // Format items for the service function
    const formattedItems = items.map(item => ({
      productId: item.productId || item.product_id,
      quantity: item.quantity
    }));

    console.log('[completeOrderPayment] Formatted items:', JSON.stringify(formattedItems, null, 2));

    // Complete order and deduct inventory
    const completedOrder = await completeOrder(id, formattedItems);

    console.log('[completeOrderPayment] ✅ Order completed successfully');

    // Notification
    await notifyOrderEvent({
      settingsKey: 'orderAlerts',
      type: 'order',
      message: `Order #${id} payment completed and inventory updated`,
      relatedOrderId: id,
      targetRole: 'CASHIER,ADMIN',
    });

    res.json({ success: true, order: completedOrder });
  } catch (err) {
    console.error('[completeOrderPayment] ❌ Error:', err);
    res.status(500).json({ 
      success: false, 
      message: err.message || 'Failed to complete order' 
    });
  }
};

// ========== FAIL ORDER PAYMENT ==========
const failOrderPayment = async (req, res) => {
  try {
    const { id: orderId } = req.params;
    const userId = req.user.id;

    console.log('[failOrderPayment] ==========================================');
    console.log('[failOrderPayment] Marking payment failed for order:', orderId);

    // Verify user has access to this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id, payment_status')
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('[failOrderPayment] ❌ Order not found:', orderError);
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
      isAdmin = isAdminLevel(role?.role_name);
    }

    if (order.customer_id !== userId && !isAdmin) {
      console.warn('[failOrderPayment] ⚠️ Unauthorized access attempt by user:', userId);
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (order.payment_status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Order already completed, cannot mark as failed' });
    }

    const failedOrder = await failOrder(orderId);

    console.log('[failOrderPayment] ✅ Order marked as failed');

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
    console.error('[failOrderPayment] ❌ Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET ORDERS (Admin or Customer) ==========
const getOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('[getOrders] Fetching orders for user:', userId);

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

    const isAdmin = isAdminLevel(role?.role_name);

    let orders;
    if (isAdmin) {
      console.log('[getOrders] Admin user - fetching all orders');
      orders = await getAllOrders();
    } else {
      console.log('[getOrders] Customer user - fetching their orders');
      orders = await getOrdersByUserId(userId);
    }

    console.log(`[getOrders] Found ${orders?.length || 0} orders`);
    res.json({ success: true, orders });
  } catch (err) {
    console.error('[getOrders] ❌ Error:', err);
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

    console.log('[getOrder] Fetching order:', orderId, 'for user:', userId);

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
      isAdmin = isAdminLevel(role?.role_name);
    }

    const order = await getOrderById(orderId, userId, isAdmin);
    res.json({ success: true, order });
  } catch (err) {
    console.error('[getOrder] ❌ Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

// ========== GET USERS ==========
const getUsers = async (req, res) => {
  try {
    console.log('[getUsers] Fetching all users');
    const users = await getAllUsers();
    console.log(`[getUsers] Found ${users?.length || 0} users`);
    res.json({ success: true, users });
  } catch (err) {
    console.error('[getUsers] ❌ Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET PRODUCTS ==========
const getProducts = async (req, res) => {
  try {
    console.log('[getProducts] Fetching all products');
    const products = await getAllProducts();
    console.log(`[getProducts] Found ${products?.length || 0} products`);
    res.json({ success: true, products });
  } catch (err) {
    console.error('[getProducts] ❌ Error:', err);
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

    console.log('[updateStatus] Updating order:', orderId, 'to status:', status);

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

    // Customer notification
    await notifyOrderEvent({
      settingsKey: 'orderAlerts',
      type: 'order',
      message: `Your order #${orderId} is now ${status}`,
      relatedOrderId: orderId,
      userId: order.customer_id,
      targetRole: 'CUSTOMER',
    });

    console.log('[updateStatus] ✅ Status updated successfully');
    res.json({ success: true, order });
  } catch (err) {
    console.error('[updateStatus] ❌ Error:', err);
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

    console.log('[assignDelivery] Assigning delivery person:', deliveryPersonId, 'to order:', orderId);

    const result = await assignDeliveryPerson(orderId, deliveryPersonId, userId);

    await notifyOrderEvent({
      settingsKey: 'deliveryUpdates',
      type: 'delivery',
      message: `New delivery assigned for order #${orderId}`,
      relatedOrderId: orderId,
      targetRole: 'RIDER,ADMIN,SALES_MANAGER',
    });

    console.log('[assignDelivery] ✅ Delivery assigned successfully');
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[assignDelivery] ❌ Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET DELIVERY PERSONNEL ==========
const getDeliveryPersonnelList = async (req, res) => {
  try {
    console.log('[getDeliveryPersonnelList] Fetching delivery personnel');
    const personnel = await getDeliveryPersonnel();
    console.log(`[getDeliveryPersonnelList] Found ${personnel?.length || 0} personnel`);
    res.json({ success: true, personnel });
  } catch (err) {
    console.error('[getDeliveryPersonnelList] ❌ Error:', err);
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

    console.log('[getOrderDetails] Fetching order details for:', orderId);

    const order = await getOrderWithDetails(orderId);
    const history = await getOrderStatusHistory(orderId);

    console.log('[getOrderDetails] ✅ Order details fetched');
    res.json({ success: true, order, history });
  } catch (err) {
    console.error('[getOrderDetails] ❌ Error:', err);
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

    console.log('[updateDelivery] Updating delivery status for order:', orderId, 'to:', status);

    const delivery = await updateDeliveryStatus(orderId, status, userId);
    console.log('[updateDelivery] ✅ Delivery status updated');
    res.json({ success: true, delivery });
  } catch (err) {
    console.error('[updateDelivery] ❌ Error:', err);
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