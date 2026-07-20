// backend/src/services/inventoryService.js
const supabase = require('../config/db');

// ============ PRODUCT FUNCTIONS ============

async function getProductsWithStock() {
  try {
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('*')
      .order('name');
    if (prodErr) throw new Error(prodErr.message);

    const { data: inventory, error: invErr } = await supabase
      .from('inventory')
      .select('product_id, current_stock');
    if (invErr) throw new Error(invErr.message);

    const stockMap = {};
    inventory.forEach(item => {
      stockMap[item.product_id] = (stockMap[item.product_id] || 0) + item.current_stock;
    });

    return products.map(p => ({
      ...p,
      stock: stockMap[p.id] || 0,
      status: (stockMap[p.id] || 0) < 20 ? 'low' : 'sufficient',
      predicted: 0
    }));
  } catch (error) {
    console.error('Error in getProductsWithStock:', error);
    throw error;
  }
}

async function getProductById(productId) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error('Error in getProductById:', error);
    throw error;
  }
}

async function getVendors() {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('isActive', true)
      .order('vendor_name', { ascending: true });
    
    if (error) throw new Error(error.message);
    return data || [];
  } catch (error) {
    console.error('Error in getVendors:', error);
    throw error;
  }
}

// ============ INVENTORY STOCK FUNCTIONS ============

async function getCurrentStock(productId) {
  const { data, error } = await supabase
    .from('inventory')
    .select('current_stock')
    .eq('product_id', productId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return 0;
    throw new Error(`Failed to fetch inventory: ${error.message}`);
  }
  return data.current_stock || 0;
}

async function updateInventoryStock(productId, newStock, reason = 'adjustment', notes = '') {
  try {
    const currentStock = await getCurrentStock(productId);
    
    const { data, error } = await supabase
      .from('inventory')
      .upsert({
        product_id: productId,
        current_stock: newStock,
        last_updated: new Date().toISOString()
      }, { onConflict: 'product_id' })
      .select()
      .single();

    if (error) throw new Error(`Failed to update inventory: ${error.message}`);

    // Log the transaction
    const quantityChange = newStock - currentStock;
    if (quantityChange !== 0) {
      const { error: logError } = await supabase
        .from('inventory_transactions')
        .insert({
          product_id: productId,
          quantity: quantityChange,
          type: reason,
          reason: reason,
          notes: notes,
          created_at: new Date().toISOString()
        });
      if (logError) console.error('Failed to log transaction:', logError.message);
    }

    return data;
  } catch (error) {
    console.error('Error in updateInventoryStock:', error);
    throw error;
  }
}

async function addStock(productId, quantity, reason = 'restock', notes = '') {
  const currentStock = await getCurrentStock(productId);
  const newStock = currentStock + quantity;
  return updateInventoryStock(productId, newStock, reason, notes);
}

async function reduceStock(productId, quantity, reason = 'usage', notes = '') {
  const currentStock = await getCurrentStock(productId);
  if (currentStock < quantity) {
    throw new Error(`Insufficient stock. Current: ${currentStock}, Required: ${quantity}`);
  }
  const newStock = currentStock - quantity;
  return updateInventoryStock(productId, newStock, reason, notes);
}

async function updateStock(productId, quantity, reason = 'adjustment', notes = '') {
  return updateInventoryStock(productId, quantity, reason, notes);
}

async function deleteStock(productId) {
  try {
    const { error } = await supabase
      .from('inventory')
      .delete()
      .eq('product_id', productId);

    if (error) throw new Error(`Failed to delete inventory: ${error.message}`);
    return { success: true };
  } catch (error) {
    console.error('Error in deleteStock:', error);
    throw error;
  }
}

// ============ 19L EMPTY BOTTLE FUNCTIONS ============

async function getNineteenLProduct() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name')
      .eq('type', 'REFILL')
      .ilike('name', '%19L%')
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error('Error in getNineteenLProduct:', error);
    return null;
  }
}

async function getEmptyBottles() {
  try {
    const nineteenLProduct = await getNineteenLProduct();
    if (!nineteenLProduct) {
      return null;
    }

    const { data: inventory, error: invErr } = await supabase
      .from('inventory')
      .select('current_stock')
      .eq('product_id', nineteenLProduct.id)
      .maybeSingle();
    
    if (invErr) throw new Error(invErr.message);

    const stock = inventory?.current_stock || 0;

    const { data: returns, error: returnErr } = await supabase
      .from('empty_bottle_returns')
      .select('return_date, quantity, notes')
      .eq('product_id', nineteenLProduct.id)
      .order('return_date', { ascending: false })
      .limit(1);

    const lastReturnDate = (!returnErr && returns && returns.length > 0) ? returns[0].return_date : null;

    const { data: allReturns, error: allReturnsErr } = await supabase
      .from('empty_bottle_returns')
      .select('return_date, quantity, notes')
      .eq('product_id', nineteenLProduct.id)
      .order('return_date', { ascending: false });

    return {
      product: nineteenLProduct,
      stock: stock,
      status: stock < 10 ? 'low' : 'sufficient',
      last_return_date: lastReturnDate,
      return_history: allReturnsErr ? [] : (allReturns || [])
    };
  } catch (error) {
    console.error('Error in getEmptyBottles:', error);
    return null;
  }
}

