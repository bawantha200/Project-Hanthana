// backend/src/routes/ordersRoutes.js
const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  getUsers,
  getProducts,
  postOrder,
  updateStatus,
  assignDelivery,
  getDeliveryPersonnelList,
  getOrderDetails,
  updateDelivery
} = require('../controllers/ordersController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

// Existing routes
router.get('/', getOrders);
router.get('/users', getUsers);
router.get('/products', getProducts);
router.post('/', postOrder);
router.get('/:id', getOrder);

// New routes for order processing
router.get('/:id/details', getOrderDetails);
router.put('/:id/status', updateStatus);
router.put('/:id/assign', assignDelivery);
router.put('/:id/delivery', updateDelivery);
router.get('/delivery/personnel', getDeliveryPersonnelList);

module.exports = router;