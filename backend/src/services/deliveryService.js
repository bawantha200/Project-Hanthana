// backend/src/services/deliveryService.js
const supabase = require('../config/db');

// ============ HELPER: Get All 19L Products ============
const getAll19LProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, type')
      .ilike('name', '%19L%');
    
    if (error) throw new Error(`Failed to fetch 19L products: ${error.message}`);
    return data || [];
  } catch (error) {
    console.error('Error in getAll19LProducts:', error);
    return [];
  }
};

const getRefill19LProduct = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('type', 'REFILL')
      .ilike('name', '%19L%')
      .maybeSingle();
    
    if (error) throw new Error(`Failed to fetch Refill 19L product: ${error.message}`);
    return data;
  } catch (error) {
    console.error('Error in getRefill19LProduct:', error);
    return null;
  }
};

// ============ UPDATE EMPTY BOTTLE STOCK FOR 19L PRODUCTS ONLY ============
const updateEmptyBottleStockFor19L = async (quantity, operation = 'add', notes = '') => {
  console.log(`📦 [updateEmptyBottleStockFor19L] ${operation} ${quantity} empty bottles for 19L products...`);

  if (!quantity || quantity <= 0) {
    console.log('ℹ️ No empty bottles to update');
    return null;
  }

  try {
    const all19LProducts = await getAll19LProducts();
    
    if (!all19LProducts || all19LProducts.length === 0) {
      console.error('❌ No 19L products found');
      throw new Error('No 19L products found');
    }

    console.log(`✅ Found ${all19LProducts.length} 19L products:`, all19LProducts.map(p => p.name));

    let results = [];
    let totalUpdated = 0;

    // For subtract operation, check if we have enough
    if (operation === 'subtract') {
      const firstProduct = all19LProducts[0];
      const { data: checkInventory, error: checkError } = await supabase
        .from('inventory')
        .select('empty_bottle_stock')
        .eq('product_id', firstProduct.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking inventory:', checkError);
      }

      const currentEmpty = checkInventory?.empty_bottle_stock || 0;

      if (currentEmpty < quantity) {
        throw new Error(`Insufficient empty bottles in 19L products. Available: ${currentEmpty}, Required: ${quantity}`);
      }
    }

    for (const product of all19LProducts) {
      console.log(`📊 Processing 19L product: ${product.name} (ID: ${product.id})`);

      const { data: existingInventory, error: invError } = await supabase
        .from('inventory')
        .select('id, empty_bottle_stock, current_stock')
        .eq('product_id', product.id)
        .maybeSingle();

      if (invError && invError.code !== 'PGRST116') {
        console.error(`❌ Error checking inventory for ${product.name}:`, invError);
        continue;
      }

      let currentStock = 0;
      let newStock = 0;

      if (existingInventory) {
        currentStock = existingInventory.empty_bottle_stock || 0;
        
        if (operation === 'add') {
          newStock = currentStock + quantity;
        } else if (operation === 'subtract') {
          if (currentStock < quantity) {
            console.warn(`⚠️ Insufficient empty bottles for ${product.name}. Available: ${currentStock}, Required: ${quantity}`);
            continue;
          }
          newStock = currentStock - quantity;
        } else {
          throw new Error('Invalid operation. Use "add" or "subtract"');
        }

        const { data: updatedInventory, error: updateError } = await supabase
          .from('inventory')
          .update({
            empty_bottle_stock: newStock,
            last_empty_updated: new Date().toISOString()
          })
          .eq('id', existingInventory.id)
          .select()
          .single();

        if (updateError) {
          console.error(`❌ Failed to update ${product.name}:`, updateError);
          continue;
        }

        results.push(updatedInventory);
        totalUpdated++;
        console.log(`✅ ${product.name}: empty_bottle_stock ${currentStock} -> ${newStock}`);
      } else {
        // No inventory exists - create one
        const initialStock = operation === 'add' ? quantity : 0;
        
        const { data: newInventory, error: createError } = await supabase
          .from('inventory')
          .insert({
            product_id: product.id,
            current_stock: 0,
            empty_bottle_stock: initialStock,
            reorder_level: 50,
            last_updated: new Date().toISOString(),
            last_empty_updated: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error(`❌ Failed to create inventory for ${product.name}:`, createError);
          continue;
        }

        results.push(newInventory);
        totalUpdated++;
        console.log(`✅ ${product.name}: empty_bottle_stock 0 -> ${initialStock} (new inventory created)`);
      }

      // Record transaction for this product
      await supabase
        .from('inventory_transactions')
        .insert({
          product_id: product.id,
          quantity: operation === 'add' ? quantity : -quantity,
          type: operation === 'add' ? 'empty_bottle_collection' : 'empty_bottle_usage',
          reason: operation === 'add' ? 'delivery_completed' : 'production_usage',
          notes: notes || (operation === 'add' 
            ? `Collected ${quantity} empty bottles for ${product.name}` 
            : `Used ${quantity} empty bottles from ${product.name}`)
        });
    }

    console.log(`✅ Successfully updated ${totalUpdated} of ${all19LProducts.length} 19L products`);
    return results;
  } catch (err) {
    console.error('💥 [updateEmptyBottleStockFor19L] Unexpected error:', err);
    throw err;
  }
};

// ============ CHECK IF ORDER HAS REFILL 19L BOTTLES ============
const checkOrderHasRefill19LBottles = async (orderId) => {
  console.log(`🔍 [checkOrderHasRefill19LBottles] Checking order ${orderId}...`);

  try {
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, name, type')
      .ilike('name', '%19L%')
      .eq('type', 'REFILL');

    if (productError) {
      console.error('❌ [checkOrderHasRefill19LBottles] Product error:', productError);
      return { hasRefill: false, refillProductIds: [], refillCount: 0 };
    }

    if (!products || products.length === 0) {
      console.log('⚠️ No REFILL 19L products found');
      return { hasRefill: false, refillProductIds: [], refillCount: 0 };
    }

    const productIds = products.map(p => p.id);
    console.log(`📦 Found ${productIds.length} REFILL 19L products:`, productIds);

    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('id, product_id, quantity')
      .eq('order_id', orderId)
      .in('product_id', productIds);

    if (itemsError) {
      console.error('❌ [checkOrderHasRefill19LBottles] Order items error:', itemsError);
      return { hasRefill: false, refillProductIds: [], refillCount: 0 };
    }

    const hasRefill = orderItems && orderItems.length > 0;
    const refillCount = orderItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    
    console.log(`📦 Order ${orderId} has REFILL 19L bottles: ${hasRefill}, Count: ${refillCount}`);
    console.log(`📦 Order items:`, orderItems);
    
    return {
      hasRefill: hasRefill,
      refillProductIds: productIds,
      refillCount: refillCount
    };
  } catch (error) {
    console.error('Error in checkOrderHasRefill19LBottles:', error);
    return { hasRefill: false, refillProductIds: [], refillCount: 0 };
  }
};

// ============ GET FULL ORDER ITEMS ============
const getOrderItemsWithProducts = async (orderId) => {
  console.log(`🔍 [getOrderItemsWithProducts] Fetching items for order ${orderId}...`);

  try {
    const { data, error } = await supabase
      .from('order_items')
      .select(`
        id,
        quantity,
        sub_total,
        products (
          id,
          name,
          unit_price,
          type,
          image_url,
          description
        )
      `)
      .eq('order_id', orderId);

    if (error) {
      console.error('❌ [getOrderItemsWithProducts] Error:', error);
      throw new Error(`Failed to fetch order items: ${error.message}`);
    }

    console.log(`✅ Found ${data?.length || 0} order items`);
    return data.map(item => ({
      id: item.id,
      quantity: item.quantity,
      subTotal: item.sub_total,
      product: item.products ? {
        id: item.products.id,
        name: item.products.name,
        unitPrice: item.products.unit_price,
        type: item.products.type,
        imageUrl: item.products.image_url,
        description: item.products.description
      } : null
    }));
  } catch (error) {
    console.error('Error in getOrderItemsWithProducts:', error);
    return [];
  }
};

// ============ GET DELIVERY BY ID ============
const getDeliveryById = async (deliveryId) => {
  console.log(`🔍 [getDeliveryById] Fetching delivery ${deliveryId}...`);

  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        id,
        order_id,
        delivery_person_id,
        status,
        delivery_start_time,
        delivery_end_time,
        collecting_empty_bottles,
        delivery_fee,
        updated_at,
        orders!inner (
          id,
          order_type,
          payment_method,
          payment_status,
          order_status,
          total_amount,
          delivery_location,
          customer_id,
          users!orders_customer_id_fkey (
            id,
            name,
            phone,
            email,
            address
          )
        ),
        profiles!deliveries_delivery_person_id_fkey (
          id,
          full_name,
          phone_number,
          email
        )
      `)
      .eq('id', deliveryId)
      .single();

    if (error) {
      console.error('❌ [getDeliveryById] Error:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    const orderItems = await getOrderItemsWithProducts(data.order_id);
    const refillCheck = await checkOrderHasRefill19LBottles(data.order_id);

    return {
      id: `DEL-${String(data.id).padStart(4, '0')}`,
      deliveryId: data.id,
      orderId: data.order_id,
      status: data.status,
      deliveryStartTime: data.delivery_start_time,
      deliveryEndTime: data.delivery_end_time,
      collectingEmptyBottles: data.collecting_empty_bottles || 0,
      deliveryFee: data.delivery_fee || 0,
      updatedAt: data.updated_at,
      hasRefill19LBottles: refillCheck.hasRefill,
      refillCount: refillCheck.refillCount,
      order: data.orders ? {
        id: data.orders.id,
        orderType: data.orders.order_type,
        paymentMethod: data.orders.payment_method,
        paymentStatus: data.orders.payment_status,
        orderStatus: data.orders.order_status,
        totalAmount: data.orders.total_amount,
        deliveryLocation: data.orders.delivery_location,
        customer: data.orders.users ? {
          id: data.orders.users.id,
          name: data.orders.users.name,
          phone: data.orders.users.phone,
          email: data.orders.users.email,
          address: data.orders.users.address
        } : null,
        items: orderItems
      } : null,
      deliveryPerson: data.profiles ? {
        id: data.profiles.id,
        name: data.profiles.full_name,
        phone: data.profiles.phone_number,
        email: data.profiles.email
      } : null
    };
  } catch (error) {
    console.error('Error in getDeliveryById:', error);
    throw error;
  }
};

// ============ GET DELIVERIES FOR RIDER ============
const getRiderDeliveries = async (riderId, status = null) => {
  console.log(`🔍 [getRiderDeliveries] Fetching deliveries for rider ${riderId}...`);

  try {
    let query = supabase
      .from('deliveries')
      .select(`
        id,
        order_id,
        delivery_person_id,
        status,
        delivery_start_time,
        delivery_end_time,
        collecting_empty_bottles,
        delivery_fee,
        updated_at,
        orders!inner (
          id,
          order_type,
          payment_method,
          payment_status,
          order_status,
          total_amount,
          delivery_location,
          customer_id,
          users!orders_customer_id_fkey (
            id,
            name,
            phone,
            email,
            address
          )
        )
      `)
      .eq('delivery_person_id', riderId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ [getRiderDeliveries] Error:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    const deliveriesWithItems = await Promise.all(data.map(async (delivery) => {
      const orderItems = await getOrderItemsWithProducts(delivery.order_id);
      const refillCheck = await checkOrderHasRefill19LBottles(delivery.order_id);
      
      return {
        id: `DEL-${String(delivery.id).padStart(4, '0')}`,
        deliveryId: delivery.id,
        orderId: delivery.order_id,
        status: delivery.status,
        deliveryStartTime: delivery.delivery_start_time,
        deliveryEndTime: delivery.delivery_end_time,
        collectingEmptyBottles: delivery.collecting_empty_bottles || 0,
        deliveryFee: delivery.delivery_fee || 0,
        updatedAt: delivery.updated_at,
        hasRefill19LBottles: refillCheck.hasRefill,
        refillCount: refillCheck.refillCount,
        order: delivery.orders ? {
          id: delivery.orders.id,
          orderType: delivery.orders.order_type,
          paymentMethod: delivery.orders.payment_method,
          paymentStatus: delivery.orders.payment_status,
          orderStatus: delivery.orders.order_status,
          totalAmount: delivery.orders.total_amount,
          deliveryLocation: delivery.orders.delivery_location,
          customer: delivery.orders.users ? {
            id: delivery.orders.users.id,
            name: delivery.orders.users.name,
            phone: delivery.orders.users.phone,
            email: delivery.orders.users.email,
            address: delivery.orders.users.address
          } : null,
          items: orderItems
        } : null
      };
    }));

    return deliveriesWithItems;
  } catch (error) {
    console.error('Error in getRiderDeliveries:', error);
    throw error;
  }
};

// ============ UPDATE DELIVERY STATUS - FIXED ============
const updateDeliveryStatus = async (deliveryId, status) => {
  console.log(`🔄 [updateDeliveryStatus] Delivery ${deliveryId} -> ${status}`);

  try {
    const { data: deliveryData, error: deliveryError } = await supabase
      .from('deliveries')
      .select('order_id, collecting_empty_bottles')
      .eq('id', deliveryId)
      .single();

    if (deliveryError) {
      throw new Error(`Failed to fetch delivery: ${deliveryError.message}`);
    }

    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };

    let emptyBottlesCollected = 0;

    if (status === 'DELIVERED') {
      console.log('✅ Delivery is being marked as DELIVERED');
      updateData.delivery_end_time = new Date().toISOString();
      
      const refillCheck = await checkOrderHasRefill19LBottles(deliveryData.order_id);
      
      if (refillCheck.hasRefill) {
        emptyBottlesCollected = refillCheck.refillCount;
        updateData.collecting_empty_bottles = emptyBottlesCollected;
        console.log(`📦 Auto-collecting ${emptyBottlesCollected} REFILL 19L bottles`);
      } else {
        updateData.collecting_empty_bottles = 0;
        console.log('ℹ️ No REFILL 19L bottles in this order');
      }
    }

    if (status === 'PICKED_UP') {
      updateData.delivery_start_time = new Date().toISOString();
    }

    // Update delivery status
    const { data, error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to update delivery status:', error);
      throw new Error(`Failed to update delivery status: ${error.message}`);
    }

    console.log(`✅ Delivery updated:`, data);

    // ============================================================
    // ✅ If delivery is completed, update empty_bottle_stock for 19L products ONLY
    // ============================================================
    if (status === 'DELIVERED' && emptyBottlesCollected > 0) {
      try {
        console.log(`📦 Adding ${emptyBottlesCollected} empty bottles to 19L products (empty_bottle_stock ONLY)`);
        console.log(`⚠️ NOT updating current_stock!`);
        
        // ✅ Directly call the function to update ONLY empty_bottle_stock
        await updateEmptyBottleStockFor19L(
          emptyBottlesCollected, 
          'add', 
          `Collected ${emptyBottlesCollected} empty bottles from delivery #${deliveryId}`
        );
        
        console.log(`✅ Successfully updated empty_bottle_stock for ALL 19L products`);
      } catch (inventoryError) {
        console.error('❌ Failed to update empty_bottle_stock:', inventoryError);
      }
    } else if (status === 'DELIVERED' && emptyBottlesCollected === 0) {
      console.log('ℹ️ No empty bottles to add to inventory');
    }

    console.log(`✅ Delivery ${deliveryId} status updated to ${status}`);
    return data;
  } catch (error) {
    console.error('❌ Error in updateDeliveryStatus:', error);
    throw error;
  }
};

