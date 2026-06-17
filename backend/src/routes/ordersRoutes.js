// src/routes/orders.routes.js
const express = require('express');
const router = express.Router();
const { getOrders } = require('../controllers/ordersController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/', protect, getOrders);

module.exports = router;