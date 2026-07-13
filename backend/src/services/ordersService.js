// backend/src/services/ordersService.js
const supabase = require('../config/db');

// ========== GET ALL ORDERS (Admin) ==========
const getAllOrders = async () => {
  console.log('🔍 [getAllOrders] Fetching all orders...');

  const { data: orders, error } = await supabase
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
      users ( id, name, phone )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ [getAllOrders] Supabase error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }

  console.log(`📦 [getAllOrders] Found ${orders.length} orders`);

  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select(`
          id,
          quantity,
          sub_total,
          products ( id, name, unit_price )
        `)
        .eq('order_id', order.id);

      if (itemsError) {
        console.error(`❌ [getAllOrders] Items error for order ${order.id}:`, itemsError);
        throw new Error(`Items error: ${itemsError.message}`);
      }

      return {
        ...order,
        customer_name: order.users?.name || null,
        customer_phone: order.users?.phone || null,
        items: items.map((item) => ({
          id: item.id,
          quantity: item.quantity,
          sub_total: item.sub_total,
          product_id: item.products?.id,
          product_name: item.products?.name,
          unit_price: item.products?.unit_price,
        })),
      };
    })
  );

  console.log(`✅ [getAllOrders] Returning ${ordersWithItems.length} orders with items`);
  return ordersWithItems;
};

// ========== GET ALL USERS (for dropdown) ==========
const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone')
    .order('name', { ascending: true });

  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data;
};

// ========== GET ALL PRODUCTS (for dropdown) ==========
const getAllProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, unit_price')
    .order('name', { ascending: true });

  if (error) throw new Error(`Supabase error: ${error.message}`);
  return data;
};

// ========== CREATE ORDER ==========
const createOrder = async (orderData) => {
  const { customerId, orderType, paymentMethod, deliveryLocation, items } = orderData;

  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, unit_price')
    .in('id', items.map(item => item.productId));

  if (prodError) throw new Error(`Products error: ${prodError.message}`);

  const total = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.unit_price * item.quantity : 0);
  }, 0);

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

// ========== GET ORDERS BY USER ID (Customer) ==========
const getOrdersByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_status,
      total_amount,
      created_at,
      order_items ( quantity, product_id, products ( name ) )
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Supabase error: ${error.message}`);

  return data.map(order => ({
    id: order.id,
    orderId: order.id,
    product: order.order_items?.[0]?.products?.name || 'No product',
    qty: order.order_items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
    amount: order.total_amount || 0,
    status: order.order_status === 'PLACED' ? 'Pending' :
            order.order_status === 'PROCESSING' ? 'Preparing' :
            order.order_status === 'DELIVERED' ? 'Delivered' :
            order.order_status === 'CANCELLED' ? 'Cancelled' : order.order_status,
    date: order.created_at?.slice(0, 10) || '',
  }));
};

// ========== GET SINGLE ORDER (with optional admin bypass) ==========
const getOrderById = async (orderId, userId, isAdmin = false) => {
  let query = supabase
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
      users ( name, email, phone, address ),
      order_items ( quantity, sub_total, products ( id, name, unit_price, image_url ) )
    `)
    .eq('id', orderId);

  if (!isAdmin) {
    query = query.eq('customer_id', userId);
  }

  const { data, error } = await query.single();
  if (error) throw new Error(`Supabase error: ${error.message}`);

  return {
    id: `ORD-${String(data.id).padStart(4, '0')}`,
    orderId: data.id,
    orderType: data.order_type,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    status: data.order_status,
    totalAmount: data.total_amount,
    deliveryLocation: data.delivery_location,
    createdAt: data.created_at,
    customer: data.users ? {
      name: data.users.name,
      email: data.users.email,
      phone: data.users.phone,
      address: data.users.address,
    } : null,
    items: data.order_items.map(item => ({
      productId: item.products?.id,
      productName: item.products?.name,
      unitPrice: item.products?.unit_price,
      quantity: item.quantity,
      subTotal: item.sub_total,
      imageUrl: item.products?.image_url,
    })),
  };
};

module.exports = {
  getAllOrders,
  getAllUsers,
  getAllProducts,
  createOrder,
  getOrdersByUserId,
  getOrderById,
};