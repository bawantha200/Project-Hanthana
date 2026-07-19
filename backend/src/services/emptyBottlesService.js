// backend/src/services/emptyBottlesService.js
const supabase = require('../config/db');

const emptyBottlesService = {
  // Get current empty bottle stock (combines both sources)
  async getCurrentStock() {
    try {
      // Get total from deliveries (DELIVERED status)
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('collecting_empty_bottles')
        .eq('status', 'DELIVERED');

      if (deliveriesError) throw deliveriesError;

      const totalFromDeliveries = deliveries.reduce((sum, d) => sum + (d.collecting_empty_bottles || 0), 0);

      // Get total from manual returns
      const { data: manualReturns, error: manualError } = await supabase
        .from('empty_bottle_returns')
        .select('quantity');

      if (manualError) throw manualError;

      const totalManual = manualReturns.reduce((sum, r) => sum + (r.quantity || 0), 0);

      const totalStock = totalFromDeliveries + totalManual;

      // Get last return date from either source
      const { data: lastReturn, error: lastError } = await supabase
        .from('empty_bottle_returns')
        .select('return_date')
        .order('return_date', { ascending: false })
        .limit(1);

      if (lastError) throw lastError;

      // Also check deliveries for last collected date
      const { data: lastDelivery, error: deliveryLastError } = await supabase
        .from('deliveries')
        .select('delivery_end_time')
        .eq('status', 'DELIVERED')
        .gt('collecting_empty_bottles', 0)
        .order('delivery_end_time', { ascending: false })
        .limit(1);

      if (deliveryLastError) throw deliveryLastError;

      const lastReturnDate = lastReturn?.[0]?.return_date || null;
      const lastDeliveryDate = lastDelivery?.[0]?.delivery_end_time || null;

      // Use the most recent date
      let lastDate = null;
      if (lastReturnDate && lastDeliveryDate) {
        lastDate = new Date(lastReturnDate) > new Date(lastDeliveryDate) ? lastReturnDate : lastDeliveryDate;
      } else if (lastReturnDate) {
        lastDate = lastReturnDate;
      } else if (lastDeliveryDate) {
        lastDate = lastDeliveryDate;
      }

      return {
        stock: totalStock,
        from_deliveries: totalFromDeliveries,
        from_manual: totalManual,
        status: totalStock < 5 ? 'low' : 'sufficient',
        last_return_date: lastDate
      };
    } catch (error) {
      console.error('Error in getCurrentStock:', error);
      throw error;
    }
  },

  // Get all returns (combines deliveries and manual entries)
  async getAllReturns(filters = {}) {
    try {
      // Get deliveries with collected bottles
      let deliveriesQuery = supabase
        .from('deliveries')
        .select(`
          id,
          order_id,
          status,
          delivery_end_time,
          collecting_empty_bottles,
          updated_at
        `)
        .eq('status', 'DELIVERED')
        .gt('collecting_empty_bottles', 0);

      if (filters.startDate) {
        deliveriesQuery = deliveriesQuery.gte('delivery_end_time', filters.startDate);
      }
      if (filters.endDate) {
        deliveriesQuery = deliveriesQuery.lte('delivery_end_time', filters.endDate);
      }

      const { data: deliveries, error: deliveriesError } = await deliveriesQuery
        .order('delivery_end_time', { ascending: false });

      if (deliveriesError) throw deliveriesError;

      // Get manual returns from empty_bottle_returns
      let manualQuery = supabase
        .from('empty_bottle_returns')
        .select(`
          *,
          products:product_id (
            id,
            name,
            type
          )
        `);

      if (filters.startDate) {
        manualQuery = manualQuery.gte('return_date', filters.startDate);
      }
      if (filters.endDate) {
        manualQuery = manualQuery.lte('return_date', filters.endDate);
      }
      if (filters.productId) {
        manualQuery = manualQuery.eq('product_id', filters.productId);
      }

      const { data: manualReturns, error: manualError } = await manualQuery
        .order('return_date', { ascending: false });

      if (manualError) throw manualError;

      // Format deliveries as returns
      const formattedDeliveries = deliveries.map(d => ({
        id: `delivery_${d.id}`,
        delivery_id: d.id,
        order_id: d.order_id,
        quantity: d.collecting_empty_bottles,
        return_date: d.delivery_end_time ? d.delivery_end_time.split('T')[0] : null,
        notes: `From delivery #${d.id}`,
        source: 'delivery',
        created_at: d.delivery_end_time || d.updated_at,
        product: null
      }));

      // Format manual returns
      const formattedManual = manualReturns.map(r => ({
        ...r,
        source: 'manual',
        delivery_id: null,
        order_id: null
      }));

      // Combine and sort by date (newest first)
      const allReturns = [...formattedDeliveries, ...formattedManual];
      allReturns.sort((a, b) => {
        const dateA = a.return_date || a.created_at;
        const dateB = b.return_date || b.created_at;
        return new Date(dateB) - new Date(dateA);
      });

      return allReturns;
    } catch (error) {
      console.error('Error in getAllReturns:', error);
      throw error;
    }
  },

  // Record return from delivery (updates delivery record)
  async recordFromDelivery(deliveryId, quantity, notes = '') {
    try {
      // Verify delivery exists
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .select('id, status, collecting_empty_bottles')
        .eq('id', deliveryId)
        .single();

      if (deliveryError) throw new Error('Delivery not found');
      
      // Update delivery with collected bottles count
      const currentCollected = delivery.collecting_empty_bottles || 0;
      const { data: updatedDelivery, error: updateError } = await supabase
        .from('deliveries')
        .update({ 
          collecting_empty_bottles: currentCollected + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliveryId)
        .select()
        .single();

      if (updateError) throw updateError;

      return {
        id: `delivery_${deliveryId}`,
        delivery_id: deliveryId,
        quantity: currentCollected + quantity,
        source: 'delivery',
        notes: notes || `Updated delivery #${deliveryId}`,
        return_date: new Date().toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Error in recordFromDelivery:', error);
      throw error;
    }
  },

  // Record manual return (add to empty_bottle_returns table)
  async recordManual(quantity, returnDate, notes = '') {
    try {
      // Get the 19L product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .ilike('name', '%19l%')
        .limit(1);

      if (productError) throw productError;
      if (!product || product.length === 0) {
        throw new Error('19L product not found. Please add a 19L product first.');
      }

      const productId = product[0].id;

      const returnData = {
        product_id: productId,
        quantity: quantity,
        return_date: returnDate || new Date().toISOString().split('T')[0],
        notes: notes || 'Manual entry'
      };

      const { data, error } = await supabase
        .from('empty_bottle_returns')
        .insert([returnData])
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        source: 'manual',
        delivery_id: null,
        order_id: null
      };
    } catch (error) {
      console.error('Error in recordManual:', error);
      throw error;
    }
  },

  // Use bottles (reduce stock via manual entry with negative quantity)
  async useBottles(quantity, reason = 'usage', notes = '') {
    try {
      // Check if enough stock
      const stock = await this.getCurrentStock();
      if (stock.stock < quantity) {
        throw new Error(`Insufficient bottles. Available: ${stock.stock}, Requested: ${quantity}`);
      }

      // Get the 19L product
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id')
        .ilike('name', '%19l%')
        .limit(1);

      if (productError) throw productError;
      if (!product || product.length === 0) {
        throw new Error('19L product not found');
      }

      const productId = product[0].id;

      // Record usage as negative quantity
      const returnData = {
        product_id: productId,
        quantity: -Math.abs(quantity),
        return_date: new Date().toISOString().split('T')[0],
        notes: notes || `Used for: ${reason || 'production'}`
      };

      const { data, error } = await supabase
        .from('empty_bottle_returns')
        .insert([returnData])
        .select()
        .single();

      if (error) throw error;

      return {
        ...data,
        source: 'manual'
      };
    } catch (error) {
      console.error('Error in useBottles:', error);
      throw error;
    }
  },

  // Get daily aggregate (combines both sources)
  async getDailyAggregate(days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateStr = startDate.toISOString().split('T')[0];

      // Get deliveries with collected bottles
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select('delivery_end_time, collecting_empty_bottles')
        .eq('status', 'DELIVERED')
        .gte('delivery_end_time', startDateStr)
        .order('delivery_end_time', { ascending: true });

      if (deliveriesError) throw deliveriesError;

      // Get manual returns
      const { data: manualReturns, error: manualError } = await supabase
        .from('empty_bottle_returns')
        .select('return_date, quantity')
        .gte('return_date', startDateStr)
        .order('return_date', { ascending: true });

      if (manualError) throw manualError;

      // Aggregate by date
      const aggregate = {};
      
      // Add deliveries
      deliveries.forEach(d => {
        const date = d.delivery_end_time ? d.delivery_end_time.split('T')[0] : null;
        if (date) {
          if (!aggregate[date]) aggregate[date] = 0;
          aggregate[date] += d.collecting_empty_bottles || 0;
        }
      });

      // Add manual returns
      manualReturns.forEach(r => {
        const date = r.return_date;
        if (!aggregate[date]) aggregate[date] = 0;
        aggregate[date] += r.quantity || 0;
      });

      // Fill in missing dates
      const result = [];
      const currentDate = new Date(startDateStr);
      const endDate = new Date();
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.toLocaleDateString('en-US', { weekday: 'short' });
        const monthDay = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        result.push({
          period: `${dayOfWeek} ${monthDay}`,
          date: dateStr,
          bottles_collected: aggregate[dateStr] || 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return result;
    } catch (error) {
      console.error('Error in getDailyAggregate:', error);
      throw error;
    }
  },

  // Get returns with delivery info (combined view)
  async getReturnsWithDeliveryInfo() {
    try {
      // Get deliveries with collected bottles
      const { data: deliveries, error: deliveriesError } = await supabase
        .from('deliveries')
        .select(`
          id,
          order_id,
          delivery_end_time,
          collecting_empty_bottles,
          updated_at,
          status
        `)
        .eq('status', 'DELIVERED')
        .gt('collecting_empty_bottles', 0)
        .order('delivery_end_time', { ascending: false });

      if (deliveriesError) throw deliveriesError;

      // Get manual returns
      const { data: manualReturns, error: manualError } = await supabase
        .from('empty_bottle_returns')
        .select(`
          *,
          products:product_id (
            id,
            name,
            type
          )
        `)
        .order('return_date', { ascending: false });

      if (manualError) throw manualError;

      return {
        deliveries: deliveries.map(d => ({
          id: d.id,
          type: 'delivery',
          quantity: d.collecting_empty_bottles,
          date: d.delivery_end_time || d.updated_at,
          order_id: d.order_id,
          status: d.status,
          notes: `From delivery #${d.id}`
        })),
        manual: manualReturns.map(r => ({
          id: r.id,
          type: 'manual',
          quantity: r.quantity,
          date: r.return_date,
          product: r.products,
          notes: r.notes
        }))
      };
    } catch (error) {
      console.error('Error in getReturnsWithDeliveryInfo:', error);
      throw error;
    }
  },

  // Delete a return record (only manual entries)
  async deleteReturn(id) {
    try {
      // Check if it's a delivery record (starts with 'delivery_')
      if (typeof id === 'string' && id.startsWith('delivery_')) {
        // For deliveries, we reset the collecting_empty_bottles to 0
        const deliveryId = parseInt(id.replace('delivery_', ''));
        const { error } = await supabase
          .from('deliveries')
          .update({ 
            collecting_empty_bottles: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', deliveryId);

        if (error) throw error;
        return { success: true, message: 'Delivery record cleared' };
      }

      // For manual entries
      const { error } = await supabase
        .from('empty_bottle_returns')
        .delete()
        .eq('id', parseInt(id));

      if (error) throw error;
      return { success: true, message: 'Manual record deleted' };
    } catch (error) {
      console.error('Error in deleteReturn:', error);
      throw error;
    }
  },

  // Get completed deliveries for dropdown
  async getCompletedDeliveries() {
    try {
      const { data, error } = await supabase
        .from('deliveries')
        .select('id, order_id, delivery_end_time, collecting_empty_bottles')
        .eq('status', 'DELIVERED')
        .order('delivery_end_time', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error in getCompletedDeliveries:', error);
      throw error;
    }
  }
};

module.exports = { emptyBottlesService };