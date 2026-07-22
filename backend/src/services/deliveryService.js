// backend/src/services/deliveryService.js
const supabase = require('../config/db');
const stockService = require('./stockService');

// ============ HELPER: Get Refill 19L Product ============
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
    console.log(`📦 Found ${productIds.length} REFILL 19L products`);

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

// ============ UPDATE DELIVERY STATUS ============
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

    const { data, error } = await supabase
      .from('deliveries')
      .update(updateData)
      .eq('id', deliveryId)
      .select()
      .single();

    if (error) {
      console.error('❌ [updateDeliveryStatus] Error:', error);
      throw new Error(`Failed to update delivery status: ${error.message}`);
    }

    if (status === 'DELIVERED') {
      await supabase
        .from('orders')
        .update({ 
          order_status: 'DELIVERED',
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryData.order_id);

      if (emptyBottlesCollected > 0) {
        try {
          console.log(`📦 Adding ${emptyBottlesCollected} empty bottles to inventory`);
          
          // Get the Refill 19L product
          const refillProduct = await getRefill19LProduct();
          if (refillProduct) {
            // Use stockService to add stock (this will update ALL 19L products)
            await stockService.addStock(
              refillProduct.id,
              emptyBottlesCollected,
              'delivery_collection',
              `Collected ${emptyBottlesCollected} empty bottles from delivery #${deliveryId}`
            );
            console.log(`✅ Successfully updated inventory with ${emptyBottlesCollected} bottles`);
          } else {
            console.error('❌ Refill 19L product not found');
          }
        } catch (inventoryError) {
          console.error('❌ [updateDeliveryStatus] Failed to update inventory:', inventoryError);
        }
      } else {
        console.log('ℹ️ No empty bottles to add to inventory');
      }
    }

    return data;
  } catch (error) {
    console.error('Error in updateDeliveryStatus:', error);
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
  getOrderItemsWithProducts
};