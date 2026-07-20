// backend/src/controllers/paymentController.js
const {
  generatePayHerePayment,
  verifyPaymentNotification,
  getPaymentStatus,
  getPaymentHistory
} = require('../services/paymentService');
const { completeOrder, getOrderItems } = require('../services/ordersService');
const supabase = require('../config/db');

// ========== INITIATE PAYMENT ==========
const initiatePayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId, paymentMethod = 'ONLINE' } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    // Get order with customer details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        customer_id,
        users!orders_customer_id_fkey (
          id,
          name,
          email,
          phone,
          address
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError) {
      console.error('[initiatePayment] Order fetch error:', orderError);
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Check authorization - allow if user is the customer or admin
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
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    console.log('[initiatePayment] Order found:', order.id, 'Amount:', order.total_amount);

    // Generate payment data
    const paymentData = await generatePayHerePayment({
      orderId: order.id,
      amount: order.total_amount,
      customer: order.users,
      paymentMethod
    });

    res.json({
      success: true,
      paymentData
    });
  } catch (err) {
    console.error('[initiatePayment] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== PAYMENT RETURN URL ==========
const paymentReturn = async (req, res) => {
  try {
    const { order_id, status } = req.query;
    console.log('[paymentReturn] Order:', order_id, 'Status:', status);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/payment-result?order=${order_id}&status=${status}`;
    
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('[paymentReturn] Error:', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/payment-result?status=failed`);
  }
};

// ========== PAYMENT CANCEL URL ==========
const paymentCancel = async (req, res) => {
  try {
    const { order_id } = req.query;
    console.log('[paymentCancel] Order:', order_id);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/payment-result?order=${order_id}&status=cancelled`;
    
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('[paymentCancel] Error:', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/payment-result?status=cancelled`);
  }
};

// ========== PAYMENT NOTIFICATION URL (Webhook) ==========
const paymentNotify = async (req, res) => {
  try {
    console.log('[paymentNotify] Received notification');
    console.log('[paymentNotify] Body:', req.body);
    
    const notificationData = req.body;
    
    // Map fields correctly
    const mappedData = {
      merchant_id: notificationData.merchant_id,
      order_id: notificationData.order_id,
      payment_id: notificationData.payment_id || notificationData.paymentId,
      status_code: notificationData.status_code || notificationData.statusCode,
      payhere_amount: notificationData.payhere_amount || notificationData.amount,
      payhere_currency: notificationData.payhere_currency || notificationData.currency,
      md5sig: notificationData.md5sig || notificationData.hash,
      custom_1: notificationData.custom_1,
      custom_2: notificationData.custom_2,
    };
    
    // Verify payment notification and get result
    const verificationResult = await verifyPaymentNotification(mappedData);
    
    console.log('[paymentNotify] Payment verification result:', verificationResult);
    
    // If payment is COMPLETED, deduct inventory
    if (verificationResult && verificationResult.status === 'COMPLETED') {
      try {
        console.log('[paymentNotify] Payment completed for order:', verificationResult.orderId);
        
        // Get order items for inventory deduction
        const orderItems = await getOrderItems(verificationResult.orderId);
        console.log('[paymentNotify] Found', orderItems.length, 'items for order');
        
        // Complete order and deduct inventory
        await completeOrder(verificationResult.orderId, orderItems);
        console.log('[paymentNotify] Order', verificationResult.orderId, 'completed and inventory deducted');
      } catch (inventoryError) {
        console.error('[paymentNotify] Inventory deduction error:', inventoryError);
        // Still send success response to PayHere, but log the error
        // Admin will need to manually fix inventory
      }
    } else {
      console.log('[paymentNotify] Payment not completed, status:', verificationResult?.status);
    }
    
    console.log('[paymentNotify] Payment notification processed successfully');
    
    res.status(200).send('Payment notification processed successfully');
  } catch (err) {
    console.error('[paymentNotify] Error:', err);
    // Always return 200 to PayHere to prevent retries
    res.status(200).send('Payment notification received');
  }
};

// ========== GET PAYMENT STATUS ==========
const getPaymentStatusById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    // Verify user has access to this order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('customer_id')
      .eq('id', orderId)
      .single();

    if (orderError) {
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
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const payment = await getPaymentStatus(orderId);
    res.json({ success: true, payment });
  } catch (err) {
    console.error('[getPaymentStatusById] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== GET PAYMENT HISTORY FOR USER ==========
const getPaymentHistoryByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await getPaymentHistory(userId);
    res.json({ success: true, history });
  } catch (err) {
    console.error('[getPaymentHistoryByUser] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== MANUAL COMPLETE ORDER (Admin) ==========
const manuallyCompleteOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    console.log('[manuallyCompleteOrder] Manually completing order:', orderId);

    // Verify admin access
    const { data: profile } = await supabase
      .from('profiles')
      .select('role_id')
      .eq('id', userId)
      .single();

    if (profile) {
      const { data: role } = await supabase
        .from('roles')
        .select('role_name')
        .eq('id', profile.role_id)
        .single();
      
      if (role?.role_name !== 'ADMIN') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check if order exists
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('payment_status')
      .eq('id', orderId)
      .single();

    if (orderError) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.payment_status === 'COMPLETED') {
      return res.status(400).json({ success: false, message: 'Order already completed' });
    }

    // Get order items
    const orderItems = await getOrderItems(orderId);

    // Complete order and deduct inventory
    const completedOrder = await completeOrder(orderId, orderItems);

    console.log('[manuallyCompleteOrder] Order', orderId, 'completed manually by admin');

    res.json({ 
      success: true, 
      message: 'Order completed successfully', 
      order: completedOrder 
    });
  } catch (err) {
    console.error('[manuallyCompleteOrder] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  initiatePayment,
  paymentReturn,
  paymentCancel,
  paymentNotify,
  getPaymentStatusById,
  getPaymentHistoryByUser,
  manuallyCompleteOrder
};