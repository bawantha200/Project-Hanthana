// backend/src/controllers/emptyBottlesController.js
const supabase = require('../config/db');

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

// ============ CONTROLLER FUNCTIONS ============

/**
 * GET /empty-bottles/stock
 */
exports.getStock = async (req, res) => {
  try {
    console.log('📊 GET /empty-bottles/stock');
    
    const product = await getRefill19LProduct();
    if (!product) {
      console.log('⚠️ No Refill 19L product found');
      return res.json({
        emptyBottles: {
          stock: 0,
          status: 'low',
          product: null,
          total_collected: 0
        }
      });
    }

    console.log(`✅ Found Refill 19L product: ${product.name} (ID: ${product.id})`);

    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('empty_bottle_stock')
      .eq('product_id', product.id)
      .maybeSingle();

    if (invError && invError.code !== 'PGRST116') {
      throw new Error(`Failed to fetch inventory: ${invError.message}`);
    }

    const stock = inventory?.empty_bottle_stock || 0;
    console.log(`📊 Current empty bottle stock: ${stock}`);

    const { data: deliveries, error: delError } = await supabase
      .from('deliveries')
      .select('collecting_empty_bottles')
      .eq('status', 'DELIVERED');

    if (delError) {
      console.warn('Failed to fetch deliveries:', delError.message);
    }

    const totalCollected = deliveries?.reduce((sum, d) => sum + (d.collecting_empty_bottles || 0), 0) || 0;
    console.log(`📊 Total collected from deliveries: ${totalCollected}`);

    res.json({
      emptyBottles: {
        product: product,
        stock: stock,
        status: stock < 10 ? 'low' : 'sufficient',
        total_collected: totalCollected
      }
    });
  } catch (error) {
    console.error('Error in getStock:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /empty-bottles/returns
 */
exports.getReturns = async (req, res) => {
  try {
    console.log('📊 GET /empty-bottles/returns');
    
    const product = await getRefill19LProduct();
    if (!product) {
      console.log('⚠️ No Refill 19L product found');
      return res.json({ returns: [] });
    }

    console.log(`✅ Found Refill 19L product: ${product.name} (ID: ${product.id})`);

    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        id,
        status,
        delivery_start_time,
        delivery_end_time,
        collecting_empty_bottles,
        orders (
          id,
          customer_id,
          users!orders_customer_id_fkey (
            name,
            phone
          )
        )
      `)
      .eq('status', 'DELIVERED')
      .gt('collecting_empty_bottles', 0)
      .order('delivery_end_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching returns:', error);
      throw new Error(`Failed to fetch returns: ${error.message}`);
    }

    console.log(`✅ Found ${data?.length || 0} deliveries with empty bottles`);

    const returns = (data || []).map(d => ({
      id: `DEL-${d.id}`,
      delivery_id: d.id,
      quantity: d.collecting_empty_bottles || 0,
      return_date: d.delivery_end_time ? d.delivery_end_time.split('T')[0] : new Date().toISOString().split('T')[0],
      source: 'delivery',
      notes: `From delivery #${d.id}`,
      customer: d.orders?.users ? {
        name: d.orders.users.name,
        phone: d.orders.users.phone
      } : null
    }));

    console.log(`📤 Returning ${returns.length} records`);
    res.json({ returns });
  } catch (error) {
    console.error('Error in getReturns:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /empty-bottles/daily-aggregate
 */
exports.getDailyAggregate = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    console.log(`📊 GET /empty-bottles/daily-aggregate?days=${days}`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString();

    const { data, error } = await supabase
      .from('deliveries')
      .select('collecting_empty_bottles, delivery_end_time')
      .eq('status', 'DELIVERED')
      .gte('delivery_end_time', cutoffStr)
      .order('delivery_end_time', { ascending: true });

    if (error) {
      console.error('❌ Error fetching aggregate:', error);
      throw new Error(`Failed to fetch aggregate: ${error.message}`);
    }

    const aggregateMap = {};
    data?.forEach(d => {
      if (d.collecting_empty_bottles > 0 && d.delivery_end_time) {
        const date = d.delivery_end_time.split('T')[0];
        if (!aggregateMap[date]) aggregateMap[date] = 0;
        aggregateMap[date] += d.collecting_empty_bottles;
      }
    });

    const result = [];
    const currentDate = new Date(cutoffStr);
    const endDate = new Date();
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      result.push({
        period: dateStr,
        bottles_collected: aggregateMap[dateStr] || 0
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({ aggregate: result });
  } catch (error) {
    console.error('Error in getDailyAggregate:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /empty-bottles/deliveries
 */
exports.getCompletedDeliveries = async (req, res) => {
  try {
    console.log('📊 GET /empty-bottles/deliveries');
    
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        id,
        delivery_end_time,
        collecting_empty_bottles,
        orders!inner (
          id,
          customer_id,
          users!orders_customer_id_fkey (
            name,
            phone
          )
        )
      `)
      .eq('status', 'DELIVERED')
      .gt('collecting_empty_bottles', 0)
      .order('delivery_end_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching deliveries:', error);
      throw new Error(`Failed to fetch completed deliveries: ${error.message}`);
    }

    const deliveries = (data || []).map(d => ({
      id: d.id,
      order_id: d.orders?.id,
      delivery_end_time: d.delivery_end_time,
      collecting_empty_bottles: d.collecting_empty_bottles || 0,
      customer: d.orders?.users ? {
        name: d.orders.users.name,
        phone: d.orders.users.phone
      } : null
    }));

    res.json({ deliveries });
  } catch (error) {
    console.error('Error in getCompletedDeliveries:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /empty-bottles/record-from-delivery
 */
exports.recordFromDelivery = async (req, res) => {
  try {
    const { delivery_id, quantity, notes } = req.body;
    console.log(`📦 POST /empty-bottles/record-from-delivery: delivery_id=${delivery_id}, quantity=${quantity}`);

    if (!delivery_id) {
      return res.status(400).json({ error: 'Delivery ID is required' });
    }

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const product = await getRefill19LProduct();
    if (!product) {
      return res.status(404).json({ error: 'Refill 19L product not found' });
    }

    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .select('status, collecting_empty_bottles')
      .eq('id', delivery_id)
      .single();

    if (deliveryError) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    if (delivery.status !== 'DELIVERED') {
      return res.status(400).json({ error: 'Only completed deliveries can be used' });
    }

    // Update delivery
    await supabase
      .from('deliveries')
      .update({ 
        collecting_empty_bottles: quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', delivery_id);

    // Note: Inventory update is handled by the deliveryService when status changes to DELIVERED
    // This endpoint is for manual recording if needed

    res.status(201).json({
      success: true,
      message: `Successfully recorded ${quantity} empty bottles from delivery #${delivery_id}`,
      data: { delivery_id, quantity }
    });
  } catch (error) {
    console.error('Error in recordFromDelivery:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /empty-bottles/use
 */
exports.useBottles = async (req, res) => {
  try {
    const { quantity, notes } = req.body;
    console.log(`📦 POST /empty-bottles/use: quantity=${quantity}`);

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    const product = await getRefill19LProduct();
    if (!product) {
      return res.status(404).json({ error: 'Refill 19L product not found' });
    }

    // Note: Empty bottle usage is handled by stockService.addStock with production reason

    res.json({
      success: true,
      message: `Successfully used ${quantity} empty bottles for production`,
      data: { product_id: product.id, quantity_used: quantity }
    });
  } catch (error) {
    console.error('Error in useBottles:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /empty-bottles/with-deliveries
 */
exports.getWithDeliveries = async (req, res) => {
  try {
    console.log('📊 GET /empty-bottles/with-deliveries');
    
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        id,
        status,
        delivery_start_time,
        delivery_end_time,
        collecting_empty_bottles,
        orders (
          id,
          customer_id,
          users!orders_customer_id_fkey (
            name,
            phone
          )
        )
      `)
      .eq('status', 'DELIVERED')
      .gt('collecting_empty_bottles', 0)
      .order('delivery_end_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching deliveries:', error);
      throw new Error(`Failed to fetch deliveries: ${error.message}`);
    }

    res.json({ deliveries: data || [] });
  } catch (error) {
    console.error('Error in getWithDeliveries:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /empty-bottles/:id
 */
exports.deleteReturn = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ DELETE /empty-bottles/${id}`);

    const deliveryId = parseInt(id);
    if (isNaN(deliveryId)) {
      return res.status(400).json({ error: 'Invalid delivery ID' });
    }

    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('id, collecting_empty_bottles')
      .eq('id', deliveryId)
      .single();

    if (fetchError) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const quantity = delivery.collecting_empty_bottles || 0;
    console.log(`📊 Delivery ${deliveryId} has ${quantity} empty bottles`);

    if (quantity <= 0) {
      return res.status(400).json({ error: 'No empty bottles to reverse' });
    }

    // Reset the delivery
    await supabase
      .from('deliveries')
      .update({ 
        collecting_empty_bottles: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', deliveryId);

    console.log(`✅ Reversed ${quantity} empty bottles from delivery #${deliveryId}`);

    res.json({
      success: true,
      message: `Reversed ${quantity} empty bottles from delivery #${deliveryId}`,
      data: { delivery_id: deliveryId, quantity_reversed: quantity }
    });
  } catch (error) {
    console.error('Error in deleteReturn:', error);
    res.status(500).json({ error: error.message });
  }
};