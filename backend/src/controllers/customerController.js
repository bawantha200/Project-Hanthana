const { supabase } = require('../config/db');

// Get all customers with their order statistics
const getAllCustomers = async (req, res) => {
  try {
    const { status, search } = req.query;
    
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
    
    // Apply status filter if provided
    if (status && status !== 'All') {
      query = query.eq('isActive', status === 'active');
    }
    
    // Apply search filter if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }
    
    const { data: customers, error } = await query;
    
    if (error) throw error;
    
    // Process customer data with order statistics
    const processedCustomers = customers.map(customer => {
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
        created_at: customer.created_at
      };
    });
    
    res.status(200).json({
      success: true,
      data: processedCustomers
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message
    });
  }
};

// Get single customer with detailed orders
const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: customer, error } = await supabase
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
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    const orders = customer.orders || [];
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    
    const customerDetails = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      status: customer.isActive ? 'active' : 'inactive',
      joinDate: new Date(customer.created_at).toLocaleDateString(),
      totalOrders,
      totalSpent,
      orders: orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    };
    
    res.status(200).json({
      success: true,
      data: customerDetails
    });
  } catch (error) {
    console.error('Error fetching customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer',
      error: error.message
    });
  }
};

// Create new customer
const createCustomer = async (req, res) => {
  try {
    const { name, email, phone, address, isActive = true } = req.body;
    
    // Check if email already exists
    const { data: existingCustomer, error: checkError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();
    
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }
    
    const { data: customer, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          phone,
          address,
          isActive
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        status: customer.isActive ? 'active' : 'inactive',
        joinDate: new Date(customer.created_at).toLocaleDateString(),
        totalOrders: 0,
        totalSpent: 0
      }
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating customer',
      error: error.message
    });
  }
};

// Update customer
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, isActive } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const { data: customer, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        status: customer.isActive ? 'active' : 'inactive'
      }
    });
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating customer',
      error: error.message
    });
  }
};

// Delete customer (soft delete by setting isActive to false)
const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: customer, error } = await supabase
      .from('users')
      .update({ isActive: false })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Customer deactivated successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting customer',
      error: error.message
    });
  }
};

// Get customer statistics
const getCustomerStatistics = async (req, res) => {
  try {
    // Get all customers
    const { data: customers, error: customersError } = await supabase
      .from('users')
      .select(`
        *,
        orders:orders (total_amount)
      `);
    
    if (customersError) throw customersError;
    
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c => c.isActive).length;
    const inactiveCustomers = totalCustomers - activeCustomers;
    
    // Calculate total revenue from all orders
    const { data: allOrders, error: ordersError } = await supabase
      .from('orders')
      .select('total_amount');
    
    if (ordersError) throw ordersError;
    
    const totalRevenue = allOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
    
    res.status(200).json({
      success: true,
      data: {
        total: totalCustomers,
        active: activeCustomers,
        inactive: inactiveCustomers,
        revenue: totalRevenue
      }
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStatistics
};