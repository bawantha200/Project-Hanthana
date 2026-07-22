// backend/src/services/vendorOrderService.js
const supabase = require('../config/db');

// ============ HELPER: Transform DB row to frontend object ============
const toVendorOrder = (row) => ({
  id: row.id,
  vendor_id: row.vendor_id,
  product_id: row.product_id,
  order_type: row.order_type || 'bottle',
  quantity: row.quantity,
  unit_price: Number(row.unit_price),
  total: Number(row.total),
  order_date: row.order_date,
  delivery_date: row.delivery_date,
  status: row.status || 'pending',
  notes: row.notes,
  created_at: row.created_at,
  updated_at: row.updated_at,
  vendors: row.vendors ? {
    id: row.vendors.id,
    vendor_name: row.vendors.vendor_name,
    contact_person: row.vendors.contact_person,
    contact_number: row.vendors.contact_number
  } : null,
  products: row.products ? {
    id: row.products.id,
    name: row.products.name,
    type: row.products.type
  } : null
});

const vendorOrderService = {
  /**
   * Get all vendor orders with vendor and product details
   */
  async getAllVendorOrders(filters = {}) {
    console.log('📡 Fetching all vendor orders with filters:', filters);
    
    let query = supabase
      .from('vendor_orders')
      .select(`
        *,
        vendors (
          id,
          vendor_name,
          contact_person,
          contact_number
        ),
        products (
          id,
          name,
          type
        )
      `)
      .order('order_date', { ascending: false });

    // Apply filters
    if (filters.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    if (filters.productId) {
      query = query.eq('product_id', String(filters.productId));
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Error fetching vendor orders:', error);
      throw new Error(error.message);
    }
    
    console.log(`✅ Found ${data?.length || 0} vendor orders`);
    
    // Transform all orders
    let results = (data || []).map(toVendorOrder);
    
    // Client-side search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      results = results.filter(order => {
        const vendorName = order.vendors?.vendor_name?.toLowerCase() || '';
        const productName = order.products?.name?.toLowerCase() || '';
        const notes = order.notes?.toLowerCase() || '';
        return vendorName.includes(searchLower) || 
               productName.includes(searchLower) ||
               notes.includes(searchLower);
      });
      console.log(`🔍 Filtered to ${results.length} orders matching search`);
    }
    
    return results;
  },

  /**
   * Get single vendor order by ID
   */
  async getVendorOrderById(id) {
    console.log(`📡 Fetching vendor order ID: ${id}`);
    
    const { data, error } = await supabase
      .from('vendor_orders')
      .select(`
        *,
        vendors (
          id,
          vendor_name,
          contact_person,
          contact_number
        ),
        products (
          id,
          name,
          type
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('❌ Error fetching vendor order:', error);
      throw new Error(error.message);
    }
    
    console.log(`✅ Found vendor order: ${data.id}`);
    return toVendorOrder(data);
  },

  /**
   * Create new vendor order with auto-calculated total
   */
  async createVendorOrder(orderData) {
    console.log('📦 Creating new vendor order:', orderData);
    
    // Calculate total
    const quantity = orderData.quantity || 0;
    const unitPrice = orderData.unit_price || 0;
    const total = quantity * unitPrice;

    const newOrder = {
      vendor_id: orderData.vendor_id,
      product_id: String(orderData.product_id),
      order_type: orderData.order_type || 'bottle',
      quantity: quantity,
      unit_price: unitPrice,
      total: total,
      order_date: orderData.order_date || new Date().toISOString().split('T')[0],
      delivery_date: orderData.delivery_date || null,
      status: orderData.status || 'pending',
      notes: orderData.notes || null
    };

    const { data, error } = await supabase
      .from('vendor_orders')
      .insert([newOrder])
      .select(`
        *,
        vendors (
          id,
          vendor_name,
          contact_person,
          contact_number
        ),
        products (
          id,
          name,
          type
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error creating vendor order:', error);
      throw new Error(error.message);
    }
    
    console.log(`✅ Vendor order created with ID: ${data.id}`);
    return toVendorOrder(data);
  },

  /**
   * Update vendor order with auto-calculated total
   */
  async updateVendorOrder(id, orderData) {
    console.log(`📦 Updating vendor order ID: ${id}`, orderData);
    
    // First get current order
    const currentOrder = await this.getVendorOrderById(id);
    if (!currentOrder) {
      throw new Error('Order not found');
    }
    
    const updated = {};
    
    // Only update fields that are provided
    if (orderData.vendor_id !== undefined) updated.vendor_id = orderData.vendor_id;
    if (orderData.product_id !== undefined) updated.product_id = String(orderData.product_id);
    if (orderData.order_type !== undefined) updated.order_type = orderData.order_type;
    if (orderData.notes !== undefined) updated.notes = orderData.notes;
    if (orderData.status !== undefined) updated.status = orderData.status;
    if (orderData.order_date !== undefined) updated.order_date = orderData.order_date;
    if (orderData.delivery_date !== undefined) updated.delivery_date = orderData.delivery_date;
    
    // Handle quantity and price with auto-total calculation
    const qty = orderData.quantity !== undefined ? orderData.quantity : currentOrder.quantity;
    const price = orderData.unit_price !== undefined ? orderData.unit_price : currentOrder.unit_price;
    
    if (orderData.quantity !== undefined) updated.quantity = orderData.quantity;
    if (orderData.unit_price !== undefined) updated.unit_price = orderData.unit_price;
    
    // Always recalculate total if quantity or price changed
    if (orderData.quantity !== undefined || orderData.unit_price !== undefined) {
      updated.total = qty * price;
    }

    updated.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('vendor_orders')
      .update(updated)
      .eq('id', id)
      .select(`
        *,
        vendors (
          id,
          vendor_name,
          contact_person,
          contact_number
        ),
        products (
          id,
          name,
          type
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error updating vendor order:', error);
      throw new Error(error.message);
    }
    
    console.log(`✅ Vendor order ${id} updated successfully`);
    return toVendorOrder(data);
  },

  /**
   * Update just the status of an order
   */
  async updateOrderStatus(id, status) {
    console.log(`📦 Updating order ${id} status to: ${status}`);
    
    // Validate status
    const validStatuses = ['pending', 'ordered', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const { data, error } = await supabase
      .from('vendor_orders')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        vendors (
          id,
          vendor_name,
          contact_person,
          contact_number
        ),
        products (
          id,
          name,
          type
        )
      `)
      .single();

    if (error) {
      console.error('❌ Error updating order status:', error);
      throw new Error(error.message);
    }
    
    console.log(`✅ Order ${id} status updated to: ${status}`);
    return toVendorOrder(data);
  },

  /**
   * Delete vendor order
   */
  async deleteVendorOrder(id) {
    console.log(`🗑️ Deleting vendor order ID: ${id}`);
    
    const { error } = await supabase
      .from('vendor_orders')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Error deleting vendor order:', error);
      throw new Error(error.message);
    }
    
    console.log(`✅ Vendor order ${id} deleted successfully`);
    return { success: true };
  },

  /**
   * Get vendor purchase summary for charts
   */
  async getVendorPurchaseSummary() {
    console.log('📡 Fetching vendor purchase summary...');
    
    const { data, error } = await supabase
      .from('vendor_orders')
      .select(`
        vendor_id,
        vendors!vendor_orders_vendor_id_fkey (
          vendor_name
        ),
        total,
        quantity,
        order_type,
        status
      `);

    if (error) {
      console.error('❌ Error fetching vendor summary:', error);
      throw new Error(error.message);
    }
    
    // Filter out cancelled orders for summary
    const activeOrders = (data || []).filter(order => order.status !== 'cancelled');
    
    // Aggregate by vendor
    const summary = {};
    activeOrders.forEach(order => {
      const vendorId = order.vendor_id;
      const vendorName = order.vendors?.vendor_name || 'Unknown Vendor';
      
      if (!summary[vendorId]) {
        summary[vendorId] = {
          vendor_id: vendorId,
          vendor_name: vendorName,
          total_spent: 0,
          total_bottles: 0,
          total_other: 0,
          order_count: 0
        };
      }
      
      summary[vendorId].total_spent += Number(order.total) || 0;
      summary[vendorId].total_bottles += order.order_type === 'bottle' ? (order.quantity || 0) : 0;
      summary[vendorId].total_other += order.order_type !== 'bottle' ? (order.quantity || 0) : 0;
      summary[vendorId].order_count += 1;
    });
    
    console.log(`✅ Summary generated for ${Object.keys(summary).length} vendors`);
    return Object.values(summary);
  }
};

module.exports = { vendorOrderService };