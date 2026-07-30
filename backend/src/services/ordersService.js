// backend/src/services/ordersService.js
const supabase = require('../config/db');
const { calculateDeliveryFee, getDeliveryFeeConfig } = require('./deliveryFeeService');

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
      delivery_fee,
      created_at,
      users ( id, name, phone ),
      order_delivery_locations ( address, latitude, longitude )
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

      const deliveryLocation = order.order_delivery_locations?.[0] || null;

      return {
        ...order,
        customer_name: order.users?.name || null,
        customer_phone: order.users?.phone || null,
        delivery_location: deliveryLocation?.address || null,
        delivery_latitude: deliveryLocation?.latitude || null,
        delivery_longitude: deliveryLocation?.longitude || null,
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

// ========== GET ALL USERS ==========
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

// ========== GET ALL PRODUCTS ==========
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

// ========== DEDUCT INVENTORY ==========
const deductInventory = async (items) => {
  console.log('[deductInventory] Starting inventory deduction for', items?.length || 0, 'items');

  if (!items || items.length === 0) {
    console.log('[deductInventory] No items to deduct');
    return;
  }

  for (const item of items) {
    const productId = item.product_id || item.productId;
    const quantity = Number(item.quantity) || 0;

    if (!productId || quantity <= 0) continue;

    const { data: existingInventory, error: fetchError } = await supabase
      .from('inventory')
      .select('current_stock, reorder_level')
      .eq('product_id', productId)
      .maybeSingle();

    if (fetchError) {
      console.error('[deductInventory] Fetch error for product', productId, ':', fetchError);
      throw new Error(`Inventory fetch error for product ${productId}: ${fetchError.message}`);
    }

    let inventoryRow = existingInventory;

    if (!inventoryRow) {
      const { data: newInventory, error: createError } = await supabase
        .from('inventory')
        .insert({
          product_id: productId,
          current_stock: 100,
          reorder_level: 20,
          last_updated: new Date().toISOString()
        })
        .select('current_stock, reorder_level')
        .single();

      if (createError) {
        console.error('[deductInventory] Create error for product', productId, ':', createError);
        throw new Error(`Failed to create inventory for product ${productId}: ${createError.message}`);
      }

      inventoryRow = newInventory;
    }

    const currentStock = inventoryRow.current_stock ?? 0;
    const reorderLevel = inventoryRow.reorder_level ?? 20;

    if (currentStock < quantity) {
      console.error('[deductInventory] Insufficient stock for product', productId);
      throw new Error(`Insufficient stock for product ${productId}. Available: ${currentStock}, Required: ${quantity}`);
    }

    const newStock = currentStock - quantity;

    const { data: updateResult, error: updateError } = await supabase
      .from('inventory')
      .update({
        current_stock: newStock,
        last_updated: new Date().toISOString()
      })
      .eq('product_id', productId)
      .select('product_id, current_stock');

    if (updateError) {
      console.error('[deductInventory] Update error for product', productId, ':', updateError);
      throw new Error(`Failed to update inventory for product ${productId}: ${updateError.message}`);
    }

    if (!updateResult || updateResult.length === 0) {
      throw new Error(`Inventory update affected 0 rows for product ${productId}.`);
    }

    if (newStock <= reorderLevel) {
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
            message: `Low stock: ${product.name} has only ${newStock} units remaining (Reorder level: ${reorderLevel})`,
            related_order_id: productId,
            created_at: new Date().toISOString()
          });
      }
    }
  }

  console.log('[deductInventory] Inventory deduction completed successfully');
};

// ========== CREATE ORDER ==========

