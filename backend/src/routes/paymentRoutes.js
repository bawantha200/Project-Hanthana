// backend/src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  paymentReturn,
  paymentCancel,
  paymentNotify,
  getPaymentStatusById,
  getPaymentHistoryByUser
} = require('../controllers/paymentController');
const { protect } = require('../middlewares/authMiddleware');

// Public routes (PayHere webhook)
router.get('/return', paymentReturn);
router.get('/cancel', paymentCancel);
router.post('/notify', paymentNotify);

// Protected routes
router.use(protect);
router.post('/initiate', initiatePayment);
router.get('/status/:orderId', getPaymentStatusById);
router.get('/history', getPaymentHistoryByUser);

module.exports = router;