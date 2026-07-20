const express = require('express');
const { 
  getInventoryStock, 
  updateDailyProductionStock,
  getProductsWithStock,
  getVendors,
  getEmptyBottles,
  getMonthlySales
} = require('../controllers/inventoryController');
const router = express.Router();

// GET /api/inventory/stock/:productId
router.get('/stock/:productId', getInventoryStock);

// POST /api/inventory/update-stock
router.post('/update-stock', updateDailyProductionStock);

// NEW: endpoints for the inventory dashboard
router.get('/products-with-stock', getProductsWithStock);
router.get('/vendors', getVendors);
router.get('/empty-bottles', getEmptyBottles);
router.get('/monthly-sales', getMonthlySales);

module.exports = router;