// ============ GET ALL DELIVERIES (Admin) ============
const getAllDeliveries = async (filters = {}) => {
  console.log('🔍 [getAllDeliveries] Fetching all deliveries...');

  try {
    let query = supabase
      .from('deliveries')
      .select(`
        id,
        order_id,
        delivery_person_id,
        status,
        delivery_start_time,
        delivery_end_time,
        collecting_empty_bottles,
        delivery_fee,
        updated_at,
        orders!inner (
          id,
          order_type,
          payment_method,
          payment_status,
          order_status,
          total_amount,
          delivery_location,
          customer_id,
          users!orders_customer_id_fkey (
            id,
            name,
            phone,
            email,
            address
          )
        ),
        profiles!deliveries_delivery_person_id_fkey (
          id,
          full_name,
          phone_number,
          email
        )
      `);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.deliveryPersonId) {
      query = query.eq('delivery_person_id', filters.deliveryPersonId);
    }
    if (filters.orderId) {
      query = query.eq('order_id', filters.orderId);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ [getAllDeliveries] Error:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    const deliveriesWithItems = await Promise.all(data.map(async (delivery) => {
      const orderItems = await getOrderItemsWithProducts(delivery.order_id);
      const refillCheck = await checkOrderHasRefill19LBottles(delivery.order_id);
      
      return {
        id: `DEL-${String(delivery.id).padStart(4, '0')}`,
        deliveryId: delivery.id,
        orderId: delivery.order_id,
        status: delivery.status,
        deliveryStartTime: delivery.delivery_start_time,
        deliveryEndTime: delivery.delivery_end_time,
        collectingEmptyBottles: delivery.collecting_empty_bottles || 0,
        deliveryFee: delivery.delivery_fee || 0,
        updatedAt: delivery.updated_at,
        hasRefill19LBottles: refillCheck.hasRefill,
        refillCount: refillCheck.refillCount,
        order: delivery.orders ? {
          id: delivery.orders.id,
          orderType: delivery.orders.order_type,
          paymentMethod: delivery.orders.payment_method,
          paymentStatus: delivery.orders.payment_status,
          orderStatus: delivery.orders.order_status,
          totalAmount: delivery.orders.total_amount,
          deliveryLocation: delivery.orders.delivery_location,
          customer: delivery.orders.users ? {
            id: delivery.orders.users.id,
            name: delivery.orders.users.name,
            phone: delivery.orders.users.phone,
            email: delivery.orders.users.email,
            address: delivery.orders.users.address
          } : null,
          items: orderItems
        } : null,
        deliveryPerson: delivery.profiles ? {
          id: delivery.profiles.id,
          name: delivery.profiles.full_name,
          phone: delivery.profiles.phone_number,
          email: delivery.profiles.email
        } : null
      };
    }));

    return deliveriesWithItems;
  } catch (error) {
    console.error('Error in getAllDeliveries:', error);
    throw error;
  }
};

