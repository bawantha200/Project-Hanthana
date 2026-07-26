// backend/src/services/demandForecastingService.js

const supabase  = require('../config/db');

const ALGORITHM = 'SMA_3M_DAILY';
const SMA_WINDOW_DAYS = 92;
const FORECAST_HORIZON_DAYS = 7;

function toDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Calculate and save daily forecast for all products
 */
async function calculateAndSaveDailyForecast() {
  try {
    console.log('[demandForecastService] Starting forecast calculation...');
    
    // Get all products
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, name');
    if (pErr) {
      console.error('❌ Error fetching products:', pErr);
      throw new Error(pErr.message);
    }
    
    console.log(`[demandForecastService] Found ${products?.length || 0} products`);

    const sinceDate = toDateString(addDays(new Date(), -SMA_WINDOW_DAYS));
    console.log(`[demandForecastService] Fetching orders since ${sinceDate}`);
    
    // Get order items from completed/delivered orders
    const { data: items, error: iErr } = await supabase
      .from('order_items')
      .select('product_id, quantity, orders!inner(order_status, created_at)')
      .in('orders.order_status', ['DELIVERED', 'COMPLETED'])
      .gte('orders.created_at', sinceDate);
    if (iErr) {
      console.error('❌ Error fetching order items:', iErr);
      throw new Error(iErr.message);
    }
    
    console.log(`[demandForecastService] Found ${items?.length || 0} order items`);

    // Calculate totals per product
    const totals = {};
    (items || []).forEach((it) => {
      totals[it.product_id] = (totals[it.product_id] || 0) + (it.quantity || 0);
    });

    console.log(`[demandForecastService] Calculated totals for ${Object.keys(totals).length} products`);

    const today = new Date();
    const rows = [];
    
    for (const p of products) {
      const sma = Math.round((totals[p.id] || 0) / SMA_WINDOW_DAYS);
      for (let i = 0; i <= FORECAST_HORIZON_DAYS; i++) {
        rows.push({
          product_id: p.id,
          forecast_date: toDateString(addDays(today, i)),
          predicted_demand: sma,
          algorithm_used: ALGORITHM,
        });
      }
    }

    console.log(`[demandForecastService] Generated ${rows.length} forecast rows`);

    // Upsert forecasts
    const { error: upErr } = await supabase
      .from('daily_demand_forecasts')
      .upsert(rows, { onConflict: 'product_id,forecast_date' });
    if (upErr) {
      console.error('❌ Error upserting forecasts:', upErr);
      throw new Error(upErr.message);
    }

    console.log(`[demandForecastService] ✅ Successfully saved ${rows.length} forecasts`);
    return { productsProcessed: products.length, rowsUpserted: rows.length };
  } catch (error) {
    console.error('[demandForecastService] ❌ Error in calculateAndSaveDailyForecast:', error.message);
    throw error;
  }
}

/**
 * Sync actual sales for a specific date
 */

