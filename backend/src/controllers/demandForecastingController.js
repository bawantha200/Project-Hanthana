// backend/src/controllers/demandForecastingController.js

const {
  calculateAndSaveDailyForecast,
  syncActualSalesForDate,
  get7DayFutureDemandAllProducts,
  getHistoricalVsPredicted,
  seedHistoricalForecastsFromCSV,
  getProductionPlan,
} = require('../services/demandForecastingService');

async function getUpcomingDemand(req, res) {
  try {
    const { productId } = req.query;
    let data = await get7DayFutureDemandAllProducts();
    if (productId) {
      data = data.filter((row) => row.product_id === parseInt(productId));
    }
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Error in getUpcomingDemand:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getForecastChartData(req, res) {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }
    const daysBack = parseInt(req.query.daysBack, 10) || 30;
    const data = await getHistoricalVsPredicted(productId, daysBack);
    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    console.error('Error in getForecastChartData:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}



async function triggerManualCalculation(req, res) {
  try {
    console.log('[demandForecastController] Manual forecast trigger requested');
    const forecast = await calculateAndSaveDailyForecast();
    
    // ✅ Sync TODAY instead of yesterday
    const today = new Date();
    // const yesterday = new Date();
    // yesterday.setDate(yesterday.getDate() - 1);
    const sync = await syncActualSalesForDate(today);  // ← Changed to today
    
    return res.status(200).json({
      success: true,
      message: 'Forecast recalculated and today actuals synced.',
      forecast,
      sync,
    });
  } catch (err) {
    console.error('[demandForecastController] triggerManualCalculation error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function bulkUploadCSVData(req, res) {
  try {
    const rows = Array.isArray(req.body) ? req.body : req.body.rows;
    if (!rows || !rows.length) {
      return res
        .status(400)
        .json({ success: false, message: 'No rows provided. Send a JSON array or { rows: [...] }.' });
    }
    const result = await seedHistoricalForecastsFromCSV(rows);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    console.error('Error in bulkUploadCSVData:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function getProductionPlanData(req, res) {
  try {
    const data = await getProductionPlan();
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error in getProductionPlanData:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getUpcomingDemand,
  getForecastChartData,
  triggerManualCalculation,
  bulkUploadCSVData,
  getProductionPlanData,
};