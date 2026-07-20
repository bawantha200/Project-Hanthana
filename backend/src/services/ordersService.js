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


  const isCash = paymentMethod === 'CASH';

  const { data: orderInsert, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      order_type: orderType,
      payment_method: paymentMethod,
      payment_status: isCash ? 'COMPLETED' : 'PENDING',   // ✅ cash = paid immediately
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

  // 🆕 customer email එක fetch කරගන්නවා confirmation email එකට
  const { data: customer, error: customerError } = await supabase
    .from('users')
    .select('email, phone')
    .eq('id', customerId)
    .maybeSingle();

  if (customerError) {
    console.warn('⚠️ [createOrder] Could not fetch customer email:', customerError.message);
  }

  return { id: orderInsert.id, total, customerEmail: customer?.email || null,customerPhone: customer?.phone || null,isCash,};
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

// ========== GET DELIVERY PERSONNEL ==========
const getDeliveryPersonnel = async () => {
  console.log('🔍 [getDeliveryPersonnel] Fetching delivery personnel...');

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      phone_number,
      email,
      address,
      role_id,
      roles (role_name)
    `)
    .eq('roles.role_name', 'DELIVERY')
    .order('full_name');

  if (error) {
    console.error('❌ [getDeliveryPersonnel] Error:', error);
    throw new Error(`Failed to fetch delivery personnel: ${error.message}`);
  }

  return data.map(profile => ({
    id: profile.id,
    name: profile.full_name,
    phone: profile.phone_number,
    email: profile.email,
    address: profile.address,
    role: profile.roles?.role_name || 'DELIVERY'
  }));
};

// ========== CREATE DELIVERY RECORD ==========
const createDelivery = async (orderId, deliveryPersonId, assignedBy) => {
  console.log(`🚚 [createDelivery] Creating delivery for order ${orderId}`);

  const { data: existingDelivery, error: checkError } = await supabase
    .from('deliveries')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    throw new Error(`Failed to check existing delivery: ${checkError.message}`);
  }

  if (existingDelivery) {
    const { data, error } = await supabase
      .from('deliveries')
      .update({
        delivery_person_id: deliveryPersonId,
        status: 'ASSIGNED',
        delivery_start_time: new Date().toISOString()
      })
      .eq('id', existingDelivery.id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update delivery: ${error.message}`);
    return data;
  }

  const { data, error } = await supabase
    .from('deliveries')
    .insert({
      order_id: orderId,
      delivery_person_id: deliveryPersonId,
      status: 'ASSIGNED',
      delivery_start_time: new Date().toISOString(),
      delivery_fee: 0
    })
    .select()
    .single();

  if (error) {
    console.error('❌ [createDelivery] Error:', error);
    throw new Error(`Failed to create delivery: ${error.message}`);
  }

  return data;
};

// ========== UPDATE DELIVERY STATUS ==========
const updateDeliveryStatus = async (orderId, status, userId) => {
  console.log(`🔄 [updateDeliveryStatus] Order ${orderId} -> ${status}`);

  const { data: delivery, error: findError } = await supabase
    .from('deliveries')
    .select('id')
    .eq('order_id', orderId)
    .single();

  if (findError) {
    throw new Error(`Delivery not found for order ${orderId}`);
  }

  const updateData = {
    status: status,
    updated_at: new Date().toISOString()
  };

  if (status === 'DELIVERED') {
    updateData.delivery_end_time = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('deliveries')
    .update(updateData)
    .eq('id', delivery.id)
    .select()
    .single();

  if (error) {
    console.error('❌ [updateDeliveryStatus] Error:', error);
    throw new Error(`Failed to update delivery status: ${error.message}`);
  }

  return data;
};

// ========== UPDATE ORDER STATUS ==========
const updateOrderStatus = async (orderId, status, userId) => {
  console.log(`🔄 [updateOrderStatus] Order ${orderId} -> ${status}`);
 
  const { data, error } = await supabase
    .from('orders')
    .update({
      order_status: status,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();
 
  if (error) {
    console.error('❌ [updateOrderStatus] Error:', error);
    throw new Error(`Failed to update order status: ${error.message}`);
  }
  
 
  return data;
};

// ========== ASSIGN DELIVERY PERSON ==========
const assignDeliveryPerson = async (orderId, deliveryPersonId, assignedBy) => {
  console.log(`👤 [assignDeliveryPerson] Order ${orderId} -> ${deliveryPersonId}`);
 
  const delivery = await createDelivery(orderId, deliveryPersonId, assignedBy);
  const order = await updateOrderStatus(orderId, 'PROCESSING', assignedBy);

 
  return { delivery, order };
};

// ========== GET ORDER WITH FULL DETAILS ==========
const getOrderWithDetails = async (orderId) => {
  console.log(`📋 [getOrderWithDetails] Fetching order ${orderId} with details...`);

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
      users!orders_customer_id_fkey (
        id,
        name,
        email,
        phone,
        address
      ),
      order_items (
        id,
        quantity,
        sub_total,
        products (
          id,
          name,
          unit_price,
          image_url,
          description
        )
      ),
      deliveries (
        id,
        status,
        delivery_start_time,
        delivery_end_time,
        delivery_fee,
        collecting_empty_bottles,
        delivery_person_id,
        profiles!deliveries_delivery_person_id_fkey (
          id,
          full_name,
          phone_number,
          email
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('❌ [getOrderWithDetails] Error:', error);
    throw new Error(`Failed to fetch order details: ${error.message}`);
  }

  const delivery = data.deliveries?.[0] || null;
  
  return {
    id: `ORD-${String(data.id).padStart(4, '0')}`,
    orderId: data.id,
    ...data,
    customer: data.users || null,
    delivery: delivery ? {
      id: delivery.id,
      status: delivery.status,
      delivery_start_time: delivery.delivery_start_time,
      delivery_end_time: delivery.delivery_end_time,
      delivery_fee: delivery.delivery_fee,
      collecting_empty_bottles: delivery.collecting_empty_bottles,
      delivery_person: delivery.profiles || null
    } : null,
    items: data.order_items?.map(item => ({
      id: item.id,
      quantity: item.quantity,
      subTotal: item.sub_total,
      product: item.products || null
    })) || []
  };
};

// ========== GET ORDER STATUS HISTORY ==========
const getOrderStatusHistory = async (orderId) => {
  console.log(`📜 [getOrderStatusHistory] Fetching history for order ${orderId}...`);

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      created_at,
      order_status,
      deliveries (
        status,
        delivery_start_time,
        delivery_end_time
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    console.error('❌ [getOrderStatusHistory] Error:', error);
    return [];
  }

  const history = [
    {
      status: 'PLACED',
      created_at: order.created_at,
      users: { name: 'Customer' }
    }
  ];

  if (order.deliveries && order.deliveries.length > 0) {
    const delivery = order.deliveries[0];
    if (delivery.delivery_start_time) {
      history.push({
        status: 'PROCESSING',
        created_at: delivery.delivery_start_time,
        users: { name: 'Admin' }
      });
    }
    if (delivery.delivery_end_time) {
      history.push({
        status: 'DELIVERED',
        created_at: delivery.delivery_end_time,
        users: { name: 'Delivery Person' }
      });
    }
  }

  return history.sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  );
};

module.exports = {
  getAllOrders,
  getAllUsers,
  getAllProducts,
  createOrder,
  getOrdersByUserId,
  getOrderById,
  updateOrderStatus,
  assignDeliveryPerson,
  getDeliveryPersonnel,
  getOrderWithDetails,
  getOrderStatusHistory,
  updateDeliveryStatus,
  createDelivery
};