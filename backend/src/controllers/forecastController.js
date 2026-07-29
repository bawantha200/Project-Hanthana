// backend/src/controllers/forecastController.js
const { getWeeklyHybridForecast, calculateAndUpdateReorderLevel } = require('../services/forecastService');
const supabase = require('../config/db');
const cache = require('../config/cache');

// Cache configuration
const CACHE_TTL = {
  FORECAST: 300,          // 5 minutes for forecast data (historical data doesn't change often)
  REORDER_LEVEL: 120,     // 2 minutes for reorder levels
  PRODUCTION_PLANS: 60,   // 1 minute for production plans
};

const CACHE_KEYS = {
  FORECAST_PREFIX: 'forecast_',
  REORDER_LEVEL_PREFIX: 'reorder_level_',
  PRODUCTION_PLANS_PREFIX: 'production_plans_',
  PRODUCTS_LIST: 'products_list',
};

// Helper to invalidate forecast caches
const invalidateForecastCaches = (productId) => {
  // Delete specific product forecast cache
  cache.del(`${CACHE_KEYS.FORECAST_PREFIX}${productId}`);
  cache.del(`${CACHE_KEYS.REORDER_LEVEL_PREFIX}${productId}`);
  
  // Also delete any aggregated caches if they exist
  cache.del(CACHE_KEYS.PRODUCTS_LIST);
};

