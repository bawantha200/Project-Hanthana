/**
 * demandForecastController.js
 *
 * HTTP layer for the Demand Forecasting System.
 * Delegates all business logic to demandForecastService.js.
 */

const demandForecastService = require('../services/demandForecastService');

/**
 * POST /api/forecast/trigger
 * Manually runs the daily forecasting job for ALL active products.
 * Useful for testing, or for an admin "Run Forecast Now" button.
 */
async function triggerManualForecast(req, res) {
  try {
    console.log('[demandForecastController] Manual forecast trigger requested at', new Date().toISOString());

    const summary = await demandForecastService.runDailyForecastCron();

    return res.status(200).json({
      success: true,
      message: `Forecast run completed for ${summary.success.length} product(s), ${summary.failed.length} failed`,
      summary,
    });
  } catch (err) {
    console.error('[demandForecastController] triggerManualForecast error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to run manual forecast',
      error: err.message,
    });
  }
}

/**
 * GET /api/forecast/7-day/:productId
 * Returns the 7-day future demand prediction for a single product.
 * Pass productId = "all" to loop over every active product.
 */
async function get7DayForecast(req, res) {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId parameter is required' });
    }

    if (productId === 'all') {
      console.log('[demandForecastController] Fetching 7-day forecast for ALL products');

      // NOTE: adjust this import path to match your actual supabase client location
      const supabase = require('../config/supabaseClient');
      const allForecasts = [];
      const { data: productList, error } = await supabase.from('products').select('id, name');

      if (error) throw error;

      for (const product of productList || []) {
        try {
          const forecast = await demandForecastService.get7DayForecastForProduct(product.id);
          allForecasts.push({ productId: product.id, productName: product.name, ...forecast });
        } catch (innerErr) {
          console.error(`[demandForecastController] Failed forecast for product ${product.id}:`, innerErr.message);
        }
      }

      return res.status(200).json({ success: true, data: allForecasts });
    }

    console.log(`[demandForecastController] Fetching 7-day forecast for product ${productId}`);
    const forecast = await demandForecastService.get7DayForecastForProduct(productId);

    return res.status(200).json({ success: true, data: forecast });
  } catch (err) {
    console.error('[demandForecastController] get7DayForecast error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch 7-day forecast',
      error: err.message,
    });
  }
}

/**
 * GET /api/forecast/history/:productId?days=30
 * Returns historical predicted vs actual demand for a product, for charting.
 */
async function getForecastHistory(req, res) {
  try {
    const { productId } = req.params;
    const lookbackDays = req.query.days ? parseInt(req.query.days, 10) : 30;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId parameter is required' });
    }

    if (Number.isNaN(lookbackDays) || lookbackDays <= 0) {
      return res.status(400).json({ success: false, message: 'days query param must be a positive number' });
    }

    console.log(
      `[demandForecastController] Fetching forecast history for product ${productId}, lookback ${lookbackDays} days`
    );

    const analytics = await demandForecastService.getForecastAnalytics(productId, lookbackDays);

    return res.status(200).json({ success: true, data: analytics });
  } catch (err) {
    console.error('[demandForecastController] getForecastHistory error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch forecast history',
      error: err.message,
    });
  }
}

module.exports = {
  triggerManualForecast,
  get7DayForecast,
  getForecastHistory,
};