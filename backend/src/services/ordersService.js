// src/services/orders.service.js
const supabase = require('../config/db');

/**
 * Fetch all orders for a given user (by UUID)
 * including order items and product names.
 */
const getOrdersByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      created_at,
      order_status,
      total_amount,
      order_items (
        quantity,
        sub_total,
        products ( name )
      )
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  // Transform to frontend-friendly format
  return data.map(order => {
    const firstItem = order.order_items?.[0];
    const productName = firstItem?.products?.name || 'Product';
    const status = order.order_status || 'Placed';
    const date = order.created_at
      ? new Date(order.created_at).toLocaleDateString('en-US')
      : '';

    return {
      id: order.id,
      product_name: productName,
      date,
      status,
      amount: order.total_amount || 0,
    };
  });
};

module.exports = { getOrdersByUserId };