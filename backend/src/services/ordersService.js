// backend/src/services/ordersService.js
const supabase = require('../config/db');

/**
 * Fetch all orders with customer info and items
 */
const getAllOrders = async () => {
  // Correct column names: users.name, users.phone
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      users ( id, name, phone )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Supabase error: ${error.message}`);

  // Fetch items for each order
  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      // Correct product column: unit_price
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          *,
          products ( id, name, unit_price )
        `)
        .eq('order_id', order.id);

      if (itemsError) throw new Error(`Items error: ${itemsError.message}`);

      return {
        ...order,
        customer_name: order.users?.name || null,          // changed from full_name
        customer_phone: order.users?.phone || null,
        items: items.map((item) => ({
          ...item,
          product_name: item.products?.name,
          product_price: item.products?.unit_price,       // changed from price
        })),
      };
    })
  );

  return ordersWithItems;
};

/**
 * Fetch all users (for dropdown)
 */
const getAllUsers = async () => {
  // Use 'name' instead of 'full_name'
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone')
    .order('name');

  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data;
};

/**
 * Fetch all products (for dropdown)
 */
const getAllProducts = async () => {
  // Use 'unit_price' instead of 'price'
  const { data, error } = await supabase
    .from('products')
    .select('id, name, unit_price')
    .order('name');

  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data;
};

/**
 * Create a new order with items
 * Expects: { customerId, orderType, paymentMethod, deliveryLocation, items: [{ productId, quantity }] }
 */
const createOrder = async (orderData) => {
  const { customerId, orderType, paymentMethod, deliveryLocation, items } = orderData;

  // 1. Calculate total from product prices (use unit_price)
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, unit_price')
    .in('id', items.map(item => item.productId));

  if (prodError) throw new Error(`Products error: ${prodError.message}`);

  const total = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.unit_price * item.quantity : 0);
  }, 0);

  // 2. Insert order
  const { data: orderInsert, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      order_type: orderType,
      payment_method: paymentMethod,
      payment_status: 'PENDING',
      order_status: 'PLACED',
      total_amount: total,
      delivery_location: deliveryLocation || null,
    })
    .select('id')
    .single();

  if (orderError) throw new Error(`Order insert error: ${orderError.message}`);

  // 3. Insert order items
  const orderItems = items.map((item) => {
    const product = products.find(p => p.id === item.productId);
    return {
      order_id: orderInsert.id,
      product_id: item.productId,
      quantity: item.quantity,
      sub_total: (product ? product.unit_price : 0) * item.quantity,
    };
  });

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItems);

  if (itemsError) throw new Error(`Order items error: ${itemsError.message}`);

  return { id: orderInsert.id, total };
};

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

module.exports = {
  getAllOrders,
  getAllUsers,
  getAllProducts,
  createOrder,
  getOrdersByUserId,
  getOrderById
};