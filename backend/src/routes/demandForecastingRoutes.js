// backend/src/routes/demandForecastingRoutes.js

const express = require('express');
const router = express.Router();

const {
  getUpcomingDemand,
  getForecastChartData,
  triggerManualCalculation,
  bulkUploadCSVData,
  getProductionPlanData,
} = require('../controllers/demandForecastingController');

router.get('/upcoming', getUpcomingDemand);
router.get('/chart/:productId', getForecastChartData);
router.post('/trigger', triggerManualCalculation);
router.post('/upload-csv', bulkUploadCSVData);
router.get('/production-plan', getProductionPlanData);

module.exports = router;