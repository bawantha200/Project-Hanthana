// backend/src/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/monthly-sales', asyncHandler(analyticsController.getMonthlySales));
router.get('/vendors', asyncHandler(analyticsController.getVendors));

module.exports = router;