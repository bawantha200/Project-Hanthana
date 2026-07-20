// backend/src/services/stockService.js
const supabase = require('../config/db');

const stockService = {
  // Get all products with current stock levels
  async getProductsWithStock() {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('📡 Fetching products with stock from database...');
      console.log('═══════════════════════════════════════════════════');
      
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          *,
          inventory (
            current_stock,
            empty_bottle_stock,
            reorder_level,
            vendor_id,
            vendors (
              vendor_name
            )
          )
        `)
        .order('name');

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }

      console.log(`✅ Found ${products?.length || 0} products`);

      if (!products || products.length === 0) {
        return [];
      }

      const mappedProducts = products.map((p, index) => {
        const inventory = p.inventory || {};
        const isRefill = p.type?.toLowerCase() === 'refill' || p.type?.toLowerCase() === 'empty';
        const emptyStock = inventory.empty_bottle_stock || 0;
        const sealedStock = inventory.current_stock || 0;
        // For refill products, show empty_bottle_stock as stock
        // For sealed products, show current_stock as stock
        const stock = isRefill ? emptyStock : sealedStock;
        const reorderLevel = inventory.reorder_level || 50;
        
        const result = {
          id: p.id,
          name: p.name,
          type: p.type,
          stock: stock,
          empty_bottle_stock: emptyStock,
          sealed_stock: sealedStock,
          reorder_level: reorderLevel,
          vendor_id: inventory.vendor_id || null,
          vendor_name: inventory.vendors?.vendor_name || null,
          status: stock <= reorderLevel ? 'low' : 'ok',
          unit_price: p.unit_price || 0,
          is_refill: isRefill
        };
        
        console.log(`📊 Product ${index + 1}: ${p.name}`);
        console.log(`   - Type: ${p.type}`);
        console.log(`   - Sealed Stock (current_stock): ${sealedStock}`);
        console.log(`   - Empty Stock (empty_bottle_stock): ${emptyStock}`);
        console.log(`   - Status: ${result.status}`);
        console.log('   ---');
        
        return result;
      });

      console.log(`✅ Successfully mapped ${mappedProducts.length} products`);
      return mappedProducts;
    } catch (error) {
      console.error('❌ Error in getProductsWithStock:', error);
      throw error;
    }
  },

  // Get single product with stock
  async getProductById(productId) {
    try {
      console.log(`🔍 Fetching product with ID: ${productId}`);
      
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          inventory (
            current_stock,
            empty_bottle_stock,
            reorder_level,
            vendor_id
          )
        `)
        .eq('id', productId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching product:', error);
        throw error;
      }
      
      if (!product) {
        console.log(`⚠️ Product with ID ${productId} not found`);
        return null;
      }

      const inventory = product.inventory || {};
      const isRefill = product.type?.toLowerCase() === 'refill' || product.type?.toLowerCase() === 'empty';
      const emptyStock = inventory.empty_bottle_stock || 0;
      const sealedStock = inventory.current_stock || 0;

      const result = {
        ...product,
        stock: isRefill ? emptyStock : sealedStock,
        empty_bottle_stock: emptyStock,
        sealed_stock: sealedStock,
        is_refill: isRefill
      };

      return result;
    } catch (error) {
      console.error('Error in getProductById:', error);
      throw error;
    }
  },

  // Get current stock for a product
  async getCurrentStock(productId) {
    try {
      console.log(`🔍 Getting current stock for product ID: ${productId}`);
      
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('type')
        .eq('id', productId)
        .maybeSingle();

      if (productError) {
        console.error('❌ Error fetching product type:', productError);
        throw productError;
      }

      const isRefill = product?.type?.toLowerCase() === 'refill' || 
                       product?.type?.toLowerCase() === 'empty';

      const { data, error } = await supabase
        .from('inventory')
        .select(isRefill ? 'empty_bottle_stock' : 'current_stock')
        .eq('product_id', productId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching stock:', error);
        throw error;
      }

      const stock = isRefill ? (data?.empty_bottle_stock || 0) : (data?.current_stock || 0);
      console.log(`✅ Current stock: ${stock}`);
      return stock;
    } catch (error) {
      console.error('Error in getCurrentStock:', error);
      throw error;
    }
  },

  // Add stock - MAIN LOGIC
  async addStock(productId, quantity, reason = 'restock', notes = '') {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('📦 Adding stock');
      console.log(`   Product ID: ${productId}`);
      console.log(`   Quantity: ${quantity}`);
      console.log('═══════════════════════════════════════════════════');
      
      const qty = Number(quantity);
      if (!Number.isInteger(qty) || qty <= 0) {
        throw new Error('Quantity must be a positive whole number');
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, type')
        .eq('id', productId)
        .maybeSingle();

      if (productError) throw productError;
      if (!product) throw new Error('Product not found');

      const isRefill = product.type?.toLowerCase() === 'refill' ||
                        product.type?.toLowerCase() === 'empty';

      console.log(`📊 Product: ${product.name}`);
      console.log(`📊 Type: ${product.type}`);
      console.log(`📊 Is Refill: ${isRefill}`);

      // Get current inventory
      const { data: existingInventory, error: fetchError } = await supabase
        .from('inventory')
        .select('id, current_stock, empty_bottle_stock')
        .eq('product_id', productId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // === REFILL / EMPTY PRODUCT: just add empty bottle stock ===
      if (isRefill) {
        console.log('🔄 Adding to REFILL product - updating empty bottle stock only');
        
        const currentEmpty = existingInventory?.empty_bottle_stock || 0;
        const newEmpty = currentEmpty + qty;

        console.log(`📊 Current empty: ${currentEmpty} -> New: ${newEmpty}`);

        const { data: updatedInventory, error: updateError } = await supabase
          .from('inventory')
          .update({ 
            empty_bottle_stock: newEmpty,
            last_empty_updated: new Date().toISOString()
          })
          .eq('product_id', productId)
          .select()
          .single();

        if (updateError) throw updateError;

        await supabase
          .from('inventory_transactions')
          .insert([{
            product_id: productId,
            quantity: qty,
            type: 'empty_bottle_add',
            reason: reason || 'manual_add',
            notes: notes || `Added ${qty} empty bottles to ${product.name}`
          }]);

        return {
          success: true,
          message: `Added ${qty} empty bottles to ${product.name}`,
          inventory: updatedInventory
        };
      }

      // === SEALED PRODUCT: Update current_stock AND deduct from empty_bottle_stock ===
      console.log('🔄 Adding to SEALED product - will deduct from empty_bottle_stock');

      const currentSealed = existingInventory?.current_stock || 0;
      const currentEmpty = existingInventory?.empty_bottle_stock || 0;

      console.log(`📊 Current Sealed Stock: ${currentSealed}`);
      console.log(`📊 Current Empty Stock: ${currentEmpty}`);

      // Check if enough empty bottles
      if (currentEmpty < qty) {
        throw new Error(`Insufficient empty bottles for ${product.name}. Available: ${currentEmpty}, Required: ${qty}`);
      }

      const newSealed = currentSealed + qty;
      const newEmpty = currentEmpty - qty;

      console.log(`📊 New Sealed Stock: ${newSealed}`);
      console.log(`📊 New Empty Stock: ${newEmpty}`);

      // Update both current_stock (INCREASE) and empty_bottle_stock (DECREASE)
      const { data: updatedInventory, error: updateError } = await supabase
        .from('inventory')
        .update({ 
          current_stock: newSealed,
          empty_bottle_stock: newEmpty,
          last_updated: new Date().toISOString(),
          last_empty_updated: new Date().toISOString()
        })
        .eq('product_id', productId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Record transaction for sealed stock
      await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: productId,
          quantity: qty,
          type: 'add',
          reason: reason || 'restock',
          notes: notes || `Added ${qty} sealed bottles (used ${qty} empty bottles from inventory)`
        }]);

      // Record transaction for empty bottle usage
      await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: productId,
          quantity: -qty,
          type: 'empty_bottle_usage',
          reason: 'sealed_stock_add',
          notes: `Used ${qty} empty bottles to create sealed ${product.name}`
        }]);

      console.log('✅ Stock updated successfully');
      console.log('📤 Updated inventory:', updatedInventory);
      console.log('═══════════════════════════════════════════════════');

      return {
        success: true,
        message: `Added ${qty} sealed bottles and deducted ${qty} empty bottles from ${product.name}`,
        inventory: updatedInventory
      };
    } catch (error) {
      console.error('❌ Error in addStock:', error);
      throw error;
    }
  },

  // Reduce stock
  async reduceStock(productId, quantity, reason = 'usage', notes = '') {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('📦 Reducing stock');
      console.log(`   Product ID: ${productId}`);
      console.log(`   Quantity: ${quantity}`);
      console.log('═══════════════════════════════════════════════════');
      
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, name, type')
        .eq('id', productId)
        .maybeSingle();

      if (productError) throw productError;
      if (!product) throw new Error('Product not found');

      const isRefill = product.type?.toLowerCase() === 'refill' || 
                       product.type?.toLowerCase() === 'empty';

      const { data: existingInventory, error: checkError } = await supabase
        .from('inventory')
        .select('id, current_stock, empty_bottle_stock')
        .eq('product_id', productId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (isRefill) {
        console.log('🔄 Reducing REFILL product - decreasing empty stock');
        const currentEmpty = existingInventory?.empty_bottle_stock || 0;
        
        if (currentEmpty < quantity) {
          throw new Error(`Insufficient empty bottles. Available: ${currentEmpty}, Required: ${quantity}`);
        }

        const newEmpty = currentEmpty - quantity;

        const { data: updatedInventory, error: updateError } = await supabase
          .from('inventory')
          .update({ 
            empty_bottle_stock: newEmpty,
            last_empty_updated: new Date().toISOString()
          })
          .eq('product_id', productId)
          .select()
          .single();

        if (updateError) throw updateError;

        await supabase
          .from('inventory_transactions')
          .insert([{
            product_id: productId,
            quantity: -Math.abs(quantity),
            type: 'empty_bottle_usage',
            reason: reason || 'usage',
            notes: notes || `Used ${quantity} empty bottles from ${product.name}`
          }]);

        return { success: true, inventory: updatedInventory };
      }

      // Sealed product - just reduce current_stock
      console.log('🔄 Reducing SEALED product - decreasing sealed stock');
      const currentStock = existingInventory?.current_stock || 0;
      
      if (currentStock < quantity) {
        throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${quantity}`);
      }

      const newStock = currentStock - quantity;

      const { data: updatedInventory, error: updateError } = await supabase
        .from('inventory')
        .update({ 
          current_stock: newStock,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', productId)
        .select()
        .single();

      if (updateError) throw updateError;

      await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: productId,
          quantity: -quantity,
          type: 'reduce',
          reason: reason || 'usage',
          notes: notes || `Reduced ${quantity} sealed bottles from ${product.name}`
        }]);

      console.log('✅ Stock reduced successfully');
      console.log('═══════════════════════════════════════════════════');

      return { success: true, inventory: updatedInventory };
    } catch (error) {
      console.error('Error in reduceStock:', error);
      throw error;
    }
  },

  // Update stock
  async updateStock(productId, quantity, reason = 'adjustment', notes = '') {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('📦 Updating stock');
      console.log(`   Product ID: ${productId}`);
      console.log(`   Target Quantity: ${quantity}`);
      console.log('═══════════════════════════════════════════════════');
      
      const currentStock = await this.getCurrentStock(productId);
      const difference = quantity - currentStock;

      console.log(`📊 Current stock: ${currentStock}`);
      console.log(`📊 Difference: ${difference}`);

      if (difference > 0) {
        console.log('🔄 Adding stock (positive difference)');
        return await this.addStock(productId, difference, reason, notes);
      } else if (difference < 0) {
        console.log('🔄 Reducing stock (negative difference)');
        return await this.reduceStock(productId, Math.abs(difference), reason, notes);
      }

      console.log('ℹ️ No change needed');
      console.log('═══════════════════════════════════════════════════');
      return { success: true, message: 'No change needed' };
    } catch (error) {
      console.error('Error in updateStock:', error);
      throw error;
    }
  },

  // Delete stock
  async deleteStock(productId) {
    try {
      console.log(`🗑️ Deleting stock for product ID: ${productId}`);
      
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('product_id', productId);

      if (error) {
        console.error('❌ Error deleting stock:', error);
        throw error;
      }
      
      console.log('✅ Stock deleted successfully');
      return { success: true };
    } catch (error) {
      console.error('Error in deleteStock:', error);
      throw error;
    }
  },

  // Process vendor order
  async processVendorOrder(orderId) {
    try {
      console.log(`📦 Processing vendor order ID: ${orderId}`);
      
      const { data: order, error: orderError } = await supabase
        .from('vendor_orders')
        .select(`
          *,
          products (
            id,
            name
          )
        `)
        .eq('id', orderId)
        .maybeSingle();

      if (orderError) throw orderError;
      if (!order) throw new Error('Order not found');

      console.log(`📊 Order status: ${order.status}, Type: ${order.order_type}`);

      if (order.status !== 'delivered') {
        console.log('ℹ️ Order not delivered yet');
        return { success: true, message: 'Order not delivered yet' };
      }

      if (order.order_type !== 'bottle') {
        console.log('ℹ️ Non-bottle order');
        return { success: true, message: 'Non-bottle order' };
      }

      const result = await this.addStock(
        order.product_id,
        order.quantity,
        'vendor_order_delivered',
        `Vendor order #${orderId} - ${order.products?.name || 'Product'} delivered`
      );

      return result;
    } catch (error) {
      console.error('Error in processVendorOrder:', error);
      throw error;
    }
  },

  // Sync empty bottle stock
  async syncEmptyBottleStock() {
    try {
      console.log('🔄 Syncing empty bottle stock...');
      // This can be used to recalculate empty_bottle_stock from transactions
      return { success: true, message: 'Sync completed' };
    } catch (error) {
      console.error('Error in syncEmptyBottleStock:', error);
      throw error;
    }
  },

  // Get transaction history
  async getTransactionHistory(productId = null, limit = 50) {
    try {
      console.log(`📊 Fetching transaction history${productId ? ` for product ${productId}` : ''}, limit: ${limit}`);
      
      let query = supabase
        .from('inventory_transactions')
        .select(`
          *,
          products (
            id,
            name,
            type
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      console.log(`✅ Found ${data?.length || 0} transactions`);
      return data || [];
    } catch (error) {
      console.error('Error in getTransactionHistory:', error);
      throw error;
    }
  },

  // Get stock summary
  async getStockSummary() {
    try {
      console.log('📊 Getting stock summary...');
      
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          inventory (
            current_stock,
            empty_bottle_stock
          )
        `);

      if (error) throw error;

      let sealedStock = 0;
      let emptyStock = 0;

      products.forEach(p => {
        const inv = p.inventory || {};
        sealedStock += inv.current_stock || 0;
        emptyStock += inv.empty_bottle_stock || 0;
      });

      console.log(`📊 Summary: Sealed: ${sealedStock}, Empty: ${emptyStock}, Total: ${sealedStock + emptyStock}`);

      return {
        sealed_bottles: sealedStock,
        empty_bottles: emptyStock,
        total: sealedStock + emptyStock
      };
    } catch (error) {
      console.error('Error in getStockSummary:', error);
      throw error;
    }
  },

  // Initialize inventory for a product
  async initializeInventory(productId, vendorId, reorderLevel = 50) {
    try {
      console.log(`🔧 Initializing inventory for product ${productId}`);
      
      const { data: existing, error: checkError } = await supabase
        .from('inventory')
        .select('id')
        .eq('product_id', productId)
        .maybeSingle();

      if (checkError) throw checkError;
      if (existing) {
        console.log(`ℹ️ Inventory already exists for product ${productId}`);
        return existing;
      }

      const { data, error } = await supabase
        .from('inventory')
        .insert([{
          product_id: productId,
          current_stock: 0,
          empty_bottle_stock: 0,
          vendor_id: vendorId || 1,
          reorder_level: reorderLevel,
          last_updated: new Date().toISOString(),
          last_empty_updated: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) throw error;
      
      console.log(`✅ Inventory initialized for product ${productId}`);
      return data;
    } catch (error) {
      console.error('Error in initializeInventory:', error);
      throw error;
    }
  }
};

module.exports = stockService;