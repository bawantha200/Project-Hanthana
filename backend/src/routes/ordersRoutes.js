// backend/src/routes/ordersRoutes.js
const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  getUsers,
  getProducts,
  postOrder,
} = require('../controllers/ordersController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getOrders);
router.get('/users', getUsers);
router.get('/products', getProducts);
router.post('/', postOrder);
router.get('/:id', getOrder);

module.exports = router;