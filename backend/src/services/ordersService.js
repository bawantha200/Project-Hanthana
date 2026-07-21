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
    (orders || []).map(async (order) => {
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
        items: (items || []).map((item) => ({
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
    .select('id, name, phone, email, address')
    .order('name', { ascending: true });

  if (error) {
    console.error('[getAllUsers] Error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }
  return data || [];
};

// ========== GET ALL PRODUCTS (for dropdown) ==========
const getAllProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, unit_price, image_url, type, description')
    .order('name', { ascending: true });

  if (error) {
    console.error('[getAllProducts] Error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }
  return data || [];
};

// ========== DEDUCT INVENTORY (Called after payment completion) ==========
const deductInventory = async (items) => {
  console.log('[deductInventory] Starting inventory deduction for', items?.length || 0, 'items');

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
          reorder_level: 20
        })
        .select('current_stock, reorder_level')
        .single();

      if (createError) {
        console.error('[deductInventory] Create error for product', productId, ':', createError);
        throw new Error(`Failed to create inventory for product ${productId}: ${createError.message}`);
      }

      // Assign the new inventory
      Object.assign(inventory, newInventory);
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

      if (!productError && product) {
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

// ========== CREATE ORDER ==========
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
    const product = products?.find(p => p.id === item.productId);
    return sum + (product ? product.unit_price * item.quantity : 0);
  }, 0);

  const isCash = paymentMethod === 'CASH';

  console.log('[createOrder] Total amount:', total);
  console.log('[createOrder] Is Cash:', isCash);

  // Create order
  const { data: orderInsert, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      order_type: orderType,
      payment_method: paymentMethod,
      payment_status: isCash ? 'COMPLETED' : 'PENDING',
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
    const product = products?.find(p => p.id === item.productId);
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

  // For CASH payments, deduct inventory immediately
  if (isCash) {
    try {
      console.log('[createOrder] Deducting inventory for cash order...');
      await deductInventory(items);
      console.log('[createOrder] Inventory deducted successfully');
      
      const orderStatus = orderType === 'PICKUP' ? 'COMPLETED' : 'PLACED';
      await supabase
        .from('orders')
        .update({
          order_status: orderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderInsert.id);
      
      console.log('[createOrder] Order status updated to:', orderStatus);
    } catch (inventoryError) {
      console.error('[createOrder] Inventory deduction failed:', inventoryError);
      // Don't throw - order is already created, but log the error
    }
  }

  // Fetch customer details
  const { data: customer, error: customerError } = await supabase
    .from('users')
    .select('email, phone, name, address')
    .eq('id', customerId)
    .maybeSingle();

  if (customerError) {
    console.warn('[createOrder] Could not fetch customer details:', customerError.message);
  }

  return { 
    id: orderInsert.id, 
    total, 
    customerEmail: customer?.email || null,
    customerPhone: customer?.phone || null,
    customerName: customer?.name || null,
    customerAddress: customer?.address || null,
    isCash,
  };
};

// ========== COMPLETE ORDER (Deduct inventory after payment) ==========
const completeOrder = async (orderId, items) => {
  console.log('[completeOrder] Processing payment completion for order', orderId);
  console.log('[completeOrder] Items:', JSON.stringify(items, null, 2));

  if (!orderId) {
    throw new Error('Order ID is required');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Items are required to complete order');
  }

  // First, get the order to check order_type
  const { data: orderData, error: fetchError } = await supabase
    .from('orders')
    .select('order_type, payment_status')
    .eq('id', orderId)
    .single();

  if (fetchError) {
    console.error('[completeOrder] Fetch error:', fetchError);
    throw new Error(`Failed to fetch order: ${fetchError.message}`);
  }

  // Check if order is already completed
  if (orderData.payment_status === 'COMPLETED') {
    console.log('[completeOrder] Order already completed');
    return orderData;
  }

  // Determine order status based on order type
  const orderStatus = orderData.order_type === 'PICKUP' ? 'COMPLETED' : 'PLACED';

  // Update order payment status and order status
  const { data: order, error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'COMPLETED',
      order_status: orderStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select()
    .single();

  if (updateError) {
    console.error('[completeOrder] Update error:', updateError);
    throw new Error(`Failed to update order status: ${updateError.message}`);
  }

  console.log('[completeOrder] Order', orderId, 'payment status updated to COMPLETED, order status:', orderStatus);

  // Deduct inventory after payment confirmation
  try {
    await deductInventory(items);
    console.log('[completeOrder] Inventory deducted for order', orderId);
  } catch (inventoryError) {
    console.error('[completeOrder] Inventory deduction failed:', inventoryError);
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

  return (data || []).map(order => ({
    id: order.id,
    orderId: order.id,
    product: order.order_items?.[0]?.products?.name || 'No product',
    qty: order.order_items?.reduce((sum, i) => sum + i.quantity, 0) || 0,
    amount: order.total_amount || 0,
    status: order.order_status === 'PLACED' ? 'Pending' :
            order.order_status === 'PROCESSING' ? 'Preparing' :
            order.order_status === 'DELIVERED' ? 'Delivered' :
            order.order_status === 'COMPLETED' ? 'Completed' :
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
    items: (data.order_items || []).map(item => ({
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

  return data || [];
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

  return (data || []).map(profile => ({
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

// backend/src/services/ordersService.js

// ========== GET CURRENT WATER PRICE ==========
const getWaterPrice = async () => {
  try {
    console.log('[getWaterPrice] Fetching water price from database...');
    
    // Try to get active price
    const { data, error } = await supabase
      .from('water_pricing')
      .select('price_per_liter')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // If no active price found, try to get any price
      if (error.code === 'PGRST116') {
        console.log('[getWaterPrice] No active price found, looking for any price...');
        const { data: anyData, error: anyError } = await supabase
          .from('water_pricing')
          .select('price_per_liter')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!anyError && anyData) {
          console.log('[getWaterPrice] Found price:', anyData.price_per_liter);
          return parseFloat(anyData.price_per_liter) || 50.00;
        }

        // No data at all - insert default
        console.log('[getWaterPrice] No data found, inserting default price...');
        const { data: insertData, error: insertError } = await supabase
          .from('water_pricing')
          .insert({
            price_per_liter: 50.00,
            is_active: true
          })
          .select()
          .single();

        if (insertError) {
          console.error('[getWaterPrice] Insert error:', insertError);
          return 50.00;
        }

        console.log('[getWaterPrice] Default price inserted:', insertData);
        return 50.00;
      }

      console.error('[getWaterPrice] Supabase error:', error);
      return 50.00;
    }

    const price = parseFloat(data.price_per_liter);
    console.log('[getWaterPrice] Active price found:', price);
    return price || 50.00;
  } catch (error) {
    console.error('[getWaterPrice] Error:', error);
    return 50.00;
  }
};

// ========== UPDATE WATER PRICE ==========
const updateWaterPrice = async (pricePerLiter, userId) => {
  try {
    // Get profile ID from user ID
    let profileId = null;
    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (!profileError && profile) {
        profileId = profile.id;
      }
    }

    // Set all existing records to inactive
    await supabase
      .from('water_pricing')
      .update({ is_active: false })
      .neq('id', 0);

    // Insert new price
    const { data, error } = await supabase
      .from('water_pricing')
      .insert({
        price_per_liter: pricePerLiter,
        updated_by: profileId,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('[updateWaterPrice] Error:', error);
      throw new Error(`Failed to update water price: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('[updateWaterPrice] Error:', error);
    throw error;
  }
};

// ========== CREATE BULK WATER ORDER ==========
const createBulkWaterOrder = async (orderData) => {
  console.log('[createBulkWaterOrder] Creating bulk water order:', orderData);

  const { customerId, customerName, customerPhone, liters, pricePerLiter, paymentMethod } = orderData;

  if (!liters || liters <= 0) {
    throw new Error('Liters must be greater than 0');
  }

  const totalAmount = liters * pricePerLiter;

  const { data, error } = await supabase
    .from('bulk_water_orders')
    .insert({
      customer_id: customerId || null,
      customer_name: customerName || 'Walk-in Customer',
      customer_phone: customerPhone || null,
      liters: liters,
      price_per_liter: pricePerLiter,
      total_amount: totalAmount,
      payment_method: paymentMethod || 'CASH',
      payment_status: 'COMPLETED'
    })
    .select()
    .single();

  if (error) {
    console.error('[createBulkWaterOrder] Error:', error);
    throw new Error(`Failed to create bulk water order: ${error.message}`);
  }

  console.log('[createBulkWaterOrder] Bulk water order created:', data.id);
  return data;
};

// ========== GET BULK WATER ORDERS ==========
const getBulkWaterOrders = async (limit = 100) => {
  try {
    const { data, error } = await supabase
      .from('bulk_water_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getBulkWaterOrders] Error:', error);
      throw new Error(`Failed to fetch bulk water orders: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('[getBulkWaterOrders] Error:', error);
    return [];
  }
};

// ========== EXPORTS ==========
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
  deductInventory,
  getWaterPrice,       
  updateWaterPrice,    
  createBulkWaterOrder,
  getBulkWaterOrders   
};