// backend/src/routes/deliveryFeeRoutes.js
const express = require('express');
const router = express.Router();
const {
  getConfig,
  updateConfig,
  calculateFee,
  validateAddress,
  resetToDefault
} = require('../controllers/deliveryFeeController');
const { protect } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

// ========== CONFIGURATION ROUTES ==========
router.get('/config', getConfig);
router.post('/config', updateConfig);
router.post('/config/reset', resetToDefault);

// ========== CALCULATION ROUTES ==========
router.post('/calculate', calculateFee);
router.post('/validate-address', validateAddress);

module.exports = router;