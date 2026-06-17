// services/customerService.js
const supabase = require('../config/db');

/**
 * Fetch all customers with optional filters and order statistics
 */
const getAllCustomers = async (filters = {}) => {
  const { status, search } = filters;
  
  let query = supabase
    .from('users')
    .select(`
      *,
      orders:orders (
        id,
        total_amount,
        order_status,
        created_at
      )
    `);

  if (status && status !== 'All') {
    query = query.eq('isActive', status === 'active');
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Process each customer with order stats
  return data.map(customer => {
    const orders = customer.orders || [];
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    const completedOrders = orders.filter(order => order.order_status === 'delivered').length;

    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      status: customer.isActive ? 'active' : 'inactive',
      joinDate: new Date(customer.created_at).toLocaleDateString(),
      totalOrders,
      totalSpent,
      completedOrders,
      created_at: customer.created_at,
    };
  });
};

/**
 * Fetch a single customer by ID with detailed orders
 */
const getCustomerById = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .select(`
      *,
      orders:orders (
        id,
        order_type,
        payment_method,
        payment_status,
        order_status,
        total_amount,
        delivery_location,
        created_at
      )
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) return null;

  const orders = data.orders || [];
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    status: data.isActive ? 'active' : 'inactive',
    joinDate: new Date(data.created_at).toLocaleDateString(),
    totalOrders,
    totalSpent,
    orders: orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  };
};

/**
 * Create a new customer
 */
const createCustomer = async (customerData) => {
  const { name, email, phone, address, isActive = true } = customerData;

  // Check for existing email
  const { data: existing, error: checkError } = await supabase
    .from('users')
    .select('email')
    .eq('email', email)
    .single();

  if (existing) {
    const err = new Error('Customer with this email already exists');
    err.code = 'DUPLICATE_EMAIL';
    throw err;
  }

  const { data, error } = await supabase
    .from('users')
    .insert([{ name, email, phone, address, isActive }])
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    status: data.isActive ? 'active' : 'inactive',
    joinDate: new Date(data.created_at).toLocaleDateString(),
    totalOrders: 0,
    totalSpent: 0,
  };
};

/**
 * Update an existing customer
 */
const updateCustomer = async (id, updates) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    status: data.isActive ? 'active' : 'inactive',
  };
};

/**
 * Soft-delete a customer (set isActive = false)
 */
const deleteCustomer = async (id) => {
  const { data, error } = await supabase
    .from('users')
    .update({ isActive: false })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data; // will be null if not found
};

/**
 * Get customer statistics (totals, active/inactive, revenue)
 */
const getCustomerStatistics = async () => {
  // Get all customers
  const { data: customers, error: customersError } = await supabase
    .from('users')
    .select('isActive');

  if (customersError) throw customersError;

  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.isActive).length;
  const inactiveCustomers = totalCustomers - activeCustomers;

  // Get total revenue from all orders
  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('total_amount');

  if (ordersError) throw ordersError;

  const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

  return {
    total: totalCustomers,
    active: activeCustomers,
    inactive: inactiveCustomers,
    revenue: totalRevenue,
  };
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStatistics,
};