const createOrder = async (orderData) => {
  console.log('[createOrder] Creating new order with', orderData.items?.length || 0, 'items');
  console.log('[createOrder] Received orderData:', JSON.stringify(orderData, null, 2));

  const { customerId, orderType, paymentMethod, deliveryAddress, items, latitude, longitude } = orderData;

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

  // ✅ Calculate delivery fee if home delivery
  let deliveryFee = 0;
  let deliveryLatitude = latitude || null;
  let deliveryLongitude = longitude || null;
  
  // ✅ IMPORTANT: Use the customer's selected delivery address, NOT the store address
  let deliveryAddressText = deliveryAddress || null;

  console.log('[createOrder] Received latitude from frontend:', latitude);
  console.log('[createOrder] Received longitude from frontend:', longitude);
  console.log('[createOrder] Received deliveryAddress from frontend:', deliveryAddress);

  if (orderType === 'HOME_DELIVERY' && deliveryAddress) {
    try {
      console.log('[createOrder] Calculating delivery fee for address:', deliveryAddress);
      
      const feeResult = await calculateDeliveryFee(deliveryAddress, total);
      console.log('[createOrder] Fee result:', JSON.stringify(feeResult, null, 2));
      
      // ✅ Extract delivery fee from the result
      if (feeResult && feeResult.data) {
        deliveryFee = feeResult.data.delivery_fee || 0;
        
        // ✅ If we don't have coordinates from the frontend, use the ones from geocoding
        if (!deliveryLatitude && feeResult.data.to_lat) {
          deliveryLatitude = feeResult.data.to_lat;
          deliveryLongitude = feeResult.data.to_lng;
          // ✅ Use the formatted address from geocoding as fallback
          if (feeResult.data.store_address && !deliveryAddressText) {
            deliveryAddressText = feeResult.data.store_address;
          }
        }
      } else if (feeResult && typeof feeResult.delivery_fee === 'number') {
        deliveryFee = feeResult.delivery_fee || 0;
      }
      
      console.log('[createOrder] Final delivery fee:', deliveryFee);
      console.log('[createOrder] Final delivery address:', deliveryAddressText);
      console.log('[createOrder] Final coordinates:', deliveryLatitude, deliveryLongitude);
    } catch (error) {
      console.error('[createOrder] ❌ Delivery fee calculation error:', error);
      try {
        const config = await getDeliveryFeeConfig();
        deliveryFee = config.base_fee || 350;
      } catch (configError) {
        deliveryFee = 350;
      }
    }
  } else {
    // ✅ For PICKUP, set a clear description
    deliveryAddressText = 'Pickup at store';
  }

  const isCash = paymentMethod === 'CASH';
  const paymentStatus = 'PENDING';

  // ✅ INSERT ORDER - delivery_location should be the customer's address
  console.log('[createOrder] Inserting order with:');
  console.log('[createOrder]   - delivery_location (customer address):', deliveryAddressText);
  console.log('[createOrder]   - delivery_fee:', deliveryFee);
  
  const { data: orderInsert, error: orderError } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      order_type: orderType,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      order_status: orderType === 'PICKUP' ? 'PLACED' : 'COMPLETED',
      total_amount: total,
      delivery_fee: deliveryFee,
      delivery_location: deliveryAddressText, // ✅ This should be the customer's address
    })
    .select('id')
    .single();

  if (orderError) {
    console.error('[createOrder] ❌ Order insert error:', orderError);
    throw new Error(`Order insert error: ${orderError.message}`);
  }

  console.log('[createOrder] ✅ Order created with ID:', orderInsert.id);

  // Insert order items
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
    console.error('[createOrder] ❌ Order items error:', itemsError);
    await supabase.from('orders').delete().eq('id', orderInsert.id);
    throw new Error(`Order items error: ${itemsError.message}`);
  }

  console.log('[createOrder] ✅ Created', orderItems.length, 'order items');

  // ✅ INSERT DELIVERY LOCATION - Use the customer's address and coordinates
  if (orderType === 'HOME_DELIVERY') {
    // ✅ Use the customer's address from frontend
    const finalAddress = deliveryAddress || deliveryAddressText;
    const finalLat = deliveryLatitude;
    const finalLng = deliveryLongitude;

    console.log('[createOrder] 📍 Inserting into order_delivery_locations:');
    console.log('[createOrder]   - Address (customer):', finalAddress);
    console.log('[createOrder]   - Latitude:', finalLat);
    console.log('[createOrder]   - Longitude:', finalLng);

    const insertData = {
      order_id: orderInsert.id,
      address: finalAddress || 'Address not provided',
    };

    if (finalLat !== null && finalLat !== undefined) {
      insertData.latitude = finalLat;
    }
    if (finalLng !== null && finalLng !== undefined) {
      insertData.longitude = finalLng;
    }

    const { data: locationData, error: locationError } = await supabase
      .from('order_delivery_locations')
      .insert(insertData)
      .select()
      .single();

    if (locationError) {
      console.error('[createOrder] ❌ Delivery location insert error:', locationError);
    } else {
      console.log('[createOrder] ✅ Delivery location inserted:', JSON.stringify(locationData, null, 2));
    }
  }

  // For CASH payments, deduct inventory immediately
  if (isCash) {
    try {
      console.log('[createOrder] Deducting inventory for cash order...');
      await deductInventory(items);
      console.log('[createOrder] ✅ Inventory deducted successfully');

      const orderStatus = orderType === 'PICKUP' ? 'PLACED' : 'COMPLETED';
      await supabase
        .from('orders')
        .update({
          order_status: orderStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderInsert.id);

      console.log('[createOrder] Order status updated to:', orderStatus);
    } catch (inventoryError) {
      console.error('[createOrder] ❌ Inventory deduction failed, rolling back order:', inventoryError);
      await supabase.from('order_items').delete().eq('order_id', orderInsert.id);
      await supabase.from('order_delivery_locations').delete().eq('order_id', orderInsert.id);
      await supabase.from('orders').delete().eq('id', orderInsert.id);
      throw new Error(`Order creation failed during inventory deduction: ${inventoryError.message}`);
    }
  } else {
    console.log('[createOrder] Online payment - inventory will be deducted after payment confirmation');
  }

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
    delivery_fee: deliveryFee,
    delivery_latitude: deliveryLatitude,
    delivery_longitude: deliveryLongitude,
    delivery_address: deliveryAddressText,
    customerEmail: customer?.email || null,
    customerPhone: customer?.phone || null,
    customerName: customer?.name || null,
    customerAddress: customer?.address || null,
    isCash,
  };
};

