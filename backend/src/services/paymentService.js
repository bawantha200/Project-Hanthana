// backend/src/services/paymentService.js
const crypto = require('crypto');
const supabase = require('../config/db');
const { sendOrderConfirmationEmail } = require('../utils/mailer');

// PayHere configuration
const PAYHERE_CONFIG = {
  merchantId: process.env.PAYHERE_MERCHANT_ID || '1236932',
  merchantSecret: process.env.PAYHERE_MERCHANT_SECRET || 'MTUwODY5ODIwMzYzODI1MDQxNjI3OTI1MDk1OTMzNDY4MjE5OTU4',
  baseUrl: 'https://sandbox.payhere.lk',
};

/**
 * FIXED: PayHere Hash Generation for Checkout (Frontend/Initiation)
 * Formula: UpperCase(MD5(merchant_id + order_id + amount + currency + UpperCase(MD5(merchant_secret))))
 */
const generatePayHereHash = (merchantId, orderId, amount, currency, merchantSecret) => {
  // Merchant Secret එක මුලින්ම MD5 කරලා Capital කරගන්න ඕනේ
  const hashedSecret = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  
  // ඊට පස්සේ තමයි full string එක concatenate කරන්නේ
  const hashString = merchantId + orderId + amount + currency + hashedSecret;
  console.log('🔑 Checkout Hash String:', hashString);
  
  const hash = crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
  console.log('🔑 Generated Checkout Hash:', hash);
  return hash;
};

/**
 * Generate payment data for PayHere (Initiation)
 */
const generatePayHerePayment = async ({ orderId, amount, customer, paymentMethod = 'ONLINE' }) => {
  try {
    // Format order ID as 6-digit number (e.g., "000212")
    const orderRef = String(orderId).padStart(6, '0');
    
    // PayHere එකට amount එක දශමස්ථාන 2ක් ඇතුව string එකක් විදිහට දෙන්න ඕනේ (e.g., "360.00")
    const amountPlain = Number(amount).toFixed(2);

    // Get customer details
    const customerName = customer?.name || 'Customer';
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] || 'Customer';
    const lastName = nameParts.slice(1).join(' ') || ' ';

    // Generate hash using the formatted orderRef
    const hash = generatePayHereHash(
      PAYHERE_CONFIG.merchantId,
      orderRef,
      amountPlain,
      'LKR',
      PAYHERE_CONFIG.merchantSecret
    );

    console.log('🔑 [generatePayHerePayment]');
    console.log('  Numeric Order ID:', orderId);
    console.log('  Order Ref:', orderRef);
    console.log('  Amount:', amountPlain);
    console.log('  Hash:', hash);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    return {
      merchant_id: PAYHERE_CONFIG.merchantId,
      order_id: orderRef,
      items: `Water Order #${orderId}`,
      amount: amountPlain,
      currency: 'LKR',
      hash: hash,
      first_name: firstName,
      last_name: lastName,
      email: customer?.email || '',
      phone: customer?.phone || '',
      address: customer?.address || 'No Address',
      city: 'Colombo',
      country: 'Sri Lanka',
      delivery_address: customer?.address || 'No Address',
      delivery_city: 'Colombo',
      delivery_country: 'Sri Lanka',
      custom_1: `OrderID:${orderId}`,
      custom_2: paymentMethod,
      return_url: `${frontendUrl}/payment-result`,
      cancel_url: `${frontendUrl}/payment-cancel`,
      notify_url: `${backendUrl}/api/payments/notify`,
    };
  } catch (error) {
    console.error('💥 [generatePayHerePayment] Error:', error);
    throw error;
  }
};

/**
 * FIXED: Verify payment notification from PayHere (IPN/Notify URL)
 * Formula: UpperCase(MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + UpperCase(MD5(merchant_secret))))
 */
