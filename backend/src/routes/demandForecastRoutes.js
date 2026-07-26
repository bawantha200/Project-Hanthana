/**
 * demandForecastRoutes.js
 *
 * Mount this router in your main app/server file, e.g.:
 *
 *   const demandForecastRoutes = require('./routes/demandForecastRoutes');
 *   app.use('/api/forecast', demandForecastRoutes);
 *
 * IMPORTANT: If you already have static forecast routes (e.g. a different
 * '/api/forecast/next-week/:productId' from an existing JIT dashboard),
 * make sure route ordering doesn't create path conflicts - register more
 * specific paths before more general ones.
 */

const express = require('express');
const router = express.Router();
const demandForecastController = require('../controllers/demandForecastController');

// POST /api/forecast/trigger - manually run the SMA forecast job for all products
router.post('/trigger', demandForecastController.triggerManualForecast);

// GET /api/forecast/7-day/:productId - next 7 days predicted demand (or 'all')
router.get('/7-day/:productId', demandForecastController.get7DayForecast);

// GET /api/forecast/history/:productId?days=30 - predicted vs actual history
router.get('/history/:productId', demandForecastController.getForecastHistory);

module.exports = router;