// ========== GET ORDERS BY USER ID ==========
const getOrdersByUserId = async (userId) => {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_status,
      payment_status,
      total_amount,
      delivery_fee,
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
    deliveryFee: order.delivery_fee || 0,
    status: order.order_status === 'PLACED' ? 'Pending' :
            order.order_status === 'PROCESSING' ? 'Preparing' :
            order.order_status === 'DELIVERED' ? 'Delivered' :
            order.order_status === 'COMPLETED' ? 'Completed' :
            order.order_status === 'CANCELLED' ? 'Cancelled' : order.order_status,
    paymentStatus: order.payment_status || 'PENDING',
    date: order.created_at?.slice(0, 10) || '',
  }));
};

// ========== GET SINGLE ORDER ==========
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
      delivery_fee,
      created_at,
      users ( name, email, phone, address ),
      order_delivery_locations ( address, latitude, longitude ),
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

  const deliveryLocation = data.order_delivery_locations?.[0] || null;

  return {
    id: `ORD-${String(data.id).padStart(4, '0')}`,
    orderId: data.id,
    orderType: data.order_type,
    paymentMethod: data.payment_method,
    paymentStatus: data.payment_status,
    status: data.order_status,
    totalAmount: data.total_amount,
    deliveryFee: data.delivery_fee || 0,
    deliveryLocation: deliveryLocation?.address || null,
    deliveryLatitude: deliveryLocation?.latitude || null,
    deliveryLongitude: deliveryLocation?.longitude || null,
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

// ========== GET ORDER WITH DETAILS ==========
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
      delivery_fee,
      created_at,
      customer_id,
      users!orders_customer_id_fkey (
        id,
        name,
        email,
        phone,
        address
      ),
      order_delivery_locations (
        id,
        address,
        latitude,
        longitude,
        created_at
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
  const deliveryLocation = data.order_delivery_locations?.[0] || null;

  return {
    id: `ORD-${String(data.id).padStart(4, '0')}`,
    orderId: data.id,
    ...data,
    customer: data.users || null,
    deliveryLocation: deliveryLocation,
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











// ========== COMPLETE ORDER ==========
const completeOrder = async (orderId, items) => {
  console.log('[completeOrder] Processing payment completion for order', orderId);
  console.log('[completeOrder] Items:', JSON.stringify(items, null, 2));

  if (!orderId) {
    throw new Error('Order ID is required');
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Items are required to complete order');
  }

  const { data: orderData, error: fetchError } = await supabase
    .from('orders')
    .select('order_type, payment_status')
    .eq('id', orderId)
    .single();

  if (fetchError) {
    console.error('[completeOrder] Fetch error:', fetchError);
    throw new Error(`Failed to fetch order: ${fetchError.message}`);
  }

  if (orderData.payment_status === 'COMPLETED') {
    console.log('[completeOrder] Order already completed');
    return orderData;
  }

  const orderStatus = orderData.order_type === 'PICKUP' ? 'PLACED' : 'PLACED';

  const { data: order, error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'COMPLETED',
      order_status: orderStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select('*, users ( email, phone )')
    .single();

  if (updateError) {
    console.error('[completeOrder] Update error:', updateError);
    throw new Error(`Failed to update order status: ${updateError.message}`);
  }

  console.log('[completeOrder] Order', orderId, 'payment status updated to COMPLETED, order status:', orderStatus);

  try {
    await deductInventory(items);
    console.log('[completeOrder] Inventory deducted for order', orderId);
  } catch (inventoryError) {
    console.error('[completeOrder] Inventory deduction failed:', inventoryError);
    throw new Error(`Inventory deduction failed: ${inventoryError.message}`);
  }

  return order;
};





// ========== GET ORDER ITEMS ==========
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

// ========== FAIL ORDER ==========
const failOrder = async (orderId) => {
  console.log('[failOrder] Marking payment as FAILED for order', orderId);

  const { data: order, error: updateError } = await supabase
    .from('orders')
    .update({
      payment_status: 'FAILED',
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)
    .select('id, customer_id, payment_status, users ( email, phone )')
    .single();

  if (updateError) {
    console.error('[failOrder] Update error:', updateError);
    throw new Error(`Failed to update payment status: ${updateError.message}`);
  }

  console.log('[failOrder] Order', orderId, 'payment status updated to FAILED');
  return order;
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

// ========== WATER PRICING ==========
const getWaterPrice = async () => {
  try {
    console.log('[getWaterPrice] Fetching water price from database...');

    const { data, error } = await supabase
      .from('water_pricing')
      .select('price_per_liter')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
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

    await supabase
      .from('water_pricing')
      .update({ is_active: false })
      .neq('id', 0);

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

// ========== BULK WATER ORDER ==========
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
  failOrder,
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