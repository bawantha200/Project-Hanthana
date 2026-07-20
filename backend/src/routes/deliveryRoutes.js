// backend/src/routes/deliveryRoutes.js
const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getDelivery,
  getMyDeliveries,
  updateDelivery,
  getMyStats,
  assignRider,
  getDeliveryPersonnel // Added
} = require('../controllers/deliveryController');
const { protect } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

// ========== DELIVERY PERSONNEL ROUTE ==========
// GET /api/deliveries/personnel - Get all riders
router.get('/personnel', getDeliveryPersonnel);

// ========== RIDER ROUTES ==========
router.get('/my-deliveries', getMyDeliveries);
router.get('/my-stats', getMyStats);
router.put('/:id/status', updateDelivery);

// ========== ADMIN ROUTES ==========
router.get('/', getDeliveries);
router.get('/:id', getDelivery);
router.put('/:id/assign', assignRider);

module.exports = router;