async function syncActualSalesForDate(targetDate) {
  try {
    console.log(`[demandForecastService] 🔍 SYNC START: ${toDateString(targetDate)}`);
    
    const dayStart = `${toDateString(targetDate)}T00:00:00`;
    const dayEnd = `${toDateString(targetDate)}T23:59:59.999`;

    console.log(`[demandForecastService] 📅 Date range: ${dayStart} to ${dayEnd}`);

    // 1. Check orders first
    const { data: orders, error: ordersErr } = await supabase
      .from('orders')
      .select('id, order_status, created_at')
      .in('order_status', ['DELIVERED', 'COMPLETED'])
      .gte('created_at', dayStart)
      .lte('created_at', dayEnd);
    
    if (ordersErr) throw new Error(ordersErr.message);
    console.log(`[demandForecastService] 📦 Found ${orders?.length || 0} delivered orders`);

    // 2. Get order items
    const { data: items, error } = await supabase
      .from('order_items')
      .select('product_id, quantity, orders!inner(order_status, created_at)')
      .in('orders.order_status', ['DELIVERED', 'COMPLETED'])
      .gte('orders.created_at', dayStart)
      .lte('orders.created_at', dayEnd);
    
    if (error) throw new Error(error.message);
    console.log(`[demandForecastService] 📊 Found ${items?.length || 0} order items`);

    // 3. Calculate totals
    const totals = {};
    (items || []).forEach((it) => {
      totals[it.product_id] = (totals[it.product_id] || 0) + (it.quantity || 0);
    });

    console.log(`[demandForecastService] 📈 Totals:`, totals);

    // 4. Check current forecasts
    const dateStr = toDateString(targetDate);
    const { data: currentForecasts, error: fErr } = await supabase
      .from('daily_demand_forecasts')
      .select('product_id, predicted_demand, actual_sales')
      .eq('forecast_date', dateStr);
    
    if (fErr) throw new Error(fErr.message);
    console.log(`[demandForecastService] 📋 Current forecasts:`, currentForecasts);

    // 5. Update
    const updates = Object.entries(totals).map(([productId, qty]) => ({
      product_id: parseInt(productId),
      forecast_date: dateStr,
      actual_sales: qty,
    }));

    if (updates.length) {
      console.log(`[demandForecastService] 📝 Updating:`, updates);
      const { error: upErr } = await supabase
        .from('daily_demand_forecasts')
        .upsert(updates, { onConflict: 'product_id,forecast_date' });
      if (upErr) throw new Error(upErr.message);
    } else {
      console.log(`[demandForecastService] ⚠️ No updates to apply`);
    }

    console.log(`[demandForecastService] ✅ SYNC COMPLETE: ${updates.length} products updated`);
    return { date: dateStr, productsUpdated: updates.length };
  } catch (error) {
    console.error('[demandForecastService] ❌ SYNC ERROR:', error.message);
    throw error;
  }
}

/**
 * Get 7-day future demand for all products
 */

// backend/src/services/demandForecastingService.js

/**
 * Get 7-day future demand for all products - FIXED
 */
async function get7DayFutureDemandAllProducts() {
  try {
    const today = new Date();
    const startStr = toDateString(today);
    const endStr = toDateString(addDays(today, FORECAST_HORIZON_DAYS - 1));

    console.log(`[demandForecastService] Fetching 7-day forecast from ${startStr} to ${endStr}`);

    const { data: forecasts, error: fErr } = await supabase
      .from('daily_demand_forecasts')
      .select(`
        id,
        product_id,
        forecast_date,
        predicted_demand,
        actual_sales,
        algorithm_used,
        products:product_id (
          id,
          name,
          type,
          unit_price
        )
      `)
      .gte('forecast_date', startStr)
      .lte('forecast_date', endStr)
      .order('forecast_date', { ascending: true });
    
    if (fErr) {
      console.error('❌ Error fetching forecasts:', fErr);
      throw new Error(fErr.message);
    }

    console.log(`[demandForecastService] Found ${forecasts?.length || 0} forecast records`);

    // ✅ FIXED: Map 'products' to 'product'
    const result = (forecasts || []).map((f) => {
      // The join returns product data as 'products' (with an 's')
      // We need to map it to 'product' (without 's') for the frontend
      const productData = f.products || null;
      
      return {
        id: f.id,
        product_id: f.product_id,
        forecast_date: f.forecast_date,
        predicted_demand: f.predicted_demand || 0,
        actual_sales: f.actual_sales || 0,
        algorithm_used: f.algorithm_used,
        // ✅ Map 'products' to 'product'
        product: productData ? {
          id: productData.id,
          name: productData.name,
          type: productData.type,
          unit_price: productData.unit_price
        } : null
      };
    });

    console.log(`[demandForecastService] ✅ Processed ${result.length} records`);
    
    // Log first record to verify
    if (result.length > 0) {
      console.log('📊 First record product:', result[0].product);
    }

    return result;
  } catch (error) {
    console.error('[demandForecastService] ❌ Error:', error.message);
    throw error;
  }
}

