// backend/src/routes/ordersRoutes.js
const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrder,
  getUsers,
  getProducts,
  postOrder,
  completeOrderPayment,
  updateStatus,
  assignDelivery,
  getDeliveryPersonnelList,
  getOrderDetails,
  updateDelivery,
} = require('../controllers/ordersController');
const { protect } = require('../middlewares/authMiddleware');

// ✅ Import ordersService for water routes
const ordersService = require('../services/ordersService');

// ========== PUBLIC ROUTES (No authentication required) ==========
// Water price - needs to be accessible for POS
router.get('/water-price', async (req, res) => {
  try {
    console.log('[GET /water-price] Request received');
    const price = await ordersService.getWaterPrice();
    console.log('[GET /water-price] Price:', price);
    res.json({ success: true, price });
  } catch (error) {
    console.error('[GET /water-price] Error:', error);
    res.json({ success: true, price: 50.00 });
  }
});

// ========== PROTECTED ROUTES ==========
router.use(protect);

router.get('/', getOrders);
router.get('/users', getUsers);
router.get('/products', getProducts);
router.post('/', postOrder);

router.get('/:id', getOrder);
router.get('/:id/details', getOrderDetails);
router.put('/:id/status', updateStatus);
router.put('/:id/assign', assignDelivery);
router.put('/:id/delivery', updateDelivery);

// Complete order after payment (deduct inventory)
router.put('/:id/complete', completeOrderPayment);

router.get('/delivery/personnel', getDeliveryPersonnelList);

// ========== WATER PRICING ROUTES (Protected) ==========
router.put('/water-price', async (req, res) => {
  try {
    const { price } = req.body;
    const userId = req.user.id;
    
    if (!price || price <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Valid price per liter is required' 
      });
    }
    
    const result = await ordersService.updateWaterPrice(price, userId);
    res.json({ success: true, message: 'Water price updated successfully', data: result });
  } catch (error) {
    console.error('[PUT /water-price] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== BULK WATER ORDER ROUTES (Protected) ==========
router.post('/bulk-water', async (req, res) => {
  try {
    const { customerId, customerName, customerPhone, liters, paymentMethod } = req.body;
    const userId = req.user.id;
    
    // Get current price
    const pricePerLiter = await ordersService.getWaterPrice();
    
    const order = await ordersService.createBulkWaterOrder({
      customerId,
      customerName,
      customerPhone,
      liters,
      pricePerLiter,
      paymentMethod,
      userId
    });
    
    res.json({ success: true, order });
  } catch (error) {
    console.error('[POST /bulk-water] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/bulk-water', async (req, res) => {
  try {
    const orders = await ordersService.getBulkWaterOrders();
    res.json({ success: true, orders });
  } catch (error) {
    console.error('[GET /bulk-water] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;