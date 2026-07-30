// backend/src/controllers/paymentController.js
const {
  generatePayHerePayment,
  verifyPaymentNotification,
  getPaymentStatus,
  getPaymentHistory
} = require('../services/paymentService');
const { completeOrder, getOrderItems, failOrder } = require('../services/ordersService');
const { notifyOrderEvent } = require('../utils/notifications');
const supabase = require('../config/db');
const cache = require('../config/cache');

// Cache configuration
const CACHE_TTL = {
  PAYMENT_STATUS: 60,        // 60 seconds for payment status
  PAYMENT_HISTORY: 120,      // 2 minutes for payment history
};

const CACHE_KEYS = {
  PAYMENT_STATUS_PREFIX: 'payment_status_',
  PAYMENT_HISTORY_PREFIX: 'payment_history_',
};

// Helper to invalidate payment caches
const invalidatePaymentCaches = (orderId, userId) => {
  // Delete specific payment status cache
  if (orderId) {
    cache.del(`${CACHE_KEYS.PAYMENT_STATUS_PREFIX}${orderId}`);
  }
  
  // Delete user's payment history cache
  if (userId) {
    cache.del(`${CACHE_KEYS.PAYMENT_HISTORY_PREFIX}${userId}`);
  }
};

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
        
        // Invalidate caches before processing
        invalidatePaymentCaches(verificationResult.orderId);
     
        // Get order items for inventory deduction
        const orderItems = await getOrderItems(verificationResult.orderId);
        console.log('[paymentNotify] Found', orderItems.length, 'items for order');
     
        // Complete order and deduct inventory
        const completedOrder = await completeOrder(verificationResult.orderId, orderItems);
        console.log('[paymentNotify] Order', verificationResult.orderId, 'completed and inventory deducted');
     
        // Staff notification
        await notifyOrderEvent({
          settingsKey: 'orderAlerts',
          type: 'order',
          message: `Payment completed for order #${verificationResult.orderId}`,
          relatedOrderId: verificationResult.orderId,
          targetRole: 'CASHIER,ADMIN',
        });
     
        // Customer notification
        await notifyOrderEvent({
          settingsKey: 'orderAlerts',
          type: 'order',
          message: `Your order #${verificationResult.orderId} payment was successful!`,
          relatedOrderId: verificationResult.orderId,
          userId: completedOrder.customer_id,
          customerPhone: completedOrder.users?.phone,
          customerEmail: completedOrder.users?.email,
        });
     
        console.log('[paymentNotify] Notifications sent for order', verificationResult.orderId);
      } catch (inventoryError) {
        console.error('[paymentNotify] Inventory deduction error:', inventoryError);
        // Still send success response to PayHere, but log the error
      }
    } else if (verificationResult && verificationResult.status === 'FAILED') {
      try {
        console.log('[paymentNotify] Payment failed for order:', verificationResult.orderId);

        // Invalidate caches
        invalidatePaymentCaches(verificationResult.orderId);

        const failedOrder = await failOrder(verificationResult.orderId);

        // Staff notification
        await notifyOrderEvent({
          settingsKey: 'orderAlerts',
          type: 'order',
          message: `Order #${verificationResult.orderId} payment failed`,
          relatedOrderId: verificationResult.orderId,
          targetRole: 'CASHIER,ADMIN',
        });

        // Customer notification
        await notifyOrderEvent({
          settingsKey: 'orderAlerts',
          type: 'order',
          message: `Your order #${verificationResult.orderId} payment failed. Please try again.`,
          relatedOrderId: verificationResult.orderId,
          userId: failedOrder.customer_id,
          customerPhone: failedOrder.users?.phone,
          customerEmail: failedOrder.users?.email,
        });

        console.log('[paymentNotify] Failure notifications sent for order', verificationResult.orderId);
      } catch (failError) {
        console.error('[paymentNotify] Error handling failed payment:', failError);
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

    // Check cache
    const cacheKey = `${CACHE_KEYS.PAYMENT_STATUS_PREFIX}${orderId}`;
    const cachedPayment = cache.get(cacheKey);
    if (cachedPayment) {
      console.log('[getPaymentStatusById] Returning cached payment status');
      return res.json({ 
        success: true, 
        payment: cachedPayment,
        fromCache: true 
      });
    }

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
    
    // Store in cache
    cache.set(cacheKey, payment, CACHE_TTL.PAYMENT_STATUS);
    
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

    // Check cache
    const cacheKey = `${CACHE_KEYS.PAYMENT_HISTORY_PREFIX}${userId}`;
    const cachedHistory = cache.get(cacheKey);
    if (cachedHistory) {
      console.log('[getPaymentHistoryByUser] Returning cached payment history');
      return res.json({ 
        success: true, 
        history: cachedHistory,
        fromCache: true 
      });
    }

    const history = await getPaymentHistory(userId);
    
    // Store in cache
    cache.set(cacheKey, history, CACHE_TTL.PAYMENT_HISTORY);
    
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
      .select('payment_status, customer_id')
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

    // Invalidate caches
    invalidatePaymentCaches(orderId, order.customer_id);

    res.json({ 
      success: true, 
      message: 'Order completed successfully', 
      order: completedOrder,
      cacheInvalidated: true
    });
  } catch (err) {
    console.error('[manuallyCompleteOrder] Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ========== CLEAR PAYMENT CACHE (Admin Utility) ==========
const clearPaymentCache = async (req, res) => {
  try {
    const { orderId, userId } = req.query;
    
    if (orderId) {
      invalidatePaymentCaches(orderId, userId);
      res.status(200).json({ 
        success: true, 
        message: `Payment cache cleared for order: ${orderId}` 
      });
    } else {
      // Clear all payment-related caches
      const keys = cache.keys();
      let clearedCount = 0;
      
      const patterns = [
        CACHE_KEYS.PAYMENT_STATUS_PREFIX,
        CACHE_KEYS.PAYMENT_HISTORY_PREFIX,
      ];
      
      for (const key of keys) {
        for (const pattern of patterns) {
          if (key.startsWith(pattern)) {
            cache.del(key);
            clearedCount++;
            break;
          }
        }
      }
      
      res.status(200).json({ 
        success: true, 
        message: `Cleared ${clearedCount} payment cache entries`,
        clearedCount 
      });
    }
  } catch (error) {
    console.error('[clearPaymentCache] Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to clear cache' });
  }
};

// ========== GET CACHE STATS (Admin Utility) ==========
const getCacheStats = async (req, res) => {
  try {
    const stats = cache.stats();
    const keys = cache.keys();
    
    const paymentKeys = keys.filter(k => 
      k.startsWith(CACHE_KEYS.PAYMENT_STATUS_PREFIX) ||
      k.startsWith(CACHE_KEYS.PAYMENT_HISTORY_PREFIX)
    );
    
    res.status(200).json({
      success: true,
      cacheStats: stats,
      keyCounts: {
        total: keys.length,
        paymentStatus: keys.filter(k => k.startsWith(CACHE_KEYS.PAYMENT_STATUS_PREFIX)).length,
        paymentHistory: keys.filter(k => k.startsWith(CACHE_KEYS.PAYMENT_HISTORY_PREFIX)).length,
      }
    });
  } catch (error) {
    console.error('[getCacheStats] Error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get cache stats' });
  }
};

module.exports = {
  initiatePayment,
  paymentReturn,
  paymentCancel,
  paymentNotify,
  getPaymentStatusById,
  getPaymentHistoryByUser,
  manuallyCompleteOrder,
  clearPaymentCache,
  getCacheStats
};