// backend/src/routes/stockRoutes.js
// Mounted in app.js as: app.use('/api/stock', stockRoutes);
//
// IMPORTANT: static routes (/products, /transactions, /summary, /add,
// /reduce, /sync-empty-stock, /process-vendor-order/:orderId) MUST be
// declared BEFORE the generic '/:productId' routes. Express matches
// routes in the order they're defined, so if '/:productId' came first,
// a request to GET /api/stock/summary would incorrectly match it with
// productId = "summary".

const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

// --- Static/specific routes first ---
router.get('/products', stockController.getProducts);
router.get('/products/:id', stockController.getProductById);
router.get('/transactions', stockController.getTransactions);
router.get('/summary', stockController.getStockSummary);

router.post('/add', stockController.addStock);
router.post('/reduce', stockController.reduceStock);
router.post('/sync-empty-stock', stockController.syncEmptyStock);
router.post('/process-vendor-order/:orderId', stockController.processVendorOrder);
router.post('/convert', stockController.convertStock);

// --- Generic /:id routes last (must stay below the static routes above) ---
router.get('/:id', stockController.getStock);
router.put('/:id', stockController.updateStock);
router.delete('/:id', stockController.deleteStock);

module.exports = router;