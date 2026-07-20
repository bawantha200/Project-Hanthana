// backend/src/routes/forecastRoutes.js
const express = require('express');
const { 
  getForecast, 
  saveProductionPlan,
  updateReorderLevels 
} = require('../controllers/forecastController');
const router = express.Router();

// GET /api/forecast/next-week/:productId
router.get('/next-week/:productId', getForecast);

// POST /api/forecast/save-plan
router.post('/save-plan', saveProductionPlan);

// PUT /api/forecast/update-reorder-level - update all products
router.put('/update-reorder-level', updateReorderLevels);

// PUT /api/forecast/update-reorder-level/:productId - update specific product
router.put('/update-reorder-level/:productId', updateReorderLevels);

module.exports = router;