async function recordEmptyBottleReturn(productId, quantity, returnDate, notes = '') {
  try {
    const product = await getNineteenLProduct();
    if (!product || product.id !== productId) {
      throw new Error('Only 19L bottles can be tracked for empty returns');
    }

    const { data, error } = await supabase
      .from('empty_bottle_returns')
      .insert({
        product_id: productId,
        quantity: quantity,
        return_date: returnDate,
        notes: notes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to record return: ${error.message}`);

    await addStock(productId, quantity, 'empty_bottle_return', notes);

    return data;
  } catch (error) {
    console.error('Error in recordEmptyBottleReturn:', error);
    throw error;
  }
}

async function useEmptyBottles(productId, quantity, notes = '') {
  try {
    const product = await getNineteenLProduct();
    if (!product || product.id !== productId) {
      throw new Error('Only 19L bottles can be used for filling');
    }

    const result = await reduceStock(productId, quantity, 'bottle_usage', notes);
    return result;
  } catch (error) {
    console.error('Error in useEmptyBottles:', error);
    throw error;
  }
}

async function getEmptyBottleReturnHistory() {
  try {
    const product = await getNineteenLProduct();
    if (!product) {
      return [];
    }

    const { data, error } = await supabase
      .from('empty_bottle_returns')
      .select('*')
      .eq('product_id', product.id)
      .order('return_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  } catch (error) {
    console.error('Error in getEmptyBottleReturnHistory:', error);
    return [];
  }
}

// ============ EMPTY BOTTLE COLLECTION FROM DELIVERIES ============

async function getEmptyBottleCollectionAggregate(groupBy = 'day') {
  try {
    const { data, error } = await supabase
      .from('deliveries')
      .select('collecting_empty_bottles, delivery_start_time')
      .gt('collecting_empty_bottles', 0);

    if (error) {
      console.error('Error fetching deliveries for aggregate:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const aggregateMap = {};
    data.forEach(item => {
      const date = new Date(item.delivery_start_time);
      let key;
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        key = startOfWeek.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = date.toISOString().slice(0, 7);
      } else {
        key = date.toISOString().split('T')[0];
      }
      if (!aggregateMap[key]) aggregateMap[key] = 0;
      aggregateMap[key] += Number(item.collecting_empty_bottles) || 0;
    });

    const sortedKeys = Object.keys(aggregateMap).sort();
    return sortedKeys.map(key => ({
      period: key,
      bottles_collected: aggregateMap[key]
    }));
  } catch (error) {
    console.error('Error in getEmptyBottleCollectionAggregate:', error);
    return [];
  }
}

// ============ VENDOR ORDER FUNCTIONS ============

async function createVendorOrder(orderData) {
  try {
    const { data, error } = await supabase
      .from('vendor_orders')
      .insert({
        vendor_id: orderData.vendor_id,
        product_id: orderData.product_id,
        order_type: orderData.order_type,
        quantity: orderData.quantity,
        unit_price: orderData.unit_price,
        total: orderData.total,
        order_date: orderData.order_date,
        delivery_date: orderData.delivery_date,
        status: orderData.status,
        notes: orderData.notes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create vendor order: ${error.message}`);

    if (orderData.order_type === 'bottle' && orderData.status === 'delivered') {
      await addStock(
        orderData.product_id, 
        orderData.quantity, 
        'vendor_order',
        `Vendor order #${data.id} delivered`
      );
    }

    return data;
  } catch (error) {
    console.error('Error in createVendorOrder:', error);
    throw error;
  }
}

async function updateVendorOrder(orderId, updateData) {
  try {
    const currentOrder = await getVendorOrderById(orderId);
    if (!currentOrder) throw new Error('Order not found');

    const statusChangedToDelivered = updateData.status === 'delivered' && currentOrder.status !== 'delivered';
    const isBottleOrder = currentOrder.order_type === 'bottle' || updateData.order_type === 'bottle';

    const { data, error } = await supabase
      .from('vendor_orders')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update vendor order: ${error.message}`);

    if (isBottleOrder && statusChangedToDelivered) {
      const quantity = updateData.quantity || currentOrder.quantity;
      await addStock(
        currentOrder.product_id,
        quantity,
        'vendor_order_delivered',
        `Vendor order #${orderId} delivered`
      );
    }

    if (isBottleOrder && currentOrder.status === 'delivered' && updateData.status !== 'delivered') {
      await reduceStock(
        currentOrder.product_id,
        currentOrder.quantity,
        'vendor_order_reverted',
        `Vendor order #${orderId} reverted`
      );
    }

    return data;
  } catch (error) {
    console.error('Error in updateVendorOrder:', error);
    throw error;
  }
}

