// backend/src/services/ordersService.js
const supabase = require('../config/db');

// ========== GET ALL ORDERS (Admin) ==========
const getAllOrders = async () => {
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
    console.error('[getAllOrders] Supabase error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }

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
        console.error(`[getAllOrders] Items error for order ${order.id}:`, itemsError);
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

  return ordersWithItems;
};

// ========== GET ALL USERS (for dropdown) ==========
const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, phone')
    .order('name', { ascending: true });

  if (error) {
    console.error('[getAllUsers] Error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }
  return data;
};

// ========== GET ALL PRODUCTS (for dropdown) ==========
const getAllProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, unit_price')
    .order('name', { ascending: true });

  if (error) {
    console.error('[getAllProducts] Error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }
  return data;
};

// ========== DEDUCT INVENTORY (Called after payment completion) ==========
const deductInventory = async (items) => {
  console.log('[deductInventory] Starting inventory deduction for', items.length, 'items');

  if (!items || items.length === 0) {
    return;
  }

  for (const item of items) {
    console.log('[deductInventory] Processing product', item.product_id || item.productId, 'quantity:', item.quantity);

    const productId = item.product_id || item.productId;

    const { data: inventory, error: fetchError } = await supabase
      .from('inventory')
      .select('current_stock, reorder_level')
      .eq('product_id', productId)
      .maybeSingle();

    if (fetchError) {
      console.error('[deductInventory] Fetch error for product', productId, ':', fetchError);
      throw new Error(`Inventory fetch error for product ${productId}: ${fetchError.message}`);
    }

    if (!inventory) {
      console.log('[deductInventory] No inventory found for product', productId, '- creating with default stock');

      const { data: newInventory, error: createError } = await supabase
        .from('inventory')
        .insert({
          product_id: productId,
          current_stock: 100,
          vendor_id: 1,
          reorder_level: 20
        })
        .select('current_stock, reorder_level')
        .single();

      if (createError) {
        console.error('[deductInventory] Create error for product', productId, ':', createError);
        throw new Error(`Failed to create inventory for product ${productId}: ${createError.message}`);
      }

      inventory = newInventory;
    }

    if (inventory.current_stock < item.quantity) {
      console.error('[deductInventory] Insufficient stock for product', productId, 'Available:', inventory.current_stock, 'Required:', item.quantity);
      throw new Error(`Insufficient stock for product ${productId}. Available: ${inventory.current_stock}, Required: ${item.quantity}`);
    }

    const newStock = inventory.current_stock - item.quantity;
    console.log('[deductInventory] Product', productId, 'stock:', inventory.current_stock, '->', newStock);

    const { error: updateError } = await supabase
      .from('inventory')
      .update({
        current_stock: newStock,
        last_updated: new Date().toISOString()
      })
      .eq('product_id', productId);

    if (updateError) {
      console.error('[deductInventory] Update error for product', productId, ':', updateError);
      throw new Error(`Failed to update inventory for product ${productId}: ${updateError.message}`);
    }

    // Low stock alert
    if (newStock <= inventory.reorder_level) {
      console.log('[deductInventory] Low stock alert for product', productId, '- current stock:', newStock, 'reorder level:', inventory.reorder_level);

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('name')
        .eq('id', productId)
        .single();

      if (!productError) {
        await supabase
          .from('notifications')
          .insert({
            target_role: 'ADMIN,CASHIER',
            type: 'inventory',
            message: `Low stock: ${product.name} has only ${newStock} units remaining (Reorder level: ${inventory.reorder_level})`,
            related_order_id: productId,
            created_at: new Date().toISOString()
          });
        console.log('[deductInventory] Low stock notification created for', product.name);
      }
    }
  }

  console.log('[deductInventory] Inventory deduction completed successfully');
};

// ========== CREATE ORDER (Without inventory deduction) ==========
const createOrder = async (orderData) => {
  console.log('[createOrder] Creating new order with', orderData.items?.length || 0, 'items');

  const { customerId, orderType, paymentMethod, deliveryLocation, items } = orderData;

  if (!items || items.length === 0) {
    console.error('[createOrder] No items in order');
    throw new Error('No items in order');
  }

  // Get product prices
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('id, unit_price')
    .in('id', items.map(item => item.productId));

  if (prodError) {
    console.error('[createOrder] Products error:', prodError);
    throw new Error(`Products error: ${prodError.message}`);
  }

  // Calculate total
  const total = items.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId);
    return sum + (product ? product.unit_price * item.quantity : 0);
  }, 0);


  const isCash = paymentMethod === 'CASH';

  console.log('[createOrder] Total amount:', total);

  // Create order with PENDING payment status (inventory NOT deducted yet)
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

  if (orderError) {
    console.error('[createOrder] Order insert error:', orderError);
    throw new Error(`Order insert error: ${orderError.message}`);
  }

  console.log('[createOrder] Order created with ID:', orderInsert.id);

  // Create order items
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

  if (itemsError) {
    console.error('[createOrder] Order items error:', itemsError);
    await supabase.from('orders').delete().eq('id', orderInsert.id);
    throw new Error(`Order items error: ${itemsError.message}`);
  }

  console.log('[createOrder] Created', orderItems.length, 'order items');

  // Fetch customer email
  const { data: customer, error: customerError } = await supabase
    .from('users')
    .select('email, phone')
    .eq('id', customerId)
    .maybeSingle();

  if (customerError) {
    console.warn('[createOrder] Could not fetch customer email:', customerError.message);
  }

  return { id: orderInsert.id, total, customerEmail: customer?.email || null,customerPhone: customer?.phone || null,isCash,};
};