const verifyPaymentNotification = async (notificationData) => {
  try {
    const {
      merchant_id,
      order_id,          // e.g., "000212"
      payment_id,
      status_code,       // e.g., "2"
      payhere_amount,    // e.g., "360.00"
      payhere_currency,  // e.g., "LKR"
      md5sig,            // PayHere එකෙන් එවපු original hash එක
      custom_1,
    } = notificationData;

    console.log('📨 [verifyPaymentNotification]');
    console.log('  Order ID (from PayHere):', order_id);
    console.log('  Amount:', payhere_amount);
    console.log('  Received Hash:', md5sig);

    // 1. Extract numeric order ID from custom_1
    let numericOrderId = null;
    if (custom_1) {
      const match = custom_1.match(/OrderID:(\d+)/);
      if (match) numericOrderId = match[1];
    }
    
    if (!numericOrderId) {
      throw new Error('Invalid order ID format');
    }

    console.log('  Numeric Order ID (for DB):', numericOrderId);

    // 2. PayHere IPN (Notify) verification string එක හදනවා
    // A. Merchant Secret එක MD5 කරලා Capital කරගන්නවා
    const hashedSecret = crypto
      .createHash('md5')
      .update(PAYHERE_CONFIG.merchantSecret)
      .digest('hex')
      .toUpperCase();

    // B. PayHere IPN එකට අදාල පිළිවෙලට String එක සකස් කරනවා
    const hashString = 
      (merchant_id || PAYHERE_CONFIG.merchantId) + 
      order_id + 
      payhere_amount + 
      (payhere_currency || 'LKR') + 
      status_code + 
      hashedSecret;

    console.log('🔑 IPN Verification Hash String:', hashString);

    // C. මුළු String එකම නැවත MD5 කරලා Capital කරනවා
    const generatedHash = crypto
      .createHash('md5')
      .update(hashString)
      .digest('hex')
      .toUpperCase();

    console.log('  Generated Hash:', generatedHash);
    console.log('  Match:', generatedHash === md5sig);

    if (generatedHash !== md5sig) {
      throw new Error('Invalid hash');
    }

    console.log('✅ Hash verification passed!');

    // Determine payment status
    let paymentStatus = 'FAILED';
    let orderStatus = 'PENDING';
    
    if (status_code === '2') {
      paymentStatus = 'COMPLETED';
      orderStatus = 'PLACED';
    } else if (status_code === '1') {
      paymentStatus = 'PENDING';
      orderStatus = 'PLACED';
    }

    const actualOrderId = parseInt(numericOrderId, 10);

    // Update or create payment record
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', actualOrderId)
      .single();

    if (existingPayment) {
      await supabase
        .from('payments')
        .update({
          status: paymentStatus,
          transaction_id: payment_id || existingPayment.transaction_id,
          paid_at: paymentStatus === 'COMPLETED' ? new Date().toISOString() : null,
        })
        .eq('id', existingPayment.id);
    } else {
      await supabase
        .from('payments')
        .insert({
          order_id: actualOrderId,
          amount: parseFloat(payhere_amount),
          payment_method: 'ONLINE',
          status: paymentStatus,
          transaction_id: payment_id || `TXN-${Date.now()}`,
          paid_at: paymentStatus === 'COMPLETED' ? new Date().toISOString() : null,
        });
    }

    
    // Update order
    await supabase
      .from('orders')
      .update({
        payment_status: paymentStatus,
        order_status: orderStatus,
      })
      .eq('id', actualOrderId);

    console.log(`✅ Order #${actualOrderId} updated to:`, orderStatus);

    // 🆕 Payment success වුණාට පස්සේ විතරක් customer confirmation email එක යවනවා
    if (paymentStatus === 'COMPLETED') {
      try {
        const { data: notifSetting } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'notifications')
          .maybeSingle();

        const settings = notifSetting?.value || {};
        const emailEnabled = settings.emailNotifications !== false;

        console.log('🔍 [DEBUG] emailNotifications value:', settings.emailNotifications);
        console.log('🔍 [DEBUG] emailEnabled computed:', emailEnabled);

        if (emailEnabled) {
          const { data: orderWithCustomer, error: fetchError } = await supabase
            .from('orders')
            .select('id, total_amount, users ( email )')
            .eq('id', actualOrderId)
            .single();

          if (fetchError) {
            console.warn('⚠️ [verifyPaymentNotification] Could not fetch customer for email:', fetchError.message);
          } else if (orderWithCustomer?.users?.email) {
            await sendOrderConfirmationEmail({
              customerEmail: orderWithCustomer.users.email,
              subject: `Order #${actualOrderId} Payment Confirmed`,
              message: `Thank you! Your payment for Order #${actualOrderId} (Total: Rs. ${orderWithCustomer.total_amount}) has been confirmed and your order is being processed.`,
            });
          } else {
            console.warn(`⚠️ [verifyPaymentNotification] No customer email found for order #${actualOrderId}`);
          }
        } else {
          console.log('📭 [verifyPaymentNotification] Email notifications disabled — skipping confirmation email.');
        }
      } catch (mailErr) {
        console.error('❌ [verifyPaymentNotification] Confirmation email failed:', mailErr.message);
      }
    }

    return { success: true, orderId: actualOrderId, status: paymentStatus };
  } catch (error) {
    console.error('💥 [verifyPaymentNotification] Error:', error);
    throw error;
  }
};

/**
 * Get payment status
 */
const getPaymentStatus = async (orderId) => {
  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      return { status: 'NOT_FOUND', order_id: orderId };
    }

    return payment;
  } catch (error) {
    console.error('💥 [getPaymentStatus] Error:', error);
    throw error;
  }
};

/**
 * Get payment history for user
 */
const getPaymentHistory = async (userId) => {
  try {
    const { data: payments, error } = await supabase
      .from('payments')
      .select(`
        *,
        orders (
          id,
          total_amount,
          order_status,
          created_at
        )
      `)
      .eq('orders.customer_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return payments || [];
  } catch (error) {
    console.error('💥 [getPaymentHistory] Error:', error);
    throw error;
  }
};

module.exports = {
  generatePayHerePayment,
  verifyPaymentNotification,
  getPaymentStatus,
  getPaymentHistory,
};