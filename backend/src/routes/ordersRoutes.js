// src/routes/ordersRoutes.js
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

// Import authentication middleware (if you have one)
// const { protect, admin } = require('../middlewares/authMiddleware');

// All routes are protected – adjust as needed
// router.use(protect); // uncomment if you want to require login for all

router.get('/', getOrders);           // GET all orders
router.get('/users', getUsers);       // GET all users
router.get('/products', getProducts); // GET all products
router.post('/', postOrder);          // POST create order

router.get('/:id', protect, getOrder);   // 👈 new route

module.exports = router;