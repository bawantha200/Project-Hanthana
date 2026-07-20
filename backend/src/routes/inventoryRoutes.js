// backend/src/routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const { 
  // Vendors
  getVendors,
  
  // Products
  getProductsWithStock,
  getProductById,
  
  // Stock
  getInventoryStock,
  addStock,
  reduceStock,
  updateStock,
  deleteStock,
  
  // Empty Bottles
  getEmptyBottles,
  recordEmptyBottleReturn,
  useEmptyBottles,
  getEmptyBottleReturnHistory,
  
  // Vendor Orders
  createVendorOrder,
  updateVendorOrder,
  getVendorOrders,
  
  // Analytics
  getMonthlySales,
  getVendorPurchaseSummary
} = require('../controllers/inventoryController');

// Async handler wrapper for error handling
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ============ VENDORS ENDPOINT ============
router.get('/vendors', asyncHandler(getVendors));

// ============ PRODUCT ENDPOINTS ============
router.get('/products-with-stock', asyncHandler(getProductsWithStock));
router.get('/products/:productId', asyncHandler(getProductById));

// ============ INVENTORY STOCK ENDPOINTS ============
router.get('/stock/:productId', asyncHandler(getInventoryStock));
router.post('/stock/add', asyncHandler(addStock));
router.post('/stock/reduce', asyncHandler(reduceStock));
router.put('/stock/:productId', asyncHandler(updateStock));
router.delete('/stock/:productId', asyncHandler(deleteStock));

// ============ 19L EMPTY BOTTLE ENDPOINTS ============
router.get('/empty-bottles', asyncHandler(getEmptyBottles));
router.post('/empty-bottles/return', asyncHandler(recordEmptyBottleReturn));
router.post('/empty-bottles/use', asyncHandler(useEmptyBottles));
router.get('/empty-bottles/history', asyncHandler(getEmptyBottleReturnHistory));

// ============ VENDOR ORDER ENDPOINTS ============
router.post('/vendor-orders', asyncHandler(createVendorOrder));
router.put('/vendor-orders/:orderId', asyncHandler(updateVendorOrder));
router.get('/vendor-orders', asyncHandler(getVendorOrders));

// ============ ANALYTICS ENDPOINTS ============
router.get('/monthly-sales', asyncHandler(getMonthlySales));
router.get('/vendor-purchase-summary', asyncHandler(getVendorPurchaseSummary));

module.exports = router;