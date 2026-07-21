// backend/src/services/deliveryService.js
// Find the updateDeliveryStatus function and add this:

const updateDeliveryStatus = async (deliveryId, status) => {
  console.log(`🔄 [updateDeliveryStatus] Delivery ${deliveryId} -> ${status}`);

  // Get the delivery
  const { data: deliveryData, error: deliveryError } = await supabase
    .from('deliveries')
    .select('order_id')
    .eq('id', deliveryId)
    .single();

  if (deliveryError) {
    throw new Error(`Failed to fetch delivery: ${deliveryError.message}`);
  }

  const updateData = {
    status: status,
    updated_at: new Date().toISOString()
  };

  let emptyBottlesCollected = 0;

  if (status === 'DELIVERED') {
    updateData.delivery_end_time = new Date().toISOString();
    
    // Auto-calculate empty bottles from the order
    const refillCheck = await checkOrderHasRefill19LBottles(deliveryData.order_id);
    if (refillCheck.hasRefill) {
      emptyBottlesCollected = refillCheck.refillCount;
      updateData.collecting_empty_bottles = emptyBottlesCollected;
      console.log(`📦 Auto-collecting ${emptyBottlesCollected} REFILL 19L bottles`);
    } else {
      updateData.collecting_empty_bottles = 0;
    }
  }

  if (status === 'PICKED_UP') {
    updateData.delivery_start_time = new Date().toISOString();
  }

  // Update delivery status
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

  // If delivery is completed, update order status and inventory
  if (status === 'DELIVERED') {
    // Update order status
    await supabase
      .from('orders')
      .update({ 
        order_status: 'DELIVERED',
        updated_at: new Date().toISOString()
      })
      .eq('id', deliveryData.order_id);

    // ✅ Add empty bottles to inventory empty_bottle_stock
    if (emptyBottlesCollected > 0) {
      try {
        console.log(`📦 Adding ${emptyBottlesCollected} empty bottles to inventory empty_bottle_stock`);
        await updateEmptyBottleStock(emptyBottlesCollected);
        console.log(`✅ Successfully updated inventory empty_bottle_stock with ${emptyBottlesCollected} bottles`);
      } catch (inventoryError) {
        console.error('❌ [updateDeliveryStatus] Failed to update inventory:', inventoryError);
        console.warn('⚠️⚠️⚠️ INVENTORY UPDATE FAILED! Manual intervention may be required.');
        console.warn(`Order ${deliveryData.order_id}, Bottles: ${emptyBottlesCollected}`);
      }
    } else {
      console.log('ℹ️ No empty bottles to add to inventory');
    }
  }

  return data;
};

// Helper function to update empty bottle stock
const updateEmptyBottleStock = async (quantity) => {
  console.log(`📦 [updateEmptyBottleStock] Adding ${quantity} empty bottles to inventory...`);

  if (!quantity || quantity <= 0) {
    console.log('ℹ️ No empty bottles to add, skipping inventory update');
    return null;
  }

  try {
    // Find the REFILL 19L product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .ilike('name', '%19L%')
      .eq('type', 'REFILL')
      .limit(1)
      .single();

    if (productError) {
      console.error('❌ [updateEmptyBottleStock] Product error:', productError);
      throw new Error('REFILL 19L product not found');
    }

    // Get existing inventory
    const { data: existingInventory, error: checkError } = await supabase
      .from('inventory')
      .select('id, empty_bottle_stock')
      .eq('product_id', product.id)
      .maybeSingle();

    if (checkError) {
      console.error('❌ [updateEmptyBottleStock] Error checking inventory:', checkError);
      throw new Error(`Failed to check inventory: ${checkError.message}`);
    }

    let result;

    if (existingInventory) {
      const newStock = (existingInventory.empty_bottle_stock || 0) + quantity;
      console.log(`📊 Updating inventory for product ${product.id}: ${existingInventory.empty_bottle_stock || 0} -> ${newStock}`);

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
        console.error('❌ [updateEmptyBottleStock] Update error:', error);
        throw new Error(`Failed to update inventory: ${error.message}`);
      }

      result = data;
      console.log(`✅ Inventory updated successfully. New empty bottle stock: ${newStock}`);
    } else {
      console.log(`📊 Creating new inventory record for product ${product.id} with ${quantity} empty bottles`);

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
        console.error('❌ [updateEmptyBottleStock] Insert error:', error);
        throw new Error(`Failed to create inventory record: ${error.message}`);
      }

      result = data;
      console.log(`✅ New inventory created with empty bottle stock: ${quantity}`);
    }

    // Record transaction
    await supabase
      .from('inventory_transactions')
      .insert({
        product_id: product.id,
        quantity: quantity,
        type: 'empty_bottle_collection',
        reason: 'delivery_completed',
        notes: `Collected ${quantity} empty bottles from delivery`
      });

    return result;
  } catch (err) {
    console.error('💥 [updateEmptyBottleStock] Unexpected error:', err);
    throw err;
  }
};