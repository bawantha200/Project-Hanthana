const supabase = require('../config/db');

const getOrderStats = async () => {
  const { data, error } = await supabase.from('orders').select('id, order_status');
  if (error) throw error;

  return {
    total: data.length,
    pending: data.filter(o => o.order_status === 'PLACED').length,
    processing: data.filter(o => o.order_status === 'PROCESSING').length,
    delivered: data.filter(o => o.order_status === 'DELIVERED').length,
    cancelled: data.filter(o => o.order_status === 'CANCELLED').length,
  };
};

const getDeliveryStats = async () => {
  const { data, error } = await supabase.from('deliveries').select('id, status, delivery_person_id');
  if (error) throw error;

  const active = data.filter(d => !['DELIVERED', 'CANCELLED'].includes(d.status));
  const unassigned = data.filter(d => !d.delivery_person_id || d.status === 'PENDING');

  return {
    total: data.length,
    active: active.length,
    unassigned: unassigned.length,
    delivered: data.filter(d => d.status === 'DELIVERED').length,
  };
};

const getRiderWorkload = async () => {
  const { data: deliveries, error } = await supabase
    .from('deliveries')
    .select('delivery_person_id, status')
    .not('delivery_person_id', 'is', null)
    .not('status', 'in', '("DELIVERED","CANCELLED")');
  if (error) throw error;

  const riderIds = [...new Set(deliveries.map(d => d.delivery_person_id))];
  if (riderIds.length === 0) return [];

  const { data: riders, error: riderError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', riderIds);
  if (riderError) throw riderError;

  return riders.map(rider => ({
    id: rider.id,
    name: rider.full_name || 'Unknown Rider',
    activeDeliveries: deliveries.filter(d => d.delivery_person_id === rider.id).length,
  }));
};

const getMessageStats = async () => {
  const { data, error } = await supabase.from('contact_message').select('id, status');
  if (error) throw error;

  const unreplied = data.filter(m => m.status !== 'replied').length;
  return { total: data.length, unreplied, replied: data.length - unreplied };
};

const getRecentOrders = async (limit = 5) => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, 
      order_status, 
      total_amount, 
      created_at, 
      customer_name,
      customer_id,
      users ( name )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return orders.map(o => ({
    id: `ORD-${o.id}`,
    customer: o.customer_name || o.users?.name || 'Unknown',
    amount: o.total_amount,
    status: o.order_status,
    createdAt: o.created_at,
  }));
};

const getRecentMessages = async (limit = 5) => {
  const { data, error } = await supabase
    .from('contact_message')
    .select('id, name, email, subject, message, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return data.map(m => ({
    id: m.id,
    name: m.name,
    email: m.email,
    subject: m.subject,
    preview: (m.message || '').slice(0, 80),
    status: m.status === 'replied' ? 'Replied' : 'Awaiting Reply',
    createdAt: m.created_at,
  }));
};

module.exports = {
  getOrderStats,
  getDeliveryStats,
  getRiderWorkload,
  getMessageStats,
  getRecentOrders,
  getRecentMessages,
};