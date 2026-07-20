// backend/src/controllers/forecastController.js
const { getWeeklyHybridForecast, calculateAndUpdateReorderLevel } = require('../services/forecastService');
const supabase = require('../config/db');

exports.getForecast = async (req, res) => {
  try {
    console.log('[DEBUG] getForecast called for product:', req.params.productId);
    
    const { productId } = req.params;
    if (!productId) {
      console.log('[ERROR] Product ID is required');
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      console.log('[ERROR] Product not found:', productId);
      return res.status(404).json({ error: 'Product not found' });
    }

    console.log('[DEBUG] Product found, fetching forecast...');
    const forecastData = await getWeeklyHybridForecast(Number(productId));
    console.log('[DEBUG] Forecast data received:', forecastData);
    
    // Get the updated inventory with reorder_level
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('reorder_level, current_stock')
      .eq('product_id', productId)
      .single();

    console.log('[DEBUG] Inventory data:', inventory);
    console.log('[DEBUG] Inventory error:', invError);

    res.json({ 
      forecast: forecastData.weekly || [],
      reorder_level: inventory?.reorder_level || 0,
      current_stock: inventory?.current_stock || 0,
      sma_history: forecastData.smaHistory || []
    });
  } catch (error) {
    console.log('[ERROR] Forecast error:', error.message);
    console.log('[ERROR] Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

exports.saveProductionPlan = async (req, res) => {
  try {
    console.log('[DEBUG] saveProductionPlan called');
    const { planned_date, product_id, predicted_demand, planned_quantity, status } = req.body;

    if (!planned_date || !product_id || predicted_demand === undefined || planned_quantity === undefined) {
      console.log('[ERROR] Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Verify product exists
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      console.log('[ERROR] Product not found:', product_id);
      return res.status(404).json({ error: 'Product not found' });
    }

    // Upsert plan
    const planData = {
      planned_date,
      product_id,
      predicted_demand,
      planned_quantity,
      status: status || 'PLANNED'
    };

    const { data, error } = await supabase
      .from('production_plans')
      .upsert(planData, { onConflict: 'planned_date, product_id' })
      .select();

    if (error) {
      console.log('[ERROR] Supabase error:', error.message);
      throw new Error(`Supabase error: ${error.message}`);
    }

    console.log('[DEBUG] Production plan saved:', data);
    res.status(200).json({
      message: 'Production plan saved',
      plan: data?.[0] || null
    });
  } catch (error) {
    console.log('[ERROR] Save plan error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// New endpoint to manually trigger reorder_level calculation
exports.updateReorderLevels = async (req, res) => {
  try {
    const { productId } = req.params;
    console.log('[DEBUG] updateReorderLevels called');
    console.log('[DEBUG] ProductId param:', productId);
    
    // Get all products or specific product
    let products;
    if (productId) {
      console.log('[DEBUG] Fetching specific product:', productId);
      const { data, error } = await supabase
        .from('products')
        .select('id')
        .eq('id', productId);
      
      if (error) {
        console.log('[ERROR] Error fetching product:', error.message);
        throw error;
      }
      products = data;
      console.log('[DEBUG] Found product:', products);
    } else {
      console.log('[DEBUG] Fetching all products');
      const { data, error } = await supabase
        .from('products')
        .select('id');
      
      if (error) {
        console.log('[ERROR] Error fetching products:', error.message);
        throw error;
      }
      products = data;
      console.log('[DEBUG] Found products count:', products ? products.length : 0);
    }

    if (!products || products.length === 0) {
      console.log('[ERROR] No products found');
      return res.status(404).json({ error: 'No products found' });
    }

    console.log('[DEBUG] Starting to update reorder levels for products:', products.length);
    const results = [];
    for (const product of products) {
      console.log('[DEBUG] Processing product:', product.id);
      const result = await calculateAndUpdateReorderLevel(product.id);
      if (result) {
        console.log('[DEBUG] Result for product', product.id, ':', result);
        results.push(result);
      } else {
        console.log('[WARNING] Failed to update product:', product.id);
      }
    }

    console.log('[DEBUG] All results:', results);
    res.json({
      message: `Updated reorder levels for ${results.length} products`,
      results: results
    });
  } catch (error) {
    console.log('[ERROR] Error updating reorder levels:', error.message);
    console.log('[ERROR] Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Test function to manually set reorder level
exports.testUpdateReorderLevel = async (req, res) => {
  try {
    const { productId } = req.params;
    console.log('[DEBUG] testUpdateReorderLevel for product:', productId);
    
    if (!productId) {
      console.log('[ERROR] Product ID is required');
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Test: Set a specific reorder level
    const testReorderLevel = 25;
    console.log('[DEBUG] Setting reorder level to:', testReorderLevel);
    
    const { data, error } = await supabase
      .from('inventory')
      .update({ 
        reorder_level: testReorderLevel,
        last_updated: new Date().toISOString()
      })
      .eq('product_id', productId)
      .select();

    if (error) {
      console.log('[ERROR] Test update error:', error.message);
      throw error;
    }

    console.log('[DEBUG] Test update result:', data);

    // Verify the update
    const { data: verified, error: verifyError } = await supabase
      .from('inventory')
      .select('reorder_level')
      .eq('product_id', productId)
      .single();

    if (verifyError) {
      console.log('[ERROR] Verify error:', verifyError.message);
    }

    console.log('[DEBUG] Verified reorder_level:', verified?.reorder_level);

    res.json({
      message: 'Test update successful',
      productId,
      reorder_level: verified?.reorder_level || null
    });
  } catch (error) {
    console.log('[ERROR] Test update error:', error.message);
    res.status(500).json({ error: error.message });
  }
};