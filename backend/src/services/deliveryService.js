// backend/src/services/deliveryService.js
const supabase = require('../config/db');

// ========== GET ALL DELIVERIES (Admin) ==========
const getAllDeliveries = async (filters = {}) => {
  console.log('🔍 [getAllDeliveries] Fetching all deliveries...');

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

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }
  if (filters.deliveryPersonId) {
    query = query.eq('delivery_person_id', filters.deliveryPersonId);
  }
  if (filters.orderId) {
    query = query.eq('order_id', filters.orderId);
  }

  // ✅ Use updated_at for sorting (since created_at doesn't exist)
  const { data, error } = await query
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('❌ [getAllDeliveries] Error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }

  // Format the response
  return data.map(delivery => ({
    id: `DEL-${String(delivery.id).padStart(4, '0')}`,
    deliveryId: delivery.id,
    orderId: delivery.order_id,
    status: delivery.status,
    deliveryStartTime: delivery.delivery_start_time,
    deliveryEndTime: delivery.delivery_end_time,
    collectingEmptyBottles: delivery.collecting_empty_bottles || 0,
    deliveryFee: delivery.delivery_fee || 0,
    updatedAt: delivery.updated_at,
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
      } : null
    } : null,
    deliveryPerson: delivery.profiles ? {
      id: delivery.profiles.id,
      name: delivery.profiles.full_name,
      phone: delivery.profiles.phone_number,
      email: delivery.profiles.email
    } : null
  }));
};

// ========== GET DELIVERY BY ID ==========
const getDeliveryById = async (deliveryId) => {
  console.log(`🔍 [getDeliveryById] Fetching delivery ${deliveryId}...`);

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
      } : null
    } : null,
    deliveryPerson: data.profiles ? {
      id: data.profiles.id,
      name: data.profiles.full_name,
      phone: data.profiles.phone_number,
      email: data.profiles.email
    } : null
  };
};

// ========== GET DELIVERIES FOR RIDER ==========
const getRiderDeliveries = async (riderId, status = null) => {
  console.log(`🔍 [getRiderDeliveries] Fetching deliveries for rider ${riderId}...`);

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

  return data.map(delivery => ({
    id: `DEL-${String(delivery.id).padStart(4, '0')}`,
    deliveryId: delivery.id,
    orderId: delivery.order_id,
    status: delivery.status,
    deliveryStartTime: delivery.delivery_start_time,
    deliveryEndTime: delivery.delivery_end_time,
    collectingEmptyBottles: delivery.collecting_empty_bottles || 0,
    deliveryFee: delivery.delivery_fee || 0,
    updatedAt: delivery.updated_at,
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
      } : null
    } : null
  }));
};

// ========== UPDATE DELIVERY STATUS (Rider) ==========
const updateDeliveryStatus = async (deliveryId, status, emptyBottles = 0) => {
  console.log(`🔄 [updateDeliveryStatus] Delivery ${deliveryId} -> ${status}`);

  const updateData = {
    status: status,
    updated_at: new Date().toISOString()
  };

  if (status === 'DELIVERED') {
    updateData.delivery_end_time = new Date().toISOString();
    updateData.collecting_empty_bottles = emptyBottles || 0;
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

  // If delivery is completed, update order status too
  if (status === 'DELIVERED') {
    // Get the order_id from the delivery
    const { data: deliveryData, error: deliveryError } = await supabase
      .from('deliveries')
      .select('order_id')
      .eq('id', deliveryId)
      .single();

    if (!deliveryError && deliveryData) {
      await supabase
        .from('orders')
        .update({ 
          order_status: 'DELIVERED',
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryData.order_id);
    }
  }

  return data;
};

// ========== GET DELIVERY STATISTICS FOR RIDER ==========
const getRiderStats = async (riderId) => {
  console.log(`📊 [getRiderStats] Fetching stats for rider ${riderId}...`);

  const { data, error } = await supabase
    .from('deliveries')
    .select('status, delivery_fee, collecting_empty_bottles')
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
    totalEarnings: data.reduce((sum, d) => sum + (d.delivery_fee || 0), 0),
    totalBottlesCollected: data.reduce((sum, d) => sum + (d.collecting_empty_bottles || 0), 0)
  };

  return stats;
};

// ========== ASSIGN RIDER TO DELIVERY ==========
const assignRiderToDelivery = async (deliveryId, riderId) => {
  console.log(`👤 [assignRiderToDelivery] Assigning rider ${riderId} to delivery ${deliveryId}`);

  // Check if rider exists and has RIDER role
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
};

module.exports = {
  getAllDeliveries,
  getDeliveryById,
  getRiderDeliveries,
  updateDeliveryStatus,
  getRiderStats,
  assignRiderToDelivery
};