// src/routes/ordersRoutes.js
const express = require('express');
const router = express.Router();
const { getOrders, getOrder } = require('../controllers/ordersController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, getOrders);
router.get('/:id', protect, getOrder);   // 👈 new route

module.exports = router;