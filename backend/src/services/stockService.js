// backend/src/services/stockService.js
const supabase = require('../config/db');

// ============ HELPER: Get All 19L Products ============
const getAll19LProducts = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('id, name, type')
      .ilike('name', '%19L%');
    
    if (error) throw new Error(`Failed to fetch 19L products: ${error.message}`);
    return data || [];
  } catch (error) {
    console.error('Error in getAll19LProducts:', error);
    return [];
  }
};

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

// ============ UPDATE EMPTY BOTTLE STOCK FOR ALL 19L PRODUCTS ============
const updateEmptyBottleStockForAll19L = async (quantity, operation = 'add', notes = '') => {
  console.log(`📦 [updateEmptyBottleStockForAll19L] ${operation} ${quantity} empty bottles for ALL 19L products...`);

  if (!quantity || quantity <= 0) {
    console.log('ℹ️ No empty bottles to update');
    return null;
  }

  try {
    const all19LProducts = await getAll19LProducts();
    
    if (!all19LProducts || all19LProducts.length === 0) {
      console.error('❌ No 19L products found');
      throw new Error('No 19L products found');
    }

    console.log(`✅ Found ${all19LProducts.length} 19L products:`, all19LProducts.map(p => p.name));

    let results = [];
    let totalUpdated = 0;

    for (const product of all19LProducts) {
      console.log(`📊 Processing product: ${product.name} (ID: ${product.id})`);

      const { data: existingInventory, error: checkError } = await supabase
        .from('inventory')
        .select('id, empty_bottle_stock, current_stock')
        .eq('product_id', product.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error(`❌ Error checking inventory for ${product.name}:`, checkError);
        continue;
      }

      const currentStock = existingInventory?.empty_bottle_stock || 0;
      let newStock;

      if (operation === 'add') {
        newStock = currentStock + quantity;
      } else if (operation === 'subtract') {
        if (currentStock < quantity) {
          console.warn(`⚠️ Insufficient empty bottles for ${product.name}. Available: ${currentStock}, Required: ${quantity}`);
          continue;
        }
        newStock = currentStock - quantity;
      } else {
        throw new Error('Invalid operation. Use "add" or "subtract"');
      }

      let result;
      if (existingInventory) {
        const { data, error } = await supabase
          .from('inventory')
          .update({
            empty_bottle_stock: newStock,
            last_empty_updated: new Date().toISOString()
          })
          .eq('id', existingInventory.id)
          .select()
          .single();

        if (error) {
          console.error(`❌ Failed to update ${product.name}:`, error);
          continue;
        }
        result = data;
        console.log(`✅ ${product.name}: ${currentStock} -> ${newStock}`);
      } else {
        const { data, error } = await supabase
          .from('inventory')
          .insert({
            product_id: product.id,
            current_stock: 0,
            empty_bottle_stock: quantity,
            reorder_level: 50,
            last_updated: new Date().toISOString(),
            last_empty_updated: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Failed to create inventory for ${product.name}:`, error);
          continue;
        }
        result = data;
        console.log(`✅ ${product.name}: New inventory created with ${quantity} empty bottles`);
      }

      results.push(result);
      totalUpdated++;

      await supabase
        .from('inventory_transactions')
        .insert({
          product_id: product.id,
          quantity: operation === 'add' ? quantity : -quantity,
          type: operation === 'add' ? 'empty_bottle_collection' : 'empty_bottle_usage',
          reason: operation === 'add' ? 'delivery_completed' : 'production_usage',
          notes: notes || (operation === 'add' 
            ? `Collected ${quantity} empty bottles for ${product.name}` 
            : `Used ${quantity} empty bottles for ${product.name}`)
        });
    }

    console.log(`✅ Successfully updated ${totalUpdated} of ${all19LProducts.length} 19L products`);
    return results;
  } catch (err) {
    console.error('💥 [updateEmptyBottleStockForAll19L] Unexpected error:', err);
    throw err;
  }
};

// ============ GET EMPTY BOTTLE STOCK ============
const getEmptyBottleStock = async () => {
  try {
    const all19LProducts = await getAll19LProducts();
    if (!all19LProducts || all19LProducts.length === 0) {
      return { stock: 0, products: [] };
    }

    const firstProduct = all19LProducts[0];
    const { data: inventory, error } = await supabase
      .from('inventory')
      .select('empty_bottle_stock')
      .eq('product_id', firstProduct.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching empty bottle stock:', error);
      return { stock: 0, products: all19LProducts };
    }

    return { 
      stock: inventory?.empty_bottle_stock || 0, 
      products: all19LProducts 
    };
  } catch (error) {
    console.error('Error in getEmptyBottleStock:', error);
    return { stock: 0, products: [] };
  }
};

// ============ STOCK SERVICE ============
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
            reorder_level
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
        const is19L = p.name?.toLowerCase().includes('19l');
        const isSealed = p.type?.toLowerCase() === 'sealed';
        
        const emptyStock = inventory.empty_bottle_stock || 0;
        const sealedStock = inventory.current_stock || 0;
        const stock = sealedStock;
        const reorderLevel = inventory.reorder_level || 50;
        
        const result = {
          id: p.id,
          name: p.name,
          type: p.type,
          stock: stock,
          empty_bottle_stock: emptyStock,
          sealed_stock: sealedStock,
          reorder_level: reorderLevel,
          vendor_id: null,
          vendor_name: null,
          status: stock <= reorderLevel ? 'low' : 'ok',
          unit_price: p.unit_price || 0,
          is_refill: isRefill,
          is_19l: is19L,
          is_sealed: isSealed
        };
        
        console.log(`📊 Product ${index + 1}: ${p.name}`);
        console.log(`   - Type: ${p.type}`);
        console.log(`   - Is 19L: ${is19L}`);
        console.log(`   - Sealed Stock: ${sealedStock}`);
        console.log(`   - Empty Stock: ${emptyStock}`);
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
            reorder_level
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
      const is19L = product.name?.toLowerCase().includes('19l');

      const result = {
        ...product,
        stock: inventory.current_stock || 0,
        empty_bottle_stock: inventory.empty_bottle_stock || 0,
        sealed_stock: inventory.current_stock || 0,
        is_refill: isRefill,
        is_19l: is19L
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
      
      const { data, error } = await supabase
        .from('inventory')
        .select('current_stock')
        .eq('product_id', productId)
        .maybeSingle();

      if (error) {
        console.error('❌ Error fetching stock:', error);
        throw error;
      }

      const stock = data?.current_stock || 0;
      console.log(`✅ Current stock: ${stock}`);
      return stock;
    } catch (error) {
      console.error('Error in getCurrentStock:', error);
      throw error;
    }
  },

  async addStock(productId, quantity, reason = 'restock', notes = '') {
    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('📦 Adding stock');
      console.log(`   Product ID: ${productId}`);
      console.log(`   Quantity: ${quantity}`);
      console.log(`   Reason: ${reason}`);
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
      const isSealed = product.type?.toLowerCase() === 'sealed';
      const is19L = product.name?.toLowerCase().includes('19l');

      console.log(`📊 Product: ${product.name}`);
      console.log(`📊 Type: ${product.type}`);
      console.log(`📊 Is Refill: ${isRefill}`);
      console.log(`📊 Is Sealed: ${isSealed}`);
      console.log(`📊 Is 19L: ${is19L}`);

      const { data: existingInventory, error: fetchError } = await supabase
        .from('inventory')
        .select('id, current_stock, empty_bottle_stock')
        .eq('product_id', productId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      const isProduction = reason === 'production' || 
                          reason === 'restock' || 
                          reason === 'adjustment' ||
                          notes?.toLowerCase().includes('produce') ||
                          notes?.toLowerCase().includes('restock');

      // ============================================================
      // CASE 1: 19L Sealed Product - Uses its OWN empty bottles
      // ============================================================
      if (is19L && isSealed && isProduction) {
        console.log(`🔄 Adding to ${product.name} - decreasing its OWN empty stock, increasing sealed stock`);
        
        const currentEmpty = existingInventory?.empty_bottle_stock || 0;
        
        if (currentEmpty < qty) {
          throw new Error(`Insufficient empty bottles for ${product.name}. Available: ${currentEmpty}, Required: ${qty}`);
        }

        const currentSealed = existingInventory?.current_stock || 0;
        const newSealed = currentSealed + qty;
        const newEmpty = currentEmpty - qty;

        let updatedInventory;
        if (existingInventory) {
          const { data, error } = await supabase
            .from('inventory')
            .update({
              current_stock: newSealed,
              empty_bottle_stock: newEmpty,
              last_updated: new Date().toISOString(),
              last_empty_updated: new Date().toISOString()
            })
            .eq('id', existingInventory.id)
            .select()
            .single();

          if (error) throw error;
          updatedInventory = data;
        } else {
          const { data, error } = await supabase
            .from('inventory')
            .insert({
              product_id: productId,
              current_stock: qty,
              empty_bottle_stock: 0,
              reorder_level: 50,
              last_updated: new Date().toISOString(),
              last_empty_updated: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;
          updatedInventory = data;
        }

        await supabase
          .from('inventory_transactions')
          .insert([{
            product_id: productId,
            quantity: qty,
            type: 'add',
            reason: reason || 'production',
            notes: notes || `Added ${qty} ${product.name} (used ${qty} empty bottles from ${product.name})`
          }]);

        // Record empty bottle usage transaction
        await supabase
          .from('inventory_transactions')
          .insert([{
            product_id: productId,
            quantity: -qty,
            type: 'empty_bottle_usage',
            reason: 'production',
            notes: `Used ${qty} empty bottles to produce ${product.name}`
          }]);

        return {
          success: true,
          message: `Added ${qty} ${product.name} (used ${qty} empty bottles from ${product.name})`,
          inventory: updatedInventory
        };
      }

      // ============================================================
      // CASE 2: Sealed non-19L - Uses its OWN empty bottles
      // ============================================================
      if (isSealed && !is19L && isProduction) {
        console.log(`🔄 Adding to ${product.name} - decreasing its OWN empty stock, increasing sealed stock`);
        
        const currentEmpty = existingInventory?.empty_bottle_stock || 0;
        
        if (currentEmpty < qty) {
          throw new Error(`Insufficient empty bottles for ${product.name}. Available: ${currentEmpty}, Required: ${qty}`);
        }

        const currentSealed = existingInventory?.current_stock || 0;
        const newSealed = currentSealed + qty;
        const newEmpty = currentEmpty - qty;

        let updatedInventory;
        if (existingInventory) {
          const { data, error } = await supabase
            .from('inventory')
            .update({
              current_stock: newSealed,
              empty_bottle_stock: newEmpty,
              last_updated: new Date().toISOString(),
              last_empty_updated: new Date().toISOString()
            })
            .eq('id', existingInventory.id)
            .select()
            .single();

          if (error) throw error;
          updatedInventory = data;
        } else {
          const { data, error } = await supabase
            .from('inventory')
            .insert({
              product_id: productId,
              current_stock: qty,
              empty_bottle_stock: 0,
              reorder_level: 50,
              last_updated: new Date().toISOString(),
              last_empty_updated: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;
          updatedInventory = data;
        }

        await supabase
          .from('inventory_transactions')
          .insert([{
            product_id: productId,
            quantity: qty,
            type: 'add',
            reason: reason || 'production',
            notes: notes || `Added ${qty} ${product.name} (used ${qty} empty bottles from ${product.name})`
          }]);

        // Record empty bottle usage transaction
        await supabase
          .from('inventory_transactions')
          .insert([{
            product_id: productId,
            quantity: -qty,
            type: 'empty_bottle_usage',
            reason: 'production',
            notes: `Used ${qty} empty bottles to produce ${product.name}`
          }]);

        return {
          success: true,
          message: `Added ${qty} ${product.name} (used ${qty} empty bottles from ${product.name})`,
          inventory: updatedInventory
        };
      }

      // ============================================================
      // CASE 3: Manual Empty Bottle Add - Increases empty stock for this specific product
      // ============================================================
      if (reason === 'manual_empty_add') {
        console.log('🔄 Manual empty bottle add - increasing empty stock for this product only');
        
        const currentEmpty = existingInventory?.empty_bottle_stock || 0;
        const newEmpty = currentEmpty + qty;

        let updatedInventory;
        if (existingInventory) {
          const { data, error } = await supabase
            .from('inventory')
            .update({
              empty_bottle_stock: newEmpty,
              last_empty_updated: new Date().toISOString()
            })
            .eq('id', existingInventory.id)
            .select()
            .single();

          if (error) throw error;
          updatedInventory = data;
        } else {
          const { data, error } = await supabase
            .from('inventory')
            .insert({
              product_id: productId,
              current_stock: 0,
              empty_bottle_stock: qty,
              reorder_level: 50,
              last_updated: new Date().toISOString(),
              last_empty_updated: new Date().toISOString()
            })
            .select()
            .single();

          if (error) throw error;
          updatedInventory = data;
        }

        await supabase
          .from('inventory_transactions')
          .insert([{
            product_id: productId,
            quantity: qty,
            type: 'empty_bottle_add',
            reason: 'manual',
            notes: notes || `Added ${qty} empty bottles manually for ${product.name}`
          }]);

        return {
          success: true,
          message: `Added ${qty} empty bottles to ${product.name}`,
          inventory: updatedInventory
        };
      }

      // ============================================================
      // DEFAULT: Just increase current_stock (no empty bottle change)
      // ============================================================
      console.log('🔄 Adding to product - increasing sealed stock only (no empty bottle change)');
      
      const currentStock = existingInventory?.current_stock || 0;
      const newStock = currentStock + qty;

      let updatedInventory;
      if (existingInventory) {
        const { data, error } = await supabase
          .from('inventory')
          .update({
            current_stock: newStock,
            last_updated: new Date().toISOString()
          })
          .eq('id', existingInventory.id)
          .select()
          .single();

        if (error) throw error;
        updatedInventory = data;
      } else {
        const { data, error } = await supabase
          .from('inventory')
          .insert({
            product_id: productId,
            current_stock: qty,
            reorder_level: 50,
            last_updated: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        updatedInventory = data;
      }

      await supabase
        .from('inventory_transactions')
        .insert([{
          product_id: productId,
          quantity: qty,
          type: 'add',
          reason: reason || 'restock',
          notes: notes || `Added ${qty} ${product.name}`
        }]);

      return {
        success: true,
        message: `Added ${qty} ${product.name}`,
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

      const { data: existingInventory, error: checkError } = await supabase
        .from('inventory')
        .select('id, current_stock, empty_bottle_stock')
        .eq('product_id', productId)
        .maybeSingle();

      if (checkError) throw checkError;

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
        .eq('id', existingInventory.id)
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
  async initializeInventory(productId, vendorId = null, reorderLevel = 50) {
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