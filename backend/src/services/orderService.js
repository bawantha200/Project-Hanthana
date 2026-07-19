// src/services/ordersService.js
const supabase = require('../config/db'); // adjust path if needed

const getOrdersByUserId = async (userId) => {
  const { data: ordersData, error: ordersError } = await supabase
    .from('orders')
    .select(`
      id,
      order_status,
      total_amount,
      created_at,
      order_items (
        quantity,
        product_id,
        products ( name )
      )
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });

  if (ordersError) {
    throw new Error(`Supabase error: ${ordersError.message}`);
  }

  return ordersData.map(order => {
    const items = order.order_items || [];
    const productNames = items
      .map(item => item.products?.name)
      .filter(Boolean);
    const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const firstProduct = productNames.length > 0 ? productNames[0] : 'No product';
    const productDisplay = productNames.length > 1
      ? `${firstProduct} +${productNames.length - 1} more`
      : firstProduct;

    const statusMap = {
      'PLACED': 'Pending',
      'PROCESSING': 'Preparing',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled'
    };
    const displayStatus = statusMap[order.order_status] || order.order_status;

    const orderId = `ORD-${String(order.id).padStart(4, '0')}`;

    return {
      id: orderId,
      orderId: order.id,        // numeric ID for navigation
      product: productDisplay,
      qty: totalQuantity,
      amount: order.total_amount || 0,
      status: displayStatus,
      date: order.created_at ? new Date(order.created_at).toISOString().slice(0, 10) : '',
    };
  });
};

const getOrderById = async (orderId, userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_type,
      payment_method,
      payment_status,
      order_status,
      total_amount,
      delivery_location,
      created_at,
      customer_id,
      users:customer_id ( name, email, phone, address ),
      order_items (
        quantity,
        sub_total,
        products ( id, name, unit_price, image_url )
      )
    `)
    .eq('id', orderId)
    .eq('customer_id', userId)
    .single();

  if (error) {
    throw new Error(`Supabase error: ${error.message}`);
  }

  const statusMap = {
    'PLACED': 'Pending',
    'PROCESSING': 'Preparing',
    'DELIVERED': 'Delivered',
    'CANCELLED': 'Cancelled'
  };

  const paymentStatusMap = {
    'PENDING': 'Pending',
    'PAID': 'Paid',
    'FAILED': 'Failed'
  };

  return {
    id: `ORD-${String(data.id).padStart(4, '0')}`,
    orderId: data.id,
    orderType: data.order_type,
    paymentMethod: data.payment_method,
    paymentStatus: paymentStatusMap[data.payment_status] || data.payment_status,
    status: statusMap[data.order_status] || data.order_status,
    totalAmount: data.total_amount,
    deliveryLocation: data.delivery_location,
    createdAt: data.created_at,
    customer: data.users ? {
      name: data.users.name,
      email: data.users.email,
      phone: data.users.phone,
      address: data.users.address
    } : null,
    items: data.order_items.map(item => ({
      productId: item.products?.id,
      productName: item.products?.name,
      unitPrice: item.products?.unit_price,
      quantity: item.quantity,
      subTotal: item.sub_total,
      imageUrl: item.products?.image_url
    }))
  };
};

module.exports = { getOrdersByUserId, getOrderById };