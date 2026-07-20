const express = require('express');
const router = express.Router();
const vendorOrderController = require('../controllers/vendorOrderController');

// Make sure all controller methods exist before using them
// GET routes
router.get('/', vendorOrderController.getVendorOrders);
router.get('/summary', vendorOrderController.getVendorPurchaseSummary);
router.get('/:id', vendorOrderController.getVendorOrder);

// POST routes
router.post('/', vendorOrderController.createVendorOrder);

// PUT/PATCH routes
router.put('/:id', vendorOrderController.updateVendorOrder);
router.patch('/:id/status', vendorOrderController.updateOrderStatus);

// DELETE routes
router.delete('/:id', vendorOrderController.deleteVendorOrder);

module.exports = router;