async function getVendorOrders(vendorId = null) {
  try {
    // First get orders
    let query = supabase
      .from('vendor_orders')
      .select('*')
      .order('order_date', { ascending: false });

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data: orders, error } = await query;
    if (error) throw new Error(`Failed to fetch vendor orders: ${error.message}`);

    if (!orders || orders.length === 0) {
      return [];
    }

    // Get vendor details
    const vendorIds = orders.map(o => o.vendor_id).filter(id => id !== null);
    let vendorsMap = {};
    if (vendorIds.length > 0) {
      const { data: vendors, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .in('id', vendorIds);
      
      if (!vendorError && vendors) {
        vendorsMap = {};
        vendors.forEach(v => {
          vendorsMap[v.id] = v;
        });
      }
    }

    // Get product details
    const productIds = orders.map(o => o.product_id).filter(id => id !== null);
    let productsMap = {};
    if (productIds.length > 0) {
      const { data: products, error: productError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);
      
      if (!productError && products) {
        productsMap = {};
        products.forEach(p => {
          productsMap[p.id] = p;
        });
      }
    }

    // Combine data
    return orders.map(order => ({
      ...order,
      vendors: vendorsMap[order.vendor_id] || null,
      products: productsMap[order.product_id] || null
    }));
  } catch (error) {
    console.error('Error in getVendorOrders:', error);
    throw error;
  }
}

async function getVendorOrderById(orderId) {
  try {
    const { data, error } = await supabase
      .from('vendor_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw new Error(`Failed to fetch vendor order: ${error.message}`);
    return data;
  } catch (error) {
    console.error('Error in getVendorOrderById:', error);
    throw error;
  }
}

async function getVendorPurchaseSummary() {
  try {
    const { data, error } = await supabase
      .from('vendor_orders')
      .select(`
        vendor_id,
        quantity,
        total,
        order_type
      `)
      .not('status', 'eq', 'cancelled');

    if (error) {
      console.error('Error fetching vendor purchase summary:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Get vendor names
    const vendorIds = data.map(item => item.vendor_id).filter(id => id !== null);
    let vendorsMap = {};
    if (vendorIds.length > 0) {
      const { data: vendors, error: vendorError } = await supabase
        .from('vendors')
        .select('id, vendor_name')
        .in('id', vendorIds);
      
      if (!vendorError && vendors) {
        vendorsMap = {};
        vendors.forEach(v => {
          vendorsMap[v.id] = v;
        });
      }
    }

    const summaryMap = {};
    data.forEach(item => {
      const vendorId = item.vendor_id;
      if (!summaryMap[vendorId]) {
        summaryMap[vendorId] = {
          vendor_id: vendorId,
          vendor_name: vendorsMap[vendorId]?.vendor_name || 'Unknown Vendor',
          total_bottles: 0,
          total_other: 0,
          total_spent: 0,
          order_count: 0
        };
      }
      if (item.order_type === 'bottle') {
        summaryMap[vendorId].total_bottles += Number(item.quantity) || 0;
      } else {
        summaryMap[vendorId].total_other += Number(item.quantity) || 0;
      }
      summaryMap[vendorId].total_spent += Number(item.total) || 0;
      summaryMap[vendorId].order_count += 1;
    });

    return Object.values(summaryMap);
  } catch (error) {
    console.error('Error in getVendorPurchaseSummary:', error);
    return [];
  }
}

// ============ ANALYTICS FUNCTIONS ============

async function getMonthlySales() {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const cutoff = sixMonthsAgo.toISOString();

    const { data, error } = await supabase
      .from('order_items')
      .select(`
        quantity,
        orders!inner (created_at)
      `)
      .gte('orders.created_at', cutoff)
      .neq('orders.order_status', 'CANCELLED');

    if (error) throw new Error(error.message);

    const monthMap = {};
    data.forEach(item => {
      const date = new Date(item.orders.created_at);
      const key = date.toISOString().slice(0, 7);
      if (!monthMap[key]) monthMap[key] = 0;
      monthMap[key] += Number(item.quantity) || 0;
    });

    const months = Object.keys(monthMap).sort();
    return months.map(m => ({
      month: m,
      actual: monthMap[m],
      predicted: Math.round(monthMap[m] * 1.05)
    }));
  } catch (error) {
    console.error('Error in getMonthlySales:', error);
    throw error;
  }
}

// ============ EXPORTS ============

module.exports = {
  // Product functions
  getProductsWithStock,
  getProductById,
  getNineteenLProduct,
  getVendors,
  
  // Inventory stock functions
  getCurrentStock,
  addStock,
  reduceStock,
  updateStock,
  deleteStock,
  updateInventoryStock,
  
  // Empty bottle functions
  getEmptyBottles,
  recordEmptyBottleReturn,
  useEmptyBottles,
  getEmptyBottleReturnHistory,
  getEmptyBottleCollectionAggregate,
  
  // Vendor order functions
  createVendorOrder,
  updateVendorOrder,
  getVendorOrders,
  getVendorOrderById,
  getVendorPurchaseSummary,
  
  // Analytics functions
  getMonthlySales
};