// ──────────────────────────────────────────────
// GET FORECAST
// ──────────────────────────────────────────────
exports.getForecast = async (req, res) => {
  try {
    console.log('[DEBUG] getForecast called for product:', req.params.productId);
    
    const { productId } = req.params;
    if (!productId) {
      console.log('[ERROR] Product ID is required');
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check cache for forecast data
    const forecastCacheKey = `${CACHE_KEYS.FORECAST_PREFIX}${productId}`;
    const cachedForecast = cache.get(forecastCacheKey);
    
    if (cachedForecast) {
      console.log('[DEBUG] Returning cached forecast for product:', productId);
      return res.json({ 
        ...cachedForecast,
        fromCache: true 
      });
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

    const responseData = { 
      forecast: forecastData.weekly || [],
      reorder_level: inventory?.reorder_level || 0,
      current_stock: inventory?.current_stock || 0,
      sma_history: forecastData.smaHistory || []
    };

    // Store in cache
    cache.set(forecastCacheKey, responseData, CACHE_TTL.FORECAST);
    console.log('[DEBUG] Forecast cached for product:', productId);

    res.json(responseData);
  } catch (error) {
    console.log('[ERROR] Forecast error:', error.message);
    console.log('[ERROR] Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ──────────────────────────────────────────────
// SAVE PRODUCTION PLAN
// ──────────────────────────────────────────────
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
    
    // Invalidate forecast cache for this product
    invalidateForecastCaches(product_id);
    console.log('[DEBUG] Forecast cache invalidated for product:', product_id);

    res.status(200).json({
      message: 'Production plan saved',
      plan: data?.[0] || null,
      cacheInvalidated: true
    });
  } catch (error) {
    console.log('[ERROR] Save plan error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ──────────────────────────────────────────────
// UPDATE REORDER LEVELS (Manual Trigger)
// ──────────────────────────────────────────────
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
      
      // Check cache for products list
      const cachedProducts = cache.get(CACHE_KEYS.PRODUCTS_LIST);
      if (cachedProducts) {
        console.log('[DEBUG] Using cached products list');
        products = cachedProducts;
      } else {
        const { data, error } = await supabase
          .from('products')
          .select('id');
        
        if (error) {
          console.log('[ERROR] Error fetching products:', error.message);
          throw error;
        }
        products = data;
        // Cache products list for 5 minutes
        cache.set(CACHE_KEYS.PRODUCTS_LIST, products, 300);
        console.log('[DEBUG] Products list cached');
      }
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
        // Invalidate cache for this product after update
        invalidateForecastCaches(product.id);
      } else {
        console.log('[WARNING] Failed to update product:', product.id);
      }
    }

    console.log('[DEBUG] All results:', results);
    
    // Also clear the products list cache
    cache.del(CACHE_KEYS.PRODUCTS_LIST);
    
    res.json({
      message: `Updated reorder levels for ${results.length} products`,
      results: results,
      cacheInvalidated: true
    });
  } catch (error) {
    console.log('[ERROR] Error updating reorder levels:', error.message);
    console.log('[ERROR] Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ──────────────────────────────────────────────
// TEST UPDATE REORDER LEVEL
// ──────────────────────────────────────────────
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

    // Invalidate caches for this product
    invalidateForecastCaches(productId);
    console.log('[DEBUG] Forecast cache invalidated for product:', productId);

    res.json({
      message: 'Test update successful',
      productId,
      reorder_level: verified?.reorder_level || null,
      cacheInvalidated: true
    });
  } catch (error) {
    console.log('[ERROR] Test update error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

// ──────────────────────────────────────────────
// GET FORECAST WITH PRODUCT DETAILS (Optional)
// ──────────────────────────────────────────────
exports.getForecastWithProductDetails = async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check cache
    const cacheKey = `${CACHE_KEYS.FORECAST_PREFIX}${productId}_details`;
    const cachedData = cache.get(cacheKey);
    
    if (cachedData) {
      console.log('[DEBUG] Returning cached forecast with details');
      return res.json({ 
        ...cachedData,
        fromCache: true 
      });
    }

    // Fetch product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, description, category, unit_price')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Fetch forecast
    const forecastData = await getWeeklyHybridForecast(Number(productId));
    
    // Fetch inventory
    const { data: inventory, error: invError } = await supabase
      .from('inventory')
      .select('reorder_level, current_stock, min_stock, max_stock')
      .eq('product_id', productId)
      .single();

    const responseData = {
      product,
      forecast: forecastData.weekly || [],
      inventory: inventory || null,
      sma_history: forecastData.smaHistory || []
    };

    // Store in cache
    cache.set(cacheKey, responseData, CACHE_TTL.FORECAST);

    res.json(responseData);
  } catch (error) {
    console.log('[ERROR] getForecastWithProductDetails error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ──────────────────────────────────────────────
// GET MULTIPLE PRODUCTS FORECAST
// ──────────────────────────────────────────────
exports.getMultipleForecasts = async (req, res) => {
  try {
    const { productIds } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Product IDs array is required' });
    }

    // Limit to prevent abuse
    if (productIds.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 products allowed' });
    }

    const results = [];
    const cacheMisses = [];

    // Check cache for each product
    for (const id of productIds) {
      const cacheKey = `${CACHE_KEYS.FORECAST_PREFIX}${id}`;
      const cachedData = cache.get(cacheKey);
      
      if (cachedData) {
        results.push({ productId: id, data: cachedData, fromCache: true });
      } else {
        cacheMisses.push(id);
      }
    }

    // Fetch missing data from database
    if (cacheMisses.length > 0) {
      for (const id of cacheMisses) {
        try {
          const forecastData = await getWeeklyHybridForecast(Number(id));
          
          const { data: inventory, error: invError } = await supabase
            .from('inventory')
            .select('reorder_level, current_stock')
            .eq('product_id', id)
            .single();

          const responseData = {
            forecast: forecastData.weekly || [],
            reorder_level: inventory?.reorder_level || 0,
            current_stock: inventory?.current_stock || 0,
            sma_history: forecastData.smaHistory || []
          };

          // Store in cache
          const cacheKey = `${CACHE_KEYS.FORECAST_PREFIX}${id}`;
          cache.set(cacheKey, responseData, CACHE_TTL.FORECAST);

          results.push({ productId: id, data: responseData, fromCache: false });
        } catch (error) {
          console.log('[ERROR] Failed to fetch forecast for product:', id, error.message);
          results.push({ 
            productId: id, 
            error: error.message, 
            data: null 
          });
        }
      }
    }

    res.json({
      results,
      totalProcessed: productIds.length,
      fromCache: results.filter(r => r.fromCache).length,
      fromDb: results.filter(r => r.fromCache === false).length
    });
  } catch (error) {
    console.log('[ERROR] getMultipleForecasts error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ──────────────────────────────────────────────
// CLEAR FORECAST CACHE
// ──────────────────────────────────────────────
exports.clearForecastCache = async (req, res) => {
  try {
    const { productId } = req.params;
    
    if (productId) {
      // Clear specific product cache
      invalidateForecastCaches(productId);
      res.json({ 
        message: `Forecast cache cleared for product: ${productId}`,
        productId 
      });
    } else {
      // Clear all forecast caches
      // Note: NodeCache doesn't support pattern deletion natively,
      // so we need to iterate through keys
      const keys = cache.keys();
      let clearedCount = 0;
      
      for (const key of keys) {
        if (key.startsWith(CACHE_KEYS.FORECAST_PREFIX) || 
            key.startsWith(CACHE_KEYS.REORDER_LEVEL_PREFIX) ||
            key === CACHE_KEYS.PRODUCTS_LIST) {
          cache.del(key);
          clearedCount++;
        }
      }
      
      res.json({ 
        message: `Cleared ${clearedCount} forecast cache entries`,
        clearedCount 
      });
    }
  } catch (error) {
    console.log('[ERROR] clearForecastCache error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ──────────────────────────────────────────────
// GET CACHE STATS
// ──────────────────────────────────────────────
exports.getCacheStats = async (req, res) => {
  try {
    const stats = cache.stats();
    const keys = cache.keys();
    const forecastKeys = keys.filter(k => k.startsWith(CACHE_KEYS.FORECAST_PREFIX));
    const reorderKeys = keys.filter(k => k.startsWith(CACHE_KEYS.REORDER_LEVEL_PREFIX));
    
    res.json({
      cacheStats: stats,
      keyCounts: {
        total: keys.length,
        forecast: forecastKeys.length,
        reorderLevels: reorderKeys.length,
        productsList: keys.includes(CACHE_KEYS.PRODUCTS_LIST) ? 1 : 0
      }
    });
  } catch (error) {
    console.log('[ERROR] getCacheStats error:', error.message);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};