// ============ GET DELIVERY STATISTICS ============
const getRiderStats = async (riderId) => {
  console.log(`📊 [getRiderStats] Fetching stats for rider ${riderId}...`);

  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('status, collecting_empty_bottles')
      .eq('delivery_person_id', riderId);

    if (error) {
      console.error('❌ [getRiderStats] Error:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    const stats = {
      total: data.length,
      pending: data.filter(d => d.status === 'PENDING').length,
      assigned: data.filter(d => d.status === 'ASSIGNED').length,
      pickedUp: data.filter(d => d.status === 'PICKED_UP').length,
      delivered: data.filter(d => d.status === 'DELIVERED').length,
      cancelled: data.filter(d => d.status === 'CANCELLED').length,
      totalBottlesCollected: data.reduce((sum, d) => sum + (d.collecting_empty_bottles || 0), 0)
    };

    return stats;
  } catch (error) {
    console.error('Error in getRiderStats:', error);
    throw error;
  }
};

// ============ ASSIGN RIDER TO DELIVERY ============
const assignRiderToDelivery = async (deliveryId, riderId) => {
  console.log(`👤 [assignRiderToDelivery] Assigning rider ${riderId} to delivery ${deliveryId}`);

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role_id, roles!inner(role_name)')
      .eq('id', riderId)
      .single();

    if (profileError || !profile) {
      throw new Error('Rider not found');
    }

    if (profile.roles?.role_name !== 'RIDER') {
      throw new Error('User is not a rider');
    }

    const { data, error } = await supabase
      .from('deliveries')
      .update({
        delivery_person_id: riderId,
        status: 'ASSIGNED',
        delivery_start_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      console.error('❌ [assignRiderToDelivery] Error:', error);
      throw new Error(`Failed to assign rider: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in assignRiderToDelivery:', error);
    throw error;
  }
};

// ============ EXPORTS ============
module.exports = {
  getAllDeliveries,
  getDeliveryById,
  getRiderDeliveries,
  updateDeliveryStatus,
  getRiderStats,
  assignRiderToDelivery,
  checkOrderHasRefill19LBottles,
  getRefill19LProduct,
  getOrderItemsWithProducts,
  getAll19LProducts,
  updateEmptyBottleStockFor19L
};