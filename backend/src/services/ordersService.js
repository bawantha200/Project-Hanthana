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
  customer_name: order.users?.name || order.customer_name || 'Walk-in Customer',
  customer_phone: order.users?.phone || order.customer_phone || null,
  items: items.map((item) => ({
    ...item,
    product_name: item.products?.name,
    product_price: item.products?.unit_price,
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
  const { customerId, customerName, customerPhone, orderType, paymentMethod, deliveryLocation, items } = orderData;

  // 1. Calculate total from product prices
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, unit_price')
    .in('id', items.map(item => item.productId));

  if (prodError) throw new Error(`Products error: ${prodError.message}`);

  const total = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.unit_price * item.quantity : 0);
  }, 0);

  // 2. Insert order (customer_id null-able, walk-in fields added)
  const { data: orderInsert, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId || null,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
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

module.exports = {
  getAllOrders,
  getAllUsers,
  getAllProducts,
  createOrder,
};