const express = require('express');
const { getForecast, saveProductionPlan } = require('../controllers/forecastController');
const router = express.Router();

// GET /api/forecast/next-week/:productId
router.get('/next-week/:productId', getForecast);

// POST /api/forecast/save-plan
router.post('/save-plan', saveProductionPlan);

module.exports = router;