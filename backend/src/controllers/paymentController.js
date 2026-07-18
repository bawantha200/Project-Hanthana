// backend/src/controllers/paymentController.js
const {
  generatePayHerePayment,
  verifyPaymentNotification,
  getPaymentStatus,
  getPaymentHistory
} = require('../services/paymentService');
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
      console.error('❌ Order fetch error:', orderError);
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

    console.log('📦 [initiatePayment] Order found:', order.id, 'Amount:', order.total_amount);

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
    console.error('💥 [initiatePayment]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== PAYMENT RETURN URL ==========
const paymentReturn = async (req, res) => {
  try {
    const { order_id, status } = req.query;
    console.log('📤 [paymentReturn] Order:', order_id, 'Status:', status);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/payment-result?order=${order_id}&status=${status}`;
    
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('💥 [paymentReturn]', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/payment-result?status=failed`);
  }
};

// ========== PAYMENT CANCEL URL ==========
const paymentCancel = async (req, res) => {
  try {
    const { order_id } = req.query;
    console.log('❌ [paymentCancel] Order:', order_id);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/payment-result?order=${order_id}&status=cancelled`;
    
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('💥 [paymentCancel]', err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/payment-result?status=cancelled`);
  }
};

// ========== PAYMENT NOTIFICATION URL (Webhook) ==========
const paymentNotify = async (req, res) => {
  try {
    console.log('📨 [paymentNotify] Received notification');
    console.log('📨 Body:', req.body);
    
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
    
    await verifyPaymentNotification(mappedData);
    console.log('✅ Payment notification processed successfully');
    
    res.status(200).send('Payment notification processed successfully');
  } catch (err) {
    console.error('💥 [paymentNotify] Error:', err);
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
    console.error('💥 [getPaymentStatusById]', err);
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
    console.error('💥 [getPaymentHistoryByUser]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  initiatePayment,
  paymentReturn,
  paymentCancel,
  paymentNotify,
  getPaymentStatusById,
  getPaymentHistoryByUser
};