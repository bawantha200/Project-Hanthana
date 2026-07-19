// backend/src/routes/deliveryRoutes.js
const express = require('express');
const router = express.Router();
const {
  getDeliveries,
  getDelivery,
  getMyDeliveries,
  updateDelivery,
  getMyStats,
  assignRider
} = require('../controllers/deliveryController');
const { protect } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

// Rider routes (for delivery personnel)
router.get('/my-deliveries', getMyDeliveries);
router.get('/my-stats', getMyStats);
router.put('/:id/status', updateDelivery);

// Admin routes
router.get('/', getDeliveries);
router.get('/:id', getDelivery);
router.put('/:id/assign', assignRider);

module.exports = router;