/**
 * Get historical vs predicted data for chart
 */
async function getHistoricalVsPredicted(productId, daysBack = 30) {
  try {
    const end = new Date();
    const start = addDays(end, -daysBack);

    console.log(`[demandForecastService] Fetching chart data for product ${productId}, last ${daysBack} days`);

    const { data, error } = await supabase
      .from('daily_demand_forecasts')
      .select('forecast_date, predicted_demand, actual_sales')
      .eq('product_id', parseInt(productId))
      .gte('forecast_date', toDateString(start))
      .lte('forecast_date', toDateString(end))
      .order('forecast_date', { ascending: true });
    if (error) {
      console.error('❌ Error fetching chart data:', error);
      throw new Error(error.message);
    }

    console.log(`[demandForecastService] Found ${data?.length || 0} chart data points`);

    return (data || []).map((row) => ({
      date: row.forecast_date,
      predicted: row.predicted_demand || 0,
      actual: row.actual_sales || 0,
    }));
  } catch (error) {
    console.error('[demandForecastService] ❌ Error in getHistoricalVsPredicted:', error.message);
    throw error;
  }
}

/**
 * Seed historical forecasts from CSV data
 */
async function seedHistoricalForecastsFromCSV(data) {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No rows provided for ingestion');
    }

    console.log(`[demandForecastService] Seeding ${data.length} rows from CSV...`);

    const normalized = data.map((r) => ({
      product_id: parseInt(r.product_id),
      forecast_date: r.forecast_date,
      predicted_demand: Number(r.predicted_demand) || 0,
      actual_sales: r.actual_sales != null && r.actual_sales !== '' ? Number(r.actual_sales) : null,
      algorithm_used: r.algorithm_used || ALGORITHM,
    }));

    const { error } = await supabase
      .from('daily_demand_forecasts')
      .upsert(normalized, { onConflict: 'product_id,forecast_date' });
    if (error) {
      console.error('❌ Error seeding data:', error);
      throw new Error(error.message);
    }

    console.log(`[demandForecastService] ✅ Successfully seeded ${normalized.length} rows`);
    return { rowsIngested: normalized.length };
  } catch (error) {
    console.error('[demandForecastService] ❌ Error in seedHistoricalForecastsFromCSV:', error.message);
    throw error;
  }
}

/**
 * Get production plan for next 7 days
 */
async function getProductionPlan() {
  try {
    const today = new Date();
    const startStr = toDateString(today);
    const endStr = toDateString(addDays(today, FORECAST_HORIZON_DAYS - 1));

    console.log(`[demandForecastService] Fetching production plan from ${startStr} to ${endStr}`);

    const { data, error } = await supabase
      .from('daily_demand_forecasts')
      .select(`
        product_id,
        forecast_date,
        predicted_demand,
        products:product_id (
          id,
          name,
          type,
          unit_price
        )
      `)
      .gte('forecast_date', startStr)
      .lte('forecast_date', endStr)
      .order('forecast_date', { ascending: true });
    if (error) {
      console.error('❌ Error fetching production plan:', error);
      throw new Error(error.message);
    }

    console.log(`[demandForecastService] Found ${data?.length || 0} production plan items`);
    return data || [];
  } catch (error) {
    console.error('[demandForecastService] ❌ Error in getProductionPlan:', error.message);
    throw error;
  }
}

module.exports = {
  calculateAndSaveDailyForecast,
  syncActualSalesForDate,
  get7DayFutureDemandAllProducts,
  getHistoricalVsPredicted,
  seedHistoricalForecastsFromCSV,
  getProductionPlan,
  ALGORITHM,
  SMA_WINDOW_DAYS,
  FORECAST_HORIZON_DAYS,
  toDateString,
  addDays,
};