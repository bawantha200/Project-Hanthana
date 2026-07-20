// routes/vendorOrdersRoutes.js
const express = require('express');
const { vendorOrdersController } = require('../controllers/vendorOrdersController');

const router = express.Router();

router.get('/', vendorOrdersController.getVendorOrders);

module.exports = router;