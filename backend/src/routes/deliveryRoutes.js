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
  getDeliveryPersonnel,
  updateLocation,
  getLocation
} = require('../controllers/deliveryController');
const { protect } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

// ========== DELIVERY PERSONNEL ROUTE ==========
router.get('/personnel', getDeliveryPersonnel);

// ========== LOCATION ROUTES ==========
router.get('/location/:orderId', getLocation);
router.post('/location', updateLocation);
router.put('/location', updateLocation);

// ========== RIDER ROUTES ==========
router.get('/my-deliveries', getMyDeliveries);
router.get('/my-stats', getMyStats);
router.put('/:id/status', updateDelivery);

// ========== ADMIN ROUTES ==========
router.get('/', getDeliveries);
router.get('/:id', getDelivery);
router.put('/:id/assign', assignRider);

module.exports = router;