// src/routes/ordersRoutes.js
const express = require('express');
const router = express.Router();

// Import ALL controllers and middleware in one go
const {
  getOrders,
  getOrder,      // 👈 now included
  getUsers,
  getProducts,
  postOrder,
} = require('../controllers/ordersController');

const { protect } = require('../middlewares/authMiddleware'); // 👈 import once

// All routes are protected – adjust as needed
// router.use(protect); // uncomment to protect all routes globally

router.get('/', getOrders);                 // GET all orders
router.get('/users', getUsers);             // GET all users
router.get('/products', getProducts);       // GET all products
router.post('/', postOrder);                // POST create order
router.get('/:id', protect, getOrder);     // GET single order (protected)

module.exports = router;