// ========== COMPLETE ORDER (Deduct inventory after payment) ==========
const completeOrder = async (orderId, items) => {
  console.log('[completeOrder] Processing payment completion for order', orderId);

  // Update order payment status to COMPLETED
  const { data: order, error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'COMPLETED',
      order_status: 'PLACED',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (updateError) {
    console.error('[completeOrder] Update error:', updateError);
    throw new Error(`Failed to update order status: ${updateError.message}`);
  }

  console.log('[completeOrder] Order', orderId, 'payment status updated to COMPLETED');

  // Deduct inventory after payment confirmation
  try {
    await deductInventory(items);
    console.log('[completeOrder] Inventory deducted for order', orderId);
  } catch (inventoryError) {
    console.error('[completeOrder] Inventory deduction failed:', inventoryError);
    // Don't rollback the order, but log the error
    // Admin can manually fix inventory
    throw new Error(`Inventory deduction failed: ${inventoryError.message}`);
  }

  return order;
};

// ========== GET ORDERS BY USER ID (Customer) ==========
const getOrdersByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_status,
      payment_status,
      total_amount,
      created_at,
      order_items ( quantity, product_id, products ( name ) )
    `)
    .eq('customer_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[getOrdersByUserId] Error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }

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
    paymentStatus: order.payment_status || 'PENDING',
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
  if (error) {
    console.error('[getOrderById] Error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }

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

// ========== GET ORDER ITEMS BY ORDER ID ==========
const getOrderItems = async (orderId) => {
  const { data, error } = await supabase
    .from('order_items')
    .select(`
      id,
      quantity,
      product_id,
      sub_total
    `)
    .eq('order_id', orderId);

  if (error) {
    console.error('[getOrderItems] Error:', error);
    throw new Error(`Failed to fetch order items: ${error.message}`);
  }

  return data;
};

// ========== GET DELIVERY PERSONNEL ==========
const getDeliveryPersonnel = async () => {
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
    console.error('[getDeliveryPersonnel] Error:', error);
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
  console.log('[createDelivery] Creating delivery for order', orderId);

  const { data: existingDelivery, error: checkError } = await supabase
    .from('deliveries')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('[createDelivery] Check error:', checkError);
    throw new Error(`Failed to check existing delivery: ${checkError.message}`);
  }

  if (existingDelivery) {
    console.log('[createDelivery] Updating existing delivery:', existingDelivery.id);
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

    if (error) {
      console.error('[createDelivery] Update error:', error);
      throw new Error(`Failed to update delivery: ${error.message}`);
    }
    return data;
  }

  console.log('[createDelivery] Creating new delivery for order', orderId);
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
    console.error('[createDelivery] Insert error:', error);
    throw new Error(`Failed to create delivery: ${error.message}`);
  }

  console.log('[createDelivery] Delivery created:', data.id);
  return data;
};

// ========== UPDATE DELIVERY STATUS ==========
const updateDeliveryStatus = async (orderId, status, userId) => {
  console.log('[updateDeliveryStatus] Order', orderId, '->', status);

  const { data: delivery, error: findError } = await supabase
    .from('deliveries')
    .select('id')
    .eq('order_id', orderId)
    .single();

  if (findError) {
    console.error('[updateDeliveryStatus] Delivery not found:', findError);
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
    console.error('[updateDeliveryStatus] Update error:', error);
    throw new Error(`Failed to update delivery status: ${error.message}`);
  }

  console.log('[updateDeliveryStatus] Delivery', delivery.id, 'updated to', status);
  return data;
};

// ========== UPDATE ORDER STATUS ==========
const updateOrderStatus = async (orderId, status, userId) => {
  console.log('[updateOrderStatus] Order', orderId, '->', status);

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
    console.error('[updateOrderStatus] Error:', error);
    throw new Error(`Failed to update order status: ${error.message}`);
  }

  console.log('[updateOrderStatus] Order', orderId, 'updated to', status);
  return data;
};

// ========== ASSIGN DELIVERY PERSON ==========
const assignDeliveryPerson = async (orderId, deliveryPersonId, assignedBy) => {
  console.log('[assignDeliveryPerson] Assigning delivery person', deliveryPersonId, 'to order', orderId);

  const delivery = await createDelivery(orderId, deliveryPersonId, assignedBy);
  const order = await updateOrderStatus(orderId, 'PROCESSING', assignedBy);

  console.log('[assignDeliveryPerson] Delivery assigned successfully');
  return { delivery, order };
};

// ========== GET ORDER WITH FULL DETAILS ==========
const getOrderWithDetails = async (orderId) => {
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
    console.error('[getOrderWithDetails] Error:', error);
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
    console.error('[getOrderStatusHistory] Error:', error);
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
  completeOrder,
  getOrdersByUserId,
  getOrderById,
  updateOrderStatus,
  assignDeliveryPerson,
  getDeliveryPersonnel,
  getOrderWithDetails,
  getOrderStatusHistory,
  updateDeliveryStatus,
  createDelivery,
  getOrderItems,
  deductInventory
};