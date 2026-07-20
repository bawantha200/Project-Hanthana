// backend/src/services/forecastService.js
const supabase = require('../config/db');

async function calculateAndUpdateReorderLevel(productId) {
  try {
    console.log('[DEBUG] Starting calculateAndUpdateReorderLevel for product:', productId);
    
    // Get tomorrow's forecast (first day of the week)
    const weeklyForecast = await generateWeeklyForecast(productId);
    console.log('[DEBUG] Weekly forecast generated:', weeklyForecast);
    
    // Tomorrow's forecast is the first day of the week
    const tomorrowForecast = weeklyForecast.length > 0 ? weeklyForecast[0].overall : 0;
    console.log('[DEBUG] Tomorrow forecast:', tomorrowForecast);
    
    // Set reorder_level to tomorrow's forecast
    // If forecast is 0, use a minimum default of 1 to trigger action when stock is 0
    const reorderLevel = Math.max(tomorrowForecast, 1);
    console.log('[DEBUG] Setting reorder_level to tomorrow forecast:', reorderLevel);
    
    // Update the reorder_level in database
    const updateResult = await updateReorderLevelInDB(productId, reorderLevel);
    console.log('[DEBUG] Update result:', updateResult);
    
    return {
      productId,
      tomorrowForecast,
      reorderLevel,
      weeklyForecast
    };
  } catch (error) {
    console.log('[ERROR] Error in calculateAndUpdateReorderLevel:', error.message);
    console.log('[ERROR] Stack trace:', error.stack);
    return null;
  }
}

async function updateReorderLevelInDB(productId, reorderLevel) {
  try {
    console.log('[DEBUG] updateReorderLevelInDB called for product:', productId);
    console.log('[DEBUG] New reorder level value:', reorderLevel);
    
    // First check if inventory record exists for this product
    console.log('[DEBUG] Checking if inventory record exists...');
    const { data: existingInventory, error: checkError } = await supabase
      .from('inventory')
      .select('product_id, current_stock, reorder_level')
      .eq('product_id', productId)
      .maybeSingle();

    console.log('[DEBUG] Existing inventory check result:', existingInventory);
    
    if (checkError) {
      console.log('[ERROR] Error checking inventory:', JSON.stringify(checkError));
    }

    if (!existingInventory) {
      // Inventory record doesn't exist, create one
      console.log('[DEBUG] No inventory record found, creating new one...');
      
      // First get vendor_id for this product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('vendor_id')
        .eq('id', productId)
        .maybeSingle();
      
      console.log('[DEBUG] Product vendor data:', productData);
      
      if (productError) {
        console.log('[ERROR] Error fetching product vendor:', JSON.stringify(productError));
      }
      
      const vendorId = productData?.vendor_id || 1;
      console.log('[DEBUG] Using vendor_id:', vendorId);
      
      const { data: insertData, error: insertError } = await supabase
        .from('inventory')
        .insert({
          product_id: productId,
          vendor_id: vendorId,
          current_stock: 0,
          reorder_level: reorderLevel,
          last_updated: new Date().toISOString()
        })
        .select();

      console.log('[DEBUG] Insert result data:', insertData);
      
      if (insertError) {
        console.log('[ERROR] Error creating inventory record:', JSON.stringify(insertError));
        throw new Error('Failed to create inventory record: ' + insertError.message);
      }
      
      console.log('[DEBUG] Successfully created new inventory record');
      return { success: true, action: 'created', reorderLevel };
    } else {
      // Update existing inventory record
      console.log('[DEBUG] Updating existing inventory record...');
      console.log('[DEBUG] Current reorder_level:', existingInventory.reorder_level);
      console.log('[DEBUG] New reorder_level:', reorderLevel);
      
      const { data: updateData, error: updateError } = await supabase
        .from('inventory')
        .update({ 
          reorder_level: reorderLevel,
          last_updated: new Date().toISOString()
        })
        .eq('product_id', productId)
        .select();

      console.log('[DEBUG] Update result data:', updateData);
      
      if (updateError) {
        console.log('[ERROR] Error updating reorder_level:', JSON.stringify(updateError));
        throw new Error('Failed to update reorder_level: ' + updateError.message);
      }
      
      console.log('[DEBUG] Successfully updated inventory record');
      return { success: true, action: 'updated', reorderLevel };
    }
  } catch (error) {
    console.log('[ERROR] Error in updateReorderLevelInDB:', error.message);
    console.log('[ERROR] Stack trace:', error.stack);
    throw error;
  }
}

// Function to get weekly hybrid forecast
async function getWeeklyHybridForecast(productId) {
  try {
    console.log('[DEBUG] getWeeklyHybridForecast for product:', productId);
    
    // First, update the reorder level based on tomorrow's forecast
    const reorderResult = await calculateAndUpdateReorderLevel(productId);
    console.log('[DEBUG] Reorder calculation result:', reorderResult);
    
    // Get the weekly forecast data
    const weeklyForecast = await generateWeeklyForecast(productId);
    console.log('[DEBUG] Weekly forecast generated');
    
    // Combine the data
    return {
      weekly: weeklyForecast,
      reorderLevel: reorderResult?.reorderLevel || 0,
      tomorrowForecast: reorderResult?.tomorrowForecast || 0
    };
  } catch (error) {
    console.log('[ERROR] Error in getWeeklyHybridForecast:', error.message);
    return { weekly: [], reorderLevel: 0, tomorrowForecast: 0 };
  }
}

async function generateWeeklyForecast(productId) {
  try {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    
    const forecast = [];
    for (let i = 0; i < 7; i++) {
      const dayIndex = (today + i) % 7;
      const dayName = dayNames[dayIndex];
      
      // Get historical average for this day
      const avgSales = await getDayAverage(productId, dayIndex);
      
      forecast.push({
        day: dayName,
        overall: Math.round(avgSales || 0),
        low: Math.round((avgSales || 0) * 0.8),
        high: Math.round((avgSales || 0) * 1.2)
      });
    }
    return forecast;
  } catch (error) {
    console.log('[ERROR] Error generating weekly forecast:', error.message);
    return [];
  }
}

async function getDayAverage(productId, dayIndex) {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    // Get orders in date range
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .neq('order_status', 'CANCELLED');

    if (orderError || !orders || orders.length === 0) {
      return 0;
    }

    const orderIds = orders.map(o => o.id);
    
    // Get order items for these orders and the specific product
    const { data: salesData, error: salesError } = await supabase
      .from('order_items')
      .select('quantity, order_id')
      .eq('product_id', productId)
      .in('order_id', orderIds);

    if (salesError || !salesData || salesData.length === 0) {
      return 0;
    }

    // Map order dates
    const orderDateMap = {};
    orders.forEach(order => {
      orderDateMap[order.id] = new Date(order.created_at);
    });

    let total = 0;
    let count = 0;
    
    salesData.forEach(item => {
      const date = orderDateMap[item.order_id];
      if (date && date.getDay() === dayIndex) {
        total += Number(item.quantity);
        count++;
      }
    });

    return count > 0 ? Math.round(total / count) : 0;
  } catch (error) {
    console.log('[ERROR] Error in getDayAverage:', error.message);
    return 0;
  }
}

module.exports = {
  getWeeklyHybridForecast,
  calculateAndUpdateReorderLevel,
  generateWeeklyForecast,
  updateReorderLevelInDB
};